// Teacher Studio Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }
        lastScrollY = window.scrollY;
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    const animateElements = document.querySelectorAll(
        '.workshop-card, .resource-card, .hub-card, .team-card, .feature, .stat'
    );

    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // Add animate-in class styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Stagger animation for grid items
    const grids = document.querySelectorAll('.workshop-grid, .resources-grid, .hubs-grid, .team-grid');
    grids.forEach(grid => {
        const items = grid.children;
        Array.from(items).forEach((item, index) => {
            item.style.transitionDelay = `${index * 0.1}s`;
        });
    });

    // Initialize Resource Modal
    initResourceModal();

    // Initialize Hub Map
    initHubMap();

    // Highlight current/next workshop
    highlightCurrentWorkshop();
});

// ===== Resource Modal =====
const resourceData = {
    weaving: {
        icon: '🧵',
        title: 'Weaving Basics',
        description: 'Learn the fundamentals of simple loom weaving using accessible materials. Perfect for introducing textile arts to learners of all ages.',
        materials: [
            'Cardboard (cereal boxes work great)',
            'Yarn or string in various colors',
            'Scissors',
            'Ruler',
            'Tapestry needle (optional)',
            'Decorative items (beads, feathers, ribbon)'
        ],
        downloadUrl: '#'
    },
    cardboard: {
        icon: '📦',
        title: 'Cardboard Engineering',
        description: 'Explore structural engineering principles through hands-on building with recycled cardboard. Learn about joints, reinforcement, and creative problem-solving.',
        materials: [
            'Cardboard boxes (various sizes)',
            'Box cutter or scissors',
            'Ruler and pencil',
            'Hot glue gun or tape',
            'Brass fasteners',
            'Paint or markers (optional)'
        ],
        downloadUrl: '#'
    },
    circuits: {
        icon: '🔌',
        title: 'Simple Circuits',
        description: 'Create illuminated paper circuits and LED projects. A gentle introduction to electrical concepts perfect for makerspaces and classrooms.',
        materials: [
            'Copper tape',
            'LED lights (various colors)',
            'Coin cell batteries (CR2032)',
            'Cardstock or paper',
            'Binder clips',
            'Scissors and pencil'
        ],
        downloadUrl: '#'
    },
    puppets: {
        icon: '🎭',
        title: 'Puppet Making',
        description: 'Bring stories to life by creating simple puppets from everyday household materials. Great for literacy connections and dramatic play.',
        materials: [
            'Paper bags or socks',
            'Felt scraps',
            'Googly eyes',
            'Yarn for hair',
            'Markers and crayons',
            'Glue sticks',
            'Craft sticks (for stick puppets)'
        ],
        downloadUrl: '#'
    },
    printmaking: {
        icon: '🖨️',
        title: 'Printmaking',
        description: 'Discover printmaking techniques that require no special equipment. Create beautiful prints using foam, cardboard, and found objects.',
        materials: [
            'Foam sheets or meat trays',
            'Pencil or ballpoint pen',
            'Block printing ink or tempera paint',
            'Brayer (roller)',
            'Paper',
            'Found objects for texture'
        ],
        downloadUrl: '#'
    }
};

