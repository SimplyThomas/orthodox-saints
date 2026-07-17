/* "Giving Icons as Gifts" — page content + the reference resolver.

   WHY THIS FILE EXISTS (future-proofing). The page names icon subjects: saints,
   groups, bodiless powers, and icons of Christ, the Theotokos, and the feasts.
   Some of those ARE records today — a saint or a group profile (OS-####, both
   served at /saint/), a heavenly host (HH-####). Most icon *subjects* (the
   Nativity, the Hospitality of Abraham, Christ the High Priest) are records
   nowhere yet, and feasts (FF-####) have no per-feast route.

   So no card hard-codes an href. Every suggestion carries an optional `ref`,
   and resolveGiftRef() is the ONE place that turns a ref into a link. Three
   consequences worth keeping:
     · A ref whose record is missing degrades to plain text, never a dead link.
     · When icon subjects or feasts become first-class records, teach the
       resolver a new `kind` and the whole page lights up — no markup changes.
     · The vocation buttons carry a facet, not a saint list, so they query the
       live database instead of freezing today's answer into this file (§10:
       the finder reads CSV facets, so those lists stay current for free).

   Content note: every suggestion is tagged with a GiftTier so the page can be
   honest about what is universally Orthodox, what is local custom, and what is
   merely a sensible modern idea (§9 — do not dress a modern convenience up as
   an ancient tradition). */

import { byId } from "./data";
import { hostById } from "./hosts";
import { recordHref, withBase } from "./format";

/* =====================================================================
   REFERENCES
   ===================================================================== */

/** A link target for a named icon subject. `saint` covers group profiles too —
 *  both are OS-#### and both serve at /saint/ (§5 group taxonomy). */
export type GiftRef =
  | { kind: "saint"; id: string }
  | { kind: "host"; id: string }
  | { kind: "page"; href: string }
  | { kind: "finder"; facet: string; value: string };

export interface ResolvedGiftRef {
  href: string;
  /** Real portrait, when the record has one. */
  image?: string;
  imageThumb?: string;
  /** Vendor-permission attribution, carried so callers can honor the grant. */
  imageSource?: string;
  imageVendor?: string;
  imageAttribution?: string;
  imagePermission?: boolean;
}

/** Turn a ref into a link, or null when the record is absent. Null is a normal
 *  outcome (Christ Pantocrator as an *icon subject* is not a database row) and
 *  the markup renders those as plain text. */
export function resolveGiftRef(ref?: GiftRef): ResolvedGiftRef | null {
  if (!ref) return null;
  if (ref.kind === "page") return { href: withBase(ref.href) };
  if (ref.kind === "finder") {
    return {
      href: withBase(`search?${ref.facet}=${encodeURIComponent(ref.value)}`),
    };
  }
  if (ref.kind === "host") {
    const h = hostById.get(ref.id);
    if (!h) return null;
    return {
      href: recordHref(h.id),
      image: h.image,
      imageThumb: h.imageThumb,
      imageSource: h.imageSource,
      imageVendor: h.imageVendor,
      imageAttribution: h.imageAttribution,
      imagePermission: h.imagePermission,
    };
  }
  // kind === "saint" — byId covers group profiles, which build.py emits into
  // data.json alongside the saints.
  const s = byId.get(ref.id);
  if (!s) return null;
  return {
    href: recordHref(s.id),
    image: s.image,
    imageThumb: s.imageThumb,
    imageSource: s.imageSource,
    imageVendor: s.imageVendor,
    imageAttribution: s.imageAttribution,
    imagePermission: s.imagePermission,
  };
}

/* =====================================================================
   CONTENT TYPES
   ===================================================================== */

/** How firmly rooted a suggestion is. The page states this plainly rather than
 *  flattening ancient custom, local practice, and modern idea into one list. */
export type GiftTier = "traditional" | "regional" | "modern";

export interface GiftIcon {
  /** The icon subject, named as it would be asked for in a shop or parish. */
  name: string;
  /** One line on why this icon, for this person, at this moment. */
  why: string;
  tier: GiftTier;
  ref?: GiftRef;
  /** Where custom differs, name the tradition rather than implying it is universal. */
  where?: string;
}

export interface GiftOccasion {
  /** Slug — the anchor, the data attribute, and the deep link. Permanent. */
  id: string;
  glyph: string;
  kicker: string;
  title: string;
  /** The closed tile's one line. Keep it to one line — the grid depends on it. */
  blurb: string;
  /** Marks the page's centre of gravity (baptism) with a gold tile, without
   *  breaking the uniform grid. */
  key?: boolean;
  /** The expanded body. Absorbs why the icon is given, when it is presented,
   *  and where it is kept — these were once three separate blocks per occasion,
   *  which is what made the expanded page ~25 screens. */
  intro: string;
  icons: GiftIcon[];
  /** A pulled-aside point of custom (e.g. the godparent's role). */
  note?: { title: string; body: string };
}

export interface GiftRecipient {
  id: string;
  label: string;
  glyph: string;
  intro: string;
  icons: GiftIcon[];
}

export interface GiftVocation {
  label: string;
  /** Finder facet + value. Deliberately NOT a saint list — §10. */
  ref: GiftRef;
  note: string;
}

/* =====================================================================
   THE HERO ICON CORNER
   Real records, resolved at build time. Christ and the Theotokos at the
   centre with patrons gathered around them is the traditional arrangement
   (cf. the Icon Corner entry in lib/icons-home.ts).
   ===================================================================== */

export interface HeroIcon {
  ref: GiftRef;
  /** Short label under the frame. */
  label: string;
  /** The centre pair render larger. */
  center?: boolean;
}

export const IG_HERO: HeroIcon[] = [
  { ref: { kind: "saint", id: "OS-0019" }, label: "St Nicholas" },
  {
    ref: { kind: "saint", id: "OS-0001" },
    label: "The Theotokos",
    center: true,
  },
  {
    ref: { kind: "saint", id: "OS-0000" },
    label: "Christ Pantocrator",
    center: true,
  },
  { ref: { kind: "saint", id: "OS-0046" }, label: "St Nektarios" },
];

/* =====================================================================
   INTRODUCTION
   ===================================================================== */

