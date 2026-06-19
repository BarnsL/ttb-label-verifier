/**
 * @file app/privacy/page.tsx
 * Privacy Policy — CCPA/CPRA compliant disclosure for California residents.
 *
 * Required CCPA/CPRA disclosures included:
 *   - Categories of personal information collected (Cal. Civ. Code §1798.100)
 *   - Purposes for collection (§1798.100(a)(2))
 *   - Right to know, delete, correct, opt-out, limit, non-discrimination (§§1798.105–1798.125)
 *   - "Do Not Sell or Share My Personal Information" opt-out (§1798.135)
 *   - Global Privacy Control (GPC) recognition (Cal. AG guidance)
 *   - Contact information for rights requests
 *
 * ⚠️  NEEDS LEGAL REVIEW before relying on in a production context.
 *     Update the [BUSINESS NAME], [BUSINESS ADDRESS], and [CONTACT EMAIL]
 *     placeholders with real values.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy Policy — TTB Label Verifier",
  description: "How TTB Label Verifier collects, uses, and protects your information, including California CCPA/CPRA rights.",
};

const EFFECTIVE_DATE = "June 19, 2026";
const CONTACT_EMAIL  = "purpleindustries@pm.me";
const APP_NAME       = "TTB Label Verifier";
const APP_URL        = "https://ttb-label-verifier-barnslau.vercel.app";

// ─── Reusable prose components ────────────────────────────────────────────────

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

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 mb-2 font-semibold">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="my-2 leading-relaxed text-muted-foreground">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="my-2 list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
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
            {APP_NAME}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
          </p>
        </header>

        {/* ── 1. Introduction ─────────────────────────────────────────────── */}
        <H2 id="intro">1. Introduction</H2>
        <P>
          {APP_NAME} ("{APP_NAME}", "we", "us", "our") operates the label-verification
          tool available at <a href={APP_URL} className="underline hover:text-foreground">{APP_URL}</a>.
          This Privacy Policy describes what information we collect when you use the Service,
          how we use it, and the rights you have regarding your information — including
          enhanced rights available to California residents under the California Consumer
          Privacy Act (CCPA) and its amendment, the California Privacy Rights Act (CPRA).
        </P>
        <P>
          By using the Service you agree to the collection and use of information as described
          in this policy. If you do not agree, please discontinue use.
        </P>

        {/* ── 2. Who We Are ───────────────────────────────────────────────── */}
        <H2 id="controller">2. Who We Are (Data Controller)</H2>
        <P>
          The data controller for the purposes of this Privacy Policy is:
        </P>
        <div className="my-3 rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
          <p><strong className="text-foreground">TTB Label Verifier</strong></p>
          <p>Operated by BarnsL</p>
          <p>
            Contact:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            ⚠️ A physical business address and registered agent are required for full CCPA
            compliance. Please update before publishing.
          </p>
        </div>

        {/* ── 3. Information We Collect ───────────────────────────────────── */}
        <H2 id="collection">3. Information We Collect</H2>
        <P>
          We collect the minimum information needed to operate the Service. We do{" "}
          <strong>not</strong> create user accounts, require registration, or build persistent
          user profiles.
        </P>

        <H3>3.1 Information You Provide</H3>
        <UL>
          <li>
            <strong>Label images:</strong> Photos or scans of alcohol beverage labels
            that you upload or select. These are transmitted to Anthropic's API
            (see §5) for text extraction and are never stored on our servers after
            processing completes.
          </li>
          <li>
            <strong>Application values:</strong> COLA application data you type into
            the form (brand name, class/type, alcohol content, net contents, etc.).
            This data is not stored after the verification result is returned.
          </li>
          <li>
            <strong>Reviewer scorecard (optional):</strong> If you use the{" "}
            <code>/grade</code> page, your name, scores, recommendation, and comments
            are transmitted to our email provider (Resend) to deliver the scorecard
            email. We do not retain this data after the email is sent.
          </li>
        </UL>

        <H3>3.2 Information Collected Automatically</H3>
        <UL>
          <li>
            <strong>IP address:</strong> Your IP address is used ephemerally to
            enforce per-IP rate limits (abuse prevention). It is not logged, stored
            in a database, or associated with any identifier after the request
            completes.
          </li>
          <li>
            <strong>Standard server logs:</strong> Vercel (our hosting provider) may
            collect standard HTTP request logs including IP address, user-agent, and
            requested URL. See Vercel's privacy policy for details.
          </li>
        </UL>

        <H3>3.3 Browser Storage (localStorage)</H3>
        <P>
          The Service stores the following items in your browser's <code>localStorage</code>{" "}
          (not HTTP cookies, unless otherwise noted):
        </P>
        <UL>
          <li>
            <strong>ttb-age-verified:</strong> A timestamp confirming you completed age
            verification. Expires after 30 days.
          </li>
          <li>
            <strong>ttb-cookie-consent:</strong> Your storage-preference choices (this
            banner). Stored indefinitely until you clear it.
          </li>
          <li>
            <strong>Theme preference</strong> (managed by <code>next-themes</code>):
            Your light/dark mode setting. Stored indefinitely.
          </li>
          <li>
            <strong>gpc-optout (HTTP cookie):</strong> Set when your browser sends the
            Global Privacy Control signal (Sec-GPC: 1). Used to pre-select
            "Reject Non-Essential" in the cookie banner. See §8.
          </li>
        </UL>

        {/* ── 4. How We Use Your Information ─────────────────────────────── */}
        <H2 id="use">4. How We Use Your Information</H2>
        <UL>
          <li>
            <strong>To provide the verification service:</strong> Your uploaded label
            image and COLA application values are used solely to generate a verification
            result.
          </li>
          <li>
            <strong>Abuse prevention:</strong> IP addresses are checked against in-memory
            rate-limit counters to prevent excessive automated use. No IP is stored
            persistently.
          </li>
          <li>
            <strong>To deliver scorecard emails:</strong> Reviewer scorecard data entered
            on <code>/grade</code> is used only to format and send the email.
          </li>
          <li>
            <strong>To improve the Service:</strong> We may review aggregate, non-personal
            usage patterns (e.g., number of requests per day) derived from server logs
            provided by Vercel.
          </li>
        </UL>
        <P>
          We do not use your information for advertising, profiling, or any purpose
          not described above.
        </P>

        {/* ── 5. Third-Party Services ─────────────────────────────────────── */}
        <H2 id="third-parties">5. Third-Party Services</H2>
        <P>
          We share data with the following third parties solely to operate the Service:
        </P>

        <div className="my-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-4">Provider</th>
                <th className="pb-2 pr-4">Purpose</th>
                <th className="pb-2">Data shared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3 pr-4 font-medium">Vercel</td>
                <td className="py-3 pr-4 text-muted-foreground">Hosting &amp; infrastructure</td>
                <td className="py-3 text-muted-foreground">
                  IP address, user-agent, request URL (standard server logs)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Anthropic</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  AI vision — extracts text from label images
                </td>
                <td className="py-3 text-muted-foreground">
                  Label image (base64), your API key (server-side only)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Resend</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Transactional email (<code>/grade</code> only)
                </td>
                <td className="py-3 text-muted-foreground">
                  Reviewer name, scores, comments (only on /grade form submission)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <P>
          We do not sell or share your personal information with any third party for
          advertising or marketing purposes.
        </P>

        {/* ── 6. Cookies and Local Storage ────────────────────────────────── */}
        <H2 id="cookies">6. Cookies and Local Storage</H2>
        <P>
          The Service uses browser <strong>localStorage</strong> (not tracking cookies)
          for essential functionality: theme preference, age verification, and cookie
          consent. These items are stored on your device and are not transmitted to our
          servers.
        </P>
        <P>
          One HTTP cookie is set by the server: <code>gpc-optout</code>, which is set
          when your browser signals Global Privacy Control opt-out (see §8). It is
          readable only by scripts on this domain.
        </P>
        <P>
          Vercel's infrastructure may set cookies for performance and load-balancing
          purposes. These are subject to{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Vercel's Privacy Policy
          </a>
          .
        </P>
        <P>
          You can manage your storage preferences at any time using the{" "}
          <button
            onClick={undefined}
            className="underline hover:text-foreground"
            aria-label="Open cookie settings (reload page to open banner)"
          >
            Cookie Settings
          </button>{" "}
          banner, or by clearing your browser's localStorage and cookies.
        </P>

        {/* ── 7. California Privacy Rights ────────────────────────────────── */}
        <H2 id="california">7. Your California Privacy Rights (CCPA / CPRA)</H2>
        <P>
          If you are a California resident, the CCPA (Cal. Civ. Code §1798.100 et seq.)
          and CPRA grant you the following rights with respect to your personal information.
          We will respond to verifiable requests within 45 days.
        </P>

        <H3>7.1 Right to Know (§1798.100)</H3>
        <P>
          You have the right to request that we disclose: (a) the categories of personal
          information we have collected about you; (b) the sources of that information;
          (c) our business or commercial purpose for collecting it; (d) the categories of
          third parties with whom we share it; and (e) the specific pieces of personal
          information we have collected about you.
        </P>

        <H3>7.2 Right to Delete (§1798.105)</H3>
        <P>
          You have the right to request deletion of personal information we have collected.
          Because we do not maintain persistent records of individual users, the primary
          mechanism for deletion is clearing your browser's localStorage and cookies —
          this removes all locally stored data immediately. For data held by Vercel's
          server logs, please contact us and we will coordinate deletion with Vercel.
        </P>

        <H3>7.3 Right to Correct (§1798.106 — CPRA)</H3>
        <P>
          You have the right to request correction of inaccurate personal information
          we maintain about you. Contact us at the address in §10 with the corrected
          information.
        </P>

        <H3>7.4 Right to Opt-Out of Sale or Sharing (§1798.120)</H3>
        <P>
          <strong>We do not sell or share personal information</strong> as defined by
          CCPA/CPRA. We do not disclose personal information to third parties for
          cross-context behavioral advertising. If this changes, we will update this
          Policy and notify you.
        </P>

        <H3>7.5 Right to Limit Use of Sensitive Personal Information (§1798.121 — CPRA)</H3>
        <P>
          We do not collect, use, or disclose sensitive personal information as defined
          by CPRA (e.g., government ID numbers, financial information, health information,
          racial or ethnic origin, religious beliefs, union membership, biometric data,
          geolocation, or sexual orientation). This right does not apply to our Service.
        </P>

        <H3>7.6 Right to Non-Discrimination (§1798.125)</H3>
        <P>
          We will not discriminate against you for exercising any of your CCPA/CPRA
          rights. We will not deny you goods or services, charge different prices, provide
          a different level of quality, or suggest that you will receive any of these
          differences because you exercised your privacy rights.
        </P>

        {/* ── 8. Do Not Sell or Share ──────────────────────────────────────── */}
        <H2 id="do-not-sell">8. Do Not Sell or Share My Personal Information</H2>
        <P>
          TTB Label Verifier does <strong>not sell or share personal information</strong>{" "}
          with third parties for commercial purposes.
        </P>
        <P>
          To submit a formal "Do Not Sell or Share" request or to exercise any other
          CCPA/CPRA right, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=CCPA%20Privacy%20Request`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>{" "}
          with the subject line "CCPA Privacy Request" and describe your request. We will
          respond within 45 days. No fee is charged for making a request.
        </P>

        {/* ── 9. Global Privacy Control ────────────────────────────────────── */}
        <H2 id="gpc">9. Global Privacy Control (GPC)</H2>
        <P>
          We recognize the{" "}
          <a
            href="https://globalprivacycontrol.org/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Global Privacy Control
          </a>{" "}
          (GPC) signal in accordance with California Attorney General guidance. When your
          browser sends <code>Sec-GPC: 1</code>, we:
        </P>
        <UL>
          <li>Set a <code>gpc-optout</code> cookie that the cookie banner reads to pre-select "Reject Non-Essential".</li>
          <li>Treat the signal as an opt-out of any sale or sharing of personal information.</li>
        </UL>
        <P>
          Browsers that support GPC include Firefox (with the setting enabled), Brave,
          and others. The{" "}
          <a href="https://globalprivacycontrol.org/#about-section" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            GPC website
          </a>{" "}
          has a list of supported browsers and extensions.
        </P>

        {/* ── 10. Data Retention ───────────────────────────────────────────── */}
        <H2 id="retention">10. Data Retention</H2>
        <UL>
          <li><strong>Label images and COLA data:</strong> Not retained after the request completes (in-memory only).</li>
          <li><strong>IP addresses:</strong> Held in-memory for up to 60 seconds for rate-limiting purposes; never written to disk or a database.</li>
          <li><strong>Scorecard submissions:</strong> Emailed via Resend and not retained by us after the email is sent. Email delivery logs may be retained by Resend per their policy.</li>
          <li><strong>Server logs:</strong> Retained by Vercel per their data-retention policy (typically 30 days).</li>
          <li><strong>Browser localStorage:</strong> Retained until you clear it. Age verification expires after 30 days.</li>
        </UL>

        {/* ── 11. Security ────────────────────────────────────────────────── */}
        <H2 id="security">11. Security</H2>
        <P>
          We implement reasonable technical and organizational measures to protect your
          information, including HTTPS for all communications, rate limiting on all API
          endpoints, no server-side persistence of uploaded images, and HTTP security
          headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options). For a detailed
          security overview, see our{" "}
          <Link href="/security" className="underline hover:text-foreground">
            Security page
          </Link>
          .
        </P>
        <P>
          No method of transmission over the Internet or electronic storage is 100%
          secure. We cannot guarantee absolute security.
        </P>

        {/* ── 12. Children's Privacy ───────────────────────────────────────── */}
        <H2 id="children">12. Children's Privacy</H2>
        <P>
          The Service is intended for adults aged 21 and older. We do not knowingly
          collect personal information from children under 13 (COPPA) or under 16
          (California "Eraser Law"). If you believe we have inadvertently collected
          information from a minor, contact us immediately at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
          .
        </P>

        {/* ── 13. Changes ─────────────────────────────────────────────────── */}
        <H2 id="changes">13. Changes to This Policy</H2>
        <P>
          We may update this Privacy Policy periodically. When we do, we will update
          the "Last updated" date at the top. Material changes will be communicated via
          a prominent notice on the Service for at least 30 days before taking effect.
          Your continued use of the Service after a change takes effect constitutes
          acceptance of the updated Policy.
        </P>

        {/* ── 14. Contact ─────────────────────────────────────────────────── */}
        <H2 id="contact">14. Contact Us</H2>
        <P>
          For privacy requests, questions, or concerns:
        </P>
        <div className="my-3 rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
          <p>
            Email:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Privacy%20Request%20%E2%80%94%20TTB%20Label%20Verifier`}
              className="underline hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>Subject line: <em>Privacy Request — TTB Label Verifier</em></p>
          <p className="mt-2 text-xs">Response time: within 45 days per CCPA requirements.</p>
        </div>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/security" className="hover:text-foreground">Security</Link>
        </div>
      </div>
    </main>
  );
}
