// ============================================================
// E-posttjeneste via Resend
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'noreply@velgtakst.no'
const RESEND_URL = 'https://api.resend.com/emails'

interface SendEpostInput {
  til: string
  emne: string
  html: string
}

async function sendEpost(input: SendEpostInput): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[Epost] RESEND_API_KEY ikke satt – hopper over sending')
    return
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [input.til],
      subject: input.emne,
      html: input.html,
    }),
  })

  if (!response.ok) {
    const tekst = await response.text()
    throw new Error(`E-post feilet: ${response.status} ${tekst}`)
  }
}

// ============================================================
// E-postmaler (norsk bokmål)
// ============================================================

export async function sendPurringEpost({
  til,
  kundeNavn,
  fakturaNummer,
  belopKroner,
  forfallsDato,
  purreNummer,
}: {
  til: string
  kundeNavn: string
  fakturaNummer: string
  belopKroner: number
  forfallsDato: string
  purreNummer: 1 | 2
}) {
  const gebyr = purreNummer === 1 ? 0 : 70

  await sendEpost({
    til,
    emne: purreNummer === 1
      ? `Purring på faktura ${fakturaNummer}`
      : `2. purring på faktura ${fakturaNummer} – gebyr tilkommer`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #285982; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">VelgTakst</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <p>Hei ${kundeNavn},</p>

          <p>Vi minner om at følgende faktura fortsatt er ubetalt:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: white;">Fakturanummer</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: white;"><strong>${fakturaNummer}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: white;">Beløp</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: white;"><strong>${belopKroner.toLocaleString('nb-NO')} kr</strong></td>
            </tr>
            ${gebyr > 0 ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff3cd;">Purregebyr</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff3cd;">${gebyr} kr</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: white;">Forfallsdato var</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: white;">${forfallsDato}</td>
            </tr>
          </table>

          <p>Vennligst betal snarest mulig for å unngå ytterligere gebyrer.</p>
          ${purreNummer === 2
            ? '<p><strong>Merk:</strong> Dersom betaling ikke mottas innen 14 dager, vil kravet bli oversendt til inkasso.</p>'
            : ''
          }

          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Spørsmål? Kontakt oss på post@velgtakst.no
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendInkassoVarsel({
  til,
  kundeNavn,
  fakturaNummer,
  belopKroner,
}: {
  til: string
  kundeNavn: string
  fakturaNummer: string
  belopKroner: number
}) {
  await sendEpost({
    til,
    emne: `INKASSOVARSEL – faktura ${fakturaNummer}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Inkassovarsel – VelgTakst</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <p>Hei ${kundeNavn},</p>
          <p><strong>Dette er et inkassovarsel.</strong></p>
          <p>Faktura <strong>${fakturaNummer}</strong> på <strong>${belopKroner.toLocaleString('nb-NO')} kr</strong> er ikke betalt til tross for purring.</p>
          <p>Kravet vil nå bli oversendt til inkassobyrå med tilleggsomkostninger.</p>
          <p>For å unngå inkasso – betal umiddelbart og kontakt oss.</p>
        </div>
      </div>
    `,
  })
}

export async function sendNyBestillingVarsel({
  til,
  takstmannNavn,
  bestillerNavn,
  bestillerType,
  melding,
}: {
  til: string
  takstmannNavn: string
  bestillerNavn: string
  bestillerType: 'megler' | 'privatkunde'
  melding?: string
}) {
  await sendEpost({
    til,
    emne: `Ny bestilling fra ${bestillerNavn}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #285982; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">VelgTakst – Ny bestilling</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <p>Hei ${takstmannNavn},</p>
          <p>Du har mottatt en ny bestilling fra <strong>${bestillerNavn}</strong> (${bestillerType === 'megler' ? 'Megler' : 'Privatkunde'}).</p>
          ${melding ? `<p><em>"${melding}"</em></p>` : ''}
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'}/portal/takstmann/bestillinger"
             style="display: inline-block; background: #285982; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
            Se bestilling
          </a>
        </div>
      </div>
    `,
  })
}
