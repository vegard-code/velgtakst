"use client";

import { opprettOppdrag } from "@/lib/actions/oppdrag";
import type { OppdragType } from "@/lib/supabase/types";
import { OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";

export default function NyttOppdragForm({
  oppdragTyper,
}: {
  oppdragTyper: Record<OppdragType, string>;
}) {
  return (
    <form action={opprettOppdrag as unknown as (formData: FormData) => void} className="space-y-4">
      <fieldset className="border border-[#e2e8f0] rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold text-[#285982] px-1">Kundeinformasjon</legend>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Kundens navn</label>
          <input
            name="kunde_navn"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Kundens e-post</label>
          <input
            type="email"
            name="kunde_epost"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
      </fieldset>
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1">Tittel *</label>
        <input
          name="tittel"
          required
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1">Type oppdrag *</label>
        <select
          name="oppdrag_type"
          required
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
        >
          <option value="">Velg type</option>
          {Object.entries(oppdragTyper).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1">Adresse</label>
        <input
          name="adresse"
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Postnr</label>
          <input
            name="postnr"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">By</label>
          <input
            name="by"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Befaringsdato</label>
          <input
            type="date"
            name="befaringsdato"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Frist</label>
          <input
            type="date"
            name="frist"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1">Pris (kr)</label>
        <input
          type="number"
          name="pris"
          min="0"
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1">Beskrivelse</label>
        <textarea
          name="beskrivelse"
          rows={3}
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285982]"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-[#285982] hover:bg-[#1e4266] text-white font-medium py-2.5 rounded-lg transition-colors"
      >
        Opprett oppdrag
      </button>
    </form>
  );
}
