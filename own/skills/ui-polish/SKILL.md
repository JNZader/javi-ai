---
name: ui-polish
description: >
  Four quality gate checklists for UI polish: baseline visual review, accessibility (keyboard/focus/ARIA),
  metadata (titles/meta/social cards), and motion performance. Run these gates before shipping any
  user-facing change.
  Trigger: When reviewing UI changes, preparing for release, auditing accessibility, or optimizing
  web performance.
license: MIT
metadata:
  author: JNZader
  version: "1.0"
  tags: [ui, accessibility, a11y, performance, metadata, seo, quality-gates]
  category: quality
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Code works but the UI feels off. The button is 2px misaligned, focus rings are missing, the page title says "undefined", and the hero animation janks on mobile. These are not bugs — they are polish gaps that erode user trust. This skill defines four quality gates that catch polish issues BEFORE they ship.

---

## When to Activate

- Before merging any PR that touches UI components
- Preparing a feature for release or demo
- After a design review surfaces visual inconsistencies
- When auditing an existing app for accessibility compliance
- Performance profiling shows layout shifts or jank

---

## The Four Quality Gates

Run these gates IN ORDER. Each gate has a checklist. A gate PASSES when all items are checked.

---

## Gate 1: Baseline Visual Review

Visual consistency check against the design system. No tools required — this is a manual/AI review of the rendered output.

### Checklist

- [ ] **Spacing is consistent** — margins and padding follow the design system scale (4px/8px/16px grid)
- [ ] **Typography hierarchy** — headings use the correct font size, weight, and line height from the type scale
- [ ] **Color usage** — all colors come from design tokens, no hardcoded hex values in components
- [ ] **Border radius** — consistent across similar elements (buttons, cards, inputs)
- [ ] **Alignment** — elements are visually aligned (check left edges, baselines, center alignment)
- [ ] **Responsive breakpoints** — layout works at mobile (375px), tablet (768px), and desktop (1280px)
- [ ] **Empty states** — lists, tables, and search results have designed empty states
- [ ] **Loading states** — async content shows skeleton or spinner, not a blank area
- [ ] **Error states** — form validation, API errors, and 404 pages are styled
- [ ] **Dark mode** — if supported, all components render correctly in both themes
- [ ] **Truncation** — long text truncates with ellipsis or wraps gracefully, no overflow

### How to Verify

```
1. Open the page at each breakpoint (375, 768, 1280)
2. Screenshot each state: default, loading, empty, error
3. Compare against design tokens/Figma
4. Check with browser DevTools element inspector for spacing values
```

---

## Gate 2: Accessibility (a11y)

Keyboard navigation, focus management, ARIA attributes, and screen reader compatibility.

### Checklist

- [ ] **Keyboard navigation** — all interactive elements reachable via Tab key in logical order
- [ ] **Focus visible** — focus ring is visible on all interactive elements (no `outline: none` without replacement)
- [ ] **Focus trap in modals** — Tab cycles within open dialogs, does not escape to background
- [ ] **Escape closes modals** — all dialogs, dropdowns, and overlays close on Escape key
- [ ] **Skip to content** — page has a "Skip to main content" link as first focusable element
- [ ] **Heading hierarchy** — h1 → h2 → h3, no skipped levels, single h1 per page
- [ ] **Alt text on images** — decorative images use `alt=""`, meaningful images have descriptive alt
- [ ] **ARIA labels** — icon-only buttons have `aria-label`, custom widgets have proper ARIA roles
- [ ] **Color contrast** — text meets WCAG AA (4.5:1 normal, 3:1 large text) — check with axe or Lighthouse
- [ ] **Form labels** — every input has an associated `<label>` or `aria-label`
- [ ] **Error announcements** — form errors are announced to screen readers via `aria-live` or `role="alert"`
- [ ] **No auto-play media** — audio/video does not auto-play, or has immediate pause control
- [ ] **Reduced motion** — animations respect `prefers-reduced-motion: reduce`
- [ ] **Touch targets** — interactive elements are at least 44x44px on mobile

### How to Verify

```
1. Unplug your mouse. Navigate the entire page with keyboard only.
2. Run axe DevTools or Lighthouse accessibility audit.
3. Test with a screen reader (VoiceOver on Mac, NVDA on Windows).
4. Check with browser DevTools: Accessibility panel → ARIA tree.
5. Verify contrast with Chrome DevTools color picker (shows ratio).
```

### Common Fixes

```css
/* Focus visible — replace removed outlines */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Skip to content */
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 999;
}
.skip-link:focus {
  left: 50%;
  transform: translateX(-50%);
  top: 1rem;
}
```

```html
<!-- Icon button with label -->
<button aria-label="Close dialog">
  <svg>...</svg>
</button>

<!-- Live region for errors -->
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

---

## Gate 3: Metadata & SEO

Page titles, meta descriptions, Open Graph tags, and social card previews.

### Checklist

- [ ] **Page title** — unique, descriptive, follows pattern: `{Page} | {Site Name}`
- [ ] **Meta description** — 150-160 characters, includes primary keyword
- [ ] **Canonical URL** — `<link rel="canonical">` set on every page
- [ ] **Open Graph tags** — `og:title`, `og:description`, `og:image`, `og:url` present
- [ ] **OG image** — at least 1200x630px, readable at thumbnail size
- [ ] **Twitter card** — `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] **Favicon** — multiple sizes: 16x16, 32x32, 180x180 (apple-touch-icon), SVG
- [ ] **Structured data** — JSON-LD for relevant content types (Article, Product, FAQ, etc.)
- [ ] **Language** — `<html lang="en">` (or appropriate language code) is set
- [ ] **Robots** — `<meta name="robots" content="index, follow">` or appropriate directive
- [ ] **404 page** — custom 404 with navigation back to the site
- [ ] **Sitemap** — `sitemap.xml` exists and is linked from `robots.txt`

