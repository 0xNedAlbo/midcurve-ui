"use client";

import { useState, useEffect, useCallback } from "react";
import type { Erc20Token } from "@midcurve/shared";
import type { PoolDiscoveryResult } from "@midcurve/shared";
import type { EvmChainSlug } from "@/config/chains";
import { TickMath } from "@uniswap/v3-sdk";
import { getTickSpacing } from "@midcurve/shared";

import { PositionRangeConfig } from "./position-range-config";
import { PositionSizeConfig } from "./position-size-config";

interface PositionConfigStepProps {
  chain: EvmChainSlug;
  baseToken: Erc20Token;
  quoteToken: Erc20Token;
  pool: PoolDiscoveryResult<"uniswapv3">;
  tickLower: number | null;
  tickUpper: number | null;
  liquidity: bigint;
  onConfigChange: (config: PositionConfig) => void;
  onValidationChange: (isValid: boolean) => void;
}

export interface PositionConfig {
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
}

export function PositionConfigStep({
  chain,
  baseToken,
  quoteToken,
  pool,
  tickLower: initialTickLower,
  tickUpper: initialTickUpper,
  liquidity: initialLiquidity,
  onConfigChange,
  onValidationChange,
}: PositionConfigStepProps) {
  // Local state for position configuration
  const [tickLower, setTickLower] = useState<number>(() => {
    if (initialTickLower !== null && !isNaN(initialTickLower)) {
      return initialTickLower;
    }
    // Default: ±10% around current price
    const currentTick = pool.pool.state.currentTick;
    const tickSpacing = getTickSpacing(pool.pool.config.feeBps);
    const lowerTick = Math.floor((currentTick - 2000) / tickSpacing) * tickSpacing;
    return Math.max(TickMath.MIN_TICK, lowerTick);
  });

  const [tickUpper, setTickUpper] = useState<number>(() => {
    if (initialTickUpper !== null && !isNaN(initialTickUpper)) {
      return initialTickUpper;
    }
    // Default: ±10% around current price
    const currentTick = pool.pool.state.currentTick;
    const tickSpacing = getTickSpacing(pool.pool.config.feeBps);
    const upperTick = Math.ceil((currentTick + 2000) / tickSpacing) * tickSpacing;
    return Math.min(TickMath.MAX_TICK, upperTick);
  });

  const [liquidity, setLiquidity] = useState<bigint>(initialLiquidity);

  // Update parent whenever config changes
  useEffect(() => {
    onConfigChange({
      tickLower,
      tickUpper,
      liquidity,
    });
  }, [tickLower, tickUpper, liquidity, onConfigChange]);

  // Validate configuration
  useEffect(() => {
    const isValid =
      tickLower < tickUpper &&
      tickLower >= TickMath.MIN_TICK &&
      tickUpper <= TickMath.MAX_TICK &&
      liquidity > 0n;

    onValidationChange(isValid);
  }, [tickLower, tickUpper, liquidity, onValidationChange]);

  // Handle tick range change from PositionRangeConfig
  const handleTickRangeChange = useCallback(
    (newTickLower: number, newTickUpper: number) => {
      setTickLower(newTickLower);
      setTickUpper(newTickUpper);
    },
    []
  );

  // Handle liquidity change from PositionSizeConfig
  const handleLiquidityChange = useCallback((newLiquidity: bigint) => {
    setLiquidity(newLiquidity);
  }, []);

  return (
    <div className="space-y-6">
      {/* Position Range Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
        <PositionRangeConfig
          pool={pool.pool}
          baseToken={baseToken}
          quoteToken={quoteToken}
          tickLower={tickLower}
          tickUpper={tickUpper}
          liquidity={liquidity}
          onTickLowerChange={setTickLower}
          onTickUpperChange={setTickUpper}
          onTickRangeChange={handleTickRangeChange}
        />
      </div>

      {/* Position Size Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
        <PositionSizeConfig
          pool={pool.pool}
          baseToken={baseToken}
          quoteToken={quoteToken}
          tickLower={tickLower}
          tickUpper={tickUpper}
          liquidity={liquidity}
          onLiquidityChange={handleLiquidityChange}
          chain={chain}
          label="Position Size:"
        />
      </div>

      {/* Validation Info */}
      {liquidity === 0n && (
        <div className="text-center text-sm text-slate-400">
          Enter token amounts to configure your position
        </div>
      )}
    </div>
  );
}
