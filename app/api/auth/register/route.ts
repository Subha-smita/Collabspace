import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { startSession } from '@/lib/auth';
import { fail, limited, parse } from '@/lib/api';

const S = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});
export async function POST(req: Request) {
  if (limited(req, 'reg')) return fail('Too many requests', 429);
  const d = await parse(req, S);
  if (!d) return fail('Enter a name, a valid email and a password of at least 8 characters');
  if (await prisma.user.findUnique({ where: { email: d.email } })) return fail('Email already registered', 409);
  const u = await prisma.user.create({ data: { name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12) } });
  await startSession(u.id);
  return NextResponse.json({ ok: true });
}
