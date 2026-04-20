type ArkatEventPayload =
  | {
      event_type: 'generated';
      bygningsdel: string;
      underenhet: string;
      tilstandsgrad?: string;
      hovedgrunnlag: string;
      akuttgrad: string;
      observasjon_lengde: number;
      screening_approved: boolean;
      screening_reason?: string | null;
    }
  | { event_type: 'copied_field'; copied_field: string }
  | { event_type: 'copied_all' }
  | { event_type: 'reset' };

export function logArkatEvent(payload: ArkatEventPayload): void {
  fetch('/api/arkat/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Fire-and-forget — feil ignoreres stille
  });
}
