'use client';
import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, SearchX } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';
import { useSession } from '@/lib/store/useSession';
import { Login, Offline } from '@/components/auth/Login';
import { AccountSheet } from '@/components/auth/AccountSheet';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/layout/SearchBar';
import { FilterTabs } from '@/components/layout/FilterTabs';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddOrderModal } from '@/components/layout/AddOrderModal';
import { OrderCard } from '@/components/orders/OrderCard';
import { SuggestionCard } from '@/components/orders/SuggestionCard';
import { EditOrderModal } from '@/components/orders/EditOrderModal';
import { Toast } from '@/components/ui/Toast';
import { ActiveTab, Order, StatusFilter } from '@/types';
import { isDueToday, daysFromToday } from '@/lib/utils/dates';
import { normalizeTracking, parseTrackingInput, validateTracking } from '@/lib/utils/validation';

const isHistory = (o: Order) => !!o.isArchived || o.status === 'delivered';

/** Active list order: what needs attention first, then by ETA, then newest. */
function activeRank(o: Order): number {
  if (o.status === 'out_for_delivery') return 0;
  if (o.status === 'issue') return 1;
  if (isDueToday(o)) return 2;
  return 3;
}
function compareActive(a: Order, b: Order): number {
  const r = activeRank(a) - activeRank(b);
  if (r) return r;
  const ea = a.estimatedDeliveryDate ? daysFromToday(a.estimatedDeliveryDate) : Infinity;
  const eb = b.estimatedDeliveryDate ? daysFromToday(b.estimatedDeliveryDate) : Infinity;
  if (ea !== eb) return ea - eb;
  return b.createdAt.localeCompare(a.createdAt);
}
const historyDate = (o: Order) => o.deliveredAt ?? o.archivedAt ?? o.createdAt;

function matchesFilter(o: Order, f: StatusFilter): boolean {
  if (f === 'all') return true;
  if (f === 'today') return isDueToday(o);
  return o.status === f;
}

