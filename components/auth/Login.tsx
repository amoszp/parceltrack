'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, KeyRound, AtSign, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

const ERRORS: Record<number, string> = {
  0: 'No connection. Try again in a moment.',
  401: 'Wrong username or password.',
  409: 'That username is taken.',
  429: 'Too many attempts. Wait a few minutes.',
  503: 'Sign-in is unavailable right now. Try again shortly.',
};

/** Sign in, or create an account (it works straight away). */
export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', username: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signup && form.password !== form.password2) {
      setError('The passwords don’t match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (signup) {
        await api.post('/api/auth/signup', { displayName: form.name.trim(), username: form.username.trim(), password: form.password });
      } else {
        await api.post('/api/auth/login', { username: form.username.trim(), password: form.password });
      }
      onSignedIn();
    } catch (err) {
      const status = (err as ApiError).status;
      setError(ERRORS[status] ?? (signup ? (err as ApiError).message : ERRORS[401]));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-5" style={{ paddingBlock: 'max(24px, env(safe-area-inset-top))' }}>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="card w-full max-w-sm p-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto rounded-[20px]"
          style={{ boxShadow: '0 12px 34px rgba(47,111,228,0.35)', outline: '1px solid rgba(255,255,255,0.08)', outlineOffset: -1 }}
        />
        <h1 className="mt-5 text-center text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {signup ? 'Create account' : 'Sign in'}
        </h1>
        <p className="mt-1 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          {signup ? 'Your parcels, on every device.' : 'Sign in to see your parcels.'}
        </p>

        <div className="mt-6 space-y-3">
          {signup && (
            <div className="field">
              <User size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
              <input {...field('name')} name="name" placeholder="Name" aria-label="Name" autoComplete="name" maxLength={40} required />
            </div>
          )}
          <div className="field">
            <AtSign size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input
              {...field('username')} name="username" placeholder="Username" aria-label="Username"
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={32} required
            />
          </div>
          <div className="field">
            <KeyRound size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input
              {...field('password')} name="password" type="password" placeholder="Password" aria-label="Password"
              autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 4 : undefined} required
            />
          </div>
          {signup && (
            <div className="field">
              <KeyRound size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
              <input
                {...field('password2')} name="password2" type="password" placeholder="Repeat password" aria-label="Repeat password"
                autoComplete="new-password" minLength={4} required
              />
            </div>
          )}
        </div>

        {signup && (
          <p className="mt-2 px-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Username: lowercase letters, numbers, dot, dash or underscore.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-2xl px-4 py-2.5 text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full mt-5" style={{ minHeight: 50 }}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {busy ? 'One moment…' : signup ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(signup ? 'login' : 'signup'); setError(''); }}
          className="btn w-full mt-2"
          style={{ color: 'var(--text-secondary)', fontWeight: 500 }}
        >
          {signup ? 'I already have an account' : 'No account? Create one'}
        </button>
      </motion.form>
    </main>
  );
}

/** Shown when the server can't be reached at start-up. */
export function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 text-center">
      <div className="card w-full max-w-sm p-6">
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Can’t reach the server</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Check your connection and try again.</p>
        <button type="button" onClick={onRetry} className="btn btn-primary mt-5">Try again</button>
      </div>
    </main>
  );
}
