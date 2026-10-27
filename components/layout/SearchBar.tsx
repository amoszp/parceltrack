'use client';
import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';

export function SearchBar({ placeholder }: { placeholder: string }) {
  const { searchQuery, setSearchQuery } = useOrdersStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/⌘ + K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="field" style={{ background: 'var(--bg-card)' }} role="search">
      <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        name="search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); inputRef.current?.blur(); } }}
        placeholder={placeholder}
        aria-label="Search orders"
        enterKeyHint="search"
        className="[&::-webkit-search-cancel-button]:hidden"
      />
      {searchQuery ? (
        <button type="button" onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }} className="icon-btn -mr-3" aria-label="Clear search">
          <X size={16} />
        </button>
      ) : (
        <kbd className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-md mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
          Ctrl K
        </kbd>
      )}
    </div>
  );
}
