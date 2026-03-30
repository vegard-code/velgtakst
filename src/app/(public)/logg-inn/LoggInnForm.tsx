"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VippsLoginKnapp from "@/components/VippsLoginKnapp";

export default function LoggInnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/portal";

  const [epost, setEpost] = useState("");
  const [passord, setPassord] = useState("");
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeil("");
    setLaster(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: epost,
      password: passord,
    });

    if (error) {
      setFeil("Feil e-post eller passord. Prøv igjen.");
      setLaster(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-2xl p-8">
      {/* Vipps-innlogging */}
      <VippsLoginKnapp redirect={redirect} />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-card-border" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">eller med e-post</span>
        <div className="flex-1 h-px bg-card-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            E-postadresse
          </label>
          <input
            type="email"
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
            placeholder="din@epost.no"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Passord
          </label>
          <input
            type="password"
            value={passord}
            onChange={(e) => setPassord(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full bg-surface border border-card-border text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-600"
            placeholder="••••••••"
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
          {laster ? "Logger inn..." : "Logg inn"}
        </button>
      </form>

      <div className="gradient-line my-6" />

      <p className="text-center text-sm text-gray-500">
        Har du ikke konto?{" "}
        <Link href="/registrer/takstmann" className="text-accent hover:text-accent/80 transition-colors">
          Registrer deg
        </Link>
      </p>
    </div>
  );
}
