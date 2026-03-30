'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function registrerTakstmann(formData: FormData) {
  const supabaseAdmin = await createServiceClient()

  const epost = formData.get('epost') as string
  const passord = formData.get('passord') as string
  const passordBekreft = formData.get('passord_bekreft') as string
  const navn = formData.get('navn') as string
  const telefon = formData.get('telefon') as string | null
  const spesialitet = formData.get('spesialitet') as string | null
  const firmanavn = formData.get('firmanavn') as string
  const orgnr = formData.get('orgnr') as string | null
  const telefonFirma = formData.get('telefon_firma') as string | null
  const epostFirma = formData.get('epost_firma') as string

  if (passord !== passordBekreft) {
    return { error: 'Passordene stemmer ikke overens.' }
  }
  if (passord.length < 8) {
    return { error: 'Passordet må være minst 8 tegn.' }
  }

  // 1. Opprett bedrift (bruker service role – ingen bruker autentisert ennå)
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      navn: firmanavn,
      orgnr: orgnr || null,
      telefon: telefonFirma || null,
      epost: epostFirma,
    })
    .select('id')
    .single()

  if (companyError || !company) {
    console.error('Company creation error:', companyError)
    return { error: 'Kunne ikke opprette bedrift. Prøv igjen.' }
  }

  // 2. Opprett Supabase Auth-bruker
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: epost,
    password: passord,
    email_confirm: true,
    user_metadata: {
      navn,
      rolle: 'takstmann_admin',
    },
  })

  if (authError || !authData.user) {
    // Rull tilbake bedrift
    await supabaseAdmin.from('companies').delete().eq('id', company.id)
    return { error: authError?.message ?? 'Kunne ikke opprette bruker.' }
  }

  const userId = authData.user.id

  // 3. Opprett user_profile
  const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
    id: userId,
    company_id: company.id,
    rolle: 'takstmann_admin',
    navn,
    telefon: telefon || null,
  })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    return { error: 'Brukerkonto ble opprettet, men profil kunne ikke lagres. Kontakt support.' }
  }

  // 4. Opprett takstmann-profil
  const { error: takstmannError } = await supabaseAdmin.from('takstmann_profiler').insert({
    user_id: userId,
    company_id: company.id,
    navn,
    telefon: telefon || null,
    epost,
    spesialitet: spesialitet || null,
  })

  if (takstmannError) {
    console.error('Takstmann profile creation error:', takstmannError)
  }

  return { success: true }
}

export async function registrerMegler(formData: FormData) {
  const supabaseAdmin = await createServiceClient()

  const epost = formData.get('epost') as string
  const passord = formData.get('passord') as string
  const navn = formData.get('navn') as string
  const telefon = formData.get('telefon') as string | null
  const meglerforetak = formData.get('meglerforetak') as string | null

  if (passord.length < 8) {
    return { error: 'Passordet må være minst 8 tegn.' }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: epost,
    password: passord,
    email_confirm: true,
    user_metadata: { navn, rolle: 'megler' },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Kunne ikke opprette bruker.' }
  }

  const userId = authData.user.id

  await supabaseAdmin.from('user_profiles').insert({
    id: userId,
    rolle: 'megler',
    navn,
    telefon: telefon || null,
  })

  await supabaseAdmin.from('megler_profiler').insert({
    user_id: userId,
    navn,
    telefon: telefon || null,
    epost,
    meglerforetak: meglerforetak || null,
  })

  return { success: true }
}

export async function registrerKunde(formData: FormData) {
  const supabaseAdmin = await createServiceClient()

  const epost = formData.get('epost') as string
  const passord = formData.get('passord') as string
  const navn = formData.get('navn') as string
  const telefon = formData.get('telefon') as string | null

  if (passord.length < 8) {
    return { error: 'Passordet må være minst 8 tegn.' }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: epost,
    password: passord,
    email_confirm: true,
    user_metadata: { navn, rolle: 'privatkunde' },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Kunne ikke opprette bruker.' }
  }

  const userId = authData.user.id

  await supabaseAdmin.from('user_profiles').insert({
    id: userId,
    rolle: 'privatkunde',
    navn,
    telefon: telefon || null,
  })

  await supabaseAdmin.from('privatkunde_profiler').insert({
    user_id: userId,
    navn,
    telefon: telefon || null,
    epost,
  })

  return { success: true }
}

export async function loggUt() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
