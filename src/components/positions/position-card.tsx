"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, MoreVertical } from "lucide-react";
import type { ListPositionData } from "@midcurve/api-shared";
import { PositionCardHeader } from "./position-card-header";
import { PositionCardMetrics } from "./position-card-metrics";
import { UniswapV3Identifier } from "./protocol/uniswapv3/uniswapv3-identifier";
import { UniswapV3RangeStatus } from "./protocol/uniswapv3/uniswapv3-range-status";
import { UniswapV3ChainBadge } from "./protocol/uniswapv3/uniswapv3-chain-badge";
import { UniswapV3Actions } from "./protocol/uniswapv3/uniswapv3-actions";
import { UniswapV3MiniPnLCurve } from "./protocol/uniswapv3/uniswapv3-mini-pnl-curve";

interface PositionCardProps {
  position: ListPositionData;
}

export function PositionCard({ position }: PositionCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract common data (works for ALL protocols)
  const quoteToken = position.isToken0Quote
    ? position.pool.token0
    : position.pool.token1;

  const baseToken = position.isToken0Quote
    ? position.pool.token1
    : position.pool.token0;

  // Calculate in-range status (protocol-agnostic dispatcher)
  const isInRange = calculateIsInRange(position);

  // Placeholder refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
    console.log("Refresh clicked - functionality not implemented yet");
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all duration-200">
      <div className="flex items-center">
        {/* LEFT: Header (protocol-agnostic with protocol-specific slots) */}
        <PositionCardHeader
          baseToken={baseToken}
          quoteToken={quoteToken}
          status={position.isActive ? "active" : "closed"}
          protocol={position.protocol}
          statusLineBadges={
            position.protocol === "uniswapv3" ? (
              <UniswapV3RangeStatus position={position} />
            ) : null
          }
          protocolLineBadges={
            position.protocol === "uniswapv3" ? (
              <>
                <UniswapV3ChainBadge position={position} />
                <UniswapV3Identifier position={position} />
              </>
            ) : null
          }
        />

        {/* MIDDLE: Metrics (protocol-agnostic) */}
        <PositionCardMetrics
          currentValue={position.currentValue}
          unrealizedPnl={position.unrealizedPnl}
          unClaimedFees={position.unClaimedFees}
          currentCostBasis={position.currentCostBasis}
          lastFeesCollectedAt={position.lastFeesCollectedAt}
          positionOpenedAt={position.positionOpenedAt}
          quoteToken={quoteToken}
          isActive={position.isActive}
          isInRange={isInRange}
          pnlCurveSlot={
            position.protocol === "uniswapv3" ? (
              <UniswapV3MiniPnLCurve position={position} />
            ) : null
          }
        />

        {/* RIGHT: Common Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            href={`/position/${position.protocol}/${getPositionPath(position)}`}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
            title="View Details"
          >
            <Search className="w-4 h-4 text-slate-400" />
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-400 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
          <button
            onClick={() => console.log("Actions menu clicked")}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
            title="More actions"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Action Buttons Row (protocol-specific) */}
      {position.protocol === "uniswapv3" && (
        <UniswapV3Actions position={position} isInRange={isInRange} />
      )}
      {/* Future: Orca, other protocols */}
    </div>
  );
}

// Protocol-agnostic helper functions
function calculateIsInRange(position: ListPositionData): boolean {
  if (!position.isActive) return false;

  switch (position.protocol) {
    case "uniswapv3": {
      const config = position.config as {
        tickLower: number;
        tickUpper: number;
      };
      const poolState = position.pool.state as {
        currentTick: number;
      };
      return (
        poolState.currentTick >= config.tickLower &&
        poolState.currentTick <= config.tickUpper
      );
    }
    // Future: Add Orca, other protocols
    default:
      return false;
  }
}

function getPositionPath(position: ListPositionData): string {
  switch (position.protocol) {
    case "uniswapv3": {
      const config = position.config as {
        chainId: number;
        nftId: number;
      };
      return `${config.chainId}/${config.nftId}`;
    }
    // Future: Add Orca, other protocols
    default:
      return position.id;
  }
}
