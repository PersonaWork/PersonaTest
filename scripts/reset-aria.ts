import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting Aria to fresh state...\n');

  const aria = await prisma.character.findUnique({ where: { slug: 'aria' } });
  if (!aria) {
    console.error('❌ Aria not found!');
    process.exit(1);
  }

  console.log(`Found: ${aria.name} (${aria.id})`);
  console.log(`  Current state: ${aria.sharesIssued} shares issued, $${aria.currentPrice} price, ${aria.phase} phase\n`);

  // 1. Delete all limit orders for Aria
  const deletedOrders = await prisma.limitOrder.deleteMany({
    where: { characterId: aria.id },
  });
  console.log(`  🗑  Deleted ${deletedOrders.count} limit orders`);

  // 2. Delete all transactions for Aria
  const deletedTx = await prisma.transaction.deleteMany({
    where: { characterId: aria.id },
  });
  console.log(`  🗑  Deleted ${deletedTx.count} transactions`);

  // 3. Delete all holdings for Aria
  const deletedHoldings = await prisma.holding.deleteMany({
    where: { characterId: aria.id },
  });
  console.log(`  🗑  Deleted ${deletedHoldings.count} holdings`);

  // 4. Delete all character events for Aria
  const deletedEvents = await prisma.characterEvent.deleteMany({
    where: { characterId: aria.id },
  });
  console.log(`  🗑  Deleted ${deletedEvents.count} character events`);

  // 5. Reset character to initial bonding curve state
  await prisma.character.update({
    where: { id: aria.id },
    data: {
      sharesIssued: 0,
      currentPrice: 0.00001,
      marketCap: 0,
      poolBalance: 0,
      phase: 'BONDING_CURVE',
      graduatedAt: null,
    },
  });
  console.log(`  ✅ Reset character to initial state: 0 shares, $0.00001, BONDING_CURVE`);

  // 7. Show final state
  const updated = await prisma.character.findUnique({ where: { slug: 'aria' } });
  console.log(`\n📊 Final state:`);
  console.log(`  Name: ${updated?.name}`);
  console.log(`  Phase: ${updated?.phase}`);
  console.log(`  Shares Issued: ${updated?.sharesIssued} / ${updated?.totalShares}`);
  console.log(`  Price: $${updated?.currentPrice}`);
  console.log(`  Market Cap: $${updated?.marketCap}`);
  console.log(`  Pool Balance: $${updated?.poolBalance}`);
  console.log('\n✅ Aria is fully reset and ready for trading!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
