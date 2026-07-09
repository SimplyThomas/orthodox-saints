/* Build-time data source for the Heavenly Hosts (HH-####). public/hosts.json is
   emitted by the Python pipeline (hostlib.py via build.py) and read from disk
   here — NOT fetched at runtime, and NOT watched by the dev server, so restart
   `make serve` after a data rebuild (same contract as lib/data.ts). */
import { readFileSync } from "node:fs";
import { getCollection, type CollectionEntry } from "astro:content";
import { selectProfiles } from "./profile-select";

export interface Host {
  id: string;
  name: string;
  aka?: string[];
  entityType: string;
  order?: string; // one of the nine Dionysian ranks
  triad?: "First" | "Second" | "Third"; // derived from order
  canonicalStatus: string;
  primarySource?: string;
  scripture?: string[];
  deuterocanonical?: string[];
  extraBiblical?: string[];
  feasts?: string[];
  relatedFeasts?: string[];
  relatedSaints?: string[];
  relatedBeings?: string[];
  brief: string;
  tags?: string[];
  icon: string;
  notes?: string;
  sources?: string[];
  named: boolean;
  profileType: "host";
  hasProfile: boolean;
  // Self-hosted portrait (validated open-license); absent until a host_images
  // row exists. `image`/`imageThumb` are static-relative paths.
  image?: string;
  imageThumb?: string;
  imageCredit?: string;
  imageLicense?: string;
  imageSource?: string;
  imageAvailable: boolean;
  // Vendor-permission images (§9): a revocable per-vendor grant. Present instead
  // of imageCredit/imageLicense. imageSource links the specific vendor buy page.
  imagePermission?: boolean;
  imageVendor?: string;
  imageAttribution?: string;
  imageVendorHome?: string;
  // "Depictions & Icons" carousel cards (data/host_depictions.csv). Permission
  // cards carry permission/vendor/attribution; open-license cards license/credit.
  depictions?: {
    image: string;
    kind: "museum" | "iconographer" | "shop";
    title: string;
    tag?: string;
    era?: string;
    by?: string;
    source?: string;
    permission?: boolean;
    vendor?: string;
    attribution?: string;
    license?: string;
    credit?: string;
  }[];
}

const raw = JSON.parse(readFileSync("public/hosts.json", "utf8")) as {
  hosts: Host[];
};

export const HOSTS: Host[] = raw.hosts;
export const hostById: Map<string, Host> = new Map(HOSTS.map((h) => [h.id, h]));

/**
 * Reserved tag that routes a host to the **Biblical Encounters** hub instead of
 * the Guardian Angels & Titled Figures hub. Both sets carry the same
 * `entityType` ("Scriptural Angel" / "Collective"), so the discriminator is this
 * tag rather than the entity type: titled/office figures (the Angel of the Lord,
 * the Commander of the Lord's Army, the angels of the seven churches) stay on
 * /guardian-angels; angels tied to one specific scriptural *event* (freeing
 * Peter, the empty tomb, troubling the pool of Bethesda, wrestling Jacob) carry
 * this tag and live on /biblical-encounters. The tag also flips the /host/HH-####
 * breadcrumb target. Kept out of the finder/quiz like every host record.
 */
export const BIBLICAL_ENCOUNTER_TAG = "Biblical Encounter";

/** True when a host is an event-anchored Biblical Encounter (see the tag doc). */
export function isBiblicalEncounter(h: Host): boolean {
  return (h.tags ?? []).includes(BIBLICAL_ENCOUNTER_TAG);
}

export type HostProfile = CollectionEntry<"hosts">["data"];

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

/** id -> host profile, gated by review status (production ships only
    `reviewed`; dev / PUBLIC_SHOW_DRAFTS loads all). */
export async function loadHostProfileMap(): Promise<
  Record<string, HostProfile>
> {
  const all = (await getCollection("hosts")).map((e) => e.data);
  return selectProfiles(all, SHOW_DRAFTS);
}
