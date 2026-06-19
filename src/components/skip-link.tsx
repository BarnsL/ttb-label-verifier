/**
 * @file skip-link.tsx
 * Accessibility "Skip to main content" link — WCAG 2.1 SC 2.4.1 (Bypass Blocks).
 *
 * Visually hidden by default; becomes visible when focused via keyboard Tab.
 * Pressing Enter moves keyboard focus to the element with id="main-content",
 * letting screen-reader and keyboard-only users skip repeated navigation.
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={[
        // Hidden off-screen until focused; then snaps into view.
        "sr-only focus:not-sr-only",
        "focus:fixed focus:left-4 focus:top-4 focus:z-[9999]",
        "focus:rounded-md focus:bg-violet-600 focus:px-4 focus:py-2",
        "focus:text-sm focus:font-medium focus:text-white",
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-violet-600",
      ].join(" ")}
    >
      Skip to main content
    </a>
  );
}
