"use client";

import { useState } from "react";
import { sendVurdering } from "@/lib/actions/vurderinger";

interface Props {
  takstmannId: string;
  bestillingId?: string;
}

export default function VurderingSkjema({ takstmannId, bestillingId }: Props) {
  const [karakter, setKarakter] = useState(0);
  const [hover, setHover] = useState(0);
  const [kommentar, setKommentar] = useState("");
  const [laster, setLaster] = useState(false);
  const [sendt, setSendt] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (karakter === 0) return;
    setLaster(true);
    await sendVurdering({ takstmannId, bestillingId, karakter, kommentar });
    setSendt(true);
    setLaster(false);
  }

  if (sendt) {
    return <p className="text-green-700 font-medium">✓ Takk for din vurdering!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setKarakter(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl transition-colors"
          >
            <svg className={`w-7 h-7 ${s <= (hover || karakter) ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      <textarea
        value={kommentar}
        onChange={(e) => setKommentar(e.target.value)}
        className="portal-input resize-none"
        rows={3}
        placeholder="Skriv en kommentar (valgfritt)..."
      />
      <button type="submit" disabled={karakter === 0 || laster} className="portal-btn-primary">
        {laster ? "Sender..." : "Send vurdering"}
      </button>
    </form>
  );
}
