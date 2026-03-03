'use client';

import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { usePrivy } from '@privy-io/react-auth';

export default function SettingsPage() {
    const { user, logout } = usePrivy();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(user?.email?.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
    };

    const wallet = user?.wallet;
    const address = wallet?.address;

    return (
        <div className="min-h-screen pb-20">
            <div className="pt-8 pb-8 px-6">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Settings</h1>
                    <p className="text-lg text-slate-400 font-medium">Manage your account and preferences</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 space-y-6">
                {/* Profile Section */}
                <Card className="p-6" hover={false}>
                    <h2 className="text-xl font-bold text-white mb-6">Profile</h2>

                    <div className="space-y-5">
                        <Input
                            label="Username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                        />

                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            disabled
                            hint="Email cannot be changed"
                        />

                        <div className="pt-4">
                            <Button onClick={handleSave} isLoading={isSaving}>
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Wallet Section */}
                <Card className="p-6" hover={false}>
                    <h2 className="text-xl font-bold text-white mb-6">Wallet</h2>

                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Connected Wallet</p>
                                <p className="text-sm font-mono text-white break-all">
                                    {address || 'No wallet connected'}
                                </p>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-4">
                        Your wallet is automatically generated when you sign up. It allows you to buy and sell AI character shares without needing to manage crypto yourself.
                    </p>

                    <Button variant="danger" size="sm">
                        Disconnect Wallet
                    </Button>
                </Card>

                {/* Notifications */}
                <Card className="p-6" hover={false}>
                    <h2 className="text-xl font-bold text-white mb-6">Notifications</h2>

                    <div className="space-y-4">
                        {[
                            { label: 'Price alerts', desc: 'Get notified when characters hit your target price' },
                            { label: 'New character launches', desc: 'Be the first to know about new AI characters' },
                            { label: 'Revenue payouts', desc: 'Receive notifications when you earn from your shares' },
                            { label: 'Character events', desc: 'Get notified about rare character events' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                                <div>
                                    <p className="text-sm font-semibold text-white">{item.label}</p>
                                    <p className="text-xs text-slate-500">{item.desc}</p>
                                </div>
                                <button className="w-12 h-7 rounded-full bg-indigo-600 relative transition-colors">
                                    <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow-sm" />
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Security */}
                <Card className="p-6" hover={false}>
                    <h2 className="text-xl font-bold text-white mb-6">Security</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                            <div>
                                <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
                                <p className="text-xs text-slate-500">Add an extra layer of security</p>
                            </div>
                            <Button variant="secondary" size="sm">Enable</Button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                            <div>
                                <p className="text-sm font-semibold text-white">Change Password</p>
                                <p className="text-xs text-slate-500">Update your account password</p>
                            </div>
                            <Button variant="secondary" size="sm">Change</Button>
                        </div>
                    </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-6 border-red-500/20" hover={false}>
                    <h2 className="text-xl font-bold text-red-400 mb-6">Danger Zone</h2>

                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-sm text-slate-300 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <Button variant="danger" size="sm">
                            Delete Account
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
