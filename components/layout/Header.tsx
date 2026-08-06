'use client';
import { Package2 } from 'lucide-react';

export function Header({ title }: { title: string }) {
  return (
    <div
      className="flex items-center px-5 pb-3"
      style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: 'var(--brand-bg)',
            border: '1px solid var(--brand-border)',
          }}
        >
          <Package2 size={15} style={{ color: 'var(--brand)' }} />
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>
    </div>
  );
}
