// Self-contained smoke test for the Worker handler. Stubs global.fetch so no
// real Turnstile/GitHub calls happen. A real (throwaway) RSA key is generated so
// the App JWT-signing + installation-token path runs for real. Run: node smoke.test.mjs
import { generateKeyPairSync } from "node:crypto";
import worker from "./src/index.js";

// PKCS#8 PEM — the format importPkcs8() expects (as documented for prod setup).
const { privateKey: APP_PRIVATE_KEY } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const env = {
  APP_ID: "123456",
  INSTALLATION_ID: "7891011",
  APP_PRIVATE_KEY,
  TURNSTILE_SECRET_KEY: "sec",
  REPO_OWNER: "SimplyThomas",
  REPO_NAME: "orthodox-saints",
  ALLOWED_ORIGIN: "https://orthodoxsaintfinder.com",
};

let lastGithubBody = null;
let lastJwt = null;
function stubFetch({ turnstileOk = true, githubOk = true, tokenOk = true } = {}) {
  lastGithubBody = null;
  lastJwt = null;
  globalThis.fetch = async (url, init) => {
    // Route by exact host (+ path), not substring: a substring match on a URL is
    // unsound (e.g. https://evil.example/api.github.com) — and CodeQL flags it.
    const { hostname, pathname } = new URL(url);
    if (
      hostname === "challenges.cloudflare.com" &&
      pathname === "/turnstile/v0/siteverify"
    ) {
      return new Response(JSON.stringify({ success: turnstileOk }), {
        status: 200,
      });
    }
    if (hostname === "api.github.com") {
      // App installation-token exchange (uses the signed JWT as Bearer).
      if (pathname.endsWith("/access_tokens")) {
        lastJwt = (init.headers.Authorization || "").replace("Bearer ", "");
        return tokenOk
          ? new Response(
              JSON.stringify({ token: "ghs_installationtoken", expires_at: "" }),
              { status: 201 },
            )
          : new Response("bad app creds", { status: 401 });
      }
      // Issue creation (uses the installation token as Bearer).
      lastGithubBody = JSON.parse(init.body);
      return githubOk
        ? new Response(JSON.stringify({ number: 123 }), { status: 201 })
        : new Response("boom", { status: 500 });
    }
    throw new Error("unexpected fetch " + url);
  };
}

