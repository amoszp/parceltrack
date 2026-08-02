'use client';
import { Package2, Bell } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';

export function Header({ title }: { title: string }) {
  const issueCount = useOrdersStore(s => s.orders.filter(o => o.status === 'issue').length);

  return (
    <div
      className="flex items-center justify-between px-5 pb-3"
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

      <button
        className="w-8 h-8 rounded-xl flex items-center justify-center relative"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
      >
        <Bell size={14} style={{ color: 'var(--text-secondary)' }} />
        {issueCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: '#EF4444', color: '#fff' }}
          >
            {issueCount}
          </span>
        )}
      </button>
    </div>
  );
}
