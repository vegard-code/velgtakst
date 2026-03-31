'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  initialSok: string
  rolle: string
}

export default function BrukerSok({ initialSok, rolle }: Props) {
  const [sok, setSok] = useState(initialSok)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (sok.trim()) params.set('sok', sok.trim())
    if (rolle && rolle !== 'alle') params.set('rolle', rolle)
    router.push(`/portal/admin/brukere?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Søk etter navn..."
          className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#285982] focus:border-transparent"
        />
      </div>
      <button type="submit" className="portal-btn-primary px-5 text-sm">
        Søk
      </button>
      {(sok || (rolle && rolle !== 'alle')) && (
        <button
          type="button"
          onClick={() => {
            setSok('')
            router.push('/portal/admin/brukere')
          }}
          className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm text-[#64748b] hover:bg-[#f8fafc] transition-colors"
        >
          Nullstill
        </button>
      )}
    </form>
  )
}
