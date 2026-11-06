
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

const ITEMS: [string, IconName, string][] = [
  ['/settings', 'user', 'Account'],
  ['/settings/preferences', 'sliders', 'Preferences'],
  ['/settings/notifications', 'bell', 'Notifications'],
  ['/settings/sidebar', 'layout', 'Sidebar'],
];

export default function SettingsNav({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const path = usePathname();
  const item = (on: boolean) => `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${on ? 'bg-[#ebeae6] font-medium' : 'text-[#5f5e5b] hover:bg-[#f1f0ee]'}`;
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto md:flex-col">
      <div className="hidden px-3 pb-1 text-xs font-semibold text-gray-500 md:block">Account</div>
      {ITEMS.map(([href, icon, label]) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={item(path === href)}>
          <Icon name={icon} />{label}
        </Link>
      ))}
      {workspaces.length > 0 && <div className="hidden px-3 pb-1 pt-4 text-xs font-semibold text-gray-500 md:block">Workspace</div>}
      {workspaces.map((w) => (
        <Link key={w.id} href={`/workspaces/${w.id}`} className={item(false)} title="Open workspace settings: rename, members, delete">
          <Icon name="folder" /><span className="truncate">{w.name}</span>
        </Link>
      ))}
    </nav>
  );
}
