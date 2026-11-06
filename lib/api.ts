import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { getUser } from './auth';
import { canManage, getPerm, rank, type Perm } from './permissions';

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function parse<T>(req: Request, s: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T | null> {
  const r = s.safeParse(await req.json().catch(() => null));
  return r.success ? r.data : null;
}

/** Server-side page authorization. Returns {user, perm} or {res} to return immediately. */
export async function gate(pageId: string, min: Perm, manage = false) {
  const user = await getUser();
  if (!user) return { res: fail('Unauthorized', 401) };
  const perm = await getPerm(user.id, pageId);
  if (!perm) return { res: fail('Not found', 404) };
  if (rank[perm] < rank[min] || (manage && !(await canManage(user.id, pageId)))) return { res: fail('Forbidden', 403) };
  return { user, perm };
}

// Simple in-memory sliding-window limiter (per process).
const hits = new Map<string, number[]>();
export function limited(req: Request, key: string, max = 10, windowMs = 60_000) {
  const k = key + (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local');
  const now = Date.now();
  const a = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  a.push(now);
  hits.set(k, a);
  return a.length > max;
}
