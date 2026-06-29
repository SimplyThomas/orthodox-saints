/* Patron-saint quiz config + scoring (ported from app.js). */

import { valuesOf, cleanName } from "./saints";
import { facetCounts } from "./filter";

/** One curated, user-facing answer. `label` is what the seeker sees and what we
   echo back in "why you were matched"; `tags` are the controlled-vocab values it
   scores against IN THE QUESTION'S OWN FACET. This is the pastoral mapping layer
   (CLAUDE.md §9): the database tags are never changed — the quiz simply presents
   modern, relatable language over them, and a single option may span several DB
   tags (e.g. "Anxiety & fear" → Fear, Doubt).

   `cross` maps an option into OTHER facets, keyed by the saint-record field
   (e.g. "church", "family"). This lets a "calling" answer reach concepts that
   live outside its own facet — "Monk or nun" → church: Monastic; "Parent or
   homemaker" → family: Parent — without inventing new Vocation vocabulary. An
   option may have `tags`, `cross`, or both; it matches a saint if ANY mapped tag
   (own-facet or cross-facet) is present. */
export interface QuizOption {
  label: string;
  tags?: string[];
  cross?: Record<string, string[]>;
}

/** A titled cluster of options, rendered under a pastoral category header. */
export interface QuizOptionGroup {
  label: string;
  options: QuizOption[];
}

export interface QuizGroup {
  key: string;
  weight: number;
  /** short eyebrow label shown above the question in the step flow */
  kicker: string;
  q: string;
  /** warm, reassuring one-liner shown under the question (conversational tone) */
  sub?: string;
  optional?: boolean;
  /** When present, the question renders these curated, grouped, *mapped* options
     instead of raw facet values from the data. */
  optionGroups?: QuizOptionGroup[];
}

/* ── Q1 "experience" — modern pastoral options over the historical DB tags ──
   The Life Experience facet records what the saints' lives literally contained
   (Persecution, Torture, Exile, …) — accurate for the corpus but not how a
   modern seeker names their own situation. These options present today's
   reasons someone seeks a patron, each mapped to the existing DB tags so the
   data stays untouched (CLAUDE.md §9) while the matching reaches across themes:
   a saint who endured torture can be a patron for someone healing from abuse;
   one who was exiled, for a refugee. Every `tags` value below is a real Life
   Experience term in data/vocabulary.csv. */
export const EXPERIENCE_OPTION_GROUPS: QuizOptionGroup[] = [
  {
    label: "Heart & Mind",
    options: [
      { label: "Anxiety & fear", tags: ["Fear"] },
      { label: "Questioning or doubting my faith", tags: ["Doubt"] },
      {
        label: "Depression or spiritual dryness",
        tags: ["Despondency / Acedia"],
      },
      { label: "Grief & loss", tags: ["Grief / Bereavement"] },
      { label: "Loneliness", tags: ["Loneliness"] },
      { label: "Temptation", tags: ["Temptation"] },
      {
        label: "Addiction & recovery",
        tags: ["Addiction / Self-destructive habits"],
      },
      {
        label: "Repentance after grave sin",
        tags: ["Repentance from grave sin"],
      },
    ],
  },
  {
    label: "Family & Relationships",
    options: [
      { label: "Married life", tags: ["Marriage"] },
      { label: "A difficult marriage", tags: ["Difficult Marriage"] },
      { label: "Widowhood", tags: ["Widowhood"] },
      { label: "Parenting & adoption", tags: ["Parenting", "Adoption"] },
      { label: "Infertility", tags: ["Infertility"] },
      { label: "Losing a child", tags: ["Loss of a Child"] },
    ],
  },
  {
    label: "Health & Body",
    options: [
      {
        label: "Serious or chronic illness",
        tags: ["Illness", "Chronic Pain"],
      },
      { label: "Disability", tags: ["Disability"] },
      { label: "Blindness or vision loss", tags: ["Blindness"] },
    ],
  },
  {
    label: "Livelihood",
    options: [
      { label: "Poverty or financial hardship", tags: ["Poverty"] },
      { label: "Homelessness", tags: ["Homelessness"] },
      { label: "Wealth & stewardship", tags: ["Wealth"] },
    ],
  },
  {
    label: "Trial & Persecution",
    options: [
      { label: "Persecution for the faith", tags: ["Persecution"] },
      { label: "Healing from abuse or violence", tags: ["Torture", "War"] },
      { label: "Torture or bodily suffering", tags: ["Torture"] },
      {
        label: "Imprisonment or captivity",
        tags: ["Imprisonment", "Captivity"],
      },
      { label: "Exile or displacement", tags: ["Exile"] },
      {
        label: "Far from home — refugee or immigrant",
        tags: ["Exile", "Homelessness"],
      },
      { label: "Enslavement or trafficking", tags: ["Slavery"] },
      { label: "War", tags: ["War"] },
      { label: "False accusations", tags: ["Slander / False Accusation"] },
    ],
  },
];

