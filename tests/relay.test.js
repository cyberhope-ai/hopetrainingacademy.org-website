// Unit tests for api/lead.js (card 1103 relay). Offline: the CRM is a stubbed fetch.
//   node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const handler = require("../api/lead.js");

const SECRET = "test-relay-secret-not-real";
const GOOD = {
  first_name: "Ada", last_name: "Lovelace", email: "ada@example.invalid", phone: "317-555-0101",
  program: "AI apprenticeship", referral: "AI apprenticeship page", sms_consent: "yes",
  sms_consent_version: "hta-web-v2-2026-11-09", email_consent: "yes", zip: "46204",
  page: "/ai-apprenticeship-indiana/", landing_url: "https://hopetrainingacademy.org/ai-apprenticeship-indiana/?gclid=G123&utm_source=google&utm_campaign=grant",
};

function req(over = {}) {
  return {
    method: "POST",
    headers: { host: "hopetrainingacademy.org", origin: "https://hopetrainingacademy.org", ...(over.headers || {}) },
    body: "body" in over ? over.body : { ...GOOD },
    ...(over.method ? { method: over.method } : {}),
  };
}

function res() {
  return { statusCode: 0, headers: {}, ended: false, setHeader(k, v) { this.headers[k] = v; }, end() { this.ended = true; } };
}

async function run(over = {}, crm = { status: 200 }) {
  const calls = [];
  const logs = [];
  const realFetch = global.fetch, realLog = console.log;
  global.fetch = async (url, opts) => {
    calls.push({ url, opts, form: Object.fromEntries(new URLSearchParams(opts.body)) });
    if (crm.throw) throw crm.throw;
    return { ok: crm.status >= 200 && crm.status < 300, status: crm.status, json: async () => ({ message: { lead: "CRM-LEAD-1" } }) };
  };
  console.log = (m) => logs.push(String(m));
  const r = res();
  try {
    await handler(req(over), r);
  } finally {
    global.fetch = realFetch;
    console.log = realLog;
  }
  return { r, calls, logs };
}

test.beforeEach(() => { process.env.HTA_INTAKE_RELAY_SECRET = SECRET; });

test("forwards an allow-listed copy with the server-held relay_key and answers 204 with no lead id", async () => {
  const { r, calls } = await run();
  assert.strictEqual(r.statusCode, 204);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, handler.CRM_URL);
  const f = calls[0].form;
  assert.strictEqual(f.relay_key, SECRET);
  for (const k of ["first_name", "last_name", "email", "phone", "program", "referral", "sms_consent",
                   "sms_consent_version", "email_consent", "zip"]) assert.strictEqual(f[k], GOOD[k], k);
  assert.strictEqual(f.page, "/ai-apprenticeship-indiana/");
  assert.strictEqual(f.gclid, "G123");
  assert.strictEqual(f.utm_source, "google");
  assert.strictEqual(f.utm_campaign, "grant");
  assert.ok(!("lead" in r.headers));
});

test("drops every credential and non-listed field a client sends; a client relay_key is replaced", async () => {
  const body = { ...GOOD, access_key: "c6756334-public", key: "guess", intake_key: "guess", relay_key: "client-chosen",
                 subject: "New HTA Lead", from_name: "HTA Website", website: "hopetrainingacademy.org",
                 gclid: "FROM-BODY", evil: "x", botcheck: "" };
  const { calls } = await run({ body });
  const f = calls[0].form;
  for (const k of ["access_key", "key", "intake_key", "subject", "from_name", "website", "evil", "botcheck"]) {
    assert.ok(!(k in f), k);
  }
  assert.strictEqual(f.relay_key, SECRET);
  assert.strictEqual(f.gclid, "G123"); // from the landing URL, never from the body
});

test("folds the fields the intake does not read into description; zip stays its own field", async () => {
  const body = { first_name: "C", email: "c@example.invalid", message: "Can I tour on Friday?", intent: "Book a tour",
                 experience: "Some IT", typing_wpm: "52", typing_accuracy: "97", zip: "46204" };
  const { calls } = await run({ body });
  const f = calls[0].form;
  assert.strictEqual(f.description, "Interest: Book a tour | Experience: Some IT | Typing test wpm: 52 | " +
                                    "Typing test accuracy: 97 | Message: Can I tour on Friday?");
  assert.strictEqual(f.zip, "46204");
  for (const k of ["message", "intent", "experience", "typing_wpm", "typing_accuracy"]) assert.ok(!(k in f), k);
});

test("caps field lengths and strips control characters", async () => {
  const body = { ...GOOD, first_name: "A".repeat(500), message: "line1\nline2\u0000x", zip: "462041234567890" };
  const { calls } = await run({ body });
  const f = calls[0].form;
  assert.strictEqual(f.first_name.length, 100);
  assert.strictEqual(f.zip.length, 10);
  assert.strictEqual(f.description, "Message: line1 line2 x");
});

test("page is a path only; a foreign or non-https landing_url is dropped with its attribution", async () => {
  for (const landing_url of ["https://evil.example/?gclid=X", "http://hopetrainingacademy.org/?gclid=X", "not a url"]) {
    const { calls } = await run({ body: { ...GOOD, landing_url, page: "/x/?q=1#h" } });
    const f = calls[0].form;
    assert.ok(!("landing_url" in f) && !("gclid" in f), landing_url);
    assert.strictEqual(f.page, "/x/");
  }
  const { calls } = await run({ body: { ...GOOD, page: "https://evil.example/" } });
  assert.ok(!("page" in calls[0].form));
});

test("honeypot filled: quiet 204, nothing forwarded", async () => {
  const { r, calls } = await run({ body: { ...GOOD, botcheck: "on" } });
  assert.strictEqual(r.statusCode, 204);
  assert.strictEqual(calls.length, 0);
});

