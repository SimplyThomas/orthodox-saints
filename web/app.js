"use strict";

/* ============================================================================
   Cloud of Witnesses — SPA (Direction A · Reverent Editorial)
   Static client-side app over public/data.json. Faceted search + detail +
   patron quiz + curated "Saints of America" feature.
   ========================================================================== */

// Facets to expose, in display order. key = data.json field; multi = array field.
const FACETS = [
  { key: "intercession", label: "Intercessions",                multi: true },
  { key: "experience",   label: "Life Experience",             multi: true },
  { key: "rank",         label: "Rank / Type",                 multi: true },
  { key: "vocation",     label: "Vocation",                    multi: true },
  { key: "origin",       label: "Region of Origin",            multi: true },
  { key: "tradition",    label: "Tradition of Veneration",     multi: true },
  { key: "era",          label: "Era",                         multi: false },
  { key: "century",      label: "Century",                     multi: false },
  { key: "gender",       label: "Gender",                      multi: false },
];
const OPEN_BY_DEFAULT = new Set(["intercession", "experience"]);
const PER_PAGE = 24;

let SAINTS = [];
const byId = new Map();
const selected = {};
FACETS.forEach((f) => (selected[f.key] = new Set()));
let query = "";
let sortMode = "feast";
let page = 0;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August",
  "September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/* --------------------------------------------------------------- SVG motifs */
function byzCross(size = 22, color = "currentColor", stroke = 2.2) {
  return `<svg width="${size}" height="${size * 1.5}" viewBox="0 0 20 30" fill="none"
    stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" aria-hidden="true">
    <line x1="10" y1="2" x2="10" y2="28"/><line x1="6" y1="6.5" x2="14" y2="6.5"/>
    <line x1="3" y1="12" x2="17" y2="12"/><line x1="5.5" y1="21" x2="14.5" y2="18.5"/></svg>`;
}
function searchGlyph(size = 22, color = "currentColor") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}"
    stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>`;
}
function domeMark(w = 200, color = "#D4AF37") {
  let domes = "";
  [40, 100, 160].forEach((cx, i) => {
    const s = i === 1 ? 1.25 : 1;
    const top = i === 1 ? 6 : 22;
    domes += `<path d="M${cx} ${top - 6} v8" stroke="${color}" stroke-width="2.5"/>
      <path d="M${cx - 5} ${top} h10 M${cx} ${top - 4} v8" stroke="${color}" stroke-width="2.2" fill="none"/>
      <path d="M${cx - 16 * s} 100 C ${cx - 16 * s} ${72 - 8 * s}, ${cx - 18 * s} ${60 - 10 * s}, ${cx} ${top + 6}
        C ${cx + 18 * s} ${60 - 10 * s}, ${cx + 16 * s} ${72 - 8 * s}, ${cx + 16 * s} 100 Z"/>`;
  });
  return `<svg width="${w}" height="${w * 0.5}" viewBox="0 0 200 100" fill="${color}"
    style="width:100%;height:auto" aria-hidden="true">${domes}</svg>`;
}
function saintIcon(w = 120, h = 150, tone = "blue", halo = true, round = false) {
  const T = {
    blue: { bg:"#efe3cb", frame:"#a9852a", halo:"#D4AF37", fig:"#234C7A", face:"#cdb98f" },
    gold: { bg:"#1b3a5c", frame:"#D4AF37", halo:"#D4AF37", fig:"#9bb6d4", face:"#e6cd7e" },
  }[tone];
  const cid = "arch" + tone + w + h + (halo ? "h" : "") + (round ? "r" : "");
  const haloEls = halo
    ? `<circle cx="60" cy="66" r="30" fill="none" stroke="${T.halo}" stroke-width="3"/>
       <line x1="60" y1="40" x2="60" y2="92" stroke="${T.halo}" stroke-width="2.4"/>
       <line x1="36" y1="66" x2="84" y2="66" stroke="${T.halo}" stroke-width="2.4"/>
       <line x1="60" y1="112" x2="60" y2="132" stroke="${T.halo}" stroke-width="2.4"/>
       <line x1="52" y1="120" x2="68" y2="120" stroke="${T.halo}" stroke-width="2.4"/>`
    : `<circle cx="60" cy="66" r="30" fill="none" stroke="${T.frame}" stroke-width="1.5" opacity=".5"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><clipPath id="${cid}"><path d="M6 ${round ? 70 : 24} a54 54 0 0 1 108 0 V144 a6 6 0 0 1 -6 6 H12 a6 6 0 0 1 -6 -6 Z"/></clipPath></defs>
    <rect x="1.5" y="1.5" width="117" height="147" rx="6" fill="${T.bg}" stroke="${T.frame}" stroke-width="2.5"/>
    <g clip-path="url(#${cid})"><rect x="6" y="0" width="108" height="150" fill="${T.bg}"/>
    ${haloEls}
    <path d="M22 150 C24 116 38 100 60 100 C82 100 96 116 98 150 Z" fill="${T.fig}"/>
    <circle cx="60" cy="66" r="19" fill="${T.face}"/>
    <path d="M60 47 a19 19 0 0 0 -19 19 q19 6 38 0 a19 19 0 0 0 -19 -19" fill="${T.fig}" opacity=".55"/></g></svg>`;
}

