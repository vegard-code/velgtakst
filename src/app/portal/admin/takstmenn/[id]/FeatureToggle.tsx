'use client'

import { useState, useTransition } from 'react'
import { toggleFeatureTilgang } from '@/lib/actions/admin'

interface Props {
  /** auth.users.id (via takstmann_profiler.user_id) */
  userId: string
  feature: 'arkat_skrivehjelp'
  label: string
  beskrivelse: string
  aktivNå: boolean
}

export default function FeatureToggle({ userId, feature, label, beskrivelse, aktivNå }: Props) {
  const [aktiv, setAktiv] = useState(aktivNå)
  const [isPending, startTransition] = useTransition()
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil'; tekst: string } | null>(null)

  function handleToggle() {
    const nyVerdi = !aktiv
    startTransition(async () => {
      setMelding(null)
      const res = await toggleFeatureTilgang(userId, feature, nyVerdi)
      if (res.success) {
        setAktiv(nyVerdi)
        setMelding({ type: 'ok', tekst: nyVerdi ? 'Tilgang gitt' : 'Tilgang fjernet' })
      } else {
        setMelding({ type: 'feil', tekst: res.error ?? 'Ukjent feil' })
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#1e293b]">{label}</p>
        <p className="text-xs text-[#64748b]">{beskrivelse}</p>
        {melding && (
          <p className={`text-xs mt-1 ${melding.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {melding.tekst}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
          aktiv ? 'bg-[#285982]' : 'bg-[#cbd5e1]'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            aktiv ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
