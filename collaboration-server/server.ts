/**
 * Yjs collaboration server: ws + y-protocols, Postgres persistence, Redis pub/sub fan-out.
 * Run N instances (different COLLABORATION_PORT) against the same Postgres + Redis.
 */
import http from 'http';
import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import * as Y from 'yjs';
import * as sync from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { prisma } from '../lib/prisma';
import { COOKIE, verifySession } from '../lib/session';
import { getPerm, type Perm } from '../lib/permissions';

const PORT = Number(process.env.COLLABORATION_PORT ?? 1234);
const APP_ORIGIN = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').origin;
const INSTANCE = randomUUID(); // 36 chars; used to ignore our own Redis messages
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const FLUSH_MS = 500; // batch keystrokes into one DB row
const COMPACT_AFTER = 50; // merge update rows after N writes

const pub = new Redis(process.env.REDIS_URL!);
const sub = new Redis(process.env.REDIS_URL!);

type Room = {
  id: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>; // conn -> awareness client ids it controls
  buf: Uint8Array[];
  timer?: NodeJS.Timeout;
  writes: number;
  ready: Promise<void>;
};
const rooms = new Map<string, Room>();
const chan = (id: string) => `collab:${id}`;
const frame = (kind: number, payload: Uint8Array) => Buffer.concat([Buffer.from([kind]), Buffer.from(INSTANCE), Buffer.from(payload)]);
const send = (c: WebSocket, m: Uint8Array) => { if (c.readyState === WebSocket.OPEN) c.send(m, (e) => e && c.close()); };

/* ---------- persistence ---------- */
async function compact(pageId: string) {
  const rows = await prisma.documentUpdate.findMany({ where: { pageId }, orderBy: { id: 'asc' }, select: { id: true, data: true } });
  if (rows.length < 2) return;
  const merged = Y.mergeUpdates(rows.map((r) => r.data));
  await prisma.$transaction([
    prisma.documentUpdate.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } }), // only rows we read; concurrent inserts survive
    prisma.documentUpdate.create({ data: { pageId, data: Buffer.from(merged) } }),
  ]);
}

async function flush(room: Room) {
  room.timer = undefined;
  if (!room.buf.length) return;
  const merged = Y.mergeUpdates(room.buf.splice(0));
  try {
    await prisma.documentUpdate.create({ data: { pageId: room.id, data: Buffer.from(merged) } });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2003') { room.conns.forEach((_, c) => c.close(4404)); return; } // page deleted
    console.error('persist failed, will retry', e);
    room.buf.unshift(merged); // never drop updates
    room.timer = setTimeout(() => flush(room), 2000);
    return;
  }
  prisma.page.update({ where: { id: room.id }, data: { updatedAt: new Date() } }).catch(() => {});
  if (++room.writes >= COMPACT_AFTER) {
    room.writes = 1;
    compact(room.id).catch((e) => console.error('compact failed', e));
  }
}

/* ---------- room lifecycle ---------- */
function onDocUpdate(room: Room, update: Uint8Array, origin: unknown) {
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, MSG_SYNC);
  sync.writeUpdate(e, update);
  const m = encoding.toUint8Array(e);
  room.conns.forEach((_, c) => { if (c !== origin) send(c, m); });
  if (origin === 'redis' || origin === 'db') return; // already persisted/published by the originating instance
  pub.publish(chan(room.id), frame(0, update)).catch(console.error);
  room.buf.push(update);
  if (!room.timer) room.timer = setTimeout(() => flush(room), FLUSH_MS);
}

function onAwareness(room: Room, ch: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) {
  if (origin instanceof WebSocket) {
    const ids = room.conns.get(origin);
    if (ids) { ch.added.forEach((i) => ids.add(i)); ch.removed.forEach((i) => ids.delete(i)); }
  }
  const upd = awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...ch.added, ...ch.updated, ...ch.removed]);
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, MSG_AWARENESS);
  encoding.writeVarUint8Array(e, upd);
  const m = encoding.toUint8Array(e);
  room.conns.forEach((_, c) => send(c, m));
  if (origin !== 'redis') pub.publish(chan(room.id), frame(1, upd)).catch(console.error);
}

function getRoom(id: string): Room {
  const existing = rooms.get(id);
  if (existing) return existing;
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  const room: Room = { id, doc, awareness, conns: new Map(), buf: [], writes: 0, ready: Promise.resolve() };
  rooms.set(id, room);
  room.ready = (async () => {
    await sub.subscribe(chan(id)); // subscribe before loading so no cross-instance update is missed
    const rows = await prisma.documentUpdate.findMany({ where: { pageId: id }, orderBy: { id: 'asc' }, select: { data: true } });
    doc.transact(() => rows.forEach((r) => Y.applyUpdate(doc, r.data)), 'db');
    room.writes = rows.length;
    doc.on('update', (u: Uint8Array, o: unknown) => onDocUpdate(room, u, o));
    awareness.on('update', (c: { added: number[]; updated: number[]; removed: number[] }, o: unknown) => onAwareness(room, c, o));
  })().catch((e) => {
    console.error('room load failed', id, e);
    rooms.delete(id);
    room.conns.forEach((_, c) => c.close(1011));
  });
  return room;
}

