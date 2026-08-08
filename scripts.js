/* scripts.js — Batch 3 Part 1
   Features in this part:
   - DOM ready wiring
   - Nav toggle
   - Live clock & visitor counter
   - Announcements renderer (admin editable)
   - Carousel (Home & Gallery)
   - Gallery lightbox + keyboard nav
   - Booking form + validation + QR ticket generation (Google Chart API)
   - Donation form + history + receipt generation (demo)
   - Contact form (demo)
   - Admin local login (Option A) + admin dashboard rendering (bookings/messages/donations/announcements/stats)
   - Basic Audio player wiring (playlist management)
   - Simple chatbot with canned Q&A
   - Site-wide search (events/services/gallery)
   - Utilities
*/

/* =========================
   Configuration & Keys
   ========================= */
const CONFIG = {
  admin: { username: 'admin', password: 'temple123' }, // Option A (local)
  storageKeys: {
    bookings: 'temple_bookings_v2',
    messages: 'temple_messages_v2',
    donations: 'temple_donations_v2',
    announcements: 'temple_announcements_v2',
    services: 'temple_services_v2',
    events: 'temple_events_v2',
    ratings: 'temple_ratings_v2',
    audioPlaylist: 'temple_audio_v2',
    theme: 'temple_theme_v2'
  },
  qrBase: 'https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=' // + encodeURIComponent(...)
};

/* =========================
   Utility functions
   ========================= */
function $(sel, ctx=document) { return ctx.querySelector(sel); }
function $all(sel, ctx=document) { return Array.from(ctx.querySelectorAll(sel)); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key, fallback=[]) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null ? fallback : v;
  } catch(e){ return fallback; }
}
function uid(prefix='id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}
function escapeHtml(str='') {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

/* =========================
   DOMContentLoaded — init
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initTheme();
  initClock();
  initVisitorCounter();
  renderAnnouncements();
  initCarousel();             // Home + Gallery carousels
  initLightbox();             // Gallery lightbox
  initBookingForm();          // Visit / Booking page
  initDonationForm();         // donations page
  initContactForm();          // contact page
  initAdmin();                // admin login & dashboard
  initEventsAndCountdowns();  // events page
  initSearch();               // site-wide search
  initAudioPlayer();          // audio-guide page
  initChatbot();              // simple chatbot on FAQ
  initServicesAndSlots();     // services page (basic)
  renderGalleryIfPresent();   // optional enhancements
});

/* =========================
   NAV TOGGLE
   ========================= */
function initNavToggle() {
  $all('.nav-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = document.getElementById('mainNav');
      if (!nav) return;
      nav.classList.toggle('open');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
    });
  });
}

/* =========================
   THEME (light/dark)
   ========================= */
function initTheme() {
  const key = CONFIG.storageKeys.theme;
  const saved = localStorage.getItem(key);
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  // add toggle if exists
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', now === 'dark' ? 'dark' : '');
      localStorage.setItem(key, now === 'dark' ? 'dark' : 'light');
    });
  }
}

/* =========================
   LIVE CLOCK
   ========================= */
function initClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  function tick() {
    const now = new Date();
    // show hours:minutes:seconds plus local date short
    el.textContent = now.toLocaleTimeString();
  }
  tick();
  setInterval(tick, 1000);
}

/* =========================
   VISITOR COUNTER (per-browser)
   ========================= */
function initVisitorCounter() {
  const key = 'temple_visits_local_v2';
  const count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  localStorage.setItem(key, String(count));
  const el = document.getElementById('visitorCount');
  if (el) el.textContent = count;
  // update admin stats if open later
}

/* =========================
   ANNOUNCEMENTS
   ========================= */
function renderAnnouncements() {
  const container = document.getElementById('announcements');
  if (!container) return;
  const announcements = load(CONFIG.storageKeys.announcements, [
    { id:'a1', text:'Welcome — temple timings updated for festival season!', created:new Date().toISOString() }
  ]);
  container.innerHTML = announcements.map(a => `
    <div class="announcement-item">
      <strong>${escapeHtml(a.text)}</strong>
      <div class="muted">${fmtDate(a.created)}</div>
    </div>
  `).join('');
}

/* =========================
   CAROUSEL IMPLEMENTATION
   - supports any element with .carousel container
   - child track: .carousel-track with .carousel-slide items
   - auto-play, prev/next buttons, indicators
   ========================= */
