'use client';
import { useState } from 'react';

export default function CopyLinkButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="rounded px-2 py-1 text-sm hover:bg-[#ebeae6]"
      title="Copy link"
      onClick={async () => {
        try { await navigator.clipboard.writeText(window.location.origin + window.location.pathname); setDone(true); setTimeout(() => setDone(false), 1500); } catch { alert('Could not copy the link'); }
      }}
    >
      {done ? 'Copied ✓' : '🔗 Copy link'}
    </button>
  );
}
