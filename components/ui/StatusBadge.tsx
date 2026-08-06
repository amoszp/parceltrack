'use client';
import { Package, Truck, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { OrderStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils/status';

interface Props {
  status: OrderStatus;
  /** 'compact' = icon-only dot for card header, 'full' = icon + label */
  variant?: 'compact' | 'full';
}

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  processed:        <Package size={10} />,
  in_transit:       <Truck size={10} />,
  out_for_delivery: <MapPin size={10} />,
  delivered:        <CheckCircle size={10} />,
  issue:            <AlertTriangle size={10} />,
};

// Short labels that won't overflow card headers
const SHORT_LABELS: Record<OrderStatus, string> = {
  processed:        'Processing',
  in_transit:       'Transit',
  out_for_delivery: 'Delivery',
  delivered:        'Delivered',
  issue:            'Issue',
};

export function StatusBadge({ status, variant = 'compact' }: Props) {
  const cfg = STATUS_CONFIG[status];
  const isOFD = status === 'out_for_delivery';

  if (variant === 'compact') {
    // Small pill: icon + short label — won't crush order name
    return (
      <span
        style={{
          color: cfg.color,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          fontSize: '10px',
          letterSpacing: '0.02em',
        }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
      >
        {isOFD
          ? <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
          : <span style={{ color: cfg.color, flexShrink: 0 }}>{STATUS_ICONS[status]}</span>
        }
        {SHORT_LABELS[status]}
      </span>
    );
  }

  // Full variant for modals / detail views
  return (
    <span
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontSize: '11px',
        letterSpacing: '0.04em',
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold uppercase whitespace-nowrap"
    >
      {isOFD
        ? <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
        : <span style={{ color: cfg.color }}>{STATUS_ICONS[status]}</span>
      }
      {cfg.label}
    </span>
  );
}
