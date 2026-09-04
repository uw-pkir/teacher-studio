# Teacher Studio — one-time setup

Everything below is a one-time setup step. Once it's done, updating the site monthly is just logging into `/admin` and filling out a form — no code, no git.

## 1. Turn on the site editor (`/admin`)

The editor (Decap CMS) needs a small "OAuth proxy" to let it log in with GitHub. This is a free Cloudflare Worker.

1. **Create a GitHub OAuth App**
   - Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
   - Homepage URL: `https://uw-pkir.github.io/teacher-studio/`
   - Authorization callback URL: `https://<your-worker-subdomain>.workers.dev/callback` (you'll get the exact worker URL in step 2 — you can come back and edit this field after).
   - Save it, then generate a **Client Secret**. Keep the Client ID and Client Secret handy.

2. **Deploy the OAuth proxy Worker**
   - Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com) (free tier is fine).
   - Workers & Pages → **Create** → **Create Worker**. Give it a name like `teacher-studio-cms-auth`.
   - Replace the default code with the contents of [`oauth-proxy/worker.js`](oauth-proxy/worker.js) in this repo, and deploy.
   - Note the Worker's URL (looks like `https://teacher-studio-cms-auth.<you>.workers.dev`).
   - Go back to your GitHub OAuth App and set the callback URL to `<that worker URL>/callback`.
   - In the Worker's **Settings → Variables and Secrets**, add two secrets:
     - `GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`

3. **Point the CMS at your Worker**
   - Edit [`admin/config.yml`](admin/config.yml) in this repo, and change `base_url` to your Worker's URL (no trailing slash, no `/callback`).
   - Commit it.

4. **Try it**
   - Visit `https://uw-pkir.github.io/teacher-studio/admin/`, click "Login with GitHub", and confirm you land in the editor.

5. **Add the second editor**
   - Repo → **Settings → Collaborators** → **Add people** → invite them by GitHub username.
   - Once they accept, they log into `/admin` the same way, with their own GitHub account.

## 2. Set up the workshop schedule & archive

The Next Workshop banner, the schedule grid, and the resource archive are **not edited in `/admin`** — they're entirely generated from a Google Form/Sheet by `scripts/sync-workshops.js`, run hourly by `.github/workflows/sync-workshops.yml`. A workshop's date decides everything: today-or-later shows up as the next workshop / on the schedule grid, anything earlier moves to the archive — there's no separate step to "archive" something.

**Already set up:**
- `workshops_tsv_url` in `data/sync-settings.json` — the workshops Form/Sheet, published as TSV. Its columns: `Timestamp, Date of workshop, Title/Theme, Emoji, Short description, Required materials, Nice to have materials, Resource Link 1..5` (materials are comma-separated; up to 5 optional resource links, only shown once the workshop is archived). Leave `Emoji` blank and it falls back to a random quilt-patch icon. Editable from `/admin` → Settings → Google Sheet Links (Advanced).
- `season_dates_tsv_url` (same file/CMS page) — a *second*, minimal Google Sheet with just one column of dates (any header text works — the first column is always read as the date), listing the season's workshop dates (`M/D/YY` or `M/D/YYYY`). Update it once a year when the new season's dates are announced — no Form needed, just paste the dates directly into the sheet, then re-publish (File → Share → Publish to web → CSV; if you'd already published it once, use "Republish now" so the same URL picks up the edit). Any season date without a matching row in the workshops sheet yet shows as a placeholder ("Topic announced a few weeks before the gathering") in the schedule's date calendar, so the full season is always visible even before each topic is decided. Clear this field and the schedule just shows whatever's actually been submitted to the main sheet.
- `workshop_time` in `data/site-settings.json` — the same time slot shown for every workshop, e.g. "4:30-5:30 PM CST". Shown in the Next Workshop spotlight and stated once in the schedule section's intro text (not repeated per date). Editable from `/admin` → Settings → General Settings.

The sync runs hourly, or trigger it immediately from the repo's **Actions** tab → "Sync workshop schedule & archive" → **Run workflow** (handy right after submitting a new workshop). Resource-link page titles for archived workshops are cached in `data/link-title-cache.json` so re-runs don't keep re-fetching the same links.

**How resource link labels are chosen:** a plain scrape of a page's `<title>` is often useless (a cookie-consent wall, a bot challenge, or just "- YouTube" with nothing else) — so the sync tries, in order: (1) for YouTube/Vimeo links, the real video title via their public oEmbed APIs; (2) the page's `<title>`, or its `og:title` if the `<title>` looks like junk; (3) if everything looks like junk, a friendly label naming the resource type instead (e.g. "Google Doc", "Instagram post", "YouTube video") rather than a blank or unhelpful string. If a link's label still isn't great, the most reliable fix is editing the page's own title/`og:title` at the source, since that's what feeds all of this — there's no per-link description field to hand-edit in the sheet.

## 3. Set up Show & Tell photo submissions

The form is already live: https://forms.gle/mYfvcYatq97hKuVz8 (set as `show_tell_form_url` in `data/site-settings.json`). What's left:

1. Open the Form's **Responses → linked Sheet** (the raw response sheet — leave its existing columns alone except for step 2).
2. Add a column called **Approved** (a checkbox or plain TRUE/FALSE) after the existing columns. This is where you moderate — check it for any photo you're OK showing publicly.
3. Add a **second tab** to the spreadsheet (bottom tab bar → `+`), call it `Public` (or `Approved`), and put a `QUERY()` formula in cell A1 that selects only the columns the site needs, where Approved = TRUE, e.g.:
   ```
   =QUERY('Form Responses 1'!A:F, "SELECT A, D, B, C, E WHERE F = TRUE LABEL A 'Timestamp', D 'Maker', B 'Title', C 'Caption', E 'Photo'", 1)
   ```
   The sheet name (`Form Responses 1`), column letters, and which of your raw columns is which depend on the exact order your form questions were created in — **use the actual header row of your raw response sheet to get these right**, since the `SELECT` letters must point at your real project-title/description/maker-name/photo/Approved columns. The site only requires a **Photo** column (the header text matters, not the letter) — **Maker**, **Title**, and **Caption** are all optional and shown if present, so you can include as many or as few as you like.
   This tab shows *only* approved rows, and only the columns the site needs — no email addresses or unapproved submissions ever leave the raw sheet.
4. **Publish only the `Public` tab**: File → Share → Publish to web → choose the `Public` sheet (not "Entire document") → CSV → Publish. Copy the resulting URL.
5. Paste that URL into `show_tell_csv_url` in `/admin` (Settings → Google Sheet Links (Advanced)) — no GitHub access needed, it's just another CMS field. (Or edit `data/sync-settings.json` directly if `/admin` isn't live yet.)
6. **Share the Form's upload folder publicly (view-only)**: open the Form → Responses → the folder icon (or find "Teacher Studio (File responses)" in your Drive) → Share → change to "Anyone with the link" → **Viewer**. Without this step, uploaded photos won't display on the site.

