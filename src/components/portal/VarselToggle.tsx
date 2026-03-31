'use client'

import { useState, useTransition } from 'react'
import { oppdaterVarselInnstillinger } from '@/lib/actions/meldinger'

interface Props {
  initialVerdi: boolean
}

export default function VarselToggle({ initialVerdi }: Props) {
  const [epostPå, setEpostPå] = useState(initialVerdi)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const nyVerdi = !epostPå
    setEpostPå(nyVerdi)
    startTransition(async () => {
      await oppdaterVarselInnstillinger({ epostMeldinger: nyVerdi })
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
      <div>
        <p className="text-sm font-medium text-[#374151]">E-postvarsler</p>
        <p className="text-xs text-[#94a3b8]">Få e-post ved uleste meldinger etter 30 min</p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          epostPå ? 'bg-[#285982]' : 'bg-[#cbd5e1]'
        }`}
        aria-label={epostPå ? 'Slå av e-postvarsler' : 'Slå på e-postvarsler'}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            epostPå ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
