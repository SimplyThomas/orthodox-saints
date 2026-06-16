/* Rich saint profiles — an OPTIONAL editorial layer over the canonical saints
   dataset, mirroring the witnesses/ephraim pattern. data/saints.csv stays the
   finder/facet source of truth and is deliberately terse; long-form encyclopedic
   content (biography, timeline, family, legacy, works) lives here and is rendered
   by SaintProfile.astro only when SAINT_PROFILES[id] exists. All prose is original,
   factual, and encyclopedic — no devotional language, no prayers, sourced facts.
   Subject to clergy/source review before launch (CLAUDE.md §9). */
import type { TimelineEntry, RelatedFigure } from "./ephraim";

/** A headed block of prose — Major Contributions, Legacy, "Why the Great". */
export interface ProfileSection {
  heading: string;
  body: string[]; // one entry per paragraph
}
export interface ProfileWork {
  title: string;
  desc: string;
}
export interface ReadingItem {
  title: string;
  author?: string;
}
export interface ReadingGroup {
  heading: string;
  items: ReadingItem[];
}
export interface FamilyGroup {
  heading: string;
  intro?: string;
  figures: RelatedFigure[]; // RelatedFigure.note carries the relation ("sister", …)
}

export interface SaintProfile {
  id: string; // must match a row in data/saints.csv
  lifespan?: string; // e.g. "c. 329 – 379 · Archbishop of Caesarea in Cappadocia"
  overview: string[]; // expanded biography — presence triggers the rich render
  timeline?: TimelineEntry[];
  sections?: ProfileSection[];
  family?: FamilyGroup;
  related?: RelatedFigure[];
  patronage?: string[];
  themes?: string[];
  works?: ProfileWork[]; // supersedes the plain CSV Works/About on this saint's page
  reading?: ReadingGroup[];
}

export const SAINT_PROFILES: Record<string, SaintProfile> = {
  "OS-0021": {
    id: "OS-0021",
    lifespan: "c. 329 – 379 · Archbishop of Caesarea in Cappadocia",
    overview: [
      "Saint Basil the Great (c. 329–379) served as Archbishop of Caesarea in Cappadocia and ranks among the most consequential of the Church Fathers. He was born into a distinguished and devout Christian family of Cappadocia and received a thorough classical education in Caesarea, Constantinople, and Athens, where his fellow students included Gregory the Theologian.",
      "After his studies Basil withdrew into the ascetic life, traveling through Egypt, Palestine, Syria, and Mesopotamia to observe the monastic communities flourishing there. From what he learned he drew together principles for communal monasticism that would become foundational for the Eastern Orthodox monastic tradition.",
      "Consecrated Archbishop of Caesarea in 370, Basil emerged during a period of fierce doctrinal conflict as one of the foremost defenders of Nicene Christianity against Arianism and kindred teachings. His theological writing did much to clarify the Church's confession of the Holy Trinity, and especially the divinity of the Holy Spirit.",
      "Basil was equally known for organized works of mercy. On the outskirts of Caesarea he founded a large charitable complex — housing for travelers, care for the poor, and facilities for the sick — that later generations called the Basiliad, among the most significant philanthropic undertakings of the early Christian world.",
      "A prolific author and preacher, he produced theological treatises, scriptural commentary, monastic rules, letters, and homilies, and his influence reached into liturgy, social ethics, and pastoral practice. He reposed on January 1, 379. Together with Gregory the Theologian and John Chrysostom he is honored as one of the Three Holy Hierarchs, and the Divine Liturgy that bears his name is still celebrated in the Orthodox Church on appointed days through the year.",
    ],
  },
};
