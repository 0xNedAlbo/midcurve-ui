'use client';

import { AlertTriangle } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
import type { EvmChainSlug } from '@/config/chains';
import { CHAIN_METADATA } from '@/config/chains';

interface NetworkSwitchStepProps {
  chain: EvmChainSlug;
  isWrongNetwork: boolean;
}

/**
 * Network Switch Step Component
 *
 * Displays a warning when the user's wallet is connected to the wrong network
 * and provides a button to switch to the correct network.
 */
export function NetworkSwitchStep({ chain, isWrongNetwork }: NetworkSwitchStepProps) {
  const { switchChain } = useSwitchChain();
  const chainConfig = CHAIN_METADATA[chain];

  if (!isWrongNetwork) {
    return null;
  }

  const handleSwitchNetwork = () => {
    if (chainConfig && switchChain) {
      switchChain({ chainId: chainConfig.chainId });
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h5 className="text-amber-400 font-medium mb-1">Wrong Network</h5>
          <p className="text-amber-200/80 text-sm mb-3">
            Please switch to {chainConfig.name} to continue
          </p>
          <button
            onClick={handleSwitchNetwork}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Switch to {chainConfig.name}
          </button>
        </div>
      </div>
    </div>
  );
}
