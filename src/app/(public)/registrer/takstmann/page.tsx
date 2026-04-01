import type { Metadata } from "next";
import Link from "next/link";
import RegistrerTakstmannForm from "./RegistrerTakstmannForm";
import { FYLKE_PRIS } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Registrer deg som takstmann | Bli synlig på VelgTakst",
  description:
    "Bli synlig for boligkjøpere, meglere og privatpersoner i ditt fylke. Registrer deg som takstmann på VelgTakst og motta henvendelser for tilstandsrapport, verditakst og skadetakst.",
  openGraph: {
    title: "Registrer deg som takstmann | VelgTakst",
    description:
      "Bli synlig for kunder i ditt fylke. Registrer deg på VelgTakst og motta henvendelser for tilstandsrapport, verditakst og skadetakst.",
    url: "https://www.takstmann.net/registrer/takstmann",
  },
};

export default function RegistrerTakstmannPage() {
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Brødsmulesti" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-white transition-colors">VelgTakst</Link>
            </li>
            <li>/</li>
            <li className="text-gray-300">Registrer takstmann</li>
          </ol>
        </nav>

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Registrer deg som takstmann
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
            VelgTakst kobler sertifiserte takstmenn med boligkjøpere, meglere og
            privatpersoner som trenger hjelp med{" "}
            <Link href="/blogg/tilstandsrapport-guide" className="text-accent hover:underline">tilstandsrapport</Link>,{" "}
            <Link href="/blogg/verditakst-hva-er-det" className="text-accent hover:underline">verditakst</Link>,{" "}
            <Link href="/blogg/hva-er-skadetakst" className="text-accent hover:underline">skadetakst</Link>{" "}
            og andre taksttjenester. Registrer deg og bli synlig i de fylkene du ønsker.
          </p>
        </div>

        {/* Fordeler */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">Hvorfor VelgTakst?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { tittel: "Synlighet i ditt fylke", beskrivelse: "Vis profilen din for alle som søker takstmann i dine aktive fylker." },
              { tittel: "Kvalifiserte henvendelser", beskrivelse: "Kundene som finner deg vet allerede hva de trenger – du slipper kaldkontakt." },
              { tittel: "Fleksibelt abonnement", beskrivelse: "Betal kun for de fylkene du vil dekke. Aktiver og deaktiver når du ønsker." },
            ].map((f) => (
              <div key={f.tittel} className="text-center">
                <h3 className="text-white font-semibold text-sm mb-1">{f.tittel}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.beskrivelse}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prisoversikt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <h3 className="text-white font-semibold mb-1">Standard fylker</h3>
            <p className="text-3xl font-bold text-accent mb-1">{FYLKE_PRIS.standard} kr</p>
            <p className="text-gray-500 text-sm">per fylke per måned</p>
            <p className="text-gray-400 text-xs mt-2">
              Innlandet, Telemark, Agder, Vestfold, Møre og Romsdal, Nordland, Troms, Finnmark, Buskerud, Østfold
            </p>
          </div>
          <div className="bg-card-bg border border-accent/20 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-1">Store fylker</h3>
            <p className="text-3xl font-bold text-accent mb-1">{FYLKE_PRIS.stor} kr</p>
            <p className="text-gray-500 text-sm">per fylke per måned</p>
            <p className="text-gray-400 text-xs mt-2">
              Oslo, Rogaland, Vestland, Trøndelag, Akershus
            </p>
          </div>
        </div>

        <RegistrerTakstmannForm />

        <p className="text-center text-sm text-gray-500 mt-6">
          Allerede partner?{" "}
          <Link href="/logg-inn" className="text-accent hover:text-accent/80 transition-colors">
            Logg inn
          </Link>
        </p>
      </div>

      {/* Structured Data: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "VelgTakst",
                item: "https://www.takstmann.net",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Registrer takstmann",
                item: "https://www.takstmann.net/registrer/takstmann",
              },
            ],
          }),
        }}
      />
    </>
  );
}
