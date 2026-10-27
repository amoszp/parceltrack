'use client';
import { StatusFilter } from '@/types';
import { STATUS_CONFIG, BRAND } from '@/lib/utils/status';
import { useOrdersStore } from '@/lib/store/orders';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',              label: 'All' },
  { value: 'today',            label: 'Arriving today' },
  { value: 'issue',            label: 'Issues' },
  { value: 'in_transit',       label: 'In transit' },
  { value: 'processed',        label: 'Processing' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
];

function tone(f: StatusFilter) {
  if (f === 'all') return { color: BRAND.primary, bg: BRAND.primaryBg, border: BRAND.primaryBorder };
  if (f === 'today') return { color: BRAND.accent, bg: 'rgba(242,162,60,0.12)', border: 'rgba(242,162,60,0.3)' };
  return STATUS_CONFIG[f];
}

/** One row of filters for the active list; counts come from the page so they match what's shown. */
export function FilterTabs({ counts }: { counts: Record<StatusFilter, number> }) {
  const { statusFilter, setStatusFilter } = useOrdersStore();

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist" aria-label="Filter orders">
      {FILTERS.map(f => {
        const active = statusFilter === f.value;
        const count = counts[f.value];
        // Hide empty optional filters unless selected, so the row stays short
        if (!active && count === 0 && f.value !== 'all') return null;
        const t = tone(f.value);
        return (
          <button
            type="button"
            role="tab"
            aria-selected={active}
            key={f.value}
            onClick={() => setStatusFilter(active && f.value !== 'all' ? 'all' : f.value)}
            className="flex items-center gap-2 pl-3.5 pr-2.5 min-h-[36px] rounded-full text-[13px] font-semibold whitespace-nowrap flex-shrink-0"
            style={{
              background: active ? t.bg : 'var(--bg-card)',
              border: `1px solid ${active ? t.border : 'var(--border)'}`,
              color: active ? t.color : 'var(--text-secondary)',
              transition: 'background-color 150ms, border-color 150ms, color 150ms',
            }}
          >
            {f.label}
            <span
              className="text-[11px] min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center tabular"
              style={{ background: active ? t.color : 'rgba(255,255,255,0.07)', color: active ? '#0B0D12' : 'var(--text-muted)' }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
