'use client';

import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { usePrivy } from '@privy-io/react-auth';

export default function SecuritySettingsPage() {
  const { ready, authenticated, user, logout } = usePrivy();

  const linkedAccounts = user?.linkedAccounts || [];
  const emailAccount = linkedAccounts.find((a) => a.type === 'email');
  const walletAccount = linkedAccounts.find((a) => a.type === 'wallet');

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
        {/* Auth info */}
        <Card className="p-6" hover={false}>
          <h2 className="text-lg font-bold text-white mb-4">Authentication</h2>
          <p className="text-sm text-slate-400 mb-4">
            Your account is secured by Privy with email-based 2FA. A verification code is sent each time you log in.
          </p>

          {ready && authenticated && (
            <div className="space-y-3 mb-6">
              {emailAccount && 'address' in emailAccount && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-white">Email</p>
                    <p className="text-xs text-slate-400">{emailAccount.address}</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">Verified</span>
                </div>
              )}
              {walletAccount && 'address' in walletAccount && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-white">Embedded Wallet (Base)</p>
                    <p className="text-xs text-slate-400 font-mono">{(walletAccount.address as string).slice(0, 6)}...{(walletAccount.address as string).slice(-4)}</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">Active</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {authenticated ? (
              <Button variant="danger" onClick={logout}>Sign Out</Button>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-6" hover={false}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Security features</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: 'Email 2FA', desc: 'Enabled — verification code on every login.', active: true },
              { title: 'Embedded Wallet', desc: 'Auto-created and secured by Privy.', active: true },
              { title: 'Session management', desc: 'Coming soon — see and revoke active sessions.' },
              { title: 'Wallet recovery', desc: 'Coming soon — recovery settings for embedded wallet.' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {'active' in item && item.active && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
