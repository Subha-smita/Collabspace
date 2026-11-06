/**
 * Needs running: docker compose up -d, `npm run dev`, and two collab instances (:1234 and :1235).
 * Covers T05-T08, T11, T14, T17, T18 (cross-instance sync, view-only enforcement, unauthenticated rejection, persistence).
 */
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const INST_A = 'ws://localhost:1234';
const INST_B = 'ws://localhost:1235';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(f: () => boolean, ms = 8000) {
  const t = Date.now();
  while (!f()) { if (Date.now() - t > ms) throw new Error('timeout'); await sleep(50); }
}
async function api(cookie: string, path: string, method = 'GET', body?: unknown) {
  const r = await fetch(APP + path, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  assert.ok(r.ok, `${method} ${path} -> ${r.status} ${JSON.stringify(j)}`);
  return j;
}
async function user(name: string) {
  const email = `${name}${Date.now()}@test.io`;
  const r = await fetch(APP + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password: 'password123' }) });
  assert.ok(r.ok, 'register failed');
  return { email, cookie: r.headers.get('set-cookie')!.split(';')[0] };
}
function client(url: string, room: string, cookie?: string) {
  class WS extends WebSocket {
    constructor(u: string) { super(u, [], { headers: cookie ? { cookie } : {}, origin: APP }); }
  }
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(url, room, doc, { WebSocketPolyfill: WS as never });
  return { doc, provider, text: doc.getText('t') };
}

async function main() {
  const alice = await user('alice'), bob = await user('bob'), carl = await user('carl');
  const ws = await api(alice.cookie, '/api/workspaces', 'POST', { name: 'T' });
  await api(alice.cookie, `/api/workspaces/${ws.id}/members`, 'POST', { email: bob.email });
  const page = await api(alice.cookie, `/api/workspaces/${ws.id}/pages`, 'POST', { title: 'P' });
  await api(alice.cookie, `/api/pages/${page.id}/permissions`, 'PUT', { email: carl.email, permission: 'VIEW' });

  const a = client(INST_A, page.id, alice.cookie);
  const b = client(INST_B, page.id, bob.cookie); // different instance
  const c = client(INST_A, page.id, carl.cookie); // view-only
  const anon = client(INST_A, page.id);
  await until(() => a.provider.synced && b.provider.synced && c.provider.synced);

  a.text.insert(0, 'Hello ');
  b.text.insert(0, 'World ');
  await sleep(1500);
  const merged = a.text.toString();
  assert.equal(b.text.toString(), merged, 'T08/T18: instances converge');
  assert.ok(merged.includes('Hello') && merged.includes('World'), 'T07: both edits kept');
  assert.equal(c.text.toString(), merged, 'T16: viewer receives updates');

  c.text.insert(0, 'HACK');
  await sleep(1000);
  assert.ok(!a.text.toString().includes('HACK') && !b.text.toString().includes('HACK'), 'T14: view-only write rejected');
  assert.ok(!anon.provider.synced, 'T17: unauthenticated connection rejected');

  const d = client(INST_A, page.id, alice.cookie);
  await until(() => d.provider.synced);
  assert.equal(d.text.toString(), merged, 'T11: persisted content loaded');
  console.log('PASS');
  [a, b, c, anon, d].forEach((x) => { x.provider.destroy(); x.doc.destroy(); });
  process.exit(0);
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
