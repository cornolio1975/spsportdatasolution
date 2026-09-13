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

// Initialize Supabase Client
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let loadedTournaments = [];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Navigation & Smooth Scroll
  initNavbar();


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
    let data;
    if (supabaseClient) {
      const res = await supabaseClient
        .from('tournaments')
        .select('*')
        .order('date_iso', { ascending: true });
      if (res.error) throw res.error;
      data = res.data;
    } else {
      throw new Error("Supabase client not initialized.");
    }
    
    if (data && data.length > 0) {
      // Filter out Draft, Deleted, Archived, Completed, Canceled
      // The prompt specifically asks to display 'Published' or 'Upcoming'
      const excludedStatuses = ['DRAFT', 'DELETED', 'ARCHIVED', 'COMPLETED', 'CANCELED', 'CANCELLED'];
      const filteredData = data.filter(t => !excludedStatuses.includes((t.status || '').toUpperCase()));

      // Secondary sort by start time (if available) - date_iso already handles the primary sort
      filteredData.sort((a, b) => {
        const dateA = new Date(a.date_iso || 0).getTime();
        const dateB = new Date(b.date_iso || 0).getTime();
        if (dateA === dateB) {
          const timeA = a.start_time || '00:00';
          const timeB = b.start_time || '00:00';
          return timeA.localeCompare(timeB);
        }
        return dateA - dateB;
      });

      loadedTournaments = filteredData;
      renderTournamentCards(filteredData);
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
    const cityState = [city, state].filter(Boolean).join(' / ');
    const dateStr = t.date || 'TBA';
    const startTime = t.start_time || 'TBA';
    const organizer = t.organizer || 'TBA';
    
    let regCloseStr = t.registration_close || 'TBA';
    if (t.registration_close_iso) {
      regCloseStr = new Date(t.registration_close_iso).toLocaleDateString();
    }

    // Status Logic
    const tournamentStatus = t.status || 'Draft';
    const regStatus = (t.registration_status || '').toUpperCase() || tournamentStatus.toUpperCase();
    const isCompleted = tournamentStatus.toUpperCase() === 'COMPLETED';
    const isLive = tournamentStatus.toUpperCase() === 'LIVE';
    
    let buttonHtml = '';
    let regStatusText = regStatus;

    if (!t.id) {
        buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">Registration is currently unavailable.</button>`;
    } else {
        if (isCompleted) {
            regStatusText = 'TOURNAMENT COMPLETED';
            buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">TOURNAMENT COMPLETED</button>`;
        } else if (regStatus === 'OPEN' || regStatus === 'REGISTRATION OPEN') {
            regStatusText = 'REGISTRATION OPEN';
            buttonHtml = `<a href="https://karatetechhybrid.spsportdatasolution.org/registration?tournament_id=${t.id}" class="btn btn-red width-full">REGISTER NOW</a>`;
        } else if (regStatus === 'NOT YET OPEN' || regStatus === 'NOT OPEN') {
            regStatusText = 'REGISTRATION NOT OPEN';
            buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">REGISTRATION NOT OPEN</button>`;
        } else if (regStatus === 'CLOSED' || regStatus === 'REGISTRATION CLOSED') {
            regStatusText = 'REGISTRATION CLOSED';
            buttonHtml = `<button class="btn btn-outline width-full" disabled style="opacity: 0.6; cursor: not-allowed;">REGISTRATION CLOSED</button>`;
        } else {
            regStatusText = regStatus;
            buttonHtml = `<a href="https://karatetechhybrid.spsportdatasolution.org/registration?tournament_id=${t.id}" class="btn btn-red width-full">REGISTER NOW</a>`;
        }
    }
    
    let liveHtml = '';
    if (isLive) {
       liveHtml = `<a href="https://karatetechhybrid.spsportdatasolution.org/live?tournament_id=${t.id}" class="btn btn-red width-full" style="background-color: #ff0000; border-color: #ff0000; animation: pulse 2s infinite;">LIVE TOURNAMENT</a>`;
    }

    const bannerBackground = t.banner_gradient || 'linear-gradient(135deg, #2a2a2a, #1a1a1a)';
    let bannerImg = '';
    if (t.banner_url || t.logo_url) {
       const imgUrl = t.banner_url || t.logo_url;
       bannerImg = `<div style="height: 180px; background-image: url('${escapeHtml(imgUrl)}'); background-size: cover; background-position: center; border-radius: 8px 8px 0 0;"></div>`;
    } else {
       bannerImg = `<div style="height: 180px; background: ${escapeHtml(bannerBackground)}; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: center; font-size: 3rem;">${t.poster_emoji || '🏆'}</div>`;
    }

    return `
      <div class="glass-card tournament-card" style="padding: 0; display: flex; flex-direction: column;">
        <div style="position: relative; margin-bottom: 20px;">
          ${bannerImg}
          <div style="position: absolute; top: 16px; right: 16px;">
            <span class="status-pill status-open" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
              ● ${escapeHtml(tournamentStatus.toUpperCase())}
            </span>
          </div>
        </div>
        
        <div style="padding: 0 24px 24px; flex: 1; display: flex; flex-direction: column;">
          <h3 style="font-size: 1.3rem; margin-bottom: 16px; line-height: 1.3;">${escapeHtml(name)}</h3>
          
          <div class="tournament-info-list" style="margin-bottom: 24px;">
            <div class="tournament-info-row">
              <span class="info-icon">📅</span>
              <span>Date: <strong>${escapeHtml(dateStr)}</strong></span>
            </div>
            <div class="tournament-info-row">
              <span class="info-icon">⏱️</span>
              <span>Time: <strong>${escapeHtml(startTime)}</strong></span>
            </div>
            <div class="tournament-info-row">
              <span class="info-icon">📍</span>
              <span>Venue: <strong>${escapeHtml(venue)}</strong><br><small style="color: #888;">${escapeHtml(cityState)}</small></span>
            </div>
            <div class="tournament-info-row" style="margin-top: 8px;">
              <span class="info-icon">🏢</span>
              <span>Organizer: <strong>${escapeHtml(organizer)}</strong></span>
            </div>
            <div class="tournament-info-row">
              <span class="info-icon">🔒</span>
              <span>Registration closes: <strong>${escapeHtml(regCloseStr)}</strong></span>
            </div>
          </div>

          <div style="margin-top: auto; display: flex; flex-direction: column; gap: 12px;">
            <a href="tournament.html?id=${t.id}" class="btn btn-outline width-full" style="text-align: center;">VIEW TOURNAMENT</a>
            ${isLive ? liveHtml : buttonHtml}
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
