'use client';
import { OrderStatus } from '@/types';
import { BRAND } from '@/lib/utils/status';

interface Props {
  progress: number;
  status: OrderStatus;
}

// v2: unified brand-blue progress bar — less rainbow, more hierarchy
export function ProgressBar({ progress, status }: Props) {
  if (status === 'issue') {
    return (
      <div
        className="w-full h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(239,68,68,0.15)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: `repeating-linear-gradient(
              90deg,
              #EF4444 0px,
              #EF4444 5px,
              transparent 5px,
              transparent 9px
            )`,
          }}
        />
      </div>
    );
  }

  const isActive = status === 'in_transit' || status === 'out_for_delivery';
  const color = status === 'delivered' ? '#10B981' : BRAND.primary;
  const glow  = status === 'delivered' ? 'rgba(16,185,129,0.2)' : 'rgba(52,71,170,0.25)';

  return (
    <div
      className="w-full h-0.5 rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full relative overflow-hidden transition-all duration-700"
        style={{
          width: `${progress}%`,
          background: color,
          boxShadow: `0 0 6px ${glow}`,
        }}
      >
        {isActive && <span className="progress-shimmer" />}
      </div>
    </div>
  );
}
