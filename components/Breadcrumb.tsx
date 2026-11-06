import Link from 'next/link';
import Icon from './Icon';

export default function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-600">
      {items.map((it, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && <Icon name="right" size={12} className="text-gray-400" />}
          {it.href ? <Link href={it.href} className="truncate rounded px-1 py-0.5 hover:bg-[#ebeae6]">{it.label}</Link> : <span className="truncate px-1 py-0.5 font-medium text-[#37352f]" aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
