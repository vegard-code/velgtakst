"use client";

import { useState } from "react";
import { fullforOnboarding } from "@/lib/actions/onboarding";
import { ALLE_TJENESTER } from "@/lib/supabase/types";

export default function OnboardingForm({ navn }: { navn: string }) {
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(false);
  const [spes1, setSpes1] = useState("");
  const [spes2, setSpes2] = useState("");
  const [valgteTjenester, setValgteTjenester] = useState<string[]>([]);

  function toggleTjeneste(t: string) {
    setValgteTjenester((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  const tilgjengeligeTjenester = ALLE_TJENESTER.filter(
    (t) => t !== spes1 && t !== spes2
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil("");
    setLaster(true);

    const formData = new FormData(e.currentTarget);

    formData.delete("tjenester");
    valgteTjenester
      .filter((t) => t !== spes1 && t !== spes2)
      .forEach((t) => formData.append("tjenester", t));

    const result = await fullforOnboarding(formData);

    if (result?.error) {
      setFeil(result.error);
      setLaster(false);
    }
    // Ved suksess: server action redirecter til /portal/takstmann
  }

  const inputClass =
    "w-full border border-[#d1dbe8] rounded-lg px-4 py-3 text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#285982] focus:ring-1 focus:ring-[#285982] transition-colors placeholder-[#94a3b8]";
  const selectClass =
    "w-full border border-[#d1dbe8] rounded-lg px-4 py-3 text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#285982] focus:ring-1 focus:ring-[#285982] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bedriftsinformasjon */}
      <div>
        <h2 className="text-[#1e293b] font-semibold text-base mb-4">
          Bedriftsinformasjon
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Firmanavn <span className="text-red-500">*</span>
            </label>
            <input
              name="firmanavn"
              required
              className={inputClass}
              placeholder="Takst AS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Organisasjonsnummer
            </label>
            <input
              name="orgnr"
              pattern="[0-9]{9}"
              title="9 siffer"
              className={inputClass}
              placeholder="123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Telefon
            </label>
            <input
              name="telefon_firma"
              className={inputClass}
              placeholder="22 33 44 55"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Faktura-epost <span className="text-red-500">*</span>
            </label>
            <input
              name="epost_firma"
              type="email"
              required
              className={inputClass}
              placeholder="faktura@firma.no"
            />
          </div>
        </div>
      </div>

      {/* Skillelinje */}
      <div className="border-t border-[#e2e8f0]" />

      {/* Tjenester */}
      <div>
        <h2 className="text-[#1e293b] font-semibold text-base mb-1">
          Hva tilbyr du?
        </h2>
        <p className="text-[#64748b] text-sm mb-4">
          Velg dine spesialiteter og andre tjenester du utfører.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Spesialitet (velg opptil 2)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={spes1}
                onChange={(e) => {
                  setSpes1(e.target.value);
                  setValgteTjenester((prev) =>
                    prev.filter((t) => t !== e.target.value)
                  );
                }}
                className={selectClass}
              >
                <option value="">Primær spesialitet</option>
                {ALLE_TJENESTER.filter((t) => t !== spes2).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={spes2}
                onChange={(e) => {
                  setSpes2(e.target.value);
                  setValgteTjenester((prev) =>
                    prev.filter((t) => t !== e.target.value)
                  );
                }}
                className={selectClass}
              >
                <option value="">Sekundær (valgfri)</option>
                {ALLE_TJENESTER.filter((t) => t !== spes1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input type="hidden" name="spesialitet" value={spes1} />
          <input type="hidden" name="spesialitet_2" value={spes2} />

          {tilgjengeligeTjenester.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Utfører også
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tilgjengeligeTjenester.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      valgteTjenester.includes(t)
                        ? "border-[#285982] bg-[#285982]/10 text-[#285982] font-medium"
                        : "border-[#d1dbe8] text-[#64748b] hover:border-[#94a3b8]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={valgteTjenester.includes(t)}
                      onChange={() => toggleTjeneste(t)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        valgteTjenester.includes(t)
                          ? "bg-[#285982] border-[#285982]"
                          : "border-[#94a3b8]"
                      }`}
                    >
                      {valgteTjenester.includes(t) && (
                        <svg
                          className="w-3 h-3 text-white"
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
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {feil && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {feil}
        </div>
      )}

      <button
        type="submit"
        disabled={laster}
        className="w-full bg-[#285982] hover:bg-[#1e4568] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {laster ? "Lagrer..." : "Fullfør registrering →"}
      </button>

      <p className="text-xs text-[#94a3b8] text-center">
        Du kan endre denne informasjonen senere under Innstillinger.
      </p>
    </form>
  );
}