const post = (body, headers = {}) =>
  new Request("https://orthodoxsaintfinder.com/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

let pass = 0,
  fail = 0;
async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log("  ✓", name);
  } catch (e) {
    fail++;
    console.log("  ✗", name, "\n     ", e.message);
  }
}
const eq = (a, b, m) => {
  if (a !== b) throw new Error(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
};

console.log("Worker smoke tests");

await check("GET → 405", async () => {
  stubFetch();
  const res = await worker.fetch(
    new Request("https://x/api/report", { method: "GET" }),
    env,
  );
  eq(res.status, 405, "status");
});

await check("honeypot filled → 200 ok, NO issue created", async () => {
  stubFetch();
  lastGithubBody = null;
  const res = await worker.fetch(
    post({ website: "bot", description: "x", "cf-turnstile-response": "t" }),
    env,
  );
  const j = await res.json();
  eq(res.status, 200, "status");
  eq(j.ok, true, "ok");
  eq(lastGithubBody, null, "github not called");
});

await check("missing turnstile token → 400", async () => {
  stubFetch();
  const res = await worker.fetch(post({ description: "x" }), env);
  eq(res.status, 400, "status");
});

await check("failing turnstile → 400", async () => {
  stubFetch({ turnstileOk: false });
  const res = await worker.fetch(
    post({ description: "x", "cf-turnstile-response": "t" }),
    env,
  );
  eq(res.status, 400, "status");
});

await check("missing description → 400", async () => {
  stubFetch();
  const res = await worker.fetch(
    post({ subject: "St. X", "cf-turnstile-response": "t" }),
    env,
  );
  eq(res.status, 400, "status");
});

await check("bad email → 400", async () => {
  stubFetch();
  const res = await worker.fetch(
    post({ description: "x", email: "foo@bar", "cf-turnstile-response": "t" }),
    env,
  );
  eq(res.status, 400, "status");
});

await check("valid submit → 201? no, 200 ok with number, data-quality label", async () => {
  stubFetch();
  const res = await worker.fetch(
    post({
      type: "feast",
      subject: "St. Nicholas",
      description: "Dec 6 should note Dec 19.",
      "cf-turnstile-response": "t",
    }),
    env,
  );
  const j = await res.json();
  eq(res.status, 200, "status");
  eq(j.ok, true, "ok");
  eq(j.number, 123, "number");
  eq(JSON.stringify(lastGithubBody.labels), JSON.stringify(["data-quality"]), "labels");
});

await check("injection: backticks/@/# are neutralized", async () => {
  stubFetch();
  await worker.fetch(
    post({
      type: "other",
      subject: "@maintainer see #1 ```evil",
      description: "ping @someone and ref #42 ```\n```malicious",
      "cf-turnstile-response": "t",
    }),
    env,
  );
  const { title, body } = lastGithubBody;
  // title: no bare @mention or #ref (zero-width space inserted), no backticks
  if (/@[A-Za-z]/.test(title)) throw new Error("title has live @mention: " + title);
  if (/#\d/.test(title)) throw new Error("title has live #ref: " + title);
  if (title.includes("`")) throw new Error("title has backtick");
  // body: backticks stripped from user content, so the only ``` are our fences
  const fenceCount = (body.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) throw new Error("unbalanced code fences (fence escape!)");
  if (/```evil|```malicious/.test(body)) throw new Error("user backtick survived into body");
});

await check("over-long description is truncated with …", async () => {
  stubFetch();
  await worker.fetch(
    post({
      description: "a".repeat(9000),
      "cf-turnstile-response": "t",
    }),
    env,
  );
  if (!lastGithubBody.body.includes("…")) throw new Error("not truncated");
  if (lastGithubBody.body.length > 6000) throw new Error("body still too long");
});

await check("GitHub App: signs a valid RS256 JWT and uses the installation token", async () => {
  stubFetch();
  await worker.fetch(
    post({ description: "x", "cf-turnstile-response": "t" }),
    env,
  );
  // A well-formed JWT (three base64url segments) was sent to /access_tokens…
  if (!lastJwt || lastJwt.split(".").length !== 3)
    throw new Error("no/!well-formed JWT sent to the token endpoint: " + lastJwt);
  const hdr = JSON.parse(Buffer.from(lastJwt.split(".")[0], "base64url"));
  eq(hdr.alg, "RS256", "jwt alg");
  const claims = JSON.parse(Buffer.from(lastJwt.split(".")[1], "base64url"));
  eq(claims.iss, env.APP_ID, "jwt iss = app id");
  if (claims.exp - claims.iat > 600)
    throw new Error("JWT lifetime exceeds GitHub's 10-min max");
});

await check("GitHub App token 401 → 502 friendly (no issue attempted)", async () => {
  stubFetch({ tokenOk: false });
  const res = await worker.fetch(
    post({ description: "x", "cf-turnstile-response": "t" }),
    env,
  );
  eq(res.status, 502, "status");
  if (lastGithubBody !== null) throw new Error("attempted issue despite token failure");
});

await check("GitHub 500 → 502 friendly, no leak", async () => {
  stubFetch({ githubOk: false });
  const res = await worker.fetch(
    post({ description: "x", "cf-turnstile-response": "t" }),
    env,
  );
  const j = await res.json();
  eq(res.status, 502, "status");
  if (j.error.includes("boom") || j.error.includes("500"))
    throw new Error("leaked raw GitHub error");
  if (JSON.stringify(j).includes(env.APP_PRIVATE_KEY))
    throw new Error("leaked private key");
});

await check("cross-origin: allowed origin echoed", async () => {
  stubFetch();
  const res = await worker.fetch(
    post({ description: "x", "cf-turnstile-response": "t" }, { Origin: "https://orthodoxsaintfinder.com" }),
    env,
  );
  eq(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://orthodoxsaintfinder.com",
    "ACAO",
  );
});

await check("cross-origin: disallowed origin NOT echoed", async () => {
  stubFetch();
  const res = await worker.fetch(
    post({ description: "x", "cf-turnstile-response": "t" }, { Origin: "https://evil.example" }),
    env,
  );
  eq(res.headers.get("Access-Control-Allow-Origin"), null, "ACAO");
});

// --- private reporter email (send_email binding) -----------------------------
// The `cloudflare:email` module only exists in the Workers runtime, so we inject
// a fake EmailMessage constructor + EMAIL binding via env (the Worker prefers
// env.EmailMessage / env.EMAIL when present). This keeps the suite plain-node.
class FakeEmailMessage {
  constructor(from, to, raw) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}
function emailEnv(overrides = {}) {
  const sent = [];
  const emailBinding = {
    async send(message) {
      sent.push(message);
    },
    ...overrides.EMAIL,
  };
  return {
    env: {
      ...env,
      EmailMessage: FakeEmailMessage,
      EMAIL: overrides.EMAIL === null ? undefined : emailBinding,
      REPORT_NOTIFY_TO:
        "notify_to" in overrides ? overrides.notify_to : "maintainer@example.com",
      ...overrides.extra,
    },
    sent,
  };
}

await check("email in public issue body: NEVER present even when provided", async () => {
  stubFetch();
  await worker.fetch(
    post({
      description: "Fix the feast date.",
      name: "Jane Doe",
      email: "jane@example.com",
      "cf-turnstile-response": "t",
    }),
    env, // base env has no EMAIL binding — send is skipped, body still checked
  );
  const { body } = lastGithubBody;
  if (body.includes("jane@example.com")) throw new Error("email leaked into issue body");
  if (/Email:/.test(body)) throw new Error('issue body still has an "Email:" line');
  if (!body.includes("Jane Doe")) throw new Error("reporter name should still be public");
});

await check("email present + binding configured → send invoked with correct message", async () => {
  stubFetch();
  const { env: e, sent } = emailEnv();
  await worker.fetch(
    post({
      type: "feast",
      subject: "St. Nicholas",
      description: "Dec 6 should note Dec 19.",
      name: "Jane Doe",
      email: "jane@example.com",
      "cf-turnstile-response": "t",
    }),
    e,
  );
  eq(sent.length, 1, "one message sent");
  const msg = sent[0];
  eq(msg.from, "reports@orthodoxsaintfinder.com", "From");
  eq(msg.to, "maintainer@example.com", "To");
  if (!msg.raw.includes("jane@example.com")) throw new Error("raw missing reporter email");
  if (!/github\.com\/.+\/issues\/123/.test(msg.raw)) throw new Error("raw missing issue URL");
  if (!msg.raw.includes("Jane Doe")) throw new Error("raw missing reporter name");
  // RFC 5322 headers present, from/to correct, Subject references the issue number.
  if (!/^From: reports@orthodoxsaintfinder\.com\r\n/m.test(msg.raw))
    throw new Error("missing/incorrect From header");
  if (!/^To: maintainer@example\.com\r\n/m.test(msg.raw))
    throw new Error("missing/incorrect To header");
  if (!/^Subject: Correction report #123 — reply to jane@example\.com/m.test(msg.raw))
    throw new Error("Subject line wrong: " + msg.raw.split("\r\n").find((l) => l.startsWith("Subject:")));
  if (!/^Content-Type: text\/plain; charset=utf-8\r\n/m.test(msg.raw))
    throw new Error("missing Content-Type header");
});

await check("no email supplied → no send even when binding present", async () => {
  stubFetch();
  const { env: e, sent } = emailEnv();
  await worker.fetch(
    post({ description: "No reply address given.", "cf-turnstile-response": "t" }),
    e,
  );
  eq(sent.length, 0, "no message sent");
});

await check("email present but EMAIL binding absent → no throw, request still succeeds", async () => {
  stubFetch();
  const { env: e } = emailEnv({ EMAIL: null }); // binding removed, secret present
  const res = await worker.fetch(
    post({ description: "x", email: "jane@example.com", "cf-turnstile-response": "t" }),
    e,
  );
  const j = await res.json();
  eq(res.status, 200, "status");
  eq(j.ok, true, "ok");
  eq(j.number, 123, "issue still filed");
});

await check("email present but REPORT_NOTIFY_TO secret absent → no throw, still succeeds", async () => {
  stubFetch();
  const { env: e, sent } = emailEnv({ notify_to: undefined });
  const res = await worker.fetch(
    post({ description: "x", email: "jane@example.com", "cf-turnstile-response": "t" }),
    e,
  );
  const j = await res.json();
  eq(res.status, 200, "status");
  eq(j.ok, true, "ok");
  eq(sent.length, 0, "no message sent without a destination");
});

await check("send() throwing does NOT fail the request (issue already filed)", async () => {
  stubFetch();
  const { env: e } = emailEnv({
    EMAIL: { async send() { throw new Error("SMTP boom"); } },
  });
  const res = await worker.fetch(
    post({ description: "x", email: "jane@example.com", "cf-turnstile-response": "t" }),
    e,
  );
  const j = await res.json();
  eq(res.status, 200, "status");
  eq(j.ok, true, "ok");
  eq(j.number, 123, "issue still reported filed");
});

await check("header injection: CRLF in email can't inject notification headers", async () => {
  stubFetch();
  const { env: e, sent } = emailEnv();
  // A crafted email is already rejected by isEmail(), so drive the message
  // builder's defence directly with a value carrying CR/LF + header-like text.
  await worker.fetch(
    post({
      description: "x",
      // clean() normalizes CRLF to \n, h() collapses [\r\n]+ in header values,
      // and isEmail rejects spaces —
      // so injection can't reach the builder from input. Assert the guarantee at
      // the builder by feeding a nasty name (allowed chars) that includes fake
      // header text; header stripping collapses it onto one line.
      name: "Jane\nBcc: evil@example.com",
      email: "jane@example.com",
      "cf-turnstile-response": "t",
    }),
    e,
  );
  eq(sent.length, 1, "sent");
  const raw = sent[0].raw;
  // Split header block from body on the FIRST blank line only (the body itself
  // contains blank lines). The injected "Bcc:" must not appear as its own header
  // line, and the name's newline must be collapsed so it stays a single line.
  const sep = raw.indexOf("\r\n\r\n");
  const headerBlock = raw.slice(0, sep);
  const bodyBlock = raw.slice(sep + 4);
  if (/(^|\r\n)Bcc:/i.test(headerBlock)) throw new Error("injected Bcc header survived into headers");
  const nameLine = bodyBlock.split("\r\n").find((l) => l.startsWith("Name:"));
  if (!nameLine) throw new Error("Name line missing from body");
  if (nameLine.includes("\n") || nameLine.includes("\r"))
    throw new Error("name newline not collapsed: " + JSON.stringify(nameLine));
  if (!nameLine.includes("Bcc: evil@example.com"))
    throw new Error("name text should be flattened onto a single body line");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