export const IG_INTRO: string[] = [
  "An icon is not decoration and not a souvenir of someone else's faith. The Church calls it a window — the honor offered before it passes to the person depicted — so an icon given as a gift is a companion to be prayed with, not an object to be admired. It outlasts the occasion: long after the cards and flowers are gone it is still on the wall, still gathering the household to itself. Customs vary from one tradition to the next, and this page says so where they do; but a few run right through Orthodoxy, and this is where to start.",
];

/* =====================================================================
   OCCASIONS
   ===================================================================== */

export const IG_OCCASIONS: GiftOccasion[] = [
  {
    id: "birth",
    glyph: "infant",
    kicker: "A child is born",
    title: "Birth & a New Baby",
    blurb:
      "The first icons a child sees — hung low enough that one day they will.",
    intro:
      "A child is usually baptized some weeks after birth, so these icons are given to the household as much as to the infant — the furnishing of the room the child will wake up in. Most new parents have no icons for a nursery and no time to find any, which makes this a practical gift as well as a prayerful one. Usually given in the weeks after the birth, or at the churching on the fortieth day, and hung low, at the height of a child who will soon be standing.",
    icons: [
      {
        name: "The Theotokos with the Christ Child",
        why: "The most given icon at a birth, and the most obvious: a mother holding her son. A new mother recognizes herself in it immediately, and it places this particular child in the arms of the one who bore God.",
        tier: "traditional",
      },
      {
        name: "The Guardian Angel",
        why: "The Church teaches that each of the faithful is given an angel to guard them. An icon of the Guardian Angel over a crib is a gift to the parents as much as the child — a visible answer to the fear every parent lies awake with.",
        tier: "traditional",
        ref: { kind: "page", href: "guardian-angels" },
      },
      {
        name: "Christ Blessing the Children",
        why: '"Suffer the little children to come unto me." An icon of the scene is chosen for a nursery because it is the one place in the Gospel where children are the subject and not the interruption.',
        tier: "traditional",
      },
      {
        name: "The family's patron saint",
        why: "Whichever saint the household already keeps — the Slava saint, the parish patron, a grandmother's saint. It quietly tells a child they were born into something that started before them.",
        tier: "regional",
        where: "Especially Serbian (the Slava saint) and Russian practice.",
      },
      {
        name: "The child's future patron saint",
        why: "Given when the name is settled before the baptism. Worth a word of caution: names sometimes change between the birth and the font, so many families wait — the patron icon is properly a baptism gift.",
        tier: "modern",
      },
    ],
  },

  {
    id: "baptism",
    glyph: "font",
    kicker: "Born of water and the Spirit",
    title: "Baptism & Chrismation",
    blurb:
      "The one occasion with a clear answer: the patron saint's icon, given by the godparent.",
    key: true,
    intro:
      "If you take one thing from this page, take this: the most traditional Orthodox baptism gift is an icon of the patron saint of the person being baptized — the saint whose name they receive at the font. Not a regional custom or a nice idea; it runs through the Greek, Russian, Serbian, Romanian, Antiochian, Georgian, and Bulgarian traditions alike, and it is the gift a godparent is expected to bring. Everything else here is secondary. It is presented at the baptism or the meal after, and it is the one gift an Orthodox family will notice if it is missing.",
    icons: [
      {
        name: "The patron saint of the newly baptized",
        why: "The saint whose name is given at the font. From this day the person has a name in the Church and a particular friend in heaven, and the icon is how that friendship gets a face. It goes to the person, not the parents, and it usually follows them for life — to a dorm room, a marriage, a deathbed. If you give one gift, give this.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "Christ",
        why: "Given so that the patron saint is not the whole of a young Christian's prayer. The saint intercedes; Christ saves. An icon corner that has only saints in it has quietly gone wrong, and starting with Christ prevents that from the first day.",
        tier: "traditional",
      },
      {
        name: "The Theotokos",
        why: "The companion to the icon of Christ, and with it the beginning of an icon corner. A newly baptized adult convert with no icons at all is best served by this pair before anything else.",
        tier: "traditional",
      },
      {
        name: "The Guardian Angel",
        why: "Given at baptism because it is at baptism that the Church prays for the angel who will accompany this Christian. A common and much-loved gift for a child.",
        tier: "traditional",
        ref: { kind: "page", href: "guardian-angels" },
      },
      {
        name: "The Baptism of Christ (Theophany)",
        why: "The icon of the very thing that just happened. It is the most fitting icon of the day and one of the least given — a good choice when the patron icon is already covered by the godparent.",
        tier: "traditional",
      },
      {
        name: "A baptismal cross",
        why: "Not an icon, but given at the same moment and by the same person. In most traditions the godparent provides the cross the newly baptized is clothed with, along with the baptismal garment.",
        tier: "traditional",
      },
      {
        name: "A prayer rope",
        why: "A gift for an adult convert or an older child — something to do with the hands when words run out. Give a short one; a hundred-knot rope is a burden to a beginner, and a thirty-three-knot rope is a friend.",
        tier: "traditional",
      },
      {
        name: "A children's prayer book",
        why: "For a child, or for the parents who will be praying with them. Illustrated Orthodox prayer books for children are a genuinely modern product, and a good one — but check the iconography before buying.",
        tier: "modern",
      },
    ],
    note: {
      title: "The godparent gives the patron icon",
      body: "Across most Orthodox traditions the sponsor — the godparent — presents the icon of the patron saint, along with the baptismal cross and often the baptismal garment. If you are not the godparent, it is worth a quiet word with them before buying: the patron icon is theirs to give, and a duplicate is an awkward gift. Choose something else from this list instead, and let the godparent do their job.",
    },
  },

  {
    id: "name-day",
    glyph: "candle",
    kicker: "The feast of your saint",
    title: "Name Day",
    blurb: "In much of the Orthodox world the name day outranks the birthday.",
    intro:
      "A name day is the feast of the saint whose name you bear. In Greece, Serbia, Russia, Romania, Bulgaria, and much of the Orthodox world it is kept more warmly than a birthday, and for a reason worth explaining to converts: a birthday commemorates an accident of biology, a name day a person in heaven who is praying for you. The greeting in Greek is chrónia pollá — many years. The gift, given on the saint's feast, deepens the connection to that saint, and often becomes the personal icon someone keeps closest.",
    icons: [
      {
        name: "An icon of the patron saint",
        why: "The name-day gift. If the recipient has never owned an icon of their own saint, this is the obvious and best choice — and surprisingly often, they don't.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "A larger icon of the patron saint",
        why: "For someone who already has a small one. A name day is the natural occasion to upgrade from a paper print to something that will hold a room, and the old one moves to a bedside or a car.",
        tier: "modern",
      },
      {
        name: "A hand-painted icon",
        why: "Written by an iconographer in the traditional manner, often to order and often taking months. The gift of a lifetime for a significant name day — and worth commissioning early.",
        tier: "traditional",
      },
      {
        name: "Beeswax candles",
        why: "Burned before the icon on the feast. Ordinary, consumable, and exactly right — the sort of gift that gets used rather than displayed.",
        tier: "traditional",
      },
      {
        name: "Incense",
        why: "A small, welcome gift for a household that censes its icon corner. Names of the resins vary by tradition; when in doubt, ask what their parish uses.",
        tier: "regional",
        where: "Common in Greek, Athonite, and Slavic households.",
      },
      {
        name: "A prayer rope",
        why: "Given on a name day as easily as at a baptism, and always welcome — they wear out, get lost, and get given away.",
        tier: "traditional",
      },
      {
        name: "The saint's life, or their own writings",
        why: "For a saint who left writings, the name day is the moment to give them. Reading your own saint is a different experience from reading about them.",
        tier: "modern",
      },
    ],
    note: {
      title: "Find the feast before you buy",
      body: "Two saints often share a name, and they rarely share a day — and the saint someone actually keeps is a matter of family and parish custom, not of guessing. Ask, or look the name up: getting the wrong John is a small thing, but getting the right one is a real courtesy.",
    },
  },

  {
    id: "marriage",
    glyph: "rings",
    kicker: "A new household",
    title: "Marriage",
    blurb:
      "A wedding starts a household — these are the first icons of a home that doesn't exist yet.",
    intro:
      "The Orthodox marriage service crowns a bride and groom as the founders of something new — a small church. So the icons given at a wedding are not ornaments for a couple; they are the furnishing of a household's prayer. In many traditions the couple is blessed with a pair, Christ and the Theotokos, which then becomes the centre of the icon corner in the home they are about to make — usually the two icons a family points to when they say where they started. The most consequential gift at the wedding, and it costs less than the flowers.",
    icons: [
      {
        name: "Christ Pantocrator",
        why: "The groom is traditionally blessed with the icon of Christ. It is the first of the two icons the new household will keep at its centre.",
        tier: "traditional",
      },
      {
        name: "The Theotokos",
        why: "The bride is traditionally blessed with the icon of the Theotokos. The two icons are a pair and belong together — they should be chosen together, in the same hand and the same size, and they will hang side by side for the rest of the marriage.",
        tier: "traditional",
      },
      {
        name: "The Wedding at Cana",
        why: "Christ's first sign, worked at a wedding, and read at Orthodox weddings ever since. A fitting icon for a dining room, and a reminder that Christ's first miracle was to keep a party going.",
        tier: "traditional",
      },
      {
        name: "Sts Joachim & Anna",
        why: "The parents of the Theotokos, who waited years in barrenness and reproach before Anna conceived. Given to couples hoping for children, and especially to those who have been waiting and grieving.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2939" },
      },
      {
        name: "Sts Peter & Fevronia of Murom",
        why: "A prince and the healer he married against his court's wishes; they took monastic vows late and, by tradition, died on the same day. The Russian icon of married love.",
        tier: "regional",
        where:
          "Russian tradition — their feast is widely kept as a day of family and marriage.",
        ref: { kind: "saint", id: "OS-1422" },
      },
      {
        name: "Sts Adrian & Natalia",
        why: "A married pair of the Nicomedian persecution: Adrian, a pagan official, was converted by the courage of the Christians he was sentenced to guard, and Natalia encouraged her husband to his martyrdom rather than lose him to apostasy. Given to couples who expect their marriage to cost them something.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-1782" },
      },
      {
        name: "Sts Aquila & Priscilla",
        why: "The tentmaking couple of the Book of Acts who worked beside the Apostle Paul, taught Apollos, and kept a church in their own house. The scriptural picture of a marriage that is useful to the Church — and the patrons of anyone whose home is where the hospitality happens.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-1527" },
      },
    ],
    note: {
      title: "The wedding pair: Christ and the Theotokos",
      body: "The two icons the couple is blessed with are the seed of everything else. Every icon the family acquires over the next fifty years — patrons, feasts, saints picked up on pilgrimages — arranges itself around this pair. That is the argument for spending the money here rather than spreading it across several smaller icons: buy one good pair, matched, and let the corner grow around it.",
    },
  },

  {
    id: "housewarming",
    glyph: "house",
    kicker: "A house becomes a home",
    title: "Housewarming",
    blurb: "Icons are how a set of rooms becomes an Orthodox household.",
    intro:
      "When Orthodox Christians move, the first question is not where the sofa goes but where the icon corner goes — traditionally on an eastern wall, since we pray toward the east. A house is normally blessed by the parish priest with holy water, and the icons are what the blessing gathers around, so they are best given before the blessing, while the walls are still bare. More than a nice gesture: they are the thing the new home is organized around.",
    icons: [
      {
        name: "Christ Pantocrator",
        why: "Where an Orthodox home begins. If the household has nothing else, it has this.",
        tier: "traditional",
      },
      {
        name: "The Theotokos",
        why: "The companion to Christ at the centre of the corner. Christ and the Theotokos together are the irreducible minimum of an Orthodox home — not because a rule says so, but because that is what every Orthodox home has.",
        tier: "traditional",
      },
      {
        name: "The Hospitality of Abraham",
        why: "The three angels at Abraham's table under the oak at Mamre — the Old Testament icon of the Trinity, and an icon about a household receiving guests who turn out to be God. The natural icon for a dining room.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-1984" },
      },
      {
        name: "The Guardian Angel",
        why: "Kept near the entrance in many households, for those going out and coming back.",
        tier: "traditional",
        ref: { kind: "page", href: "guardian-angels" },
      },
      {
        name: "The parish patron",
        why: "The saint of the temple the household will now be walking to. A thoughtful gift for someone who has moved to a new city and does not yet know anyone — it is a welcome from the parish as much as from you.",
        tier: "regional",
        where: "Common wherever a parish has a strong patronal identity.",
      },
      {
        name: "The family's patron saint",
        why: "For Serbian households, the Slava icon has pride of place and is visible to everyone who walks in. Elsewhere, whichever saint the family already keeps.",
        tier: "regional",
        where: "Serbian (the Slava icon) and Slavic practice.",
      },
    ],
  },

  {
    id: "graduation",
    glyph: "scroll",
    kicker: "Wisdom & vocation",
    title: "Graduation",
    blurb:
      "Not an ancient occasion — but a real threshold the Church has much to say about.",
    intro:
      "Be clear about this one: graduation is a modern civic milestone, not a feast of the Church, and there is no ancient custom of giving icons for it. What is ancient is the Church's concern with wisdom — the difference between knowing a great deal and knowing what to do — and the moment a young person becomes responsible for their own prayer. A graduation icon is a modern gift for a real transition, best given with that honesty rather than dressed up as a tradition, and best chosen small and durable enough to survive a dorm room.",
    icons: [
      {
        name: "The patron saint",
        why: "The saint they already have, in a form that will survive a dorm room. Many young adults have never owned an icon that was theirs rather than their parents'.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "The Three Holy Hierarchs",
        why: "Basil the Great, Gregory the Theologian, and John Chrysostom — jointly commemorated, and honored as patrons of Orthodox learning. In Greece their feast is kept as a school and university feast, which makes this the closest thing to a traditional graduation icon.",
        tier: "regional",
        where:
          "Greek practice keeps January 30 as the feast of letters and education.",
        ref: { kind: "saint", id: "OS-2933" },
      },
      {
        name: "St Catherine of Alexandria",
        why: "By her life, a young woman of formidable learning who out-argued the philosophers sent to break her. Given to students, and a particularly good icon for a young woman going into academic work.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0015" },
      },
      {
        name: "St John Chrysostom",
        why: "The golden-mouthed — the patron of preachers and of anyone whose work will be done with words.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0023" },
      },
      {
        name: "St Gregory the Theologian",
        why: "One of only three saints the Church calls the Theologian. For the graduate whose questions have outgrown easy answers.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0022" },
      },
    ],
  },

  {
    id: "vocation",
    glyph: "tools",
    kicker: "Work as a calling",
    title: "Professional & Vocational Gifts",
    blurb:
      "Almost every trade has a saint who practiced it. These buttons search the database.",
    intro:
      "The saints were not professional religious. They were physicians, soldiers, farmers, shepherds, merchants, judges, hymn-writers, and craftsmen, and the Church remembers what they did for a living because the work itself was part of how they were saved. So an icon for a new job, a promotion, or a retirement says the work is not separate from the faith. The buttons below run a live search of the database rather than repeating a list that would go stale — every saint they find is one whose recorded life supports the vocation.",
    icons: [],
  },

  {
    id: "christmas",
    glyph: "star",
    kicker: "God with us",
    title: "Christmas",
    blurb:
      "The Nativity — the icon most households lack. They have the ornaments, not the icon.",
    intro:
      "The Nativity of Christ is preceded by a forty-day fast and is a feast of the Incarnation rather than a festival of gift-giving; the presents are a custom that has grown around it, not the point of it. Where gifts are exchanged, an icon keeps the feast about its subject. Timing varies: in Greek tradition gifts attach as often to St Basil on January 1 as to December 25, or run through the twelve days to Theophany.",
    icons: [
      {
        name: "The Nativity of Christ",
        why: "The icon of the feast — the cave, the manger, the star, the angels, the magi, and the ox and the ass. Brought out for the season in many households and kept on the analogion or the icon corner through the twelve days.",
        tier: "traditional",
      },
      {
        name: "Christ",
        why: "For someone with no icons at all, Christmas is as good an occasion as any to give the first one.",
        tier: "traditional",
      },
      {
        name: "The Theotokos",
        why: "The feast is hers as well as His — the Nativity is the moment the Incarnation becomes visible, and she is how. The companion gift to an icon of Christ.",
        tier: "traditional",
      },
      {
        name: "The family's patron saint",
        why: "Given at Christmas in households that gather then and at no other time of year — which, honestly, is most of them.",
        tier: "regional",
      },
      {
        name: "A feast-day icon for the analogion",
        why: "Some families keep a small stand and rotate the icon of whichever feast is being celebrated. Starting someone off with the Nativity is a good way in.",
        tier: "modern",
      },
    ],
  },

  {
    id: "pascha",
    glyph: "dove",
    kicker: "The Feast of Feasts",
    title: "Pascha",
    blurb:
      "The traditional gift is a red egg. But every home should own the icon of the Resurrection.",
    intro:
      "Pascha is not a gift-giving feast the way Christmas has become; the traditional exchange is the red egg and the Paschal greeting — Christ is risen! Indeed He is risen! An icon given at Pascha is a modern extension of the custom rather than the custom itself. That said, the icon of the Resurrection is the central icon of the Christian faith and belongs in every icon corner permanently, not seasonally — a household without one is missing the point of the whole calendar.",
    icons: [
      {
        name: "The Resurrection (the Descent into Hades)",
        why: "The Orthodox icon of the Resurrection is not an empty tomb — it is Christ standing on the shattered gates of Hades, hauling Adam and Eve up out of their graves by the wrist. Worth explaining when you give it, because it startles people who expect a sunrise. It is the answer to death, drawn.",
        tier: "traditional",
      },
      {
        name: "The Myrrh-bearing Women",
        why: "The women who came to the tomb at dawn with spices to anoint a corpse and were the first to be told otherwise. The icon of faithfulness that keeps showing up even when it thinks the story is over.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2937" },
      },
      {
        name: "Christ",
        why: "The Paschal season is a natural time to give the first icon of Christ to someone newly received into the Church, since many adult converts are baptized at Pascha.",
        tier: "traditional",
      },
    ],
  },

  {
    id: "illness",
    glyph: "vial",
    kicker: "Healing of soul and body",
    title: "Illness & Recovery",
    blurb:
      "The unmercenary physicians — saints who were doctors and took no payment.",
    intro:
      "The Church has never treated prayer and medicine as rivals. Several of her most loved saints were physicians by trade, and they are called the Anargyroi — the unmercenaries, the silverless — because they refused payment for their care. An icon given to someone ill is not an alternative to treatment and not a promise of a cure; it puts a face to the prayer of a household that has run out of things it can do, and asks for what the Church actually asks — healing of soul and body, in that order. Give it, and let the person keep their doctor.",
    icons: [
      {
        name: "St Panteleimon",
        why: "A young physician of Nicomedia who treated the poor without charge and was martyred under Diocletian. The most invoked healing saint in the Orthodox world; his icon shows him holding a medicine box and a spoon rather than a sword.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0014" },
      },
      {
        name: "Sts Cosmas & Damian",
        why: "Twin physicians who took no money — the archetypal unmercenaries. Note there are several pairs of the same name in the calendar; the pair of Asia, sons of Theodota, are the ones usually meant.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0036" },
      },
      {
        name: "St Luke of Crimea",
        why: "A surgeon and an archbishop in the Soviet Union who operated by day and was imprisoned and exiled for his faith — he wrote a standard text on purulent surgery and served in vestments over his scrubs. Glorified in 1996. The icon for the modern sick, and for surgeons.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0049" },
      },
      {
        name: "The Archangel Raphael",
        why: 'The archangel of the Book of Tobit, whose name means "God heals," and who in that story travels with a young man and restores his father\'s sight.',
        tier: "traditional",
        ref: { kind: "host", id: "HH-0012" },
      },
      {
        name: "The Holy Unmercenaries",
        why: "The healer-saints together — Cosmas and Damian, Panteleimon, Cyrus and John, and the rest of the silverless physicians, honored as a synaxis.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2957" },
      },
      {
        name: "St Nektarios of Aegina",
        why: "Widely invoked in cases of cancer. Give this one with care and without promises: it is given in hope, and the person receiving it usually knows the odds better than you do.",
        tier: "regional",
        where: "Especially Greek practice.",
        ref: { kind: "saint", id: "OS-0046" },
      },
    ],
    note: {
      title: "A word on what an icon is not",
      body: "An icon is not a charm and prayer is not a treatment plan. The Church prays for healing of soul and body and leaves the outcome to God, and the same tradition that gave us the unmercenary physicians also gave us saints who were physicians precisely because medicine is good. Give the icon, and let the person keep their doctor.",
    },
  },

  {
    id: "grief",
    glyph: "cross",
    kicker: "The hope of the Resurrection",
    title: "Comfort & Grief",
    blurb:
      "The Orthodox answer to grief is not consolation but the Resurrection — and there is an icon of it.",
    intro:
      "Orthodox Christianity does not meet death with reassurance that it is natural or a part of life. It calls death an enemy and an outrage, and then says it has been defeated — a harder and better thing to give a grieving person than sympathy. The Church keeps praying for the departed at the memorials on the third, ninth, and fortieth days, so an icon given to the bereaved is a gift with a practice attached. There is no hurry: the fortieth day is a kinder time to give one than the third, when the household is drowning in casseroles.",
    icons: [
      {
        name: "The Resurrection (the Descent into Hades)",
        why: "Christ trampling the gates of hell and pulling the dead out by the wrist. This is the Orthodox answer to a grave, and there is no gentler way to say it. Given to a household in mourning, it is not a platitude — it is a claim.",
        tier: "traditional",
      },
      {
        name: "Christ",
        why: "For the household to pray before — for the departed, and for themselves. Grief needs somewhere to stand, and the icon of Christ is where.",
        tier: "traditional",
      },
      {
        name: 'The Theotokos "Joy of All Who Sorrow"',
        why: "An icon of the Mother of God surrounded by the sick, the poor, and the afflicted, with angels attending them. Named for exactly this, and given for exactly this.",
        tier: "regional",
        where:
          "Russian tradition, where the icon and its feast are widely kept.",
      },
      {
        name: "The Guardian Angel",
        why: "Given to the bereaved, and often to a widow or widower living alone for the first time in decades.",
        tier: "traditional",
        ref: { kind: "page", href: "guardian-angels" },
      },
      {
        name: "The patron saint of the departed",
        why: "For a household that wants to keep praying with the person's name in front of them. Some families keep this icon out through the forty days of memorials and then place it in the corner permanently.",
        tier: "regional",
      },
    ],
  },

  {
    id: "ordination",
    glyph: "chalice",
    kicker: "Set apart for service",
    title: "Ordination & Monastic Profession",
    blurb:
      "For a new deacon, priest, or monastic — the day a life stops being one's own.",
    intro:
      "Ordination and monastic tonsure are not promotions. Both are a handing-over of a life, marked by the community that formed the person and is now sending them. Gifts here tend toward the practical and the liturgical, and an icon given at an ordination or tonsure is usually one that will be prayed before daily for the next forty years — so choose something that will bear that much looking at, for the cell, the office, or the altar where the daily prayers are actually said.",
    icons: [
      {
        name: "Christ the High Priest",
        why: "Christ vested as a bishop, enthroned. The icon of the priesthood itself, and a reminder to a new priest that the priesthood is not his — he is lending his hands to someone else's.",
        tier: "traditional",
      },
      {
        name: "St John Chrysostom",
        why: "The author of the Liturgy served on most Sundays of the year, and a bishop who was exiled twice for saying what he thought to the powerful. The patron of preachers, and a warning as much as a comfort.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0023" },
      },
      {
        name: "St Basil the Great",
        why: "Author of the Liturgy served ten times a year, of the monastic rule much of Orthodox monasticism still follows, and of a hospital complex so large it was called a new city. For a clergyman whose work will be as much administrative as liturgical.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0021" },
      },
      {
        name: "St Gregory the Theologian",
        why: "The reluctant bishop who kept fleeing his office to go and pray, and who was, by his own account, no good at church politics. Loved by clergy who feel the same.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0022" },
      },
      {
        name: "The Three Holy Hierarchs",
        why: "The three together, jointly commemorated — the icon of the Church's teaching office, and a common gift at an ordination.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2933" },
      },
      {
        name: "The patron saint",
        why: "Their own saint, whose name they will keep — or, for a monastic, the new saint whose name they are given at the tonsure. For a tonsure, the icon of the new patron is a particularly fitting gift, and one the person cannot buy for themselves in advance.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
    ],
    note: {
      title: "Ask before buying for a monastic",
      body: "Monastics own little by design, and in many monasteries what a brother or sister may keep is the abbot's or abbess's decision rather than theirs. A word to the monastery first turns a well-meant gift into a welcome one — and they will usually tell you plainly what is needed, which is often not an icon at all.",
    },
  },
];

