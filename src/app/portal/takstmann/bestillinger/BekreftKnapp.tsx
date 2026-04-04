"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bekreftBestilling } from "@/lib/actions/bestillinger";

export default function BekreftKnapp({ bestillingId }: { bestillingId: string }) {
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const router = useRouter();

  async function handleBekreft() {
    setLaster(true);
    setFeil(null);
    const res = await bekreftBestilling(bestillingId);
    setLaster(false);
    if (res?.error) {
      setFeil(res.error);
    } else if (res?.oppdragId) {
      router.push(`/portal/takstmann/oppdrag/${res.oppdragId}`);
    }
  }

  return (
    <div>
      <button
        onClick={handleBekreft}
        disabled={laster}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {laster ? "Oppretter oppdrag..." : "Bekreft og opprett oppdrag"}
      </button>
      {feil && <p className="text-red-600 text-xs mt-1">{feil}</p>}
    </div>
  );
}
