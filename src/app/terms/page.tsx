/**
 * @file app/terms/page.tsx
 * Terms of Service for TTB Label Verifier.
 *
 * Key provisions:
 *   - 21+ age requirement (alcohol content per TTB regulations)
 *   - Permitted use: TTB COLA compliance assistance only
 *   - Not a substitute for official TTB review or legal counsel
 *   - Limitation of liability
 *   - Governing law: California
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms of Service — TTB Label Verifier",
  description: "Terms and conditions for using TTB Label Verifier, including age requirements, permitted use, and liability limits.",
};

const EFFECTIVE_DATE = "June 19, 2026";
const CONTACT_EMAIL  = "purpleindustries@pm.me";
const APP_NAME       = "TTB Label Verifier";
const APP_URL        = "https://ttb-label-verifier-barnslau.vercel.app";

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

export default function TermsPage() {
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
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
          </p>
        </header>

        {/* ── 1. Acceptance ────────────────────────────────────────────────── */}
        <H2 id="acceptance">1. Acceptance of Terms</H2>
        <P>
          By accessing or using {APP_NAME} (the "Service") at{" "}
          <a href={APP_URL} className="underline hover:text-foreground">{APP_URL}</a>, you agree
          to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms,
          do not use the Service.
        </P>
        <P>
          We may update these Terms at any time. Material changes will be posted with an updated
          effective date. Continued use after changes take effect constitutes acceptance.
        </P>

        {/* ── 2. Age Requirement ───────────────────────────────────────────── */}
        <H2 id="age">2. Age Requirement</H2>
        <div className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <p className="font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ You must be 21 years of age or older to use this Service.
          </p>
          <P>
            The Service is designed to assist with compliance review of alcohol beverage labels
            regulated by the U.S. Alcohol and Tobacco Tax and Trade Bureau (TTB). Alcohol
            beverage labels and the underlying federal regulations are intended for adults aged
            21 and older. By using the Service, you represent and warrant that you are at least
            21 years old.
          </P>
        </div>

        {/* ── 3. Description of Service ────────────────────────────────────── */}
        <H2 id="description">3. Description of Service</H2>
        <P>
          {APP_NAME} is an AI-assisted tool that:
        </P>
        <UL>
          <li>Extracts text from alcohol beverage label images using AI vision technology.</li>
          <li>Compares extracted label data against entered Certificate of Label Approval (COLA) application values.</li>
          <li>Flags potential discrepancies with respect to TTB labeling requirements under 27 CFR Parts 4, 5, 7, and 16.</li>
          <li>Provides an illustrative compliance grade (optional reviewer scorecard feature).</li>
        </UL>

        {/* ── 4. Permitted Use ─────────────────────────────────────────────── */}
        <H2 id="permitted-use">4. Permitted Use</H2>
        <P>
          The Service is provided solely to assist industry professionals, regulatory reviewers,
          and researchers in identifying potential label compliance issues. You agree to use
          the Service only for lawful purposes and in accordance with these Terms.
        </P>
        <P>You agree <strong>not</strong> to:</P>
        <UL>
          <li>Submit label images or data that you are not authorized to share.</li>
          <li>Use the Service to automate regulatory submissions to TTB or any government agency.</li>
          <li>Attempt to reverse-engineer, scrape, or extract the AI model or system prompts.</li>
          <li>Use automated bots, scripts, or other means to exceed the rate limits imposed by the Service.</li>
          <li>Use the Service in any way that violates applicable federal, state, or local laws or regulations.</li>
          <li>Upload images or data that contain personal information of individuals without their consent.</li>
          <li>Attempt to circumvent security measures, abuse detection systems, or access controls.</li>
        </UL>

        {/* ── 5. Not Legal or Regulatory Advice ───────────────────────────── */}
        <H2 id="no-legal-advice">5. Not Legal or Regulatory Advice</H2>
        <div className="my-4 rounded-lg border border-border bg-muted/40 px-5 py-4">
          <p className="font-semibold">
            {APP_NAME} is an educational and compliance-assistance tool — not a substitute for
            official TTB review, legal counsel, or regulatory compliance determination.
          </p>
        </div>
        <P>
          Verification results produced by this Service are illustrative only. They are based
          on AI-assisted text extraction (which may be imperfect) and automated rule-checking
          (which may not cover all applicable regulations). The Service:
        </P>
        <UL>
          <li>Does <strong>not</strong> guarantee that any label has been or will be approved by TTB.</li>
          <li>Does <strong>not</strong> constitute a legal opinion or regulatory determination.</li>
          <li>Does <strong>not</strong> replace the official TTB COLA review process via TTBGov's online system.</li>
          <li>May not reflect the most current TTB regulations, guidance, or industry circular updates.</li>
        </UL>
        <P>
          Always consult qualified legal counsel and submit labels through the official TTB
          electronic COLA system (eCOLA) for binding regulatory decisions.
        </P>

        {/* ── 6. Intellectual Property ─────────────────────────────────────── */}
        <H2 id="ip">6. Intellectual Property</H2>
        <P>
          The Service, including its source code, design, and content (excluding user-submitted
          label images), is licensed under the{" "}
          <a
            href="https://github.com/BarnsL/ttb-label-verifier/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            MIT License
          </a>
          . You retain all rights to the label images and data you submit.
        </P>
        <P>
          By submitting label images, you grant us a limited, non-exclusive, royalty-free license
          to process and display your content solely to provide the verification result to you.
          We do not store, share, or use your submitted content for any other purpose.
        </P>

        {/* ── 7. Privacy ───────────────────────────────────────────────────── */}
        <H2 id="privacy">7. Privacy</H2>
        <P>
          Our collection and use of personal information in connection with the Service is
          described in our{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference. California residents have
          additional rights described in the Privacy Policy.
        </P>

        {/* ── 8. Disclaimers ───────────────────────────────────────────────── */}
        <H2 id="disclaimers">8. Disclaimers</H2>
        <P>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
          EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY. WE DO NOT WARRANT
          THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
        </P>
        <P>
          AI-generated outputs may contain errors, hallucinations, or omissions. The AI model
          used for label text extraction may misread handwriting, low-resolution images, or
          unusual label formats.
        </P>

        {/* ── 9. Limitation of Liability ───────────────────────────────────── */}
        <H2 id="liability">9. Limitation of Liability</H2>
        <P>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL {APP_NAME.toUpperCase()},
          ITS OPERATORS, CONTRIBUTORS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, GOODWILL,
          OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY
          TO USE THE SERVICE.
        </P>
        <P>
          OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE
          SERVICE SHALL NOT EXCEED $0.00, AS THE SERVICE IS PROVIDED FREE OF CHARGE.
        </P>

        {/* ── 10. Indemnification ──────────────────────────────────────────── */}
        <H2 id="indemnification">10. Indemnification</H2>
        <P>
          You agree to indemnify, defend, and hold harmless {APP_NAME} and its operators from
          and against any claims, damages, losses, costs, and expenses (including reasonable
          attorneys' fees) arising from: (a) your use of the Service; (b) your violation of
          these Terms; (c) your violation of any rights of a third party; or (d) any label
          image or data you submit.
        </P>

        {/* ── 11. Governing Law ────────────────────────────────────────────── */}
        <H2 id="governing-law">11. Governing Law and Dispute Resolution</H2>
        <P>
          These Terms are governed by the laws of the State of California, without regard to
          its conflict-of-law provisions. Any dispute arising from or relating to these Terms
          or the Service shall be resolved exclusively in the state or federal courts located
          in California. You consent to personal jurisdiction in such courts.
        </P>

        {/* ── 12. Termination ──────────────────────────────────────────────── */}
        <H2 id="termination">12. Termination</H2>
        <P>
          We reserve the right to suspend or terminate access to the Service at any time and
          for any reason, including for violation of these Terms or for abuse of the Service,
          without prior notice or liability.
        </P>

        {/* ── 13. Contact ──────────────────────────────────────────────────── */}
        <H2 id="contact">13. Contact</H2>
        <P>
          Questions about these Terms? Contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Terms%20of%20Service%20%E2%80%94%20TTB%20Label%20Verifier`}
            className="underline hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </P>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/security" className="hover:text-foreground">Security</Link>
        </div>
      </div>
    </main>
  );
}
