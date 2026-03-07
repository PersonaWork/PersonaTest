'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';
import { Button, Card } from '@/components/ui';
import { encodeFunctionData, parseUnits } from 'viem';

// USDC on Base mainnet
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

type WalletStatus = {
  userId: string;
  walletAddress: string;
  chain: 'base';
  platformBalance: number;
  walletBalance: number;
  canBuy: boolean;
};

export default function FundPage() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const privyFetch = usePrivyAuthedFetch();

  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await privyFetch('/api/wallet/status');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load wallet status');
      setStatus(data.data || data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet status');
    } finally {
      setIsLoading(false);
    }
  }, [privyFetch]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setIsLoading(false);
      return;
    }
    fetchStatus();
  }, [ready, authenticated, fetchStatus]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    setIsDepositing(true);
    setTxMessage(null);

    try {
      // Find the embedded wallet
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      if (!embeddedWallet) throw new Error('No embedded wallet found. Please log out and back in.');

      // Get the treasury address
      const infoRes = await privyFetch('/api/wallet/fund');
      const infoData = await infoRes.json();
      const treasuryAddress = infoData?.data?.instructions?.treasuryAddress;
      if (!treasuryAddress) throw new Error('Treasury address not configured');

      // Switch to Base chain (chainId 8453)
      await embeddedWallet.switchChain(8453);

      // Get provider and send USDC transfer
      const provider = await embeddedWallet.getEthereumProvider();

      // Encode ERC-20 transfer call
      const transferData = encodeFunctionData({
        abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'transfer',
        args: [treasuryAddress as `0x${string}`, parseUnits(amount.toString(), 6)],
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: embeddedWallet.address,
          to: USDC_ADDRESS,
          data: transferData,
        }],
      });

      // Verify the deposit with the backend
      const verifyRes = await privyFetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData?.error || 'Deposit verification failed');

      setTxMessage({ type: 'success', text: `Deposited ${amount} USDC. New balance: ${verifyData.data.newBalance.toFixed(2)} USDC` });
      setDepositAmount('');
      await fetchStatus();
    } catch (e: unknown) {
      setTxMessage({ type: 'error', text: e instanceof Error ? e.message : 'Deposit failed' });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    setIsWithdrawing(true);
    setTxMessage(null);

    try {
      const res = await privyFetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Withdrawal failed');

      setTxMessage({ type: 'success', text: `Withdrew ${amount} USDC. Tx: ${data.data.txHash?.slice(0, 10)}...` });
      setWithdrawAmount('');
      await fetchStatus();
    } catch (e: unknown) {
      setTxMessage({ type: 'error', text: e instanceof Error ? e.message : 'Withdrawal failed' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center" hover={false}>
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-2xl font-black text-white mb-2">Fund your account</h1>
          <p className="text-slate-400 mb-6">
            Sign in to deposit USDC and start trading character shares.
          </p>
          <Button size="lg" className="w-full" onClick={() => login()}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Fund Account</h1>
              <p className="text-slate-400 font-medium">
                Deposit USDC on Base to trade character shares.
              </p>
            </div>
            <Link href="/marketplace">
              <Button variant="secondary">Back to Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {isLoading ? (
          <Card className="p-8" hover={false}>
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
              <p className="text-slate-400">Loading wallet status…</p>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8" hover={false}>
            <p className="text-red-400 font-medium mb-4">{error}</p>
            <Button onClick={fetchStatus}>Retry</Button>
          </Card>
        ) : status ? (
          <>
            {/* Balances */}
            <Card className="p-8" hover={false}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Platform Balance</p>
                  <p className="text-3xl font-black text-white">{status.platformBalance.toFixed(2)}</p>
                  <p className="text-sm text-slate-400 mt-1">USDC · Available to trade</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Wallet Balance</p>
                  <p className="text-3xl font-black text-white">{status.walletBalance.toFixed(2)}</p>
                  <p className="text-sm text-slate-400 mt-1">USDC · On-chain (Base)</p>
                </div>
              </div>

              {status.canBuy ? (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-300 font-semibold text-sm">✓ You have funds to trade</p>
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-200 font-semibold text-sm">
                    Deposit USDC to start trading character shares
                  </p>
                </div>
              )}
            </Card>

            {/* Transaction message */}
            {txMessage && (
              <div className={`p-4 rounded-xl border ${txMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                <p className="font-medium text-sm">{txMessage.text}</p>
              </div>
            )}

            {/* Deposit */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Deposit USDC</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                  min="0"
                  step="0.01"
                />
                <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}>
                  {isDepositing ? 'Depositing...' : 'Deposit'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Transfers USDC from your embedded wallet to the platform. Your wallet must have USDC on Base network.
              </p>
            </Card>

            {/* Withdraw */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Withdraw USDC</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                  min="0"
                  step="0.01"
                />
                <Button
                  variant="secondary"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Sends USDC from the platform to your embedded wallet on Base.
              </p>
            </Card>

            {/* Wallet Address & Manual Deposit */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Wallet Address (Base)</p>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-mono text-white break-all">{status.walletAddress || 'No wallet address yet'}</p>
                {status.walletAddress && (
                  <Button variant="secondary" size="sm" onClick={() => copy(status.walletAddress)}>
                    Copy
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <p>You can also send <span className="text-white font-semibold">USDC on Base network</span> directly to this address from any exchange (Coinbase, Binance, etc).</p>
                <p>After sending, click <strong className="text-white">Refresh</strong> to check your wallet balance, then deposit to your platform balance.</p>
              </div>
              <div className="mt-4">
                <Button variant="secondary" onClick={fetchStatus}>Refresh Balances</Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
