'use client';

/** App bar: the logo mark plus the current screen's title. */
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
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
      <div className="min-w-0">
        <h1 className="font-bold text-[22px] leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-[13px] mt-1 tabular" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </header>
  );
}