/* ── Q2 "vocation" — modern callings over the historical Vocation tags ──
   The Vocation facet holds 24 occupations attested in the saints' lives
   (Writer, Soldier, Craftsman, Shepherd, …). Most modern careers did not exist
   then, so these options present today's work and map it to the nearest
   historical calling(s) — a software developer to the scholars/scribes/
   translators, a contractor to the builders/craftsmen, a chef to those known
   for humble service. The Church & Ministry cluster reaches into the Church
   Status facet via `cross` (Monk or nun → Monastic, clergy → Clergy-*), because
   those callings are not Vocation tags. Every tag below is a real value in its
   facet; no DB data changes (§9). Life stages with no historical analog
   (Retired, Between Jobs, "looking for my calling") are intentionally omitted
   rather than mapped loosely; parenting/family-state lives in Q3. */
export const VOCATION_OPTION_GROUPS: QuizOptionGroup[] = [
  {
    label: "Education & Knowledge",
    options: [
      { label: "Teacher or educator", tags: ["Teacher"] },
      { label: "Student", tags: ["Student", "Scholar"] },
      {
        label: "Professor, researcher or scholar",
        tags: ["Scholar", "Teacher"],
      },
      { label: "Librarian or historian", tags: ["Scholar", "Writer"] },
    ],
  },
  {
    label: "Healthcare & Caregiving",
    options: [
      { label: "Doctor or physician", tags: ["Physician"] },
      { label: "Nurse, EMT or paramedic", tags: ["Nurse", "Physician"] },
      { label: "Pharmacist, dentist or vet", tags: ["Physician"] },
      { label: "Therapist or counselor", tags: ["Physician", "Teacher"] },
      { label: "Caregiver", tags: ["Nurse", "Servant / Slave"] },
    ],
  },
  {
    label: "Technology, Science & Engineering",
    options: [
      {
        label: "Software developer or IT",
        tags: ["Scholar", "Writer", "Translator"],
      },
      { label: "Engineer", tags: ["Craftsman", "Architect"] },
      { label: "Scientist, mathematician or inventor", tags: ["Scholar"] },
      { label: "Architect or designer", tags: ["Architect", "Craftsman"] },
    ],
  },
  {
    label: "Skilled Trades & Building",
    options: [
      {
        label: "Builder, carpenter or contractor",
        tags: ["Craftsman", "Architect"],
      },
      { label: "Mechanic, electrician or plumber", tags: ["Craftsman"] },
      { label: "Manual or construction labor", tags: ["Craftsman", "Farmer"] },
    ],
  },
  {
    label: "Business & Finance",
    options: [
      { label: "Business owner or entrepreneur", tags: ["Merchant"] },
      { label: "Manager or executive", tags: ["Ruler", "Merchant"] },
      { label: "Accountant, banker or finance", tags: ["Merchant"] },
      {
        label: "Sales, retail or cashier",
        tags: ["Merchant", "Servant / Slave"],
      },
      {
        label: "Office or administration",
        tags: ["Servant / Slave", "Scholar"],
      },
    ],
  },
  {
    label: "Public Service & Law",
    options: [
      { label: "Police officer", tags: ["Soldier", "Officer / General"] },
      { label: "Firefighter or first responder", tags: ["Soldier"] },
      { label: "Military service", tags: ["Soldier", "Officer / General"] },
      { label: "Judge", tags: ["Judge"] },
      { label: "Lawyer or attorney", tags: ["Lawyer"] },
      { label: "Government or public official", tags: ["Ruler", "Judge"] },
    ],
  },
  {
    label: "Arts & Media",
    options: [
      { label: "Writer, journalist or editor", tags: ["Writer"] },
      { label: "Musician or singer", tags: ["Musician", "Hymnographer"] },
      {
        label: "Artist, photographer or designer",
        tags: ["Artist", "Iconographer"],
      },
      { label: "Actor, filmmaker or creator", tags: ["Artist", "Writer"] },
    ],
  },
  {
    label: "Hospitality & Service",
    options: [
      { label: "Chef, cook or baker", tags: ["Servant / Slave"] },
      { label: "Restaurant or hospitality worker", tags: ["Servant / Slave"] },
      { label: "Housekeeping or custodial", tags: ["Servant / Slave"] },
      { label: "Volunteer or helper", tags: ["Servant / Slave"] },
    ],
  },
  {
    label: "Land, Sea & Transport",
    options: [
      { label: "Farmer, rancher or gardener", tags: ["Farmer"] },
      { label: "Shepherd or herder", tags: ["Shepherd"] },
      { label: "Fisherman", tags: ["Fisherman", "Sailor"] },
      { label: "Sailor or maritime worker", tags: ["Sailor", "Fisherman"] },
      { label: "Pilot, driver or logistics", tags: ["Sailor", "Merchant"] },
    ],
  },
  {
    label: "Church & Ministry",
    options: [
      {
        label: "Priest, deacon or bishop",
        cross: {
          church: ["Clergy - Priest", "Clergy - Deacon", "Clergy - Bishop"],
        },
      },
      { label: "Monk or nun", cross: { church: ["Monastic"] } },
      { label: "Missionary or catechist", tags: ["Teacher", "Translator"] },
      { label: "Iconographer", tags: ["Iconographer"] },
      { label: "Choir member or chanter", tags: ["Hymnographer", "Musician"] },
    ],
  },
  // NB: parenting / homemaking / grandparent are NOT here — being a parent is a
  // life-STATE, owned by Q3 (its native Family/Life State facet), per the
  // "each concept lives in one question" rule. Q2 stays occupations + the
  // monastic/clergy callings.
];

