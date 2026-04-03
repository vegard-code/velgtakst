import type { Metadata } from "next";
import AdminLoggInnForm from "./AdminLoggInnForm";

export const metadata: Metadata = {
  title: "Admin – Logg inn | takstmann.net",
  robots: { index: false, follow: false },
};

export default function AdminLoggInnPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-white">Admin-innlogging</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Kun for administratorer. Sender deg direkte til admin-dashbordet.
          </p>
        </div>
        <AdminLoggInnForm />
        <p className="text-center text-xs text-gray-600 mt-6">
          Vil du teste portalen som vanlig bruker?{" "}
          <a href="/logg-inn" className="text-gray-500 hover:text-gray-400 underline">
            Bruk vanlig innlogging
          </a>
        </p>
      </div>
    </div>
  );
}
