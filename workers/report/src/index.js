/**
 * Cloud of Witnesses — data-quality report Worker.
 *
 * Receives a POST from the public /corrections form on orthodoxsaintfinder.com,
 * verifies a Cloudflare Turnstile token, validates + sanitizes the input, then
 * opens a GitHub issue (labelled `data-quality`) via the REST API using a
 * fine-grained PAT held as a Worker secret. The visitor never touches GitHub.
 *
 * Bindings (see wrangler.toml + README):
 *   secrets : GITHUB_TOKEN, TURNSTILE_SECRET_KEY
 *   vars    : REPO_OWNER, REPO_NAME, ALLOWED_ORIGIN (comma-separated list ok)
 */

// ---- limits -----------------------------------------------------------------
// Field caps keep the issue body bounded no matter what is submitted.
const LIMITS = {
  subject: 200,
  description: 4000,
  suggestion: 2000,
  source: 500,
  name: 120,
  email: 254,
};

// Allowed correction types: id -> human label shown in the issue.
const TYPES = {
  feast: "Feast date",
  name: "Name / spelling",
  bio: "Biography",
  image: "Image / icon",
  link: "Broken link",
  missing: "Missing saint",
  other: "Other",
};

const GITHUB_API_VERSION = "2022-11-28";
const USER_AGENT = "cloud-of-witnesses-report-bot";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed." }, 405, cors);
    }

    let fields;
    try {
      fields = await parseBody(request);
    } catch {
      return json({ ok: false, error: "Could not read your submission." }, 400, cors);
    }

    // Honeypot: a hidden field real users never fill. If present, silently
    // pretend success so bots get no signal, but never create an issue.
    if (typeof fields.website === "string" && fields.website.trim() !== "") {
      return json({ ok: true, message: "Thank you." }, 200, cors);
    }

    // --- Turnstile verification (server-side) --------------------------------
    const token = str(fields["cf-turnstile-response"]);
    if (!token) {
      return json(
        { ok: false, error: "Please complete the verification challenge." },
        400,
        cors,
      );
    }
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const turnstileOk = await verifyTurnstile(token, ip, env);
    if (!turnstileOk) {
      return json(
        { ok: false, error: "Verification failed. Please try the challenge again." },
        400,
        cors,
      );
    }

    // --- validate + sanitize -------------------------------------------------
    const description = clean(fields.description, LIMITS.description);
    if (!description) {
      return json(
        { ok: false, error: "Please describe what needs fixing." },
        400,
        cors,
      );
    }
    const subject = clean(fields.subject, LIMITS.subject);
    const suggestion = clean(fields.suggestion, LIMITS.suggestion);
    const source = clean(fields.source, LIMITS.source);
    const name = clean(fields.name, LIMITS.name);

    const rawEmail = clean(fields.email, LIMITS.email);
    if (rawEmail && !isEmail(rawEmail)) {
      return json(
        { ok: false, error: "That email address doesn't look valid." },
        400,
        cors,
      );
    }
    const email = rawEmail;

    const typeId = TYPES[str(fields.type)] ? str(fields.type) : "other";
    const typeLabel = TYPES[typeId];

    // --- build the issue -----------------------------------------------------
    const title = buildTitle(typeLabel, subject);
    const body = buildBody({ typeLabel, subject, description, suggestion, source, name, email });

    // --- create it on GitHub -------------------------------------------------
    try {
      const issue = await createIssue(env, title, body);
      return json(
        { ok: true, message: "Your report has been filed. Thank you!", number: issue.number },
        200,
        cors,
      );
    } catch (err) {
      // Log internally for debugging; never leak the token or raw GitHub error.
      console.error("GitHub issue creation failed:", err && err.message);
      return json(
        { ok: false, error: "We couldn't file your report right now. Please try again later." },
        502,
        cors,
      );
    }
  },
};

// ---- request parsing --------------------------------------------------------
async function parseBody(request) {
  const ct = (request.headers.get("Content-Type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return await request.json();
  }
  // form-encoded or multipart
  const form = await request.formData();
  const out = {};
  for (const [k, v] of form.entries()) out[k] = typeof v === "string" ? v : "";
  return out;
}

// ---- Turnstile --------------------------------------------------------------
async function verifyTurnstile(token, ip, env) {
  const form = new URLSearchParams();
  form.set("secret", env.TURNSTILE_SECRET_KEY || "");
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return data && data.success === true;
}

// ---- GitHub -----------------------------------------------------------------
async function createIssue(env, title, body) {
  const owner = env.REPO_OWNER;
  const repo = env.REPO_NAME;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels: ["data-quality"] }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${detail.slice(0, 300)}`);
  }
  return await res.json();
}

// ---- issue formatting -------------------------------------------------------
function buildTitle(typeLabel, subject) {
  // Title can't be a code block, so neutralize mentions/refs and strip newlines.
  const subj = neutralize(subject) || "a page";
  return `[Data quality] ${typeLabel} — ${subj}`.replace(/\s+/g, " ").slice(0, 160);
}

function buildBody({ typeLabel, subject, description, suggestion, source, name, email }) {
  // Every user-supplied value is rendered inside a fenced code block — GitHub
  // does not linkify @mentions / #refs inside code fences, and backticks are
  // already stripped in clean(), so the fence can't be broken out of.
  const lines = [
    "**Type of correction:** " + neutralize(typeLabel),
    "",
    "**Saint / page**",
    fence(subject || "—"),
    "",
    "**What needs fixing**",
    fence(description),
  ];
  if (suggestion) lines.push("", "**Suggested correction**", fence(suggestion));
  if (source) lines.push("", "**Source / citation**", fence(source));

  const who = [];
  if (name) who.push("Name: " + name);
  if (email) who.push("Email: " + email);
  if (who.length) lines.push("", "**Reporter**", fence(who.join("\n")));

  lines.push(
    "",
    "---",
    "_Filed via the public Cloud of Witnesses correction form. Reporter details are self-reported and unverified._",
  );
  return lines.join("\n");
}

// ---- sanitization helpers ---------------------------------------------------
function str(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** Coerce, strip control chars + backticks, collapse, and cap length. */
function clean(v, max) {
  let s = str(v);
  // drop control characters (keep ordinary printable text only)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = s.replace(/`/g, ""); // strip backticks so code fences can't be broken
  s = s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n"); // tidy newlines
  s = s.trim();
  if (s.length > max) s = s.slice(0, max).trim() + "…";
  return s;
}

/** Defang @mentions and #refs for text used outside a code fence (title). */
function neutralize(s) {
  return str(s)
    .replace(/@/g, "@\u200b")
    .replace(/#/g, "#\u200b")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/** Wrap pre-cleaned text in a fenced code block (backticks already stripped). */
function fence(s) {
  return "```\n" + str(s) + "\n```";
}

function isEmail(s) {
  // Pragmatic check: single @, no spaces, a dotted domain. Not RFC-exhaustive.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= LIMITS.email;
}

// ---- CORS + JSON ------------------------------------------------------------
function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const headers = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  // Same-origin requests carry no Origin header — nothing to echo, and CORS
  // isn't needed. For cross-origin, echo only an allow-listed origin.
  if (origin && (allowed.includes(origin) || allowed.includes("*"))) {
    headers["Access-Control-Allow-Origin"] = origin === "*" ? "*" : origin;
  }
  return headers;
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}
