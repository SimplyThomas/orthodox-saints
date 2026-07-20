/**
 * Cloud of Witnesses — data-quality report Worker.
 *
 * Receives a POST from the public /corrections form on orthodoxsaintfinder.com,
 * verifies a Cloudflare Turnstile token, validates + sanitizes the input, then
 * opens a GitHub issue (labelled `data-quality`) via the REST API. The visitor
 * never touches GitHub.
 *
 * GitHub auth is a **GitHub App** (not a PAT): the Worker signs a short-lived
 * JWT with the App's private key, exchanges it for a 1-hour installation token,
 * and uses that to create the issue. The private key never expires, so there is
 * nothing to rotate on a schedule.
 *
 * The reporter's email is NEVER published in the issue. If one is supplied, the
 * maintainer gets a private notification (via a Cloudflare `send_email` binding)
 * so they can reply — best-effort, and skipped silently when unconfigured.
 *
 * Bindings (see wrangler.toml + README):
 *   secrets : APP_PRIVATE_KEY (PKCS#8 PEM), TURNSTILE_SECRET_KEY,
 *             REPORT_NOTIFY_TO (verified Email Routing destination
 *             address(es); comma-separated for fan-out)
 *   vars    : APP_ID, INSTALLATION_ID, REPO_OWNER, REPO_NAME,
 *             ALLOWED_ORIGIN (comma-separated list ok)
 *   email   : EMAIL (send_email binding; from reports@orthodoxsaintfinder.com)
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
    const body = buildBody({ typeLabel, subject, description, suggestion, source, name });

    // --- create it on GitHub -------------------------------------------------
    try {
      const issue = await createIssue(env, title, body);
      // Best-effort private notification so the maintainer can reply to the
      // reporter — the email is deliberately kept out of the public issue.
      await notifyReporter(env, { issue, email, name, subject: title });
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
const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": GITHUB_API_VERSION,
  "User-Agent": USER_AGENT,
};

async function createIssue(env, title, body) {
  const token = await getInstallationToken(env);
  const owner = env.REPO_OWNER;
  const repo = env.REPO_NAME;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...GH_HEADERS,
      Authorization: `Bearer ${token}`,
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

// Exchange an App JWT for a short-lived (1-hour) installation access token.
async function getInstallationToken(env) {
  const jwt = await makeAppJwt(env.APP_ID, env.APP_PRIVATE_KEY);
  const res = await fetch(
    `https://api.github.com/app/installations/${env.INSTALLATION_ID}/access_tokens`,
    { method: "POST", headers: { ...GH_HEADERS, Authorization: `Bearer ${jwt}` } },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub App token ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.token;
}

// Build and RS256-sign a GitHub App JWT (valid ~9 min; iat backdated for skew).
async function makeAppJwt(appId, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64urlStr(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) }),
  );
  const signingInput = `${header}.${payload}`;
  const key = await importPkcs8(privateKeyPem);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}

// Import a PKCS#8 PEM private key for RS256 signing. GitHub Apps download a
// PKCS#1 key ("BEGIN RSA PRIVATE KEY"); convert it once with openssl (README).
async function importPkcs8(pem) {
  const b64 = String(pem)
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

// base64url of raw bytes / of a UTF-8 string (JWT segment encoding).
function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (s) => b64url(new TextEncoder().encode(s));

// ---- private reporter notification ------------------------------------------
// After the public issue is filed, email the maintainer (NOT the reporter) so a
// reply is possible without the reporter's address ever appearing in the issue.
// Best-effort: any failure is logged and swallowed — the issue is already filed,
// so the request must still succeed. Skips silently when the binding/secret is
// absent (local + test environments) or no email was supplied.
const NOTIFY_FROM = "reports@orthodoxsaintfinder.com";

async function notifyReporter(env, { issue, email, name, subject }) {
  if (!email) return; // nothing to reply to
  if (!env || !env.EMAIL || !env.REPORT_NOTIFY_TO) return; // not configured

  // REPORT_NOTIFY_TO may be a single address or a comma-separated list. Each
  // recipient must be a VERIFIED Email Routing destination address (a custom
  // routing address on the zone, e.g. contact@…, is not one and is rejected by
  // the binding) — so fan-out is done here, one message per recipient.
  const recipients = str(env.REPORT_NOTIFY_TO)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipients.length) return;

  let EmailMessage;
  try {
    // `cloudflare:email` only exists in the Workers runtime; import it lazily so
    // this module still loads under plain node (tests inject env.EmailMessage).
    EmailMessage =
      env.EmailMessage || (await import("cloudflare:email")).EmailMessage;
  } catch (err) {
    console.error("Reporter notification unavailable:", err && err.message);
    return;
  }

  const number = issue && issue.number;
  const issueUrl =
    (issue && issue.html_url) ||
    `https://github.com/${env.REPO_OWNER}/${env.REPO_NAME}/issues/${number}`;

  // Per-recipient try/catch: one rejected address (e.g. not yet verified) must
  // not stop the copies to the others.
  for (const to of recipients) {
    try {
      const raw = buildNotificationMessage({
        from: NOTIFY_FROM,
        to,
        number,
        email,
        name,
        subject,
        issueUrl,
      });
      await env.EMAIL.send(new EmailMessage(NOTIFY_FROM, to, raw));
    } catch (err) {
      console.error(
        "Reporter notification failed for " + to + ":",
        err && err.message,
      );
    }
  }
}

// Hand-built minimal RFC 5322 message. Header values are stripped of CR/LF so a
// crafted email/name/subject can't inject extra headers (defence in depth — the
// values are already clean()'d). Body is plain UTF-8 text.
function buildNotificationMessage({ from, to, number, email, name, subject, issueUrl }) {
  const h = (v) => str(v).replace(/[\r\n]+/g, " ").trim();
  const subjectLine = h(`Correction report #${number} — reply to ${email}`);
  const bodyLines = [
    "A new correction report was filed and the reporter left a reply address.",
    "",
    "Reply to: " + h(email),
  ];
  if (name) bodyLines.push("Name: " + h(name));
  bodyLines.push("", "Report: " + h(subject), "Issue: " + h(issueUrl), "");
  const headers = [
    "From: " + h(from),
    "To: " + h(to),
    "Subject: " + subjectLine,
    "Date: " + new Date().toUTCString(),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];
  return headers.join("\r\n") + "\r\n\r\n" + bodyLines.join("\r\n");
}

// ---- issue formatting -------------------------------------------------------
function buildTitle(typeLabel, subject) {
  // Title can't be a code block, so neutralize mentions/refs and strip newlines.
  const subj = neutralize(subject) || "a page";
  return `[Data quality] ${typeLabel} — ${subj}`.replace(/\s+/g, " ").slice(0, 160);
}

function buildBody({ typeLabel, subject, description, suggestion, source, name }) {
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

  // The reporter's email is NEVER published — it goes only to the private
  // maintainer notification (see notifyReporter). The optional name
  // may stay public.
  if (name) lines.push("", "**Reporter**", fence("Name: " + name));

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
