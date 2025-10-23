"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserDropdown } from "@/components/auth/user-dropdown";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Handle authentication redirect
  useEffect(() => {
    if (status === "unauthenticated" || (!session && status !== "loading")) {
      router.push("/auth/signin");
    }
  }, [status, session, router]);

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Midcurve</h1>
            <p className="text-lg text-slate-300">Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <UserDropdown />
          </div>
        </header>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Section Header with Add Position Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Your Positions
              </h2>
              <p className="text-slate-300">
                Manage and analyze your Uniswap V3 liquidity positions
              </p>
            </div>

            {/* CreatePositionDropdown Placeholder */}
            <div className="px-4 py-2 bg-blue-600 rounded-lg text-white">
              ...create position button...
            </div>
          </div>

          {/* PositionList Placeholder */}
          <div className="p-8 bg-slate-800/50 rounded-lg text-slate-400 text-center">
            ...position list...
          </div>
        </div>
      </div>
    </div>
  );
}
