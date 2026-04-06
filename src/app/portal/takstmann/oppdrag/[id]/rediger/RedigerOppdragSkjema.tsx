"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { oppdaterOppdrag } from "@/lib/actions/oppdrag";
import { OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { OppdragType } from "@/lib/supabase/types";

interface Props {
  oppdragId: string;
  defaultVerdier: {
    tittel: string;
    oppdrag_type: string;
    adresse: string | null;
    postnr: string | null;
    by: string | null;
    befaringsdato: string | null;
    frist: string | null;
    pris: number | null;
    beskrivelse: string | null;
  };
}

export default function RedigerOppdragSkjema({ oppdragId, defaultVerdier }: Props) {
  const router = useRouter();
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil(null);
    setLaster(true);

    const formData = new FormData(e.currentTarget);
    const resultat = await oppdaterOppdrag(oppdragId, formData);

    if (resultat?.error) {
      setFeil(resultat.error);
      setLaster(false);
    } else {
      router.push(`/portal/takstmann/oppdrag/${oppdragId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Tittel *</label>
        <input
          name="tittel"
          required
          defaultValue={defaultVerdier.tittel}
          className="portal-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Type oppdrag *</label>
        <select
          name="oppdrag_type"
          required
          defaultValue={defaultVerdier.oppdrag_type}
          className="portal-input"
        >
          {Object.entries(OPPDRAG_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Adresse</label>
        <input
          name="adresse"
          defaultValue={defaultVerdier.adresse ?? ""}
          className="portal-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">Postnr</label>
          <input
            name="postnr"
            defaultValue={defaultVerdier.postnr ?? ""}
            className="portal-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">By</label>
          <input
            name="by"
            defaultValue={defaultVerdier.by ?? ""}
            className="portal-input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Befaringsdato</label>
        <input
          type="datetime-local"
          name="befaringsdato"
          defaultValue={defaultVerdier.befaringsdato?.slice(0, 16) ?? ""}
          className="portal-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Frist</label>
        <input
          type="date"
          name="frist"
          defaultValue={defaultVerdier.frist?.slice(0, 10) ?? ""}
          className="portal-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Pris (kr, eks. MVA)</label>
        <input
          type="number"
          name="pris"
          min="0"
          defaultValue={defaultVerdier.pris ?? ""}
          className="portal-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Beskrivelse</label>
        <textarea
          name="beskrivelse"
          rows={4}
          defaultValue={defaultVerdier.beskrivelse ?? ""}
          className="portal-input resize-none"
        />
      </div>

      {feil && (
        <div className="px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {feil}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={laster}
          className="flex-1 portal-btn-primary"
        >
          {laster ? "Lagrer..." : "Lagre endringer"}
        </button>
      </div>
    </form>
  );
}