function initCarousel() {
  const carousels = $all('.carousel');
  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    if (!track) return;
    const slides = Array.from(track.children);
    let current = 0, autoplay = true, interval = null;
    const speed = parseInt(carousel.dataset.speed || '4000', 10);

    // Build indicators if missing
    let indicators = carousel.querySelector('.carousel-indicators');
    if (!indicators) {
      indicators = document.createElement('div');
      indicators.className = 'carousel-indicators';
      slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.dataset.index = i;
        dot.tabIndex = 0;
        indicators.appendChild(dot);
        dot.addEventListener('click', () => goTo(i));
        dot.addEventListener('keydown', (e) => { if (e.key === 'Enter') goTo(i); });
      });
      carousel.appendChild(indicators);
    }

    // Prev & Next buttons
    let prevBtn = carousel.querySelector('.carousel-btn.prev');
    let nextBtn = carousel.querySelector('.carousel-btn.next');
    if (!prevBtn) {
      prevBtn = document.createElement('button'); prevBtn.className = 'carousel-btn prev'; prevBtn.innerHTML='◀';
      carousel.appendChild(prevBtn);
    }
    if (!nextBtn) {
      nextBtn = document.createElement('button'); nextBtn.className = 'carousel-btn next'; nextBtn.innerHTML='▶';
      carousel.appendChild(nextBtn);
    }
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    function update() {
      const width = carousel.clientWidth;
      track.style.transform = `translateX(-${current * width}px)`;
      // update indicators
      indicators.querySelectorAll('div').forEach((d,i) => d.classList.toggle('active', i===current));
    }

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      update();
      resetAutoplay();
    }
    function prev() { goTo(current - 1); }
    function next() { goTo(current + 1); }

    function startAutoplay() {
      if (!autoplay) return;
      interval = setInterval(() => { goTo(current + 1); }, speed);
    }
    function stopAutoplay() { if (interval) { clearInterval(interval); interval = null; } }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    // responsive: ensure slide width is correct on resize
    window.addEventListener('resize', update);
    // start
    update();
    startAutoplay();
    // pause on hover
    carousel.addEventListener('mouseenter', () => stopAutoplay());
    carousel.addEventListener('mouseleave', () => startAutoplay());
  });
}

/* =========================
   LIGHTBOX (Gallery)
   - expects #gallery with img children and #lightbox element in page
   ========================= */
function initLightbox() {
  const gallery = document.getElementById('gallery');
  const lightbox = document.getElementById('lightbox');
  if (!gallery || !lightbox) return;

  const images = Array.from(gallery.querySelectorAll('img'));
  const lbImage = lightbox.querySelector('.lb-image');
  let idx = -1;

  function open(i) {
    idx = i;
    lbImage.src = images[idx].src;
    lbImage.alt = images[idx].alt || '';
    lightbox.setAttribute('aria-hidden','false');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lightbox.setAttribute('aria-hidden','true');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    idx = -1;
  }
  function next() { if (idx < images.length -1) open(idx + 1); }
  function prev() { if (idx > 0) open(idx - 1); }

  images.forEach((img, i) => {
    img.addEventListener('click', ()=> open(i));
    img.addEventListener('keydown', (e)=> { if (e.key === 'Enter') open(i); });
  });

  const closeBtn = lightbox.querySelector('.lb-close');
  const nextBtn = lightbox.querySelector('.lb-next');
  const prevBtn = lightbox.querySelector('.lb-prev');
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });
}

/* =========================
   BOOKING FORM + QR Ticket
   - Stores bookings in localStorage
   - Generates a "QR" using Google Chart API with booking payload
   ========================= */
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;
  const messageEl = document.getElementById('bookingMessage');
  const ticketArea = document.getElementById('ticketArea');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const phone = form.querySelector('#phone').value.trim();
    const date = form.querySelector('#date').value;
    const slot = form.querySelector('#timeSlot') ? form.querySelector('#timeSlot').value : (form.querySelector('#timeSlot') ? form.querySelector('#timeSlot').value : '');
    const visitors = form.querySelector('#visitors').value;
    if (name.length < 2) return show(form, 'Please enter your name', false);
    if (!/^\d{10}$/.test(phone)) return show(form, 'Enter a 10-digit phone number', false);
    if (!date) return show(form, 'Select a date', false);

    const booking = {
      id: uid('BK'),
      name, email, phone, date, slot, visitors,
      created: new Date().toISOString()
    };
    const bookings = load(CONFIG.storageKeys.bookings, []);
    bookings.unshift(booking);
    save(CONFIG.storageKeys.bookings, bookings);
    show(form, 'Booking confirmed (demo). Ticket generated below.', true);
    form.reset();
    // Render ticket with QR
    renderTicket(booking, ticketArea);
    // update admin if open
    refreshAdminBookings();
  });

  function show(form, txt, ok=false) {
    if (!messageEl) return;
    messageEl.textContent = txt;
    messageEl.style.color = ok ? 'green' : 'crimson';
    setTimeout(()=> messageEl.textContent = '', 7000);
  }

  function renderTicket(booking, container) {
    if (!container) return;
    const payload = `BookingID:${booking.id};Name:${booking.name};Date:${booking.date};Slot:${booking.slot};Visitors:${booking.visitors}`;
    const qrUrl = CONFIG.qrBase + encodeURIComponent(payload);
    container.innerHTML = `
      <div class="ticket">
        <h3>Booking Ticket</h3>
        <div><strong>${escapeHtml(booking.name)}</strong></div>
        <div><small>${escapeHtml(booking.date)} • ${escapeHtml(booking.slot || '')}</small></div>
        <div class="qr-box"><img src="${qrUrl}" alt="QR ticket for ${escapeHtml(booking.id)}"></div>
        <small>Booking ID: ${escapeHtml(booking.id)}</small>
      </div>
    `;
  }

  // If a booking already exists in storage that we should display latest ticket:
  const recent = load(CONFIG.storageKeys.bookings, [])[0];
  if (recent && ticketArea) renderTicket(recent, ticketArea);
}