function initResourceModal() {
    const modal = document.getElementById('resource-modal');
    if (!modal) return;

    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const modalIcon = modal.querySelector('.modal-icon');
    const modalTitle = modal.querySelector('.modal-title');
    const modalDescription = modal.querySelector('.modal-description');
    const materialsList = modal.querySelector('.materials-list');
    const downloadLink = modal.querySelector('.modal-download');

    // Click handlers for resource cards
    document.querySelectorAll('.resource-card[data-resource]').forEach(card => {
        card.addEventListener('click', function() {
            const resourceId = this.dataset.resource;
            const resource = resourceData[resourceId];

            if (resource) {
                modalIcon.textContent = resource.icon;
                modalTitle.textContent = resource.title;
                modalDescription.textContent = resource.description;

                materialsList.innerHTML = resource.materials
                    .map(item => `<li>${item}</li>`)
                    .join('');

                downloadLink.href = resource.downloadUrl;

                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Close modal handlers
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// ===== Hub Map =====
const hubLocations = [
    {
        name: 'The Bubbler @ Madison Public Library',
        location: 'Madison, WI',
        description: "Madison's creative hub offering free maker programming for all ages.",
        website: 'https://madisonbubbler.org',
        icon: '📚',
        coords: [43.0731, -89.4012]
    },
    {
        name: 'Building for Kids Children\'s Museum',
        location: 'Appleton, WI',
        description: 'A hands-on children\'s museum focused on play-based learning.',
        website: 'https://buildingforkids.org',
        icon: '🏛️',
        coords: [44.2619, -88.4154]
    },
    {
        name: 'Fermilab MakerSpace',
        location: 'Batavia, IL',
        description: 'Making and STEM education at America\'s particle physics laboratory.',
        website: 'https://education.fnal.gov/makerspace',
        icon: '⚛️',
        coords: [41.8421, -88.2583]
    },
    {
        name: 'Wayne RESA',
        location: 'Wayne, MI',
        description: 'Regional educational service agency supporting schools across Wayne County.',
        website: 'https://resa.net',
        icon: '🎓',
        coords: [42.2808, -83.2433]
    },
    {
        name: 'UW-Madison PLACE',
        location: 'Madison, WI',
        description: 'Playful Learning Across the Curriculum of Education at UW-Madison.',
        website: 'https://education.wisc.edu',
        icon: '🔬',
        coords: [43.0766, -89.4125]
    }
];

function initHubMap() {
    const mapContainer = document.getElementById('hubs-map');
    if (!mapContainer || typeof L === 'undefined') return;

    // Center the map on the midwest
    const map = L.map('hubs-map', {
        scrollWheelZoom: false
    }).setView([42.5, -87.5], 6);

    // Add a clean, modern tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Create custom icon
    const createCustomIcon = (emoji) => {
        return L.divIcon({
            className: 'custom-marker-container',
            html: `<div class="custom-hub-marker">${emoji}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -20]
        });
    };

    // Add markers for each hub
    hubLocations.forEach(hub => {
        const marker = L.marker(hub.coords, {
            icon: createCustomIcon(hub.icon)
        }).addTo(map);

        const popupContent = `
            <div class="hub-popup">
                <h3>${hub.name}</h3>
                <span class="hub-popup-location">${hub.location}</span>
                <p>${hub.description}</p>
                <a href="${hub.website}" target="_blank" class="hub-popup-link">
                    Visit Website →
                </a>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'hub-popup-wrapper'
        });
    });

    // Fit map to show all markers
    const group = L.featureGroup(hubLocations.map(hub => L.marker(hub.coords)));
    map.fitBounds(group.getBounds().pad(0.1));

    // Enable scroll zoom only when map is focused
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
}

function highlightCurrentWorkshop() {
    const workshopCards = document.querySelectorAll('.workshop-card');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Workshop dates for 2025-2026
    const workshopDates = [
        { month: 'Oct', day: 16, year: 2025 },
        { month: 'Nov', day: 20, year: 2025 },
        { month: 'Dec', day: 18, year: 2025 },
        { month: 'Jan', day: 15, year: 2026 },
        { month: 'Feb', day: 19, year: 2026 },
        { month: 'Mar', day: 19, year: 2026 },
        { month: 'Apr', day: 16, year: 2026 },
        { month: 'May', day: 21, year: 2026 }
    ];

    const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    workshopCards.forEach((card, index) => {
        if (index < workshopDates.length) {
            const workshop = workshopDates[index];
            const workshopDate = new Date(workshop.year, monthMap[workshop.month], workshop.day);

            if (workshopDate < today) {
                card.classList.add('past');
                const status = card.querySelector('.workshop-status');
                if (status) {
                    status.textContent = 'Completed';
                    status.classList.remove('upcoming');
                }
            }
        }
    });
}

// Optional: Add confetti effect for celebrations
function createConfetti() {
    const colors = ['#6366f1', '#f472b6', '#fbbf24', '#34d399', '#fb923c'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
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

// Add confetti animation
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confetti-fall {
        to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(confettiStyle);

// Easter egg: Press "c" for confetti!
document.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if user is typing in an input field
        if (document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA') {
            createConfetti();
        }
    }
});
