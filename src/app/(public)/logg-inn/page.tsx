import type { Metadata } from "next";
import LoggInnForm from "./LoggInnForm";

export const metadata: Metadata = {
  title: "Logg inn | takstmann.net",
  alternates: {
    canonical: "https://www.takstmann.net/logg-inn",
  },
  robots: { index: false, follow: false },
};

export default function LoggInnPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            VT
          </div>
          <h1 className="text-2xl font-bold text-white">Logg inn på takstmann.net</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Hvem logger inn?
          </p>
        </div>
        <LoggInnForm />
      </div>
    </div>
  );
}
