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

## 2. Set up Show & Tell photo submissions

1. **Create a Google Form** with three questions: *Name* (short answer), *Caption* (short answer), *Photo* (file upload — this requires the respondent to be signed in to a Google account).
2. Open the Form's **Responses → linked Sheet**. This is the raw response sheet — leave it alone except for step 3.
3. Add a column called **Approved** (a checkbox or plain TRUE/FALSE) at the end. This is where you moderate — check it for any photo you're OK showing publicly.
4. Add a **second tab** to the spreadsheet (bottom tab bar → `+`), call it `Public`, and put this formula in cell A1 (adjust the sheet name `Form Responses 1` and column letters `A:F` to match your actual raw sheet):
   ```
   =QUERY('Form Responses 1'!A:F, "SELECT A, B, C, D WHERE F = TRUE LABEL A 'Timestamp', B 'Name', C 'Caption', D 'Photo'", 1)
   ```
   This tab now shows *only* the rows you've checked Approved, and only the columns needed for the site — no email addresses or unapproved submissions ever leave the raw sheet.
5. **Publish only the `Public` tab**: File → Share → Publish to web → choose the `Public` sheet (not "Entire document") → CSV → Publish. Copy the resulting URL.
6. In this GitHub repo: **Settings → Secrets and variables → Actions → Variables → New repository variable**, name it `SHOWCASE_CSV_URL`, and paste the URL.
7. **Share the Form's upload folder publicly (view-only)**: open the Form → Responses → the folder icon (or find "Teacher Studio (File responses)" in your Drive) → Share → change to "Anyone with the link" → **Viewer**. Without this step, uploaded photos won't display on the site.
8. Edit `show_tell_form_url` in `/admin` (Site Content → About Text & Misc Settings) to your new Form's URL.

The sync runs automatically every 30 minutes (`.github/workflows/sync-showcase.yml`), or trigger it immediately from the repo's **Actions** tab → "Sync Show & Tell photos" → **Run workflow**.

## 3. Monthly update (the whole point of this)

Go to `https://uw-pkir.github.io/teacher-studio/admin/`, click **Next Workshop (the monthly header)**, update the title/date/time/description, and hit **Publish**. The live site updates within a minute or two — no code, no git.
