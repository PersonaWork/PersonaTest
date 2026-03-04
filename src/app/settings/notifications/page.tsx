'use client';

import Link from 'next/link';
import { Card, Button } from '@/components/ui';

export default function NotificationsSettingsPage() {
  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Notifications</h1>
              <p className="text-slate-400 font-medium">Choose what you want to hear about.</p>
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
            Notification preferences are coming next. For now, you’ll see platform updates in-app.
          </p>
        </Card>

        <Card className="p-6" hover={false}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Planned</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: 'Price alerts', desc: 'When your characters spike or dip.' },
              { title: 'Rare events', desc: 'When a character hits a rare moment.' },
              { title: 'New posts', desc: 'When your characters publish content.' },
              { title: 'Payouts', desc: 'When revenue is ready to claim.' },
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
