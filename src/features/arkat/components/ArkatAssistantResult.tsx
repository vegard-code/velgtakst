'use client';

import { useState } from "react";
import type { ArkatGenerateResponse } from "../types/arkat";

interface Props {
  response: ArkatGenerateResponse;
}

const RESULT_FIELDS = [
  { key: "arsak" as const, label: "Årsak" },
  { key: "risiko" as const, label: "Risiko" },
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
    return (
      <div className="portal-card p-5 border-l-4 border-l-red-400">
        <h3 className="text-sm font-semibold text-red-700 mb-2">
          Generering stoppet
        </h3>
        {response.screening.reason && (
          <p className="text-sm text-[#1e293b] mb-2">
            {response.screening.reason}
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

  const allText = RESULT_FIELDS.map(
    (f) => `${f.label}:\n${result[f.key]}`
  ).join("\n\n");

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
      {RESULT_FIELDS.map((f) => (
        <div key={f.key} className="portal-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[#285982]">
              {f.label}
            </h3>
            <button
              type="button"
              onClick={() => copyToClipboard(result[f.key], f.key)}
              className="text-xs text-[#64748b] hover:text-[#285982] transition-colors cursor-pointer"
            >
              {copiedField === f.key ? "Kopiert!" : "Kopier"}
            </button>
          </div>
          <p className="text-sm text-[#1e293b] leading-relaxed whitespace-pre-wrap">
            {result[f.key]}
          </p>
        </div>
      ))}

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
