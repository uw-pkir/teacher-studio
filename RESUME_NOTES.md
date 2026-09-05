# Teacher Studio — project status notes

Read this first if you're picking this project up in a new session or on a
different computer. Then `SETUP.md` for "how do I configure X" specifics,
and `brand/BRAND.md` for logo/color/font usage.

## Where things stand

Everything in `SETUP.md` is live and working — this isn't a partially-built
project. Specifically:
- `/admin` (Decap CMS) OAuth is configured and in active use.
- Workshops (next-workshop banner, schedule grid, resource archive) sync
  hourly from a Google Form/Sheet.
- Show & Tell photos sync every 30 minutes from a separate, moderated
  Google Form/Sheet.
- Hub site map pins auto-geocode from a street address via a GitHub Action.

**This repo's `main` branch is the live site** at
https://uw-pkir.github.io/teacher-studio/ — every push deploys immediately.
Sync bots (workshop sync, showcase sync, hub geocoding) and Decap CMS saves
all commit directly to `main` on their own schedule, so **always
`git pull --rebase origin main` before pushing** — expect to find bot
commits waiting fairly often.

## How the site is put together

- Static HTML/CSS/JS, no build step, no npm install, no `node_modules` —
  `index.html` + `css/style.css` + `js/main.js`, hand-written, no framework.
- All page content is data-driven: `js/main.js`'s `loadAndRenderAll()`
  fetches everything under `data/*.json` and renders it client-side.
- `/admin` (Decap CMS) has three sections:
  - **Hubs & Organizers** — hub sites/organizing partners, current
    organizers, and organizers emeriti (`data/hubs.json`, `data/organizers.json`).
  - **Update Section Text** — the headline + description shown at the top
    of every section (Hero included), plus About's icon/title/description
    feature rows, the hero's two CTA button labels, and a Footer group
    (tagline, contact email), each collapsed by default
    (`data/section-text.json`).
  - **Settings**, split into two files by how often each is touched:
    **General Settings** (registration link, workshop time, location note,
    Show & Tell form link — `data/site-settings.json`) and **Google Sheet
    Links (Advanced)** (the workshops/season-dates/show-tell published-sheet
    URLs — `data/sync-settings.json`, set up once and rarely touched again).
- `media_folder`/`public_folder` in `admin/config.yml` is `"images"`, matching
  where every image on the site (organizer photos included) actually lives.
  If this ever drifts from wherever images are actually kept, the image
  widget shows broken previews for anything not uploaded through the CMS,
  and those files won't show up in the CMS's Media Library either.
- Workshops and Show & Tell photos are **not** edited via `/admin` at all —
  they come from Google Forms/Sheets, pulled in by scheduled GitHub Actions
  (`scripts/sync-workshops.js`, `scripts/sync-showcase.js`).
