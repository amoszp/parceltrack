import { NextRequest, NextResponse } from 'next/server';
import { lookupTracking } from '@/lib/tracking/api';
import { normalizeTracking, validateTracking } from '@/lib/utils/validation';

export async function POST(req: NextRequest) {
  try {
    const { trackingNumber, force } = await req.json();

    if (!trackingNumber?.trim()) {
      return NextResponse.json({ error: 'Tracking number required' }, { status: 400 });
    }

    const normalized = normalizeTracking(trackingNumber);
    const validation = validateTracking(normalized);

    // Block invalid numbers unless force flag is set
    if (!validation.valid && !force) {
      return NextResponse.json(
        {
          error: 'invalid_format',
          warning: validation.warning,
          carrier: validation.carrier,
          canForce: validation.canForce,
        },
        { status: 422 }
      );
    }

    const result = await lookupTracking(normalized);
    return NextResponse.json({ ...result, detectedCarrier: validation.carrier ?? result.carrier });
  } catch (err) {
    console.error('[track]', err);
    return NextResponse.json({ error: 'Failed to look up tracking number' }, { status: 500 });
  }
}
