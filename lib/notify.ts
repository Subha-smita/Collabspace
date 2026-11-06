import { prisma } from './prisma';

type N = { userId: string; actorId: string; type: 'MENTION' | 'REPLY' | 'MEMBER_ADDED'; message: string; pageId?: string; workspaceId?: string };
const PREF = { MENTION: 'notifyMentions', REPLY: 'notifyReplies', MEMBER_ADDED: 'notifyInvites' } as const;

/** Creates notifications; never notifies the person who caused the event, or people who turned that type off. */
export async function notify(items: N[]) {
  const data = items.filter((n) => n.userId !== n.actorId);
  if (!data.length) return;
  const rows = await prisma.userSettings.findMany({ where: { userId: { in: [...new Set(data.map((n) => n.userId))] } } });
  const by = new Map(rows.map((r) => [r.userId, r]));
  const allowed = data.filter((n) => by.get(n.userId)?.[PREF[n.type]] !== false);
  if (allowed.length) await prisma.notification.createMany({ data: allowed });
}
