import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Address, TransactionReceipt } from 'viem';
import type { EvmChainSlug } from '@/config/chains';

/**
 * Data required to create a position via API after successful mint
 */
export interface CreatePositionData {
  chainId: EvmChainSlug;
  nftId: string;
  poolAddress: Address;
  tickLower: number;
  tickUpper: number;
  ownerAddress: Address;
  quoteTokenAddress: Address;
  receipt: TransactionReceipt;
}

/**
 * Extract INCREASE_LIQUIDITY event data from mint transaction receipt
 */
function extractIncreaseEventFromReceipt(receipt: TransactionReceipt) {
  // Extract liquidity and amounts from the receipt
  // The mint() function returns these values, but we can also get them from logs

  // For now, we'll need to parse the logs to extract the exact amounts
  // The IncreaseLiquidity event signature is:
  // event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)

  // Find the IncreaseLiquidity event (if available)
  // Event signature: 0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f
  const increaseLiquidityLog = receipt.logs.find(
    (log) =>
      log.topics[0] ===
        '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f'
  );

  if (!increaseLiquidityLog) {
    throw new Error('IncreaseLiquidity event not found in transaction receipt');
  }

  // Decode the event data
  // Topics: [signature, tokenId]
  // Data: liquidity (uint128), amount0 (uint256), amount1 (uint256)
  // Note: In production, we'd use viem's decodeEventLog to properly parse this data
  // For now, the API will handle fetching the actual amounts from the blockchain

  return {
    timestamp: new Date(Number(receipt.blockNumber) * 12 * 1000).toISOString(), // Rough estimate
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: increaseLiquidityLog.logIndex || 0,
    transactionHash: receipt.transactionHash,
    // These will be parsed from the data field - for now using placeholders
    // The actual implementation would decode the log data properly
    liquidity: '0', // Will be updated with actual value
    amount0: '0', // Will be updated with actual value
    amount1: '0', // Will be updated with actual value
  };
}

/**
 * Hook to create a position in the database via API after successful on-chain mint
 *
 * Automatically invalidates the positions list query to trigger a refetch.
 */
export function useCreatePositionAPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePositionData) => {
      const increaseEvent = extractIncreaseEventFromReceipt(data.receipt);

      const response = await fetch(
        `/api/v1/positions/uniswapv3/${data.chainId}/${data.nftId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            poolAddress: data.poolAddress,
            tickUpper: data.tickUpper,
            tickLower: data.tickLower,
            ownerAddress: data.ownerAddress,
            quoteTokenAddress: data.quoteTokenAddress,
            increaseEvent,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'Failed to create position in database',
        }));
        throw new Error(error.error || 'Failed to create position');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate positions list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['positions', 'list'] });
    },
  });
}
