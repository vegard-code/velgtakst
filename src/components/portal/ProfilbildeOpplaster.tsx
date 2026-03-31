"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface Props {
  nåværendeBildeUrl: string | null;
  takstmannNavn: string;
}

export default function ProfilbildeOpplaster({ nåværendeBildeUrl, takstmannNavn }: Props) {
  const [bildeUrl, setBildeUrl] = useState(nåværendeBildeUrl);
  const [laster, setLaster] = useState(false);
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLaster(true);
    setMelding(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profilbilde", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMelding({ type: "feil", tekst: data.error ?? "Noe gikk galt" });
      } else {
        setBildeUrl(data.bildeUrl);
        setMelding({ type: "ok", tekst: "Profilbilde oppdatert!" });
      }
    } catch {
      setMelding({ type: "feil", tekst: "Kunne ikke laste opp bildet" });
    }

    setLaster(false);
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-5">
      {/* Bilde-preview */}
      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#e2e8f0] bg-[#f0f4f8] shrink-0">
        {bildeUrl ? (
          <Image
            src={bildeUrl}
            alt={takstmannNavn}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#285982]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}

        {laster && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          id="profilbilde-input"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={laster}
          className="text-sm text-[#285982] font-medium hover:underline"
        >
          {bildeUrl ? "Bytt profilbilde" : "Last opp profilbilde"}
        </button>
        <p className="text-xs text-[#94a3b8] mt-1">JPG, PNG eller WebP. Maks 5 MB.</p>

        {melding && (
          <p className={`text-xs mt-1 ${melding.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {melding.tekst}
          </p>
        )}
      </div>
    </div>
  );
}
