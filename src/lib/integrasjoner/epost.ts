// ============================================================
// E-posttjeneste via Resend
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'noreply@takstmann.net'
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
          <h1 style="margin: 0; font-size: 20px;">Takstmann.net</h1>
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
            Spørsmål? Kontakt oss på <a href="mailto:post@takstmann.net" style="color: #285982;">post@takstmann.net</a>
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
          <h1 style="margin: 0; font-size: 20px;">Inkassovarsel – Takstmann.net</h1>
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
          <h1 style="margin: 0; font-size: 20px;">Takstmann.net – Ny bestilling</h1>
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

// ============================================================
// Ny forespørsel til takstmann (utvidet med oppdragsdetaljer)
// ============================================================

export async function sendNyForespørselTilTakstmann({
  til,
  takstmannNavn,
  bestillerNavn,
  bestillerType,
  bestillerTelefon,
  bestillerEpost,
  oppdragType,
  adresse,
  ønsketDato,
  melding,
  bestillingId,
}: {
  til: string
  takstmannNavn: string
  bestillerNavn: string
  bestillerType: 'megler' | 'privatkunde'
  bestillerTelefon?: string | null
  bestillerEpost?: string | null
  oppdragType?: string | null
  adresse?: string | null
  ønsketDato?: string | null
  melding?: string | null
  bestillingId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'
  const typeLabel = oppdragType
    ? oppdragType.charAt(0).toUpperCase() + oppdragType.slice(1).replace(/_/g, ' ')
    : null

  await sendEpost({
    til,
    emne: `Ny forespørsel fra ${bestillerNavn}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #10b981; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Takstmann.net</p>
          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">Ny forespørsel</h1>
        </div>

        <!-- Body -->
        <div style="background: #f8fafc; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 20px; color: #1e293b; font-size: 15px;">Hei ${takstmannNavn},</p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">
            Du har mottatt en ny forespørsel fra <strong style="color: #1e293b;">${bestillerNavn}</strong>
            (${bestillerType === 'megler' ? 'Megler' : 'Privatkunde'}).
          </p>

          <!-- Detaljer -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            ${typeLabel ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 40%;">Type oppdrag</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 600;">${typeLabel}</td>
            </tr>` : ''}
            ${adresse ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Adresse</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${adresse}</td>
            </tr>` : ''}
            ${ønsketDato ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Ønsket dato</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${ønsketDato}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 12px 16px; ${bestillerEpost ? 'border-bottom: 1px solid #f1f5f9;' : ''} color: #64748b; font-size: 13px;">Kontaktinfo</td>
              <td style="padding: 12px 16px; ${bestillerEpost ? 'border-bottom: 1px solid #f1f5f9;' : ''} color: #1e293b; font-size: 13px;">
                ${bestillerTelefon ?? '—'}
              </td>
            </tr>
            ${bestillerEpost ? `
            <tr>
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">E-post</td>
              <td style="padding: 12px 16px; color: #1e293b; font-size: 13px;">${bestillerEpost}</td>
            </tr>` : ''}
          </table>

          ${melding ? `
          <div style="background: #f0fdf4; border-left: 3px solid #10b981; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
            <p style="margin: 0; color: #475569; font-size: 14px; font-style: italic;">"${melding}"</p>
          </div>` : ''}

          <!-- CTA -->
          <div style="text-align: center; margin-top: 8px;">
            <a href="${appUrl}/portal/takstmann/bestillinger"
               style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Se forespørselen
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
            Takstmann.net · post@takstmann.net
          </p>
        </div>
      </div>
    `,
  })
}

// ============================================================
// Bekreftelse til bestiller når forespørsel er akseptert
// ============================================================

export async function sendForespørselAkseptertVarsel({
  til,
  bestillerNavn,
  takstmannNavn,
  takstmannTelefon,
  takstmannEpost,
  oppdragType,
  adresse,
  befaringsdato,
  pris,
}: {
  til: string
  bestillerNavn: string
  takstmannNavn: string
  takstmannTelefon?: string | null
  takstmannEpost?: string | null
  oppdragType?: string | null
  adresse?: string | null
  befaringsdato?: string | null
  pris?: number | null
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'
  const typeLabel = oppdragType
    ? oppdragType.charAt(0).toUpperCase() + oppdragType.slice(1).replace(/_/g, ' ')
    : null

  await sendEpost({
    til,
    emne: `Din forespørsel er akseptert av ${takstmannNavn}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #10b981; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Takstmann.net</p>
          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">Forespørsel akseptert ✓</h1>
        </div>

        <!-- Body -->
        <div style="background: #f8fafc; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 20px; color: #1e293b; font-size: 15px;">Hei ${bestillerNavn},</p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">
            Godt nytt! <strong style="color: #1e293b;">${takstmannNavn}</strong> har akseptert din forespørsel.
          </p>

          <!-- Oppdragsdetaljer -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            ${typeLabel ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 40%;">Type oppdrag</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 600;">${typeLabel}</td>
            </tr>` : ''}
            ${adresse ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Adresse</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${adresse}</td>
            </tr>` : ''}
            ${befaringsdato ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Befaringsdato</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 600;">${befaringsdato}</td>
            </tr>` : ''}
            ${pris != null ? `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Pris</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 600;">${pris.toLocaleString('nb-NO')} kr</td>
            </tr>` : ''}
          </table>

          <!-- Takstmanninfo -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Kontakt takstmann</p>
            <p style="margin: 0 0 4px; color: #1e293b; font-size: 14px; font-weight: 600;">${takstmannNavn}</p>
            ${takstmannTelefon ? `<p style="margin: 0 0 4px; color: #475569; font-size: 13px;">${takstmannTelefon}</p>` : ''}
            ${takstmannEpost ? `<p style="margin: 0; color: #475569; font-size: 13px;">${takstmannEpost}</p>` : ''}
          </div>

          <!-- CTA -->
          <div style="text-align: center;">
            <a href="${appUrl}/portal"
               style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Se i portalen
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
            Takstmann.net · post@takstmann.net
          </p>
        </div>
      </div>
    `,
  })
}

// ============================================================
// Statusoppdatering til bestiller
// ============================================================

const STATUS_TEKST: Record<string, { tittel: string; beskrivelse: string }> = {
  akseptert: {
    tittel: 'Oppdrag akseptert',
    beskrivelse: 'Takstmannen har akseptert oppdraget og vil ta kontakt.',
  },
  under_befaring: {
    tittel: 'Befaring pågår',
    beskrivelse: 'Takstmannen er nå på befaring.',
  },
  rapport_under_arbeid: {
    tittel: 'Rapport under arbeid',
    beskrivelse: 'Takstmannen jobber med rapporten.',
  },
  rapport_levert: {
    tittel: 'Rapport levert',
    beskrivelse: 'Rapporten er klar og tilgjengelig i portalen.',
  },
  fakturert: {
    tittel: 'Faktura sendt',
    beskrivelse: 'Faktura er sendt. Vennligst betal innen forfall.',
  },
  betalt: {
    tittel: 'Betaling mottatt',
    beskrivelse: 'Betalingen er registrert. Takk!',
  },
  kansellert: {
    tittel: 'Oppdrag kansellert',
    beskrivelse: 'Oppdraget er dessverre kansellert.',
  },
}

export async function sendStatusOppdateringVarsel({
  til,
  bestillerNavn,
  nyStatus,
  oppdragTittel,
  oppdragId,
}: {
  til: string
  bestillerNavn: string
  nyStatus: string
  oppdragTittel: string
  oppdragId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'
  const info = STATUS_TEKST[nyStatus] ?? {
    tittel: 'Status oppdatert',
    beskrivelse: `Ny status: ${nyStatus}`,
  }

  await sendEpost({
    til,
    emne: `${info.tittel} – ${oppdragTittel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #10b981; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Takstmann.net</p>
          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">${info.tittel}</h1>
        </div>

        <!-- Body -->
        <div style="background: #f8fafc; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 20px; color: #1e293b; font-size: 15px;">Hei ${bestillerNavn},</p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">${info.beskrivelse}</p>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Oppdrag</p>
            <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${oppdragTittel}</p>
          </div>

          <!-- CTA -->
          <div style="text-align: center;">
            <a href="${appUrl}/portal"
               style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Se oppdrag i portalen
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
            Takstmann.net · post@takstmann.net
          </p>
        </div>
      </div>
    `,
  })
}

// ============================================================
// Ny rapport tilgjengelig
// ============================================================

// ============================================================
// Tilbud fra takstmann til privatkunde
// ============================================================

export async function sendTilbudTilKunde({
  til,
  kundeNavn,
  takstmannNavn,
  takstmannTelefon,
  takstmannEpost,
  tilbudspris,
  estimertLeveringstid,
  oppdragType,
  adresse,
  bestillingId,
}: {
  til: string
  kundeNavn: string
  takstmannNavn: string
  takstmannTelefon?: string | null
  takstmannEpost?: string | null
  tilbudspris: number
  estimertLeveringstid: string
  oppdragType?: string | null
  adresse?: string | null
  bestillingId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'
  const typeLabel = oppdragType
    ? oppdragType.charAt(0).toUpperCase() + oppdragType.slice(1).replace(/_/g, ' ')
    : null

  await sendEpost({
    til,
    emne: `Tilbud fra ${takstmannNavn} – ${tilbudspris.toLocaleString('nb-NO')} kr`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #285982; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Takstmann.net</p>
          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">Du har mottatt et tilbud</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 20px; color: #1e293b; font-size: 15px;">Hei ${kundeNavn},</p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">
            <strong style="color: #1e293b;">${takstmannNavn}</strong> har sendt deg et tilbud på din forespørsel.
            Du har <strong>48 timer</strong> på å akseptere eller avslå.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            ${typeLabel ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 40%;">Type oppdrag</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 600;">${typeLabel}</td></tr>` : ''}
            ${adresse ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Adresse</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${adresse}</td></tr>` : ''}
            <tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Pris</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 16px; font-weight: 700;">${tilbudspris.toLocaleString('nb-NO')} kr</td></tr>
            <tr><td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Estimert leveringstid</td><td style="padding: 12px 16px; color: #1e293b; font-size: 13px;">${estimertLeveringstid}</td></tr>
          </table>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Kontakt takstmann</p>
            <p style="margin: 0 0 4px; color: #1e293b; font-size: 14px; font-weight: 600;">${takstmannNavn}</p>
            ${takstmannTelefon ? `<p style="margin: 0 0 4px; color: #475569; font-size: 13px;">${takstmannTelefon}</p>` : ''}
            ${takstmannEpost ? `<p style="margin: 0; color: #475569; font-size: 13px;">${takstmannEpost}</p>` : ''}
          </div>
          <div style="text-align: center;">
            <a href="${appUrl}/portal/kunde/bestillinger"
               style="display: inline-block; background: #285982; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Svar på tilbudet
            </a>
          </div>
          <p style="margin-top: 20px; color: #94a3b8; font-size: 12px; text-align: center;">Tilbudet utløper om 48 timer.</p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">Takstmann.net · post@takstmann.net</p>
        </div>
      </div>
    `,
  })
}

// ============================================================
// Kunde aksepterte tilbud – varsel til takstmann
// ============================================================

export async function sendAkseptTilTakstmann({
  til,
  takstmannNavn,
  kundeNavn,
  kundeEpost,
  befaringsdato,
  noekkelinfo,
  parkering,
  tilgang,
  oppdragType,
  adresse,
  bestillingId,
}: {
  til: string
  takstmannNavn: string
  kundeNavn: string
  kundeEpost?: string | null
  befaringsdato: string
  noekkelinfo?: string | null
  parkering?: string | null
  tilgang?: string | null
  oppdragType?: string | null
  adresse?: string | null
  bestillingId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'
  const typeLabel = oppdragType
    ? oppdragType.charAt(0).toUpperCase() + oppdragType.slice(1).replace(/_/g, ' ')
    : null

  const befaringFormatert = new Date(befaringsdato).toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  await sendEpost({
    til,
    emne: `${kundeNavn} aksepterte tilbudet ditt – befaring ${befaringFormatert}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #10b981; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Takstmann.net</p>
          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">Tilbud akseptert ✓</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 20px; color: #1e293b; font-size: 15px;">Hei ${takstmannNavn},</p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">
            <strong style="color: #1e293b;">${kundeNavn}</strong> har akseptert tilbudet ditt og fylt inn praktisk informasjon.
            Bekreft oppdraget i portalen for å opprette det og synkronisere med kalenderen din.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            ${typeLabel ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 40%;">Type oppdrag</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 600;">${typeLabel}</td></tr>` : ''}
            ${adresse ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Adresse</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${adresse}</td></tr>` : ''}
            <tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Befaringsdato</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: 700;">${befaringFormatert}</td></tr>
            ${kundeEpost ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Kundens e-post</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${kundeEpost}</td></tr>` : ''}
            ${noekkelinfo ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Nøkkelinfo</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${noekkelinfo}</td></tr>` : ''}
            ${parkering ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Parkering</td><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${parkering}</td></tr>` : ''}
            ${tilgang ? `<tr><td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Tilgang</td><td style="padding: 12px 16px; color: #1e293b; font-size: 13px;">${tilgang}</td></tr>` : ''}
          </table>
          <div style="text-align: center;">
            <a href="${appUrl}/portal/takstmann/bestillinger"
               style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Bekreft oppdraget
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">Takstmann.net · post@takstmann.net</p>
        </div>
      </div>
    `,
  })
}

export async function sendNyRapportVarsel({
  til,
  bestillerNavn,
  oppdragTittel,
  oppdragId,
  rapportNavn,
}: {
  til: string
  bestillerNavn: string
  oppdragTittel: string
  oppdragId: string
  rapportNavn?: string | null
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'

  await sendEpost({
    til,
    emne: `Rapporten din er klar – ${oppdragTittel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #10b981; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Takstmann.net</p>
          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">Rapporten din er klar 📄</h1>
        </div>

        <!-- Body -->
        <div style="background: #f8fafc; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 20px; color: #1e293b; font-size: 15px;">Hei ${bestillerNavn},</p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">
            Rapporten for oppdraget ditt er nå klar og tilgjengelig for nedlasting i portalen.
          </p>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Oppdrag</p>
            <p style="margin: 0 0 ${rapportNavn ? '8px' : '0'}; color: #1e293b; font-size: 14px; font-weight: 600;">${oppdragTittel}</p>
            ${rapportNavn ? `
            <p style="margin: 0; color: #64748b; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              📎 ${rapportNavn}
            </p>` : ''}
          </div>

          <!-- CTA -->
          <div style="text-align: center;">
            <a href="${appUrl}/portal"
               style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Last ned rapport
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
            Takstmann.net · post@takstmann.net
          </p>
        </div>
      </div>
    `,
  })
}
