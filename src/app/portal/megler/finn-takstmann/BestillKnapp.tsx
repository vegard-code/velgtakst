"use client";

import { useState } from "react";
import { opprettBestilling } from "@/lib/actions/bestillinger";

interface Props {
  takstmannId: string;
  meglerProfilId: string;
  takstmannNavn: string;
}

export default function BestillKnapp({ takstmannId, meglerProfilId, takstmannNavn }: Props) {
  const [visMelding, setVisMelding] = useState(false);
  const [melding, setMelding] = useState("");
  const [laster, setLaster] = useState(false);
  const [sendt, setSendt] = useState(false);

  async function handleBestill() {
    setLaster(true);
    const result = await opprettBestilling(takstmannId, melding, { meglerProfilId });
    if (!result.error) {
      setSendt(true);
      setVisMelding(false);
    }
    setLaster(false);
  }

  if (sendt) {
    return (
      <span className="flex-1 text-center text-sm bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg">
        ✓ Bestilling sendt
      </span>
    );
  }

  if (visMelding) {
    return (
      <div className="flex-1 space-y-2">
        <textarea
          value={melding}
          onChange={(e) => setMelding(e.target.value)}
          className="portal-input resize-none text-sm"
          rows={2}
          placeholder={`Melding til ${takstmannNavn}...`}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setVisMelding(false)}
            className="flex-1 text-sm text-[#64748b] border border-[#e2e8f0] py-1.5 rounded-lg"
          >
            Avbryt
          </button>
          <button
            onClick={handleBestill}
            disabled={laster}
            className="flex-1 portal-btn-primary text-sm py-1.5"
          >
            {laster ? "Sender..." : "Send"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisMelding(true)}
      className="flex-1 portal-btn-primary text-sm py-2"
    >
      Bestill
    </button>
  );
}
