/**
 * API logic as plain Web Request → Response functions. The files under app/api
 * only forward to these, so the same code runs in Next and in node:test.
 */
import {
  AccountsUnavailable, clearedSessionCookie, clientInfo, forgetToken, login, logout,
  readToken, sessionCookie, signup, verify, type User,
} from './accounts.ts';
import { OpError, getStore } from './store.ts';
import { validateTracking } from '../utils/validation.ts';
import { lookupTracking } from '../tracking/api.ts';

const MAX_BODY = 1_000_000;

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

const error = (status: number, message: string, headers?: Record<string, string>) => json({ error: message }, status, headers);

/**
 * Reads a JSON body. Requiring application/json means a cross-site HTML form
 * can't post here (it would need a CORS preflight, which is never granted).
 */
async function readJson(req: Request): Promise<any> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) throw new HttpError(415, 'JSON body required');
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'body too large');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Runs a handler and turns known errors into the right status code. */
async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return error(err.status, err.message);
    if (err instanceof AccountsUnavailable) {
      console.error('[auth] accounts service unavailable:', err.message);
      return error(503, 'accounts service unavailable');
    }
    if (err instanceof OpError) return error(400, err.message);
    console.error('[api]', err);
    return error(500, 'internal error');
  }
}

async function requireUser(req: Request): Promise<User> {
  const token = readToken(req);
  const user = token ? await verify(token) : null;
  if (!user) throw new HttpError(401, 'login required');
  return user;
}

// ---------- session ----------

export const loginHandler = (req: Request) =>
  handle(async () => {
    const { username, password } = await readJson(req);
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return error(400, 'username and password are required');
    }
    if (username.length > 64 || password.length > 256) return error(401, 'wrong username or password');
    const { status, data } = await login(username, password, clientInfo(req));
    if (status !== 200) {
      return status === 429 ? error(429, 'too many attempts') : error(401, 'wrong username or password');
    }
    return json({ user: data.user }, 200, { 'set-cookie': sessionCookie(data.token) });
  });

export const signupHandler = (req: Request) =>
  handle(async () => {
    const { username, password, displayName } = await readJson(req);
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return error(400, 'username and password are required');
    }
    if (username.length > 64 || password.length > 256 || (typeof displayName === 'string' && displayName.length > 80)) {
      return error(400, 'too long');
    }
    const { status, data } = await signup(username, password, typeof displayName === 'string' ? displayName : '', clientInfo(req));
    if (status === 201) {
      // New accounts work at once: sign the user straight in.
      return json({ user: data.user }, 201, { 'set-cookie': sessionCookie(data.token) });
    }
    if (status === 429) return error(429, 'too many sign-ups');
    if (status === 409) return error(409, 'username taken');
    return error(400, data?.message ?? data?.error ?? 'invalid');
  });

export const logoutHandler = (req: Request) =>
  handle(async () => {
    const token = readToken(req);
    if (token) {
      forgetToken(token);
      await logout(token);
    }
    return new Response(null, { status: 204, headers: { 'set-cookie': clearedSessionCookie() } });
  });

export const meHandler = (req: Request) =>
  handle(async () => json({ user: await requireUser(req) }));

// ---------- orders ----------

export const listOrdersHandler = (req: Request) =>
  handle(async () => {
    const user = await requireUser(req);
    return json({ orders: getStore().list(user.id) });
  });

/** Create or replace one order; answers with the full list so the app can't drift. */
export const putOrderHandler = (req: Request, id: string) =>
  handle(async () => {
    const user = await requireUser(req);
    const body = await readJson(req);
    const order = body?.order;
    if (!order || order.id !== id) return error(400, 'order id mismatch');
    const store = getStore();
    store.put(user.id, order);
    return json({ orders: store.list(user.id) });
  });

export const deleteOrderHandler = (req: Request, id: string) =>
  handle(async () => {
    const user = await requireUser(req);
    const store = getStore();
    store.remove(user.id, id);
    return json({ orders: store.list(user.id) });
  });

/** Orders kept in the browser before accounts, copied once into an empty account. */
export const importHandler = (req: Request) =>
  handle(async () => {
    const user = await requireUser(req);
    const store = getStore();
    const imported = store.importOrders(user.id, await readJson(req));
    return json({ imported, orders: store.list(user.id) });
  });

// ---------- tracking lookup ----------

export const trackHandler = (req: Request) =>
  handle(async () => {
    // Signed-in only: a live lookup spends the provider's quota.
    await requireUser(req);
    const { trackingNumber, force } = await readJson(req);
    if (typeof trackingNumber !== 'string' || !trackingNumber.trim()) return error(400, 'Tracking number required');

    const validation = validateTracking(trackingNumber);
    // Block mistyped numbers unless the user chose "Add anyway"
    if (!validation.valid && !force) {
      return json(
        { error: 'invalid_format', warning: validation.warning, carrier: validation.carrier, canForce: validation.canForce },
        422
      );
    }
    try {
      const result = await lookupTracking(validation.normalized);
      return json({ ...result, detectedCarrier: validation.carrier ?? result.carrier });
    } catch (err) {
      console.error('[track]', err);
      return error(502, 'Failed to look up tracking number');
    }
  });
