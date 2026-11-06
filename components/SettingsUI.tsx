'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SECTION_KEYS, SECTION_LABEL, type SectionKey, type Settings } from '@/lib/settingsShared';

async function save(patch: Partial<Settings>) {
  const r = await fetch('/api/account/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
  return r.ok;
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {desc && <div className="text-sm text-gray-600">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-[#c9c8c4]'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

type BoolKey = 'enterNewLine' | 'highContrast' | 'trackRecents' | 'notifyMentions' | 'notifyReplies' | 'notifyInvites';
type SelKey = 'dateFormat' | 'openOnStart';

export function ToggleRow({ field, label, desc, value }: { field: BoolKey; label: string; desc?: string; value: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(value);
  return (
    <Row label={label} desc={desc}>
      <Switch
        on={on}
        label={label}
        onChange={async (v) => {
          setOn(v);
          if (await save({ [field]: v })) router.refresh();
          else { setOn(!v); alert('Could not save the setting'); }
        }}
      />
    </Row>
  );
}

export function SelectRow({ field, label, desc, value, options }: { field: SelKey; label: string; desc?: string; value: string; options: [string, string][] }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  return (
    <Row label={label} desc={desc}>
      <select
        aria-label={label}
        value={v}
        onChange={async (e) => {
          const prev = v;
          setV(e.target.value);
          if (await save({ [field]: e.target.value } as Partial<Settings>)) router.refresh();
          else { setV(prev); alert('Could not save the setting'); }
        }}
      >
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </Row>
  );
}

/** Checklist of sidebar sections; used on the Sidebar settings page and in the sidebar's "Customize" panel. */
export function SidebarSections({ hidden: initial, compact }: { hidden: SectionKey[]; compact?: boolean }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<SectionKey[]>(initial);
  async function toggle(k: SectionKey) {
    const prev = hidden;
    const next = hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k];
    setHidden(next);
    if (await save({ sidebarHidden: next })) router.refresh();
    else { setHidden(prev); alert('Could not save the setting'); }
  }
  return (
    <ul className={compact ? 'space-y-1' : 'divide-y divide-[#e9e9e7]'}>
      {SECTION_KEYS.map((k) => (
        <li key={k}>
          {compact ? (
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[#ebeae6]">
              <input type="checkbox" className="h-4 w-4 accent-[#2f6fa3]" checked={!hidden.includes(k)} onChange={() => toggle(k)} />
              {SECTION_LABEL[k]}
            </label>
          ) : (
            <Row label={SECTION_LABEL[k]}>
              <Switch on={!hidden.includes(k)} label={`Show ${SECTION_LABEL[k]}`} onChange={() => toggle(k)} />
            </Row>
          )}
        </li>
      ))}
    </ul>
  );
}
