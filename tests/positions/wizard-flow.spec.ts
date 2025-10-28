/**
 * Position Wizard E2E Test (Temporary)
 *
 * Tests the complete wizard flow from opening to Step 4 (Position Config)
 *
 * Flow:
 * 1. Open wizard from dashboard
 * 2. Step 0: Click through intro
 * 3. Step 1: Select Arbitrum chain
 * 4. Step 2: Select WETH as base, USDC as quote
 * 5. Step 3: Select first available pool
 * 6. Step 4: Verify position config step opens without errors
 */

import { test, expect } from '@playwright/test';
import { captureConsoleErrors, expectNoConsoleErrors, waitForPageReady } from '../fixtures/test-helpers';
import { setupAuthenticatedSession } from '../fixtures/auth';

test.describe('Position Wizard Flow', () => {
  test('should complete wizard flow through Step 4 without errors', async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);

    await test.step('Setup authenticated session', async () => {
      await setupAuthenticatedSession(page);
    });

    await test.step('Mock pool discovery API', async () => {
      // Mock the pool discovery endpoint to return a sample WETH/USDC pool on Arbitrum
      await page.route('**/api/v1/pools/uniswapv3/discover?*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                pool: {
                  id: 'uniswapv3-42161-0x123',
                  poolType: 'uniswapv3',
                  config: {
                    chainId: 42161,
                    address: '0x1234567890123456789012345678901234567890',
                    token0: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                    token1: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                    feeBps: 500,
                    tickSpacing: 10,
                  },
                  state: {
                    sqrtPriceX96: '1234567890123456789012345678',
                    currentTick: 12000,
                    liquidity: '123456789012345678',
                    observationIndex: 0,
                    observationCardinality: 1,
                    observationCardinalityNext: 1,
                    feeProtocol: 0,
                    unlocked: true,
                  },
                  token0: {
                    id: 'erc20-42161-usdc',
                    tokenType: 'evm-erc20',
                    name: 'USD Coin',
                    symbol: 'USDC',
                    decimals: 6,
                    logoUrl: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
                    config: {
                      chainId: 42161,
                      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  token1: {
                    id: 'erc20-42161-weth',
                    tokenType: 'evm-erc20',
                    name: 'Wrapped Ether',
                    symbol: 'WETH',
                    decimals: 18,
                    logoUrl: 'https://ethereum-optimism.github.io/data/WETH/logo.png',
                    config: {
                      chainId: 42161,
                      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                fee: 500,
                tvlUSD: 1234567.89,
                volumeUSD: 123456.78,
                feesUSD: 1234.56,
              },
            ],
          }),
        });
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
      await waitForPageReady(page);
    });

    await test.step('Open position wizard', async () => {
      // Look for "Add Position" button
      const addPositionButton = page.locator('button:has-text("Add Position")');
      await expect(addPositionButton).toBeVisible({ timeout: 10000 });
      await addPositionButton.click();

      // Wait for dropdown to appear
      await page.waitForTimeout(300);

      // Click "Create New Position" option in dropdown
      const createNewButton = page.locator('button:has-text("Create New Position")');
      await expect(createNewButton).toBeVisible({ timeout: 5000 });
      await createNewButton.click();

      // Wait for wizard modal to appear
      await page.waitForTimeout(500);

      // Verify wizard opened
      const wizardTitle = page.locator('h2:has-text("Create Uniswap V3 Position")');
      await expect(wizardTitle).toBeVisible({ timeout: 5000 });
    });

    await test.step('Take screenshot of wizard intro (Step 0)', async () => {
      await page.screenshot({
        path: 'test-results/wizard-step-0-intro.png',
        fullPage: true,
      });
    });

    await test.step('Step 0: Click Next on intro screen', async () => {
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      // Wait for step transition
      await page.waitForTimeout(300);

      // Verify we're on chain selection step
      const chainSelectionTitle = page.locator('h3:has-text("Select Blockchain")');
      await expect(chainSelectionTitle).toBeVisible();
    });

    await test.step('Take screenshot of chain selection (Step 1)', async () => {
      await page.screenshot({
        path: 'test-results/wizard-step-1-chain-selection.png',
        fullPage: true,
      });
    });

    await test.step('Step 1: Select Arbitrum chain', async () => {
      // Find and click Arbitrum chain card
      const arbitrumCard = page.locator('button:has-text("Arbitrum"), div[role="button"]:has-text("Arbitrum")').first();
      await expect(arbitrumCard).toBeVisible({ timeout: 5000 });
      await arbitrumCard.click();

      // Verify selection (card should have selected state)
      await page.waitForTimeout(300);

      // Click Next
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      // Wait for step transition
      await page.waitForTimeout(300);

      // Verify we're on token pair selection
      const tokenPairTitle = page.locator('h3:has-text("Choose Token Pair")');
      await expect(tokenPairTitle).toBeVisible();
    });

    await test.step('Take screenshot of token pair selection (Step 2)', async () => {
      await page.screenshot({
        path: 'test-results/wizard-step-2-token-pair.png',
        fullPage: true,
      });
    });

    await test.step('Step 2: Select WETH as base token', async () => {
      // Look for WETH in popular tokens or search
      const wethButton = page.locator('button:has-text("WETH"), button:has-text("Wrapped Ether")').first();

      // If not in popular tokens, use search
      const isWethVisible = await wethButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isWethVisible) {
        // Search for WETH
        const baseTokenSearch = page.locator('input[placeholder*="base" i], input[placeholder*="search" i]').first();
        await baseTokenSearch.fill('WETH');
        await page.waitForTimeout(500);
      }

      // Click WETH
      await wethButton.click();
      await page.waitForTimeout(300);
    });

    await test.step('Step 2: Select USDC as quote token', async () => {
      // Look for USDC in popular tokens or search
      const usdcButton = page.locator('button:has-text("USDC"), button:has-text("USD Coin")').first();

      // If not in popular tokens, use search
      const isUsdcVisible = await usdcButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isUsdcVisible) {
        // Search for USDC
        const quoteTokenSearch = page.locator('input[placeholder*="quote" i], input[placeholder*="search" i]').last();
        await quoteTokenSearch.fill('USDC');
        await page.waitForTimeout(500);
      }

      // Click USDC
      await usdcButton.click();
      await page.waitForTimeout(300);

      // Click Next
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeEnabled({ timeout: 5000 });
      await nextButton.click();

      // Wait for step transition
      await page.waitForTimeout(500);

      // Verify we're on pool selection
      const poolSelectionTitle = page.locator('h3:has-text("Select Pool")');
      await expect(poolSelectionTitle).toBeVisible({ timeout: 10000 });
    });

    await test.step('Take screenshot of pool selection (Step 3)', async () => {
      // Wait for pools to load
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/wizard-step-3-pool-selection.png',
        fullPage: true,
      });
    });

    await test.step('Step 3: Select first available pool', async () => {
      // Wait for pool cards to load - look for the fee badge within the pool card button
      const poolCard = page.locator('button:has-text("0.05% Pool")').first();
      await expect(poolCard).toBeVisible({ timeout: 10000 });

      // Click first pool card
      await poolCard.click();
      await page.waitForTimeout(300);

      // Click Next
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeEnabled({ timeout: 5000 });
      await nextButton.click();

      // Wait for step transition to Step 4
      await page.waitForTimeout(500);
    });

    await test.step('Step 4: Verify position config step loads without errors', async () => {
      // Verify we're on position config step
      const positionConfigTitle = page.locator('h3:has-text("Configure Position")');
      await expect(positionConfigTitle).toBeVisible({ timeout: 10000 });

      // Verify price range section is visible
      const priceRangeSection = page.locator('text=/Price Range/i');
      await expect(priceRangeSection).toBeVisible({ timeout: 5000 });

      // Verify position size section is visible
      const positionSizeSection = page.locator('text=/Position Size/i');
      await expect(positionSizeSection).toBeVisible({ timeout: 5000 });

      // SUCCESS: If we got here, Step 4 loaded without crashing!
      // The main goal was to verify no "Cannot read properties of undefined" errors
    });

    await test.step('Take screenshot of position config (Step 4)', async () => {
      await page.screenshot({
        path: 'test-results/wizard-step-4-position-config.png',
        fullPage: true,
      });
    });

    await test.step('Check for console errors', async () => {
      // Allow common development warnings and expected errors
      const allowedErrors = [
        /Download the React DevTools/i,
        /webpack-internal/i,
        /Failed to load resource/i, // Some images might not load in test env
        /NetworkError/i, // API calls might fail in test env without backend
      ];

      expectNoConsoleErrors(consoleErrors, allowedErrors);
    });

    await test.step('Verify Step 4 progress indicator', async () => {
      // Verify we're on step 5 of 6 (0-indexed step 4)
      const stepIndicator = page.locator('text=/Step 5 of 6/i');
      await expect(stepIndicator).toBeVisible({ timeout: 3000 });
    });
  });
});
