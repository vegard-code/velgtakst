import Link from "next/link";
import { OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import NyttOppdragForm from "./NyttOppdragForm";

export default function NyttOppdragPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/portal/takstmann/oppdrag"
          className="text-[#64748b] hover:text-[#285982] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#1e293b]">Nytt oppdrag</h1>
      </div>

      <div className="portal-card p-6">
        <NyttOppdragForm oppdragTyper={OPPDRAG_TYPE_LABELS} />
      </div>
    </div>
  );
}
