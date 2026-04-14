'use client';

import { useState, useMemo, useEffect, useCallback } from "react";
import { BYGNINGSDELER, erMerknadModus, hentSubmodi } from "../config/bygningsdeler";
import type { SubmodusConfig } from "../config/bygningsdeler";
import type {
  ArkatGenerateInput,
  ArkatGenerateResponse,
  Tilstandsgrad,
  Hovedgrunnlag,
  ObservasjonsTillegg,
  Akuttgrad,
  OnsketLengde,
  NsVersjon,
  Aldersvurdering,
} from "../types/arkat";
import {
  TILSTANDSGRAD_LABELS,
  HOVEDGRUNNLAG_LABELS,
  OBSERVASJONS_TILLEGG_LABELS,
  AKUTTGRAD_LABELS,
  ONSKET_LENGDE_LABELS,
  NS_VERSJON_LABELS,
  ALDERSVURDERING_LABELS,
} from "../types/arkat";
import { erAldersvurderingRelevant, hentAlderslogikk } from "../config/ns-versjon";
import { inferGrunnlag } from "../lib/infer-grunnlag";
import ArkatAssistantResult from "./ArkatAssistantResult";
import ArkatAssistantInfo from "./ArkatAssistantInfo";

export default function ArkatAssistantForm() {
  // Form state
  const [bygningsdel, setBygningsdel] = useState("");
  const [underenhet, setUnderenhet] = useState("");
  const [submodus, setSubmodus] = useState("");
  const [tilstandsgrad, setTilstandsgrad] = useState<Tilstandsgrad | "">("");
  const [hovedgrunnlag, setHovedgrunnlag] = useState<Hovedgrunnlag | "">("");
  const [tillegg, setTillegg] = useState<ObservasjonsTillegg[]>([]);
  const [akuttgrad, setAkuttgrad] = useState<Akuttgrad | "">("");
  const [observasjon, setObservasjon] = useState("");
  const [arsak, setArsak] = useState("");
  const [onsketLengde, setOnsketLengde] = useState<OnsketLengde>("normal");
  const [nsVersjon, setNsVersjon] = useState<NsVersjon>("NS3600_2018");
  const [aldersvurdering, setAldersvurdering] = useState<Aldersvurdering | "">("");

  // Auto-grunnlag state
  const [grunnlagOverstyrt, setGrunnlagOverstyrt] = useState(false);
  const [visGrunnlagDetaljer, setVisGrunnlagDetaljer] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ArkatGenerateResponse | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);

  // Avhengig dropdown — underenheter for valgt bygningsdel
  const underenheter = useMemo(() => {
    const bd = BYGNINGSDELER.find((b) => b.key === bygningsdel);
    return bd?.underenheter ?? [];
  }, [bygningsdel]);

  // Har denne underenheten submodi (f.eks. balkong: konstruksjon vs. rekkverk)?
  const submodi: SubmodusConfig[] | null = useMemo(() => {
    if (!bygningsdel || !underenhet) return null;
    return hentSubmodi(bygningsdel, underenhet);
  }, [bygningsdel, underenhet]);

  // Er dette merknad-modus? Avhenger av underenhet + evt. valgt submodus.
  const merknadModus = useMemo(() => {
    if (!bygningsdel || !underenhet) return false;
    return erMerknadModus(bygningsdel, underenhet, submodus || undefined);
  }, [bygningsdel, underenhet, submodus]);

  // Vis aldersvurdering-seksjon?
  const visAldersvurdering = useMemo(() => {
    if (!bygningsdel || !underenhet) return false;
    return erAldersvurderingRelevant(nsVersjon, bygningsdel, underenhet);
  }, [nsVersjon, bygningsdel, underenhet]);

  // Hent begrunnelse for alderslogikk
  const alderslogikkInfo = useMemo(() => {
    if (!bygningsdel || !underenhet) return null;
    return hentAlderslogikk(bygningsdel, underenhet);
  }, [bygningsdel, underenhet]);

  // ─── Auto-grunnlag ─────────────────────────────────────────
  // Kjør inferens når observasjonen endres (med debounce-effekt)
  const inferert = useMemo(() => {
    return inferGrunnlag(observasjon);
  }, [observasjon]);

  // Oppdater grunnlag automatisk — kun når brukeren IKKE har overstyrt
  const applyInferredGrunnlag = useCallback(() => {
    if (grunnlagOverstyrt) return;

    if (inferert.hovedgrunnlag) {
      setHovedgrunnlag(inferert.hovedgrunnlag);
    }
    setTillegg(inferert.tillegg);
  }, [inferert, grunnlagOverstyrt]);

  useEffect(() => {
    applyInferredGrunnlag();
  }, [applyInferredGrunnlag]);

  // Nullstill overstyring når observasjonen tømmes
  useEffect(() => {
    if (observasjon.trim().length < 15) {
      setGrunnlagOverstyrt(false);
      setVisGrunnlagDetaljer(false);
    }
  }, [observasjon]);

  // Synkroniser alder-tillegg med aldersvurdering-panelet
  useEffect(() => {
    if (visAldersvurdering && tillegg.includes("alder_som_grunnlag")) {
      setAldersvurdering("brukes_som_grunnlag");
    }
  }, [tillegg, visAldersvurdering]);

  // Nullstill underenhet og submodus når bygningsdel endres
  const handleBygningsdelChange = (key: string) => {
    setBygningsdel(key);
    setUnderenhet("");
    setSubmodus("");
    setTilstandsgrad("");
    setAldersvurdering("");
  };

  // Nullstill aldersvurdering når NS-versjon endres
  const handleNsVersjonChange = (versjon: NsVersjon) => {
    setNsVersjon(versjon);
    setAldersvurdering("");
  };

  // Manuell overstyring av hovedgrunnlag
  const handleHovedgrunnlagChange = (key: Hovedgrunnlag) => {
    setGrunnlagOverstyrt(true);
    setHovedgrunnlag(key);
    // Fjern dokumentasjon_mangler fra tillegg hvis den nå er hovedgrunnlag
    if (key === "dokumentasjon_mangler") {
      setTillegg((prev) => prev.filter((t) => t !== "dokumentasjon_mangler"));
    }
  };

  // Manuell overstyring av tillegg
  const handleTilleggToggle = (key: ObservasjonsTillegg) => {
    setGrunnlagOverstyrt(true);
    setTillegg((prev) => {
      const neste = prev.includes(key)
        ? prev.filter((t) => t !== key)
        : [...prev, key];

      // Synkroniser alder_som_grunnlag ↔ aldersvurdering
      if (key === "alder_som_grunnlag" && visAldersvurdering) {
        if (neste.includes("alder_som_grunnlag")) {
          setAldersvurdering("brukes_som_grunnlag");
        } else {
          setAldersvurdering("ikke_brukt");
        }
      }

      return neste;
    });
  };

  // Tilgjengelige tillegg — "dokumentasjon_mangler" skjules når det er valgt som hovedgrunnlag
  const tilgjengeligeTillegg = useMemo(() => {
    return (
      Object.entries(OBSERVASJONS_TILLEGG_LABELS) as [ObservasjonsTillegg, string][]
    ).filter(([key]) => {
      if (key === "dokumentasjon_mangler" && hovedgrunnlag === "dokumentasjon_mangler") {
        return false;
      }
      return true;
    });
  }, [hovedgrunnlag]);

  // Sjekk at alle påkrevde felt er utfylt
  const kanSende =
    bygningsdel &&
    underenhet &&
    (!submodi || submodus) && // Submodus påkrevd når tilgjengelig
    (merknadModus || tilstandsgrad) &&
    hovedgrunnlag &&
    akuttgrad &&
    observasjon.trim().length >= 10 &&
    (merknadModus || arsak.trim().length >= 10) && // Årsak påkrevd i standard-modus
    (!visAldersvurdering || aldersvurdering !== "");

  const handleSubmit = async () => {
    if (!kanSende) return;

    setLoading(true);
    setFeilmelding(null);
    setResponse(null);

    // Fjern "dokumentasjon_mangler" fra tillegg hvis det også er hovedgrunnlag
    const rensetTillegg = tillegg.filter(
      (t) => !(t === "dokumentasjon_mangler" && hovedgrunnlag === "dokumentasjon_mangler")
    );

    const payload: ArkatGenerateInput = {
      bygningsdel,
      underenhet,
      ...(submodus ? { submodus } : {}),
      ...(merknadModus ? {} : { tilstandsgrad: tilstandsgrad as Tilstandsgrad }),
      hovedgrunnlag: hovedgrunnlag as Hovedgrunnlag,
      tillegg: rensetTillegg,
      akuttgrad: akuttgrad as Akuttgrad,
      observasjon: observasjon.trim(),
      ...(merknadModus ? {} : { arsak: arsak.trim() }),
      onsket_lengde: onsketLengde,
      ns_versjon: nsVersjon,
      ...(visAldersvurdering && aldersvurdering
        ? { aldersvurdering: aldersvurdering as Aldersvurdering }
        : {}),
    };

    try {
      const res = await fetch("/api/arkat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ArkatGenerateResponse = await res.json();
      setResponse(data);
    } catch {
      setFeilmelding("Noe gikk galt. Sjekk nettverkstilkoblingen og prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  const handleNullstill = () => {
    setBygningsdel("");
    setUnderenhet("");
    setSubmodus("");
    setTilstandsgrad("");
    setHovedgrunnlag("");
    setTillegg([]);
    setAkuttgrad("");
    setObservasjon("");
    setArsak("");
    setOnsketLengde("normal");
    setNsVersjon("NS3600_2018");
    setAldersvurdering("");
    setGrunnlagOverstyrt(false);
    setVisGrunnlagDetaljer(false);
    setResponse(null);
    setFeilmelding(null);
  };

  // ─── Grunnlag-sammendrag for kompaktvisning ────────────────
  const grunnlagSammendrag = useMemo(() => {
    if (!hovedgrunnlag) return null;
    const hovLabel = HOVEDGRUNNLAG_LABELS[hovedgrunnlag as Hovedgrunnlag];
    const tilleggLabels = tillegg
      .map((t) => OBSERVASJONS_TILLEGG_LABELS[t])
      .filter(Boolean);
    return { hovLabel, tilleggLabels };
  }, [hovedgrunnlag, tillegg]);

  // Har auto-grunnlag noe å vise?
  const harAutoGrunnlag = observasjon.trim().length >= 15 && inferert.hovedgrunnlag;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Overskrift */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">ARKAT Skrivehjelp</h1>
        <p className="text-[#64748b] text-sm mt-0.5">
          Skriv Observasjon og Årsak — få Risiko, Konsekvens og Anbefalt tiltak
        </p>
      </div>

      <ArkatAssistantInfo />

      {/* Hovedlayout — to kolonner på desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VENSTRE: Skjema */}
        <div className="space-y-4">
          {/* Bygningsdel */}
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-1">
              Bygningsdel
            </label>
            <select
              value={bygningsdel}
              onChange={(e) => handleBygningsdelChange(e.target.value)}
              className="portal-input"
            >
              <option value="">Velg bygningsdel...</option>
              {BYGNINGSDELER.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Underenhet */}
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-1">
              Underenhet
            </label>
            <select
              value={underenhet}
              onChange={(e) => { setUnderenhet(e.target.value); setSubmodus(""); setTilstandsgrad(""); setAldersvurdering(""); }}
              className="portal-input"
              disabled={!bygningsdel}
            >
              <option value="">
                {bygningsdel ? "Velg underenhet..." : "Velg bygningsdel først"}
              </option>
              {underenheter.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submodus — vises kun for underenheter med delvise merknad-områder */}
          {submodi && (
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1">
                Vurderingstype
              </label>
              <div className="flex gap-3">
                {submodi.map((sm) => (
                  <button
                    key={sm.key}
                    type="button"
                    onClick={() => { setSubmodus(sm.key); setTilstandsgrad(""); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      submodus === sm.key
                        ? sm.merknad
                          ? "bg-[#285982] text-white border-[#285982]"
                          : "bg-[#285982] text-white border-[#285982]"
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                    }`}
                  >
                    {sm.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NS-versjon */}
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-1">
              NS 3600-versjon
            </label>
            <div className="flex gap-3">
              {(Object.entries(NS_VERSJON_LABELS) as [NsVersjon, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleNsVersjonChange(key)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      nsVersjon === key
                        ? "bg-[#285982] text-white border-[#285982]"
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Aldersvurdering — kun synlig for NS 3600:2025 + relevante underenheter */}
          {visAldersvurdering && (
            <div className="rounded-lg border border-[#285982]/20 bg-[#f0f4f8] p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-1">
                  Aldersvurdering / usikker fremtidig funksjon
                </label>
                <p className="text-xs text-[#64748b] mb-2">
                  NS 3600:2025 ({alderslogikkInfo?.standardreferanse ?? "12.4"}) tillater at alder
                  kan brukes som del av grunnlaget for TG-vurdering på denne underenheten.
                </p>
                {alderslogikkInfo && (
                  <p className="text-xs text-[#64748b] italic">
                    {alderslogikkInfo.hjelpetekst}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                {(
                  Object.entries(ALDERSVURDERING_LABELS) as [Aldersvurdering, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAldersvurdering(key)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      aldersvurdering === key
                        ? "bg-[#285982] text-white border-[#285982]"
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tilstandsgrad — skjules i merknad-modus */}
          {merknadModus ? (
            <div className="rounded-lg border border-[#285982]/20 bg-[#f0f4f8] p-4">
              <p className="text-sm font-medium text-[#285982]">Merknad-modus</p>
              <p className="text-xs text-[#64748b] mt-1">
                Dette forholdet vurderes uten tilstandsgrad i tråd med forskriften.
                ARKAT genererer merknad, konsekvens og anbefalt tiltak.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1">
                Tilstandsgrad
              </label>
              <div className="flex gap-3">
                {(Object.entries(TILSTANDSGRAD_LABELS) as [Tilstandsgrad, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTilstandsgrad(key)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                        tilstandsgrad === key
                          ? "bg-[#285982] text-white border-[#285982]"
                          : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Observasjon — alltid synlig (fakta) */}
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-1">
              Observasjon
            </label>
            <p className="text-xs text-[#64748b] mb-2">
              Hva du har sett, målt, eller ikke kunne undersøke. Hold deg til fakta — ingen vurderinger her.
            </p>
            <textarea
              value={observasjon}
              onChange={(e) => setObservasjon(e.target.value)}
              rows={3}
              placeholder={merknadModus
                ? "F.eks. «Sikringsskap fra 1985 med skrusikringer. Synlig spor av varmeutvikling på to sikringer. Overspenningsvern ikke montert.»"
                : "F.eks. «Synlige riss i utvendig puss på grunnmur, stedvis opp til 3 mm brede, langs hele sørveggen. Avskalling av puss rundt kjellervindu.»"
              }
              className="portal-input resize-y min-h-[80px]"
            />
            <p className="text-xs text-[#94a3b8] mt-1">
              {observasjon.trim().length} tegn
              {observasjon.trim().length > 0 && observasjon.trim().length < 10 && (
                <span className="text-red-400"> — minimum 10 tegn</span>
              )}
            </p>
          </div>

          {/* Årsak — kun i standard-modus (ikke merknad) */}
          {!merknadModus && (
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1">
                Årsak
              </label>
              <p className="text-xs text-[#64748b] mb-2">
                Din faglige vurdering av hvorfor dette er et avvik. Én mekanisme om gangen.
              </p>
              <textarea
                value={arsak}
                onChange={(e) => setArsak(e.target.value)}
                rows={3}
                placeholder="F.eks. «Rissmønsteret tyder på setningsbevegelser i grunnmuren.» eller «Deformasjoner på nedløpsrør skyldes frostspreng.»"
                className="portal-input resize-y min-h-[80px]"
              />
              <p className="text-xs text-[#94a3b8] mt-1">
                {arsak.trim().length} tegn
                {arsak.trim().length > 0 && arsak.trim().length < 10 && (
                  <span className="text-red-400"> — minimum 10 tegn</span>
                )}
              </p>
            </div>
          )}

          {/* ─── Grunnlag: auto-forslag eller manuell ─────────── */}
          {harAutoGrunnlag && !visGrunnlagDetaljer ? (
            /* Kompaktvisning: auto-forslag med Endre-knapp */
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#64748b] mb-1">
                    Grunnlag {grunnlagOverstyrt ? "(manuelt valgt)" : "(automatisk)"}
                  </p>
                  {grunnlagSammendrag && (
                    <p className="text-sm text-[#1e293b]">
                      {grunnlagSammendrag.hovLabel}
                      {grunnlagSammendrag.tilleggLabels.length > 0 && (
                        <span className="text-[#64748b]">
                          {" · "}
                          {grunnlagSammendrag.tilleggLabels.join(", ")}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setVisGrunnlagDetaljer(true)}
                  className="text-xs text-[#285982] hover:text-[#1e4a6e] font-medium whitespace-nowrap cursor-pointer"
                >
                  Endre
                </button>
              </div>
            </div>
          ) : (
            /* Ekspandert visning: manuelt valg */
            <div className="space-y-4">
              {/* Lukkeknapp hvis auto-grunnlag er tilgjengelig */}
              {harAutoGrunnlag && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#64748b]">
                    Grunnlag for vurderingen
                  </p>
                  <button
                    type="button"
                    onClick={() => setVisGrunnlagDetaljer(false)}
                    className="text-xs text-[#285982] hover:text-[#1e4a6e] font-medium cursor-pointer"
                  >
                    Skjul detaljer
                  </button>
                </div>
              )}

              {/* Hovedgrunnlag */}
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-1">
                  Hovedgrunnlag for vurderingen
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.entries(HOVEDGRUNNLAG_LABELS) as [Hovedgrunnlag, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleHovedgrunnlagChange(key)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer text-left ${
                        hovedgrunnlag === key
                          ? "bg-[#285982] text-white border-[#285982]"
                          : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tillegg */}
              {hovedgrunnlag && (
                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-1">
                    Tillegg{" "}
                    <span className="font-normal text-[#94a3b8]">(valgfritt — nyanserer grunnlaget)</span>
                  </label>
                  <div className="space-y-2">
                    {tilgjengeligeTillegg.map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                          tillegg.includes(key)
                            ? "bg-[#f0f4f8] border-[#285982]/40 text-[#1e293b]"
                            : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#285982]/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={tillegg.includes(key)}
                          onChange={() => handleTilleggToggle(key)}
                          className="w-4 h-4 rounded border-[#cbd5e1] text-[#285982] focus:ring-[#285982]"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Akuttgrad */}
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-1">
              Akuttgrad
            </label>
            <div className="flex gap-3">
              {(Object.entries(AKUTTGRAD_LABELS) as [Akuttgrad, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAkuttgrad(key)}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      akuttgrad === key
                        ? key === "haster"
                          ? "bg-red-600 text-white border-red-600"
                          : key === "bor_folges_opp"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-[#285982] text-white border-[#285982]"
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Ønsket lengde */}
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-1">
              Ønsket lengde{" "}
              <span className="font-normal text-[#94a3b8]">(valgfritt)</span>
            </label>
            <div className="flex gap-3">
              {(Object.entries(ONSKET_LENGDE_LABELS) as [OnsketLengde, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOnsketLengde(key)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      onsketLengde === key
                        ? "bg-[#285982] text-white border-[#285982]"
                        : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982]"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Knapper */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!kanSende || loading}
              className="portal-btn-primary flex-1"
            >
              {loading ? "Genererer..." : "Generer ARKAT"}
            </button>
            <button
              type="button"
              onClick={handleNullstill}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748b] border border-[#e2e8f0] hover:border-[#285982] hover:text-[#285982] transition-all cursor-pointer"
            >
              Nullstill
            </button>
          </div>

          {/* Feilmelding fra nettverksfeil */}
          {feilmelding && (
            <div className="portal-card p-4 border-l-4 border-l-red-400">
              <p className="text-sm text-red-700">{feilmelding}</p>
            </div>
          )}
        </div>

        {/* HØYRE: Resultat */}
        <div>
          {response ? (
            <ArkatAssistantResult
              response={response}
              inputKontekst={{
                bygningsdel,
                underenhet,
                tilstandsgrad: merknadModus ? undefined : tilstandsgrad,
                observasjon,
                arsak: merknadModus ? undefined : arsak,
              }}
            />
          ) : (
            <div className="portal-card p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f0f4f8] flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-[#94a3b8]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-[#94a3b8]">
                Fyll ut skjemaet og trykk «Generer ARKAT» for å få et forslag
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
