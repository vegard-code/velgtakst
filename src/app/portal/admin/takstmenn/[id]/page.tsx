import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { harFeatureTilgang } from '@/lib/feature-tilgang'
import ForlengForm from './ForlengForm'
import FeatureToggle from './FeatureToggle'

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

export default async function AdminTakstmannProfilPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data: takstmann } = await supabase
    .from('takstmann_profiler')
    .select('id, user_id, navn, epost, telefon, tittel, spesialitet, sertifiseringer, created_at, company_id')
    .eq('id', id)
    .maybeSingle()

  if (!takstmann) notFound()

  // Hent feature-tilganger for denne brukeren
  const harArkat = takstmann.user_id
    ? await harFeatureTilgang(takstmann.user_id, 'arkat_skrivehjelp')
    : false

  // Hent abonnement
  const { data: abonnement } = takstmann.company_id
    ? await supabase
        .from('abonnementer')
        .select('status, proveperiode_start, proveperiode_slutt, maanedlig_belop, vipps_agreement_id, vipps_agreement_status')
        .eq('company_id', takstmann.company_id)
        .maybeSingle()
    : { data: null }

  // Hent fylkesynlighet
  const { data: fylker } = await supabase
    .from('fylke_synlighet')
    .select('id, fylke_id, er_aktiv, betalt_til')
    .eq('takstmann_id', id)
    .order('fylke_id')

  // Hent admin-logg for denne takstmannen
  const { data: logg } = await supabase
    .from('admin_hendelse_logg')
    .select('id, hendelse_type, detaljer, created_at')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const now = new Date()
  const dagerIgjen = abonnement?.status === 'proveperiode' && abonnement.proveperiode_slutt
    ? Math.max(0, Math.ceil((new Date(abonnement.proveperiode_slutt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/portal/admin/takstmenn"
          className="text-sm text-[#285982] hover:underline"
        >
          ← Takstmenn
        </Link>
        <span className="text-[#cbd5e1]">/</span>
        <h1 className="text-2xl font-bold text-[#1e293b]">{takstmann.navn}</h1>
      </div>

      {/* Personinfo */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-4">
        <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-4">Personinfo</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-[#94a3b8]">Tittel</dt>
            <dd className="text-[#1e293b] font-medium">{takstmann.tittel ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-[#94a3b8]">E-post</dt>
            <dd className="text-[#1e293b] font-medium">{takstmann.epost ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-[#94a3b8]">Telefon</dt>
            <dd className="text-[#1e293b] font-medium">{takstmann.telefon ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-[#94a3b8]">Spesialitet</dt>
            <dd className="text-[#1e293b] font-medium">{takstmann.spesialitet ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-[#94a3b8]">Registrert</dt>
            <dd className="text-[#1e293b] font-medium">{new Date(takstmann.created_at).toLocaleDateString('nb-NO')}</dd>
          </div>
          {takstmann.sertifiseringer && (
            <div className="col-span-2">
              <dt className="text-[#94a3b8]">Sertifiseringer</dt>
              <dd className="text-[#1e293b] font-medium">{takstmann.sertifiseringer}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Abonnement */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-4">
        <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-4">Abonnement</h2>
        {abonnement ? (
          <>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6">
              <div>
                <dt className="text-[#94a3b8]">Status</dt>
                <dd className="mt-0.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${AB_STATUS_FARGE[abonnement.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {AB_STATUS_NAVN[abonnement.status] ?? abonnement.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[#94a3b8]">Prøveperiode slutt</dt>
                <dd className="text-[#1e293b] font-medium">
                  {abonnement.proveperiode_slutt
                    ? new Date(abonnement.proveperiode_slutt).toLocaleDateString('nb-NO')
                    : '–'}
                  {dagerIgjen !== null && (
                    <span className={`ml-2 text-xs ${dagerIgjen <= 7 ? 'text-red-600 font-semibold' : 'text-[#64748b]'}`}>
                      ({dagerIgjen} dager igjen)
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#94a3b8]">Månedlig beløp</dt>
                <dd className="text-[#1e293b] font-medium">
                  {abonnement.maanedlig_belop > 0
                    ? `${(abonnement.maanedlig_belop / 100).toLocaleString('nb-NO')} kr`
                    : 'Gratis'}
                </dd>
              </div>
              <div>
                <dt className="text-[#94a3b8]">Vipps</dt>
                <dd className="text-[#1e293b] font-medium">
                  {abonnement.vipps_agreement_id ? abonnement.vipps_agreement_status : 'Ikke opprettet'}
                </dd>
              </div>
            </dl>

            <div className="border-t border-[#f1f5f9] pt-5">
              <p className="text-sm font-medium text-[#1e293b] mb-3">Forleng prøveperiode</p>
              <ForlengForm takstmannId={takstmann.id} />
            </div>
          </>
        ) : (
          <p className="text-sm text-[#94a3b8]">Ingen abonnement registrert.</p>
        )}
      </div>

      {/* Feature-tilgang */}
      {takstmann.user_id && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-4">
          <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-4">Feature-tilgang</h2>
          <FeatureToggle
            userId={takstmann.user_id}
            feature="arkat_skrivehjelp"
            label="ARKAT Skrivehjelp"
            beskrivelse="AI-assistert generering av Årsak, Risiko, Konsekvens og Anbefalt tiltak"
            aktivNå={harArkat}
          />
        </div>
      )}

      {/* Fylkesynlighet */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-sm font-semibold text-[#1e293b]">
            Fylkesynlighet
            <span className="ml-2 text-[#94a3b8] font-normal">
              ({fylker?.filter(f => f.er_aktiv).length ?? 0} aktive)
            </span>
          </h2>
        </div>
        {fylker && fylker.length > 0 ? (
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
                const erUtløpt = f.betalt_til && new Date(f.betalt_til) < now
                return (
                  <tr key={f.id} className="border-b border-[#f1f5f9]">
                    <td className="px-6 py-3 text-sm text-[#1e293b]">
                      {FYLKE_NAVN[f.fylke_id] ?? f.fylke_id}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        f.er_aktiv && !erUtløpt
                          ? 'bg-green-100 text-green-700'
                          : erUtløpt
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {f.er_aktiv && !erUtløpt ? 'Aktiv' : erUtløpt ? 'Utløpt' : 'Inaktiv'}
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
        ) : (
          <p className="px-6 py-8 text-sm text-[#94a3b8] text-center">Ingen fylker registrert.</p>
        )}
      </div>

      {/* Admin-logg */}
      {logg && logg.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden mt-4">
          <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <h2 className="text-sm font-semibold text-[#1e293b]">Admin-logg</h2>
          </div>
          <ul className="divide-y divide-[#f1f5f9]">
            {logg.map((h: { id: string; hendelse_type: string; detaljer: Record<string, unknown> | null; created_at: string }) => (
              <li key={h.id} className="px-6 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[#1e293b] font-medium">
                    {h.hendelse_type === 'forleng_proveperiode'
                      ? `Prøveperiode forlenget med ${h.detaljer?.antall_dager ?? '?'} dager`
                      : h.hendelse_type}
                  </span>
                  <span className="text-xs text-[#94a3b8] whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString('nb-NO')}
                  </span>
                </div>
                {Boolean(h.detaljer?.ny_slutt) && (
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Ny sluttdato: {new Date(h.detaljer!.ny_slutt as string).toLocaleDateString('nb-NO')}
                    {h.detaljer!.reaktivert === true ? ' — abonnement reaktivert' : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
