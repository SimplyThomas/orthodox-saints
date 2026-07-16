/* Liturgical colors & fasting indicators for the interactive calendar.
   Pure and client-safe (no fs, no DOM) — the /calendar island feeds it the
   trimmed Feasts & Fasts payload and asks "what does this day look like".

   IMPORTANT EDITORIAL FRAME (do not drift): these are "liturgical colors
   commonly used in Orthodox practice", NOT a universally binding Orthodox
   color code. The Church broadly distinguishes bright/festal from
   dark/penitential; detailed assignments vary by jurisdiction, diocese,
   parish, and available vestments. Rules below follow a single
   "general-orthodox" guide informed primarily by commonly observed Greek
   (GOARCH) practice with other established customs recorded as alternates —
   see docs/liturgical-colors.md for sources and rationale. When the data
   cannot support an assignment we show NEUTRAL rather than guess.

   Colors attach to FEAST RECORDS (FF ids / category / dedication), never to
   hard-coded civil dates, so the New/Old Calendar toggle shifts fixed feasts
   and their colors together while the Paschal cycle stays put. */

import type { DateToken, PaschaTable } from "./feast-dates";
import { resolveToken } from "./feast-dates";
import { JULIAN_OFFSET_DAYS } from "./calendar-grid";

/* ================= palette ================= */

export type ColorKey =
  "gold" | "white" | "blue" | "red" | "green" | "purple" | "dark" | "neutral";

export interface LiturgicalColor {
  label: string;
  /** muted day-tile tint — light enough for dark accessible text */
  background: string;
  /** the tile's top accent strip + legend swatch */
  accent: string;
  /** text tone on the tinted tile */
  text: string;
}

export const LITURGICAL_COLORS: Record<ColorKey, LiturgicalColor> = {
  gold: {
    label: "Gold",
    background: "#f7f0d8",
    accent: "#a98224",
    text: "#4a3a16",
  },
  white: {
    label: "White",
    background: "#fbfaf5",
    accent: "#c7bfa8",
    text: "#34322d",
  },
  blue: {
    label: "Blue",
    background: "#e7eef8",
    accent: "#466b9e",
    text: "#253b59",
  },
  red: {
    label: "Red",
    background: "#f6e6e4",
    accent: "#9a3e38",
    text: "#5f2521",
  },
  green: {
    label: "Green",
    background: "#e6f0e7",
    accent: "#4e7653",
    text: "#2d4b31",
  },
  purple: {
    label: "Purple",
    background: "#eee7f2",
    accent: "#6b4a78",
    text: "#45304e",
  },
  dark: {
    label: "Dark",
    background: "#e9e6ea",
    accent: "#3e3742",
    text: "#28232b",
  },
  neutral: {
    label: "No special color assigned",
    background: "transparent",
    accent: "transparent",
    text: "inherit",
  },
};

/* ================= fasting ================= */

/** Keyed by the `Fasting Discipline` controlled vocabulary — the calendar
    never infers a rule from weekday/season on its own; no data, no badge.
    (The weekly Wed/Fri fast is a rule, not an event — §5a — so ordinary
    weekdays intentionally carry no indicator.) */
export interface FastingLevel {
  key: string;
  label: string;
  /** compact letterform for the day-tile badge (full label in tooltip/legend) */
  glyph: string;
  /** per-day guidance shown under the fasting row in the panel/legend */
  note?: string;
}

export const FASTING_LEVELS: Record<string, FastingLevel> = {
  "Strict Fast": { key: "strict", label: "Strict Fast", glyph: "S" },
  "Wine & Oil": { key: "wine", label: "Wine & Oil Allowed", glyph: "W" },
  "Fish Allowed": {
    key: "fish",
    label: "Fish, Wine & Oil Allowed",
    glyph: "F",
  },
  "Dairy Allowed": {
    key: "dairy",
    label: "Dairy, Eggs & Fish Allowed (no meat)",
    glyph: "D",
  },
  "Fast-Free": { key: "free", label: "Fast-Free", glyph: "FF" },
  // Where the data records "Varies" (the Great Lent season), show the
  // strictest traditional rule as the baseline rather than shrugging —
  // with the consult-your-priest note carried on every such day.
  Varies: {
    key: "varies",
    label: "Strict Fast (traditional rule)",
    glyph: "S*",
    note: "Fasting practice during this season varies by jurisdiction and person — speak with your parish priest about what is right for you.",
  },
};

/* ================= per-feast color rules ================= */

