
import type { ReactNode } from 'react';
import type { JSONContent } from '@tiptap/react';

const safeHref = (h: unknown) => (typeof h === 'string' && /^(https?:\/\/|mailto:)/i.test(h) ? h : undefined);
const safeSrc = (s: unknown) => (typeof s === 'string' && /^(https?:\/\/|\/api\/uploads\/)/i.test(s) ? s : undefined);

function mark(n: JSONContent, key: number): ReactNode {
  let out: ReactNode = n.text;
  for (const m of n.marks ?? []) {
    if (m.type === 'bold') out = <strong>{out}</strong>;
    else if (m.type === 'italic') out = <em>{out}</em>;
    else if (m.type === 'strike') out = <s>{out}</s>;
    else if (m.type === 'underline') out = <u>{out}</u>;
    else if (m.type === 'code') out = <code className="rounded bg-[#ebeae6] px-1 py-0.5 text-[0.9em]">{out}</code>;
    else if (m.type === 'link') { const h = safeHref(m.attrs?.href); if (h) out = <a href={h} rel="noopener noreferrer nofollow" target="_blank" className="underline">{out}</a>; }
  }
  return <span key={key} style={{ display: 'contents' }}>{out}</span>;
}

const kids = (n: JSONContent): ReactNode[] => (n.content ?? []).map((c, i) => node(c, i));

function node(n: JSONContent, key: number): ReactNode {
  switch (n.type) {
    case 'text': return mark(n, key);
    case 'hardBreak': return <br key={key} />;
    case 'paragraph': return <p key={key} className="my-1 min-h-[1.5em]">{kids(n)}</p>;
    case 'heading': {
      const L = (['h1', 'h2', 'h3'] as const)[Math.min(Math.max(Number(n.attrs?.level ?? 1), 1), 3) - 1];
      return <L key={key} className={L === 'h1' ? 'mb-1 mt-6 text-3xl font-bold' : L === 'h2' ? 'mb-1 mt-5 text-2xl font-semibold' : 'mb-1 mt-4 text-xl font-semibold'}>{kids(n)}</L>;
    }
    case 'bulletList': return <ul key={key} className="my-1 list-disc pl-6">{kids(n)}</ul>;
    case 'orderedList': return <ol key={key} className="my-1 list-decimal pl-6">{kids(n)}</ol>;
    case 'listItem': return <li key={key}>{kids(n)}</li>;
    case 'taskList': return <ul key={key} className="my-1 list-none pl-0">{kids(n)}</ul>;
    case 'taskItem': return (
      <li key={key} className="flex items-start gap-2">
        <input type="checkbox" checked={!!n.attrs?.checked} disabled readOnly aria-label="Task" className="mt-1.5" />
        <div className="min-w-0 flex-1">{kids(n)}</div>
      </li>
    );
    case 'blockquote': return <blockquote key={key} className="my-2 border-l-4 border-[#37352f] pl-4">{kids(n)}</blockquote>;
    case 'codeBlock': return <pre key={key} className="my-2 overflow-x-auto rounded bg-[#f7f6f3] p-3 text-sm"><code>{(n.content ?? []).map((c) => c.text).join('')}</code></pre>;
    case 'callout': return (
      <div key={key} className="my-3 flex gap-3 rounded-lg bg-[#f1f0ee] p-4">
        <span aria-hidden className="text-xl leading-7">{String(n.attrs?.emoji ?? '💡')}</span><div className="min-w-0 flex-1">{kids(n)}</div>
      </div>
    );
    case 'toggle': {
      const [title, ...rest] = n.content ?? [];
      return (
        <details key={key} open={n.attrs?.open !== false} className="my-2">
          <summary className="cursor-pointer font-medium">{title ? kids({ type: 'x', content: title.content }) : null}</summary>
          <div className="pl-5">{rest.map((c, i) => node(c, i))}</div>
        </details>
      );
    }
    case 'horizontalRule': return <hr key={key} className="my-4 border-[#e9e9e7]" />;
    case 'image': { const s = safeSrc(n.attrs?.src); return s ? /* eslint-disable-next-line @next/next/no-img-element */ <img key={key} src={s} alt={String(n.attrs?.alt ?? '')} className="my-2 max-w-full rounded" /> : null; }
    case 'table': return <div key={key} className="my-2 overflow-x-auto"><table className="w-full border-collapse"><tbody>{kids(n)}</tbody></table></div>;
    case 'tableRow': return <tr key={key}>{kids(n)}</tr>;
    case 'tableHeader': return <th key={key} className="border border-[#e3e2de] bg-[#f7f6f3] p-2 text-left font-semibold">{kids(n)}</th>;
    case 'tableCell': return <td key={key} className="border border-[#e3e2de] p-2 align-top">{kids(n)}</td>;
    default: return n.content ? <div key={key}>{kids(n)}</div> : null;
  }
}

export default function PublicDoc({ json }: { json: JSONContent }) {
  return <article className="text-base leading-relaxed text-[#37352f]">{kids(json)}</article>;
}