/* =====================================================================
   VOCATIONS — finder deep links, not saint lists (§10)

   Each button carries a facet, not a list of saints, so the search runs
   against the live database and never goes stale as coverage grows. Two
   rules were applied when picking the facet for a calling:

     · Prefer `theme` where it is richer than the raw Vocation term — the
       themes are derived and broader (soldiers 119 vs Soldier 99;
       musicians 37 vs Musician 10; farmers 35 vs Farmer 18).
     · Prefer the intercession where that is what the calling actually
       asks for: students want Education (54), not the Student vocation
       (1 saint).

   Values must exist in data/vocabulary.csv (Vocation / Commonly Asked
   Intercessions) or in public/themes.json, or the search returns nothing.
   The finder splits a value on commas, so "a,b" is an OR within one facet.

   Deliberately absent: law enforcement and engineering. Neither is a
   category the Orthodox calendar records, and inventing a facet to fill a
   button would fabricate a patronage (§13). Craftsmen and Officers cover
   the nearest honest ground.
   ===================================================================== */

export const IG_VOCATIONS: GiftVocation[] = [
  {
    label: "Doctors & Nurses",
    ref: { kind: "finder", facet: "theme", value: "physicians" },
    note: "The unmercenary physicians, who took no payment.",
  },
  {
    label: "Teachers",
    ref: { kind: "finder", facet: "theme", value: "teachers" },
    note: "Catechists, and the hierarchs the schools are named for.",
  },
  {
    label: "Students",
    ref: { kind: "finder", facet: "intercession", value: "Education" },
    note: "The saints asked for in study and examination.",
  },
  {
    label: "Soldiers & Military",
    ref: { kind: "finder", facet: "theme", value: "soldiers" },
    note: "The soldier-martyrs, most killed by their own side.",
  },
  {
    label: "Officers & Commanders",
    ref: { kind: "finder", facet: "vocation", value: "Officer / General" },
    note: "Those who held command and answered for it.",
  },
  {
    label: "Judges & Lawyers",
    ref: { kind: "finder", facet: "vocation", value: "Judge,Lawyer" },
    note: "Saints who sat in judgment — and some who were judged.",
  },
  {
    label: "Farmers",
    ref: { kind: "finder", facet: "theme", value: "farmers" },
    note: "Gardeners, ploughmen, and the blessing of the fields.",
  },
  {
    label: "Shepherds",
    ref: { kind: "finder", facet: "vocation", value: "Shepherd" },
    note: "Herdsmen and keepers of flocks, literal and otherwise.",
  },
  {
    label: "Musicians & Hymnographers",
    ref: { kind: "finder", facet: "theme", value: "musicians" },
    note: "Those who gave the Church her voice.",
  },
  {
    label: "Writers",
    ref: { kind: "finder", facet: "theme", value: "writers" },
    note: "Chroniclers, letter-writers, and theologians.",
  },
  {
    label: "Artists & Iconographers",
    ref: { kind: "finder", facet: "theme", value: "iconographers" },
    note: "Those who wrote the icons in the first place.",
  },
  {
    label: "Craftsmen & Builders",
    ref: { kind: "finder", facet: "vocation", value: "Craftsman,Architect" },
    note: "Smiths, tentmakers, workers in wood and stone.",
  },
  {
    label: "Merchants",
    ref: { kind: "finder", facet: "vocation", value: "Merchant" },
    note: "Saints who kept accounts and stayed honest.",
  },
  {
    label: "Sailors & Fishermen",
    ref: { kind: "finder", facet: "vocation", value: "Sailor,Fisherman" },
    note: "The sea, and those who make a living from it.",
  },
  {
    label: "Scholars & Translators",
    ref: { kind: "finder", facet: "vocation", value: "Scholar,Translator" },
    note: "The learned, and those who carried the words across.",
  },
  {
    label: "Rulers & Public Office",
    ref: { kind: "finder", facet: "vocation", value: "Ruler" },
    note: "Those who held power without being destroyed by it.",
  },
];

