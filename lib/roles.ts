export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export const ROLE_LABEL: Record<Role, string> = { OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Editor', VIEWER: 'Viewer' };