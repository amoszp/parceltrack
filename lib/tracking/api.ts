/**
 * Unified Tracking API Layer
 *
 * TRACKING_PROVIDER picks the live-status provider and TRACKING_API_KEY holds
 * its key. Without a key the lookup returns `live: false` and the app keeps
 * working with manual status.
 *   17track   — https://api.17track.net/en/doc (v2.4; register once, then read for free)
 *   aftership — https://www.aftership.com/docs/tracking/3.x/quickstart (default)
 */
import type { OrderStatus } from '@/types';

export interface TrackingEvent {
  timestamp: string;
  location: string;
  description: string;
}

export interface TrackingResult {
  live: boolean;
  trackingNumber: string;
  carrier?: string;
  status?: OrderStatus;
  estimatedDeliveryDate?: string;   // YYYY-MM-DD
  lastUpdate?: string;
  events: TrackingEvent[];
}

const AFTERSHIP_BASE = 'https://api.aftership.com/tracking/2024-07/trackings';
const SEVENTEEN_BASE = 'https://api.17track.net/track/v2.4';

const isoDate = (v: unknown): string | undefined =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined;

// ─── AfterShip ─────────────────────────────────────────────────────────────

/**
 * Map AfterShip tag → internal status
 * Ref: https://developers.aftership.com/docs/tracking-status-list
 */
export function mapAfterShipStatus(tag: string): OrderStatus {
  switch (tag) {
    case 'InfoReceived':
    case 'Pending':        return 'processed';
    case 'InTransit':
    case 'AvailableForPickup':
    case 'AttemptFail':    return 'in_transit';
    case 'OutForDelivery': return 'out_for_delivery';
    case 'Delivered':      return 'delivered';
    case 'Exception':
    case 'Expired':        return 'issue';
    default:               return 'processed';
  }
}

export function mapAfterShip(trackingNumber: string, data: any): TrackingResult {
  const t = data?.data?.tracking;
  return {
    live: true,
    trackingNumber,
    carrier: t?.slug,
    status: mapAfterShipStatus(t?.tag ?? 'Pending'),
    estimatedDeliveryDate: isoDate(t?.expected_delivery),
    lastUpdate: t?.updated_at,
    events: (t?.checkpoints ?? []).map((cp: Record<string, string>) => ({
      timestamp: cp.checkpoint_time,
      location: [cp.city, cp.country_name].filter(Boolean).join(', '),
      description: cp.message,
    })),
  };
}

async function lookupAfterShip(trackingNumber: string, key: string): Promise<TrackingResult> {
  const res = await fetch(AFTERSHIP_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'as-api-key': key },
    body: JSON.stringify({ tracking: { tracking_number: trackingNumber } }),
  });
  if (!res.ok) throw new Error(`Tracking API error: ${res.status}`);
  return mapAfterShip(trackingNumber, await res.json());
}

// ─── 17TRACK ───────────────────────────────────────────────────────────────

/**
 * Map 17TRACK latest_status.status → internal status
 * Ref: https://api.17track.net/en/doc (main status list)
 */
export function mapSeventeenStatus(status: string): OrderStatus {
  switch (status) {
    case 'NotFound':
    case 'InfoReceived':       return 'processed';
    case 'InTransit':
    case 'AvailableForPickup': return 'in_transit';
    case 'OutForDelivery':     return 'out_for_delivery';
    case 'Delivered':          return 'delivered';
    case 'DeliveryFailure':
    case 'Exception':
    case 'Expired':            return 'issue';
    default:                   return 'processed';
  }
}

/** Maps one `data.accepted[]` entry of /gettrackinfo. */
export function mapSeventeenTrack(trackingNumber: string, item: any): TrackingResult {
  const info = item?.track_info ?? {};
  const provider = info?.tracking?.providers?.[0];
  const eta = info?.time_metrics?.estimated_delivery_date;
  const events: TrackingEvent[] = (provider?.events ?? []).map((e: any) => ({
    timestamp: e?.time_iso ?? e?.time_utc ?? '',
    location: typeof e?.location === 'string' ? e.location : '',
    description: e?.description ?? '',
  }));
  return {
    live: true,
    trackingNumber,
    carrier: provider?.provider?.name,
    status: mapSeventeenStatus(info?.latest_status?.status ?? 'NotFound'),
    estimatedDeliveryDate: isoDate(eta?.to) ?? isoDate(eta?.from),
    lastUpdate: info?.latest_event?.time_iso ?? info?.latest_event?.time_utc,
    events,
  };
}

async function seventeenCall(path: string, key: string, body: unknown): Promise<any> {
  const res = await fetch(`${SEVENTEEN_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', '17token': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Tracking API error: ${res.status}`);
  return res.json();
}

async function lookupSeventeen(trackingNumber: string, key: string): Promise<TrackingResult> {
  // Registering spends one quota per new number; an already-registered number
  // comes back in `rejected`, which is fine. Reading it afterwards is free.
  await seventeenCall('/register', key, [{ number: trackingNumber }]);
  const data = await seventeenCall('/gettrackinfo', key, [{ number: trackingNumber }]);
  const item = data?.data?.accepted?.find((a: any) => a?.number === trackingNumber) ?? data?.data?.accepted?.[0];
  if (!item) return { live: false, trackingNumber, events: [] };
  return mapSeventeenTrack(trackingNumber, item);
}

// ─── Entry point ───────────────────────────────────────────────────────────

export async function lookupTracking(trackingNumber: string): Promise<TrackingResult> {
  const key = process.env.TRACKING_API_KEY ?? '';
  if (!key) return { live: false, trackingNumber, events: [] };
  const provider = (process.env.TRACKING_PROVIDER ?? 'aftership').toLowerCase();
  return provider === '17track'
    ? lookupSeventeen(trackingNumber, key)
    : lookupAfterShip(trackingNumber, key);
}
