'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function FavoriteButton({ pageId, initial }: { pageId: string; initial: boolean }) {
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={fav}
      disabled={busy}
      title={fav ? 'Remove from favorites' : 'Add to favorites'}
      className="rounded px-2 py-1 text-sm hover:bg-[#ebeae6] disabled:opacity-50"
      onClick={async () => {
        const next = !fav;
        setBusy(true);
        const r = await fetch(`/api/pages/${pageId}/favorite`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favorite: next }) });
        setBusy(false);
        if (!r.ok) return alert('Could not update favorites');
        setFav(next);
        router.refresh();
      }}
    >
      {fav ? '★ Favorited' : '☆ Favorite'}
    </button>
  );
}