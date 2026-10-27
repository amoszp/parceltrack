import { NextRequest, NextResponse } from 'next/server';
import { lookupTracking } from '@/lib/tracking/api';
import { validateTracking } from '@/lib/utils/validation';

export async function POST(req: NextRequest) {
  try {
    const { trackingNumber, force } = await req.json();

    if (typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
      return NextResponse.json({ error: 'Tracking number required' }, { status: 400 });
    }

    const validation = validateTracking(trackingNumber);

    // Block mistyped numbers unless the user chose "Add anyway"
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

    const result = await lookupTracking(validation.normalized);
    return NextResponse.json({ ...result, detectedCarrier: validation.carrier ?? result.carrier });
  } catch (err) {
    console.error('[track]', err);
    return NextResponse.json({ error: 'Failed to look up tracking number' }, { status: 500 });
  }
}
