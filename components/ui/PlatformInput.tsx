'use client';
import { useState, useRef, useEffect } from 'react';
import { Building2, Check } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function PlatformInput({ value, onChange, placeholder = 'e.g. Amazon, ZARA, Shopify Store...' }: Props) {
  const { platforms, addPlatform } = useOrdersStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? platforms.filter(p => p.toLowerCase().includes(query.toLowerCase()) && p.toLowerCase() !== query.toLowerCase())
    : platforms.slice(0, 8);

  // Sync value → query when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (p: string) => {
    setQuery(p);
    onChange(p);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleBlur = () => {
    // Small delay so click on suggestion registers first
    setTimeout(() => setOpen(false), 150);
    // Save new custom platform
    if (query.trim() && !platforms.includes(query.trim())) {
      addPlatform(query.trim());
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(52,71,170,0.4)' : 'var(--border)'}`,
          boxShadow: open ? '0 0 0 1px rgba(52,71,170,0.2)' : undefined,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <Building2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)', minWidth: 0 }}
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{
            background: '#1C1C1F',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {filtered.map(p => (
            <button
              key={p}
              onMouseDown={() => select(p)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,71,170,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {p}
              {p === value && <Check size={12} style={{ color: '#3447AA' }} />}
            </button>
          ))}
          {query.trim() && !platforms.includes(query.trim()) && (
            <button
              onMouseDown={() => select(query.trim())}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left border-t"
              style={{ borderColor: 'var(--border)', color: '#3447AA' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,71,170,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '11px', opacity: 0.7 }}>Add</span>
              <span className="font-semibold">"{query.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
