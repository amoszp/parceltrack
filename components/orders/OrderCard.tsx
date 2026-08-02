'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, MapPin, CheckCircle, AlertTriangle, ChevronDown, Clock, Calendar, Copy, Check, AlertCircle, Pencil } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils/status';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EditOrderModal } from '@/components/orders/EditOrderModal';

interface Props {
  order: Order;
  index: number;
}

// Status-matched icons (same set as FilterTabs & StatusBadge)
const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  processed:        <Package size={14} />,
  in_transit:       <Truck size={14} />,
  out_for_delivery: <MapPin size={14} />,
  delivered:        <CheckCircle size={14} />,
  issue:            <AlertTriangle size={14} />,
};

export function OrderCard({ order, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const cfg = STATUS_CONFIG[order.status];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.055, duration: 0.28, ease: 'easeOut' }}
        className="glass-card cursor-pointer select-none transition-colors duration-150"
        style={{ borderColor: expanded ? cfg.border : undefined }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Left: icon + name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <span style={{ color: cfg.color }}>{STATUS_ICONS[order.status]}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {order.name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {order.platform} · {order.carrier}
                </p>
              </div>
            </div>

            {/* Right: badge + edit + chevron */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StatusBadge status={order.status} />
              <button
                onClick={handleEdit}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                }}
              >
                <Pencil size={10} style={{ color: 'var(--text-muted)' }} />
              </button>
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
                <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
              </motion.div>
            </div>
          </div>

          {/* Progress bar */}
          <ProgressBar progress={order.progress} status={order.status} />

          {/* Bottom meta */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Clock size={10} />
              <span className="text-xs">{order.lastUpdate}</span>
            </div>
            <div className="flex items-center gap-1">
              {order.estimatedDelivery === 'Today'
                ? <Truck size={11} style={{ color: cfg.color }} />
                : <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
              }
              <span
                className="text-xs font-medium"
                style={{ color: order.estimatedDelivery === 'Today' ? cfg.color : 'var(--text-muted)' }}
              >
                {order.estimatedDelivery}
              </span>
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div
                className="mx-4 mb-4 p-3 rounded-xl space-y-2.5"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)' }}
              >
                {/* Tracking number */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tracking</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{
                      color: copied ? '#10B981' : 'var(--text-secondary)',
                      background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                    }}
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    <span className="font-mono">{order.trackingNumber}</span>
                  </button>
                </div>

                {/* Notes */}
                {order.notes && (
                  <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                    {order.notes}
                  </p>
                )}

                {/* Tags */}
                {order.tags && order.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {order.tags.map(t => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider"
                        style={{ background: 'rgba(52,71,170,0.12)', color: '#3447AA', border: '1px solid rgba(52,71,170,0.2)' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Issue banner */}
                {order.status === 'issue' && (
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertCircle size={12} style={{ color: '#EF4444' }} />
                    <span className="text-xs" style={{ color: '#EF4444' }}>
                      Delivery exception — check carrier website
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <EditOrderModal order={order} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
