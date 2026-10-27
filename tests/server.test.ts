import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Store, cleanOrder, OpError } from '../lib/server/store.ts';

// ---------- fake accounts service ----------

const SERVICE_TOKEN = 'test-service-token';
const USERS: Record<string, { password: string; user: { id: number; username: string; displayName: string; isAdmin: boolean } }> = {
  alice: { password: 'pass1', user: { id: 1, username: 'alice', displayName: 'Alice', isAdmin: false } },
  bob: { password: 'pass2', user: { id: 2, username: 'bob', displayName: 'Bob', isAdmin: false } },
};
const sessions = new Map<string, number>();
let lastLoginBody: any = null;
let accounts: Server;

before(async () => {
  accounts = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const send = (status: number, data?: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(data === undefined ? '' : JSON.stringify(data));
      };
      if (req.headers['x-service-token'] !== SERVICE_TOKEN) return send(401, { error: 'bad service token' });
      const b = body ? JSON.parse(body) : {};
      if (req.url === '/v1/login') {
        lastLoginBody = b;
        const u = USERS[b.username];
        if (!u || u.password !== b.password) return send(401, { error: 'wrong' });
        const token = `tok-${b.username}-${sessions.size}`;
        sessions.set(token, u.user.id);
        return send(200, { token, user: u.user });
      }
      if (req.url === '/v1/signup') {
        if (USERS[b.username]) return send(409, { error: 'taken' });
        return send(400, { error: 'invalid', message: 'signups closed in tests' });
      }
      if (req.url === '/v1/verify') {
        const id = sessions.get(b.token);
        const u = Object.values(USERS).find((x) => x.user.id === id);
        return u ? send(200, { user: u.user, via: 'session' }) : send(401, { error: 'invalid' });
      }
      if (req.url === '/v1/logout') {
        sessions.delete(b.token);
        return send(204);
      }
      send(404, { error: 'not found' });
    });
  });
  await new Promise<void>((r) => accounts.listen(0, '127.0.0.1', r));
  const { port } = accounts.address() as AddressInfo;
  process.env.ACCOUNTS_URL = `http://127.0.0.1:${port}`;
  process.env.ACCOUNTS_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.COOKIE_SECURE = 'false';
  process.env.DB_PATH = ':memory:';
  delete process.env.TRACKING_API_KEY;
});

after(() => accounts.close());

// Imported lazily so the env above is in place first.
const handlers = () => import('../lib/server/handlers.ts');

