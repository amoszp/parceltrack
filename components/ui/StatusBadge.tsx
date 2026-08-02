'use client';
import { Package, Truck, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { OrderStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils/status';

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  processed:        <Package size={9} />,
  in_transit:       <Truck size={9} />,
  out_for_delivery: <MapPin size={9} />,
  delivered:        <CheckCircle size={9} />,
  issue:            <AlertTriangle size={9} />,
};

export function StatusBadge({ status, size = 'sm' }: Props) {
  const cfg = STATUS_CONFIG[status];
  const isOFD = status === 'out_for_delivery';

  return (
    <span
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: isOFD ? `0 0 10px ${cfg.glow}` : undefined,
        fontSize: size === 'sm' ? '10px' : '11px',
        letterSpacing: '0.04em',
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold uppercase whitespace-nowrap"
    >
      {isOFD
        ? <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
        : <span style={{ color: cfg.color }}>{STATUS_ICONS[status]}</span>
      }
      {cfg.label}
    </span>
  );
}
