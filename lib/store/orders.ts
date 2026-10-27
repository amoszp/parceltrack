import { create } from 'zustand';
import { Order, SuggestedOrder, StatusFilter } from '@/types';
import { STATUS_PROGRESS } from '@/lib/utils/status';
import { normalizeTracking, validateTracking } from '@/lib/utils/validation';
import { api, ApiError } from '@/lib/api';

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export type Session =
  | { phase: 'loading' }
  | { phase: 'login' }
  | { phase: 'offline' }
  | { phase: 'ready'; user: SessionUser };

interface OrdersState {
  session: Session;
  orders: Order[];
  suggested: SuggestedOrder[];
  platforms: string[];
  statusFilter: StatusFilter;
  searchQuery: string;
  toast: Toast | null;
  start: () => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  archiveOrder: (id: string) => void;      // active → history
  restoreOrder: (id: string) => void;      // history → active
  purgeOrder: (id: string) => void;        // gone (undo via toast)
  findByTracking: (trackingNumber: string, exceptId?: string) => Order | undefined;
  acceptSuggested: (id: string, patch?: Partial<Order>) => void;
  dismissSuggested: (id: string) => void;
  setStatusFilter: (f: StatusFilter) => void;
  setSearchQuery: (q: string) => void;
  addPlatform: (p: string) => void;
  showToast: (message: string, undo?: () => void) => void;
  dismissToast: () => void;
}

const INITIAL_PLATFORMS = ['Amazon', 'AliExpress', 'Shein', 'Temu', 'Nike', 'Zara', 'Apple', 'eBay', 'El Corte Inglés'];

// Orders saved in this browser before accounts existed. Read once, at the first
// sign-in of an empty account; the data stays where it is as a backup.
const LEGACY_KEY = 'parceltrack-orders-v3';
const IMPORTED_KEY = 'parceltrack-imported';

function readLegacyOrders(): Order[] | null {
  try {
    if (localStorage.getItem(IMPORTED_KEY)) return null;
    const raw = localStorage.getItem(LEGACY_KEY);
    const orders = raw ? JSON.parse(raw)?.state?.orders : null;
    return Array.isArray(orders) && orders.length > 0 ? orders : null;
  } catch {
    return null;
  }
}

function markImported() {
  try {
    localStorage.setItem(IMPORTED_KEY, new Date().toISOString());
  } catch {
    // Storage blocked: the server refuses a second import anyway.
  }
}

function withPlatforms(platforms: string[], orders: Order[]): string[] {
  const out = [...platforms];
  for (const o of orders) {
    if (o.platform && o.platform !== 'Unknown' && !out.some((p) => p.toLowerCase() === o.platform.toLowerCase())) out.push(o.platform);
  }
  return out;
}

