import { ValidationResult } from '@/types';

// ─── Step A: Normalize ─────────────────────────────────────────────────────
export function normalizeTracking(raw: string): string {
  return raw
    .trim()
    .replace(/[\s\-\u00AD\u200B\u200C\u200D\uFEFF]/g, '') // whitespace, hyphens, invisible chars
    .toUpperCase();
}

// ─── Step B: Carrier Regex Patterns ───────────────────────────────────────
interface CarrierPattern {
  name: string;
  patterns: RegExp[];
}

const CARRIER_PATTERNS: CarrierPattern[] = [
  {
    name: 'UPS',
    patterns: [
      /^1Z[0-9A-Z]{16}$/,          // 1Z + 16 alphanumeric = 18 chars
      /^[0-9]{9}$/,                 // 9-digit
      /^[0-9]{12}$/,                // 12-digit
    ],
  },
  {
    name: 'FedEx',
    patterns: [
      /^[0-9]{12}$/,
      /^[0-9]{15}$/,
      /^[0-9]{20}$/,
    ],
  },
  {
    name: 'USPS',
    patterns: [
      /^(9400|9205|9261|9274|9300|9400|9410|9505)[0-9]{16,18}$/,  // GS1 USPS
      /^[0-9]{20,22}$/,
      /^[A-Z]{2}[0-9]{9}US$/,       // UPU S10 US origin
    ],
  },
  {
    name: 'DHL Express',
    patterns: [
      /^[0-9]{10}$/,
      /^[0-9]{11}$/,
    ],
  },
  {
    name: 'Amazon Logistics',
    patterns: [
      /^TBA[0-9]{12}$/,
    ],
  },
  {
    name: 'UPU S10 (International)',
    patterns: [
      /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/,   // e.g. RR123456789ES
    ],
  },
  {
    name: 'GLS',
    patterns: [/^[0-9]{8,11}$/],
  },
];

// ─── Step C: Check Digit Verification ─────────────────────────────────────

/** UPU S10 check digit (ITU-T X.121 / ISO 8166-2) */
function verifyUPUS10(code: string): boolean {
  if (!/^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(code)) return false;
  const digits = code.slice(2, 10).split('').map(Number); // 8 serial digits
  const checkDigit = parseInt(code[10], 10);
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const remainder = sum % 11;
  const expected =
    remainder === 0 ? 5 :
    remainder === 1 ? 0 :
    11 - remainder;
  return expected === checkDigit;
}

/** GS1 SSCC-18 / USPS IMpb Modulo-10 check digit */
function verifyMod10(code: string): boolean {
  if (!/^[0-9]{18}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reduce((acc, d, i) => {
    const multiplied = d * (i % 2 === 0 ? 3 : 1);
    return acc + multiplied;
  }, 0);
  return (10 - (sum % 10)) % 10 === check;
}

// ─── Main Validate Function ────────────────────────────────────────────────
export function validateTracking(raw: string): ValidationResult {
  const normalized = normalizeTracking(raw);

  if (!normalized) {
    return { valid: false, warning: 'Tracking number cannot be empty.', canForce: false };
  }

  // Check against all carrier patterns
  for (const carrier of CARRIER_PATTERNS) {
    for (const pattern of carrier.patterns) {
      if (pattern.test(normalized)) {
        // For UPU S10, run check digit
        if (carrier.name === 'UPU S10 (International)') {
          if (!verifyUPUS10(normalized)) {
            return {
              valid: false,
              carrier: carrier.name,
              warning: 'UPU S10 check digit failed — this number may be mistyped.',
              canForce: true,
            };
          }
        }
        // For 18-digit SSCC, run mod-10
        if (/^[0-9]{18}$/.test(normalized)) {
          if (!verifyMod10(normalized)) {
            return {
              valid: false,
              carrier: 'GS1 / USPS',
              warning: 'Check digit verification failed — double-check the number.',
              canForce: true,
            };
          }
        }
        return { valid: true, carrier: carrier.name, canForce: false };
      }
    }
  }

  // No pattern matched → unknown but forceable
  return {
    valid: false,
    warning: 'Unrecognized tracking code format. This may be a regional carrier.',
    canForce: true,
  };
}

/** Extract carrier from a URL paste (e.g. fedex.com/track?...) */
export function extractFromUrl(input: string): { trackingNumber: string; carrier?: string } | null {
  try {
    const url = new URL(input);
    // FedEx
    let tn = url.searchParams.get('trackingnumber') || url.searchParams.get('trknbr') || url.searchParams.get('tracknumbers');
    if (tn) return { trackingNumber: tn, carrier: 'FedEx' };
    // UPS
    tn = url.searchParams.get('tracknum') || url.searchParams.get('InquiryNumber1');
    if (tn) return { trackingNumber: tn, carrier: 'UPS' };
    // USPS
    tn = url.searchParams.get('tLabels');
    if (tn) return { trackingNumber: tn, carrier: 'USPS' };
    // Generic
    tn = url.searchParams.get('tracking') || url.searchParams.get('track') || url.searchParams.get('number');
    if (tn) return { trackingNumber: tn };
    return null;
  } catch {
    return null;
  }
}
