// Every page's lead-form script, run as-is in a sandbox with stubbed browser objects (card 1103 relay):
// a submit posts the form to /api/lead (same origin, no access_key) AND to Web3Forms (unchanged), and
// nothing posts to the CRM directly. The 4 pages that have a form carry the hidden botcheck honeypot.
//   node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ENTRY = 'document.querySelectorAll("form.lead-form").forEach(function(f){f.addEventListener("submit",function(e){e.preventDefault();';

function htmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "tests", "api"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const PAGES = htmlFiles(ROOT).filter((p) => fs.readFileSync(p, "utf8").includes(ENTRY));

function scriptBlock(html) {
  const j = html.indexOf(ENTRY);
  const i = html.lastIndexOf("<script>", j) + "<script>".length;
  return html.slice(i, html.indexOf("</script>", j));
}

// Anything the page's other code touches: callable, chainable, harmless.
function anything() {
  const fn = function () {};
  return new Proxy(fn, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => "" : k === "length" ? 0 : anything()),
    apply: () => anything(),
    set: () => true,
  });
}

function sandbox(pathname, fields) {
  const calls = [];
  const storage = {};
  let submit = null;
  const form = {
    addEventListener: (ev, h) => { if (ev === "submit") submit = h; },
    querySelector: () => null,
    appendChild: () => {},
    set innerHTML(v) {},
  };
  class FormData {
    constructor() { this.e = Object.entries(fields); }
    forEach(cb) { this.e.forEach(([k, v]) => cb(v, k)); }
  }
  const document = new Proxy({}, {
    get: (t, k) => (k === "querySelectorAll"
      ? (sel) => (sel === "form.lead-form" ? [form] : [])
      : anything()),
  });
  const ctx = {
    document, FormData, JSON, Object, Array, String, Number, Math, Date, Error, Promise, parseInt, parseFloat,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, performance: { now: () => 0 },
    location: { pathname, href: `https://hopetrainingacademy.org${pathname}?gclid=G1` },
    sessionStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } },
    fetch: (url, opts) => { calls.push({ url, opts }); return Promise.resolve({ json: () => ({ success: true }) }); },
    window: anything(), navigator: anything(), console: { log() {}, error() {} },
  };
  return { ctx, calls, storage, submit: () => submit && submit({ preventDefault() {} }) };
}

test("59 pages carry the shared lead-form script", () => {
  assert.strictEqual(PAGES.length, 59);  // +apprenticeship-paths (card 1142)
});

for (const file of PAGES) {
  const rel = path.relative(ROOT, file);
  test(`submit posts to /api/lead and Web3Forms, never straight to the CRM: ${rel}`, () => {
    const html = fs.readFileSync(file, "utf8");
    assert.ok(!html.includes("crm.cyberhopeai.com"), "no CRM URL left in the page");
    const fields = { access_key: "public-web3forms-key", first_name: "Ada", email: "ada@example.invalid", zip: "46204" };
    const pathname = "/" + rel.replace(/index\.html$/, "");
    const s = sandbox(pathname, fields);
    vm.runInNewContext(scriptBlock(html), s.ctx, { timeout: 1000 });
    assert.strictEqual(s.storage.hta_landing, `https://hopetrainingacademy.org${pathname}?gclid=G1`, "landing URL kept");
    s.submit();
    const urls = s.calls.map((c) => c.url);
    assert.deepStrictEqual(urls, ["/api/lead", "https://api.web3forms.com/submit"]);
    const relay = s.calls[0];
    assert.strictEqual(relay.opts.method, "POST");
    assert.strictEqual(relay.opts.keepalive, true);
    const body = JSON.parse(relay.opts.body);
    assert.ok(!("access_key" in body), "the Web3Forms key is not sent to the relay");
    assert.strictEqual(body.email, "ada@example.invalid");
    assert.strictEqual(body.zip, "46204");
    assert.strictEqual(body.page, pathname);
    assert.strictEqual(body.landing_url, `https://hopetrainingacademy.org${pathname}?gclid=G1`);
    const w3f = JSON.parse(s.calls[1].opts.body);
    assert.strictEqual(w3f.access_key, "public-web3forms-key", "Web3Forms still gets its own key");
  });
}

test("the 5 pages with a lead form carry exactly one hidden botcheck honeypot inside it", () => {
  const withForm = PAGES.filter((p) => /<form\b[^>]*lead-form/.test(fs.readFileSync(p, "utf8")));
  assert.deepStrictEqual(withForm.map((p) => path.relative(ROOT, p)).sort(),
    ["ai-apprenticeship-indiana/index.html", "apprenticeship-paths/index.html", "campus.html", "free-typing-test/index.html",
     "index.html"]);
  for (const p of withForm) {
    const form = fs.readFileSync(p, "utf8").match(/<form\b[^>]*lead-form[^>]*>([\s\S]*?)<\/form>/)[1];
    const traps = form.match(/<input[^>]*name="botcheck"[^>]*>/g) || [];
    assert.strictEqual(traps.length, 1, p);
    assert.match(traps[0], /type="checkbox"/);
    assert.match(traps[0], /display:none/);
    assert.match(traps[0], /tabindex="-1"/);
    // the browser stops what the CRM would refuse or cut (astra review of #11)
    const email = form.match(/<input[^>]*name="email"[^>]*>/g);
    assert.strictEqual(email.length, 1, p);
    assert.match(email[0], /maxlength="140"/, p);
    for (const m of form.match(/<textarea[^>]*name="message"[^>]*>/g) || []) assert.match(m, /maxlength="1500"/, p);
  }
});
