import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const relatedFigure = z.object({
  name: z.string(),
  note: z.string(),
  href: z.string().optional(), // internal "saint/OS-####"
  external: z.string().optional(),
});

const profileSchema = z
  .object({
    id: z.string().regex(/^OS-\d{4,}$/),
    status: z.enum(["draft", "reviewed", "flagged"]).default("draft"),
    // Honored verifier concerns shown on the flagged banner (previews only, since
    // flagged profiles are gated out of production). `claim` = the assertion in
    // question; `detail` = why it isn't supported by the saint's source record.
    flagReasons: z
      .array(z.object({ claim: z.string(), detail: z.string() }))
      .optional(),
    sources: z.array(z.string()).optional(),
    generated: z.string().optional(), // ISO date
    humanReviewed: z.boolean().optional().default(false),
    lifespan: z.string().optional(),
    // The saint's full formal liturgical style (the title spoken at
    // commemoration), e.g. "Our Father among the Saints Nicholas, Archbishop of
    // Myra, the Wonderworker". Rendered as the prominent "Commemorated as" band.
    liturgicalTitle: z.string().optional(),
    overview: z.array(z.string()).min(1),
    // Curated quotes in the saint's own words, shown in the "In their own words"
    // collapsible. Each MUST be verbatim from a public-domain translation (§9);
    // `translation` names the PD edition (e.g. NPNF2) and `source` links it so a
    // reviewer can verify the wording.
    quotes: z
      .array(
        z.object({
          text: z.string(),
          work: z.string().optional(),
          locus: z.string().optional(),
          translation: z.string().optional(),
          source: z.string().optional(),
        }),
      )
      .optional(),
    timeline: z
      .array(
        z.object({
          when: z.string(),
          title: z.string(),
          body: z.string(),
          figures: z
            .array(z.object({ name: z.string(), href: z.string().optional() }))
            .optional(),
          source: z.string().optional(),
        }),
      )
      .optional(),
    sections: z
      .array(z.object({ heading: z.string(), body: z.array(z.string()) }))
      .optional(),
    family: z
      .object({
        heading: z.string(),
        intro: z.string().optional(),
        figures: z.array(relatedFigure),
      })
      .optional(),
    related: z.array(relatedFigure).optional(),
    patronage: z
      .array(
        z
          .string()
          .max(
            60,
            "patronage entry too long for the rail chip — use a short keyword label; put descriptive prose in a profile section instead",
          ),
      )
      .optional(),
    works: z
      .array(
        z.object({
          title: z.string(),
          desc: z.string(),
          date: z.string().optional(),
        }),
      )
      .optional(),
    reading: z
      .array(
        z.object({
          heading: z.string(),
          items: z.array(
            z.object({
              title: z.string(),
              author: z.string().optional(),
              type: z.string().optional(),
            }),
          ),
        }),
      )
      .optional(),
  })
  // Generated (draft/flagged) profiles must cite sources (spec §6).
  .superRefine((p, ctx) => {
    if (p.status !== "reviewed" && !(p.sources && p.sources.length)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${p.id}: ${p.status} profiles must list at least one source`,
      });
    }
  });

const profiles = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/profiles" }),
  schema: profileSchema,
});

export const collections = { profiles };