/* ── Q3 "family" — the seeker's season of life, in modern words ──
   This question owns the Family / Life State facet (its native 8 tags) and is
   the single home for life-STATE concepts (the "each concept in one question"
   rule): the experiences of infertility / child-loss / widowhood-as-grief live
   in Q1, the monastic & clergy *callings* live in Q2, so Q3 keeps the family
   roles themselves plus one cross-facet addition unique to it — the convert /
   catechumen journey (Church Status: Convert), valuable for the inquirer
   audience and not surfaced by any other question. Age and employment have no
   tags in the data, so those proposed options (Young Adult, Retired, Employed,
   Looking for Work, Dating, Engaged, "expecting") are omitted rather than
   fabricated. Every tag below is a real value in its facet; no DB changes (§9). */
export const FAMILY_OPTION_GROUPS: QuizOptionGroup[] = [
  {
    label: "Age & Stage",
    options: [
      { label: "Child", tags: ["Child"] },
      { label: "Teenager", tags: ["Teen"] },
    ],
  },
  {
    label: "Relationship",
    options: [
      { label: "Single", tags: ["Single Adult"] },
      { label: "Dating or engaged", tags: ["Single Adult"] },
      { label: "Married", tags: ["Married"] },
      { label: "Widowed", tags: ["Widowed"] },
    ],
  },
  {
    label: "Family",
    options: [
      { label: "Parent", tags: ["Parent"] },
      { label: "Foster or adoptive parent", tags: ["Parent"] },
      { label: "Grandparent", tags: ["Grandparent", "Parent"] },
      { label: "Without children of my own", tags: ["Childless"] },
    ],
  },
  {
    label: "Coming to the Faith",
    options: [
      {
        label: "Inquirer, catechumen or newly illumined",
        cross: { church: ["Convert"] },
      },
    ],
  },
];

