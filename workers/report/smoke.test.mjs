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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
