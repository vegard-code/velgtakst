"use client";

import { useState } from "react";
import { oppdaterInnstillinger } from "@/lib/actions/innstillinger";
import { ALLE_TJENESTER } from "@/lib/supabase/types";
import type { CompanySettings, TakstmannProfil } from "@/lib/supabase/types";

interface Props {
  profil: {
    id: string;
    navn: string;
    telefon: string | null;
    company_id: string | null;
    company?: { id: string; navn: string; orgnr: string | null; epost: string; adresse: string | null } | null;
  } | null;
  settings: CompanySettings | null;
  takstmannProfil: TakstmannProfil | null;
}

export default function InnstillingerForm({ profil, settings, takstmannProfil }: Props) {
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(null);
  const [laster, setLaster] = useState(false);
  const [aktifFane, setAktifFane] = useState<"profil" | "regnskap" | "purring">("profil");

  // Spesialiteter (maks 2)
  const [spes1, setSpes1] = useState(takstmannProfil?.spesialitet ?? "");
  const [spes2, setSpes2] = useState(takstmannProfil?.spesialitet_2 ?? "");

  // Tjenester (checkboxes)
  const [valgteTjenester, setValgteTjenester] = useState<string[]>(
    takstmannProfil?.tjenester ?? []
  );

  function toggleTjeneste(t: string) {
    setValgteTjenester((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  // Filtrer bort valgte spesialiteter fra tjenester-listen
  const tilgjengeligeTjenester = ALLE_TJENESTER.filter(
    (t) => t !== spes1 && t !== spes2
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMelding(null);
    setLaster(true);

    const formData = new FormData(e.currentTarget);
    formData.set("fane", aktifFane);

    // Legg til tjenester som multiple values
    formData.delete("tjenester");
    valgteTjenester
      .filter((t) => t !== spes1 && t !== spes2)
      .forEach((t) => formData.append("tjenester", t));

    const result = await oppdaterInnstillinger(formData);

    setMelding(result.error
      ? { type: "feil", tekst: result.error }
      : { type: "ok", tekst: "Innstillinger lagret!" }
    );
    setLaster(false);
  }

  const faner = [
    { id: "profil" as const, label: "Profil" },
    { id: "regnskap" as const, label: "Regnskapssystem" },
    { id: "purring" as const, label: "Faktura & Purring" },
  ];

  return (
    <div className="space-y-6">
      {/* Fane-tabs */}
      <div className="flex gap-1 p-1 bg-[#f0f4f8] rounded-xl">
        {faner.map((fane) => (
          <button
            key={fane.id}
            onClick={() => setAktifFane(fane.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              aktifFane === fane.id
                ? "bg-white text-[#285982] shadow-sm"
                : "text-[#64748b] hover:text-[#285982]"
            }`}
          >
            {fane.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="portal-card p-6 space-y-5">
        {aktifFane === "profil" && (
          <>
            <h2 className="text-[#1e293b] font-semibold text-lg">Din profil</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Fullt navn</label>
                <input name="navn" defaultValue={takstmannProfil?.navn ?? profil?.navn ?? ""} className="portal-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Telefon</label>
                <input name="telefon" defaultValue={takstmannProfil?.telefon ?? ""} className="portal-input" />
              </div>
            </div>

            {/* Spesialiteter (maks 2) */}
            <div className="border-t border-[#e2e8f0] pt-5">
              <h3 className="text-[#1e293b] font-medium mb-1">Spesialitet</h3>
              <p className="text-[#64748b] text-sm mb-4">Velg opptil 2 fagområder du spesialiserer deg på.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Primær spesialitet</label>
                  <select
                    name="spesialitet"
                    value={spes1}
                    onChange={(e) => {
                      setSpes1(e.target.value);
                      // Fjern fra tjenester om den var valgt der
                      setValgteTjenester((prev) => prev.filter((t) => t !== e.target.value));
                    }}
                    className="portal-input"
                  >
                    <option value="">Velg spesialitet</option>
                    {ALLE_TJENESTER.filter((t) => t !== spes2).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Sekundær spesialitet</label>
                  <select
                    name="spesialitet_2"
                    value={spes2}
                    onChange={(e) => {
                      setSpes2(e.target.value);
                      setValgteTjenester((prev) => prev.filter((t) => t !== e.target.value));
                    }}
                    className="portal-input"
                  >
                    <option value="">Ingen</option>
                    {ALLE_TJENESTER.filter((t) => t !== spes1).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Utfører også (checkboxes) */}
            <div className="border-t border-[#e2e8f0] pt-5">
              <h3 className="text-[#1e293b] font-medium mb-1">Utfører også</h3>
              <p className="text-[#64748b] text-sm mb-4">Kryss av for andre oppdragstyper du tar.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tilgjengeligeTjenester.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      valgteTjenester.includes(t)
                        ? "border-[#285982] bg-[#e8f0f8] text-[#285982] font-medium"
                        : "border-[#e2e8f0] text-[#374151] hover:border-[#cbd5e1]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={valgteTjenester.includes(t)}
                      onChange={() => toggleTjeneste(t)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      valgteTjenester.includes(t)
                        ? "bg-[#285982] border-[#285982]"
                        : "border-[#cbd5e1]"
                    }`}>
                      {valgteTjenester.includes(t) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {t}
                  </label>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="border-t border-[#e2e8f0] pt-5">
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Om deg (vises på profilen)</label>
              <textarea name="bio" defaultValue={takstmannProfil?.bio ?? ""} rows={4} className="portal-input resize-none" placeholder="Beskriv din bakgrunn og erfaring..." />
            </div>

            {/* Bedriftsinformasjon */}
            <div className="border-t border-[#e2e8f0] pt-5">
              <h3 className="text-[#1e293b] font-medium mb-4">Bedriftsinformasjon</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Firmanavn</label>
                  <input name="firmanavn" defaultValue={profil?.company?.navn ?? ""} className="portal-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Organisasjonsnummer</label>
                  <input name="orgnr" defaultValue={profil?.company?.orgnr ?? ""} className="portal-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Faktura-epost</label>
                  <input name="epost_firma" type="email" defaultValue={profil?.company?.epost ?? ""} className="portal-input" />
                </div>
              </div>
            </div>
          </>
        )}

        {aktifFane === "regnskap" && (
          <>
            <h2 className="text-[#1e293b] font-semibold text-lg">Regnskapssystem</h2>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Velg system</label>
              <select name="regnskap_system" defaultValue={settings?.regnskap_system ?? "ingen"} className="portal-input">
                <option value="ingen">Ingen integrasjon</option>
                <option value="fiken">Fiken</option>
                <option value="tripletex">Tripletex</option>
              </select>
            </div>
            <div className="border-t border-[#e2e8f0] pt-4">
              <h3 className="text-sm font-semibold text-[#374151] mb-3">Fiken</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Fiken bedrifts-ID</label>
                  <input name="fiken_company_id" defaultValue={settings?.fiken_company_id ?? ""} className="portal-input" placeholder="123456" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Fiken API-token</label>
                  <input name="fiken_api_token" type="password" defaultValue={settings?.fiken_api_token ?? ""} className="portal-input" placeholder="••••••••••••" />
                </div>
              </div>
            </div>
            <div className="border-t border-[#e2e8f0] pt-4">
              <h3 className="text-sm font-semibold text-[#374151] mb-3">Tripletex</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Tripletex bedrifts-ID</label>
                  <input name="tripletex_company_id" defaultValue={settings?.tripletex_company_id ?? ""} className="portal-input" placeholder="123456" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Employee token</label>
                  <input name="tripletex_employee_token" type="password" defaultValue={settings?.tripletex_employee_token ?? ""} className="portal-input" placeholder="••••••••••••" />
                </div>
              </div>
            </div>
          </>
        )}

        {aktifFane === "purring" && (
          <>
            <h2 className="text-[#1e293b] font-semibold text-lg">Faktura og purring</h2>
            <p className="text-[#64748b] text-sm">
              Konfigurer automatisk purring etter betalingsfristen.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">1. purring etter (dager)</label>
                <input name="purring_dager_1" type="number" min="1" max="90" defaultValue={settings?.purring_dager_1 ?? 14} className="portal-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">2. purring etter (dager)</label>
                <input name="purring_dager_2" type="number" min="1" max="90" defaultValue={settings?.purring_dager_2 ?? 28} className="portal-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Inkasso etter (dager)</label>
                <input name="inkasso_dager" type="number" min="1" max="180" defaultValue={settings?.inkasso_dager ?? 60} className="portal-input" />
              </div>
            </div>
          </>
        )}

        {melding && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              melding.type === "ok"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {melding.tekst}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={laster} className="portal-btn-primary">
            {laster ? "Lagrer..." : "Lagre innstillinger"}
          </button>
        </div>
      </form>
    </div>
  );
}
