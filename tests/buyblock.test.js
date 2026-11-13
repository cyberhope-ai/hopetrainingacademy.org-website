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
    assert.strictEqual(html.split(`href="https://store.hopetrainingacademy.org/products/${row.store_handle || row.slug}"`).length, 1, "no link still sends the buyer to a second page");
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
    // kali-claude's note on #20: the note must be present, not only "at most one"; one page never had the section
    const neverHadSection = ["medical-terminology-a-word-association-approach-self-guided"];
    assert.strictEqual(notes, neverHadSection.includes(row.slug) ? 0 : 1, "exactly one apprenticeship note");
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
