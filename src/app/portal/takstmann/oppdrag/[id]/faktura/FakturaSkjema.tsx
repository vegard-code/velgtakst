"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendFakturaFraSkjema } from "@/lib/actions/faktura";

interface Props {
  oppdragId: string;
  oppdragTittel: string;
  kundeNavn: string;
  kundeEpost: string;
  defaultPris: number;
  regnskapSystem: string;
}

export default function FakturaSkjema({
  oppdragId,
  oppdragTittel,
  kundeNavn,
  kundeEpost,
  defaultPris,
  regnskapSystem,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fase, setFase] = useState<"skjema" | "preview" | "suksess" | "feil">("skjema");
  const [feil, setFeil] = useState<string | null>(null);
  const [fakturaResultat, setFakturaResultat] = useState<{
    fakturaNummerVisning?: string;
    eksterntFakturaId?: string;
  } | null>(null);

  const [beskrivelse, setBeskrivelse] = useState(oppdragTittel);
  const [pris, setPris] = useState(String(defaultPris || ""));
  const [betalingsfristDager, setBetalingsfristDager] = useState("14");
  const [tilleggstekst, setTilleggstekst] = useState("");

  const prisNum = parseFloat(pris.replace(/\s/g, "").replace(",", ".")) || 0;
  const mva = Math.round(prisNum * 0.25);
  const total = prisNum + mva;

  const forfallsDato = () => {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(betalingsfristDager || "14", 10));
    return d.toLocaleDateString("nb-NO");
  };

  const iDag = new Date().toLocaleDateString("nb-NO");

  function handleSend() {
    if (!beskrivelse.trim()) { setFeil("Beskrivelse er påkrevd"); return; }
    if (!prisNum || prisNum <= 0) { setFeil("Beløp må være større enn 0"); return; }
    setFeil(null);

    startTransition(async () => {
      const res = await sendFakturaFraSkjema(oppdragId, {
        beskrivelse: beskrivelse.trim(),
        pris: prisNum,
        betalingsfristDager: parseInt(betalingsfristDager || "14", 10),
        tilleggstekst: tilleggstekst.trim() || undefined,
      });

      if (res.error) {
        setFeil(res.error);
        setFase("feil");
      } else {
        setFakturaResultat(res);
        setFase("suksess");
      }
    });
  }

  if (fase === "suksess") {
    return (
      <div className="portal-card p-8 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1e293b] mb-2">Faktura sendt!</h2>
        <p className="text-[#64748b] text-sm mb-1">
          Fakturaen er sendt til <span className="font-medium text-[#1e293b]">{kundeEpost}</span> via {regnskapSystem === "fiken" ? "Fiken" : regnskapSystem === "tripletex" ? "Tripletex" : "PowerOffice GO"}.
        </p>
        {fakturaResultat?.fakturaNummerVisning && (
          <p className="text-[#64748b] text-sm mb-4">
            Fakturanummer: <span className="font-semibold text-[#285982]">{fakturaResultat.fakturaNummerVisning}</span>
          </p>
        )}
        <p className="text-xs text-[#94a3b8] mb-6">
          Oppdragsstatus er oppdatert til «Fakturert». Du vil se betalingsstatus automatisk oppdatert når {regnskapSystem === "fiken" ? "Fiken" : regnskapSystem === "tripletex" ? "Tripletex" : "PowerOffice GO"} rapporterer betaling.
        </p>
        <button
          onClick={() => router.push(`/portal/takstmann/oppdrag/${oppdragId}`)}
          className="portal-btn-primary w-full"
        >
          Tilbake til oppdrag
        </button>
      </div>
    );
  }

  if (fase === "preview") {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="portal-card p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
            <div className="w-10 h-10 rounded-lg bg-[#285982] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#94a3b8] uppercase tracking-wide">Forhåndsvisning</p>
              <h2 className="text-[#1e293b] font-semibold">Faktura til {kundeNavn}</h2>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide">Til</p>
                <p className="text-[#1e293b] font-medium">{kundeNavn}</p>
                <p className="text-[#64748b] text-xs">{kundeEpost}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide">Sendes via</p>
                <p className="text-[#1e293b] font-medium">{regnskapSystem === "fiken" ? "Fiken" : regnskapSystem === "tripletex" ? "Tripletex" : "PowerOffice GO"}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide">Fakturadato</p>
                <p className="text-[#1e293b]">{iDag}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide">Forfall</p>
                <p className="text-[#1e293b]">{forfallsDato()} ({betalingsfristDager} dager)</p>
              </div>
            </div>

            <div className="border-t border-[#e2e8f0] pt-3 mt-3">
              <p className="text-[#94a3b8] text-xs uppercase tracking-wide mb-1">Beskrivelse</p>
              <p className="text-[#1e293b]">{beskrivelse}</p>
              {tilleggstekst && (
                <p className="text-[#64748b] text-xs mt-1">{tilleggstekst}</p>
              )}
            </div>

            <div className="border-t border-[#e2e8f0] pt-3 mt-3 space-y-1">
              <div className="flex justify-between text-[#64748b]">
                <span>Beløp eks. MVA</span>
                <span>{prisNum.toLocaleString("nb-NO")} kr</span>
              </div>
              <div className="flex justify-between text-[#64748b]">
                <span>MVA (25 %)</span>
                <span>{mva.toLocaleString("nb-NO")} kr</span>
              </div>
              <div className="flex justify-between text-[#1e293b] font-bold text-base pt-1 border-t border-[#e2e8f0]">
                <span>Totalt inkl. MVA</span>
                <span>{total.toLocaleString("nb-NO")} kr</span>
              </div>
            </div>
          </div>
        </div>

        {feil && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {feil}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setFase("skjema"); setFeil(null); }}
            className="flex-1 py-2.5 rounded-lg border border-[#e2e8f0] text-[#64748b] text-sm font-medium hover:bg-[#f8fafc] transition-colors"
          >
            Rediger
          </button>
          <button
            onClick={handleSend}
            disabled={isPending}
            className="flex-1 portal-btn-primary disabled:opacity-60 disabled:cursor-wait"
          >
            {isPending ? "Sender faktura…" : "Send faktura"}
          </button>
        </div>
      </div>
    );
  }

  // Fase: skjema (+ feil-meldinger)
  return (
    <div className="space-y-6 max-w-xl">
      <div className="portal-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
            Beskrivelse av tjenesten
          </label>
          <textarea
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            rows={2}
            className="portal-input resize-none"
            placeholder="F.eks. Tilstandsrapport — Storgata 1, 2600 Lillehammer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Beløp eks. MVA (kr)
            </label>
            <input
              type="number"
              value={pris}
              onChange={(e) => setPris(e.target.value)}
              min="0"
              step="100"
              className="portal-input"
              placeholder="10000"
            />
            {prisNum > 0 && (
              <p className="text-xs text-[#94a3b8] mt-1">
                Totalt inkl. 25% MVA: <span className="font-medium text-[#285982]">{total.toLocaleString("nb-NO")} kr</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Betalingsfrist (dager)
            </label>
            <select
              value={betalingsfristDager}
              onChange={(e) => setBetalingsfristDager(e.target.value)}
              className="portal-input"
            >
              <option value="7">7 dager</option>
              <option value="14">14 dager</option>
              <option value="21">21 dager</option>
              <option value="30">30 dager</option>
            </select>
            {betalingsfristDager && (
              <p className="text-xs text-[#94a3b8] mt-1">Forfall: {forfallsDato()}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
            Merknad / tilleggstekst <span className="text-[#94a3b8] font-normal normal-case">(valgfri)</span>
          </label>
          <textarea
            value={tilleggstekst}
            onChange={(e) => setTilleggstekst(e.target.value)}
            rows={2}
            className="portal-input resize-none"
            placeholder="F.eks. betalingsinfo, referanse, etc."
          />
        </div>

        <div className="bg-[#f8fafc] rounded-lg px-4 py-3 text-sm border border-[#e2e8f0]">
          <p className="text-[#64748b]">
            Faktura sendes til <span className="font-medium text-[#1e293b]">{kundeNavn}</span>{" "}
            (<span className="text-[#285982]">{kundeEpost}</span>) via{" "}
            <span className="font-medium text-[#1e293b]">{regnskapSystem === "fiken" ? "Fiken" : regnskapSystem === "tripletex" ? "Tripletex" : "PowerOffice GO"}</span>.
          </p>
        </div>
      </div>

      {feil && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {feil}
        </div>
      )}

      <button
        onClick={() => {
          if (!beskrivelse.trim()) { setFeil("Beskrivelse er påkrevd"); return; }
          if (!prisNum || prisNum <= 0) { setFeil("Beløp må være større enn 0"); return; }
          setFeil(null);
          setFase("preview");
        }}
        className="portal-btn-primary w-full"
      >
        Forhåndsvis faktura
      </button>
    </div>
  );
}
