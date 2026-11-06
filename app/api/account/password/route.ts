import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, limited, parse } from '@/lib/api';

const S = z.object({ current: z.string().min(1).max(128), next: z.string().min(8).max(128) });

export async function POST(req: Request) {
  if (limited(req, 'pw', 5)) return fail('Too many attempts, try again later', 429);
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const d = await parse(req, S);
  if (!d) return fail('New password must be at least 8 characters');
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(d.current, row.passwordHash))) return fail('Current password is incorrect');
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(d.next, 12) } });
  return NextResponse.json({ ok: true });
}