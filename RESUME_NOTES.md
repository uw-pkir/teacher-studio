# Resume notes — Teacher Studio site rebuild

Where this stands as of the last session. Delete this file once everything below is resolved and you don't need it anymore.

## Status

All work is **committed locally but not pushed** to `origin/main` (7 commits on top of the original `264d41c` — run `git log --oneline` to see them). Nothing is live yet; the deployed GitHub Pages site still shows the old version. `git push` when ready to go live.

## What was built

A rebuild of https://github.com/uw-pkir/teacher-studio from a hardcoded static page into a data-driven site (see `SETUP.md` for full architecture/setup — start there). Short version:
- Hub sites, organizers, and misc settings live in small JSON files under `data/`, edited via `/admin` (Decap CMS).
- **Workshops (next-workshop banner, schedule grid, resource archive) are entirely driven by a Google Form/Sheet published as TSV**, not `/admin` — `scripts/sync-workshops.js` (run hourly by `.github/workflows/sync-workshops.yml`) builds `data/workshops.json` from it, and a workshop's date vs. today decides whether it's upcoming or archived. An optional second sheet (`season_dates_tsv_url`) can pre-populate the season's dates as placeholders. See SETUP.md section 2.
- Show & Tell photos sync from a separate, moderated Google Form/Sheet via `.github/workflows/sync-showcase.yml` + `scripts/sync-showcase.js` (SETUP.md section 3).
- `admin/` (Decap CMS) is **not yet wired up** — needs a GitHub OAuth App + a Cloudflare Worker deployed from `oauth-proxy/worker.js` (SETUP.md section 1). Until that's done, edits to hubs/organizers/settings have to go through Claude/git directly, not `/admin`.

## Local preview

```powershell
powershell -ExecutionPolicy Bypass -File scripts\serve-local.ps1
```
Then open http://localhost:8090/.

## Open items — what to pick up next

1. **`/admin` CMS login isn't set up yet** (SETUP.md section 1) — needs a GitHub OAuth App + Cloudflare Worker deploy. `admin/config.yml`'s `base_url` still has a placeholder. Until this is live, edit `data/site-settings.json` etc. directly.
2. **Workshops sync hasn't run for real yet** — `data/workshops.json` and `data/link-title-cache.json` were hand-built to match exactly what `scripts/sync-workshops.js` would produce (verified by running the same parsing logic against the real published TSV), but the Action itself won't run until this is pushed. First real run will re-fetch resource-link page titles server-side (Node has no CORS restriction, unlike the browser-based check used to validate this locally) — expect the placeholder `youtube.com`/`drive.google.com`-style link labels in the archive to become real page titles shortly after push.
3. **`season_dates_tsv_url` is unset** — optional; without it the schedule grid only shows workshops that have actually been submitted to the Form (currently just one, for 2026-10-15).
4. **`workshop_time` is set to "4:30-5:30 PM CST"** per Peter's correction — this is a single site-wide value now (not per-workshop), shown on both the spotlight and every schedule card.
5. **Show & Tell pipeline is not functional yet.** The form URL is wired in (`https://forms.gle/mYfvcYatq97hKuVz8`), but still needed: the exact question order on that form (or the header row of its linked response Sheet, to write the right `QUERY()` formula), the "Approved" moderation column + "Public" tab + publish-to-web CSV, pasting that CSV URL into `show_tell_csv_url`, and sharing the form's Drive upload folder as "Anyone with the link – Viewer". See SETUP.md section 3.
6. **Not pushed to GitHub yet.** Confirm with Peter before pushing (this repo is already live on Pages, so a push updates the deployed site immediately).

## Decisions already made (don't re-litigate)

- GitHub Pages + Decap CMS chosen over staying on Google Sites (user wants a more custom design, still no-code editing).
- OAuth via self-hosted Cloudflare Worker, not Netlify — user wanted to stay off Netlify.
- Two editors need direct CMS access (Peter + one other); handled via plain GitHub collaborator invite, no custom roles needed.
- Show & Tell is **moderated** (organizer approves via checkbox), not instant/unmoderated.
- Both sync scripts read their source-sheet URLs from `data/site-settings.json`, not GitHub Actions secrets/variables — simpler, no GitHub Settings access needed, editable from `/admin`.
- Esri Light Gray Base tiles for the hub map (Carto's free tier now requires an API key).
- Hub sites use two independent booleans, `is_hub` and `is_partner` (in `data/hubs.json` / the CMS) — a location can be a meeting spot (map pin), an organizing partner (Partner Organizations list), both, or neither field forced to match the other. Fermilab MakerSpace is `is_hub: false, is_partner: true` (partner only, no map pin).
- **Workshops moved from `/admin`-edited JSON to a Google Form/Sheet** (this session's main change) — one row per workshop, date decides upcoming vs. archived, no more manually copying data between a schedule file and an archive file. The 18 hand-migrated legacy archive entries from the original Google Sites import were retired in favor of this — the archive is now 100% sheet-driven, per explicit instruction.
- Missing emoji (blank cell, or a synthesized season-date placeholder) always falls back to 🧩.
- Archive resource-card layout stayed compact-grid-plus-modal (not redesigned into fuller inline cards) — modal just grew a second material list.
