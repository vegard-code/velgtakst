# Implementeringsplan: Pakkestruktur og prismodell

Status: PLANLAGT (ikke startet)
Prioritet: Etter ARKAT-kalibrering og korrektursjekk-feature

## Prismodell

| Pakke | Pris | Innhold |
|-------|------|---------|
| Fylkesynlighet | 499 kr/mnd | Oppføring i 3 valgfrie fylker, 199 kr per ekstra. Gir tilgang til portalen: kalender, faktura, bestillinger, meldinger, vurderinger |
| ARKAT Skrivehjelp | 799 kr/mnd | AI-basert skrivehjelp for tilstandsrapporter. Kan kjøpes frittstående |
| Korrektursjekk | 299 kr/mnd | Last opp rapport, få korrektur tilbake. Kan kjøpes frittstående |
| Premium | 990 kr/mnd | Alt inkludert + 3 fylker |

Regler:
- ARKAT og Korrektursjekk kan kjøpes UTEN fylkesynlighet
- Portaltilgang (kalender, faktura, bestillinger, meldinger, vurderinger) krever aktiv fylkesynlighet
- Premium inkluderer 3 fylker + alle funksjoner

## Fase 1: Database og datamodell

### 1.1 Ny tabell: `pakker`
```sql
CREATE TABLE pakker (
  id TEXT PRIMARY KEY,           -- 'fylke', 'arkat', 'korrektur', 'premium'
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  pris_ore INTEGER NOT NULL,     -- i øre (49900, 79900, 29900, 99000)
  aktiv BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pakker VALUES
  ('fylke', 'Fylkesynlighet', 'Oppføring i 3 fylker, kalender, faktura, meldinger', 49900, true, now()),
  ('arkat', 'ARKAT Skrivehjelp', 'AI-basert skrivehjelp for tilstandsrapporter', 79900, true, now()),
  ('korrektur', 'Korrektursjekk', 'Automatisk korrekturlesing av rapporter', 29900, true, now()),
  ('premium', 'Premium', 'Alt inkludert + 3 fylker', 99000, true, now());
```

### 1.2 Utvid `abonnementer`-tabellen
```sql
ALTER TABLE abonnementer
  ADD COLUMN pakke_id TEXT REFERENCES pakker(id) DEFAULT 'fylke',
  ADD COLUMN tilleggspakker TEXT[] DEFAULT '{}';
  -- tilleggspakker = array av pakke-IDer brukeren har i tillegg
  -- f.eks. ['arkat', 'korrektur'] eller tom for premium (alt inkl.)
```

Alternativ: Én rad per pakke per bruker i en ny `bruker_pakker`-tabell.
Anbefaling: Separat tabell er renere, men `tilleggspakker`-array er enklere å implementere. Gå med separat tabell for å unngå array-gymnastikk i queries.

### 1.3 Ny tabell: `bruker_abonnementer` (erstatter/utvider abonnementer)
```sql
CREATE TABLE bruker_abonnementer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pakke_id TEXT NOT NULL REFERENCES pakker(id),
  status TEXT NOT NULL DEFAULT 'proveperiode',
  vipps_agreement_id TEXT,
  vipps_agreement_status TEXT,
  maanedlig_belop INTEGER NOT NULL,  -- i øre
  neste_trekk_dato DATE,
  proveperiode_start DATE,
  proveperiode_slutt DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, pakke_id)
);
```

## Fase 2: Tilgangskontroll

### 2.1 Hjelpefunksjon: `harTilgang(companyId, feature)`
```typescript
type Feature = 'arkat' | 'korrektur' | 'fylker' | 'kalender' | 'faktura' | 'bestillinger' | 'meldinger' | 'vurderinger'

async function harTilgang(companyId: string, feature: Feature): Promise<boolean> {
  // Premium gir alt
  // Fylke gir: fylker, kalender, faktura, bestillinger, meldinger, vurderinger
  // ARKAT gir: arkat
  // Korrektur gir: korrektur
}
```

### 2.2 Gate ARKAT-siden
- Sjekk om bruker har `arkat` eller `premium`
- Vis oppgraderingsside hvis ikke

### 2.3 Gate korrektursjekk-siden (når den finnes)
- Sjekk om bruker har `korrektur` eller `premium`