/* =====================================================================
   TRADITIONAL vs REGIONAL vs MODERN
   ===================================================================== */

export interface GiftTierPanel {
  tier: GiftTier;
  label: string;
  lede: string;
  examples: string[];
}

export const IG_TIERS: GiftTierPanel[] = [
  {
    tier: "traditional",
    label: "Most Traditional",
    lede: "What Orthodox Christians everywhere actually do — Greek, Slavic, Antiochian, Romanian, Georgian alike.",
    examples: [
      "The patron saint icon given at baptism, by the godparent",
      "Christ and the Theotokos as the first two icons of a home",
      "The pair of wedding icons the couple is blessed with",
      "The Resurrection kept in the corner all year, not seasonally",
    ],
  },
  {
    tier: "regional",
    label: "Common Regional Customs",
    lede: "Genuinely traditional, genuinely local — and easy to mistake for universal Orthodoxy.",
    examples: [
      "The Slava icon, kept where every visitor sees it — Serbian",
      "The krasny ugol, the beautiful corner — Russian",
      "The name day celebrated above the birthday — Greek & Slavic",
      "January 30, the Three Hierarchs, kept as the feast of education — Greek",
    ],
  },
  {
    tier: "modern",
    label: "Modern Suggestions",
    lede: "Good ideas, offered as ideas — calling a modern convenience an ancient custom is how tradition gets diluted.",
    examples: [
      "Icons given at a graduation, a civic milestone and not a feast",
      "Icons as Pascha presents — the traditional gift is a red egg",
      "Illustrated children's prayer books and board books",
      "The icon of a child's future patron, chosen before the name is settled",
    ],
  },
];

