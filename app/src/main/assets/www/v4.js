const $4 = (s, r = document) => r.querySelector(s);
const $$4 = (s, r = document) => [...r.querySelectorAll(s)];
const esc4 = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa4 = n => new Intl.NumberFormat('fa-IR').format(Number(n || 0));

const parseNum4 = v => {
  const en = String(v ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[^0-9.-]/g, '');
  return Math.max(0, Math.round(Number(en || 0)));
};

function humanToman(n) {
  const v = Math.abs(Math.round(Number(n || 0)));
  if (!v) return '۰ تومان';
  const bil = Math.floor(v / 1_000_000_000);
  const mil = Math.floor((v % 1_000_000_000) / 1_000_000);
  const tho = Math.floor((v % 1_000_000) / 1_000);
  const rem = v % 1_000;
  const parts = [];
  if (bil) parts.push(`${fa4(bil)} میلیارد`);
  if (mil) parts.push(`${fa4(mil)} میلیون`);
  if (tho) parts.push(`${fa4(tho)} هزار`);
  if (rem && !bil && !mil) parts.push(`${fa4(rem)}`);
  return `${parts.join(' و ')} تومان`;
}

function jDate4(iso) {
  if (!iso) return 'بدون سررسید';
  try {
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'short' }).format(d);
  } catch {
    return iso;
  }
}

let d4 = null;
let noteFilter = 'all';
let txFilter = 'all';
let audioCtx = null;
let soundNodes = [];

async function api4(path, options = {}) {
  const o = { credentials: 'same-origin', ...options };
  if (o.body && typeof o.body !== 'string') {
    o.headers = { 'content-type': 'application/json' };
    o.body = JSON.stringify(o.body);
  }
  const r = await fetch(path, o);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'خطا در ارتباط');
  return j;
}

function toast4(msg) {
  if (window.spToast) window.spToast(msg);
}

// Theme & Privacy Manager (Titanium Dark / Cashmere Light / Royal Gold / Midnight Emerald / Cosmic)
function initTheme() {
  const saved = localStorage.getItem('sp_theme_v8') || 'titanium';
  applyTheme(saved);
  const priv = localStorage.getItem('sp_privacy_blur') === '1';
  document.body.classList.toggle('privacy-blur', priv);
  if ($4('#togglePrivacyBtn')) $4('#togglePrivacyBtn').textContent = priv ? '🙈' : '👁';
  if ('caches' in window && !sessionStorage.getItem('sp_cache_purged_v85')) {
    sessionStorage.setItem('sp_cache_purged_v85', '1');
    caches.keys().then(ks => ks.forEach(k => { if (!k.includes('v8.5')) caches.delete(k); })).catch(() => {});
  }
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sp_theme_v8', theme);
  const btn = $4('#themeToggle');
  if (btn) {
    const labels = {
      titanium: '🖤 <span>تیتانیوم</span>',
      light: '🤍 <span>کرم روشن</span>',
      royal: '👑 <span>طلایی</span>',
      dark: '🌿 <span>زمردی</span>',
      cosmic: '🌌 <span>کهکشانی</span>'
    };
    btn.innerHTML = labels[theme] || labels.titanium;
  }
}

function togglePrivacyMode() {
  const next = !document.body.classList.contains('privacy-blur');
  document.body.classList.toggle('privacy-blur', next);
  localStorage.setItem('sp_privacy_blur', next ? '1' : '0');
  if ($4('#togglePrivacyBtn')) $4('#togglePrivacyBtn').textContent = next ? '🙈' : '👁';
  playTick();
  toast4(next ? '🙈 حالت محرمانه فعال شد (با نگه‌داشتن موس روی هر عدد، موقت دیده می‌شود)' : '👁 نمایش مبالغ مالی فعال شد');
}

function playTick() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.018);
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.022);
  } catch {}
}

let lastAnimatedBal = null;
function animateBalance(targetVal) {
  const el = $4('#mwBalance');
  if (!el) return;
  const target = Math.round(Number(targetVal || 0));
  if (lastAnimatedBal === target) {
    const sign = target < 0 ? '− ' : '';
    el.innerHTML = `${sign}${fa4(Math.abs(target))} <span>تومان</span>`;
    return;
  }
  const start = lastAnimatedBal ?? Math.round(target * 0.88);
  lastAnimatedBal = target;
  const t0 = performance.now();
  const dur = 420;
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const ease = 1 - Math.pow(1 - p, 3);
    const cur = Math.round(start + (target - start) * ease);
    const sign = cur < 0 ? '− ' : '';
    el.innerHTML = `${sign}${fa4(Math.abs(cur))} <span>تومان</span>`;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateSmartGreeting() {
  const helloEl = $4('#hello');
  if (!helloEl) return;
  try {
    const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tehran' }).format(new Date()));
    const text = h >= 5 && h < 11 ? 'صبحت روشن و پرانرژی ☀️'
      : h >= 11 && h < 16 ? 'ظهرت آرام و پربازده 🌿'
      : h >= 16 && h < 20 ? 'عصرت دلنشین ☕'
      : h >= 20 && h < 23 ? 'شبت آرام و باکیفیت ✨'
      : 'نیمه‌شبت آرام رفیق 🌙';
    helloEl.textContent = text;
  } catch {}
}

function syncActiveDock() {
  const activePage = $4('.page.active')?.id?.replace('page-', '') || 'home';
  $$4('#floatingDock .dock-btn[data-dock-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dockPage === activePage);
  });
  const academicPages = ['subjects', 'topics', 'cards', 'exams', 'mistakes', 'myday', 'insights'];
  if (academicPages.includes(activePage)) {
    $4('#academicDrawerBody')?.classList.add('open');
    $4('#academicDrawerBtn')?.classList.add('open');
  }
}

// Harmonic Synth Chime & Holographic Confetti Particle Engine
function playChime(type = 'victory') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = type === 'victory' ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);
      gain.gain.setValueAtTime(0.001, now + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.085 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.55);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.6);
    });
  } catch {}
}

function launchConfetti() {
  playChime('victory');
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  const colors = ['#22d497', '#facc15', '#7c6aff', '#38bdf8', '#f472b6', '#ffffff'];
  const parts = Array.from({ length: 75 }, () => ({
    x: c.width / 2 + (Math.random() - 0.5) * 180,
    y: c.height * 0.45,
    vx: (Math.random() - 0.5) * 15,
    vy: -Math.random() * 14 - 4,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 6.28,
    vrot: (Math.random() - 0.5) * 0.25,
    alpha: 1
  }));
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.36;
      p.rot += p.vrot;
      p.alpha = Math.max(0, 1 - frame / 85);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (frame < 85) requestAnimationFrame(tick);
    else c.remove();
  }
  requestAnimationFrame(tick);
}

// 3D Card Interactive Tilt & Ambient Spotlight (Calm, Pure & Static — Zero Canvas Clutter)
function initNeuralCanvas() {
  window.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.panel, .coach-card, .stat, .subject-card, .note-card, .bento-day-card, .bento-obligations-card, .finance-kpi, .habit-card-full');
    if (card) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }
    const wallet = $4('#homeWalletCard');
    if (wallet) {
      if (e.target.closest?.('#homeWalletCard')) {
        const wr = wallet.getBoundingClientRect();
        const px = Math.round(((e.clientX - wr.left) / wr.width) * 100);
        const py = Math.round(((e.clientY - wr.top) / wr.height) * 100);
        const rx = ((e.clientY - wr.top) / wr.height - 0.5) * -7;
        const ry = ((e.clientX - wr.left) / wr.width - 0.5) * 7;
        wallet.style.setProperty('--gx', `${px}%`);
        wallet.style.setProperty('--gy', `${py}%`);
        wallet.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-2px)`;
      } else if (wallet.style.transform) {
        wallet.style.transform = '';
      }
    }
  }, { passive: true });
}

function toggleVoiceBriefing() {}

// 4-7-8 Holographic Breathing Lotus Controller
let breathTimer = null;
function toggleBreathingExercise() {
  const circle = $4('#breathCircle');
  const label = $4('#breathStatus');
  const btn = $4('#startBreathBtn');
  if (!circle || !label) return;
  if (breathTimer) {
    clearTimeout(breathTimer);
    breathTimer = null;
    circle.className = 'breath-circle';
    circle.textContent = 'آماده';
    label.textContent = 'تمرین تنفس ۴-۷-۸ برای کاهش فوری ضربان قلب و افزایش تمرکز';
    if (btn) btn.textContent = '🌬️ شروع کالیبراسیون تنفس (۴-۷-۸)';
    return;
  }
  if (btn) btn.textContent = '⏹ توقف تمرین تنفس';
  playChime('start');
  function cycle() {
    circle.className = 'breath-circle inhale';
    circle.textContent = 'دم (۴ ثانیه)';
    label.textContent = '🌿 آرام از بینی نفس عمیق بکش (۴ ثانیه)...';
    breathTimer = setTimeout(() => {
      circle.className = 'breath-circle hold';
      circle.textContent = 'نگه دار (۷)';
      label.textContent = '✨ نفس را نگه دار تا اکسیژن جذب شود (۷ ثانیه)...';
      breathTimer = setTimeout(() => {
        circle.className = 'breath-circle exhale';
        circle.textContent = 'بازدم (۸)';
        label.textContent = '🌊 به آرامی از دهان بازدم کن و استرس را رها کن (۸ ثانیه)...';
        breathTimer = setTimeout(cycle, 8000);
      }, 7000);
    }, 4000);
  }
  cycle();
}

// Web Audio Ambient Soundscape Generator
function stopSound() {
  soundNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
  soundNodes = [];
}

function startSound(kind) {
  stopSound();
  if (!kind || kind === 'off') return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (kind === 'brown' || kind === 'rain') {
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= kind === 'rain' ? 2.2 : 3.0;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = kind === 'rain' ? 'bandpass' : 'lowpass';
      filter.frequency.value = kind === 'rain' ? 950 : 420;

      const gain = audioCtx.createGain();
      gain.gain.value = kind === 'rain' ? 0.08 : 0.06;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      whiteNoise.start(0);
      soundNodes.push(whiteNoise, filter, gain);
    } else if (kind === 'alpha') {
      const oscL = audioCtx.createOscillator();
      const oscR = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscL.frequency.value = 200;
      oscR.frequency.value = 210; // 10Hz Alpha Binaural Beat
      gain.gain.value = 0.035;
      oscL.connect(gain);
      oscR.connect(gain);
      gain.connect(audioCtx.destination);
      oscL.start();
      oscR.start();
      soundNodes.push(oscL, oscR, gain);
    }
  } catch {}
}

// Custom Duotone SVG Icon Library
const DUOTONE_SVGS = {
  home: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  finance: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2"/><path d="M2 10h20M6 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  life: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  week: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  tasks: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/><path d="m8 12.5 2.8 2.8L16.5 9.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  topics: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="3" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="6" r="3" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="3" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/><path d="M8.5 7.5 11 15M15.5 7.5 13 15M9 6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  focus: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l2.5 2.5M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  cards: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="15" height="15" rx="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><path d="M16 21H6a3 3 0 0 1-3-3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  insights: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M3 20h18M5 16l4-5 4 3 6-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 16l4-5 4 3 6-8v10H5v-4Z" fill="currentColor" fill-opacity="0.2"/></svg>`,
  ai: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  notes: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/><path d="M9 11h6M9 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  subjects: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M12 3 2 8l10 5 10-5-10-5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  myday: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.5-7-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 16.5 12 21 12 21Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2"/></svg>`,
  exams: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2 4 6v6c0 5.2 3.4 9.9 8 11 4.6-1.1 8-5.8 8-11V6l-8-4Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><path d="m9.5 12 2 2 3.5-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  mistakes: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  settings: `<svg class="sp-svg-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="1.7"/></svg>`
};

function upgradeNavAndStatIcons() {
  $$4('nav button[data-page]').forEach(btn => {
    const key = btn.dataset.page;
    const labelSpan = btn.querySelector('span');
    if (DUOTONE_SVGS[key] && labelSpan && !btn.querySelector('.sp-svg-icon')) {
      btn.innerHTML = `${DUOTONE_SVGS[key]}<span>${labelSpan.textContent}</span>`;
    }
  });
  const statIcons = [DUOTONE_SVGS.home, DUOTONE_SVGS.focus, DUOTONE_SVGS.cards, DUOTONE_SVGS.mistakes, DUOTONE_SVGS.tasks];
  $$4('#stats .stat i').forEach((el, idx) => {
    if (statIcons[idx]) el.innerHTML = statIcons[idx];
  });
}

