'use client';
import { motion } from 'framer-motion';
import { Package, Plus, Archive } from 'lucide-react';
import { ActiveTab } from '@/types';

interface Props {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  historyCount: number;
}

export function BottomNav({ active, onChange, historyCount }: Props) {
  const tab = (id: ActiveTab, label: string, Icon: typeof Package, badge?: number) => {
    const isActive = active === id;
    return (
      <button
        type="button"
        onClick={() => onChange(id)}
        aria-current={isActive ? 'page' : undefined}
        className="relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] rounded-2xl"
        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 150ms' }}
      >
        {isActive && (
          <motion.span
            layoutId="nav-indicator"
            className="absolute inset-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
        <span className="relative">
          <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
          {!!badge && (
            <span
              className="absolute -top-1.5 -right-3 text-[10px] font-bold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center tabular"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="relative text-[11px] font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 px-4 pt-6"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, var(--bg-base) 55%, transparent)',
      }}
      aria-label="Main"
    >
      <div
        className="flex items-center gap-1 max-w-sm mx-auto rounded-[22px] p-1.5"
        style={{
          background: 'rgba(18,21,28,0.88)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        {tab('list', 'Tracking', Package)}
        <button
          type="button"
          onClick={() => onChange('add')}
          aria-label="Track a package"
          className="btn btn-primary flex-shrink-0 rounded-2xl"
          style={{ width: 56, height: 52, padding: 0, boxShadow: '0 6px 20px rgba(47,111,228,0.45)' }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
        {tab('history', 'History', Archive, historyCount)}
      </div>
    </nav>
  );
}
