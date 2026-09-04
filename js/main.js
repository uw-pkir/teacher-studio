// Teacher Studio Website JavaScript
// Content sections are loaded at runtime from the JSON files in /data — those
// files are what organizers edit via /admin (Decap CMS). This script only
// renders whatever is in them.

document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initModal();
    initHeroLogo();
    randomizeFlourishes();
    loadAndRenderAll();

    const shuffleBtn = document.getElementById('resources-shuffle');
    if (shuffleBtn) shuffleBtn.addEventListener('click', renderResourceSample);

    const showcaseShuffleBtn = document.getElementById('showcase-shuffle');
    if (showcaseShuffleBtn) showcaseShuffleBtn.addEventListener('click', renderShowcaseSample);
});

// All quilt-patch flourish variants -- also used as the random fallback
// icon (renderIcon) when a workshop has no emoji of its own.
const FLOURISH_ICONS = [
    'images/quilt-flourish.svg',
    'images/quilt-flourish-2.svg',
    'images/quilt-flourish-3.svg',
    'images/quilt-flourish-4.svg',
    'images/quilt-flourish-5.svg',
    'images/quilt-flourish-6.svg',
    'images/quilt-flourish-7.svg',
    'images/quilt-flourish-8.svg',
    'images/quilt-flourish-9.svg',
    'images/quilt-flourish-10.svg'
];

