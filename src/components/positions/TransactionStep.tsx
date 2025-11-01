'use client';

import { Loader2, Check, Circle } from 'lucide-react';

interface TransactionStepProps {
  title: string;
  description: string;
  isLoading: boolean;
  isComplete: boolean;
  isDisabled: boolean;
  onExecute: () => void;
  showExecute: boolean;
}

/**
 * Transaction Step Component
 *
 * Displays a single transaction step with loading/success/execute states.
 * Used in multi-step transaction flows (e.g., withdraw, increase liquidity).
 */
export function TransactionStep({
  title,
  description,
  isLoading,
  isComplete,
  isDisabled,
  onExecute,
  showExecute,
}: TransactionStepProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Status Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isComplete ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : isLoading ? (
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        ) : (
          <Circle className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h5 className={`text-sm font-medium ${
            isComplete ? 'text-green-400' : isLoading ? 'text-blue-400' : 'text-slate-300'
          }`}>
            {title}
          </h5>
          {showExecute && !isComplete && !isLoading && (
            <button
              onClick={onExecute}
              disabled={isDisabled}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isDisabled
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Execute
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}
