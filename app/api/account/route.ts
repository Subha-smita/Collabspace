import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';

export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const d = await parse(req, z.object({ name: z.string().trim().min(1).max(80) }));
  if (!d) return fail('Enter a name (max 80 characters)');
  await prisma.user.update({ where: { id: u.id }, data: { name: d.name } });
  return NextResponse.json({ ok: true });
}