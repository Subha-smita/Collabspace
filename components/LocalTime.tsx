'use client';
export default function LocalTime({ iso }: { iso: string | null }) {
  if (!iso) return <>—</>;
  return <time suppressHydrationWarning dateTime={iso}>{new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>;
}
