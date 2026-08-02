'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Edit3, Check, X } from 'lucide-react';
import { SuggestedOrder } from '@/types';
import { useOrdersStore } from '@/lib/store/orders';
import { PlatformInput } from '@/components/ui/PlatformInput';

interface Props {
  suggestion: SuggestedOrder;
}

export function SuggestionCard({ suggestion }: Props) {
  const { acceptSuggested, dismissSuggested } = useOrdersStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(suggestion.name);
  const [platform, setPlatform] = useState(suggestion.platform);
  const [tracking, setTracking] = useState(suggestion.trackingNumber);

  const handleAccept = () =>
    acceptSuggested(suggestion.id, { name, platform, trackingNumber: tracking });

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(52,71,170,0.07) 0%, rgba(52,71,170,0.03) 100%)',
        border: '1px solid rgba(52,71,170,0.2)',
        boxShadow: '0 0 20px rgba(52,71,170,0.06)',
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-bg)' }}
          >
            <Sparkles size={11} style={{ color: 'var(--brand)' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
            Suggested from {suggestion.source}
          </span>
        </div>

        {editing ? (
          <div className="space-y-2 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Name</p>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Platform</p>
              <PlatformInput value={platform} onChange={setPlatform} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Tracking</p>
              <input style={{ ...inputStyle, fontFamily: 'monospace' }} value={tracking} onChange={e => setTracking(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{name}</p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
              {platform} · {tracking}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{
              background: editing ? 'var(--brand-bg)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${editing ? 'var(--brand-border)' : 'var(--border)'}`,
              color: editing ? 'var(--brand)' : 'var(--text-secondary)',
            }}
          >
            <Edit3 size={10} />
            {editing ? 'Done' : 'Edit'}
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: '#3447AA',
              color: '#fff',
              boxShadow: '0 0 14px rgba(52,71,170,0.25)',
            }}
          >
            <Check size={10} />
            Add to tracking
          </button>
          <button
            onClick={() => dismissSuggested(suggestion.id)}
            className="flex items-center px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: '#EF4444',
            }}
          >
            <X size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
