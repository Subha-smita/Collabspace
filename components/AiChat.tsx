'use client';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AiChat({ enterNewLine = false }: { enterNewLine?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(content = text) {
    content = content.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setText('');
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(-30) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error ?? 'Something went wrong');
      else setMsgs([...next, { role: 'assistant', content: j.reply }]);
    } catch {
      setErr('Network error. Try again.');
    }
    setBusy(false);
  }

  const empty = msgs.length === 0;
  const prompts = ['Summarize my meeting notes', 'Plan my week', 'Write a project update', 'Brainstorm ideas for a new feature'];
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col px-4 py-6">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#e9e9e7] bg-white text-3xl shadow-sm">✨</div>
          <h1 className="text-3xl font-semibold">How can I help you today?</h1>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {prompts.map((p) => <button key={p} type="button" className="rounded-full border border-[#e9e9e7] bg-white px-3 py-1.5 text-sm hover:bg-[#f7f6f3]" onClick={() => send(p)}>{p}</button>)}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 pb-4" aria-live="polite">
          <div className="flex justify-end"><button type="button" className="text-sm text-gray-500 hover:underline" onClick={() => { setMsgs([]); setErr(''); }}>New chat</button></div>
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-[15px] ${m.role === 'user' ? 'bg-accent text-white' : 'border border-[#e9e9e7] bg-white'}`}>{m.content}</div>
            </div>
          ))}
          {busy && <div className="text-sm text-gray-500">Thinking…</div>}
          <div ref={end} />
        </div>
      )}
      {err && <p role="alert" className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <form className="rounded-2xl border border-[#e9e9e7] bg-white p-2 shadow-sm" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          className="block w-full resize-none border-0 bg-transparent px-2 py-1 text-[15px] focus:outline-none focus:ring-0"
          rows={2}
          placeholder="Ask AI anything…"
          aria-label="Message"
          maxLength={8000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            const send_ = enterNewLine ? e.ctrlKey || e.metaKey : !e.shiftKey;
            if (send_) { e.preventDefault(); send(); }
          }}
        />
        <div className="flex items-center justify-between px-2 text-xs text-gray-500">
          <span>{enterNewLine ? 'Ctrl+Enter to send · Enter for a new line' : 'Enter to send · Shift+Enter for a new line'}</span>
          <button className="rounded-full bg-accent px-3 py-1 text-sm text-white disabled:opacity-40" disabled={busy || !text.trim()}>Send</button>
        </div>
      </form>
    </div>
  );
}