export type Confidence = "high" | "medium" | "local-custom" | "unknown";

export interface ServiceColor {
  service: string;
  color: ColorKey;
  note: string;
}

export interface ColorRule {
  color: ColorKey;
  reason: string;
  confidence: Confidence;
  /** known variation — never displayed as the tile color, only explained */
  alternate?: ColorKey;
  note?: string;
  /** appended only when the day is a Sunday (Lenten-Sunday nuance) */
  sundayNote?: string;
  serviceColors?: ServiceColor[];
}

/** Keyed by FF id so the rule follows the feast through either calendar
    style. Category/dedication fallbacks below cover unlisted feasts;
    everything else is NEUTRAL by design ("never guess"). */
export const OBSERVANCE_COLOR_RULES: Record<string, ColorRule> = {
  /* — Pascha & the paschal season — */
  "FF-0001": { color: "white", reason: "Holy Pascha", confidence: "high" },
  "FF-0050": { color: "white", reason: "Bright Week", confidence: "high" },

  /* — Great Feasts of the Lord — */
  "FF-0005": {
    color: "white",
    alternate: "gold",
    reason: "Nativity of Christ",
    confidence: "medium",
  },
  "FF-0006": {
    color: "white",
    alternate: "gold",
    reason: "Holy Theophany",
    confidence: "medium",
  },
  "FF-0007": {
    color: "white",
    alternate: "blue",
    reason: "Meeting of the Lord in the Temple",
    confidence: "local-custom",
    note: "Some traditions keep the Meeting in blue alongside feasts of the Theotokos.",
  },
  "FF-0012": {
    color: "gold",
    alternate: "white",
    reason: "Transfiguration of the Lord",
    confidence: "medium",
  },
  "FF-0010": {
    color: "white",
    reason: "Ascension of the Lord",
    confidence: "medium",
  },
  "FF-0011": { color: "green", reason: "Holy Pentecost", confidence: "high" },
  "FF-0009": {
    color: "gold",
    alternate: "green",
    reason: "Palm Sunday — the Entry of the Lord into Jerusalem",
    confidence: "local-custom",
  },

  /* — Feasts of the Theotokos — */
  "FF-0002": {
    color: "blue",
    reason: "Nativity of the Theotokos",
    confidence: "high",
  },
  "FF-0004": {
    color: "blue",
    reason: "Entry of the Theotokos into the Temple",
    confidence: "high",
  },
  "FF-0008": {
    color: "blue",
    reason: "Annunciation of the Theotokos",
    confidence: "high",
  },
  "FF-0013": {
    color: "blue",
    reason: "Dormition of the Theotokos",
    confidence: "high",
  },
  "FF-0067": {
    color: "blue",
    reason: "Protection of the Most Holy Theotokos",
    confidence: "medium",
  },
  "FF-0069": {
    color: "blue",
    reason: "Deposition of the Robe of the Theotokos",
    confidence: "medium",
  },
  "FF-0070": {
    color: "blue",
    reason: "Deposition of the Cincture of the Theotokos",
    confidence: "medium",
  },
  "FF-0041": {
    color: "blue",
    reason: "Saturday of the Akathist to the Theotokos",
    confidence: "medium",
  },
  "FF-0017": {
    color: "blue",
    reason: "The Dormition Fast",
    confidence: "local-custom",
    note: "Blue for the Dormition Fast follows commonly observed Greek and Antiochian custom; practice varies.",
  },

  /* — the Cross — */
  "FF-0003": {
    color: "red",
    alternate: "green",
    reason: "Exaltation of the Holy Cross",
    confidence: "local-custom",
  },
  "FF-0068": {
    color: "red",
    reason: "Procession of the Precious Cross",
    confidence: "medium",
  },
  "FF-0038": {
    color: "red",
    alternate: "purple",
    reason: "Sunday of the Veneration of the Cross",
    confidence: "local-custom",
  },

  /* — red commemorations — */
  "FF-0020": {
    color: "red",
    reason: "Beheading of St John the Baptist",
    confidence: "high",
  },

  /* — Great Lent & Holy Week — */
  "FF-0014": {
    color: "purple",
    reason: "Great Lent",
    confidence: "high",
    sundayNote:
      "Sundays of Great Lent are often served in brighter colors; local practice varies.",
  },
  "FF-0031": {
    color: "neutral",
    reason: "Forgiveness Sunday",
    confidence: "high",
    serviceColors: [
      {
        service: "Forgiveness Vespers",
        color: "purple",
        note: "Great Lent begins with the change to Lenten vestments.",
      },
    ],
  },
  "FF-0043": {
    color: "gold",
    reason: "Lazarus Saturday",
    confidence: "medium",
  },
  "FF-0015": {
    color: "purple",
    reason: "Holy Week",
    confidence: "high",
  },
  "FF-0044": {
    color: "purple",
    reason: "Great and Holy Monday",
    confidence: "high",
  },
  "FF-0045": {
    color: "purple",
    reason: "Great and Holy Tuesday",
    confidence: "high",
  },
  "FF-0046": {
    color: "purple",
    reason: "Great and Holy Wednesday",
    confidence: "high",
  },
  "FF-0047": {
    color: "purple",
    reason: "Great and Holy Thursday",
    confidence: "local-custom",
    serviceColors: [
      {
        service: "Vesperal Divine Liturgy",
        color: "red",
        note: "Some traditions serve the Vesperal Divine Liturgy in red or bright vestments.",
      },
    ],
  },
  "FF-0048": {
    color: "dark",
    reason: "Great and Holy Friday",
    confidence: "high",
  },
  "FF-0049": {
    color: "dark",
    reason: "Great and Holy Saturday",
    confidence: "high",
    serviceColors: [
      {
        service: "Vesperal Divine Liturgy",
        color: "white",
        note: "The church changes from dark to bright vestments.",
      },
    ],
  },

  /* — Pentecost season — */
  "FF-0062": {
    color: "green",
    reason: "Monday of the Holy Spirit",
    confidence: "high",
  },
  "FF-0023": {
    color: "green",
    reason: "Trinity Week",
    confidence: "medium",
  },

  /* — the Church year — */
  "FF-0066": {
    color: "gold",
    reason: "Beginning of the Indiction — the Church New Year",
    confidence: "medium",
  },
};