export default function HomePage() {
  const session = useSession();
  const hydrated = session.phase === 'ready';
  const { orders, suggested, statusFilter, searchQuery, setSearchQuery, start, signOut } = useOrdersStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [addOpen, setAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeOrders = useMemo(() => orders.filter(o => !isHistory(o)).sort(compareActive), [orders]);
  const historyOrders = useMemo(
    () => orders.filter(isHistory).sort((a, b) => historyDate(b).localeCompare(historyDate(a))),
    [orders]
  );

  const counts = useMemo(() => {
    const keys: StatusFilter[] = ['all', 'today', 'processed', 'in_transit', 'out_for_delivery', 'issue'];
    return Object.fromEntries(keys.map(k => [k, activeOrders.filter(o => matchesFilter(o, k)).length])) as Record<StatusFilter, number>;
  }, [activeOrders]);

  const inHistory = activeTab === 'history';

  const visible = useMemo(() => {
    let list = inHistory ? historyOrders : activeOrders.filter(o => matchesFilter(o, statusFilter));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const code = normalizeTracking(q);
      list = list.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.platform.toLowerCase().includes(q) ||
        o.carrier.toLowerCase().includes(q) ||
        (o.notes ?? '').toLowerCase().includes(q) ||
        (code.length >= 3 && normalizeTracking(o.trackingNumber).includes(code))
      );
    }
    return list;
  }, [inHistory, historyOrders, activeOrders, statusFilter, searchQuery]);

  // A search that looks like an untracked number offers to track it
  const searchAsTracking = useMemo(() => {
    const code = parseTrackingInput(searchQuery);
    if (code.length < 8 || !/\d/.test(code)) return null;
    const v = validateTracking(code);
    return v.confidence === 'unknown' && code.length < 10 ? null : v.normalized;
  }, [searchQuery]);

  const openAdd = useCallback((prefill = '') => {
    setAddPrefill(prefill);
    setAddOpen(true);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'add') { openAdd(); return; }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selected = selectedId ? orders.find(o => o.id === selectedId) ?? null : null;
  const closeSelected = useCallback(() => setSelectedId(null), []);

  const subtitle = inHistory
    ? `${historyOrders.length} delivered or archived`
    : activeOrders.length === 0
      ? undefined
      : [
          `${activeOrders.length} on the way`,
          counts.today ? `${counts.today} today` : '',
          counts.issue ? `${counts.issue} with issues` : '',
        ].filter(Boolean).join(' · ');

  if (session.phase === 'login') return <Login onSignedIn={start} />;
  if (session.phase === 'offline') return <Offline onRetry={start} />;
  const user = session.phase === 'ready' ? session.user : null;

  const noOrdersAtAll = !inHistory && activeOrders.length === 0 && suggested.length === 0 && !searchQuery;

  return (
    <div className="min-h-dvh mx-auto w-full max-w-xl">
      <Header
        title={inHistory ? 'History' : 'Tracking'}
        subtitle={hydrated ? subtitle : undefined}
        accountInitial={user ? (user.displayName || user.username).charAt(0).toUpperCase() : undefined}
        onAccount={() => setAccountOpen(true)}
      />

      {!hydrated ? (
        <div className="px-4 space-y-3" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map(i => (
            <div key={i} className="card h-[124px] animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
          ))}
        </div>
      ) : noOrdersAtAll ? (
        <EmptyStart onAdd={() => openAdd()} />
      ) : (
        <main className="px-4 pb-36">
          <div className="sticky z-10 -mx-4 px-4 pb-3 pt-1 space-y-3" style={{ top: 'env(safe-area-inset-top, 0px)', background: 'linear-gradient(var(--bg-base) 80%, transparent)' }}>
            <SearchBar placeholder={inHistory ? 'Search history' : 'Search, or paste a tracking number'} />
            {!inHistory && activeOrders.length > 0 && <FilterTabs counts={counts} />}
          </div>

          {/* One list per tab: switching tabs remounts it instead of animating cards across */}
          <ul key={inHistory ? 'history' : 'list'} className="space-y-3">
            <AnimatePresence initial={false}>
              {!inHistory && !searchQuery && suggested.map(s => <SuggestionCard key={s.id} suggestion={s} />)}
            </AnimatePresence>
            {visible.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onOpen={setSelectedId} />
            ))}
          </ul>

          {visible.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center py-14 gap-3">
              <SearchX size={28} style={{ color: 'var(--text-muted)' }} aria-hidden />
              <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {searchQuery ? 'No matches' : inHistory ? 'History is empty' : 'Nothing in this filter'}
              </p>
              <p className="text-sm max-w-[280px]" style={{ color: 'var(--text-muted)' }}>
                {searchQuery
                  ? inHistory ? 'Try another word, or search in Tracking.' : 'Try another word or number.'
                  : inHistory ? 'Delivered and archived orders land here.' : 'Pick another filter above.'}
              </p>
              {searchQuery && !inHistory && searchAsTracking && (
                <button
                  type="button"
                  className="btn btn-primary mt-2"
                  onClick={() => { openAdd(searchAsTracking); setSearchQuery(''); }}
                >
                  <Plus size={16} /> Track <span className="mono">{searchAsTracking}</span>
                </button>
              )}
            </motion.div>
          )}
        </main>
      )}

      <BottomNav active={activeTab} onChange={handleTabChange} historyCount={hydrated ? historyOrders.length : 0} />
      <AddOrderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialTracking={addPrefill}
        onOpenExisting={id => {
          const o = orders.find(x => x.id === id);
          if (o) setActiveTab(isHistory(o) ? 'history' : 'list');
          setSelectedId(id);
        }}
      />
      <EditOrderModal order={selected} onClose={closeSelected} />
      <Toast />
      {user && (
        <AccountSheet
          open={accountOpen}
          user={user}
          onClose={() => setAccountOpen(false)}
          onSignOut={() => { setAccountOpen(false); signOut(); }}
        />
      )}
    </div>
  );
}

function EmptyStart({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center px-8 pt-16 pb-36"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-512.png"
        alt=""
        width={112}
        height={112}
        className="rounded-[28px]"
        style={{ boxShadow: '0 18px 50px rgba(47,111,228,0.35)', outline: '1px solid rgba(255,255,255,0.08)', outlineOffset: -1 }}
      />
      <h2 className="text-xl font-bold mt-7" style={{ color: 'var(--text-primary)' }}>Nothing on the way</h2>
      <p className="text-[15px] mt-2 max-w-[300px]" style={{ color: 'var(--text-secondary)' }}>
        Add a tracking number, a carrier link or the whole shipping email. The carrier is detected for you.
      </p>
      <button type="button" onClick={onAdd} className="btn btn-primary mt-7" style={{ minHeight: 50, padding: '0 22px' }}>
        <Plus size={18} /> Track a package
      </button>
    </motion.main>
  );
}
