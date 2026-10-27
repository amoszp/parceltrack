'use client';
import { useEffect, useState } from 'react';
import { useOrdersStore } from '@/lib/store/orders';

/** Loads saved orders from localStorage after mount and reports when they're ready. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useOrdersStore.persist.onFinishHydration(() => setHydrated(true));
    useOrdersStore.persist.rehydrate();
    if (useOrdersStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
