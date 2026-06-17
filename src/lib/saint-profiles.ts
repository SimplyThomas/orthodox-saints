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
    sections: [
      {
        heading: "Defender of Nicene Orthodoxy",
        body: [
          "During the Arian controversies of the fourth century Basil stood at the center of the defense of the Nicene faith, and his writings helped give lasting shape to the Orthodox confession of the Holy Trinity.",
        ],
      },
      {
        heading: "Theology of the Holy Spirit",
        body: [
          "His treatise On the Holy Spirit remains among the most important works of patristic theology, setting out the Church's confession of the full divinity of the Holy Spirit alongside the Father and the Son.",
        ],
      },
      {
        heading: "Founder of Organized Christian Charity",
        body: [
          "Basil established extensive institutions for the poor, the sick, and the traveler on the edge of Caesarea. The complex later called the Basiliad became a model for Christian philanthropy in the centuries that followed.",
        ],
      },
      {
        heading: "Father of Eastern Monasticism",
        body: [
          "Though monasticism preceded him, Basil's rules and counsel organized and stabilized communal monastic life across the Eastern Christian world, and they remain influential in Orthodox monasteries to this day.",
        ],
      },
      {
        heading: "Liturgical Legacy",
        body: [
          "The Divine Liturgy of Saint Basil the Great is appointed for the Sundays of Great Lent, the eves of the Nativity and of Theophany when so appointed, Holy Thursday, Holy Saturday, and his feast on January 1.",
        ],
      },
      {
        heading: "Legacy in Theology",
        body: [
          "Basil's defense of the Nicene faith helped shape the Church's confession of the Holy Trinity at a decisive moment, and his work on the Holy Spirit fed directly into the doctrine affirmed by the Second Ecumenical Council in 381. With Gregory the Theologian and his brother Gregory of Nyssa he is numbered among the Cappadocian Fathers, whose thought continues to inform Orthodox teaching.",
        ],
      },
      {
        heading: "Legacy in Monasticism",
        body: [
          "His rules and guidance gave communal monastic life an enduring shape — prayer, obedience, manual labor, charity, and a life shared in common — that countless Orthodox monasteries have followed ever since.",
        ],
      },
      {
        heading: "Legacy in Liturgical Life",
        body: [
          "The Liturgy that bears his name remains one of the principal eucharistic services of the Orthodox Church, preserving prayers long associated with him and reflecting his emphasis on God's saving work through history.",
        ],
      },
      {
        heading: "Legacy in Christian Charity",
        body: [
          "Basil held care for the poor and the sick to be inseparable from the Christian life. The institutions he founded near Caesarea anticipated the later hospitals, hospices, and shelters of the Christian world; historians often point to the Basiliad as one of the earliest large-scale Christian charitable complexes.",
        ],
      },
      {
        heading: "Legacy in Education",
        body: [
          "A classically trained scholar, Basil encouraged Christians to seek wisdom while remaining grounded in the faith. His Address to Young Men on the Right Use of Greek Literature became one of the most influential early Christian treatments of education and of the relationship between faith and classical learning.",
        ],
      },
      {
        heading: 'Why He Is Called "the Great"',
        body: [
          "The title reflects not his theology alone but the breadth of his influence across the whole life of the Church. Few figures have left so lasting a mark on doctrine, worship, monasticism, education, and works of mercy at once, and for this he is remembered among the Three Holy Hierarchs and among the greatest teachers and pastors in Christian history.",
        ],
      },
    ],
    patronage: [
      "Monastics",
      "Theologians",
      "Educators",
      "Hospital workers",
      "Charitable ministries",
      "Social service organizations",
    ],
    works: [
      {
        title: "On the Holy Spirit",
        desc: "Defense of the divinity of the Holy Spirit.",
      },
      { title: "Against Eunomius", desc: "Refutation of Eunomian Arianism." },
      { title: "Hexaemeron", desc: "Homilies on the six days of creation." },
      { title: "Longer Rules", desc: "Foundational monastic instructions." },
      { title: "Shorter Rules", desc: "Practical monastic guidance." },
      {
        title: "Address to Young Men on the Right Use of Greek Literature",
        desc: "Guidance on the Christian use of classical education.",
      },
      {
        title: "Homilies on the Psalms",
        desc: "Biblical commentary preached to his congregation.",
      },
      {
        title: "Letters",
        desc: "An extensive correspondence preserved from his ministry.",
      },
    ],
    reading: [
      {
        heading: "Ancient Sources",
        items: [
          {
            title: "Funeral Oration on Basil the Great",
            author: "Saint Gregory the Theologian",
          },
          { title: "Life of Macrina", author: "Saint Gregory of Nyssa" },
          { title: "Ecclesiastical History", author: "Socrates Scholasticus" },
          { title: "Ecclesiastical History", author: "Sozomen" },
          { title: "Ecclesiastical History", author: "Theodoret of Cyrus" },
        ],
      },
      {
        heading: "Modern Studies",
        items: [
          { title: "Basil of Caesarea", author: "Philip Rousseau" },
          { title: "Basil of Caesarea", author: "Stephen Hildebrand" },
          {
            title: "On Social Justice",
            author: "trans. and ed. C. Paul Schroeder",
          },
          {
            title: "St. Basil the Great: On the Human Condition",
            author: "Popular Patristics Series",
          },
          { title: "The Ascetical Works of Saint Basil" },
        ],
      },
    ],
  },
  "OS-0373": {
    id: "OS-0373",
    lifespan: "† c. 362/363 · Priest and martyr of Ancyra",
    overview: [
      "Saint Basil of Ancyra, distinguished in the sources as Basil the Presbyter of Ancyra, was a priest of the Church in Ancyra — the city of modern Ankara in central Asia Minor — during the fourth century. He is to be kept distinct from the contemporary bishop of the same city; this Basil was a presbyter remembered chiefly as a confessor and martyr.",
      "He lived through one of the most contested periods of early Christian history, when disputes over the person of Christ and the doctrine of the Holy Trinity divided communities across the Roman Empire. Basil aligned himself firmly with the Nicene faith and opposed Arian teaching, and during the reign of Constantius II he is said to have suffered exile and harassment for that stand.",
      "The accession of the emperor Julian in 361 brought a concerted effort to revive the old pagan cult and to roll back the public influence of Christianity. Basil openly criticized these measures and urged the faithful of Ancyra to hold to their confession despite mounting pressure, which drew the attention of the imperial authorities.",
      "Arrested and interrogated, he was repeatedly pressed to offer sacrifice to the gods and as repeatedly refused. The early accounts of his passion describe prolonged and severe torture borne without recanting; he was put to death about the year 362 or 363, becoming one of the better-known martyrs of Julian's brief reign.",
      "His endurance was remembered as an example of steadfast confession at a moment when, after decades of growth and new legal standing, Christians once again faced state-sponsored opposition. The Church commemorates him as a martyr, and because he held the priesthood he is also numbered among the hieromartyrs.",
    ],
    timeline: [
      {
        when: "Early 4th c.",
        title: "Born in Asia Minor",
        body: "Of unknown family; the sources begin with his priesthood.",
      },
      {
        when: "Mid-4th c.",
        title: "Ordained priest at Ancyra",
        body: "Serving the local Church in central Asia Minor.",
      },
      {
        when: "350s",
        title: "Defended the Nicene faith",
        body: "Said to have suffered exile under Constantius II.",
      },
      {
        when: "361",
        title: "Julian becomes emperor",
        body: "An imperial effort to restore pagan worship begins.",
      },
      {
        when: "362/363",
        title: "Arrested, tortured, and martyred",
        body: "Put to death at Ancyra for refusing to sacrifice.",
      },
    ],
    sections: [
      {
        heading: "The Reign of Julian",
        body: [
          "The emperor Julian (361–363) sought to restore traditional Roman religion and to curb the public influence of Christianity. He stopped short of the empire-wide persecutions of earlier centuries, but Christians in many places met harassment, imprisonment, and local violence, and Basil was among the most prominent clergy to resist openly.",
        ],
      },
      {
        heading: "After Nicaea",
        body: [
          "Basil's ministry fell in the decades following the First Ecumenical Council at Nicaea in 325, amid the long Arian controversy. He is remembered for holding to the Nicene confession through the political and ecclesiastical turmoil of those years.",
        ],
      },
      {
        heading: "Legacy",
        body: [
          "As a priest who endured imprisonment and torture without yielding, Basil was held up as a model of pastoral courage. Among the Christians who suffered under Julian he became one of the best remembered — a reminder that the faith could still be tested even after it had gained legal recognition within the empire.",
        ],
      },
    ],
    related: [
      {
        name: "Great Martyr George the Trophy-bearer",
        note: "soldier and great martyr",
        href: "saint/OS-0012",
      },
      {
        name: "Great Martyr Theodore the Recruit",
        note: "soldier-martyr",
        href: "saint/OS-0018",
      },
      {
        name: "Greatmartyr Theodore Stratelates",
        note: "soldier-martyr",
        href: "saint/OS-0615",
      },
      {
        name: "Great Martyr Catherine of Alexandria",
        note: "confessor before hostile authority",
        href: "saint/OS-0015",
      },
      {
        name: "Saint Athanasius the Great",
        note: "defender of the Nicene faith",
        href: "saint/OS-0024",
      },
      {
        name: "Saint Basil the Great",
        note: "Cappadocian father of the same era",
        href: "saint/OS-0021",
      },
    ],
    patronage: [
      "Persecuted Christians",
      "Priests and clergy",
      "Confessors of the faith",
      "Those who suffer for their convictions",
    ],
    reading: [
      {
        heading: "Ancient Sources",
        items: [
          {
            title: "Lives of the Saints (Synaxarion)",
            author: "Orthodox Church in America",
          },
          { title: "The Great Synaxaristes", author: "Greek tradition" },
        ],
      },
      {
        heading: "Reference",
        items: [
          { title: "Butler's Lives of the Saints" },
          { title: "The Oxford Dictionary of the Christian Church" },
        ],
      },
    ],
  },
  "OS-0375": {
    id: "OS-0375",
    lifespan: "† c. 404 · Monk and martyr at Rome",
    overview: [
      "Saint Telemachus — also called Telemachos, and in some Western sources Almachius — was a monk of the early fifth century remembered for a single decisive act in defense of human life. Little is known of his origins; the sources describe an ascetic from the eastern provinces of the empire who had given himself to prayer and a life of withdrawal.",
      "In an age when gladiatorial combat still drew crowds to the arena, Telemachus was troubled by the spectacle of blood shed for entertainment. According to the account preserved by the Church historian Theodoret of Cyrus, he traveled to Rome during the reign of the emperor Honorius and entered the arena while the games were in progress, stepping between the combatants to stop the fighting.",
      "The crowd, enraged at the interruption, turned on him, and he was killed where he stood. The historians record that his death made a deep impression, and that Honorius, moved by it, brought the gladiatorial contests to an end. Scholars continue to debate the precise sequence of events, but in Christian memory Telemachus became a lasting symbol of opposition to violence staged as public amusement.",
      "The Church honors him as a martyr who gave his life in the act of protecting others and upholding the dignity of human life.",
    ],
    timeline: [
      {
        when: "Late 4th c.",
        title: "Lived as a monk in the East",
        body: "An ascetic of the eastern Roman provinces.",
      },
      {
        when: "c. 404",
        title: "Traveled to Rome",
        body: "Entered the arena during the gladiatorial games.",
      },
      {
        when: "c. 404",
        title: "Martyred by the crowd",
        body: "Killed while trying to halt the combat.",
      },
      {
        when: "Shortly after",
        title: "End of the games",
        body: "Tradition links his death to Honorius abolishing the contests.",
      },
    ],
    sections: [
      {
        heading: "The Games in Late Rome",
        body: [
          "Gladiatorial combat had been part of Roman public life for centuries, originally tied to funeral rites and later grown into mass spectacle. By the fourth and fifth centuries Christianity was the dominant religion of the empire, yet some of the older entertainments persisted, and Christian teachers had long criticized contests that turned injury and death into amusement.",
        ],
      },
      {
        heading: "A Witness for Peace and Human Dignity",
        body: [
          "Telemachus is remembered as one who placed himself bodily between opposing sides to prevent bloodshed, and his story came to express the growing Christian conviction that human life should not be made a spectacle. Later generations linked his martyrdom with the final abolition of the games and saw in it an image of Roman society being reshaped under Christian influence.",
        ],
      },
    ],
    related: [
      {
        name: "Saint Moses the Black",
        note: "desert monk turned man of peace",
        href: "saint/OS-0030",
      },
      {
        name: "Saint Martin of Tours",
        note: "soldier who renounced violence",
      },
      {
        name: "Saint Basil the Great",
        note: "father of Eastern monasticism",
        href: "saint/OS-0021",
      },
      {
        name: "Saint John Chrysostom",
        note: "preacher against the spectacles",
        href: "saint/OS-0023",
      },
    ],
    patronage: [
      "Peacemakers and mediators",
      "Monastics",
      "Those who work for nonviolence",
      "Advocates for human dignity",
    ],
    reading: [
      {
        heading: "Ancient Sources",
        items: [
          { title: "Ecclesiastical History", author: "Theodoret of Cyrus" },
          { title: "Ecclesiastical History", author: "Sozomen" },
        ],
      },
      {
        heading: "Reference",
        items: [
          { title: "The Oxford Dictionary of the Christian Church" },
          {
            title: "Studies of Honorius and the end of the gladiatorial games",
          },
        ],
      },
    ],
  },
  "OS-0374": {
    id: "OS-0374",
    lifespan: "reposed c. 375–380 · Matriarch of the holy family of Cappadocia",
    overview: [
      "Saint Emilia — her name also rendered Emmelia or Emelia — was a fourth-century Christian matriarch of Cappadocia and the mother of an extraordinary household of saints. Among her children are numbered Basil the Great, Gregory of Nyssa, Peter of Sebaste, Macrina the Younger, and Naucratius, and through them she stands among the most influential women of the early Church.",
      "She was born in Cappadocia in the generation after the great persecutions, as Christianity was becoming established within the empire, and the sources describe her as belonging to a respected Christian family. She married Basil the Elder, a lawyer and teacher known for his faith and learning, and together they raised a large family — tradition numbers the children at ten — in a household renowned for its piety, education, and discipline.",
      "The family's spiritual formation owed much to Macrina the Elder, Emilia's mother-in-law, who had preserved the faith through earlier persecutions and handed on traditions traced to the disciples of Gregory the Wonderworker. After the death of her husband, Emilia increasingly embraced an ascetic life under the guidance of her eldest daughter, Macrina the Younger.",
      "On the family estate at Annesi in Pontus the two women gathered a community given to prayer, work, charity, and study — an early example of organized communal asceticism that influenced the monastic writings of Saint Basil. The sources portray Emilia as a woman of practical wisdom and strong faith whose maternal leadership shaped the formation of future bishops, monastics, and theologians.",
      "She reposed in peace in the late fourth century, about the years 375 to 380; according to the account left by her son Gregory of Nyssa, members of her saintly family were present in her final days. The Church commemorates her on May 30, and in some calendars on January 1 alongside her son Basil.",
    ],
    timeline: [
      {
        when: "Early 4th c.",
        title: "Born in Cappadocia",
        body: "Into a respected Christian family.",
      },
      {
        when: "—",
        title: "Married Basil the Elder",
        body: "A lawyer and teacher known for his faith.",
      },
      {
        when: "—",
        title: "Raised a household of saints",
        body: "A family traditionally numbering ten children.",
      },
      {
        when: "After her widowhood",
        title: "Founded the community at Annesi",
        body: "An ascetic community in Pontus, with Macrina the Younger.",
      },
      {
        when: "c. 375–380",
        title: "Reposed in peace",
        body: "Her saintly children present at the end.",
      },
      {
        when: "May 30",
        title: "Principal commemoration",
        body: "Also kept Jan 1 with Saint Basil in some calendars.",
      },
    ],
    family: {
      heading: "Holy Family of Cappadocia",
      intro:
        "Emilia's household produced one of the most remarkable concentrations of sanctity in Christian history; several of her closest relations are themselves commemorated as saints.",
      figures: [
        {
          name: "Saint Macrina the Younger",
          note: "daughter",
          href: "saint/OS-1551",
        },
        {
          name: "Saint Basil the Great",
          note: "son",
          href: "saint/OS-0021",
        },
        {
          name: "Saint Gregory of Nyssa",
          note: "son",
          href: "saint/OS-0422",
        },
        {
          name: "Saint Peter of Sebaste",
          note: "son",
          href: "saint/OS-0420",
        },
        { name: "Saint Naucratius", note: "son" },
        { name: "Saint Basil the Elder", note: "husband" },
        {
          name: "Saint Macrina the Elder",
          note: "mother-in-law",
          href: "saint/OS-2474",
        },
      ],
    },
    sections: [
      {
        heading: "A Household of Saints",
        body: [
          "Emilia's deepest mark on history was the formation of her own family. Five of her immediate household are honored as saints — Basil the Great, Gregory of Nyssa, Peter of Sebaste, Macrina the Younger, and Naucratius — an inheritance of sanctity rarely matched in the Christian record.",
        ],
      },
      {
        heading: "An Early Monastic Community",
        body: [
          "After her widowhood, Emilia helped turn the family estate at Annesi into a semi-monastic community of prayer, labor, and charity. This shared life offered a model of Christian community that fed into the later monastic tradition associated with her son Basil.",
        ],
      },
      {
        heading: "Christian Motherhood",
        body: [
          "Early Christian writers held Emilia up as an example of the Christian mother and of the household as a place of formation — a school of faith, learning, charity, and discipline. Her life is often cited to show the importance of the family in handing on the faith.",
        ],
      },
      {
        heading: "Legacy",
        body: [
          "Emilia's legacy is inseparable from the influence of her children: through Basil she touched Orthodox monasticism, charity, and theology; through Gregory of Nyssa, Christian thought and spirituality; through Macrina, one of the great female monastic figures of the age. She remains among the most significant mothers in Orthodox memory.",
        ],
      },
    ],
    related: [
      {
        name: "Righteous Nonna of Nazianzus",
        note: "mother of Gregory the Theologian",
        href: "saint/OS-2507",
      },
      {
        name: "Saint Monica",
        note: "mother of Augustine of Hippo",
        href: "saint/OS-1116",
      },
      {
        name: "Righteous Macrina the Elder",
        note: "her mother-in-law",
        href: "saint/OS-2474",
      },
      {
        name: "Saint Gregory the Theologian",
        note: "associate of her children",
        href: "saint/OS-0022",
      },
      {
        name: "Saint Athanasius the Great",
        note: "contemporary defender of Nicaea",
        href: "saint/OS-0024",
      },
    ],
    patronage: [
      "Mothers",
      "Christian families",
      "Parents of clergy",
      "Large families",
      "Christian education in the home",
    ],
    reading: [
      {
        heading: "Ancient Sources",
        items: [
          { title: "Life of Macrina", author: "Gregory of Nyssa" },
          {
            title: "Funeral Oration on Basil the Great",
            author: "Gregory the Theologian",
          },
          { title: "Ecclesiastical History", author: "Sozomen" },
          { title: "Ecclesiastical History", author: "Socrates Scholasticus" },
        ],
      },
      {
        heading: "Modern Studies",
        items: [
          { title: "Basil of Caesarea", author: "Philip Rousseau" },
          { title: "The Encyclopedia of Early Christianity" },
        ],
      },
    ],
  },
  "OS-0379": {
    id: "OS-0379",
    lifespan: "† c. 311–324 · Bishop of Parium on the Hellespont",
    overview: [
      "Saint Theogenes — his name also given as Theagenes — was bishop of Parium, a port city on the Hellespont (the modern Dardanelles) in northwestern Asia Minor, in the late third and early fourth centuries. The surviving accounts say little of his early life or education; they begin with him already serving as bishop, overseeing the local community, ministering the sacraments, and guiding his flock through a time of political uncertainty.",
      "His martyrdom is placed in the reign of Licinius (308–324), who governed the East as co-emperor with Constantine. Though Constantine increasingly favored the Christians, Licinius eventually turned to policies hostile to the Church within his own territories.",
      "According to Orthodox tradition, an official — named in the sources as Zelicinthius — ordered Theogenes to abandon the priesthood, renounce Christ, and enter military service. When the bishop refused, he was beaten and imprisoned, and the accounts say he was deprived of food during his confinement.",
      "When repeated pressure failed to move him, he was condemned to die by drowning. Tradition records that he asked for time to pray before the sentence was carried out, that a brilliant light surrounded him as he did so, and that some of the soldiers and sailors who witnessed it were moved to embrace Christ. He was then cast into the sea; later accounts hold that his body was recovered and buried by the faithful, and that a shrine grew up at his tomb.",
      "The exact year of his death is uncertain, falling somewhere within the persecution under Licinius, between about 311 and 324. Because he suffered as a bishop, the Church venerates him as a hieromartyr.",
    ],
    timeline: [
      {
        when: "Late 3rd c.",
        title: "Approximate birth",
        body: "Date and origin unknown.",
      },
      {
        when: "Early 4th c.",
        title: "Bishop of Parium",
        body: "Leading the Church on the Hellespont.",
      },
      {
        when: "311–324",
        title: "Imprisoned and tortured",
        body: "For refusing military service under Licinius.",
      },
      {
        when: "311–324",
        title: "Martyred by drowning",
        body: "Cast into the sea after a final prayer.",
      },
      {
        when: "January 2",
        title: "Principal commemoration",
        body: "Kept by the Orthodox Church.",
      },
    ],
    sections: [
      {
        heading: "The Last Roman Persecution",
        body: [
          "Theogenes belonged to the final generation of martyrs before Christianity's definitive legalization. Licinius's reign was marked by rising tension between traditional Roman expectation and a growing Christian population; as Constantine supported the Church in the West and later throughout the empire, Licinius turned against it in the East, and bishops often became the focus of persecution.",
        ],
      },
      {
        heading: "The Church in Asia Minor",
        body: [
          "Asia Minor was among the most thoroughly Christianized regions of the empire. Cities such as Ephesus, Smyrna, Cyzicus, Nicaea, and Parium held established communities and episcopal sees, and the bishops who led them carried particular risk in times of persecution.",
        ],
      },
      {
        heading: "Legacy",
        body: [
          "Theogenes left no writings and shaped no doctrine; his memory rests on his witness under persecution and his place among the clergy who carried the Church through the last age of state hostility. His commemoration recalls the many local bishops whose names survive chiefly through the accounts of their martyrdom.",
        ],
      },
    ],
    related: [
      {
        name: "Hieromartyr Peter, Archbishop of Alexandria",
        note: "bishop-martyr of the same age",
        href: "saint/OS-2252",
      },
      {
        name: "Hieromartyr Polycarp, Bishop of Smyrna",
        note: "bishop-martyr of Asia Minor",
        href: "saint/OS-0713",
      },
      {
        name: "Hieromartyr Ignatius, Bishop of Antioch",
        note: "early bishop and martyr",
        href: "saint/OS-2393",
      },
      {
        name: "Hieromartyr Antipas of Pergamum",
        note: "early martyr of Asia Minor",
        href: "saint/OS-0975",
      },
      {
        name: "Hieromartyr Clement of Ancyra",
        note: "bishop of steadfast endurance",
        href: "saint/OS-0518",
      },
      {
        name: "Saint Methodius of Olympus",
        note: "bishop and martyr of the same era",
      },
    ],
    patronage: [
      "Bishops and clergy",
      "Christians facing persecution",
      "Confessors of the faith",
    ],
    reading: [
      {
        heading: "Ancient Sources",
        items: [
          { title: "Synaxarion and Menologion entries for Saint Theogenes" },
          {
            title: "Lives of the Saints (Jan 2)",
            author: "Orthodox Church in America",
          },
        ],
      },
      {
        heading: "Modern Studies",
        items: [
          {
            title: "The Origin of the Cult of St. Theagenes of Parium",
            author: "David Woods",
          },
        ],
      },
    ],
  },
  "OS-0380": {
    id: "OS-0380",
    lifespan: "c. 1700 – 1770 · Georgian new-martyr at Mytilene",
    overview: [
      "Saint George of Iberia was an eighteenth-century Georgian Orthodox Christian who suffered martyrdom under Ottoman rule. In Byzantine and ecclesiastical usage, 'Iberia' denotes not the Iberian Peninsula of western Europe but the ancient kingdom of Iberia in the Caucasus, corresponding largely to eastern Georgia.",
      "Little survives of his birth, family, or upbringing. He was born in Georgia, probably in the late seventeenth or early eighteenth century, at a time when the Georgian lands suffered repeated invasion, instability, and the carrying-off of captives through regional warfare and raids. While still young he was sold into slavery and, according to tradition, purchased by a Muslim master from the island of Mytilene (Lesbos) in the Aegean; in captivity he was compelled to embrace Islam and given the name Sali.",
      "After his master's death George remained on Mytilene, supporting himself by trade as a small merchant or shopkeeper. Though outwardly known as a Muslim, the tradition holds that he kept an inward attachment to the Christian faith. In 1770, by then about seventy years old, he came forward before the Ottoman authorities and publicly declared himself an Orthodox Christian — an act that, under the law of the time, exposed a man regarded as a Muslim to a charge of apostasy.",
      "The judge is said to have urged him to withdraw the confession, supposing that age had clouded his judgment, but George repeated it under questioning. He was imprisoned, tortured, and pressed to recant, and refused every opportunity to save his life. He was sentenced to death and executed by hanging on January 2, 1770.",
      "The Church commemorates him among the New Martyrs of the Ottoman period — for the most part ordinary lay Christians whose public confession of Orthodoxy, in the face of legal and social consequence, strengthened the communities living under Ottoman rule.",
    ],
    timeline: [
      {
        when: "Early 18th c.",
        title: "Born in Georgia (Iberia)",
        body: "In the kingdom of Iberia in the Caucasus.",
      },
      {
        when: "Youth",
        title: "Sold into slavery",
        body: "Forced to convert to Islam and given the name Sali.",
      },
      {
        when: "Later life",
        title: "Lived on Mytilene",
        body: "Supporting himself as a merchant on Lesbos.",
      },
      {
        when: "1770",
        title: "Confessed the Orthodox faith",
        body: "Publicly, before the Ottoman authorities.",
      },
      {
        when: "Jan 2, 1770",
        title: "Martyred by hanging",
        body: "After imprisonment and torture, at about seventy.",
      },
    ],
    sections: [
      {
        heading: "Christians under Ottoman Rule",
        body: [
          "George lived at the height of Ottoman power in the eastern Mediterranean. The empire governed its large Orthodox population through the millet system, which allowed Christians to practice their faith while holding them legally subordinate; conversion from Islam, however, was treated as a grave offense. Many Georgians, meanwhile, were captured or sold into slavery across the Ottoman world during the wars of the seventeenth and eighteenth centuries.",
        ],
      },
      {
        heading: "The New-Martyr Tradition",
        body: [
          "George belongs to the great company of Orthodox New Martyrs who suffered under Ottoman rule, many of them laypeople rather than clergy or monastics. His witness preserves the memory of countless Christians whose experiences of slavery, displacement, and forced conversion were never recorded, and whose fidelity was known only to God.",
        ],
      },
      {
        heading: "A Note on the Sources",
        body: [
          "The historical record for Saint George is limited. He left no writings and is known almost entirely through Orthodox synaxaria and later ecclesiastical accounts. The consistent elements are his Georgian origin, his enslavement and forced conversion, his public confession, and his martyrdom in 1770; other details belong to the received hagiographical tradition. He awaits the clergy and source review that the whole obscure New-Martyr tail requires before publication.",
        ],
      },
    ],
    related: [
      {
        name: "Saint Nina, Enlightener of Georgia",
        note: "apostle of the Georgian people",
        href: "saint/OS-0039",
      },
      {
        name: "Saint Gabriel (Urgebadze)",
        note: "modern Georgian saint",
        href: "saint/OS-2592",
      },
      {
        name: "New Hieromartyr Cosmas of Aitolia",
        note: "contemporary missionary in Ottoman lands",
        href: "saint/OS-1772",
      },
      {
        name: "New Martyr Nicholas of Metsovo",
        note: "fellow Ottoman-era new-martyr",
        href: "saint/OS-1190",
      },
      {
        name: "New Martyr John the New of Suceava",
        note: "martyr under foreign rule",
        href: "saint/OS-1274",
      },
      {
        name: "Saint Anthim the Iberian",
        note: "Georgian hierarch venerated abroad",
      },
    ],
    patronage: [
      "Georgian Christians",
      "Captives and the enslaved",
      "Converts and those returning to the faith",
      "Christians under religious coercion",
    ],
    reading: [
      {
        heading: "Orthodox Sources",
        items: [
          {
            title: "Lives of the Saints (Jan 2)",
            author: "Orthodox Church in America",
          },
          { title: "Orthodox Synaxarion entries for the New Martyr George" },
        ],
      },
      {
        heading: "Modern Studies",
        items: [
          { title: "Studies of the Ottoman-era New Martyrs" },
          { title: "Histories of Christianity under Ottoman rule" },
        ],
      },
    ],
  },
};
