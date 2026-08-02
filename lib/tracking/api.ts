/**
 * Unified Tracking API Layer
 * 
 * Replace TRACKING_API_KEY with your chosen provider's key.
 * Recommended providers (in order of recommendation):
 *   1. AfterShip  — https://www.aftership.com/docs/tracking/3.x/quickstart
 *   2. 17TRACK    — https://api.17track.net/en/doc
 *   3. TrackingMore — https://www.trackingmore.com/api-index.html
 * 
 * All three auto-detect carrier from the tracking number.
 */

export interface TrackingResult {
  trackingNumber: string;
  carrier: string;
  status: 'processed' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'issue';
  estimatedDelivery?: string;
  lastUpdate: string;
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
function mapAfterShipStatus(tag: string): TrackingResult['status'] {
  switch (tag) {
    case 'InfoReceived':
    case 'Pending':       return 'processed';
    case 'InTransit':
    case 'AttemptFail':   return 'in_transit';
    case 'OutForDelivery':return 'out_for_delivery';
    case 'Delivered':     return 'delivered';
    case 'Exception':
    case 'Expired':       return 'issue';
    default:              return 'processed';
  }
}

export async function lookupTracking(trackingNumber: string): Promise<TrackingResult> {
  if (!TRACKING_API_KEY) {
    // Return a stub for development without a real API key
    return {
      trackingNumber,
      carrier: 'Auto-detected',
      status: 'processed',
      estimatedDelivery: 'Calculating...',
      lastUpdate: new Date().toISOString(),
      events: [],
    };
  }

  const res = await fetch(`${AFTERSHIP_BASE}`, {
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
    trackingNumber,
    carrier: t?.slug ?? 'Unknown',
    status: mapAfterShipStatus(t?.tag ?? 'Pending'),
    estimatedDelivery: t?.expected_delivery
      ? new Date(t.expected_delivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : undefined,
    lastUpdate: t?.updated_at ?? new Date().toISOString(),
    events: (t?.checkpoints ?? []).map((cp: Record<string, string>) => ({
      timestamp: cp.checkpoint_time,
      location: [cp.city, cp.country_name].filter(Boolean).join(', '),
      description: cp.message,
    })),
  };
}
