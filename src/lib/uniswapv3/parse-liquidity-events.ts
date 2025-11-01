/**
 * Parse Uniswap V3 Liquidity Events from Transaction Receipts
 *
 * Extracts DECREASE_LIQUIDITY and COLLECT events from transaction receipts
 * and converts them to UpdateUniswapV3PositionEvent format for the PATCH endpoint.
 */

import type { TransactionReceipt, Address } from 'viem';
import { parseEventLogs } from 'viem';
import { NONFUNGIBLE_POSITION_MANAGER_ABI } from '@/config/contracts/nonfungible-position-manager';
import type { UpdateUniswapV3PositionEvent } from '@midcurve/api-shared';

/**
 * Parse DecreaseLiquidity event from transaction receipt
 *
 * @param receipt - Transaction receipt from decrease liquidity transaction
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns UpdateUniswapV3PositionEvent or null if not found
 */
export function parseDecreaseLiquidityEvent(
  receipt: TransactionReceipt,
  nftManagerAddress: Address
): UpdateUniswapV3PositionEvent | null {
  try {
    const parsedLogs = parseEventLogs({
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      logs: receipt.logs,
      eventName: 'DecreaseLiquidity',
    });

    // Find the DecreaseLiquidity event
    const decreaseEvent = parsedLogs.find(
      (log) => log.address.toLowerCase() === nftManagerAddress.toLowerCase()
    );

    if (!decreaseEvent) {
      console.warn('DecreaseLiquidity event not found in transaction receipt');
      return null;
    }

    // Extract event data
    const { tokenId, liquidity, amount0, amount1 } = decreaseEvent.args;

    // Get block metadata
    const block = receipt;
    const log = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
        l.topics[0] === decreaseEvent.topics[0] // Match event signature
    );

    if (!log) {
      console.warn('Could not find matching log for DecreaseLiquidity event');
      return null;
    }

    // Convert to UpdateUniswapV3PositionEvent format
    return {
      eventType: 'DECREASE_LIQUIDITY',
      timestamp: new Date(Number(block.blockNumber) * 12 * 1000).toISOString(), // Approximate timestamp (12s blocks)
      blockNumber: block.blockNumber.toString(),
      transactionIndex: receipt.transactionIndex,
      logIndex: log.logIndex ?? 0,
      transactionHash: receipt.transactionHash,
      liquidity: liquidity.toString(),
      amount0: amount0.toString(),
      amount1: amount1.toString(),
    };
  } catch (error) {
    console.error('Error parsing DecreaseLiquidity event:', error);
    return null;
  }
}

/**
 * Parse Collect event from transaction receipt
 *
 * @param receipt - Transaction receipt from collect transaction
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns UpdateUniswapV3PositionEvent or null if not found
 */
export function parseCollectEvent(
  receipt: TransactionReceipt,
  nftManagerAddress: Address
): UpdateUniswapV3PositionEvent | null {
  try {
    const parsedLogs = parseEventLogs({
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      logs: receipt.logs,
      eventName: 'Collect',
    });

    // Find the Collect event
    const collectEvent = parsedLogs.find(
      (log) => log.address.toLowerCase() === nftManagerAddress.toLowerCase()
    );

    if (!collectEvent) {
      console.warn('Collect event not found in transaction receipt');
      return null;
    }

    // Extract event data
    const { tokenId, recipient, amount0, amount1 } = collectEvent.args;

    // Get block metadata
    const block = receipt;
    const log = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
        l.topics[0] === collectEvent.topics[0] // Match event signature
    );

    if (!log) {
      console.warn('Could not find matching log for Collect event');
      return null;
    }

    // Convert to UpdateUniswapV3PositionEvent format
    return {
      eventType: 'COLLECT',
      timestamp: new Date(Number(block.blockNumber) * 12 * 1000).toISOString(), // Approximate timestamp (12s blocks)
      blockNumber: block.blockNumber.toString(),
      transactionIndex: receipt.transactionIndex,
      logIndex: log.logIndex ?? 0,
      transactionHash: receipt.transactionHash,
      recipient: recipient,
      amount0: amount0.toString(),
      amount1: amount1.toString(),
    };
  } catch (error) {
    console.error('Error parsing Collect event:', error);
    return null;
  }
}

/**
 * Parse IncreaseLiquidity event from transaction receipt
 *
 * @param receipt - Transaction receipt from increase liquidity transaction
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns UpdateUniswapV3PositionEvent or null if not found
 */
export function parseIncreaseLiquidityEvent(
  receipt: TransactionReceipt,
  nftManagerAddress: Address
): UpdateUniswapV3PositionEvent | null {
  try {
    const parsedLogs = parseEventLogs({
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      logs: receipt.logs,
      eventName: 'IncreaseLiquidity',
    });

    // Find the IncreaseLiquidity event
    const increaseEvent = parsedLogs.find(
      (log) => log.address.toLowerCase() === nftManagerAddress.toLowerCase()
    );

    if (!increaseEvent) {
      console.warn('IncreaseLiquidity event not found in transaction receipt');
      return null;
    }

    // Extract event data
    const { tokenId, liquidity, amount0, amount1 } = increaseEvent.args;

    // Get block metadata
    const block = receipt;
    const log = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
        l.topics[0] === increaseEvent.topics[0] // Match event signature
    );

    if (!log) {
      console.warn('Could not find matching log for IncreaseLiquidity event');
      return null;
    }

    // Convert to UpdateUniswapV3PositionEvent format
    return {
      eventType: 'INCREASE_LIQUIDITY',
      timestamp: new Date(Number(block.blockNumber) * 12 * 1000).toISOString(), // Approximate timestamp (12s blocks)
      blockNumber: block.blockNumber.toString(),
      transactionIndex: receipt.transactionIndex,
      logIndex: log.logIndex ?? 0,
      transactionHash: receipt.transactionHash,
      liquidity: liquidity.toString(),
      amount0: amount0.toString(),
      amount1: amount1.toString(),
    };
  } catch (error) {
    console.error('Error parsing IncreaseLiquidity event:', error);
    return null;
  }
}
