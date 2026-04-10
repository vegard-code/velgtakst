"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DOKUMENT_TYPE_LABELS } from "@/lib/supabase/types";
import type { Dokument, DokumentType } from "@/lib/supabase/types";

interface Props {
  oppdragId: string;
  initialDokumenter: Dokument[];
  innloggetBrukerId: string;
}

function formatStorrelse(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DokumentTypeIkon({ type }: { type: DokumentType }) {
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
  // tilstandsrapport + annet
  return (
    <svg className="w-4 h-4 text-[#285982] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function DokumentOpplaster({ oppdragId, initialDokumenter, innloggetBrukerId }: Props) {
  const router = useRouter();
  const [dokumenter, setDokumenter] = useState<Dokument[]>(initialDokumenter);
  const [valgtType, setValgtType] = useState<DokumentType>("tilstandsrapport");
  const [laster, setLaster] = useState(false);
  const [sletter, setSletter] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function lastOppFil(fil: File) {
    setLaster(true);
    setMelding(null);

    const formData = new FormData();
    formData.append("fil", fil);
    formData.append("oppdrag_id", oppdragId);
    formData.append("dokument_type", valgtType);

    try {
      const res = await fetch("/api/dokumenter/last-opp", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMelding({ type: "feil", tekst: data.error ?? "Opplasting feilet" });
      } else {
        setDokumenter((prev) => [...prev, data.dokument]);
        setMelding({ type: "ok", tekst: `«${fil.name}» er lastet opp.` });
        router.refresh();
      }
    } catch {
      setMelding({ type: "feil", tekst: "Nettverksfeil – prøv igjen" });
    }

    setLaster(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFilValg(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    if (fil) lastOppFil(fil);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const fil = e.dataTransfer.files?.[0];
      if (fil) lastOppFil(fil);
    },
    [valgtType, oppdragId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function slettDokument(id: string) {
    setSletter(id);
    try {
      const res = await fetch("/api/dokumenter/slett", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDokumenter((prev) => prev.filter((d) => d.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        setMelding({ type: "feil", tekst: data.error ?? "Kunne ikke slette" });
      }
    } catch {
      setMelding({ type: "feil", tekst: "Nettverksfeil ved sletting" });
    }
    setSletter(null);
  }

  async function lastNed(dok: Dokument) {
    try {
      const res = await fetch(`/api/dokumenter/signert-url?id=${encodeURIComponent(dok.id)}`);
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
      setMelding({ type: "feil", tekst: "Kunne ikke hente nedlastingslenke" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Eksisterende dokumenter */}
      {dokumenter.length > 0 && (
        <div className="space-y-2">
          {dokumenter.map((dok) => (
            <div
              key={dok.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
            >
              <DokumentTypeIkon type={dok.dokument_type ?? "annet"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1e293b] truncate font-medium">{dok.navn}</p>
                <p className="text-xs text-[#94a3b8]">
                  {DOKUMENT_TYPE_LABELS[dok.dokument_type ?? "annet"]}
                  {dok.storrelse ? ` · ${formatStorrelse(dok.storrelse)}` : ""}
                  {" · "}
                  {new Date(dok.created_at).toLocaleDateString("nb-NO")}
                </p>
              </div>
              <button
                onClick={() => lastNed(dok)}
                className="text-xs text-[#285982] hover:underline shrink-0"
                title="Last ned"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {dok.lastet_opp_av === innloggetBrukerId && (
                <button
                  onClick={() => slettDokument(dok.id)}
                  disabled={sletter === dok.id}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50"
                  title="Slett"
                >
                  {sletter === dok.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Opplastingssone */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs text-[#64748b] whitespace-nowrap">Dokumenttype:</label>
          <select
            value={valgtType}
            onChange={(e) => setValgtType(e.target.value as DokumentType)}
            className="flex-1 text-sm border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-[#285982]/30"
            disabled={laster}
          >
            {(Object.keys(DOKUMENT_TYPE_LABELS) as DokumentType[]).map((type) => (
              <option key={type} value={type}>
                {DOKUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !laster && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#285982] bg-[#f0f7ff]"
              : "border-[#e2e8f0] hover:border-[#285982]/50 hover:bg-[#f8fafc]"
          } ${laster ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFilValg}
            className="hidden"
          />
          {laster ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#285982] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#64748b]">Laster opp...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-[#64748b]">
                Dra og slipp fil her, eller <span className="text-[#285982] font-medium">velg fil</span>
              </p>
              <p className="text-xs text-[#94a3b8]">PDF, JPG, PNG, WebP · Maks 50 MB</p>
            </div>
          )}
        </div>
      </div>

      {melding && (
        <p className={`text-sm ${melding.type === "ok" ? "text-green-600" : "text-red-600"}`}>
          {melding.tekst}
        </p>
      )}
    </div>
  );
}