/* =========================
   DONATION FORM + HISTORY
   - demo-only: stores donations in localStorage
   - generates a simple on-screen receipt
   ========================= */
function initDonationForm() {
  const form = document.getElementById('donationForm');
  if (!form) return;
  const presetBtns = Array.from(document.querySelectorAll('.preset-buttons .preset, .preset'));
  const messageEl = document.getElementById('donationMessage');
  const historyEl = document.getElementById('donationHistory');

  // preset handlers
  presetBtns.forEach(btn => btn.addEventListener('click', () => {
    const amount = btn.dataset.amount || btn.getAttribute('data-amount');
    const amountInput = document.getElementById('donationAmount');
    if (amountInput) amountInput.value = amount;
  }));

  // load and render history initially
  renderDonationHistory();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (form.querySelector('#donorName')||{}).value?.trim();
    const email = (form.querySelector('#donorEmail')||{}).value?.trim();
    const amount = Number((form.querySelector('#donationAmount')||{}).value || 0);
    const note = (form.querySelector('#donationNote')||{}).value?.trim();
    if (!name || !email || amount <= 0) return show('Complete all fields and enter amount.');
    const donation = {
      id: uid('DN'),
      name, email, amount, note,
      created: new Date().toISOString()
    };
    const donations = load(CONFIG.storageKeys.donations, []);
    donations.unshift(donation);
    save(CONFIG.storageKeys.donations, donations);
    show('Thank you! Donation recorded (demo). Receipt below.');
    form.reset();
    renderDonationHistory();
    // update admin
    refreshAdminDonations();
  });

  function show(txt) {
    if (!messageEl) return;
    messageEl.textContent = txt;
    messageEl.style.color = 'green';
    setTimeout(()=> messageEl.textContent = '', 7000);
  }

  function renderDonationHistory() {
    if (!historyEl) return;
    const donations = load(CONFIG.storageKeys.donations, []);
    if (!donations.length) { historyEl.innerHTML = '<div class="muted">No donations yet.</div>'; return; }
    historyEl.innerHTML = donations.map(d => `
      <div class="donation-entry">
        <strong>₹${escapeHtml(d.amount)}</strong> — ${escapeHtml(d.name)}
        <div class="muted">${fmtDate(d.created)}</div>
        <div>${escapeHtml(d.note||'')}</div>
      </div>
    `).join('');
  }
}

/* =========================
   CONTACT FORM (simple demo)
   ========================= */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const msgEl = document.getElementById('contactMessage');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#c_name').value.trim();
    const email = form.querySelector('#c_email').value.trim();
    const message = form.querySelector('#c_message').value.trim();
    if (!name || !email || !message) return show('Please complete all fields', false);
    // store message
    const messages = load(CONFIG.storageKeys.messages, []);
    messages.unshift({ id: uid('MSG'), name, email, message, created: new Date().toISOString() });
    save(CONFIG.storageKeys.messages, messages);
    show('Message sent (demo). Thank you!', true);
    form.reset();
    // refresh admin view
    refreshAdminMessages();
  });
  function show(text, ok=false) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.style.color = ok ? 'green' : 'crimson';
    setTimeout(()=> msgEl.textContent = '', 6000);
  }
}

/* =========================
   ADMIN (local) — login + dashboard render
   - Option A: local credentials, stored in CONFIG.admin
   - On login, reveal #adminPanel and render bookings/messages/donations/stats
   ========================= */
function initAdmin() {
  const loginForm = document.getElementById('adminLoginForm');
  const loginSection = document.getElementById('adminLoginSection');
  const adminPanel = document.getElementById('adminPanel');
  const loginMsg = document.getElementById('adminLoginMessage');
  const logoutBtn = document.getElementById('adminLogout');

  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    if (u === CONFIG.admin.username && p === CONFIG.admin.password) {
      // success
      loginSection.hidden = true;
      adminPanel.hidden = false;
      localStorage.setItem('temple_admin_logged_in', '1');
      renderAdminPanel();
    } else {
      loginMsg.textContent = 'Invalid credentials (demo)';
      loginMsg.style.color = 'crimson';
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('temple_admin_logged_in');
      document.getElementById('adminLoginSection').hidden = false;
      document.getElementById('adminPanel').hidden = true;
    });
  }

  // auto-login if flag exists
  if (localStorage.getItem('temple_admin_logged_in') === '1') {
    document.getElementById('adminLoginSection').hidden = true;
    document.getElementById('adminPanel').hidden = false;
    renderAdminPanel();
  }
}

