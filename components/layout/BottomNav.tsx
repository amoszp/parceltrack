'use client';
import { motion } from 'framer-motion';
import { List, Plus, Archive } from 'lucide-react';
import { ActiveTab } from '@/types';

interface Props {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

const TABS = [
  { id: 'list' as ActiveTab,    icon: List,    label: 'Tracking' },
  { id: 'add' as ActiveTab,     icon: Plus,    label: 'Add',     isCenter: true },
  { id: 'history' as ActiveTab, icon: Archive, label: 'History' },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <div
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 px-6 pt-3 pb-2"
      style={{
        background: 'linear-gradient(to top, rgba(13,13,14,0.98) 60%, transparent)',
      }}
    >
      <div
        className="flex items-center justify-around max-w-sm mx-auto rounded-2xl px-4 py-1"
        style={{
          background: 'rgba(22,22,24,0.92)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {TABS.map(({ id, icon: Icon, label, isCenter }) => {
          const isActive = active === id;

          if (isCenter) {
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className="relative -mt-6 mb-1 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 shadow-lg"
                style={{
                  background: '#3447AA',
                  boxShadow: '0 0 22px rgba(52,71,170,0.45), 0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                <Icon size={22} color="#fff" strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 relative"
              style={{ color: isActive ? '#3447AA' : 'var(--text-muted)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(52,71,170,0.1)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