/* ================= observance computation ================= */

/** The trimmed per-feast payload the calendar page inlines. */
export interface LitFeast {
  id: string;
  name: string;
  category: string;
  dedication?: string;
  fasting?: string;
  begins: DateToken;
  ends?: DateToken;
  forefeast?: DateToken;
  apodosis?: DateToken;
}

export type ObservanceRole =
  "day" | "span" | "forefeast" | "afterfeast" | "leavetaking";

export interface ActiveObservance {
  feast: LitFeast;
  role: ObservanceRole;
}

export type CalendarStyle = "new" | "old";

function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** Resolve a token to the CIVIL date it is kept on in `year`'s cycle under
    the given calendar style. Old style shifts fixed dates (and weekday
    anchors) 13 civil days later; the paschal cycle is identical under both
    reckonings, so paschal tokens never shift. */
export function resolveTokenCivil(
  token: DateToken,
  year: number,
  pascha: PaschaTable,
  style: CalendarStyle,
): Date | null {
  if (style === "new" || token.type === "paschal") {
    return resolveToken(token, year, pascha);
  }
  if (token.type === "fixed") {
    return addDays(localDate(year, token.month, token.day), JULIAN_OFFSET_DAYS);
  }
  // anchored: shift the anchor to its civil day, then find the weekday.
  const anchor = addDays(
    localDate(year, token.month, token.day),
    JULIAN_OFFSET_DAYS,
  );
  const step = token.rel === "before" ? -1 : 1;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(anchor, step * i);
    if (d.getDay() === token.dow) return d;
  }
  return null;
}

/** Every observance active on the given civil date under the given style.
    Spans wrap the civil New Year when both endpoints are fixed (e.g. the
    Nativity-to-Theophany fast-free days); a hybrid span whose fixed end
    precedes its paschal start (a very late Pascha squeezing the Apostles'
    Fast to nothing) is simply inactive that year. */
