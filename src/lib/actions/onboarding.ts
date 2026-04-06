'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function fullforOnboarding(formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const firmanavn = (formData.get('firmanavn') as string)?.trim()
  const orgnr = (formData.get('orgnr') as string)?.trim() || null
  const epostFirma = (formData.get('epost_firma') as string)?.trim()
  const telefonFirma = (formData.get('telefon_firma') as string)?.trim() || null
  const spesialitet = (formData.get('spesialitet') as string) || null
  const spesialitet2 = (formData.get('spesialitet_2') as string) || null
  const tjenester = formData.getAll('tjenester').map(String).filter(Boolean)

  if (!firmanavn) return { error: 'Firmanavn er påkrevd.' }
  if (!epostFirma) return { error: 'Faktura-epost er påkrevd.' }

  const { data: profil } = await serviceClient
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profil?.company_id) return { error: 'Fant ikke bedrift knyttet til brukeren.' }

  const { error: companyError } = await serviceClient
    .from('companies')
    .update({
      navn: firmanavn,
      orgnr: orgnr || null,
      epost: epostFirma,
      telefon: telefonFirma || null,
      onboarding_fullfort: true,
    })
    .eq('id', profil.company_id)

  if (companyError) {
    console.error('Onboarding company update error:', companyError)
    return { error: 'Kunne ikke lagre bedriftsinformasjon. Prøv igjen.' }
  }

  // Oppdater takstmann-profil med tjenester og spesialiteter
  await serviceClient
    .from('takstmann_profiler')
    .update({
      spesialitet: spesialitet || null,
      spesialitet_2: spesialitet2 || null,
      tjenester,
    })
    .eq('user_id', user.id)

  redirect('/portal/takstmann')
}
