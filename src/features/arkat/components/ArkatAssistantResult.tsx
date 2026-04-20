'use client';

import { useState } from "react";
import type { ArkatGenerateResponse } from "../types/arkat";
import { logArkatEvent } from "../lib/log-event";

/** Kontekst om hva brukeren sendte inn — brukes til feedback */
export interface ArkatInputKontekst {
  bygningsdel: string;
  underenhet: string;
  tilstandsgrad?: string;
  observasjon: string;
  arsak?: string;
}

interface Props {
  response: ArkatGenerateResponse;
  inputKontekst?: ArkatInputKontekst;
}

const STANDARD_FIELDS = [
  { key: "observasjon" as const, label: "Observasjon" },
  { key: "arsak" as const, label: "Årsak" },
  { key: "risiko" as const, label: "Risiko" },
  { key: "konsekvens" as const, label: "Konsekvens" },
  { key: "anbefalt_tiltak" as const, label: "Anbefalt tiltak" },
];

const MERKNAD_FIELDS = [
  { key: "observasjon" as const, label: "Observasjon" },
  { key: "arsak" as const, label: "Merknad" },
  { key: "konsekvens" as const, label: "Konsekvens" },
  { key: "anbefalt_tiltak" as const, label: "Anbefalt tiltak" },
];

type Vurdering = "bra" | "justeringer" | "darlig";

export default function ArkatAssistantResult({ response, inputKontekst }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [feedbackVurdering, setFeedbackVurdering] = useState<Vurdering | null>(null);
  const [feedbackKommentar, setFeedbackKommentar] = useState("");
  const [feedbackSendt, setFeedbackSendt] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

  const LOGGBARE_FELT = ['arsak', 'risiko', 'konsekvens', 'anbefalt_tiltak'];

  const copyToClipboard = async (text: string, field?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (field) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        if (LOGGBARE_FELT.includes(field)) {
          logArkatEvent({ event_type: 'copied_field', copied_field: field });
        }
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
        logArkatEvent({ event_type: 'copied_all' });
      }
    } catch {
      // Fallback — ignorér
    }
  };

  // Feil / screening stoppet generering
  if (!response.success || !response.result) {
    const reason = response.screening.reason ?? "";

    // Skille mellom "ikke støttet ennå" (info) og reelle avslag (feil)
    const erIkkeStottet = reason.includes("støttes ikke ennå");

    if (erIkkeStottet) {
      // Info-stil: rolig, blå/grå — ikke alarmerende
      return (
        <div className="portal-card p-5 border-l-4 border-l-[#285982]/40">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f0f4f8] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-[#285982]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1e293b] mb-1">
                Ikke tilgjengelig ennå
              </h3>
              <p className="text-sm text-[#64748b] leading-relaxed">
                {reason}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Reelt avslag: screening stoppet pga. observasjonskvalitet
    return (
      <div className="portal-card p-5 border-l-4 border-l-amber-400">
        <h3 className="text-sm font-semibold text-[#92400e] mb-2">
          Trenger mer informasjon
        </h3>
        {reason && (
          <p className="text-sm text-[#1e293b] mb-2 leading-relaxed">
            {reason}
          </p>
        )}
        {response.screening.warnings.length > 0 && (
          <ul className="text-sm text-[#64748b] space-y-1">
            {response.screening.warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500 shrink-0">!</span>
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Suksess
  const { result, screening } = response;
  const erMerknad = result.modus === "merknad";
  const fields = erMerknad ? MERKNAD_FIELDS : STANDARD_FIELDS;

  const allText = fields
    .filter((f) => result[f.key])
    .map((f) => `${f.label}:\n${result[f.key]}`)
    .join("\n\n");

  return (
    <div className="space-y-4">
      {/* Advarsler */}
      {screening.warnings.length > 0 && (
        <div className="portal-card p-4 border-l-4 border-l-amber-400">
          <ul className="text-sm text-[#64748b] space-y-1">
            {screening.warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500 shrink-0">!</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resultatfelt */}
      {fields.map((f) => {
        const tekst = result[f.key];
        if (!tekst) return null;
        return (
          <div key={f.key} className="portal-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#285982]">
                {f.label}
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(tekst, f.key)}
                className="text-xs text-[#64748b] hover:text-[#285982] transition-colors cursor-pointer"
              >
                {copiedField === f.key ? "Kopiert!" : "Kopier"}
              </button>
            </div>
            <p className="text-sm text-[#1e293b] leading-relaxed whitespace-pre-wrap">
              {tekst}
            </p>
          </div>
        );
      })}

      {/* Kopier alle */}
      <button
        type="button"
        onClick={() => copyToClipboard(allText)}
        className="portal-btn-primary w-full text-center"
      >
        {copiedAll ? "Alle felt kopiert!" : "Kopier alle felt"}
      </button>

      {/* Feedback */}
      {inputKontekst && (
        <div className="portal-card p-5 mt-2">
          {feedbackSendt ? (
            <div className="text-center py-2">
              <p className="text-sm text-[#285982] font-medium">Takk for tilbakemeldingen!</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-[#1e293b] mb-3">
                Ville du brukt denne teksten?
              </p>
              <div className="flex gap-2 mb-3">
                {([
                  { key: "bra" as Vurdering, label: "Ja, direkte", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
                  { key: "justeringer" as Vurdering, label: "Med justeringer", color: "bg-amber-50 border-amber-300 text-amber-700" },
                  { key: "darlig" as Vurdering, label: "Nei", color: "bg-red-50 border-red-300 text-red-700" },
                ]).map(({ key, label, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFeedbackVurdering(key)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      feedbackVurdering === key
                        ? color
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982]/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {feedbackVurdering && (
                <>
                  <textarea
                    value={feedbackKommentar}
                    onChange={(e) => setFeedbackKommentar(e.target.value)}
                    placeholder="Hva ville du endret? (valgfritt)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#285982]/30 focus:border-[#285982] resize-none mb-3"
                  />
                  <button
                    type="button"
                    disabled={feedbackSending}
                    onClick={async () => {
                      setFeedbackSending(true);
                      try {
                        await fetch("/api/arkat/feedback", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            bygningsdel: inputKontekst.bygningsdel,
                            underenhet: inputKontekst.underenhet,
                            tilstandsgrad: inputKontekst.tilstandsgrad ?? null,
                            observasjon: inputKontekst.observasjon,
                            arsak: inputKontekst.arsak ?? null,
                            resultat_arsak: result.arsak ?? null,
                            resultat_risiko: result.risiko ?? null,
                            resultat_konsekvens: result.konsekvens ?? null,
                            resultat_tiltak: result.anbefalt_tiltak ?? null,
                            resultat_modus: result.modus ?? "standard",
                            vurdering: feedbackVurdering,
                            kommentar: feedbackKommentar || null,
                          }),
                        });
                        setFeedbackSendt(true);
                      } catch {
                        // Stille feil — feedback er ikke kritisk
                      } finally {
                        setFeedbackSending(false);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-[#285982] text-white hover:bg-[#1e4a6e] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {feedbackSending ? "Sender..." : "Send tilbakemelding"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
