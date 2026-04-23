import { redirect } from "next/navigation";

// Innboks ble fjernet fra sidebaren 2026-04-23.
// Badges på Bestillinger og Meldinger dekker samme funksjon.
// Denne redirecten finnes for å ikke bryte gamle bokmerker.
export default function TakstmannInnboksPage() {
  redirect("/portal/takstmann");
}
