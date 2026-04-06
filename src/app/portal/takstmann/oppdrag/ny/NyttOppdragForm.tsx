"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { opprettOppdrag } from "@/lib/actions/oppdrag";
import type { OppdragType } from "@/lib/supabase/types";

export default function NyttOppdragForm({
  oppdragTyper,
}: {
  oppdragTyper: Record<OppdragType, string>;
}) {
  const router = useRouter();
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil(null);
    setLaster(true);

    const formData = new FormData(e.currentTarget);
    const resultat = await opprettOppdrag(formData);

    if (resultat?.error) {
      setFeil(resultat.error);
      setLaster(false);
    }
    // Ved suksess redirecter opprettOppdrag selv via redirect()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kundeinformasjon */}
      <div>
        <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide mb-3">
          Kundeinformasjon
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Kundens navn</label>
            <input
              name="kunde_navn"
              placeholder="Ola Nordmann / Eiendom AS"
              className="portal-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Kundens e-post</label>
            <input
              type="email"
              name="kunde_epost"
              placeholder="kunde@eksempel.no"
              className="portal-input"
            />
            <p className="text-xs text-[#94a3b8] mt-1">Brukes for fakturering</p>
          </div>
        </div>
      </div>

      <hr className="border-[#e2e8f0]" />

      {/* Oppdragsdetaljer */}
      <div>
        <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide mb-3">
          Oppdragsdetaljer
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Tittel *</label>
            <input
              name="tittel"
              required
              placeholder="F.eks. Tilstandsrapport Storgata 1"
              className="portal-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Type oppdrag *</label>
            <select name="oppdrag_type" required className="portal-input">
              <option value="">Velg type</option>
              {Object.entries(oppdragTyper).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Adresse</label>
            <input
              name="adresse"
              className="portal-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Postnr</label>
              <input name="postnr" className="portal-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">By</label>
              <input name="by" className="portal-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Befaringsdato</label>
              <input
                type="datetime-local"
                name="befaringsdato"
                className="portal-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Frist</label>
              <input
                type="date"
                name="frist"
                className="portal-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Pris (kr, eks. MVA)</label>
            <input
              type="number"
              name="pris"
              min="0"
              className="portal-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Beskrivelse</label>
            <textarea
              name="beskrivelse"
              rows={3}
              className="portal-input resize-none"
            />
          </div>
        </div>
      </div>

      {feil && (
        <div className="px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {feil}
        </div>
      )}

      <button
        type="submit"
        disabled={laster}
        className="w-full portal-btn-primary"
      >
        {laster ? "Oppretter..." : "Opprett oppdrag"}
      </button>
    </form>
  );
}
