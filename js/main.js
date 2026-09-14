// Teacher Studio Website JavaScript
// Content sections are loaded at runtime from the JSON files in /data — those
// files are what organizers edit via /admin (Decap CMS). This script only
// renders whatever is in them.

document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHeroLogo();
    randomizeFlourishes();
    loadAndRenderAll();

    const showcaseShuffleBtn = document.getElementById('showcase-shuffle');
    if (showcaseShuffleBtn) showcaseShuffleBtn.addEventListener('click', renderShowcaseSample);
});

// All quilt-patch flourish variants -- also used as the random fallback
// icon (renderIcon) when a workshop has no emoji of its own. Each entry's
// `color` is that specific SVG's first fill (the two-color diagonal
// patches use one of their two colors; the four solid-square patches use
// their only color) -- kept in sync with the actual files by hand, since
// there's no way to read an SVG's fill from a plain <img src>. Used to
// give a hub's map pin the same color as whichever flourish its card
// happens to get (see renderHubs), not just the icon list below.
const FLOURISH_VARIANTS = [
    { src: 'images/quilt-flourish.svg', color: '#fb923c' },
    { src: 'images/quilt-flourish-2.svg', color: '#6366f1' },
    { src: 'images/quilt-flourish-3.svg', color: '#f472b6' },
    { src: 'images/quilt-flourish-4.svg', color: '#22d3d3' },
    { src: 'images/quilt-flourish-5.svg', color: '#fb923c' },
    { src: 'images/quilt-flourish-6.svg', color: '#6366f1' },
    { src: 'images/quilt-flourish-7.svg', color: '#fb923c' },
    { src: 'images/quilt-flourish-8.svg', color: '#6366f1' },
    { src: 'images/quilt-flourish-9.svg', color: '#f472b6' },
    { src: 'images/quilt-flourish-10.svg', color: '#22d3d3' }
];
const FLOURISH_ICONS = FLOURISH_VARIANTS.map(v => v.src);

function randomFlourish() {
    return FLOURISH_ICONS[Math.floor(Math.random() * FLOURISH_ICONS.length)];
}

// Fixed, non-random flourish per hub, so a card's icon and its map pin
// always match (see renderHubs) *and* two hubs don't end up with the same
// color by chance the way a random pick occasionally did. Indices 6-9 are
// the four solid-color swatches -- deliberately assigned one each so all
// four current hubs are visually distinct at a glance.
const HUB_FLOURISH_BY_NAME = {
    'Appleton Public Library': 6,       // quilt-flourish-7.svg -- solid orange
    'Fablab @ Henderson Elementary': 8, // quilt-flourish-9.svg -- solid pink
    'Wayne RESA': 7,                    // quilt-flourish-8.svg -- solid indigo
    'Online': 9                         // quilt-flourish-10.svg -- solid teal/aqua
};

// A hub added later that isn't in the list above still gets a fixed (not
// random) variant, derived from its own name so it's stable across page
// loads without needing a code change for every new hub -- add a name
// above instead if a specific color is wanted for it.
function flourishVariantForHub(name) {
    if (Object.prototype.hasOwnProperty.call(HUB_FLOURISH_BY_NAME, name)) {
        return FLOURISH_VARIANTS[HUB_FLOURISH_BY_NAME[name]];
    }
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return FLOURISH_VARIANTS[Math.abs(hash) % FLOURISH_VARIANTS.length];
}

// Gives each section-tag pill a different quilt-patch flourish instead of
// always the same one.
function randomizeFlourishes() {
    document.querySelectorAll('.section-tag').forEach(tag => {
        const img = document.createElement('img');
        img.className = 'icon-flourish';
        img.src = randomFlourish();
        img.alt = '';
        tag.prepend(img);
    });
}

// A workshop's icon is usually a real emoji, but the sync script fills in
// 🧩 when none was given -- swap that specific case for a random quilt
// flourish image instead of the plain puzzle-piece character.
function renderIcon(icon) {
    if (icon === '🧩' || !icon) {
        return `<img class="icon-flourish" src="${randomFlourish()}" alt="">`;
    }
    // The adjacent title always conveys the same thing, so hide the emoji
    // itself from screen readers instead of announcing its Unicode name.
    return `<span aria-hidden="true">${escapeHTML(icon)}</span>`;
}

