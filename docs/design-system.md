# EmoVisionAI Design System

## 1. Research inputs and what was actually inspected

| Source | Access method | What could be verified |
| --- | --- | --- |
| [jarvis.cx](https://jarvis.cx/) | Fetched as HTML/text (no rendering browser was available in the build environment) | Page structure, navigation items, copy style, section order, CTA patterns, footer layout. **Colours, fonts, gradients and animations could not be observed**: they live in compiled CSS and rendered images, which a text fetch does not expose. |
| Pinterest | Web search restricted to `pinterest.com`; direct page fetch | Board titles and descriptions only ("futuristic UI", "dark mode dashboards", "HMI HUD UI", "futuristic glass UI"). Pinterest search pages are rendered by JavaScript and returned no pin images to the fetcher, so **no Pinterest image was viewed or reused**. |
| Dark AI SaaS template listings (Framer, Converge, SuperDesign) | Web search summaries | Recurring patterns: near-black navy base, blue-to-violet gradient headline, glowing primary CTA with outline secondary, product preview below the fold. |

No third-party image, logo, source code or stylesheet is used. All graphics in the app are original SVG/CSS.

### Structural principles taken from jarvis.cx (adapted, not copied)

1. **Sticky top navigation** with a wordmark on the left, product links in the middle and one high-contrast CTA on the right.
2. **Benefit-led hero**: a short title-case headline, a one-sentence subhead, small proof badges, and one dominant CTA.
3. **Proof directly after the hero**: jarvis.cx shows stat cards. EmoVisionAI shows *measured* evaluation numbers loaded from the API instead of marketing figures, and shows "Not evaluated yet" when none exist.
4. **Alternating feature blocks** of heading, description and visual, each with one supporting fact.
5. **A solution/pipeline diagram** explaining how data flows. This became the computer-vision pipeline section.
6. **Closing CTA band** with trust points and primary plus secondary buttons, followed by a multi-column footer.

Deliberately **not** carried over: client-logo rows, testimonials and user-count statistics. EmoVisionAI has no customers, and inventing them would be dishonest.

### Pinterest and template themes applied

- HUD / control-room framing: corner brackets around the camera feed, mono-spaced telemetry labels.
- Restrained palette with bright accents reserved for key information (live status, the primary prediction).
- Glass panels are used sparingly (navigation bar, floating cards) and never as stacked translucent layers.

## 2. Visual direction

"Precision instrument at night": deep navy space, cool blue-violet light, thin hairlines, and data that glows only where it matters.

### Colour tokens (defined in `frontend/src/styles/index.css` via Tailwind `@theme`)

| Token | Value | Use |
| --- | --- | --- |
| `ink-950` | `#05070f` | Page background |
| `ink-900` | `#0b1020` | Panels / chart surface |
| `ink-800` | `#121a2e` | Raised panels, inputs |
| `line` | `rgb(148 163 255 / 0.10)` | Hairline borders |
| `fg` | `#eef1ff` | Primary text (17.9:1 on ink-950, 15.4:1 on ink-800) |
| `fg-muted` | `#a3abc8` | Secondary text (8.8:1 / 7.6:1) |
| `fg-subtle` | `#7b84a6` | Captions, axis labels (5.5:1 / 4.7:1) |
| `brand-blue` | `#4f7cff` | Accent text, icons, focus rings (5.4:1 on ink-950) |
| `brand-violet` | `#8b5cf6` | Gradient partner |
| `brand-cyan` | `#22d3ee` | "Live" indicators only |
| `ok` / `warn` / `err` | `#22c55e` / `#f5b544` / `#f0616d` | Status, always with icon + text |

Two gradients carry the brand:

- **Text gradient** `#7d97ff → #a48bff → #c99bff` for the hero keyword and wordmark accent, on dark backgrounds only.
- **Fill gradient** `#4366f0 → #6a46e6 → #7d3fd6` for primary buttons. Every stop keeps white label text at 4.78:1 or better (WCAG AA). Face-box labels use `#3d5ce6` (5.4:1) and `#5b45c9` (6.7:1).

All contrast figures in this document were computed with the WCAG 2 relative-luminance formula, not estimated.

### Data-visualisation colours (validated)

Chart colours are separate from brand accents. They were validated with a CVD/contrast checker against the `ink-900` chart surface (dark mode): all checks pass, with a worst all-pairs CVD ΔE of 9.4 and a worst normal-vision ΔE of 20.9.

| Series | Colour |
| --- | --- |
| Happy (Happiness) | `#3987e5` |
| Sad (Sadness) | `#d95926` |
| Angry (Anger) | `#199e70` |

Single-series charts (expression distribution, per-class metrics) use one colour, `#3987e5`. The confusion matrix uses a single-hue blue sequential ramp. Every multi-series chart has a legend, and every chart has a table or number equivalent.

### Typography

| Role | Typeface | Notes |
| --- | --- | --- |
| Display (h1/h2) | Space Grotesk Variable | Tight tracking (-0.03em), weights 500–600 |
| UI / body | Inter Variable | 15–16px base, 1.6 line-height |
| Telemetry / numbers | JetBrains Mono | Latency, timestamps, scores; tabular numerals |

Fonts are self-hosted through `@fontsource` packages, so the app needs no network after install.

Type scale: hero `clamp(2.75rem, 6vw, 5rem)`, section titles `clamp(2rem, 3.5vw, 3rem)`, eyebrow labels 12px uppercase with +0.18em tracking.

### Layout and spacing

- Max content width 1200px with 24px gutters (16px on mobile).
- Section rhythm: 112px vertical padding on desktop, 72px on mobile.
- 4px base grid. Panel radius 16px, control radius 10px, pill radius full. Rounded corners are kept modest to avoid a "bubbly card" look.
- Background depth comes from two large blurred radial glows (blue top-left, violet right), a faint 64px grid masked to fade out, and a soft noise-free vignette.

### Motion

- 150–250ms ease-out for hovers and focus states. Fade-up reveals on landing sections are 400ms, run once.
- The hero illustration has a slow scan line (6s loop) and a breathing glow.
- All non-essential animation is disabled under `prefers-reduced-motion: reduce`.

### Components

Navbar, HeroSection, FeatureSection, PipelineSection, EvaluationSection, ResponsibleAISection, Footer, CameraPanel, DetectionOverlay, ExpressionResult, ConfidenceBars, RequestedCategories, SessionMetrics, ExpressionChart, TimelineChart, ModelInfoPanel, ConfusionMatrix, PrivacyNotice, LoadingState, ErrorState.

### Honesty rules baked into the UI

- Any illustrative graphic that resembles model output carries a visible "Illustration, not live output" label.
- Unsupported categories (Stress, Tired) render as "Not available", with the reason one click away. They never show a bar or a number.
- Metrics appear only when computed from real observations or the real evaluation file, and each shows its data scope.

### Accessibility

- WCAG AA text contrast on all surfaces. Focus-visible rings use 2px `brand-blue` with a 2px offset.
- Semantic landmarks (`header`, `nav`, `main`, `footer`), labelled controls, and `aria-live="polite"` on the prediction readout.
- Charts include text or table equivalents. Colour is never the only carrier of meaning.
