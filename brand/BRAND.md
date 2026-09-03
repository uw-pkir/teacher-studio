# Teacher Studio — Brand Guide

A quick reference for anyone putting together a flyer, slide, or anything else that should look like it belongs to Teacher Studio.

## Logo

**File:** [`teacher-studio-logo.svg`](teacher-studio-logo.svg) in this folder — pull this one file out and use it anywhere (slides, docs, print, social).

The logo is a **quilt block** — specifically a pinwheel-style half-square-triangle block. We picked this on purpose: Teacher Studio has the feel of a quilting bee more than a formal workshop (people gathering to talk and make together), and this particular block's four quadrants read like four separate windows or rooms — which mirrors the hybrid/Zoom-grid way the group actually meets, in person at hub sites and virtually all at once.

**Using it:**
- Don't recolor, recrop, or distort it — the four quadrants and the color arrangement are the point.
- It has a built-in white background and margin, so it's safe to drop onto any color background as-is.
- Minimum size: keep it at least 32×32px (or about 0.3in in print) — smaller than that and the quadrants stop reading clearly.

On the site itself, a big interactive version of this logo sits in the homepage header — each of its 16 squares can be clicked to "shuffle" into a new random patch, a little nod to piecing a quilt together.

## Flourish patches

Ten small single-patch icons — `quilt-flourish.svg` through `quilt-flourish-10.svg` in this folder — are the individual quilt pieces the logo is built from: six two-color half-square-triangle patches (each pair of brand colors, both diagonal directions) plus one solid square in each of the four colors. Use any of these as a small bullet, divider, or accent wherever a single quilt patch fits better than the full logo.

On the site, one of these ten is picked at random next to every section label ("Past Workshops," "Season Schedule," etc.) so headers don't all repeat the same patch, and the same pool fills in for a workshop's icon whenever one hasn't been given yet.

## Colors

| Swatch | Name | Hex | Use it for |
|---|---|---|---|
| 🟣 | Primary (Indigo) | `#6366f1` | Buttons, links, headings, primary UI accents |
| 🟣 | Primary Light | `#818cf8` | Gradient partner for Primary |
| 🟣 | Primary Dark | `#4f46e5` | Gradient partner for Primary, hover states |
| 🩷 | Secondary (Pink) | `#f472b6` | Secondary accents, gradient partner for Primary |
| 🟠 | Accent Orange | `#fb923c` | Decorative accents, quilt patches |
| 🟡 | Accent Yellow | `#fbbf24` | Decorative accents, quilt patches |
| 🟢 | Accent Green | `#34d399` | Sparingly, decorative accents |
| 🩵 | Accent Cyan / Teal | `#22d3d3` | Decorative accents, quilt patches |
| ⚫ | Dark (Deep Indigo) | `#1e1b4b` | Footer background, dark text |
| ⚪ | Backgrounds | `#faf7ff` (tinted), `#ffffff` (white) | Page/section backgrounds |

The site's overall "vibe" colors — the four that show up most, especially in the logo and decorative quilt patches — are **orange, purple (indigo), pink, and teal**. Yellow and green exist in the palette but are used more sparingly, mostly in gradients.

## Typography

- **Headings / display text:** [Fredoka](https://fonts.google.com/specimen/Fredoka) (weights 400–700) — the rounded, friendly font used for the logo wordmark, all headings, and buttons.
- **Body text:** [Inter](https://fonts.google.com/specimen/Inter) (weights 400–600) — everything else: paragraphs, labels, navigation.

Both are free Google Fonts, loaded via:
```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

## Where this lives in the actual site

The canonical color/font definitions are the CSS custom properties at the top of `css/style.css` (`:root { --primary: ...; --font-display: ...; }`) — if this guide and the CSS ever disagree, the CSS is the source of truth. Update both together if the palette changes.
