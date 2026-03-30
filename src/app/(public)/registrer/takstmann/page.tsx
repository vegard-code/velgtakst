import type { Metadata } from "next";
import Link from "next/link";
import RegistrerTakstmannForm from "./RegistrerTakstmannForm";
import { FYLKE_PRIS } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Bli takstmann-partner | VelgTakst",
  description: "Registrer deg som takstmann på VelgTakst og bli synlig for meglere og kunder i ditt fylke.",
};

export default function RegistrerTakstmannPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">
          Bli takstmann-partner
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Registrer deg og bli synlig for meglere og privatpersoner i dine fylker.
          Betal kun for de fylkene du vil være aktiv i.
        </p>
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
  );
}