function renderSplineChart(week = []) {
  const chartEl = $4('#chart');
  if (!chartEl || !week.length) return;
  const vals = week.map(x => Number(x.minutes || 0));
  const max = Math.max(60, ...vals);
  const w = 540, h = 165, padX = 24, padY = 24;
  const pts = week.map((x, idx) => {
    const px = padX + (idx / Math.max(1, week.length - 1)) * (w - padX * 2);
    const py = h - padY - (Number(x.minutes || 0) / max) * (h - padY * 2);
    return { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10, val: Number(x.minutes || 0), day: x.day };
  });
  let dPath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2;
    dPath += ` C ${cx} ${pts[i].y}, ${cx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  const areaPath = `${dPath} L ${pts[pts.length - 1].x} ${h - padY} L ${pts[0].x} ${h - padY} Z`;
  const dotsHtml = pts.map(p => `
    <g>
      <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--card-bg)" stroke="var(--green2)" stroke-width="2.5">
        <title>${p.day}: ${fa4(p.val)} دقیقه</title>
      </circle>
      ${p.val > 0 ? `<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" fill="var(--ink)" font-size="10" font-weight="700">${fa4(p.val)}</text>` : ''}
    </g>`).join('');

  chartEl.className = 'spline-chart-wrap';
  chartEl.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="175" style="overflow:visible">
      <defs>
        <linearGradient id="spAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--green2)" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="var(--green)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="var(--line)" stroke-dasharray="4,4"/>
      <line x1="${padX}" y1="${padY}" x2="${w - padX}" y2="${padY}" stroke="var(--line)" stroke-dasharray="4,4"/>
      <path d="${areaPath}" fill="url(#spAreaGrad)"/>
      <path d="${dPath}" fill="none" stroke="var(--green2)" stroke-width="3.2" stroke-linecap="round"/>
      ${dotsHtml}
    </svg>
    <div class="spline-labels">
      <span>${week[0]?.day || ''}</span>
      <span>روند موجی مطالعه (دقیقه در روز)</span>
      <span>${week[week.length - 1]?.day || 'امروز'}</span>
    </div>`;
}

function upgrade3DFlashcard(data) {
  const studyBox = $4('#cardStudy');
  if (!studyBox || !data?.cards?.length) return;
  const activeCard = studyBox.querySelector('h3')?.textContent;
  const c = data.cards.find(x => x.question === activeCard) || data.cards[0];
  if (!c) return;
  studyBox.innerHTML = `
    <div class="flip-card-inner" id="flipCardInner">
      <div class="flip-face flip-front">
        <small style="opacity:0.85;font-weight:700">🃏 ${esc4(c.subject_name)} · کارت هوشمند ۳ بعدی</small>
        <h3 style="margin:16px 0 22px;font-size:22px;line-height:1.6">${esc4(c.question)}</h3>
        <div class="action-row" style="justify-content:center">
          <button type="button" class="btn white" id="flipCardBtn">🔄 چرخش ۳ بعدی و مشاهده پاسخ</button>
          <button type="button" class="btn glass" data-del-card="${c.id}">حذف کارت</button>
        </div>
      </div>
      <div class="flip-face flip-back">
        <small style="color:var(--green);font-weight:800">✨ پاسخ و نکته کلیدی (${esc4(c.subject_name)})</small>
        <div class="answer">${esc4(c.answer)}</div>
        <div class="rate-row">
          <button type="button" data-rate="1">۱ · دوباره</button>
          <button type="button" data-rate="3">۳ · سخت</button>
          <button type="button" data-rate="4">۴ · خوب</button>
          <button type="button" data-rate="5">۵ · عالی (آسان)</button>
        </div>
      </div>
    </div>`;
}

function upgradeLiveTimeline(data) {
  const tl = $4('#timeline');
  if (!tl || !data?.now?.time) return;
  const [nh, nm] = String(data.now.time).split(':').map(Number);
  const nowMin = (nh || 0) * 60 + (nm || 0);
  $$4('#timeline .event-line').forEach(el => {
    const timeText = el.querySelector('small')?.textContent || '';
    const parts = timeText.split('—');
    if (parts.length === 2) {
      const [sh, sm] = parts[0].split(':').map(Number);
      const [eh, em] = parts[1].split(':').map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;
      if (nowMin >= sMin && nowMin <= eMin && !el.querySelector('.now-laser-badge')) {
        el.classList.add('live-now');
        el.insertAdjacentHTML('afterbegin', `<div class="now-laser-badge"><i class="now-laser-dot"></i> اکنون در جریان</div>`);
      }
    }
  });
}