/* --------------------------------------------------------------- data utils */
function valuesOf(saint, key) {
  const v = saint[key];
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}
function cleanName(name) {
  return (name || "").replace(/^(Sts?\.?|Holy|The)\s+/i, "").trim();
}
// Split a display name into a head + italic epithet, e.g.
// "Basil the Great" → {title:"Basil", epithet:"the Great"}.
function splitName(name) {
  const n = cleanName(name);
  const m = n.match(/^(.+?)(\s+(?:of|the)\s+.+)$/i);
  if (m) return { title: m[1].trim(), epithet: m[2].trim() };
  return { title: n, epithet: "" };
}
function rankSlug(s) {
  const r = (s.rank && s.rank[0]) || "";
  return "t-" + r.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
}
function primaryRank(s) { return (s.rank && s.rank[0]) || "Saint"; }
function firstFeast(s) {
  const m = (s.feast || "").match(/([A-Z][a-z]{2})\s+\d{1,2}/);
  return m ? m[0] : (s.feast || "").split(";")[0].trim();
}
function centuryLabel(s) {
  if (s.century) return s.century + " c.";
  if ((s.era || "").toLowerCase().includes("old testament")) return "O.T.";
  return s.era || "";
}
function centuryNum(s) {
  const c = (s.century || "").trim();
  if (!c) return (s.era || "").toLowerCase().includes("old testament") ? -1000 : 9999;
  const bc = /bc/i.test(c);
  const n = parseInt(c, 10);
  if (isNaN(n)) return 9999;
  return bc ? -n : n;
}
function feastDates(s) {
  const out = [];
  const re = /([A-Z][a-z]{2})\s+(\d{1,2})/g;
  let m;
  while ((m = re.exec(s.feast || ""))) {
    const mi = MONTHS.indexOf(m[1]);
    if (mi >= 0) out.push({ m: mi + 1, d: +m[2] });
  }
  return out;
}

