import Link from "next/link";
import { opprettOppdrag } from "@/lib/actions/oppdrag";
import { OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";

export default function NyttOppdragPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/portal/takstmann/oppdrag"
          className="text-[#64748b] hover:text-[#285982] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#1e293b]">Nytt oppdrag</h1>
      </div>

      <div className="portal-card p-6">
        <form action={opprettOppdrag as unknown as (formData: FormData) => void} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Tittel *
            </label>
            <input
              name="tittel"
              required
              className="portal-input"
              placeholder="f.eks. Tilstandsrapport Storgata 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Oppdragstype *
            </label>
            <select name="oppdrag_type" required className="portal-input">
              <option value="">Velg type</option>
              {Object.entries(OPPDRAG_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                Adresse
              </label>
              <input
                name="adresse"
                className="portal-input"
                placeholder="Storgata 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                Postnummer
              </label>
              <input
                name="postnr"
                className="portal-input"
                placeholder="0155"
                pattern="[0-9]{4}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                By/sted
              </label>
              <input name="by" className="portal-input" placeholder="Oslo" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                Befaringsdato
              </label>
              <input
                name="befaringsdato"
                type="datetime-local"
                className="portal-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                Frist for leveranse
              </label>
              <input
                name="frist"
                type="datetime-local"
                className="portal-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Pris (kr)
            </label>
            <input
              name="pris"
              type="number"
              min="0"
              step="100"
              className="portal-input"
              placeholder="5000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Beskrivelse / notater
            </label>
            <textarea
              name="beskrivelse"
              rows={4}
              className="portal-input resize-none"
              placeholder="Legg til detaljer om oppdraget..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/portal/takstmann/oppdrag"
              className="flex-1 text-center border border-[#e2e8f0] text-[#64748b] hover:border-[#285982] hover:text-[#285982] font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Avbryt
            </Link>
            <button type="submit" className="flex-1 portal-btn-primary">
              Opprett oppdrag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
