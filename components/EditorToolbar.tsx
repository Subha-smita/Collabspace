'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import Icon from './Icon';
import { COMMANDS } from './SlashMenu';

const S = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
const G: Record<string, ReactNode> = {
  bold: <path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z" />,
  italic: <><line x1="19" x2="10" y1="4" y2="4" /><line x1="14" x2="5" y1="20" y2="20" /><line x1="15" x2="9" y1="4" y2="20" /></>,
  underline: <><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" x2="20" y1="20" y2="20" /></>,
  strike: <><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" x2="20" y1="12" y2="12" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  ul: <><line x1="9" x2="20" y1="6" y2="6" /><line x1="9" x2="20" y1="12" y2="12" /><line x1="9" x2="20" y1="18" y2="18" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  ol: <><line x1="10" x2="20" y1="6" y2="6" /><line x1="10" x2="20" y1="12" y2="12" /><line x1="10" x2="20" y1="18" y2="18" /><path d="M4 6h1v4M4 10h2M4 14h2l-2 3h2" /></>,
  todo: <><rect width="6" height="6" x="3" y="5" rx="1" /><path d="m4 8 1.2 1.2L8 6.5" /><line x1="13" x2="21" y1="8" y2="8" /><rect width="6" height="6" x="3" y="15" rx="1" /><line x1="13" x2="21" y1="18" y2="18" /></>,
  quote: <><path d="M4 8h4v4a4 4 0 0 1-4 4" /><path d="M14 8h4v4a4 4 0 0 1-4 4" /></>,
  codeblock: <><rect width="18" height="16" x="3" y="4" rx="2" /><path d="m9 10-2 2 2 2M15 10l2 2-2 2" /></>,
  table: <><rect width="18" height="16" x="3" y="4" rx="2" /><path d="M3 10h18M3 15h18M10 4v16" /></>,
  calendar: <><rect width="18" height="17" x="3" y="5" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></>,
  divider: <><line x1="3" x2="21" y1="12" y2="12" /><path d="M7 7h.01M12 7h.01M17 7h.01M7 17h.01M12 17h.01M17 17h.01" /></>,
  callout: <><rect width="18" height="14" x="3" y="5" rx="2" /><path d="M7 12h.01M11 10h6M11 14h4" /></>,
  toggle: <><path d="m9 6 6 6-6 6" /><line x1="3" x2="3.01" y1="12" y2="12" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></>,
};
const INSERT_ICON: Record<string, string> = { Table: 'table', Calendar: 'calendar', Divider: 'divider', Callout: 'callout', 'Toggle list': 'toggle', 'Code block': 'codeblock', Quote: 'quote', 'To-do list': 'todo', 'Bulleted list': 'ul', 'Numbered list': 'ol', Image: 'image' };
const INSERT_ORDER = ['Table', 'Calendar', 'Image', 'Divider', 'Callout', 'Toggle list', 'Code block', 'Quote', 'To-do list', 'Bulleted list', 'Numbered list'];
const glyph = (n: string) => (n === 'image' ? <Icon name="image" /> : <S>{G[n]}</S>);

function Btn({ label, onClick, active, children, disabled }: { label: string; onClick: () => void; active?: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`tb-btn group relative flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${active ? 'bg-[#e7f1fb] text-[#2383e2]' : 'text-[#5f5e5b] hover:bg-[#ebeae6] hover:text-[#37352f]'}`}>
      {children}
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#37352f] px-2 py-1 text-xs font-normal text-white opacity-0 shadow transition-opacity delay-300 group-hover:opacity-100">{label}</span>
    </button>
  );
}
const Sep = () => <span aria-hidden className="mx-1 h-5 w-px bg-[#e3e2de]" />;

type Props = { editor: Editor; uploading: boolean; onUploadImage: () => void; onLink: () => void; emojiOpen: boolean; onEmoji: () => void };