/* ---------------------------------------------------------------------- load */
async function init() {
  try {
    const res = await fetch("./data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    SAINTS = await res.json();
  } catch (err) {
    $("#loading").textContent =
      "Could not load the saints data. Run the build, then reload. (" + err.message + ")";
    return;
  }
  SAINTS.forEach((s) => byId.set(s.id, s));
  $("#loading").hidden = true;

  // motif injection
  $("#hero-dome").innerHTML = domeMark(520, "var(--byz)");
  $("#quiz-dome").innerHTML = domeMark(560, "var(--byz)");
  $("#quiz-cross").innerHTML = byzCross(30, "var(--gold)");
  $("#footer-cross").insertAdjacentHTML("afterbegin", byzCross(14, "var(--gold)"));
  $("#hero-search-ico").innerHTML = searchGlyph(22, "var(--celest)");
  $("#header-search .ico").innerHTML = searchGlyph(16, "var(--celest)");

  buildSaintOfDay();
  buildFeatured();
  buildCatalogStat();
  buildFacets();
  buildQuiz();
  buildAmerica();
  wireEvents();
  render();
  routeFromURL();
}

/* ----------------------------------------------------------- home: top band */
function notableFeatured(n) {
  const enriched = SAINTS.filter((s) => s.brief && (s.intercession || []).length);
  const pool = enriched.length >= n ? enriched : SAINTS.filter((s) => s.brief);
  return pool.slice(0, n);
}
function buildCatalogStat() {
  const trads = new Set();
  SAINTS.forEach((s) => valuesOf(s, "tradition").forEach((t) => trads.add(t)));
  $("#catalog-stat").textContent =
    `${SAINTS.length} saints catalogued${trads.size ? ` · ${trads.size} traditions` : ""}`;
}
function buildSaintOfDay() {
  const now = new Date();
  const tm = now.getMonth() + 1, td = now.getDate();
  const dateLabel = `${MONTHS_FULL[tm - 1]} ${td}`;
  const todays = SAINTS.filter((s) => feastDates(s).some((f) => f.m === tm && f.d === td));

  let primary, kicker, foot, note = "";
  if (todays.length) {
    primary = todays[0];
    kicker = `${WEEKDAYS[now.getDay()]} · Commemorated today`;
    const others = todays.slice(1, 4).map((s) => s.name);
    foot = others.length
      ? `<span>Also today:</span><span class="also">${others.map(esc).join(" · ")}</span>`
      : "";
  } else {
    // June etc. may not be loaded yet — fall back gracefully, without claiming a feast.
    const pool = notableFeatured(30);
    primary = pool[(tm * 31 + td) % pool.length] || SAINTS[0];
    kicker = `${WEEKDAYS[now.getDay()]} · From the cloud`;
    note = "No commemoration is loaded for today yet — meet a saint from the cloud.";
    foot = `<span class="also">${esc(note)}</span>`;
  }
  const sn = splitName(primary.name);
  $("#sotd").innerHTML = `
    <div class="eyebrow" style="margin-bottom:14px">Today · ${esc(dateLabel)}</div>
    <div class="sotd-card" data-id="${primary.id}" role="button" tabindex="0">
      <div class="sotd-top">
        ${saintIcon(92, 116, "gold")}
        <div>
          <div class="kicker">${esc(kicker)}</div>
          <h3>${esc(sn.title)}${sn.epithet ? ` <span style="font-style:italic;font-weight:500">${esc(sn.epithet)}</span>` : ""}</h3>
          <p>${esc(primary.brief || primary.notes || "")}</p>
        </div>
      </div>
      <div class="sotd-foot">${foot}</div>
    </div>`;
}
function buildFeatured() {
  const host = $("#featured");
  host.innerHTML = "";
  for (const s of notableFeatured(4)) {
    const sn = splitName(s.name);
    const div = document.createElement("div");
    div.className = "feat-card";
    div.dataset.id = s.id;
    div.setAttribute("role", "button");
    div.tabIndex = 0;
    div.innerHTML = `
      <div class="portrait">${saintIcon(84, 104, "blue")}</div>
      <div class="body">
        <h4>${esc(sn.title)}</h4>
        <div class="epithet">${esc(sn.epithet || (s.aka && s.aka[0]) || "")}</div>
        <span class="tag ${rankSlug(s)}"><i></i>${esc(primaryRank(s))}</span>
        <div class="feat-meta"><span>${esc(firstFeast(s))}</span><span>${esc(centuryLabel(s))}</span></div>
      </div>`;
    host.appendChild(div);
  }
}

/* --------------------------------------------------------------- facets UI */
function buildFacets() {
  const container = $("#facets");
  container.innerHTML = "";
  for (const facet of FACETS) {
    const counts = new Map();
    for (const s of SAINTS)
      for (const v of valuesOf(s, facet.key)) counts.set(v, (counts.get(v) || 0) + 1);
    if (counts.size === 0) continue;

    const options = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
    const details = document.createElement("details");
    details.className = "facet-group";
    details.dataset.key = facet.key;
    if (OPEN_BY_DEFAULT.has(facet.key)) details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = facet.label;
    details.appendChild(summary);

    const box = document.createElement("div");
    box.className = "facet-options";
    for (const [val, n] of options) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = val;
      cb.dataset.key = facet.key;
      cb.addEventListener("change", onFacetChange);
      const mark = document.createElement("span");
      mark.className = "box";
      mark.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "name";
      text.textContent = val;
      const cnt = document.createElement("span");
      cnt.className = "fcount";
      cnt.textContent = n;
      label.append(cb, mark, text, cnt);
      box.appendChild(label);
    }
    details.appendChild(box);
    container.appendChild(details);
  }
}
function onFacetChange(e) {
  const { key } = e.target.dataset;
  const set = selected[key];
  if (e.target.checked) set.add(e.target.value);
  else set.delete(e.target.value);
  page = 0;
  render();
}

