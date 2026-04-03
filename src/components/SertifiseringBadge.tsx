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
      ? "bg-blue-900/40 border-blue-500/30 text-blue-300"
      : sertifisering === "Norsk Takst"
      ? "bg-green-900/40 border-green-500/30 text-green-300"
      : "bg-gray-700/40 border-gray-500/30 text-gray-300";

  const textSize = size === "md" ? "text-sm" : "text-xs";
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${colorClass} ${textSize} font-medium`}
    >
      {/* Shield / badge icon */}
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
