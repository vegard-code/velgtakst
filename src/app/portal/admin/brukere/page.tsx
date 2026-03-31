import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminBrukerePage() {
  const supabase = await createServiceClient();

  const { data: brukere } = await supabase
    .from("user_profiles")
    .select("id, navn, rolle, telefon, created_at")
    .order("created_at", { ascending: false });

  // Hent e-poster fra auth.users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const epostMap = new Map<string, string>();
  authUsers?.users?.forEach((u) => {
    if (u.email) epostMap.set(u.id, u.email);
  });

  const rolleFarger: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    takstmann_admin: "bg-green-100 text-green-700",
    takstmann: "bg-green-50 text-green-600",
    megler: "bg-purple-100 text-purple-700",
    privatkunde: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Brukere</h1>
        <span className="text-sm text-[#64748b]">{brukere?.length ?? 0} totalt</span>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Navn</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">E-post</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Telefon</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Rolle</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Registrert</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {brukere && brukere.length > 0 ? (
                brukere.map((bruker) => (
                  <tr key={bruker.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#1e293b]">{bruker.navn}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#64748b]">{epostMap.get(bruker.id) ?? "–"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#64748b]">{bruker.telefon ?? "–"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${rolleFarger[bruker.rolle] ?? "bg-gray-100 text-gray-600"}`}>
                        {bruker.rolle}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#94a3b8]">
                        {new Date(bruker.created_at).toLocaleDateString("nb-NO")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/portal/admin/brukere/${bruker.id}`}
                        className="text-xs text-[#285982] hover:text-[#1e4a6e] font-medium"
                      >
                        Se detaljer
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen brukere registrert ennå.
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
