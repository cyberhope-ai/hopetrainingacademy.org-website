#!/usr/bin/env python3
"""Turn a static course page into a product page: price and a one-click Buy button under the title.

Rick, CEO card 1375 (2026-11-13), answer A: "Course pages on hopetrainingacademy.org rebuilt as real product
pages: price and Buy button at the top, one click to the same checkout".

  python3 tools/course_buy_block.py            apply data/course-buy-data.json to courses/<slug>/index.html
  python3 tools/course_buy_block.py --check    change nothing; list pages that differ from the data file (exit 1)

One row per course in the data file: slug, name, variant_id, price, sku, available, and store_handle only when
the store product's handle differs from the page slug.
The rows come from a Shopify product export, never from scraping the store. Running it twice changes nothing.
Everything this script writes sits between buy-block markers or is a link carrying data-buy, so it can always
find and replace its own work and touches nothing else on the page.
"""
import html
import json
import re
import sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = "https://store.hopetrainingacademy.org"
BLOCK = re.compile(r"[ \t]*<!-- buy-block:start -->.*?<!-- buy-block:end -->\n?", re.S)
HEAD_BLOCK = re.compile(r"<!-- buy-block-head:start -->.*?<!-- buy-block-head:end -->\n?", re.S)
BOUGHT = re.compile(r'<a ([^>]*?)data-buy="1" ([^>]*?)href="' + re.escape(STORE) + r'/cart/\d+:1"')
# CEO card 1382 (2026-11-13), answer A: on pages that sell a course, remove the "Industry certification" badge
# where the page itself says the course has no certification, remove the "USDOL Registered Apprenticeship"
# badge from individual course pages, and remove "Check if you qualify" so Enroll is the only action.
CHIP_APPRENTICESHIP = "<span class='chip'>🏛 USDOL Registered Apprenticeship</span>"
CHIP_CERTIFICATION = "<span class='chip'>🎓 Industry certification</span>"
QUALIFY = '<a class="cta ghost" href="https://hopetrainingacademy.org/#register">Check if you qualify</a>'
# The page "says there is none" when a sentence denies a certification: "does not lead to a specific industry
# certification", "no associated certification exam", "rather than preparing for a certification exam".
# Sentences about what a learner needs beforehand ("no prior certification required") do not count.
NO_CERTIFICATION = re.compile(
    r"(?:does not|doesn't|do not|is not|isn't|\bno\b|rather than)(?![^.<]{0,70}\b(?:prior|prerequisite|required?|needed)\b)"
    r"[^.<]{0,70}\bcertification", re.I)
# CEO card 1388 (2026-11-13), answer B: on a page that sells one course, the apprenticeship section becomes one
# true sentence: the Academy also sponsors registered apprenticeships, separate from this course, with a link.
APPRENTICESHIP_SECTION = re.compile(r'<h2>Registered Apprenticeship[^<]*</h2>\s*<div class="card">(?:(?!<div).)*?</div>', re.S)
APPRENTICESHIP_NOTE = ('<h2>Registered apprenticeships</h2>\n  <div class="card" data-apprenticeship-note="1"><p>Hope Training Academy also '
                       'sponsors registered apprenticeships through the United States Department of Labor, as a separate program '
                       'from this course (<a href="https://hopetrainingacademy.org/apprenticeship-paths/">see the apprenticeship paths</a>).</p></div>')
OLD_OFFER = re.compile(r'("offers": \{"@type": "Offer", "price": ")[0-9.]+(")')
PROMISE = re.compile(r'(<h1>[^<]*</h1><p class="promise">.*?</p>\n)', re.S)


def money(price):
    value = Decimal(price)
    if value <= 0 or value != value.quantize(Decimal("0.01")):
        raise ValueError("price must be a positive amount in whole cents")
    return f"${value:,.0f}" if value == value.to_integral_value() else f"${value:,.2f}"


def validate(row):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", row["slug"]):
        raise ValueError(f"bad slug: {row['slug']!r}")
    if type(row["variant_id"]) is not int or row["variant_id"] <= 0:
        raise ValueError(f"{row['slug']}: variant_id must be a positive integer")
    if type(row["available"]) is not bool or not row["name"].strip() or not row["sku"].strip():
        raise ValueError(f"{row['slug']}: name, sku and available are required")
    if "store_handle" in row and not re.fullmatch(r"[a-z0-9][a-z0-9-]*", row["store_handle"]):
        raise ValueError(f"{row['slug']}: bad store_handle")
    money(row["price"])


