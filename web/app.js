"use strict";

// Facets to expose, in display order. key = data.json field; multi = array field.
const FACETS = [
  { key: "intercession", label: "Commonly Asked Intercessions", multi: true },
  { key: "experience",   label: "Life Experience",             multi: true },
  { key: "rank",         label: "Rank / Type",                 multi: true },
  { key: "vocation",     label: "Vocation",                    multi: true },
  { key: "origin",       label: "Region of Origin",            multi: true },
  { key: "tradition",    label: "Tradition of Veneration",     multi: true },
  { key: "era",          label: "Era",                         multi: false },
  { key: "century",      label: "Century",                     multi: false },
  { key: "gender",       label: "Gender",                      multi: false },
];

// Facet groups open by default (the finder's primary lenses).
const OPEN_BY_DEFAULT = new Set(["intercession", "experience"]);

let SAINTS = [];
const byId = new Map();
const selected = {};          // key -> Set of chosen values
FACETS.forEach((f) => (selected[f.key] = new Set()));
let query = "";

const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------- load
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
  $("#browser").hidden = false;

  buildFacets();
  wireEvents();
  render();
  routeFromURL();
}

// ---------------------------------------------------------------- values
function valuesOf(saint, key) {
  const v = saint[key];
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

// ---------------------------------------------------------------- facets UI
function buildFacets() {
  const container = $("#facets");
  for (const facet of FACETS) {
    const counts = new Map();
    for (const s of SAINTS) {
      for (const v of valuesOf(s, facet.key)) {
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
    if (counts.size === 0) continue;

    const options = [...counts.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    const details = document.createElement("details");
    details.className = "facet-group";
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
      const text = document.createElement("span");
      text.textContent = val;
      const cnt = document.createElement("span");
      cnt.className = "fcount";
      cnt.textContent = n;
      label.append(cb, text, cnt);
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
  render();
}

// ---------------------------------------------------------------- filtering
function matches(saint) {
  // Free-text: every whitespace-separated token must appear in the haystack.
  if (query) {
    const hay = (saint.search || saint.name || "").toLowerCase();
    for (const tok of query.toLowerCase().split(/\s+/)) {
      if (tok && !hay.includes(tok)) return false;
    }
  }
  // Facets: AND across categories, OR within a category.
  for (const facet of FACETS) {
    const chosen = selected[facet.key];
    if (chosen.size === 0) continue;
    const vals = valuesOf(saint, facet.key);
    if (![...chosen].some((c) => vals.includes(c))) return false;
  }
  return true;
}

function render() {
  const matched = SAINTS.filter(matches);
  $("#count").textContent =
    `${matched.length} of ${SAINTS.length} saints` +
    (matched.length === SAINTS.length ? "" : " match your filters");

  const ol = $("#results");
  ol.innerHTML = "";
  if (matched.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No saints match. Try removing a filter or search term.";
    ol.appendChild(li);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const s of matched) frag.appendChild(card(s));
  ol.appendChild(frag);
}

function card(s) {
  const li = document.createElement("li");
  li.className = "saint-card";
  li.tabIndex = 0;
  li.setAttribute("role", "button");

  const h3 = document.createElement("h3");
  h3.textContent = s.name;
  li.appendChild(h3);

  const meta = document.createElement("div");
  meta.className = "meta";
  const bits = [s.rank?.join(", "), s.century, s.origin?.join(", "), s.feast].filter(Boolean);
  meta.textContent = bits.join("  ·  ");
  li.appendChild(meta);

  const inters = s.intercession || [];
  if (inters.length) {
    const tags = document.createElement("div");
    tags.className = "tags";
    for (const t of inters.slice(0, 6)) {
      const span = document.createElement("span");
      span.className = "tag intercession";
      span.textContent = t;
      tags.appendChild(span);
    }
    li.appendChild(tags);
  }

  const open = () => openDetail(s.id, true);
  li.addEventListener("click", open);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  return li;
}

// ---------------------------------------------------------------- detail
function row(label, valueNode) {
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
  return row(label, span);
}

function tagsRow(label, values) {
  const wrap = document.createElement("div");
  for (const v of values) {
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = v;
    wrap.appendChild(t);
  }
  return row(label, wrap);
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
  for (const [label, val] of facetDefs) {
    if (Array.isArray(val)) {
      if (val.length) cardEl.appendChild(tagsRow(label, val));
    } else if (val) {
      cardEl.appendChild(textRow(label, val));
    }
  }

  if (s.customs) cardEl.appendChild(textRow("Customs & Traditions", s.customs));
  if (s.notes) cardEl.appendChild(textRow("Notes", s.notes));
  if (s.works && s.works.length) cardEl.appendChild(tagsRow("Works by the Saint", s.works));
  if (s.about && s.about.length) cardEl.appendChild(tagsRow("Works About the Saint", s.about));
  if (s.sources) cardEl.appendChild(textRow("Sources", s.sources));

  const links = document.createElement("div");
  links.className = "linkouts";
  for (const [text, url] of [["Hymn / Apolytikion", s.hymn], ["Icon", s.icon], ["Video / Media", s.video]]) {
    if (!url) continue;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = text;
    links.appendChild(a);
  }
  cardEl.appendChild(links);

  const idline = document.createElement("p");
  idline.className = "detail-id";
  idline.textContent = s.id;
  cardEl.appendChild(idline);

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

// ---------------------------------------------------------------- routing
function routeFromURL() {
  const id = new URL(window.location).searchParams.get("s");
  if (id && byId.has(id)) openDetail(id, false);
  else closeDetail(false);
}

// ---------------------------------------------------------------- events
function wireEvents() {
  $("#q").addEventListener("input", (e) => {
    query = e.target.value.trim();
    render();
  });
  $("#clear-all").addEventListener("click", () => {
    query = "";
    $("#q").value = "";
    FACETS.forEach((f) => selected[f.key].clear());
    document.querySelectorAll("#facets input:checked").forEach((cb) => (cb.checked = false));
    render();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#detail").hidden) closeDetail(true);
  });
  $("#detail").addEventListener("click", (e) => {
    if (e.target.id === "detail") closeDetail(true); // click backdrop
  });
  window.addEventListener("popstate", routeFromURL);
}

init();
