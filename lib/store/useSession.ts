'use client';
import { useEffect } from 'react';
import { useOrdersStore, type Session } from '@/lib/store/orders';

/**
 * Checks the sign-in and loads the account's orders on mount, and reloads them
 * whenever the app comes back to the foreground (changes from another device).
 */
export function useSession(): Session {
  const session = useOrdersStore((s) => s.session);
  const start = useOrdersStore((s) => s.start);
  const reload = useOrdersStore((s) => s.reload);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (session.phase !== 'ready') return;
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [session.phase, reload]);

  return session;
}