- Hub sites have two independent CMS checkboxes, **Hub** (`is_hub`) and
  **Partner** (`is_partner`) — a location can be a meeting spot (map pin +
  text list), an organizing partner (Partner Organizations list), both, or
  split into two separate entries when the meeting spot and the partner org
  differ (e.g. Appleton Public Library is Hub-only; Building for Kids
  Children's Museum, the actual partner org in that city, is Partner-only).
  Hubs, organizers, and partners all render alphabetically by name
  (organizers by first name) regardless of CMS list order.
- Hub map pins are geocoded automatically from a street address
  (`scripts/geocode-hubs.js`, triggered on every push to `data/hubs.json`)
  — no manual lat/lng entry needed; see `SETUP.md` section 5.
- Section backgrounds alternate automatically based on their order in
  `index.html` (CSS `main > section:nth-of-type(odd/even)`), so reordering
  `<section>` blocks keeps the alternation correct with nothing to update
  by hand. The nav menu order does need to be updated by hand to match,
  though, if sections are ever reordered again.
- **The CSP's `script-src` has no `'unsafe-inline'`** -- an inline event
  handler attribute (`onerror="..."`, `onclick="..."`, etc.) written into a
  template string is silently blocked, not an error you'll see logged in
  an obvious way. Wire up events with `addEventListener` after the markup
  is in the DOM instead (see `handleShowcaseImageError` in `js/main.js`
  for the pattern), the same way the resource-card click handlers already
  do it.
- SEO basics: `robots.txt` (disallows `/admin/` only), a canonical `<link>`
  tag in `index.html`, and a `schema.org` `Event` block for the Next
  Workshop. The Event block is injected/updated by
  `renderEventStructuredData()` in `js/main.js` (a `<script
  type="application/ld+json">` built from the same data the spotlight
  card renders) rather than hand-written in `index.html`, since the next
  workshop changes monthly -- confirmed this works fine even under the
  strict CSP, since `application/ld+json` is inert data, not executable
  script. It's skipped entirely when there's no upcoming workshop yet, or
  the nearest one is still just a placeholder with no real topic decided.

## Where to look for what

- **First-time setup steps** (OAuth app, Cloudflare Worker, Google Sheets
  wiring): `SETUP.md`.
- **Logo/color/font usage, PNG exports, offline font files for flyers**:
  `brand/BRAND.md`.
- **Local preview** — this dev machine has no Node or Python installed, so
  local testing uses a plain PowerShell static file server instead of a
  real dev server:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\serve-local.ps1
  ```
  then open http://localhost:8090/. (The sync scripts themselves need
  Node, but only ever run inside GitHub Actions, never locally.)

## Known minor quirks (not urgent)

- The oldest archived workshop ("Cardboard Mask Making," Oct 2022) links to
  a Squarespace-hosted PDF that now 404s. Same situation as above -- the
  fix is deleting/replacing that link at the source (the Website Entry
  form's response sheet), not something to hand-edit in `data/workshops.json`
  directly, since the next hourly sync would just overwrite it.
- A couple of resource-archive links resolve to unhelpful auto-generated
  titles ("Human Verification" for a bot-challenge page, bare "Amazon" for
  an Amazon product link). `resolveLinkTitle()` in `scripts/sync-workshops.js`
  already handles the common cases (YouTube/Vimeo oEmbed, junk-title
  detection with a friendly fallback) but isn't exhaustive. Low-frequency
  and cosmetic only — the real fix for any specific bad link is editing
  that page's own `<title>`/`og:title` at the source.
- The footer no longer links to `/admin` (removed along with the rest of
  the footer links per an explicit request) — go to
  `https://uw-pkir.github.io/teacher-studio/admin/` directly, or bookmark it.

## Decisions made (context — don't re-litigate)

- GitHub Pages + Decap CMS chosen over staying on Google Sites.
- OAuth via a self-hosted Cloudflare Worker (`oauth-proxy/worker.js`), not
  Netlify. Hardened (origin-checked `postMessage`, a CSRF `state` cookie)
  and redeployed/confirmed working with a real `/admin` login. Remember the
  Worker doesn't auto-deploy from `git push` -- any future edit to
  `oauth-proxy/worker.js` needs to be manually pasted into the Cloudflare
  dashboard and saved.
- Show & Tell is moderated (a checkbox column in the response sheet), not
  instant/unmoderated.
- Both sync scripts read their source-sheet URLs from
  `data/sync-settings.json` (CMS-editable, under Settings → Google Sheet
  Links (Advanced)), not GitHub Actions secrets/variables — no GitHub
  Settings access needed to change them.
- Esri Light Gray Base map tiles (Carto's free tier now requires an API key).
- The 18 hand-migrated legacy archive entries from the original Google
  Sites import were retired — the resource archive is 100% sheet-driven.
- Missing emoji (a blank cell, or a synthesized season-date placeholder)
  always falls back to 🧩; a workshop icon otherwise gets a random
  quilt-flourish patch.
- Current section order: Hero, Next Workshop, Schedule, Show & Tell, Past
  Workshops, About Us, Hubs, Organizers — nav menu order matches.
- The interactive hero quilt-logo animation plays for everyone regardless
  of the OS "reduce motion" setting, since testing showed that setting is
  commonly on for reasons unrelated to actual motion sensitivity
  (IT-managed machines, Remote Desktop, performance tuning), and the
  animation itself is a brief, click-triggered effect rather than
  autoplaying motion.
- Organizer photos are resized to fit within 250×250px before being
  committed (they render as a ~100×100px circle, so that's already
  retina-quality) -- the original, much larger uploads were bloating page
  weight for no visual benefit. The CMS's Photo field now has a hint
  saying so, so new uploads hopefully start off reasonably sized; if one
  doesn't, there's no automatic resizing step, it just needs doing by hand
  again (any image editor's "resize/scale" export, or ask to have it done
  the same way as the rest).
- A broken or removed Show & Tell photo (a deleted Drive file, or its
  sharing permission reverted to private after approval) no longer shows
  the browser's default broken-image icon -- `handleShowcaseImageError` in
  `js/main.js` swaps in a small, dimmed quilt flourish instead, so the
  card's caption/maker/title still reads fine even without the photo.
