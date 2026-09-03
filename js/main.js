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
    return escapeHTML(icon);
}

// ===== Navigation =====
function initNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle) {
        navToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
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

function initHeroLogo() {
    const grid = document.getElementById('hero-logo-grid');
    if (!grid) return;

    const [orange, purple, pink, teal] = QUILT_PALETTE;
    const split = (a, b, angle) => `linear-gradient(${angle || 135}deg, ${a} 50%, ${b} 50%)`;
    const initial = [
        orange, purple, pink, orange,
        split(orange, pink), pink, split(pink, teal), teal,
        purple, teal, teal, pink,
        split(purple, orange), orange, split(teal, purple), purple
    ];

    initial.forEach((background) => {
        const tile = document.createElement('div');
        tile.className = 'hero-tile';
        tile.style.background = background;
        tile.addEventListener('click', () => flipTile(tile));
        grid.appendChild(tile);
    });
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
    const [workshops, hubs, organizers, settings, showcase] = await Promise.all([
        loadJSON('data/workshops.json').catch(() => []),
        loadJSON('data/hubs.json').then(d => d.hubs || []).catch(() => []),
        loadJSON('data/organizers.json').then(d => d.organizers || []).catch(() => []),
        loadJSON('data/site-settings.json').catch(() => ({})),
        loadJSON('data/showcase.json').catch(() => [])
    ]);

    // A workshop's date vs. today is the only thing that decides whether
    // it's "next"/upcoming or archived — there's no separate flag for it.
    const todayISO = new Date().toISOString().slice(0, 10);
    const upcoming = workshops.filter(w => w.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date));
    const archive = workshops.filter(w => w.date < todayISO).sort((a, b) => b.date.localeCompare(a.date));

    renderNextEvent(upcoming[0] || null, settings);
    renderSchedule(upcoming, settings);
    renderResources(archive);
    renderHubs(hubs);
    renderTeam(organizers, settings);
    renderPartners(hubs);
    renderShowcase(showcase);

    if (settings.about_text) {
        document.getElementById('about-text').textContent = settings.about_text;
    }
    if (settings.show_tell_form_url) {
        document.getElementById('show-tell-form-link').href = settings.show_tell_form_url;
    }
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
                <a href="${escapeAttr(registerUrl)}" target="_blank" class="btn btn-primary btn-large">
                    Register
                    <span class="btn-icon">→</span>
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
            <a href="${escapeAttr(registerUrl)}" target="_blank" class="btn btn-primary btn-large">
                Register for ${parseLocalDate(event.date).toLocaleDateString('en-US', { month: 'long' })}
                <span class="btn-icon">→</span>
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
            ${hasRequired ? `<div><h4>Required Materials</h4><ul>${renderBullets(item.required_materials)}</ul></div>` : ''}
            ${hasNice ? `<div><h4>Nice to Have</h4><ul>${renderBullets(item.nice_to_have_materials)}</ul></div>` : ''}
        </div>
    `;
}

// ===== Workshop schedule: every upcoming workshop, nearest first =====
function renderSchedule(upcoming, settings) {
    const grid = document.getElementById('workshop-grid');
    if (!upcoming.length) {
        grid.innerHTML = '<p>Information coming soon.</p>';
        return;
    }

    grid.innerHTML = upcoming.map((item, index) => {
        const itemDate = parseLocalDate(item.date);
        const isFeatured = index === 0;
        const month = itemDate.toLocaleDateString('en-US', { month: 'short' });
        const day = itemDate.getDate();

        return `
            <div class="workshop-card ${isFeatured ? 'featured' : ''}">
                ${isFeatured ? '<div class="workshop-badge">Up Next!</div>' : ''}
                <div class="workshop-date">
                    <span class="month">${month}</span>
                    <span class="day">${day}</span>
                </div>
                <div class="workshop-info">
                    <span class="workshop-status upcoming">Upcoming</span>
                    <h3><span class="workshop-icon">${renderIcon(item.icon)}</span> ${escapeHTML(item.title)}</h3>
                    <p>${escapeHTML(item.description || '')}</p>
                    <span class="workshop-time">${escapeHTML(settings.workshop_time || '')}</span>
                    ${isFeatured ? '<a href="#next-event" class="btn btn-small">Register</a>' : ''}
                </div>
            </div>
        `;
    }).join('');

    observeFadeIn(grid, '.workshop-card');
}

// ===== Resources / past workshop archive =====
let resourceData = [];

function renderResources(resources) {
    resourceData = resources;
    const grid = document.getElementById('resources-grid');
    if (!resources.length) {
        grid.innerHTML = '<p>Resources coming soon.</p>';
        return;
    }

    grid.innerHTML = resources.map((r, index) => `
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
        card.addEventListener('click', () => openResourceModal(resourceData[Number(card.dataset.resourceIndex)]));
    });

    observeFadeIn(grid, '.resource-card');
}

