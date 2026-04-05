"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrerTakstmann } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ALLE_TJENESTER } from "@/lib/supabase/types";
import VippsLoginKnapp from "@/components/VippsLoginKnapp";

export default function RegistrerTakstmannForm() {
  const router = useRouter();
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(false);
  const [steg, setSteg] = useState(1);

  // Steg 1: Bedriftsdata
  const [bedriftsdata, setBedriftsdata] = useState({
    firmanavn: "",
    orgnr: "",
    telefon_firma: "",
    epost_firma: "",
  });

  // Steg 2: Spesialiteter + tjenester
  const [spes1, setSpes1] = useState("");
  const [spes2, setSpes2] = useState("");
  const [valgteTjenester, setValgteTjenester] = useState<string[]>([]);

  // Steg 3: Sertifisering
  const [sertifisering, setSertifisering] = useState("");

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

    // Legg til tjenester
    formData.delete("tjenester");
    valgteTjenester
      .filter((t) => t !== spes1 && t !== spes2)
      .forEach((t) => formData.append("tjenester", t));

    const result = await registrerTakstmann(formData);

    if (result?.error) {
      setFeil(result.error);
      setLaster(false);
      return;
    }

    const supabase = createClient();
    const epost = formData.get("epost") as string;
    const passord = formData.get("passord") as string;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: epost,
      password: passord,
    });

    if (signInError) {
      router.push("/logg-inn");
      return;
    }

    router.push("/portal/takstmann");
    router.refresh();
  }

  const inputClass =
    "w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600";
  const selectClass =
    "w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors";

  return (
    <div className="bg-card-bg border border-card-border rounded-2xl p-8">
      {/* Vipps hurtigregistrering */}
      <VippsLoginKnapp
        rolle="takstmann_admin"
        redirect="/portal/takstmann"
        tekst="Registrer med Vipps"
      />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-card-border" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">eller manuelt</span>
        <div className="flex-1 h-px bg-card-border" />
      </div>

      {/* Steg-indikator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              s <= steg ? "bg-accent" : "bg-card-border"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ========== STEG 1: BEDRIFT ========== */}
        {steg === 1 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4">Bedriftsinformasjon</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Firmanavn *</label>
                <input name="firmanavn" required className={inputClass} placeholder="Takst AS" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Organisasjonsnummer</label>
                <input name="orgnr" pattern="[0-9]{9}" className={inputClass} placeholder="123456789" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Telefon</label>
                <input name="telefon_firma" className={inputClass} placeholder="22 33 44 55" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Faktura-epost *</label>
                <input name="epost_firma" type="email" required className={inputClass} placeholder="faktura@firma.no" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector("form");
                if (form) {
                  const fd = new FormData(form);
                  setBedriftsdata({
                    firmanavn: fd.get("firmanavn") as string || "",
                    orgnr: fd.get("orgnr") as string || "",
                    telefon_firma: fd.get("telefon_firma") as string || "",
                    epost_firma: fd.get("epost_firma") as string || "",
                  });
                }
                setSteg(2);
              }}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              Neste: Tjenester &rarr;
            </button>
          </>
        )}

        {/* ========== STEG 2: SPESIALITETER + TJENESTER ========== */}
        {steg === 2 && (
          <>
            <input type="hidden" name="firmanavn" value={bedriftsdata.firmanavn} />
            <input type="hidden" name="orgnr" value={bedriftsdata.orgnr} />
            <input type="hidden" name="telefon_firma" value={bedriftsdata.telefon_firma} />
            <input type="hidden" name="epost_firma" value={bedriftsdata.epost_firma} />

            <h2 className="text-white font-semibold text-lg mb-1">Hva tilbyr du?</h2>
            <p className="text-gray-400 text-sm mb-5">Velg dine spesialiteter og andre tjenester du utfører.</p>

            {/* Spesialiteter */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-300">Spesialitet (velg opptil 2)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={spes1}
                  onChange={(e) => {
                    setSpes1(e.target.value);
                    setValgteTjenester((prev) => prev.filter((t) => t !== e.target.value));
                  }}
                  className={selectClass}
                >
                  <option value="">Primær spesialitet</option>
                  {ALLE_TJENESTER.filter((t) => t !== spes2).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={spes2}
                  onChange={(e) => {
                    setSpes2(e.target.value);
                    setValgteTjenester((prev) => prev.filter((t) => t !== e.target.value));
                  }}
                  className={selectClass}
                >
                  <option value="">Sekundær (valgfri)</option>
                  {ALLE_TJENESTER.filter((t) => t !== spes1).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Utfører også */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Utfører også</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tilgjengeligeTjenester.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      valgteTjenester.includes(t)
                        ? "border-accent bg-accent/10 text-accent font-medium"
                        : "border-card-border text-gray-400 hover:border-gray-500"
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
                        ? "bg-accent border-accent"
                        : "border-gray-600"
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

            {/* Hidden fields for spesialiteter */}
            <input type="hidden" name="spesialitet" value={spes1} />
            <input type="hidden" name="spesialitet_2" value={spes2} />

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setSteg(1)}
                className="flex-1 border border-card-border text-gray-400 hover:text-white hover:border-gray-400 font-medium py-3 rounded-lg transition-colors"
              >
                &larr; Tilbake
              </button>
              <button
                type="button"
                onClick={() => setSteg(3)}
                className="flex-[2] bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Neste: Din bruker &rarr;
              </button>
            </div>
          </>
        )}

        {/* ========== STEG 3: BRUKERKONTO ========== */}
        {steg === 3 && (
          <>
            <input type="hidden" name="firmanavn" value={bedriftsdata.firmanavn} />
            <input type="hidden" name="orgnr" value={bedriftsdata.orgnr} />
            <input type="hidden" name="telefon_firma" value={bedriftsdata.telefon_firma} />
            <input type="hidden" name="epost_firma" value={bedriftsdata.epost_firma} />
            <input type="hidden" name="spesialitet" value={spes1} />
            <input type="hidden" name="spesialitet_2" value={spes2} />
            {valgteTjenester
              .filter((t) => t !== spes1 && t !== spes2)
              .map((t) => (
                <input key={t} type="hidden" name="tjenester" value={t} />
              ))}

            <h2 className="text-white font-semibold text-lg mb-4">Din brukerkonto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Fullt navn *</label>
                <input name="navn" required className={inputClass} placeholder="Ola Nordmann" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">E-postadresse *</label>
                <input name="epost" type="email" required className={inputClass} placeholder="ola@firma.no" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Passord *</label>
                <input name="passord" type="password" required minLength={8} className={inputClass} placeholder="Minst 8 tegn" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Bekreft passord *</label>
                <input name="passord_bekreft" type="password" required minLength={8} className={inputClass} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Mobilnummer</label>
                <input name="telefon" className={inputClass} placeholder="400 00 000" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Forbundstilknytning{" "}
                  <span className="text-gray-500 font-normal">(valgfritt)</span>
                </label>
                <select
                  name="sertifisering"
                  value={sertifisering}
                  onChange={(e) => setSertifisering(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Ingen tilknytning</option>
                  <option value="BMTF">BMTF (Byggmestrenes Takseringsforbund)</option>
                  <option value="Norsk Takst">Norsk Takst</option>
                  <option value="Annet">Annet</option>
                </select>
                {sertifisering === "Annet" && (
                  <input
                    name="sertifisering_annet"
                    className={`${inputClass} mt-2`}
                    placeholder="Spesifiser forbund eller organisasjon"
                  />
                )}
              </div>
            </div>

            {/* Oppsummering av valg */}
            {(spes1 || valgteTjenester.length > 0) && (
              <div className="bg-surface border border-card-border rounded-lg p-4 mt-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dine tjenester</p>
                <div className="flex flex-wrap gap-1.5">
                  {spes1 && (
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">{spes1}</span>
                  )}
                  {spes2 && (
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">{spes2}</span>
                  )}
                  {valgteTjenester
                    .filter((t) => t !== spes1 && t !== spes2)
                    .map((t) => (
                      <span key={t} className="text-xs bg-card-border text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                </div>
              </div>
            )}

            {feil && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                {feil}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Ved å opprette konto godtar du våre{" "}
              <a href="/vilkar" className="underline hover:text-gray-300">vilkår</a>
              {" "}og{" "}
              <a href="/personvern" className="underline hover:text-gray-300">personvernerklæring</a>.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSteg(2)}
                className="flex-1 border border-card-border text-gray-400 hover:text-white hover:border-gray-400 font-medium py-3 rounded-lg transition-colors"
              >
                &larr; Tilbake
              </button>
              <button
                type="submit"
                disabled={laster}
                className="flex-[2] bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                {laster ? "Registrerer..." : "Opprett konto"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
