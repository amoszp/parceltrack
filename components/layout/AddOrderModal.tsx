'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package, Tag, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOrdersStore } from '@/lib/store/orders';
import { generateId, STATUS_PROGRESS } from '@/lib/utils/status';
import { Order } from '@/types';
import { validateTracking, extractFromUrl, normalizeTracking } from '@/lib/utils/validation';
import { PlatformInput } from '@/components/ui/PlatformInput';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'input' | 'warning' | 'success';

export function AddOrderModal({ open, onClose }: Props) {
  const { addOrder } = useOrdersStore();
  const [tracking, setTracking] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [warningMsg, setWarningMsg] = useState('');
  const [detectedCarrier, setDetectedCarrier] = useState('');

  const reset = () => {
    setTracking(''); setName(''); setPlatform('');
    setStep('input'); setWarningMsg(''); setDetectedCarrier('');
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const doSubmit = async (forceAdd = false) => {
    const raw = tracking.trim();
    if (!raw) return;

    // Try URL extraction
    const fromUrl = extractFromUrl(raw);
    const trackNum = fromUrl ? fromUrl.trackingNumber : raw;
    const normalized = normalizeTracking(trackNum);

    // Validation
    const result = validateTracking(normalized);

    if (!result.valid && !forceAdd) {
      setWarningMsg(result.warning ?? 'Unrecognized tracking code format.');
      setDetectedCarrier(result.carrier ?? '');
      setStep('warning');
      return;
    }

    setLoading(true);
    // Simulate API lookup (replace with real call to /api/track)
    await new Promise(r => setTimeout(r, 900));

    const newOrder: Order = {
      id: generateId(),
      name: name.trim() || 'New Package',
      platform: platform.trim() || 'Unknown',
      trackingNumber: normalized,
      carrier: detectedCarrier || result.carrier || fromUrl?.carrier || 'Unknown',
      status: 'processed',
      progress: STATUS_PROGRESS.processed,
      estimatedDelivery: 'Calculating...',
      lastUpdate: 'Just now',
      statusHistory: [],
      createdAt: new Date().toISOString(),
      notes: '',
      tags: [],
    };

    addOrder(newOrder);
    setLoading(false);
    setStep('success');
    setTimeout(() => { reset(); onClose(); }, 1200);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 max-w-lg mx-auto"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />

            {/* ── Success ── */}
            {step === 'success' && (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <CheckCircle2 size={28} style={{ color: '#10B981' }} />
                </div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Package added!</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fetching live tracking status…</p>
              </div>
            )}

            {/* ── Warning / Force ── */}
            {step === 'warning' && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <AlertTriangle size={22} style={{ color: '#FBBF24' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Unrecognized tracking format</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{warningMsg}</p>
                    {detectedCarrier && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Possible carrier: {detectedCarrier}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('input')}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Edit number
                  </button>
                  <button
                    onClick={() => doSubmit(true)}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: '#3447AA', color: '#fff', boxShadow: '0 0 20px rgba(52,71,170,0.3)' }}
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
                    Add anyway
                  </button>
                </div>
              </div>
            )}

            {/* ── Main Input ── */}
            {step === 'input' && (
              <>
                <div className="flex items-center justify-between mb-5 mt-2">
                  <div>
                    <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Track a package</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Paste a number or carrier URL</p>
                  </div>
                  <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <X size={14} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Tracking */}
                  <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={inputStyle}>
                    <Search size={14} style={{ color: 'var(--text-muted)' }} />
                    <input
                      autoFocus
                      value={tracking}
                      onChange={e => setTracking(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && doSubmit()}
                      placeholder="Tracking number or link..."
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-muted)] font-mono"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={inputStyle}>
                    <Tag size={14} style={{ color: 'var(--text-muted)' }} />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Order name (optional)"
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-muted)]"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Platform autocomplete */}
                  <PlatformInput value={platform} onChange={setPlatform} />

                  <button
                    onClick={() => doSubmit()}
                    disabled={loading || !tracking.trim()}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40"
                    style={{
                      background: loading ? 'rgba(52,71,170,0.15)' : '#3447AA',
                      color: loading ? '#3447AA' : '#fff',
                      boxShadow: loading ? 'none' : '0 0 20px rgba(52,71,170,0.28)',
                    }}
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
                    {loading ? 'Looking up carrier...' : 'Start tracking'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
