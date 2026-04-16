"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VippsLoginKnapp from "@/components/VippsLoginKnapp";

const vippsFeilmeldinger: Record<string, string> = {
  vipps_avbrutt: "Vipps-innlogging ble avbrutt. Prøv igjen.",
  ugyldig_forespørsel: "Ugyldig forespørsel. Prøv å logge inn på nytt.",
  ugyldig_state: "Sikkerhetssjekk feilet. Prøv å logge inn på nytt.",
  token_feil: "Kunne ikke fullføre Vipps-innlogging. Prøv igjen.",
  brukerinfo_feil: "Kunne ikke hente brukerinfo fra Vipps. Prøv igjen.",
  mangler_epost: "Vipps-kontoen mangler e-postadresse. Kontakt support.",
  opprett_bruker_feil: "Kunne ikke opprette brukerkonto. Prøv igjen eller kontakt support.",
  session_feil: "Kunne ikke opprette innloggingsøkt. Prøv igjen.",
  ukjent_feil: "En ukjent feil oppstod. Prøv igjen.",
};

type Rolle = "privatkunde" | "takstmann_admin" | "megler";

const roller = [
  {
    id: "privatkunde" as Rolle,
    tittel: "Privatkunde",
    beskrivelse: "Bestill takst for boligen din",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    redirect: "/portal/kunde",
    registrerUrl: "/registrer/kunde",
    registrerTekst: "Opprett kundekonto",
  },
  {
    id: "takstmann_admin" as Rolle,
    tittel: "Takstmann",
    beskrivelse: "Administrer oppdrag og profil",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
      </svg>
    ),
    redirect: "/portal/takstmann",
    registrerUrl: "/registrer/takstmann",
    registrerTekst: "Registrer takstfirma",
  },
  {
    id: "megler" as Rolle,
    tittel: "Megler",
    beskrivelse: "Bestill takst for dine kunder",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    redirect: "/portal/megler",
    registrerUrl: "/registrer/megler",
    registrerTekst: "Registrer meglerkonto",
  },
];

export default function LoggInnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "";
  const vippsError = searchParams.get("error");
  // Feildetaljer logges kun server-side, vises ikke i UI

  const [valgtRolle, setValgtRolle] = useState<Rolle | null>(null);
  const [visEpost, setVisEpost] = useState(false);
  const [epost, setEpost] = useState("");
  const [passord, setPassord] = useState("");
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(false);

  const aktivRolle = roller.find((r) => r.id === valgtRolle);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeil("");
    setLaster(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: epost,
      password: passord,
    });

    if (error) {
      setFeil("Feil e-post eller passord. Prøv igjen.");
      setLaster(false);
      return;
    }

    router.push(redirect || aktivRolle?.redirect || "/portal");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Vipps feilmelding fra callback */}
      {vippsError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          <p>{vippsFeilmeldinger[vippsError] ?? `Vipps-feil: ${vippsError}`}</p>
        </div>
      )}

      {/* Rolle-valg */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {roller.map((rolle) => {
          const erValgt = valgtRolle === rolle.id;
          return (
            <button
              key={rolle.id}
              type="button"
              onClick={() => setValgtRolle(erValgt ? null : rolle.id)}
              className={`
                relative flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                ${erValgt
                  ? "border-accent bg-accent/10 text-white shadow-lg shadow-accent/10"
                  : "border-card-border bg-card-bg text-gray-400 hover:border-gray-500 hover:text-gray-300"
                }
              `}
            >
              <div className={`${erValgt ? "text-accent" : "text-gray-500"} transition-colors`}>
                {rolle.ikon}
              </div>
              <span className={`font-semibold text-sm ${erValgt ? "text-white" : "text-gray-300"}`}>
                {rolle.tittel}
              </span>
              <span className="text-xs text-gray-500 leading-tight">
                {rolle.beskrivelse}
              </span>
            </button>
          );
        })}
      </div>

      {/* Innlogging (vises når rolle er valgt) */}
      {valgtRolle && aktivRolle && (
        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Logg inn som <span className="text-white font-medium">{aktivRolle.tittel.toLowerCase()}</span>
            </p>
          </div>

          {/* Vipps-innlogging */}
          <VippsLoginKnapp
            rolle={valgtRolle}
            redirect={redirect || aktivRolle.redirect}
            tekst={`Logg inn med Vipps`}
          />

          {/* E-post toggle */}
          {!visEpost ? (
            <button
              type="button"
              onClick={() => setVisEpost(true)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-400 transition-colors py-2"
            >
              Logg inn med e-post i stedet
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-card-border" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  eller med e-post
                </span>
                <div className="flex-1 h-px bg-card-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    E-postadresse
                  </label>
                  <input
                    type="email"
                    value={epost}
                    onChange={(e) => setEpost(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                    placeholder="din@epost.no"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Passord
                  </label>
                  <input
                    type="password"
                    value={passord}
                    onChange={(e) => setPassord(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
                    placeholder="••••••••"
                  />
                </div>

                {feil && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                    {feil}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={laster}
                  className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {laster ? "Logger inn..." : "Logg inn"}
                </button>
              </form>
            </>
          )}

          <div className="pt-2">
            <p className="text-center text-sm text-gray-500">
              Ny bruker?{" "}
              <Link
                href={aktivRolle.registrerUrl}
                className="text-accent hover:text-accent/80 transition-colors"
              >
                {aktivRolle.registrerTekst}
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Hint hvis ingen rolle er valgt */}
      {!valgtRolle && (
        <p className="text-center text-sm text-gray-500 animate-pulse">
          Velg din rolle for å logge inn
        </p>
      )}
    </div>
  );
}
