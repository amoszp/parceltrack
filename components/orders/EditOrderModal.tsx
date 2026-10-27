'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Copy, Check, ExternalLink, Archive, ArchiveRestore, Trash2, Tag, Hash, CalendarDays, X,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useOrdersStore } from '@/lib/store/orders';
import { STATUS_CONFIG, STATUS_ORDER } from '@/lib/utils/status';
import { validateTracking } from '@/lib/utils/validation';
import { carrierTrackingUrl } from '@/lib/tracking/carriers';
import { relativeTime, shortDate } from '@/lib/utils/dates';
import { PlatformInput, CarrierInput } from '@/components/ui/PlatformInput';
import { StatusBadge, STATUS_ICONS } from '@/components/ui/StatusBadge';
import { Sheet } from '@/components/ui/Sheet';
import { TrackingHint } from '@/components/ui/TrackingHint';

interface Props {
  order: Order | null;
  onClose: () => void;
}

/** Details + edit sheet for one order. Covers Update and Delete of the CRUD loop. */
export function EditOrderModal({ order, onClose }: Props) {
  const { updateOrder, archiveOrder, restoreOrder, purgeOrder, findByTracking, showToast } = useOrdersStore();
  const open = !!order;

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTracking] = useState('');
  const [status, setStatus] = useState<OrderStatus>('processed');
  const [eta, setEta] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load the order into the form whenever a different order opens
  const orderId = order?.id;
  useEffect(() => {
    if (!order) return;
    setName(order.name);
    setPlatform(order.platform === 'Unknown' ? '' : order.platform);
    setCarrier(order.carrier === 'Unknown' ? '' : order.carrier);
    setTracking(order.trackingNumber);
    setStatus(order.status);
    setEta(order.estimatedDeliveryDate ?? '');
    setNotes(order.notes ?? '');
    setConfirmClose(false);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const validation = useMemo(() => (trackingNumber.trim() ? validateTracking(trackingNumber) : null), [trackingNumber]);
  const trackingChanged = !!order && validation?.normalized !== order.trackingNumber;
  const duplicate = order && validation && trackingChanged ? findByTracking(validation.normalized, order.id) : undefined;

  const original = order && {
    name: order.name,
    platform: order.platform === 'Unknown' ? '' : order.platform,
    carrier: order.carrier === 'Unknown' ? '' : order.carrier,
  };
  const isDirty = !!order && !!original && (
    name !== original.name ||
    platform !== original.platform ||
    carrier !== original.carrier ||
    trackingNumber !== order.trackingNumber ||
    status !== order.status ||
    eta !== (order.estimatedDeliveryDate ?? '') ||
    notes !== (order.notes ?? '')
  );
  const canSave = isDirty && !!validation?.normalized && !duplicate && !!name.trim();

  const handleSave = useCallback(() => {
    if (!order || !canSave || !validation) return;
    const newTracking = validation.normalized;
    updateOrder(order.id, {
      name: name.trim(),
      platform: platform.trim() || 'Unknown',
      // A new number re-detects the carrier unless the user typed one
      carrier: carrier.trim() || (newTracking !== order.trackingNumber ? validation.carrier : undefined) || 'Unknown',
      trackingNumber: newTracking,
      status,
      estimatedDeliveryDate: eta || undefined,
      estimatedDelivery: eta ? undefined : order.estimatedDelivery,
      notes: notes.trim(),
    });
    if (platform.trim()) useOrdersStore.getState().addPlatform(platform.trim());
    showToast('Changes saved');
    onClose();
  }, [order, canSave, validation, name, platform, carrier, status, eta, notes, updateOrder, showToast, onClose]);

  const requestClose = useCallback(() => {
    if (isDirty) setConfirmClose(true);
    else onClose();
  }, [isDirty, onClose]);

  if (!order) return <Sheet open={false} onRequestClose={onClose} title="">{null}</Sheet>;

  const inHistory = !!order.isArchived || order.status === 'delivered';
  const trackUrl = carrierTrackingUrl(order.carrier, order.trackingNumber);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Couldn't copy. Long-press the number instead.");
    }
  };

  const archive = () => {
    archiveOrder(order.id);
    onClose();
    showToast(`Moved “${order.name}” to History`, () => restoreOrder(order.id));
  };
  const restore = () => {
    restoreOrder(order.id);
    onClose();
    showToast(`“${order.name}” is back in Tracking`, () => archiveOrder(order.id));
  };
  const remove = () => {
    onClose();
    purgeOrder(order.id);
  };

  const banner = (
    <AnimatePresence>
      {confirmClose && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          className="flex-shrink-0 mx-6 mb-3 rounded-2xl p-4"
          style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}
          role="alertdialog"
          aria-label="Unsaved changes"
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Keep your changes?</p>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Discard</button>
            <button type="button" onClick={() => setConfirmClose(false)} className="btn btn-ghost flex-1">Back</button>
            <button type="button" onClick={handleSave} disabled={!canSave} className="btn btn-primary flex-1">Save</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const footer = (
    <div className="space-y-2.5">
      <button type="submit" form="edit-order-form" disabled={!canSave} className="btn btn-primary w-full" style={{ minHeight: 50 }}>
        {isDirty ? 'Save changes' : 'No changes'}
      </button>
      <div className="flex gap-2">
        {order.isArchived && order.status !== 'delivered' ? (
          <button type="button" onClick={restore} className="btn btn-ghost flex-1">
            <ArchiveRestore size={16} /> Restore
          </button>
        ) : !inHistory ? (
          <button type="button" onClick={archive} className="btn btn-ghost flex-1">
            <Archive size={16} /> Archive
          </button>
        ) : null}
        <button type="button" onClick={remove} className="btn btn-danger flex-1">
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </div>
  );

  return (
    <Sheet
      open={open}
      onRequestClose={requestClose}
      title={order.name}
      subtitle={
        <span className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={order.status} variant="full" />
          <span>Updated {relativeTime(order.lastUpdate)}</span>
        </span>
      }
      banner={banner}
      footer={footer}
    >
      {/* Tracking number + quick actions */}
      <div className="rounded-2xl p-3 pl-4 flex items-center gap-2 mb-5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {order.carrier === 'Unknown' ? 'Tracking number' : order.carrier}
          </p>
          <p className="mono text-[15px] truncate select-all" style={{ color: 'var(--text-primary)' }}>{order.trackingNumber}</p>
        </div>
        <button type="button" onClick={copy} className="icon-btn" aria-label={copied ? 'Copied' : 'Copy tracking number'}>
          {copied ? <Check size={18} style={{ color: 'var(--color-success)' }} /> : <Copy size={18} />}
        </button>
        <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ minHeight: 40, padding: '0 12px' }}>
          <ExternalLink size={15} /> Track
        </a>
      </div>

      <form id="edit-order-form" className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <div>
          <label className="label" htmlFor="edit-name">Name</label>
          <div className="field">
            <Tag size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input id="edit-name" value={name} onChange={e => setName(e.target.value)} placeholder="Running shoes" />
          </div>
          {!name.trim() && <p className="text-[13px] mt-2" style={{ color: 'var(--color-warning)' }}>Give it a name.</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="edit-store">Store</label>
            <PlatformInput id="edit-store" value={platform} onChange={setPlatform} />
          </div>
          <div>
            <label className="label" htmlFor="edit-carrier">Carrier</label>
            <CarrierInput
              id="edit-carrier"
              value={carrier}
              onChange={setCarrier}
              suggested={validation?.candidates ?? (validation?.carrier ? [validation.carrier] : [])}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="edit-tracking">Tracking number</label>
          <div className="field">
            <Hash size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input
              id="edit-tracking"
              className="mono"
              value={trackingNumber}
              onChange={e => setTracking(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {duplicate ? (
            <p className="text-[13px] mt-2" style={{ color: 'var(--color-warning)' }} role="status">
              “{duplicate.name}” already uses this number.
            </p>
          ) : trackingChanged ? (
            <TrackingHint result={validation} />
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="edit-eta">Expected delivery</label>
          <div className="field">
            <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input id="edit-eta" type="date" value={eta} onChange={e => setEta(e.target.value)} />
            {eta && (
              <button type="button" onClick={() => setEta('')} className="icon-btn -mr-2" aria-label="Clear date" style={{ width: 36, height: 36 }}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <fieldset>
          <legend className="label">Status</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STATUS_ORDER.map(s => {
              const cfg = STATUS_CONFIG[s];
              const Icon = STATUS_ICONS[s];
              const active = status === s;
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  aria-pressed={active}
                  className="flex items-center gap-2 px-3 min-h-[44px] rounded-xl text-[13px] font-semibold text-left"
                  style={{
                    background: active ? cfg.bg : 'var(--bg-input)',
                    border: `1px solid ${active ? cfg.border : 'var(--border)'}`,
                    color: active ? cfg.color : 'var(--text-secondary)',
                    transition: 'background-color 150ms, border-color 150ms, color 150ms',
                  }}
                >
                  <Icon size={15} aria-hidden /> {cfg.label}
                </button>
              );
            })}
          </div>
          {status === 'delivered' && order.status !== 'delivered' && (
            <p className="text-[13px] mt-2" style={{ color: 'var(--text-muted)' }}>Saving moves it to History.</p>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="edit-notes">Notes</label>
          <textarea
            id="edit-notes"
            className="field w-full py-3 resize-none"
            style={{ minHeight: 84, color: 'var(--text-primary)', outline: 'none' }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Customs hold, leave with neighbour…"
          />
        </div>

        {order.statusHistory.length > 0 && (
          <div>
            <p className="label">Tracking history</p>
            <ol className="space-y-3 pl-1">
              {order.statusHistory.map((ev, i) => (
                <li key={`${ev.timestamp}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: i === 0 ? 'var(--brand)' : 'var(--border)' }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{ev.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {[ev.location, ev.timestamp && shortDate(ev.timestamp)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
          Added {shortDate(order.createdAt)}
          {order.deliveredAt && ` · Delivered ${shortDate(order.deliveredAt)}`}
          {order.archivedAt && order.isArchived && ` · Archived ${shortDate(order.archivedAt)}`}
        </p>
      </form>
    </Sheet>
  );
}
