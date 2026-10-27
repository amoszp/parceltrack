import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Order, OrderStatus, StatusEvent } from '../../types/index.ts';

/** Thrown for a request that can't be applied (bad shape, unknown id, ...). */
export class OpError extends Error {}

const STATUSES: OrderStatus[] = ['processed', 'in_transit', 'out_for_delivery', 'delivered', 'issue'];
const MAX_ID = 64;
const MAX_ORDERS_PER_IMPORT = 2000;
const MAX_EVENTS = 200;

// ---------- input cleaning ----------

function str(value: unknown, max: number, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function optStr(value: unknown, max: number): string | undefined {
  const s = str(value, max);
  return s || undefined;
}

function cleanId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_\-.:]{1,64}$/.test(value) || value.length > MAX_ID) {
    throw new OpError('invalid id');
  }
  return value;
}

function cleanStatus(value: unknown): OrderStatus {
  return STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'processed';
}

function cleanEvent(raw: any): StatusEvent {
  return {
    timestamp: str(raw?.timestamp, 40),
    location: str(raw?.location, 200),
    description: str(raw?.description, 500),
    status: cleanStatus(raw?.status),
  };
}

/** Keeps only known fields with sane sizes, so a client can't store arbitrary blobs. */
export function cleanOrder(raw: any): Order {
  const trackingNumber = str(raw?.trackingNumber, 64);
  if (!trackingNumber) throw new OpError('tracking number is required');
  const progress = Number(raw?.progress);
  const now = new Date().toISOString();
  return {
    id: cleanId(raw?.id),
    name: str(raw?.name, 200) || 'New package',
    platform: str(raw?.platform, 100) || 'Unknown',
    trackingNumber,
    carrier: str(raw?.carrier, 100) || 'Unknown',
    status: cleanStatus(raw?.status),
    progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0,
    estimatedDelivery: optStr(raw?.estimatedDelivery, 40),
    estimatedDeliveryDate: optStr(raw?.estimatedDeliveryDate, 10),
    lastUpdate: str(raw?.lastUpdate, 40) || now,
    statusHistory: Array.isArray(raw?.statusHistory) ? raw.statusHistory.slice(0, MAX_EVENTS).map(cleanEvent) : [],
    createdAt: str(raw?.createdAt, 40) || now,
    deliveredAt: optStr(raw?.deliveredAt, 40),
    archivedAt: optStr(raw?.archivedAt, 40),
    notes: str(raw?.notes, 2000),
    isArchived: raw?.isArchived === true,
  };
}

// ---------- store ----------

/**
 * Orders per user (a user id from the accounts service). Ids are created by the
 * app, so an operation and its undo can name the same row.
 */
export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, created_at);
    `);
  }

  list(userId: number): Order[] {
    const rows = this.db
      .prepare('SELECT data FROM orders WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as Order);
  }

  count(userId: number): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(userId) as { n: number }).n;
  }

  /** Create or replace one order (used for add, edit, archive, restore and undo). */
  put(userId: number, raw: unknown): Order {
    const order = cleanOrder(raw);
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO orders (id, user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO UPDATE SET data = excluded.data, created_at = excluded.created_at, updated_at = excluded.updated_at`
      )
      .run(order.id, userId, JSON.stringify(order), order.createdAt, now);
    return order;
  }

  /** Returns false when the order didn't exist (already deleted). */
  remove(userId: number, id: unknown): boolean {
    const result = this.db.prepare('DELETE FROM orders WHERE user_id = ? AND id = ?').run(userId, cleanId(id));
    return Number(result.changes) > 0;
  }

  /** Copies orders kept in a browser into an account that has none yet. */
  importOrders(userId: number, raw: unknown): boolean {
    if (this.count(userId) > 0) return false;
    const list = (raw as any)?.orders;
    if (!Array.isArray(list)) throw new OpError('orders are required');
    if (list.length > MAX_ORDERS_PER_IMPORT) throw new OpError('too many orders');
    const orders = list.map(cleanOrder);
    this.transaction(() => orders.forEach((o) => this.put(userId, o)));
    return true;
  }

  close(): void {
    this.db.close();
  }

  private transaction(fn: () => void): void {
    this.db.exec('BEGIN');
    try {
      fn();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}

// One store per process, kept on globalThis so dev reloads don't reopen the file.
const g = globalThis as unknown as { __parceltrackStore?: { path: string; store: Store } };

export function getStore(): Store {
  const path = process.env.DB_PATH ?? './data/parceltrack.db';
  if (!g.__parceltrackStore || g.__parceltrackStore.path !== path) {
    g.__parceltrackStore?.store.close();
    g.__parceltrackStore = { path, store: new Store(path) };
  }
  return g.__parceltrackStore.store;
}
