"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KOMMUNER } from "@/data/kommuner";
import { FYLKER } from "@/lib/supabase/types";

interface Props {
  fylker: { id: string; navn: string }[];
}

interface Result {
  label: string;
  sublabel?: string;
  href: string;
}

export default function FylkeSøk({ fylker }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const results: Result[] =
    query.trim().length >= 1
      ? (() => {
          const q = query.toLowerCase();
          const kommuneHits: Result[] = KOMMUNER.filter((k) =>
            k.navn.toLowerCase().includes(q)
          )
            .slice(0, 5)
            .map((k) => {
              const fylke = FYLKER.find((f) => f.id === k.fylkeId);
              return {
                label: k.navn,
                sublabel: fylke?.navn,
                href: `/${k.fylkeId}/${k.id}`,
              };
            });
          const fylkeHits: Result[] = fylker
            .filter(
              (f) =>
                f.navn.toLowerCase().includes(q) &&
                !kommuneHits.some(
                  (r) => r.label.toLowerCase() === f.navn.toLowerCase()
                )
            )
            .slice(0, 3)
            .map((f) => ({ label: f.navn, href: `/${f.id}` }));
          return [...kommuneHits, ...fylkeHits].slice(0, 6);
        })()
      : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length > 0) {
      router.push(results[0].href);
      setOpen(false);
      setQuery("");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative max-w-xl mx-auto">
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <svg
          className="w-5 h-5 text-slate-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Søk etter kommune..."
          className="flex-1 outline-none text-slate-900 placeholder:text-slate-400 text-sm bg-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Tøm søk"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
          {results.map((r, i) => (
            <Link
              key={`${r.href}-${i}`}
              href={r.href}
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <svg
                className="w-4 h-4 text-blue-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="flex-1">
                {r.label}
                {r.sublabel && (
                  <span className="text-slate-400 ml-1.5 text-xs">
                    ({r.sublabel})
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
