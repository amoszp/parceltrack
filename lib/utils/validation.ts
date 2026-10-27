import type { ValidationResult } from '@/types';

// ─── Normalize ─────────────────────────────────────────────────────────────
/** Uppercase and drop everything that isn't a letter or digit (spaces, dashes, dots, invisibles). */
export function normalizeTracking(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// ─── Check digits ──────────────────────────────────────────────────────────

/** UPU S10 (international post, e.g. RR123456785ES): weighted mod-11 over the 8 serial digits. */
export function verifyS10(code: string): boolean {
  if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) return false;
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(code[2 + i]), 0);
  const r = 11 - (sum % 11);
  const expected = r === 10 ? 0 : r === 11 ? 5 : r;
  return expected === Number(code[10]);
}

/** UPS 1Z: letters map to (charCode - 63) % 10, even positions doubled, mod-10. */
export function verifyUps(code: string): boolean {
  if (!/^1Z[0-9A-Z]{16}$/.test(code)) return false;
  const body = code.slice(2, 17);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    const v = /\d/.test(c) ? Number(c) : (c.charCodeAt(0) - 63) % 10;
    sum += i % 2 === 1 ? v * 2 : v;
  }
  return (10 - (sum % 10)) % 10 === Number(code[17]);
}

/** GS1 mod-10 (USPS IMpb, SSCC): weight 3 on the rightmost data digit, alternating with 1. */
export function verifyGs1(code: string): boolean {
  if (!/^\d{2,}$/.test(code)) return false;
  const data = code.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const fromRight = data.length - 1 - i;
    sum += Number(data[i]) * (fromRight % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

// ─── Carrier rules ─────────────────────────────────────────────────────────

/** Postal operator by the S10 country suffix. */
const S10_COUNTRY: Record<string, string> = {
  ES: 'Correos', US: 'USPS', GB: 'Royal Mail', DE: 'Deutsche Post', FR: 'La Poste',
  IT: 'Poste Italiane', PT: 'CTT', NL: 'PostNL', BE: 'bpost', CN: 'China Post',
  HK: 'Hongkong Post', SG: 'Singapore Post', JP: 'Japan Post', KR: 'Korea Post',
  CA: 'Canada Post', AU: 'Australia Post', CH: 'Swiss Post', SE: 'PostNord', DK: 'PostNord',
};

interface Rule {
  carrier: string;
  pattern: RegExp;
  check?: (code: string) => boolean;
}

/** Formats specific enough to name the carrier. Order matters: first match wins. */
const RULES: Rule[] = [
  { carrier: 'UPS', pattern: /^1Z[0-9A-Z]{16}$/, check: verifyUps },
  { carrier: 'USPS', pattern: /^9[1-5]\d{18,20}$/, check: verifyGs1 },
  { carrier: 'Amazon Logistics', pattern: /^TBA\d{12}$/ },
  { carrier: 'Cainiao', pattern: /^LP\d{14}$/ },
  { carrier: 'YunExpress', pattern: /^YT\d{16}$/ },
  { carrier: 'DHL Parcel', pattern: /^JJD\d{18,20}$/ },
  { carrier: 'Correos', pattern: /^P[QKHS][0-9A-Z]{18,21}$/ },
];

/** Digits-only lengths shared by several carriers: we can only guess. */
const DIGIT_LENGTHS: Record<number, string[]> = {
  10: ['DHL Express'],
  11: ['GLS'],
  12: ['FedEx'],
  14: ['SEUR', 'MRW'],
  15: ['FedEx'],
  20: ['FedEx'],
  22: ['FedEx'],
};

// ─── Validate ──────────────────────────────────────────────────────────────
export function validateTracking(raw: string): ValidationResult {
  let code = normalizeTracking(raw);

  if (!code) {
    return { valid: false, normalized: code, confidence: 'unknown', warning: 'Enter a tracking number.', canForce: false };
  }
  if (code.length < 6 || code.length > 40) {
    return {
      valid: false, normalized: code, confidence: 'unknown',
      warning: 'Tracking numbers are usually 8–35 characters.', canForce: true,
    };
  }

  // USPS labels often carry a "420 + ZIP" routing prefix before the real number.
  const zip = /^420(?:\d{5}|\d{9})(9[1-5]\d{18,20})$/.exec(code);
  if (zip) code = zip[1];

  // International post (UPU S10)
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
    const country = code.slice(-2);
    const carrier = S10_COUNTRY[country] ?? `Postal service (${country})`;
    return verifyS10(code)
      ? { valid: true, normalized: code, confidence: 'verified', carrier, canForce: false }
      : {
          valid: false, normalized: code, confidence: 'invalid', carrier, canForce: true,
          warning: "The check digit doesn't match. One character is probably mistyped.",
        };
  }

  for (const rule of RULES) {
    if (!rule.pattern.test(code)) continue;
    if (!rule.check) return { valid: true, normalized: code, confidence: 'likely', carrier: rule.carrier, canForce: false };
    return rule.check(code)
      ? { valid: true, normalized: code, confidence: 'verified', carrier: rule.carrier, canForce: false }
      : {
          valid: false, normalized: code, confidence: 'invalid', carrier: rule.carrier, canForce: true,
          warning: "The check digit doesn't match. One character is probably mistyped.",
        };
  }

  if (/^\d+$/.test(code) && DIGIT_LENGTHS[code.length]) {
    const candidates = DIGIT_LENGTHS[code.length];
    return { valid: true, normalized: code, confidence: 'likely', carrier: candidates[0], candidates, canForce: false };
  }

  return {
    valid: true, normalized: code, confidence: 'unknown', canForce: true,
    warning: 'Format not recognised. It may be a regional carrier; set the carrier yourself.',
  };
}

// ─── Input parsing (URLs, pasted messages) ─────────────────────────────────

const URL_PARAMS = [
  'tracknum', 'trknbr', 'tracknumbers', 'trackingnumber', 'tracking-number', 'tracking_number',
  'tracking-id', 'inquirynumber1', 'tlabels', 'tracking', 'track', 'number', 'match', 'nums', 'id',
];

/** Pull a tracking number out of a carrier URL. */
export function extractFromUrl(input: string): { trackingNumber: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const params = new Map<string, string>();
  url.searchParams.forEach((v, k) => params.set(k.toLowerCase(), v));
  // 17TRACK and similar keep the number in the hash: #nums=XXXX
  new URLSearchParams(url.hash.replace(/^#/, '')).forEach((v, k) => params.set(k.toLowerCase(), v));
  for (const key of URL_PARAMS) {
    const v = params.get(key);
    if (v) return { trackingNumber: v.split(',')[0] };
  }
  // Fallback: last path segment that looks like a code (e.g. /track/RR123456785ES)
  const seg = url.pathname.split('/').filter(Boolean).pop();
  if (seg && normalizeTracking(seg).length >= 8 && /\d/.test(seg)) return { trackingNumber: seg };
  return null;
}

const RANK = { verified: 0, likely: 1, invalid: 2, unknown: 3 } as const;

/**
 * Turn whatever the user pasted (a number, a carrier link, or a whole
 * "your order has shipped" message) into the best tracking-number candidate.
 */
export function parseTrackingInput(input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  const fromUrl = extractFromUrl(raw);
  if (fromUrl) return normalizeTracking(fromUrl.trackingNumber);

  // A single token (spaces inside a number are fine): use it as-is.
  const words = raw.split(/\s+/);
  const looksLikeText = words.length > 1 && words.some(w => /[a-z]{3,}/.test(w));
  if (!looksLikeText) return normalizeTracking(raw);

  // Free text: score each token and keep the most convincing one.
  let best: { code: string; rank: number } | null = null;
  for (const token of raw.split(/[\s,;()<>"']+/)) {
    const maybeUrl = extractFromUrl(token);
    const code = normalizeTracking(maybeUrl ? maybeUrl.trackingNumber : token);
    if (code.length < 8 || !/\d/.test(code)) continue;
    const rank = RANK[validateTracking(code).confidence];
    if (!best || rank < best.rank) best = { code, rank };
  }
  return best?.code ?? normalizeTracking(raw);
}