The sync runs automatically every 30 minutes (`.github/workflows/sync-showcase.yml`), or trigger it immediately from the repo's **Actions** tab → "Sync Show & Tell photos" → **Run workflow**.

## 4. Monthly update (the whole point of this)

**Entering a new workshop:** fill out the workshops Google Form (title, emoji, description, materials, and — once it's happened — resource links). That's it; no `/admin`, no git. It shows up as the Next Workshop banner automatically once its date is nearest, and moves itself into the archive once the date passes.

**Everything else** (hub sites, organizers, every section's headline/description text, Show & Tell settings) is still edited at `https://uw-pkir.github.io/teacher-studio/admin/` — no code, no git. `/admin` has three sections:
- **Hubs & Organizers** — hub sites/organizing partners, current organizers, and organizers emeriti.
- **Update Section Text** — the headline and description at the top of each section (Hero, About Us, Schedule, Past Workshops, Hubs, Organizers, Show & Tell), one collapsible group per section.
- **Settings** — split into **General Settings** (registration link, workshop time, location note, Show & Tell form link — safe to change any time) and **Google Sheet Links (Advanced)** (the published-sheet URLs from sections 2–3 above — set up once, rarely touched again).

## 5. Hub site map pins

Each physical hub's map pin is placed automatically from its **Street Address** field in `/admin` (Hubs & Organizers → Hub Sites / Organizing Partners) — type a normal address like `201 W Mifflin St, Madison, WI 53703` and save. That push triggers `.github/workflows/geocode-hubs.yml`, which looks the address up via OpenStreetMap's free Nominatim geocoder (`scripts/geocode-hubs.js`) and commits the resulting Latitude/Longitude back into `data/hubs.json` within a minute or two — no need to touch those two fields yourself; leave them blank. Results are cached in `data/hub-geocode-cache.json` so re-runs don't re-query an address that hasn't changed. If an address can't be found (typo, or too vague), the workflow logs a warning and leaves that hub's existing pin (if any) untouched rather than removing it — check the **Actions** tab → "Geocode hub site addresses" if a pin doesn't show up where expected.

## 6. Hub vs. Partner

Each entry in Hubs & Organizers → Hub Sites / Organizing Partners has two independent checkboxes:

- **Hub** — shows this entry as a pin on the map and in the text list of hub sites below it.
- **Partner** — shows this entry in the "Partner Organizations" list at the bottom of the page.

An entry can be either, both, or (by unchecking both) neither. This matters when the physical meeting spot in a city isn't the same organization as the actual organizing partner there — e.g. a workshop might meet at a public library (Hub: yes, Partner: no), while the real organizing partner for that region is a museum across town (Hub: no, Partner: yes). Give each its own entry rather than trying to force one entry to cover both roles. All three lists (hubs, the hub text list, and partners) render alphabetically by name, so there's no need to keep them in any particular order in the CMS.
