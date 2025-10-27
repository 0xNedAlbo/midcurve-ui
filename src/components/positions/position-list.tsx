"use client";

import { useState, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { PositionCard } from "./position-card";
import { EmptyStateActions } from "./empty-state-actions";
import { usePositionsList } from "@/hooks/positions/usePositionsList";
import type { ListPositionsParams } from "@midcurve/api-shared";

// Chain ID to name mapping for client-side filtering
const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: "ethereum",
  42161: "arbitrum",
  8453: "base",
};

function getChainName(chainId: number): string {
  return CHAIN_ID_TO_NAME[chainId] || "unknown";
}

interface PositionListProps {
  className?: string;
}

export function PositionList({ className }: PositionListProps) {
  // Filter state
  const [sortBy, setSortBy] = useState<ListPositionsParams["sortBy"]>("createdAt");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">("active");
  const [filterChain, setFilterChain] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Build API query params
  const queryParams = useMemo<ListPositionsParams>(
    () => ({
      status: filterStatus,
      sortBy,
      sortDirection: "desc",
      limit,
      offset,
    }),
    [filterStatus, sortBy, offset]
  );

  // Fetch positions from API
  const { data, isLoading, error, refetch } = usePositionsList(queryParams);

  // Client-side chain filtering (API doesn't support chain filter)
  const filteredPositions = useMemo(() => {
    if (!data?.data) return [];

    if (filterChain === "all") {
      return data.data;
    }

    return data.data.filter((position) => {
      // Extract chainId from position config (protocol-specific)
      if (position.protocol === "uniswapv3") {
        const config = position.config as { chainId: number };
        const chainName = getChainName(config.chainId);
        return chainName === filterChain;
      }
      return false;
    });
  }, [data, filterChain]);

  // Pagination info
  const pagination = data?.pagination;
  const hasMore = pagination ? pagination.hasMore : false;
  const total = pagination ? pagination.total : 0;

  // Handle filter changes (reset offset on filter change)
  const handleFilterChange = (filter: {
    status?: string;
    chain?: string;
    sortBy?: string;
  }) => {
    if (filter.status) {
      setFilterStatus(filter.status as "all" | "active" | "closed");
      setOffset(0); // Reset pagination
    }
    if (filter.chain) {
      setFilterChain(filter.chain);
      // No offset reset for client-side filter
    }
    if (filter.sortBy) {
      setSortBy(filter.sortBy as ListPositionsParams["sortBy"]);
      setOffset(0); // Reset pagination
    }
  };

  // Load more handler
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      setOffset((prev) => prev + limit);
    }
  };

  // Placeholder discovery handler
  const handleDiscoverNewPositions = () => {
    console.log("Position discovery - functionality not implemented yet");
    refetch();
  };

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) =>
            handleFilterChange({
              status: e.target.value as "active" | "closed" | "archived",
            })
          }
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Positions</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>

        {/* Chain Filter */}
        <select
          value={filterChain}
          onChange={(e) => handleFilterChange({ chain: e.target.value })}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Chains</option>
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="base">Base</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="createdAt">Sort by: Created Date</option>
          <option value="updatedAt">Sort by: Updated Date</option>
          <option value="liquidity">Sort by: Liquidity</option>
        </select>

        {/* Refresh Button - Only visible when "active" filter is selected */}
        {filterStatus === "active" && (
          <button
            onClick={handleDiscoverNewPositions}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            title="Search for new active positions on all chains"
          >
            <RotateCcw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">
            Failed to load positions: {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-2 inline" />
            Retry
          </button>
        </div>
      )}

      {/* Loading State (Initial) */}
      {!error && isLoading && filteredPositions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400">Loading positions...</p>
        </div>
      )}

      {/* Empty State */}
      {!error && !isLoading && filteredPositions.length === 0 && (
        <EmptyStateActions
          onWalletImportClick={() =>
            console.log("Wallet import modal - not implemented yet")
          }
          onImportSuccess={(position) =>
            console.log("Position imported:", position)
          }
        />
      )}

      {/* Positions Grid */}
      {!error && filteredPositions.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {filteredPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 inline animate-spin" />
                    Loading more...
                  </>
                ) : (
                  `Load More (${total - filteredPositions.length} remaining)`
                )}
              </button>
            </div>
          )}

          {/* Pagination Info */}
          <div className="text-center mt-4 text-sm text-slate-400">
            Showing {filteredPositions.length} of {total} positions
          </div>
        </>
      )}
    </div>
  );
}
