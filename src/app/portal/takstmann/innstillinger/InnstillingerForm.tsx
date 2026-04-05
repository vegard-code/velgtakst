"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { oppdaterInnstillinger } from "@/lib/actions/innstillinger";
import { ALLE_TJENESTER } from "@/lib/supabase/types";
import type { CompanySettings, TakstmannProfil } from "@/lib/supabase/types";
import ProfilbildeOpplaster from "@/components/portal/ProfilbildeOpplaster";
import Toast from "@/components/Toast";

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
  googleKoblet: boolean;
}

export default function InnstillingerForm({ profil, settings, takstmannProfil, googleKoblet }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFane = searchParams.get("fane") === "integrasjoner" ? "integrasjoner" : "profil";
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "google_tilkoblet") return { type: "ok", tekst: "Google Kalender er koblet til!" };
    if (success === "google_frakoblet") return { type: "ok", tekst: "Google Kalender er frakoblet." };
    if (error === "google_avbrutt") return { type: "feil", tekst: "Google-tilkobling ble avbrutt." };
    if (error === "token_feil") return { type: "feil", tekst: "Kunne ikke hente tokens fra Google. Prøv igjen." };
    return null;
  });
  const [laster, setLaster] = useState(false);
  const [aktifFane, setAktifFane] = useState<"profil" | "regnskap" | "purring" | "integrasjoner">(initialFane);
  const [frakobler, setFrakobler] = useState(false);

  // Spesialiteter (maks 2)
  const [spes1, setSpes1] = useState(takstmannProfil?.spesialitet ?? "");
  const [spes2, setSpes2] = useState(takstmannProfil?.spesialitet_2 ?? "");

  // Sertifisering
  const [sertifisering, setSertifisering] = useState(takstmannProfil?.sertifisering ?? "");

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

  async function handleFrakobleGoogle() {
    setFrakobler(true);
    try {
      const res = await fetch("/api/auth/google/disconnect?redirect=/portal/takstmann/innstillinger%3Ffane%3Dintegrasjoner%26success%3Dgoogle_frakoblet", {
        method: "POST",
        redirect: "follow",
      });
      if (res.redirected) {
        router.push(new URL(res.url).pathname + new URL(res.url).search);
      } else {
        router.refresh();
      }
    } catch {
      setMelding({ type: "feil", tekst: "Kunne ikke koble fra Google Kalender." });
    } finally {
      setFrakobler(false);
    }
  }

  const faner = [
    { id: "profil" as const, label: "Profil" },
    { id: "regnskap" as const, label: "Regnskapssystem" },
    { id: "purring" as const, label: "Faktura & Purring" },
    { id: "integrasjoner" as const, label: "Integrasjoner" },
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

            {/* Profilbilde */}
            <div className="border-b border-[#e2e8f0] pb-5">
              <label className="block text-sm font-medium text-[#374151] mb-3">Profilbilde</label>
              <ProfilbildeOpplaster
                nåværendeBildeUrl={takstmannProfil?.bilde_url ?? null}
                takstmannNavn={takstmannProfil?.navn ?? profil?.navn ?? ""}
              />
            </div>

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

            {/* Forbundstilknytning */}
            <div className="border-t border-[#e2e8f0] pt-5">
              <h3 className="text-[#1e293b] font-medium mb-1">Forbundstilknytning</h3>
              <p className="text-[#64748b] text-sm mb-4">Valgfritt. Vises som et merke på din offentlige profil.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Organisasjon</label>
                  <select
                    name="sertifisering"
                    value={sertifisering}
                    onChange={(e) => setSertifisering(e.target.value)}
                    className="portal-input"
                  >
                    <option value="">Ingen tilknytning</option>
                    <option value="BMTF">BMTF (Byggmesternes og Takstingeniørenes Forening)</option>
                    <option value="Norsk Takst">Norsk Takst</option>
                    <option value="Annet">Annet</option>
                  </select>
                </div>
                {sertifisering === "Annet" && (
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Spesifiser forbund</label>
                    <input
                      name="sertifisering_annet"
                      defaultValue={takstmannProfil?.sertifisering_annet ?? ""}
                      className="portal-input"
                      placeholder="Navn på forbund eller organisasjon"
                    />
                  </div>
                )}
              </div>
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
                <option value="poweroffice">PowerOffice GO</option>
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
            <div className="border-t border-[#e2e8f0] pt-4">
              <h3 className="text-sm font-semibold text-[#374151] mb-3">PowerOffice GO</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Client Key</label>
                  <input name="poweroffice_client_key" defaultValue={settings?.poweroffice_client_key ?? ""} className="portal-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Client Secret</label>
                  <input name="poweroffice_client_secret" type="password" defaultValue={settings?.poweroffice_client_secret ?? ""} className="portal-input" placeholder="••••••••••••" />
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

        {aktifFane === "integrasjoner" && (
          <>
            <h2 className="text-[#1e293b] font-semibold text-lg">Integrasjoner</h2>
            <p className="text-[#64748b] text-sm">
              Koble eksterne tjenester til portalen din.
            </p>

            {/* Google Calendar */}
            <div className="border border-[#e2e8f0] rounded-xl p-5">
              <div className="flex items-start gap-4">
                {/* Google ikon */}
                <div className="w-10 h-10 rounded-lg border border-[#e2e8f0] flex items-center justify-center bg-white shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[#1e293b] font-medium">Google Kalender</h3>
                    {googleKoblet ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Tilkoblet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] text-xs font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Ikke tilkoblet
                      </span>
                    )}
                  </div>
                  <p className="text-[#64748b] text-sm mb-4">
                    Synkroniser oppdrag automatisk til din Google Kalender. Nye oppdrag med befaringsdato legges inn som hendelser, og oppdateres automatisk ved endringer.
                  </p>

                  {googleKoblet ? (
                    <button
                      type="button"
                      onClick={handleFrakobleGoogle}
                      disabled={frakobler}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {frakobler ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Kobler fra...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          Koble fra Google Kalender
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/api/auth/google"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#285982] text-white hover:bg-[#1e4266] text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Koble Google Kalender
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {melding?.type === "feil" && (
          <div className="px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
            {melding.tekst}
          </div>
        )}

        {aktifFane !== "integrasjoner" && (
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={laster} className="portal-btn-primary">
              {laster ? "Lagrer..." : "Lagre innstillinger"}
            </button>
          </div>
        )}
      </form>
      <Toast
        melding={melding?.type === "ok" ? melding.tekst : null}
        onClose={() => setMelding(null)}
      />
    </div>
  );
}
