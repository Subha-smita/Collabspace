import { requireUser } from '@/lib/auth';
import { PasswordForm, ProfileForm } from '@/components/SettingsForms';
import SettingsCard from '@/components/SettingsCard';

export default async function Account() {
  const u = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
        <p className="text-gray-600">Manage your profile and sign-in details.</p>
      </div>
      <SettingsCard title="Profile" desc="How you appear to other people in your workspaces.">
        <ProfileForm name={u.name} email={u.email} />
      </SettingsCard>
      <SettingsCard title="Password" desc="Choose a strong password you don’t use anywhere else.">
        <PasswordForm />
      </SettingsCard>
    </div>
  );
}
