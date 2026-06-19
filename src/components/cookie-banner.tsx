/**
 * @file cookie-banner.tsx
 * CCPA/CPRA + EU-GDPR compatible cookie-consent banner.
 *
 * What this app actually stores:
 *   Necessary (always on):
 *     - "ttb-age-verified" (localStorage) — age-gate confirmation
 *     - "ttb-cookie-consent" (localStorage) — this consent record
 *     - next-themes (localStorage) — dark/light mode preference
 *   Functional: none currently
 *   Analytics: none currently (Vercel Analytics not yet enabled)
 *   Advertising: never
 *
 * Global Privacy Control (GPC):
 *   If the browser sends Sec-GPC: 1, the middleware sets a "gpc-optout" cookie.
 *   On first visit this banner reads that cookie and pre-selects "Reject
 *   Non-Essential" to honour the GPC signal automatically.
 *
 * Consent record format (localStorage key "ttb-cookie-consent"):
 *   { version, timestamp, necessary, functional, analytics, advertising, gpc }
 *
 * Accessibility:
 *   - role="region" aria-label="Cookie preferences"
 *   - All interactive elements are keyboard-reachable
 *   - Focus is moved to the banner heading when it appears
 */

"use client";

import { useEffect, useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsentRecord {
  version: "1";
  timestamp: number;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  gpc: boolean;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY    = "ttb-cookie-consent";
const CURRENT_VERSION: ConsentRecord["version"] = "1";

function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CURRENT_VERSION) return null; // re-prompt on policy change
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(record: Omit<ConsentRecord, "version" | "timestamp">) {
  const full: ConsentRecord = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    ...record,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

/** Read the gpc-optout cookie set by middleware when Sec-GPC: 1 is detected. */
function isGpcSet(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("gpc-optout=1"));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({
    functional: false,
    analytics:  false,
    advertising: false,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [gpc, setGpc] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      const gpcDetected = isGpcSet();
      setGpc(gpcDetected);
      // If GPC is set, default preferences to rejected (user's opt-out signal).
      setPrefs({ functional: !gpcDetected, analytics: false, advertising: false });
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (show) headingRef.current?.focus();
  }, [show]);

  if (!show) return null;

  function accept() {
    saveConsent({ necessary: true, functional: true, analytics: true, advertising: false, gpc });
    setShow(false);
  }

  function reject() {
    saveConsent({ necessary: true, functional: false, analytics: false, advertising: false, gpc });
    setShow(false);
  }

  function savePrefs() {
    saveConsent({ necessary: true, ...prefs, gpc });
    setShow(false);
  }

  function openSettings() {
    window.location.href = "/privacy#cookies";
  }

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-5xl px-5 py-4">
        {!expanded ? (
          // ── Compact view ───────────────────────────────────────────────────
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-sm font-semibold focus:outline-none"
              >
                🍪 Cookie &amp; Storage Preferences
                {gpc && (
                  <span className="ml-2 rounded bg-violet-600/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-violet-600">
                    GPC detected
                  </span>
                )}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We use localStorage for essential preferences (theme, age verification, this consent).
                No advertising or tracking.{" "}
                <a href="/privacy#cookies" className="underline hover:text-foreground">
                  Learn more
                </a>
                {gpc && " — your Global Privacy Control signal has been detected and non-essential features are pre-rejected."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => setExpanded(true)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Manage
              </button>
              <button
                onClick={reject}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={accept}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // ── Expanded preferences ───────────────────────────────────────────
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Manage Storage Preferences</h2>
            <div className="divide-y divide-border rounded-lg border border-border">
              {[
                {
                  key: "necessary",
                  label: "Necessary",
                  desc: "Required for core functionality: theme, age verification, and this consent record. Cannot be disabled.",
                  value: true,
                  locked: true,
                },
                {
                  key: "functional",
                  label: "Functional",
                  desc: "Remembers additional preferences. Not currently used.",
                  value: prefs.functional,
                  locked: false,
                },
                {
                  key: "analytics",
                  label: "Analytics",
                  desc: "Usage analytics (e.g. Vercel Analytics). Not currently enabled.",
                  value: prefs.analytics,
                  locked: false,
                },
                {
                  key: "advertising",
                  label: "Advertising",
                  desc: "Advertising cookies. Never used by this app.",
                  value: false,
                  locked: true,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={item.value}
                    disabled={item.locked}
                    onClick={() => {
                      if (!item.locked && item.key !== "necessary" && item.key !== "advertising") {
                        setPrefs((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }));
                      }
                    }}
                    className={[
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition",
                      "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
                      item.locked && "cursor-not-allowed opacity-50",
                      item.value ? "bg-violet-600" : "bg-muted",
                    ].join(" ")}
                    aria-label={`${item.label} storage: ${item.value ? "on" : "off"}`}
                  >
                    <span
                      className={[
                        "inline-block h-4 w-4 rounded-full bg-white shadow transition",
                        item.value ? "translate-x-5" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setExpanded(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Back
              </button>
              <button
                onClick={savePrefs}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Re-open the cookie banner so the user can change their preferences at any time.
 * Call this from a "Cookie Settings" footer link.
 */
export function reopenCookieBanner() {
  try {
    localStorage.removeItem("ttb-cookie-consent");
    window.location.reload();
  } catch {
    window.location.reload();
  }
}
