'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Truck, MapPin, CheckCircle, AlertTriangle,
  Copy, Check, AlertCircle, Pencil, Archive, Trash2, Calendar,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils/status';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EditOrderModal } from '@/components/orders/EditOrderModal';
import { useOrdersStore } from '@/lib/store/orders';

interface Props {
  order: Order;
  index: number;
  inHistory?: boolean;
}

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  processed:        <Package size={14} />,
  in_transit:       <Truck size={14} />,
  out_for_delivery: <MapPin size={14} />,
  delivered:        <CheckCircle size={14} />,
  issue:            <AlertTriangle size={14} />,
};

export function OrderCard({ order, index, inHistory = false }: Props) {
  const { archiveOrder, purgeOrder } = useOrdersStore();
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cfg = STATUS_CONFIG[order.status];

  // Double-click detection
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger on button clicks inside the card
    if ((e.target as HTMLElement).closest('button')) return;
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
      }, 280);
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      setEditOpen(true);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inHistory) {
      purgeOrder(order.id);
    } else {
      archiveOrder(order.id);
    }
  };

  const isToday = order.estimatedDelivery === 'Today';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.26, ease: 'easeOut' }}
        className="glass-card select-none transition-colors duration-150 relative"
        style={{ cursor: 'default' }}
        onClick={handleCardClick}
      >
        {/* Delete confirmation overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl z-10 flex flex-col items-center justify-center gap-3 px-5"
              style={{ background: 'rgba(13,13,14,0.94)', backdropFilter: 'blur(2px)' }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                {inHistory ? 'Permanently delete this order?' : 'Archive this order?'}
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {inHistory
                  ? 'This cannot be undone.'
                  : 'It will be moved to History.'}
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: inHistory ? 'rgba(239,68,68,0.15)' : 'rgba(52,71,170,0.15)',
                    border: `1px solid ${inHistory ? 'rgba(239,68,68,0.3)' : 'rgba(52,71,170,0.3)'}`,
                    color: inHistory ? '#EF4444' : '#3447AA',
                  }}
                >
                  {inHistory ? 'Delete' : 'Archive'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4">
          {/* ── Row 1: status icon + name + compact badge + action buttons ── */}
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* Status icon chip */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <span style={{ color: cfg.color }}>{STATUS_ICONS[order.status]}</span>
            </div>

            {/* Name — gets the lion's share of space */}
            <p
              className="font-semibold text-sm flex-1 min-w-0 truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {order.name}
            </p>

            {/* Compact status badge — short label, won't crush name */}
            <StatusBadge status={order.status} variant="compact" />

            {/* Edit button */}
            <button
              onClick={e => { e.stopPropagation(); setEditOpen(true); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
              title="Edit order"
            >
              <Pencil size={10} style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Archive / Delete button */}
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: inHistory ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${inHistory ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
              }}
              title={inHistory ? 'Delete permanently' : 'Archive order'}
            >
              {inHistory
                ? <Trash2 size={10} style={{ color: '#EF4444' }} />
                : <Archive size={10} style={{ color: 'var(--text-muted)' }} />
              }
            </button>
          </div>

          {/* ── Row 2: platform · carrier subtitle ── */}
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)', paddingLeft: '42px' }}>
            {order.platform} · {order.carrier}
          </p>

          {/* ── Row 3: tracking number — always visible ── */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl mb-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="text-xs font-mono truncate flex-1 mr-2" style={{ color: 'var(--text-secondary)' }}>
              {order.trackingNumber}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg flex-shrink-0 transition-all"
              style={{
                color: copied ? '#10B981' : 'var(--text-muted)',
                background: copied ? 'rgba(16,185,129,0.1)' : 'transparent',
              }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* ── Row 4: estimated delivery + last update ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={10} />
              <span className="text-xs" style={{ color: isToday ? cfg.color : 'var(--text-muted)' }}>
                {isToday ? (
                  <span className="font-semibold">Arriving today</span>
                ) : order.estimatedDelivery ? (
                  <>Est. {order.estimatedDelivery}</>
                ) : (
                  'No ETA'
                )}
              </span>
            </div>
            {order.notes ? (
              <span className="text-xs italic truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                {order.notes}
              </span>
            ) : null}
          </div>

          {/* Issue banner */}
          {order.status === 'issue' && (
            <div
              className="flex items-center gap-2 p-2 rounded-lg mt-2.5"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}
            >
              <AlertCircle size={11} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span className="text-xs" style={{ color: '#EF4444' }}>
                Delivery exception — check carrier website
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <EditOrderModal order={order} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