/* ── Q4 "virtue" — modern aspirations over the historical Virtue tags ──
   The Virtue facet holds 19 classical virtues (Humility, Zeal, Meekness,
   Discernment, Charity, …) — accurate names, but not how a modern seeker phrases
   what they long to grow in. These options present today's language for the same
   longings ("Trusting God more", "Forgiving someone who hurt me", "A gentler,
   calmer spirit") and map each to the nearest virtue(s). Several labels fan out
   to more than one tag (a single aspiration reaches a broader set of saints),
   while per-dimension normalization in quizMatches() still caps virtue's total
   contribution at its weight. Every tag below is a real value in the Virtue
   column of data/vocabulary.csv; all 19 are reachable and no DB data changes
   (§9). Virtue is an aspiration signal that complements — not overrides — the
   story/calling lead. */
export const VIRTUE_OPTION_GROUPS: QuizOptionGroup[] = [
  {
    label: "Peace & Trust",
    options: [
      { label: "Trusting God more", tags: ["Faith", "Hope"] },
      {
        label: "Letting go of control / surrender",
        tags: ["Obedience", "Humility"],
      },
      { label: "Patience in waiting", tags: ["Patience"] },
      {
        label: "Staying hopeful through hard times",
        tags: ["Hope", "Perseverance"],
      },
    ],
  },
  {
    label: "Strength & Resolve",
    options: [
      { label: "Courage to do what's right", tags: ["Courage"] },
      { label: "Standing firm in my faith", tags: ["Zeal", "Faith"] },
      { label: "Not giving up / perseverance", tags: ["Perseverance"] },
      {
        label: "Self-discipline & breaking bad habits",
        tags: ["Self-Control"],
      },
    ],
  },
  {
    label: "Love & Others",
    options: [
      { label: "Loving people better", tags: ["Love", "Charity"] },
      {
        label: "Forgiving someone who hurt me",
        tags: ["Forgiveness", "Mercy"],
      },
      { label: "Compassion for those who suffer", tags: ["Mercy"] },
      { label: "Generosity with what I have", tags: ["Charity"] },
      { label: "Welcoming others / hospitality", tags: ["Hospitality"] },
    ],
  },
  {
    label: "Heart & Character",
    options: [
      {
        label: "Humility / letting go of pride",
        tags: ["Humility", "Meekness"],
      },
      { label: "A gentler, calmer spirit", tags: ["Meekness"] },
      { label: "A pure and undivided heart", tags: ["Purity"] },
      { label: "Wisdom for big decisions", tags: ["Wisdom"] },
      {
        label: "Sensing God's will / discernment",
        tags: ["Discernment", "Wisdom"],
      },
    ],
  },
  {
    label: "Turning Back to God",
    options: [
      {
        label: "A repentant heart drawing closer to God",
        tags: ["Repentance"],
      },
    ],
  },
];

/* ── Q5 "intercession" — modern phrasing over the historical Intercession tags ──
   The Commonly Asked Intercessions facet holds the 21 needs people bring to a
   patron (Healing, Employment, Lost Items, Deliverance from the Occult, …). It
   is the NARROWEST discovery path and the sparsest facet (~18.6% covered, §10),
   so this question stays a light-touch relabel: everyday wording for each need,
   clustered for scanning, mapped one-to-one to its real tag. A couple of tags
   read as church jargon and get plain-language labels — "Deliverance from the
   Occult" → "Spiritual protection", "Protection from Illness / Epidemic" →
   "Protection from sickness". Every tag below is a real value in the Commonly
   Asked Intercessions column of data/vocabulary.csv; all 21 are reachable and no
   DB data changes (§9). */
