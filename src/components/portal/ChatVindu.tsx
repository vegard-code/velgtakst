'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { sendMelding, hentMeldinger, markerSomLest } from '@/lib/actions/meldinger'

interface MeldingData {
  id: string
  samtale_id: string
  avsender_id: string
  innhold: string
  lest: boolean
  lest_tidspunkt: string | null
  created_at: string
}

interface Props {
  samtaleId: string
  currentUserId: string
  motpartNavn: string
  initielleMeldinger: MeldingData[]
}

export default function ChatVindu({ samtaleId, currentUserId, motpartNavn, initielleMeldinger }: Props) {
  const [meldinger, setMeldinger] = useState<MeldingData[]>(initielleMeldinger)
  const [nyMelding, setNyMelding] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feil, setFeil] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [meldinger])

  // Mark as read on mount
  useEffect(() => {
    markerSomLest(samtaleId)
  }, [samtaleId])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const oppdatert = await hentMeldinger(samtaleId)
      if (oppdatert.length !== meldinger.length) {
        setMeldinger(oppdatert as MeldingData[])
        markerSomLest(samtaleId)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [samtaleId, meldinger.length])

  function handleSend() {
    const innhold = nyMelding.trim()
    if (!innhold) return

    setFeil(null)
    setNyMelding('')

    // Optimistic update
    const optimistisk: MeldingData = {
      id: `temp-${Date.now()}`,
      samtale_id: samtaleId,
      avsender_id: currentUserId,
      innhold,
      lest: false,
      lest_tidspunkt: null,
      created_at: new Date().toISOString(),
    }
    setMeldinger((prev) => [...prev, optimistisk])

    startTransition(async () => {
      const res = await sendMelding({ samtaleId, innhold })
      if (res.error) {
        setFeil(res.error)
        setMeldinger((prev) => prev.filter((m) => m.id !== optimistisk.id))
        setNyMelding(innhold)
      } else {
        // Refresh real data
        const oppdatert = await hentMeldinger(samtaleId)
        setMeldinger(oppdatert as MeldingData[])
      }
    })

    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatTid(iso: string) {
    const d = new Date(iso)
    const iDag = new Date()
    const erIDag = d.toDateString() === iDag.toDateString()
    if (erIDag) {
      return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[#e2e8f0] px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#285982]/10 flex items-center justify-center text-[#285982] font-semibold text-sm">
          {motpartNavn.charAt(0)}
        </div>
        <h2 className="text-[#1e293b] font-semibold">{motpartNavn}</h2>
      </div>

      {/* Meldinger */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
        {meldinger.length === 0 && (
          <p className="text-center text-[#94a3b8] text-sm py-12">
            Ingen meldinger ennå. Send den første!
          </p>
        )}
        {meldinger.map((m) => {
          const erMin = m.avsender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${erMin ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  erMin
                    ? 'bg-[#285982] text-white rounded-br-md'
                    : 'bg-[#f1f5f9] text-[#1e293b] rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-line break-words">{m.innhold}</p>
                <p className={`text-[10px] mt-1 ${erMin ? 'text-white/60' : 'text-[#94a3b8]'}`}>
                  {formatTid(m.created_at)}
                  {erMin && m.lest && ' ✓'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Feilmelding */}
      {feil && (
        <div className="px-6 py-2 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{feil}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#e2e8f0] p-4">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={nyMelding}
            onChange={(e) => setNyMelding(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv en melding..."
            rows={1}
            maxLength={2000}
            className="flex-1 portal-input resize-none min-h-[42px] max-h-32 py-2.5"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={isPending || !nyMelding.trim()}
            className="portal-btn-primary px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
