'use client';
import { Package, Truck, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { OrderStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils/status';

export const STATUS_ICONS: Record<OrderStatus, typeof Package> = {
  processed:        Package,
  in_transit:       Truck,
  out_for_delivery: MapPin,
  delivered:        CheckCircle,
  issue:            AlertTriangle,
};

interface Props {
  status: OrderStatus;
  /** 'compact' = short label for cards, 'full' = full label for sheets */
  variant?: 'compact' | 'full';
}

export function StatusBadge({ status, variant = 'compact' }: Props) {
  const cfg = STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];
  const isOFD = status === 'out_for_delivery';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontSize: variant === 'full' ? 12 : 11,
        padding: variant === 'full' ? '4px 10px' : '2px 8px',
      }}
    >
      {isOFD
        ? <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
        : <Icon size={variant === 'full' ? 12 : 11} aria-hidden />}
      {variant === 'full' ? cfg.label : cfg.short}
    </span>
  );
}

/** Square status icon tile used on cards. */
export function StatusIcon({ status, size = 40 }: { status: OrderStatus; size?: number }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-xl"
      style={{ width: size, height: size, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.45)} />
    </div>
  );
}