### 2.4 Gate portalfunksjoner
- Kalender, faktura, bestillinger, meldinger, vurderinger krever `fylke` eller `premium`

## Fase 3: Abonnement-side redesign

### 3.1 Ny abonnement-side
- Vis nåværende pakker med status
- Vis tilgjengelige oppgraderinger
- "Legg til ARKAT Skrivehjelp" → Vipps agreement for 799 kr
- "Oppgrader til Premium" → ny agreement på 990 kr, stopp gamle
- Betalingshistorikk-seksjon (se fase 5)

### 3.2 Priskalkulator
- Vis hva brukeren betaler nå vs. Premium-prisen
- "Du sparer X kr/mnd med Premium"

## Fase 4: Vipps-integrasjon

### 4.1 Flere agreements per bruker
- Én Vipps agreement per pakke, ELLER
- Én samlet agreement med totalpris (enklere)
- **Besluttet: Én samlet agreement.** Når bruker endrer pakkevalg → PATCH agreement med nytt beløp

### 4.2 Oppdater cron-jobb
- `abonnement-trekk` må håndtere ulike beløp per bruker
- Charge-beløp = sum av aktive pakker (eller premium-pris)

### 4.3 Webhook-oppdateringer
- Håndter endringer i agreement-beløp

## Fase 5: Betalingshistorikk

### 5.1 Ny tabell: `betalingslogg`
```sql
CREATE TABLE betalingslogg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  vipps_charge_id TEXT,
  belop_ore INTEGER NOT NULL,
  beskrivelse TEXT,
  status TEXT NOT NULL DEFAULT 'opprettet',  -- opprettet, captured, failed
  dato DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Logg i webhook
- Ved charge-captured → insert i betalingslogg

### 5.3 Visning på abonnement-siden
- Tabell med dato, beløp, status

## Fase 6: Migrasjon av eksisterende brukere

### 6.1 Strategi
- Alle eksisterende takstmenn med aktiv fylkesynlighet → `fylke`-pakke
- Alle som bruker ARKAT i dag → gratis tilgang i overgangsperiode (f.eks. 30 dager)
- Varsle via e-post om ny prismodell

### 6.2 Migrasjonsscript
- Opprett `bruker_abonnementer`-rader basert på eksisterende `abonnementer`
- Behold eksisterende Vipps agreements (PATCH beløp ved behov)

## Fase 7: Stripe som alternativ betalingsløsning

### 7.1 Hvorfor
- Ikke alle takstmenn bruker Vipps til bedriftsformål
- Stripe støtter kortbetaling, faktura, og internasjonale kunder (fremtidsrettet)
- Stripe Billing har innebygd subscription management

### 7.2 Arkitektur
- Abstraksjonslag: `src/lib/betaling/` med felles grensesnitt for Vipps og Stripe
- Bruker velger betalingsmetode ved opprettelse av abonnement
- `abonnementer`-tabellen utvides med `betalingsmetode: 'vipps' | 'stripe'`
- Stripe webhook endpoint: `/api/stripe/webhook`

### 7.3 Omfang
- Stripe Checkout for enkel oppstart
- Stripe Customer Portal for selvbetjent endring/oppsigelse
- Webhook-håndtering for invoice.paid, invoice.payment_failed, customer.subscription.updated/deleted

Prioritet: Etter pakkestruktur er live og fungerer med Vipps.

## Avhengigheter

1. **Korrektursjekk-feature** må bygges først (ellers selger vi noe som ikke finnes)
2. **ARKAT-kalibrering** bør være ferdig (produktet må være godt nok til å ta betalt)
3. **Betalingshistorikk** bør implementeres uavhengig av pakkestruktur
4. **Stripe** kommer etter at pakkestruktur fungerer med Vipps

## Estimat

- Fase 1 (database): ~2 timer
- Fase 2 (tilgangskontroll): ~3 timer
- Fase 3 (abonnement-side): ~4 timer
- Fase 4 (Vipps): ~3 timer
- Fase 5 (betalingshistorikk): ~2 timer
- Fase 6 (migrasjon): ~2 timer
- Testing: ~2 timer

**Totalt: ~18 timer utviklingsarbeid**
