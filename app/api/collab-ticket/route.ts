import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/api';
import { signTicket } from '@/lib/session';

export async function GET() {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  return NextResponse.json({ ticket: await signTicket(u.id) }, { headers: { 'Cache-Control': 'no-store' } });
}