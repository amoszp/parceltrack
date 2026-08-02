'use client';
import { Package, Truck, MapPin, CheckCircle, AlertTriangle, LayoutGrid } from 'lucide-react';
import { StatusFilter, OrderStatus } from '@/types';
import { STATUS_CONFIG, BRAND } from '@/lib/utils/status';
import { useOrdersStore } from '@/lib/store/orders';

const FILTERS: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all',              label: 'All',         icon: <LayoutGrid size={11} /> },
  { value: 'processed',        label: 'Processing',  icon: <Package size={11} /> },
  { value: 'in_transit',       label: 'In Transit',  icon: <Truck size={11} /> },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: <MapPin size={11} /> },
  { value: 'delivered',        label: 'Delivered',   icon: <CheckCircle size={11} /> },
  { value: 'issue',            label: 'Issues',      icon: <AlertTriangle size={11} /> },
];

export function FilterTabs() {
  const { statusFilter, setStatusFilter, orders } = useOrdersStore();

  const countFor = (f: StatusFilter) =>
    f === 'all'
      ? orders.filter(o => o.status !== 'delivered').length
      : orders.filter(o => o.status === f).length;

  return (
    <div className="flex gap-1.5 scroll-area pb-1" style={{ overflowX: 'auto' }}>
      {FILTERS.map((f) => {
        const active = statusFilter === f.value;
        const cfg = f.value !== 'all' ? STATUS_CONFIG[f.value as OrderStatus] : null;
        const count = countFor(f.value);
        const activeColor = cfg ? cfg.color : BRAND.primary;
        const activeBg    = cfg ? cfg.bg : BRAND.primaryBg;
        const activeBorder= cfg ? cfg.border : BRAND.primaryBorder;

        return (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0"
            style={{
              background: active ? activeBg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? activeBorder : 'var(--border)'}`,
              color: active ? activeColor : 'var(--text-muted)',
            }}
          >
            <span style={{ color: active ? activeColor : 'var(--text-muted)' }}>{f.icon}</span>
            {f.label}
            {count > 0 && (
              <span
                className="text-[10px] min-w-[15px] h-4 px-1 rounded-full flex items-center justify-center font-bold tabular-nums"
                style={{
                  background: active ? activeColor : 'rgba(255,255,255,0.08)',
                  color: active ? (cfg ? '#000' : '#fff') : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
