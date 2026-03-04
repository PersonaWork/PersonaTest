'use client';

import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { usePrivy } from '@privy-io/react-auth';

export default function SecuritySettingsPage() {
  const { authenticated, login, logout } = usePrivy();

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Security</h1>
              <p className="text-slate-400 font-medium">Manage account security and sessions.</p>
            </div>
            <Link href="/settings">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <Card className="p-6" hover={false}>
          <p className="text-sm text-slate-400">
            Security is handled by Privy. Use the Privy modal to manage your login methods.
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            {!authenticated ? (
              <Button onClick={() => login()}>Sign In</Button>
            ) : (
              <Button variant="danger" onClick={() => logout()}>Sign Out</Button>
            )}
          </div>
        </Card>

        <Card className="p-6" hover={false}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Coming soon</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: 'Two-factor authentication', desc: 'Protect sensitive actions.' },
              { title: 'Session management', desc: 'See and revoke active sessions.' },
              { title: 'Wallet recovery', desc: 'Recovery settings for embedded wallet.' },
              { title: 'Device approvals', desc: 'Approve new devices safely.' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