// ===== Navigation =====
function initNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle) {
        navToggle.addEventListener('click', function () {
            const isOpen = navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', function (e) {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    });

    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function () {
        navbar.style.boxShadow = window.scrollY > 50 ? '0 2px 20px rgba(0, 0, 0, 0.1)' : 'none';
    });
}

// ===== Interactive hero quilt block =====
// Starts as a big rendering of the logo; each of the 16 tiles reshuffles to
// a fresh random pattern (solid, or a two-color split) on click.
const QUILT_PALETTE = ['#fb923c', '#6366f1', '#f472b6', '#22d3d3'];

function randomQuiltColor() {
    return QUILT_PALETTE[Math.floor(Math.random() * QUILT_PALETTE.length)];
}

// Set the moment anyone manually clicks a tile -- see scheduleAmbientFlip.
let ambientFlipStopped = false;

function initHeroLogo() {
    const grid = document.getElementById('hero-logo-grid');
    if (!grid) return;

    // The coin-flip is a small, brief, click-only effect -- not ambient or
    // autoplaying motion -- so it stays on for everyone, including anyone
    // with "reduce motion" set at the OS/browser level (that setting turns
    // out to be common on managed/performance-tuned machines and Remote
    // Desktop sessions, not just genuine motion sensitivity). The CSS's
    // prefers-reduced-motion rule carves out an exception for exactly this
    // animation -- see .hero-tile.is-flipping in css/style.css.
    const [orange, purple, pink, teal] = QUILT_PALETTE;
    const split = (a, b, angle) => `linear-gradient(${angle || 135}deg, ${a} 50%, ${b} 50%)`;
    const initial = [
        orange, purple, pink, orange,
        split(orange, pink), pink, split(pink, teal), teal,
        purple, teal, teal, pink,
        split(purple, orange), orange, split(teal, purple), purple
    ];

    initial.forEach((background, index) => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'hero-tile';
        tile.style.background = background;
        tile.setAttribute('aria-label', `Shuffle quilt square ${index + 1}`);
        tile.addEventListener('click', () => {
            // A manual click is treated as the pause control for the ambient
            // auto-flip below (WCAG 2.2.2) -- once someone's found the
            // interaction, the ambient hint has done its job.
            ambientFlipStopped = true;
            flipTile(tile);
        });
        grid.appendChild(tile);
    });

    // Flips one random tile on its own every 5-10s, so the block feels
    // alive before anyone clicks anything. Unlike the click-triggered flip
    // above, this *is* autoplaying/ambient motion -- exactly what reduced
    // motion is meant to suppress -- so it's skipped entirely for anyone
    // with that setting on, rather than exempted like the click case.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scheduleAmbientFlip(grid);
    }
}

function scheduleAmbientFlip(grid) {
    if (ambientFlipStopped) return;
    const delay = 5000 + Math.random() * 5000;
    setTimeout(() => {
        if (ambientFlipStopped) return;
        const tiles = grid.querySelectorAll('.hero-tile');
        if (tiles.length) flipTile(tiles[Math.floor(Math.random() * tiles.length)]);
        scheduleAmbientFlip(grid);
    }, delay);
}

function randomQuiltFill() {
    const pick = () => QUILT_PALETTE[Math.floor(Math.random() * QUILT_PALETTE.length)];
    if (Math.random() < 0.5) return pick();

    const a = pick();
    let b = pick();
    while (b === a) b = pick();
    const angle = [45, 135, 225, 315][Math.floor(Math.random() * 4)];
    return `linear-gradient(${angle}deg, ${a} 50%, ${b} 50%)`;
}

function flipTile(tile) {
    if (tile.classList.contains('is-flipping')) return;
    tile.classList.add('is-flipping');
    setTimeout(() => { tile.style.background = randomQuiltFill(); }, 250);
    tile.addEventListener('animationend', () => tile.classList.remove('is-flipping'), { once: true });
}

// ===== Fade-in-on-scroll (applied to any card, including ones added after load) =====
const fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

function observeFadeIn(container, selector) {
    const items = container.querySelectorAll(selector);
    items.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        el.style.transitionDelay = `${Math.min(index, 10) * 0.08}s`;
        fadeObserver.observe(el);
    });
}

