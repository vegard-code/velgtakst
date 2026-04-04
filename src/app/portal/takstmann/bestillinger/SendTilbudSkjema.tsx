"use client";

import { useState } from "react";
import { sendTilbud } from "@/lib/actions/bestillinger";

export default function SendTilbudSkjema({ bestillingId }: { bestillingId: string }) {
  const [aapen, setAapen] = useState(false);
  const [laster, setLaster] = useState(false);
  const [pris, setPris] = useState("");
  const [leveringstid, setLeveringstid] = useState("");
  const [feil, setFeil] = useState<string | null>(null);

  async function handleSend() {
    if (!pris || !leveringstid) {
      setFeil("Fyll inn pris og estimert leveringstid");
      return;
    }
    const prisNum = Number(pris.replace(/\s/g, "").replace(",", "."));
    if (isNaN(prisNum) || prisNum <= 0) {
      setFeil("Ugyldig pris");
      return;
    }
    setLaster(true);
    setFeil(null);
    const res = await sendTilbud(bestillingId, prisNum, leveringstid);
    setLaster(false);
    if (res?.error) {
      setFeil(res.error);
    } else {
      setAapen(false);
    }
  }

  if (!aapen) {
    return (
      <button
        onClick={() => setAapen(true)}
        className="bg-[#285982] hover:bg-[#1e4266] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Send tilbud
      </button>
    );
  }

  return (
    <div className="mt-4 bg-[#f0f4f8] rounded-xl p-4 border border-[#d1dde8]">
      <h3 className="text-sm font-semibold text-[#1e293b] mb-3">Send tilbud til kunden</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">Pris (kr inkl. mva)</label>
          <input
            type="number"
            min="0"
            value={pris}
            onChange={(e) => setPris(e.target.value)}
            placeholder="F.eks. 8500"
            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">Estimert leveringstid</label>
          <input
            type="text"
            value={leveringstid}
            onChange={(e) => setLeveringstid(e.target.value)}
            placeholder="F.eks. 3–5 virkedager"
            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
        {feil && <p className="text-red-600 text-xs">{feil}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={laster}
            className="bg-[#285982] hover:bg-[#1e4266] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {laster ? "Sender..." : "Send tilbud"}
          </button>
          <button
            onClick={() => { setAapen(false); setFeil(null); }}
            className="text-[#64748b] text-sm px-3 py-2 rounded-lg hover:bg-white transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