def render(page, row):
    slug = row["slug"]
    product = f"{STORE}/products/{row.get('store_handle') or slug}"   # the store handle can differ from the page slug
    cart = f"{STORE}/cart/{row['variant_id']}:1"
    # 1. undo our own earlier work, so the result depends only on the original page and the data row
    page = BLOCK.sub("", page)
    page = HEAD_BLOCK.sub("", page)
    page = BOUGHT.sub(lambda m: f'<a {m.group(1)}{m.group(2)}href="{product}"', page)
    page = page.replace(f'href="{product}">Enroll now →</a><a class="cta ghost"', f'href="{product}">See the course →</a><a class="cta ghost"')
    if not PROMISE.search(page):
        raise ValueError(f"{slug}: title block not found; page layout differs, not changed")
    name, price = html.escape(row["name"]), money(row["price"])
    # card 1382: claims and the second action (one-way removals; running again changes nothing)
    page = page.replace(CHIP_APPRENTICESHIP, "").replace(QUALIFY, "")
    if NO_CERTIFICATION.search(page):
        page = page.replace(CHIP_CERTIFICATION, "")
    # card 1388: one true sentence in place of the apprenticeship section (the note itself no longer matches the pattern)
    page = APPRENTICESHIP_SECTION.sub(lambda m: APPRENTICESHIP_NOTE, page, count=1)
    # the page's older course data carries its own copy of the price: keep it equal to the data file
    page = OLD_OFFER.sub(lambda m: m.group(1) + row["price"] + m.group(2), page)
    if row["available"]:
        # 2. every link to this course's store page becomes the one-click checkout link
        page = page.replace(f'href="{product}">See the course →</a>', f'href="{product}">Enroll now →</a>')
        page = page.replace(f'href="{product}"', f'data-buy="1" href="{cart}"')
        event = json.dumps({"currency": "USD", "value": float(row["price"]), "transport_type": "beacon",
                            "items": [{"item_id": row["sku"], "item_name": row["name"],
                                       "price": float(row["price"]), "quantity": 1}]})
        block = (
            '  <!-- buy-block:start -->\n'
            '  <div class="buybox" style="margin:14px 0 18px;padding:16px 18px;border:1px solid rgba(255,255,255,.22);border-radius:12px;max-width:560px">\n'
            f'    <div style="font-size:30px;font-weight:800;line-height:1.1">{price} <span style="font-size:14px;font-weight:600;opacity:.8">one-time · {name}</span></div>\n'
            f'    <a class="cta" data-buy="1" href="{cart}" style="margin:12px 0 8px;font-size:18px">Enroll now · {price}</a>\n'
            '    <div style="font-size:14px;opacity:.85">Secure checkout. Card, Shop Pay or PayPal. Access is e-mailed within 1 business day.</div>\n'
            '  </div>\n'
            '  <script>(function(){var e=' + event + ';document.addEventListener("click",function(c){var a=c.target&&c.target.closest&&c.target.closest("a[data-buy]");if(a&&window.gtag){window.gtag("event","begin_checkout",e);}},true);})();</script>\n'
            '  <!-- buy-block:end -->\n')
    else:
        block = (
            '  <!-- buy-block:start -->\n'
            '  <div class="buybox" style="margin:14px 0 18px;padding:16px 18px;border:1px solid rgba(255,255,255,.22);border-radius:12px;max-width:560px">\n'
            f'    <div style="font-size:16px;font-weight:700">Enrollment for {name} is closed right now.</div>\n'
            '  </div>\n'
            '  <!-- buy-block:end -->\n')
    page = PROMISE.sub(lambda m: m.group(1) + block, page, count=1)
    # 3. product data for search results: this page is the product's address
    product_ld = {"@context": "https://schema.org", "@type": "Product", "name": row["name"], "sku": row["sku"],
                  "brand": {"@type": "Organization", "name": "Hope Training Academy"},
                  "offers": {"@type": "Offer", "price": row["price"], "priceCurrency": "USD",
                             "availability": "https://schema.org/" + ("InStock" if row["available"] else "OutOfStock"),
                             "url": f"https://hopetrainingacademy.org/courses/{slug}/"}}
    head = ('<!-- buy-block-head:start --><script type="application/ld+json">' + json.dumps(product_ld)
            + '</script><!-- buy-block-head:end -->\n')
    if page.count("</head>") != 1:
        raise ValueError(f"{slug}: expected exactly one </head>")
    return page.replace("</head>", head + "</head>", 1)


def main(argv):
    check = "--check" in argv
    rows = json.loads((ROOT / "data" / "course-buy-data.json").read_text(encoding="utf-8"))
    if len({r["slug"] for r in rows}) != len(rows):
        raise SystemExit("duplicate slug in data file")
    stale = []
    for row in rows:
        validate(row)
        path = ROOT / "courses" / row["slug"] / "index.html"
        before = path.read_text(encoding="utf-8")
        after = render(before, row)
        if after != before:
            stale.append(row["slug"])
            if not check:
                path.write_text(after, encoding="utf-8")
    if check:
        for slug in stale:
            print(f"DIFFERS from data file: courses/{slug}/index.html")
        print(f"{len(rows)} pages checked, {len(stale)} differ")
        return 1 if stale else 0
    print(f"{len(rows)} pages in data file, {len(stale)} written")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
