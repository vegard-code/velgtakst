import { createServiceClient } from "@/lib/supabase/server";
import { FYLKER, getFylkePris } from "@/lib/supabase/types";

const FYLKE_NAVN: Record<string, string> = {
  oslo: "Oslo", rogaland: "Rogaland", vestland: "Vestland", trondelag: "Trøndelag",
  akershus: "Akershus", innlandet: "Innlandet", vestfold: "Vestfold", telemark: "Telemark",
  agder: "Agder", "more-og-romsdal": "Møre og Romsdal", nordland: "Nordland",
  troms: "Troms", finnmark: "Finnmark", buskerud: "Buskerud", ostfold: "Østfold",
};

export default async function AdminAbonnementerPage() {
  const supabase = await createServiceClient();

  // Hent abonnementer med company-info
  const { data: abonnementer } = await supabase
    .from("abonnementer")
    .select("*, companies:company_id(id, navn)")
    .order("created_at", { ascending: false });

  // Hent fylkesynligheter
  const { data: fylker } = await supabase
    .from("fylke_synlighet")
    .select("id, takstmann_id, fylke_id, er_aktiv, betalt_til, created_at");

  // Hent takstmann-navn og company_id
  const takstmannIds = [...new Set(fylker?.map((f) => f.takstmann_id) ?? [])];
  const { data: takstmenn } = takstmannIds.length > 0
    ? await supabase
        .from("takstmann_profiler")
        .select("id, navn, company_id")
        .in("id", takstmannIds)
    : { data: [] };

  const navnMap = new Map<string, string>();
  const companyIdMap = new Map<string, string>();
  takstmenn?.forEach((t) => {
    navnMap.set(t.id, t.navn);
    if (t.company_id) companyIdMap.set(t.id, t.company_id);
  });

  // Statistikk
  const proveperioder = abonnementer?.filter(a => a.status === "proveperiode").length ?? 0;
  const aktiveAb = abonnementer?.filter(a => a.status === "aktiv").length ?? 0;
  const kansellerte = abonnementer?.filter(a => a.status === "kansellert").length ?? 0;
  const aktiveFylkerCount = fylker?.filter((f) => f.er_aktiv).length ?? 0;
  const totalMndInntekt = (fylker ?? [])
    .filter(f => f.er_aktiv)
    .reduce((sum, f) => sum + (getFylkePris(f.fylke_id) ?? 199), 0);

  const abStatusFarger: Record<string, string> = {
    proveperiode: "bg-green-100 text-green-700",
    aktiv: "bg-blue-100 text-blue-700",
    kansellert: "bg-red-100 text-red-700",
    utlopt: "bg-gray-100 text-gray-500",
  };

  const abStatusNavn: Record<string, string> = {
    proveperiode: "Prøveperiode",
    aktiv: "Aktiv",
    kansellert: "Kansellert",
    utlopt: "Utløpt",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Abonnementer</h1>
          <p className="text-sm text-[#64748b]">Oversikt over alle bedriftsabonnementer og fylkesynlighet</p>
        </div>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Totalt abonnementer</p>
          <p className="text-2xl font-bold text-[#1e293b]">{abonnementer?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Prøveperioder</p>
          <p className="text-2xl font-bold text-green-600">{proveperioder}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Betalende</p>
          <p className="text-2xl font-bold text-blue-600">{aktiveAb}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Kansellerte</p>
          <p className="text-2xl font-bold text-red-600">{kansellerte}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Est. mnd. inntekt</p>
          <p className="text-2xl font-bold text-[#285982]">{totalMndInntekt.toLocaleString("nb-NO")} kr</p>
          <p className="text-[10px] text-[#94a3b8]">{aktiveFylkerCount} aktive fylker</p>
        </div>
      </div>

      {/* Abonnement-tabell */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-sm font-semibold text-[#1e293b]">Bedriftsabonnementer</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Bedrift</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Prøveperiode</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Vipps</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Mnd. beløp</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {abonnementer && abonnementer.length > 0 ? (
                abonnementer.map((a) => {
                  const dagerIgjen = a.status === "proveperiode" && a.proveperiode_slutt
                    ? Math.max(0, Math.ceil((new Date(a.proveperiode_slutt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : null;
                  const company = a.companies as { id: string; navn: string } | null;

                  return (
                    <tr key={a.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1e293b]">
                        {company?.navn ?? "Ukjent bedrift"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${abStatusFarger[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {abStatusNavn[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">
                        {dagerIgjen !== null ? (
                          <span className={dagerIgjen <= 7 ? "text-red-600 font-medium" : ""}>
                            {dagerIgjen} dager igjen
                          </span>
                        ) : (
                          a.proveperiode_slutt
                            ? `Utløpt ${new Date(a.proveperiode_slutt).toLocaleDateString("nb-NO")}`
                            : "–"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">
                        {a.vipps_agreement_id ? (
                          <span className={`text-xs font-medium ${
                            a.vipps_agreement_status === "ACTIVE" ? "text-green-600" :
                            a.vipps_agreement_status === "PENDING" ? "text-amber-600" :
                            "text-gray-500"
                          }`}>
                            {a.vipps_agreement_status}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94a3b8]">Ikke opprettet</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#1e293b]">
                        {a.maanedlig_belop > 0 ? `${(a.maanedlig_belop / 100).toLocaleString("nb-NO")} kr` : "Gratis"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8]">
                        {new Date(a.created_at).toLocaleDateString("nb-NO")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen abonnementer registrert ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fylkesynlighet-tabell */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-sm font-semibold text-[#1e293b]">Fylkesynlighet (alle registreringer)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Takstmann</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Fylke</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Betalt til</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {fylker && fylker.length > 0 ? (
                fylker.map((f) => {
                  const erUtløpt = f.betalt_til && new Date(f.betalt_til) < new Date();
                  return (
                    <tr key={f.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1e293b]">
                        {navnMap.get(f.takstmann_id) ?? "Ukjent"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">
                        {FYLKE_NAVN[f.fylke_id] ?? f.fylke_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          f.er_aktiv && !erUtløpt
                            ? "bg-green-100 text-green-700"
                            : erUtløpt
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {f.er_aktiv && !erUtløpt ? "Aktiv" : erUtløpt ? "Utløpt" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">
                        {f.betalt_til ? new Date(f.betalt_til).toLocaleDateString("nb-NO") : "–"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8]">
                        {new Date(f.created_at).toLocaleDateString("nb-NO")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen fylkesynlighet registrert ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
