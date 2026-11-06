import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';

const S = z.object({ name: z.string().trim().min(1).max(80) });
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const d = await parse(req, S);
  if (!d) return fail('Name is required');
  const w = await prisma.workspace.create({
    data: { name: d.name, ownerId: u.id, members: { create: { userId: u.id, role: 'OWNER' } } },
  });
  return NextResponse.json({ id: w.id });
}
