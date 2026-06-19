/**
 * @file app/security/page.tsx
 * Security & Abuse Prevention disclosure page.
 *
 * Discloses the general shape of our protections without revealing exact
 * thresholds (to avoid making targeted abuse easier).  Includes a contact
 * path for responsible disclosure.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Zap, Lock, AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Security & Abuse Prevention — TTB Label Verifier",
  description: "How TTB Label Verifier protects against abuse, rate limiting, security controls, and how to report vulnerabilities.",
};

const CONTACT_EMAIL = "purpleindustries@pm.me";

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-10 mb-3 border-b border-border pb-2 text-xl font-bold tracking-tight scroll-mt-20"
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="my-2 leading-relaxed text-muted-foreground">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="my-2 list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>;
}

const PILLARS = [
  {
    icon: <Zap className="size-5" aria-hidden />,
    title: "Rate Limiting",
    desc: "Every API endpoint is rate-limited per IP address. Requests that exceed limits receive a 429 response with a Retry-After header. Distributed rate limiting via Upstash Redis ensures limits hold even across multiple serverless instances.",
  },
  {
    icon: <Lock className="size-5" aria-hidden />,
    title: "Request Validation",
    desc: "All request bodies are validated before processing. Images are restricted to allowed MIME types (JPEG, PNG, WebP, GIF) and capped at a maximum file size. Unexpected fields are rejected. Enumerated values (e.g. model selection) are checked against an allowlist.",
  },
  {
    icon: <Shield className="size-5" aria-hidden />,
    title: "Security Headers",
    desc: "All responses include: Content-Security-Policy (script/style/image/font/connect), Strict-Transport-Security (HSTS), X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy (strict-origin-when-cross-origin), Permissions-Policy, and Cross-Origin-Opener-Policy.",
  },
  {
    icon: <AlertTriangle className="size-5" aria-hidden />,
    title: "No Persistent Storage",
    desc: "Label images and COLA form data are processed in memory and discarded after each request. We never store uploaded images on disk or in a database. Rate-limit counters are the only server-side state and they expire automatically.",
  },
];

export default function SecurityPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6 gap-1")}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to app
        </Link>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-500">
            TTB Label Verifier
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Security &amp; Abuse Prevention
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A summary of the technical controls protecting this service.
          </p>
        </header>

        {/* ── Security pillars grid ────────────────────────────────────────── */}
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600">
                {p.icon}
              </div>
              <h2 className="mb-1 font-semibold">{p.title}</h2>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Rate Limiting Detail ─────────────────────────────────────────── */}
        <H2 id="rate-limiting">Rate Limiting Details</H2>
        <P>
          Rate limits are applied per IP address on all <code>/api/</code> endpoints.
          Limits are intentionally not published here to reduce the effectiveness of
          threshold-aware abuse. However, the general policy is:
        </P>
        <UL>
          <li>Normal usage by individual users will never hit any limit.</li>
          <li>Automated or scripted requests that exceed a reasonable per-minute threshold will be blocked.</li>
          <li>Blocked requests receive a standard HTTP 429 response with a <code>Retry-After</code> header.</li>
          <li>Rate-limit state is distributed via Upstash Redis when configured, ensuring consistency across Vercel's serverless instances.</li>
          <li>If the Upstash service is unavailable, the system falls back to in-memory limiting per instance and fails open (allowing the request) to maintain availability.</li>
        </UL>

        {/* ── Input Validation ─────────────────────────────────────────────── */}
        <H2 id="input-validation">Input Validation &amp; Sanitization</H2>
        <UL>
          <li><strong>Image type allowlist:</strong> Only JPEG, PNG, WebP, and GIF are accepted. All other MIME types are rejected with 400.</li>
          <li><strong>Payload size cap:</strong> Requests exceeding the configured maximum body size are rejected. This prevents memory exhaustion from oversized uploads.</li>
          <li><strong>Field validation:</strong> All required fields are checked for presence and type. Unexpected or extraneous fields are ignored, not reflected.</li>
          <li><strong>Model selection allowlist:</strong> The <code>model</code> parameter is checked against an enumerated allowlist of permitted Anthropic model IDs. Arbitrary values are rejected.</li>
          <li><strong>No server-side file writes:</strong> Uploaded images are decoded to base64 and passed directly to the AI API. They are never written to the filesystem.</li>
        </UL>

        {/* ── Security Headers ─────────────────────────────────────────────── */}
        <H2 id="headers">HTTP Security Headers</H2>
        <P>
          All responses from this service include the following security headers,
          applied via Next.js middleware before the response reaches your browser:
        </P>
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-4">Header</th>
                <th className="pb-2">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Content-Security-Policy", "Restricts script, style, image, font, and connection sources to the same origin (+ necessary exceptions for Next.js)"],
                ["Strict-Transport-Security", "Enforces HTTPS for all connections; max-age 1 year"],
                ["X-Frame-Options", "Prevents clickjacking by blocking the page from being embedded in an iframe"],
                ["X-Content-Type-Options", "Prevents MIME-type sniffing attacks"],
                ["Referrer-Policy", "Limits referrer information sent to external origins"],
                ["Permissions-Policy", "Disables access to camera, microphone, geolocation, and payment APIs"],
                ["Cross-Origin-Opener-Policy", "Isolates the browsing context to same-origin (mitigates Spectre-style attacks)"],
                ["X-Permitted-Cross-Domain-Policies", "Prevents Adobe Flash/PDF cross-domain policy files"],
              ].map(([header, desc]) => (
                <tr key={header}>
                  <td className="py-3 pr-4 font-mono text-xs">{header}</td>
                  <td className="py-3 text-xs text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Privacy Controls ─────────────────────────────────────────────── */}
        <H2 id="privacy-controls">Privacy Controls</H2>
        <UL>
          <li><strong>No server-side tracking:</strong> We do not use server-side analytics, tracking pixels, or fingerprinting.</li>
          <li><strong>Global Privacy Control (GPC):</strong> We recognize and honor the GPC browser signal (Sec-GPC: 1). See our <Link href="/privacy#gpc" className="underline hover:text-foreground">Privacy Policy</Link> for details.</li>
          <li><strong>No advertising:</strong> We do not use advertising networks or third-party tracking cookies.</li>
          <li><strong>No keys in the client bundle:</strong> The Anthropic API key and all service credentials are server-side only and never exposed to the browser.</li>
        </UL>

        {/* ── Responsible Disclosure ───────────────────────────────────────── */}
        <H2 id="disclosure">Responsible Disclosure</H2>
        <P>
          If you discover a security vulnerability in this application, please report it
          responsibly:
        </P>
        <div className="my-4 rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm">
          <p>
            Email:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Security%20Vulnerability%20Report%20%E2%80%94%20TTB%20Label%20Verifier`}
              className="underline hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1">Subject: <em>Security Vulnerability Report — TTB Label Verifier</em></p>
          <p className="mt-3 text-xs text-muted-foreground">
            Please include: a description of the vulnerability, steps to reproduce, potential
            impact, and any suggested mitigation. We will acknowledge receipt within 72 hours
            and aim to resolve critical issues within 14 days. We appreciate responsible
            disclosure and will credit reporters with their permission.
          </p>
        </div>
        <P>
          You can also open a{" "}
          <a
            href="https://github.com/BarnsL/ttb-label-verifier/security/advisories/new"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            GitHub Security Advisory
          </a>{" "}
          on the repository for coordinated disclosure.
        </P>

        {/* ── Known Limitations ────────────────────────────────────────────── */}
        <H2 id="limitations">Known Limitations</H2>
        <UL>
          <li>
            <strong>CSP unsafe-inline:</strong> The Content-Security-Policy includes
            <code> unsafe-inline</code> for scripts and styles, required by Next.js App Router's
            hydration mechanism. A nonce-based CSP is planned for a future hardening pass.
          </li>
          <li>
            <strong>postcss dependency:</strong> A moderate-severity advisory exists in
            a version of <code>postcss</code> bundled within Next.js internals. This cannot
            be resolved without downgrading Next.js. We monitor for an upstream fix.
          </li>
          <li>
            <strong>Rate limiting fallback:</strong> When Upstash Redis is unavailable, the
            system falls back to in-memory rate limiting, which is not shared across serverless
            instances. Normal usage is unaffected.
          </li>
        </UL>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </div>
    </main>
  );
}
