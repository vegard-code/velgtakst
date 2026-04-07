import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { FYLKER, ALLE_TJENESTER } from "@/lib/supabase/types";
import BestillKnapp from "./BestillKnapp";

interface Props {
  searchParams: Promise<{ fylke?: string; spesialitet?: string; sok?: string }>;
}

export default async function FinnTakstmannMeglerPage({ searchParams }: Props) {
  const { fylke, spesialitet, sok } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("fylke_synlighet")
    .select(`
      fylke_id,
      takstmann:takstmann_profiler!inner(
        id, navn, tittel, spesialitet, spesialitet_2, tjenester, bio, telefon, epost, bilde_url, sertifiseringer
      )
    `)
    .eq("er_aktiv", true);

  if (fylke) query = query.eq("fylke_id", fylke);

  const { data: resultater } = await query;

  let takstmenn = (resultater ?? []).map((r) => r.takstmann as unknown as {
    id: string; navn: string; tittel: string | null; spesialitet: string | null;
    spesialitet_2: string | null; tjenester: string[];
    bio: string | null; telefon: string | null; epost: string | null;
    bilde_url: string | null; sertifiseringer: string[];
  });

  // Dedupliser
  const sett = new Set<string>();
  takstmenn = takstmenn.filter((t) => {
    if (sett.has(t.id)) return false;
    sett.add(t.id);
    return true;
  });

  if (spesialitet) {
    const s = spesialitet.toLowerCase();
    takstmenn = takstmenn.filter((t) =>
      t.spesialitet?.toLowerCase().includes(s) ||
      t.spesialitet_2?.toLowerCase().includes(s) ||
      t.tjenester?.some((tj) => tj.toLowerCase().includes(s))
    );
  }
  if (sok) {
    const s = sok.toLowerCase();
    takstmenn = takstmenn.filter((t) =>
      t.navn.toLowerCase().includes(s) ||
      t.spesialitet?.toLowerCase().includes(s) ||
      t.spesialitet_2?.toLowerCase().includes(s)
    );
  }

  // Hent megler-profilId for bestilling
  const { data: { user } } = await supabase.auth.getUser();
  const { data: meglerProfil } = user
    ? await supabase.from("megler_profiler").select("id").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Finn takstmann</h1>
        <p className="text-[#64748b] text-sm mt-0.5">
          Søk blant {takstmenn.length} aktive takstmenn
        </p>
      </div>

      {/* Søk/filter */}
      <div className="portal-card p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          <input
            name="sok"
            defaultValue={sok}
            placeholder="Søk på navn eller spesialitet..."
            className="portal-input flex-1"
          />
          <select name="fylke" defaultValue={fylke ?? ""} className="portal-input sm:w-44">
            <option value="">Alle fylker</option>
            {FYLKER.map((f) => (
              <option key={f.id} value={f.id}>{f.navn}</option>
            ))}
          </select>
          <select name="spesialitet" defaultValue={spesialitet ?? ""} className="portal-input sm:w-52">
            <option value="">Alle tjenester</option>
            {ALLE_TJENESTER.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className="portal-btn-primary shrink-0">Søk</button>
        </form>
      </div>

      {takstmenn.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <p className="text-[#94a3b8]">Ingen takstmenn funnet med disse filtrene</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {takstmenn.map((t) => (
            <div key={t.id} className="portal-card portal-card-hover p-5">
              <div className="flex gap-4 items-start mb-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#e2e8f0] shrink-0 relative bg-[#f0f4f8]">
                  {t.bilde_url ? (
                    <Image src={t.bilde_url} alt={t.navn} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#285982] font-bold text-xl">
                      {t.navn.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#1e293b] font-semibold truncate">{t.navn}</h3>
                  {t.tittel && <p className="text-[#64748b] text-xs">{t.tittel}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.spesialitet && (
                      <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full font-medium">
                        {t.spesialitet}
                      </span>
                    )}
                    {t.spesialitet_2 && (
                      <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full font-medium">
                        {t.spesialitet_2}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {t.tjenester && t.tjenester.length > 0 && (
                <p className="text-xs text-[#94a3b8] mb-3">
                  Utfører også: {t.tjenester.slice(0, 4).join(", ")}
                  {t.tjenester.length > 4 && ` +${t.tjenester.length - 4}`}
                </p>
              )}

              {t.sertifiseringer && t.sertifiseringer.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {t.sertifiseringer.slice(0, 2).map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <a href={`/takstmann/${t.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center text-sm text-[#285982] border border-[#285982]/30 hover:bg-[#f0f4f8] py-2 rounded-lg transition-colors">
                  Se profil
                </a>
                {meglerProfil && (
                  <BestillKnapp takstmannId={t.id} meglerProfilId={meglerProfil.id} takstmannNavn={t.navn} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
