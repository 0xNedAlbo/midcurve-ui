"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import type { ListPositionData } from "@midcurve/api-shared";
import { PositionCardHeader } from "./position-card-header";
import { PositionCardMetrics } from "./position-card-metrics";
import { UniswapV3Identifier } from "./protocol/uniswapv3/uniswapv3-identifier";
import { UniswapV3RangeStatus } from "./protocol/uniswapv3/uniswapv3-range-status";
import { UniswapV3ChainBadge } from "./protocol/uniswapv3/uniswapv3-chain-badge";
import { UniswapV3Actions } from "./protocol/uniswapv3/uniswapv3-actions";
import { UniswapV3MiniPnLCurve } from "./protocol/uniswapv3/uniswapv3-mini-pnl-curve";
import { PositionActionsMenu } from "./position-actions-menu";
import { DeletePositionModal } from "./delete-position-modal";
import { useIsDeletingPosition } from "@/hooks/positions/useDeletePosition";

interface PositionCardProps {
  position: ListPositionData;
}

export function PositionCard({ position }: PositionCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check if this specific position is being deleted
  const isDeleting = useIsDeletingPosition(position.id);

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
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 md:p-4 lg:p-6 hover:border-slate-600/50 transition-all duration-200">
      <div className="flex items-center gap-2 md:gap-3">
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

        {/* MIDDLE: Metrics (protocol-agnostic) - grouped with consistent gaps */}
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

        {/* RIGHT: Common Actions - pushed to the right with ml-auto */}
        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          <Link
            href={`/position/${position.protocol}/${getPositionPath(position)}`}
            className="p-1.5 md:p-2 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
            title="View Details"
          >
            <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 md:p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
          <PositionActionsMenu
            onDelete={() => setShowDeleteModal(true)}
            isDeleting={isDeleting}
          />
        </div>
      </div>

      {/* Action Buttons Row (protocol-specific) */}
      {position.protocol === "uniswapv3" && (
        <UniswapV3Actions position={position} isInRange={isInRange} />
      )}
      {/* Future: Orca, other protocols */}

      {/* Delete Position Modal */}
      <DeletePositionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        position={position}
        onDeleteSuccess={() => {
          // Modal closes automatically after cache invalidation completes
        }}
      />
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
