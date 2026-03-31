"use client";

import { useState } from "react";
import { startVippsAbonnement, siOppAbonnement } from "@/lib/actions/abonnement";
import type { Abonnement } from "@/lib/supabase/types";

interface Props {
  abonnement: Abonnement | null;
  companyId: string;
  aktiveFylker: { navn: string; pris: number }[];
  maanedligKostnad: number;
}

export default function AbonnementKlient({ abonnement, companyId, aktiveFylker, maanedligKostnad }: Props) {
  const [laster, setLaster] = useState(false);
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(null);

  const erProveperiode = abonnement?.status === "proveperiode";
  const erAktiv = abonnement?.status === "aktiv";
  const erKansellert = abonnement?.status === "kansellert";
  const erUtlopt = abonnement?.status === "utlopt";

  const dagerIgjen = erProveperiode && abonnement?.proveperiode_slutt
    ? Math.max(0, Math.ceil((new Date(abonnement.proveperiode_slutt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  async function handleStartAbonnement() {
    setLaster(true);
    setMelding(null);

    const result = await startVippsAbonnement(companyId);

    if (result.error) {
      setMelding({ type: "feil", tekst: result.error });
      setLaster(false);
      return;
    }

    if (result.confirmationUrl) {
      // Redirect til Vipps for godkjenning
      window.location.href = result.confirmationUrl;
    }
  }

  async function handleSiOpp() {
    if (!confirm("Er du sikker på at du vil si opp abonnementet? Alle fylker vil bli deaktivert.")) return;

    setLaster(true);
    setMelding(null);

    const result = await siOppAbonnement(companyId);

    if (result.error) {
      setMelding({ type: "feil", tekst: result.error });
    } else {
      setMelding({ type: "ok", tekst: "Abonnementet er sagt opp." });
    }
    setLaster(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Abonnement</h1>

      {/* Status-kort */}
      <div className="portal-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-[#1e293b]">
                {erProveperiode && "Gratis prøveperiode"}
                {erAktiv && "Aktivt abonnement"}
                {erKansellert && "Kansellert"}
                {erUtlopt && "Utløpt"}
                {!abonnement && "Ingen abonnement"}
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                erProveperiode ? "bg-green-100 text-green-700" :
                erAktiv ? "bg-blue-100 text-blue-700" :
                erKansellert ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {erProveperiode && "Prøveperiode"}
                {erAktiv && "Aktiv"}
                {erKansellert && "Kansellert"}
                {erUtlopt && "Utløpt"}
              </span>
            </div>

            {erProveperiode && (
              <p className="text-[#64748b] text-sm">
                {dagerIgjen} dager igjen av prøveperioden. Utløper{" "}
                {new Date(abonnement!.proveperiode_slutt).toLocaleDateString("nb-NO", {
                  day: "numeric", month: "long", year: "numeric"
                })}.
              </p>
            )}

            {erAktiv && abonnement?.neste_trekk_dato && (
              <p className="text-[#64748b] text-sm">
                Neste trekk: {new Date(abonnement.neste_trekk_dato).toLocaleDateString("nb-NO")}
              </p>
            )}

            {erKansellert && (
              <p className="text-[#64748b] text-sm">
                Abonnementet er sagt opp. Du er ikke lenger synlig i søkeresultater.
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-[#285982]">
              {erProveperiode ? "0" : maanedligKostnad} <span className="text-base font-normal text-[#64748b]">kr/mnd</span>
            </p>
            {erProveperiode && (
              <p className="text-sm text-[#64748b]">{maanedligKostnad} kr/mnd etter prøveperiode</p>
            )}
          </div>
        </div>
      </div>

      {/* Aktive fylker */}
      {aktiveFylker.length > 0 && (
        <div className="portal-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-[#1e293b] mb-3">Aktive fylker</h3>
          <div className="space-y-2">
            {aktiveFylker.map((f) => (
              <div key={f.navn} className="flex items-center justify-between text-sm">
                <span className="text-[#374151]">{f.navn}</span>
                <span className="text-[#64748b]">{f.pris} kr/mnd</span>
              </div>
            ))}
            <div className="border-t border-[#e5e7eb] pt-2 mt-2 flex items-center justify-between font-semibold text-sm">
              <span className="text-[#1e293b]">Totalt</span>
              <span className="text-[#285982]">{maanedligKostnad} kr/mnd</span>
            </div>
          </div>
          <a href="/portal/takstmann/fylker" className="text-sm text-[#285982] hover:underline mt-3 inline-block">
            Administrer fylker →
          </a>
        </div>
      )}

      {aktiveFylker.length === 0 && (
        <div className="portal-card p-6 mb-6 text-center">
          <p className="text-[#64748b] text-sm mb-3">Du har ingen aktive fylker.</p>
          <a href="/portal/takstmann/fylker" className="portal-btn-primary inline-block text-sm">
            Aktiver fylker
          </a>
        </div>
      )}

      {/* Handlinger */}
      <div className="portal-card p-6">
        <h3 className="text-sm font-semibold text-[#1e293b] mb-4">Handlinger</h3>

        {erProveperiode && (
          <div className="space-y-3">
            <p className="text-sm text-[#64748b]">
              Du bruker gratis prøveperiode. Når prøveperioden utløper, kan du starte
              betalt abonnement via Vipps for å fortsette å være synlig.
            </p>
            <button
              onClick={handleStartAbonnement}
              disabled={laster || aktiveFylker.length === 0}
              className="portal-btn-primary w-full sm:w-auto"
            >
              {laster ? "Venter..." : "Start Vipps-abonnement nå"}
            </button>
            <p className="text-xs text-[#94a3b8]">
              Du kan også vente til prøveperioden utløper.
            </p>
          </div>
        )}

        {erAktiv && (
          <div className="space-y-3">
            <p className="text-sm text-[#64748b]">
              Abonnementet trekkes automatisk via Vipps hver måned.
            </p>
            <button
              onClick={handleSiOpp}
              disabled={laster}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              {laster ? "Venter..." : "Si opp abonnement"}
            </button>
          </div>
        )}

        {(erKansellert || erUtlopt) && (
          <div className="space-y-3">
            <p className="text-sm text-[#64748b]">
              Abonnementet ditt er ikke aktivt. Start et nytt abonnement for å bli synlig igjen.
            </p>
            <button
              onClick={handleStartAbonnement}
              disabled={laster || aktiveFylker.length === 0}
              className="portal-btn-primary w-full sm:w-auto"
            >
              {laster ? "Venter..." : "Start nytt abonnement via Vipps"}
            </button>
          </div>
        )}
      </div>

      {/* Meldinger */}
      {melding && (
        <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${
          melding.type === "ok"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {melding.tekst}
        </div>
      )}
    </div>
  );
}
