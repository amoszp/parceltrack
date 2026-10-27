'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import type { OrderStatus } from '@/types';
import { STATUS_CONFIG, STATUS_ORDER } from '@/lib/utils/status';
import { STATUS_ICONS } from '@/components/ui/StatusBadge';

interface Props {
  status: OrderStatus;
  onChange: (status: OrderStatus) => void;
  /** Lets the card raise itself above its neighbours while the menu is open. */
  onOpenChange?: (open: boolean) => void;
}

const MENU_HEIGHT = 5 * 44 + 12;

/**
 * The status label on a card, as a button that opens a compact menu of the five
 * statuses. Clicks and keys inside never reach the card (which opens the sheet).
 */
export function StatusPicker({ status, onChange, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [upward, setUpward] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const cfg = STATUS_CONFIG[status];

  const setOpenState = (next: boolean, refocus = false) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next && refocus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    // Open upward when the menu wouldn't fit above the bottom bar.
    const rect = triggerRef.current?.getBoundingClientRect();
    setUpward(!!rect && window.innerHeight - rect.bottom < MENU_HEIGHT + 110);
    setActive(Math.max(0, STATUS_ORDER.indexOf(status)));
    setOpenState(true);
  };

  useLayoutEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  // Close on a tap anywhere else, and on Escape wherever focus is
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenState(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpenState(false, true); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (s: OrderStatus) => {
    setOpenState(false, true);
    if (s !== status) onChange(s);
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    const n = STATUS_ORDER.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + n) % n); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpenState(false, true); }
    else if (e.key === 'Tab') { setOpenState(false); }
  };

  return (
    <div
      ref={wrapRef}
      className="relative flex-shrink-0"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Status: ${cfg.label}. Change status`}
        onClick={() => (open ? setOpenState(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(); }
        }}
        className="status-trigger inline-flex items-center gap-1 -mr-2 pl-2 pr-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
        style={{ color: cfg.color, minHeight: 28 }}
      >
        {cfg.short}
        <ChevronDown
          size={13}
          aria-hidden
          style={{ opacity: 0.75, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease-out' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label="Change status"
            initial={{ opacity: 0, scale: 0.96, y: upward ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onKeyDown={onMenuKey}
            className="absolute right-0 z-30 w-[220px] rounded-2xl p-1.5"
            style={{
              [upward ? 'bottom' : 'top']: 'calc(100% + 6px)',
              transformOrigin: upward ? 'bottom right' : 'top right',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {STATUS_ORDER.map((s, i) => {
              const c = STATUS_CONFIG[s];
              const Icon = STATUS_ICONS[s];
              const current = s === status;
              return (
                <button
                  key={s}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => pick(s)}
                  onMouseEnter={() => setActive(i)}
                  className="status-option w-full flex items-center gap-2.5 px-2.5 min-h-[44px] rounded-xl text-[14px] font-medium text-left"
                  style={{
                    color: current ? c.color : 'var(--text-primary)',
                    background: i === active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
                    aria-hidden
                  >
                    <Icon size={14} />
                  </span>
                  <span className="flex-1">{c.label}</span>
                  {current && <Check size={15} aria-hidden style={{ color: c.color }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