export function activeObservances(
  feasts: LitFeast[],
  pascha: PaschaTable,
  date: Date,
  style: CalendarStyle,
): ActiveObservance[] {
  const t = localDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  ).getTime();
  const out: ActiveObservance[] = [];
  for (const f of feasts) {
    let matched: ObservanceRole | null = null;
    // Old-style fixed dates spill into the next civil year; spans cross it.
    for (const y of [
      date.getFullYear() - 1,
      date.getFullYear(),
      date.getFullYear() + 1,
    ]) {
      const begin = resolveTokenCivil(f.begins, y, pascha, style);
      if (!begin) continue;
      let end = f.ends ? resolveTokenCivil(f.ends, y, pascha, style) : begin;
      if (!end) end = begin;
      if (end.getTime() < begin.getTime()) {
        if (f.begins.type === "fixed" && f.ends?.type === "fixed") {
          end = resolveTokenCivil(f.ends, y + 1, pascha, style) ?? end;
        } else {
          continue; // squeezed-out hybrid span
        }
      }
      if (t >= begin.getTime() && t <= end.getTime()) {
        matched = f.ends ? "span" : "day";
        break;
      }
      if (f.forefeast) {
        const ff = resolveTokenCivil(f.forefeast, y, pascha, style);
        if (ff && t >= ff.getTime() && t < begin.getTime()) {
          matched = "forefeast";
          break;
        }
      }
      if (f.apodosis) {
        const ap = resolveTokenCivil(f.apodosis, y, pascha, style);
        if (ap && t > begin.getTime() && t <= ap.getTime()) {
          matched = t === ap.getTime() ? "leavetaking" : "afterfeast";
          break;
        }
      }
    }
    if (matched) out.push({ feast: f, role: matched });
  }
  return out;
}

/* ================= precedence & resolution ================= */

/** Higher rank wins the day's main color. Mirrors the spec's COLOR_PRIORITY:
    Pascha > Great Feasts of the Lord > of the Theotokos > Holy Week days >
    Cross feasts > named observances > afterfeast inheritance > minor feasts >
    seasons > fast-free weeks > ordinary Sundays > neutral. */
function classRank(f: LitFeast, role: ObservanceRole): number {
  if (role === "forefeast") return 5; // badge only — never colors the day
  if (f.id === "FF-0001" && role !== "afterfeast" && role !== "leavetaking")
    return 100;
  if (f.id === "FF-0050") return 95;
  // the NAMED Holy Week days — the Holy Week Fast span stays a season (50)
  // so that Great Friday's dark outranks the season's purple
  const holyWeek = [
    "FF-0044",
    "FF-0045",
    "FF-0046",
    "FF-0047",
    "FF-0048",
    "FF-0049",
  ];
  if (role === "afterfeast" || role === "leavetaking") return 60;
  if (f.category === "Great Feast") {
    if (f.dedication === "Lord") return 90;
    if (f.dedication === "Theotokos") return 88;
    if (f.dedication === "Cross") return 84;
    return 85;
  }
  if (holyWeek.includes(f.id)) return 86;
  if (OBSERVANCE_COLOR_RULES[f.id]) {
    // a named day/observance with an explicit rule (Lazarus Saturday,
    // Sunday of the Cross, Beheading, Holy Spirit Monday, …)
    if (!f.ends) return 70;
    // colored spans: seasons at 50, fast-free weeks at 40
    return f.category === "Fast-Free Week" ? 40 : 50;
  }
  if (f.category === "Feast") return 55;
  return 10; // uncolored observances — badge/context only
}

function fallbackRule(f: LitFeast): ColorRule | null {
  // minor feasts without an explicit rule: dedication decides; the bright
  // festal default is gold (never green — and never "Ordinary Time").
  if (f.category === "Great Feast" || f.category === "Feast") {
    if (f.dedication === "Theotokos")
      return { color: "blue", reason: f.name, confidence: "medium" };
    if (f.dedication === "Cross")
      return { color: "red", reason: f.name, confidence: "medium" };
    return { color: "gold", reason: f.name, confidence: "medium" };
  }
  return null;
}

function ruleFor(f: LitFeast, role: ObservanceRole): ColorRule | null {
  const base = OBSERVANCE_COLOR_RULES[f.id] ?? fallbackRule(f);
  if (!base) return null;
  if (role === "forefeast") return null;
  if (role === "afterfeast" || role === "leavetaking") {
    // an afterfeast/leavetaking inherits its principal feast's color
    return {
      ...base,
      reason: `${role === "leavetaking" ? "Leavetaking" : "Afterfeast"} of the ${f.name}`,
      confidence: base.confidence === "high" ? "medium" : base.confidence,
      serviceColors: undefined,
    };
  }
  return base;
}

/* ---- badges (labels, not colors — shown in the day panel) ---- */

