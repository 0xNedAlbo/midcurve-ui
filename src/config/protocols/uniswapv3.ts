/**
 * Uniswap V3 Protocol Configuration
 *
 * This file defines which EVM chains support Uniswap V3 and protocol-specific
 * contract addresses. Each protocol (PancakeSwap, Aerodrome, etc.) will have
 * its own config file defining its supported chains.
 */

import type { EvmChainSlug, ChainMetadata } from '../chains';
import { CHAIN_METADATA } from '../chains';

/**
 * Chains where Uniswap V3 is deployed and supported
 *
 * Note: BSC is NOT included (PancakeSwap V3 is the alternative on BSC)
 */
export const UNISWAPV3_SUPPORTED_CHAINS: readonly EvmChainSlug[] = [
  'ethereum',
  'arbitrum',
  'base',
  'polygon',
  'optimism',
] as const;

/**
 * Type for UniswapV3-supported chains only
 */
export type UniswapV3ChainSlug = (typeof UNISWAPV3_SUPPORTED_CHAINS)[number];

/**
 * Get chain metadata for a specific UniswapV3-supported chain
 */
export function getUniswapV3ChainMetadata(
  slug: EvmChainSlug
): ChainMetadata | undefined {
  if (!UNISWAPV3_SUPPORTED_CHAINS.includes(slug)) {
    return undefined;
  }
  return CHAIN_METADATA[slug];
}

/**
 * Check if a chain supports UniswapV3
 */
export function isUniswapV3SupportedChain(
  slug: string
): slug is UniswapV3ChainSlug {
  return UNISWAPV3_SUPPORTED_CHAINS.includes(slug as EvmChainSlug);
}

/**
 * Get all UniswapV3 chain metadata (for wizard dropdowns, filters, etc.)
 */
export function getAllUniswapV3Chains(): ChainMetadata[] {
  return UNISWAPV3_SUPPORTED_CHAINS.map((slug) => CHAIN_METADATA[slug]);
}

/**
 * UniswapV3 Factory Contract Addresses
 *
 * Used for pool discovery and validation
 */
export const UNISWAPV3_FACTORY_ADDRESSES: Partial<
  Record<EvmChainSlug, string>
> = {
  ethereum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  polygon: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  optimism: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  // Note: BSC uses PancakeSwap V3, not Uniswap V3
};

/**
 * UniswapV3 NonfungiblePositionManager Contract Addresses
 *
 * Used for transaction execution (minting, increasing liquidity, etc.)
 */
export const UNISWAPV3_POSITION_MANAGER_ADDRESSES: Partial<
  Record<EvmChainSlug, string>
> = {
  ethereum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  arbitrum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  base: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  polygon: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  optimism: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  // Note: BSC uses PancakeSwap V3, not Uniswap V3
};

/**
 * Get UniswapV3 factory address for a specific chain
 */
export function getUniswapV3FactoryAddress(
  slug: UniswapV3ChainSlug
): string | undefined {
  return UNISWAPV3_FACTORY_ADDRESSES[slug];
}

/**
 * Get UniswapV3 position manager address for a specific chain
 */
export function getUniswapV3PositionManagerAddress(
  slug: UniswapV3ChainSlug
): string | undefined {
  return UNISWAPV3_POSITION_MANAGER_ADDRESSES[slug];
}
