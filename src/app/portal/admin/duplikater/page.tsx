import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

type Bruker = {
  id: string;
  navn: string;
  epost: string | null;
  telefon: string | null;
  rolle: string;
  harVipps: boolean;
  profiltabell: "takstmann" | "megler" | "privatkunde";
  created_at: string;
};

type Gruppe = {
  nokkel: string;
  type: "navn" | "telefon";
  brukere: Bruker[];
};

// Normaliser navn: lowercase, fjern alt unntatt bokstaver/tall, for å fange
// varianter som "Geir-Jonny", "Geir Jonny", "geir_jonny" osv.
function normalisertNavn(navn: string | null | undefined): string {
  if (!navn) return "";
  return navn.toLowerCase().normalize("NFKD").replace(/[^a-zæøå0-9]/g, "");
}

// Normaliser telefon: ta kun siffer, behold de siste 8 (Norge uten landskode).
function normalisertTelefon(tlf: string | null | undefined): string {
  if (!tlf) return "";
  const kunSiffer = tlf.replace(/\D/g, "");
  return kunSiffer.slice(-8);
}

const ROLLE_FARGE: Record<string, string> = {
  takstmann: "bg-green-50 text-green-700 border-green-200",
  megler: "bg-purple-50 text-purple-700 border-purple-200",
  privatkunde: "bg-amber-50 text-amber-700 border-amber-200",
};
const ROLLE_NAVN: Record<string, string> = {
  takstmann: "Takstmann",
  megler: "Megler",
  privatkunde: "Privatkunde",
};

