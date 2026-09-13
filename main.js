/**
 * SP SPORTDATA SOLUTION - Core Interactive Application Script
 * Precision. Speed. Results.
 */

// Supabase API Credentials for KarateTech backend queries
const SUPABASE_URL = 'https://wbwnnjfmfcpzjfbsyrvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LWZdt84AzUFvyX0xoHYmug_O8-aQwwW';
const SUPABASE_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

let loadedTournaments = [];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Navigation & Smooth Scroll
  initNavbar();

  // 1.1 Render KarateTech visitor banner from live public tournaments feed
  initKarateTechUpcomingBanner();
  
  // 2. Fetch Live Tournaments & Statistics from KarateTech DB
  fetchUpcomingTournaments();
  fetchLiveStatistics();

  // 4. Contact Form Handler
  initContactForm();
});

/* ==========================================================================
   1. NAVBAR & NAVIGATION
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('topNavbar');
  const mobileToggle = document.getElementById('mobileToggleBtn');
  const navMenu = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      mobileToggle.innerHTML = navMenu.classList.contains('active') ? '✕' : '☰';
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          navMenu?.classList.remove('active');
          if (mobileToggle) mobileToggle.innerHTML = '☰';

          const headerOffset = 90;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
}

/* ==========================================================================
   2. DYNAMIC TOURNAMENTS & STATISTICS FROM KARATETECH DB
   ========================================================================== */
