import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import ForlengProveperiodeForm from './ForlengProveperiodeForm'

const FYLKE_NAVN: Record<string, string> = {
  oslo: 'Oslo', rogaland: 'Rogaland', vestland: 'Vestland', trondelag: 'Trøndelag',
  akershus: 'Akershus', innlandet: 'Innlandet', vestfold: 'Vestfold', telemark: 'Telemark',
  agder: 'Agder', 'more-og-romsdal': 'Møre og Romsdal', nordland: 'Nordland',
  troms: 'Troms', finnmark: 'Finnmark', buskerud: 'Buskerud', ostfold: 'Østfold',
}

const AB_STATUS_FARGE: Record<string, string> = {
  proveperiode: 'bg-green-100 text-green-700',
  aktiv: 'bg-blue-100 text-blue-700',
  kansellert: 'bg-red-100 text-red-700',
  utlopt: 'bg-gray-100 text-gray-500',
}

const AB_STATUS_NAVN: Record<string, string> = {
  proveperiode: 'Prøveperiode',
  aktiv: 'Aktiv',
  kansellert: 'Kansellert',
  utlopt: 'Utløpt',
}

export default async function AdminTakstmannDetalj({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data: takstmann } = await supabase
    .from('takstmann_profiler')
    .select('id, navn, epost, telefon, tittel, spesialitet, sertifiseringer, company_id, created_at')
    .eq('id', id)
    .single()

  if (!takstmann) notFound()

  // Hent abonnement
  const abonnementData = takstmann.company_id
    ? await supabase
        .from('abonnementer')
        .select('id, status, proveperiode_start, proveperiode_slutt, vipps_agreement_id, vipps_agreement_status, maanedlig_belop, created_at')
        .eq('company_id', takstmann.company_id)
        .single()
    : null

  const abonnement = abonnementData?.data ?? null

  // Hent fylkesynlighet
  const { data: fylker } = await supabase
    .from('fylke_synlighet')
    .select('fylke_id, er_aktiv, betalt_til')
    .eq('takstmann_id', id)
    .order('fylke_id')

  // Hent logg for denne takstmannen
  const { data: logg } = await supabase
    .from('admin_hendelse_logg')
    .select('id, hendelse_type, detaljer, created_at, admin_user_id')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const now = new Date()
  const dagerIgjen = abonnement?.status === 'proveperiode' && abonnement.proveperiode_slutt
    ? Math.max(0, Math.ceil((new Date(abonnement.proveperiode_slutt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/portal/admin/takstmenn"
          className="text-sm text-[#64748b] hover:text-[#285982] transition-colors"
        >
          ← Tilbake til takstmenn
        </Link>
        <h1 className="text-2xl font-bold text-[#1e293b] mt-2">{takstmann.navn}</h1>
        {takstmann.tittel && <p className="text-sm text-[#64748b]">{takstmann.tittel}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Kontaktinfo */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h2 className="text-base font-semibold text-[#1e293b] mb-4">Kontaktinformasjon</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#64748b]">E-post</dt>
              <dd className="text-[#1e293b] font-medium">{takstmann.epost ?? '–'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#64748b]">Telefon</dt>
              <dd className="text-[#1e293b] font-medium">{takstmann.telefon ?? '–'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#64748b]">Spesialitet</dt>
              <dd className="text-[#1e293b] font-medium">{takstmann.spesialitet ?? '–'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#64748b]">Registrert</dt>
              <dd className="text-[#1e293b] font-medium">
                {new Date(takstmann.created_at).toLocaleDateString('nb-NO')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Abonnement */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h2 className="text-base font-semibold text-[#1e293b] mb-4">Abonnement</h2>
          {abonnement ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-[#64748b]">Status</dt>
                <dd>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${AB_STATUS_FARGE[abonnement.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {AB_STATUS_NAVN[abonnement.status] ?? abonnement.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748b]">Prøveperiode slutt</dt>
                <dd className="text-[#1e293b] font-medium">
                  {abonnement.proveperiode_slutt
                    ? new Date(abonnement.proveperiode_slutt).toLocaleDateString('nb-NO')
                    : '–'}
                </dd>
              </div>
              {dagerIgjen !== null && (
                <div className="flex justify-between">
                  <dt className="text-[#64748b]">Dager igjen</dt>
                  <dd className={`font-medium ${dagerIgjen <= 7 ? 'text-red-600' : 'text-[#1e293b]'}`}>
                    {dagerIgjen} dager
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#64748b]">Mnd. beløp</dt>
                <dd className="text-[#1e293b] font-medium">
                  {abonnement.maanedlig_belop > 0
                    ? `${(abonnement.maanedlig_belop / 100).toLocaleString('nb-NO')} kr`
                    : 'Gratis'}
                </dd>
              </div>
              {abonnement.vipps_agreement_id && (
                <div className="flex justify-between">
                  <dt className="text-[#64748b]">Vipps</dt>
                  <dd className={`text-xs font-medium ${
                    abonnement.vipps_agreement_status === 'ACTIVE' ? 'text-green-600' :
                    abonnement.vipps_agreement_status === 'PENDING' ? 'text-amber-600' :
                    'text-gray-500'
                  }`}>
                    {abonnement.vipps_agreement_status}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-[#94a3b8]">Ingen abonnement registrert.</p>
          )}
        </div>
      </div>

      {/* Forleng prøveperiode */}
      {abonnement && abonnement.status !== 'aktiv' && (
        <div className="mb-6">
          <ForlengProveperiodeForm
            abonnementId={abonnement.id}
            naaSluttdato={abonnement.proveperiode_slutt}
            status={abonnement.status}
          />
        </div>
      )}

      {/* Fylker */}
      {fylker && fylker.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <h2 className="text-sm font-semibold text-[#1e293b]">Fylker</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Fylke</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Betalt til</th>
              </tr>
            </thead>
            <tbody>
              {fylker.map((f) => {
                const erUtlopt = f.betalt_til && new Date(f.betalt_til) < now
                return (
                  <tr key={f.fylke_id} className="border-b border-[#f1f5f9]">
                    <td className="px-6 py-3 text-sm text-[#1e293b]">{FYLKE_NAVN[f.fylke_id] ?? f.fylke_id}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        f.er_aktiv && !erUtlopt ? 'bg-green-100 text-green-700' :
                        erUtlopt ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {f.er_aktiv && !erUtlopt ? 'Aktiv' : erUtlopt ? 'Utløpt' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[#64748b]">
                      {f.betalt_til ? new Date(f.betalt_til).toLocaleDateString('nb-NO') : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Hendelseslogg */}
      {logg && logg.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <h2 className="text-sm font-semibold text-[#1e293b]">Admin-logg</h2>
          </div>
          <ul className="divide-y divide-[#f1f5f9]">
            {logg.map((h) => {
              const d = h.detaljer as Record<string, unknown> | null
              return (
                <li key={h.id} className="px-6 py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[#1e293b] font-medium">
                      {h.hendelse_type === 'forleng_proveperiode'
                        ? `Prøveperiode forlenget med ${d?.ekstra_dager ?? '?'} dager`
                        : h.hendelse_type}
                    </span>
                    <span className="text-xs text-[#94a3b8] whitespace-nowrap">
                      {new Date(h.created_at).toLocaleString('nb-NO')}
                    </span>
                  </div>
                  {Boolean(d?.ny_slutt) && (
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Ny sluttdato: {new Date(d!.ny_slutt as string).toLocaleDateString('nb-NO')}
                      {d!.reaktivert === true ? ' — abonnement reaktivert' : ''}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
