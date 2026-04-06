import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { OppdragType } from "@/lib/supabase/types";
import FakturaSkjema from "./FakturaSkjema";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FakturaPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/logg-inn");

  // Hent brukerens company_id
  const { data: profil } = await serviceClient
    .from("user_profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profil?.company_id) notFound();

  // Hent oppdrag
  const { data: oppdrag } = await serviceClient
    .from("oppdrag")
    .select(`
      id, tittel, oppdrag_type, adresse, by, pris, faktura_id, status,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost)
    `)
    .eq("id", id)
    .single();

  if (!oppdrag) notFound();

  // Hent regnskapsinnstillinger
  const { data: settings } = await serviceClient
    .from("company_settings")
    .select("regnskap_system, fiken_api_token, fiken_company_id, tripletex_employee_token, tripletex_company_id, poweroffice_client_key, poweroffice_client_secret")
    .eq("company_id", profil.company_id)
    .single();

  const regnskapSystem = settings?.regnskap_system ?? "ingen";
  const harRegnskapKonfigurert =
    (regnskapSystem === "fiken" && !!settings?.fiken_api_token && !!settings?.fiken_company_id) ||
    (regnskapSystem === "tripletex" && !!settings?.tripletex_employee_token && !!settings?.tripletex_company_id) ||
    (regnskapSystem === "poweroffice" && !!settings?.poweroffice_client_key && !!settings?.poweroffice_client_secret);

  // Allerede fakturert
  const alleredeFakturert = oppdrag.status === "fakturert" || oppdrag.status === "betalt";

  const kunde = (oppdrag.megler as unknown as { navn: string; epost: string } | null)
    ?? (oppdrag.privatkunde as unknown as { navn: string; epost: string } | null);

  const typeLabel =
    OPPDRAG_TYPE_LABELS[oppdrag.oppdrag_type as OppdragType] ?? oppdrag.oppdrag_type ?? "Takstoppdrag";
  const defaultBeskrivelse = oppdrag.adresse
    ? `${typeLabel} – ${oppdrag.adresse}${oppdrag.by ? `, ${oppdrag.by}` : ""}`
    : typeLabel;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/portal/takstmann/oppdrag/${id}`}
          className="text-[#64748b] hover:text-[#285982] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Send faktura</h1>
          <p className="text-[#64748b] text-sm mt-0.5">{oppdrag.tittel}</p>
        </div>
      </div>

      {/* Allerede fakturert */}
      {alleredeFakturert && (
        <div className="portal-card p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[#1e293b] font-semibold">
                {oppdrag.status === "betalt" ? "Betalt" : "Faktura allerede sendt"}
              </p>
              {oppdrag.faktura_id && (
                <p className="text-[#64748b] text-sm mt-0.5">
                  Faktura-ID: <span className="font-medium">{oppdrag.faktura_id}</span> i {regnskapSystem === "fiken" ? "Fiken" : regnskapSystem === "tripletex" ? "Tripletex" : "PowerOffice GO"}
                </p>
              )}
              <p className="text-[#94a3b8] text-xs mt-2">
                Du kan sende ny faktura under, men vær oppmerksom på at dette oppretter en ny faktura i regnskapssystemet ditt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ingen regnskap konfigurert */}
      {!harRegnskapKonfigurert && (
        <div className="portal-card p-6 mb-6 border-l-4 border-amber-400">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[#1e293b] font-semibold">Regnskapssystem ikke konfigurert</p>
              <p className="text-[#64748b] text-sm mt-1">
                Du må koble til et regnskapssystem (Fiken, Tripletex eller PowerOffice GO) før du kan sende fakturaer. Gå til innstillinger og legg inn API-nøkler under «Regnskapssystem».
              </p>
              <Link
                href="/portal/takstmann/innstillinger"
                className="inline-block mt-3 text-sm font-medium text-[#285982] hover:underline"
              >
                Gå til innstillinger →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Ingen kundeepost */}
      {!kunde?.epost && (
        <div className="portal-card p-6 mb-6 border-l-4 border-red-400">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[#1e293b] font-semibold">Mangler kundeepost</p>
              <p className="text-[#64748b] text-sm mt-1">
                Oppdraget har ingen registrert e-postadresse på kunden. Rediger oppdraget og legg til e-post.
              </p>
              <Link
                href={`/portal/takstmann/oppdrag/${id}/rediger`}
                className="inline-block mt-3 text-sm font-medium text-[#285982] hover:underline"
              >
                Rediger oppdrag →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Skjema — vis bare når alt er klart */}
      {harRegnskapKonfigurert && kunde?.epost && (
        <FakturaSkjema
          oppdragId={id}
          oppdragTittel={defaultBeskrivelse}
          kundeNavn={kunde.navn}
          kundeEpost={kunde.epost}
          defaultPris={oppdrag.pris ?? 0}
          regnskapSystem={regnskapSystem}
        />
      )}
    </div>
  );
}