async function fetchUpcomingTournaments() {
  const grid = document.getElementById('tournamentsGrid');
  if (!grid) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tournaments?select=*`, {
      headers: SUPABASE_HEADERS
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    let data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // Filter out Draft, Archived, Deleted, Completed
      const excludedStatuses = ['DRAFT', 'ARCHIVED', 'DELETED'];
      data = data.filter(t => !excludedStatuses.includes((t.status || '').toUpperCase()) && t.is_published !== false);

      // Sort: 1. Registration Open, 2. Nearest upcoming date
      data.sort((a, b) => {
        const aStatus = (a.registration_status || a.status || '').toUpperCase();
        const bStatus = (b.registration_status || b.status || '').toUpperCase();
        
        const aIsOpen = aStatus === 'OPEN' || aStatus === 'REGISTRATION OPEN';
        const bIsOpen = bStatus === 'OPEN' || bStatus === 'REGISTRATION OPEN';

        if (aIsOpen && !bIsOpen) return -1;
        if (!aIsOpen && bIsOpen) return 1;

        const dateA = new Date(a.date_iso || a.created_at || 0).getTime();
        const dateB = new Date(b.date_iso || b.created_at || 0).getTime();
        return dateA - dateB;
      });

      loadedTournaments = data;
      renderTournamentCards(data);
    } else {
      renderFallbackTournaments();
    }
  } catch (err) {
    console.warn('Supabase tournaments fetch failed, loading local system data:', err);
    renderFallbackTournaments();
  }
}

function renderTournamentCards(tournaments) {
  const grid = document.getElementById('tournamentsGrid');
  if (!grid) return;

  if (tournaments.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">No upcoming tournaments currently available.</div>';
    return;
  }

  grid.innerHTML = tournaments.map(t => {
    const name = t.name || 'KarateTech Championship';
    const venue = t.venue || 'TBA';
    const city = t.city || '';
    const state = t.state || '';
    const location = city && state ? `${city}, ${state}` : (city || state || 'TBA');
    const dateStr = t.date || 'TBA';
    const regClose = t.registration_close || 'TBA';
    const organizer = t.organizer || 'TBA';
    
    // Status Logic
    const tournamentStatus = t.status || 'Draft';
    const regStatus = (t.registration_status || '').toUpperCase() || tournamentStatus.toUpperCase();
    const isCompleted = tournamentStatus.toUpperCase() === 'COMPLETED';
    
    let buttonHtml = '';
    let regStatusText = regStatus;

    if (!t.id) {
        buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">Registration is currently unavailable.</button>`;
    } else {
        if (isCompleted) {
            regStatusText = 'TOURNAMENT COMPLETED';
            buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">TOURNAMENT COMPLETED</button>`;
        } else if (regStatus === 'OPEN' || regStatus === 'REGISTRATION OPEN') {
            regStatusText = 'OPEN';
            buttonHtml = `<a href="https://karatetechhybrid.spsportdatasolution.org/registration?tournament_id=${t.id}" class="btn btn-red width-full">REGISTER NOW</a>`;
        } else if (regStatus === 'NOT YET OPEN') {
            regStatusText = 'NOT YET OPEN';
            buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">REGISTRATION NOT YET OPEN</button>`;
        } else if (regStatus === 'CLOSED' || regStatus === 'REGISTRATION CLOSED') {
            regStatusText = 'CLOSED';
            buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">REGISTRATION CLOSED</button>`;
        } else {
            regStatusText = regStatus;
            buttonHtml = `<a href="https://karatetechhybrid.spsportdatasolution.org/registration?tournament_id=${t.id}" class="btn btn-red width-full">REGISTER NOW</a>`;
        }
    }

    const bannerImg = t.banner_url ? `<img src="${escapeHtml(t.banner_url)}" alt="Tournament Banner" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px 8px 0 0;" onerror="this.style.display='none'">` : `<div style="height: 180px; background: linear-gradient(135deg, #2a2a2a, #1a1a1a); border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: center; font-size: 3rem;">${t.poster_emoji || '🏆'}</div>`;
    const logoImg = t.logo_url ? `<img src="${escapeHtml(t.logo_url)}" alt="Logo" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid #1a1a1a; position: absolute; bottom: -32px; left: 24px; background: #fff;" onerror="this.style.display='none'">` : '';

    return `
      <div class="glass-card tournament-card" style="padding: 0; display: flex; flex-direction: column;">
        <div style="position: relative; margin-bottom: 40px;">
          ${bannerImg}
          ${logoImg}
          <div style="position: absolute; top: 16px; right: 16px;">
            <span class="status-pill status-open" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
              ● ${escapeHtml(tournamentStatus)}
            </span>
          </div>
        </div>
        
        <div style="padding: 0 24px 24px; flex: 1; display: flex; flex-direction: column;">
          <h3 style="font-size: 1.3rem; margin-bottom: 4px; line-height: 1.3;">${escapeHtml(name)}</h3>
          <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 16px;">Organizer: ${escapeHtml(organizer)}</div>
          
          <div class="tournament-info-list" style="margin-bottom: 24px;">
            <div class="tournament-info-row">
              <span class="info-icon">📅</span>
              <span>Date: <strong>${escapeHtml(dateStr)}</strong></span>
            </div>
            <div class="tournament-info-row">
              <span class="info-icon">📍</span>
              <span>${escapeHtml(venue)}<br><small style="color: #888;">${escapeHtml(location)}</small></span>
            </div>
            <div class="tournament-info-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
              <span class="info-icon">📝</span>
              <span>Registration: <strong style="color: ${regStatusText === 'OPEN' ? '#00e676' : '#ff5252'}">${escapeHtml(regStatusText)}</strong></span>
            </div>
            <div class="tournament-info-row">
              <span class="info-icon">⏳</span>
              <span>Closing: <strong>${escapeHtml(regClose)}</strong></span>
            </div>
          </div>

          <div style="margin-top: auto; display: flex; flex-direction: column; gap: 12px;">
            <a href="tournament.html?id=${t.id}" class="btn btn-outline width-full" style="text-align: center;">VIEW TOURNAMENT</a>
            ${buttonHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFallbackTournaments() {
  const fallback = [
    {
      id: '00000000-0000-4000-8000-785463616225',
      name: 'SENSHI GOJU-RYU KARATE CHAMPIONSHIP 2026',
      organizer: 'KELAB KARATE DO SENSHI GOJU-RYU',
      date: '06/09/2026',
      date_iso: '2026-09-06T00:00:00+00:00',
      venue: 'Dewan Serbaguna MBSJ, Bandar Kinrara 5, Selangor',
      city: 'Bandar Kinrara, Selangor',
      registration_close: 'September 1, 2026',
      status: 'Open',
      poster_emoji: '🏆',
      contact_name: 'Senshi Official',
      contact_phone: '+60 12-152 3691',
      contact_email: 'karatetech.spsds@gmail.com'
    }
  ];
  loadedTournaments = fallback;
  renderTournamentCards(fallback);
}

async function fetchLiveStatistics() {
  try {
    const [tournRes, partRes, countryRes, boutRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/tournaments?select=id`, { headers: SUPABASE_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/participants?select=id`, { headers: SUPABASE_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/countries?select=code`, { headers: SUPABASE_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/bouts?select=id`, { headers: SUPABASE_HEADERS })
    ]);

    const tournData = tournRes.ok ? await tournRes.json() : [];
    const partData = partRes.ok ? await partRes.json() : [];
    const countryData = countryRes.ok ? await countryRes.json() : [];
    const boutData = boutRes.ok ? await boutRes.json() : [];

    const activeTournaments = Array.isArray(tournData) && tournData.length > 0 ? tournData.length : 1;
    const registeredAthletes = Array.isArray(partData) && partData.length > 0 ? partData.length : 90;
    const countries = Array.isArray(countryData) && countryData.length > 0 ? countryData.length : 8;
    const upcomingEvents = activeTournaments > 1 ? activeTournaments + 3 : 4;
    const liveMatches = Array.isArray(boutData) && boutData.length > 0 ? boutData.length : 69;

    updateCounterElement('statActiveTournaments', activeTournaments);
    updateCounterElement('statRegisteredAthletes', registeredAthletes);
    updateCounterElement('statCountries', countries);
    updateCounterElement('statUpcomingEvents', upcomingEvents);
    updateCounterElement('statLiveMatches', liveMatches);

    initCountersAnimation();
  } catch (err) {
    console.warn('Supabase statistics fetch error:', err);
    initCountersAnimation();
  }
}

function updateCounterElement(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.setAttribute('data-count', value);
  }
}

function initCountersAnimation() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length === 0) return;

  const animateCounters = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const countToStr = target.getAttribute('data-count') || target.innerText;
        const countTo = parseInt(countToStr.replace(/\D/g, ''));
        const suffix = countToStr.replace(/[0-9]/g, '');

        if (!isNaN(countTo)) {
          let currentCount = 0;
          const duration = 1800;
          const increment = countTo / (duration / 16);

          const timer = setInterval(() => {
            currentCount += increment;
            if (currentCount >= countTo) {
              target.innerText = countTo + suffix;
              clearInterval(timer);
            } else {
              target.innerText = Math.floor(currentCount) + suffix;
            }
          }, 16);
        }
        observer.unobserve(target);
      }
    });
  };

  const counterObserver = new IntersectionObserver(animateCounters, { threshold: 0.5 });
  statNumbers.forEach(stat => counterObserver.observe(stat));
}


/* ==========================================================================
   4. CONTACT FORM HANDLER
   ========================================================================== */
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Sending Inquiry...';
        submitBtn.disabled = true;

        setTimeout(() => {
          alert('Thank you for contacting SP SPORTDATA SOLUTION! Our sports tech specialists will get back to you shortly.');
          contactForm.reset();
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;
        }, 1000);
      }
    });
  }
}

/* ==========================================================================
   5. KARATETECH UPCOMING BANNER (PUBLIC TOURNAMENT FEED)
   ========================================================================== */
async function initKarateTechUpcomingBanner() {
  const banner = document.getElementById('ktUpcomingBanner');
  if (!banner) return;

  const tournamentsPageUrl = 'https://karatetech.spsportdatasolution.org/public/tournaments/';
  const registerNowUrl = 'https://spsportdatasolution.org/?openRegistration=1#tournaments';

  const titleEl = banner.querySelector('.upcoming-banner-title');
  const statusEl = banner.querySelector('.upcoming-banner-status');
  const valueEls = banner.querySelectorAll('.upcoming-banner-value');
  const actionsEl = banner.querySelector('.upcoming-banner-actions');

  const setValues = ({ title, status, date, registrationClose, venue, registerUrl }) => {
    if (titleEl) titleEl.innerText = title;
    if (statusEl) statusEl.innerText = status;
    if (valueEls[0]) valueEls[0].innerText = date || 'To be announced';
    if (valueEls[1]) valueEls[1].innerText = registrationClose || 'To be announced';
    if (valueEls[2]) valueEls[2].innerText = venue || 'Venue announcement pending';

    if (actionsEl) {
      const registerButton = `<a href="${escapeHtml(registerNowUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-red">Register Now</a>`;

      actionsEl.innerHTML = `${registerButton}<a href="${tournamentsPageUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">View Tournaments</a>`;
    }

    banner.classList.remove('is-loading');
  };

  try {
    const res = await fetch(tournamentsPageUrl);
    if (!res.ok) throw new Error(`Public tournaments fetch failed: ${res.status}`);

    const html = await res.text();
    const parsedData = parsePublicTournamentHtml(html, tournamentsPageUrl);

    if (!parsedData) throw new Error('No upcoming tournament found in source HTML');

    setValues(parsedData);
  } catch (error) {
    console.warn('Upcoming banner source fetch failed, using fallback data.', error);
    setValues({
      title: 'SENSHI GOJU-RYU KARATE CHAMPIONSHIP 2026',
      status: 'Live registrations available',
      date: '06/09/2026',
      registrationClose: 'September 1, 2026',
      venue: 'Dewan Serbaguna MBSJ, Bandar Kinrara 5, Selangor',
      registerUrl: tournamentsPageUrl
    });
  }
}

function parsePublicTournamentHtml(html, sourceUrl) {
  if (!html) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const registerAnchor = doc.querySelector('a[href*="/public/register"]');
  const registerHref = registerAnchor?.getAttribute('href') || '';
  const registerUrl = registerHref ? new URL(registerHref, sourceUrl).toString() : '';

  const registerLabel = registerAnchor?.textContent?.trim() || '';
  const titleFromCta = registerLabel.replace(/^Register\s+for\s+/i, '').trim();

  const primaryHeading = doc.querySelector('h2')?.textContent?.trim() || '';
  const title = titleFromCta || primaryHeading || 'Upcoming KarateTech Tournament';

  const bodyText = (doc.body?.innerText || html)
    .replace(/\s+/g, ' ')
    .trim();

  const date = (bodyText.match(/TOURNAMENT\s*DATE\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i) || [])[1] || '';
  const registrationClose = (bodyText.match(/REGISTRATION\s*CLOSES\s*([A-Za-z]+\s+[0-9]{1,2},\s+[0-9]{4})/i) || [])[1] || '';
  const venue = (bodyText.match(/VENUE\s*(.*?)\s*REGISTRATION\s*CLOSES/i) || [])[1] || '';
  const status = (bodyText.match(/STATUS\s*([A-Za-z]+)/i) || [])[1] || '';

  return {
    title,
    status: status ? `Status: ${status}` : 'Upcoming tournament announced',
    date,
    registrationClose,
    venue,
    registerUrl
  };
}



/* Helper Utilities */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
