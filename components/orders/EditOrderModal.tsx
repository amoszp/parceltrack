'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useOrdersStore, formatDeliveryDate } from '@/lib/store/orders';
import { STATUS_CONFIG, STATUS_PROGRESS } from '@/lib/utils/status';
import { PlatformInput } from '@/components/ui/PlatformInput';

interface Props {
  order: Order;
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: OrderStatus[] = ['processed', 'in_transit', 'out_for_delivery', 'delivered', 'issue'];

export function EditOrderModal({ order, open, onClose }: Props) {
  const { updateOrder } = useOrdersStore();

  // Form state — always synced from order when modal opens
  const [name, setName] = useState(order.name);
  const [platform, setPlatform] = useState(order.platform);
  const [carrier, setCarrier] = useState(order.carrier);
  const [trackingNumber, setTracking] = useState(order.trackingNumber);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [estimatedDeliveryDate, setEDD] = useState(order.estimatedDeliveryDate ?? '');
  const [notes, setNotes] = useState(order.notes ?? '');

  // Unsaved-changes guard state
  const [confirmClose, setConfirmClose] = useState(false);

  // Reset local form whenever the modal opens with a (possibly updated) order
  useEffect(() => {
    if (open) {
      setName(order.name);
      setPlatform(order.platform);
      setCarrier(order.carrier);
      setTracking(order.trackingNumber);
      setStatus(order.status);
      setEDD(order.estimatedDeliveryDate ?? '');
      setNotes(order.notes ?? '');
      setConfirmClose(false);
    }
  }, [open, order]);

  const isDirty =
    name !== order.name ||
    platform !== order.platform ||
    carrier !== order.carrier ||
    trackingNumber !== order.trackingNumber ||
    status !== order.status ||
    estimatedDeliveryDate !== (order.estimatedDeliveryDate ?? '') ||
    notes !== (order.notes ?? '');

  const handleSave = useCallback(() => {
    const deliveryDisplay = formatDeliveryDate(estimatedDeliveryDate || undefined);
    updateOrder(order.id, {
      name: name.trim() || order.name,
      platform: platform.trim() || order.platform,
      carrier: carrier.trim() || order.carrier,
      trackingNumber: trackingNumber.trim() || order.trackingNumber,
      status,
      progress: STATUS_PROGRESS[status],
      estimatedDeliveryDate: estimatedDeliveryDate || undefined,
      estimatedDelivery: estimatedDeliveryDate ? deliveryDisplay : order.estimatedDelivery,
      notes: notes.trim(),
      lastUpdate: 'Just now',
    });
    onClose();
  }, [name, platform, carrier, trackingNumber, status, estimatedDeliveryDate, notes, order, updateOrder, onClose]);

  // Attempt to close — guard if dirty
  const handleCloseAttempt = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleBackdropClick = () => handleCloseAttempt();

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    outline: 'none',
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={handleBackdropClick}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-60 rounded-t-3xl max-w-lg mx-auto"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              maxHeight: '92dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* ── Unsaved changes confirmation ── */}
            <AnimatePresence>
              {confirmClose && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex-shrink-0 mx-6 mt-2 mb-1 rounded-2xl p-4"
                  style={{ background: 'rgba(52,71,170,0.08)', border: '1px solid rgba(52,71,170,0.25)' }}
                >
                  <p className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                    Save your changes?
                  </p>
                  <p className="text-xs text-center mb-3" style={{ color: 'var(--text-muted)' }}>
                    You've made edits that haven't been saved yet.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClose(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Keep editing
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: '#3447AA', color: '#fff' }}
                    >
                      Save &amp; close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Edit order</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {isDirty ? '● Unsaved changes' : 'All changes saved locally'}
                </p>
              </div>
              <button
                onClick={handleCloseAttempt}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <X size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto scroll-area px-6 pb-2 space-y-3">
              <Field label="Order name">
                <input
                  style={inputStyle}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Running Shoes"
                />
              </Field>

              <Field label="Platform / Store">
                <PlatformInput value={platform} onChange={setPlatform} />
              </Field>

              <Field label="Carrier">
                <input
                  style={inputStyle}
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  placeholder="e.g. DHL, UPS, Correos"
                />
              </Field>

              <Field label="Tracking number">
                <input
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                  value={trackingNumber}
                  onChange={e => setTracking(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </Field>

              <Field label="Estimated delivery date">
                <input
                  type="date"
                  style={{
                    ...inputStyle,
                    colorScheme: 'dark',
                  }}
                  value={estimatedDeliveryDate}
                  onChange={e => setEDD(e.target.value)}
                />
              </Field>

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

              <Field label="Notes (optional)">
                <textarea
                  style={{ ...inputStyle, resize: 'none', height: '72px' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Customs hold, leave at door, etc."
                />
              </Field>
            </div>

            {/* Footer */}
            <div
              className="flex-shrink-0 px-6 pt-3"
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={handleSave}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
                style={{
                  background: isDirty ? '#3447AA' : 'rgba(255,255,255,0.05)',
                  color: isDirty ? '#fff' : 'var(--text-muted)',
                  border: isDirty ? 'none' : '1px solid var(--border)',
                  boxShadow: isDirty ? '0 0 20px rgba(52,71,170,0.28)' : 'none',
                }}
              >
                <Save size={15} />
                {isDirty ? 'Save changes' : 'No changes'}
              </button>
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
      <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {children}
    </div>
  );
}
