import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personvernerklæring – takstmann.net",
  description: "Les om hvordan takstmann.net samler inn, bruker og beskytter dine personopplysninger.",
};

export default function PersonvernPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Personvernerklæring</h1>
      <p className="text-gray-400 text-sm mb-10">Sist oppdatert: 2. april 2026</p>

      <div className="prose prose-invert max-w-none space-y-8 text-gray-300">

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Behandlingsansvarlig</h2>
          <p>
            Behandlingsansvarlig for personopplysninger på takstmann.net er BMTF AS. Har du spørsmål
            om personvern, kan du kontakte oss på{" "}
            <a href="mailto:vegard@bmtf.no" className="text-blue-400 hover:text-blue-300 underline">
              vegard@bmtf.no
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Hvilke opplysninger samler vi inn?</h2>
          <p>Vi samler inn følgende kategorier av personopplysninger:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Kontaktinformasjon:</strong> navn, e-postadresse, telefonnummer og adresse.</li>
            <li><strong>Profilinformasjon:</strong> for takstmenn – faglig bakgrunn, tjenester og spesialiteter; for meglere – meglerforetak.</li>
            <li><strong>Transaksjonsdata:</strong> informasjon om oppdrag, bestillinger og betalinger.</li>
            <li><strong>Kommunikasjonsdata:</strong> meldinger sendt via plattformens meldingssystem.</li>
            <li><strong>Tekniske data:</strong> IP-adresse, nettlesertype, operativsystem og bruksmønster via Google Analytics (kun med samtykke).</li>
            <li><strong>Autentiseringsdata:</strong> passordhash og innloggingsinformasjon via Vipps eller e-post/passord.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Formål og rettslig grunnlag</h2>
          <p>Vi behandler personopplysninger til følgende formål:</p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>
              <strong>Opprettelse og administrasjon av brukerkontoer</strong> – nødvendig for oppfyllelse av
              avtale (GDPR art. 6 nr. 1 b).
            </li>
            <li>
              <strong>Formidling av takstoppdrag</strong> – nødvendig for oppfyllelse av avtale
              (GDPR art. 6 nr. 1 b).
            </li>
            <li>
              <strong>Betaling og fakturering</strong> – nødvendig for oppfyllelse av avtale og rettslig
              forpliktelse (GDPR art. 6 nr. 1 b og c).
            </li>
            <li>
              <strong>Varsler og e-postnotifikasjoner</strong> – berettiget interesse i å holde brukere
              informert om aktivitet (GDPR art. 6 nr. 1 f), med mulighet til å reservere seg.
            </li>
            <li>
              <strong>Analysere og forbedre tjenesten</strong> – samtykke (GDPR art. 6 nr. 1 a), via
              Google Analytics. Du kan til enhver tid trekke tilbake samtykket.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Databehandlere</h2>
          <p>Vi benytter følgende underleverandører (databehandlere) for å drifte tjenesten:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Supabase Inc.</strong> – databaselagring og autentisering. Data lagres i EU (Frankfurt).</li>
            <li><strong>Vercel Inc.</strong> – hosting og serverinfrastruktur. Data kan prosesseres i EU og USA.</li>
            <li><strong>Google LLC</strong> – Google Analytics (kun med samtykke) og Google Kalender-integrasjon.</li>
            <li><strong>Vipps MobilePay AS</strong> – betalingsformidling og innlogging via Vipps.</li>
            <li><strong>Resend Inc.</strong> – utsending av e-postvarsler.</li>
          </ul>
          <p className="mt-2">
            Alle databehandlere er bundet av databehandleravtaler som sikrer at personopplysningene
            behandles i samsvar med GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Lagring og sletting</h2>
          <p>
            Vi lagrer personopplysninger så lenge kontoen er aktiv og så lenge det er nødvendig for å
            oppfylle formålene beskrevet i denne erklæringen. For opplysninger knyttet til faktura og
            regnskap gjelder lovpålagt oppbevaringsplikt på 5 år (regnskapsloven § 13).
          </p>
          <p className="mt-2">
            Når en konto slettes, slettes tilknyttede personopplysninger automatisk (via CASCADE i
            databasen), med unntak av opplysninger vi er lovpålagt å beholde.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Dine rettigheter</h2>
          <p>Du har følgende rettigheter etter GDPR:</p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>
              <strong>Innsyn (art. 15):</strong> Du kan be om innsyn i hvilke opplysninger vi har om deg.
            </li>
            <li>
              <strong>Retting (art. 16):</strong> Du kan korrigere feilaktige opplysninger i din brukerprofil.
            </li>
            <li>
              <strong>Sletting (art. 17):</strong> Du kan slette kontoen din direkte fra innstillingssiden
              i portalen. Vi vil da slette dine personopplysninger.
            </li>
            <li>
              <strong>Dataportabilitet (art. 20):</strong> Du kan be om å få dine opplysninger utlevert i
              et maskinlesbart format.
            </li>
            <li>
              <strong>Innsigelse (art. 21):</strong> Du kan motsette deg behandling basert på berettiget interesse.
            </li>
            <li>
              <strong>Trekke samtykke:</strong> Du kan trekke samtykke til informasjonskapsler når som helst
              via cookie-banneret nederst på siden.
            </li>
          </ul>
          <p className="mt-2">
            Send forespørsler til{" "}
            <a href="mailto:vegard@bmtf.no" className="text-blue-400 hover:text-blue-300 underline">
              vegard@bmtf.no
            </a>
            . Vi besvarer henvendelser innen 30 dager.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Informasjonskapsler (cookies)</h2>
          <p>
            Vi bruker informasjonskapsler for å huske ditt samtykke til analytics og for å holde deg
            innlogget. Google Analytics aktiveres kun dersom du gir samtykke via cookie-banneret.
          </p>
          <p className="mt-2">
            Du kan trekke samtykket når som helst ved å klikke på cookie-banneret som vises på siden,
            eller ved å slette informasjonskapslene i nettleseren din.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Klagerett</h2>
          <p>
            Dersom du mener vi behandler dine personopplysninger i strid med GDPR, har du rett til å
            klage til Datatilsynet:{" "}
            <a
              href="https://www.datatilsynet.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              www.datatilsynet.no
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. Kontakt</h2>
          <p>
            Spørsmål om personvern kan rettes til:
          </p>
          <address className="mt-2 not-italic text-gray-300">
            BMTF AS<br />
            E-post:{" "}
            <a href="mailto:vegard@bmtf.no" className="text-blue-400 hover:text-blue-300 underline">
              vegard@bmtf.no
            </a>
          </address>
        </section>

      </div>
    </div>
  );
}
