"use client";

import { useState } from "react";
import { sendVurdering } from "@/lib/actions/vurderinger";

interface Props {
  takstmannId: string;
  bestillingId: string;
  takstmannNavn: string;
}

export default function VurderingSkjema({ takstmannId, bestillingId, takstmannNavn }: Props) {
  const [karakter, setKarakter] = useState(0);
  const [hover, setHover] = useState(0);
  const [kommentar, setKommentar] = useState("");
  const [laster, setLaster] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (karakter === 0) {
      setFeil("Velg en karakter (1-5 stjerner)");
      return;
    }
    setLaster(true);
    setFeil(null);

    const result = await sendVurdering({
      takstmannId,
      bestillingId,
      karakter,
      kommentar: kommentar || undefined,
    });

    if (result.error) {
      setFeil(result.error);
      setLaster(false);
    } else {
      setSendt(true);
      setLaster(false);
    }
  }

  if (sendt) {
    return (
      <div className="portal-card p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-green-800 font-semibold">Takk for din vurdering!</p>
            <p className="text-green-600 text-sm">Din tilbakemelding hjelper andre med å finne gode takstmenn.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-card p-6">
      <h2 className="text-[#1e293b] font-semibold mb-1">Gi vurdering</h2>
      <p className="text-[#64748b] text-sm mb-4">Hvordan var din opplevelse med {takstmannNavn}?</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stjerner */}
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setKarakter(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <svg
                  className={`w-8 h-8 ${
                    n <= (hover || karakter)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-[#d1d5db] fill-[#d1d5db]"
                  } transition-colors`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          {karakter > 0 && (
            <p className="text-sm text-[#64748b] mt-1">
              {karakter === 1 && "Dårlig"}
              {karakter === 2 && "Under middels"}
              {karakter === 3 && "OK"}
              {karakter === 4 && "Bra"}
              {karakter === 5 && "Utmerket"}
            </p>
          )}
        </div>

        {/* Kommentar */}
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Kommentar (valgfritt)
          </label>
          <textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            rows={3}
            className="portal-input resize-none"
            placeholder="Fortell om din erfaring..."
            maxLength={500}
          />
          <p className="text-xs text-[#94a3b8] mt-1">{kommentar.length}/500</p>
        </div>

        {feil && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {feil}
          </div>
        )}

        <button
          type="submit"
          disabled={laster || karakter === 0}
          className="portal-btn-primary"
        >
          {laster ? "Sender..." : "Send vurdering"}
        </button>
      </form>
    </div>
  );
}