export default function EditorToolbar({ editor, uploading, onUploadImage, onLink, emojiOpen, onEmoji }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const c = () => editor.chain().focus();
  const a = (n: string, o?: Record<string, unknown>) => editor.isActive(n, o);
  const inTable = editor.isActive('table');
  const items = INSERT_ORDER.flatMap((t) => COMMANDS.filter((x) => x.title === t));

  return (
    <div role="toolbar" aria-label="Formatting" className="relative mb-3 flex flex-wrap items-center gap-0.5 rounded-lg border border-[#e9e9e7] bg-white px-1.5 py-1 shadow-sm">
      <Btn label="Undo (Ctrl+Z)" onClick={() => c().undo().run()}><Icon name="undo" /></Btn>
      <Btn label="Redo (Ctrl+Shift+Z)" onClick={() => c().redo().run()}><Icon name="redo" /></Btn>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={a('bold')} onClick={() => c().toggleBold().run()}><S>{G.bold}</S></Btn>
      <Btn label="Italic (Ctrl+I)" active={a('italic')} onClick={() => c().toggleItalic().run()}><S>{G.italic}</S></Btn>
      <Btn label="Underline (Ctrl+U)" active={a('underline')} onClick={() => c().toggleUnderline().run()}><S>{G.underline}</S></Btn>
      <Btn label="Strikethrough" active={a('strike')} onClick={() => c().toggleStrike().run()}><S>{G.strike}</S></Btn>
      <Btn label="Inline code" active={a('code')} onClick={() => c().toggleCode().run()}><S>{G.code}</S></Btn>
      <Sep />
      {([1, 2, 3] as const).map((l) => <Btn key={l} label={`Heading ${l}`} active={a('heading', { level: l })} onClick={() => c().toggleHeading({ level: l }).run()}>H{l}</Btn>)}
      <Sep />
      <Btn label="Bulleted list" active={a('bulletList')} onClick={() => c().toggleBulletList().run()}><S>{G.ul}</S></Btn>
      <Btn label="Numbered list" active={a('orderedList')} onClick={() => c().toggleOrderedList().run()}><S>{G.ol}</S></Btn>
      <Btn label="Checklist" active={a('taskList')} onClick={() => c().toggleTaskList().run()}><S>{G.todo}</S></Btn>
      <Btn label="Quote" active={a('blockquote')} onClick={() => c().toggleBlockquote().run()}><S>{G.quote}</S></Btn>
      <Btn label="Code block" active={a('codeBlock')} onClick={() => c().toggleCodeBlock().run()}><S>{G.codeblock}</S></Btn>
      <Sep />
      <Btn label="Link" active={a('link')} onClick={onLink}><Icon name="link" /></Btn>
      <Btn label="Emoji" active={emojiOpen} onClick={onEmoji}><Icon name="smile" /></Btn>
      <div ref={ref} className="relative">
        <button type="button" aria-haspopup="menu" aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(!open)}
          className="ml-1 flex h-8 items-center gap-1 rounded-md bg-[#2383e2] px-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#0b6ec5]">
          <Icon name="plus" size={14} />{uploading ? 'Uploading…' : 'Insert'}<Icon name="down" size={12} />
        </button>
        {open && (
          <div role="menu" className="absolute left-0 top-full z-50 mt-1 grid max-h-[70vh] w-[min(18rem,86vw)] gap-0.5 overflow-y-auto rounded-lg border border-[#e9e9e7] bg-white p-1.5 shadow-lg">
            {items.map((it) => {
              const isImg = it.title === 'Image';
              return (
                <div key={it.title}>
                  <button type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setOpen(false); isImg ? onUploadImage() : it.run(editor); }}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#f1f0ee]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e9e9e7] bg-[#fbfbfa] text-[#5f5e5b]">{glyph(INSERT_ICON[it.title])}</span>
                    <span className="min-w-0"><span className="block">{isImg ? 'Image (upload)' : it.title}</span><span className="block truncate text-xs text-gray-500">{isImg ? 'From your computer' : it.hint}</span></span>
                  </button>
                  {isImg && (
                    <button type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); it.run(editor); }}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#f1f0ee]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e9e9e7] bg-[#fbfbfa] text-[#5f5e5b]"><Icon name="link" /></span>
                      <span className="min-w-0"><span className="block">Image (URL)</span><span className="block truncate text-xs text-gray-500">Embed from a link</span></span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {inTable && (
        <>
          <Sep />
          {([['+ Row', () => c().addRowAfter().run()], ['+ Col', () => c().addColumnAfter().run()], ['− Row', () => c().deleteRow().run()], ['− Col', () => c().deleteColumn().run()], ['Delete table', () => c().deleteTable().run()]] as [string, () => void][]).map(([l, f]) => (
            <Btn key={l} label={l} onClick={f}><span className="text-xs">{l}</span></Btn>
          ))}
        </>
      )}
    </div>
  );
}
