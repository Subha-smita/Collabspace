// Client-safe settings types/constants (no database imports).
export const SECTION_KEYS = ['recents', 'favorites', 'workspaces', 'shared'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export const SECTION_LABEL: Record<SectionKey, string> = { recents: 'Recents', favorites: 'Favorites', workspaces: 'Workspaces', shared: 'Shared with me' };

export type Settings = {
  enterNewLine: boolean;
  highContrast: boolean;
  dateFormat: 'relative' | 'absolute';
  openOnStart: 'last' | 'home';
  trackRecents: boolean;
  notifyMentions: boolean;
  notifyReplies: boolean;
  notifyInvites: boolean;
  sidebarHidden: SectionKey[];
};
