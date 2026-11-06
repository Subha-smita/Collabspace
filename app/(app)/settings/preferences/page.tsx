import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { SelectRow, ToggleRow } from '@/components/SettingsUI';
import SettingsCard from '@/components/SettingsCard';

export default async function Preferences() {
  const u = await requireUser();
  const s = await getSettings(u.id);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Preferences</h2>
        <p className="text-gray-600">Choose how Collabspace looks and behaves.</p>
      </div>
      <SettingsCard title="Appearance" rows>
        <ToggleRow field="highContrast" label="High contrast" desc="Darker text and borders for better visibility." value={s.highContrast} />
      </SettingsCard>
      <SettingsCard title="Input" rows>
        <ToggleRow field="enterNewLine" label="Use Enter to add a new line" desc="In AI chat, Enter adds a line and Ctrl/Cmd + Enter sends." value={s.enterNewLine} />
      </SettingsCard>
      <SettingsCard title="Date & start" rows>
        <SelectRow field="dateFormat" label="Date format" desc="How edit times are shown in Library and on pages." value={s.dateFormat} options={[['relative', 'Relative (2h ago)'], ['absolute', 'Absolute (Nov 3, 2026, 4:05 PM)']]} />
        <SelectRow field="openOnStart" label="Open on start" desc="What opens when you log in or visit the site." value={s.openOnStart} options={[['last', 'Last visited page'], ['home', 'Home']]} />
      </SettingsCard>
      <SettingsCard title="Privacy" rows>
        <ToggleRow field="trackRecents" label="Remember pages I visit" desc="Powers Recents, the Library “last visited” column and “Last visited page”. Turn off to stop recording." value={s.trackRecents} />
      </SettingsCard>
    </div>
  );
}
