'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, AlertCircle, StickyNote } from 'lucide-react';
import { Order } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils/status';
import { etaInfo, type EtaTone } from '@/lib/utils/dates';
import { carrierTrackingUrl } from '@/lib/tracking/carriers';
import { StatusIcon } from '@/components/ui/StatusBadge';

interface Props {
  order: Order;
  index: number;
  onOpen: (id: string) => void;
}

const ETA_COLOR: Record<EtaTone, string> = {
  today: 'var(--accent)',
  soon: 'var(--text-primary)',
  late: 'var(--color-danger)',
  normal: 'var(--text-secondary)',
  none: 'var(--text-muted)',
};

export function OrderCard({ order, index, onOpen }: Props) {
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[order.status];
  const eta = etaInfo(order);
  const meta = [order.platform, order.carrier].filter(v => v && v !== 'Unknown').join(' · ');

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onOpen(order.id);
    }
  };

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.22, ease: 'easeOut' }}
      className="list-none"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${order.name}, ${cfg.label}, ${eta.label}`}
        onClick={() => onOpen(order.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(order.id); } }}
        className="card card-interactive p-4 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3">
          <StatusIcon status={order.status} />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-primary)' }}>{order.name}</p>
              <p className="text-[13px] font-semibold whitespace-nowrap tabular" style={{ color: ETA_COLOR[eta.tone] }}>
                {eta.label}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <p className="text-[13px] truncate" style={{ color: 'var(--text-secondary)' }}>{meta || 'No store or carrier yet'}</p>
              <p className="text-[12px] font-medium whitespace-nowrap" style={{ color: cfg.color }}>{cfg.short}</p>
            </div>
          </div>
        </div>

        {/* Tracking number row */}
        <div className="flex items-center gap-1 mt-3 pl-3 pr-1 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
          <span className="mono text-[13px] truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{order.trackingNumber}</span>
          <button
            type="button"
            onClick={copy}
            className="icon-btn"
            style={{ width: 36, height: 36, color: copied ? 'var(--color-success)' : undefined }}
            aria-label={copied ? 'Copied' : 'Copy tracking number'}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <a
            href={carrierTrackingUrl(order.carrier, order.trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="icon-btn"
            style={{ width: 36, height: 36 }}
            aria-label={`Open on ${order.carrier === 'Unknown' ? 'tracking site' : order.carrier}`}
          >
            <ExternalLink size={15} />
          </a>
        </div>

        {order.status === 'issue' && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl mt-2.5" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
            <AlertCircle size={14} className="mt-[2px] flex-shrink-0" style={{ color: 'var(--color-danger)' }} aria-hidden />
            <span className="text-[13px]" style={{ color: 'var(--color-danger)' }}>
              {order.notes || 'Delivery problem. Check the carrier page.'}
            </span>
          </div>
        )}
        {order.status !== 'issue' && order.notes && (
          <p className="flex items-start gap-2 text-[13px] mt-2.5 px-1" style={{ color: 'var(--text-muted)' }}>
            <StickyNote size={13} className="mt-[3px] flex-shrink-0" aria-hidden />
            <span className="line-clamp-2">{order.notes}</span>
          </p>
        )}
      </div>
    </motion.li>
  );
}
