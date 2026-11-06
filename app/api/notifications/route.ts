import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';

const S = z.object({ ids: z.array(z.string().min(1)).max(100).optional(), all: z.boolean().optional(), read: z.boolean() });

export async function GET() {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  return NextResponse.json({ unread: await prisma.notification.count({ where: { userId: u.id, read: false } }) });
}
export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const d = await parse(req, S);
  if (!d || (!d.all && !d.ids?.length)) return fail('Invalid body');
  await prisma.notification.updateMany({
    where: { userId: u.id, ...(d.all ? {} : { id: { in: d.ids } }) },
    data: { read: d.read },
  });
  return NextResponse.json({ ok: true });
}