/**
 * Comprehensive Script to pull ALL events and pictures directly from Luma calendar sources:
 * 1. https://lu.ma/ibw (India Blockchain Week - 370+ events)
 * 2. https://lu.ma/Devcon8 (Devcon 8 Side Events - 120+ events)
 */

import fs from 'fs';

export function cleanLumaImageUrl(url) {
  if (!url) return null;
  return url.replace(/images\.lumacdn\.com\/cdn-cgi\/image\/[^/]+\//, 'images.lumacdn.com/');
}

export function inferCategory(title, desc) {
  const text = `${title ?? ''} ${desc ?? ''}`.toLowerCase();
  if (/hackathon|hack.{0,10}fest|buidl|build.{0,5}athon/.test(text)) return 'hackathon';
  if (/workshop|hands.on|tutorial|bootcamp|training/.test(text)) return 'workshop';
  if (/talk|keynote|panel|speaker|presentation|seminar|lecture|fireside/.test(text)) return 'technical_talk';
  if (/conference|summit|congress|forum|expo/.test(text)) return 'conference';
  if (/network|mixer|mingle|connect|meetup.*network|happy.hour|drinks/.test(text)) return 'networking';
  if (/founder|investor|vc|venture|pitch|startup|accelerator|demo.day/.test(text)) return 'founder_investor';
  if (/party|rave|dinner|brunch|afterparty|social|celebration|club|concert/.test(text)) return 'party_social';
  if (/meetup|community|guild|dao|local/.test(text)) return 'community_meetup';
  return 'community_meetup';
}

export function inferEcosystems(title, desc) {
  const text = `${title ?? ''} ${desc ?? ''}`.toLowerCase();
  const found = [];
  if (/\bethereum\b|\beth\b|\bevm\b|\bvitalik\b|\bdevcon\b|\bl2\b|\brollup/.test(text)) found.push('ethereum');
  if (/\bsolana\b|\bsol\b|\bsuperteam\b/.test(text)) found.push('solana');
  if (/\bbitcoin\b|\bbtc\b/.test(text)) found.push('bitcoin');
  if (/\bpolygon\b|\bmatic\b/.test(text)) found.push('polygon');
  if (/\bzk\b|\bzero.?knowledge\b|\bzkp\b|\bzksync\b|\bstarknet\b/.test(text)) found.push('zk');
  if (/\bdefi\b|\bliquidity\b|\bamm\b|\bdex\b/.test(text)) found.push('defi');
  if (/\bai.{0,5}web3\b|\bweb3.{0,5}ai\b|\bai.{0,5}blockchain\b/.test(text)) found.push('ai_web3');
  return found.length > 0 ? found : ['ethereum'];
}

function parseIcsDate(val) {
  if (!val) return null;
  val = val.trim();
  if (val.length === 8) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}T09:00:00.000+05:30`;
  }
  const m = val.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (m) {
    const [, y, mo, d, h, mi, s, z] = m;
    if (z) {
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
    }
    return `${y}-${mo}-${d}T${h}:${mi}:${s}.000+05:30`;
  }
  return null;
}

function unescapeIcs(s) {
  if (!s) return '';
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

/**
 * 1. Scrape HTML for structured Schema.org JSON-LD and Next.js pageProps data
 */
export async function scrapeLumaPage(url, sourceAttribution) {
  console.log(`[Luma Scraper] Fetching HTML for ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch ${url}: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const eventsMap = new Map();

    // Parse application/ld+json
    const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = ldRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
          for (const item of data.itemListElement) {
            const raw = item.item;
            if (raw && raw['@type'] === 'Event') {
              const rawImage = Array.isArray(raw.image) ? raw.image[0] : raw.image;
              const cleanImage = cleanLumaImageUrl(rawImage);
              const loc = raw.location;
              const venueName = loc?.name?.trim() || 'Mumbai, India';
              const addr = loc?.address;
              const venueAddress = addr
                ? [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ')
                : 'Mumbai, Maharashtra, India';

              const org = Array.isArray(raw.organizer) ? raw.organizer[0] : raw.organizer;
              const id = (raw.url || raw['@id'] || '')
                .replace(/^https?:\/\/(lu\.ma|luma\.com)\//, '')
                .replace(/\/$/, '')
                .replace(/[^a-zA-Z0-9_-]/g, '-');

              if (id) {
                eventsMap.set(id, {
                  id,
                  title: raw.name?.trim() || 'Untitled Event',
                  description: raw.description?.trim() || 'Event details available on Luma page.',
                  start_at: raw.startDate || new Date().toISOString(),
                  end_at: raw.endDate || null,
                  timezone_name: 'Asia/Kolkata',
                  venue_name: venueName,
                  venue_address: venueAddress,
                  city: addr?.addressLocality || 'Mumbai',
                  lat: loc?.geo?.latitude || null,
                  lng: loc?.geo?.longitude || null,
                  organizer_name: org?.name?.trim() || 'Community Host',
                  organizer_url: org?.url || null,
                  image_url: cleanImage,
                  registration_url: raw.url || raw['@id'] || url,
                  registration_open: true,
                  category: inferCategory(raw.name, raw.description),
                  ecosystems: inferEcosystems(raw.name, raw.description),
                  event_status: raw.eventStatus?.includes('Cancelled') ? 'cancelled' : 'scheduled',
                  is_cancelled: Boolean(raw.eventStatus?.includes('Cancelled')),
                  canonical_url: raw.url || raw['@id'] || url,
                  original_url: raw.url || raw['@id'] || url,
                  source_attribution: sourceAttribution,
                  data_completeness: 90,
                });
              }
            }
          }
        }
      } catch {}
    }

    // Also parse __NEXT_DATA__
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextMatch) {
      try {
        const nextData = JSON.parse(nextMatch[1]);
        const initialData = nextData.props?.pageProps?.initialData?.data;
        const items = [
          ...(initialData?.featured_items || []),
          ...(initialData?.upcoming?.entries || []),
        ];

        for (const item of items) {
          const ev = item.event;
          if (!ev) continue;
          const slug = ev.url || item.api_id;
          const cleanImage = cleanLumaImageUrl(ev.cover_url);
          const existing = eventsMap.get(slug);

          if (existing) {
            if (cleanImage && !existing.image_url) existing.image_url = cleanImage;
          } else {
            const title = ev.name?.trim() || 'Untitled Event';
            const desc = ev.description_short || 'Event details on Luma.';
            eventsMap.set(slug, {
              id: slug,
              title,
              description: desc,
              start_at: item.start_at || ev.start_at || new Date().toISOString(),
              end_at: ev.end_at || null,
              timezone_name: ev.timezone || 'Asia/Kolkata',
              venue_name: ev.geo_address_json?.name || ev.location?.name || 'Mumbai, India',
              venue_address: ev.geo_address_json?.address || 'Mumbai, Maharashtra, India',
              city: ev.geo_address_json?.city || 'Mumbai',
              lat: ev.geo_latitude || null,
              lng: ev.geo_longitude || null,
              organizer_name: item.hosts?.[0]?.name || 'Community Host',
              organizer_url: item.hosts?.[0]?.url || null,
              image_url: cleanImage,
              registration_url: `https://luma.com/${slug}`,
              registration_open: true,
              category: inferCategory(title, desc),
              ecosystems: inferEcosystems(title, desc),
              event_status: 'scheduled',
              is_cancelled: false,
              canonical_url: `https://luma.com/${slug}`,
              original_url: `https://luma.com/${slug}`,
              source_attribution: sourceAttribution,
              data_completeness: 90,
            });
          }
        }
      } catch {}
    }

    console.log(`[Luma Scraper] Found ${eventsMap.size} events from HTML of ${url}`);
    return Array.from(eventsMap.values());
  } catch (err) {
    console.error(`Error scraping page ${url}:`, err);
    return [];
  }
}

