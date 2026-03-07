'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';
import { useRouter } from 'next/navigation';

export default function DangerSettingsPage() {
  const { logout } = usePrivy();
  const privyFetch = usePrivyAuthedFetch();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const res = await privyFetch('/api/users/me', { method: 'DELETE' });
      if (res.ok) {
        await logout();
        router.push('/');
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Account Actions</h1>
              <p className="text-slate-400 font-medium">High-impact actions. Slow down and double-check.</p>
            </div>
            <Link href="/settings">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <Card className="p-6 border-red-500/20" hover={false}>
          <h2 className="text-xl font-bold text-red-400 mb-3">Delete account</h2>
          <p className="text-sm text-slate-300 mb-4">
            This will permanently delete your profile, holdings, messages, and transaction history. This action cannot be undone.
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Make sure to withdraw any USDC from your platform balance before deleting your account.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder='Type "DELETE" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="flex-1 h-10 px-4 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-red-500 text-white text-sm placeholder:text-slate-500"
            />
          </div>
          <Button
            variant="danger"
            size="sm"
            disabled={confirmText !== 'DELETE' || isDeleting}
            onClick={handleDeleteAccount}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account Permanently'}
          </Button>
        </Card>

        <Card className="p-6" hover={false}>
          <h2 className="text-xl font-bold text-white mb-3">Sign out</h2>
          <p className="text-sm text-slate-400 mb-6">Sign out of this device.</p>
          <Button variant="secondary" onClick={logout}>
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
