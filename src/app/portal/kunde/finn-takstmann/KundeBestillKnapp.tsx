"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { opprettBestilling } from "@/lib/actions/bestillinger";
import type { OppdragType } from "@/lib/supabase/types";

interface Props {
  takstmannId: string;
  kundeProfilId: string;
  takstmannNavn: string;
  oppdragType?: OppdragType;
}

export default function KundeBestillKnapp({ takstmannId, kundeProfilId, takstmannNavn, oppdragType }: Props) {
  const router = useRouter();
  const [visMelding, setVisMelding] = useState(false);
  const [melding, setMelding] = useState("");
  const [adresse, setAdresse] = useState("");
  const [laster, setLaster] = useState(false);
  const [sendt, setSendt] = useState(false);

  async function handleBestill() {
    setLaster(true);
    const result = await opprettBestilling(takstmannId, melding, { kundeProfilId }, oppdragType, adresse || undefined);
    if (!result.error) {
      setSendt(true);
      setVisMelding(false);
      router.push("/portal/kunde");
    }
    setLaster(false);
  }

  if (sendt) return <p className="text-center text-sm text-green-700 font-medium">Bestilling sendt!</p>;

  if (visMelding) {
    return (
      <div className="space-y-2">
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className="portal-input text-sm"
          placeholder="Adresse for befaring"
        />
        <textarea
          value={melding}
          onChange={(e) => setMelding(e.target.value)}
          className="portal-input resize-none text-sm"
          rows={2}
          placeholder="Beskriv kort hva du trenger hjelp med..."
        />
        <div className="flex gap-2">
          <button onClick={() => setVisMelding(false)} className="flex-1 text-sm text-[#64748b] border border-[#e2e8f0] py-1.5 rounded-lg hover:bg-[#f0f4f8] transition-colors">
            Avbryt
          </button>
          <button onClick={handleBestill} disabled={laster} className="flex-1 portal-btn-primary text-sm py-1.5">
            {laster ? "Sender..." : "Send bestilling"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setVisMelding(true)} className="w-full portal-btn-primary text-sm py-2">
      Bestill takst
    </button>
  );
}
