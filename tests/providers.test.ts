import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapSeventeenTrack, mapSeventeenStatus, mapAfterShip, mapAfterShipStatus, lookupTracking,
} from '../lib/tracking/api.ts';

// Shaped after the field paths in 17TRACK's v2.4 docs (data.accepted[].track_info).
const SEVENTEEN_ITEM = {
  number: 'RR123456785ES',
  carrier: 19181,
  track_info: {
    latest_status: { status: 'InTransit', sub_status: 'InTransit_Other' },
    latest_event: {
      time_iso: '2026-10-26T18:20:00+01:00',
      time_utc: '2026-10-26T17:20:00Z',
      description: 'En tránsito',
      location: 'Madrid',
    },
    time_metrics: { estimated_delivery_date: { source: '17TRACK', from: '2026-10-28T00:00:00+01:00', to: '2026-10-29T00:00:00+01:00' } },
    tracking: {
      providers: [{
        provider: { key: 19181, name: 'Correos Spain' },
        events: [
          { time_iso: '2026-10-26T18:20:00+01:00', time_utc: '2026-10-26T17:20:00Z', description: 'En tránsito', location: 'Madrid', stage: 'InTransit' },
          { time_iso: '2026-10-25T09:00:00+01:00', time_utc: '2026-10-25T08:00:00Z', description: 'Admitido', location: null, stage: 'InfoReceived' },
        ],
      }],
    },
  },
};

test('17TRACK statuses map onto the app lifecycle', () => {
  assert.equal(mapSeventeenStatus('NotFound'), 'processed');
  assert.equal(mapSeventeenStatus('InfoReceived'), 'processed');
  assert.equal(mapSeventeenStatus('AvailableForPickup'), 'in_transit');
  assert.equal(mapSeventeenStatus('OutForDelivery'), 'out_for_delivery');
  assert.equal(mapSeventeenStatus('Delivered'), 'delivered');
  assert.equal(mapSeventeenStatus('DeliveryFailure'), 'issue');
  assert.equal(mapSeventeenStatus('Expired'), 'issue');
});

test('17TRACK track_info → TrackingResult', () => {
  const r = mapSeventeenTrack('RR123456785ES', SEVENTEEN_ITEM);
  assert.equal(r.live, true);
  assert.equal(r.carrier, 'Correos Spain');
  assert.equal(r.status, 'in_transit');
  assert.equal(r.estimatedDeliveryDate, '2026-10-29');
  assert.equal(r.lastUpdate, '2026-10-26T18:20:00+01:00');
  assert.equal(r.events.length, 2);
  assert.deepEqual(r.events[1], { timestamp: '2026-10-25T09:00:00+01:00', location: '', description: 'Admitido' });
});

test('17TRACK with no events or ETA still maps', () => {
  const r = mapSeventeenTrack('X', { track_info: { latest_status: { status: 'NotFound' } } });
  assert.equal(r.status, 'processed');
  assert.equal(r.estimatedDeliveryDate, undefined);
  assert.deepEqual(r.events, []);
});

test('AfterShip mapping is unchanged', () => {
  assert.equal(mapAfterShipStatus('AttemptFail'), 'in_transit');
  const r = mapAfterShip('1Z999AA10123456784', {
    data: { tracking: { slug: 'ups', tag: 'OutForDelivery', expected_delivery: '2026-10-28T12:00:00', updated_at: '2026-10-27T08:00:00Z',
      checkpoints: [{ checkpoint_time: '2026-10-27T08:00:00Z', city: 'Madrid', country_name: 'Spain', message: 'Out for delivery' }] } },
  });
  assert.equal(r.status, 'out_for_delivery');
  assert.equal(r.estimatedDeliveryDate, '2026-10-28');
  assert.equal(r.events[0].location, 'Madrid, Spain');
});

test('no key → live false, no network call', async () => {
  const saved = process.env.TRACKING_API_KEY;
  delete process.env.TRACKING_API_KEY;
  try {
    const r = await lookupTracking('RR123456785ES');
    assert.equal(r.live, false);
  } finally {
    if (saved !== undefined) process.env.TRACKING_API_KEY = saved;
  }
});

test('17TRACK lookup registers then reads (mocked fetch)', async () => {
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  process.env.TRACKING_PROVIDER = '17track';
  process.env.TRACKING_API_KEY = 'test-key';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push(`${String(url).split('/').pop()} ${(init.headers as Record<string, string>)['17token']}`);
    const body = String(url).endsWith('/register')
      ? { code: 0, data: { accepted: [], rejected: [{ number: 'RR123456785ES', error: { code: -18019901 } }] } }
      : { code: 0, data: { accepted: [SEVENTEEN_ITEM], rejected: [] } };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  try {
    const r = await lookupTracking('RR123456785ES');
    assert.deepEqual(calls, ['register test-key', 'gettrackinfo test-key']);
    assert.equal(r.status, 'in_transit');
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.TRACKING_PROVIDER;
    delete process.env.TRACKING_API_KEY;
  }
});