/**
 * 2. Parse complete iCal calendar feed for all past & upcoming events
 */
export async function scrapeLumaIcs(calId, attribution) {
  console.log(`[Luma ICS] Fetching full calendar feed for ${attribution} (${calId})...`);
  try {
    const res = await fetch(`https://api.lu.ma/ics/get?entity=calendar&id=${calId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch ICS for ${calId}: HTTP ${res.status}`);
      return [];
    }

    const icsText = await res.text();
    const blocks = icsText.split('BEGIN:VEVENT');
    const parsed = [];

    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i].split('END:VEVENT')[0];
      const summaryMatch = b.match(/SUMMARY:(.*)/);
      if (!summaryMatch) continue;
      const title = unescapeIcs(summaryMatch[1].trim());

      const dtstartMatch = b.match(/DTSTART(?:;VALUE=DATE)?:(.*)/);
      const dtendMatch = b.match(/DTEND(?:;VALUE=DATE)?:(.*)/);
      const startAt = parseIcsDate(dtstartMatch?.[1]);
      const endAt = parseIcsDate(dtendMatch?.[1]);
      if (!startAt) continue;

      const orgMatch = b.match(/ORGANIZER(?:;CN="([^"]+)")?:/);
      const organizerName = orgMatch?.[1] || 'Community Host';

      const locMatch = b.match(/LOCATION:(.*)/);
      const locRaw = locMatch ? unescapeIcs(locMatch[1].trim()) : 'Mumbai, India';
      const isLocUrl = locRaw.startsWith('http');
      const venueName = isLocUrl
        ? (attribution.includes('Devcon') ? 'Devcon Hub, Mumbai' : 'Mumbai, India')
        : locRaw;

      const geoMatch = b.match(/GEO:([0-9.-]+);([0-9.-]+)/);
      const lat = geoMatch ? parseFloat(geoMatch[1]) : null;
      const lng = geoMatch ? parseFloat(geoMatch[2]) : null;

      const descMatch = b.match(/DESCRIPTION:([\s\S]*?)(?=(?:LOCATION|GEO|UID|SEQUENCE|STATUS):)/);
      const description = descMatch
        ? unescapeIcs(descMatch[1].trim().replace(/\r?\n /g, ''))
        : 'Event details available on Luma page.';

      const urlMatch = (description + ' ' + (isLocUrl ? locRaw : '')).match(/https:\/\/(?:lu\.ma|luma\.com)\/(?:event\/)?([a-zA-Z0-9_-]{4,})/);
      const slug = urlMatch ? urlMatch[1] : null;

      const uidMatch = b.match(/UID:(.*)/);
      const rawUid = uidMatch ? uidMatch[1].trim().replace(/@.*/, '') : `evt-${i}`;
      const id = slug || rawUid;
      const regUrl = slug ? `https://luma.com/${slug}` : `https://luma.com/event/${rawUid}`;

      parsed.push({
        id,
        title,
        description: description.slice(0, 300),
        start_at: startAt,
        end_at: endAt,
        timezone_name: 'Asia/Kolkata',
        venue_name: venueName,
        venue_address: venueName,
        city: 'Mumbai',
        lat,
        lng,
        organizer_name: organizerName,
        organizer_url: null,
        image_url: null, // will be enriched from HTML scraper
        registration_url: regUrl,
        registration_open: true,
        category: inferCategory(title, description),
        ecosystems: inferEcosystems(title, description),
        event_status: 'scheduled',
        is_cancelled: false,
        canonical_url: regUrl,
        original_url: regUrl,
        source_attribution: attribution,
        data_completeness: 85,
      });
    }

    console.log(`[Luma ICS] Parsed ${parsed.length} events from ${attribution}`);
    return parsed;
  } catch (err) {
    console.error(`Error parsing ICS for ${calId}:`, err);
    return [];
  }
}

