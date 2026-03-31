"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { loggUt } from "@/lib/actions/auth";

const navItems = [
  {
    href: "/portal/kunde",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/portal/kunde/finn-takstmann",
    label: "Finn takstmann",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/portal/kunde/oppdrag",
    label: "Mine oppdrag",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/portal/kunde/meldinger",
    label: "Meldinger",
    hasBadge: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/portal/kunde/profil",
    label: "Min profil",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function KundeSidebar({ navn, ulesteMeldinger = 0 }: { navn: string; ulesteMeldinger?: number }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col min-h-screen hidden lg:flex">
      <div className="p-6 border-b border-[#e2e8f0]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#285982] flex items-center justify-center text-white font-bold text-sm">VT</div>
          <span className="text-[#1e293b] font-semibold">VelgTakst</span>
        </Link>
        <div className="mt-4">
          <p className="text-[#1e293b] font-medium text-sm truncate">{navn}</p>
          <span className="inline-block mt-1.5 text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Privatkunde
          </span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`portal-sidebar-link ${
              item.exact ? pathname === item.href : pathname.startsWith(item.href) ? "active" : ""
            }`}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {"hasBadge" in item && item.hasBadge && ulesteMeldinger > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#285982] text-white text-[11px] font-bold flex items-center justify-center">
                {ulesteMeldinger > 9 ? "9+" : ulesteMeldinger}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-[#e2e8f0]">
        <form action={loggUt}>
          <button type="submit" className="portal-sidebar-link w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logg ut
          </button>
        </form>
      </div>
    </aside>
  );
}
