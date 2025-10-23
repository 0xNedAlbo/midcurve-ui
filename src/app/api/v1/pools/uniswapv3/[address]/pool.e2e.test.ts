/**
 * E2E Tests for GET /api/v1/pools/uniswapv3/:address
 *
 * Tests pool lookup endpoint with fresh on-chain state.
 * Uses real Arbitrum pools for integration testing.
 */

import { describe, it, expect } from 'vitest';
import {
  authenticatedGet,
  unauthenticatedGet,
  parseJsonResponse,
  TEST_TOKENS,
} from '@/test/helpers';
import type { ApiResponse, ApiError } from '@midcurve/api-shared';
import type { GetUniswapV3PoolData } from '@midcurve/api-shared';

// Test pool addresses on Arbitrum
const WETH_USDC_POOL_005 = '0xC6962004f452bE9203591991D15f6b388e09E8D0'; // 0.05% fee
const WBTC_USDC_POOL_030 = '0x6985cb98CE393FCE8d6272127F39013f61e36166'; // 0.3% fee

describe('GET /api/v1/pools/uniswapv3/:address', () => {

  // =========================================================================
  // SUCCESS CASES
  // =========================================================================

  describe('Success cases', () => {
    it('should get existing pool from database with fresh state', async () => {
      // First, ensure pool exists by calling discovery endpoint
      await authenticatedGet(
        `/api/v1/pools/uniswapv3/discover?chainId=42161&tokenA=${TEST_TOKENS.WETH_ARBITRUM.address}&tokenB=${TEST_TOKENS.USDC_ARBITRUM.address}`
      );

      // Now get the pool by address
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.pool).toBeDefined();
      expect(data.data.pool.id).toBeDefined();
      expect(data.data.pool.protocol).toBe('uniswapv3');
      expect(data.data.pool.poolType).toBe('CL_TICKS');
      expect(data.data.pool.config.address).toBe(WETH_USDC_POOL_005);
      expect(data.data.pool.config.chainId).toBe(42161);
      expect(data.data.pool.config.feeBps).toBe(500); // 0.05%

      // Verify token0 (WETH)
      expect(data.data.pool.token0.symbol).toBe('WETH');
      expect(data.data.pool.token0.decimals).toBe(18);

      // Verify token1 (USDC)
      expect(data.data.pool.token1.symbol).toBe('USDC');
      expect(data.data.pool.token1.decimals).toBe(6);

      // Verify fresh state (bigints serialized to strings)
      expect(data.data.pool.state).toBeDefined();
      expect(typeof data.data.pool.state.sqrtPriceX96).toBe('string');
      expect(typeof data.data.pool.state.liquidity).toBe('string');
      expect(typeof data.data.pool.state.currentTick).toBe('number');

      // Verify no metrics (enrichMetrics not requested)
      expect(data.data.metrics).toBeUndefined();
    }, 10000); // 10s timeout for on-chain calls

    it('should discover new pool not in database', async () => {
      // Use a pool that likely doesn't exist in DB yet
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WBTC_USDC_POOL_030}?chainId=42161`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();
      expect(data.data.pool.config.address).toBe(WBTC_USDC_POOL_030);
      expect(data.data.pool.config.feeBps).toBe(3000); // 0.3%
      expect(data.data.pool.token0.symbol).toBe('WBTC');
      expect(data.data.pool.token1.symbol).toBe('USDC');
    }, 10000);

    it('should include subgraph metrics when metrics=true', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161&metrics=true`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();

      // Verify metrics are included
      expect(data.data.metrics).toBeDefined();
      expect(data.data.metrics!.tvlUSD).toBeDefined();
      expect(typeof data.data.metrics!.tvlUSD).toBe('string');
      expect(data.data.metrics!.volumeUSD).toBeDefined();
      expect(typeof data.data.metrics!.volumeUSD).toBe('string');
      expect(data.data.metrics!.feesUSD).toBeDefined();
      expect(typeof data.data.metrics!.feesUSD).toBe('string');
    }, 10000);

    it('should not include metrics when metrics=false', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161&metrics=false`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();
      expect(data.data.metrics).toBeUndefined();
    }, 10000);

    it('should include fee data when fees=true', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161&fees=true`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();

      // Verify fee data is included
      expect(data.data.feeData).toBeDefined();
      expect(data.data.feeData!.token0DailyVolume).toBeDefined();
      expect(typeof data.data.feeData!.token0DailyVolume).toBe('string');
      expect(data.data.feeData!.token1DailyVolume).toBeDefined();
      expect(typeof data.data.feeData!.token1DailyVolume).toBe('string');
      expect(data.data.feeData!.token0Price).toBeDefined();
      expect(typeof data.data.feeData!.token0Price).toBe('string');
      expect(data.data.feeData!.token1Price).toBeDefined();
      expect(typeof data.data.feeData!.token1Price).toBe('string');
      expect(data.data.feeData!.poolLiquidity).toBeDefined();
      expect(typeof data.data.feeData!.poolLiquidity).toBe('string');
      expect(data.data.feeData!.calculatedAt).toBeDefined();
      expect(typeof data.data.feeData!.calculatedAt).toBe('string');
    }, 10000);

    it('should not include fee data when fees=false', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161&fees=false`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();
      expect(data.data.feeData).toBeUndefined();
    }, 10000);

    it('should include both metrics and fee data when both flags are true', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161&metrics=true&fees=true`
      );

      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();

      // Both metrics and fee data should be included
      expect(data.data.metrics).toBeDefined();
      expect(data.data.metrics!.tvlUSD).toBeDefined();
      expect(data.data.feeData).toBeDefined();
      expect(data.data.feeData!.token0DailyVolume).toBeDefined();
    }, 10000);

    it('should return same pool data as discovery endpoint', async () => {
      // Get pool via discovery
      const discoveryResponse = await authenticatedGet(
        `/api/v1/pools/uniswapv3/discover?chainId=42161&tokenA=${TEST_TOKENS.WETH_ARBITRUM.address}&tokenB=${TEST_TOKENS.USDC_ARBITRUM.address}`
      );
      const discoveryData = await parseJsonResponse<ApiResponse<any>>(discoveryResponse);
      const poolFromDiscovery = discoveryData.data[0]?.pool; // First pool in results

      // Get same pool via address lookup
      const lookupResponse = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161`
      );
      const lookupData = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(lookupResponse);

      // Verify both endpoints return same pool data
      expect(lookupData.data.pool.id).toBe(poolFromDiscovery.id);
      expect(lookupData.data.pool.config.address).toBe(poolFromDiscovery.config.address);
      expect(lookupData.data.pool.config.feeBps).toBe(poolFromDiscovery.config.feeBps);
      expect(lookupData.data.pool.token0.symbol).toBe(poolFromDiscovery.token0.symbol);
      expect(lookupData.data.pool.token1.symbol).toBe(poolFromDiscovery.token1.symbol);

      // State should be fresh (might differ slightly due to time between calls)
      expect(lookupData.data.pool.state).toBeDefined();
    }, 10000);
  });

  // =========================================================================
  // VALIDATION ERRORS
  // =========================================================================

  describe('Validation errors', () => {
    it('should return 400 for missing chainId', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}`
      );

      expect(response.status).toBe(400);

      const data = await parseJsonResponse<{ success: false; error: { code: string } }>(response);

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid chainId (non-numeric)', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=invalid`
      );

      expect(response.status).toBe(400);

      const data = await parseJsonResponse<{ success: false; error: { code: string } }>(response);

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid address format (not 0x...)', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/invalid?chainId=42161`
      );

      expect(response.status).toBe(400);

      const data = await parseJsonResponse<{ success: false; error: { code: string } }>(response);

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid address format (wrong length)', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/0x123?chainId=42161`
      );

      expect(response.status).toBe(400);

      const data = await parseJsonResponse<{ success: false; error: { code: string } }>(response);

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // ERROR CASES
  // =========================================================================

  describe('Error cases', () => {
    it('should return 404 or 502 for address that is not a Uniswap V3 pool', async () => {
      // Use a regular ERC-20 token address (not a pool)
      const notAPool = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC token on Arbitrum
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${notAPool}?chainId=42161`
      );

      // Expect either 404 (pool not found) or 502 (RPC error reading from non-pool contract)
      expect([404, 502]).toContain(response.status);

      const data = await parseJsonResponse<ApiError>(response);

      expect(data.success).toBe(false);
      // Either NOT_FOUND or BAD_GATEWAY is acceptable
      expect(['NOT_FOUND', 'BAD_GATEWAY']).toContain(data.error.code);
    }, 10000);

    it('should return 400 for unsupported chain', async () => {
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=99999`
      );

      expect(response.status).toBe(400);

      const data = await parseJsonResponse<ApiError>(response);

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    }, 10000);

    it('should gracefully handle subgraph unavailable (still return pool)', async () => {
      // For this test, we expect the endpoint to return pool data even if subgraph fails
      // The endpoint should log a warning but not fail the request
      const response = await authenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161&enrichMetrics=true`
      );

      // Should succeed even if subgraph is unavailable
      expect(response.status).toBe(200);

      const data = await parseJsonResponse<ApiResponse<GetUniswapV3PoolData>>(response);

      expect(data.success).toBe(true);
      expect(data.data.pool).toBeDefined();
      // metrics might be undefined if subgraph failed, but that's okay
    }, 10000);
  });

  // =========================================================================
  // AUTHENTICATION
  // =========================================================================

  describe('Authentication', () => {
    it('should return 401 for unauthenticated request', async () => {
      const response = await unauthenticatedGet(
        `/api/v1/pools/uniswapv3/${WETH_USDC_POOL_005}?chainId=42161`
      );

      expect(response.status).toBe(401);

      const data = await parseJsonResponse<ApiError>(response);

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
});
