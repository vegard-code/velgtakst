'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function oppdaterInnstillinger(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: profil } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const fane = formData.get('fane') as string

  if (fane === 'profil') {
    // Oppdater takstmann-profil
    await supabase
      .from('takstmann_profiler')
      .update({
        navn: formData.get('navn') as string,
        telefon: (formData.get('telefon') as string) || null,
        spesialitet: (formData.get('spesialitet') as string) || null,
        bio: (formData.get('bio') as string) || null,
      })
      .eq('user_id', user.id)

    // Oppdater bedrift
    if (profil?.company_id) {
      await supabase
        .from('companies')
        .update({
          navn: formData.get('firmanavn') as string,
          orgnr: (formData.get('orgnr') as string) || null,
          epost: (formData.get('epost_firma') as string) || '',
        })
        .eq('id', profil.company_id)
    }
  } else if (fane === 'regnskap' || fane === 'purring') {
    if (!profil?.company_id) return { error: 'Ingen bedrift funnet' }

    const updates: Record<string, unknown> = { company_id: profil.company_id }

    if (fane === 'regnskap') {
      updates.regnskap_system = formData.get('regnskap_system') || null
      updates.fiken_company_id = (formData.get('fiken_company_id') as string) || null
      updates.fiken_api_token = (formData.get('fiken_api_token') as string) || null
      updates.tripletex_company_id = (formData.get('tripletex_company_id') as string) || null
      updates.tripletex_employee_token = (formData.get('tripletex_employee_token') as string) || null
    }

    if (fane === 'purring') {
      updates.purring_dager_1 = Number(formData.get('purring_dager_1')) || 14
      updates.purring_dager_2 = Number(formData.get('purring_dager_2')) || 28
      updates.inkasso_dager = Number(formData.get('inkasso_dager')) || 60
    }

    const { error } = await supabase
      .from('company_settings')
      .upsert(updates, { onConflict: 'company_id' })

    if (error) return { error: error.message }
  }

  revalidatePath('/portal/takstmann/innstillinger')
  return { success: true }
}
