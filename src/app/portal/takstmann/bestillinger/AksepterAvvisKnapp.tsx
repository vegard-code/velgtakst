"use client";

import { useState } from "react";
import { oppdaterBestillingStatus } from "@/lib/actions/bestillinger";
import Toast from "@/components/Toast";

export default function AksepterAvvisKnapp({ bestillingId }: { bestillingId: string }) {
  const [laster, setLaster] = useState<"aksepter" | "avvis" | null>(null);
  const [suksess, setSuksess] = useState<string | null>(null);

  async function handleAksepter() {
    setLaster("aksepter");
    const res = await oppdaterBestillingStatus(bestillingId, "akseptert");
    setLaster(null);
    if (!res?.error) setSuksess("Bestilling akseptert!");
  }

  async function handleAvvis() {
    setLaster("avvis");
    const res = await oppdaterBestillingStatus(bestillingId, "avvist");
    setLaster(null);
    if (!res?.error) setSuksess("Bestilling avvist.");
  }

  return (
    <>
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
      <Toast melding={suksess} onClose={() => setSuksess(null)} />
    </>
  );
}
