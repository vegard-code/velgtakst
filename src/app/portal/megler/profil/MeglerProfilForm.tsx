"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MeglerProfil } from "@/lib/supabase/types";

export default function MeglerProfilForm({ profil }: { profil: MeglerProfil | null }) {
  const [melding, setMelding] = useState<{ type: "ok" | "feil"; tekst: string } | null>(null);
  const [laster, setLaster] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMelding(null);
    setLaster(true);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("megler_profiler")
      .update({
        navn: formData.get("navn") as string,
        telefon: (formData.get("telefon") as string) || null,
        meglerforetak: (formData.get("meglerforetak") as string) || null,
      })
      .eq("user_id", user.id);

    setMelding(error
      ? { type: "feil", tekst: error.message }
      : { type: "ok", tekst: "Profil oppdatert!" }
    );
    setLaster(false);
  }

  return (
    <div className="portal-card p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">Fullt navn</label>
          <input name="navn" defaultValue={profil?.navn ?? ""} className="portal-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">Telefon</label>
          <input name="telefon" defaultValue={profil?.telefon ?? ""} className="portal-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">Meglerforetak</label>
          <input name="meglerforetak" defaultValue={profil?.meglerforetak ?? ""} className="portal-input" />
        </div>

        {melding && (
          <div className={`px-4 py-3 rounded-lg text-sm ${melding.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {melding.tekst}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={laster} className="portal-btn-primary">
            {laster ? "Lagrer..." : "Lagre"}
          </button>
        </div>
      </form>
    </div>
  );
}
