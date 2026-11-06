import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { startSession } from '@/lib/auth';
import { fail, limited, parse } from '@/lib/api';

const S = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });
export async function POST(req: Request) {
  if (limited(req, 'login')) return fail('Too many attempts, try again later', 429);
  const d = await parse(req, S);
  if (!d) return fail('Enter a valid email and password');
  const u = await prisma.user.findUnique({ where: { email: d.email } });
  if (!u || !(await bcrypt.compare(d.password, u.passwordHash))) return fail('Invalid credentials', 401);
  await startSession(u.id);
  return NextResponse.json({ ok: true });
}
