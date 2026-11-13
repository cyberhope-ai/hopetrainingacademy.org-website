// Course pages as product pages (CEO card 1375): every course in data/course-buy-data.json shows its price
// and a one-click checkout link under the title, with no form in the path, and the script is idempotent.
//   node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "course-buy-data.json"), "utf8"));
const page = (slug) => fs.readFileSync(path.join(ROOT, "courses", slug, "index.html"), "utf8");
const label = (price) => "$" + (Number(price) % 1 === 0 ? Number(price).toLocaleString("en-US") : Number(price).toLocaleString("en-US", { minimumFractionDigits: 2 }));

test("the committed pages match the data file (running the script changes nothing)", () => {
  const out = execFileSync("python3", [path.join(ROOT, "tools", "course_buy_block.py"), "--check"], { encoding: "utf8" });
  assert.match(out, / 0 differ/);
});

test("the certification badge stays where the page does not deny a certification", () => {
  // kali-claude's note on #18: without this, a tool that removed the badge everywhere would pass
  for (const slug of ["prepare-for-the-ged-test", "prepare-for-the-ged-test-self-guided", "prepare-for-the-ged-math-test", "teas-prep-1-self-guided", "supply-chain-management-fundamentals"])
    assert.ok(page(slug).includes("Industry certification</span>"), slug);
});

test("card 1393: the Indiana line, Department of Labor mentions and 'industry-recognized credential' are gone from every sales page", () => {
  const note = "sponsors registered apprenticeships through the United States Department of Labor, as a separate program from this course";
  for (const row of rows) {
    const html = page(row.slug);
    assert.ok(!html.includes('<div class="indiana">'), row.slug + ": Indiana line");
    const rest = html.split(note).join("").split("Bureau of Labor Statistics, U.S. Department of Labor").join("");
    assert.ok(!/USDOL|\bDOL\b|Department of Labor|industry-recognized credential/i.test(rest), row.slug + ": a claim is left");
    // one page (medical terminology, self-guided) never had the apprenticeship section, so it has no sentence
    assert.strictEqual(html.split(note).length - 1, html.split('data-apprenticeship-note="1"').length - 1, row.slug + ": the card 1388 sentence stays wherever it was");
    const description = html.match(/<meta name="description" content="([^"]*)">/);
    assert.ok(description && description[1].length >= 30, row.slug + ": the page keeps a description");
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(m[1]);
    assert.ok(!/<details><summary>[^<]*<\/summary><p><\/p><\/details>/.test(html), row.slug + ": no question is left without an answer");
  }
});

// CEO card course-pages-certification-sentences-restore-2026-11-13 (answer A): seven pages for a real outside
// certification keep the sentence that calls that certification "an industry-recognized credential".
const CREDENTIAL_PAGES = new Map([
  ["accounts-payable-specialist-certification-exam-cost-included", "prepare you for the current IOFM Accounts Payable Specialist (APS) certification exam, an industry-recognized credential."],
  ["certified-manufacturing-associate-cmfga", "This industry-recognized credential demonstrates your foundational knowledge in essential manufacturing concepts"],
  ["cisco-ccnp-enterprise-encor-enarsi", "This program focuses on practical skills and industry-recognized credentials."],
  ["comptia-certification-training-a-network-security-vouchers-included", "These CompTIA certifications are industry-recognized credentials that validate your skills directly."],
  ["comptia-certification-training-network-security-vouchers-included", "covering the cost to sit for these industry-recognized credentials."],
  ["robotics-in-manufacturing-fundamentals-rmf-voucher-included", "This industry-recognized credential, developed by leading organizations like SME and FIRST"],
  ["travel-agent-training-exam-cost-included", "offered by The Travel Institute, is included with this program, allowing you to pursue an industry-recognized credential"],
]);

test("certification sentences card (A): the true sentence is back on the seven approved pages, and only there", () => {
  const denies = /(?:does not|doesn't|do not|is not|isn't|\bno\b|rather than)(?![^.<]{0,70}\b(?:prior|prerequisite|required?|needed)\b)[^.<]{0,70}\bcertification/i;
  const inData = new Set(rows.map((r) => r.slug));
  for (const [slug, sentence] of CREDENTIAL_PAGES) {
    const html = page(slug);
    assert.ok(!inData.has(slug), slug + ": is one of the pages without a Buy button, as the card said");
    assert.ok(html.includes(sentence), slug + ": the restored sentence is on the page");
    assert.ok(!denies.test(html), slug + ": the page itself does not deny a certification");
    assert.ok(!/earn while you learn|on-the-job|de-risk/i.test(html), slug + ": no apprenticeship wording came back");
  }
  const withPhrase = fs.readdirSync(path.join(ROOT, "courses")).filter((d) => fs.existsSync(path.join(ROOT, "courses", d, "index.html")) && /industry-recognized credential/i.test(page(d)));
  assert.deepStrictEqual(withPhrase.sort(), [...CREDENTIAL_PAGES.keys()].sort());
});

