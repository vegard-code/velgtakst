'use client';

import { useState } from "react";
import type { ArkatGenerateResponse } from "../types/arkat";

interface Props {
  response: ArkatGenerateResponse;
}

const STANDARD_FIELDS = [
  { key: "arsak" as const, label: "Årsak" },
  { key: "risiko" as const, label: "Risiko" },
  { key: "konsekvens" as const, label: "Konsekvens" },
  { key: "anbefalt_tiltak" as const, label: "Anbefalt tiltak" },
];

const MERKNAD_FIELDS = [
  { key: "arsak" as const, label: "Merknad" },
  { key: "konsekvens" as const, label: "Konsekvens" },
  { key: "anbefalt_tiltak" as const, label: "Anbefalt tiltak" },
];

export default function ArkatAssistantResult({ response }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyToClipboard = async (text: string, field?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (field) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
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
    </div>
  );
}
