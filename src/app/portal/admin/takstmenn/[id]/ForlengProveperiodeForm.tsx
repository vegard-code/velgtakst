'use client'

import { useState, useTransition } from 'react'
import { forlengProveperiode } from '@/lib/actions/admin'

interface Props {
  abonnementId: string
  naaSluttdato: string | null
  status: string
}

export default function ForlengProveperiodeForm({ abonnementId, naaSluttdato, status }: Props) {
  const [dager, setDager] = useState(30)
  const [isPending, startTransition] = useTransition()
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil'; tekst: string } | null>(null)

  const erUtlopt = status === 'utlopt' || status === 'kansellert'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMelding(null)
    startTransition(async () => {
      const res = await forlengProveperiode(abonnementId, dager)
      if (res.success) {
        setMelding({
          type: 'ok',
          tekst: erUtlopt
            ? `Reaktivert og forlenget med ${dager} dager`
            : `Prøveperiode forlenget med ${dager} dager`,
        })
      } else {
        setMelding({ type: 'feil', tekst: res.error ?? 'Noe gikk galt' })
      }
    })
  }

  const sluttdatoVisning = naaSluttdato
    ? new Date(naaSluttdato).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '–'

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
      <h2 className="text-base font-semibold text-[#1e293b] mb-4">Forleng prøveperiode</h2>

      <div className="mb-4">
        <p className="text-xs text-[#64748b] mb-1">Nåværende sluttdato</p>
        <p className="text-sm font-medium text-[#1e293b]">
          {sluttdatoVisning}
          {erUtlopt && (
            <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {status === 'kansellert' ? 'Kansellert' : 'Utløpt'}
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dager" className="block text-xs text-[#64748b] mb-1">
            Antall ekstra dager
          </label>
          <div className="flex gap-2 mb-2">
            {[10, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDager(d)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  dager === d
                    ? 'bg-[#285982] text-white border-[#285982]'
                    : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982]'
                }`}
              >
                {d} dager
              </button>
            ))}
          </div>
          <input
            id="dager"
            type="number"
            min={1}
            max={3650}
            value={dager}
            onChange={(e) => setDager(Number(e.target.value))}
            disabled={isPending}
            className="w-24 border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#285982]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 ${
            erUtlopt
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-[#285982] hover:bg-[#1e4266]'
          }`}
        >
          {isPending ? 'Lagrer…' : erUtlopt ? 'Reaktiver og forleng' : 'Forleng'}
        </button>
      </form>

      {melding && (
        <p className={`mt-3 text-sm font-medium ${melding.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {melding.tekst}
        </p>
      )}
    </div>
  )
}
