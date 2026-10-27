/**
 * Unified Tracking API Layer
 *
 * Set TRACKING_API_KEY (AfterShip) to get live status. Without a key the
 * lookup returns `live: false` and the app keeps working with manual status.
 *   AfterShip — https://www.aftership.com/docs/tracking/3.x/quickstart
 */
import type { OrderStatus } from '@/types';

export interface TrackingResult {
  live: boolean;
  trackingNumber: string;
  carrier?: string;
  status?: OrderStatus;
  estimatedDeliveryDate?: string;   // YYYY-MM-DD
  lastUpdate?: string;
  events: Array<{
    timestamp: string;
    location: string;
    description: string;
  }>;
}

const TRACKING_API_KEY = process.env.TRACKING_API_KEY ?? '';
const AFTERSHIP_BASE = 'https://api.aftership.com/tracking/2024-07/trackings';

/**
 * Map AfterShip tag → internal status
 * Ref: https://developers.aftership.com/docs/tracking-status-list
 */
function mapAfterShipStatus(tag: string): OrderStatus {
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

export async function lookupTracking(trackingNumber: string): Promise<TrackingResult> {
  if (!TRACKING_API_KEY) {
    return { live: false, trackingNumber, events: [] };
  }

  const res = await fetch(AFTERSHIP_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'as-api-key': TRACKING_API_KEY,
    },
    body: JSON.stringify({ tracking: { tracking_number: trackingNumber } }),
  });

  if (!res.ok) throw new Error(`Tracking API error: ${res.status}`);

  const data = await res.json();
  const t = data.data?.tracking;

  return {
    live: true,
    trackingNumber,
    carrier: t?.slug,
    status: mapAfterShipStatus(t?.tag ?? 'Pending'),
    estimatedDeliveryDate: typeof t?.expected_delivery === 'string' ? t.expected_delivery.slice(0, 10) : undefined,
    lastUpdate: t?.updated_at,
    events: (t?.checkpoints ?? []).map((cp: Record<string, string>) => ({
      timestamp: cp.checkpoint_time,
      location: [cp.city, cp.country_name].filter(Boolean).join(', '),
      description: cp.message,
    })),
  };
}
