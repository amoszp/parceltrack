'use client';
import { CheckCircle2, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import type { ValidationResult } from '@/types';

/** One-line read-out of what the detector thinks of a tracking number. */
export function TrackingHint({ result }: { result: ValidationResult | null }) {
  if (!result || !result.normalized) return null;

  const { confidence, carrier, candidates, warning } = result;
  let Icon = Info;
  let color = 'var(--text-muted)';
  let text = '';

  if (confidence === 'verified') {
    Icon = CheckCircle2; color = 'var(--color-success)';
    text = `${carrier} · check digit OK`;
  } else if (confidence === 'likely') {
    Icon = Info; color = 'var(--text-secondary)';
    text = candidates && candidates.length > 1
      ? `Could be ${candidates.join(' or ')}. Pick the carrier below.`
      : `Looks like ${carrier}`;
  } else if (confidence === 'invalid') {
    Icon = AlertTriangle; color = 'var(--color-warning)';
    text = `${carrier ? `${carrier} format, but the` : 'The'} check digit doesn't match. Probably a typo.`;
  } else {
    Icon = HelpCircle; color = 'var(--text-muted)';
    text = warning ?? 'Format not recognised.';
  }

  return (
    <p className="flex items-start gap-1.5 text-[13px] mt-2 leading-snug" style={{ color }} role="status">
      <Icon size={14} className="mt-[2px] flex-shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
