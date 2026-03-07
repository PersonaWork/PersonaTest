'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';

interface NotificationPrefs {
  priceAlerts: boolean;
  rareEvents: boolean;
  newPosts: boolean;
  payouts: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  priceAlerts: true,
  rareEvents: true,
  newPosts: false,
  payouts: true,
};

const TOGGLE_OPTIONS = [
  {
    key: 'priceAlerts' as const,
    title: 'Price alerts',
    desc: 'When your characters spike or dip in price.',
  },
  {
    key: 'rareEvents' as const,
    title: 'Rare events',
    desc: 'When a character triggers a rare moment.',
  },
  {
    key: 'newPosts' as const,
    title: 'New posts',
    desc: 'When your characters publish social content.',
  },
  {
    key: 'payouts' as const,
    title: 'Payouts',
    desc: 'When revenue is ready to claim.',
  },
];

export default function NotificationsSettingsPage() {
  const privyFetch = usePrivyAuthedFetch();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await privyFetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        const userPrefs = data?.data?.preferences;
        if (userPrefs?.notifications) {
          setPrefs({ ...DEFAULT_PREFS, ...userPrefs.notifications });
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoaded(true);
    }
  }, [privyFetch]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await privyFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { notifications: prefs } }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

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
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">
            In-App Notifications
          </p>
          <div className="space-y-4">
            {TOGGLE_OPTIONS.map((opt) => (
              <div
                key={opt.key}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{opt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(opt.key)}
                  disabled={!loaded}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    prefs[opt.key] ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      prefs[opt.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
            {saved && (
              <span className="text-sm text-emerald-400 font-medium">Saved!</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
