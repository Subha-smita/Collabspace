import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { ToggleRow } from '@/components/SettingsUI';
import SettingsCard from '@/components/SettingsCard';

export default async function Notifications() {
  const u = await requireUser();
  const s = await getSettings(u.id);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
        <p className="text-gray-600">Choose what appears in your Inbox. Turning one off applies to new events only.</p>
      </div>
      <SettingsCard title="Inbox" rows>
        <ToggleRow field="notifyMentions" label="Mentions" desc="When someone @mentions you in a comment." value={s.notifyMentions} />
        <ToggleRow field="notifyReplies" label="Replies" desc="When someone replies to your comment." value={s.notifyReplies} />
        <ToggleRow field="notifyInvites" label="Workspace invitations" desc="When you are added to a workspace." value={s.notifyInvites} />
      </SettingsCard>
    </div>
  );
}
