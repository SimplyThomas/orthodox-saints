import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const relatedFigure = z.object({
  name: z.string(),
  note: z.string(),
  href: z.string().optional(), // internal "saint/OS-####"
  external: z.string().optional(),
  // Set false for a figure who is NOT a commemorated saint (e.g. an emperor a
  // saint confronted) — the card renders a quiet "not commemorated" marker and
  // no link. Omit for saints (linked via `href`, or shown as a plain monogram
  // card when the saint is not yet in the dataset).
  commemorated: z.boolean().optional(),
});

const timelineEntry = z.object({
  when: z.string(),
  title: z.string(),
  body: z.string(),
  figures: z
    .array(z.object({ name: z.string(), href: z.string().optional() }))
    .optional(),
  source: z.string().optional(),
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
    timeline: z.array(timelineEntry).optional(),
    sections: z
      .array(z.object({ heading: z.string(), body: z.array(z.string()) }))
      .optional(),
    family: z
      .object({
        heading: z.string().optional(),
        intro: z.string().optional(),
        figures: z.array(relatedFigure),
      })
      .optional(),
    // Curated "Related Saints" — specific cross-linked saints connected by
    // theology, typology, vocation, or succession (not necessarily
    // contemporaries). Rendered as its own card grid above the auto-generated
    // theme links. Distinct from `family` (kin) and `companions` (people the
    // saint personally knew).
    related: z.array(relatedFigure).optional(),
    // Documented personal relationships — teacher, disciple, fellow martyr,
    // lifelong friend, an emperor confronted, a biographer. Rendered as the
    // "Companions & Contemporaries" section. Distinct from `family` (kin) and
    // from `related`, the legacy mixed list this supersedes.
    companions: z.array(relatedFigure).optional(),
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

// Rich feast/fast profiles (src/content/feasts/FF-####.yaml) — the history and
// meaning of each liturgical feast/fast in data/feasts.csv. Same status gate
// as saint profiles: production ships only `reviewed`. §9 guardrails carry
// over: hymnography is DESCRIBED, never reproduced from copyrighted
// translations; customs are church-blessed only; fastingPractice stays
// descriptive (the frontend adds the pastoral disclaimer).
const feastProfileSchema = z
  .object({
    id: z.string().regex(/^FF-\d{4,}$/),
    status: z.enum(["draft", "reviewed", "flagged"]).default("draft"),
    flagReasons: z
      .array(z.object({ claim: z.string(), detail: z.string() }))
      .optional(),
    sources: z.array(z.string()).optional(),
    generated: z.string().optional(), // ISO date
    humanReviewed: z.boolean().optional().default(false),
    overview: z.array(z.string()).min(1),
    // The two first-class prose axes of the feasts database: how the
    // feast/fast arose and developed, and what it means theologically.
    history: z.array(z.string()).optional(),
    meaning: z.array(z.string()).optional(),
    timeline: z.array(timelineEntry).optional(),
    scripture: z
      .array(z.object({ ref: z.string(), note: z.string().optional() }))
      .optional(),
    iconography: z.array(z.string()).optional(),
    hymnography: z.array(z.string()).optional(), // describes, never quotes (§9)
    fastingPractice: z.array(z.string()).optional(),
    customs: z.array(z.string()).optional(),
    sections: z
      .array(z.object({ heading: z.string(), body: z.array(z.string()) }))
      .optional(),
    related: z.array(relatedFigure).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.status !== "reviewed" && !(p.sources && p.sources.length)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${p.id}: ${p.status} profiles must list at least one source`,
      });
    }
  });

const feasts = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/feasts" }),
  schema: feastProfileSchema,
});

// "Saints in the News" editorial articles (src/content/news/<slug>.yaml). Mirrors
// the NewsItem/NewsSaintRef/NewsSourceGroup interfaces in src/lib/news.ts
// field-for-field, plus ordering/featured metadata. The page furniture
// (NEWS_CATS, NEWS_THISDAY, …) stays in lib/news.ts — it is page config, not
// editorial content. Content is sample copy from the design mock (see the header
// of lib/news.ts); the migration keeps it byte-identical.
const newsSaintRef = z.object({
  name: z.string(),
  type: z.string(),
  epithet: z.string().optional(),
  note: z.string().optional(),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/news" }),
  schema: z.object({
    id: z.string(), // slug, used for /news/[slug]
    cat: z.string(),
    saint: newsSaintRef,
    headline: z.string(),
    date: z.string(),
    location: z.string(),
    summary: z.string(),
    featured: z.boolean().optional().default(false),
    order: z.number(), // preserves the current NEWS array order
    kicker: z.string().optional(),
    dek: z.string().optional(),
    plate: z.string().optional(),
    body: z.array(z.string()).optional(),
    pullQuote: z
      .object({ text: z.string(), attribution: z.string() })
      .optional(),
    caption: z.string().optional(),
    sources: z
      .array(z.object({ h: z.string(), items: z.array(z.string()) }))
      .optional(),
    relatedSaints: z.array(newsSaintRef).optional(),
  }),
});

export const collections = { profiles, feasts, news };
