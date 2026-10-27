import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, SuggestedOrder, StatusFilter } from '@/types';
import { STATUS_PROGRESS } from '@/lib/utils/status';
import { normalizeTracking, validateTracking } from '@/lib/utils/validation';

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface OrdersState {
  orders: Order[];
  suggested: SuggestedOrder[];
  platforms: string[];
  statusFilter: StatusFilter;
  searchQuery: string;
  toast: Toast | null;
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

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      suggested: [],
      platforms: INITIAL_PLATFORMS,
      statusFilter: 'all',
      searchQuery: '',
      toast: null,

      addOrder: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
        if (order.platform && order.platform !== 'Unknown') get().addPlatform(order.platform);
      },

      updateOrder: (id, patch) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== id) return o;
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
        })),

      archiveOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, isArchived: true, archivedAt: new Date().toISOString() } : o
          ),
        })),

      restoreOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, isArchived: false, archivedAt: undefined } : o
          ),
        })),

      purgeOrder: (id) => {
        const { orders } = get();
        const index = orders.findIndex((o) => o.id === id);
        if (index === -1) return;
        const removed = orders[index];
        set({ orders: orders.filter((o) => o.id !== id) });
        get().showToast(`Deleted “${removed.name}”`, () =>
          set((s) => {
            if (s.orders.some((o) => o.id === removed.id)) return s;
            const next = [...s.orders];
            next.splice(Math.min(index, next.length), 0, removed);
            return { orders: next };
          })
        );
      },

      findByTracking: (trackingNumber, exceptId) => {
        const n = normalizeTracking(trackingNumber);
        return get().orders.find((o) => o.id !== exceptId && normalizeTracking(o.trackingNumber) === n);
      },

      acceptSuggested: (id, patch) => {
        const { suggested } = get();
        const s = suggested.find((x) => x.id === id);
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
        set((st) => ({
          orders: [newOrder, ...st.orders],
          suggested: st.suggested.filter((x) => x.id !== id),
        }));
        if (newOrder.platform && newOrder.platform !== 'Unknown') get().addPlatform(newOrder.platform);
      },

      dismissSuggested: (id) =>
        set((s) => ({ suggested: s.suggested.filter((x) => x.id !== id) })),

      setStatusFilter: (f) => set({ statusFilter: f }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      addPlatform: (p: string) =>
        set((s) => ({
          platforms: s.platforms.some((x) => x.toLowerCase() === p.toLowerCase()) ? s.platforms : [...s.platforms, p],
        })),

      showToast: (message, undo) => set({ toast: { id: Date.now(), message, undo } }),
      dismissToast: () => set({ toast: null }),
    }),
    {
      name: 'parceltrack-orders-v3',
      // Rehydrated on the client after mount (see useHydrated) to avoid SSR mismatches.
      skipHydration: true,
      // Only data is saved; filters, search and toasts reset on reload.
      partialize: (s) => ({ orders: s.orders, suggested: s.suggested, platforms: s.platforms }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OrdersState>;
        return {
          ...current,
          orders: Array.isArray(p.orders) ? p.orders : current.orders,
          suggested: Array.isArray(p.suggested) ? p.suggested : current.suggested,
          platforms: Array.isArray(p.platforms) ? p.platforms : current.platforms,
        };
      },
    }
  )
);
