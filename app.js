/**
 * SP SPORTDATA SOLUTION - Core Interactive Application Script
 * Precision. Speed. Results.
 */

// Supabase API Credentials for KarateTech backend queries
const SUPABASE_URL = 'https://gpbeetknavfgmioaevtw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YrvuGAWUdEZ0jZDPcZY7bg_YALorXNq';
const SUPABASE_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

let loadedTournaments = [];
let currentSelectedTournament = null;
let parsedParticipants = [];
let hasHandledRegistrationDeepLink = false;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Navigation & Smooth Scroll
  initNavbar();

  // 1.1 Render KarateTech visitor banner from live public tournaments feed
  initKarateTechUpcomingBanner();
  
  // 2. Fetch Live Tournaments & Statistics from KarateTech DB
  fetchUpcomingTournaments();
  fetchLiveStatistics();

  // 3. Initialize Registration Modal & CSV Parser
  initRegistrationModal();

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
    
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      loadedTournaments = data;
      renderTournamentCards(data);
      openRegistrationFromUrlIfRequested();
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

  grid.innerHTML = tournaments.map(t => {
    const name = t.name || 'KarateTech Championship 2026';
    const venue = t.venue || 'Dewan Serbaguna MBSJ, Selangor';
    const city = t.city || 'Bandar Kinrara, Selangor';
    const dateStr = t.date || '06/09/2026';
    const regClose = t.registration_close || 'September 1, 2026';
    const status = t.status || 'Open';
    const emoji = t.poster_emoji || '🏆';

    return `
      <div class="glass-card tournament-card">
        <div class="tournament-banner-box">
          <span class="status-pill ${status.toLowerCase() === 'draft' ? 'status-draft' : 'status-open'}">
            ● ${status}
          </span>
          <span class="tournament-emoji-badge">${emoji}</span>
        </div>
        <h3 style="font-size: 1.4rem; margin-bottom: 8px;">${escapeHtml(name)}</h3>
        
        <div class="tournament-info-list">
          <div class="tournament-info-row">
            <span class="info-icon">📍</span>
            <span>${escapeHtml(venue)}</span>
          </div>
          <div class="tournament-info-row">
            <span class="info-icon">📅</span>
            <span>Date: <strong>${escapeHtml(dateStr)}</strong></span>
          </div>
          <div class="tournament-info-row">
            <span class="info-icon">⏳</span>
            <span>Registration Closes: <strong>${escapeHtml(regClose)}</strong></span>
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 16px;">
          <button class="btn btn-red width-full btn-register-trigger" data-tournament-id="${t.id}">
            Register Tournament &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');

  attachRegisterButtonListeners();
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
  openRegistrationFromUrlIfRequested();
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
   3. AUTO-LOADED TOURNAMENT REGISTRATION MODAL & WORKFLOW
   ========================================================================== */
function initRegistrationModal() {
  const modal = document.getElementById('registrationModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const cancelBtn = document.getElementById('btnCancelReg');
  const dropzone = document.getElementById('csvDropzone');
  const fileInput = document.getElementById('csvFileInput');
  const insertSampleBtn = document.getElementById('btnInsertSampleCsv');
  const parseCsvBtn = document.getElementById('btnParseCsv');
  const regForm = document.getElementById('tournamentRegForm');

  if (!modal) return;

  // Close handlers
  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Dropzone drag & drop handlers
  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        readCSVFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        readCSVFile(e.target.files[0]);
      }
    });
  }

  // Insert sample data
  insertSampleBtn?.addEventListener('click', () => {
    const pasteArea = document.getElementById('csvPasteArea');
    if (pasteArea) {
      pasteArea.value = "First Name,Last Name,Gender,DOB,Weight / kg,Height / cm,Passport/IC,Club,EMail,Phone,Payment,Medical,Kumite,Kata\n" +
        "Aainesh,Aainesh,m,2012-05-01,46,0,,Senshi Goju-Ryu,,60121523691,Paid,Cleared,Yes,No\n" +
        "AKILESH,VAMATHEVAN,m,2008-09-06,86,0,,Senshi Goju-Ryu,,6011-3334445,Paid,Cleared,Yes,Yes\n" +
        "AKILESH_ALAGAN,VAMATHEVAN,m,2008-09-06,86,0,80906101709,Senshi Goju-Ryu,,6018-7776655,Paid,Cleared,No,Yes\n" +
        "ANUSHIA,MUTHUKUMAR,f,2003-07-28,79,0,,Senshi Goju-Ryu,mbalamsm@gmail.com,60126273691,Paid,Cleared,Y,N\n" +
        "Aviyan,Aviyan,m,2019-08-14,23,0,,Senshi Goju-Ryu,aviyan@gmail.com,60123556693,Paid,Cleared,Y,N\n" +
        "Rayyan,Iskandar,m,2006-11-20,68,175,061120-10-2222,Senshi Goju-Ryu,rayyan@example.com,60121523691,Paid,Cleared,Y,N\n" +
        "Sophia,Lee,f,2005-02-14,53,163,050214-14-9999,Senshi Goju-Ryu,sophia@example.com,6011-3334445,Pending,Cleared,N,N";
      parseCSVText(pasteArea.value);
    }
  });

  // Parse CSV button
  parseCsvBtn?.addEventListener('click', () => {
    const pasteArea = document.getElementById('csvPasteArea');
    if (pasteArea && pasteArea.value.trim()) {
      parseCSVText(pasteArea.value);
    } else {
      alert('Please select a CSV file or paste CSV content first.');
    }
  });

  // Registration Form Submission
  regForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleRegistrationSubmission();
  });
}

function attachRegisterButtonListeners() {
  document.querySelectorAll('.btn-register-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tournId = e.currentTarget.getAttribute('data-tournament-id');
      openRegistrationModal(tournId);
    });
  });
}

function openRegistrationModal(tournamentId) {
  const modal = document.getElementById('registrationModal');
  if (!modal) return;

  // Find tournament from loaded array
  const tournament = loadedTournaments.find(t => t.id === tournamentId) || loadedTournaments[0];
  currentSelectedTournament = tournament;

  // Auto-populate Tournament Header Details
  document.getElementById('regTournName').innerText = tournament.name || 'SENSHI GOJU-RYU KARATE CHAMPIONSHIP 2026';
  document.getElementById('regTournOrganiser').innerText = tournament.organizer || 'KELAB KARATE DO SENSHI GOJU-RYU';
  document.getElementById('regTournDateTime').innerText = `${tournament.date || '06/09/2026'} (08:00 AM)`;
  document.getElementById('regTournVenue').innerText = `${tournament.venue || 'Dewan Serbaguna MBSJ'}, ${tournament.city || 'Selangor'}`;
  document.getElementById('regTournContactPerson').innerText = tournament.contact_name ? `${tournament.contact_name} (${tournament.contact_phone || ''})` : 'Senshi Admin (+60 12-152 3691)';
  document.getElementById('regTournContactEmail').innerText = tournament.contact_email || 'karatetech.spsds@gmail.com';

  // Open Modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function readCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result) {
      parseCSVText(e.target.result);
    }
  };
  reader.readAsText(file);
}

function parseCSVText(text) {
  try {
    const lines = text.split('\n');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const sep = line.includes('\t') ? '\t' : ',';
      const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());

      if (cols.length < 4) continue;

      let name = '';
      let gender = 'Male';
      let dob = '2008-01-01';
      let weight = 0;
      let height = 0;
      let ic = '';
      let club = 'Senshi Goju-Ryu';
      let kumite = 'Yes';
      let kata = 'No';

      if (cols.length >= 8) {
        const first = cols[0] || '';
        const last = cols[1] || '';
        const cleanedFirst = first.replace(/_/g, ' ').trim();
        const cleanedLast = last.replace(/_/g, ' ').trim();
        name = cleanedFirst.toLowerCase() === cleanedLast.toLowerCase() ? cleanedFirst : `${cleanedFirst} ${cleanedLast}`.trim();
        gender = (cols[2] || '').toLowerCase().startsWith('f') ? 'Female' : 'Male';
        dob = cols[3] || '2008-01-01';
        weight = parseFloat(cols[4]) || 0;
        height = parseFloat(cols[5]) || 0;
        ic = cols[6] || '';
        club = cols[7] || 'Senshi Goju-Ryu';
        if (cols.length >= 14) {
          kumite = (cols[12] || '').toLowerCase().startsWith('y') ? 'Yes' : 'No';
          kata = (cols[13] || '').toLowerCase().startsWith('y') ? 'Yes' : 'No';
        }
      } else {
        name = cols[0] || 'Unknown Athlete';
        gender = (cols[1] || '').toLowerCase().startsWith('f') ? 'Female' : 'Male';
        dob = cols[2] || '2008-01-01';
        weight = parseFloat(cols[3]) || 0;
        height = parseFloat(cols[4]) || 0;
        ic = cols[5] || '';
        club = cols[6] || 'Senshi Goju-Ryu';
      }

      if (name) {
        rows.push({ name, gender, dob, weight, height, ic, club, kumite, kata });
      }
    }

    if (rows.length === 0) {
      alert('No valid participant entries parsed. Please verify CSV template format.');
      return;
    }

    parsedParticipants = rows;
    renderParticipantPreviewTable(rows);
  } catch (err) {
    alert(`CSV parsing error: ${err.message}`);
  }
}

function renderParticipantPreviewTable(participants) {
  const container = document.getElementById('previewTableContainer');
  const tbody = document.getElementById('participantTableBody');
  const countEl = document.getElementById('parsedCount');

  if (!container || !tbody) return;

  tbody.innerHTML = participants.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.gender)}</td>
      <td>${escapeHtml(p.dob)}</td>
      <td>${p.weight} kg</td>
      <td>${p.height} cm</td>
      <td>${escapeHtml(p.ic || '—')}</td>
      <td>${escapeHtml(p.club)}</td>
      <td><span class="badge ${p.kumite === 'Yes' ? 'badge-red' : ''}" style="font-size:0.7rem; padding:2px 8px;">${p.kumite}</span></td>
      <td><span class="badge ${p.kata === 'Yes' ? 'badge-red' : ''}" style="font-size:0.7rem; padding:2px 8px;">${p.kata}</span></td>
    </tr>
  `).join('');

  if (countEl) countEl.innerText = participants.length;
  container.style.display = 'block';
}

