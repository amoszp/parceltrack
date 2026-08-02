import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, SuggestedOrder, StatusFilter, MetricFilter } from '@/types';

interface OrdersState {
  orders: Order[];
  suggested: SuggestedOrder[];
  platforms: string[];               // user-accumulated platform history
  statusFilter: StatusFilter;
  metricFilter: MetricFilter;
  searchQuery: string;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  acceptSuggested: (id: string, patch?: Partial<Order>) => void;
  dismissSuggested: (id: string) => void;
  setStatusFilter: (f: StatusFilter) => void;
  setMetricFilter: (f: MetricFilter) => void;
  setSearchQuery: (q: string) => void;
  addPlatform: (p: string) => void;
}

const SAMPLE_ORDERS: Order[] = [
  {
    id: '1',
    name: 'Running Shoes',
    platform: 'Nike',
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    status: 'out_for_delivery',
    progress: 85,
    estimatedDelivery: 'Today',
    lastUpdate: '2 hours ago',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    notes: '',
    tags: [],
  },
  {
    id: '2',
    name: 'Mechanical Keyboard',
    platform: 'Amazon',
    trackingNumber: 'LX348295109CN',
    carrier: 'DHL',
    status: 'in_transit',
    progress: 55,
    estimatedDelivery: 'Dec 22',
    lastUpdate: '6 hours ago',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    notes: '',
    tags: [],
  },
  {
    id: '3',
    name: 'Winter Jacket',
    platform: 'Zara',
    trackingNumber: 'ES456789012ES',
    carrier: 'Correos',
    status: 'processed',
    progress: 10,
    estimatedDelivery: 'Dec 28',
    lastUpdate: '1 day ago',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    notes: '',
    tags: [],
  },
  {
    id: '4',
    name: 'Phone Case x3',
    platform: 'AliExpress',
    trackingNumber: 'YT2109876543',
    carrier: 'Yanwen',
    status: 'issue',
    progress: 40,
    estimatedDelivery: 'Unknown',
    lastUpdate: '3 hours ago',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    notes: 'Customs hold at Madrid',
    tags: ['customs'],
  },
  {
    id: '5',
    name: 'Coffee Maker',
    platform: 'El Corte Inglés',
    trackingNumber: 'RR123456785ES',
    carrier: 'Correos',
    status: 'delivered',
    progress: 100,
    estimatedDelivery: 'Dec 10',
    lastUpdate: '5 days ago',
    statusHistory: [],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    deliveredAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const SAMPLE_SUGGESTED: SuggestedOrder[] = [
  {
    id: 's1',
    name: 'Wireless Earbuds',
    platform: 'Apple',
    trackingNumber: '774899256420',
    source: 'email',
    raw: 'Your order has shipped! Track: 774899256420',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_PLATFORMS = ['Amazon', 'AliExpress', 'Shein', 'Nike', 'Zara', 'Apple', 'eBay', 'El Corte Inglés'];

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: SAMPLE_ORDERS,
      suggested: SAMPLE_SUGGESTED,
      platforms: INITIAL_PLATFORMS,
      statusFilter: 'all',
      metricFilter: null,
      searchQuery: '',

      addOrder: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
        // Save platform if new
        if (order.platform && order.platform !== 'Unknown') {
          get().addPlatform(order.platform);
        }
      },

      updateOrder: (id, patch) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),

      removeOrder: (id) =>
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),

      acceptSuggested: (id, patch) => {
        const { suggested, orders } = get();
        const s = suggested.find((x) => x.id === id);
        if (!s) return;
        const newOrder: Order = {
          id: `order_${Date.now()}`,
          name: patch?.name ?? s.name,
          platform: patch?.platform ?? s.platform,
          trackingNumber: patch?.trackingNumber ?? s.trackingNumber,
          carrier: 'Unknown',
          status: 'processed',
          progress: 5,
          lastUpdate: 'Just now',
          statusHistory: [],
          createdAt: new Date().toISOString(),
          notes: '',
          tags: [],
          ...patch,
        };
        set({
          orders: [newOrder, ...orders],
          suggested: suggested.filter((x) => x.id !== id),
        });
        if (newOrder.platform && newOrder.platform !== 'Unknown') {
          get().addPlatform(newOrder.platform);
        }
      },

      dismissSuggested: (id) =>
        set((s) => ({ suggested: s.suggested.filter((x) => x.id !== id) })),

      setStatusFilter: (f) => set({ statusFilter: f, metricFilter: null }),
      setMetricFilter: (f) => set({ metricFilter: f, statusFilter: 'all' }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      addPlatform: (p: string) =>
        set((s) => ({
          platforms: s.platforms.includes(p) ? s.platforms : [...s.platforms, p],
        })),
    }),
    { name: 'parceltrack-orders-v2' }
  )
);
