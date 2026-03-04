'use client';

import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

export default function DangerSettingsPage() {
  const { signOut } = useAuth();

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
          <p className="text-sm text-slate-300 mb-6">
            Account deletion is not enabled yet. Once enabled, it will permanently delete your profile data.
          </p>
          <Button variant="danger" size="sm" disabled>
            Delete Account (Coming soon)
          </Button>
        </Card>

        <Card className="p-6" hover={false}>
          <h2 className="text-xl font-bold text-white mb-3">Sign out</h2>
          <p className="text-sm text-slate-400 mb-6">Sign out of this device.</p>
          <Button variant="secondary" onClick={signOut}>
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
