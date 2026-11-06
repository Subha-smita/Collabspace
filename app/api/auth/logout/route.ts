import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE } from '@/lib/session';
export async function POST() {
  cookies().delete(COOKIE);
  return NextResponse.json({ ok: true });
}
