import type { Order } from '@/types';

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toLocalISODate(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from today to the given YYYY-MM-DD (negative = in the past). */
export function daysFromToday(iso: string): number {
  const today = parseLocalDate(toLocalISODate());
  return Math.round((parseLocalDate(iso).getTime() - today.getTime()) / 86_400_000);
}

export type EtaTone = 'today' | 'soon' | 'late' | 'normal' | 'none';

export function etaInfo(order: Order): { label: string; tone: EtaTone } {
  if (order.status === 'delivered') {
    return order.deliveredAt
      ? { label: `Delivered ${shortDate(order.deliveredAt)}`, tone: 'normal' }
      : { label: 'Delivered', tone: 'normal' };
  }
  if (order.status === 'out_for_delivery') return { label: 'Arriving today', tone: 'today' };

  const iso = order.estimatedDeliveryDate;
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const days = daysFromToday(iso);
    if (days === 0) return { label: 'Arriving today', tone: 'today' };
    if (days === 1) return { label: 'Tomorrow', tone: 'soon' };
    if (days < 0) return { label: `Was due ${shortDate(iso)}`, tone: 'late' };
    if (days < 7) return { label: parseLocalDate(iso).toLocaleDateString('en-GB', { weekday: 'long' }), tone: 'soon' };
    return { label: shortDate(iso), tone: 'normal' };
  }
  // Legacy free-text ETA from older saves
  const legacy = order.estimatedDelivery;
  if (legacy && !['Calculating...', 'Unknown', 'Today'].includes(legacy)) return { label: legacy, tone: 'normal' };
  return { label: 'No ETA', tone: 'none' };
}

export function isDueToday(order: Order): boolean {
  if (order.status === 'out_for_delivery') return true;
  return !!order.estimatedDeliveryDate && daysFromToday(order.estimatedDeliveryDate) === 0;
}

export function shortDate(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseLocalDate(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "Updated 3h ago" style text; passes legacy display strings through unchanged. */
export function relativeTime(value: string): string {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return shortDate(value);
}
