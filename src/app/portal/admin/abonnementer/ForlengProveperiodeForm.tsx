'use client'

import { useState, useTransition } from 'react'
import { forlengProveperiode } from '@/lib/actions/admin'

interface Props {
  abonnementId: string
  reaktiver: boolean
}

export default function ForlengProveperiodeForm({ abonnementId, reaktiver }: Props) {
  const [dager, setDager] = useState(30)
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil'; tekst: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMelding(null)
    startTransition(async () => {
      const res = await forlengProveperiode(abonnementId, dager)
      if (res.success) {
        setMelding({
          type: 'ok',
          tekst: reaktiver
            ? `Reaktivert og forlenget med ${dager} dager`
            : `Forlenget med ${dager} dager`,
        })
      } else {
        setMelding({ type: 'feil', tekst: res.error ?? 'Noe gikk galt' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={3650}
        value={dager}
        onChange={(e) => setDager(Number(e.target.value))}
        className="w-16 text-xs border border-[#e2e8f0] rounded px-2 py-1 text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#285982]"
        disabled={isPending}
      />
      <span className="text-xs text-[#94a3b8]">dager</span>
      <button
        type="submit"
        disabled={isPending}
        className={`text-xs font-medium px-3 py-1 rounded transition-colors ${
          reaktiver
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : 'bg-[#285982] hover:bg-[#1e4266] text-white'
        } disabled:opacity-50`}
      >
        {isPending ? '…' : reaktiver ? 'Reaktiver' : 'Forleng'}
      </button>
      {melding && (
        <span className={`text-xs ${melding.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {melding.tekst}
        </span>
      )}
    </form>
  )
}
