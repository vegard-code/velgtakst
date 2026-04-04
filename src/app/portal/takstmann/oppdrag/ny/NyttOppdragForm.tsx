"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { opprettOppdrag } from "@/lib/actions/oppdrag";
import type { OppdragType } from "@/lib/supabase/types";

interface Props {
  oppdragTyper: Record<OppdragType, string>;
}

export default function NyttOppdragForm({ oppdragTyper }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feil, setFeil] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await opprettOppdrag(formData);
      if (result?.error) {
        setFeil(result.error);
      }
      // On success, opprettOppdrag redirects via Next.js redirect()
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Tittel <span className="text-red-500">*</span>
        </label>
        <input
          name="tittel"
          required
          placeholder="F.eks. Tilstandsrapport Storgata 12"
          className="portal-input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Type oppdrag <span className="text-red-500">*</span>
        </label>
        <select name="oppdrag_type" required className="portal-input w-full">
          <option value="">Velg type...</option>
          {Object.entries(oppdragTyper).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Adresse
          </label>
          <input
            name="adresse"
            placeholder="Gateadresse"
            className="portal-input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Postnummer
          </label>
          <input
            name="postnr"
            placeholder="0000"
            maxLength={4}
            className="portal-input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          By/sted
        </label>
        <input
          name="by"
          placeholder="Oslo"
          className="portal-input w-full"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Befaringsdato
          </label>
          <input
            name="befaringsdato"
            type="date"
            className="portal-input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Frist
          </label>
          <input
            name="frist"
            type="date"
            className="portal-input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Pris (kr)
        </label>
        <input
          name="pris"
          type="number"
          min={0}
          placeholder="0"
          className="portal-input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Beskrivelse
        </label>
        <textarea
          name="beskrivelse"
          rows={4}
          placeholder="Beskriv oppdraget..."
          className="portal-input w-full resize-y"
        />
      </div>

      {feil && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {feil}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="portal-btn-secondary flex-1"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="portal-btn-primary flex-1"
        >
          {isPending ? "Oppretter..." : "Opprett oppdrag"}
        </button>
      </div>
    </form>
  );
}
