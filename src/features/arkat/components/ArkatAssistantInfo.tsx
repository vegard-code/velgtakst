/**
 * Informasjonsboks for ARKAT — ansvarserklæring og kort hjelpetekst.
 */
export default function ArkatAssistantInfo() {
  return (
    <div className="portal-card p-5 mb-6 border-l-4 border-l-[#285982]">
      <h2 className="text-sm font-semibold text-[#1e293b] mb-1">
        Om ARKAT Skrivehjelp
      </h2>
      <p className="text-sm text-[#64748b] leading-relaxed">
        ARKAT hjelper deg å formulere Årsak, Risiko, Konsekvens og Anbefalt tiltak
        basert på din observasjon. Velg bygningsdel, underenhet og tilstandsgrad,
        skriv inn observasjonen din, og få et strukturert forslag du kan bruke
        som utgangspunkt.
      </p>
      <p className="text-xs text-[#94a3b8] mt-2">
        Dette er en skrivehjelp. Du er selv ansvarlig for faglig vurdering,
        valgt TG og endelig tekst i rapporten.
      </p>
    </div>
  );
}