/* --------------------------------------------------------------- filtering */
function activeCount() {
  return FACETS.reduce((n, f) => n + selected[f.key].size, 0);
}
function matches(saint) {
  if (query) {
    const hay = (saint.search || saint.name || "").toLowerCase();
    for (const tok of query.toLowerCase().split(/\s+/))
      if (tok && !hay.includes(tok)) return false;
  }
  for (const facet of FACETS) {
    const chosen = selected[facet.key];
    if (chosen.size === 0) continue;
    const vals = valuesOf(saint, facet.key);
    if (![...chosen].some((c) => vals.includes(c))) return false;
  }
  return true;
}
function sortSaints(list) {
  const arr = list.slice();
  if (sortMode === "name") arr.sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)));
  else if (sortMode === "century") arr.sort((a, b) => centuryNum(a) - centuryNum(b) || (a.feastSort || 0) - (b.feastSort || 0));
  else arr.sort((a, b) => (a.feastSort || 9999) - (b.feastSort || 9999) || cleanName(a.name).localeCompare(cleanName(b.name)));
  return arr;
}

function render() {
  const anyActive = !!query || activeCount() > 0;
  $("#clear-all").hidden = !anyActive;
  // Hide the editorial "today/featured" band while actively searching.
  $("#cloud-band").hidden = anyActive;

  const matched = sortSaints(SAINTS.filter(matches));
  $("#results-title").textContent = query ? `Results for “${query}”` : "All saints";
  $("#count").innerHTML =
    `<b>${matched.length}</b> commemoration${matched.length === 1 ? "" : "s"}` +
    (activeCount() > 0 ? ` · ${activeCount()} filter${activeCount() === 1 ? "" : "s"} active` : "");

  renderActiveChips();

  const pages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
  if (page >= pages) page = pages - 1;
  const ol = $("#results");
  ol.innerHTML = "";
  if (matched.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.innerHTML = `${byzCross(20, "var(--line-gold)")}No saints match these filters. ` +
      `<span class="link-btn" id="empty-clear">Clear filters</span>`;
    ol.appendChild(li);
    $("#pager").innerHTML = "";
    const ec = $("#empty-clear");
    if (ec) ec.addEventListener("click", clearAll);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const s of matched.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)) frag.appendChild(row(s));
  ol.appendChild(frag);
  renderPager(pages);
}

function renderActiveChips() {
  const host = $("#active-chips");
  host.innerHTML = "";
  for (const facet of FACETS) {
    for (const v of selected[facet.key]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ac";
      b.innerHTML = `${esc(v)}<span class="x" aria-hidden="true">×</span>`;
      b.setAttribute("aria-label", `Remove filter ${v}`);
      b.addEventListener("click", () => {
        selected[facet.key].delete(v);
        const cb = $(`#facets input[data-key="${facet.key}"][value="${cssEscape(v)}"]`);
        if (cb) cb.checked = false;
        page = 0;
        render();
      });
      host.appendChild(b);
    }
  }
}

function row(s) {
  const sn = splitName(s.name);
  const li = document.createElement("li");
  li.className = "saint-row";
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  const place = valuesOf(s, "origin").join(" · ");
  li.innerHTML = `
    <div class="portrait">${saintIcon(58, 72, "blue")}</div>
    <div class="main">
      <div class="title-line"><h3>${esc(sn.title)}</h3>${sn.epithet ? `<span class="epithet">${esc(sn.epithet)}</span>` : ""}</div>
      <p class="bio">${esc(s.brief || s.notes || "")}</p>
      <div class="row-tags">
        <span class="tag ${rankSlug(s)}"><i></i>${esc(primaryRank(s))}</span>
        ${place ? `<span class="place">${esc(place)}</span>` : ""}
      </div>
    </div>
    <div class="aside">
      <div class="feast">${esc(firstFeast(s))}</div>
      <div class="century">${esc(centuryLabel(s))}</div>
      ${s.era ? `<div class="rank">${esc(s.era)}</div>` : ""}
    </div>`;
  const open = () => openDetail(s.id, true);
  li.addEventListener("click", open);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  return li;
}

function renderPager(pages) {
  const host = $("#pager");
  host.innerHTML = "";
  if (pages <= 1) return;
  const prev = document.createElement("button");
  prev.className = "nav";
  prev.textContent = "‹ Prev";
  prev.disabled = page === 0;
  prev.addEventListener("click", () => { page = Math.max(0, page - 1); render(); scrollToFinder(); });
  host.appendChild(prev);

  const items = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== "ell") items.push("ell");
  }
  for (const it of items) {
    if (it === "ell") {
      const e = document.createElement("span");
      e.className = "ell";
      e.textContent = "…";
      host.appendChild(e);
      continue;
    }
    const b = document.createElement("button");
    b.className = "pg" + (it === page ? " on" : "");
    b.textContent = it + 1;
    b.addEventListener("click", () => { page = it; render(); scrollToFinder(); });
    host.appendChild(b);
  }
  const next = document.createElement("button");
  next.className = "nav";
  next.textContent = "Next ›";
  next.disabled = page === pages - 1;
  next.addEventListener("click", () => { page = Math.min(pages - 1, page + 1); render(); scrollToFinder(); });
  host.appendChild(next);
}

