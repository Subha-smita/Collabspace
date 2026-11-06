// Client-safe helpers that describe a template's content (used by the detail page and previews).
import type { N, ShapeSeed } from './templates';

export function walk(n: N | undefined, f: (n: N) => void) {
  if (!n) return;
  f(n);
  n.content?.forEach((c) => walk(c, f));
}

export function features(doc?: N, shapes?: ShapeSeed[]): { icon: string; label: string }[] {
  const out: { icon: string; label: string }[] = [];
  const seen = new Set<string>();
  walk(doc, (n) => n.type && seen.add(n.type));
  if (seen.has('heading')) out.push({ icon: '🔖', label: 'Headings & sections' });
  if (seen.has('table')) out.push({ icon: '📊', label: 'Tables' });
  if (seen.has('taskList')) out.push({ icon: '✅', label: 'To-do lists' });
  if (seen.has('bulletList') || seen.has('orderedList')) out.push({ icon: '📋', label: 'Lists' });
  if (seen.has('blockquote')) out.push({ icon: '💬', label: 'Quotes' });
  if (shapes?.length) out.push({ icon: '🟨', label: 'Shapes & sticky notes' });
  out.push({ icon: '👥', label: 'Real-time collaboration' });
  return out;
}

export function outline(doc?: N): string[] {
  const out: string[] = [];
  doc?.content?.forEach((n) => {
    if (n.type === 'heading' && Number(n.attrs?.level) <= 2) out.push((n.content ?? []).map((c) => c.text ?? '').join(''));
  });
  return out.filter(Boolean);
}