export const INTERCESSION_OPTION_GROUPS: QuizOptionGroup[] = [
  {
    label: "Health & Wellbeing",
    options: [
      { label: "Healing from illness", tags: ["Healing"] },
      { label: "Peace of mind / mental health", tags: ["Mental Health"] },
      { label: "Freedom from addiction", tags: ["Addiction Recovery"] },
      {
        label: "Protection from sickness",
        tags: ["Protection from Illness / Epidemic"],
      },
    ],
  },
  {
    label: "Home & Livelihood",
    options: [
      { label: "Work or a job", tags: ["Employment"] },
      { label: "A home or housing", tags: ["Housing"] },
      { label: "Financial provision", tags: ["Financial Need"] },
      { label: "Finding something lost", tags: ["Lost Items"] },
    ],
  },
  {
    label: "Family & Children",
    options: [
      { label: "Marriage or a future spouse", tags: ["Marriage"] },
      { label: "Having children", tags: ["Children"] },
      { label: "A safe pregnancy", tags: ["Pregnancy"] },
      { label: "A safe childbirth", tags: ["Childbirth"] },
    ],
  },
  {
    label: "Studies, Work & Travel",
    options: [
      { label: "Studies or exams", tags: ["Education"] },
      { label: "Safe travel", tags: ["Travel"] },
      { label: "Someone in the military", tags: ["Military Service"] },
    ],
  },
  {
    label: "Faith & Protection",
    options: [
      { label: "Protection from harm", tags: ["Protection from Danger"] },
      { label: "Spiritual protection", tags: ["Deliverance from the Occult"] },
      { label: "Sharing the faith with others", tags: ["Missionary Work"] },
      { label: "A peaceful death", tags: ["A Peaceful Death"] },
    ],
  },
  {
    label: "Land & Animals",
    options: [
      { label: "Farming & crops", tags: ["Farming / Crops"] },
      { label: "Animals & pets", tags: ["Animals / Livestock"] },
    ],
  },
];

/* Dimension weights are aligned with the multi-path discovery goal (CLAUDE.md
   §1/§10): the quiz should surface a relatable patron across the *whole* corpus,
   not just the intercession-tagged minority. Weights track the relatability
   paths (story / calling / life) and the facets' real coverage:

     dimension     weight  coverage   path (§1)
     experience      3      56.0%     "a story you relate to"   ← lead signal
     vocation        3      21.7%     "a vocation you relate to"← lead signal
     family          2      24.1%     "a life you relate to"
     virtue          2      69.0%     aspiration
     intercession    2      18.6%     need-matching — the NARROWEST path (§10),
                                       kept meaningful but no longer dominant

   The "where are you from" (origin) and "which tradition" (tradition) questions
   were removed: they ask about background/affinity rather than the seeker's
   lived situation, and tested poorly against the goal of matching a *relatable*
   patron. (Region and Tradition remain full facets in the finder for browsing.)

   Intercession used to be the single highest weight (3) yet is the sparsest
   facet (18.6%), so the ~500 tagged saints crowded out the other ~81% even when
   those matched strongly on story/calling. It is now a mid weight, below the two
   lead relatability signals, so a story+calling match outranks an
   intercession-only match. Order leads with story rather than the affliction
   path, mirroring the §1 reframe. Scores are normalized per dimension in
   quizMatches() (a dimension counts its weight once) so a sparse-but-high-weight
   facet cannot dominate by stacking many tags. */
