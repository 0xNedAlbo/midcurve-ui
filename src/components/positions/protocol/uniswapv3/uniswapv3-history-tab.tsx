"use client";

import { History } from "lucide-react";
import type { GetUniswapV3PositionResponse } from "@midcurve/api-shared";

interface UniswapV3HistoryTabProps {
  position: GetUniswapV3PositionResponse;
}

export function UniswapV3HistoryTab({}: UniswapV3HistoryTabProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-slate-800/50 rounded-full">
            <History className="w-12 h-12 text-slate-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white">History Coming Soon</h3>
        <p className="text-slate-400 max-w-md">
          Historical performance data and ledger events will be available here.
        </p>
      </div>
    </div>
  );
}
