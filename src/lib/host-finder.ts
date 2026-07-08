/* Bridges the Heavenly Hosts DB (HH-####) into the saints FINDER dataset so the
   archangels surface in browse / search / the patron quiz. Only the ARCHANGELS
   (Named Angels of the Archangels order) are cross-listed; the ranks and other
   hosts stay in the Heavenly Hosts section. Their finder cards route to
   /host/HH-#### (see recordHref / isHostRecord in format.ts), NOT the saint route.

   Angels carry no facet tags of their own, so the quiz can't match them without
   patronages. This maps each archangel to its well-attested intercessions /
   vocations (controlled-vocab terms from data/vocabulary.csv) so the "find a
   patron" quiz can suggest them. Refine freely — this is the pastoral mapping. */
import { readFileSync } from "node:fs";
import type { FinderSaint } from "./types";
import type { Host } from "./hosts";

const HOSTS = (
  JSON.parse(readFileSync("public/hosts.json", "utf8")) as { hosts: Host[] }
).hosts;

interface Patronage {
  intercession?: string[];
  vocation?: string[];
}

// Keyed by Host ID. Terms MUST exist in the Commonly Asked Intercessions /
// Vocation vocabularies (data/vocabulary.csv) or the quiz/browse won't match.
const PATRONAGE: Record<string, Patronage> = {
  "HH-0010": {
    // Michael — protection, spiritual warfare, the dying
    intercession: [
      "Protection from Danger",
      "Deliverance from the Occult",
      "A Peaceful Death",
    ],
    vocation: ["Soldier", "Officer / General"],
  },
  "HH-0011": {
    // Gabriel — the Annunciation; expectant mothers, children
    intercession: ["Pregnancy", "Childbirth", "Children"],
  },
  "HH-0012": {
    // Raphael — healing, travelers, physicians (Tobit)
    intercession: ["Healing", "Travel", "Protection from Illness / Epidemic"],
    vocation: ["Physician", "Nurse"],
  },
  "HH-0013": {
    // Uriel — wisdom, illumination, learning
    intercession: ["Education"],
    vocation: ["Scholar", "Teacher"],
  },
  // Selaphiel (HH-0014) — prayer: no vocab facet; browse/search only.
  "HH-0015": {
    // Jegudiel — faithful labor, work
    intercession: ["Employment"],
  },
  "HH-0016": {
    // Barachiel — blessing, family, the harvest
    intercession: ["Farming / Crops", "Children", "Marriage"],
    vocation: ["Farmer"],
  },
  "HH-0017": {
    // Jeremiel — mercy, repentance, the hope of eternity
    intercession: ["A Peaceful Death"],
  },
};

/** The archangels as FinderSaint records, for appending to FINDER_SAINTS. */
export function archangelFinderSaints(): FinderSaint[] {
  return HOSTS.filter(
    (h) => h.entityType === "Named Angel" && h.order === "Archangels",
  ).map((h) => {
    const pat = PATRONAGE[h.id] ?? {};
    const intercession = pat.intercession ?? [];
    const vocation = pat.vocation ?? [];
    const search = [
      h.name,
      ...(h.aka ?? []),
      "archangel",
      "angel",
      "bodiless powers",
      ...intercession,
      ...vocation,
    ]
      .join(" ")
      .toLowerCase();
    return {
      id: h.id,
      name: h.name,
      aka: h.aka ?? [],
      rank: ["Archangel"],
      church: [],
      family: [],
      vocation,
      experience: [],
      virtue: [],
      intercession,
      origin: [],
      tradition: ["Pan-Orthodox"],
      gender: "",
      era: "",
      century: "",
      feast: (h.feasts ?? ["Nov 8"]).join("; "),
      feastSort: 1108, // Nov 8 (month*100 + day), matching build.py feast_sort
      brief: h.brief,
      notes: "",
      search,
      themes: [],
      ...(h.image ? { image: h.image } : {}),
      ...(h.imageThumb ? { imageThumb: h.imageThumb } : {}),
    };
  });
}