/* =====================================================================
   "WHO ARE YOU BUYING FOR?"
   ===================================================================== */

export const IG_RECIPIENTS: GiftRecipient[] = [
  {
    id: "child",
    label: "A Child",
    glyph: "infant",
    intro:
      "Hang them low. A child venerates the icon they can reach, and ignores the one they cannot see.",
    icons: [
      {
        name: "Their patron saint",
        why: "The saint whose name they bear — the one they should be able to name by the time they can talk.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "The Guardian Angel",
        why: "The classic gift for a child's room, and the answer to the dark.",
        tier: "traditional",
        ref: { kind: "page", href: "guardian-angels" },
      },
      {
        name: "Christ Blessing the Children",
        why: "The one Gospel scene where children are the point.",
        tier: "traditional",
      },
      {
        name: "St Stylianos of Paphlagonia",
        why: "A monk who cared for children; widely kept as their protector in Greek tradition.",
        tier: "regional",
        where: "Greek practice.",
        ref: { kind: "saint", id: "OS-0062" },
      },
    ],
  },
  {
    id: "catechumen",
    label: "A Catechumen",
    glyph: "scroll",
    intro:
      "Someone preparing for baptism, often with no icons at all and no idea what to ask for. Start them at the centre, not the edges.",
    icons: [
      {
        name: "Christ",
        why: "The first icon anyone should own. Not a saint, not a feast — Christ.",
        tier: "traditional",
      },
      {
        name: "The Theotokos",
        why: "The second. These two together are an icon corner; everything else is addition.",
        tier: "traditional",
      },
      {
        name: "The saint whose name they are considering",
        why: "A catechumen choosing a name is choosing a person. An icon makes the choice concrete — but wait until the name is settled.",
        tier: "modern",
        ref: { kind: "page", href: "quiz" },
      },
    ],
  },
  {
    id: "newly-baptized",
    label: "Newly Baptized",
    glyph: "font",
    intro:
      "The patron icon is the godparent's to give. If you are not the godparent, work around it.",
    icons: [
      {
        name: "Their patron saint",
        why: "The traditional gift — but check with the godparent first, whose gift this properly is.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "The Baptism of Christ (Theophany)",
        why: "The icon of the day itself, and rarely given. A good choice when the patron icon is spoken for.",
        tier: "traditional",
      },
      {
        name: "A prayer rope",
        why: "Short — thirty-three knots. A hundred-knot rope is a burden to a beginner.",
        tier: "traditional",
      },
    ],
  },
  {
    id: "bride-groom",
    label: "A Bride & Groom",
    glyph: "rings",
    intro:
      "They are about to have a home with bare walls. Ask the parents first — in many traditions the wedding pair is theirs to give.",
    icons: [
      {
        name: "Christ and the Theotokos, as a matched pair",
        why: "The wedding pair, and the centre of the icon corner they are about to start. Buy them together, matched in hand and size.",
        tier: "traditional",
      },
      {
        name: "The Wedding at Cana",
        why: "Christ's first sign, worked at a wedding. For the dining room.",
        tier: "traditional",
      },
      {
        name: "Sts Peter & Fevronia",
        why: "The Russian icon of married love.",
        tier: "regional",
        where: "Russian tradition.",
        ref: { kind: "saint", id: "OS-1422" },
      },
      {
        name: "Sts Joachim & Anna",
        why: "For a couple hoping for children — and especially for one that has been waiting.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2939" },
      },
    ],
  },
  {
    id: "priest",
    label: "A Priest",
    glyph: "chalice",
    intro:
      "He probably has icons. What he may not have is one that is his rather than the parish's.",
    icons: [
      {
        name: "Christ the High Priest",
        why: "The icon of the priesthood — and a reminder whose it is.",
        tier: "traditional",
      },
      {
        name: "St John Chrysostom",
        why: "The author of the Liturgy he serves most Sundays.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0023" },
      },
      {
        name: "The Three Holy Hierarchs",
        why: "A common ordination gift, and a common gift ever after.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2933" },
      },
    ],
  },
  {
    id: "deacon",
    label: "A Deacon",
    glyph: "chalice",
    intro:
      "The diaconate has its own saints, and they are not the same as the priesthood's.",
    icons: [
      {
        name: "St Stephen the Protomartyr",
        why: "The first deacon and the first martyr, stoned while praying for the men who were killing him. The diaconal icon.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0009" },
      },
      {
        name: "The Seven Deacons",
        why: "The seven chosen by the apostles in Acts 6, headed by Stephen — the origin of the order itself.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2944" },
      },
      {
        name: "His patron saint",
        why: "The saint whose name he keeps.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
    ],
  },
  {
    id: "monastic",
    label: "A Monastic",
    glyph: "cross",
    intro:
      "Ask the monastery first. Monastics own little by design, and what they may keep is often not their own decision.",
    icons: [
      {
        name: "The saint of their tonsure",
        why: "The new name, the new patron. The one gift they cannot buy for themselves in advance.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "St Anthony the Great",
        why: "The father of monasticism, who went into the desert and found it crowded.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0026" },
      },
      {
        name: "A prayer rope",
        why: "Consumable, used constantly, and always wearing out. Rarely the wrong gift — though many monastics make their own.",
        tier: "traditional",
      },
    ],
  },
  {
    id: "godchild",
    label: "A Godchild",
    glyph: "font",
    intro:
      "The patron icon is yours to give. This is the one gift on this page that is closer to a duty than a choice.",
    icons: [
      {
        name: "Their patron saint",
        why: "Your gift, by long custom, at the baptism. It will likely outlive you.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "A baptismal cross",
        why: "Traditionally the godparent's to provide, along with the baptismal garment.",
        tier: "traditional",
      },
      {
        name: "The Guardian Angel",
        why: "For a young godchild, and for the parents' peace of mind.",
        tier: "traditional",
        ref: { kind: "page", href: "guardian-angels" },
      },
      {
        name: "Their saint's life, as they grow",
        why: "The godparent's real work is catechesis, not gifts. A name-day book each year does more than one expensive icon.",
        tier: "modern",
      },
    ],
  },
  {
    id: "parents",
    label: "Parents",
    glyph: "house",
    intro:
      "For new parents, or for your own. The icons that mark a household rather than a person.",
    icons: [
      {
        name: "The Theotokos with the Christ Child",
        why: "A mother holding her son. It does not need explaining to a parent.",
        tier: "traditional",
      },
      {
        name: "Sts Joachim & Anna",
        why: "Parents themselves, who waited a long time and were reproached for it.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2939" },
      },
      {
        name: "The family's patron saint",
        why: "The saint the household already keeps — a Slava saint, a parish patron, a grandmother's saint.",
        tier: "regional",
      },
    ],
  },
  {
    id: "grandparents",
    label: "Grandparents",
    glyph: "house",
    intro:
      "Often the household with the most icons already — and the one most likely to be praying for everyone else in the family by name.",
    icons: [
      {
        name: "Sts Joachim & Anna",
        why: "The grandparents of the Lord according to the flesh. The obvious icon, and a good one.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2939" },
      },
      {
        name: "The patron saints of the grandchildren",
        why: "A small icon for each grandchild's saint, gathered together. They are already praying for them; this gives the prayer faces.",
        tier: "modern",
      },
      {
        name: "St Anna",
        why: "The mother of the Theotokos, and widely kept as a patron of grandmothers.",
        tier: "regional",
        ref: { kind: "saint", id: "OS-2750" },
      },
    ],
  },
  {
    id: "friend",
    label: "A Friend",
    glyph: "candle",
    intro:
      "The hardest case, because there is no occasion doing the work for you. Their name day is the answer.",
    icons: [
      {
        name: "Their patron saint",
        why: "Given on their name day. It says you know which saint is theirs, which is a more intimate thing to know than a birthday.",
        tier: "traditional",
        ref: { kind: "page", href: "quiz" },
      },
      {
        name: "A saint whose life resembles theirs",
        why: "A convert, a soldier, a nurse, a widow, someone who came back after years away — the Church has a saint for it, and the point of the gift is that you noticed.",
        tier: "modern",
        ref: { kind: "page", href: "search" },
      },
      {
        name: "Beeswax candles or incense",
        why: "Small, consumable, and impossible to get wrong for a household that already prays.",
        tier: "traditional",
      },
    ],
  },
  {
    id: "sick",
    label: "Someone Who Is Sick",
    glyph: "vial",
    intro:
      "Give it without promises. They know the odds better than you do, and an icon is not a charm.",
    icons: [
      {
        name: "St Panteleimon",
        why: "The physician-martyr, and the most invoked healing saint in the Orthodox world.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0014" },
      },
      {
        name: "St Luke of Crimea",
        why: "A surgeon and archbishop who operated by day and was exiled for his faith. The icon for the modern sick.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-0049" },
      },
      {
        name: "The Holy Unmercenaries",
        why: "The healer-saints together, who took no payment.",
        tier: "traditional",
        ref: { kind: "saint", id: "OS-2957" },
      },
      {
        name: "The Archangel Raphael",
        why: 'Whose name means "God heals."',
        tier: "traditional",
        ref: { kind: "host", id: "HH-0012" },
      },
    ],
  },
  {
    id: "grieving",
    label: "Someone Grieving",
    glyph: "cross",
    intro:
      "Wait. The fortieth day is a kinder time to give a gift than the third, and the bereaved are drowning in casseroles in the first week.",
    icons: [
      {
        name: "The Resurrection (the Descent into Hades)",
        why: "Christ hauling the dead out of their graves. Not a consolation — a claim.",
        tier: "traditional",
      },
      {
        name: 'The Theotokos "Joy of All Who Sorrow"',
        why: "The Mother of God among the afflicted. Named for this.",
        tier: "regional",
        where: "Russian tradition.",
      },
      {
        name: "The patron saint of the departed",
        why: "For a household that wants to keep praying with the name in front of them.",
        tier: "regional",
      },
    ],
  },
];

