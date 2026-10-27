'use client';
import { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  /** Called for backdrop taps, the close button and Escape. */
  onRequestClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Pinned under the scrollable body (primary actions). */
  footer?: React.ReactNode;
  /** Pinned above the body, under the title (banners). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}

/** Bottom sheet used for every dialog in the app. */
export function Sheet({ open, onRequestClose, title, subtitle, footer, banner, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onRequestClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onRequestClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="absolute inset-0"
            style={{ background: 'rgba(3,5,10,0.66)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={onRequestClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', transition: { duration: 0.18, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="relative w-full max-w-lg flex flex-col rounded-t-[28px]"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              boxShadow: 'var(--shadow-sheet)',
              maxHeight: 'calc(100dvh - max(24px, env(safe-area-inset-top)))',
            }}
          >
            <div className="flex-shrink-0 pt-2.5 flex justify-center" aria-hidden>
              <div className="w-9 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            <div className="flex-shrink-0 flex items-start justify-between gap-3 pl-6 pr-3 pt-3 pb-3">
              <div className="min-w-0 pt-1.5">
                <h2 id={titleId} className="font-semibold text-[17px] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h2>
                {subtitle && <div className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
              </div>
              <button type="button" onClick={onRequestClose} className="icon-btn flex-shrink-0" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {banner}

            <div className="flex-1 overflow-y-auto px-6 pb-4 no-scrollbar">{children}</div>

            {footer && (
              <div
                className="flex-shrink-0 px-6 pt-3"
                style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border-subtle)' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