async function leave(room: Room, ws: WebSocket) {
  const ids = room.conns.get(ws);
  room.conns.delete(ws);
  if (ids?.size) awarenessProtocol.removeAwarenessStates(room.awareness, [...ids], null);
  if (room.conns.size) return;
  await room.ready;
  if (room.timer) clearTimeout(room.timer);
  await flush(room);
  if (room.conns.size || rooms.get(room.id) !== room) return; // someone joined meanwhile
  rooms.delete(room.id);
  await sub.unsubscribe(chan(room.id)).catch(() => {});
  await compact(room.id).catch((e) => console.error('compact failed', e));
  room.awareness.destroy();
  room.doc.destroy();
}

/* ---------- protocol ---------- */
function onMessage(room: Room, conn: WebSocket, perm: Perm, data: Uint8Array) {
  const dec = decoding.createDecoder(data);
  const type = decoding.readVarUint(dec);
  if (type === MSG_SYNC) {
    // Read-only users may only request state (step1). Their step2/update messages are dropped.
    if (decoding.peekVarUint(dec) !== sync.messageYjsSyncStep1 && perm !== 'EDIT') return;
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MSG_SYNC);
    sync.readSyncMessage(dec, e, room.doc, conn);
    if (encoding.length(e) > 1) send(conn, encoding.toUint8Array(e));
  } else if (type === MSG_AWARENESS) {
    awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(dec), conn);
  }
}

sub.on('messageBuffer', (ch: Buffer, msg: Buffer) => {
  const room = rooms.get(ch.toString().slice('collab:'.length));
  if (!room || msg.subarray(1, 37).toString() === INSTANCE) return;
  const payload = new Uint8Array(msg.subarray(37));
  try {
    if (msg[0] === 0) Y.applyUpdate(room.doc, payload, 'redis');
    else awarenessProtocol.applyAwarenessUpdate(room.awareness, payload, 'redis');
  } catch (e) { console.error('bad redis message', e); }
});

/* ---------- server ---------- */
const server = http.createServer((_q, res) => { res.writeHead(200); res.end('ok'); });
const wss = new WebSocketServer({ noServer: true, maxPayload: 5 * 1024 * 1024 });
type Ctx = { uid: string; pageId: string; perm: Perm };

server.on('upgrade', async (req, socket, head) => {
  const reject = (code: number, text: string) => { socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`); socket.destroy(); };
  try {
    if (req.headers.origin !== APP_ORIGIN) return reject(403, 'Forbidden');
    const pageId = decodeURIComponent((req.url ?? '').split('?')[0].slice(1));
    if (!pageId || pageId.length > 64) return reject(400, 'Bad Request');
    const token = req.headers.cookie?.split(';').map((s) => s.trim().split('=')).find(([k]) => k === COOKIE)?.[1];
    const uid = await verifySession(token);
    if (!uid) return reject(401, 'Unauthorized');
    const perm = await getPerm(uid, pageId);
    if (!perm) return reject(403, 'Forbidden');
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, { uid, pageId, perm } satisfies Ctx));
  } catch (e) {
    console.error(e);
    reject(500, 'Internal Server Error');
  }
});

wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, ctx: Ctx) => {
  const room = getRoom(ctx.pageId);
  room.conns.set(ws, new Set());
  const ready = room.ready;

  ws.on('message', async (data: Buffer) => {
    await ready;
    if (ws.readyState !== WebSocket.OPEN) return;
    try { onMessage(room, ws, ctx.perm, new Uint8Array(data)); } catch (e) { console.error(e); ws.close(1003); }
  });

  let alive = true;
  ws.on('pong', () => { alive = true; });
  const ping = setInterval(() => { if (!alive) return ws.terminate(); alive = false; ws.ping(); }, 30_000);
  // Re-check permission so revocation/downgrade applies to live connections.
  const recheck = setInterval(async () => {
    const p = await getPerm(ctx.uid, ctx.pageId).catch(() => ctx.perm);
    if (!p) ws.close(4403); else ctx.perm = p;
  }, 15_000);
  ws.on('close', () => { clearInterval(ping); clearInterval(recheck); void leave(room, ws); });

  ready.then(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MSG_SYNC);
    sync.writeSyncStep1(e, room.doc);
    send(ws, encoding.toUint8Array(e));
    const states = room.awareness.getStates();
    if (states.size) {
      const a = encoding.createEncoder();
      encoding.writeVarUint(a, MSG_AWARENESS);
      encoding.writeVarUint8Array(a, awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]));
      send(ws, encoding.toUint8Array(a));
    }
  });
});

async function shutdown() {
  await Promise.all([...rooms.values()].map((r) => { if (r.timer) clearTimeout(r.timer); return flush(r); }));
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log(`collab instance ${INSTANCE} listening on :${PORT}`));
