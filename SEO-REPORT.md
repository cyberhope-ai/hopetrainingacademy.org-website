# Hope Training Academy — SEO Research & Optimization Report
_Prepared overnight 2026-07-14 · nexus-claude · site live at https://hopetrainingacademy.org_

## TL;DR — the winning strategy
Our competitors have one fatal gap each, and HTA can own the SERP they can't:

| Competitor | Their moat | The gap we exploit |
|---|---|---|
| **MyComputerCareer** | 619-post blog, national brand, veteran/GI Bill depth | Their own schema lists tuition **$21,097–$26,305** — they can *never* credibly rank for **"free"** |
| **Per Scholas** | Owns "no-cost", strong AI-powered course names | Ships **no LocalBusiness schema**, and their Indy page has a live `Page description goes here` meta bug. **No apprenticeship angle.** |
| **Ivy Tech** | Huge brand, accredited college | Slow, generic, degree-priced, not "free bootcamp/apprenticeship" intent |
| **Eleven Fifty** | Was the Indy cyber bootcamp | **Rebranded (Blaizing) & dropped bootcamps in 2024** → vacated "cybersecurity bootcamp Indianapolis" demand. Ships **zero JSON-LD.** |
| **New Beginnings (nbct.tech)** | Local, faith-based | Thin content, weak technical SEO |

**HTA's uncontested wedge = FREE + LOCAL + DOL-REGISTERED APPRENTICESHIP.** No Indianapolis competitor can claim all three. That's the SERP we're built to win, and it's realistically winnable in **2–3 months** with the pages now live + the account setup below.

---

## What I shipped tonight (all LIVE)

### 1. Eight keyword-targeted landing pages
Each is a full, unique, indexable page (not thin doorways) with Course + Breadcrumb schema, the "how to qualify / Workforce Ready Grant" module, and internal links:

| URL | Primary keyword |
|---|---|
| `/it-apprenticeship-indianapolis/` | IT apprenticeship Indianapolis |
| `/cybersecurity-apprenticeship-indiana/` | cybersecurity apprenticeship Indiana |
| `/free-it-training-indianapolis/` | free IT training Indianapolis |
| `/tuition-free-cybersecurity-training-indianapolis/` | tuition-free cybersecurity training |
| `/cybersecurity-bootcamp-indianapolis/` | cybersecurity bootcamp Indianapolis _(Eleven Fifty vacancy)_ |
| `/ai-training-indianapolis/` | AI training Indianapolis |
| `/workforce-ready-grant-it-training/` | Workforce Ready Grant IT training |
| `/comptia-a-plus-training-indianapolis/` | CompTIA A+ training Indianapolis |

### 2. Local-SEO structured data (the biggest technical edge)
- **EducationalOrganization + LocalBusiness** JSON-LD site-wide with full NAP, `geo`, `hasMap`, `openingHoursSpecification`, **`priceRange: "$0 – free for those who qualify"`**, `isAccessibleForFree: true`, DOL as `funder`, `areaServed` = Indianapolis/Indiana. **Per Scholas and Eleven Fifty ship none of this.**
- **FAQPage** schema (6 Q&As) on the apprenticeship page → eligible for FAQ rich results.
- **Course** schema (ItemList of 4 programs) on programs page → eligible for course rich results.
- **BreadcrumbList** on every inner + landing page.
- 46 JSON-LD blocks total, all validated.

### 3. On-page fundamentals
- Unique title/meta-description/canonical on **every** page (killed the duplicate-content problem where all 10 pages shared one canonical).
- Title/H1 formula copied from MyCC and localized: action title + exact-match local H1 (e.g. `DOL-Registered IT Apprenticeships in Indianapolis`).
- `sitemap.xml` (18 URLs) + `robots.txt` live.
- "Popular in Indianapolis" footer link column across all 18 pages for internal link equity.

### 4. Tracking scaffolding (inert until you paste IDs — see below)
Microsoft Clarity + Google tag (GA4/Ads) are already wired into every page's `<head>`, guarded so they do nothing until real IDs replace the placeholders. **One find-and-replace turns them all on.**

---

## ACTION ITEMS FOR RICK (need your logins — ~30 min total)

