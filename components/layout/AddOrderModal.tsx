'use client';
import { useEffect, useMemo, useState } from 'react';
import { ScanLine, Tag, Loader2, CalendarDays, AlertTriangle } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';
import { generateId, STATUS_PROGRESS } from '@/lib/utils/status';
import { Order, OrderStatus, StatusEvent } from '@/types';
import { validateTracking, parseTrackingInput, normalizeTracking } from '@/lib/utils/validation';
import { PlatformInput, CarrierInput } from '@/components/ui/PlatformInput';
import { Sheet } from '@/components/ui/Sheet';
import { TrackingHint } from '@/components/ui/TrackingHint';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill the tracking field (e.g. from a search that found nothing). */
  initialTracking?: string;
  /** Open an existing order instead of adding a duplicate. */
  onOpenExisting: (id: string) => void;
}

interface LiveResult {
  live: boolean;
  carrier?: string;
  status?: OrderStatus;
  estimatedDeliveryDate?: string;
  events?: Array<{ timestamp: string; location: string; description: string }>;
}

/** Ask the server for live status; quietly gives up if there's no provider or no network. */
async function fetchLive(trackingNumber: string): Promise<LiveResult | null> {
  try {
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber, force: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LiveResult;
    return data.live ? data : null;
  } catch {
    return null;
  }
}

export function AddOrderModal({ open, onClose, initialTracking = '', onOpenExisting }: Props) {
  const { addOrder, findByTracking, showToast } = useOrdersStore();
  const [tracking, setTracking] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [carrier, setCarrier] = useState('');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTracking(initialTracking);
      setName(''); setPlatform(''); setCarrier(''); setEta(''); setLoading(false);
    }
  }, [open, initialTracking]);

  const code = useMemo(() => parseTrackingInput(tracking), [tracking]);
  const result = useMemo(() => (code ? validateTracking(code) : null), [code]);
  const duplicate = result ? findByTracking(result.normalized) : undefined;
  const pastedSomethingElse = !!result?.normalized && normalizeTracking(tracking) !== result.normalized;

  const mistyped = result?.confidence === 'invalid';
  const canSubmit = !!result?.normalized && result.normalized.length >= 6 && !duplicate && !loading;

  const submit = async () => {
    if (!result || !canSubmit) return;
    setLoading(true);
    const live = await fetchLive(result.normalized);
    const now = new Date().toISOString();
    const status: OrderStatus = live?.status ?? 'processed';
    const statusHistory: StatusEvent[] = (live?.events ?? []).map(e => ({ ...e, status }));

    const order: Order = {
      id: generateId(),
      name: name.trim() || platform.trim() || 'New package',
      platform: platform.trim() || 'Unknown',
      trackingNumber: result.normalized,
      carrier: carrier.trim() || result.carrier || live?.carrier || 'Unknown',
      status,
      progress: STATUS_PROGRESS[status],
      estimatedDeliveryDate: eta || live?.estimatedDeliveryDate,
      lastUpdate: now,
      statusHistory,
      createdAt: now,
      deliveredAt: status === 'delivered' ? now : undefined,
      notes: '',
    };
    addOrder(order);
    setLoading(false);
    onClose();
    showToast(`Tracking “${order.name}”`);
  };

  const footer = (
    <button
      type="submit"
      form="add-order-form"
      disabled={!canSubmit}
      className={`btn w-full ${mistyped ? 'btn-warning' : 'btn-primary'}`}
      style={{ minHeight: 50 }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : mistyped ? <AlertTriangle size={16} /> : null}
      {loading ? 'Adding…' : mistyped ? 'Add anyway' : 'Start tracking'}
    </button>
  );

  return (
    <Sheet open={open} onRequestClose={onClose} title="Track a package" subtitle="Paste a number, a carrier link or the shipping email" footer={footer}>
      <form
        id="add-order-form"
        className="space-y-4 pt-1"
        onSubmit={e => { e.preventDefault(); submit(); }}
      >
        <div>
          <label className="label" htmlFor="add-tracking">Tracking number</label>
          <div className="field">
            <ScanLine size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input
              id="add-tracking"
              autoFocus
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              placeholder="e.g. RR123456785ES"
              className="mono"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
          </div>
          {pastedSomethingElse && (
            <p className="text-[13px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              Using <span className="mono" style={{ color: 'var(--text-primary)' }}>{result?.normalized}</span>
            </p>
          )}
          {duplicate ? (
            <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] mt-2" style={{ color: 'var(--color-warning)' }} role="status">
              Already tracking this as “{duplicate.name}”.
              <button
                type="button"
                className="underline underline-offset-2 font-semibold"
                onClick={() => { onClose(); onOpenExisting(duplicate.id); }}
              >
                Open it
              </button>
            </p>
          ) : (
            <TrackingHint result={result} />
          )}
        </div>

        <div>
          <label className="label" htmlFor="add-name">What is it?</label>
          <div className="field">
            <Tag size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input id="add-name" value={name} onChange={e => setName(e.target.value)} placeholder="Running shoes" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="add-store">Store</label>
            <PlatformInput id="add-store" value={platform} onChange={setPlatform} />
          </div>
          <div>
            <label className="label" htmlFor="add-carrier">Carrier</label>
            <CarrierInput
              id="add-carrier"
              value={carrier}
              onChange={setCarrier}
              suggested={result?.candidates ?? (result?.carrier ? [result.carrier] : [])}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="add-eta">Expected delivery <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <div className="field">
            <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input id="add-eta" type="date" value={eta} onChange={e => setEta(e.target.value)} />
          </div>
        </div>
      </form>
    </Sheet>
  );
}
