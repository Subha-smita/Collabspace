'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { Editor } from '@tiptap/react';
import '@tiptap/extension-image';
import '@tiptap/extension-task-list';
import '@tiptap/extension-table';
import { calendarJson } from '@/lib/blocks';

export type Range = { from: number; to: number };
export type Cmd = { title: string; hint: string; keywords: string; run: (e: Editor, r?: Range) => void };

// With a range (slash menu) the typed "/query" is removed first; without one (toolbar) the block is inserted at the cursor.
const base = (e: Editor, r?: Range) => { const c = e.chain().focus(); return r ? c.deleteRange(r) : c; };

export const COMMANDS: Cmd[] = [
  { title: 'Text', hint: 'Plain paragraph', keywords: 'paragraph plain', run: (e, r) => base(e, r).setParagraph().run() },
  { title: 'Heading 1', hint: 'Big section heading', keywords: 'h1 title', run: (e, r) => base(e, r).setHeading({ level: 1 }).run() },
  { title: 'Heading 2', hint: 'Medium heading', keywords: 'h2', run: (e, r) => base(e, r).setHeading({ level: 2 }).run() },
  { title: 'Heading 3', hint: 'Small heading', keywords: 'h3', run: (e, r) => base(e, r).setHeading({ level: 3 }).run() },
  { title: 'Bulleted list', hint: 'Simple list', keywords: 'ul bullets', run: (e, r) => base(e, r).toggleBulletList().run() },
  { title: 'Numbered list', hint: 'Ordered list', keywords: 'ol numbers', run: (e, r) => base(e, r).toggleOrderedList().run() },
  { title: 'To-do list', hint: 'Checkboxes', keywords: 'task checkbox todo', run: (e, r) => base(e, r).toggleTaskList().run() },
  { title: 'Quote', hint: 'Highlight a quote', keywords: 'blockquote', run: (e, r) => base(e, r).toggleBlockquote().run() },
  { title: 'Code block', hint: 'Monospaced code', keywords: 'pre snippet', run: (e, r) => base(e, r).toggleCodeBlock().run() },
  { title: 'Divider', hint: 'Horizontal line', keywords: 'hr line separator', run: (e, r) => base(e, r).setHorizontalRule().run() },
  { title: 'Table', hint: '3 × 3 table', keywords: 'grid rows columns', run: (e, r) => base(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Callout', hint: 'Highlighted note box', keywords: 'info note highlight', run: (e, r) => base(e, r).insertCallout().run() },
  { title: 'Toggle list', hint: 'Collapsible section', keywords: 'collapse details accordion', run: (e, r) => base(e, r).insertToggle().run() },
  { title: 'Calendar', hint: 'Month view of this month', keywords: 'date month schedule', run: (e, r) => base(e, r).insertContent(calendarJson()).run() },
  {
    title: 'Image', hint: 'Embed from a URL', keywords: 'picture photo',
    run: (e, r) => {
      const url = window.prompt('Image URL (https://…)')?.trim();
      const chain = base(e, r);
      if (url && /^https?:\/\//i.test(url)) chain.setImage({ src: url }).run();
      else chain.run();
    },
  },
];

export const filterCommands = (q: string) => {
  const s = q.toLowerCase();
  return COMMANDS.filter((c) => `${c.title} ${c.keywords}`.toLowerCase().includes(s));
};

export function SlashMenu({ items, index, style, onPick, onHover }: {
  items: Cmd[]; index: number; style: CSSProperties; onPick: (i: number) => void; onHover: (i: number) => void;
}) {
  const active = useRef<HTMLDivElement>(null);
  useEffect(() => { active.current?.scrollIntoView({ block: 'nearest' }); }, [index, items.length]);
  return (
    <div
      role="listbox"
      aria-label="Insert block"
      className="fixed z-50 max-h-64 w-64 overflow-y-auto rounded border border-[#e9e9e7] bg-white p-1 text-sm shadow-lg"
      style={style}
      onMouseDown={(e) => e.preventDefault()}
    >
      {items.length === 0 && <p className="px-2 py-1 text-gray-600">No results</p>}
      {items.map((c, i) => (
        <div
          key={c.title}
          ref={i === index ? active : undefined}
          role="option"
          aria-selected={i === index}
          className={`cursor-pointer rounded px-2 py-1 ${i === index ? 'bg-[#ebeae6]' : ''}`}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(i)}
        >
          <div>{c.title}</div>
          <div className="text-xs text-gray-600">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}