"use client";

import { useState } from "react";
import { toggleKommune } from "@/lib/actions/kommuner";
import type { Kommune } from "@/data/kommuner";

interface KommuneStatus {
  kommune_id: string;
  er_aktiv: boolean;
}

interface Props {
  kommuner: Kommune[];
  kommuneStatuser: KommuneStatus[];
  takstmannId: string;
  fylkeId: string;
}

export default function KommuneToggleListe({
  kommuner,
  kommuneStatuser,
  takstmannId,
  fylkeId,
}: Props) {
  // Initialiser alle kommuner — de som har en rad bruker den, resten er aktiv som standard
  const initialMap = new Map<string, boolean>();
  const dbMap = new Map(kommuneStatuser.map((k) => [k.kommune_id, k.er_aktiv]));
  for (const k of kommuner) {
    initialMap.set(k.id, dbMap.get(k.id) ?? true);
  }

  const [statuser, setStatuser] = useState<Map<string, boolean>>(initialMap);
  const [lastende, setLastende] = useState<Set<string>>(new Set());

  const aktiveAntall = Array.from(statuser.values()).filter(Boolean).length;

  async function handleToggle(kommuneId: string) {
    const nåværende = statuser.get(kommuneId) ?? true;
    const nyStatus = !nåværende;

    setLastende((prev) => new Set(prev).add(kommuneId));
    setStatuser((prev) => new Map(prev).set(kommuneId, nyStatus));

    const result = await toggleKommune(
      takstmannId,
      fylkeId,
      kommuneId,
      nyStatus
    );

    if (result.error) {
      // Tilbakestill ved feil
      setStatuser((prev) => new Map(prev).set(kommuneId, nåværende));
    }

    setLastende((prev) => {
      const next = new Set(prev);
      next.delete(kommuneId);
      return next;
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#dbeafe]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">
          Kommuner ({aktiveAntall} av {kommuner.length} aktive)
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {kommuner.map((k) => {
          const erAktiv = statuser.get(k.id) ?? true;
          const erLastende = lastende.has(k.id);

          return (
            <button
              key={k.id}
              onClick={() => handleToggle(k.id)}
              disabled={erLastende}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                erAktiv
                  ? "bg-[#dbeafe] text-[#1e4468] font-medium"
                  : "bg-[#f1f5f9] text-[#94a3b8]"
              } ${erLastende ? "opacity-50" : "hover:bg-[#bfdbfe]"}`}
            >
              <div
                className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                  erAktiv
                    ? "bg-[#285982] border-[#285982]"
                    : "bg-white border-[#cbd5e1]"
                }`}
              >
                {erAktiv && (
                  <svg
                    className="w-2 h-2 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="truncate">{k.navn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
