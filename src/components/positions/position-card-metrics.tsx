/**
 * PositionCardMetrics - Protocol-agnostic metrics display
 *
 * Displays position value, PnL, unclaimed fees, and APR.
 * Works for all protocols (Uniswap V3, Orca, etc.)
 */

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatPnL, formatPercentage, calculateAPR } from "@/lib/format-helpers";

interface Token {
  symbol: string;
  decimals: number;
}

interface PositionCardMetricsProps {
  currentValue: string; // BigInt as string (quote token units)
  unrealizedPnl: string; // BigInt as string (quote token units)
  unClaimedFees: string; // BigInt as string (quote token units)
  currentCostBasis: string; // BigInt as string (quote token units)
  lastFeesCollectedAt: string | null; // ISO timestamp or null
  positionOpenedAt: string; // ISO timestamp
  quoteToken: Token;
  isActive: boolean; // Used for visual cues
  isInRange: boolean; // Used for APR calculation
}

export function PositionCardMetrics({
  currentValue,
  unrealizedPnl,
  unClaimedFees,
  currentCostBasis,
  lastFeesCollectedAt,
  positionOpenedAt,
  quoteToken,
  isActive: _isActive, // Reserved for future visual cues
  isInRange,
}: PositionCardMetricsProps) {
  // Format display values
  const formattedValue = formatCurrency(currentValue, quoteToken.decimals);
  const pnlFormatted = formatPnL(unrealizedPnl, quoteToken.decimals);
  const formattedFees = formatCurrency(unClaimedFees, quoteToken.decimals);

  // Calculate APR
  const apr = calculateAPR({
    costBasis: currentCostBasis,
    unClaimedFees,
    lastFeesCollectedAt,
    positionOpenedAt,
    isInRange,
    decimals: quoteToken.decimals,
  });

  const pnlBigInt = BigInt(unrealizedPnl);

  return (
    <div className="flex items-center gap-8 ml-auto mr-auto">
      {/* Current Value */}
      <div className="text-right min-w-[120px]">
        <div className="text-xs text-slate-400 mb-1">
          Current Value ({quoteToken.symbol})
        </div>
        <div className="text-base font-semibold text-white">
          {formattedValue}
        </div>
      </div>

      {/* PnL Curve Visualization - Placeholder */}
      <div className="text-right">
        <div className="text-xs text-slate-400 mb-1">PnL Curve</div>
        <div className="flex justify-end">
          <div className="w-[100px] h-[50px] bg-slate-700/30 rounded border border-slate-600/50 flex items-center justify-center">
            <span className="text-xs text-slate-500">Chart</span>
          </div>
        </div>
      </div>

      {/* Total PnL */}
      <div className="text-right min-w-[120px]">
        <div className="text-xs text-slate-400 mb-1">
          Total PnL ({quoteToken.symbol})
        </div>
        <div className={`text-base font-semibold ${pnlFormatted.colorClass}`}>
          <div className="flex items-center justify-end gap-1">
            {pnlBigInt > 0n ? (
              <TrendingUp className="w-3 h-3" />
            ) : pnlBigInt < 0n ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>{pnlFormatted.text}</span>
          </div>
        </div>
      </div>

      {/* Unclaimed Fees */}
      <div className="text-right min-w-[100px]">
        <div className="text-xs text-slate-400 mb-1">
          Unclaimed Fees ({quoteToken.symbol})
        </div>
        <div className={`text-base font-semibold ${
          BigInt(unClaimedFees) > 0n ? "text-amber-400" : "text-white"
        }`}>
          {formattedFees}
        </div>
      </div>

      {/* APR */}
      <div className="text-right min-w-[80px]">
        <div className="text-xs text-slate-400 mb-1">est. APR</div>
        <div className="text-base font-semibold text-white">
          {formatPercentage(apr, 2)}
        </div>
      </div>
    </div>
  );
}