/* Admin helpers to refresh dynamic parts — used after actions */
function refreshAdminBookings() {
  const el = document.getElementById('adminBookings');
  if (!el) return;
  const bookings = load(CONFIG.storageKeys.bookings, []);
  if (!bookings.length) { el.innerHTML = '<div class="muted">No bookings yet.</div>'; return; }
  el.innerHTML = bookings.map(b => `
    <div class="admin-item">
      <strong>${escapeHtml(b.name)}</strong> <small>${escapeHtml(b.date)} ${escapeHtml(b.slot||'')}</small>
      <div class="muted">ID: ${escapeHtml(b.id)} • ${fmtDate(b.created)}</div>
      <div><button class="btn small-btn" data-action="delete-booking" data-id="${escapeHtml(b.id)}">Delete</button></div>
    </div>
  `).join('');

  // attach delete handlers
  el.querySelectorAll('[data-action="delete-booking"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      let bookings = load(CONFIG.storageKeys.bookings, []);
      bookings = bookings.filter(x => x.id !== id);
      save(CONFIG.storageKeys.bookings, bookings);
      refreshAdminBookings();
    });
  });
}

function refreshAdminMessages() {
  const el = document.getElementById('adminMessages');
  if (!el) return;
  const messages = load(CONFIG.storageKeys.messages, []);
  if (!messages.length) { el.innerHTML = '<div class="muted">No messages yet.</div>'; return; }
  el.innerHTML = messages.map(m => `
    <div class="admin-item">
      <strong>${escapeHtml(m.name)}</strong> <small>${fmtDate(m.created)}</small>
      <div>${escapeHtml(m.message)}</div>
      <div><button class="btn small-btn" data-action="delete-message" data-id="${escapeHtml(m.id)}">Delete</button></div>
    </div>
  `).join('');
  el.querySelectorAll('[data-action="delete-message"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      let messages = load(CONFIG.storageKeys.messages, []);
      messages = messages.filter(x => x.id !== id);
      save(CONFIG.storageKeys.messages, messages);
      refreshAdminMessages();
    });
  });
}

function refreshAdminDonations() {
  const el = document.getElementById('adminDonations');
  if (!el) return;
  const donations = load(CONFIG.storageKeys.donations, []);
  if (!donations.length) { el.innerHTML = '<div class="muted">No donations yet.</div>'; return; }
  el.innerHTML = donations.map(d => `
    <div class="admin-item">
      <strong>₹${escapeHtml(d.amount)}</strong> — ${escapeHtml(d.name)}
      <div class="muted">${fmtDate(d.created)}</div>
      <div><button class="btn small-btn" data-action="delete-donation" data-id="${escapeHtml(d.id)}">Delete</button></div>
    </div>
  `).join('');
  el.querySelectorAll('[data-action="delete-donation"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      let donations = load(CONFIG.storageKeys.donations, []);
      donations = donations.filter(x => x.id !== id);
      save(CONFIG.storageKeys.donations, donations);
      refreshAdminDonations();
    });
  });
}

function renderAdminPanel() {
  refreshAdminBookings();
  refreshAdminMessages();
  refreshAdminDonations();
  renderAdminStats();
  // announcement save handler
  const saveBtn = document.getElementById('saveAnnouncement');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const txt = document.getElementById('announcementText').value.trim();
      if (!txt) return alert('Enter announcement text');
      const anns = load(CONFIG.storageKeys.announcements, []);
      anns.unshift({ id: uid('ANN'), text: txt, created: new Date().toISOString() });
      save(CONFIG.storageKeys.announcements, anns);
      alert('Announcement saved');
      document.getElementById('announcementText').value = '';
      renderAnnouncements();
    });
  }
}

function renderAdminStats() {
  const el = document.getElementById('adminStats');
  if (!el) return;
  const bookings = load(CONFIG.storageKeys.bookings, []);
  const donations = load(CONFIG.storageKeys.donations, []);
  const messages = load(CONFIG.storageKeys.messages, []);
  const visitors = parseInt(localStorage.getItem('temple_visits_local_v2') || '0', 10);
  el.innerHTML = `
    <div><strong>Bookings:</strong> ${bookings.length}</div>
    <div><strong>Donations:</strong> ${donations.length} (Total ₹${donations.reduce((s,d)=>s+(d.amount||0),0)})</div>
    <div><strong>Messages:</strong> ${messages.length}</div>
    <div><strong>Visitor (browser):</strong> ${visitors}</div>
  `;
}