function clearAll() {
  query = "";
  $("#q").value = "";
  FACETS.forEach((f) => selected[f.key].clear());
  $$("#facets input:checked").forEach((cb) => (cb.checked = false));
  page = 0;
  render();
}
function scrollToFinder() {
  $("#finder").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------------------------------------------ detail */
function row2(label, valueNode) {
  const div = document.createElement("div");
  div.className = "facet-row";
  const l = document.createElement("span");
  l.className = "label";
  l.textContent = label;
  div.append(l, valueNode);
  return div;
}
function textRow(label, text) {
  const span = document.createElement("span");
  span.textContent = text;
  return row2(label, span);
}
function tagsRow(label, values, cls) {
  const wrap = document.createElement("div");
  for (const v of values) {
    const t = document.createElement("span");
    t.className = "tag" + (cls ? " " + cls : "");
    t.textContent = v;
    wrap.appendChild(t);
  }
  return row2(label, wrap);
}
function worksRow(label, items) {
  const wrap = document.createElement("div");
  for (const it of items) {
    const a = document.createElement("a");
    a.href = it.u;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "worklink";
    a.textContent = it.t;
    wrap.appendChild(a);
  }
  return row2(label, wrap);
}

function openDetail(id, push) {
  const s = byId.get(id);
  if (!s) return;
  const panel = $("#detail");
  panel.innerHTML = "";

  const cardEl = document.createElement("div");
  cardEl.className = "detail-card";

  const close = document.createElement("button");
  close.className = "close link-btn";
  close.setAttribute("aria-label", "Close");
  close.innerHTML = "&times;";
  close.addEventListener("click", () => closeDetail(true));
  cardEl.appendChild(close);

  const h2 = document.createElement("h2");
  h2.textContent = s.name;
  cardEl.appendChild(h2);

  if (s.aka && s.aka.length) {
    const aka = document.createElement("p");
    aka.className = "aka";
    aka.textContent = "Also known as: " + s.aka.join("; ");
    cardEl.appendChild(aka);
  }
  if (s.prayer) {
    const p = document.createElement("p");
    p.className = "prayer";
    p.textContent = s.prayer;
    cardEl.appendChild(p);
  }
  if (s.brief) cardEl.appendChild(textRow("Brief Life", s.brief));

  const facetDefs = [
    ["Feast Day(s)", s.feast],
    ["Rank / Type", s.rank],
    ["Church Status", s.church],
    ["Family / Life State", s.family],
    ["Vocation", s.vocation],
    ["Commonly Asked Intercessions", s.intercession],
    ["Life Experience", s.experience],
    ["Virtue", s.virtue],
    ["Region of Origin", s.origin],
    ["Tradition of Veneration", s.tradition],
    ["Era", s.era],
    ["Century", s.century],
    ["Gender", s.gender],
  ];
  for (const [label, val, cls] of facetDefs) {
    if (Array.isArray(val)) {
      if (val.length) cardEl.appendChild(tagsRow(label, val, cls));
    } else if (val) cardEl.appendChild(textRow(label, val));
  }
  if (s.customs) cardEl.appendChild(textRow("Customs & Traditions", s.customs));
  if (s.notes) cardEl.appendChild(textRow("Notes", s.notes));
  if (s.works && s.works.length) cardEl.appendChild(worksRow("Works by the Saint", s.works));
  if (s.about && s.about.length) cardEl.appendChild(worksRow("Works About the Saint", s.about));

  // Links — Hymn / Icon / Video search-outs.
  const linkDefs = [["Hymn / Apolytikion", s.hymn], ["Icon", s.icon], ["Video / Media", s.video]]
    .filter(([, url]) => url);
  if (linkDefs.length) {
    const links = document.createElement("div");
    links.className = "linkouts";
    for (const [text, url] of linkDefs) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = text;
      links.appendChild(a);
    }
    cardEl.appendChild(row2("Links", links));
  }

  if (s.sources) cardEl.appendChild(textRow("Sources", s.sources));

  panel.appendChild(cardEl);
  panel.hidden = false;
  document.body.style.overflow = "hidden";
  close.focus();

  if (push) {
    const url = new URL(window.location);
    url.searchParams.set("s", id);
    history.pushState({ id }, "", url);
  }
}
function closeDetail(push) {
  $("#detail").hidden = true;
  document.body.style.overflow = "";
  if (push) {
    const url = new URL(window.location);
    url.searchParams.delete("s");
    history.pushState({}, "", url);
  }
}

