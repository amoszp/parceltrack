'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Save, AlertTriangle } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useOrdersStore } from '@/lib/store/orders';
import { STATUS_CONFIG, STATUS_PROGRESS } from '@/lib/utils/status';
import { PlatformInput } from '@/components/ui/PlatformInput';

interface Props {
  order: Order;
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: OrderStatus[] = ['processed', 'in_transit', 'out_for_delivery', 'delivered', 'issue'];

export function EditOrderModal({ order, open, onClose }: Props) {
  const { updateOrder, removeOrder } = useOrdersStore();
  const [name, setName] = useState(order.name);
  const [platform, setPlatform] = useState(order.platform);
  const [carrier, setCarrier] = useState(order.carrier);
  const [trackingNumber, setTracking] = useState(order.trackingNumber);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [notes, setNotes] = useState(order.notes ?? '');
  const [tags, setTags] = useState((order.tags ?? []).join(', '));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    updateOrder(order.id, {
      name: name.trim() || order.name,
      platform: platform.trim() || order.platform,
      carrier: carrier.trim() || order.carrier,
      trackingNumber: trackingNumber.trim() || order.trackingNumber,
      status,
      progress: STATUS_PROGRESS[status],
      notes: notes.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      lastUpdate: 'Just now',
    });
    onClose();
  };

  const handleDelete = () => {
    removeOrder(order.id);
    onClose();
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
  } as React.CSSProperties;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-w-lg mx-auto"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              maxHeight: '90dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Edit order</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>All changes are saved locally</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <X size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto scroll-area px-6 pb-2 space-y-3">
              {/* Name */}
              <Field label="Order name">
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Running Shoes" />
              </Field>

              {/* Platform */}
              <Field label="Platform / Store">
                <PlatformInput value={platform} onChange={setPlatform} />
              </Field>

              {/* Carrier */}
              <Field label="Carrier">
                <input style={inputStyle} value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. DHL, UPS, Correos" />
              </Field>

              {/* Tracking */}
              <Field label="Tracking number">
                <input
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                  value={trackingNumber}
                  onChange={e => setTracking(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </Field>

              {/* Status override */}
              <Field label="Status (manual override)">
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const active = status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: active ? cfg.bg : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? cfg.border : 'var(--border)'}`,
                          color: active ? cfg.color : 'var(--text-muted)',
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Notes */}
              <Field label="Notes (optional)">
                <textarea
                  style={{ ...inputStyle, resize: 'none', height: '72px' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Customs hold, leave at door, etc."
                />
              </Field>

              {/* Tags */}
              <Field label="Tags (comma separated)">
                <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. gift, urgent, customs" />
              </Field>
            </div>

            {/* Footer actions */}
            <div className="flex-shrink-0 px-6 pt-3 pb-6 space-y-2" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              {showDeleteConfirm ? (
                <div className="rounded-2xl p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-sm text-center font-medium" style={{ color: '#EF4444' }}>
                    Delete this order permanently?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 size={15} style={{ color: '#EF4444' }} />
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
                    style={{
                      background: '#3447AA',
                      color: '#fff',
                      boxShadow: '0 0 20px rgba(52,71,170,0.3)',
                    }}
                  >
                    <Save size={15} />
                    Save changes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {children}
    </div>
  );
}
