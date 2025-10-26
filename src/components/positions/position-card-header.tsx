/**
 * PositionCardHeader - Protocol-agnostic position header
 *
 * Displays token pair and status badges.
 * Accepts protocol-specific badges via children prop.
 * Works for all protocols (Uniswap V3, Orca, etc.)
 */

import Image from "next/image";

interface Token {
  symbol: string;
  logoUrl?: string | null;
}

interface PositionCardHeaderProps {
  baseToken: Token;
  quoteToken: Token;
  status: "active" | "closed";
  protocol: string;
  statusLineBadges?: React.ReactNode; // Protocol-specific badges for first line (e.g., range status)
  protocolLineBadges?: React.ReactNode; // Protocol-specific badges for second line (e.g., chain, fee, NFT ID)
}

export function PositionCardHeader({
  baseToken,
  quoteToken,
  status,
  protocol,
  statusLineBadges,
  protocolLineBadges,
}: PositionCardHeaderProps) {
  // Token logos with fallback
  const baseLogo = baseToken.logoUrl || `/images/tokens/${baseToken.symbol.toLowerCase()}.svg`;
  const quoteLogo = quoteToken.logoUrl || `/images/tokens/${quoteToken.symbol.toLowerCase()}.svg`;

  console.log('PositionCardHeader - Tokens:', {
    baseSymbol: baseToken.symbol,
    quoteSymbol: quoteToken.symbol,
    baseLogo,
    quoteLogo
  });

  const statusColor = status === "active"
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : "text-slate-400 bg-slate-500/10 border-slate-500/20";

  return (
    <div className="flex items-center gap-3">
      {/* Token Icons */}
      <div className="flex items-center">
        <div className="flex items-center -space-x-2">
          <Image
            src={baseLogo}
            alt={baseToken.symbol}
            width={32}
            height={32}
            className="rounded-full border-2 border-slate-700 bg-slate-800 relative z-10"
          />
          <Image
            src={quoteLogo}
            alt={quoteToken.symbol}
            width={32}
            height={32}
            className="rounded-full border-2 border-slate-700 bg-slate-800"
          />
        </div>

        <div className="ml-3">
          <div className="flex items-center gap-2 mb-1">
            {/* Token Pair */}
            <div className="font-semibold text-white text-lg">
              {baseToken.symbol}/{quoteToken.symbol}
            </div>

            {/* Status Badge */}
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColor}`}>
              {status === "active" ? "Active" : "Closed"}
            </span>

            {/* Protocol-specific badges for first line (e.g., range status) */}
            {statusLineBadges}
          </div>

          {/* Protocol Name and Protocol-specific badges for second line */}
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <span className="capitalize">{protocol}</span>
            {protocolLineBadges}
          </div>
        </div>
      </div>
    </div>
  );
}
