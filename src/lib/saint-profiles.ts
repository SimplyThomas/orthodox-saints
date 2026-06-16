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
    timeline: [
      {
        when: "c. 329",
        title: "Born in Cappadocia",
        body: "Into a distinguished Christian family.",
      },
      {
        when: "356",
        title: "Embraced the ascetic life",
        body: "After travels among the monastic communities of Egypt, Palestine, Syria, and Mesopotamia.",
      },
      {
        when: "364",
        title: "Ordained presbyter",
        body: "Serving the Church of Caesarea.",
      },
      {
        when: "370",
        title: "Consecrated Archbishop of Caesarea",
        body: "Leading the Church through the Arian controversy.",
      },
      {
        when: "375",
        title: "Completed On the Holy Spirit",
        body: "His treatise on the divinity of the Holy Spirit.",
      },
      {
        when: "379",
        title: "Reposed in the Lord",
        body: "Commemorated on January 1.",
      },
    ],
    family: {
      heading: "Holy Family of Cappadocia",
      intro:
        "Basil belonged to one of the most remarkable saintly families in Christian history; several of his close relations are themselves commemorated as saints.",
      figures: [
        {
          name: "Saint Macrina the Elder",
          note: "grandmother",
          href: "saint/OS-2474",
        },
        {
          name: "Saint Macrina the Younger",
          note: "sister",
          href: "saint/OS-1551",
        },
        {
          name: "Saint Gregory of Nyssa",
          note: "brother",
          href: "saint/OS-0422",
        },
        {
          name: "Saint Peter of Sebaste",
          note: "brother",
          href: "saint/OS-0420",
        },
        { name: "Saint Naucratius", note: "brother" },
      ],
    },
    related: [
      {
        name: "Saint Gregory the Theologian",
        note: "fellow Cappadocian Father",
        href: "saint/OS-0022",
      },
      {
        name: "Saint Gregory of Nyssa",
        note: "his brother",
        href: "saint/OS-0422",
      },
      {
        name: "Saint Macrina the Younger",
        note: "his sister",
        href: "saint/OS-1551",
      },
      {
        name: "Saint Peter of Sebaste",
        note: "his brother",
        href: "saint/OS-0420",
      },
      {
        name: "Saint John Chrysostom",
        note: "fellow Holy Hierarch",
        href: "saint/OS-0023",
      },
    ],
  },
};
