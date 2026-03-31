"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface Takstmann {
  id: number;
  navn: string;
  telefon: string;
  epost: string;
  spesialitet: string;
  bilde: string;
}

export default function RandomSpinner({
  takstmenn,
  fylkeNavn,
}: {
  takstmenn: Takstmann[];
  fylkeNavn: string;
}) {
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<Takstmann | null>(null);
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

      {(spinning || selected) && (
        <div className="mt-8 animate-fade-in-up">
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-accent/40 mb-4 relative">
            <Image
              src={takstmenn[displayIndex].bilde}
              alt={takstmenn[displayIndex].navn}
              fill
              className={`object-cover ${spinning ? "blur-[2px] scale-105" : ""} transition-all duration-200`}
              unoptimized
            />
          </div>
          <p
            className={`text-xl font-bold text-white mb-1 transition-opacity ${spinning ? "opacity-50" : "opacity-100"}`}
          >
            {takstmenn[displayIndex].navn}
          </p>

          {selected && !spinning && (
            <div className="mt-4 space-y-1 animate-fade-in-up">
              <p className="text-accent font-medium">
                {selected.spesialitet}
              </p>
              <p className="text-gray-400 text-sm">{selected.telefon}</p>
              <p className="text-gray-400 text-sm">{selected.epost}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
