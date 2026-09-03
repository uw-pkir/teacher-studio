// Builds data/workshops.json from two published Google Sheets:
//   - workshops_tsv_url  (required): one row per workshop, via a Google Form.
//     Columns: Timestamp, Date of workshop, Title/Theme, Emoji,
//     Short description, Required materials, Nice to have materials,
//     Resource Link 1..5.
//   - season_dates_tsv_url (optional): a single "Date" column listing the
//     season's workshop dates, updated once a year. Any of these dates that
//     don't yet have a matching workshops-TSV row become a placeholder entry,
//     so the schedule grid always shows the full season.
// See ../SETUP.md for how both sheets are set up.
//
// A row's date vs. today (computed here in UTC) decides whether its resource
// links get resolved to page titles — only past rows ever display links, so
// only past rows pay for the fetches.

const fs = require('fs');
const path = require('path');
const { parseDelimited } = require('./lib/parse-delimited');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'site-settings.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'workshops.json');
const CACHE_PATH = path.join(__dirname, '..', 'data', 'link-title-cache.json');
const FALLBACK_ICON = '🧩';
const PLACEHOLDER_TITLE = 'Topic announced a few weeks before the gathering';

function parseUSDate(str) {
    const m = (str || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return null;
    const [, mo, da, yrRaw] = m;
    const yr = yrRaw.length === 2 ? `20${yrRaw}` : yrRaw;
    return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
}

function splitList(str) {
    return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}

function decodeHTMLEntities(str) {
    return str
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

// A scraped <title>/og:title is often useless on its own -- a cookie
// wall, a bot challenge, or just the site's name with no real content.
// Titles like that get replaced by a friendly, specific fallback below
// rather than showing up verbatim on the site.
function isJunkTitle(title) {
    const t = (title || '').trim();
    if (t.length < 3) return true;
    if (/^-?\s*(youtube|vimeo|instagram|tiktok|facebook|pinterest|google)\s*$/i.test(t)) return true;
    if (/^(sign in|log ?in|just a moment|attention required|please wait|access denied|forbidden|not found|error|untitled|are you a robot)/i.test(t)) return true;
    return false;
}

// A short, specific label naming what kind of resource this is, used
// when we can't get (or can't trust) a real page title.
function friendlyHostLabel(url) {
    let host = '';
    let pathname = '';
    try {
        const u = new URL(url);
        host = u.hostname.replace(/^www\./, '').toLowerCase();
        pathname = u.pathname;
    } catch {
        return url;
    }

    if (host === 'docs.google.com') {
        if (pathname.startsWith('/document')) return 'Google Doc';
        if (pathname.startsWith('/presentation')) return 'Google Slides';
        if (pathname.startsWith('/spreadsheets')) return 'Google Sheet';
        if (pathname.startsWith('/forms')) return 'Google Form';
        return 'Google Docs link';
    }

    const byHost = {
        'youtube.com': 'YouTube video', 'youtu.be': 'YouTube video', 'm.youtube.com': 'YouTube video',
        'vimeo.com': 'Vimeo video',
        'drive.google.com': 'Google Drive file',
        'instagram.com': 'Instagram post',
        'padlet.com': 'Padlet board',
        'canva.com': 'Canva design',
        'wakelet.com': 'Wakelet collection',
        'flickr.com': 'Flickr photo',
        'twitter.com': 'X (Twitter) post', 'x.com': 'X (Twitter) post',
        'facebook.com': 'Facebook post',
        'pinterest.com': 'Pinterest pin',
        'tiktok.com': 'TikTok video'
    };
    return byHost[host] || host || url;
}

// YouTube and Vimeo's normal page titles are frequently unusable (a
// cookie-consent interstitial, "- YouTube" with nothing else), but both
// sites expose the real video title via a public, unauthenticated oEmbed
// endpoint -- try that first for those two hosts.
async function fetchOEmbedTitle(url) {
    let host;
    try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
    catch { return ''; }

    let oembedUrl;
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
        oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (host === 'vimeo.com') {
        oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    } else {
        return '';
    }

    try {
        const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return '';
        const data = await res.json();
        return (data.title || '').trim();
    } catch {
        return '';
    }
}

async function resolveLinkTitle(url, cache) {
    if (cache[url]) return cache[url];

    let title = await fetchOEmbedTitle(url);

    if (!title) {
        try {
            const res = await fetch(url, {
                signal: AbortSignal.timeout(8000),
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TeacherStudioBot/1.0; +https://uw-pkir.github.io/teacher-studio/)' }
            });
            const html = await res.text();
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
            const pageTitle = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';
            const ogTitle = ogMatch ? decodeHTMLEntities(ogMatch[1].trim()) : '';

            if (!isJunkTitle(pageTitle)) title = pageTitle;
            else if (!isJunkTitle(ogTitle)) title = ogTitle;
        } catch {
            title = '';
        }
    }

    if (isJunkTitle(title)) {
        title = friendlyHostLabel(url);
    }

    cache[url] = title;
    return title;
}

async function fetchTSV(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return parseDelimited(await res.text(), '\t');
}

function colIndex(header, name) {
    return header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
}

async function main() {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    const workshopsUrl = settings.workshops_tsv_url;
    const seasonUrl = settings.season_dates_tsv_url;

    if (!workshopsUrl) {
        console.log('workshops_tsv_url is not set yet in data/site-settings.json. Leaving data/workshops.json unchanged.');
        return;
    }

    const todayISO = new Date().toISOString().slice(0, 10);

    // ----- Parse the workshops TSV -----
    const rows = await fetchTSV(workshopsUrl);
    const header = rows[0];
    const iTimestamp = colIndex(header, 'Timestamp');
    const iDate = colIndex(header, 'Date of workshop');
    const iTitle = colIndex(header, 'Title/Theme');
    const iEmoji = colIndex(header, 'Emoji');
    const iDesc = colIndex(header, 'Short description');
    const iReq = colIndex(header, 'Required materials');
    const iNice = colIndex(header, 'Nice to have materials');
    const linkCols = [1, 2, 3, 4, 5]
        .map(n => colIndex(header, `Resource Link ${n}`))
        .filter(i => i !== -1);

    if (iDate === -1 || iTitle === -1) {
        throw new Error(`Workshops sheet is missing expected columns. Found: ${header.join(', ')}`);
    }

    // Dedupe by date, keeping the latest Timestamp per date.
    const byDate = new Map();
    for (const r of rows.slice(1)) {
        const date = parseUSDate(r[iDate]);
        if (!date) continue;
        const ts = iTimestamp !== -1 ? new Date(r[iTimestamp]).getTime() : 0;
        const existing = byDate.get(date);
        if (existing && existing._ts >= ts) continue;

        byDate.set(date, {
            date,
            icon: (r[iEmoji] || '').trim() || FALLBACK_ICON,
            title: (r[iTitle] || '').trim(),
            description: (r[iDesc] || '').trim(),
            required_materials: splitList(r[iReq]),
            nice_to_have_materials: splitList(r[iNice]),
            _linkUrls: linkCols.map(i => (r[i] || '').trim()).filter(Boolean),
            _ts: ts
        });
    }

    // ----- Fill in the rest of the season with placeholders -----
    if (seasonUrl) {
        try {
            const seasonRows = await fetchTSV(seasonUrl);
            // Just one column of dates -- always column 0, regardless of
            // what its header happens to be worded ("Date", "Dates", ...).
            for (const r of seasonRows.slice(1)) {
                const date = parseUSDate(r[0]);
                if (!date || date < todayISO || byDate.has(date)) continue;
                byDate.set(date, {
                    date,
                    icon: FALLBACK_ICON,
                    title: PLACEHOLDER_TITLE,
                    description: '',
                    required_materials: [],
                    nice_to_have_materials: [],
                    _linkUrls: [],
                    _ts: 0
                });
            }
        } catch (err) {
            console.warn(`Could not read season_dates_tsv_url, skipping: ${err.message}`);
        }
    }

    // ----- Resolve link titles for past entries only -----
    const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

    for (const entry of byDate.values()) {
        if (entry.date < todayISO && entry._linkUrls.length) {
            entry.links = [];
            for (const url of entry._linkUrls) {
                entry.links.push({ label: await resolveLinkTitle(url, cache), url });
            }
        } else {
            entry.links = [];
        }
        delete entry._linkUrls;
        delete entry._ts;
    }

    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');

    // ----- Write output -----
    const items = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : '';
    const next = JSON.stringify(items, null, 2) + '\n';

    if (current.trim() === next.trim()) {
        console.log('No change in workshops.');
    } else {
        fs.writeFileSync(OUTPUT_PATH, next);
        console.log(`Wrote ${items.length} workshop(s) to data/workshops.json`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
