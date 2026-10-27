'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Pencil, Plus, X } from 'lucide-react';
import { SuggestedOrder } from '@/types';
import { useOrdersStore } from '@/lib/store/orders';
import { PlatformInput } from '@/components/ui/PlatformInput';

interface Props {
  suggestion: SuggestedOrder;
}

/** An order found elsewhere (email, SMS, webhook) waiting for a one-tap confirm. */
export function SuggestionCard({ suggestion }: Props) {
  const { acceptSuggested, dismissSuggested, findByTracking } = useOrdersStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(suggestion.name);
  const [platform, setPlatform] = useState(suggestion.platform);
  const [tracking, setTracking] = useState(suggestion.trackingNumber);
  const duplicate = findByTracking(tracking);

  return (
    <motion.li
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      className="list-none card p-4"
      style={{ borderColor: 'var(--brand-border)', background: 'linear-gradient(180deg, rgba(47,111,228,0.08), var(--bg-card) 70%)' }}
    >
      <p className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--brand)' }}>
        <Sparkles size={13} aria-hidden /> Found in your {suggestion.source}
      </p>

      {editing ? (
        <div className="space-y-3 mt-3">
          <div className="field"><input aria-label="Name" value={name} onChange={e => setName(e.target.value)} /></div>
          <PlatformInput value={platform} onChange={setPlatform} />
          <div className="field"><input aria-label="Tracking number" className="mono" value={tracking} onChange={e => setTracking(e.target.value)} /></div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {platform} · <span className="mono">{tracking}</span>
          </p>
        </div>
      )}
      {duplicate && (
        <p className="text-[13px] mt-2" style={{ color: 'var(--color-warning)' }}>Already tracking this as “{duplicate.name}”.</p>
      )}

      <div className="flex gap-2 mt-3">
        <button type="button" onClick={() => setEditing(!editing)} className="btn btn-ghost" aria-pressed={editing}>
          <Pencil size={14} /> {editing ? 'Done' : 'Edit'}
        </button>
        <button
          type="button"
          disabled={!!duplicate}
          onClick={() => acceptSuggested(suggestion.id, { name, platform, trackingNumber: tracking })}
          className="btn btn-primary flex-1"
        >
          <Plus size={15} /> Track it
        </button>
        <button type="button" onClick={() => dismissSuggested(suggestion.id)} className="btn btn-ghost" aria-label="Dismiss suggestion" style={{ padding: 0, width: 44 }}>
          <X size={16} />
        </button>
      </div>
    </motion.li>
  );
}
