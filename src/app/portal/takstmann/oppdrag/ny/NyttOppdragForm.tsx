'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { opprettOppdrag } from '@/lib/actions/oppdrag'
import { OPPDRAG_TYPE_LABELS } from '@/lib/supabase/types'

export default function NyttOppdragForm() {
  const [state, action, isPending] = useActionState(opprettOppdrag, null)

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Tittel *
        </label>
        <input
          name="tittel"
          required
          className="portal-input"
          placeholder="f.eks. Tilstandsrapport Storgata 1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Oppdragstype *
        </label>
        <select name="oppdrag_type" required className="portal-input">
          <option value="">Velg type</option>
          {Object.entries(OPPDRAG_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Adresse
          </label>
          <input
            name="adresse"
            className="portal-input"
            placeholder="Storgata 1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Postnummer
          </label>
          <input
            name="postnr"
            className="portal-input"
            placeholder="0155"
            pattern="[0-9]{4}"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            By/sted
          </label>
          <input name="by" className="portal-input" placeholder="Oslo" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Befaringsdato
          </label>
          <input
            name="befaringsdato"
            type="datetime-local"
            className="portal-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Frist for leveranse
          </label>
          <input
            name="frist"
            type="datetime-local"
            className="portal-input"
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
          min="0"
          step="100"
          className="portal-input"
          placeholder="5000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Beskrivelse / notater
        </label>
        <textarea
          name="beskrivelse"
          rows={4}
          className="portal-input resize-none"
          placeholder="Legg til detaljer om oppdraget..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/portal/takstmann/oppdrag"
          className="flex-1 text-center border border-[#e2e8f0] text-[#64748b] hover:border-[#285982] hover:text-[#285982] font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          Avbryt
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 portal-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Oppretter...' : 'Opprett oppdrag'}
        </button>
      </div>
    </form>
  )
}