/* =========================
   EVENTS + COUNTDOWNS
   - Demo events list stored in localStorage or default
   ========================= */
function initEventsAndCountdowns() {
  const eventsListEl = document.getElementById('eventsList');
  const countdownListEl = document.getElementById('countdownList');
  const defaultEvents = [
    { id: 'ev1', title: 'Annual Temple Festival', date: '2025-12-12', time: '06:00', description: 'Main festival with procession and special rituals.' },
    { id: 'ev2', title: 'Full Moon Pooja', date: '2025-11-15', time: '18:00', description: 'Special pooja on full moon night.' },
    { id: 'ev3', title: 'Classical Music Evening', date: '2025-10-05', time: '17:30', description: 'Artists perform in courtyard.' }
  ];
  let events = load(CONFIG.storageKeys.events, defaultEvents);
  // save back defaults on first run
  save(CONFIG.storageKeys.events, events);

  if (eventsListEl) {
    eventsListEl.innerHTML = events.map(ev => `
      <div class="event-card">
        <h3>${escapeHtml(ev.title)}</h3>
        <div class="event-meta">${escapeHtml(ev.date)} • ${escapeHtml(ev.time)}</div>
        <p>${escapeHtml(ev.description)}</p>
      </div>
    `).join('');
  }

  if (countdownListEl) {
    countdownListEl.innerHTML = events.map(ev => `
      <div class="countdown-box" data-ev="${escapeHtml(ev.id)}">
        <h4>${escapeHtml(ev.title)}</h4>
        <div class="countdown-time" id="cd_${escapeHtml(ev.id)}">—</div>
        <div class="muted">${escapeHtml(ev.date)}</div>
      </div>
    `).join('');
    // start interval to update countdowns
    function updateCountdowns() {
      events.forEach(ev => {
        const el = document.getElementById(`cd_${ev.id}`);
        if (!el) return;
        const target = new Date(ev.date + 'T00:00:00'); // midnight local
        const diff = target - new Date();
        if (diff <= 0) {
          el.textContent = 'Happening today';
          return;
        }
        const days = Math.floor(diff / (1000*60*60*24));
        const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
        const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
        el.textContent = `${days}d ${hours}h ${mins}m`;
      });
    }
    updateCountdowns();
    setInterval(updateCountdowns, 60*1000); // update mins
  }
}

/* =========================
   SEARCH (site-wide)
   - searches events, services, gallery alt texts
   ========================= */
function initSearch() {
  const searchInput = document.getElementById('siteSearch');
  const searchBtn = document.getElementById('searchBtn');
  if (!searchInput || !searchBtn) return;

  searchBtn.addEventListener('click', () => {
    const q = (searchInput.value || '').trim().toLowerCase();
    if (!q) return alert('Enter search keywords');
    // search events
    const events = load(CONFIG.storageKeys.events, []);
    const services = load(CONFIG.storageKeys.services, []);
    const galleryImgs = $all('#gallery img').map(i => ({src:i.src, alt:i.alt||''}));
    const results = [];
    events.forEach(ev => { if ((ev.title+ev.description).toLowerCase().includes(q)) results.push({type:'Event', title:ev.title, link:'events.html'}); });
    services.forEach(s => { if ((s.title+s.description).toLowerCase().includes(q)) results.push({type:'Service', title:s.title, link:'services.html'}); });
    galleryImgs.forEach(g => { if (g.alt.toLowerCase().includes(q)) results.push({type:'Gallery', title:g.alt, link:'gallery.html'}); });
    if (!results.length) return alert('No results found (demo).');
    // Show results in a simple popup
    const html = results.map(r => `<div><strong>${escapeHtml(r.type)}</strong>: <a href="${escapeHtml(r.link)}">${escapeHtml(r.title)}</a></div>`).join('');
    showModal('Search Results', html);
  });
}

/* =========================
   AUDIO PLAYER
   - uses #audioElement, #audioList, #trackTitle on audio-guide page
   ========================= */
function initAudioPlayer() {
  const audioEl = document.getElementById('audioElement');
  const listEl = document.getElementById('audioList');
  const titleEl = document.getElementById('trackTitle');
  if (!audioEl || !listEl) return;

  // default playlist (demo)
  const defaultPlaylist = [
    { id:'t1', title:'Temple Intro', src:'audio/guide1.mp3' },
    { id:'t2', title:'History Segment', src:'audio/guide2.mp3' },
    { id:'t3', title:'Architecture Tour', src:'audio/guide3.mp3' }
  ];
  let playlist = load(CONFIG.storageKeys.audioPlaylist, defaultPlaylist);
  save(CONFIG.storageKeys.audioPlaylist, playlist);

  let currentIndex = 0;
  function renderList() {
    listEl.innerHTML = playlist.map((t, i) => `<li data-index="${i}" class="${i===currentIndex? 'active':''}">${escapeHtml(t.title)}</li>`).join('');
    titleEl.textContent = playlist[currentIndex]?.title || '—';
  }
  function playIndex(i) {
    if (i < 0 || i >= playlist.length) return;
    currentIndex = i;
    audioEl.src = playlist[currentIndex].src;
    audioEl.play().catch(()=>{ /* ignore autoplay errors in browsers */ });
    renderList();
  }

  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const i = Number(li.dataset.index);
    playIndex(i);
  });

  // prev/next buttons if present
  const prevBtn = document.getElementById('prevTrack');
  const nextBtn = document.getElementById('nextTrack');
  if (prevBtn) prevBtn.addEventListener('click', () => playIndex(currentIndex-1));
  if (nextBtn) nextBtn.addEventListener('click', () => playIndex(currentIndex+1));

  // initialize
  renderList();
  // load first track but don't autoplay unless user clicks
  audioEl.src = playlist[0].src;
}

