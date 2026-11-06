
'use client';
import { useEffect, useRef } from 'react';

const GROUPS: [string, string[]][] = [
  ['Smileys', ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '😉', '😊', '😍', '🤩', '😎', '🤔', '😴', '😭', '😡', '🥳', '🤯', '🙌', '👍', '👏', '🙏', '💪']],
  ['Objects', ['📄', '📝', '📚', '📖', '📌', '📎', '📅', '📊', '📈', '💡', '🔖', '🗂️', '📁', '🗒️', '✏️', '🖊️', '💻', '📱', '🔧', '⚙️', '🔒', '🔑', '🎯', '🧪']],
  ['Nature', ['🌱', '🌿', '🌳', '🌸', '🌻', '🍀', '🌈', '☀️', '🌙', '⭐', '🔥', '💧', '❄️', '⚡', '🌍', '🐶', '🐱', '🦊', '🦋', '🐝']],
  ['Food & fun', ['🍎', '🍕', '🍔', '🍰', '☕', '🍵', '🎉', '🎨', '🎵', '🎮', '⚽', '🏆', '🚀', '✈️', '🏠', '❤️', '💙', '💚', '💛', '💜']],
  ['Symbols', ['✅', '☑️', '❌', '❗', '❓', '⚠️', '✨', '💬', '🔔', '🏁', '🚩', '➕', '➖', '➡️', '⬆️', '♻️']],
];

export default function EmojiPicker({ onPick, onRemove, onClose }: { onPick: (e: string) => void; onRemove?: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-label="Choose an emoji" className="absolute z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-[#e9e9e7] bg-white p-2 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
      {onRemove && <button type="button" className="mb-1 w-full rounded px-2 py-1 text-left text-sm text-gray-600 hover:bg-[#ebeae6]" onClick={onRemove}>Remove icon</button>}
      {GROUPS.map(([name, list]) => (
        <div key={name} className="mb-2">
          <div className="px-1 pb-1 text-xs font-semibold text-gray-500">{name}</div>
          <div className="grid grid-cols-8 gap-0.5">
            {list.map((e) => (
              <button key={e} type="button" className="rounded p-1 text-xl hover:bg-[#ebeae6]" onClick={() => onPick(e)}>{e}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
