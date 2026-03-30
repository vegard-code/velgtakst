"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrerTakstmann } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import VippsLoginKnapp from "@/components/VippsLoginKnapp";

export default function RegistrerTakstmannForm() {
  const router = useRouter();
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(false);
  const [steg, setSteg] = useState(1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil("");
    setLaster(true);

    const formData = new FormData(e.currentTarget);
    const result = await registrerTakstmann(formData);

    if (result?.error) {
      setFeil(result.error);
      setLaster(false);
      return;
    }

    // Logg inn brukeren etter vellykket registrering
    const supabase = createClient();
    const epost = formData.get("epost") as string;
    const passord = formData.get("passord") as string;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: epost,
      password: passord,
    });

    if (signInError) {
      // Konto ble opprettet, men innlogging feilet – send til logg inn-siden
      router.push("/logg-inn");
      return;
    }

    router.push("/portal/takstmann");
    router.refresh();
  }

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
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              s <= steg ? "bg-accent" : "bg-card-border"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {steg === 1 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4">
              Bedriftsinformasjon
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Firmanavn *
                </label>
                <input
                  name="firmanavn"
                  required
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="Takst AS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Organisasjonsnummer
                </label>
                <input
                  name="orgnr"
                  pattern="[0-9]{9}"
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Telefon
                </label>
                <input
                  name="telefon_firma"
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="22 33 44 55"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Faktura-epost *
                </label>
                <input
                  name="epost_firma"
                  type="email"
                  required
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="faktura@firma.no"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSteg(2)}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              Neste: Din bruker &rarr;
            </button>
          </>
        )}

        {steg === 2 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4">
              Din brukerkonto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Fullt navn *
                </label>
                <input
                  name="navn"
                  required
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="Ola Nordmann"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  E-postadresse *
                </label>
                <input
                  name="epost"
                  type="email"
                  required
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="ola@firma.no"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Passord *
                </label>
                <input
                  name="passord"
                  type="password"
                  required
                  minLength={8}
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="Minst 8 tegn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Bekreft passord *
                </label>
                <input
                  name="passord_bekreft"
                  type="password"
                  required
                  minLength={8}
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Spesialitet
                </label>
                <select
                  name="spesialitet"
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">Velg spesialitet</option>
                  <option value="Boligtaksering">Boligtaksering</option>
                  <option value="Tilstandsrapport">Tilstandsrapport</option>
                  <option value="Verditakst">Verditakst</option>
                  <option value="Næringstaksering">Næringstaksering</option>
                  <option value="Skadetaksering">Skadetaksering</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Mobilnummer
                </label>
                <input
                  name="telefon"
                  className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                  placeholder="400 00 000"
                />
              </div>
            </div>

            {feil && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                {feil}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSteg(1)}
                className="flex-1 border border-card-border text-gray-400 hover:text-white hover:border-gray-400 font-medium py-3 rounded-lg transition-colors"
              >
                &larr; Tilbake
              </button>
              <button
                type="submit"
                disabled={laster}
                className="flex-2 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
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
