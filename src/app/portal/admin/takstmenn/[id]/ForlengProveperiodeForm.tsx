'use client'

import { useState } from 'react'
import { forlengProveperiode } from '@/lib/actions/adminActions'

interface Props {
  takstmannId: string
  naaSluttdato: string | null
  status: string
}

export default function ForlengProveperiodeForm({ takstmannId, naaSluttdato, status }: Props) {
  const [dager, setDager] = useState(30)
  const [loading, setLoading] = useState(false)
  const [resultat, setResultat] = useState<{ nySlutt?: string; reaktivert?: boolean; error?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResultat(null)
    const res = await forlengProveperiode(takstmannId, dager)
    setLoading(false)
    if ('success' in res && res.success) {
      setResultat({ nySlutt: res.nySlutt as string, reaktivert: res.reaktivert as boolean })
    } else {
      setResultat({ error: (res as { error: string }).error })
    }
  }

  const visSluttdato = resultat?.nySlutt
    ? new Date(resultat.nySlutt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
    : naaSluttdato
    ? new Date(naaSluttdato).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '–'

  const erUtlopt = status === 'utlopt'

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
      <h2 className="text-base font-semibold text-[#1e293b] mb-4">Forleng prøveperiode</h2>

      <div className="mb-4">
        <p className="text-xs text-[#64748b] mb-1">Nåværende sluttdato</p>
        <p className="text-sm font-medium text-[#1e293b]">
          {visSluttdato}
          {erUtlopt && !resultat?.nySlutt && (
            <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Utløpt</span>
          )}
        </p>
      </div>

      {resultat?.nySlutt ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800">
            Prøveperiode forlenget til {visSluttdato}
          </p>
          {resultat.reaktivert && (
            <p className="text-xs text-green-700 mt-1">Abonnement og fylkesynlighet ble reaktivert.</p>
          )}
          <button
            onClick={() => setResultat(null)}
            className="mt-3 text-xs text-green-700 underline"
          >
            Forleng igjen
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
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
              max={365}
              value={dager}
              onChange={(e) => setDager(Number(e.target.value))}
              className="w-24 border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#285982]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#285982] text-white text-sm font-medium rounded-lg hover:bg-[#1e4266] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Lagrer…' : 'Forleng'}
          </button>
        </form>
      )}

      {resultat?.error && (
        <p className="mt-3 text-sm text-red-600">{resultat.error}</p>
      )}
    </div>
  )
}