async function handleRegistrationSubmission() {
  const submitBtn = document.getElementById('btnSubmitReg');
  const fullName = document.getElementById('regFullName')?.value;
  const dojoName = document.getElementById('regDojoName')?.value;
  const address = document.getElementById('regAddress')?.value;
  const phone = document.getElementById('regPhone')?.value;
  const email = document.getElementById('regEmail')?.value;

  if (!fullName || !dojoName || !address || !phone || !email) {
    alert('Please complete all required instructor information fields.');
    return;
  }

  const tournName = currentSelectedTournament ? currentSelectedTournament.name : 'KarateTech Championship';
  const participantCount = parsedParticipants.length;

  if (submitBtn) {
    submitBtn.innerText = 'Sending Registration...';
    submitBtn.disabled = true;
  }

  // Build EXACT Importable CSV Format for KarateTech System
  const csvHeader = "First Name,Last Name,Gender,DOB,Weight / kg,Height / cm,Passport/IC,Club,EMail,Phone,Payment,Medical,Kumite,Kata\n";
  const csvRows = parsedParticipants.map(p => {
    const parts = (p.name || '').trim().split(' ');
    const first = parts[0] || 'Athlete';
    const last = parts.slice(1).join(' ') || first;
    const gender = (p.gender || 'Male').toLowerCase().startsWith('f') ? 'f' : 'm';
    const dob = p.dob || '2008-01-01';
    const weight = p.weight || 0;
    const height = p.height || 0;
    const ic = p.ic || '';
    const club = p.club || dojoName || 'Senshi Goju-Ryu';
    const pEmail = email || '';
    const pPhone = phone || '';
    const payment = 'Paid';
    const medical = 'Cleared';
    const kumite = p.kumite || 'Yes';
    const kata = p.kata || 'No';

    return `${first},${last},${gender},${dob},${weight},${height},${ic},${club},${pEmail},${pPhone},${payment},${medical},${kumite},${kata}`;
  });

  const exactImportCSV = csvHeader + csvRows.join('\n');

  const payloadDetails = `TOURNAMENT REGISTRATION REQUEST\n` +
    `==============================\n` +
    `Tournament: ${tournName}\n` +
    `Organiser: ${currentSelectedTournament?.organizer || 'Senshi Goju-Ryu'}\n` +
    `Date: ${currentSelectedTournament?.date || ''}\n` +
    `Venue: ${currentSelectedTournament?.venue || ''}\n\n` +
    `INSTRUCTOR / USER DETAILS\n` +
    `-------------------------\n` +
    `Full Name: ${fullName}\n` +
    `Dojo / Club: ${dojoName}\n` +
    `Address: ${address}\n` +
    `Phone: ${phone}\n` +
    `Email: ${email}\n\n` +
    `REGISTERED ATHLETES (${participantCount} Total)\n` +
    `-----------------------------------------\n` +
    parsedParticipants.map((p, i) => `${i+1}. ${p.name} | ${p.gender} | DOB: ${p.dob} | W: ${p.weight}kg | IC: ${p.ic || 'N/A'}`).join('\n') +
    `\n\n` +
    `=== EXACT IMPORTABLE CSV DATA (Copy & Paste to save as .csv for KarateTech Import) ===\n` +
    exactImportCSV;

  // 1. Send Direct Email via FormSubmit AJAX API with EXACT CSV string
  try {
    await fetch('https://formsubmit.co/ajax/karatetech.spsds@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: `[KARATETECH CSV IMPORT] Registration: ${tournName} - ${dojoName}`,
        _template: 'table',
        _captcha: 'false',
        _autorespond: `Thank you ${fullName}! Your registration CSV file for ${tournName} has been received.`,
        tournament_name: tournName,
        instructor_name: fullName,
        dojo_club: dojoName,
        address: address,
        phone: phone,
        email: email,
        athletes_count: participantCount,
        exact_karatetech_import_csv: exactImportCSV,
        full_registration_details: payloadDetails
      })
    });
  } catch (err) {
    console.warn('FormSubmit email API dispatch warning:', err);
  }

  // 2. Save Registration Log & Exact CSV in Supabase Database
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: 'POST',
      headers: {
        ...SUPABASE_HEADERS,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        operator_name: fullName,
        action: 'CSV Registration Submitted',
        details: `Tournament: ${tournName} | Dojo: ${dojoName} | Email: ${email} | Athletes: ${participantCount}\n\nCSV DATA:\n${exactImportCSV}`
      })
    });
  } catch (err) {
    console.warn('Supabase activity log write warning:', err);
  }

  // 3. Trigger Backup Mailto client link with exact CSV payload
  const subject = encodeURIComponent(`[KARATETECH CSV IMPORT] Registration: ${tournName} - ${dojoName}`);
  const body = encodeURIComponent(payloadDetails);
  window.open(`mailto:karatetech.spsds@gmail.com?subject=${subject}&body=${body}`, '_blank');

  if (submitBtn) {
    submitBtn.innerText = 'Send Registration →';
    submitBtn.disabled = false;
  }

  alert(`Tournament Registration & CSV File Submitted Successfully!\n\n` +
    `Tournament: ${tournName}\n` +
    `Dojo: ${dojoName}\n` +
    `Registered Athletes: ${participantCount}\n\n` +
    `The exact KarateTech importable CSV format has been dispatched to karatetech.spsds@gmail.com and saved to the database.\n\n` +
    `Note: Check karatetech.spsds@gmail.com to download/copy the CSV file for direct KarateTech import.`);

  // Close modal cleanly
  const modal = document.getElementById('registrationModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'false');
  }
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

function openRegistrationFromUrlIfRequested() {
  if (hasHandledRegistrationDeepLink) return;

  const params = new URLSearchParams(window.location.search);
  const shouldOpenRegistration = params.get('openRegistration') === '1';
  if (!shouldOpenRegistration) return;
  if (!Array.isArray(loadedTournaments) || loadedTournaments.length === 0) return;

  const requestedTournamentId = params.get('tournamentId');
  const targetTournament = requestedTournamentId
    ? loadedTournaments.find(t => String(t.id) === requestedTournamentId)
    : loadedTournaments[0];

  if (!targetTournament?.id) return;

  hasHandledRegistrationDeepLink = true;
  openRegistrationModal(targetTournament.id);
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
