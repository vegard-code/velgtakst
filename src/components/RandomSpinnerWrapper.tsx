"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TakstmannProfil } from "@/lib/supabase/types";

export default function RandomSpinnerWrapper({
  takstmenn,
  fylkeNavn,
}: {
  takstmenn: TakstmannProfil[];
  fylkeNavn: string;
}) {
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<TakstmannProfil | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);

  const spin = useCallback(() => {
    setSelected(null);
    setSpinning(true);

    const finalIndex = Math.floor(Math.random() * takstmenn.length);
    let tick = 0;
    const totalTicks = 20 + Math.floor(Math.random() * 10);

    const interval = setInterval(() => {
      tick++;
      setDisplayIndex(Math.floor(Math.random() * takstmenn.length));

      if (tick >= totalTicks) {
        clearInterval(interval);
        setDisplayIndex(finalIndex);
        setSelected(takstmenn[finalIndex]);
        setSpinning(false);
      }
    }, 80 + tick * 8);
  }, [takstmenn]);

  const current = takstmenn[displayIndex];

  return (
    <div className="bg-card-bg border border-card-border rounded-2xl p-8 text-center mb-12">
      <button
        onClick={spin}
        disabled={spinning}
        className="bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-all glow-border cursor-pointer disabled:cursor-wait"
      >
        {spinning
          ? "Spinner..."
          : `Få en tilfeldig takstmann fra ${fylkeNavn}`}
      </button>

      {(spinning || selected) && current && (
        <div className="mt-8 animate-fade-in-up">
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-accent/40 mb-4 relative bg-accent/10">
            {current.bilde_url ? (
              <Image
                src={current.bilde_url}
                alt={current.navn}
                fill
                className={`object-cover ${spinning ? "blur-[2px] scale-105" : ""} transition-all duration-200`}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent font-bold text-3xl">
                {current.navn.charAt(0)}
              </div>
            )}
          </div>
          <p
            className={`text-xl font-bold text-white mb-1 transition-opacity ${
              spinning ? "opacity-50" : "opacity-100"
            }`}
          >
            {current.navn}
          </p>

          {selected && !spinning && (
            <div className="mt-4 space-y-1 animate-fade-in-up">
              {selected.spesialitet && (
                <p className="text-accent font-medium">{selected.spesialitet}</p>
              )}
              {selected.telefon && (
                <p className="text-gray-400 text-sm">{selected.telefon}</p>
              )}
              {selected.epost && (
                <p className="text-gray-400 text-sm">{selected.epost}</p>
              )}
              <div className="pt-3">
                <Link
                  href={`/takstmann/${selected.id}`}
                  className="inline-block bg-accent/10 border border-accent/20 text-accent text-sm px-4 py-2 rounded-lg hover:bg-accent/20 transition-colors"
                >
                  Se full profil &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