### A. Microsoft Clarity (heatmaps) — 5 min
1. Go to **https://clarity.microsoft.com** → sign in with your Microsoft account → **New project** → name "Hope Training Academy", URL `hopetrainingacademy.org`.
2. Copy the **Project ID** (short string like `abc123xyz`).
3. Tell me the ID (or paste it): I replace `PASTE_CLARITY_ID` site-wide and redeploy. Heatmaps + session recordings go live immediately.

### B. Google Analytics 4 — 5 min
1. **https://analytics.google.com** → Admin → Create Property → "Hope Training Academy" → Web data stream for `hopetrainingacademy.org`.
2. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
3. Give it to me → I replace the placeholder → analytics live. (Same gtag also powers Ads conversion tracking in D.)

### C. Google Search Console (tells Google to index us) — 5 min
1. **https://search.google.com/search-console** → Add property → **Domain** → `hopetrainingacademy.org`.
2. It gives you a **TXT record** to verify. Two options:
   - Easiest: add that TXT at GoDaddy DNS (I can walk you through it — it does NOT touch the records we were careful about).
   - Or use the "HTML tag" method and give me the tag; I'll drop it in the `<head>` and redeploy.
3. Once verified: **Sitemaps → submit** `https://hopetrainingacademy.org/sitemap.xml`. This is what makes Google crawl all 18 pages fast.

### D. Google Ads / "AdWords" — 15 min (this is where paid traffic starts)
1. **https://ads.google.com** → new account → link it to the GA4 property from step B (Tools → Linked accounts).
2. Recommended **first campaign** (I've drafted it — see `Google-Ads-starter.md` below):
   - Campaign type: **Search**, geo-targeted to **Indianapolis + 25 mi**.
   - Ad groups: (1) *free IT training*, (2) *cybersecurity apprenticeship*, (3) *cybersecurity bootcamp*, (4) *CompTIA/A+*.
   - Each ad group points at its matching landing page above (already built for it).
   - Budget to start: **$15–25/day** — cheap because "free IT training Indianapolis" has low competition (MyCC/Ivy Tech bid on high-cost commercial terms, not "free").
3. Give me the account access or the conversion action ID and I'll wire the conversion tracking (form submit → conversion) into the gtag we already have.

### E. Google Business Profile (the map pack — huge for "IT training near me") — 10 min
1. **https://business.google.com** → add "Hope Training Academy" at **525 S Meridian St, Indianapolis, IN 46225**.
2. Verify (postcard or phone). Set category **"Vocational school"** + secondary "Training centre".
3. Add photos of the lab, hours (M–F 9–5), phone (317) 707-4095, and the website.
4. Ask a few grads to leave reviews. **This is how HTA beats a Texas-HQ'd chain and remote-first Per Scholas** — they can't own a local Indianapolis map pin the way a real 2018 local nonprofit can.

> Once you send me the **Clarity ID + GA4 ID + Ads conversion ID + Search Console tag**, I flip everything on and redeploy in one pass. Until then the scaffolding sits inert and harmless.

---

## Content roadmap (next, to widen the moat)
These are the "attack intents MyCC ignores" — I can draft them on your word:
1. "How to get **free** IT training in Indianapolis" (guide)
2. "**Registered apprenticeship vs. bootcamp** — which is right for you?"
3. "IT apprenticeships that **pay you to learn** (Indianapolis)"
4. "Free cybersecurity certification paths for career changers"
5. Graduate success stories (E-E-A-T — mirrors MyCC's highest-converting content type, with a free/community hook they can't match)
6. Per-apprenticeship pages with the **RAPIDS/DOL program numbers** (once you send them) — near-empty SERP.

## Where we already rank (per keyword research)
- `/student/` type pages already surface for cyber-apprenticeship + USDOL queries.
- Help-desk-bootcamp content already ranks page-1 for "help desk training Indianapolis".
The 8 new pages + schema + Search Console submission should compound these fast.

---
_Deploy: dpl_9y6XtLxBaEYgxrD4krtPAybfKxmE · commit 22e4f8f · github.com/cyberhope-ai/hopetrainingacademy.org-website_
