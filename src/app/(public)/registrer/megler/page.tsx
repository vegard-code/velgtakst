import type { Metadata } from "next";
import Link from "next/link";
import RegistrerMeglerForm from "./RegistrerMeglerForm";

export const metadata: Metadata = {
  title: "Registrer deg som megler | VelgTakst",
};

export default function RegistrerMeglerPage() {
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake
      </Link>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Registrer deg som megler</h1>
        <p className="text-gray-400 text-sm">
          Få tilgang til å søke etter og bestille takstmenn direkte.
        </p>
      </div>
      <RegistrerMeglerForm />
      <p className="text-center text-sm text-gray-500 mt-6">
        Allerede registrert?{" "}
        <Link href="/logg-inn" className="text-accent hover:text-accent/80 transition-colors">
          Logg inn
        </Link>
      </p>
    </div>
  );
}