test("missing or malformed email: 400, nothing forwarded", async () => {
  for (const email of [undefined, "", "not-an-email", "a@b", "x@y.z<script>"]) {
    const { r, calls } = await run({ body: { ...GOOD, email } });
    assert.strictEqual(r.statusCode, 400, String(email));
    assert.strictEqual(calls.length, 0, String(email));
  }
});

test("no secret configured: 503, nothing forwarded (fail closed)", async () => {
  delete process.env.HTA_INTAKE_RELAY_SECRET;
  const realLog = console.log; console.log = () => {};
  const calls = []; const realFetch = global.fetch; global.fetch = async () => calls.push(1);
  const r = res();
  try { await handler(req(), r); } finally { global.fetch = realFetch; console.log = realLog; }
  assert.strictEqual(r.statusCode, 503);
  assert.strictEqual(calls.length, 0);
});

test("only POST, only the production hosts, only same-site", async () => {
  assert.strictEqual((await run({ method: "GET" })).r.statusCode, 405);
  for (const host of ["hta-site-git-branch.vercel.app", "hopetrainingacademy.org.evil.example", ""]) {
    const { r, calls } = await run({ headers: { host } });
    assert.strictEqual(r.statusCode, 404, host);
    assert.strictEqual(calls.length, 0);
  }
  for (const origin of ["https://evil.example", "null", "http://hopetrainingacademy.org"]) {
    const { r, calls } = await run({ headers: { origin } });
    assert.strictEqual(r.statusCode, 403, origin);
    assert.strictEqual(calls.length, 0);
  }
  // no Origin header: a same-site Referer is accepted, anything else refused
  assert.strictEqual((await run({ headers: { origin: undefined, referer: "https://www.hopetrainingacademy.org/campus.html" } })).r.statusCode, 204);
  assert.strictEqual((await run({ headers: { origin: undefined, referer: "https://hopetrainingacademy.org.evil.example/" } })).r.statusCode, 403);
  assert.strictEqual((await run({ headers: { origin: undefined } })).r.statusCode, 403);
});

test("oversized or non-object bodies are refused before anything is forwarded", async () => {
  assert.strictEqual((await run({ headers: { "content-length": String(17 * 1024) } })).r.statusCode, 413);
  assert.strictEqual((await run({ body: { ...GOOD, message: "x".repeat(17 * 1024) } })).r.statusCode, 413);
  for (const body of ["{not json", "[1,2]", null, 42]) {
    const { r, calls } = await run({ body });
    assert.strictEqual(r.statusCode, 400, String(body));
    assert.strictEqual(calls.length, 0);
  }
  assert.strictEqual((await run({ body: JSON.stringify(GOOD) })).r.statusCode, 204); // an unparsed JSON string
});

test("CRM outcomes: 429 passes through, 400 stays 400, other errors 502, timeout or network 504", async () => {
  assert.strictEqual((await run({}, { status: 429 })).r.statusCode, 429);
  assert.strictEqual((await run({}, { status: 400 })).r.statusCode, 400);
  for (const status of [401, 403, 500, 503]) assert.strictEqual((await run({}, { status })).r.statusCode, 502, String(status));
  const t = Object.assign(new Error("t"), { name: "TimeoutError" });
  assert.strictEqual((await run({}, { throw: t })).r.statusCode, 504);
  assert.strictEqual((await run({}, { throw: new TypeError("fetch failed") })).r.statusCode, 504);
});

test("the CRM call is bounded by a timeout signal", async () => {
  const { calls } = await run();
  assert.ok(calls[0].opts.signal, "AbortSignal.timeout set");
});

test("logs carry status and outcome only: never the secret, an email or a name", async () => {
  const { logs } = await run();
  const all = logs.join("\n");
  for (const s of [SECRET, GOOD.email, GOOD.first_name, GOOD.phone]) assert.ok(!all.includes(s), s);
  assert.deepStrictEqual(JSON.parse(logs[0]), { relay: "lead", status: 204, outcome: "forwarded" });
});

test("email length matches the CRM intake: 140 is forwarded, 141 is refused (never cut)", async () => {
  assert.strictEqual(handler.EMAIL_MAX, 140);
  const at140 = "a".repeat(140 - "@example.invalid".length) + "@example.invalid";
  const at141 = "a" + at140;
  assert.strictEqual(at140.length, 140);
  const ok = await run({ body: { ...GOOD, email: at140 } });
  assert.strictEqual(ok.r.statusCode, 204);
  assert.strictEqual(ok.calls[0].form.email, at140);
  const bad = await run({ body: { ...GOOD, email: at141 } });
  assert.strictEqual(bad.r.statusCode, 400);
  assert.strictEqual(bad.calls.length, 0);
});

test("description stays within the CRM's 2000 characters and never loses the structured fields", async () => {
  assert.strictEqual(handler.DESCRIPTION_MAX, 2000);
  const body = { first_name: "C", email: "c@example.invalid", intent: "I".repeat(200), experience: "E".repeat(500),
                 typing_wpm: "52", typing_accuracy: "97", message: "M".repeat(2000) };
  const { calls } = await run({ body });
  const d = calls[0].form.description;
  assert.strictEqual(d.length, 2000);
  for (const part of ["Interest: " + "I".repeat(200), "Experience: " + "E".repeat(500), "Typing test wpm: 52",
                      "Typing test accuracy: 97"]) assert.ok(d.includes(part), part.slice(0, 20));
  assert.ok(d.endsWith("[message shortened]"));
  const fits = await run({ body: { ...body, message: "short note" } });
  assert.ok(fits.calls[0].form.description.endsWith("Message: short note"));
  assert.ok(!fits.calls[0].form.description.includes("shortened"));
});