function formatRichNote(text) {
  return esc4(text)
    .replace(/\$([^$]+)\$/g, '<span class="note-math">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/^###\s+(.+)$/gm, '<strong style="color:var(--green);display:block;margin-top:4px">$1</strong>');
}

function injectV4() {
  initTheme();
  initNeuralCanvas();

  // Inject 4-7-8 Holographic Breathing Lotus Orb in #page-focus
  const focusGrid = $4('#page-focus .grid.two');
  if (focusGrid && !$4('#breathCard')) {
    focusGrid.insertAdjacentHTML(
      'beforebegin',
      `<article id="breathCard" class="panel breath-card" style="margin-bottom:17px">
        <div style="flex:1;min-width:250px">
          <small style="color:var(--green);font-weight:800">آرامش و تمرکز عمیق</small>
          <h3 style="margin:4px 0 8px">🫁 ریتم تنفس ۴-۷-۸ (کاهش فوری استرس و آماده‌سازی ذهن)</h3>
          <p id="breathStatus" style="margin:0 0 12px;color:var(--muted)">تمرین تنفس ۴-۷-۸ برای کاهش ضربان قلب و افزایش آرامش پیش از کار و مطالعه</p>
          <button type="button" id="startBreathBtn" class="btn primary">🌬️ شروع تنفس آرام‌بخش (۴-۷-۸)</button>
        </div>
        <div class="breath-orb-wrap">
          <div id="breathCircle" class="breath-circle">آماده</div>
        </div>
      </article>`
    );
  }

  // Inject Floating Glass Quick-Dock at bottom center (Life & Finance First!)
  const appEl = $4('#app');
  if (appEl && !$4('#floatingDock')) {
    appEl.insertAdjacentHTML(
      'beforeend',
      `<div id="floatingDock" class="floating-dock">
        <button type="button" class="dock-btn" data-dock-page="home">⌂ <span>ویترین</span></button>
        <button type="button" class="dock-btn primary-dock" data-dock-page="finance">💳 <span>حساب‌وکتاب</span></button>
        <button type="button" class="dock-btn" data-dock-page="life">🌿 <span>روتین زندگی</span></button>
        <button type="button" class="dock-btn" data-dock-page="tasks">✓ <span>کارها</span></button>
        <button type="button" class="dock-btn" data-dock-page="focus">◴ <span>تمرکز</span></button>
      </div>`
    );
  }

  const homeNav = $4('nav [data-page="home"]');
  if (homeNav && !$4('nav [data-page="finance"]')) {
    homeNav.insertAdjacentHTML('beforebegin', `<div class="nav-section-label">فضای روزانه</div>`);
    homeNav.insertAdjacentHTML(
      'afterend',
      `<button data-page="finance" class="coach-nav">💳 <span>حساب‌وکتاب مالی</span></button>
       <button data-page="life" class="coach-nav">🌿 <span>روتین و عادت‌ها</span></button>`
    );
  }
  const focusNav = $4('nav [data-page="focus"]');
  if (focusNav && !$4('nav [data-page="notes"]')) {
    focusNav.insertAdjacentHTML('afterend', `<button data-page="notes" class="coach-nav">📓 <span>یادداشت‌ها</span></button>`);
  }
  // academic drawer removed for maximum simplicity and focus on ledger

  const settingsPage = $4('#page-settings');
  if (settingsPage && !$4('#page-finance')) {
    settingsPage.insertAdjacentHTML('beforebegin', buildV4Pages());
  }
  if (!$4('#cmdDialog')) {
    document.body.insertAdjacentHTML('beforeend', buildV4Dialogs());
  }

  // Inject Interactive RPG Skill Tree container at top of #page-topics
  const topicBoard = $4('#topicBoard');
  if (topicBoard && !$4('#skillTreeContainer')) {
    topicBoard.insertAdjacentHTML(
      'beforebegin',
      `<div class="panel-head" style="margin:6px 0 12px">
        <div><small>نقشه گرافیکی پیشرفت</small><h3>🌳 درخت مهارت استراتژیک سرفصل‌ها</h3></div>
        <button type="button" id="toggleSkillTreeMode" class="btn pale">نمایش/مخفی‌سازی اسلایدرهای کلاسیک</button>
      </div>
      <div id="skillTreeContainer" class="skill-tree-wrap"></div>`
    );
  }

  // Inject Exam Boss Battle Arena at top of #page-exams
  const examGrid = $4('#page-exams .coach-grid');
  if (examGrid && !$4('#bossArenaExams')) {
    examGrid.insertAdjacentHTML(
      'beforebegin',
      `<div style="margin-bottom:16px">
        <div class="panel-head" style="margin-bottom:10px">
          <div><small>آمادگی آزمون‌ها</small><h3>⚔️ چالش عبور از امتحانات پیش‌رو</h3></div>
        </div>
        <div id="bossArenaExams" class="boss-arena"></div>
      </div>`
    );
  }

  bindV4Events();
  const hash = location.hash.slice(1);
  if (['finance', 'life', 'ai', 'notes', 'subjects'].includes(hash)) {
    setTimeout(() => $4(`nav [data-page="${hash}"]`)?.click(), 80);
  }
}

function buildV4Pages() {
  const todayIso = new Date().toISOString().slice(0, 10);
  return `
  <section id="page-finance" class="page">
    <div class="title">
      <div>
        <small>PERSONAL WEALTH & LEDGER</small>
        <h2>حساب‌وکتاب، دخل‌وخرج و مدیریت مالی</h2>
        <p>ثبت آنی مخارج و درآمدها به تومان، کنترل بودجه ماهانه، دفتر طلب و بدهی، قبوض و قلک پس‌انداز.</p>
      </div>
      <div class="action-row">
        <button type="button" id="editBudgetBtn" class="btn pale">⚙ بودجه ماهانه و نام کارت</button>
        <button type="button" id="openQuickTxBtn" class="btn primary">＋ ثبت سریع دخل / خرج</button>
      </div>
    </div>

    <div id="financeKpiRow" class="finance-kpi-grid"></div>

    <div class="grid two" style="margin-bottom:18px">
      <article class="panel">
        <div class="panel-head">
          <div><small>ثبت در دفتر کل</small><h3>💳 ثبت تراکنش جدید (خرج یا درآمد)</h3></div>
        </div>
        <form id="txForm" class="coach-form">
          <input type="hidden" name="kind" id="txKindInput" value="expense">
          <div class="seg-switch" id="txKindSwitch">
            <button type="button" class="active expense" data-tx-kind="expense" data-target-form="txForm">▼ ثبت خرج / پرداخت</button>
            <button type="button" class="income" data-tx-kind="income" data-target-form="txForm">▲ ثبت درآمد / واریزی</button>
          </div>
          <div class="cols">
            <label>عنوان تراکنش
              <input name="title" required maxlength="120" placeholder="مثلاً: خرید روزمره، اسنپ، کافه یا حقوق...">
            </label>
            <label>دسته‌بندی
              <select name="category" id="txCategorySelect">
                <option value="خوراک و کافه">☕ خوراک، رستوران و کافه</option>
                <option value="خرید روزمره">🛒 سوپرمارکت و خرید روزمره</option>
                <option value="رفت‌وآمد">🚕 رفت‌وآمد، اسنپ و بنزین</option>
                <option value="قبض و مسکن">🏠 اجاره، قبوض و اینترنت</option>
                <option value="خرید شخصی و پوشاک">👕 خرید شخصی و پوشاک</option>
                <option value="دانشگاه و آموزش">📚 کتاب، دانشگاه و آموزش</option>
                <option value="سلامت و ورزش">💊 سلامت، دارو و ورزش</option>
                <option value="تفریح و سفر">🎬 تفریح، هدیه و سفر</option>
                <option value="حقوق و درآمد">💰 حقوق، پروژه و واریزی</option>
                <option value="سایر">📦 سایر موارد</option>
              </select>
            </label>
          </div>
          <label>مبلغ (به تومان)
            <input name="amount" id="txAmountInput" inputmode="numeric" required placeholder="مثلاً: ۲۵۰۰۰۰">
            <div class="toman-live-preview" id="txAmountPreview">مبلغ را وارد کنید یا از دکمه‌های سریع زیر کمک بگیرید</div>
          </label>
          <div class="quick-amt-pills">
            <button type="button" data-add-amt="50000" data-amt-input="txAmountInput">+۵۰ هزار</button>
            <button type="button" data-add-amt="100000" data-amt-input="txAmountInput">+۱۰۰ هزار</button>
            <button type="button" data-add-amt="250000" data-amt-input="txAmountInput">+۲۵۰ هزار</button>
            <button type="button" data-add-amt="500000" data-amt-input="txAmountInput">+۵۰۰ هزار</button>
            <button type="button" data-add-amt="1000000" data-amt-input="txAmountInput">+۱ میلیون</button>
            <button type="button" data-add-amt="5000000" data-amt-input="txAmountInput">+۵ میلیون</button>
            <button type="button" data-add-amt="0" data-amt-input="txAmountInput">پاک کردن</button>
          </div>
          <div class="cols">
            <label>تاریخ<input name="tx_date" type="date" value="${todayIso}"></label>
            <label>توضیح کوتاه (اختیاری)<input name="note" maxlength="160" placeholder="مثلاً: از کارت ملت"></label>
          </div>
          <button class="btn primary full" style="margin-top:6px">ثبت در حساب‌وکتاب</button>
        </form>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div><small>تحلیل مخارج این ماه</small><h3>📊 تفکیک هزینه‌ها و وضعیت بودجه</h3></div>
        </div>
        <div id="financeDonutBox"></div>
      </article>
    </div>

    <article class="panel" style="margin-bottom:18px">
      <div class="panel-head">
        <div><small>دفتر کل تراکنش‌ها</small><h3>🧾 ریز دخل‌وخرج‌های اخیر</h3></div>
        <div class="chips" style="margin:0" id="txFilterChips">
          <button type="button" class="active" data-tx-filter="all">همه</button>
          <button type="button" data-tx-filter="expense">فقط مخارج</button>
          <button type="button" data-tx-filter="income">فقط ورودی‌ها</button>
        </div>
      </div>
      <div id="txList" style="margin-top:12px"></div>
    </article>

    <div class="grid two">
      <article class="panel">
        <div class="panel-head">
          <div><small>حساب‌های دفتری و تعهدات</small><h3>🤝 دفتر طلب، بدهی و قبوض سررسیددار</h3></div>
        </div>
        <form id="debtForm" class="coach-form" style="margin-bottom:14px">
          <div class="cols">
            <label>نوع حساب
              <select name="kind">
                <option value="payable">🔴 بدهی من به دیگران</option>
                <option value="receivable">🟢 طلب من از دیگران (قرض داده‌ام)</option>
                <option value="bill">🟡 قبض، قسط یا اجاره سررسیددار</option>
              </select>
            </label>
            <label>نام شخص یا عنوان قبض
              <input name="person_or_title" required maxlength="120" placeholder="مثلاً: علی رضایی / قسط وام / قبض برق">
            </label>
          </div>
          <div class="cols">
            <label>مبلغ (تومان)
              <input name="amount" id="debtAmtInput" inputmode="numeric" required placeholder="مثلاً: ۱۲۰۰۰۰۰">
            </label>
            <label>تاریخ سررسید (اختیاری)
              <input name="due_date" type="date">
            </label>
          </div>
          <div class="quick-amt-pills">
            <button type="button" data-add-amt="200000" data-amt-input="debtAmtInput">+۲۰۰ هزار</button>
            <button type="button" data-add-amt="500000" data-amt-input="debtAmtInput">+۵۰۰ هزار</button>
            <button type="button" data-add-amt="1000000" data-amt-input="debtAmtInput">+۱ میلیون</button>
            <button type="button" data-add-amt="5000000" data-amt-input="debtAmtInput">+۵ میلیون</button>
            <button type="button" data-add-amt="0" data-amt-input="debtAmtInput">پاک</button>
          </div>
          <button class="btn primary full">افزودن به دفتر تعهدات</button>
        </form>
        <div id="debtList"></div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div><small>پس‌انداز هدفمند</small><h3>💎 قلک اهداف مالی و خریدهای آینده</h3></div>
        </div>
        <div id="goalList" style="margin-bottom:14px"></div>
        <form id="goalForm" class="coach-form" style="border-top:1px dashed var(--line);padding-top:12px">
          <h4 style="margin:0 0 8px;font-size:13px">＋ تعریف قلک / هدف مالی جدید</h4>
          <div class="cols">
            <label>عنوان هدف<input name="title" required maxlength="100" placeholder="مثلاً: خرید گوشی جدید، سفر شمال، لپ‌تاپ"></label>
            <label>نماد
              <select name="icon">
                <option value="💎">💎 پس‌انداز ویژه</option>
                <option value="💻">💻 لپ‌تاپ / دیجیتال</option>
                <option value="📱">📱 موبایل و گجت</option>
                <option value="✈️">✈️ سفر و تفریح</option>
                <option value="🚗">🚗 خودرو / موتور</option>
                <option value="🛡️">🛡️ صندوق اضطراری</option>
              </select>
            </label>
          </div>
          <div class="cols">
            <label>مبلغ هدف کل (تومان)<input name="target_amount" inputmode="numeric" required placeholder="مثلاً: ۳۰۰۰۰۰۰۰"></label>
            <label>پس‌انداز فعلی (تومان)<input name="saved_amount" inputmode="numeric" value="0" placeholder="۰"></label>
          </div>
          <button class="btn pale full">ساخت قلک جدید</button>
        </form>
      </article>
    </div>
  </section>

  <section id="page-life" class="page">
    <div class="title">
      <div>
        <small>DAILY HABITS & LIFE TOOLS</small>
        <h2>روتین روزانه، عادت‌های خوب و ابزارهای زندگی</h2>
        <p>پیگیری عادت‌های کلیدی روزمره و ماشین‌حساب سریع برای دُنگ، تخفیف خرید و برنامه‌ریزی پس‌انداز.</p>
      </div>
    </div>

    <article class="panel" style="margin-bottom:18px">
      <div class="panel-head">
        <div><small>نظم شخصی هر روز</small><h3>🌿 عادت‌های روزانه من (با یک کلیک تیک بزن)</h3></div>
      </div>
      <div id="lifeHabitsGrid" class="habit-grid-cards" style="margin-top:12px"></div>
      <form id="habitForm" class="coach-form" style="border-top:1px dashed var(--line);padding-top:14px">
        <div class="cols three">
          <label>عنوان عادت روزانه جدید<input name="title" required maxlength="80" placeholder="مثلاً: ۲۰ دقیقه پیاده‌روی، بدون قند مصنوعی، خواب قبل ۱۲"></label>
          <label>آیکون
            <select name="icon">
              <option value="✨">✨ عادت طلایی</option>
              <option value="💧">💧 نوشیدن آب</option>
              <option value="🚶">🚶 ورزش و تحرک</option>
              <option value="📖">📖 کتاب‌خوانی</option>
              <option value="💳">💳 کنترل مخارج</option>
              <option value="🥗">🥗 تغذیه سالم</option>
              <option value="🌙">🌙 خواب به‌موقع</option>
            </select>
          </label>
          <label style="display:flex;align-items:flex-end"><button class="btn primary full">＋ افزودن به روتین روزانه</button></label>
        </div>
      </form>
    </article>

    <div class="grid two">
      <article class="panel">
        <div class="panel-head">
          <div><small>محاسبه آنی</small><h3>🍕 ماشین‌حساب تقسیم دُنگ و هزینه جمعی</h3></div>
        </div>
        <p style="color:var(--muted);font-size:12.5px;margin-top:0">مبلغ کل صورت‌حساب کافه، رستوران یا سفر را وارد کن تا سهم دقیق هر نفر به تومان مشخص شود.</p>
        <div class="cols three">
          <label>مبلغ کل فاکتور (تومان)
            <input id="calcDongTotal" class="life-calc-in" inputmode="numeric" value="1200000">
          </label>
          <label>تعداد نفرات
            <input id="calcDongPeople" class="life-calc-in" type="number" min="1" max="100" value="4">
          </label>
          <label>مالیات / سرویس (٪)
            <input id="calcDongTax" class="life-calc-in" type="number" min="0" max="50" value="0">
          </label>
        </div>
        <div id="calcDongOut" class="calc-result-box"></div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div><small>خرید هوشمند و آینده‌نگری</small><h3>🏷️ ماشین‌حساب تخفیف خرید و رشد پس‌انداز</h3></div>
        </div>
        <div class="cols three">
          <label>قیمت اصلی کالا (تومان)
            <input id="calcOrigPrice" class="life-calc-in" inputmode="numeric" value="3500000">
          </label>
          <label>درصد تخفیف (٪)
            <input id="calcDiscPct" class="life-calc-in" type="number" min="0" max="99" value="20">
          </label>
          <label>پس‌انداز ماهانه (تومان)
            <input id="calcMonthlySave" class="life-calc-in" inputmode="numeric" value="3000000">
          </label>
        </div>
        <div id="calcSaveOut" class="calc-result-box"></div>
      </article>
    </div>
  </section>

  <section id="page-notes" class="page">
    <div class="title">
      <div><small>دفترچه یادداشت و فرمول</small><h2>یادداشت‌ها، جزوه‌ها و نکات کلیدی</h2><p>ثبت منظم یادداشت‌های شخصی و درسی با پشتیبانی از فرمول‌های ریاضی ($...$).</p></div>
      <button id="addNoteBtn" class="btn primary">＋ یادداشت تازه</button>
    </div>
    <div id="noteFilterChips" class="chips"></div>
    <div id="notesGrid" class="notes-grid"></div>
  </section>

  <section id="page-subjects" class="page">
    <div class="title">
      <div><small>مدیریت ترم و واحدها</small><h2>درس‌ها و شبیه‌ساز معدل</h2><p>افزودن درس جدید، تنظیم تعداد واحد، نمره هدف و رصد معدل وزنی ترم.</p></div>
      <button id="addSubjectBtn" class="btn primary">＋ درس جدید</button>
    </div>
    <div id="gpaHero" class="coach-card wellness-hero" style="margin-bottom:16px"></div>
    <div id="subjectsGrid" class="subjects-grid"></div>
  </section>`;
}

function buildV4Dialogs() {
  const todayIso = new Date().toISOString().slice(0, 10);
  return `
  <dialog id="quickTxDialog">
    <form id="quickTxForm" method="dialog">
      <div class="dialog-head">
        <div><small>ثبت ۲ ثانیه‌ای</small><h2>💳 ثبت سریع دخل و خرج</h2></div>
        <button type="button" onclick="this.closest('dialog').close()">×</button>
      </div>
      <input type="hidden" name="kind" value="expense">
      <div class="seg-switch" style="margin-top:10px">
        <button type="button" class="active expense" data-tx-kind="expense" data-target-form="quickTxForm">▼ خرج / پرداخت</button>
        <button type="button" class="income" data-tx-kind="income" data-target-form="quickTxForm">▲ درآمد / واریز</button>
      </div>
      <label>بابت چه کاری؟
        <input name="title" required maxlength="120" placeholder="مثلاً: ناهار، اسنپ، خرید میوه، واریز پروژه...">
      </label>
      <div class="cols">
        <label>مبلغ (تومان)
          <input name="amount" id="qTxAmtInput" inputmode="numeric" required placeholder="مثلاً: ۱۵۰۰۰۰">
        </label>
        <label>دسته‌بندی
          <select name="category">
            <option value="خوراک و کافه">☕ خوراک و کافه</option>
            <option value="خرید روزمره">🛒 خرید روزمره</option>
            <option value="رفت‌وآمد">🚕 رفت‌وآمد</option>
            <option value="قبض و مسکن">🏠 قبض و مسکن</option>
            <option value="خرید شخصی و پوشاک">👕 خرید شخصی</option>
            <option value="دانشگاه و آموزش">📚 آموزش و کتاب</option>
            <option value="سلامت و ورزش">💊 سلامت و ورزش</option>
            <option value="حقوق و درآمد">💰 حقوق و درآمد</option>
            <option value="سایر">📦 سایر</option>
          </select>
        </label>
      </div>
      <div class="toman-live-preview" id="qTxAmtPreview"></div>
      <div class="quick-amt-pills">
        <button type="button" data-add-amt="50000" data-amt-input="qTxAmtInput">+۵۰ هزار</button>
        <button type="button" data-add-amt="100000" data-amt-input="qTxAmtInput">+۱۰۰ هزار</button>
        <button type="button" data-add-amt="250000" data-amt-input="qTxAmtInput">+۲۵۰ هزار</button>
        <button type="button" data-add-amt="500000" data-amt-input="qTxAmtInput">+۵۰۰ هزار</button>
        <button type="button" data-add-amt="1000000" data-amt-input="qTxAmtInput">+۱ میلیون</button>
        <button type="button" data-add-amt="0" data-amt-input="qTxAmtInput">پاک</button>
      </div>
      <input type="hidden" name="tx_date" value="${todayIso}">
      <button class="btn primary full" style="margin-top:8px">ثبت آنی در حساب‌وکتاب</button>
    </form>
  </dialog>

  <dialog id="budgetDialog">
    <form id="budgetForm" method="dialog">
      <div class="dialog-head">
        <div><small>تنظیمات کیف پول</small><h2>⚙ سقف بودجه ماهانه و نام کارت</h2></div>
        <button type="button" onclick="this.closest('dialog').close()">×</button>
      </div>
      <label style="margin-top:10px">نام نمایشی روی کارت فلزی صفحه اول
        <input name="wallet_card_name" id="budgetCardNameIn" required maxlength="50" placeholder="مثلاً: کارت اصلی زندگی · ملت">
      </label>
      <label>سقف بودجه مخارج ماهانه (به تومان)
        <input name="monthly_budget" id="budgetAmountIn" inputmode="numeric" required placeholder="مثلاً: ۱۵۰۰۰۰۰۰">
        <div class="toman-live-preview" id="budgetAmtPreview"></div>
      </label>
      <div class="quick-amt-pills">
        <button type="button" data-add-amt="5000000" data-amt-input="budgetAmountIn">+۵ میلیون</button>
        <button type="button" data-add-amt="10000000" data-amt-input="budgetAmountIn">+۱۰ میلیون</button>
        <button type="button" data-add-amt="20000000" data-amt-input="budgetAmountIn">+۲۰ میلیون</button>
        <button type="button" data-add-amt="0" data-amt-input="budgetAmountIn">صفر کردن</button>
      </div>
      <button class="btn primary full" style="margin-top:8px">ذخیره تنظیمات مالی</button>
    </form>
  </dialog>

  <dialog id="cmdDialog">
    <div class="dialog-head"><div><small>COMMAND PALETTE</small><h2>جستجو و دسترسی سریع</h2></div><button type="button" onclick="this.closest('dialog').close()">×</button></div>
    <input id="cmdInput" placeholder="جستجوی تراکنش، بدهی، کار، یادداشت یا دستور..." autocomplete="off" style="margin-top:10px">
    <div id="cmdList" class="cmd-list"></div>
  </dialog>

  <dialog id="noteDialog">
    <form id="noteForm" method="dialog">
      <div class="dialog-head"><div><small>دفترچه یادداشت</small><h2 id="noteDialogTitle">یادداشت تازه</h2></div><button type="button" onclick="this.closest('dialog').close()">×</button></div>
      <input type="hidden" name="id">
      <label>عنوان یادداشت یا فرمول<input name="title" required maxlength="180" placeholder="مثلاً: لیست خرید هفته یا خلاصه فصل ۲"></label>
      <div class="cols">
        <label>بخش / درس مرتبط<select name="subject_id" class="v4-subject-select"></select></label>
        <label>برچسب‌ها (با ویرگول)<input name="tags" placeholder="مهم, شخصی, فرمول"></label>
      </div>
      <label>متن یادداشت<textarea name="content" required style="min-height:140px" placeholder="متن یادداشت خود را بنویسید..."></textarea></label>
      <label class="toggle"><input name="pinned" type="checkbox"><span></span> سنجاق شدن در بالای صفحه</label>
      <button class="btn primary full">ذخیره یادداشت</button>
    </form>
  </dialog>

  <dialog id="subjectDialog">
    <form id="subjectForm" method="dialog">
      <div class="dialog-head"><div><small>مدیریت آموزشی</small><h2 id="subjectDialogTitle">درس جدید</h2></div><button type="button" onclick="this.closest('dialog').close()">×</button></div>
      <input type="hidden" name="id">
      <div class="cols">
        <label>نام درس<input name="name" required maxlength="80" placeholder="مثلاً: طراحی الگوریتم"></label>
        <label>رنگ کارت<input name="color" type="color" value="#147657" style="height:42px;padding:4px"></label>
      </div>
      <div class="cols three">
        <label>تعداد واحد<input name="units" type="number" min="1" max="6" value="3"></label>
        <label>نمره هدف (از ۲۰)<input name="target_grade" type="number" step="0.25" min="10" max="20" value="18.5"></label>
        <label>نمره فعلی/تخمینی<input name="current_grade" type="number" step="0.25" min="0" max="20" placeholder="اختیاری"></label>
      </div>
      <div class="cols">
        <label>درصد تسلط فعلی<input name="mastery" type="number" min="0" max="100" value="30"></label>
        <label>اولویت (۱ تا ۵)<input name="priority" type="number" min="1" max="5" value="4"></label>
      </div>
      <label>هدف یا نام استاد<input name="target" placeholder="مثلاً: تسلط کامل روی برنامه‌نویسی پویا"></label>
      <button class="btn primary full">ذخیره درس</button>
    </form>
  </dialog>`;
}

function renderV4(data) {
  d4 = data;
  if (!d4) return;

  updateSmartGreeting();
  upgradeNavAndStatIcons();
  syncActiveDock();
  renderLifeAndFinance(d4);
  renderSplineChart(d4.week || []);
  upgrade3DFlashcard(d4);
  upgradeLiveTimeline(d4);

  // 1. Sidebar XP & Level Widget + Avatar Ring & Top Laser
  const g = d4.gamification;
  if (g) {
    if ($4('#xpSidebar')) {
      $4('#xpSidebar').innerHTML = `
        <div class="xp-widget">
          <div class="xp-top"><span>${g.rank.icon} ${esc4(g.rank.title)}</span><b>سطح ${fa4(g.level)}</b></div>
          <div class="xp-bar"><i style="width:${g.progressPct}%"></i></div>
          <div class="xp-sub"><span>${fa4(g.xp)} XP</span><span>تا سطح بعد: ${fa4(g.nextLevelXp - g.xp)} XP</span></div>
        </div>`;
    }
    const av = $4('.avatar');
    if (av) {
      av.style.setProperty('--xp-pct', `${g.progressPct || 65}%`);
      av.textContent = `L${fa4(g.level)}`;
      av.title = `${g.rank.title} · سطح ${fa4(g.level)} (${fa4(g.xp)} XP)`;
    }
    const laser = $4('#laserProgress');
    if (laser) {
      laser.style.width = `${Math.max(15, g.progressPct || 50)}%`;
    }
  }

  // Populate v4 subject selects
  const subOpts = (d4.subjects || []).map(s => `<option value="${s.id}">${esc4(s.name)}</option>`).join('');
  $$4('.v4-subject-select').forEach(el => { el.innerHTML = subOpts; });

  const ac = d4.academic || {};

  // 3. Render Smart Notes
  const notes = d4.notes || [];
  if ($4('#noteFilterChips')) {
    const subsWithNotes = (d4.subjects || []).filter(s => s.name !== 'ورزش');
    $4('#noteFilterChips').innerHTML = `<button class="${noteFilter === 'all' ? 'active' : ''}" data-note-filter="all">همه (${fa4(notes.length)})</button>` +
      subsWithNotes.map(s => `<button class="${String(noteFilter) === String(s.id) ? 'active' : ''}" data-note-filter="${s.id}">${esc4(s.name)}</button>`).join('');
  }
  if ($4('#notesGrid')) {
    const filtered = noteFilter === 'all' ? notes : notes.filter(n => String(n.subject_id) === String(noteFilter));
    $4('#notesGrid').innerHTML = filtered.length ? filtered.map(n => `
      <article class="note-card ${n.pinned ? 'pinned' : ''}">
        <div>
          <div class="note-head">
            <h3>${n.pinned ? '📌 ' : ''}${esc4(n.title)}</h3>
            <span class="tag">${esc4(n.subject_name || 'عمومی')}</span>
          </div>
          <div class="note-body">${formatRichNote(n.content)}</div>
        </div>
        <div>
          <div class="note-tags">${(n.tags || '').split(',').filter(Boolean).map(t => `<span>#${esc4(t.trim())}</span>`).join('')}</div>
          <div class="action-row">
            <button class="btn pale" data-edit-note="${n.id}">✎ ویرایش</button>
            <button class="btn pale" data-del-note="${n.id}">×</button>
          </div>
        </div>
      </article>`).join('') : '<div class="empty">هنوز جزوه‌ای در این بخش ثبت نشده است.</div>';
  }

  // 4. Render Subjects & GPA Manager
  if ($4('#gpaHero')) {
    $4('#gpaHero').innerHTML = `
      <div>
        <small>کارنامه و شبیه‌ساز معدل ترم</small>
        <h3>معدل وزنی فعلی: ${fa4(ac.gpa || 17.5)} از ۲۰</h3>
        <p>معدل هدف: <b>${fa4(ac.targetGpa || 18.5)}</b> · مجموع واحدهای فعال: <b>${fa4(ac.totalUnits || 18)} واحد</b></p>
      </div>
      <div class="wellness-score" style="--well:${Math.min(100, Math.round(((ac.gpa || 17) / 20) * 100))}%">
        <b>${fa4(ac.gpa || 17.5)}</b><small>GPA</small>
      </div>`;
  }
  if ($4('#subjectsGrid')) {
    const metaMap = Object.fromEntries((d4.subjectMeta || []).map(m => [m.subject_id, m]));
    $4('#subjectsGrid').innerHTML = (d4.subjects || []).map(s => {
      const m = metaMap[s.id] || { units: 3, target_grade: 18.5, current_grade: null };
      const est = m.current_grade != null ? m.current_grade : Math.round((12 + (s.mastery / 100) * 8) * 10) / 10;
      return `
        <article class="subject-card" style="--c:${s.color || '#147657'}">
          <div class="note-head">
            <h3>${esc4(s.name)}</h3>
            <span class="tag">اولویت ${fa4(s.priority)}</span>
          </div>
          <p style="font-size:9.5px;color:var(--muted);margin:4px 0 10px">${esc4(s.target || 'بدون یادداشت هدف')}</p>
          <div class="bar"><i style="width:${s.mastery}%;background:${s.color}"></i></div>
          <div class="subject-meta-row">
            <div>تسلط<b>${fa4(s.mastery)}٪</b></div>
            <div>واحد<b>${fa4(m.units || 3)}</b></div>
            <div>نمره/هدف<b>${fa4(est)} / ${fa4(m.target_grade || 18.5)}</b></div>
          </div>
          <div class="action-row">
            <button class="btn pale" data-edit-subject="${s.id}">✎ ویرایش درس و نمره</button>
            <button class="btn pale" data-del-subject="${s.id}">حذف</button>
          </div>
        </article>`;
    }).join('');
  }

  // 5. Render Interactive RPG Skill Tree & Exam Boss Arena
  renderSkillTree(d4);
  renderBossArena(d4);

  // 6. Render Hex Radar, Daily Quests & Streak Shield, Time Machine, Heatmap & Badges in Insights
  if ($4('#v4InsightsExtra') && g) {
    const heatMapObj = Object.fromEntries((d4.heatmap || []).map(h => [h.day, Number(h.minutes || 0)]));
    const cells = [];
    const baseDate = d4.now?.date || new Date().toISOString().slice(0, 10);
    for (let i = 59; i >= 0; i--) {
      const d = new Date(`${baseDate}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const mins = heatMapObj[iso] || 0;
      const lvl = mins >= 120 ? 'l4' : mins >= 75 ? 'l3' : mins >= 35 ? 'l2' : mins > 0 ? 'l1' : '';
      cells.push(`<div class="heat-cell ${lvl}" title="${iso}: ${fa4(mins)} دقیقه مطالعه"></div>`);
    }
    const quests = g.dailyQuests || [];
    $4('#v4InsightsExtra').innerHTML = `
      <div class="grid two" style="margin-top:16px">
        <article class="panel radar-wrap">
          <div class="panel-head" style="width:100%">
            <div><small>RPG 6-AXIS ABILITY RADAR</small><h3>🧬 رادار ۶ ضلعی توانایی‌های علمی</h3></div>
            <span class="shield-badge">🛡️ ${fa4(g.streakShields || 1)} سپر محافظ زنجیره</span>
          </div>
          ${buildHexRadarSvg(g.radar || {})}
        </article>
        <article class="panel">
          <div class="panel-head">
            <div><small>DAILY QUESTS & STREAK SHIELD</small><h3>🎯 مأموریت‌های روزانه و شبیه‌ساز ماشین زمان</h3></div>
          </div>
          <div style="margin:8px 0 14px">
            ${quests.map(q => `
              <div class="quest-item ${q.done ? 'done' : ''}">
                <div>
                  <b>${q.done ? '✅' : '🎯'} ${esc4(q.title)}</b>
                  <small style="display:block;color:var(--muted)">پیشرفت: ${fa4(q.current)} از ${fa4(q.target)}</small>
                </div>
                <span class="tag">+${fa4(q.xp)} XP</span>
              </div>`).join('')}
          </div>
          <div style="border-top:1px dashed var(--line);padding-top:12px">
            <h4 style="margin:0 0 8px;font-size:12px">🔮 ماشین زمان و شبیه‌ساز آیندهٔ ترم (What-If Simulator)</h4>
            <div class="cols three">
              <label>ساعت مطالعه روزانه (<span id="tmHoursVal">۳.۵ ساعت در روز</span>)
                <input type="range" id="tmHours" min="1" max="8" step="0.5" value="3.5" class="tm-slider">
              </label>
              <label>مرور فلش‌کارت (<span id="tmCardsVal">۱۰ کارت در روز</span>)
                <input type="range" id="tmCards" min="0" max="30" step="2" value="10" class="tm-slider">
              </label>
              <label>کیفیت تمرکز (<span id="tmFocusVal">۴ از ۵</span>)
                <input type="range" id="tmFocus" min="1" max="5" step="0.5" value="4" class="tm-slider">
              </label>
            </div>
            <div id="tmResultBox"></div>
          </div>
        </article>
      </div>
      <div class="grid two" style="margin-top:16px">
        <article class="panel heatmap-wrap">
          <h3>🔥 جدول حرارتی پیوستگی مطالعه (۶۰ روز اخیر)</h3>
          <div class="heatmap-grid">${cells.join('')}</div>
        </article>
        <article class="panel">
          <h3>🏆 نشان‌های افتخار (${fa4(g.badges.filter(b => b.unlocked).length)} از ${fa4(g.badges.length)})</h3>
          <div class="badges-grid">
            ${g.badges.map(b => `
              <div class="badge-item ${b.unlocked ? 'unlocked' : ''}">
                <i>${b.icon}</i>
                <div><b>${esc4(b.title)}</b><small>${esc4(b.desc)}</small></div>
              </div>`).join('')}
          </div>
        </article>
      </div>`;
    updateTimeMachine();
  }
}

function buildHexRadarSvg(r = {}) {
  const axes = [
    { key: 'knowledge', label: 'علم و تسلط', angle: -90 },
    { key: 'focus', label: 'تمرکز عمیق', angle: -30 },
    { key: 'memory', label: 'حافظه بلندمدت', angle: 30 },
    { key: 'discipline', label: 'نظم و پیوستگی', angle: 90 },
    { key: 'vitality', label: 'انرژی و تعادل', angle: 150 },
    { key: 'precision', label: 'دقت آزمونی', angle: 210 }
  ];
  const cx = 140, cy = 125, maxR = 78;
  const pt = (deg, radius) => {
    const rad = (deg * Math.PI) / 180;
    return [Math.round((cx + radius * Math.cos(rad)) * 10) / 10, Math.round((cy + radius * Math.sin(rad)) * 10) / 10];
  };
  const rings = [0.33, 0.66, 1].map(scale => {
    const pts = axes.map(a => pt(a.angle, maxR * scale).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="${scale < 1 ? '3,3' : ''}" />`;
  }).join('');
  const spokes = axes.map(a => {
    const [x, y] = pt(a.angle, maxR);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1" />`;
  }).join('');
  const valPts = axes.map(a => {
    const v = Math.min(100, Math.max(15, Number(r[a.key] || 50))) / 100;
    return pt(a.angle, maxR * v).join(',');
  }).join(' ');
  const dotsAndLabels = axes.map(a => {
    const val = Math.min(100, Math.max(15, Number(r[a.key] || 50)));
    const [dx, dy] = pt(a.angle, maxR * (val / 100));
    const [lx, ly] = pt(a.angle, maxR + 24);
    return `
      <circle cx="${dx}" cy="${dy}" r="4" fill="var(--green)" />
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--ink)" font-size="9.5" font-weight="700">${a.label} (${fa4(val)})</text>`;
  }).join('');
  return `<svg viewBox="0 0 280 250" width="100%" style="max-width:300px;overflow:visible">
    ${rings}${spokes}
    <polygon points="${valPts}" fill="rgba(20, 118, 87, 0.28)" stroke="var(--green)" stroke-width="2.4" />
    ${dotsAndLabels}
  </svg>`;
}

function renderSkillTree(data) {
  const box = $4('#skillTreeContainer');
  if (!box) return;
  const subs = (data.subjects || []).filter(s => s.name !== 'ورزش');
  const topics = data.topics || [];
  const decayedIds = new Set(data.gamification?.decayedSubjectIds || []);

  box.innerHTML = subs.map(s => {
    const sTopics = topics
      .filter(t => t.subject_id === s.id)
      .sort((a, b) => (a.order_index || a.id) - (b.order_index || b.id));
    const isDecayed = decayedIds.has(s.id);
    const nodesHtml = sTopics.map((t, idx) => {
      const m = Number(t.mastery || 0);
      const prevM = idx === 0 ? 100 : Number(sTopics[idx - 1].mastery || 0);
      let state = 'unlocked';
      let badge = '🔓 آماده یادگیری';
      if (m >= 75) {
        state = 'mastered';
        badge = '👑 مسلط (فتح‌شده)';
      } else if (m >= 35) {
        state = 'learning';
        badge = '⚡ در حال پیشروی';
      } else if (idx > 0 && prevM < 40) {
        state = 'locked';
        badge = '🔒 نیازمند پیش‌نیاز قبلی';
      }
      const connector = idx < sTopics.length - 1
        ? `<div class="skill-connector ${m < 40 ? 'locked' : ''}" title="زنجیره پیش‌نیاز">━━▶</div>`
        : '';
      return `
        <div class="skill-node ${state}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px">
              <span class="skill-tier-badge">مرحله ${fa4(idx + 1)} · ${badge}</span>
              <b style="font-size:11px;color:${m >= 75 ? 'var(--gold)' : 'var(--green)'}">${fa4(m)}٪</b>
            </div>
            <h4 style="margin:4px 0 8px;font-size:12px">${esc4(t.title)}</h4>
            <div class="bar" style="margin-bottom:10px"><i style="width:${m}%;background:${m >= 75 ? 'var(--gold)' : s.color || 'var(--green)'}"></i></div>
          </div>
          <div class="action-row" style="margin-top:4px">
            <button type="button" class="btn primary" style="padding:5px 9px;font-size:9.5px" data-boost-topic="${t.id}">⚡ چالش ارتقا (+۲۰٪)</button>
            <button type="button" class="btn pale" style="padding:5px 9px;font-size:9.5px" data-topic-quiz="${esc4(t.title)}" data-topic-sub="${s.id}">🎯 تست AI</button>
          </div>
        </div>${connector}`;
    }).join('');

    return `
      <article class="skill-subject-map ${isDecayed ? 'decayed' : ''}">
        <div class="skill-map-head">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span class="dot" style="background:${s.color};width:12px;height:12px;border-radius:50%;display:inline-block"></span>
            <h3 style="margin:0;font-size:14px">${esc4(s.name)} — تسلط کل: ${fa4(s.mastery)}٪</h3>
            ${isDecayed ? `<span class="decay-pill">🕸️ هشدار زنگ‌زدگی حافظه: چند روز مرور نشده!</span>` : `<span class="tag">✅ حافظه پویا</span>`}
          </div>
          <small style="color:var(--muted)">از چپ به راست: با رساندن هر گره به ۴۰٪، قفل مبحث بعدی باز می‌شود</small>
        </div>
        <div class="skill-chain">${nodesHtml || '<div class="empty">سرفصلی برای این درس ثبت نشده است.</div>'}</div>
      </article>`;
  }).join('');
}

function renderBossArena(data) {
  const arena = $4('#bossArenaExams');
  if (!arena) return;
  const bosses = data.gamification?.bosses || [];
  arena.innerHTML = bosses.map(b => `
    <article class="boss-card ${b.defeated ? 'defeated' : ''}">
      <div class="note-head">
        <div>
          <small style="color:var(--red);font-weight:700">${b.defeated ? '🏆 غول شکست خورد!' : `⏳ ${fa4(b.daysLeft)} روز تا نبرد نهایی`}</small>
          <h3 style="margin:2px 0 0">${esc4(b.title)}</h3>
        </div>
        <span class="tag">${esc4(b.subject_name)}</span>
      </div>
      <div class="boss-hp-bar">
        <div class="boss-hp-fill" style="width:${b.hpPercent}%"></div>
      </div>
      <div class="boss-stats">
        <span>❤️ جان باقی‌مانده: <b>${fa4(b.currentHp)} / ${fa4(b.maxHp)} HP</b> (${fa4(b.hpPercent)}٪)</span>
        <span>⚔️ آسیب واردشده: <b>${fa4(b.damageDealt)} DMG</b></span>
      </div>
      <div class="action-row">
        <button type="button" class="btn primary" data-boss-attack="${b.subject_id}">💥 ضربه تمرکز (-۱۵۰ HP)</button>
        <button type="button" class="btn pale" data-boss-quiz="${b.subject_id}" data-boss-topic="${esc4(b.title)}">⚔️ حمله با تست ۴ گزینه‌ای AI</button>
      </div>
    </article>`).join('') || '<div class="empty">هیچ غول امتحانی فعالی یافت نشد.</div>';
}

function updateTimeMachine() {
  const box = $4('#tmResultBox');
  if (!box || !d4) return;
  const hrs = Number($4('#tmHours')?.value || 3.5);
  const cards = Number($4('#tmCards')?.value || 10);
  const foc = Number($4('#tmFocus')?.value || 4);
  if ($4('#tmHoursVal')) $4('#tmHoursVal').textContent = `${fa4(hrs)} ساعت در روز`;
  if ($4('#tmCardsVal')) $4('#tmCardsVal').textContent = `${fa4(cards)} کارت در روز`;
  if ($4('#tmFocusVal')) $4('#tmFocusVal').textContent = `${fa4(foc)} از ۵`;

  const curGpa = Number(d4.academic?.gpa || 17.2);
  const curMastery = Number(d4.academic?.avgMastery || 45);
  const deltaGpa = ((hrs - 2.2) * 0.42) + ((cards - 5) * 0.035) + ((foc - 3) * 0.25);
  const predGpa = Math.min(20, Math.max(12, Math.round((curGpa + deltaGpa) * 100) / 100));
  const predMastery = Math.min(100, Math.max(20, Math.round(curMastery + hrs * 6.5 + cards * 0.8 + foc * 2.5)));
  const bossWinProb = Math.min(99, Math.max(25, Math.round(predMastery * 0.75 + foc * 5)));
  const statusText = hrs > 6.5
    ? '⚠️ هشدار ماشین زمان: مطالعه بیش از ۶.۵ ساعت روزانه ریسک فرسودگی را بالا می‌برد؛ حتماً استراحت ثبت کن.'
    : predGpa >= 18.5
    ? '🌟 مسیر درخشان: با این فرمان، معدل الف (ممتاز) و شکست کامل غول‌های امتحان تضمین است!'
    : '📈 مسیر رو به رشد: افزایش نیم ساعت تمرکز روزانه یا ۵ فلش‌کارت بیشتر، جهش بزرگی در معدل ایجاد می‌کند.';

  box.innerHTML = `
    <div class="subject-meta-row" style="grid-template-columns:repeat(3,1fr);margin-top:10px">
      <div>معدل پیش‌بینی‌شده پایان ترم<b>${fa4(predGpa)} از ۲۰</b></div>
      <div>میانگین تسلط ۳۰ روز آینده<b>${fa4(predMastery)}٪</b></div>
      <div>شانس پیروزی در امتحانات<b>${fa4(bossWinProb)}٪</b></div>
    </div>
    <p style="font-size:10px;color:var(--muted);margin:6px 0 0">${statusText}</p>`;
}

const DONUT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#64748b'];

function buildFinanceDonutSvg(breakdown = [], monthExpense = 0, monthlyBudget = 15000000) {
  const budgetPct = monthlyBudget > 0 ? Math.min(100, Math.round((monthExpense / monthlyBudget) * 100)) : 0;
  const remaining = monthlyBudget - monthExpense;
  const budgetBarHtml = `
    <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:13px 15px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:7px">
        <span>سقف بودجه ماهانه: <b>${fa4(monthlyBudget)} تومان</b></span>
        <b style="color:${budgetPct >= 85 ? 'var(--red)' : 'var(--green)'}">${fa4(budgetPct)}٪ مصرف‌شده</b>
      </div>
      <div class="bar"><i style="width:${budgetPct}%;background:${budgetPct >= 85 ? 'var(--red)' : 'linear-gradient(90deg,var(--green2),var(--gold))'}"></i></div>
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-top:7px">
        <span>خرج این ماه: ${humanToman(monthExpense)}</span>
        <span>${remaining >= 0 ? `باقی‌مانده امن: ${humanToman(remaining)}` : `عبور از بودجه: ${humanToman(-remaining)}`}</span>
      </div>
    </div>`;

  if (!breakdown.length || monthExpense <= 0) {
    return `${budgetBarHtml}<div class="empty">هنوز خرجی در این ماه ثبت نشده است؛ اولین تراکنش خود را ثبت کنید تا نمودار تفکیک ساخته شود.</div>`;
  }

  const r = 58, c = 2 * Math.PI * r;
  let offset = 0;
  const circles = breakdown.slice(0, 7).map((item, idx) => {
    const frac = item.amount / monthExpense;
    const len = frac * c;
    const seg = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${DONUT_COLORS[idx % DONUT_COLORS.length]}" stroke-width="20" stroke-dasharray="${len.toFixed(1)} ${(c - len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 80 80)" />`;
    offset += len;
    return seg;
  }).join('');

  const legend = breakdown.slice(0, 6).map((item, idx) => {
    const pct = Math.round((item.amount / monthExpense) * 100);
    return `
      <div class="donut-legend-row">
        <span><i class="donut-dot" style="background:${DONUT_COLORS[idx % DONUT_COLORS.length]}"></i>${esc4(item.category)}</span>
        <b>${fa4(item.amount)} ت <small style="color:var(--muted)">(${fa4(pct)}٪)</small></b>
      </div>`;
  }).join('');

  return `
    ${budgetBarHtml}
    <div class="donut-layout">
      <svg viewBox="0 0 160 160" width="160" height="160" style="margin:0 auto;display:block">
        <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="20" />
        ${circles}
        <text x="80" y="75" text-anchor="middle" fill="var(--muted)" font-size="10" font-weight="700">خرج ماه</text>
        <text x="80" y="94" text-anchor="middle" fill="var(--ink)" font-size="12.5" font-weight="900">${fa4(Math.round(monthExpense / 1000))} هزار</text>
      </svg>
      <div>${legend}</div>
    </div>`;
}

function updateLifeCalculators() {
  const dongOut = $4('#calcDongOut');
  if (dongOut) {
    const total = parseNum4($4('#calcDongTotal')?.value || 0);
    const people = Math.max(1, parseNum4($4('#calcDongPeople')?.value || 1));
    const taxPct = Math.min(100, parseNum4($4('#calcDongTax')?.value || 0));
    const finalTotal = Math.round(total * (1 + taxPct / 100));
    const perPerson = Math.ceil(finalTotal / people / 1000) * 1000 || Math.round(finalTotal / people);
    dongOut.innerHTML = `
      <div><small style="color:var(--muted)">مبلغ نهایی با سرویس</small><b>${fa4(finalTotal)} ت</b><small style="color:var(--muted)">${humanToman(finalTotal)}</small></div>
      <div><small style="color:var(--muted)">سهم دقیق هر نفر (${fa4(people)} نفر)</small><b>${fa4(perPerson)} ت</b><small style="color:var(--muted)">${humanToman(perPerson)}</small></div>`;
  }

  const saveOut = $4('#calcSaveOut');
  if (saveOut) {
    const orig = parseNum4($4('#calcOrigPrice')?.value || 0);
    const disc = Math.min(99, parseNum4($4('#calcDiscPct')?.value || 0));
    const monthlySave = parseNum4($4('#calcMonthlySave')?.value || 0);
    const profit = Math.round((orig * disc) / 100);
    const finalPay = Math.max(0, orig - profit);
    const sixMonths = monthlySave * 6;
    const oneYear = monthlySave * 12;
    saveOut.innerHTML = `
      <div><small style="color:var(--muted)">قیمت پس از تخفیف</small><b>${fa4(finalPay)} ت</b><small style="color:var(--muted)">سود شما: ${humanToman(profit)}</small></div>
      <div><small style="color:var(--muted)">پس‌انداز ۶ ماهه</small><b>${humanToman(sixMonths)}</b><small style="color:var(--muted)">۱ ساله: ${humanToman(oneYear)}</small></div>`;
  }
}

function renderLifeAndFinance(data) {
  const life = data?.life;
  if (!life) return;

  // 1. Home Bento Showcase — 3D Metal Bank Card
  if ($4('#mwTitle')) $4('#mwTitle').textContent = life.walletCardName || 'کارت اصلی زندگی';
  animateBalance(life.balance);
  if ($4('#mwMonthIn')) $4('#mwMonthIn').textContent = `+ ${fa4(life.monthIncome)} ت`;
  if ($4('#mwMonthOut')) $4('#mwMonthOut').textContent = `${fa4(life.monthExpense)} ت`;
  if ($4('#mwBudgetFill')) {
    $4('#mwBudgetFill').style.width = `${life.budgetUsedPct || 0}%`;
    $4('#mwBudgetFill').style.background = (life.budgetUsedPct || 0) >= 85
      ? 'linear-gradient(90deg, #fbbf24, #f43f5e)'
      : 'linear-gradient(90deg, #34d399, #fbbf24)';
  }

  // 2. Home Bento Center — Interactive Daily Habits Strip
  const homeHabits = $4('#homeHabitsStrip');
  if (homeHabits) {
    const habits = life.habits || [];
    homeHabits.innerHTML = habits.map(h => `
      <button type="button" class="habit-chip ${h.doneToday ? 'done' : ''}" data-toggle-habit="${h.id}" title="برای ثبت یا لغو انجام امروز کلیک کنید">
        <span>${h.doneToday ? '✓' : esc4(h.icon || '✨')}</span>
        <span>${esc4(h.title)}</span>
      </button>`).join('') + `<button type="button" class="habit-chip" data-goto="life">＋ مدیریت عادت‌ها</button>`;
  }

  // 3. Home Bento Left — Debt, Receivable, Bills & Top Goal
  const ds = life.debtSummary || { openPayable: 0, openReceivable: 0, openBills: 0 };
  if ($4('#homeDebtSummary')) {
    $4('#homeDebtSummary').innerHTML = `
      <div class="debt-mini-box rec"><span>🟢 طلب من از دیگران</span><b>${fa4(ds.openReceivable)} ت</b></div>
      <div class="debt-mini-box pay"><span>🔴 بدهی من به دیگران</span><b>${fa4(ds.openPayable)} ت</b></div>
      <div class="debt-mini-box bill"><span>🟡 قبوض و اقساط باز</span><b>${fa4(ds.openBills)} ت</b></div>`;
  }
  if ($4('#homeGoalsPreview')) {
    const topGoal = (life.goals || [])[0];
    if (topGoal) {
      const pct = Math.min(100, Math.round((Number(topGoal.saved_amount || 0) / Math.max(1, Number(topGoal.target_amount || 1))) * 100));
      $4('#homeGoalsPreview').innerHTML = `
        <div style="padding:10px 12px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:5px">
            <b>${esc4(topGoal.icon || '💎')} ${esc4(topGoal.title)}</b>
            <span style="color:var(--green);font-weight:800">${fa4(pct)}٪</span>
          </div>
          <div class="bar"><i style="width:${pct}%;background:${topGoal.color || 'var(--green)'}"></i></div>
        </div>`;
    } else {
      $4('#homeGoalsPreview').innerHTML = '';
    }
  }

  // 4. Full #page-finance Rendering
  if ($4('#financeKpiRow')) {
    const netObligations = ds.openReceivable - ds.openPayable - ds.openBills;
    $4('#financeKpiRow').innerHTML = `
      <article class="finance-kpi">
        <small>تراز خالص کیف پول</small>
        <b style="color:${life.balance < 0 ? 'var(--red)' : 'var(--green)'}">${life.balance < 0 ? '−' : ''}${fa4(Math.abs(life.balance))} ت</b>
        <span>${humanToman(life.balance)}</span>
      </article>
      <article class="finance-kpi">
        <small>ورودی و درآمد این ماه</small>
        <b style="color:#10b981">+${fa4(life.monthIncome)} ت</b>
        <span>${humanToman(life.monthIncome)}</span>
      </article>
      <article class="finance-kpi">
        <small>مخارج این ماه</small>
        <b style="color:#f43f5e">${fa4(life.monthExpense)} ت</b>
        <span>${fa4(life.budgetUsedPct)}٪ از بودجه ماهانه</span>
      </article>
      <article class="finance-kpi">
        <small>تراز طلب و بدهی دفتری</small>
        <b style="color:${netObligations < 0 ? 'var(--gold)' : 'var(--ink)'}">${netObligations < 0 ? '−' : '+'}${fa4(Math.abs(netObligations))} ت</b>
        <span>طلب: ${fa4(ds.openReceivable)} · بدهی/قبض: ${fa4(ds.openPayable + ds.openBills)}</span>
      </article>`;
  }

  if ($4('#financeDonutBox')) {
    $4('#financeDonutBox').innerHTML = buildFinanceDonutSvg(life.categoryBreakdown || [], life.monthExpense || 0, life.monthlyBudget || 15000000);
  }

  if ($4('#txList')) {
    const allTx = life.transactions || [];
    const list = txFilter === 'all' ? allTx : allTx.filter(t => t.kind === txFilter);
    const catIcons = {
      'خوراک و کافه': '☕',
      'خرید روزمره': '🛒',
      'رفت‌وآمد': '🚕',
      'قبض و مسکن': '🏠',
      'خرید شخصی و پوشاک': '👕',
      'دانشگاه و آموزش': '📚',
      'سلامت و ورزش': '💊',
      'تفریح و سفر': '🎬',
      'حقوق و درآمد': '💰'
    };
    $4('#txList').innerHTML = list.length ? list.slice(0, 40).map(tx => `
      <div class="tx-row">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="width:40px;height:40px;border-radius:12px;background:var(--card-bg);border:1px solid var(--line);display:grid;place-items:center;font-size:18px">
            ${catIcons[tx.category] || (tx.kind === 'income' ? '💰' : '💳')}
          </span>
          <div>
            <b style="font-size:14px">${esc4(tx.title)}</b>
            <small style="display:block;color:var(--muted);font-size:11.5px">${esc4(tx.category || 'سایر')} · ${jDate4(tx.tx_date)}${tx.note ? ` · ${esc4(tx.note)}` : ''}</small>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="tx-amt ${tx.kind}">${tx.kind === 'income' ? '+' : '−'}${fa4(tx.amount)} ت</span>
          <button type="button" class="remove" data-del-tx="${tx.id}" title="حذف تراکنش">×</button>
        </div>
      </div>`).join('') : '<div class="empty">تراکنشی در این فیلتر ثبت نشده است.</div>';
  }

  if ($4('#debtList')) {
    const debts = life.debts || [];
    const kindMeta = {
      payable: { label: 'بدهی من', badge: '🔴' },
      receivable: { label: 'طلب من', badge: '🟢' },
      bill: { label: 'قبض / قسط', badge: '🟡' }
    };
    $4('#debtList').innerHTML = debts.length ? debts.map(d => {
      const km = kindMeta[d.kind] || kindMeta.payable;
      const settled = d.status === 'settled';
      return `
        <div class="tx-row" style="${settled ? 'opacity:0.55' : ''}">
          <div>
            <b style="${settled ? 'text-decoration:line-through' : ''}">${km.badge} ${esc4(d.person_or_title)}</b>
            <small style="display:block;color:var(--muted)">${km.label} · ${d.due_date ? `سررسید: ${jDate4(d.due_date)}` : 'بدون تاریخ سررسید'}</small>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <b style="font-size:13.5px">${fa4(d.amount)} ت</b>
            <button type="button" class="btn pale" style="padding:5px 10px;font-size:11px" data-settle-debt="${d.id}" data-next-status="${settled ? 'open' : 'settled'}">
              ${settled ? '↺ بازگردانی' : '✓ تسویه شد'}
            </button>
            <button type="button" class="remove" data-del-debt="${d.id}" title="حذف">×</button>
          </div>
        </div>`;
    }).join('') : '<div class="empty">هیچ بدهی، طلب یا قبضی ثبت نشده است ✨</div>';
  }

  if ($4('#goalList')) {
    const goals = life.goals || [];
    $4('#goalList').innerHTML = goals.length ? goals.map(gItem => {
      const pct = Math.min(100, Math.round((Number(gItem.saved_amount || 0) / Math.max(1, Number(gItem.target_amount || 1))) * 100));
      return `
        <div class="goal-jar-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <b style="font-size:14px">${esc4(gItem.icon || '💎')} ${esc4(gItem.title)}</b>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="tag">${fa4(pct)}٪</span>
              <button type="button" class="remove" data-del-goal="${gItem.id}" title="حذف قلک">×</button>
            </div>
          </div>
          <div class="bar" style="margin-bottom:8px"><i style="width:${pct}%;background:${gItem.color || 'var(--green)'}"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:10px">
            <span>پس‌انداز فعلی: <b style="color:var(--ink)">${fa4(gItem.saved_amount)} ت</b></span>
            <span>هدف: ${humanToman(gItem.target_amount)}</span>
          </div>
          <div class="action-row" style="margin:0">
            <button type="button" class="btn pale" style="padding:5px 10px;font-size:11px" data-deposit-goal="${gItem.id}" data-deposit-amt="200000">+۲۰۰ هزار</button>
            <button type="button" class="btn pale" style="padding:5px 10px;font-size:11px" data-deposit-goal="${gItem.id}" data-deposit-amt="1000000">+۱ میلیون</button>
            <button type="button" class="btn primary" style="padding:5px 11px;font-size:11px" data-deposit-goal="${gItem.id}" data-deposit-amt="custom">＋ واریز دلخواه</button>
          </div>
        </div>`;
    }).join('') : '<div class="empty">هنوز قلک پس‌اندازی نساخته‌اید.</div>';
  }

  // 5. Full #page-life Habits Grid & Calculators
  if ($4('#lifeHabitsGrid')) {
    const habits = life.habits || [];
    $4('#lifeHabitsGrid').innerHTML = habits.length ? habits.map(h => {
      const wkPct = Math.min(100, Math.round(((h.weekCount || 0) / 7) * 100));
      return `
        <article class="habit-card-full ${h.doneToday ? 'done' : ''}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:24px">${esc4(h.icon || '✨')}</span>
              <button type="button" class="remove" data-del-habit="${h.id}" title="حذف عادت">×</button>
            </div>
            <h3 style="margin:10px 0 4px;font-size:15px">${esc4(h.title)}</h3>
            <small style="color:var(--muted)">عملکرد ۷ روز اخیر: <b>${fa4(h.weekCount || 0)} از ۷ روز</b></small>
            <div class="bar" style="margin-top:8px"><i style="width:${wkPct}%;background:${h.color || 'var(--green)'}"></i></div>
          </div>
          <button type="button" class="btn ${h.doneToday ? 'pale' : 'primary'} full" data-toggle-habit="${h.id}">
            ${h.doneToday ? '✓ امروز انجام شد (لغو)' : 'ثبت انجام امروز'}
          </button>
        </article>`;
    }).join('') : '<div class="empty">اولین عادت روزانه خود را از فرم زیر اضافه کنید.</div>';
  }

  updateLifeCalculators();
}

function updateAmtPreview(inputId, previewId) {
  const inp = $4(`#${inputId}`);
  const prev = $4(`#${previewId}`);
  if (!inp || !prev) return;
  const val = parseNum4(inp.value);
  prev.textContent = val > 0 ? `${fa4(val)} تومان — معادل ${humanToman(val)}` : '';
}

function renderCommandPalette(query = '') {
  const q = query.trim().toLowerCase();
  const items = [
    { label: '💳 ثبت سریع خرج یا درآمد جدید', sub: 'حساب‌وکتاب', act: () => $4('#quickTxDialog')?.showModal() },
    { label: '📊 بازکردن میز کامل حساب‌وکتاب مالی', sub: 'امور مالی', act: () => window.spPage('finance') },
    { label: '🌿 روتین روزانه، عادت‌ها و ماشین‌حساب دُنگ', sub: 'زندگی', act: () => window.spPage('life') },
    { label: '🎨 تغییر پوسته ظاهری (تیتانیوم / کرم روشن / طلایی)', sub: 'ظاهر سایت', act: () => $4('#themeToggle')?.click() },
    { label: '＋ افزودن کار جدید به لیست روزانه', sub: 'برنامه', act: () => $4('.addTask')?.click() },
    { label: '📓 ثبت یادداشت یا جزوه تازه', sub: 'یادداشت', act: () => { window.spPage('notes'); $4('#addNoteBtn')?.click(); } },
    { label: '◴ ورود به اتاق تمرکز و تایمر', sub: 'تمرکز', act: () => window.spPage('focus') }
  ];
  if (d4) {
    (d4.life?.transactions || []).slice(0, 12).forEach(tx => {
      items.push({ label: `💳 تراکنش: ${tx.title} (${fa4(tx.amount)} ت)`, sub: tx.category || 'مالی', act: () => window.spPage('finance') });
    });
    (d4.life?.debts || []).filter(d => d.status === 'open').forEach(d => {
      items.push({ label: `🤝 تعهد مالی: ${d.person_or_title} (${fa4(d.amount)} ت)`, sub: 'طلب و بدهی', act: () => window.spPage('finance') });
    });
    (d4.tasks || []).filter(t => t.status !== 'done').slice(0, 12).forEach(t => {
      items.push({ label: `✓ کار: ${t.title}`, sub: t.subject_name || 'برنامه', act: () => window.spPage('tasks') });
    });
    (d4.notes || []).forEach(n => {
      items.push({ label: `📓 یادداشت: ${n.title}`, sub: n.subject_name || 'یادداشت', act: () => window.spPage('notes') });
    });
  }
  const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)) : items.slice(0, 10);
  const listEl = $4('#cmdList');
  if (!listEl) return;
  listEl.innerHTML = filtered.map((item, idx) => `<button type="button" class="cmd-item" data-cmd-idx="${idx}"><span>${esc4(item.label)}</span><small style="color:var(--muted)">${esc4(item.sub)}</small></button>`).join('') || '<div class="empty">نتیجه‌ای یافت نشد</div>';
  listEl._items = filtered;
}

function bindV4Events() {
  window.addEventListener('sp:loaded', e => renderV4(e.detail));

  // Keyboard shortcut Ctrl+K / Cmd+K
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      renderCommandPalette('');
      $4('#cmdDialog')?.showModal();
      $4('#cmdInput')?.focus();
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'cmdInput') renderCommandPalette(e.target.value);
    if (e.target.classList?.contains('tm-slider')) updateTimeMachine();
    if (e.target.classList?.contains('life-calc-in')) updateLifeCalculators();
    if (e.target.id === 'txAmountInput') updateAmtPreview('txAmountInput', 'txAmountPreview');
    if (e.target.id === 'qTxAmtInput') updateAmtPreview('qTxAmtInput', 'qTxAmtPreview');
    if (e.target.id === 'budgetAmountIn') updateAmtPreview('budgetAmountIn', 'budgetAmtPreview');
  });

  let speechRec = null;
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-card-idx]')) {
      setTimeout(() => upgrade3DFlashcard(d4), 10);
    }
    if (e.target.tagName === 'DIALOG') {
      e.target.close();
      return;
    }
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.dataset.page || b.dataset.goto || b.dataset.dockPage) {
        playTick();
        setTimeout(syncActiveDock, 20);
      }
      if (b.id === 'togglePrivacyBtn') {
        togglePrivacyMode();
        return;
      }
      if (b.id === 'academicDrawerBtn') {
        playTick();
        b.classList.toggle('open');
        $4('#academicDrawerBody')?.classList.toggle('open');
        return;
      }
      // Quick Transaction & Budget Modals
      if (b.id === 'quickExpenseTopBtn' || b.id === 'homeAddTxBtn' || b.id === 'openQuickTxBtn') {
        $4('#quickTxForm')?.reset();
        updateAmtPreview('qTxAmtInput', 'qTxAmtPreview');
        $4('#quickTxDialog')?.showModal();
        setTimeout(() => $4('#quickTxForm [name="title"]')?.focus(), 50);
      }
      if (b.id === 'editBudgetBtn') {
        const life = d4?.life || {};
        if ($4('#budgetCardNameIn')) $4('#budgetCardNameIn').value = life.walletCardName || 'کارت اصلی زندگی';
        if ($4('#budgetAmountIn')) $4('#budgetAmountIn').value = life.monthlyBudget || 15000000;
        updateAmtPreview('budgetAmountIn', 'budgetAmtPreview');
        $4('#budgetDialog')?.showModal();
      }
      if (b.dataset.txKind) {
        const form = $4(`#${b.dataset.targetForm}`);
        if (form) {
          form.querySelector('[name="kind"]').value = b.dataset.txKind;
          $$4('[data-tx-kind]', form).forEach(x => x.classList.toggle('active', x === b));
          const catSel = form.querySelector('[name="category"]');
          if (catSel && b.dataset.txKind === 'income') catSel.value = 'حقوق و درآمد';
          else if (catSel && catSel.value === 'حقوق و درآمد') catSel.value = 'خوراک و کافه';
        }
      }
      if (b.dataset.addAmt !== undefined) {
        const inp = $4(`#${b.dataset.amtInput}`);
        if (inp) {
          const add = Number(b.dataset.addAmt);
          inp.value = add === 0 ? '' : String(parseNum4(inp.value) + add);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (b.dataset.txFilter) {
        txFilter = b.dataset.txFilter;
        $$4('#txFilterChips button').forEach(x => x.classList.toggle('active', x === b));
        renderLifeAndFinance(d4);
      }
      if (b.dataset.delTx && confirm('این تراکنش از دفتر حساب‌وکتاب حذف شود؟')) {
        await api4(`/api/v4/life/transactions/${b.dataset.delTx}`, { method: 'DELETE' });
        toast4('تراکنش حذف شد');
        await window.spReload?.();
      }
      if (b.dataset.settleDebt) {
        const nextStatus = b.dataset.nextStatus || 'settled';
        await api4(`/api/v4/life/debts/${b.dataset.settleDebt}`, { method: 'PATCH', body: { status: nextStatus } });
        if (nextStatus === 'settled') playChime('victory');
        toast4(nextStatus === 'settled' ? '✓ حساب با موفقیت تسویه شد' : 'حساب به وضعیت باز برگشت');
        await window.spReload?.();
      }
      if (b.dataset.delDebt && confirm('این مورد از دفتر طلب و بدهی حذف شود؟')) {
        await api4(`/api/v4/life/debts/${b.dataset.delDebt}`, { method: 'DELETE' });
        toast4('مورد حذف شد');
        await window.spReload?.();
      }
      if (b.dataset.depositGoal) {
        let amt = b.dataset.depositAmt === 'custom'
          ? parseNum4(prompt('مبلغ واریزی جدید به این قلک (به تومان):', '500000') || '0')
          : Number(b.dataset.depositAmt || 0);
        if (amt > 0) {
          await api4(`/api/v4/life/goals/${b.dataset.depositGoal}`, { method: 'PATCH', body: { add_amount: amt } });
          launchConfetti();
          toast4(`💎 ${humanToman(amt)} به قلک پس‌انداز اضافه شد!`);
          await window.spReload?.();
        }
      }
      if (b.dataset.delGoal && confirm('این قلک پس‌انداز حذف شود؟')) {
        await api4(`/api/v4/life/goals/${b.dataset.delGoal}`, { method: 'DELETE' });
        toast4('قلک حذف شد');
        await window.spReload?.();
      }
      if (b.dataset.toggleHabit) {
        b.disabled = true;
        const r = await api4(`/api/v4/life/habits/${b.dataset.toggleHabit}/toggle`, { method: 'POST' });
        if (r.done) playChime('start');
        toast4(r.done ? '✨ آفرین! عادت امروز ثبت شد' : 'ثبت امروز لغو شد');
        b.disabled = false;
        await window.spReload?.();
      }
      if (b.dataset.delHabit && confirm('این عادت روزانه حذف شود؟')) {
        await api4(`/api/v4/life/habits/${b.dataset.delHabit}`, { method: 'DELETE' });
        toast4('عادت حذف شد');
        await window.spReload?.();
      }
      if (b.id === 'flipCardBtn') {
        playChime('start');
        $4('#flipCardInner')?.classList.toggle('is-flipped');
      }
      if (b.id === 'voiceBriefBtn' || b.id === 'dockVoiceBtn') {
        toggleVoiceBriefing();
      }
      if (b.id === 'startBreathBtn') {
        toggleBreathingExercise();
      }
      if (b.dataset.dockPage) {
        window.spPage?.(b.dataset.dockPage);
      }
      if (b.id === 'toggleSkillTreeMode') {
        const tb = $4('#topicBoard');
        if (tb) {
          tb.classList.toggle('hidden');
          toast4(tb.classList.contains('hidden') ? 'فقط نمای درخت مهارت نمایش داده می‌شود 🌳' : 'اسلایدرهای کلاسیک در پایین درخت مهارت فعال شدند');
        }
      }
      if (b.dataset.boostTopic) {
        b.disabled = true;
        const r = await api4(`/api/v4/topics/${b.dataset.boostTopic}/boost`, { method: 'POST' });
        launchConfetti();
        toast4(`⚡ گره مهارت ارتقا یافت! تسلط فعلی: ${fa4(r.mastery)}٪ (+۲۵ XP)`);
        b.disabled = false;
        await window.spReload?.();
      }
      if (b.dataset.bossAttack) {
        b.disabled = true;
        const r = await api4('/api/v4/bosses/attack', { method: 'POST', body: { subject_id: b.dataset.bossAttack, damage: 150 } });
        launchConfetti();
        toast4(`💥 ضربه سنگین وارد شد! (-${fa4(r.damage)} HP از جان غول امتحان کم شد)`);
        b.disabled = false;
        await window.spReload?.();
      }
      if (b.id === 'themeToggle') {
        const cur = document.documentElement.getAttribute('data-theme') || 'titanium';
        const order = ['titanium', 'light', 'royal', 'dark', 'cosmic'];
        const next = order[(order.indexOf(cur) + 1) % order.length];
        applyTheme(next);
        const names = {
          titanium: 'پوسته تیتانیوم مشکی (Apple Titanium) فعال شد 🖤',
          light: 'پوسته کرم روشن استودیویی (Cashmere Light) فعال شد 🤍',
          royal: 'پوسته طلایی سلطنتی (Royal Gold) فعال شد 👑',
          dark: 'پوسته زمرد تیره (Midnight Emerald) فعال شد 🌿',
          cosmic: 'پوسته کهکشانی (Cosmic Indigo) فعال شد 🌌'
        };
        toast4(names[next]);
      }
      if (b.id === 'cmdBtn') {
        renderCommandPalette('');
        $4('#cmdDialog')?.showModal();
        $4('#cmdInput')?.focus();
      }
      if (b.dataset.cmdIdx !== undefined) {
        const item = $4('#cmdList')?._items?.[+b.dataset.cmdIdx];
        $4('#cmdDialog')?.close();
        if (item) item.act();
      }
      if (b.dataset.sound) {
        $$4('[data-sound]').forEach(x => x.classList.toggle('active', x === b));
        startSound(b.dataset.sound);
        toast4(b.dataset.sound === 'off' ? 'صدای محیطی خاموش شد' : 'صدای محیطی تمرکز فعال شد 🎧');
      }
      if (b.id === 'zenToggle') {
        document.body.classList.toggle('zen-mode');
        b.classList.toggle('active', document.body.classList.contains('zen-mode'));
      }
      if (b.dataset.noteFilter) {
        noteFilter = b.dataset.noteFilter;
        renderV4(d4);
      }
      if (b.id === 'addNoteBtn') {
        $4('#noteForm').reset();
        $4('#noteForm [name=id]').value = '';
        $4('#noteDialogTitle').textContent = 'جزوه و خلاصه تازه';
        $4('#noteDialog').showModal();
      }
      if (b.dataset.editNote) {
        const n = (d4.notes || []).find(x => x.id === +b.dataset.editNote);
        if (n) {
          $4('#noteForm').reset();
          $4('#noteDialogTitle').textContent = 'ویرایش جزوه';
          $4('#noteForm [name=id]').value = n.id;
          $4('#noteForm [name=title]').value = n.title;
          $4('#noteForm [name=subject_id]').value = n.subject_id || '';
          $4('#noteForm [name=tags]').value = n.tags || '';
          $4('#noteForm [name=content]').value = n.content;
          $4('#noteForm [name=pinned]').checked = !!n.pinned;
          $4('#noteDialog').showModal();
        }
      }
      if (b.dataset.delNote && confirm('این جزوه حذف شود؟')) {
        await api4(`/api/v4/notes/${b.dataset.delNote}`, { method: 'DELETE' });
        toast4('جزوه حذف شد');
        await window.spReload?.();
      }
      if (b.id === 'addSubjectBtn') {
        $4('#subjectForm').reset();
        $4('#subjectForm [name=id]').value = '';
        $4('#subjectDialogTitle').textContent = 'افزودن درس جدید';
        $4('#subjectDialog').showModal();
      }
      if (b.dataset.editSubject) {
        const s = (d4.subjects || []).find(x => x.id === +b.dataset.editSubject);
        const m = (d4.subjectMeta || []).find(x => x.subject_id === +b.dataset.editSubject) || {};
        if (s) {
          $4('#subjectForm').reset();
          $4('#subjectDialogTitle').textContent = 'ویرایش درس و نمره';
          $4('#subjectForm [name=id]').value = s.id;
          $4('#subjectForm [name=name]').value = s.name;
          $4('#subjectForm [name=color]').value = s.color || '#147657';
          $4('#subjectForm [name=units]').value = m.units || 3;
          $4('#subjectForm [name=target_grade]').value = m.target_grade || 18.5;
          $4('#subjectForm [name=current_grade]').value = m.current_grade ?? '';
          $4('#subjectForm [name=mastery]').value = s.mastery || 0;
          $4('#subjectForm [name=priority]').value = s.priority || 3;
          $4('#subjectForm [name=target]').value = s.target || '';
          $4('#subjectDialog').showModal();
        }
      }
      if (b.dataset.delSubject && confirm('این درس حذف شود؟')) {
        await api4(`/api/v4/subjects/${b.dataset.delSubject}`, { method: 'DELETE' });
        toast4('درس حذف شد');
        await window.spReload?.();
      }
      if (b.id === 'restoreBtn') {
        $4('#restoreInput')?.click();
      }
    } catch (err) {
      toast4(err.message);
    }
  });

  document.addEventListener('change', async e => {
    if (e.target.id === 'restoreInput' && e.target.files?.[0]) {
      try {
        const text = await e.target.files[0].text();
        const json = JSON.parse(text);
        const r = await api4('/api/v4/restore', { method: 'POST', body: json });
        toast4(`بازیابی موفق: ${fa4(r.restored)} مورد بازگردانی شد`);
        await window.spReload?.();
      } catch {
        toast4('فایل پشتیبان معتبر نیست');
      }
    }
  });

  document.addEventListener('submit', async e => {
    try {
      if (e.target.id === 'txForm' || e.target.id === 'quickTxForm') {
        e.preventDefault();
        const o = Object.fromEntries(new FormData(e.target));
        o.amount = parseNum4(o.amount);
        if (!o.amount) {
          toast4('لطفاً مبلغ معتبر به تومان وارد کنید');
          return;
        }
        await api4('/api/v4/life/transactions', { method: 'POST', body: o });
        playChime('start');
        if (e.target.id === 'quickTxForm') $4('#quickTxDialog')?.close();
        e.target.reset();
        e.target.querySelector('[name="kind"]').value = 'expense';
        $$4('[data-tx-kind]', e.target).forEach(x => x.classList.toggle('active', x.dataset.txKind === 'expense'));
        const dateIn = e.target.querySelector('[name="tx_date"]');
        if (dateIn) dateIn.value = d4?.now?.date || new Date().toISOString().slice(0, 10);
        updateAmtPreview('txAmountInput', 'txAmountPreview');
        updateAmtPreview('qTxAmtInput', 'qTxAmtPreview');
        toast4(o.kind === 'income' ? `💰 ورودی ${humanToman(o.amount)} ثبت شد!` : `💳 خرج ${humanToman(o.amount)} ثبت شد`);
        await window.spReload?.();
      }
      if (e.target.id === 'budgetForm') {
        e.preventDefault();
        const o = Object.fromEntries(new FormData(e.target));
        o.monthly_budget = parseNum4(o.monthly_budget);
        await api4('/api/v4/life/budget', { method: 'PATCH', body: o });
        $4('#budgetDialog')?.close();
        toast4('تنظیمات بودجه ماهانه و نام کارت ذخیره شد ✨');
        await window.spReload?.();
      }
      if (e.target.id === 'debtForm') {
        e.preventDefault();
        const o = Object.fromEntries(new FormData(e.target));
        o.amount = parseNum4(o.amount);
        await api4('/api/v4/life/debts', { method: 'POST', body: o });
        e.target.reset();
        toast4('در دفتر طلب، بدهی و قبوض ثبت شد 🤝');
        await window.spReload?.();
      }
      if (e.target.id === 'goalForm') {
        e.preventDefault();
        const o = Object.fromEntries(new FormData(e.target));
        o.target_amount = parseNum4(o.target_amount);
        o.saved_amount = parseNum4(o.saved_amount);
        await api4('/api/v4/life/goals', { method: 'POST', body: o });
        e.target.reset();
        launchConfetti();
        toast4('💎 قلک پس‌انداز جدید ساخته شد!');
        await window.spReload?.();
      }
      if (e.target.id === 'habitForm') {
        e.preventDefault();
        const o = Object.fromEntries(new FormData(e.target));
        await api4('/api/v4/life/habits', { method: 'POST', body: o });
        e.target.reset();
        toast4('🌿 عادت جدید به روتین روزانه اضافه شد');
        await window.spReload?.();
      }
      if (e.target.id === 'noteForm') {
        e.preventDefault();
        const fd = new FormData(e.target);
        const o = Object.fromEntries(fd);
        o.pinned = fd.has('pinned');
        const id = o.id;
        delete o.id;
        if (id) await api4(`/api/v4/notes/${id}`, { method: 'PATCH', body: o });
        else await api4('/api/v4/notes', { method: 'POST', body: o });
        $4('#noteDialog').close();
        toast4('جزوه ذخیره شد (+۲۰ XP)');
        await window.spReload?.();
      }
      if (e.target.id === 'subjectForm') {
        e.preventDefault();
        const o = Object.fromEntries(new FormData(e.target));
        const id = o.id;
        delete o.id;
        if (id) await api4(`/api/v4/subjects/${id}`, { method: 'PATCH', body: o });
        else await api4('/api/v4/subjects', { method: 'POST', body: o });
        $4('#subjectDialog').close();
        toast4('اطلاعات درس و واحد ذخیره شد');
        await window.spReload?.();
      }
    } catch (err) {
      toast4(err.message);
    }
  });
}

injectV4();
if (window.__spData) renderV4(window.__spData);
