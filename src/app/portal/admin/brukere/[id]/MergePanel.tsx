"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeBrukere } from "@/lib/actions/mergeBruker";

interface BrukerKort {
  id: string;
  navn: string;
  epost: string | null;
  rolle: string;
  harVipps: boolean;
  oppdragCount: number;
}

interface Props {
  bevarBruker: BrukerKort;
  duplikater: BrukerKort[];
}

const rolleFarger: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  takstmann_admin: "bg-green-100 text-green-700",
  takstmann: "bg-green-50 text-green-600",
  megler: "bg-purple-100 text-purple-700",
  privatkunde: "bg-amber-100 text-amber-700",
};
const rolleNavn: Record<string, string> = {
  admin: "Admin", takstmann_admin: "Takstmann (admin)",
  takstmann: "Takstmann", megler: "Megler", privatkunde: "Privatkunde",
};

function BrukerKortVisning({ bruker, erPrimaer, onVelg }: {
  bruker: BrukerKort;
  erPrimaer: boolean;
  onVelg: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
        erPrimaer
          ? "border-[#285982] bg-[#f0f7ff]"
          : "border-[#e2e8f0] hover:border-[#94a3b8]"
      }`}
      onClick={onVelg}
    >
      {erPrimaer && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#285982] text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
          BEHOLDES
        </div>
      )}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rolleFarger[bruker.rolle] ?? "bg-gray-100 text-gray-600"}`}>
          {rolleNavn[bruker.rolle] ?? bruker.rolle}
        </span>
        {bruker.harVipps && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Vipps</span>
        )}
      </div>
      <p className="text-sm font-semibold text-[#1e293b] truncate">{bruker.navn}</p>
      <p className="text-xs text-[#64748b] truncate">{bruker.epost ?? "–"}</p>
      <p className="text-xs text-[#94a3b8] mt-2">{bruker.oppdragCount} oppdrag</p>
      {!erPrimaer && (
        <p className="text-[10px] text-[#285982] mt-2 font-medium">Klikk for å beholde denne</p>
      )}
    </div>
  );
}

export default function MergePanel({ bevarBruker, duplikater }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Hvilken duplikat som er valgt for merge
  const [valgtDuplikatId, setValgtDuplikatId] = useState<string>(duplikater[0]?.id ?? "");
  // Hvem som er primær (beholdes)
  const [primaerId, setPrimaerId] = useState<string>(bevarBruker.id);
  // Bekreftelsesmodal
  const [visBekreft, setVisBekreft] = useState(false);
  const [bekreftTekst, setBekreftTekst] = useState("");
  const [feil, setFeil] = useState<string | null>(null);

  const valgtDup = duplikater.find(d => d.id === valgtDuplikatId);
  if (!valgtDup) return null;

  // Den som beholdes og den som slettes
  const alleToIds = [bevarBruker.id, valgtDup.id];
  const slettId = alleToIds.find(id => id !== primaerId)!;
  const bevarId = primaerId;
  const bevarBrukerKort = bevarId === bevarBruker.id ? bevarBruker : valgtDup;
  const slettBrukerKort = bevarId === bevarBruker.id ? valgtDup : bevarBruker;

  function handleMerge() {
    if (bekreftTekst !== "BEKREFT") return;
    setFeil(null);
    startTransition(async () => {
      const result = await mergeBrukere(bevarId, slettId);
      if (result.success) {
        router.push("/portal/admin/brukere");
      } else {
        setFeil(result.error ?? "Ukjent feil");
        setVisBekreft(false);
        setBekreftTekst("");
      }
    });
  }

  return (
    <div>
      {/* Velg duplikat hvis det er flere */}
      {duplikater.length > 1 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#64748b] mb-1.5">Velg duplikat å merge med:</label>
          <select
            value={valgtDuplikatId}
            onChange={e => { setValgtDuplikatId(e.target.value); setPrimaerId(bevarBruker.id); }}
            className="portal-input text-sm"
          >
            {duplikater.map(d => (
              <option key={d.id} value={d.id}>{d.navn} · {d.epost ?? "–"} · {d.oppdragCount} oppdrag</option>
            ))}
          </select>
        </div>
      )}

      {/* To kort side om side */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <BrukerKortVisning
          bruker={bevarBruker}
          erPrimaer={primaerId === bevarBruker.id}
          onVelg={() => setPrimaerId(bevarBruker.id)}
        />
        <BrukerKortVisning
          bruker={valgtDup}
          erPrimaer={primaerId === valgtDup.id}
          onVelg={() => setPrimaerId(valgtDup.id)}
        />
      </div>

      {/* Forklaring */}
      <div className="text-xs text-[#64748b] bg-[#f8fafc] rounded-lg p-3 mb-4 space-y-1">
        <p><span className="font-semibold text-[#285982]">Beholdes:</span> {bevarBrukerKort.navn} ({bevarBrukerKort.epost})</p>
        <p><span className="font-semibold text-red-600">Slettes:</span> {slettBrukerKort.navn} ({slettBrukerKort.epost}) — alle data flyttes over til kontoen som beholdes</p>
      </div>

      {feil && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {feil}
        </div>
      )}

      <button
        onClick={() => { setVisBekreft(true); setBekreftTekst(""); }}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
      >
        Merge brukere
      </button>

      {/* Bekreftelsesmodal */}
      {visBekreft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#1e293b] mb-2">Bekreft merge</h3>
            <p className="text-sm text-[#64748b] mb-4">
              Dette er <span className="font-semibold text-red-600">irreversibelt</span>. Brukeren{" "}
              <span className="font-semibold">{slettBrukerKort.navn}</span> ({slettBrukerKort.epost}) slettes permanent.
              Alle oppdrag, bestillinger og meldinger flyttes til{" "}
              <span className="font-semibold">{bevarBrukerKort.navn}</span>.
            </p>
            <p className="text-xs text-[#64748b] mb-2">Skriv <span className="font-mono font-bold">BEKREFT</span> for å fortsette:</p>
            <input
              type="text"
              value={bekreftTekst}
              onChange={e => setBekreftTekst(e.target.value)}
              placeholder="BEKREFT"
              className="portal-input mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setVisBekreft(false); setBekreftTekst(""); }}
                className="flex-1 py-2 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#64748b] hover:bg-[#f8fafc]"
              >
                Avbryt
              </button>
              <button
                onClick={handleMerge}
                disabled={bekreftTekst !== "BEKREFT" || isPending}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {isPending ? "Merger..." : "Bekreft og merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
