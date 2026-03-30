"use client";

import { useState } from "react";
import { oppdaterBestillingStatus } from "@/lib/actions/bestillinger";

export default function AksepterAvvisKnapp({ bestillingId }: { bestillingId: string }) {
  const [laster, setLaster] = useState<"aksepter" | "avvis" | null>(null);

  async function handleAksepter() {
    setLaster("aksepter");
    await oppdaterBestillingStatus(bestillingId, "akseptert");
    setLaster(null);
  }

  async function handleAvvis() {
    setLaster("avvis");
    await oppdaterBestillingStatus(bestillingId, "avvist");
    setLaster(null);
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={handleAksepter}
        disabled={!!laster}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        {laster === "aksepter" ? "..." : "Aksepter"}
      </button>
      <button
        onClick={handleAvvis}
        disabled={!!laster}
        className="bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        {laster === "avvis" ? "..." : "Avvis"}
      </button>
    </div>
  );
}
