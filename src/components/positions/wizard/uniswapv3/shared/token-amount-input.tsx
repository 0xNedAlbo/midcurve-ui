"use client";

import { useCallback } from "react";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { useAccount } from "wagmi";
import { erc20Abi } from "viem";
import { normalizeAddress } from "@midcurve/shared";
import { formatCompactValue } from "@/lib/fraction-format";
import type { EvmChainSlug } from "@/config/chains";
import { CHAIN_METADATA } from "@/config/chains";
import type { Erc20Token } from "@midcurve/shared";

interface TokenAmountInputProps {
  token: Erc20Token;
  value: string;
  onChange: (value: string, valueBigInt: bigint) => void;
  onMaxClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showMaxButton?: boolean;
  chain?: EvmChainSlug;
  className?: string;
}

// Utility functions for decimal/BigInt conversion
export const convertToBigInt = (value: string, decimals: number): bigint => {
  if (!value || value === "") return 0n;

  try {
    const [whole = "0", fraction = ""] = value.split(".");
    const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
    const result = BigInt(whole + paddedFraction);
    return result;
  } catch {
    return 0n;
  }
};

export const formatFromBigInt = (value: bigint, decimals: number): string => {
  if (value === 0n) return "0";

  const str = value.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, -decimals) || "0";
  const fraction = str.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
};

export function TokenAmountInput({
  token,
  value,
  onChange,
  onMaxClick,
  placeholder = "0.0",
  disabled = false,
  showMaxButton = true,
  chain,
  className = "",
}: TokenAmountInputProps) {
  const { address: walletAddress, isConnected } = useAccount();

  // Normalize addresses to ensure proper checksum format
  const normalizedTokenAddress = token.config?.address
    ? normalizeAddress(token.config.address)
    : null;
  const normalizedWalletAddress = walletAddress
    ? normalizeAddress(walletAddress)
    : null;

  // Fetch wallet balance using balanceOf contract call
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
    error: balanceError,
  } = useReadContract({
    address: normalizedTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [normalizedWalletAddress as `0x${string}`],
    query: {
      enabled:
        isConnected &&
        showMaxButton &&
        !!normalizedWalletAddress &&
        !!normalizedTokenAddress,
    },
    // Add chain config if provided
    ...(chain && { chainId: getChainId(chain) }),
  });

  // Subscribe to Transfer events for this token to automatically update balance
  useWatchContractEvent({
    address: normalizedTokenAddress as `0x${string}`,
    abi: erc20Abi,
    eventName: "Transfer",
    args: {
      from: normalizedWalletAddress as `0x${string}`,
    },
    onLogs: (logs) => {
      // Transfer FROM wallet - balance decreased
      console.log("Transfer FROM wallet detected, refetching balance:", logs);
      try {
        refetchBalance?.();
      } catch (error) {
        console.error("Error refetching balance:", error);
      }
    },
    enabled:
      isConnected && !!normalizedWalletAddress && !!normalizedTokenAddress,
    ...(chain && { chainId: getChainId(chain) }),
  });

  // Subscribe to Transfer events TO the wallet
  useWatchContractEvent({
    address: normalizedTokenAddress as `0x${string}`,
    abi: erc20Abi,
    eventName: "Transfer",
    args: {
      to: normalizedWalletAddress as `0x${string}`,
    },
    onLogs: (logs) => {
      // Transfer TO wallet - balance increased
      console.log("Transfer TO wallet detected, refetching balance:", logs);
      try {
        refetchBalance?.();
      } catch (error) {
        console.error("Error refetching balance:", error);
      }
    },
    enabled:
      isConnected && !!normalizedWalletAddress && !!normalizedTokenAddress,
    ...(chain && { chainId: getChainId(chain) }),
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Allow empty input
      if (inputValue === "") {
        onChange("", 0n);
        return;
      }

      // Validate decimal format
      const decimalRegex = /^\d*\.?\d*$/;
      if (!decimalRegex.test(inputValue)) {
        return; // Don't update if invalid format
      }

      // Prevent too many decimal places
      const decimalParts = inputValue.split(".");
      if (
        decimalParts.length === 2 &&
        decimalParts[1].length > token.decimals
      ) {
        inputValue = `${decimalParts[0]}.${decimalParts[1].slice(
          0,
          token.decimals
        )}`;
      }

      // Convert to BigInt and call onChange
      const bigIntValue = convertToBigInt(inputValue, token.decimals);
      onChange(inputValue, bigIntValue);
    },
    [onChange, token.decimals]
  );

  const handleMaxClick = useCallback(() => {
    if (!balanceData || !isConnected) return;

    // Subtract 1 wei to prevent edge cases with gas estimation and rounding errors
    const bigIntValue = balanceData > 0n ? balanceData - 1n : 0n;
    const maxValue = formatFromBigInt(bigIntValue, token.decimals);
    onChange(maxValue, bigIntValue);

    onMaxClick?.();
  }, [balanceData, isConnected, onChange, onMaxClick, token.decimals]);

  const hasBalance = balanceData && balanceData > 0n;

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-20 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />

        {/* Token symbol and Max button inside input */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {/* Token symbol display */}
          <div className="flex items-center gap-1">
            {token.logoUrl && (
              <img
                src={token.logoUrl}
                alt={token.symbol}
                className="w-4 h-4 rounded-full"
              />
            )}
            <span className="text-slate-300 text-xs font-medium">
              {token.symbol}
            </span>
          </div>

          {/* Max button inside input */}
          {showMaxButton && isConnected && (
            <button
              onClick={handleMaxClick}
              disabled={disabled || !hasBalance}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white text-xs font-medium rounded transition-colors min-w-[36px] flex items-center justify-center cursor-pointer"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* Balance display below input, right-aligned */}
      {showMaxButton &&
        isConnected &&
        normalizedWalletAddress &&
        normalizedTokenAddress && (
          <div className="text-right mt-1">
            <div className="text-xs text-slate-400">
              {balanceLoading
                ? "Balance: Loading..."
                : balanceError
                ? "Balance: Error"
                : balanceData !== undefined
                ? `Balance: ${formatCompactValue(
                    balanceData,
                    token.decimals
                  )}`
                : "Balance: --"}
            </div>
          </div>
        )}
    </div>
  );
}

// Helper function to map chain slugs to chain IDs using centralized config
function getChainId(chain: EvmChainSlug): number {
  const chainMetadata = CHAIN_METADATA[chain];
  if (!chainMetadata) {
    console.error(`Unknown chain: ${chain}`);
    return 1; // fallback to mainnet
  }
  return chainMetadata.chainId;
}
