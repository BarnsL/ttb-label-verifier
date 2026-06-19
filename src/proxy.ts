/**
 * @file proxy.ts
 * Next.js Proxy — runs before every request is fulfilled (renamed from middleware.ts
 * per the Next.js 16 convention; "middleware" is deprecated in favour of "proxy").
 *
 * Responsibilities:
 *   1. Global Privacy Control (GPC) — when a browser sends `Sec-GPC: 1`, set a
 *      readable cookie so the client-side cookie banner can honor it automatically.
 *   2. Content-Security-Policy — injected on every response.  Note: `'unsafe-inline'`
 *      is required for Next.js App Router's hydration scripts.  Tighten to nonces
 *      once upstream support stabilises in this version.
 *   3. Cross-Origin-Opener-Policy — prevents cross-origin window references.
 *   4. X-Permitted-Cross-Domain-Policies — blocks Flash/Acrobat cross-domain access.
 *
 * The existing HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
 * and Permissions-Policy headers are set in next.config.ts and are NOT duplicated
 * here to avoid precedence conflicts.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Composed CSP value applied to every response. */
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js App Router; replace with nonces in prod hardening.
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' needed for Tailwind's runtime style injection.
  "style-src 'self' 'unsafe-inline'",
  // blob: for the canvas-based label-image preview; data: for encoded SVG icons.
  "img-src 'self' data: blob:",
  // next/font downloads and serves fonts from the same origin at build time.
  "font-src 'self' data:",
  // All API calls (verify, grade, readme) are same-origin.
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // ── 1. Global Privacy Control ──────────────────────────────────────────────
  // GPC (https://globalprivacycontrol.org/) is a browser signal meaning the user
  // has opted out of the sale or sharing of personal data.  We honor it by
  // setting a JS-readable cookie that the CookieBanner component reads on load.
  const gpc = request.headers.get("Sec-GPC");
  if (gpc === "1") {
    response.cookies.set("gpc-optout", "1", {
      httpOnly: false,                                      // must be readable by client JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365,                         // 1 year
      path: "/",
    });
  }

  // ── 2. Security headers ────────────────────────────────────────────────────
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return response;
}

/** Apply proxy to all routes except Next.js internals and static assets. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
