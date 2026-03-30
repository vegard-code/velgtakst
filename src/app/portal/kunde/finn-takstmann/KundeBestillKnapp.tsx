"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { opprettBestilling } from "@/lib/actions/bestillinger";

interface Props {
  takstmannId: string;
  kundeProfilId: string;
  takstmannNavn: string;
}

export default function KundeBestillKnapp({ takstmannId, kundeProfilId, takstmannNavn }: Props) {
  const router = useRouter();
  const [visMelding, setVisMelding] = useState(false);
  const [melding, setMelding] = useState("");
  const [laster, setLaster] = useState(false);
  const [sendt, setSendt] = useState(false);

  async function handleBestill() {
    setLaster(true);
    const result = await opprettBestilling(takstmannId, melding, { kundeProfilId });
    if (!result.error) {
      setSendt(true);
      setVisMelding(false);
      router.push("/portal/kunde");
    }
    setLaster(false);
  }

  if (sendt) return <p className="text-center text-sm text-green-700 font-medium">✓ Bestilling sendt!</p>;

  if (visMelding) {
    return (
      <div className="space-y-2">
        <textarea
          value={melding}
          onChange={(e) => setMelding(e.target.value)}
          className="portal-input resize-none text-sm"
          rows={2}
          placeholder={`Beskriv hva du trenger hjelp med...`}
        />
        <div className="flex gap-2">
          <button onClick={() => setVisMelding(false)} className="flex-1 text-sm text-[#64748b] border border-[#e2e8f0] py-1.5 rounded-lg">
            Avbryt
          </button>
          <button onClick={handleBestill} disabled={laster} className="flex-1 portal-btn-primary text-sm py-1.5">
            {laster ? "Sender..." : "Bestill"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setVisMelding(true)} className="w-full portal-btn-primary text-sm py-2">
      Bestill {takstmannNavn}
    </button>
  );
}