/* =========================
   SIMPLE CHATBOT
   - uses #chatbotRoot to insert UI
   - canned Q&A stored locally
   ========================= */
function initChatbot() {
  const root = document.getElementById('chatbotRoot');
  if (!root) return;

  // canned Q&A
  const qa = [
    { q: 'timings', a: 'Morning: 06:00–12:00. Evening: 16:00–20:00. Festival timings will be announced.' },
    { q: 'donate', a: 'Use the Donate page. For production, we integrate payment gateways.' },
    { q: 'photography', a: 'Photography rules depend on the sanctum. Please follow signs & priest guidance.' },
    { q: 'accessibility', a: 'Some gates are wheelchair accessible. Check the Map page for accessible routes.' },
    { q: 'booking', a: 'Use the Visit / Booking page to reserve a slot. Booking ID and QR will be generated.' }
  ];

  // build UI
  root.innerHTML = `
    <div class="chatbot-launcher" id="chatbotLauncher" title="Assistant">💬</div>
    <div class="chatbot-window hidden" id="chatbotWindow" aria-hidden="true">
      <div class="chat-header">
        <div>Temple Assistant</div>
        <button id="closeChat" aria-label="Close" style="background:transparent;border:0;color:white">✕</button>
      </div>
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg bot">Namaste! Ask me about timings, bookings, donations and more.</div>
      </div>
      <div class="chat-input-area">
        <input id="chatInput" placeholder="Type a question (e.g. timings, donate)" />
        <button id="sendChat" class="btn">Send</button>
      </div>
    </div>
  `;
  const launcher = document.getElementById('chatbotLauncher');
  const windowEl = document.getElementById('chatbotWindow');
  const closeBtn = document.getElementById('closeChat');
  const sendBtn = document.getElementById('sendChat');
  const input = document.getElementById('chatInput');
  const messagesEl = document.getElementById('chatMessages');

  function open() {
    windowEl.classList.remove('hidden');
    windowEl.style.display = 'flex';
    windowEl.setAttribute('aria-hidden','false');
  }
  function close() {
    windowEl.classList.add('hidden');
    windowEl.style.display = 'none';
    windowEl.setAttribute('aria-hidden','true');
  }
  launcher.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  function postUser(text) {
    const el = document.createElement('div'); el.className='chat-msg user'; el.textContent = text;
    messagesEl.appendChild(el); messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function postBot(text) {
    const el = document.createElement('div'); el.className='chat-msg bot'; el.textContent = text;
    messagesEl.appendChild(el); messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  sendBtn.addEventListener('click', () => {
    const q = input.value.trim();
    if (!q) return;
    postUser(q);
    // find best canned answer (contains keyword)
    const found = qa.find(x => q.toLowerCase().includes(x.q));
    if (found) {
      setTimeout(()=> postBot(found.a), 400);
    } else {
      setTimeout(()=> postBot('Sorry — I can help with timings, bookings, donations, accessibility and photography rules.'), 600);
    }
    input.value = '';
  });
}

/* =========================
   SERVICES & SLOT BOOKINGS
   - simple demo: renders services and allows booking via the service form
   ========================= */
function initServicesAndSlots() {
  const grid = document.getElementById('servicesGrid');
  const svcSelect = document.getElementById('svc_service');
  const svcForm = document.getElementById('serviceBookingForm');
  const svcMsg = document.getElementById('svcMessage');
  if (!grid || !svcSelect || !svcForm) return;

  const defaultServices = [
    { id:'s1', title:'Archana', description:'Personalized archana by priest. Includes name chanting.'},
    { id:'s2', title:'Abhishekam', description:'Special abhishekam with flowers & milk.'},
    { id:'s3', title:'Seva Offering', description:'Community seva and prasadam.'},
  ];
  let services = load(CONFIG.storageKeys.services, defaultServices);
  save(CONFIG.storageKeys.services, services);

  grid.innerHTML = services.map(s => `
    <div class="service-card">
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.description)}</p>
      <button class="btn svc-book" data-id="${escapeHtml(s.id)}">Book</button>
    </div>
  `).join('');

  svcSelect.innerHTML = `<option value="">Choose a service</option>` + services.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`).join('');

  // clicking on "Book" copies choice to form
  grid.querySelectorAll('.svc-book').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.id;
      svcSelect.value = id;
      svcForm.querySelector('#svc_name').focus();
    });
  });

  svcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = svcForm.querySelector('#svc_name').value.trim();
    const email = svcForm.querySelector('#svc_email').value.trim();
    const serviceId = svcForm.querySelector('#svc_service').value;
    const date = svcForm.querySelector('#svc_date').value;
    const slot = svcForm.querySelector('#svc_slot').value;
    if (!name || !email || !serviceId || !date) return svcMsg.textContent = 'Complete all fields';

    const service = services.find(s => s.id === serviceId);
    const booking = {
      id: uid('SV'),
      name, email, serviceId, serviceTitle:service?.title || '', date, slot,
      created: new Date().toISOString()
    };
    // store into same bookings list for admin convenience
    const bookings = load(CONFIG.storageKeys.bookings, []);
    bookings.unshift(booking);
    save(CONFIG.storageKeys.bookings, bookings);
    svcMsg.textContent = 'Service slot booked (demo).';
    svcForm.reset();
    refreshAdminBookings();
  });
}

/* =========================
   GALLERY small enhancement
   - optionally, create a carousel on gallery page if requested
   ========================= */
function renderGalleryIfPresent() {
  // This is intentionally lightweight. The galleries/carousels are initialized via initCarousel()
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  // ensure each image has tabindex for accessibility
  $all('#gallery img').forEach(img => {
    if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex','0');
  });
}

/* =========================
   MODAL helper (simple)
   ========================= */
function showModal(title, htmlContent) {
  // create overlay
  const overlay = document.createElement('div');
  overlay.style.position='fixed';
  overlay.style.inset='0';
  overlay.style.background='rgba(0,0,0,0.6)';
  overlay.style.display='flex';
  overlay.style.alignItems='center';
  overlay.style.justifyContent='center';
  overlay.style.zIndex='3000';
  const box = document.createElement('div');
  box.style.background='white';
  box.style.padding='1rem';
  box.style.borderRadius='8px';
  box.style.maxWidth='90%';
  box.style.maxHeight='80%';
  box.style.overflow='auto';
  box.innerHTML = `<h3>${escapeHtml(title)}</h3><div>${htmlContent}</div><div style="text-align:right;margin-top:1rem"><button class="btn" id="modalClose">Close</button></div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById('modalClose').addEventListener('click', ()=> document.body.removeChild(overlay));
}

/* ============================================
   BATCH 3 PART 2 — EXTRA FEATURES & UTILITIES
============================================ */

/* =========================
   FEEDBACK / RATING SYSTEM
   ========================= */
function initRatings() {
  const ratingBoxes = $all('.rating-box');
  if (!ratingBoxes.length) return;

  let ratings = load(CONFIG.storageKeys.ratings, []);

  ratingBoxes.forEach(box => {
    const itemId = box.dataset.item; // unique item
    const stars = Array.from(box.querySelectorAll('.star'));

    // Load saved rating (if any)
    const saved = ratings.find(r => r.item === itemId)?.value || 0;
    fillStars(saved);

    stars.forEach((star, i) => {
      star.addEventListener('click', () => {
        const val = i + 1;
        saveRating(itemId, val);
        fillStars(val);
      });
    });

    function fillStars(n) {
      stars.forEach((s, idx) => {
        s.classList.toggle('filled', idx < n);
      });
    }
  });

  function saveRating(item, value) {
    ratings = load(CONFIG.storageKeys.ratings, []);
    const existing = ratings.find(r => r.item === item);
    if (existing) existing.value = value;
    else ratings.push({ item, value });
    save(CONFIG.storageKeys.ratings, ratings);
  }
}

/* =========================
   MAP PAGE (interactive)
   ========================= */
function initMap() {
  const mapImg = document.getElementById('mapImage');
  const mapInfo = document.getElementById('mapInfo');
  if (!mapImg || !mapInfo) return;

  const hotspots = [
    { x: 42, y: 30, title: 'Main Entrance', desc: 'Main entry point with ticket counter nearby.' },
    { x: 65, y: 50, title: 'Sanctum', desc: 'Central sanctum with deity darshan.' },
    { x: 20, y: 65, title: 'Parking Area', desc: 'Two-wheeler & four-wheeler parking.' },
    { x: 75, y: 20, title: 'Prasadam Counter', desc: 'Prasadam distribution & donation office.' }
  ];

  // Create hotspot buttons
  hotspots.forEach(h => {
    const btn = document.createElement('button');
    btn.style.position = 'absolute';
    btn.style.left = h.x + '%';
    btn.style.top = h.y + '%';
    btn.style.width = '18px';
    btn.style.height = '18px';
    btn.style.borderRadius = '50%';
    btn.style.background = 'rgba(255,255,255,0.9)';
    btn.style.border = '2px solid var(--primary)';
    btn.style.cursor = 'pointer';
    btn.title = h.title;
    btn.dataset.title = h.title;
    btn.dataset.desc = h.desc;
    btn.className = 'map-hotspot';
    mapImg.parentElement.appendChild(btn);

    btn.addEventListener('click', () => {
      mapInfo.innerHTML = `
        <h3>${escapeHtml(h.title)}</h3>
        <p>${escapeHtml(h.desc)}</p>
      `;
    });
  });
}

/* =========================
   QR SCAN DEMO (admin)
   - Opens a small prompt to "scan" (paste QR payload)
   ========================= */
function initQRScanDemo() {
  const btn = document.getElementById('simulateQR');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const text = prompt('Paste QR content to simulate scan:');
    if (!text) return;
    showModal('QR Scan Result', `<pre>${escapeHtml(text)}</pre>`);
  });
}

