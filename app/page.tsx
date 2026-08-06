'use client';
import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/layout/SearchBar';
import { FilterTabs } from '@/components/layout/FilterTabs';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddOrderModal } from '@/components/layout/AddOrderModal';
import { OrderCard } from '@/components/orders/OrderCard';
import { SuggestionCard } from '@/components/orders/SuggestionCard';
import { ActiveTab, MetricFilter } from '@/types';
import { BRAND } from '@/lib/utils/status';

export default function HomePage() {
  const { orders, suggested, statusFilter, metricFilter, setMetricFilter, setStatusFilter, searchQuery } = useOrdersStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [addOpen, setAddOpen] = useState(false);

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'add') { setAddOpen(true); return; }
    setActiveTab(tab);
  };

  // Active = not archived, not delivered (unless explicitly archived)
  const activeOrders  = orders.filter(o => !o.isArchived && o.status !== 'delivered');
  const historyOrders = orders.filter(o => o.isArchived || o.status === 'delivered');

  const activeCount = activeOrders.length;
  const issueCount  = activeOrders.filter(o => o.status === 'issue').length;
  const todayCount  = activeOrders.filter(o => o.estimatedDelivery === 'Today' || o.status === 'out_for_delivery').length;

  const handleMetricClick = (metric: MetricFilter) => {
    if (metricFilter === metric) {
      setMetricFilter(null);
    } else {
      setMetricFilter(metric);
      setStatusFilter('all');
    }
  };

  const METRIC_CARDS = [
    { id: 'active' as MetricFilter, label: 'Active',  value: activeCount, color: BRAND.primary, activeBg: BRAND.primaryBg, activeBorder: BRAND.primaryBorder },
    { id: 'issues' as MetricFilter, label: 'Issues',  value: issueCount,  color: '#EF4444', activeBg: 'rgba(239,68,68,0.1)', activeBorder: 'rgba(239,68,68,0.25)' },
    { id: 'today'  as MetricFilter, label: 'Today',   value: todayCount,  color: '#F97316', activeBg: 'rgba(249,115,22,0.1)', activeBorder: 'rgba(249,115,22,0.25)' },
  ];

  const filteredOrders = useMemo(() => {
    let list = activeTab === 'history' ? historyOrders : activeOrders;

    if (metricFilter && activeTab !== 'history') {
      if (metricFilter === 'issues') list = list.filter(o => o.status === 'issue');
      else if (metricFilter === 'today') list = list.filter(o => o.estimatedDelivery === 'Today' || o.status === 'out_for_delivery');
      // 'active' = already the full activeOrders list
    } else if (statusFilter !== 'all' && activeTab !== 'history') {
      list = list.filter(o => o.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.platform.toLowerCase().includes(q) ||
        o.trackingNumber.toLowerCase().includes(q) ||
        o.carrier.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeTab, statusFilter, metricFilter, searchQuery]);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header title="ParcelTrack" />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="px-4 pb-3 space-y-3">
          <SearchBar onAdd={() => setAddOpen(true)} />

          {/* Metric filter cards */}
          <div className="flex gap-2">
            {METRIC_CARDS.map(card => {
              const isActive = metricFilter === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => handleMetricClick(card.id)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-center transition-all duration-200 active:scale-95"
                  style={{
                    background: isActive ? card.activeBg : 'var(--bg-card)',
                    border: `1px solid ${isActive ? card.activeBorder : 'var(--border)'}`,
                    boxShadow: isActive ? `0 0 14px ${card.activeBg}` : undefined,
                  }}
                >
                  <p className="text-lg font-bold leading-none" style={{ color: isActive ? card.color : 'var(--text-primary)' }}>
                    {card.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider mt-1 font-medium" style={{ color: isActive ? card.color : 'var(--text-muted)' }}>
                    {card.label}
                  </p>
                </button>
              );
            })}
          </div>

          {activeTab === 'list' && !metricFilter && <FilterTabs />}
          {activeTab === 'list' && metricFilter && (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: METRIC_CARDS.find(c => c.id === metricFilter)?.activeBg,
                  border: `1px solid ${METRIC_CARDS.find(c => c.id === metricFilter)?.activeBorder}`,
                  color: METRIC_CARDS.find(c => c.id === metricFilter)?.color,
                }}
              >
                Filtered: {metricFilter}
              </div>
              <button
                onClick={() => setMetricFilter(null)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 scroll-area px-4 pb-32 space-y-3">
          {/* Suggestions (active tab only) */}
          {activeTab === 'list' && suggested.length > 0 && (
            <AnimatePresence>
              {suggested.map(s => <SuggestionCard key={s.id} suggestion={s} />)}
            </AnimatePresence>
          )}

          {/* Section header */}
          <div className="flex items-center gap-2 py-0.5">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'history'
                ? `${filteredOrders.length} archived`
                : `${filteredOrders.length} shipment${filteredOrders.length !== 1 ? 's' : ''}`}
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            {activeTab === 'history' && (
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Delete removes permanently
              </p>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
              >
                <Package size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {activeTab === 'history' ? 'No archived orders' : 'No shipments here'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {activeTab === 'history'
                    ? 'Archived and delivered orders appear here'
                    : 'Tap + to start tracking a package'}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order, i) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={i}
                  inHistory={activeTab === 'history'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active={activeTab} onChange={handleTabChange} />
      <AddOrderModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