const animateInStyle = document.createElement('style');
animateInStyle.textContent = `.animate-in { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(animateInStyle);

// Each section's data is edited independently (CMS, sync bots, or a
// hand-typed CMS field with something unexpected in it), so one section's
// render throwing shouldn't take every section after it down with it. A
// real incident -- a hub with no coordinates crashing the Leaflet marker
// code -- took out Organizers, Partners, and Show & Tell site-wide with
// no visible error to anyone, simply because they render after Hubs in
// the list below. This wrapper is the fix for that class of bug, not
// just the one trigger that happened to cause it.
function safeRender(name, fn) {
    try {
        fn();
    } catch (err) {
        console.error(`Failed to render ${name}:`, err);
    }
}

// ===== Data loading =====
async function loadJSON(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
}

async function loadAndRenderAll() {
    const [workshops, hubs, organizersData, settings, showcase, sectionText] = await Promise.all([
        loadJSON('data/workshops.json').catch(() => []),
        loadJSON('data/hubs.json').then(d => d.hubs || []).catch(() => []),
        loadJSON('data/organizers.json').catch(() => ({})),
        loadJSON('data/site-settings.json').catch(() => ({})),
        loadJSON('data/showcase.json').catch(() => []),
        loadJSON('data/section-text.json').catch(() => ({}))
    ]);

    // A workshop's date vs. today is the only thing that decides whether
    // it's "next"/upcoming or archived — there's no separate flag for it.
    const todayISO = new Date().toISOString().slice(0, 10);
    const upcoming = workshops.filter(w => w.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date));
    const archive = workshops.filter(w => w.date < todayISO).sort((a, b) => b.date.localeCompare(a.date));

    safeRender('section text', () => renderSectionText(sectionText, settings));
    safeRender('next event', () => renderNextEvent(upcoming[0] || null, settings));
    safeRender('event structured data', () => renderEventStructuredData(upcoming[0] || null, settings, hubs));
    safeRender('schedule', () => renderSchedule(upcoming));
    safeRender('resources', () => renderResources(archive));
    safeRender('hubs', () => renderHubs(hubs, upcoming[0] || null, settings));
    safeRender('team', () => renderTeam(organizersData.organizers || [], organizersData.emeriti || []));
    safeRender('partners', () => renderPartners(hubs));
    safeRender('showcase', () => renderShowcase(showcase));
    safeRender('about features', () => renderAboutFeatures((sectionText.about || {}).features));

    safeRender('show & tell form link', () => {
        if (settings.show_tell_form_url && isSafeHref(settings.show_tell_form_url)) {
            document.getElementById('show-tell-form-link').href = settings.show_tell_form_url;
        }
    });
}

// Each section's headline + description text -- editable via /admin
// (Update Section Text) instead of being hardcoded here. The schedule
// section's description carries a "{{time}}" token that gets swapped for
// the workshop time from Misc Settings, matching how it's phrased
// elsewhere (nothing shown at all if no time is set).
function renderSectionText(sectionText, settings) {
    const timeStr = settings.workshop_time ? `, ${settings.workshop_time}` : '';
    const sections = {
        hero: sectionText.hero,
        about: sectionText.about,
        schedule: sectionText.schedule,
        resources: sectionText.resources,
        hubs: sectionText.hubs,
        team: sectionText.team,
        gallery: sectionText.gallery
    };

    Object.entries(sections).forEach(([key, text]) => {
        if (!text) return;
        const headlineEl = document.getElementById(`${key}-headline`);
        const descriptionEl = document.getElementById(`${key}-description`);
        if (headlineEl && text.headline) {
            // Only the hero headline supports *word* -> highlighted <span>;
            // every other section's headline is plain text.
            if (key === 'hero') {
                headlineEl.innerHTML = renderHighlightedText(text.headline);
            } else {
                headlineEl.textContent = text.headline;
            }
        }
        if (descriptionEl && text.description) {
            descriptionEl.textContent = text.description.replace('{{time}}', timeStr);
        }
    });

    // A handful of one-off fields that don't fit the generic
    // headline/description pattern above.
    const gallery = sectionText.gallery || {};
    setTextIfPresent('hero-cta-primary', (sectionText.hero || {}).cta_primary_label);
    setTextIfPresent('hero-cta-secondary', (sectionText.hero || {}).cta_secondary_label);
    setTextIfPresent('gallery-submit-intro', gallery.submit_intro);
    // Show & Tell's other extra field: a note above the Submit a Project
    // button (e.g. flagging the Google sign-in the linked form requires).
    const submitNoteEl = document.getElementById('gallery-submit-note');
    if (submitNoteEl) submitNoteEl.textContent = gallery.submit_note || '';

    const footer = sectionText.footer || {};
    setTextIfPresent('footer-tagline', footer.tagline);
    if (footer.contact_email) {
        const contactLink = document.getElementById('footer-contact-link');
        if (contactLink) contactLink.href = escapeHref(`mailto:${footer.contact_email}`);
    }
}

// Sets an element's text only when both the element exists and there's
// actual text to put in it -- otherwise leaves whatever's already there
// (the hardcoded fallback text in index.html) rather than blanking it out.
function setTextIfPresent(id, text) {
    if (!text) return;
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Wraps *word* in a <span class="highlight"> -- the only place on the site
// that needs inline word-level styling within an otherwise plain heading.
function renderHighlightedText(text) {
    return escapeHTML(text).replace(/\*(.+?)\*/g, '<span class="highlight">$1</span>');
}

// The 3 icon/title/description rows under the About paragraph -- editable
// via /admin (Update Section Text -> About Us) like the rest of this
// section, rather than being hardcoded in index.html.
function renderAboutFeatures(features) {
    const container = document.getElementById('about-features');
    if (!container || !features || !features.length) return;

    container.innerHTML = features.map(f => `
        <div class="feature">
            <span class="feature-icon" aria-hidden="true">${escapeHTML(f.icon)}</span>
            <div>
                <h3>${escapeHTML(f.title)}</h3>
                <p>${escapeHTML(f.description)}</p>
            </div>
        </div>
    `).join('');
}

// Turns "a, b, c" into ["a", "b", "c"] rendered as <li> items.
function renderBullets(items) {
    return (items || []).map(m => `<li>${escapeHTML(m)}</li>`).join('');
}

// Parses a "YYYY-MM-DD" string as a local date (avoids UTC off-by-one).
function parseLocalDate(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatLongDate(isoDate) {
    return parseLocalDate(isoDate).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
}

// ===== Next Event spotlight =====
function renderNextEvent(event, settings) {
    const mount = document.getElementById('next-event-mount');
    const registerUrl = settings.register_url || '#';
    const locationNote = settings.location_note || '';

    if (!event) {
        mount.innerHTML = `
            <div class="next-event-info">
                <span class="section-tag">Next Workshop</span>
                <h2>Information coming soon</h2>
                <p class="next-event-description">We're finalizing the schedule for our next gathering &mdash; check back soon, or register below to be notified.</p>
                <a href="${escapeHref(registerUrl)}" target="_blank" class="btn btn-primary btn-large">
                    Register
                    <span class="sr-only"> (opens in a new tab)</span>
                    <span class="btn-icon" aria-hidden="true">→</span>
                </a>
                <p class="next-event-location">${escapeHTML(locationNote)}</p>
            </div>
        `;
        return;
    }

    mount.innerHTML = `
        <div class="next-event-info">
            <span class="section-tag">Next Workshop</span>
            <h2>${renderIcon(event.icon)} ${escapeHTML(event.title)}</h2>
            <p class="next-event-when"><strong>When:</strong> ${formatLongDate(event.date)}, ${escapeHTML(settings.workshop_time || '')}</p>
            <p class="next-event-description">${escapeHTML(event.description)}</p>
            ${renderMaterialsBlock(event, 'next-event-materials')}
            <a href="${escapeHref(registerUrl)}" target="_blank" class="btn btn-primary btn-large">
                Register for ${parseLocalDate(event.date).toLocaleDateString('en-US', { month: 'long' })}
                <span class="sr-only"> (opens in a new tab)</span>
                <span class="btn-icon" aria-hidden="true">→</span>
            </a>
            <p class="next-event-location">${escapeHTML(locationNote)}</p>
        </div>
    `;
}

// ===== Structured data (schema.org Event) for the Next Workshop =====
// Search engines execute page JS before reading structured data, so this
// mirrors whatever the spotlight above shows instead of needing a second,
// hand-maintained copy of the same info in index.html.
const TZ_OFFSETS = {
    EST: '-05:00', EDT: '-04:00', ET: '-05:00',
    CST: '-06:00', CDT: '-05:00', CT: '-06:00',
    MST: '-07:00', MDT: '-06:00', MT: '-07:00',
    PST: '-08:00', PDT: '-07:00', PT: '-08:00'
};

// Best-effort: pulls a start time + timezone out of a free-text string
// like "4:30-5:30 PM CST" (Settings -> General Settings -> Workshop time).
// That field is meant for a human to read first, so a wording change
// shouldn't be able to break anything -- returns null on no match, and
// callers fall back to a date-only startDate, which schema.org also
// accepts.
function parseStartTime(workshopTime) {
    const m = (workshopTime || '').match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*\d{1,2}(?::\d{2})?\s*(AM|PM)\s*([A-Z]{2,3})?/i);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = m[2] || '00';
    const period = m[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    const tz = m[4] ? TZ_OFFSETS[m[4].toUpperCase()] : null;
    const hh = String(hour).padStart(2, '0');
    return tz ? `${hh}:${minute}:00${tz}` : `${hh}:${minute}:00`;
}

function renderEventStructuredData(event, settings, hubs) {
    const existing = document.getElementById('event-structured-data');
    // Nothing to emit when there's no upcoming workshop, or the nearest
    // one is just a placeholder with no real topic decided yet (every
    // placeholder from sync-workshops.js has an empty description, unlike
    // a real submitted workshop) -- a placeholder isn't a real event
    // worth a search engine indexing.
    if (!event || !event.description) {
        if (existing) existing.remove();
        return;
    }

    const siteUrl = 'https://teacherstudio.org/';
    const physicalHubs = (hubs || []).filter(h => h.is_hub !== false);
    const startTime = parseStartTime(settings.workshop_time);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        startDate: startTime ? `${event.date}T${startTime}` : event.date,
        eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        description: event.description,
        location: [
            ...physicalHubs.map(h => ({ '@type': 'Place', name: h.name, address: h.location })),
            { '@type': 'VirtualLocation', url: siteUrl }
        ],
        organizer: { '@type': 'Organization', name: 'Teacher Studio', url: siteUrl },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: siteUrl },
        image: `${siteUrl}brand/teacher-studio-logo.png`,
        url: siteUrl
    };

    const script = existing || document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'event-structured-data';
    script.textContent = JSON.stringify(jsonLd);
    if (!existing) document.head.appendChild(script);
}

// Single source of truth for these two labels, used by both the spotlight
// card and the resource archive, so there's only one place to edit if the
// wording should ever change.
const REQUIRED_MATERIALS_LABEL = 'Required Materials';
const NICE_TO_HAVE_LABEL = 'Nice to Have';

// Shared by the spotlight and the resource-archive modal: two labeled
// bulleted lists built from comma-separated material strings.
// headingTag defaults to h3 (correct one level below the spotlight's own
// h2 workshop title); the resource archive passes h5 instead, since its
// workshop titles already sit two levels deeper (h2 Resource Archive >
// h3 school year > h4 workshop title -- see renderArchiveItem).
function renderMaterialsBlock(item, wrapperClass, headingTag = 'h3') {
    const hasRequired = item.required_materials && item.required_materials.length;
    const hasNice = item.nice_to_have_materials && item.nice_to_have_materials.length;
    if (!hasRequired && !hasNice) return '';
    return `
        <div class="${wrapperClass}">
            ${hasRequired ? `<div><${headingTag}>${REQUIRED_MATERIALS_LABEL}</${headingTag}><ul>${renderBullets(item.required_materials)}</ul></div>` : ''}
            ${hasNice ? `<div><${headingTag}>${NICE_TO_HAVE_LABEL}</${headingTag}><ul>${renderBullets(item.nice_to_have_materials)}</ul></div>` : ''}
        </div>
    `;
}

// ===== Workshop schedule: a condensed calendar of every upcoming date =====
// Full detail on whichever one is next already lives in the Next Workshop
// spotlight above, so this is intentionally just the dates.
function renderSchedule(upcoming) {
    const list = document.getElementById('schedule-dates');
    if (!upcoming.length) {
        list.innerHTML = '<p>Information coming soon.</p>';
        return;
    }

    list.innerHTML = upcoming.map((item, index) => {
        const itemDate = parseLocalDate(item.date);
        const month = itemDate.toLocaleDateString('en-US', { month: 'short' });
        const day = itemDate.getDate();
        const year = itemDate.getFullYear();

        return `
            <div class="schedule-date-chip c${index % 4}" title="${escapeAttr(item.title)}">
                <span class="month">${month}</span>
                <span class="day">${day}</span>
                <span class="year">${year}</span>
            </div>
        `;
    }).join('');

    observeFadeIn(list, '.schedule-date-chip');
}

// ===== Resources / past workshop archive =====
// Grouped by school year (Sept-May, matching the actual workshop season --
// see schoolYearLabel), newest first, as a two-level accordion -- only the
// year headers are always visible, so the always-on-screen list stays
// compact no matter how many workshops accumulate over time. The most
// recent school year starts open; every workshop inside it is browsable
// without re-rolling a random sample like the old shuffle-3-cards pattern
// did.
function renderResources(resources) {
    const container = document.getElementById('resources-accordion');
    if (!resources.length) {
        container.innerHTML = '<p>Resources coming soon.</p>';
        return;
    }

    // resources arrives already sorted newest-first (see loadAndRenderAll).
    // Grouping preserves that order within each school year too, since a
    // Map's key order follows first insertion and every workshop in a given
    // school year -- however scattered across that Sept-to-May span --
    // still gets collected under the one key for it.
    const byYear = new Map();
    resources.forEach(r => {
        const year = schoolYearLabel(parseLocalDate(r.date));
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push(r);
    });

    container.innerHTML = [...byYear.entries()].map(([year, items], index) => `
        <details class="archive-year" name="resource-archive-years"${index === 0 ? ' open' : ''}>
            <summary class="archive-year-summary">
                <span class="archive-year-label" role="heading" aria-level="3">${year}</span>
                <span class="archive-year-count">${items.length} workshop${items.length === 1 ? '' : 's'}</span>
                <span class="archive-chevron" aria-hidden="true"></span>
            </summary>
            <div class="archive-year-body">
                ${items.map(renderArchiveItem).join('')}
            </div>
        </details>
    `).join('');

    observeFadeIn(container, '.archive-item');
}

// Heading levels here nest under the school-year label above (role=heading
// aria-level=3): the workshop title is level 4, and its own Required
// Materials/Nice to Have/Shared Resources sub-headings are level 5 -- see
// renderMaterialsBlock's headingTag param and renderArchiveLinks below.
// role=heading + aria-level (rather than a real <h4> tag) is used for the
// title because it sits inside <summary> alongside the icon/date/chevron;
// a native heading element is only valid there if it's summary's *entire*
// content, which would mean dropping those. This still exposes the same
// heading semantics to screen readers.
function renderArchiveItem(r) {
    return `
        <details class="archive-item" name="resource-archive-item">
            <summary class="archive-summary">
                <span class="archive-icon">${renderIcon(r.icon)}</span>
                <span class="archive-summary-text">
                    <span class="archive-title" role="heading" aria-level="4">${escapeHTML(r.title)}</span>
                    <span class="archive-date">${escapeHTML(formatMediumDate(r.date))}</span>
                </span>
                <span class="archive-chevron" aria-hidden="true"></span>
            </summary>
            <div class="archive-body">
                ${r.description ? `<p class="archive-description">${escapeHTML(r.description)}</p>` : ''}
                ${renderMaterialsBlock(r, 'archive-materials', 'h5')}
                ${renderArchiveLinks(r.links)}
            </div>
        </details>
    `;
}

// Same link-list shape the old modal used, just rendered inline in each
// accordion row's body instead of a popup. h5 to match renderMaterialsBlock
// above -- see the nesting comment on renderArchiveItem.
function renderArchiveLinks(links) {
    if (!links || !links.length) return '';
    return `
        <div class="archive-links">
            <h5>Shared Resources</h5>
            <ul class="archive-links-list">
                ${links.map(l => `<li><a href="${escapeHref(l.url)}" target="_blank" rel="noopener">${escapeHTML(l.label)}<span class="sr-only"> (opens in a new tab)</span></a></li>`).join('')}
            </ul>
        </div>
    `;
}

// Sets a role="status" element's text so assistive tech announces it --
// clearing first forces the announcement even when the new text is
// identical to what was already there (e.g. shuffling always lands on 3).
function announceStatus(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    setTimeout(() => { el.textContent = text; }, 50);
}

// Fisher-Yates, then take the first n.
function sampleRandom(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

function formatMediumDate(isoDate) {
    return parseLocalDate(isoDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Workshops run on the school calendar, not the January-December one --
// a September 2025 workshop and a May 2026 one are the same season, so
// the resource archive groups by this instead of by calendar year.
// Anything in the Jun-Aug gap (no workshops happen then, but just in
// case) is counted as closing out the school year that started the
// previous September, rather than starting the next one.
function schoolYearLabel(date) {
    const calendarYear = date.getFullYear();
    const startYear = date.getMonth() >= 8 ? calendarYear : calendarYear - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endYearShort}`;
}

