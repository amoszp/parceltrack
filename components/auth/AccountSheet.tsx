'use client';
import { LogOut } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import type { SessionUser } from '@/lib/store/orders';

interface Props {
  open: boolean;
  user: SessionUser;
  onClose: () => void;
  onSignOut: () => void;
}

export function AccountSheet({ open, user, onClose, onSignOut }: Props) {
  return (
    <Sheet
      open={open}
      onRequestClose={onClose}
      title={user.displayName || user.username}
      subtitle={`@${user.username}`}
      footer={
        <button type="button" onClick={onSignOut} className="btn btn-danger w-full" style={{ minHeight: 50 }}>
          <LogOut size={16} /> Sign out
        </button>
      }
    >
      <p className="text-sm pb-2" style={{ color: 'var(--text-secondary)' }}>
        Your orders are saved to your account and show up on every device you sign in on.
      </p>
    </Sheet>
  );
}