export function buildBadges(observances: ActiveObservance[]): string[] {
  const badges: string[] = [];
  const add = (b: string) => {
    if (!badges.includes(b)) badges.push(b);
  };
  const holyWeek = [
    "FF-0015",
    "FF-0043",
    "FF-0044",
    "FF-0045",
    "FF-0046",
    "FF-0047",
    "FF-0048",
    "FF-0049",
  ];
  for (const { feast: f, role } of observances) {
    if (role === "forefeast") add("Forefeast");
    if (role === "afterfeast") add("Afterfeast");
    if (role === "leavetaking") add("Leavetaking");
    if (role === "forefeast" || role === "afterfeast" || role === "leavetaking")
      continue;
    if (f.category === "Feast of Feasts" || f.category === "Great Feast")
      add("Great Feast");
    if (f.category === "Fast Season" || f.category === "Fast Day") add("Fast");
    if (f.category === "Fast-Free Week") add("Fast-Free");
    if (holyWeek.includes(f.id)) add("Holy Week");
    if (f.dedication === "Lord") add("Feast of the Lord");
    if (f.dedication === "Theotokos") add("Feast of the Theotokos");
    if (f.dedication === "Cross") add("Holy Cross");
    if (f.dedication === "Departed") add("Memorial");
    if (/synaxis/i.test(f.name)) add("Synaxis");
  }
  return badges;
}

/* ---- fasting: use the data's own rule; never infer from the weekday ---- */

export function resolveFasting(
  observances: ActiveObservance[],
): FastingLevel | null {
  let best: { level: FastingLevel; rank: number } | null = null;
  for (const { feast: f, role } of observances) {
    // a feast's fasting field describes the feast DAY (and a season/week its
    // span) — forefeast/afterfeast days do not inherit it
    if (!f.fasting || (role !== "day" && role !== "span")) continue;
    const level = FASTING_LEVELS[f.fasting];
    if (!level) continue;
    // a day-specific rule beats a week's, a week's beats a season's
    const rank = role === "day" ? 3 : f.category === "Fast-Free Week" ? 2 : 1;
    if (!best || rank > best.rank) best = { level, rank };
  }
  return best?.level ?? null;
}

/* ================= the day resolver ================= */

export interface DayLiturgics {
  color: ColorKey;
  colorLabel: string;
  reason: string;
  confidence: Confidence;
  /** variation / context notes for the expanded day view */
  notes: string[];
  serviceColors: ServiceColor[];
  fasting: FastingLevel | null;
  badges: string[];
}

const VARIATION_NOTE =
  "Liturgical color customs vary among Orthodox jurisdictions and parishes.";

export function dayLiturgics(
  observances: ActiveObservance[],
  date: Date,
): DayLiturgics {
  const isSunday = date.getDay() === 0;

  // best colored candidate by precedence
  let bestRank = -1;
  let best: ColorRule | null = null;
  for (const o of observances) {
    const rule = ruleFor(o.feast, o.role);
    if (!rule) continue;
    const rank = classRank(o.feast, o.role);
    if (rank > bestRank) {
      bestRank = rank;
      best = rule;
    }
  }

  // ordinary Sundays are bright (gold) unless something outranks them
  if (isSunday && (!best || bestRank < 20)) {
    best = {
      color: "gold",
      reason: "Sunday — the weekly commemoration of the Resurrection",
      confidence: "medium",
    };
  }

  const notes: string[] = [];
  const serviceColors: ServiceColor[] = [];
  for (const o of observances) {
    const rule = OBSERVANCE_COLOR_RULES[o.feast.id];
    if (rule?.serviceColors && (o.role === "day" || o.role === "span")) {
      serviceColors.push(...rule.serviceColors);
    }
  }

  let color: ColorKey;
  let reason: string;
  let confidence: Confidence;
  if (best) {
    color = best.color;
    reason = best.reason;
    confidence = best.confidence;
    if (best.note) notes.push(best.note);
    if (best.alternate) {
      notes.push(
        `Local practice may use ${LITURGICAL_COLORS[best.alternate].label.toLowerCase()} instead.`,
      );
    }
    if (isSunday && best.sundayNote) notes.push(best.sundayNote);
    if (confidence === "medium" || confidence === "local-custom") {
      notes.push(VARIATION_NOTE);
    }
  } else {
    color = "neutral";
    confidence = "unknown";
    // if a season/observance is active but carries no responsible color
    // assignment, say so rather than inventing one
    const top = [...observances].sort(
      (a, b) => classRank(b.feast, b.role) - classRank(a.feast, a.role),
    )[0];
    reason =
      top && top.role !== "forefeast"
        ? `${top.feast.name} — no single color is assigned; customs vary`
        : "No special liturgical color assigned";
  }

  return {
    color,
    colorLabel: LITURGICAL_COLORS[color].label,
    reason,
    confidence,
    notes,
    serviceColors,
    fasting: resolveFasting(observances),
    badges: buildBadges(observances),
  };
}
