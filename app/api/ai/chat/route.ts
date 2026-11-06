import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { fail, limited, parse } from '@/lib/api';

const S = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(8000) })).min(1).max(30),
});
const SYSTEM = 'You are the built-in assistant of CollabSpace, a Notion-style workspace app. Help the user write, summarize, brainstorm, plan and organize their notes and tasks. Be concise and clear.';
type Msg = z.infer<typeof S>['messages'];
type Result = { reply: string } | { error: string; status: number };

// Free option: Groq (key from https://console.groq.com/keys). OpenAI-compatible API.
async function groq(key: string, messages: Msg): Promise<Result> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) return { error: 'The free AI limit was reached. Wait a minute and try again.', status: 429 };
  if (!r.ok) return { error: j?.error?.message ?? 'The AI service returned an error', status: 502 };
  return { reply: j?.choices?.[0]?.message?.content || '(no response)' };
}

// Free option: Google Gemini (key from https://aistudio.google.com/apikey).
async function gemini(key: string, messages: Msg): Promise<Result> {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) return { error: 'The free AI limit was reached. Wait a minute and try again.', status: 429 };
  if (!r.ok) return { error: j?.error?.message ?? 'The AI service returned an error', status: 502 };
  const parts: { text?: string }[] = j?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? '').join('');
  return { reply: text || '(no response)' };
}

// Optional paid option: Anthropic.
async function anthropic(key: string, messages: Msg): Promise<Result> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 1024, system: SYSTEM, messages }),
    signal: AbortSignal.timeout(60_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: j?.error?.message ?? 'The AI service returned an error', status: 502 };
  const text = Array.isArray(j.content) ? j.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') : '';
  return { reply: text || '(no response)' };
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  if (limited(req, `ai:${u.id}`, 10, 60_000)) return fail('Too many messages. Wait a minute and try again.', 429);
  const qKey = process.env.GROQ_API_KEY;
  const gKey = process.env.GEMINI_API_KEY;
  const aKey = process.env.ANTHROPIC_API_KEY;
  if (!qKey && !gKey && !aKey) return fail('AI is not configured. Add GROQ_API_KEY to .env and restart the server.', 503);
  const d = await parse(req, S);
  if (!d || d.messages[d.messages.length - 1].role !== 'user') return fail('Invalid message');
  try {
    const out = qKey ? await groq(qKey, d.messages) : gKey ? await gemini(gKey, d.messages) : await anthropic(aKey!, d.messages);
    return 'reply' in out ? NextResponse.json({ reply: out.reply }) : fail(out.error, out.status);
  } catch {
    return fail('Could not reach the AI service', 502);
  }
}
