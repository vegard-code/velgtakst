import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { hentOppdragListe } from "@/lib/actions/oppdrag";

// Hjelpefunksjon: returner norsk månedsnavn
function norskMåned(dato: Date): string {
  const måneder = [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ];
  return måneder[dato.getMonth()];
}

// Hjelpefunksjon: returner norsk ukedagnavn (kort)
function norskUkedag(dato: Date): string {
  const dager = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
  return dager[dato.getDay()];
}

// Generer alle dager i en måneds-visning (inkl. padding fra forrige/neste måned)
function genererKalenderDager(år: number, måned: number): Date[] {
  const førsteDag = new Date(år, måned, 1);
  const sisteDag = new Date(år, måned + 1, 0);

  // Mandag = 0, Søndag = 6 (europeisk format)
  const startUkedag = (førsteDag.getDay() + 6) % 7; // 0=man, 6=søn
  const sluttUkedag = (sisteDag.getDay() + 6) % 7;

  const dager: Date[] = [];

  // Padding fra forrige måned
  for (let i = startUkedag - 1; i >= 0; i--) {
    dager.push(new Date(år, måned, -i));
  }

  // Dager i gjeldende måned
  for (let d = 1; d <= sisteDag.getDate(); d++) {
    dager.push(new Date(år, måned, d));
  }

  // Padding til neste måned (fyll opp til 6 uker = 42 celler)
  const resterendeDager = 42 - dager.length;
  for (let d = 1; d <= resterendeDager; d++) {
    dager.push(new Date(år, måned + 1, d));
  }

  return dager;
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ år?: string; måned?: string }>;
}) {
  const params = await searchParams;
  const iDag = new Date();
  const visÅr = params.år ? parseInt(params.år) : iDag.getFullYear();
  const visMåned = params.måned !== undefined ? parseInt(params.måned) : iDag.getMonth();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceSupabase = await createServiceClient();

  // Hent Google Calendar tilkoblingsstatus
  const { data: takstmannProfil } = await serviceSupabase
    .from("takstmann_profiler")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const googleKoblet = takstmannProfil
    ? await (async () => {
        const { data } = await serviceSupabase
          .from("google_calendar_tokens")
          .select("id")
          .eq("takstmann_id", takstmannProfil.id)
          .maybeSingle();
        return !!data;
      })()
    : false;

  // Hent oppdrag for aktuell måned (+/- buffer)
  const alleOppdrag = await hentOppdragListe();

  // Bygg et map: "YYYY-MM-DD" → oppdrag[]
  const oppdragPerDag: Record<string, typeof alleOppdrag> = {};
  for (const oppdrag of alleOppdrag) {
    const dato = oppdrag.befaringsdato ?? oppdrag.frist;
    if (!dato) continue;
    const key = dato.split("T")[0]; // Normaliser til YYYY-MM-DD
    if (!oppdragPerDag[key]) oppdragPerDag[key] = [];
    oppdragPerDag[key].push(oppdrag);
  }

  const kalenderDager = genererKalenderDager(visÅr, visMåned);

  // Navigasjon
  const forrigeMåned = visMåned === 0 ? 11 : visMåned - 1;
  const forrigeÅr = visMåned === 0 ? visÅr - 1 : visÅr;
  const nesteMåned = visMåned === 11 ? 0 : visMåned + 1;
  const nesteÅr = visMåned === 11 ? visÅr + 1 : visÅr;

  const iDagStr = iDag.toISOString().split("T")[0];

  // Oppdrag denne måneden
  const oppdragDenneMåneden = alleOppdrag.filter((o) => {
    const dato = o.befaringsdato ?? o.frist;
    if (!dato) return false;
    const d = new Date(dato);
    return d.getFullYear() === visÅr && d.getMonth() === visMåned;
  });

  const statusFarger: Record<string, string> = {
    ny: "bg-blue-100 text-blue-700",
    akseptert: "bg-indigo-100 text-indigo-700",
    under_befaring: "bg-yellow-100 text-yellow-700",
    rapport_under_arbeid: "bg-orange-100 text-orange-700",
    rapport_levert: "bg-green-100 text-green-700",
    fakturert: "bg-purple-100 text-purple-700",
    betalt: "bg-green-100 text-green-800",
    kansellert: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e293b]">Kalender</h1>
        {!googleKoblet && (
          <Link
            href="/portal/takstmann/innstillinger?fane=integrasjoner"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-sm text-[#64748b] hover:text-[#285982] hover:border-[#285982] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Koble Google Kalender
          </Link>
        )}
        {googleKoblet && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Google Kalender tilkoblet
          </span>
        )}
      </div>

      {/* Måneds-navigasjon */}
      <div className="portal-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/portal/takstmann/kalender?år=${forrigeÅr}&måned=${forrigeMåned}`}
            className="p-2 rounded-lg hover:bg-[#f0f4f8] transition-colors text-[#64748b] hover:text-[#1e293b]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="text-lg font-semibold text-[#1e293b] capitalize">
            {norskMåned(new Date(visÅr, visMåned, 1))} {visÅr}
          </h2>
          <Link
            href={`/portal/takstmann/kalender?år=${nesteÅr}&måned=${nesteMåned}`}
            className="p-2 rounded-lg hover:bg-[#f0f4f8] transition-colors text-[#64748b] hover:text-[#1e293b]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Ukedager-header */}
        <div className="grid grid-cols-7 mb-1">
          {["man", "tir", "ons", "tor", "fre", "lør", "søn"].map((dag) => (
            <div key={dag} className="text-center text-xs font-medium text-[#94a3b8] py-2">
              {dag}
            </div>
          ))}
        </div>

        {/* Kalender-grid */}
        <div className="grid grid-cols-7 gap-px bg-[#e2e8f0] rounded-lg overflow-hidden">
          {kalenderDager.map((dag, i) => {
            const dagStr = dag.toISOString().split("T")[0];
            const erDenneMåned = dag.getMonth() === visMåned;
            const erIdag = dagStr === iDagStr;
            const oppdragIDag = oppdragPerDag[dagStr] ?? [];

            return (
              <div
                key={i}
                className={`bg-white min-h-[80px] p-1.5 ${!erDenneMåned ? "opacity-40" : ""}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1 mx-auto
                  ${erIdag
                    ? "bg-[#285982] text-white font-bold"
                    : "text-[#374151] font-medium"
                  }`}
                >
                  {dag.getDate()}
                </div>
                <div className="space-y-0.5">
                  {oppdragIDag.slice(0, 2).map((o) => (
                    <Link
                      key={o.id}
                      href={`/portal/takstmann/oppdrag/${o.id}`}
                      className="block text-[10px] truncate px-1 py-0.5 rounded bg-[#e8f0f8] text-[#285982] hover:bg-[#d1e3f3] transition-colors leading-tight"
                      title={o.tittel}
                    >
                      {o.tittel}
                    </Link>
                  ))}
                  {oppdragIDag.length > 2 && (
                    <div className="text-[10px] text-[#64748b] px-1">
                      +{oppdragIDag.length - 2} til
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Oppdrag denne måneden – liste */}
      {oppdragDenneMåneden.length > 0 && (
        <div className="portal-card p-6">
          <h3 className="text-[#1e293b] font-semibold mb-4">
            Oppdrag i {norskMåned(new Date(visÅr, visMåned, 1))} {visÅr}
          </h3>
          <div className="space-y-2">
            {oppdragDenneMåneden
              .sort((a, b) => {
                const datoA = a.befaringsdato ?? a.frist ?? "";
                const datoB = b.befaringsdato ?? b.frist ?? "";
                return datoA.localeCompare(datoB);
              })
              .map((o) => {
                const dato = o.befaringsdato ?? o.frist;
                const d = dato ? new Date(dato) : null;
                return (
                  <Link
                    key={o.id}
                    href={`/portal/takstmann/oppdrag/${o.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors border border-[#e2e8f0] hover:border-[#cbd5e1]"
                  >
                    {d && (
                      <div className="w-10 text-center shrink-0">
                        <div className="text-xs text-[#64748b]">{norskUkedag(d)}</div>
                        <div className="text-lg font-bold text-[#1e293b] leading-tight">{d.getDate()}</div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1e293b] truncate">{o.tittel}</div>
                      {o.adresse && (
                        <div className="text-xs text-[#64748b] truncate">{o.adresse}{o.by ? `, ${o.by}` : ""}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusFarger[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {oppdragDenneMåneden.length === 0 && (
        <div className="portal-card p-8 text-center">
          <svg className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[#64748b] text-sm">Ingen oppdrag med befaringsdato denne måneden.</p>
          <Link href="/portal/takstmann/oppdrag/ny" className="inline-block mt-3 text-sm text-[#285982] hover:underline font-medium">
            Opprett nytt oppdrag →
          </Link>
        </div>
      )}
    </div>
  );
}