export default async function DuplikaterPage() {
  const svc = await createServiceClient();

  const [takstResp, meglerResp, kundeResp, authResp] = await Promise.all([
    svc.from("takstmann_profiler").select("user_id, navn, epost, telefon, created_at"),
    svc.from("megler_profiler").select("user_id, navn, epost, telefon, created_at"),
    svc.from("privatkunde_profiler").select("user_id, navn, epost, telefon, created_at"),
    svc.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Bygg oppslag: auth-email og vipps-flag per user_id
  const epostMap = new Map<string, string>();
  const vippsSet = new Set<string>();
  authResp.data?.users?.forEach((u) => {
    if (u.email) epostMap.set(u.id, u.email);
    if (u.user_metadata?.vipps_sub) vippsSet.add(u.id);
  });

  const alleBrukere: Bruker[] = [];
  for (const rad of takstResp.data ?? []) {
    if (!rad.user_id) continue;
    alleBrukere.push({
      id: rad.user_id,
      navn: rad.navn ?? "",
      epost: epostMap.get(rad.user_id) ?? rad.epost ?? null,
      telefon: rad.telefon ?? null,
      rolle: "takstmann",
      harVipps: vippsSet.has(rad.user_id),
      profiltabell: "takstmann",
      created_at: rad.created_at,
    });
  }
  for (const rad of meglerResp.data ?? []) {
    if (!rad.user_id) continue;
    alleBrukere.push({
      id: rad.user_id,
      navn: rad.navn ?? "",
      epost: epostMap.get(rad.user_id) ?? rad.epost ?? null,
      telefon: rad.telefon ?? null,
      rolle: "megler",
      harVipps: vippsSet.has(rad.user_id),
      profiltabell: "megler",
      created_at: rad.created_at,
    });
  }
  for (const rad of kundeResp.data ?? []) {
    if (!rad.user_id) continue;
    alleBrukere.push({
      id: rad.user_id,
      navn: rad.navn ?? "",
      epost: epostMap.get(rad.user_id) ?? rad.epost ?? null,
      telefon: rad.telefon ?? null,
      rolle: "privatkunde",
      harVipps: vippsSet.has(rad.user_id),
      profiltabell: "privatkunde",
      created_at: rad.created_at,
    });
  }

  // Gruppér på navn
  const navnGrupper = new Map<string, Bruker[]>();
  for (const bruker of alleBrukere) {
    const key = normalisertNavn(bruker.navn);
    if (!key) continue;
    const liste = navnGrupper.get(key) ?? [];
    liste.push(bruker);
    navnGrupper.set(key, liste);
  }

  // Gruppér på telefon
  const tlfGrupper = new Map<string, Bruker[]>();
  for (const bruker of alleBrukere) {
    const key = normalisertTelefon(bruker.telefon);
    if (!key) continue;
    const liste = tlfGrupper.get(key) ?? [];
    liste.push(bruker);
    tlfGrupper.set(key, liste);
  }

  // Behold bare grupper med ≥2 unike user_ids
  function tilRelevanteGrupper(
    kart: Map<string, Bruker[]>,
    type: "navn" | "telefon",
  ): Gruppe[] {
    const grupper: Gruppe[] = [];
    for (const [nokkel, brukere] of kart) {
      const unikeIds = new Set(brukere.map((b) => b.id));
      if (unikeIds.size > 1) {
        // Dedupliser på user_id (én bruker kan ha flere profiler)
        const seen = new Set<string>();
        const unikeBrukere = brukere.filter((b) => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
        grupper.push({ nokkel, type, brukere: unikeBrukere });
      }
    }
    return grupper;
  }

  const navnDuplikater = tilRelevanteGrupper(navnGrupper, "navn")
    .sort((a, b) => b.brukere.length - a.brukere.length);
  const tlfDuplikater = tilRelevanteGrupper(tlfGrupper, "telefon")
    .sort((a, b) => b.brukere.length - a.brukere.length);

  // Fjern tlf-grupper som allerede er dekket av navn-grupper
  // (bruker er i en navn-gruppe hvis alle brukere i tlf-gruppen også deler navn)
  const navnGruppeIdSet = new Set<string>();
  navnDuplikater.forEach((g) => g.brukere.forEach((b) => navnGruppeIdSet.add(b.id)));
  const tlfKunDuplikater = tlfDuplikater.filter((g) =>
    g.brukere.some((b) => !navnGruppeIdSet.has(b.id)),
  );

  const totaltGrupper = navnDuplikater.length + tlfKunDuplikater.length;
  const totaltBrukere = new Set([
    ...navnDuplikater.flatMap((g) => g.brukere.map((b) => b.id)),
    ...tlfKunDuplikater.flatMap((g) => g.brukere.map((b) => b.id)),
  ]).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Mulige duplikater</h1>
          <p className="text-sm text-[#64748b]">
            {totaltGrupper} grupper · {totaltBrukere} brukere involvert
          </p>
        </div>
        <Link href="/portal/admin/brukere" className="text-sm text-[#285982] hover:underline">
          ← Alle brukere
        </Link>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900">
        <p className="font-semibold mb-1">Slik bruker du siden</p>
        <p>
          Klikk en bruker i en gruppe for å gå til detaljsiden, hvor du kan merge
          med duplikaten. Merge-funksjonen er oppdatert — profil-felter flettes
          (bevar sine verdier beholdes, men tomme felter fylles fra den som slettes),
          Vipps-kobling og ARKAT-tilgang flyttes over automatisk.
        </p>
      </div>

      {/* Navn-duplikater */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#1e293b] mb-3">
          Samme navn ({navnDuplikater.length})
        </h2>
        {navnDuplikater.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center text-sm text-[#94a3b8]">
            Ingen navn-duplikater funnet.
          </div>
        ) : (
          <div className="space-y-3">
            {navnDuplikater.map((gruppe) => (
              <GruppeKort key={`navn-${gruppe.nokkel}`} gruppe={gruppe} />
            ))}
          </div>
        )}
      </section>

      {/* Telefon-duplikater (ikke allerede dekket av navn) */}
      {tlfKunDuplikater.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#1e293b] mb-3">
            Samme telefon — ulikt navn ({tlfKunDuplikater.length})
          </h2>
          <div className="space-y-3">
            {tlfKunDuplikater.map((gruppe) => (
              <GruppeKort key={`tlf-${gruppe.nokkel}`} gruppe={gruppe} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GruppeKort({ gruppe }: { gruppe: Gruppe }) {
  const sortert = [...gruppe.brukere].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
      <div className="px-5 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1e293b]">
          {gruppe.brukere[0].navn}
          <span className="ml-2 text-xs font-normal text-[#94a3b8]">
            {gruppe.brukere.length} brukere
          </span>
        </p>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
          Match på {gruppe.type}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#f1f5f9]">
            <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-5 py-2">Rolle</th>
            <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-5 py-2">E-post</th>
            <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-5 py-2">Telefon</th>
            <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-5 py-2">Vipps</th>
            <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-5 py-2">Registrert</th>
            <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-5 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sortert.map((bruker) => (
            <tr key={`${bruker.id}-${bruker.profiltabell}`} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
              <td className="px-5 py-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLLE_FARGE[bruker.rolle] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {ROLLE_NAVN[bruker.rolle] ?? bruker.rolle}
                </span>
              </td>
              <td className="px-5 py-2 text-xs text-[#64748b]">{bruker.epost ?? "–"}</td>
              <td className="px-5 py-2 text-xs text-[#64748b]">{bruker.telefon ?? "–"}</td>
              <td className="px-5 py-2">
                {bruker.harVipps ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    Vipps
                  </span>
                ) : (
                  <span className="text-[10px] text-[#cbd5e1]">–</span>
                )}
              </td>
              <td className="px-5 py-2 text-xs text-[#94a3b8]">
                {new Date(bruker.created_at).toLocaleDateString("nb-NO")}
              </td>
              <td className="px-5 py-2">
                <Link
                  href={`/portal/admin/brukere/${bruker.id}`}
                  className="text-xs text-[#285982] hover:text-[#1e4a6e] font-medium"
                >
                  Se detaljer →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
