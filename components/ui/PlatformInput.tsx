'use client';
import { useState, useRef, useEffect, useId } from 'react';
import { Building2, Check, Truck } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';
import { COMMON_CARRIERS } from '@/lib/tracking/carriers';

interface ComboProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  icon?: React.ReactNode;
  id?: string;
}

/** Text input with a filtered suggestion list. Free text is always allowed. */
export function ComboInput({ value, onChange, options, placeholder, icon, id }: ComboProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const q = value.trim().toLowerCase();
  const filtered = (q
    ? options.filter(p => p.toLowerCase().includes(q) && p.toLowerCase() !== q)
    : options
  ).slice(0, 6);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const select = (p: string) => {
    onChange(p);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % filtered.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => (h <= 0 ? filtered.length : h) - 1); }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); select(filtered[highlight]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="field">
        <span style={{ color: 'var(--text-muted)', display: 'flex' }} aria-hidden>{icon}</span>
        <input
          id={id}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && filtered.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-20 py-1"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
        >
          {filtered.map((p, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === highlight}
              key={p}
              onPointerDown={e => e.preventDefault()}
              onClick={() => select(p)}
              className="w-full flex items-center justify-between px-4 min-h-[44px] text-[15px] text-left"
              style={{
                color: 'var(--text-primary)',
                background: i === highlight ? 'var(--brand-bg)' : 'transparent',
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {p}
              {p === value && <Check size={14} style={{ color: 'var(--brand)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlatformInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const { platforms } = useOrdersStore();
  return (
    <ComboInput
      id={id}
      value={value}
      onChange={onChange}
      options={platforms}
      placeholder="Amazon, Zara, AliExpress…"
      icon={<Building2 size={16} />}
    />
  );
}

export function CarrierInput({ value, onChange, suggested = [], id }: {
  value: string; onChange: (v: string) => void; suggested?: string[]; id?: string;
}) {
  const options = [...new Set([...suggested, ...COMMON_CARRIERS])];
  return (
    <ComboInput
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Detected automatically"
      icon={<Truck size={16} />}
    />
  );
}
