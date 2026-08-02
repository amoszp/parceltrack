import { OrderStatus } from '@/types';

// ─── Brand Palette (v2) ────────────────────────────────────────────────────
export const BRAND = {
  primary:   '#3447AA',   // Royal Blue
  primaryBg: 'rgba(52,71,170,0.12)',
  primaryBorder: 'rgba(52,71,170,0.3)',
  tint:      '#FBEAEB',   // Soft Warm Tint
  base:      '#0D0D0E',
};

// Status config — colours kept for semantic clarity, but progress bars are unified
export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string; glow: string; icon: string }
> = {
  processed: {
    label: 'Processing',
    color: '#3447AA',
    bg: 'rgba(52,71,170,0.1)',
    border: 'rgba(52,71,170,0.25)',
    glow: 'rgba(52,71,170,0.15)',
    icon: 'package',
  },
  in_transit: {
    label: 'In Transit',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.25)',
    glow: 'rgba(251,191,36,0.15)',
    icon: 'truck',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.25)',
    glow: 'rgba(249,115,22,0.25)',
    icon: 'map-pin',
  },
  delivered: {
    label: 'Delivered',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.25)',
    glow: 'rgba(16,185,129,0.15)',
    icon: 'check-circle',
  },
  issue: {
    label: 'Issue',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.25)',
    glow: 'rgba(239,68,68,0.2)',
    icon: 'alert-triangle',
  },
};

export const STATUS_PROGRESS: Record<OrderStatus, number> = {
  processed: 10,
  in_transit: 50,
  out_for_delivery: 85,
  delivered: 100,
  issue: 0,
};

export const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
