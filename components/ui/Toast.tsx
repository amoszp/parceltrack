'use client';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOrdersStore } from '@/lib/store/orders';

/** Bottom toast with an optional Undo, auto-dismissed after 5 s. */
export function Toast() {
  const { toast, dismissToast } = useOrdersStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 5000);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <div
      className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(max(12px, env(safe-area-inset-bottom)) + 84px)' }}
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-center gap-3 pl-4 pr-1.5 min-h-[48px] rounded-2xl max-w-sm w-full"
            style={{ background: '#E9EDF4', color: '#0B0D12', boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
            role="status"
          >
            <p className="flex-1 text-sm font-medium truncate">{toast.message}</p>
            {toast.undo && (
              <button
                type="button"
                onClick={() => { toast.undo?.(); dismissToast(); }}
                className="px-3 min-h-[38px] rounded-xl text-sm font-bold"
                style={{ color: '#1D4FB8' }}
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