/* =====================================================================
   TIPS
   ===================================================================== */

export const IG_TIPS: { title: string; body: string }[] = [
  {
    title: "Buy from Orthodox iconographers where you can",
    body: "Monastery workshops keep the craft alive and the theology right — and usually cost less than you would guess.",
  },
  {
    title: 'Avoid novelty and decorative "icons"',
    body: "Sentimental or Renaissance-style religious art is not an icon, whatever it is sold as. Iconography has a grammar; an image that breaks it teaches the wrong thing for years.",
  },
  {
    title: "Printed icons are entirely appropriate",
    body: "A mounted print is a real icon, blessed like any other. Far better a good print of the right saint than nothing, or than a bad hand-painted one.",
  },
  {
    title: "Hand-painted icons are beautiful, not required",
    body: "A written icon is a wonderful gift, often months to commission. But it is a gift of degree, not of kind — the print and the panel are both icons.",
  },
  {
    title: "Have it blessed, where that is the custom",
    body: "Many traditions bless an icon before use; customs vary, so ask the recipient's priest. A two-minute conversation after Liturgy.",
  },
  {
    title: "The meaning outweighs the price",
    body: "The most valuable icon in a home is rarely the most expensive — it is the one someone was baptized with. Give the right saint at the right moment; the value accrues on its own.",
  },
  {
    title: "Ask before you duplicate",
    body: "The patron icon is the godparent's gift; the wedding pair often the parents'; a monastic may not be free to keep what you bring. One question beforehand.",
  },
  {
    title: "Tell them what it is",
    body: "To an inquirer or a convert's family an icon arrives without instructions. Say who it is and where it might hang — one left in its box is a gift that did not arrive.",
  },
];

