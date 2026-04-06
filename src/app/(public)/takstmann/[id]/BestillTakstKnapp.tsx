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
  vippsLoginUrl: string;
}

type Steg = "knapp" | "skjema" | "sendt";

export default function BestillTakstKnapp({
  takstmannId,
  takstmannNavn,
  tjenester,
  kundeProfilId,
  meglerProfilId,
  isLoggedIn,
  vippsLoginUrl,
}: Props) {
  const [steg, setSteg] = useState<Steg>("knapp");
  const [tjeneste, setTjeneste] = useState(tjenester[0] ?? "");
  const [adresse, setAdresse] = useState("");
  const [melding, setMelding] = useState("");
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  async function handleSend() {
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
        honeypot: honeypot || undefined,
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

  // Ikke innlogget: vis Vipps-login-knapp (for privatkunder) + megler-alternativ
  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <p className="text-gray-400 text-xs">
          Logg inn med Vipps for å sende en bestilling. Vi henter kontaktinformasjonen din automatisk.
        </p>
        <a
          href={vippsLoginUrl}
          className="w-full flex items-center justify-center gap-3 bg-[#ff5b24] hover:bg-[#e64e1c] text-white font-semibold py-3 rounded-lg transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.88 6.56c-.85-.96-2.07-1.52-3.4-1.52-1.87 0-3.3.97-4.34 2.68C9.09 9.5 8.3 11.87 8.3 14.03c0 1.14.27 2.07.81 2.72.5.6 1.2.92 2.02.92 1.24 0 2.46-.84 3.52-2.42.14-.21.28-.43.41-.67l.04-.07c.07-.12.13-.25.2-.37.1.42.24.81.42 1.15.55 1.02 1.46 1.58 2.58 1.58 1.12 0 2.15-.53 2.97-1.53.76-.93 1.23-2.14 1.23-3.14 0-.42-.21-.65-.5-.65-.26 0-.45.18-.53.59-.24 1.28-1.45 3.28-3.01 3.28-.63 0-1.1-.32-1.36-.94-.2-.47-.3-1.07-.3-1.79 0-1.6.47-3.56 1.22-5.1.12-.25.17-.45.17-.62 0-.37-.24-.61-.57-.61-.28 0-.5.17-.7.55-.48.9-.94 2.14-1.3 3.53-.46 1.76-1.67 4.36-3.38 4.36-.87 0-1.37-.7-1.37-1.92 0-1.96.76-4.26 1.92-5.82.77-1.04 1.6-1.56 2.47-1.56.79 0 1.32.42 1.6 1.24.07.23.24.35.47.35.3 0 .55-.22.55-.55 0-.12-.03-.25-.08-.4-.46-1.26-1.4-2.01-2.65-2.01z"
              fill="white"
            />
          </svg>
          Logg inn med Vipps for å bestille
        </a>
        <p className="text-center text-gray-500 text-xs">
          Er du megler?{" "}
          <a href="/logg-inn" className="underline hover:text-gray-300 transition-colors">
            Logg inn her
          </a>
        </p>
      </div>
    );
  }

  // Innlogget, men ingen profil som kan bestille (f.eks. takstmann)
  if (!kundeProfilId && !meglerProfilId) {
    return (
      <p className="text-gray-500 text-sm text-center py-2">
        Du er innlogget som takstmann og kan ikke sende bestillinger.
      </p>
    );
  }

  if (steg === "skjema") {
    return (
      <div className="space-y-3">
        {/* Honeypot – skjult for brukere, bots fyller inn dette feltet */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, width: 0, overflow: "hidden" }}>
          <label htmlFor="website">Nettside (ikke fyll inn)</label>
          <input
            id="website"
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

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
