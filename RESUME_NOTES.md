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
    feature rows, each collapsed by default (`data/section-text.json`).
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

## ⚠️ Action needed: redeploy the OAuth Worker

`oauth-proxy/worker.js` was hardened in a security review (origin-checked
postMessage, a CSRF `state` cookie) -- **this only takes effect once the
updated code is pasted into the actual Cloudflare Worker and saved.**
Unlike everything else in this repo, the Worker doesn't auto-deploy from
`git push`. Until that's done, `/admin` login still works, just without
these protections. After redeploying, do one real login through `/admin`
to confirm the flow still completes end to end.

## Known minor quirks (not urgent)

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
  Netlify.
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