export const useOrdersStore = create<OrdersState>()((set, get) => {
  // ---------- server sync ----------
  // Every change shows at once and goes to the server as one request; requests
  // run one at a time, in order, and the server's list replaces the local copy
  // once nothing else is waiting.
  let queue: Promise<unknown> = Promise.resolve();
  let pending = 0;

  const applyServer = (orders: Order[]) =>
    set((s) => ({ orders, platforms: withPlatforms(s.platforms, orders) }));

  const signedOut = () => set({ session: { phase: 'login' }, orders: [] });

  const reload = () => {
    queue = queue
      .then(() => api.get<{ orders: Order[] }>('/api/orders'))
      .then((res) => { if (pending === 0) applyServer(res.orders); })
      .catch((err: ApiError) => { if (err.status === 401) signedOut(); });
  };

  const send = (request: () => Promise<{ orders: Order[] }>) => {
    pending += 1;
    queue = queue.then(request).then(
      (res) => {
        pending -= 1;
        if (pending === 0) applyServer(res.orders);
      },
      (err: ApiError) => {
        pending -= 1;
        if (err.status === 401) { signedOut(); return; }
        get().showToast(err.status === 0 ? 'Offline: change not saved' : 'Couldn’t save that change');
        // Show what the server really has instead of the unsaved change.
        reload();
      }
    );
  };

  const putRemote = (order: Order) =>
    send(() => api.put<{ orders: Order[] }>(`/api/orders/${encodeURIComponent(order.id)}`, { order }));
  const deleteRemote = (id: string) =>
    send(() => api.del<{ orders: Order[] }>(`/api/orders/${encodeURIComponent(id)}`));

  /** Applies a local change to one order and sends the result. */
  const change = (id: string, fn: (o: Order) => Order) => {
    const current = get().orders.find((o) => o.id === id);
    if (!current) return;
    const next = fn(current);
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? next : o)) }));
    putRemote(next);
  };

  return {
    session: { phase: 'loading' },
    orders: [],
    suggested: [],
    platforms: INITIAL_PLATFORMS,
    statusFilter: 'all',
    searchQuery: '',
    toast: null,

    start: async () => {
      set({ session: { phase: 'loading' } });
      try {
        const { user } = await api.get<{ user: SessionUser }>('/api/auth/me');
        let { orders } = await api.get<{ orders: Order[] }>('/api/orders');
        if (orders.length === 0) {
          const legacy = readLegacyOrders();
          if (legacy) {
            const res = await api.post<{ imported: boolean; orders: Order[] }>('/api/import', { orders: legacy });
            markImported();
            orders = res.orders;
          }
        }
        applyServer(orders);
        set({ session: { phase: 'ready', user } });
      } catch (err) {
        set({ session: { phase: (err as ApiError).status === 401 ? 'login' : 'offline' } });
      }
    },

    signOut: async () => {
      try {
        await api.post('/api/auth/logout');
      } catch {
        // Offline: the cookie stays, but this screen still signs out.
      }
      signedOut();
    },

    reload,

    addOrder: (order) => {
      set((s) => ({ orders: [order, ...s.orders], platforms: withPlatforms(s.platforms, [order]) }));
      putRemote(order);
    },

    updateOrder: (id, patch) =>
      change(id, (o) => {
        const next: Order = { ...o, ...patch, lastUpdate: new Date().toISOString() };
        if (patch.status && patch.status !== o.status) {
          next.progress = STATUS_PROGRESS[patch.status];
          if (patch.status === 'delivered') {
            next.deliveredAt = new Date().toISOString();
          } else if (o.status === 'delivered') {
            // Un-delivering brings it back to the active list
            next.deliveredAt = undefined;
            next.isArchived = false;
            next.archivedAt = undefined;
          }
        }
        return next;
      }),

    archiveOrder: (id) => change(id, (o) => ({ ...o, isArchived: true, archivedAt: new Date().toISOString() })),

    restoreOrder: (id) => change(id, (o) => ({ ...o, isArchived: false, archivedAt: undefined })),

    purgeOrder: (id) => {
      const removed = get().orders.find((o) => o.id === id);
      if (!removed) return;
      set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
      deleteRemote(id);
      get().showToast(`Deleted “${removed.name}”`, () => {
        if (get().orders.some((o) => o.id === removed.id)) return;
        set((s) => ({ orders: [removed, ...s.orders] }));
        putRemote(removed);
      });
    },

    findByTracking: (trackingNumber, exceptId) => {
      const n = normalizeTracking(trackingNumber);
      return get().orders.find((o) => o.id !== exceptId && normalizeTracking(o.trackingNumber) === n);
    },

    acceptSuggested: (id, patch) => {
      const s = get().suggested.find((x) => x.id === id);
      if (!s) return;
      const tracking = normalizeTracking(patch?.trackingNumber ?? s.trackingNumber);
      const detected = validateTracking(tracking);
      const now = new Date().toISOString();
      const newOrder: Order = {
        id: `order_${Date.now()}`,
        name: s.name,
        platform: s.platform,
        carrier: detected.carrier ?? 'Unknown',
        status: 'processed',
        progress: STATUS_PROGRESS.processed,
        lastUpdate: now,
        statusHistory: [],
        createdAt: now,
        notes: '',
        ...patch,
        trackingNumber: detected.normalized || tracking,
      };
      set((st) => ({ suggested: st.suggested.filter((x) => x.id !== id) }));
      get().addOrder(newOrder);
    },

    dismissSuggested: (id) =>
      set((s) => ({ suggested: s.suggested.filter((x) => x.id !== id) })),

    setStatusFilter: (f) => set({ statusFilter: f }),
    setSearchQuery: (q) => set({ searchQuery: q }),

    addPlatform: (p: string) => set((s) => ({ platforms: withPlatforms(s.platforms, [{ platform: p } as Order]) })),

    showToast: (message, undo) => set({ toast: { id: Date.now(), message, undo } }),
    dismissToast: () => set({ toast: null }),
  };
});