async function run() {
  console.log('=== Starting Complete Luma Ingestion (IBW & Devcon8) ===');

  // Step 1: Query official Luma internal calendar API for rich event items + cover images
  console.log('[Luma API] Fetching calendar items and cover images from api.lu.ma...');
  const imageMap = new Map();
  const titleMap = new Map();

  function addMapping(key, url) {
    if (!key || !url) return;
    const clean = url.replace(/images\.lumacdn\.com\/cdn-cgi\/image\/[^/]+\//, 'images.lumacdn.com/');
    imageMap.set(key, clean);
    imageMap.set(key.toLowerCase(), clean);
  }

  try {
    const [r1, r2] = await Promise.all([
      fetch('https://api.lu.ma/calendar/get-items?calendar_api_id=cal-ikh3xL3FdXBrJa9', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch('https://api.lu.ma/calendar/get-items?calendar_api_id=cal-uho3uXcPGigtake', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    for (const item of [...(d1.entries || []), ...(d2.entries || [])]) {
      const ev = item.event;
      if (!ev) continue;
      const img = ev.cover_url || ev.social_image_url;
      if (!img) continue;

      addMapping(item.api_id, img);
      addMapping(ev.api_id, img);
      if (ev.url) {
        addMapping(ev.url, img);
        addMapping('https://luma.com/' + ev.url, img);
        addMapping('https://lu.ma/' + ev.url, img);
        addMapping('https://luma.com/event/' + ev.url, img);
      }
      if (ev.name) {
        const norm = ev.name.toLowerCase().trim().replace(/[^\w\s]/g, '');
        titleMap.set(norm, img);
      }
    }
    console.log(`[Luma API] Extracted ${imageMap.size} image mappings from Luma API`);
  } catch (err) {
    console.warn('[Luma API] Failed to fetch calendar items:', err);
  }

  // Step 2: Scrape HTML pages for exact S3 cover images & featured events
  const ibwHtml = await scrapeLumaPage('https://lu.ma/ibw', 'India Blockchain Week');
  const devconHtml = await scrapeLumaPage('https://lu.ma/Devcon8', 'Devcon8 Side Events');

  for (const ev of [...ibwHtml, ...devconHtml]) {
    if (ev.image_url) {
      imageMap.set(ev.id, ev.image_url);
      imageMap.set(ev.canonical_url, ev.image_url);
    }
  }

  // Step 3: Fetch the complete calendar feeds (cal-ikh3xL3FdXBrJa9 & cal-uho3uXcPGigtake)
  const ibwIcs = await scrapeLumaIcs('cal-ikh3xL3FdXBrJa9', 'India Blockchain Week');
  const devconIcs = await scrapeLumaIcs('cal-uho3uXcPGigtake', 'Devcon 8 Side Events');

  // Step 4: Merge and deduplicate all events
  const mergedMap = new Map();

  // First seed with full ICS events
  for (const ev of [...ibwIcs, ...devconIcs]) {
    const key = ev.id || ev.canonical_url;
    const img = imageMap.get(ev.id) || imageMap.get(ev.canonical_url) || (ev.title && titleMap.get(ev.title.toLowerCase().trim().replace(/[^\w\s]/g, '')));
    if (img) ev.image_url = img;
    mergedMap.set(key, ev);
  }

  // Then merge HTML events to ensure high-priority metadata is kept
  for (const ev of [...ibwHtml, ...devconHtml]) {
    const key = ev.id || ev.canonical_url;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      mergedMap.set(key, { ...existing, ...ev, image_url: ev.image_url || existing.image_url });
    } else {
      mergedMap.set(key, ev);
    }
  }

  const allEvents = Array.from(mergedMap.values());

  // Sort chronologically date-wise
  allEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const now = new Date();
  const upcomingCount = allEvents.filter(e => new Date(e.end_at || e.start_at) >= now).length;
  const pastCount = allEvents.filter(e => new Date(e.end_at || e.start_at) < now).length;

  console.log(`\n=== INGESTION SUMMARY ===`);
  console.log(`Total Events Consolidate: ${allEvents.length}`);
  console.log(`Upcoming Events: ${upcomingCount}`);
  console.log(`Past Events: ${pastCount}`);
  console.log(`Events with custom cover pictures: ${allEvents.filter(e => e.image_url).length}`);

  // Save to apps/web/lib/luma-scraped-events.json
  fs.writeFileSync(
    'apps/web/lib/luma-scraped-events.json',
    JSON.stringify(allEvents, null, 2)
  );
  console.log('Successfully saved to apps/web/lib/luma-scraped-events.json\n');
}

run().catch(console.error);