const jsonReq = (method: string, body?: unknown, cookie?: string, contentType = 'application/json') =>
  new Request('http://localhost/api/x', {
    method,
    headers: { ...(body !== undefined ? { 'content-type': contentType } : {}), ...(cookie ? { cookie } : {}), 'user-agent': 'test-agent' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

async function signIn(username: string, password: string): Promise<string> {
  const { loginHandler } = await handlers();
  const res = await loginHandler(jsonReq('POST', { username, password }));
  assert.equal(res.status, 200);
  const setCookie = res.headers.get('set-cookie')!;
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  return setCookie.split(';')[0];
}

const order = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: `Order ${id}`, platform: 'Amazon', trackingNumber: `RR12345678${id.padStart(1, '0')}ES`, carrier: 'Correos',
  status: 'processed', progress: 10, lastUpdate: '2026-10-27T10:00:00.000Z', statusHistory: [],
  createdAt: `2026-10-27T10:00:0${id.length % 10}.000Z`, notes: '', ...extra,
});

// ---------- store ----------

test('cleanOrder keeps known fields, clamps sizes and rejects bad ids', () => {
  const o = cleanOrder({ ...order('a1'), name: 'x'.repeat(500), status: 'bogus', progress: 900, extra: 'dropped', isArchived: 'yes' });
  assert.equal(o.name.length, 200);
  assert.equal(o.status, 'processed');
  assert.equal(o.progress, 100);
  assert.equal((o as any).extra, undefined);
  assert.equal(o.isArchived, false);
  assert.throws(() => cleanOrder({ ...order('a1'), id: '../etc' }), OpError);
  assert.throws(() => cleanOrder({ ...order('a1'), trackingNumber: '' }), OpError);
});

test('store: put, update, list per user, remove', () => {
  const s = new Store(':memory:');
  s.put(1, order('a'));
  s.put(1, order('b'));
  s.put(2, order('a'));                       // same id, other user: separate row
  s.put(1, { ...order('a'), name: 'Renamed' });
  assert.equal(s.list(1).length, 2);
  assert.equal(s.list(1).find((o) => o.id === 'a')!.name, 'Renamed');
  assert.equal(s.list(2)[0].name, 'Order a');
  assert.equal(s.remove(1, 'a'), true);
  assert.equal(s.remove(1, 'a'), false);
  assert.equal(s.list(1).length, 1);
  assert.equal(s.list(2).length, 1);
  s.close();
});

test('store: import only into an empty account, all or nothing', () => {
  const s = new Store(':memory:');
  assert.throws(() => s.importOrders(1, { orders: [order('a'), { id: 'b' }] }), OpError); // second has no tracking number
  assert.equal(s.count(1), 0);
  assert.equal(s.importOrders(1, { orders: [order('a'), order('b')] }), true);
  assert.equal(s.importOrders(1, { orders: [order('c')] }), false);
  assert.equal(s.count(1), 2);
  s.close();
});

// ---------- API ----------

test('API refuses everything without a session', async () => {
  const h = await handlers();
  assert.equal((await h.meHandler(jsonReq('GET'))).status, 401);
  assert.equal((await h.listOrdersHandler(jsonReq('GET'))).status, 401);
  assert.equal((await h.putOrderHandler(jsonReq('PUT', { order: order('a') }), 'a')).status, 401);
  assert.equal((await h.deleteOrderHandler(jsonReq('DELETE'), 'a')).status, 401);
  assert.equal((await h.importHandler(jsonReq('POST', { orders: [] }))).status, 401);
  assert.equal((await h.trackHandler(jsonReq('POST', { trackingNumber: 'RR123456785ES' }))).status, 401);
  assert.equal((await h.listOrdersHandler(jsonReq('GET', undefined, 'parceltrack_session=forged'))).status, 401);
});

test('login: wrong password is 401, success sets the cookie and passes client info', async () => {
  const h = await handlers();
  assert.equal((await h.loginHandler(jsonReq('POST', { username: 'alice', password: 'nope' }))).status, 401);
  assert.equal((await h.loginHandler(jsonReq('POST', { username: 'alice' }))).status, 400);
  const cookie = await signIn('alice', 'pass1');
  assert.match(cookie, /^parceltrack_session=/);
  assert.equal(lastLoginBody.app, 'parceltrack');
  assert.equal(lastLoginBody.device, 'test-agent');
  const me = await (await h.meHandler(jsonReq('GET', undefined, cookie))).json();
  assert.equal(me.user.username, 'alice');
});

test('signup maps the accounts service answers', async () => {
  const h = await handlers();
  assert.equal((await h.signupHandler(jsonReq('POST', { username: 'alice', password: 'xxxx' }))).status, 409);
  const res = await h.signupHandler(jsonReq('POST', { username: 'carol', password: 'xxxx' }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'signups closed in tests');
});

test('orders CRUD is scoped to the signed-in user', async () => {
  const h = await handlers();
  const alice = await signIn('alice', 'pass1');
  const bob = await signIn('bob', 'pass2');

  let res = await h.putOrderHandler(jsonReq('PUT', { order: order('o1') }, alice), 'o1');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).orders.length, 1);

  // Update
  res = await h.putOrderHandler(jsonReq('PUT', { order: { ...order('o1'), status: 'delivered', isArchived: true } }, alice), 'o1');
  const updated = (await res.json()).orders[0];
  assert.equal(updated.status, 'delivered');
  assert.equal(updated.isArchived, true);

  // Bob sees nothing and can't delete Alice's order
  assert.deepEqual((await (await h.listOrdersHandler(jsonReq('GET', undefined, bob))).json()).orders, []);
  await h.deleteOrderHandler(jsonReq('DELETE', undefined, bob), 'o1');
  assert.equal((await (await h.listOrdersHandler(jsonReq('GET', undefined, alice))).json()).orders.length, 1);

  // Id in the URL must match the body
  assert.equal((await h.putOrderHandler(jsonReq('PUT', { order: order('o2') }, alice), 'o1')).status, 400);

  // Delete, then undo by putting it back
  res = await h.deleteOrderHandler(jsonReq('DELETE', undefined, alice), 'o1');
  assert.deepEqual((await res.json()).orders, []);
  res = await h.putOrderHandler(jsonReq('PUT', { order: updated }, alice), 'o1');
  assert.equal((await res.json()).orders[0].status, 'delivered');
});

test('mutations need a JSON body (no cross-site form posts)', async () => {
  const h = await handlers();
  const alice = await signIn('alice', 'pass1');
  const res = await h.putOrderHandler(jsonReq('PUT', 'order=x', alice, 'application/x-www-form-urlencoded'), 'o9');
  assert.equal(res.status, 415);
  assert.equal((await h.putOrderHandler(jsonReq('PUT', '{not json', alice), 'o9')).status, 400);
});

test('import copies browser orders once', async () => {
  const h = await handlers();
  const bob = await signIn('bob', 'pass2');
  let body = await (await h.importHandler(jsonReq('POST', { orders: [order('b1'), order('b2')] }, bob))).json();
  assert.equal(body.imported, true);
  assert.equal(body.orders.length, 2);
  body = await (await h.importHandler(jsonReq('POST', { orders: [order('b3')] }, bob))).json();
  assert.equal(body.imported, false);
  assert.equal(body.orders.length, 2);
});

test('track: signed in, typo blocked unless forced, no provider = live false', async () => {
  const h = await handlers();
  const alice = await signIn('alice', 'pass1');
  assert.equal((await h.trackHandler(jsonReq('POST', { trackingNumber: 'RR123456784ES' }, alice))).status, 422);
  const res = await h.trackHandler(jsonReq('POST', { trackingNumber: 'RR123456785ES' }, alice));
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.live, false);
  assert.equal(data.detectedCarrier, 'Correos');
});

test('logout ends the session and clears the cookie', async () => {
  const h = await handlers();
  const alice = await signIn('alice', 'pass1');
  const res = await h.logoutHandler(jsonReq('POST', {}, alice));
  assert.equal(res.status, 204);
  assert.match(res.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal((await h.meHandler(jsonReq('GET', undefined, alice))).status, 401);
});

test('accounts service down → 503, not a crash', async () => {
  const h = await handlers();
  const saved = process.env.ACCOUNTS_URL;
  process.env.ACCOUNTS_URL = 'http://127.0.0.1:1';
  try {
    assert.equal((await h.loginHandler(jsonReq('POST', { username: 'alice', password: 'pass1' }))).status, 503);
  } finally {
    process.env.ACCOUNTS_URL = saved;
  }
});
