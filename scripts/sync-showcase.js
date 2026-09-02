// Fetches the published "Public" tab of the Show & Tell response sheet (a
// plain CSV URL, no auth) and rewrites data/showcase.json from it.
// Run by .github/workflows/sync-showcase.yml — see ../SETUP.md for how the
// sheet itself is set up so only moderator-approved rows ever reach this script.
//
// The CSV URL itself lives in data/site-settings.json (show_tell_csv_url)
// rather than a GitHub secret/variable, so it's editable from /admin like
// everything else — no GitHub Settings access needed.

const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'site-settings.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'showcase.json');
const CSV_URL = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')).show_tell_csv_url;

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else { inQuotes = false; }
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(field); field = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(v => v !== '')) rows.push(row);
            row = [];
        } else {
            field += c;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

function extractDriveFileId(url) {
    if (!url) return null;
    const patterns = [/\/d\/([-\w]{10,})/, /[?&]id=([-\w]{10,})/];
    for (const re of patterns) {
        const m = url.match(re);
        if (m) return m[1];
    }
    return null;
}

async function main() {
    if (!CSV_URL) {
        console.log('show_tell_csv_url is not set yet in data/site-settings.json (see SETUP.md). Leaving data/showcase.json unchanged.');
        return;
    }

    const res = await fetch(CSV_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch published sheet CSV: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) {
        console.log('Published sheet is empty. Leaving data/showcase.json unchanged.');
        return;
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const col = (name) => header.indexOf(name);
    const iTimestamp = col('timestamp');
    const iName = col('name');
    const iCaption = col('caption');
    const iPhoto = col('photo');

    if (iName === -1 || iCaption === -1 || iPhoto === -1) {
        throw new Error(`Published sheet is missing expected columns (Name, Caption, Photo). Found: ${header.join(', ')}`);
    }

    const items = rows.slice(1)
        .map(r => {
            const fileId = extractDriveFileId(r[iPhoto]);
            if (!fileId) return null;
            return {
                name: (r[iName] || '').trim(),
                caption: (r[iCaption] || '').trim(),
                image_url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
                _sortKey: iTimestamp !== -1 ? (r[iTimestamp] || '') : ''
            };
        })
        .filter(Boolean)
        .sort((a, b) => b._sortKey.localeCompare(a._sortKey))
        .map(({ _sortKey, ...rest }) => rest);

    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : '';
    const next = JSON.stringify(items, null, 2) + '\n';

    if (current.trim() === next.trim()) {
        console.log('No change in approved Show & Tell photos.');
        return;
    }

    fs.writeFileSync(OUTPUT_PATH, next);
    console.log(`Wrote ${items.length} approved photo(s) to data/showcase.json`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
