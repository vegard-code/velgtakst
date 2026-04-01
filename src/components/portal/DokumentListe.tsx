"use client";

import { useState } from "react";
import { DOKUMENT_TYPE_LABELS } from "@/lib/supabase/types";
import type { DokumentType } from "@/lib/supabase/types";

interface DokumentRad {
  id: string;
  navn: string;
  dokument_type: DokumentType | string;
  storrelse: number | null;
  storage_path: string;
  er_rapport: boolean;
  created_at: string;
}

interface Props {
  dokumenter: DokumentRad[];
  kunRapporter?: boolean;
}

function formatStorrelse(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DokumentTypeIkon({ type }: { type: string }) {
  if (type === "foto") {
    return (
      <svg className="w-4 h-4 text-[#285982] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (type === "skadetakst") {
    return (
      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (type === "verditakst") {
    return (
      <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-[#285982] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function NedlastKnapp({ dok }: { dok: DokumentRad }) {
  const [laster, setLaster] = useState(false);

  async function lastNed() {
    setLaster(true);
    try {
      const res = await fetch(`/api/dokumenter/signert-url?path=${encodeURIComponent(dok.storage_path)}`);
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = dok.navn;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    } catch {
      // Stille feil – kan legge til toast her
    }
    setLaster(false);
  }

  return (
    <button
      onClick={lastNed}
      disabled={laster}
      className="ml-auto flex items-center gap-1 text-xs text-[#285982] hover:underline disabled:opacity-50 shrink-0"
    >
      {laster ? (
        <div className="w-3.5 h-3.5 border-2 border-[#285982] border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      Last ned
    </button>
  );
}

export default function DokumentListe({ dokumenter, kunRapporter = false }: Props) {
  const synlige = kunRapporter ? dokumenter.filter((d) => d.er_rapport) : dokumenter;

  if (synlige.length === 0) {
    return (
      <p className="text-[#94a3b8] text-sm">
        {kunRapporter ? "Ingen rapporter lastet opp ennå" : "Ingen dokumenter lastet opp ennå"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {synlige.map((dok) => (
        <div
          key={dok.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
        >
          <DokumentTypeIkon type={dok.dokument_type ?? "annet"} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#1e293b] truncate font-medium">{dok.navn}</p>
            <p className="text-xs text-[#94a3b8]">
              {DOKUMENT_TYPE_LABELS[dok.dokument_type as DokumentType] ?? dok.dokument_type}
              {dok.storrelse ? ` · ${formatStorrelse(dok.storrelse)}` : ""}
              {" · "}
              {new Date(dok.created_at).toLocaleDateString("nb-NO")}
            </p>
          </div>
          <NedlastKnapp dok={dok} />
        </div>
      ))}
    </div>
  );
}