### How to Verify

```
1. Check <head> in browser DevTools → Elements
2. Use https://metatags.io to preview social cards
3. Test OG image with https://opengraph.xyz
4. Validate structured data with Google Rich Results Test
5. Check favicon with https://realfavicongenerator.net/favicon_checker
```

### Template

```html
<head>
  <title>Dashboard | MyApp</title>
  <meta name="description" content="Monitor your analytics with real-time charts and reports.">
  <link rel="canonical" href="https://myapp.com/dashboard">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Dashboard | MyApp">
  <meta property="og:description" content="Monitor your analytics with real-time charts and reports.">
  <meta property="og:image" content="https://myapp.com/og-dashboard.png">
  <meta property="og:url" content="https://myapp.com/dashboard">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Dashboard | MyApp">
  <meta name="twitter:description" content="Monitor your analytics with real-time charts and reports.">
  <meta name="twitter:image" content="https://myapp.com/og-dashboard.png">

  <!-- Favicon -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
```

---

## Gate 4: Motion & Performance

Animation smoothness, layout stability, and rendering performance.

### Checklist

- [ ] **No layout shift** — CLS (Cumulative Layout Shift) < 0.1 — images/embeds have explicit dimensions
- [ ] **Smooth animations** — all transitions run on `transform` and `opacity` only (GPU-composited)
- [ ] **No forced reflow** — reading layout properties (offsetHeight) does not occur inside loops or animation frames
- [ ] **Font loading** — `font-display: swap` or `optional` — no FOIT (Flash of Invisible Text)
- [ ] **Image optimization** — WebP/AVIF with fallback, responsive `srcset`, lazy loading below fold
- [ ] **Bundle size** — no unnecessary dependencies, check with `npx bundlephobia <package>`
- [ ] **First paint** — LCP (Largest Contentful Paint) < 2.5s on 4G throttle
- [ ] **Interaction delay** — INP (Interaction to Next Paint) < 200ms
- [ ] **Animation frame budget** — animations complete within 16ms per frame (60fps)
- [ ] **Prefers reduced motion** — all animations disabled or simplified when user prefers reduced motion
- [ ] **Scroll performance** — no janky scroll handlers, use `will-change` sparingly and only during animation
- [ ] **Transition states** — entry/exit animations for route changes, modals, and dynamic content

### How to Verify

```
1. Chrome DevTools → Performance tab → Record page load
2. Check CLS, LCP, INP in Lighthouse
3. DevTools → Rendering → check "Layout Shift Regions"
4. DevTools → Rendering → check "Frame Rendering Stats" (FPS counter)
5. DevTools → Performance → look for long tasks (> 50ms red bars)
6. Test on throttled connection: Slow 3G + 4x CPU slowdown
```

### Performance Patterns

```css
/* GPU-composited animations only */
.card-enter {
  transform: translateY(20px);
  opacity: 0;
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}
.card-enter-active {
  transform: translateY(0);
  opacity: 1;
}

/* Prevent layout shift on images */
img {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}

/* Font loading strategy */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
}
```

```html
<!-- Responsive images with lazy loading -->
<img
  src="hero-800.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1600.webp 1600w"
  sizes="(max-width: 768px) 100vw, 800px"
  loading="lazy"
  decoding="async"
  alt="Product showcase"
  width="800"
  height="450"
>
```

---

## Running the Gates

### Full Review (Before Release)

Run all 4 gates in order. Report pass/fail per gate with specific items that failed.

```
UI Polish Report — {Feature/Page Name}
Date: {date}

Gate 1: Visual Review ......... PASS (11/11)
Gate 2: Accessibility ......... FAIL (12/14)
  ❌ Focus trap in modals — Tab escapes modal to background
  ❌ Color contrast — subtitle text is 3.8:1 (needs 4.5:1)
Gate 3: Metadata .............. PASS (12/12)
Gate 4: Motion & Performance .. FAIL (10/12)
  ❌ Layout shift — hero image causes CLS of 0.23
  ❌ Reduced motion — carousel still animates

Overall: 2/4 gates passed. Fix 4 items before shipping.
```

### Quick Review (For PRs)

Run Gate 1 and Gate 2 only. Gate 3 and 4 are optional for non-release PRs.

### Accessibility-Only Review

Run Gate 2 only. Use when specifically auditing a11y compliance.

---

## Critical Rules

1. ALL four gates MUST pass before a user-facing feature ships to production.
2. Accessibility (Gate 2) is NON-NEGOTIABLE — never skip it, even for "internal" tools.
3. Never suppress focus outlines without providing a visible alternative.
4. Every `<img>` MUST have explicit `width` and `height` (or `aspect-ratio`) to prevent layout shift.
5. Animations MUST respect `prefers-reduced-motion` — this is not optional.
6. OG images MUST be tested with actual social preview tools, not just inspecting the meta tag.
7. Performance MUST be tested on throttled connections, not just localhost on a fast machine.
8. The gate report format MUST list specific failing items — "needs work" is not acceptable feedback.