/* =========================
   CAROUSEL FIX ON RESIZE
========================= */
window.addEventListener('resize', () => {
  const tracks = $all('.carousel-track');
  tracks.forEach(track => {
    track.style.transition = 'none';
    setTimeout(() => {
      track.style.transition = '';
    }, 50);
  });
});

/* =========================
   SMOOTH SCROLL FOR ANCHOR LINKS
   ========================= */
$all('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  });
});

/* =========================
   PAGE-GUARD CALLS
   (Ensures features run only where needed)
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initRatings();
  initMap();
  initQRScanDemo();
});

/* =========================
   OPTIONAL SMALL UTILITIES
========================= */

// Highlight nav link for current page
(function highlightNav() {
  const path = location.pathname.split('/').pop();
  const links = $all('.main-nav a');
  links.forEach(link => {
    if (link.getAttribute('href') === path) {
      link.style.fontWeight = '600';
      link.style.textDecoration = 'underline';
    }
  });
})();

// Mobile accessibility enhancement
(function enhanceTabFocus() {
  $all('button, a, input, textarea, select').forEach(el => {
    el.setAttribute('tabindex', '0');
  });
})();

/* Done — Batch 3 Part 2 complete */
/***************************************************
  TEMPLE BOOKING SYSTEM (Ticket + QR Code Display)
***************************************************/
(function () {
  const form = document.getElementById("bookingForm");
  const ticketArea = document.getElementById("ticketArea");
  const bookingMessage = document.getElementById("bookingMessage");

  if (!form) return; // run only on visit.html

  // function to generate QR code using Google Chart API
  function generateQRCode(text) {
    const url = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(
      text
    )}`;
    return url;
  }

  // main handler
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const date = document.getElementById("date").value;
    const timeSlot = document.getElementById("timeSlot").value;
    const visitors = document.getElementById("visitors").value;
    const notes = document.getElementById("notes").value.trim();

    // validate required fields
    if (!name || !email || !phone || !date || !timeSlot || !visitors) {
      bookingMessage.textContent = "Please fill all required fields.";
      bookingMessage.style.color = "red";
      return;
    }

    const ticketId = "TKT" + Math.floor(Math.random() * 999999);
    const qrData = `
      Ticket ID: ${ticketId}
      Name: ${name}
      Date: ${date}
      Time: ${timeSlot}
      Visitors: ${visitors}
      Phone: ${phone}
    `;

    // generate QR code
    const qrUrl = generateQRCode(qrData);

    // ticket UI
    ticketArea.innerHTML = `
      <div class="ticket-card">
        <h3>Temple Visit Ticket</h3>
        <p><strong>Ticket ID:</strong> ${ticketId}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time Slot:</strong> ${timeSlot}</p>
        <p><strong>No. of Visitors:</strong> ${visitors}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}

        <div class="qr-box">
          <img src="${qrUrl}" alt="QR Code" />
          <p class="qr-text">Scan this QR at the entry gate</p>
        </div>
      </div>
    `;

    bookingMessage.textContent = "Booking successful! Your ticket is generated below.";
    bookingMessage.style.color = "green";

    // smooth scroll
    setTimeout(() => {
      ticketArea.scrollIntoView({ behavior: "smooth" });
    }, 300);
  });
})();
const images = document.querySelectorAll("#gallery img");
const lightbox = document.getElementById("lightbox");
const video = document.getElementById("lb-video");
const closeBtn = document.querySelector(".lb-close");

images.forEach(img => {
  img.addEventListener("click", () => {
    const videoUrl = img.getAttribute("data-video");
    video.src = videoUrl + "?autoplay=1";
    lightbox.style.display = "flex";
  });
});

closeBtn.addEventListener("click", () => {
  video.src = "";
  lightbox.style.display = "none";
});

