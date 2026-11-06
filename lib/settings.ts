import { prisma } from './prisma';
import { SECTION_KEYS, type SectionKey, type Settings } from './settingsShared';
export { SECTION_KEYS, SECTION_LABEL, type SectionKey, type Settings } from './settingsShared';

export const DEFAULTS: Settings = {
  enterNewLine: false,
  highContrast: false,
  dateFormat: 'relative',
  openOnStart: 'last',
  trackRecents: true,
  notifyMentions: true,
  notifyReplies: true,
  notifyInvites: true,
  sidebarHidden: [],
};

export async function getSettings(userId: string): Promise<Settings> {
  const r = await prisma.userSettings.findUnique({ where: { userId } });
  if (!r) return DEFAULTS;
  return {
    enterNewLine: r.enterNewLine,
    highContrast: r.highContrast,
    dateFormat: r.dateFormat === 'absolute' ? 'absolute' : 'relative',
    openOnStart: r.openOnStart === 'home' ? 'home' : 'last',
    trackRecents: r.trackRecents,
    notifyMentions: r.notifyMentions,
    notifyReplies: r.notifyReplies,
    notifyInvites: r.notifyInvites,
    sidebarHidden: r.sidebarHidden.filter((k): k is SectionKey => (SECTION_KEYS as readonly string[]).includes(k)),
  };
}