export const QUIZ: QuizGroup[] = [
  {
    key: "experience",
    weight: 3,
    kicker: "Your Story",
    q: "What are you walking through right now?",
    sub: "Choose whatever fits — the saints have been there too.",
    optionGroups: EXPERIENCE_OPTION_GROUPS,
  },
  {
    key: "vocation",
    weight: 3,
    kicker: "Your Calling",
    q: "What do you spend your days doing?",
    optionGroups: VOCATION_OPTION_GROUPS,
  },
  {
    key: "family",
    weight: 2,
    kicker: "Your Life",
    q: "What season of life are you in?",
    optionGroups: FAMILY_OPTION_GROUPS,
  },
  {
    key: "virtue",
    weight: 2,
    kicker: "Your Hopes",
    q: "Who do you hope to become?",
    sub: "Choose what you long to grow in — God meets us through saints who walked the same road.",
    optionGroups: VIRTUE_OPTION_GROUPS,
  },
  {
    key: "intercession",
    weight: 2,
    kicker: "Your Request",
    q: "What would you like to ask a saint to pray for?",
    sub: "Whatever your need — there is a saint who has carried it to God.",
    optionGroups: INTERCESSION_OPTION_GROUPS,
  },
];

type FacetSource = Record<string, unknown>;
export type QuizSelected = Record<string, Set<string>>;

export function emptyQuizSelected(): QuizSelected {
  const sel: QuizSelected = {};
  QUIZ.forEach((g) => (sel[g.key] = new Set()));
  return sel;
}

/* Distinct option values for a quiz facet, most common first. Used only by the
   plain (unmapped) questions; mapped questions render from `optionGroups`. */
export function optionsFor(saints: FacetSource[], key: string): string[] {
  return facetCounts(saints, key).map(([v]) => v);
}

/** A controlled-vocab tag in a named saint-record facet. */
interface TagRef {
  facet: string;
  tag: string;
}

/* The (facet, tag) references a chosen option scores against. A plain question's
   label is itself a tag in the question's own facet; a mapped option resolves to
   its own-facet `tags` plus any cross-facet tags (e.g. church / family). */
function refsForChoice(g: QuizGroup, label: string): TagRef[] {
  if (!g.optionGroups) return [{ facet: g.key, tag: label }];
  for (const grp of g.optionGroups)
    for (const o of grp.options)
      if (o.label === label) {
        const refs: TagRef[] = (o.tags ?? []).map((tag) => ({
          facet: g.key,
          tag,
        }));
        for (const [facet, tags] of Object.entries(o.cross ?? {}))
          for (const tag of tags) refs.push({ facet, tag });
        return refs;
      }
  return [];
}

/** One matched value, tagged with the question it came from so the result UI
   can show the user transparently what they matched on, grouped by dimension. */
export interface QuizReason {
  /** quiz group key (e.g. "experience") */
  key: string;
  /** the question's short label (e.g. "Your Story") */
  kicker: string;
  /** the facet value the user picked that this saint shares (e.g. "Grief") */
  value: string;
}

export interface QuizMatch<T> {
  s: T;
  score: number;
  reasons: QuizReason[];
}

/* Score every saint by weighted overlap with the quiz answers. */
export function quizMatches<T extends FacetSource & { name: string }>(
  saints: T[],
  selected: QuizSelected,
): QuizMatch<T>[] {
  const out: QuizMatch<T>[] = [];
  for (const s of saints) {
    let score = 0;
    const reasons: QuizReason[] = [];
    // Cache this saint's value-set per facet: a mapped option may reference more
    // than one facet (a "calling" answer reaching into Church Status / Family).
    const facetVals = new Map<string, Set<string>>();
    const valsIn = (facet: string) => {
      let set = facetVals.get(facet);
      if (!set) {
        set = new Set(valuesOf(s, facet));
        facetVals.set(facet, set);
      }
      return set;
    };
    for (const g of QUIZ) {
      const { key, weight, kicker } = g;
      const chosen = selected[key];
      if (!chosen.size) continue;
      // A mapped question stores the user-facing label in the selection set; we
      // expand each label to its (facet, tag) refs and test against the saint's
      // values in those facets. A plain question's label is already a tag in its
      // own facet (refsForChoice returns it unchanged), so both paths share this
      // loop. The reason we show the seeker is their chosen LABEL, not the raw
      // DB tag behind it.
      let dimMatched = false;
      for (const choice of chosen)
        if (refsForChoice(g, choice).some((r) => valsIn(r.facet).has(r.tag))) {
          dimMatched = true;
          reasons.push({ key, kicker, value: choice });
        }
      // Normalize per dimension: a matched dimension contributes its weight
      // ONCE, regardless of how many values matched. This keeps a sparse but
      // high-weight facet (e.g. Intercession, ~18.6% covered) from dominating
      // the leaderboard by stacking several tags — breadth across the
      // relatability dimensions wins; depth within one is only a tie-break.
      if (dimMatched) score += weight;
    }
    if (score > 0) out.push({ s, score, reasons });
  }
  out.sort(
    (a, b) =>
      b.score - a.score ||
      // tie-break: more individual values matched (richer overlap), then name.
      b.reasons.length - a.reasons.length ||
      cleanName(a.s.name).localeCompare(cleanName(b.s.name)),
  );
  return out;
}

