// Client for the shared accounts service, reached over a private Docker network.
// Config is read on each call so tests (and env changes) take effect without a restart.
const APP_NAME = 'parceltrack';

export const SESSION_COOKIE = 'parceltrack_session';
const SESSION_MAX_AGE_SECONDS = 180 * 86_400;

const accountsUrl = () => process.env.ACCOUNTS_URL ?? 'http://accounts:4600';
const serviceToken = () => process.env.ACCOUNTS_SERVICE_TOKEN ?? '';
const cookieSecure = () => (process.env.COOKIE_SECURE ?? 'true') !== 'false';

export interface User {
  id: number;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export class AccountsUnavailable extends Error {}

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
  let res: Response;
  try {
    res = await fetch(`${accountsUrl()}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-service-token': serviceToken() },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    throw new AccountsUnavailable(String(err));
  }
  if (res.status >= 500) throw new AccountsUnavailable(`accounts service answered ${res.status}`);
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

export interface Client {
  ip?: string;
  device?: string;
}

export function login(username: string, password: string, client: Client) {
  return call('POST', '/v1/login', { username, password, app: APP_NAME, ...client });
}

export function signup(username: string, password: string, displayName: string, client: Client) {
  return call('POST', '/v1/signup', { username, password, displayName, app: APP_NAME, ...client });
}

export async function logout(token: string): Promise<void> {
  await call('POST', '/v1/logout', { token });
}

// Behind Cloudflare the visitor's address arrives in CF-Connecting-IP; on the
// LAN there is no proxy, so the forwarded header from the Next server is used.
export function clientInfo(req: Request): Client {
  const forwarded = req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = (forwarded ?? '').slice(0, 64) || undefined;
  const device = (req.headers.get('user-agent') ?? '').slice(0, 300) || undefined;
  return { ip, device };
}

// Verified tokens are cached briefly so a burst of API calls costs one lookup.
const verifyCache = new Map<string, { user: User; until: number }>();
const VERIFY_CACHE_MS = 30_000;

export async function verify(token: string): Promise<User | null> {
  const cached = verifyCache.get(token);
  if (cached && cached.until > Date.now()) return cached.user;
  const { status, data } = await call('POST', '/v1/verify', { token });
  if (status !== 200) {
    verifyCache.delete(token);
    return null;
  }
  verifyCache.set(token, { user: data.user, until: Date.now() + VERIFY_CACHE_MS });
  return data.user;
}

export function forgetToken(token: string): void {
  verifyCache.delete(token);
}

// ---------- cookies ----------

export function readToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('=')) || null;
  }
  return null;
}

export function sessionCookie(token: string): string {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (cookieSecure()) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecure() ? '; Secure' : ''}`;
}
