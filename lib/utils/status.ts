import { OrderStatus } from '@/types';

// ─── Brand Palette (v3, taken from the app icon) ───────────────────────────
export const BRAND = {
  primary:       '#2F6FE4',   // icon blue, lifted for contrast on dark
  primaryBg:     'rgba(47,111,228,0.14)',
  primaryBorder: 'rgba(47,111,228,0.34)',
  accent:        '#F2A23C',   // calico orange
  base:          '#0B0D12',
};

const tone = (rgb: string) => ({
  color: `rgb(${rgb})`,
  bg: `rgba(${rgb},0.12)`,
  border: `rgba(${rgb},0.28)`,
});

export const STATUS_CONFIG: Record<OrderStatus, { label: string; short: string; color: string; bg: string; border: string }> = {
  processed:        { label: 'Processing',       short: 'Processing', ...tone('148,163,192') },
  in_transit:       { label: 'In transit',       short: 'In transit', ...tone('99,155,255') },
  out_for_delivery: { label: 'Out for delivery', short: 'Out today',  ...tone('242,162,60') },
  delivered:        { label: 'Delivered',        short: 'Delivered',  ...tone('52,195,143') },
  issue:            { label: 'Issue',            short: 'Issue',      ...tone('240,97,109') },
};

export const STATUS_ORDER: OrderStatus[] = ['processed', 'in_transit', 'out_for_delivery', 'delivered', 'issue'];

export const STATUS_PROGRESS: Record<OrderStatus, number> = {
  processed: 10,
  in_transit: 50,
  out_for_delivery: 85,
  delivered: 100,
  issue: 0,
};

export const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
