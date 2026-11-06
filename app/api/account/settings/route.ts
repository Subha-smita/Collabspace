import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';
import { SECTION_KEYS } from '@/lib/settings';

const S = z
  .object({
    enterNewLine: z.boolean(),
    highContrast: z.boolean(),
    dateFormat: z.enum(['relative', 'absolute']),
    openOnStart: z.enum(['last', 'home']),
    trackRecents: z.boolean(),
    notifyMentions: z.boolean(),
    notifyReplies: z.boolean(),
    notifyInvites: z.boolean(),
    sidebarHidden: z.array(z.enum(SECTION_KEYS)).max(SECTION_KEYS.length),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0);

export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const d = await parse(req, S);
  if (!d) return fail('Invalid settings');
  await prisma.userSettings.upsert({ where: { userId: u.id }, update: d, create: { userId: u.id, ...d } });
  return NextResponse.json({ ok: true });
}
