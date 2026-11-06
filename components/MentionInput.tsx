'use client';
import { useRef, useState } from 'react';

export type Person = { id: string; name: string };

export default function MentionInput({ value, people, onChange, placeholder, label, autoFocus }: {
  value: string; people: Person[]; onChange: (text: string, mentionIds: string[]) => void;
  placeholder?: string; label: string; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const picked = useRef(new Map<string, string>());
  const [open, setOpen] = useState<{ start: number; query: string } | null>(null);
  const [i, setI] = useState(0);
  const matches = open ? people.filter((p) => p.name.toLowerCase().includes(open.query.toLowerCase())).slice(0, 5) : [];

  const emit = (text: string) =>
    onChange(text, [...picked.current].filter(([, n]) => text.includes(`@${n}`)).map(([id]) => id));

  const detect = (text: string, caret: number) => {
    const m = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
    if (!m) return setOpen(null);
    setOpen({ start: m.index + m[1].length, query: m[2] });
    setI(0);
  };
  const pick = (p: Person) => {
    if (!open || !ref.current) return;
    const caret = ref.current.selectionStart ?? value.length;
    picked.current.set(p.id, p.name);
    emit(`${value.slice(0, open.start)}@${p.name} ${value.slice(caret)}`);
    setOpen(null);
    const pos = open.start + p.name.length + 2;
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(pos, pos); });
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={ref}
        className="w-full"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        required
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-autocomplete="list"
        aria-controls="mention-list"
        onChange={(e) => { emit(e.target.value); detect(e.target.value, e.target.selectionStart ?? e.target.value.length); }}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setI((i + 1) % matches.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setI((i + matches.length - 1) % matches.length); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[i]); }
          else if (e.key === 'Escape') { e.preventDefault(); setOpen(null); }
        }}
        onBlur={() => setTimeout(() => setOpen(null), 120)}
      />
      {matches.length > 0 && (
        <ul id="mention-list" role="listbox" className="absolute left-0 top-full z-20 mt-1 w-full rounded border border-[#e9e9e7] bg-white p-1 text-sm shadow-lg">
          {matches.map((p, n) => (
            <li
              key={p.id}
              role="option"
              aria-selected={n === i}
              className={`cursor-pointer rounded px-2 py-1 ${n === i ? 'bg-accent-soft' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}