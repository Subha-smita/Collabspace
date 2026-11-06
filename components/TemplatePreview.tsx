import PublicDoc from './PublicDoc';
import type { N, ShapeSeed } from '@/lib/templates';

/** Read-only preview of a template: a document (TipTap JSON) or a canvas (shapes). */
export default function TemplatePreview({ doc, shapes }: { doc?: N; shapes?: ShapeSeed[] }) {
  if (shapes?.length) {
    const xs = shapes.flatMap((s) => [s.x, s.x + s.w]);
    const ys = shapes.flatMap((s) => [s.y, s.y + s.h]);
    const x0 = Math.min(...xs) - 20, y0 = Math.min(...ys) - 20, x1 = Math.max(...xs) + 20, y1 = Math.max(...ys) + 20;
    return (
      <svg role="img" aria-label="Canvas preview" viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} className="h-auto w-full rounded-lg bg-white">
        {shapes.map((s, i) => {
          const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
          const label = s.text ? <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={s.kind === 'text' ? 20 : 16} fontWeight={s.kind === 'text' ? 600 : 400} fill="#37352f">{s.text}</text> : null;
          if (s.kind === 'line') return <line key={i} x1={s.x} y1={s.y} x2={s.x + s.w} y2={s.y + s.h} stroke="#9b9a97" strokeWidth={2} />;
          if (s.kind === 'ellipse') return <g key={i}><ellipse cx={cx} cy={cy} rx={s.w / 2} ry={s.h / 2} fill={s.fill ?? '#fff'} stroke="#d3d2ce" strokeWidth={2} />{label}</g>;
          if (s.kind === 'text') return <g key={i}>{s.text && <text x={s.x} y={cy} dominantBaseline="middle" fontSize={20} fontWeight={600} fill="#37352f">{s.text}</text>}</g>;
          return <g key={i}><rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.kind === 'sticky' ? 4 : 10} fill={s.fill ?? '#fff'} stroke="#d3d2ce" strokeWidth={s.kind === 'sticky' ? 0 : 2} />{label}</g>;
        })}
      </svg>
    );
  }
  return doc ? <PublicDoc json={doc as never} /> : <p className="text-gray-500">No preview available.</p>;
}


