"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SlettKontoSeksjon() {
  const router = useRouter();
  const [visDialog, setVisDialog] = useState(false);
  const [sletter, setSletter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  async function handleSlettKonto() {
    setSletter(true);
    setFeil(null);

    const res = await fetch("/api/auth/slett-konto", { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFeil(data.error ?? "Noe gikk galt. Prøv igjen.");
      setSletter(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="portal-card p-6 border border-red-200">
      <h2 className="text-[#1e293b] font-semibold text-lg mb-1">Slett konto</h2>
      <p className="text-[#64748b] text-sm mb-4">
        Dette vil permanent slette kontoen din og alle tilknyttede data. Handlingen kan ikke angres.
      </p>
      <button
        type="button"
        onClick={() => setVisDialog(true)}
        className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
      >
        Slett konto
      </button>

      {visDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-2">Er du sikker?</h3>
            <p className="text-[#64748b] text-sm mb-2">
              Du er i ferd med å slette kontoen din permanent. Dette vil fjerne:
            </p>
            <ul className="text-[#64748b] text-sm list-disc list-inside mb-4 space-y-1">
              <li>Profil og kontoinformasjon</li>
              <li>Alle meldinger og oppdrag</li>
              <li>Alle dokumenter og tilknyttede data</li>
            </ul>
            <p className="text-red-600 text-sm font-medium mb-6">
              Denne handlingen kan ikke angres.
            </p>

            {feil && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
                {feil}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setVisDialog(false)}
                disabled={sletter}
                className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[#374151] hover:bg-[#f8fafc] text-sm font-medium transition-colors"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSlettKonto}
                disabled={sletter}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {sletter ? "Sletter..." : "Ja, slett kontoen min"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
