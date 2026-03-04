import { createPublicClient, formatEther, http } from 'viem';
import { polygon } from 'viem/chains';

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});

export async function getPolygonMaticBalance(address: `0x${string}`) {
  const wei = await publicClient.getBalance({ address });
  const matic = Number(formatEther(wei));
  return { wei, matic };
}
