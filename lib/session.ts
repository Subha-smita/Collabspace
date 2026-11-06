// Framework-agnostic: used by Next.js and the collaboration server.
import { SignJWT, jwtVerify } from 'jose';
export const COOKIE = 'session';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export const signSession = (uid: string) =>
  new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setExpirationTime('7d').sign(key());
export async function verifySession(token?: string): Promise<string | null> {
  if (!token) return null;
  try { return (await jwtVerify(token, key())).payload.sub ?? null; } catch { return null; }
}
