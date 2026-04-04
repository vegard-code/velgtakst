import type { Sertifisering } from "@/lib/supabase/types";

interface Props {
  sertifisering: Sertifisering | null;
  sertifiseringAnnet?: string | null;
  size?: "sm" | "md";
}

export default function SertifiseringBadge({ sertifisering, sertifiseringAnnet, size = "sm" }: Props) {
  if (!sertifisering) return null;

  const label =
    sertifisering === "Annet"
      ? sertifiseringAnnet || "Annet"
      : sertifisering;

  const colorClass =
    sertifisering === "BMTF"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : sertifisering === "Norsk Takst"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-slate-100 border-slate-200 text-slate-600";

  const textSize = size === "md" ? "text-sm" : "text-xs";
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${colorClass} ${textSize} font-medium`}
    >
      <svg
        className={`${iconSize} shrink-0`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
      {label}
    </span>
  );
}