test("card 1409: the 576 course pages without a Buy button are cleaned the same way, and no page says 'registered apprenticeship' outside the one sentence", () => {
  const note = "sponsors registered apprenticeships through the United States Department of Labor, as a separate program from this course";
  const inData = new Set(rows.map((r) => r.slug));
  const all = fs.readdirSync(path.join(ROOT, "courses")).filter((d) => fs.existsSync(path.join(ROOT, "courses", d, "index.html")));
  const others = all.filter((d) => !inData.has(d));
  assert.strictEqual(all.length, rows.length + others.length);
  assert.ok(others.length >= 500, "the other course pages are found");
  for (const slug of all) {
    const html = page(slug);
    const rest = html.split(note).join("").split("<h2>Registered apprenticeships</h2>").join("").split("Bureau of Labor Statistics, U.S. Department of Labor").join("");
    assert.ok(!/USDOL|\bDOL\b|Department of Labor|registered apprentice/i.test(rest), slug + ": a claim is left");
    if (!CREDENTIAL_PAGES.has(slug)) assert.ok(!/industry-recognized credential/i.test(rest), slug + ": the phrase is left on a page that is not on the approved list");
    assert.ok(!html.includes('<div class="indiana">'), slug + ": Indiana line");
    assert.ok(!html.includes("USDOL Registered Apprenticeship</span>"), slug + ": apprenticeship badge");
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(m[1]);
    assert.ok(/<h1>[^<]+<\/h1><p class="promise">[^<]{20,}<\/p>/.test(html), slug + ": the title and its one line are still there");
  }
  for (const slug of others) {
    const html = page(slug);
    assert.ok(!html.includes("buy-block"), slug + ": a page with no data row gets no price or Buy button");
    assert.strictEqual(html.split(note).length, 2, slug + ": the one sentence, once");
    assert.ok(html.includes("Check if you qualify"), slug + ": its own action button is not touched");
  }
});

test("card 1393: a wage-source citation is not a claim and stays", () => {
  assert.ok(page("the-keys-to-effective-editing").includes("Bureau of Labor Statistics, U.S. Department of Labor"));
});

for (const row of rows) {
  test(`${row.slug}: price and one-click checkout directly under the title`, () => {
    const html = page(row.slug);
    const cart = `https://store.hopetrainingacademy.org/cart/${row.variant_id}:1`;
    const h1 = html.indexOf("<h1>"), block = html.indexOf("<!-- buy-block:start -->"), chips = html.indexOf('<div class="chips">');
    assert.ok(h1 > 0 && block > h1 && block < chips, "buy block sits between the title and the chips");
    const box = html.slice(block, html.indexOf("<!-- buy-block:end -->"));
    if (!row.available) { assert.ok(!box.includes("/cart/"), "an unavailable course shows no Buy link"); return; }
    assert.ok(box.includes(`href="${cart}"`), "button goes to checkout for this variant");
    assert.ok(box.includes(`Enroll now · ${label(row.price)}`), "button shows the price");
    assert.ok(box.includes(`"item_id": "${row.sku}"`) && box.includes("begin_checkout"), "begin_checkout carries the item");
    assert.strictEqual(html.split(`href="https://store.hopetrainingacademy.org/products/${row.slug}"`).length, 1, "no link still sends the buyer to a second page");
    const course = html.match(/"offers": \{"@type": "Offer", "price": "([0-9.]+)"/);
    if (course) assert.strictEqual(course[1], row.price, "the page's existing course data shows the same price");
    assert.ok(html.split(`data-buy="1" href="${cart}"`).length >= 3, "the button is repeated lower on the page");
  });

  test(`${row.slug}: no form in the path, tags and product data intact`, () => {
    const html = page(row.slug);
    assert.ok(!/<form\b/i.test(html) && !/mailto:/i.test(html), "no form and no mailto on a product page");
    assert.ok(html.includes("G-HB7VCGD91F") && html.includes("AW-826975988") && html.includes("store.hopetrainingacademy.org'"), "tags and cross-domain linker still present");
    const ld = html.match(/<!-- buy-block-head:start --><script type="application\/ld\+json">(.*?)<\/script>/s);
    const product = JSON.parse(ld[1]);
    assert.strictEqual(product["@type"], "Product");
    assert.strictEqual(product.offers.price, row.price);
    assert.strictEqual(product.offers.url, `https://hopetrainingacademy.org/courses/${row.slug}/`);
    // card 1388: the apprenticeship section is one sentence that separates the program from this course
    assert.ok(!/<h2>Registered Apprenticeship —/.test(html) && !html.includes("Registered Apprenticeship pathway</p>"), "the old apprenticeship section is gone");
    const notes = html.split('data-apprenticeship-note="1"').length - 1;
    assert.ok(notes <= 1, "at most one apprenticeship note");
    if (notes) assert.ok(html.includes("as a separate program from this course") && html.includes('href="https://hopetrainingacademy.org/apprenticeship-paths/"'));
    // card 1382: no apprenticeship badge, no second action, and no certification badge on a page that says there is none
    assert.ok(!html.includes("USDOL Registered Apprenticeship</span>"), "no apprenticeship badge on a course sales page");
    assert.ok(!html.includes("Check if you qualify"), "Enroll is the only action");
    if (/(?:does not|doesn't|do not|is not|isn't|\bno\b|rather than)(?![^.<]{0,70}\b(?:prior|prerequisite|required?|needed)\b)[^.<]{0,70}\bcertification/i.test(html))
      assert.ok(!html.includes("Industry certification</span>"), "no certification badge where the page says there is none");
    // the grant rule is about how the Academy describes itself; a course whose own title contains the word is fine
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    const ours = html.slice(html.indexOf("<!-- buy-block:start -->"), html.indexOf("<!-- buy-block:end -->")).split(esc(row.name)).join("").split(JSON.stringify(row.name)).join("");
    assert.ok(!/\bschool\b/i.test(ours), "the buy block does not call the Academy a school");
  });
}