function randomFlourish() {
    return FLOURISH_ICONS[Math.floor(Math.random() * FLOURISH_ICONS.length)];
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

    renderSectionText(sectionText, settings);
    renderNextEvent(upcoming[0] || null, settings);
    renderSchedule(upcoming);
    renderResources(archive);
    renderHubs(hubs, upcoming[0] || null, settings);
    renderTeam(organizersData.organizers || [], organizersData.emeriti || []);
    renderPartners(hubs);
    renderShowcase(showcase);
    renderAboutFeatures((sectionText.about || {}).features);

    if (settings.show_tell_form_url && isSafeHref(settings.show_tell_form_url)) {
        document.getElementById('show-tell-form-link').href = settings.show_tell_form_url;
    }
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

    // Show & Tell's one extra field: a note above the Submit a Project
    // button (e.g. flagging the Google sign-in the linked form requires).
    const submitNoteEl = document.getElementById('gallery-submit-note');
    if (submitNoteEl) {
        submitNoteEl.textContent = (sectionText.gallery || {}).submit_note || '';
    }
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

// Shows/hides one of the modal's two material blocks depending on whether
// there's anything to show in it.
function setMaterialsBlock(block, items) {
    if (items && items.length) {
        block.querySelector('.materials-list').innerHTML = renderBullets(items);
        block.style.display = '';
    } else {
        block.style.display = 'none';
    }
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

// Shared by the spotlight and the resource-archive modal: two labeled
// bulleted lists built from comma-separated material strings.
function renderMaterialsBlock(item, wrapperClass) {
    const hasRequired = item.required_materials && item.required_materials.length;
    const hasNice = item.nice_to_have_materials && item.nice_to_have_materials.length;
    if (!hasRequired && !hasNice) return '';
    return `
        <div class="${wrapperClass}">
            ${hasRequired ? `<div><h3>Required Materials</h3><ul>${renderBullets(item.required_materials)}</ul></div>` : ''}
            ${hasNice ? `<div><h3>Nice to Have</h3><ul>${renderBullets(item.nice_to_have_materials)}</ul></div>` : ''}
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
// Shows 3 random cards from the full archive at a time; the shuffle button
// re-samples a fresh 3 without reloading anything.
const RESOURCE_SAMPLE_SIZE = 3;
let resourceArchive = [];
let visibleResources = [];

function renderResources(resources) {
    resourceArchive = resources;
    const shuffleBtn = document.getElementById('resources-shuffle');
    if (shuffleBtn) shuffleBtn.style.display = resources.length > RESOURCE_SAMPLE_SIZE ? '' : 'none';
    renderResourceSample();
}

function renderResourceSample() {
    const grid = document.getElementById('resources-grid');
    if (!resourceArchive.length) {
        grid.innerHTML = '<p>Resources coming soon.</p>';
        return;
    }

    visibleResources = sampleRandom(resourceArchive, Math.min(RESOURCE_SAMPLE_SIZE, resourceArchive.length));

    grid.innerHTML = visibleResources.map((r, index) => `
        <div class="resource-card" data-resource-index="${index}">
            <div class="resource-icon">${renderIcon(r.icon)}</div>
            <h3>${escapeHTML(r.title)}</h3>
            <p>${escapeHTML(r.description || '')}</p>
            <div class="resource-meta">
                <span>${escapeHTML(formatMediumDate(r.date))}</span>
            </div>
            <button class="resource-link">View Details →</button>
        </div>
    `).join('');

    document.querySelectorAll('.resource-card[data-resource-index]').forEach(card => {
        card.addEventListener('click', () => openResourceModal(visibleResources[Number(card.dataset.resourceIndex)]));
    });

    observeFadeIn(grid, '.resource-card');

    // Shuffling swaps the cards with no focus change, so screen-reader
    // users get no other signal that anything happened -- announce it.
    announceStatus('resources-shuffle-status', `Showing ${visibleResources.length} new resources.`);
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

// ===== Modal (shared by resource cards) =====
// Focus moves into the modal on open, is trapped inside it while open (Tab
// wraps at both ends), and returns to whatever opened it on close --
// standard expected dialog behavior for keyboard and screen-reader users.
let modalTriggerElement = null;

function initModal() {
    const modal = document.getElementById('resource-modal');
    if (!modal) return;
    modal.querySelector('.modal-overlay').addEventListener('click', closeResourceModal);
    modal.querySelector('.modal-close').addEventListener('click', closeResourceModal);
    document.addEventListener('keydown', e => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') {
            closeResourceModal();
        } else if (e.key === 'Tab') {
            trapFocus(e, modal.querySelector('.modal-content'));
        }
    });
}

function trapFocus(e, container) {
    const focusable = Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

function openResourceModal(resource, triggerEl) {
    const modal = document.getElementById('resource-modal');
    modalTriggerElement = triggerEl || document.activeElement;
    modal.querySelector('.modal-eyebrow').textContent = formatMediumDate(resource.date);
    modal.querySelector('.modal-title').innerHTML = `${renderIcon(resource.icon)} ${escapeHTML(resource.title)}`;
    modal.querySelector('.modal-description').textContent = resource.description || '';

    setMaterialsBlock(modal.querySelector('.modal-materials-required'), resource.required_materials);
    setMaterialsBlock(modal.querySelector('.modal-materials-nice'), resource.nice_to_have_materials);

    const linksBlock = modal.querySelector('.modal-links');
    const linksList = modal.querySelector('.modal-links-list');
    if (resource.links && resource.links.length) {
        linksList.innerHTML = resource.links
            .map(l => `<li><a href="${escapeHref(l.url)}" target="_blank" rel="noopener">${escapeHTML(l.label)}<span class="sr-only"> (opens in a new tab)</span></a></li>`)
            .join('');
        linksBlock.style.display = '';
    } else {
        linksBlock.style.display = 'none';
    }

    modal.hidden = false;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').focus();
}

function closeResourceModal() {
    const modal = document.getElementById('resource-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (modalTriggerElement) {
        modalTriggerElement.focus();
        modalTriggerElement = null;
    }
    // Wait for the fade-out (see .modal's transition) before fully removing
    // it from layout/the accessibility tree, so the closing animation still
    // plays instead of cutting off instantly.
    setTimeout(() => { modal.hidden = true; }, 250);
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
    // only an organizing partner (no map pin), and some are both.
    const physicalHubs = hubs.filter(hub => hub.is_hub !== false)
        .sort((a, b) => a.name.localeCompare(b.name));

    // Text equivalent of the map, for screen-reader/keyboard users and
    // anyone whose browser can't or won't load Leaflet/the map tiles.
    const list = document.getElementById('hubs-list');
    if (list) {
        list.innerHTML = physicalHubs.map(hub => `
            <li class="hub-list-item">
                <img class="hub-list-icon" src="${randomFlourish()}" alt="">
                <div class="hub-list-body">
                    <h3>${escapeHTML(hub.name)}</h3>
                    <span class="hub-list-location">${escapeHTML(hub.location)}</span>
                    <p>${escapeHTML(hub.description)}</p>
                    <a href="${escapeHref(hub.website)}" target="_blank" rel="noopener">Visit Website →<span class="sr-only"> (opens in a new tab)</span></a>
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
    // geometric square doesn't read as a location marker) colored to match
    // the site's theme instead.
    const PIN_SVG = `<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="var(--primary)"/>
        <circle cx="12" cy="12" r="5" fill="#ffffff"/>
    </svg>`;

    const createCustomIcon = () => L.divIcon({
        className: 'custom-marker-container',
        html: `<div class="custom-hub-marker">${PIN_SVG}</div>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34]
    });

    const markers = physicalHubs.map(hub => {
        const marker = L.marker([hub.lat, hub.lng], { icon: createCustomIcon() }).addTo(map);
        marker.bindPopup(`
            <div class="hub-popup">
                <h3>${escapeHTML(hub.name)}</h3>
                <span class="hub-popup-location">${escapeHTML(hub.location)}</span>
                <p>${escapeHTML(hub.description)}</p>
                <a href="${escapeHref(hub.website)}" target="_blank" class="hub-popup-link">Visit Website →<span class="sr-only"> (opens in a new tab)</span></a>
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

    observeFadeIn(grid, '.showcase-card');
    announceStatus('showcase-shuffle-status', `Showing ${sample.length} new photos.`);
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
