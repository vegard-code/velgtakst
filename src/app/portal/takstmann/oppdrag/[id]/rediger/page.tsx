import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hentOppdragDetaljer } from "@/lib/actions/oppdrag";
import RedigerOppdragSkjema from "./RedigerOppdragSkjema";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RedigerOppdragPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/logg-inn");

  const oppdrag = await hentOppdragDetaljer(id);
  if (!oppdrag) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/portal/takstmann/oppdrag/${id}`}
          className="text-[#64748b] hover:text-[#285982] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#1e293b]">Rediger oppdrag</h1>
      </div>

      <div className="portal-card p-6">
        <RedigerOppdragSkjema
          oppdragId={id}
          defaultVerdier={{
            tittel: oppdrag.tittel,
            oppdrag_type: oppdrag.oppdrag_type,
            adresse: oppdrag.adresse,
            postnr: oppdrag.postnr,
            by: oppdrag.by,
            befaringsdato: oppdrag.befaringsdato,
            frist: oppdrag.frist,
            pris: oppdrag.pris,
            beskrivelse: oppdrag.beskrivelse,
          }}
        />
      </div>
    </div>
  );
}
