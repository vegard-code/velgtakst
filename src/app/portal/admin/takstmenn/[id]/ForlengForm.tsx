'use client'

import { useState, useTransition } from 'react'
import { forlengProveperiode } from '@/lib/actions/admin'

export default function ForlengForm({ takstmannId }: { takstmannId: string }) {
  const [dager, setDager] = useState(30)
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil'; tekst: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMelding(null)
    startTransition(async () => {
      const result = await forlengProveperiode(takstmannId, dager)
      if (result.error) {
        setMelding({ type: 'feil', tekst: result.error })
      } else {
        const dato = new Date(result.nySluttDato!).toLocaleDateString('nb-NO')
        setMelding({ type: 'ok', tekst: `Prøveperiode forlenget. Ny slutt: ${dato}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="dager" className="text-sm text-[#64748b] whitespace-nowrap">
            Antall dager
          </label>
          <input
            id="dager"
            type="number"
            min={1}
            max={365}
            value={dager}
            onChange={(e) => setDager(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#285982] focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-[#285982] text-white text-sm font-medium rounded-lg hover:bg-[#1e4060] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Lagrer…' : 'Forleng prøveperiode'}
        </button>
      </div>
      {melding && (
        <p className={`text-sm ${melding.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {melding.tekst}
        </p>
      )}
    </form>
  )
}
