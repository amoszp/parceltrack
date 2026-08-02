'use client';
import { useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';

interface Props {
  onAdd: () => void;
}

export function SearchBar({ onAdd }: Props) {
  const { searchQuery, setSearchQuery } = useOrdersStore();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl input-glow transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search orders or paste tracking code..."
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: 'var(--text-primary)', minWidth: 0 }}
      />
      <span className="text-xs px-1.5 py-0.5 rounded-md font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', flexShrink: 0 }}>
        ⌘K
      </span>
      {searchQuery ? (
        <button onClick={() => setSearchQuery('')} className="flex-shrink-0">
          <X size={13} style={{ color: 'var(--text-muted)' }} />
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95 flex-shrink-0"
          style={{
            background: 'var(--brand-bg)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand)',
          }}
        >
          <Plus size={11} />
          Add
        </button>
      )}
    </div>
  );
}
