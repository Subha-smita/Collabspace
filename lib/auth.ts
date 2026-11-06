
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';
import { COOKIE, signSession, verifySession } from './session';

export async function startSession(userId: string) {
  cookies().set(COOKIE, await signSession(userId), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}
export async function getUser() {
  const uid = await verifySession(cookies().get(COOKIE)?.value);
  return uid ? prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true } }) : null;
}
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect('/login');
  return u;
}