/* ── Result tiering — the "circle of companions" result page ──
   The single-patron framing ("Your patron saint is St N") is gone. Patronage is
   rich and multifaceted, so the ranked matches are split into confidence bands —
   a small lead set of the strongest matches, then a wider "you may also like"
   set — inviting exploration rather than implying one correct answer (the
   multi-path discovery goal, §1). Bands are score-based: the lead set is the top
   matches, never splitting a score tie across the boundary, clamped to
   [TIER_TOP_MIN, TIER_TOP_MAX]; the next set takes up to TIER_MORE_MAX more. */
export const TIER_TOP_MIN = 3;
export const TIER_TOP_MAX = 5;
export const TIER_MORE_MAX = 10;

export interface QuizTiers<T> {
  /** "Especially Recommended for You" — the strongest band (3–5). */
  especially: QuizMatch<T>[];
  /** "You May Also Like" — the next band (up to 10). */
  alsoLike: QuizMatch<T>[];
}

export function tierMatches<T>(matched: QuizMatch<T>[]): QuizTiers<T> {
  if (!matched.length) return { especially: [], alsoLike: [] };
  // Lead set: at least TIER_TOP_MIN matches, extended through any score tie at
  // the boundary so equally-strong matches never split across tiers, capped at
  // TIER_TOP_MAX.
  let end = Math.min(TIER_TOP_MIN, matched.length);
  while (
    end < matched.length &&
    end < TIER_TOP_MAX &&
    matched[end].score === matched[end - 1].score
  )
    end++;
  return {
    especially: matched.slice(0, end),
    alsoLike: matched.slice(end, end + TIER_MORE_MAX),
  };
}

/* ── "Explore Similar Saints" — facet chips that deep-link into the finder ──
   A handful of chips drawn from the lead matches, one per dimension, each linking
   to /search pre-filtered by that facet value — turning the result into a
   launchpad into the whole catalog (§1), including dimensions the quiz never asks
   about (Region, Era, Century). Each chip's value is the most common REAL facet
   value among the given saints — the exact controlled-vocab term the finder
   filters on — so every chip lands on a populated result. */
const EXPLORE_FACETS: { facet: string; kind: string }[] = [
  { facet: "experience", kind: "Struggle" },
  { facet: "vocation", kind: "Vocation" },
  { facet: "origin", kind: "Region" },
  { facet: "era", kind: "Era" },
  { facet: "century", kind: "Century" },
  { facet: "rank", kind: "Rank" },
];

export interface ExploreLink {
  /** finder facet key — also the URL query param the finder seeds from */
  facet: string;
  /** human dimension label shown as the chip's eyebrow */
  kind: string;
  /** the controlled-vocab value to filter by */
  value: string;
}

export function exploreLinks<T extends FacetSource>(
  saints: T[],
): ExploreLink[] {
  const out: ExploreLink[] = [];
  for (const { facet, kind } of EXPLORE_FACETS) {
    const counts = new Map<string, number>();
    for (const s of saints)
      for (const v of valuesOf(s, facet))
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    if (!counts.size) continue;
    // Most common value wins; ties broken alphabetically for stable output.
    const [value] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0];
    out.push({ facet, kind, value });
  }
  return out;
}
