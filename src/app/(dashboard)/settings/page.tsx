'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [username, setUsername] = useState('johndoe');
    const [email, setEmail] = useState('john@example.com');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Handle save logic
        setTimeout(() => setIsSaving(false), 1000);
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 ml-[240px] max-md:ml-0">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-white mb-2">Settings</h1>
                    <p className="text-slate-400 font-medium">Manage your account preferences</p>
                </div>

                {/* Profile Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-white mb-4">Profile</h2>
                    <div className="glass-card p-6 border-white/5">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative">
                                <img
                                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe"
                                    alt="Profile"
                                    className="w-20 h-20 rounded-full"
                                />
                                <button className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{username}</h3>
                                <p className="text-slate-500">{email}</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input bg-slate-900/50 border-slate-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input bg-slate-900/50 border-slate-700 text-white"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="mt-6 btn-primary"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Wallet Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-white mb-4">Wallet</h2>
                    <div className="glass-card p-6 border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Status</div>
                                    <div className="text-white font-medium">Wallet Connected</div>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">ACTIVE</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Wallet Address</div>
                            <div className="flex items-center gap-3">
                                <code className="text-sm text-slate-300 font-mono">0x1234...5678</code>
                                <button className="text-slate-500 hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mt-4">
                            Your wallet was automatically created when you signed up. It's securely managed by Privy.
                        </p>
                    </div>
                </div>

                {/* Notifications */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-white mb-4">Notifications</h2>
                    <div className="glass-card p-6 border-white/5">
                        <div className="space-y-4">
                            {[
                                { id: 'price', label: 'Price Alerts', desc: 'Get notified when characters hit your target price' },
                                { id: 'drops', label: 'New Drops', desc: 'Be the first to know about new character launches' },
                                { id: 'payouts', label: 'Payouts', desc: 'Receive notifications when you earn revenue' },
                                { id: 'events', label: 'Rare Events', desc: 'Get notified when rare events occur on your characters' },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-2">
                                    <div>
                                        <div className="text-white font-medium">{item.label}</div>
                                        <div className="text-sm text-slate-500">{item.desc}</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" defaultChecked className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div>
                    <h2 className="text-lg font-bold text-white mb-4">Danger Zone</h2>
                    <div className="glass-card p-6 border-red-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white font-medium">Delete Account</div>
                                <div className="text-sm text-slate-500">Permanently delete your account and all data</div>
                            </div>
                            <button className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
