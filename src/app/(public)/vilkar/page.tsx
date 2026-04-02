import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Salgsvilkår | takstmann.net",
  description:
    "Salgsvilkår og betingelser for bruk av takstmann.net – Norges portal for takstmenn.",
};

export default function VilkarPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Salgsvilkår</h1>
      <p className="text-gray-400 text-sm mb-10">
        Sist oppdatert: 30. mars 2026
      </p>

      <div className="space-y-10 text-gray-300 text-sm leading-relaxed">
        {/* --- 1. Generelt --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            1. Generelt
          </h2>
          <p>
            Disse salgsvilkårene gjelder for kjøp av tjenester fra takstmann.net,
            levert av Validert AS (org.nr. 936 714 080), heretter kalt
            &laquo;takstmann.net&raquo; eller &laquo;vi&raquo;.
          </p>
          <p className="mt-3">
            Ved å opprette en konto og tegne abonnement hos takstmann.net, godtar du
            disse vilkårene. Vilkårene utgjør sammen med din bestilling den
            fullstendige avtalen mellom deg og takstmann.net.
          </p>
        </section>

        {/* --- 2. Tjenesten --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            2. Tjenesten
          </h2>
          <p>
            takstmann.net er en nettbasert portal som kobler takstmenn med kunder
            som trenger takseringstjenester. Takstmenn kan tegne abonnement for
            å bli oppført i ett eller flere fylker, slik at potensielle kunder
            enkelt kan finne og kontakte dem.
          </p>
          <p className="mt-3">
            Abonnementet gir takstmannen en profilside, synlighet i valgte
            fylker, og tilgang til bestillinger fra kunder og meglere gjennom
            portalen.
          </p>
        </section>

        {/* --- 3. Priser og betaling --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            3. Priser og betaling
          </h2>
          <p>
            Abonnementet faktureres som en fast månedspris per fylke
            takstmannen er oppført i. Gjeldende priser fremgår ved bestilling
            og i din portal under &laquo;Innstillinger&raquo;.
          </p>
          <p className="mt-3">
            Alle priser er oppgitt i norske kroner (NOK) og er eksklusive
            merverdiavgift (MVA) med mindre annet er angitt.
          </p>
          <p className="mt-3">
            Betaling skjer via Vipps. Ved å godkjenne betalingsavtalen i Vipps,
            samtykker du til at takstmann.net trekker det månedlige beløpet
            automatisk. Du vil motta varsel i Vipps før hvert trekk.
          </p>
          <p className="mt-3">
            Ved forsinket betaling forbeholder takstmann.net seg retten til å
            deaktivere din oppføring inntil betaling er mottatt.
          </p>
        </section>

        {/* --- 4. Angrerett --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            4. Angrerett
          </h2>
          <p>
            I henhold til angrerettloven har du 14 dagers angrerett fra den
            dagen abonnementet ble inngått. Angreretten gjelder forutsatt at
            tjenesten ikke er fullt ut levert i angrerettperioden med ditt
            uttrykkelige samtykke.
          </p>
          <p className="mt-3">
            For å benytte angreretten må du gi oss melding om dette innen
            fristen. Du kan kontakte oss på{" "}
            <a
              href="mailto:post@takstmann.net"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              post@takstmann.net
            </a>{" "}
            eller bruke{" "}
            <a
              href="https://www.regjeringen.no/no/dokumenter/angrerettloven/id2558028/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              standard angreskjema
            </a>
            .
          </p>
          <p className="mt-3">
            Ved gyldig angrerett refunderes innbetalt beløp innen 14 dager
            etter at vi har mottatt din melding.
          </p>
        </section>

        {/* --- 5. Oppsigelse --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            5. Oppsigelse og avbestilling
          </h2>
          <p>
            Du kan når som helst si opp abonnementet ditt via portalen under
            &laquo;Innstillinger&raquo; eller ved å kontakte oss på e-post.
            Oppsigelsen trer i kraft ved utløpet av inneværende betalingsperiode.
          </p>
          <p className="mt-3">
            Ved oppsigelse beholder du tilgang til tjenesten ut perioden du
            allerede har betalt for. Det gis ikke refusjon for gjenstående tid
            i inneværende periode, med unntak av angrerettsperioden beskrevet
            i punkt 4.
          </p>
        </section>

        {/* --- 6. Retur og refusjon --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            6. Retur og refusjon
          </h2>
          <p>
            Ettersom takstmann.net leverer en digital tjeneste, gjelder ikke
            tradisjonell returrett. Dersom du opplever tekniske problemer som
            gjør tjenesten utilgjengelig over en lengre periode, kan du ha krav
            på forholdsmessig refusjon. Ta kontakt med oss for en vurdering.
          </p>
          <p className="mt-3">
            Refusjon behandles innen 14 virkedager og tilbakeføres via samme
            betalingsmetode som ble brukt ved kjøp (Vipps).
          </p>
        </section>

        {/* --- 7. Klagehåndtering --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            7. Klagehåndtering
          </h2>
          <p>
            Dersom du er misfornøyd med tjenesten eller mener det foreligger
            feil, ber vi deg kontakte oss så snart som mulig:
          </p>
          <ul className="mt-3 space-y-1 ml-4">
            <li>
              E-post:{" "}
              <a
                href="mailto:post@takstmann.net"
                className="text-accent hover:text-accent/80 transition-colors"
              >
                post@takstmann.net
              </a>
            </li>
          </ul>
          <p className="mt-3">
            Vi behandler alle klager innen rimelig tid og vil forsøke å finne
            en løsning i dialog med deg. Dersom vi ikke kommer til enighet, kan
            du henvende deg til{" "}
            <a
              href="https://www.forbrukertilsynet.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              Forbrukertilsynet
            </a>{" "}
            eller{" "}
            <a
              href="https://www.forbrukerradet.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              Forbrukerrådet
            </a>{" "}
            for veiledning og mekling.
          </p>
        </section>

        {/* --- 8. Personvern --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            8. Personvern
          </h2>
          <p>
            Vi behandler personopplysninger i samsvar med gjeldende
            personvernlovgivning (GDPR). Opplysninger vi samler inn brukes
            kun til å levere tjenesten og kommunisere med deg. Vi deler ikke
            dine personopplysninger med tredjeparter utover det som er
            nødvendig for å levere tjenesten (f.eks. betalingsformidler Vipps).
          </p>
        </section>

        {/* --- 9. Endringer --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            9. Endringer i vilkårene
          </h2>
          <p>
            takstmann.net forbeholder seg retten til å endre disse vilkårene. Ved
            vesentlige endringer vil du bli varslet via e-post eller i portalen
            minst 30 dager før endringene trer i kraft. Fortsatt bruk av
            tjenesten etter at endringene har trådt i kraft, anses som
            aksept av de nye vilkårene.
          </p>
        </section>

        {/* --- 10. Kontakt --- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            10. Kontaktinformasjon
          </h2>
          <p>Validert AS</p>
          <p>Org.nr: 936 714 080</p>
          <p>
            E-post:{" "}
            <a
              href="mailto:post@takstmann.net"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              post@takstmann.net
            </a>
          </p>
        </section>
      </div>

      <div className="gradient-line my-10" />

      <p className="text-center text-xs text-gray-500">
        <Link
          href="/"
          className="text-accent hover:text-accent/80 transition-colors"
        >
          Tilbake til forsiden
        </Link>
      </p>
    </div>
  );
}