// ===== Hub sites map =====
function renderHubs(hubs, nextEvent, settings) {
    // An evergreen register button for anyone who reads this far down the
    // page without having registered from the Next Workshop spotlight above
    // -- same register_url and "Register for <Month>" pattern as that
    // spotlight, so it always points at whatever's actually next.
    const registerMount = document.getElementById('hubs-register-mount');
    if (registerMount) {
        const registerUrl = (settings && settings.register_url) || '#';
        const label = nextEvent
            ? `Register for ${parseLocalDate(nextEvent.date).toLocaleDateString('en-US', { month: 'long' })}`
            : 'Register';
        registerMount.innerHTML = `
            <a href="${escapeHref(registerUrl)}" target="_blank" class="btn btn-primary">
                ${label}
                <span class="sr-only"> (opens in a new tab)</span>
                <span class="btn-icon" aria-hidden="true">→</span>
            </a>
        `;
    }

    const mapContainer = document.getElementById('hubs-map');
    // "Hub" and "Partner" are independent flags -- some entries are only a
    // meeting location (a hub with no organizing-partner role), some are
    // only an organizing partner (no map pin), and some are both. A hub can
    // also be virtual-only (e.g. an "Online" entry) -- no address, so no
    // lat/lng and nothing to place a map pin at. Those still belong in the
    // text list, just sorted after the ones with a real pin instead of
    // slotting alphabetically among them, and they're kept out of the
    // Leaflet marker loop below entirely -- L.marker() throws on missing/
    // NaN coordinates, which would otherwise take out every remaining
    // render call this function's caller makes (Organizers, Partners,
    // Show & Tell all render after this one).
    const hasMapPin = hub => typeof hub.lat === 'number' && typeof hub.lng === 'number' && !isNaN(hub.lat) && !isNaN(hub.lng);
    const byName = (a, b) => a.name.localeCompare(b.name);
    const listedHubs = hubs.filter(hub => hub.is_hub !== false);
    const physicalHubs = listedHubs.filter(hasMapPin).sort(byName);
    const virtualHubs = listedHubs.filter(hub => !hasMapPin(hub)).sort(byName);
    const orderedHubs = [...physicalHubs, ...virtualHubs];

    // Text equivalent of the map, for screen-reader/keyboard users and
    // anyone whose browser can't or won't load Leaflet/the map tiles.
    const list = document.getElementById('hubs-list');
    if (list) {
        list.innerHTML = orderedHubs.map(hub => `
            <li class="hub-list-item">
                <img class="hub-list-icon" src="${flourishVariantForHub(hub.name).src}" alt="">
                <div class="hub-list-body">
                    <h3>${escapeHTML(hub.name)}</h3>
                    ${hub.location ? `<span class="hub-list-location">${escapeHTML(hub.location)}</span>` : ''}
                </div>
            </li>
        `).join('');
    }

    if (!mapContainer || typeof L === 'undefined' || !physicalHubs.length) return;

    const map = L.map('hubs-map', { scrollWheelZoom: false }).setView([42.5, -87.5], 6);

    // Esri's free "Light Gray Base" tiles — no API key required, unlike
    // Carto's basemaps which now show an "API key required" watermark.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);

    // A plain, standard-shaped map pin (not a quilt patch -- an abstract
    // geometric square doesn't read as a location marker), colored to
    // match that same hub's card icon (see flourishVariantForHub above)
    // rather than one fixed color for every pin.
    const pinSvg = color => `<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
        <circle cx="12" cy="12" r="5" fill="#ffffff"/>
    </svg>`;

    const createCustomIcon = color => L.divIcon({
        className: 'custom-marker-container',
        html: `<div class="custom-hub-marker">${pinSvg(color)}</div>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34]
    });

    const markers = physicalHubs.map(hub => {
        const marker = L.marker([hub.lat, hub.lng], { icon: createCustomIcon(flourishVariantForHub(hub.name).color) }).addTo(map);
        marker.bindPopup(`
            <div class="hub-popup">
                <h3>${escapeHTML(hub.name)}</h3>
                <span class="hub-popup-location">${escapeHTML(hub.location)}</span>
            </div>
        `, { maxWidth: 300, className: 'hub-popup-wrapper' });
        return marker;
    });

    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));

    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
}

function renderPartners(hubs) {
    const list = document.getElementById('partners-list');
    list.innerHTML = hubs.filter(h => h.is_partner !== false)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(h => `
            <a href="${escapeHref(h.website)}" target="_blank" rel="noopener">
                <img class="partner-icon" src="${randomFlourish()}" alt="">
                ${escapeHTML(h.name)}
                <span class="sr-only"> (opens in a new tab)</span>
            </a>
        `)
        .join('');
}

// ===== Team =====
function renderTeam(organizers, emeriti) {
    const grid = document.getElementById('team-grid');
    const sorted = [...organizers].sort((a, b) =>
        (a.name || '').split(' ')[0].localeCompare((b.name || '').split(' ')[0])
    );
    grid.innerHTML = sorted.map(person => `
        <div class="team-card">
            <img class="team-avatar-img" src="${escapeAttr(person.photo)}" alt="${escapeAttr(person.name)}">
            <h3>${escapeHTML(person.name)}</h3>
            <p class="team-org">${escapeHTML(person.org)}</p>
        </div>
    `).join('');
    observeFadeIn(grid, '.team-card');

    const emeritiList = document.getElementById('emeriti-list');
    emeritiList.innerHTML = (emeriti || []).map(name => `<span>${escapeHTML(name)}</span>`).join('');
}

// ===== Show & Tell =====
// Shows 3 random cards from all approved submissions at a time, same
// sample-and-shuffle pattern as the resource archive above.
const SHOWCASE_SAMPLE_SIZE = 3;
let showcaseSubmissions = [];

function renderShowcase(items) {
    showcaseSubmissions = items || [];
    const shuffleBtn = document.getElementById('showcase-shuffle');
    if (shuffleBtn) shuffleBtn.style.display = showcaseSubmissions.length > SHOWCASE_SAMPLE_SIZE ? '' : 'none';
    renderShowcaseSample();
}

function renderShowcaseSample() {
    const grid = document.getElementById('showcase-grid');
    if (!showcaseSubmissions.length) {
        grid.innerHTML = `
            <div class="gallery-placeholder">
                <span>✨</span>
                <p>Your photo here!</p>
            </div>
        `;
        return;
    }

    const sample = sampleRandom(showcaseSubmissions, Math.min(SHOWCASE_SAMPLE_SIZE, showcaseSubmissions.length));

    grid.innerHTML = sample.map(item => `
        <figure class="showcase-card">
            <img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.title || item.caption || 'Teacher Studio creation')}" loading="lazy" style="background-color: ${randomQuiltColor()};">
            <figcaption>
                ${item.title ? `<h3>${escapeHTML(item.title)}</h3>` : ''}
                ${item.caption ? `<p>${escapeHTML(item.caption)}</p>` : ''}
                ${item.maker ? `<span class="showcase-maker">by ${escapeHTML(item.maker)}</span>` : ''}
            </figcaption>
        </figure>
    `).join('');

    // Bound via addEventListener rather than an inline onerror="" attribute
    // -- the CSP's script-src has no 'unsafe-inline', so an inline handler
    // attribute would just be silently blocked.
    grid.querySelectorAll('.showcase-card img').forEach(img => {
        img.addEventListener('error', () => handleShowcaseImageError(img), { once: true });
    });

    observeFadeIn(grid, '.showcase-card');
    announceStatus('showcase-shuffle-status', `Showing ${sample.length} new photos.`);
}

// If a Show & Tell photo's Google Drive link is broken (file deleted, or
// its sharing permission reverted to private after approval) the browser's
// default broken-image glyph would otherwise show -- swap in a dimmed
// quilt flourish instead, so it reads as "no photo" rather than "error".
// The caption/maker/title in the same card is still real content worth
// showing even when the photo itself isn't available. The alt text is
// updated too, not just the image -- otherwise a screen reader would
// still announce the original photo's title as if it had loaded fine,
// while sighted visitors clearly see a plain placeholder icon instead.
function handleShowcaseImageError(img) {
    const original = img.alt;
    img.src = randomFlourish();
    img.alt = original ? `Photo unavailable for "${original}"` : 'Photo unavailable';
    img.classList.add('showcase-image-broken');
}

// ===== Small helpers =====
function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function escapeAttr(str) {
    return escapeHTML(str);
}

// Rejects anything but a fully-qualified http(s)/mailto URL -- blocks a
// "javascript:" or "data:" URI from ever becoming a live link, whether
// it's set via an HTML string or a direct .href property assignment (the
// latter skips HTML-escaping entirely, but a bad scheme works either way).
// No relative URLs are expected here (every field this feeds is meant to
// be a full external link), so a bare New URL(url) with no base -- rather
// than resolving oddball input against the current page -- is deliberate.
function isSafeHref(url) {
    try {
        const protocol = new URL(url).protocol;
        return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
    } catch {
        return false;
    }
}

// For href values built into an HTML string -- combines the scheme check
// above with HTML-escaping. Applied to every dynamic href on the site,
// not just ones sourced from the public workshop-entry form, since
// defense-in-depth here is cheap and a CMS field could be wrong too.
function escapeHref(url) {
    return isSafeHref(url) ? escapeAttr(url) : '#';
}

// Easter egg: press "c" for confetti!
document.addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            createConfetti();
        }
    }
});

function createConfetti() {
    const colors = ['#6366f1', '#f472b6', '#fbbf24', '#34d399', '#fb923c'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw;
            top: -10px;
            opacity: ${Math.random()};
            transform: rotate(${Math.random() * 360}deg);
            animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
            z-index: 9999;
            pointer-events: none;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
    }
}

const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confetti-fall {
        to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
`;
document.head.appendChild(confettiStyle);
