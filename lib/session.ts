// Framework-agnostic: used by Next.js and the collaboration server.
import { SignJWT, jwtVerify } from 'jose';
export const COOKIE = 'session';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export const signSession = (uid: string) =>
  new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setExpirationTime('7d').sign(key());
export async function verifySession(token?: string): Promise<string | null> {
  if (!token) return null;
  try { const p = (await jwtVerify(token, key())).payload; return p.aud ? null : p.sub ?? null; } catch { return null; }
}
export const signTicket = (uid: string) =>
  new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setAudience('collab-ws').setExpirationTime('5m').sign(key());
export async function verifyTicket(token?: string | null): Promise<string | null> {
  if (!token) return null;
  try { return (await jwtVerify(token, key(), { audience: 'collab-ws' })).payload.sub ?? null; } catch { return null; }
}