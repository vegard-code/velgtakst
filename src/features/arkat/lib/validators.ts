/**
 * Zod-schema for validering av ARKAT-input.
 * Bruker Zod v4 syntax (error → message, ikke errorMap).
 */
import { z } from "zod";
import { gyldigeBygningsdeler, gyldigeUnderenheter, erMerknadModus } from "../config/bygningsdeler";
import { erAldersvurderingRelevant } from "../config/ns-versjon";

export const ArkatInputSchema = z
  .object({
    bygningsdel: z.string().min(1, "Bygningsdel er påkrevd"),
    underenhet: z.string().min(1, "Underenhet er påkrevd"),
    tilstandsgrad: z.enum(["TG2", "TG3"], {
      error: "Velg TG2 eller TG3",
    }).optional(),
    submodus: z.string().optional(),
    hovedgrunnlag: z.enum(
      [
        "visuell_observasjon",
        "maaling_indikasjon",
        "alder_slitasje",
        "dokumentasjon_mangler",
      ],
      { error: "Velg et hovedgrunnlag" }
    ),
    tillegg: z
      .array(
        z.enum([
          "undersoekelsesbegrensning",
          "ingen_paavist_skade",
          "alder_som_grunnlag",
          "dokumentasjon_mangler",
        ])
      )
      .default([]),
    akuttgrad: z.enum(["ikke_akutt", "bor_folges_opp", "haster"], {
      error: "Velg akuttgrad",
    }),
    observasjon: z
      .string()
      .min(1, "Observasjon er påkrevd")
      .min(15, "Observasjonen må være minst 15 tegn — beskriv hva som faktisk er observert"),
    onsket_lengde: z.enum(["kort", "normal"]).optional().default("normal"),
    ns_versjon: z.enum(["NS3600_2018", "NS3600_2025"], {
      error: "Velg NS-versjon",
    }),
    aldersvurdering: z
      .enum(["ikke_brukt", "brukes_som_grunnlag"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Valider at bygningsdel er gyldig
    const gyldige = gyldigeBygningsdeler();
    if (!gyldige.includes(data.bygningsdel)) {
      ctx.addIssue({
        code: "custom",
        path: ["bygningsdel"],
        message: "Ugyldig bygningsdel",
      });
      return;
    }

    // Valider at underenhet hører til valgt bygningsdel
    const gyldigeUe = gyldigeUnderenheter(data.bygningsdel);
    if (!gyldigeUe.includes(data.underenhet)) {
      ctx.addIssue({
        code: "custom",
        path: ["underenhet"],
        message: "Ugyldig underenhet for valgt bygningsdel",
      });
    }

    // Tilstandsgrad er påkrevd for alle UNNTATT merknad-modus
    const merknad = erMerknadModus(data.bygningsdel, data.underenhet, data.submodus);
    if (!merknad && !data.tilstandsgrad) {
      ctx.addIssue({
        code: "custom",
        path: ["tilstandsgrad"],
        message: "Velg TG2 eller TG3",
      });
    }

    // Valider at "dokumentasjon_mangler" ikke er valgt som både hovedgrunnlag og tillegg
    if (
      data.hovedgrunnlag === "dokumentasjon_mangler" &&
      data.tillegg.includes("dokumentasjon_mangler")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["tillegg"],
        message: "Dokumentasjon mangler er allerede valgt som hovedgrunnlag",
      });
    }

    // Valider aldersvurdering — påkrevd for NS 3600:2025 + relevante underenheter
    if (
      data.ns_versjon === "NS3600_2025" &&
      erAldersvurderingRelevant("NS3600_2025", data.bygningsdel, data.underenhet) &&
      !data.aldersvurdering
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["aldersvurdering"],
        message: "Aldersvurdering er påkrevd for denne underenheten i NS 3600:2025",
      });
    }
  });

export type ValidatedArkatInput = z.infer<typeof ArkatInputSchema>;
