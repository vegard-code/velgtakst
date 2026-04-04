"use client";

import { useState } from "react";
import { aksepterTilbud, avslaaTilbud } from "@/lib/actions/bestillinger";
import Toast from "@/components/Toast";

interface Props {
  bestillingId: string;
}

export default function TilbudKnapper({ bestillingId }: Props) {
  const [modus, setModus] = useState<"idle" | "aksepter" | "avslå" | "akseptert">("idle");
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [suksess, setSuksess] = useState<string | null>(null);
  const [befaringsdato, setBefaringsdato] = useState("");
  const [noekkelinfo, setNoekkelinfo] = useState("");
  const [parkering, setParkering] = useState("");
  const [tilgang, setTilgang] = useState("");

  async function handleAksepter() {
    if (!befaringsdato) { setFeil("Velg ønsket befaringsdato"); return; }
    setLaster(true);
    setFeil(null);
    const res = await aksepterTilbud(bestillingId, befaringsdato, noekkelinfo, parkering, tilgang);
    setLaster(false);
    if (res?.error) {
      setFeil(res.error);
    } else {
      setModus("akseptert");
      setSuksess("Tilbud akseptert!");
    }
  }

  async function handleAvslaa() {
    setLaster(true);
    const res = await avslaaTilbud(bestillingId);
    setLaster(false);
    if (res?.error) setFeil(res.error);
    else {
      setModus("idle");
      setSuksess("Tilbud avslått.");
    }
  }

  if (modus === "akseptert") {
    return (
      <>
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Tilbud akseptert – takstmannen bekrefter oppdraget snart.
        </div>
        <Toast melding={suksess} onClose={() => setSuksess(null)} />
      </>
    );
  }

  if (modus === "idle") {
    return (
      <>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setModus("aksepter")}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Aksepter tilbud
          </button>
          <button
            onClick={() => setModus("avslå")}
            className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Avslå tilbud
          </button>
        </div>
        <Toast melding={suksess} onClose={() => setSuksess(null)} />
      </>
    );
  }

  if (modus === "avslå") {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800 mb-3">Er du sikker på at du vil avslå tilbudet?</p>
          {feil && <p className="text-red-600 text-xs mb-2">{feil}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAvslaa}
              disabled={laster}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {laster ? "Avslår..." : "Ja, avslå"}
            </button>
            <button onClick={() => setModus("idle")} className="text-[#64748b] text-sm px-3 py-2 rounded-lg hover:bg-white transition-colors">
              Avbryt
            </button>
          </div>
        </div>
        <Toast melding={suksess} onClose={() => setSuksess(null)} />
      </>
    );
  }

  return (
    <>
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-green-800">Aksepter tilbud – fyll inn praktisk info</h3>
      <div>
        <label className="block text-xs font-medium text-[#64748b] mb-1">Ønsket befaringsdato *</label>
        <input
          type="date"
          value={befaringsdato}
          onChange={(e) => setBefaringsdato(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#64748b] mb-1">Nøkkelinfo (hvordan takstmannen kommer inn)</label>
        <input
          type="text"
          value={noekkelinfo}
          onChange={(e) => setNoekkelinfo(e.target.value)}
          placeholder="F.eks. nøkkel hos nabo, kode til postkasse..."
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#64748b] mb-1">Parkeringsmuligheter</label>
        <input
          type="text"
          value={parkering}
          onChange={(e) => setParkering(e.target.value)}
          placeholder="F.eks. gratis gateparkering rett utenfor..."
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#64748b] mb-1">Annen nyttig info om tilgang</label>
        <input
          type="text"
          value={tilgang}
          onChange={(e) => setTilgang(e.target.value)}
          placeholder="F.eks. ring 5 minutter i forveien..."
          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      {feil && <p className="text-red-600 text-xs">{feil}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleAksepter}
          disabled={laster}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {laster ? "Bekrefter..." : "Bekreft aksept"}
        </button>
        <button onClick={() => setModus("idle")} className="text-[#64748b] text-sm px-3 py-2 rounded-lg hover:bg-white transition-colors">
          Avbryt
        </button>
      </div>
    </div>
    <Toast melding={suksess} onClose={() => setSuksess(null)} />
    </>
  );
}
