'use client'

import Link from 'next/link'

interface SamtaleItem {
  id: string
  takstmann?: { id: string; navn: string; bilde_url: string | null } | null
  kunde?: { id: string; navn: string } | null
  megler?: { id: string; navn: string } | null
  siste_melding?: { innhold: string; created_at: string; avsender_id: string } | null
  uleste: number
  created_at: string
}

interface Props {
  samtaler: SamtaleItem[]
  currentUserId: string
  basePath: string  // e.g. /portal/takstmann/meldinger or /portal/kunde/meldinger
  rolle: 'takstmann' | 'kunde' | 'megler'
}

export default function SamtaleListe({ samtaler, currentUserId, basePath, rolle }: Props) {
  function motpartNavn(s: SamtaleItem): string {
    if (rolle === 'takstmann') {
      return s.kunde?.navn ?? s.megler?.navn ?? 'Ukjent'
    }
    return s.takstmann?.navn ?? 'Ukjent'
  }

  function motpartInitial(s: SamtaleItem): string {
    return motpartNavn(s).charAt(0)
  }

  function formatTid(iso: string): string {
    const d = new Date(iso)
    const iDag = new Date()
    const erIDag = d.toDateString() === iDag.toDateString()
    if (erIDag) {
      return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    }
    const iGar = new Date(iDag)
    iGar.setDate(iGar.getDate() - 1)
    if (d.toDateString() === iGar.toDateString()) return 'I går'
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
  }

  if (samtaler.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 mx-auto text-[#cbd5e1] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-[#64748b] font-medium">Ingen meldinger ennå</p>
        <p className="text-[#94a3b8] text-sm mt-1">
          {rolle === 'takstmann'
            ? 'Meldinger fra kunder og meglere vises her.'
            : 'Send en forespørsel til en takstmann for å starte en samtale.'}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#e2e8f0]">
      {samtaler.map((s) => (
        <Link
          key={s.id}
          href={`${basePath}/${s.id}`}
          className="flex items-center gap-4 px-5 py-4 hover:bg-[#f8fafc] transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-[#285982]/10 flex items-center justify-center text-[#285982] font-semibold shrink-0">
            {motpartInitial(s)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm truncate ${s.uleste > 0 ? 'font-semibold text-[#1e293b]' : 'font-medium text-[#374151]'}`}>
                {motpartNavn(s)}
              </span>
              {s.siste_melding && (
                <span className="text-[11px] text-[#94a3b8] shrink-0">
                  {formatTid(s.siste_melding.created_at)}
                </span>
              )}
            </div>
            {s.siste_melding && (
              <p className={`text-sm truncate mt-0.5 ${s.uleste > 0 ? 'text-[#374151]' : 'text-[#94a3b8]'}`}>
                {s.siste_melding.avsender_id === currentUserId ? 'Du: ' : ''}
                {s.siste_melding.innhold}
              </p>
            )}
          </div>
          {s.uleste > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#285982] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {s.uleste > 9 ? '9+' : s.uleste}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
