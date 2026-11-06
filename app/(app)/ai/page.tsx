
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import AiChat from '@/components/AiChat';

export default async function Ai() {
  const u = await requireUser();
  const s = await getSettings(u.id);
  return <AiChat enterNewLine={s.enterNewLine} />;
}
