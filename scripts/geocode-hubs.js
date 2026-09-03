// Fills in lat/lng for hub sites in data/hubs.json from a plain street
// address, using OpenStreetMap's free Nominatim geocoder -- so the CMS
// only needs a human-readable "Street Address" field, not coordinates.
//
// A hub with an address always has its lat/lng derived from that address
// (re-geocoded whenever the address text changes); a hub with no address
// keeps whatever lat/lng was entered manually. Results are cached in
// data/hub-geocode-cache.json (address -> {lat,lng} or null) so re-runs
// only ever query Nominatim for addresses that are new or have changed.
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires an identifying User-Agent and at most ~1 request/second --
// both handled below. With only a handful of hub sites, this is well
// within normal, occasional use.

const fs = require('fs');
const path = require('path');

const HUBS_PATH = path.join(__dirname, '..', 'data', 'hubs.json');
const CACHE_PATH = path.join(__dirname, '..', 'data', 'hub-geocode-cache.json');
const USER_AGENT = 'TeacherStudioBot/1.0 (+https://uw-pkir.github.io/teacher-studio/)';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
    const results = await res.json();
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

async function main() {
    const data = JSON.parse(fs.readFileSync(HUBS_PATH, 'utf8'));
    const hubs = data.hubs || [];
    const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

    let changed = false;
    let queriedNominatim = false;

    for (const hub of hubs) {
        const address = (hub.address || '').trim();
        if (!address) continue; // no address set -- leave any manually-entered lat/lng alone

        let coords = cache[address];
        if (coords === undefined) {
            if (queriedNominatim) await sleep(1100); // stay under the 1 req/sec limit
            queriedNominatim = true;
            try {
                coords = await geocode(address);
            } catch (err) {
                console.warn(`Geocoding failed for "${address}" (${hub.name}): ${err.message}`);
                coords = null;
            }
            cache[address] = coords;
        }

        if (coords) {
            if (hub.lat !== coords.lat || hub.lng !== coords.lng) {
                hub.lat = coords.lat;
                hub.lng = coords.lng;
                changed = true;
            }
        } else {
            console.warn(`No geocoding result for "${address}" (${hub.name}) -- leaving its map pin as-is until the address is fixed.`);
        }
    }

    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');

    if (changed) {
        fs.writeFileSync(HUBS_PATH, JSON.stringify(data, null, 2) + '\n');
        console.log('Updated data/hubs.json with geocoded coordinates.');
    } else {
        console.log('No hub addresses needed geocoding.');
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
