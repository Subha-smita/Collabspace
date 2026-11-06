
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { SidebarSections } from '@/components/SettingsUI';
import SettingsCard from '@/components/SettingsCard';

export default async function SidebarSettings() {
  const u = await requireUser();
  const s = await getSettings(u.id);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sidebar</h2>
        <p className="text-gray-600">Choose which sections appear in your sidebar.</p>
      </div>
      <SettingsCard title="Sections" rows>
        <SidebarSections hidden={s.sidebarHidden} />
      </SettingsCard>
    </div>
  );
}
