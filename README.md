# hopetrainingacademy.org — website

The new **Hope Training Academy (HTA)** website. A modern, self-hosted rebuild of
hopetrainingacademy.org, replacing the aging WordPress site. Built to stress HTA's
four pillars — **AI · Cybersecurity · IT · Coding (Python)** — and its flagship
**USDOL Registered Apprenticeships**.

> HTA is an Indianapolis nonprofit tech-workforce academy — a DBA of Video Game
> Palooza, Inc., a 501(c)(3) (EIN 46-4169197), and part of the CyberHope AI
> ecosystem. Since 2018, no HTA student has ever paid for their education
> (grants + scholarships + sponsorship). The differentiator is **experiential,
> hands-on lab learning** that leads into paid, registered apprenticeships.

## Status

Preview / work-in-progress. **No DNS cutover** until Rick approves the live preview.

- Homepage preview: https://claude.ai/code/artifact/17e21781-b9b6-41fa-b34a-9ed8e1537ea7
- History page preview: https://claude.ai/code/artifact/a064fbe7-91d0-4c1a-9613-259ccb6f0b6d

## Pages

| File | Page | Notes |
|------|------|-------|
| `index.html` | Homepage | Hero · pillars · apprenticeship pipeline · hands-on lab · employers · impact/gallery · donate · partners · lead form |
| `history.html` | Our History | Chronological timeline of HTA's 8 Indianapolis homes since 2018 |
| `index.template.html` | Homepage template | Pre-injection template (documents the build; content/images injected via script) |

### Planned (not yet built)
- **What is a Registered Apprenticeship** — dedicated explainer (3 DOL-registered tracks: IT Support · Help Desk · Cybersecurity, held since 2018)
- Programs · For Employers · About · Donate · Contact inner pages
- Real photo galleries + YouTube testimonial embeds ([HTA channel](https://www.youtube.com/@hopetrainingacademy6944))

## Design system — "Civic Tech Terminal"

Dark, high-tech, professional; a **new brand** (deliberately not the old HTA site).

- **Palette:** bg `#05080f` / bg2 `#0a1120`, cyan `#2ad6e8` + violet `#7d6cf7`
  gradient, amber `#f7ac3d` (CTA / "hope"), text `#e9f0fb`. Light + dark themes.
- **Type (embedded as base64 @font-face — CSP-safe, no CDN):**
  Sora (display), Hanken Grotesk (body), Chivo Mono (labels/data).
- **Signatures:** circuit-heart SVG brand mark; mono "terminal" motif; two-tier
  header (utility bar + dropdown mega-menu nav + mobile menu).
- Every page is a **single self-contained HTML file** — all CSS, JS, fonts, and
  images inlined. No external requests. This makes hosting trivial and portable.

## Content facts (source of truth)

- **Current & only location:** Union Campus — **525 South Meridian Street, Indianapolis, IN**.
  (Past locations live on `history.html`.)
- **Phone (AI-answered):** (317) 707-4095
- **CTAs:** Career Evaluation · Request Information · Schedule a Campus Tour
- **Trust:** VA Certified · Military Friendly · GI Bill · USDOL Registered Apprenticeship
- **Lead form:** captures name/email/phone/program interest (currently posts via
  formsubmit.co; upgrade path = Supabase lead DB for follow-up).

## Imagery

- **Professional / stock** imagery (royalty-free, Unsplash license) carries the
  hero and section art.
- **Real student photos** are **reserved** for the consented "Real students, real
  outcomes" gallery only.
- `candidates/` holds the working photo set + `manifest.json` (real 2018 lab
  photos) and `stock_manifest.json`.

## Deploy plan

Target: **Cloudflare Pages** (static). Because every page is a self-contained
file, deploy is a plain static upload:

```bash
wrangler pages deploy .
```

The LMS at **learn.hopetrainingacademy.org** is a separate effort — restored from
its WordPress `.wpress` backup onto a Google Cloud VM (behind Cloudflare).

## Repo layout

```
index.html            # homepage (self-contained)
history.html          # Our History timeline (self-contained)
index.template.html   # homepage template (build reference)
candidates/           # working photo set + manifests
public/img/           # (reserved) static image assets
README.md
```

---

Built for CyberHope AI / Hope Training Academy.
