// POST /api/lead - the private lead relay (Rick, card 1103 "B: a small private relay on HTA's own domain that
// holds the key"). The visitor's browser posts the lead form here (same origin). This function forwards an
// allow-listed copy to the CRM intake with a server-held relay_key, so no CRM credential is ever in a page.
// Contract agreed with the intake owner (atlas3-claude, entropy-crm #30). The CRM caps relay calls per hour;
// the per-visitor limit is a Cloudflare rule on this path (the site is behind Cloudflare, so this function
// only sees Cloudflare's IPs and keeps no state between calls).
"use strict";

const CRM_URL = "https://crm.cyberhopeai.com/api/method/hta_lead_intake";
const HOSTS = new Set(["hopetrainingacademy.org", "www.hopetrainingacademy.org"]);
const ORIGINS = new Set(["https://hopetrainingacademy.org", "https://www.hopetrainingacademy.org"]);
const MAX_BODY_BYTES = 16 * 1024;
const CRM_TIMEOUT_MS = 5000;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Forwarded as-is (trimmed, length-capped): the fields the CRM intake reads.
const PASS = {
  first_name: 100, last_name: 100, email: 254, phone: 40, program: 200, referral: 200, audience: 100,
  sms_consent: 10, sms_consent_version: 80, email_consent: 10, state: 40, zip: 10,
};
// Fields the intake does not read: folded into `description` so nothing the visitor typed is lost.
const FOLD = [
  ["message", "Message", 2000], ["intent", "Interest", 200], ["experience", "Experience", 500],
  ["typing_wpm", "Typing test wpm", 10], ["typing_accuracy", "Typing test accuracy", 10],
];
// Ad attribution: read from the landing URL's query string, never taken from the body.
const ATTRIBUTION = ["gclid", "gbraid", "wbraid", "utm_source", "utm_campaign"];

function text(v, cap) {
  if (v === undefined || v === null || typeof v === "object") return "";
  return String(v).replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, cap);
}

function sameSite(headers) {
  const origin = headers.origin;
  if (origin) return ORIGINS.has(origin);
  const referer = headers.referer || "";
  return [...ORIGINS].some((o) => referer === o || referer.startsWith(o + "/"));
}

function landing(raw) {
  try {
    const u = new URL(String(raw || ""));
    return u.protocol === "https:" && HOSTS.has(u.hostname) ? u : null;
  } catch (_) {
    return null;
  }
}

// The allow-listed form body for the CRM. Anything not named here is dropped, including access_key, key,
// intake_key and any relay_key a client sends: the relay_key is added by the caller from the environment.
function build(body) {
  const out = {};
  for (const [k, cap] of Object.entries(PASS)) {
    const v = text(body[k], cap);
    if (v) out[k] = v;
  }
  const parts = [];
  for (const [k, label, cap] of FOLD) {
    const v = text(body[k], cap);
    if (v) parts.push(`${label}: ${v}`);
  }
  if (parts.length) out.description = parts.join(" | ").slice(0, 4000);
  const page = text(body.page, 200).split(/[?#]/)[0];
  if (page.startsWith("/")) out.page = page;
  const u = landing(body.landing_url);
  if (u) {
    out.landing_url = u.href.slice(0, 500);
    for (const k of ATTRIBUTION) {
      const v = text(u.searchParams.get(k), 140);
      if (v) out[k] = v;
    }
  }
  return out;
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string" || Buffer.isBuffer(b)) {
    if (Buffer.byteLength(b) > MAX_BODY_BYTES) return { tooBig: true };
    try {
      b = JSON.parse(b.toString());
    } catch (_) {
      return { bad: true };
    }
  }
  if (!b || typeof b !== "object" || Array.isArray(b)) return { bad: true };
  if (Buffer.byteLength(JSON.stringify(b)) > MAX_BODY_BYTES) return { tooBig: true };
  return { body: b };
}

function done(res, status, outcome) {
  // Status and outcome only: never a form field, an email or the secret.
  console.log(JSON.stringify({ relay: "lead", status, outcome }));
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return done(res, 405, "method");
  }
  const host = String(req.headers.host || "").toLowerCase().split(":")[0];
  if (!HOSTS.has(host)) return done(res, 404, "host"); // previews and *.vercel.app never reach the CRM
  if (!sameSite(req.headers)) return done(res, 403, "origin");
  if (Number(req.headers["content-length"] || 0) > MAX_BODY_BYTES) return done(res, 413, "size");
  const parsed = parseBody(req);
  if (parsed.tooBig) return done(res, 413, "size");
  if (parsed.bad) return done(res, 400, "body");
  const body = parsed.body;
  if (text(body.botcheck, 10)) return done(res, 204, "honeypot"); // bots get a quiet success
  const fields = build(body);
  if (!fields.email || !EMAIL_RE.test(fields.email)) return done(res, 400, "email");
  const secret = process.env.HTA_INTAKE_RELAY_SECRET;
  if (!secret) return done(res, 503, "unconfigured"); // fail closed: nothing forwarded
  let r;
  try {
    r = await fetch(CRM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ ...fields, relay_key: secret }).toString(),
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
    });
  } catch (e) {
    return done(res, 504, e && e.name === "TimeoutError" ? "crm_timeout" : "crm_unreachable");
  }
  if (r.ok) return done(res, 204, "forwarded"); // never echo the CRM's lead id
  if (r.status === 429) return done(res, 429, "crm_rate_limited");
  if (r.status === 400) return done(res, 400, "crm_rejected");
  return done(res, 502, `crm_${r.status}`);
}

module.exports = handler;
module.exports.build = build;
module.exports.CRM_URL = CRM_URL;