/* ------------------------------------------------------------------- views */
function showView(view, push) {
  const valid = ["home", "quiz", "america"];
  if (!valid.includes(view)) view = "home";
  for (const v of valid) $("#" + v).hidden = v !== view;
  $$(".site-nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  window.scrollTo(0, 0);
  if (push) {
    const url = new URL(window.location);
    if (view === "home") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    url.searchParams.delete("quiz");
    history.pushState({ view }, "", url);
  }
}

/* -------------------------------------------------------------------- quiz */
const QUIZ = [
  { key: "intercession", weight: 3, q: "What would you most like a saint to pray for?" },
  { key: "experience",   weight: 2, q: "Have you walked through any of these?" },
  { key: "vocation",     weight: 2, q: "What is your work or calling?" },
  { key: "family",       weight: 2, q: "Your state in life?" },
  { key: "virtue",       weight: 1, q: "Which virtue do you most desire to grow in?" },
  { key: "tradition",    weight: 1, q: "Drawn to a particular tradition? (optional)" },
];
const quizSel = {};
QUIZ.forEach((g) => (quizSel[g.key] = new Set()));

function optionsFor(key) {
  const counts = new Map();
  for (const s of SAINTS)
    for (const v of valuesOf(s, key)) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v);
}
function buildQuiz() {
  const host = $("#quiz-questions");
  host.innerHTML = "";
  QUIZ.forEach((group, i) => {
    const block = document.createElement("div");
    block.className = "quiz-q";
    const head = document.createElement("div");
    head.className = "q-head";
    head.innerHTML = `<span class="q-num">Question ${i + 1} of ${QUIZ.length}</span>`;
    const h = document.createElement("h3");
    h.textContent = group.q;
    head.appendChild(h);
    block.appendChild(head);

    const chips = document.createElement("div");
    chips.className = "chips";
    for (const val of optionsFor(group.key).slice(0, 28)) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = val;
      chip.addEventListener("click", () => {
        if (quizSel[group.key].has(val)) { quizSel[group.key].delete(val); chip.classList.remove("on"); }
        else { quizSel[group.key].add(val); chip.classList.add("on"); }
      });
      chips.appendChild(chip);
    }
    block.appendChild(chips);
    host.appendChild(block);
  });
}
function quizMatches() {
  const out = [];
  for (const s of SAINTS) {
    let score = 0;
    const reasons = [];
    for (const { key, weight } of QUIZ) {
      const chosen = quizSel[key];
      if (!chosen.size) continue;
      for (const v of valuesOf(s, key)) if (chosen.has(v)) { score += weight; reasons.push(v); }
    }
    if (score > 0) out.push({ s, score, reasons });
  }
  out.sort((a, b) => b.score - a.score || cleanName(a.s.name).localeCompare(cleanName(b.s.name)));
  return out;
}
function renderQuizResults() {
  const box = $("#quiz-results");
  box.innerHTML = "";
  if (!QUIZ.some((g) => quizSel[g.key].size)) {
    box.innerHTML = "<p class='quiz-hint'>Pick at least one answer above, then try again.</p>";
    return;
  }
  const matched = quizMatches();
  if (!matched.length) {
    box.innerHTML = "<p class='quiz-hint'>No saints matched those answers yet — try broadening your choices.</p>";
    return;
  }
  const top = matched[0], runners = matched.slice(1, 4);
  const sn = splitName(top.s.name);
  const reasons = [...new Set(top.reasons)].slice(0, 8);

  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="eyebrow quiz-results-h" style="border:0;padding:0;margin-bottom:18px">Your patron saint</div>`;

  const card = document.createElement("div");
  card.className = "patron-card";
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  card.innerHTML = `
    <div class="frame">${saintIcon(170, 210, "gold", true, true)}</div>
    <div>
      <h2>${esc(sn.title)}</h2>
      <div class="epithet">${esc(sn.epithet || (top.s.aka && top.s.aka[0]) || "")}</div>
      <div class="pmeta">
        <span class="tag ${rankSlug(top.s)}" style="background:rgba(212,175,55,.18);color:var(--gold-soft)"><i></i>${esc(primaryRank(top.s))}</span>
        <span>Feast · ${esc(firstFeast(top.s))}</span><span>${esc(centuryLabel(top.s))}</span>
      </div>
      <p class="bio">${esc(top.s.brief || top.s.notes || "")}</p>
      <div class="why">
        <span class="why-label">Why</span>
        ${reasons.map((r) => `<span class="tag intercession">${esc(r)}</span>`).join("")}
      </div>
    </div>`;
  card.addEventListener("click", () => openDetail(top.s.id, true));
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(top.s.id, true); } });
  wrap.appendChild(card);

  if (runners.length) {
    const rl = document.createElement("div");
    rl.className = "runners-label";
    rl.textContent = "You also walk closely with";
    wrap.appendChild(rl);
    const rrow = document.createElement("div");
    rrow.className = "runners";
    for (const { s } of runners) {
      const rsn = splitName(s.name);
      const r = document.createElement("div");
      r.className = "runner";
      r.setAttribute("role", "button");
      r.tabIndex = 0;
      r.innerHTML = `${saintIcon(40, 50, "blue")}<div>
        <div class="rn-name">${esc(rsn.title)}</div>
        <div class="rn-sub">${esc(rsn.epithet || "")}${rsn.epithet ? " · " : ""}${esc(firstFeast(s))}</div></div>`;
      r.addEventListener("click", () => openDetail(s.id, true));
      r.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(s.id, true); } });
      rrow.appendChild(r);
    }
    wrap.appendChild(rrow);
  }
  box.appendChild(wrap);
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* --------------------------------------------------------- saints of america */
function findAmerican(name, epithet) {
  const fn = name.toLowerCase().replace(/^(elder|hieromonk)\s+/, "").split(" ")[0];
  const epMatch = (epithet || "").toLowerCase().match(/[a-z]{4,}/);
  const ep = epMatch ? epMatch[0] : "";
  return SAINTS.find((s) => {
    const hay = (s.name + " " + (s.aka || []).join(" ") + " " + (s.search || "")).toLowerCase();
    return hay.includes(fn) && (!ep || hay.includes(ep));
  });
}
function buildAmerica() {
  const lead = window.CW_AMERICA_LEAD;
  const glor = window.CW_AMERICA_GLORIFIED || [];
  const awaiting = window.CW_AMERICA_AWAITING || [];
  if (!lead) return;

  const glorCards = glor.map((s) => {
    const hit = findAmerican(s.name, s.epithet);
    return `
      <div class="am-card${hit ? " clickable" : ""}"${hit ? ` data-id="${hit.id}" role="button" tabindex="0"` : ""}>
        <div class="portrait">${saintIcon(88, 108, "blue")}</div>
        <div class="body">
          <div class="card-head"><h3>${esc(s.name)}</h3><span class="years">${esc(s.years)}</span></div>
          <div class="epithet">${esc(s.epithet)}</div>
          <span class="tag ${"t-" + s.cat.toLowerCase().replace(/[^a-z]+/g, "-")}"><i></i>${esc(s.cat)}</span>
          <p>${esc(s.contribution)}</p>
          <div class="card-foot"><span class="feast">Feast · ${esc(s.feast)}</span><span class="glor">Glorified ${esc(s.glorified)}</span></div>
        </div>
      </div>`;
  }).join("");

  const awaitCards = awaiting.map((s) => {
    const reposed = (s.years.split("–").pop() || "").trim();
    return `
      <div class="am-await-card">
        <div class="portrait-await">${saintIcon(108, 132, "blue", false)}</div>
        <div>
          <div class="head"><h3>${esc(s.name)}</h3><span class="years">${esc(s.years)}</span></div>
          <div class="epithet">${esc(s.epithet)}</div>
          <div class="badges">
            <span class="tag t-venerated"><i></i>${esc(s.role)}</span>
            <span class="tag t-venerated">Not yet glorified</span>
          </div>
          <p>${esc(s.contribution)}</p>
          <div class="repose">✝ Reposed ${esc(reposed)} · ${esc(s.place)}</div>
        </div>
      </div>`;
  }).join("");

  $("#america").innerHTML = `
    <section class="am-hero">
      <div class="dome-bg">${domeMark(460, "var(--byz)")}</div>
      <div class="inner">
        <div class="cross">${byzCross(26, "var(--gold)")}</div>
        <div class="eyebrow">The Faith Planted in the New World</div>
        <h1>Saints of America</h1>
        <p>From the shores of Alaska to the cities of the East, these holy men and women carried
           Orthodoxy to this continent — and tended it through hardship, mission, and martyrdom.</p>
      </div>
    </section>

    <section class="am-section">
      <div class="am-lead">
        <div class="frame">${saintIcon(160, 196, "gold", true, true)}</div>
        <div>
          <span class="badge">${esc(lead.badge)}</span>
          <h2>${esc(lead.name)} <span class="epithet">${esc(lead.epithet)}</span></h2>
          <div class="years">${esc(lead.years)}</div>
          <p>${esc(lead.contribution)}</p>
          <div class="facts">
            <span><span class="k">Feast</span> · ${esc(lead.feast)}</span>
            <span class="sep"></span>
            <span><span class="k">Glorified</span> · ${esc(lead.glorified)}</span>
          </div>
        </div>
      </div>

      <div class="am-grid-head">
        <div>
          <div class="eyebrow" style="margin-bottom:8px">Glorified by the Church</div>
          <h2>Saints of North America</h2>
        </div>
        <span class="stat">${glor.length + 1} commemorated · Alaska to the Atlantic</span>
      </div>
      <div class="am-grid">${glorCards}</div>

      <div class="am-awaiting">
        <div class="panel">
          <div class="note">
            ${byzCross(22, "var(--gold-deep)")}
            <div>
              <div class="eyebrow" style="margin-bottom:8px">Awaiting Glorification</div>
              <h2>Remembered with Love</h2>
              <p>These reposed servants of God have not yet been formally glorified by the Church.
                 They are gathered here with reverence — held in living memory by the faithful whose
                 lives they shaped on this soil, and are not presented as canonized saints.</p>
            </div>
          </div>
          <div class="pair">${awaitCards}</div>
        </div>
      </div>
    </section>`;

  $$("#america .am-card.clickable").forEach((c) => {
    const open = () => openDetail(c.dataset.id, true);
    c.addEventListener("click", open);
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
}

/* ----------------------------------------------------------------- routing */
function routeFromURL() {
  const params = new URL(window.location).searchParams;
  const view = params.has("quiz") ? "quiz" : (params.get("view") || "home");
  showView(view, false);
  const id = params.get("s");
  if (id && byId.has(id)) openDetail(id, false);
  else closeDetail(false);
}

/* ------------------------------------------------------------------ events */
function wireEvents() {
  $("#q").addEventListener("input", (e) => { query = e.target.value.trim(); page = 0; render(); });
  $("#hero-search-btn").addEventListener("click", () => scrollToFinder());
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") scrollToFinder(); });
  $("#clear-all").addEventListener("click", clearAll);
  $("#sort").addEventListener("change", (e) => { sortMode = e.target.value; render(); });

  $("#brand").addEventListener("click", () => { showView("home", true); window.scrollTo(0, 0); });
  $("#brand").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showView("home", true); } });
  $("#header-search").addEventListener("click", () => {
    showView("home", true);
    const q = $("#q");
    q.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => q.focus(), 300);
  });
  $$(".site-nav button").forEach((b) =>
    b.addEventListener("click", () => showView(b.dataset.view, true))
  );
  $$(".browse-by .chip").forEach((c) =>
    c.addEventListener("click", () => {
      const d = $(`#facets details[data-key="${c.dataset.browse}"]`);
      if (d) d.open = true;
      scrollToFinder();
    })
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#detail").hidden) closeDetail(true);
  });
  $("#detail").addEventListener("click", (e) => { if (e.target.id === "detail") closeDetail(true); });
  window.addEventListener("popstate", routeFromURL);

  $("#quiz-back").addEventListener("click", () => showView("home", true));
  $("#quiz-submit").addEventListener("click", renderQuizResults);
  $("#quiz-reset").addEventListener("click", () => {
    QUIZ.forEach((g) => quizSel[g.key].clear());
    $$("#quiz-questions .chip.on").forEach((c) => c.classList.remove("on"));
    $("#quiz-results").innerHTML = "";
  });

  // Delegated open for cards built via innerHTML (saint-of-day, featured).
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (card && (card.classList.contains("sotd-card") || card.classList.contains("feat-card")))
      openDetail(card.dataset.id, true);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest && e.target.closest(".sotd-card[data-id], .feat-card[data-id]");
    if (card) { e.preventDefault(); openDetail(card.dataset.id, true); }
  });
}

/* ------------------------------------------------------------------ helpers */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function cssEscape(s) {
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\\]]/g, "\\$&");
}

init();
