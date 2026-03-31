"use client";

import Link from "next/link";

interface Props {
  navn: string;
  portalType: "takstmann" | "megler" | "kunde" | "admin";
}

const portalTitler: Record<string, string> = {
  takstmann: "Takstmann-portal",
  megler: "Megler-portal",
  kunde: "Min side",
  admin: "Admin-panel",
};

export default function PortalHeader({ navn, portalType }: Props) {
  return (
    <header className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[#285982] flex items-center justify-center text-white font-bold text-xs">
          VT
        </div>
        <span className="text-[#1e293b] font-semibold text-sm">
          {portalTitler[portalType]}
        </span>
      </Link>
      <span className="text-[#64748b] text-sm truncate max-w-32">{navn}</span>
    </header>
  );
}
