"use client";

import { useState } from "react";
import { aktiverFylke, deaktiverFylke } from "@/lib/actions/fylker";
import { getFylkePris } from "@/lib/supabase/types";
import type { Fylke } from "@/lib/supabase/types";

interface Props {
  fylke: Fylke;
  erAktiv: boolean;
  betaltTil: string | null;
  takstmannId: string | null;
}

export default function FylkeToggleKort({ fylke, erAktiv, betaltTil, takstmannId }: Props) {
  const [aktiv, setAktiv] = useState(erAktiv);
  const [laster, setLaster] = useState(false);

  const pris = getFylkePris(fylke.id);

  async function handleToggle() {
    if (!takstmannId) return;
    setLaster(true);

    if (aktiv) {
      const result = await deaktiverFylke(takstmannId, fylke.id);
      if (!result.error) setAktiv(false);
    } else {
      const result = await aktiverFylke(takstmannId, fylke.id);
      if (!result.error) setAktiv(true);
    }

    setLaster(false);
  }

  return (
    <div
      className={`portal-card p-5 transition-all ${
        aktiv ? "border-[#285982] bg-[#f0f7ff]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[#1e293b] font-semibold text-sm">{fylke.navn}</h3>
            {fylke.er_stor && (
              <span className="text-[10px] bg-[#1e4468] text-white px-1.5 py-0.5 rounded font-semibold">
                STOR
              </span>
            )}
          </div>
          <p className="text-[#285982] font-bold text-sm">{pris} kr/mnd</p>
          {aktiv && betaltTil && (
            <p className="text-xs text-[#64748b] mt-1">
              Aktiv til {new Date(betaltTil).toLocaleDateString("nb-NO")}
            </p>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={laster || !takstmannId}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            aktiv ? "bg-[#285982]" : "bg-[#e2e8f0]"
          }`}
          role="switch"
          aria-checked={aktiv}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
              aktiv ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {aktiv && (
        <div className="mt-3 pt-3 border-t border-[#dbeafe]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700 font-medium">Synlig i søkeresultater</span>
          </div>
        </div>
      )}
    </div>
  );
}
