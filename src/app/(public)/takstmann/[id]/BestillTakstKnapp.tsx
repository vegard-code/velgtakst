"use client";

import { useState } from "react";
import { opprettBestillingFraPublikk } from "@/lib/actions/bestillinger";

interface Props {
  takstmannId: string;
  takstmannNavn: string;
  tjenester: string[];
  // Passed from server component after auth check
  kundeProfilId?: string;
  meglerProfilId?: string;
  isLoggedIn: boolean;
}

type Steg = "knapp" | "skjema" | "sendt";

export default function BestillTakstKnapp({
  takstmannId,
  takstmannNavn,
  tjenester,
  kundeProfilId,
  meglerProfilId,
  isLoggedIn,
}: Props) {
  const [steg, setSteg] = useState<Steg>("knapp");
  const [tjeneste, setTjeneste] = useState(tjenester[0] ?? "");
  const [adresse, setAdresse] = useState("");
  const [melding, setMelding] = useState("");
  const [guestNavn, setGuestNavn] = useState("");
  const [guestEpost, setGuestEpost] = useState("");
  const [guestTelefon, setGuestTelefon] = useState("");
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  // Not logged in at all, or logged in but no profile
  const trengerKontaktInfo = !kundeProfilId && !meglerProfilId;

  async function handleSend() {
    if (trengerKontaktInfo && !guestNavn.trim()) {
      setFeil("Du må skrive inn navnet ditt før du kan sende bestillingen.");
      return;
    }
    setFeil(null);
    setLaster(true);

    try {
      const result = await opprettBestillingFraPublikk({
        takstmannId,
        tjeneste: tjeneste || undefined,
        adresse: adresse.trim() || undefined,
        melding: melding.trim() || undefined,
        kundeProfilId,
        meglerProfilId,
        guestNavn: trengerKontaktInfo ? guestNavn.trim() : undefined,
        guestEpost: trengerKontaktInfo ? guestEpost.trim() : undefined,
        guestTelefon: trengerKontaktInfo ? guestTelefon.trim() : undefined,
      });

      if (result.error) {
        setFeil(`Kunne ikke sende bestillingen: ${result.error}`);
      } else {
        setSteg("sendt");
      }
    } catch {
      setFeil("En uventet feil oppstod. Vennligst prøv igjen eller kontakt oss direkte.");
    } finally {
      setLaster(false);
    }
  }

  if (steg === "sendt") {
    return (
      <div className="text-center py-3">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-medium text-sm">Bestilling sendt!</p>
        <p className="text-gray-400 text-xs mt-1">
          {takstmannNavn.split(" ")[0]} tar kontakt med deg snart.
        </p>
      </div>
    );
  }

  if (steg === "skjema") {
    return (
      <div className="space-y-3">
        {/* Kontaktinfo for gjester — øverst så det ikke overses */}
        {trengerKontaktInfo && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2">
            <p className="text-accent text-xs font-semibold uppercase tracking-wide">Din kontaktinfo (påkrevd)</p>
            <input
              type="text"
              value={guestNavn}
              onChange={(e) => setGuestNavn(e.target.value)}
              placeholder="Fullt navn *"
              className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="tel"
              value={guestTelefon}
              onChange={(e) => setGuestTelefon(e.target.value)}
              placeholder="Telefonnummer"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="email"
              value={guestEpost}
              onChange={(e) => setGuestEpost(e.target.value)}
              placeholder="E-postadresse"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-gray-500">
              Eller{" "}
              <a href="/logg-inn" className="text-accent hover:underline">
                logg inn
              </a>{" "}
              for å bruke din profil.
            </p>
          </div>
        )}

        {/* Tjenestetype */}
        {tjenester.length > 0 && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type tjeneste</label>
            <select
              value={tjeneste}
              onChange={(e) => setTjeneste(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {tjenester.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Adresse */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Adresse for befaring</label>
          <input
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Gateadresse, postnummer"
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Melding */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Melding (valgfritt)</label>
          <textarea
            value={melding}
            onChange={(e) => setMelding(e.target.value)}
            placeholder={`Beskriv kort hva du trenger hjelp med...`}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 resize-y focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Feilmelding */}
        {feil && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-red-300 text-sm">{feil}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setSteg("knapp"); setFeil(null); }}
            className="flex-1 text-sm text-gray-400 border border-gray-700 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSend}
            disabled={laster}
            className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-sm py-2 rounded-lg font-medium transition-colors"
          >
            {laster ? "Sender..." : "Send bestilling"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setSteg("skjema")}
      className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-3 rounded-lg font-medium transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Bestill takst
    </button>
  );
}
