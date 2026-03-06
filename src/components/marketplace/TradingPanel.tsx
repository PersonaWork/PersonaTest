'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface TradingPanelProps {
    characterName: string;
    characterSlug: string;
    currentPrice: number;
    userShares?: number;
    userBalance?: number;
    onTrade?: (type: 'buy' | 'sell', shares: number, price: number) => Promise<void>;
}

export default function TradingPanel({
    characterName,
    currentPrice,
    userShares = 0,
    userBalance = 0,
    onTrade
}: TradingPanelProps) {
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
    const [shares, setShares] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const shareCount = parseInt(shares) || 0;
    const totalCost = shareCount * currentPrice;
    const canSell = shareCount <= userShares;
    const hasEnoughBalance = totalCost <= userBalance;

    const handleTrade = async () => {
        if (shareCount <= 0) return;
        if (tradeType === 'sell' && !canSell) {
            setError(`You only have ${userShares} shares`);
            return;
        }
        if (tradeType === 'buy' && !hasEnoughBalance) {
            setError('Insufficient balance');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            if (onTrade) {
                await onTrade(tradeType, shareCount, currentPrice);
            } else {
                // Simulate trade
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            setShares('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Trade failed');
        } finally {
            setIsLoading(false);
        }
    };

    const setPercentage = (percent: number) => {
        if (tradeType === 'sell') {
            setShares(Math.floor(userShares * percent).toString());
        } else {
            const maxShares = Math.floor(userBalance / currentPrice);
            setShares(Math.floor(maxShares * percent).toString());
        }
    };

    return (
        <Card className="w-full" padding="lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Trade {characterName}</h3>
                    <p className="text-sm text-slate-500">Buy or sell shares</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-white">${currentPrice.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">per share</p>
                </div>
            </div>

            {/* Toggle */}
            <div className="flex bg-slate-900/50 rounded-xl p-1 mb-6">
                <button
                    onClick={() => { setTradeType('buy'); setError(null); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tradeType === 'buy'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => { setTradeType('sell'); setError(null); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tradeType === 'sell'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Sell
                </button>
            </div>

            {/* Your Position */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your Shares</p>
                    <p className="text-xl font-bold text-white">{userShares.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your Balance</p>
                    <p className="text-xl font-bold text-indigo-400">${userBalance.toFixed(2)}</p>
                </div>
            </div>

            {/* Shares Input */}
            <div className="mb-4">
                <Input
                    label="Number of Shares"
                    type="number"
                    min="1"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    placeholder="Enter amount"
                    rightIcon={
                        <button
                            onClick={() => setShares('')}
                            className="text-slate-500 hover:text-white"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    }
                />
            </div>

            {/* Quick Percentages */}
            <div className="flex gap-2 mb-6">
                {[0.25, 0.5, 0.75, 1].map((percent) => (
                    <button
                        key={percent}
                        onClick={() => setPercentage(percent)}
                        className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                    >
                        {percent * 100}%
                    </button>
                ))}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">Shares</span>
                    <span className="text-sm font-semibold text-white">{shareCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">Price per share</span>
                    <span className="text-sm font-semibold text-white">${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-800">
                    <span className="text-sm font-semibold text-slate-300">Total</span>
                    <span className="text-lg font-bold text-white">${totalCost.toFixed(2)}</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs font-medium text-red-400">{error}</p>
                </div>
            )}

            {/* Submit Button */}
            <Button
                onClick={handleTrade}
                isLoading={isLoading}
                disabled={shareCount <= 0 || (tradeType === 'sell' && !canSell) || (tradeType === 'buy' && !hasEnoughBalance)}
                variant={tradeType === 'buy' ? 'success' : 'danger'}
                className="w-full"
                size="lg"
            >
                {tradeType === 'buy' ? (
                    <>Buy {shareCount > 0 ? `${shareCount.toLocaleString()} ` : ''}Shares</>
                ) : (
                    <>Sell {shareCount > 0 ? `${shareCount.toLocaleString()} ` : ''}Shares</>
                )}
            </Button>

            {/* Warning for new users */}
            {userShares === 0 && tradeType === 'sell' && (
                <p className="mt-4 text-xs text-center text-slate-500">
                    You don&apos;t own any shares of {characterName} yet.
                </p>
            )}
        </Card>
    );
}