function formatMediumDate(isoDate) {
    return parseLocalDate(isoDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ===== Modal (shared by resource cards) =====
function initModal() {
    const modal = document.getElementById('resource-modal');
    if (!modal) return;
    modal.querySelector('.modal-overlay').addEventListener('click', closeResourceModal);
    modal.querySelector('.modal-close').addEventListener('click', closeResourceModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeResourceModal();
    });
}

function openResourceModal(resource) {
    const modal = document.getElementById('resource-modal');
    modal.querySelector('.modal-eyebrow').textContent = formatMediumDate(resource.date);
    modal.querySelector('.modal-title').innerHTML = `${renderIcon(resource.icon)} ${escapeHTML(resource.title)}`;
    modal.querySelector('.modal-description').textContent = resource.description || '';

    setMaterialsBlock(modal.querySelector('.modal-materials-required'), resource.required_materials);
    setMaterialsBlock(modal.querySelector('.modal-materials-nice'), resource.nice_to_have_materials);

    const linksBlock = modal.querySelector('.modal-links');
    const linksList = modal.querySelector('.modal-links-list');
    if (resource.links && resource.links.length) {
        linksList.innerHTML = resource.links
            .map(l => `<li><a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHTML(l.label)}</a></li>`)
            .join('');
        linksBlock.style.display = '';
    } else {
        linksBlock.style.display = 'none';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeResourceModal() {
    document.getElementById('resource-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ===== Hub sites map =====
function renderHubs(hubs) {
    const mapContainer = document.getElementById('hubs-map');
    // Only hubs marked as physical gathering locations get a pin — a hub can
    // still be a partner (shown in the Partner Organizations list) without
    // being an in-person site.
    const physicalHubs = hubs.filter(hub => hub.physical_hub !== false);
    if (!mapContainer || typeof L === 'undefined' || !physicalHubs.length) return;

    const map = L.map('hubs-map', { scrollWheelZoom: false }).setView([42.5, -87.5], 6);

    // Esri's free "Light Gray Base" tiles — no API key required, unlike
    // Carto's basemaps which now show an "API key required" watermark.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);

    const createCustomIcon = (emoji) => L.divIcon({
        className: 'custom-marker-container',
        html: `<div class="custom-hub-marker">${emoji}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
    });

    const markers = physicalHubs.map(hub => {
        const marker = L.marker([hub.lat, hub.lng], { icon: createCustomIcon(hub.icon) }).addTo(map);
        marker.bindPopup(`
            <div class="hub-popup">
                <h3>${escapeHTML(hub.name)}</h3>
                <span class="hub-popup-location">${escapeHTML(hub.location)}</span>
                <p>${escapeHTML(hub.description)}</p>
                <a href="${escapeAttr(hub.website)}" target="_blank" class="hub-popup-link">Visit Website →</a>
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
    list.innerHTML = hubs.map(h =>
        `<a href="${escapeAttr(h.website)}" target="_blank" rel="noopener">${escapeHTML(h.name)}</a>`
    ).join('');
}

// ===== Team =====
function renderTeam(organizers, settings) {
    const grid = document.getElementById('team-grid');
    grid.innerHTML = organizers.map(person => `
        <div class="team-card">
            <img class="team-avatar-img" src="${escapeAttr(person.photo)}" alt="${escapeAttr(person.name)}">
            <h3>${escapeHTML(person.name)}</h3>
            <p class="team-org">${escapeHTML(person.org)}</p>
        </div>
    `).join('');
    observeFadeIn(grid, '.team-card');

    const emeritiList = document.getElementById('emeriti-list');
    const emeriti = (settings && settings.emeriti) || [];
    emeritiList.innerHTML = emeriti.map(name => `<span>${escapeHTML(name)}</span>`).join('');
}

// ===== Show & Tell =====
function renderShowcase(items) {
    const grid = document.getElementById('showcase-grid');
    if (!items || !items.length) {
        grid.innerHTML = `
            <div class="gallery-placeholder">
                <span>✨</span>
                <p>Your photo here!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => `
        <figure class="showcase-card">
            <img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.caption || 'Teacher Studio creation')}" loading="lazy">
            <figcaption>
                ${item.caption ? `<p>${escapeHTML(item.caption)}</p>` : ''}
                ${item.name ? `<span class="showcase-name">${escapeHTML(item.name)}</span>` : ''}
            </figcaption>
        </figure>
    `).join('');

    observeFadeIn(grid, '.showcase-card');
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