/* =====================================================================
   RELATED PAGES
   ===================================================================== */

export const IG_RELATED: {
  label: string;
  blurb: string;
  href: string;
  glyph: string;
}[] = [
  {
    label: "Icons in the Home",
    blurb:
      "Where each icon goes, room by room — the icon corner, the entryway, the kitchen, and the customs that surround them.",
    href: withBase("icons-home"),
    glyph: "house",
  },
  {
    label: "Patron Saint Quiz",
    blurb:
      "Not sure whose saint to give? Answer a few questions and find a patron by life, vocation, and need.",
    href: withBase("quiz"),
    glyph: "candle",
  },
  {
    label: "Browse the Saints",
    blurb:
      "Search every saint by name, feast, region, and era — and find the one whose story fits the person.",
    href: withBase("search"),
    glyph: "scroll",
  },
  {
    label: "Browse by Patronage",
    blurb:
      "Which saint is asked for in which need — healing, childbirth, travel, employment, and the rest.",
    href: withBase("search?browse=intercession"),
    glyph: "tools",
  },
  {
    label: "The Orthodox Calendar",
    blurb: "Find a name day. Every saint, every feast, every day of the year.",
    href: withBase("calendar"),
    glyph: "star",
  },
  {
    label: "Liturgical Living",
    blurb:
      "Keeping the Church's year at home — the fasts, the feasts, and the rhythms of an Orthodox household.",
    href: withBase("liturgical-living"),
    glyph: "dove",
  },
];
