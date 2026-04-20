import { createServiceClient } from "@/lib/supabase/server";
import { BYGNINGSDELER } from "@/features/arkat/config/bygningsdeler";
import ArkatBrukTabell from "./ArkatBrukTabell";
import type { UserStat } from "./ArkatBrukTabell";

const BD_LABELS = new Map(BYGNINGSDELER.map((b) => [b.key, b.label]));
const UE_LABELS = new Map(
  BYGNINGSDELER.flatMap((b) =>
    b.underenheter.map((u) => [`${b.key}/${u.key}`, u.label])
  )
);

const AKUTTGRAD_LABELS: Record<string, string> = {
  ikke_akutt: "Ikke akutt",
  bor_folges_opp: "Bør følges opp",
  haster: "Haster",
};

export default async function AdminArkatBrukPage() {
  const supabase = await createServiceClient();

  const { data: events } = await supabase
    .from("arkat_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (!events || events.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-6">ARKAT Bruk</h1>
        <div className="portal-card p-8 text-center">
          <p className="text-sm text-[#94a3b8]">Ingen hendelser logget ennå.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const dag7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dag30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const genereringer = events.filter((e) => e.event_type === 'generated');
  const gen7d = genereringer.filter((e) => new Date(e.created_at) >= dag7);
  const gen30d = genereringer.filter((e) => new Date(e.created_at) >= dag30);
  const blokkert = genereringer.filter((e) => e.screening_approved === false);
  const pctBlokkert = genereringer.length > 0
    ? Math.round((blokkert.length / genereringer.length) * 100)
    : 0;

  const uniqueUsers30d = new Set(
    events.filter((e) => new Date(e.created_at) >= dag30).map((e) => e.user_id)
  );

  // Brukernavn
  const allUserIds = [...new Set(events.map((e) => e.user_id))];
  const { data: takstProfiler } = allUserIds.length > 0
    ? await supabase
        .from("takstmann_profiler")
        .select("id, navn")
        .in("id", allUserIds)
    : { data: [] };

  const navnMap = new Map<string, string>();
  takstProfiler?.forEach((p) => navnMap.set(p.id, p.navn));

  const manglerNavn = allUserIds.filter((id) => !navnMap.has(id));
  if (manglerNavn.length > 0) {
    const { data: userProfiler } = await supabase
      .from("user_profiles")
      .select("id, navn")
      .in("id", manglerNavn);
    userProfiler?.forEach((p) => navnMap.set(p.id, p.navn ?? "Ukjent"));
  }

  // Per-bruker-aggregering
  const userStatsMap = new Map<string, UserStat>();

  for (const event of events) {
    if (!userStatsMap.has(event.user_id)) {
      userStatsMap.set(event.user_id, {
        userId: event.user_id,
        navn: navnMap.get(event.user_id) ?? "Ukjent",
        genereringer: 0,
        kopier_total: 0,
        kopier_arsak: 0,
        kopier_risiko: 0,
        kopier_konsekvens: 0,
        kopier_tiltak: 0,
        siste_bruk: event.created_at,
      });
    }
    const stat = userStatsMap.get(event.user_id)!;

    if (new Date(event.created_at) > new Date(stat.siste_bruk)) {
      stat.siste_bruk = event.created_at;
    }

    if (event.event_type === 'generated') {
      stat.genereringer++;
    } else if (event.event_type === 'copied_all') {
      stat.kopier_total++;
    } else if (event.event_type === 'copied_field') {
      stat.kopier_total++;
      if (event.copied_field === 'arsak') stat.kopier_arsak++;
      else if (event.copied_field === 'risiko') stat.kopier_risiko++;
      else if (event.copied_field === 'konsekvens') stat.kopier_konsekvens++;
      else if (event.copied_field === 'anbefalt_tiltak') stat.kopier_tiltak++;
    }
  }

  const userStats = [...userStatsMap.values()].sort(
    (a, b) => new Date(b.siste_bruk).getTime() - new Date(a.siste_bruk).getTime()
  );

  // Bygningsdel-fordeling (fra generated-hendelser)
  const bdMap = new Map<string, number>();
  for (const e of genereringer) {
    if (e.bygningsdel && e.underenhet) {
      const key = `${e.bygningsdel}/${e.underenhet}`;
      bdMap.set(key, (bdMap.get(key) ?? 0) + 1);
    }
  }
  const bdBreakdown = [...bdMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, antall]) => {
      const [bd, ue] = key.split('/');
      const bdLabel = BD_LABELS.get(bd) ?? bd;
      const ueLabel = UE_LABELS.get(key) ?? ue;
      return { label: `${bdLabel} — ${ueLabel}`, antall };
    });

  // Tilstandsgrad-fordeling
  const tgMap = new Map<string, number>();
  for (const e of genereringer) {
    const tg = e.tilstandsgrad ?? 'merknad';
    tgMap.set(tg, (tgMap.get(tg) ?? 0) + 1);
  }
  const tgBreakdown = [...tgMap.entries()].sort((a, b) => b[1] - a[1]);

  // Akuttgrad-fordeling
  const akuttMap = new Map<string, number>();
  for (const e of genereringer) {
    if (e.akuttgrad) {
      akuttMap.set(e.akuttgrad, (akuttMap.get(e.akuttgrad) ?? 0) + 1);
    }
  }
  const akuttBreakdown = [...akuttMap.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">ARKAT Bruk</h1>

      {/* Statistikk-kort */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-[#1e293b]">{gen7d.length}</div>
          <div className="text-xs text-[#64748b]">Genereringer (7 dager)</div>
        </div>
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-[#1e293b]">{gen30d.length}</div>
          <div className="text-xs text-[#64748b]">Genereringer (30 dager)</div>
        </div>
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-[#285982]">{uniqueUsers30d.size}</div>
          <div className="text-xs text-[#64748b]">Unike brukere (30 dager)</div>
        </div>
        <div className="portal-card p-4 text-center">
          <div className={`text-2xl font-bold ${pctBlokkert > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {pctBlokkert}%
          </div>
          <div className="text-xs text-[#64748b]">Blokkert av screening</div>
        </div>
      </div>

      {/* Per-bruker-tabell (klient-komponent for sortering) */}
      <div className="mb-8">
        <ArkatBrukTabell brukere={userStats} />
      </div>

      {/* Fordelinger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bygningsdel */}
        <div className="portal-card p-5 md:col-span-1">
          <h2 className="text-sm font-semibold text-[#1e293b] mb-4">Topp bygningsdeler</h2>
          {bdBreakdown.length === 0 ? (
            <p className="text-xs text-[#94a3b8]">Ingen data</p>
          ) : (
            <div className="space-y-2">
              {bdBreakdown.map(({ label, antall }) => (
                <div key={label} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-[#1e293b] truncate">{label}</span>
                  <span className="text-[#64748b] font-medium shrink-0">{antall}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tilstandsgrad */}
        <div className="portal-card p-5">
          <h2 className="text-sm font-semibold text-[#1e293b] mb-4">Tilstandsgrad</h2>
          {tgBreakdown.length === 0 ? (
            <p className="text-xs text-[#94a3b8]">Ingen data</p>
          ) : (
            <div className="space-y-2">
              {tgBreakdown.map(([tg, antall]) => (
                <div key={tg} className="flex items-center justify-between text-sm">
                  <span className="text-[#1e293b]">
                    {tg === 'merknad' ? 'Merknad (ingen TG)' : tg}
                  </span>
                  <span className="text-[#64748b] font-medium">{antall}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Akuttgrad */}
        <div className="portal-card p-5">
          <h2 className="text-sm font-semibold text-[#1e293b] mb-4">Akuttgrad</h2>
          {akuttBreakdown.length === 0 ? (
            <p className="text-xs text-[#94a3b8]">Ingen data</p>
          ) : (
            <div className="space-y-2">
              {akuttBreakdown.map(([akutt, antall]) => (
                <div key={akutt} className="flex items-center justify-between text-sm">
                  <span className="text-[#1e293b]">{AKUTTGRAD_LABELS[akutt] ?? akutt}</span>
                  <span className="text-[#64748b] font-medium">{antall}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
