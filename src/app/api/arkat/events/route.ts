import { createClient } from "@/lib/supabase/server";

const ALLOWED_EVENT_TYPES = ['generated', 'copied_field', 'copied_all', 'reset'] as const;
const ALLOWED_COPY_FIELDS = ['arsak', 'risiko', 'konsekvens', 'anbefalt_tiltak'] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const event_type = body.event_type;
  if (typeof event_type !== 'string' || !(ALLOWED_EVENT_TYPES as readonly string[]).includes(event_type)) {
    return Response.json({ error: "Ugyldig event_type" }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    event_type,
  };

  if (event_type === 'generated') {
    row.bygningsdel = typeof body.bygningsdel === 'string' ? body.bygningsdel : null;
    row.underenhet = typeof body.underenhet === 'string' ? body.underenhet : null;
    row.tilstandsgrad = typeof body.tilstandsgrad === 'string' ? body.tilstandsgrad : null;
    row.hovedgrunnlag = typeof body.hovedgrunnlag === 'string' ? body.hovedgrunnlag : null;
    row.akuttgrad = typeof body.akuttgrad === 'string' ? body.akuttgrad : null;
    row.observasjon_lengde = typeof body.observasjon_lengde === 'number' ? body.observasjon_lengde : null;
    row.screening_approved = typeof body.screening_approved === 'boolean' ? body.screening_approved : null;
    row.screening_reason = typeof body.screening_reason === 'string' ? body.screening_reason : null;
  } else if (event_type === 'copied_field') {
    const cf = body.copied_field;
    row.copied_field = typeof cf === 'string' && (ALLOWED_COPY_FIELDS as readonly string[]).includes(cf) ? cf : null;
  }

  await supabase.from('arkat_events').insert(row);

  return Response.json({ ok: true });
}
