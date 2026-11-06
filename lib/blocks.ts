// Custom block nodes shared by the browser editor (components/Editor.tsx) and the server schema (lib/docSchema.ts).
import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: { insertCallout: (emoji?: string) => ReturnType };
    toggle: { insertToggle: () => ReturnType };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return { emoji: { default: '💡', parseHTML: (el) => el.getAttribute('data-emoji') || '💡', renderHTML: (a) => ({ 'data-emoji': a.emoji }) } };
  },
  parseHTML() { return [{ tag: 'div[data-type="callout"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0]; },
  addCommands() {
    return {
      insertCallout: (emoji = '💡') => ({ commands }) =>
        commands.insertContent({ type: 'callout', attrs: { emoji }, content: [{ type: 'paragraph' }] }),
    };
  },
});

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'paragraph block*', // first paragraph is the always-visible title
  defining: true,
  addAttributes() {
    return { open: { default: true, parseHTML: (el) => el.getAttribute('data-open') !== 'false', renderHTML: (a) => ({ 'data-open': String(!!a.open) }) } };
  },
  parseHTML() { return [{ tag: 'div[data-type="toggle"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle' }), 0]; },
  addCommands() {
    return {
      insertToggle: () => ({ commands }) =>
        commands.insertContent({ type: 'toggle', attrs: { open: true }, content: [{ type: 'paragraph' }, { type: 'paragraph' }] }),
    };
  },
  // Browser-only; the server schema never calls this.
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-type', 'toggle');
      dom.setAttribute('data-open', String(!!node.attrs.open));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.contentEditable = 'false';
      btn.className = 'toggle-btn';
      btn.setAttribute('aria-label', 'Expand or collapse');
      btn.textContent = '▸';
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        const pos = typeof getPos === 'function' ? getPos() : undefined;
        if (pos === undefined) return;
        const cur = editor.state.doc.nodeAt(pos);
        if (!cur) return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...cur.attrs, open: !cur.attrs.open }));
      });
      const body = document.createElement('div');
      body.className = 'toggle-body';
      dom.append(btn, body);
      return {
        dom,
        contentDOM: body,
        update: (n) => {
          if (n.type !== node.type) return false;
          dom.setAttribute('data-open', String(!!n.attrs.open));
          return true;
        },
        stopEvent: (e) => e.target === btn,
        ignoreMutation: (m) => m.target === btn || m.target === dom,
      };
    };
  },
});

// ---- Content builders (plain TipTap JSON) ----
export type J = { type: string; attrs?: Record<string, unknown>; content?: J[]; text?: string };
const para = (text = ''): J => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' });

/** A month calendar as a real table: weekday header row + one row per week. */
export function calendarJson(d = new Date()): J[] {
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: string[] = [...Array(first).fill(''), ...Array.from({ length: days }, (_, i) => String(i + 1))];
  while (cells.length % 7) cells.push('');
  const rows: J[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push({ type: 'tableRow', content: cells.slice(i, i + 7).map((c) => ({ type: 'tableCell', content: [para(c)] })) });
  const head: J = { type: 'tableRow', content: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => ({ type: 'tableHeader', content: [para(w)] })) };
  return [
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) }] },
    { type: 'table', content: [head, ...rows] },
    para(),
  ];
}
