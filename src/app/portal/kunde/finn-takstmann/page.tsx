import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FYLKER, OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { OppdragType } from "@/lib/supabase/types";
import KundeBestillKnapp from "./KundeBestillKnapp";

interface Props {
  searchParams: Promise<{ fylke?: string; spesialitet?: string; sok?: string; type?: string }>;
}

export default async function KundeFinnTakstmannPage({ searchParams }: Props) {
  const { fylke, spesialitet, sok, type } = await searchParams;
  const supabase = await createClient();

  const valgtType = type as OppdragType | undefined;
  const typeLabel = valgtType && OPPDRAG_TYPE_LABELS[valgtType]
    ? OPPDRAG_TYPE_LABELS[valgtType]
    : null;

  let query = supabase
    .from("fylke_synlighet")
    .select(`
      fylke_id,
      takstmann:takstmann_profiler!inner(
        id, navn, tittel, spesialitet, bio, telefon, bilde_url, sertifiseringer
      )
    `)
    .eq("er_aktiv", true);

  if (fylke) query = query.eq("fylke_id", fylke);

  const { data: resultater } = await query;

  let takstmenn = (resultater ?? []).map((r) => r.takstmann as unknown as {
    id: string; navn: string; tittel: string | null; spesialitet: string | null;
    bio: string | null; telefon: string | null; bilde_url: string | null; sertifiseringer: string[];
  });

  const sett = new Set<string>();
  takstmenn = takstmenn.filter((t) => { if (sett.has(t.id)) return false; sett.add(t.id); return true; });

  if (spesialitet) takstmenn = takstmenn.filter((t) => t.spesialitet?.toLowerCase().includes(spesialitet.toLowerCase()));
  if (sok) takstmenn = takstmenn.filter((t) => t.navn.toLowerCase().includes(sok.toLowerCase()));

  const { data: { user } } = await supabase.auth.getUser();
  const { data: kundeProfil } = user
    ? await supabase.from("privatkunde_profiler").select("id").eq("user_id", user.id).single()
    : { data: null };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Overskrift med valgt tjeneste */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/portal/kunde" className="text-[#64748b] hover:text-[#285982] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-[#1e293b]">Finn takstmann</h1>
        </div>
        {typeLabel ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-sm bg-[#e8f0f8] text-[#285982] px-3 py-1 rounded-full font-medium">
              {typeLabel}
              <Link
                href="/portal/kunde"
                className="ml-1 hover:text-[#1e4468]"
                title="Endre tjenestetype"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
            </span>
            <p className="text-[#64748b] text-sm">— velg en takstmann under</p>
          </div>
        ) : (
          <p className="text-[#64748b] text-sm mt-0.5">Velg en sertifisert takstmann i ditt område</p>
        )}
      </div>

      {/* Filtre */}
      <div className="portal-card p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          {/* Behold type-param gjennom filtrering */}
          {valgtType && <input type="hidden" name="type" value={valgtType} />}
          <input name="sok" defaultValue={sok} placeholder="Søk på navn..." className="portal-input flex-1" />
          <select name="fylke" defaultValue={fylke ?? ""} className="portal-input sm:w-44">
            <option value="">Alle fylker</option>
            {FYLKER.map((f) => <option key={f.id} value={f.id}>{f.navn}</option>)}
          </select>
          <select name="spesialitet" defaultValue={spesialitet ?? ""} className="portal-input sm:w-52">
            <option value="">Alle spesialiteter</option>
            <option value="Boligtaksering">Boligtaksering</option>
            <option value="Tilstandsrapport">Tilstandsrapport</option>
            <option value="Verditakst">Verditakst</option>
            <option value="Skadetaksering">Skadetaksering</option>
            <option value="Næringstaksering">Næringstaksering</option>
          </select>
          <button type="submit" className="portal-btn-primary shrink-0">Søk</button>
        </form>
      </div>

      {/* Resultater */}
      {takstmenn.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <p className="text-[#94a3b8] mb-1">Ingen takstmenn funnet</p>
          <p className="text-[#94a3b8] text-sm">
            Prøv et annet fylke eller fjern filtre for å se flere resultater.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {takstmenn.map((t) => (
            <div key={t.id} className="portal-card portal-card-hover p-5">
              <div className="flex gap-3 items-start mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[#e2e8f0] shrink-0 relative bg-[#f0f4f8]">
                  {t.bilde_url ? (
                    <Image src={t.bilde_url} alt={t.navn} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#285982] font-bold text-lg">
                      {t.navn.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[#1e293b] font-semibold text-sm truncate">{t.navn}</p>
                  {t.spesialitet && (
                    <span className="inline-block text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full mt-0.5">
                      {t.spesialitet}
                    </span>
                  )}
                  {t.telefon && <p className="text-xs text-[#64748b] mt-1">{t.telefon}</p>}
                </div>
              </div>
              {t.bio && (
                <p className="text-xs text-[#64748b] mb-3 line-clamp-2">{t.bio}</p>
              )}
              {kundeProfil && (
                <KundeBestillKnapp
                  takstmannId={t.id}
                  kundeProfilId={kundeProfil.id}
                  takstmannNavn={t.navn}
                  oppdragType={valgtType}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
