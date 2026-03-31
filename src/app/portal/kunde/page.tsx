import Link from "next/link";
import { hentMinebestillinger } from "@/lib/actions/bestillinger";
import type { BestillingMedInfo } from "@/lib/actions/bestillinger";
import { hentSamtaler } from "@/lib/actions/meldinger";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus, OppdragType } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*  Tjenestekort-konfigurasjon                                        */
/* ------------------------------------------------------------------ */

interface Tjeneste {
  type: OppdragType;
  tittel: string;
  beskrivelse: string;
  ikon: React.ReactNode;
}

const TJENESTER: Tjeneste[] = [
  {
    type: "verditakst",
    tittel: "Verditakst",
    beskrivelse: "Verdivurdering av bolig for salg, refinansiering eller arv",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    type: "tilstandsrapport",
    tittel: "Tilstandsrapport",
    beskrivelse: "Teknisk vurdering av boligens tilstand ved kjøp eller salg",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    type: "skadetaksering",
    tittel: "Skadetakst",
    beskrivelse: "Taksering av skader fra brann, vann, storm eller annet",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    type: "reklamasjonsrapport",
    tittel: "Reklamasjonsrapport",
    beskrivelse: "Uavhengig vurdering ved reklamasjon etter boligkjøp",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    type: "næringstaksering",
    tittel: "Næringstakst",
    beskrivelse: "Verdivurdering av næringseiendom, kontor eller lager",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    type: "arealoppmaaling",
    tittel: "Arealoppmåling",
    beskrivelse: "Nøyaktig oppmåling av areal iht. gjeldende standarder",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    type: "annet",
    tittel: "Annet",
    beskrivelse: "Andre takst- og vurderingstjenester — beskriv ditt behov",
    ikon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Fremdriftssteg & badges                                           */
/* ------------------------------------------------------------------ */

const FREMGANG_STEG = [
  { status: ["ny"], label: "Bestilling sendt" },
  { status: ["akseptert"], label: "Akseptert" },
  { status: ["fullfort"], label: "Fullført" },
];

const STATUS_BADGE: Record<BestillingStatus, string> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  avvist: "portal-badge portal-badge-red",
  kansellert: "portal-badge portal-badge-gray",
  fullfort: "portal-badge portal-badge-green",
};

function aktivtSteg(status: BestillingStatus): number {
  if (status === "ny") return 0;
  if (status === "akseptert") return 1;
  if (status === "fullfort") return 2;
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Side-komponent                                                    */
/* ------------------------------------------------------------------ */

export default async function KundeDashboard() {
  const bestillinger = await hentMinebestillinger("kunde");
  const samtaler = await hentSamtaler();
  const aktiveBestillinger = bestillinger.filter(
    (b) => b.status !== "kansellert" && b.status !== "avvist"
  );
  const ulesteSamtaler = samtaler.filter((s) => s.uleste > 0).slice(0, 3);
  const totalUleste = samtaler.reduce((s, c) => s + c.uleste, 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Overskrift */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e293b]">Min side</h1>
        <p className="text-[#64748b] text-sm mt-0.5">
          Bestill en takstmann — velg tjenesten du trenger
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  Tjenestekort                                               */}
      {/* ---------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">
          Hva trenger du hjelp med?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TJENESTER.map((t) => (
            <Link
              key={t.type}
              href={`/portal/kunde/finn-takstmann?type=${t.type}`}
              className="portal-card portal-card-hover p-4 flex flex-col items-start gap-2 group transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-[#e8f0f8] text-[#285982] flex items-center justify-center group-hover:bg-[#285982] group-hover:text-white transition-colors">
                {t.ikon}
              </div>
              <div>
                <p className="text-[#1e293b] font-semibold text-sm">
                  {t.tittel}
                </p>
                <p className="text-[#64748b] text-xs leading-snug mt-0.5">
                  {t.beskrivelse}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  Uleste meldinger                                           */}
      {/* ---------------------------------------------------------- */}
      {ulesteSamtaler.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1e293b]">
              Uleste meldinger
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#285982] text-white text-xs font-bold">
                {totalUleste > 9 ? "9+" : totalUleste}
              </span>
            </h2>
            <Link href="/portal/kunde/meldinger" className="text-sm text-[#285982] hover:underline">
              Se alle
            </Link>
          </div>
          <div className="space-y-2">
            {ulesteSamtaler.map((s) => {
              const navn = s.takstmann?.navn ?? "Ukjent";
              return (
                <Link
                  key={s.id}
                  href={`/portal/kunde/meldinger/${s.id}`}
                  className="portal-card portal-card-hover p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[#285982]/10 flex items-center justify-center text-[#285982] font-semibold shrink-0">
                    {navn.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e293b] truncate">{navn}</p>
                    {s.siste_melding && (
                      <p className="text-xs text-[#94a3b8] truncate">{s.siste_melding.innhold}</p>
                    )}
                  </div>
                  <span className="w-5 h-5 rounded-full bg-[#285982] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {s.uleste > 9 ? "9+" : s.uleste}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Mine bestillinger                                          */}
      {/* ---------------------------------------------------------- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1e293b]">
            Mine bestillinger
          </h2>
          {aktiveBestillinger.length > 0 && (
            <Link
              href="/portal/kunde/oppdrag"
              className="text-sm text-[#285982] hover:underline"
            >
              Se alle
            </Link>
          )}
        </div>

        {aktiveBestillinger.length === 0 ? (
          <div className="portal-card p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#f0f4f8] flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-7 h-7 text-[#94a3b8]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-[#64748b] font-medium text-sm">
              Ingen aktive bestillinger ennå
            </p>
            <p className="text-[#94a3b8] text-xs mt-1">
              Velg en tjeneste over for å komme i gang.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {aktiveBestillinger.map((b: BestillingMedInfo) => {
              const stegIndex = aktivtSteg(b.status as BestillingStatus);
              return (
                <Link
                  key={b.id}
                  href={`/portal/kunde/oppdrag/${b.id}`}
                  className="block"
                >
                  <div className="portal-card portal-card-hover p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[#1e293b] font-semibold">
                          {b.takstmann?.navn ?? "Takstmann"}
                        </p>
                        {b.takstmann?.spesialitet && (
                          <p className="text-[#64748b] text-sm">
                            {b.takstmann.spesialitet}
                          </p>
                        )}
                      </div>
                      <span
                        className={
                          STATUS_BADGE[b.status as BestillingStatus] ??
                          "portal-badge portal-badge-gray"
                        }
                      >
                        {BESTILLING_STATUS_LABELS[
                          b.status as BestillingStatus
                        ] ?? b.status}
                      </span>
                    </div>

                    {/* Fremdriftstrapp */}
                    <div className="flex items-center gap-0">
                      {FREMGANG_STEG.map((steg, i) => (
                        <div key={steg.label} className="flex items-center flex-1">
                          <div
                            className={`flex items-center gap-2 ${
                              i < FREMGANG_STEG.length ? "flex-1" : ""
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                i <= stegIndex
                                  ? "bg-[#285982] text-white"
                                  : "bg-[#e2e8f0] text-[#94a3b8]"
                              }`}
                            >
                              {i < stegIndex ? (
                                <svg
                                  className="w-4 h-4"
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
                              ) : (
                                i + 1
                              )}
                            </div>
                            <span
                              className={`text-xs hidden sm:block ${
                                i <= stegIndex
                                  ? "text-[#285982] font-medium"
                                  : "text-[#94a3b8]"
                              }`}
                            >
                              {steg.label}
                            </span>
                          </div>
                          {i < FREMGANG_STEG.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-2 ${
                                i < stegIndex ? "bg-[#285982]" : "bg-[#e2e8f0]"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
