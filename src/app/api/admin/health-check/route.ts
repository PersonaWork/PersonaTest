import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTreasuryBalances, getGasStationBalance } from '@/lib/wallet/base';

/**
 * POST /api/admin/health-check — Daily treasury health monitoring cron
 *
 * Runs daily via Vercel Cron. Checks gas station and treasury balances,
 * logs warnings to Vercel logs if thresholds are crossed.
 *
 * Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [treasuryBalances, gasStationEth, userBalances] = await Promise.all([
      getTreasuryBalances(),
      getGasStationBalance(),
      prisma.user.aggregate({
        _sum: { usdcBalance: true },
      }),
    ]);

    const totalUserLiabilities = userBalances._sum.usdcBalance || 0;
    const warnings: string[] = [];

    // Gas station checks
    if (gasStationEth < 0.005) {
      const msg = `CRITICAL: Gas station ETH critically low: ${gasStationEth.toFixed(6)} ETH. Users cannot deposit!`;
      console.error(`[HEALTH-CHECK] ${msg}`);
      warnings.push(msg);
    } else if (gasStationEth < 0.02) {
      const msg = `WARNING: Gas station ETH running low: ${gasStationEth.toFixed(6)} ETH (~${Math.floor(gasStationEth / 0.0005)} top-ups remaining)`;
      console.warn(`[HEALTH-CHECK] ${msg}`);
      warnings.push(msg);
    }

    // Treasury ETH checks (needed for withdrawal txs)
    if (treasuryBalances.ethBalance < 0.002) {
      const msg = `CRITICAL: Treasury ETH critically low: ${treasuryBalances.ethBalance.toFixed(6)} ETH. Withdrawals may fail!`;
      console.error(`[HEALTH-CHECK] ${msg}`);
      warnings.push(msg);
    } else if (treasuryBalances.ethBalance < 0.01) {
      const msg = `WARNING: Treasury ETH running low: ${treasuryBalances.ethBalance.toFixed(6)} ETH`;
      console.warn(`[HEALTH-CHECK] ${msg}`);
      warnings.push(msg);
    }

    // Treasury USDC vs liabilities
    if (treasuryBalances.usdcBalance < totalUserLiabilities) {
      const deficit = totalUserLiabilities - treasuryBalances.usdcBalance;
      const msg = `CRITICAL: Treasury USDC (${treasuryBalances.usdcBalance.toFixed(2)}) below user liabilities (${totalUserLiabilities.toFixed(2)}). Deficit: $${deficit.toFixed(2)}`;
      console.error(`[HEALTH-CHECK] ${msg}`);
      warnings.push(msg);
    }

    if (warnings.length === 0) {
      console.log(`[HEALTH-CHECK] All healthy. Treasury: ${treasuryBalances.usdcBalance.toFixed(2)} USDC / ${treasuryBalances.ethBalance.toFixed(6)} ETH. Gas: ${gasStationEth.toFixed(6)} ETH. Liabilities: ${totalUserLiabilities.toFixed(2)} USDC.`);
    }

    return NextResponse.json({
      success: true,
      data: {
        healthy: warnings.length === 0,
        warnings,
        treasury: treasuryBalances,
        gasStation: { eth: gasStationEth },
        userLiabilities: totalUserLiabilities,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[HEALTH-CHECK] Failed:', error);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
