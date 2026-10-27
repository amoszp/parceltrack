'use client';

interface Props {
  title: string;
  subtitle?: string;
  /** Initial shown in the account button; the button is hidden without it. */
  accountInitial?: string;
  onAccount?: () => void;
}

/** App bar: the logo mark, the current screen's title and the account button. */
export function Header({ title, subtitle, accountInitial, onAccount }: Props) {
  return (
    <header
      className="flex items-center gap-3 px-5 pb-4"
      style={{ paddingTop: 'max(18px, calc(env(safe-area-inset-top) + 8px))' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={40}
        height={40}
        className="rounded-[11px] flex-shrink-0"
        style={{ boxShadow: '0 4px 14px rgba(47,111,228,0.28)', outline: '1px solid rgba(255,255,255,0.08)', outlineOffset: -1 }}
      />
      <div className="min-w-0 flex-1">
        <h1 className="font-bold text-[22px] leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-[13px] mt-1 tabular" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {accountInitial && onAccount && (
        <button
          type="button"
          onClick={onAccount}
          aria-label="Account"
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          {accountInitial}
        </button>
      )}
    </header>
  );
}
