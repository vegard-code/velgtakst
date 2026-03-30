"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrerKunde } from "@/lib/actions/auth";
import VippsLoginKnapp from "@/components/VippsLoginKnapp";

export default function RegistrerKundeForm({ takstmannId }: { takstmannId?: string }) {
  const router = useRouter();
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeil("");
    setLaster(true);

    const formData = new FormData(e.currentTarget);
    if (takstmannId) formData.set("takstmann_id", takstmannId);
    const result = await registrerKunde(formData);

    if (result?.error) {
      setFeil(result.error);
      setLaster(false);
      return;
    }

    router.push("/portal/kunde");
    router.refresh();
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-2xl p-8">
      <VippsLoginKnapp
        rolle="privatkunde"
        redirect="/portal/kunde"
        tekst="Registrer med Vipps"
      />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-card-border" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">eller med e-post</span>
        <div className="flex-1 h-px bg-card-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Fullt navn *</label>
          <input
            name="navn"
            required
            className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
            placeholder="Ola Nordmann"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">E-postadresse *</label>
          <input
            name="epost"
            type="email"
            required
            className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
            placeholder="ola@epost.no"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Telefon</label>
          <input
            name="telefon"
            className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
            placeholder="400 00 000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Passord *</label>
          <input
            name="passord"
            type="password"
            required
            minLength={8}
            className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
            placeholder="Minst 8 tegn"
          />
        </div>

        {feil && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {feil}
          </div>
        )}

        <button
          type="submit"
          disabled={laster}
          className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {laster ? "Registrerer..." : "Opprett konto og fortsett"}
        </button>
      </form>
    </div>
  );
}
