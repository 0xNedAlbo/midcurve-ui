/**
 * Uniswap V3 NonfungiblePositionManager Contract Configuration
 *
 * Contract addresses and ABI for the NonfungiblePositionManager contract
 * across all supported EVM chains.
 *
 * Note: BSC uses PancakeSwap V3, which has a different contract address.
 */

import type { Address } from 'viem';

/**
 * NonfungiblePositionManager contract addresses by chain ID
 */
export const NONFUNGIBLE_POSITION_MANAGER_ADDRESSES: Record<number, Address> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Ethereum
  42161: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Arbitrum
  8453: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', // Base
  137: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Polygon
  10: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Optimism
  56: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613', // BSC (PancakeSwap V3)
};

/**
 * Get NonfungiblePositionManager address for a given chain ID
 */
export function getNonfungiblePositionManagerAddress(
  chainId: number
): Address | undefined {
  return NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];
}

/**
 * Minimal NonfungiblePositionManager ABI
 * Contains only the mint() function for position creation
 */
export const NONFUNGIBLE_POSITION_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'mint',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  // Transfer event for extracting tokenId
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const;
