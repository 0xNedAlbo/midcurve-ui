'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import type { Address } from 'viem';
import type { EvmChainSlug } from '@/config/chains';
import type { PoolDiscoveryResult } from '@midcurve/shared';
import { getTokenAmountsFromLiquidity, getTokenMapping } from '@midcurve/shared';
import type { TokenSearchResult } from '@/hooks/positions/wizard/useTokenSearch';
import { useTokenApproval } from '@/hooks/positions/wizard/useTokenApproval';
import { useMintPosition } from '@/hooks/positions/wizard/useMintPosition';
import { useCreatePositionAPI } from '@/hooks/positions/wizard/useCreatePositionAPI';
import { usePoolPrice } from '@/hooks/pools/usePoolPrice';
import { useTokenBalance } from '@/hooks/tokens/useTokenBalance';
import { WalletBalanceSection } from './shared/wallet-balance-section';
import {
  InsufficientFundsAlert,
  type InsufficientFundsInfo,
} from './shared/insufficient-funds-alert';
import { TransactionStepsList } from './shared/transaction-steps-list';
import { PositionSizeConfig } from './position-size-config';
import { CHAIN_METADATA } from '@/config/chains';

interface OpenPositionStepProps {
  chain: EvmChainSlug;
  baseToken: TokenSearchResult;
  quoteToken: TokenSearchResult;
  pool: PoolDiscoveryResult<'uniswapv3'>;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  onLiquidityChange: (liquidity: bigint) => void;
  onPositionCreated: (position: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

/**
 * Step 5: Open Position
 *
 * Final wizard step that handles:
 * 1. Position summary display
 * 2. Wallet balance validation with CowSwap top-up option
 * 3. Three-phase transaction execution (approve base, approve quote, mint)
 * 4. Database position creation via API
 * 5. Success state and navigation
 */
export function OpenPositionStep({
  chain,
  baseToken,
  quoteToken,
  pool,
  tickLower,
  tickUpper,
  liquidity,
  onLiquidityChange,
  onPositionCreated,
  onValidationChange,
}: OpenPositionStepProps) {
  const { address: userAddress, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const chainConfig = CHAIN_METADATA[chain];
  const expectedChainId = chainConfig.chainId;

  // Check if on wrong network
  const isWrongNetwork = isConnected && connectedChainId !== expectedChainId;

  // Fetch latest pool price (with refresh capability)
  const { refetch: refetchPoolPrice } = usePoolPrice({
    chainId: pool.pool.config.chainId.toString(),
    poolAddress: pool.pool.config.address,
    enabled: true,
  });

  // Calculate required token amounts from liquidity
  const { token0Amount, token1Amount} = useMemo(() => {
    return getTokenAmountsFromLiquidity(
      liquidity,
      BigInt(pool.pool.state.sqrtPriceX96),
      tickLower,
      tickUpper,
      false // roundUp = false for floor amounts
    );
  }, [liquidity, pool.pool.state.sqrtPriceX96, tickLower, tickUpper]);

  // Map token0/token1 to base/quote
  const tokenMapping = useMemo(() => {
    return getTokenMapping(
      pool.pool.token0.config.address,
      pool.pool.token1.config.address,
      baseToken.address,
      quoteToken.address
    );
  }, [pool.pool.token0.config.address, pool.pool.token1.config.address, baseToken.address, quoteToken.address]);

  const requiredBaseAmount = tokenMapping.baseIsToken0
    ? token0Amount
    : token1Amount;
  const requiredQuoteAmount = tokenMapping.baseIsToken0
    ? token1Amount
    : token0Amount;

  // Fetch wallet balances with 5-second polling via backend API
  const baseBalanceQuery = useTokenBalance({
    walletAddress: userAddress || null,
    tokenAddress: baseToken.address,
    chainId: expectedChainId,
    enabled: isConnected && !isWrongNetwork,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const quoteBalanceQuery = useTokenBalance({
    walletAddress: userAddress || null,
    tokenAddress: quoteToken.address,
    chainId: expectedChainId,
    enabled: isConnected && !isWrongNetwork,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const baseBalance = baseBalanceQuery.balanceBigInt || 0n;
  const quoteBalance = quoteBalanceQuery.balanceBigInt || 0n;

  // Check for insufficient funds
  const insufficientFunds: InsufficientFundsInfo | null = useMemo(() => {
    if (!isConnected || isWrongNetwork) return null;

    const needsBase = baseBalance < requiredBaseAmount;
    const needsQuote = quoteBalance < requiredQuoteAmount;

    if (!needsBase && !needsQuote) return null;

    return {
      needsBase,
      needsQuote,
      missingBase: needsBase ? requiredBaseAmount - baseBalance : 0n,
      missingQuote: needsQuote ? requiredQuoteAmount - quoteBalance : 0n,
    };
  }, [
    isConnected,
    isWrongNetwork,
    baseBalance,
    quoteBalance,
    requiredBaseAmount,
    requiredQuoteAmount,
  ]);

  // Token approval hooks
  const baseApproval = useTokenApproval({
    tokenAddress: baseToken.address as Address,
    ownerAddress: userAddress ?? null,
    requiredAmount: requiredBaseAmount,
    chainId: expectedChainId,
    enabled:
      isConnected && !isWrongNetwork && requiredBaseAmount > 0n && !insufficientFunds,
  });

  const quoteApproval = useTokenApproval({
    tokenAddress: quoteToken.address as Address,
    ownerAddress: userAddress ?? null,
    requiredAmount: requiredQuoteAmount,
    chainId: expectedChainId,
    enabled:
      isConnected &&
      !isWrongNetwork &&
      requiredQuoteAmount > 0n &&
      !insufficientFunds,
  });

  // Mint position hook
  const mintParams = useMemo(() => {
    if (
      !userAddress ||
      !isConnected ||
      isWrongNetwork ||
      insufficientFunds ||
      (requiredBaseAmount > 0n && !baseApproval.isApproved) ||
      (requiredQuoteAmount > 0n && !quoteApproval.isApproved)
    ) {
      return null;
    }

    return {
      token0: pool.pool.token0.config.address as Address,
      token1: pool.pool.token1.config.address as Address,
      fee: pool.pool.config.feeBps,
      tickLower,
      tickUpper,
      amount0Desired: token0Amount,
      amount1Desired: token1Amount,
      tickSpacing: pool.pool.config.tickSpacing,
      recipient: userAddress,
      chainId: expectedChainId,
      slippageBps: 50, // 0.5% slippage
    };
  }, [
    userAddress,
    isConnected,
    isWrongNetwork,
    insufficientFunds,
    requiredBaseAmount,
    requiredQuoteAmount,
    baseApproval.isApproved,
    quoteApproval.isApproved,
    pool,
    tickLower,
    tickUpper,
    token0Amount,
    token1Amount,
    expectedChainId,
  ]);

  const mintPosition = useMintPosition(mintParams);

  // API hook for creating position in database
  const createPositionAPI = useCreatePositionAPI();

  // Trigger API call after successful mint
  useEffect(() => {
    if (
      mintPosition.isSuccess &&
      mintPosition.tokenId &&
      mintPosition.receipt &&
      userAddress &&
      !createPositionAPI.isPending &&
      !createPositionAPI.isSuccess
    ) {
      createPositionAPI.mutate({
        chainId: chain,
        nftId: mintPosition.tokenId.toString(),
        poolAddress: pool.pool.config.address as Address,
        tickLower,
        tickUpper,
        ownerAddress: userAddress,
        quoteTokenAddress: quoteToken.address as Address,
        receipt: mintPosition.receipt,
      });
    }
  }, [
    mintPosition.isSuccess,
    mintPosition.tokenId,
    mintPosition.receipt,
    userAddress,
    createPositionAPI.isPending,
    createPositionAPI.isSuccess,
    chain,
    pool.pool.config.address,
    tickLower,
    tickUpper,
    quoteToken.address,
    createPositionAPI,
  ]);

  // Notify parent when position is fully created
  useEffect(() => {
    if (createPositionAPI.isSuccess && createPositionAPI.data) {
      onPositionCreated(createPositionAPI.data);
    }
  }, [createPositionAPI.isSuccess, createPositionAPI.data, onPositionCreated]);

  // Validation state for parent
  useEffect(() => {
    const canProceed =
      isConnected &&
      !isWrongNetwork &&
      !insufficientFunds &&
      !baseBalanceQuery.isLoading &&
      !quoteBalanceQuery.isLoading;

    onValidationChange(canProceed);
  }, [
    isConnected,
    isWrongNetwork,
    insufficientFunds,
    baseBalanceQuery.isLoading,
    quoteBalanceQuery.isLoading,
    onValidationChange,
  ]);

  // Can execute transactions?
  const canExecuteTransactions =
    isConnected && !isWrongNetwork && !insufficientFunds;

  // Handle approval clicks
  const handleApproval = (tokenType: 'base' | 'quote') => {
    if (tokenType === 'base') {
      baseApproval.approve();
    } else {
      quoteApproval.approve();
    }
  };

  // Handle mint click
  const handleOpenPosition = () => {
    mintPosition.mint();
  };

  // Create poolData structure for child components
  const poolData = {
    token0: {
      address: pool.pool.token0.config.address,
      symbol: pool.pool.token0.symbol,
      decimals: pool.pool.token0.decimals,
    },
    token1: {
      address: pool.pool.token1.config.address,
      symbol: pool.pool.token1.symbol,
      decimals: pool.pool.token1.decimals,
    },
  };

  return (
    <div className="space-y-6">
      {/* Position Size Configuration */}
      <PositionSizeConfig
        pool={pool.pool}
        baseToken={pool.pool.token0.config.address.toLowerCase() === baseToken.address.toLowerCase()
          ? pool.pool.token0 as any
          : pool.pool.token1 as any
        }
        quoteToken={pool.pool.token0.config.address.toLowerCase() === quoteToken.address.toLowerCase()
          ? pool.pool.token0 as any
          : pool.pool.token1 as any
        }
        tickLower={tickLower}
        tickUpper={tickUpper}
        liquidity={liquidity}
        onLiquidityChange={onLiquidityChange}
        chain={chain}
        label="Final Position Size:"
        onRefreshPool={refetchPoolPrice}
      />

      {/* Wallet Balance Section */}
      <WalletBalanceSection
        pool={poolData}
        baseTokenAddress={baseToken.address}
        quoteTokenAddress={quoteToken.address}
        baseBalance={baseBalance}
        quoteBalance={quoteBalance}
        baseBalanceLoading={baseBalanceQuery.isLoading}
        quoteBalanceLoading={quoteBalanceQuery.isLoading}
        isConnected={isConnected}
        isWrongNetwork={isWrongNetwork}
        chain={chain}
      />

      {/* Insufficient Funds Alert with CowSwap Widget */}
      {insufficientFunds && (
        <InsufficientFundsAlert
          insufficientFunds={insufficientFunds}
          pool={poolData}
          baseTokenAddress={baseToken.address}
          quoteTokenAddress={quoteToken.address}
          isConnected={isConnected}
          chain={chain}
        />
      )}

      {/* Transaction Steps List */}
      <TransactionStepsList
        pool={poolData}
        baseTokenAddress={baseToken.address}
        quoteTokenAddress={quoteToken.address}
        requiredBaseAmount={requiredBaseAmount}
        requiredQuoteAmount={requiredQuoteAmount}
        baseApproval={baseApproval}
        quoteApproval={quoteApproval}
        mintPosition={mintPosition}
        canExecuteTransactions={canExecuteTransactions}
        isConnected={isConnected}
        chain={chain}
        onApproval={handleApproval}
        onOpenPosition={handleOpenPosition}
      />

      {/* Success State */}
      {createPositionAPI.isSuccess && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Position Created Successfully!
          </h3>
          <p className="text-slate-300 mb-4">
            Your Uniswap V3 position has been opened and is now active.
          </p>
          {mintPosition.tokenId && (
            <p className="text-sm text-slate-400 mb-6">
              Position NFT ID: #{mintPosition.tokenId.toString()}
            </p>
          )}
        </div>
      )}

      {/* API Error */}
      {createPositionAPI.isError && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">
            Error creating position in database:{' '}
            {createPositionAPI.error instanceof Error
              ? createPositionAPI.error.message
              : 'Unknown error'}
          </p>
        </div>
      )}
    </div>
  );
}
