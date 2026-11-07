import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { signTicket } from '@/lib/session';
import { fail } from '@/lib/api';

export async function GET() {
  const u = await getUser();

  if (!u) {
    return fail('Unauthorized', 401);
  }

  try {
    const ticket = await signTicket(u.id);

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Failed to generate collaboration ticket:', error);
    return fail('Could not generate collaboration ticket', 500);
  }
}