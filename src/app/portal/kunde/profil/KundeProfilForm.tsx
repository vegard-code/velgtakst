"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PrivatkundeProfil } from "@/lib/supabase/types";

export default function KundeProfilForm({ profil }: { profil: PrivatkundeProfil | null }) {
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
      .from("privatkunde_profiler")
      .update({
        navn: formData.get("navn") as string,
        telefon: (formData.get("telefon") as string) || null,
        epost: (formData.get("epost") as string) || null,
        adresse: (formData.get("adresse") as string) || null,
        postnr: (formData.get("postnr") as string) || null,
        by: (formData.get("by") as string) || null,
      })
      .eq("user_id", user.id);

    setMelding(error
      ? { type: "feil", tekst: error.message }
      : { type: "ok", tekst: "Profil oppdatert!" }
    );
    setLaster(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personlig info */}
        <div className="portal-card p-6">
          <h2 className="text-[#1e293b] font-semibold text-lg mb-4">Personlig informasjon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Fullt navn</label>
              <input name="navn" defaultValue={profil?.navn ?? ""} className="portal-input" placeholder="Ola Nordmann" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Telefon</label>
              <input name="telefon" type="tel" defaultValue={profil?.telefon ?? ""} className="portal-input" placeholder="400 00 000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">E-post</label>
              <input name="epost" type="email" defaultValue={profil?.epost ?? ""} className="portal-input" placeholder="ola@eksempel.no" />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="portal-card p-6">
          <h2 className="text-[#1e293b] font-semibold text-lg mb-1">Adresse</h2>
          <p className="text-[#64748b] text-sm mb-4">Brukes som standardadresse når du bestiller takst.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Gateadresse</label>
              <input name="adresse" defaultValue={profil?.adresse ?? ""} className="portal-input" placeholder="Storgata 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Postnummer</label>
              <input name="postnr" defaultValue={profil?.postnr ?? ""} className="portal-input" placeholder="0001" maxLength={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Sted</label>
              <input name="by" defaultValue={profil?.by ?? ""} className="portal-input" placeholder="Oslo" />
            </div>
          </div>
        </div>

        {/* Melding og lagre */}
        {melding && (
          <div className={`px-4 py-3 rounded-lg text-sm ${melding.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {melding.tekst}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={laster} className="portal-btn-primary">
            {laster ? "Lagrer..." : "Lagre profil"}
          </button>
        </div>
      </form>
    </div>
  );
}
