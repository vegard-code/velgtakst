/**
 * Feature flag for ARKAT Skrivehjelp.
 *
 * Styres av env-variabel ARKAT_WRITING_ASSISTANT_ENABLED.
 * På localhost (NEXT_PUBLIC_SITE_URL inneholder "localhost") er den alltid tilgjengelig
 * for enkel testing med mindre den er eksplisitt satt til "false".
 */

export function isArkatEnabled(): boolean {
  const flag = process.env.ARKAT_WRITING_ASSISTANT_ENABLED;

  // Eksplisitt true
  if (flag === "true") return true;

  // Eksplisitt false — alltid av, også lokalt
  if (flag === "false") return false;

  // Ikke satt — tillat på localhost, blokkér i prod
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const url = new URL(siteUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
