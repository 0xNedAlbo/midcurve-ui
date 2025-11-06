"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useUniswapV3Position } from "@/hooks/positions/uniswapv3/useUniswapV3Position";
import { PositionDetailLayout } from "@/components/positions/position-detail-layout";
import { AlertCircle, Loader2 } from "lucide-react";
import { getChainMetadata, isValidChainSlug } from "@/config/chains";
import type { EvmChainSlug } from "@/config/chains";

export default function PositionDetailPage() {
  const params = useParams();

  // Extract params
  const protocol = params?.protocol as string | undefined;
  const chainSlug = params?.chain as string | undefined;
  const nftId = params?.nftId as string | undefined;

  // Handle loading state when params aren't ready yet
  if (!protocol || !chainSlug || !nftId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-white">Loading...</h3>
              <p className="text-slate-400">Initializing page...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Validate protocol
  if (protocol !== "uniswapv3") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Invalid Protocol</h3>
              <p className="text-slate-400 max-w-md">
                Protocol &quot;{protocol}&quot; is not supported.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Validate chain slug
  if (!isValidChainSlug(chainSlug)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Invalid Chain</h3>
              <p className="text-slate-400 max-w-md">
                Chain &quot;{chainSlug}&quot; is not supported.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Convert chain slug to chainId
  const chainMetadata = getChainMetadata(chainSlug as EvmChainSlug);
  if (!chainMetadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Chain Not Found</h3>
              <p className="text-slate-400 max-w-md">
                Could not find metadata for chain &quot;{chainSlug}&quot;.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chainId = chainMetadata.chainId;

  // Fetch position using the hook
  const { data: position, isLoading, isFetching, error, refetch } = useUniswapV3Position(chainId, nftId);

  // If we have incomplete cached data, trigger a refetch
  // This can happen when React Query caches list data that doesn't have full position details
  useEffect(() => {
    if (position && !position.protocol && !isFetching) {
      refetch();
    }
  }, [position, isFetching, refetch]);

  // Loading state - check for actual loading or incomplete data
  if (isLoading || isFetching || (position && !position.protocol)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-white">Loading Position</h3>
              <p className="text-slate-400">Fetching position data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Error Loading Position</h3>
              <p className="text-slate-400 max-w-md">
                {error instanceof Error ? error.message : "Failed to fetch position data"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!position) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-amber-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-amber-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Position Not Found</h3>
              <p className="text-slate-400 max-w-md">
                Could not find position #{nftId} on {chainMetadata.name}.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render position detail
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 py-8">
        <PositionDetailLayout position={position} />
      </div>
    </div>
  );
}
