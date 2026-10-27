/**
 * Simorgh LifeOS — Offline-First Local Vault & Native Alarm/Widget Synchronizer
 * سازنده و معمار سیستم: سید هادی موسوی (Syed Hadi Mosavi)
 * شرکت سازنده: شرکت سیمرغ (Simorgh Co.)
 *
 * تمام داده‌های مالی، پیامک‌های تراکنش بانکی، عادت‌ها و برنامه‌ها ۱۰۰٪ آفلاین و خصوصی
 * روی حافظه دستگاه کاربر ذخیره می‌شوند و هیچ سروری به آن‌ها دسترسی ندارد.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'simorgh_lifeos_db_v1';
  const IDB_NAME = 'SimorghLifeOSVault';
  const IDB_STORE = 'kv';
  const originalFetch = window.fetch.bind(window);

  const pad = n => String(n).padStart(2, '0');

  function localNowParts(d = new Date()) {
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    const second = pad(d.getSeconds());
    const wkNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = wkNames[d.getDay()];
    return {
      year: String(year),
      month,
      day,
      hour,
      minute,
      second,
      weekday,
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`
    };
  }

  function jalaliDate(isoDate) {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate);
      const lang = localStorage.getItem('simorgh_lang') || 'fa';
      if (lang === 'en') {
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
      }
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'short' }).format(d);
    } catch {
      return isoDate;
    }
  }

  function weekdayIndex(shortName) {
    return ({ Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 })[shortName] ?? 0;
  }

  function addDays(iso, days) {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function minutesOf(t = '00:00') {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function fmtMin(m) {
    const safe = ((m % 1440) + 1440) % 1440;
    return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
  }

  function priorityScore(item, today) {
    const masteryGap = Math.max(0, 100 - Number(item.mastery || 0));
    const overdue = item.due_date && item.due_date < today ? 45 : 0;
    const quiz = item.kind === 'quiz' ? 35 : 0;
    const base = Number(item.priority || 3) * 12;
    return masteryGap * 0.55 + overdue + quiz + base;
  }

  function parseAmt(v) {
    const en = String(v ?? '0')
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[^0-9.-]/g, '');
    return Math.max(0, Math.round(Number(en || 0)));
  }

  function defaultDatabase() {
    const p = localNowParts();
    return {
      seq: 100,
      created_at: new Date().toISOString(),
      preferences: {
        monthly_budget: '18000000',
        wallet_card_name: 'کارت هوشمند سیمرغ',
        telegram_morning: 'true',
        telegram_evening: 'true',
        adaptive_reschedule: 'true',
        morning_brief_time: '08:00',
        evening_review_time: '22:00',
        daily_study_limit: '180',
        biometric_lock: 'false'
      },
      allowedSmsSenders: [],
      customBrand: { logoDataUrl: '', logoPreset: '🦅', titleFa: 'زندگی من · سیمرغ', titleEn: 'Simorgh LifeOS' },
      bankAccounts: {},
      seenSmsHashes: [],
      finance_transactions: [],
      finance_debts: [],
      finance_goals: [
        { id: 1, title: 'صندوق ذخیره اضطراری و آرامش', target_amount: 30000000, saved_amount: 0, icon: '💎', color: '#10b981' }
      ],
      life_habits: [
        { id: 1, title: 'نوشیدن ۸ لیوان آب', icon: '💧', color: '#38bdf8' },
        { id: 2, title: 'ورزش یا پیاده‌روی روزانه', icon: '🏃', color: '#10b981' },
        { id: 3, title: 'بررسی آرام دخل‌وخرج شبانه', icon: '💳', color: '#eab308' },
        { id: 4, title: 'مطالعه عمیق بدون موبایل', icon: '📖', color: '#818cf8' }
      ],
      life_habit_logs: [],
      subjects: [
        { id: 1, name: 'مهارت تخصصی و پروژه', color: '#10b981', mastery: 55, priority: 5, target: 'پیشرفت مستمر روزانه' },
        { id: 2, name: 'زبان انگلیسی', color: '#38bdf8', mastery: 62, priority: 4, target: 'تسلط مکالمه و متن' },
        { id: 3, name: 'مدیریت مالی و سرمایه‌گذاری', color: '#eab308', mastery: 48, priority: 4, target: 'سواد مالی شخصی' },
        { id: 4, name: 'ورزش', color: '#f472b6', mastery: 75, priority: 3, target: 'سلامتی و انرژی پایدار' }
      ],
      subject_meta: [
        { subject_id: 1, units: 3, target_grade: 19, current_grade: 17.5, professor: '' },
        { subject_id: 2, units: 2, target_grade: 19, current_grade: 18, professor: '' },
        { subject_id: 3, units: 2, target_grade: 20, current_grade: 17, professor: '' }
      ],
      tasks: [
        {
          id: 1,
          title: 'همگام‌سازی پیامک‌های بانکی و تنظیم بودجه ماهانه',
          subject_id: 3,
          kind: 'study',
          due_date: p.date,
          start_time: '20:00',
          duration: 20,
          status: 'todo',
          priority: 5,
          energy: 2,
          reschedule_count: 0,
          original_due_date: p.date
        }
      ],
      task_subtasks: [
        { id: 1, task_id: 1, title: 'تنظیم سقف بودجه ماهانه در بخش حساب‌وکتاب', done: 0 },
        { id: 2, task_id: 1, title: 'تست خواندن هوشمند پیامک بانکی و زنگ هشدار', done: 0 }
      ],
      schedule: [],
      topics: [
        { id: 1, subject_id: 1, title: 'مفاهیم پایه و نقشه راه', mastery: 65, status: 'learning', order_index: 1 },
        { id: 2, subject_id: 3, title: 'مدیریت بودجه ۵۰/۳۰/۲۰ و پس‌انداز خودکار', mastery: 50, status: 'learning', order_index: 1 }
      ],
      flashcards: [
        {
          id: 1,
          subject_id: 3,
          topic_id: 2,
          question: 'قانون طلایی ۵۰ / ۳۰ / ۲۰ در مدیریت حقوق و درآمد ماهانه چیست؟',
          answer: '۵۰٪ نیازهای ضروری زندگی، ۳۰٪ خواسته‌ها و رفاه شخصی، و ۲۰٪ پس‌انداز و سرمایه‌گذاری.',
          repetitions: 0,
          interval_days: 1,
          ease: 2.5,
          due_date: p.date,
          last_result: null
        }
      ],
      focus_sessions: [],
      progress: [],
      daily_checkins: [],
      sleep_logs: [],
      exams: [],
      exam_sessions: [],
      mistakes: [],
      study_notes: [
        {
          id: 1,
          subject_id: 3,
          topic_id: null,
          title: 'خوش‌آمدگویی به سیمرغ LifeOS',
          content: 'این فضای شخصی توسط **سید هادی موسوی (شرکت سیمرغ)** با معماری ۱۰۰٪ آفلاین و خصوصی طراحی شده است.\n• پیامک‌های تراکنش بانکی (واریز/برداشت) به‌صورت خودکار ریال به تومان تبدیل و محاسبه می‌شوند.\n• پیامک‌های شخصی و رمزهای پویا مطلقاً نادیده گرفته می‌شوند.',
          tags: 'سیمرغ,راهنما',
          pinned: 1,
          updated_at: new Date().toISOString()
        }
      ],
      ai_chats: [],
      supervisor_logs: [],
      snapshots: [],
      system_events: [{ id: 1, kind: 'boot', status: 'ok', detail: 'Simorgh Offline Engine Ready', created_at: new Date().toISOString() }]
    };
  }

  let db = null;

  function loadDb() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        db = { ...defaultDatabase(), ...JSON.parse(raw) };
        db.preferences = { ...defaultDatabase().preferences, ...(db.preferences || {}) };
        db.bankAccounts = db.bankAccounts || {};
        db.seenSmsHashes = db.seenSmsHashes || [];
        return db;
      }
    } catch {}
    db = defaultDatabase();
    saveDb();
    return db;
  }

  function mirrorToIndexedDb(snapshotStr) {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const idb = req.result;
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(snapshotStr, STORAGE_KEY);
      };
    } catch {}
  }

  function saveDb() {
    if (!db) return;
    try {
      const s = JSON.stringify(db);
      localStorage.setItem(STORAGE_KEY, s);
      mirrorToIndexedDb(s);
    } catch (e) {
      console.warn('SimorghVault save warning:', e);
    }
  }

  function nextId() {
    loadDb();
    db.seq = Number(db.seq || 100) + 1;
    return db.seq;
  }

  // ==================== NATIVE ANDROID ALARM & WIDGET HELPERS ====================

  function scheduleTaskNativeAlarm(task) {
    if (!window.SimorghNative || !task || !task.due_date || !task.start_time || task.status === 'done') return;
    try {
      const triggerMs = new Date(`${task.due_date}T${task.start_time}:00`).getTime();
      if (!Number.isFinite(triggerMs) || triggerMs <= Date.now() + 5000) return;
      const lang = localStorage.getItem('simorgh_lang') || 'fa';
      const title = lang === 'en' ? `⏰ Task Reminder: ${task.title}` : `⏰ یادآور کار: ${task.title}`;
      const msg = lang === 'en'
        ? `Scheduled at ${task.start_time} (${task.duration || 45} min) · Simorgh LifeOS`
        : `ساعت ${task.start_time} (${task.duration || 45} دقیقه) — وقت شروع آرام و با تمرکز است.`;
      window.SimorghNative.scheduleAlarm(10000 + Number(task.id), triggerMs, title, msg, true);
    } catch {}
  }

  function cancelTaskNativeAlarm(taskId) {
    try {
      window.SimorghNative?.cancelAlarm(10000 + Number(taskId));
    } catch {}
  }

  function scheduleDebtNativeAlarm(debt) {
    if (!window.SimorghNative || !debt || !debt.due_date || debt.status === 'settled') return;
    try {
      let triggerMs = new Date(`${debt.due_date}T09:00:00`).getTime();
      if (triggerMs <= Date.now()) {
        // اگر سررسید امروز است و ساعت ۹ گذشته، برای ۱ ساعت دیگر تنظیم کن
        const today = localNowParts().date;
        if (debt.due_date === today) triggerMs = Date.now() + 3600_000;
        else return;
      }
      const lang = localStorage.getItem('simorgh_lang') || 'fa';
      const amtFmt = Number(debt.amount || 0).toLocaleString(lang === 'en' ? 'en-US' : 'fa-IR');
      const title = lang === 'en'
        ? `💳 Payment Due: ${debt.person_or_title}`
        : `💳 یادآور سررسید مالی: ${debt.person_or_title}`;
      const msg = lang === 'en'
        ? `Amount: ${amtFmt} Toman is due today.`
        : `مبلغ ${amtFmt} تومان امروز سررسید دارد (سیمرغ LifeOS).`;
      window.SimorghNative.scheduleAlarm(50000 + Number(debt.id), triggerMs, title, msg, true);
    } catch {}
  }

  function cancelDebtNativeAlarm(debtId) {
    try {
      window.SimorghNative?.cancelAlarm(50000 + Number(debtId));
    } catch {}
  }

  function syncDailyBriefAlarms() {
    if (!window.SimorghNative) return;
    try {
      const prefs = loadDb().preferences || {};
      const now = new Date();
      const lang = localStorage.getItem('simorgh_lang') || 'fa';

      if (prefs.telegram_morning === 'true' && prefs.morning_brief_time) {
        const [mh, mm] = prefs.morning_brief_time.split(':').map(Number);
        const mDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mh || 8, mm || 0, 0);
        if (mDate.getTime() <= Date.now()) mDate.setDate(mDate.getDate() + 1);
        window.SimorghNative.scheduleAlarm(
          9001,
          mDate.getTime(),
          lang === 'en' ? '☀️ Simorgh Morning Brief' : '☀️ گزارش صبحگاهی سیمرغ',
          lang === 'en' ? 'Check your daily safe-spend budget and top priorities!' : 'برنامه امروز و سهمیه خرج امن روزانه‌ات آماده است!',
          false
        );
      } else {
        window.SimorghNative.cancelAlarm(9001);
      }

      if (prefs.telegram_evening === 'true' && prefs.evening_review_time) {
        const [eh, em] = prefs.evening_review_time.split(':').map(Number);
        const eDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh || 22, em || 0, 0);
        if (eDate.getTime() <= Date.now()) eDate.setDate(eDate.getDate() + 1);
        window.SimorghNative.scheduleAlarm(
          9002,
          eDate.getTime(),
          lang === 'en' ? '🌙 Simorgh Evening Review' : '🌙 جمع‌بندی شبانه سیمرغ',
          lang === 'en' ? 'Review today’s habits, bank balance, and tomorrow’s plan.' : 'عادت‌های امروز و تراز حساب‌وکتابت را در ۱ دقیقه مرور کن.',
          false
        );
      } else {
        window.SimorghNative.cancelAlarm(9002);
      }
    } catch {}
  }

  // ==================== SMART BANK SMS INGESTION ====================

  function ingestBankTransaction(parsedTx, { silent = false, forceManual = false } = {}) {
    loadDb();
    if (!parsedTx || !parsedTx.amount) return { added: false, reason: 'invalid' };

    // فیلتر سرشماره در صورت تعریف لیست مخاطبان مجاز توسط کاربر
    if (!forceManual && parsedTx.sender && db.allowedSmsSenders && db.allowedSmsSenders.length > 0) {
      const normIn = String(parsedTx.sender).trim().toLowerCase().replace(/[\s\-]/g, '').replace(/^\+98/, '').replace(/^0/, '');
      const match = db.allowedSmsSenders.some(s => {
        const normTarget = String(s.sender || '').trim().toLowerCase().replace(/[\s\-]/g, '').replace(/^\+98/, '').replace(/^0/, '');
        return normTarget && (normIn.includes(normTarget) || normTarget.includes(normIn));
      });
      if (!match) return { added: false, reason: 'sender_not_whitelisted' };
    }

    const hash = parsedTx.id_hash || `${parsedTx.bank_name}_${parsedTx.kind}_${parsedTx.amount}_${parsedTx.balance_after || 0}_${Math.floor((parsedTx.timestamp_ms || Date.now()) / 60000)}`;
    if (db.seenSmsHashes.includes(hash)) {
      return { added: false, reason: 'duplicate' };
    }
    db.seenSmsHashes.push(hash);
    if (db.seenSmsHashes.length > 600) db.seenSmsHashes = db.seenSmsHashes.slice(-600);

    const txDateObj = parsedTx.timestamp_ms ? new Date(Number(parsedTx.timestamp_ms)) : new Date();
    const txDate = localNowParts(txDateObj).date;
    const bankName = parsedTx.bank_name || 'حساب بانکی';
    const mask = parsedTx.account_mask || '';
    const cardKey = `${bankName}_${mask || 'main'}`;

    // به‌روزرسانی موجودی زنده کارت بانکی بر اساس فیلد «مانده» پیامک
    if (parsedTx.balance_after != null && Number.isFinite(Number(parsedTx.balance_after))) {
      db.bankAccounts[cardKey] = {
        key: cardKey,
        bank_name: bankName,
        account_mask: mask,
        balance_toman: Math.round(Number(parsedTx.balance_after)),
        updated_at: txDateObj.toISOString(),
        last_tx_title: parsedTx.title || bankName
      };
    } else if (db.bankAccounts[cardKey]) {
      const delta = parsedTx.kind === 'income' ? Number(parsedTx.amount) : -Number(parsedTx.amount);
      db.bankAccounts[cardKey].balance_toman = Math.max(0, Number(db.bankAccounts[cardKey].balance_toman || 0) + delta);
      db.bankAccounts[cardKey].updated_at = txDateObj.toISOString();
    }

    const txRecord = {
      id: nextId(),
      kind: parsedTx.kind === 'income' ? 'income' : 'expense',
      amount: Math.round(Number(parsedTx.amount)),
      category: parsedTx.category || (parsedTx.kind === 'income' ? 'حقوق و درآمد' : 'سایر'),
      title: parsedTx.title || `${parsedTx.kind === 'income' ? 'واریز' : 'برداشت'} ${bankName}`,
      tx_date: txDate,
      note: parsedTx.balance_after != null
        ? `📲 پیامک خودکار ${bankName}${mask ? ` (${mask})` : ''} · مانده کارت: ${Number(parsedTx.balance_after).toLocaleString('fa-IR')} تومان`
        : `📲 پیامک خودکار ${bankName}${mask ? ` (${mask})` : ''}`,
      source: 'bank_sms',
      bank_key: cardKey,
      balance_after: parsedTx.balance_after ?? null,
      created_at: txDateObj.toISOString()
    };

    db.finance_transactions.unshift(txRecord);
    saveDb();

    if (!silent) {
      window.dispatchEvent(new CustomEvent('simorgh:bank-updated', { detail: txRecord }));
    }
    return { added: true, tx: txRecord };
  }

  // ==================== OFFLINE ENGINE ====================

  async function askSimorghAi() {
    return { text: null, engine: 'Simorgh Pure Offline' };
  }

  // ==================== DASHBOARD COMPUTATION ====================

  const RANKS = [
    { min: 0, title: 'نوآموز مسیر آرام', icon: '🌱' },
    { min: 250, title: 'رهجوی متمرکز', icon: '🌿' },
    { min: 600, title: 'کاوشگر عمیق', icon: '🧭' },
    { min: 1200, title: 'معمار دانش و زندگی', icon: '🏛️' },
    { min: 2200, title: 'فرمانده زمان', icon: '⚡' },
    { min: 3500, title: 'استاد تمام سیمرغ', icon: '🦅' }
  ];

  function ensureDailyScheduleTasks() {
    loadDb();
    const p = localNowParts();
    const dayIdx = weekdayIndex(p.weekday);
    const activeSched = (db.schedule || []).filter(s => Number(s.weekday) === dayIdx && s.active !== 0);
    let changed = false;
    for (const s of activeSched) {
      const exists = (db.tasks || []).some(t => t.title === s.title && t.due_date === p.date && t.start_time === s.start_time);
      if (!exists) {
        const dur = Math.max(15, minutesOf(s.end_time) - minutesOf(s.start_time));
        const newT = {
          id: nextId(),
          title: s.title,
          subject_id: s.subject_id || null,
          kind: s.kind === 'rest' ? 'study' : (s.kind || 'study'),
          due_date: p.date,
          start_time: s.start_time,
          duration: dur,
          status: 'todo',
          priority: s.kind === 'exercise' ? 4 : 3,
          energy: s.kind === 'exercise' ? 2 : 3,
          reschedule_count: 0,
          original_due_date: p.date
        };
        db.tasks.push(newT);
        scheduleTaskNativeAlarm(newT);
        changed = true;
      }
    }
    if (changed) saveDb();
    return p;
  }

  function buildFullDashboard() {
    const p = ensureDailyScheduleTasks();
    const subMap = Object.fromEntries((db.subjects || []).map(s => [Number(s.id), s]));
    const taskMap = Object.fromEntries((db.tasks || []).map(t => [Number(t.id), t]));
    const examMap = Object.fromEntries((db.exams || []).map(e => [Number(e.id), e]));
    const topicMap = Object.fromEntries((db.topics || []).map(t => [Number(t.id), t]));

    const subjects = [...(db.subjects || [])].sort((a, b) => Number(b.priority || 3) - Number(a.priority || 3) || Number(a.mastery || 0) - Number(b.mastery || 0));

    const tasks = [...(db.tasks || [])]
      .map(t => ({
        ...t,
        subject_name: subMap[Number(t.subject_id)]?.name || null,
        color: subMap[Number(t.subject_id)]?.color || null
      }))
      .sort((a, b) => {
        const ord = s => (s === 'todo' ? 0 : s === 'snoozed' ? 1 : 2);
        return ord(a.status) - ord(b.status) || String(a.due_date || '').localeCompare(String(b.due_date || '')) || String(a.start_time || '').localeCompare(String(b.start_time || ''));
      });

    const schedule = [...(db.schedule || [])]
      .filter(s => s.active !== 0)
      .map(sc => ({
        ...sc,
        subject_name: subMap[Number(sc.subject_id)]?.name || null,
        color: subMap[Number(sc.subject_id)]?.color || null
      }))
      .sort((a, b) => Number(a.weekday) - Number(b.weekday) || String(a.start_time).localeCompare(String(b.start_time)));

    const topics = [...(db.topics || [])].map(t => ({
      ...t,
      subject_name: subMap[Number(t.subject_id)]?.name || 'عمومی',
      color: subMap[Number(t.subject_id)]?.color || '#10b981'
    }));

    const cards = [...(db.flashcards || [])]
      .filter(f => !f.due_date || f.due_date <= p.date)
      .map(f => ({
        ...f,
        subject_name: subMap[Number(f.subject_id)]?.name || 'عمومی'
      }))
      .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')))
      .slice(0, 30);

    const focus = [...(db.focus_sessions || [])]
      .map(f => ({
        ...f,
        task_title: taskMap[Number(f.task_id)]?.title || null,
        subject_name: subMap[Number(f.subject_id)]?.name || null
      }))
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 30);

    // 14-day & 90-day progress aggregation
    const dayAgg = {};
    for (const pr of (db.progress || [])) {
      const dayKey = pr.day || String(pr.created_at || p.date).slice(0, 10);
      if (!dayAgg[dayKey]) dayAgg[dayKey] = { day: dayKey, minutes: 0, sessions: 0 };
      dayAgg[dayKey].minutes += Number(pr.minutes || 0);
      dayAgg[dayKey].sessions += 1;
    }
    const min14 = addDays(p.date, -14);
    const min90 = addDays(p.date, -90);
    const week = Object.values(dayAgg).filter(x => x.day >= min14).sort((a, b) => a.day.localeCompare(b.day));
    const heatmap = Object.values(dayAgg).filter(x => x.day >= min90).sort((a, b) => a.day.localeCompare(b.day));

    const todo = tasks.filter(t => ['todo', 'snoozed'].includes(t.status));
    const smart = todo
      .map(t => ({ ...t, score: Math.round(priorityScore({ ...t, mastery: subMap[Number(t.subject_id)]?.mastery }, p.date)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const completedToday = tasks.filter(t => t.status === 'done' && String(t.completed_at || '').slice(0, 10) === p.date).length;

    // Streak across study progress OR daily habit completions!
    const activeDays = new Set([
      ...Object.values(dayAgg).filter(x => x.minutes > 0).map(x => x.day),
      ...(db.life_habit_logs || []).map(l => l.log_date),
      ...tasks.filter(t => t.status === 'done' && t.completed_at).map(t => String(t.completed_at).slice(0, 10))
    ]);
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      if (activeDays.has(addDays(p.date, -i))) streak++;
      else if (i > 0) break;
    }

    // V3 Extras
    const checkins = [...(db.daily_checkins || [])].sort((a, b) => String(b.checkin_date).localeCompare(String(a.checkin_date))).slice(0, 30);
    const sleep = [...(db.sleep_logs || [])].sort((a, b) => String(b.sleep_date).localeCompare(String(a.sleep_date))).slice(0, 30);
    const exams = [...(db.exams || [])].map(e => ({
      ...e,
      subject_name: subMap[Number(e.subject_id)]?.name || 'عمومی',
      color: subMap[Number(e.subject_id)]?.color || '#10b981'
    })).sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)));
    const examSessions = [...(db.exam_sessions || [])].map(x => ({
      ...x,
      exam_title: examMap[Number(x.exam_id)]?.title || null,
      subject_name: subMap[Number(x.subject_id)]?.name || null
    })).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 30);
    const mistakes = [...(db.mistakes || [])].map(m => ({
      ...m,
      subject_name: subMap[Number(m.subject_id)]?.name || 'عمومی',
      topic_title: topicMap[Number(m.topic_id)]?.title || null
    }));
    const wellness = {
      today: checkins.find(x => x.checkin_date === p.date) || null,
      lastSleep: sleep[0] || null
    };

    // V4 Gamification & Academic
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const totalMinutes = (db.progress || []).reduce((a, x) => a + Number(x.minutes || 0), 0);
    const reviewedCards = (db.flashcards || []).filter(f => Number(f.repetitions || 0) > 0).length;
    const fixedMistakes = mistakes.filter(m => ['reviewed', 'mastered'].includes(m.status)).length;
    const notesCount = (db.study_notes || []).length;
    const xp = doneTasks * 25 + totalMinutes * 2 + reviewedCards * 12 + fixedMistakes * 30 + checkins.length * 15 + notesCount * 20;
    const level = Math.max(1, Math.floor(xp / 250) + 1);
    const nextLevelXp = level * 250;
    const progressPct = Math.min(100, Math.round(((xp % 250) / 250) * 100));
    const rank = [...RANKS].reverse().find(r => xp >= r.min) || RANKS[0];

    const badges = [
      { id: 'first_step', title: 'قدم اول', desc: 'تکمیل اولین کار روزانه', icon: '🎯', unlocked: doneTasks >= 1 },
      { id: 'deep_focus', title: 'استاد تمرکز', desc: 'بیش از ۱۸۰ دقیقه تمرکز عمیق', icon: '🔥', unlocked: totalMinutes >= 180 },
      { id: 'streak_3', title: 'پیوستگی آهنین', desc: 'زنجیره حداقل ۳ روزه', icon: '⛓️', unlocked: streak >= 3 },
      { id: 'memory_master', title: 'حافظه طلایی', desc: 'مرور حداقل ۵ فلش‌کارت', icon: '🧠', unlocked: reviewedCards >= 5 },
      { id: 'bug_hunter', title: 'شکارچی اشتباهات', desc: 'رفع اشتباهات آزمونی', icon: '🛡️', unlocked: fixedMistakes >= 1 },
      { id: 'scholar_scribe', title: 'نویسنده منظم', desc: 'ثبت حداقل ۲ یادداشت یا جزوه', icon: '📓', unlocked: notesCount >= 2 }
    ];

    const metaMap = Object.fromEntries((db.subject_meta || []).map(m => [Number(m.subject_id), m]));
    let totalWeighted = 0, totalUnits = 0, targetWeighted = 0;
    for (const s of subjects) {
      if (s.name === 'ورزش') continue;
      const m = metaMap[Number(s.id)] || { units: 3, target_grade: 18.5, current_grade: null };
      const u = Number(m.units || 3);
      const estGrade = m.current_grade != null ? Number(m.current_grade) : Math.round((12 + (Number(s.mastery || 0) / 100) * 8) * 10) / 10;
      totalWeighted += estGrade * u;
      targetWeighted += Number(m.target_grade || 18.5) * u;
      totalUnits += u;
    }
    const gpa = totalUnits ? Math.round((totalWeighted / totalUnits) * 100) / 100 : 0;
    const targetGpa = totalUnits ? Math.round((targetWeighted / totalUnits) * 100) / 100 : 18.5;

    const sleepHours = wellness.lastSleep ? wellness.lastSleep.duration_minutes / 60 : 7.2;
    const stress = Number(wellness.today?.stress || 3);
    const energy = Number(wellness.today?.energy || 3);
    const openToday = tasks.filter(t => t.due_date === p.date && t.status !== 'done').length;
    const burnoutRisk = Math.min(100, Math.max(5, Math.round((stress * 14) + Math.max(0, (7.5 - sleepHours) * 12) + Math.max(0, (openToday - 4) * 6) - (energy * 6))));

    const academicSubs = subjects.filter(s => s.name !== 'ورزش');
    const avgMastery = academicSubs.length ? Math.round(academicSubs.reduce((a, s) => a + Number(s.mastery || 0), 0) / academicSubs.length) : 50;
    const radar = {
      knowledge: Math.min(100, Math.max(20, avgMastery)),
      focus: Math.min(100, Math.max(25, Math.round(Math.min(60, totalMinutes / 4) + 32))),
      memory: Math.min(100, Math.max(25, Math.min(100, 30 + reviewedCards * 7 + fixedMistakes * 10 + notesCount * 5))),
      discipline: Math.min(100, Math.max(25, Math.min(100, 25 + streak * 12 + doneTasks * 4))),
      vitality: Math.min(100, Math.max(20, Math.round(100 - burnoutRisk * 0.65))),
      precision: Math.min(100, Math.max(30, Math.round(65 + fixedMistakes * 6 + Math.min(25, avgMastery * 0.25))))
    };

    const todayDoneCount = tasks.filter(t => t.due_date === p.date && t.status === 'done').length;
    const todayFocusMin = Number(heatmap.find(h => h.day === p.date)?.minutes || 0);
    const dailyQuests = [
      { id: 'q_task', title: 'انجام حداقل ۱ کار از برنامه امروز', current: todayDoneCount, target: 1, xp: 30, done: todayDoneCount >= 1 },
      { id: 'q_focus', title: 'ثبت حداقل ۲۵ دقیقه تمرکز عمیق امروز', current: todayFocusMin, target: 25, xp: 45, done: todayFocusMin >= 25 },
      { id: 'q_note_card', title: 'مرور ۲ فلش‌کارت یا ثبت ۱ یادداشت', current: reviewedCards + notesCount, target: 2, xp: 35, done: (reviewedCards + notesCount) >= 2 }
    ];

    const bosses = exams.filter(e => e.status === 'active').map(ex => {
      const sub = subMap[Number(ex.subject_id)] || academicSubs[0] || { name: 'درس تخصصی', mastery: 45, color: '#10b981' };
      const maxHp = Number(ex.target_score || 85) * 10;
      const subDone = tasks.filter(t => Number(t.subject_id) === Number(ex.subject_id) && t.status === 'done').length;
      const damageDealt = Math.min(maxHp, Math.round((Number(sub.mastery || 0) / 100) * (maxHp * 0.72) + subDone * 65));
      const currentHp = Math.max(0, maxHp - damageDealt);
      const daysLeft = Math.max(0, Math.ceil((new Date(`${ex.exam_date}T12:00:00Z`) - new Date(`${p.date}T12:00:00Z`)) / 86400000));
      return {
        id: `exam_${ex.id}`,
        exam_id: ex.id,
        subject_id: ex.subject_id || sub.id,
        title: `🐉 چالش آزمون: ${ex.title}`,
        subject_name: ex.subject_name || sub.name,
        color: sub.color || '#10b981',
        exam_date: ex.exam_date,
        daysLeft,
        maxHp,
        currentHp,
        damageDealt,
        hpPercent: Math.round((currentHp / maxHp) * 100),
        defeated: currentHp <= 0
      };
    });

    // ==================== PERSONAL FINANCE & BANK SMS SMART ACCOUNTING ====================
    const monthPrefix = p.date.slice(0, 7);
    const transactions = [...(db.finance_transactions || [])].sort((a, b) => String(b.tx_date || '').localeCompare(String(a.tx_date || '')) || Number(b.id) - Number(a.id)).slice(0, 150);

    let totalIncome = 0, totalExpense = 0, monthIncome = 0, monthExpense = 0;
    let manualIncome = 0, manualExpense = 0;
    const catTotals = {};

    for (const tx of (db.finance_transactions || [])) {
      const amt = Number(tx.amount || 0);
      const isManual = tx.source !== 'bank_sms';
      if (tx.kind === 'income') {
        totalIncome += amt;
        if (isManual) manualIncome += amt;
        if (String(tx.tx_date || '').startsWith(monthPrefix)) monthIncome += amt;
      } else {
        totalExpense += amt;
        if (isManual) manualExpense += amt;
        if (String(tx.tx_date || '').startsWith(monthPrefix)) {
          monthExpense += amt;
          catTotals[tx.category || 'سایر'] = (catTotals[tx.category || 'سایر'] || 0) + amt;
        }
      }
    }

    // اگر کارت بانکی با «مانده» از پیامک شناسایی شده باشد، تراز واقعی = مجموع مانده دقیق کارت‌های بانکی + تراکنش‌های نقدی/دستی!
    const bankCardsList = Object.values(db.bankAccounts || {});
    const hasSyncedBankBalance = bankCardsList.length > 0;
    const syncedBankSum = bankCardsList.reduce((acc, c) => acc + Number(c.balance_toman || 0), 0);
    const effectiveBalance = hasSyncedBankBalance
      ? (syncedBankSum + (manualIncome - manualExpense))
      : (totalIncome - totalExpense);

    const monthlyBudget = Number(db.preferences?.monthly_budget || 18000000);
    const walletCardName = db.preferences?.wallet_card_name || 'کارت هوشمند سیمرغ';
    const debts = [...(db.finance_debts || [])].sort((a, b) => String(a.status).localeCompare(String(b.status)) || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
    const openPayable = debts.filter(d => d.status === 'open' && d.kind === 'payable').reduce((a, d) => a + Number(d.amount || 0), 0);
    const openReceivable = debts.filter(d => d.status === 'open' && d.kind === 'receivable').reduce((a, d) => a + Number(d.amount || 0), 0);
    const openBills = debts.filter(d => d.status === 'open' && d.kind === 'bill').reduce((a, d) => a + Number(d.amount || 0), 0);

    const min6 = addDays(p.date, -6);
    const recentHabitLogs = (db.life_habit_logs || []).filter(l => l.log_date >= min6);
    const habits = (db.life_habits || []).map(h => {
      const hLogs = recentHabitLogs.filter(l => Number(l.habit_id) === Number(h.id));
      return {
        ...h,
        doneToday: hLogs.some(l => l.log_date === p.date),
        weekCount: hLogs.length
      };
    });

    const notes = [...(db.study_notes || [])]
      .map(n => ({
        ...n,
        subject_name: subMap[Number(n.subject_id)]?.name || 'عمومی',
        color: subMap[Number(n.subject_id)]?.color || '#10b981'
      }))
      .sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

    const dash = {
      version: '1.0.0-Simorgh',
      creator: 'سید هادی موسوی (Syed Hadi Mosavi)',
      company: 'شرکت سیمرغ (Simorgh Co.)',
      aiEngine: 'سیمرغ آفلاین (Simorgh Offline Engine)',
      now: p,
      subjects,
      subjectMeta: db.subject_meta || [],
      tasks,
      subtasks: db.task_subtasks || [],
      schedule,
      topics,
      cards,
      focus,
      week,
      heatmap,
      preferences: db.preferences || {},
      events: (db.system_events || []).slice(-12).reverse(),
      smart,
      streak,
      completedToday,
      checkins,
      sleep,
      exams,
      examSessions,
      mistakes,
      snapshots: (db.snapshots || []).slice(-12).reverse(),
      wellness,
      notes,
      aiChats: (db.ai_chats || []).slice(-24),
      supervisorLogs: (db.supervisor_logs || []).slice(-18).reverse(),
      life: {
        walletCardName,
        monthlyBudget,
        totalIncome,
        totalExpense,
        balance: effectiveBalance,
        hasSyncedBankBalance,
        bankAccounts: bankCardsList,
        monthIncome,
        monthExpense,
        budgetUsedPct: monthlyBudget > 0 ? Math.min(100, Math.round((monthExpense / monthlyBudget) * 100)) : 0,
        categoryBreakdown: Object.entries(catTotals).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
        transactions,
        debts,
        debtSummary: { openPayable, openReceivable, openBills },
        goals: db.finance_goals || [],
        habits
      },
      gamification: {
        xp,
        level,
        nextLevelXp,
        progressPct,
        rank,
        badges,
        radar,
        dailyQuests,
        streakShields: Math.max(1, Math.floor(level / 2)),
        bosses,
        decayedSubjectIds: [],
        counts: { doneTasks, totalMinutes, reviewedCards, fixedMistakes, notesCount }
      },
      academic: {
        gpa,
        targetGpa,
        totalUnits,
        burnoutRisk,
        goldenHour: '۲۰:۰۰ تا ۲۲:۰۰',
        avgMastery,
        jalaliToday: jalaliDate(p.date)
      }
    };

    // همگام‌سازی خودکار ویجت صفحه اصلی اندروید
    try {
      const nextT = smart[0] ? `${smart[0].title}${smart[0].start_time ? ' (' + smart[0].start_time + ')' : ''}` : (localStorage.getItem('simorgh_lang') === 'en' ? 'All tasks completed ✨' : 'همه کارهای امروز انجام شد ✨');
      window.SimorghNative?.updateHomeWidget(Math.round(effectiveBalance), nextT);
    } catch {}

    return dash;
  }

  // ==================== COMPLETE LOCAL API ROUTER ====================

  function jsonRes(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  function completeTaskLocal(id, extra = {}) {
    loadDb();
    const t = db.tasks.find(x => Number(x.id) === Number(id));
    if (!t) return null;
    t.status = 'done';
    t.completed_at = new Date().toISOString();
    cancelTaskNativeAlarm(t.id);

    const p = localNowParts();
    if (t.subject_id) {
      const s = db.subjects.find(x => Number(x.id) === Number(t.subject_id));
      if (s) {
        const nextM = Math.min(100, Number(s.mastery || 0) + (t.kind === 'review' ? 2 : 3));
        s.mastery = nextM;
        db.progress.push({
          id: nextId(),
          day: p.date,
          subject_id: s.id,
          task_id: t.id,
          minutes: Number(extra.minutes || t.duration || 30),
          mastery_after: nextM,
          note: String(extra.note || ''),
          created_at: new Date().toISOString()
        });
      }
    }
    saveDb();
    return t;
  }

  function nextSm2(card, q) {
    if (q < 3) return { r: 0, i: 1, e: Math.max(1.3, Number(card.ease || 2.5) - 0.2) };
    const r = Number(card.repetitions || 0) + 1;
    const i = r === 1 ? 1 : r === 2 ? 3 : Math.max(1, Math.round(Number(card.interval_days || 1) * Number(card.ease || 2.5)));
    const e = Math.max(1.3, Number(card.ease || 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    return { r, i, e };
  }

  async function handleLocalApi(path, method, reqBody) {
    loadDb();
    const p = localNowParts();
    let m;

    if (path === '/api/login' && method === 'POST') return jsonRes({ ok: true });
    if (path === '/api/logout' && method === 'POST') {
      // در اپ شخصی اندروید، دکمه خروج قفل بیومتریک را فعال می‌کند بدون پاک شدن اطلاعات!
      if (window.SimorghNative) window.SimorghNative.triggerBiometricLock();
      return jsonRes({ ok: true });
    }
    if (path === '/api/dashboard' && method === 'GET') {
      return jsonRes(buildFullDashboard());
    }
    if (path === '/api/health' && method === 'GET') {
      return jsonRes({
        ok: true,
        worker: 'Simorgh-Android-LocalVault',
        database: 'connected',
        telegram: true,
        time: p
      });
    }
    if (path === '/api/telegram/test' && method === 'POST') {
      const lang = localStorage.getItem('simorgh_lang') || 'fa';
      if (window.SimorghNative) {
        window.SimorghNative.sendScreenNotification(
          lang === 'en' ? '🦅 Simorgh Smart Alert' : '🦅 اعلان آزمایشی شرکت سیمرغ',
          lang === 'en' ? 'On-screen notifications & native wake-up alarms are active!' : 'سیستم اعلان روی صفحه و هشدار زنگ سیمرغ با موفقیت فعال است!',
          false
        );
      }
      return jsonRes({ ok: true });
    }
    if (path === '/api/coach' && method === 'GET') {
      const dash = buildFullDashboard();
      const lang = localStorage.getItem('simorgh_lang') || 'fa';
      const daysInMonth = 30;
      const dayOfMonth = Math.min(30, Math.max(1, Number(p.day || 15)));
      const remDays = Math.max(1, daysInMonth - dayOfMonth + 1);
      const remBudget = Math.max(0, dash.life.monthlyBudget - dash.life.monthExpense);
      const safeDaily = Math.round((dash.life.hasSyncedBankBalance ? Math.min(Math.max(0, dash.life.balance), remBudget || dash.life.balance) : remBudget) / remDays);

      if (lang === 'en') {
        return jsonRes({
          message: `Safe daily spend: ${safeDaily.toLocaleString('en-US')} Toman · ${dash.smart.length ? `Next priority: "${dash.smart[0].title}"` : 'All priorities done today!'}`,
          actions: dash.smart.slice(0, 3)
        });
      }
      return jsonRes({
        message: `سهمیه خرج امن امروزت: ${safeDaily.toLocaleString('fa-IR')} تومان · ${dash.smart.length ? `مهم‌ترین قدم بعدی: «${dash.smart[0].title}»` : 'تمام کارهای مهم امروزت انجام شده‌اند 🌱'}`,
        actions: dash.smart.slice(0, 3)
      });
    }

    // ---- Tasks ----
    if (path === '/api/tasks' && method === 'POST') {
      const t = {
        id: nextId(),
        title: String(reqBody.title || '').slice(0, 180),
        subject_id: reqBody.subject_id ? Number(reqBody.subject_id) : null,
        kind: reqBody.kind || 'study',
        due_date: reqBody.due_date || p.date,
        start_time: reqBody.start_time || '20:00',
        duration: Number(reqBody.duration || 45),
        status: 'todo',
        priority: Number(reqBody.priority || 3),
        energy: Number(reqBody.energy || 3),
        reschedule_count: 0,
        original_due_date: reqBody.due_date || p.date
      };
      db.tasks.push(t);
      saveDb();
      scheduleTaskNativeAlarm(t);
      return jsonRes({ ok: true, id: t.id }, 201);
    }

    m = path.match(/^\/api\/tasks\/(\d+)$/);
    if (m && method === 'PATCH') {
      const id = Number(m[1]);
      if (reqBody.status === 'done') {
        completeTaskLocal(id, reqBody);
        return jsonRes({ ok: true });
      }
      const t = db.tasks.find(x => Number(x.id) === id);
      if (!t) return jsonRes({ error: 'یافت نشد' }, 404);
      Object.assign(t, reqBody);
      saveDb();
      scheduleTaskNativeAlarm(t);
      return jsonRes({ ok: true });
    }
    if (m && method === 'DELETE') {
      const id = Number(m[1]);
      db.tasks = db.tasks.filter(x => Number(x.id) !== id);
      db.task_subtasks = (db.task_subtasks || []).filter(s => Number(s.task_id) !== id);
      cancelTaskNativeAlarm(id);
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/adapt' && method === 'POST') {
      let moved = 0;
      const tomorrow = addDays(p.date, 1);
      for (const t of db.tasks) {
        if (t.status !== 'done' && t.due_date && t.due_date < p.date) {
          t.due_date = p.date;
          t.reschedule_count = Number(t.reschedule_count || 0) + 1;
          scheduleTaskNativeAlarm(t);
          moved++;
        }
      }
      if (!moved) {
        const extraToday = db.tasks.filter(t => t.status !== 'done' && t.due_date === p.date);
        if (extraToday.length > 4) {
          for (const t of extraToday.slice(4)) {
            t.due_date = tomorrow;
            moved++;
          }
        }
      }
      saveDb();
      return jsonRes({ ok: true, moved });
    }

    // ---- Schedule, Topics, Flashcards, Focus, Preferences ----
    if (path === '/api/schedule' && method === 'POST') {
      const item = {
        id: nextId(),
        title: String(reqBody.title || '').slice(0, 120),
        subject_id: reqBody.subject_id ? Number(reqBody.subject_id) : null,
        kind: reqBody.kind || 'study',
        weekday: Number(reqBody.weekday || 0),
        start_time: reqBody.start_time || '18:00',
        end_time: reqBody.end_time || '19:30',
        active: 1
      };
      db.schedule.push(item);
      saveDb();
      return jsonRes({ ok: true, id: item.id });
    }
    m = path.match(/^\/api\/schedule\/(\d+)$/);
    if (m && method === 'DELETE') {
      db.schedule = db.schedule.filter(x => Number(x.id) !== Number(m[1]));
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/topics' && method === 'POST') {
      const item = {
        id: nextId(),
        subject_id: Number(reqBody.subject_id || 1),
        title: String(reqBody.title || '').slice(0, 120),
        mastery: Number(reqBody.mastery || 0),
        status: 'learning',
        order_index: (db.topics || []).length + 1
      };
      db.topics.push(item);
      saveDb();
      return jsonRes({ ok: true, id: item.id });
    }
    m = path.match(/^\/api\/topics\/(\d+)$/);
    if (m && method === 'PATCH') {
      const t = db.topics.find(x => Number(x.id) === Number(m[1]));
      if (t) {
        t.mastery = Math.max(0, Math.min(100, Number(reqBody.mastery || 0)));
        t.status = t.mastery >= 80 ? 'mastered' : t.mastery >= 40 ? 'review' : 'learning';
        saveDb();
      }
      return jsonRes({ ok: true });
    }

    if (path === '/api/flashcards' && method === 'POST') {
      const c = {
        id: nextId(),
        subject_id: Number(reqBody.subject_id || 1),
        topic_id: reqBody.topic_id ? Number(reqBody.topic_id) : null,
        question: String(reqBody.question || '').slice(0, 500),
        answer: String(reqBody.answer || '').slice(0, 1000),
        repetitions: 0,
        interval_days: 1,
        ease: 2.5,
        due_date: p.date
      };
      db.flashcards.push(c);
      saveDb();
      return jsonRes({ ok: true, id: c.id });
    }
    m = path.match(/^\/api\/flashcards\/(\d+)\/review$/);
    if (m && method === 'POST') {
      const c = db.flashcards.find(x => Number(x.id) === Number(m[1]));
      if (!c) return jsonRes({ error: 'یافت نشد' }, 404);
      const n = nextSm2(c, Number(reqBody.quality || 4));
      c.repetitions = n.r;
      c.interval_days = n.i;
      c.ease = n.e;
      c.due_date = addDays(p.date, n.i);
      c.last_result = Number(reqBody.quality || 4);
      saveDb();
      return jsonRes({ ok: true, due: c.due_date, interval: n.i });
    }

    if (path === '/api/focus/start' && method === 'POST') {
      const f = {
        id: nextId(),
        task_id: reqBody.task_id ? Number(reqBody.task_id) : null,
        subject_id: reqBody.subject_id ? Number(reqBody.subject_id) : null,
        planned_minutes: Number(reqBody.planned_minutes || 45),
        started_at: new Date().toISOString()
      };
      db.focus_sessions.push(f);
      saveDb();
      return jsonRes({ ok: true, id: f.id });
    }
    m = path.match(/^\/api\/focus\/(\d+)\/finish$/);
    if (m && method === 'POST') {
      const f = db.focus_sessions.find(x => Number(x.id) === Number(m[1]));
      if (f) {
        f.actual_minutes = Number(reqBody.actual_minutes || f.planned_minutes || 25);
        f.focus_rating = Number(reqBody.focus_rating || 4);
        f.interruptions = Number(reqBody.interruptions || 0);
        f.note = String(reqBody.note || '');
        f.ended_at = new Date().toISOString();
        db.progress.push({
          id: nextId(),
          day: p.date,
          subject_id: f.subject_id || 1,
          task_id: f.task_id || null,
          minutes: f.actual_minutes,
          note: f.note || 'Focus Session',
          created_at: new Date().toISOString()
        });
        if (f.task_id && reqBody.complete_task) {
          completeTaskLocal(f.task_id, { minutes: f.actual_minutes });
        }
        saveDb();
      }
      return jsonRes({ ok: true });
    }

    if (path === '/api/preferences' && method === 'PATCH') {
      for (const [k, v] of Object.entries(reqBody || {})) {
        db.preferences[k] = String(v);
      }
      saveDb();
      syncDailyBriefAlarms();
      return jsonRes({ ok: true });
    }

    // ==================== V3 ENDPOINTS ====================
    if (path === '/api/v3/checkin' && method === 'POST') {
      const cDate = reqBody.date || p.date;
      db.daily_checkins = (db.daily_checkins || []).filter(x => x.checkin_date !== cDate);
      db.daily_checkins.unshift({
        id: nextId(),
        checkin_date: cDate,
        mood: Number(reqBody.mood || 3),
        energy: Number(reqBody.energy || 3),
        stress: Number(reqBody.stress || 3),
        note: String(reqBody.note || ''),
        tomorrow_note: String(reqBody.tomorrow_note || ''),
        updated_at: new Date().toISOString()
      });
      saveDb();
      return jsonRes({ ok: true });
    }
    if (path === '/api/v3/sleep' && method === 'POST') {
      const sDate = reqBody.date || p.date;
      const dur = (minutesOf(reqBody.wake_time) - minutesOf(reqBody.bedtime) + 1440) % 1440;
      db.sleep_logs = (db.sleep_logs || []).filter(x => x.sleep_date !== sDate);
      db.sleep_logs.unshift({
        id: nextId(),
        sleep_date: sDate,
        bedtime: reqBody.bedtime,
        wake_time: reqBody.wake_time,
        duration_minutes: dur,
        quality: Number(reqBody.quality || 3),
        note: String(reqBody.note || '')
      });
      saveDb();
      return jsonRes({ ok: true, duration: dur });
    }
    if (path === '/api/v3/night-plan' && method === 'POST') {
      const tomorrow = addDays(p.date, 1);
      const openList = db.tasks.filter(t => t.status !== 'done').slice(0, 4);
      let clock = 20 * 60, used = 0;
      const chosen = [];
      for (const t of openList) {
        const dur = Math.min(Number(t.duration || 45), 50);
        const st = fmtMin(clock);
        t.due_date = tomorrow;
        t.start_time = st;
        t.duration = dur;
        scheduleTaskNativeAlarm(t);
        chosen.push({ id: t.id, title: t.title, start: st, duration: dur });
        used += dur;
        clock += dur + 10;
      }
      const todayRec = db.daily_checkins.find(x => x.checkin_date === p.date);
      const planJson = JSON.stringify({ date: tomorrow, energy: 3, minutes: used, tasks: chosen });
      if (todayRec) todayRec.generated_plan = planJson;
      else db.daily_checkins.unshift({ id: nextId(), checkin_date: p.date, mood: 3, energy: 3, stress: 3, generated_plan: planJson });
      saveDb();
      return jsonRes({ date: tomorrow, energy: 3, minutes: used, tasks: chosen });
    }
    if (path === '/api/v3/low-energy' && method === 'POST') {
      const tomorrow = addDays(p.date, 1);
      const todayList = db.tasks.filter(t => t.due_date === p.date && t.status !== 'done');
      if (!todayList.length) return jsonRes({ moved: 0, kept: null });
      todayList[0].duration = Math.min(Number(todayList[0].duration || 30), 25);
      for (const t of todayList.slice(1)) {
        t.due_date = tomorrow;
        scheduleTaskNativeAlarm(t);
      }
      saveDb();
      return jsonRes({ moved: Math.max(0, todayList.length - 1), kept: todayList[0] });
    }
    if (path === '/api/v3/exams' && method === 'POST') {
      const ex = {
        id: nextId(),
        subject_id: Number(reqBody.subject_id || 1),
        title: String(reqBody.title || '').slice(0, 160),
        exam_date: reqBody.exam_date || addDays(p.date, 7),
        syllabus: String(reqBody.syllabus || ''),
        target_score: Number(reqBody.target_score || 85),
        status: 'active'
      };
      db.exams.push(ex);
      const days = Math.max(1, Math.min(14, Math.round((new Date(`${ex.exam_date}T12:00:00Z`) - new Date(`${p.date}T12:00:00Z`)) / 86400000)));
      for (let i = 1; i < days; i++) {
        const dIso = addDays(p.date, i);
        db.tasks.push({
          id: nextId(),
          title: `آمادگی آزمون: ${ex.title} (روز ${i})`,
          subject_id: ex.subject_id,
          kind: i === days - 1 ? 'quiz' : 'study',
          due_date: dIso,
          start_time: '20:00',
          duration: 45,
          status: 'todo',
          priority: 5,
          energy: 3,
          exam_id: ex.id
        });
      }
      saveDb();
      return jsonRes({ id: ex.id, tasks: Math.max(0, days - 1) }, 201);
    }
    m = path.match(/^\/api\/v3\/exams\/(\d+)$/);
    if (m && method === 'PATCH') {
      const ex = db.exams.find(x => Number(x.id) === Number(m[1]));
      if (ex) ex.status = reqBody.status || 'done';
      saveDb();
      return jsonRes({ ok: true });
    }
    if (path === '/api/v3/exam-sessions' && method === 'POST') {
      const total = Number(reqBody.total_questions || 10);
      const correct = Number(reqBody.correct || 0);
      const wrong = Number(reqBody.wrong || 0);
      const blank = Math.max(0, total - correct - wrong);
      const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
      const item = {
        id: nextId(),
        exam_id: reqBody.exam_id ? Number(reqBody.exam_id) : null,
        subject_id: reqBody.subject_id ? Number(reqBody.subject_id) : null,
        total_questions: total,
        correct,
        wrong,
        blank,
        duration_minutes: Number(reqBody.duration_minutes || 45),
        accuracy,
        note: String(reqBody.note || ''),
        created_at: new Date().toISOString()
      };
      db.exam_sessions.push(item);
      saveDb();
      return jsonRes({ ok: true, id: item.id, accuracy, blank }, 201);
    }
    if (path === '/api/v3/mistakes' && method === 'POST') {
      const item = {
        id: nextId(),
        subject_id: Number(reqBody.subject_id || 1),
        question: String(reqBody.question || ''),
        wrong_answer: String(reqBody.wrong_answer || ''),
        correct_answer: String(reqBody.correct_answer || ''),
        reason: String(reqBody.reason || ''),
        status: 'open',
        review_count: 0,
        next_review: p.date
      };
      db.mistakes.push(item);
      saveDb();
      return jsonRes({ ok: true, id: item.id }, 201);
    }
    m = path.match(/^\/api\/v3\/mistakes\/(\d+)\/(review|card)$/);
    if (m && method === 'POST') {
      const x = db.mistakes.find(it => Number(it.id) === Number(m[1]));
      if (!x) return jsonRes({ error: 'یافت نشد' }, 404);
      if (m[2] === 'card') {
        db.flashcards.push({
          id: nextId(),
          subject_id: x.subject_id,
          question: x.question,
          answer: x.correct_answer,
          repetitions: 0,
          interval_days: 1,
          ease: 2.5,
          due_date: p.date
        });
      }
      x.review_count = Number(x.review_count || 0) + 1;
      x.status = x.review_count >= 2 ? 'mastered' : 'reviewed';
      x.next_review = addDays(p.date, x.review_count >= 2 ? 7 : 3);
      saveDb();
      return jsonRes({ ok: true });
    }
    if (path === '/api/v3/snapshot' && method === 'POST') {
      db.snapshots.push({ id: nextId(), kind: 'manual', snapshot_date: p.date, created_at: new Date().toISOString() });
      saveDb();
      return jsonRes({ ok: true, date: p.date });
    }
    if ((path === '/api/v3/backup' || path === '/api/export') && method === 'GET') {
      return jsonRes({ app: 'Simorgh LifeOS', creator: 'Syed Hadi Mosavi - Simorgh Co.', exported_at: new Date().toISOString(), ...db });
    }

    // ==================== V4 LIFE, FINANCE, NOTES & AI ENDPOINTS ====================
    if (path === '/api/v4/life/transactions' && method === 'POST') {
      const kind = reqBody.kind === 'income' ? 'income' : 'expense';
      const amount = parseAmt(reqBody.amount);
      const title = String(reqBody.title || '').trim().slice(0, 140);
      if (!title || !amount) return jsonRes({ error: 'عنوان و مبلغ معتبر وارد کنید' }, 400);
      db.finance_transactions.unshift({
        id: nextId(),
        kind,
        amount,
        category: String(reqBody.category || (kind === 'income' ? 'حقوق و درآمد' : 'سایر')),
        title,
        tx_date: reqBody.tx_date || p.date,
        note: String(reqBody.note || ''),
        source: reqBody.source || 'manual',
        created_at: new Date().toISOString()
      });
      saveDb();
      return jsonRes({ ok: true });
    }
    m = path.match(/^\/api\/v4\/life\/transactions\/(\d+)$/);
    if (m && method === 'DELETE') {
      db.finance_transactions = db.finance_transactions.filter(x => Number(x.id) !== Number(m[1]));
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/v4/life/debts' && method === 'POST') {
      const kind = ['payable', 'receivable', 'bill'].includes(reqBody.kind) ? reqBody.kind : 'payable';
      const amount = parseAmt(reqBody.amount);
      const person = String(reqBody.person_or_title || '').trim().slice(0, 140);
      if (!person || !amount) return jsonRes({ error: 'عنوان/شخص و مبلغ را وارد کنید' }, 400);
      const debt = {
        id: nextId(),
        kind,
        person_or_title: person,
        amount,
        due_date: reqBody.due_date || null,
        note: String(reqBody.note || ''),
        status: 'open',
        created_at: new Date().toISOString()
      };
      db.finance_debts.unshift(debt);
      saveDb();
      scheduleDebtNativeAlarm(debt);
      return jsonRes({ ok: true });
    }
    m = path.match(/^\/api\/v4\/life\/debts\/(\d+)$/);
    if (m && method === 'PATCH') {
      const d = db.finance_debts.find(x => Number(x.id) === Number(m[1]));
      if (d) {
        d.status = reqBody.status === 'settled' ? 'settled' : 'open';
        if (d.status === 'settled') cancelDebtNativeAlarm(d.id);
        else scheduleDebtNativeAlarm(d);
        saveDb();
      }
      return jsonRes({ ok: true });
    }
    if (m && method === 'DELETE') {
      cancelDebtNativeAlarm(Number(m[1]));
      db.finance_debts = db.finance_debts.filter(x => Number(x.id) !== Number(m[1]));
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/v4/life/goals' && method === 'POST') {
      const title = String(reqBody.title || '').trim().slice(0, 120);
      if (!title) return jsonRes({ error: 'عنوان هدف مالی را وارد کنید' }, 400);
      db.finance_goals.push({
        id: nextId(),
        title,
        target_amount: Math.max(1000, parseAmt(reqBody.target_amount)),
        saved_amount: parseAmt(reqBody.saved_amount),
        icon: String(reqBody.icon || '💎').slice(0, 8),
        color: String(reqBody.color || '#10b981')
      });
      saveDb();
      return jsonRes({ ok: true });
    }
    m = path.match(/^\/api\/v4\/life\/goals\/(\d+)$/);
    if (m && method === 'PATCH') {
      const g = db.finance_goals.find(x => Number(x.id) === Number(m[1]));
      if (g) {
        const addAmt = parseAmt(reqBody.add_amount);
        if (addAmt) g.saved_amount = Math.max(0, Number(g.saved_amount || 0) + addAmt);
        else if (reqBody.saved_amount !== undefined) g.saved_amount = Math.max(0, parseAmt(reqBody.saved_amount));
        saveDb();
      }
      return jsonRes({ ok: true });
    }
    if (m && method === 'DELETE') {
      db.finance_goals = db.finance_goals.filter(x => Number(x.id) !== Number(m[1]));
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/v4/life/budget' && method === 'PATCH') {
      if (reqBody.monthly_budget !== undefined) db.preferences.monthly_budget = String(parseAmt(reqBody.monthly_budget));
      if (reqBody.wallet_card_name !== undefined) db.preferences.wallet_card_name = String(reqBody.wallet_card_name).trim().slice(0, 60) || 'کارت هوشمند سیمرغ';
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/v4/life/habits' && method === 'POST') {
      const title = String(reqBody.title || '').trim().slice(0, 100);
      if (!title) return jsonRes({ error: 'عنوان عادت را وارد کنید' }, 400);
      db.life_habits.push({
        id: nextId(),
        title,
        icon: String(reqBody.icon || '✨').slice(0, 8),
        color: String(reqBody.color || '#10b981')
      });
      saveDb();
      return jsonRes({ ok: true });
    }
    m = path.match(/^\/api\/v4\/life\/habits\/(\d+)\/toggle$/);
    if (m && method === 'POST') {
      const hId = Number(m[1]);
      const idx = db.life_habit_logs.findIndex(l => Number(l.habit_id) === hId && l.log_date === p.date);
      let done = false;
      if (idx >= 0) {
        db.life_habit_logs.splice(idx, 1);
      } else {
        db.life_habit_logs.push({ habit_id: hId, log_date: p.date });
        done = true;
      }
      saveDb();
      window.SimorghNative?.vibrate(25);
      return jsonRes({ ok: true, done });
    }
    m = path.match(/^\/api\/v4\/life\/habits\/(\d+)$/);
    if (m && method === 'DELETE') {
      const hId = Number(m[1]);
      db.life_habits = db.life_habits.filter(x => Number(x.id) !== hId);
      db.life_habit_logs = db.life_habit_logs.filter(l => Number(l.habit_id) !== hId);
      saveDb();
      return jsonRes({ ok: true });
    }

    // ---- Subjects, Subtasks, Notes ----
    if (path === '/api/v4/subjects' && method === 'POST') {
      const id = nextId();
      db.subjects.push({
        id,
        name: String(reqBody.name || 'درس جدید').slice(0, 80),
        color: reqBody.color || '#10b981',
        mastery: Math.max(0, Math.min(100, Number(reqBody.mastery || 0))),
        priority: Math.max(1, Math.min(5, Number(reqBody.priority || 3))),
        target: String(reqBody.target || '')
      });
      db.subject_meta.push({
        subject_id: id,
        units: Math.max(1, Math.min(6, Number(reqBody.units || 3))),
        target_grade: Number(reqBody.target_grade || 18.5),
        current_grade: reqBody.current_grade !== '' && reqBody.current_grade != null ? Number(reqBody.current_grade) : null,
        professor: String(reqBody.professor || '')
      });
      saveDb();
      return jsonRes({ ok: true, id }, 201);
    }
    m = path.match(/^\/api\/v4\/subjects\/(\d+)$/);
    if (m && method === 'PATCH') {
      const id = Number(m[1]);
      const s = db.subjects.find(x => Number(x.id) === id);
      if (s) {
        s.name = String(reqBody.name ?? s.name).slice(0, 80);
        s.color = reqBody.color || s.color;
        s.mastery = Math.max(0, Math.min(100, Number(reqBody.mastery ?? s.mastery)));
        s.priority = Math.max(1, Math.min(5, Number(reqBody.priority ?? s.priority)));
        s.target = String(reqBody.target ?? s.target);
        db.subject_meta = (db.subject_meta || []).filter(sm => Number(sm.subject_id) !== id);
        db.subject_meta.push({
          subject_id: id,
          units: Math.max(1, Math.min(6, Number(reqBody.units || 3))),
          target_grade: Number(reqBody.target_grade || 18.5),
          current_grade: reqBody.current_grade !== '' && reqBody.current_grade != null ? Number(reqBody.current_grade) : null,
          professor: String(reqBody.professor || '')
        });
        saveDb();
      }
      return jsonRes({ ok: true });
    }
    if (m && method === 'DELETE') {
      const id = Number(m[1]);
      db.subjects = db.subjects.filter(x => Number(x.id) !== id);
      saveDb();
      return jsonRes({ ok: true });
    }

    m = path.match(/^\/api\/v4\/tasks\/(\d+)\/subtasks$/);
    if (m && method === 'POST') {
      const id = nextId();
      db.task_subtasks.push({ id, task_id: Number(m[1]), title: String(reqBody.title || '').slice(0, 160), done: 0 });
      saveDb();
      return jsonRes({ ok: true, id }, 201);
    }
    m = path.match(/^\/api\/v4\/subtasks\/(\d+)$/);
    if (m && method === 'PATCH') {
      const st = db.task_subtasks.find(x => Number(x.id) === Number(m[1]));
      if (st) st.done = reqBody.done ? 1 : 0;
      saveDb();
      return jsonRes({ ok: true });
    }
    if (m && method === 'DELETE') {
      db.task_subtasks = db.task_subtasks.filter(x => Number(x.id) !== Number(m[1]));
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/v4/notes' && method === 'POST') {
      const id = nextId();
      db.study_notes.unshift({
        id,
        subject_id: reqBody.subject_id ? Number(reqBody.subject_id) : null,
        title: String(reqBody.title || '').slice(0, 180),
        content: String(reqBody.content || '').slice(0, 8000),
        tags: String(reqBody.tags || '').slice(0, 200),
        pinned: reqBody.pinned ? 1 : 0,
        updated_at: new Date().toISOString()
      });
      saveDb();
      return jsonRes({ ok: true, id }, 201);
    }
    m = path.match(/^\/api\/v4\/notes\/(\d+)$/);
    if (m && method === 'PATCH') {
      const n = db.study_notes.find(x => Number(x.id) === Number(m[1]));
      if (n) {
        if (reqBody.title !== undefined) n.title = String(reqBody.title).slice(0, 180);
        if (reqBody.content !== undefined) n.content = String(reqBody.content).slice(0, 8000);
        if (reqBody.subject_id !== undefined) n.subject_id = reqBody.subject_id ? Number(reqBody.subject_id) : null;
        if (reqBody.tags !== undefined) n.tags = String(reqBody.tags);
        if (reqBody.pinned !== undefined) n.pinned = reqBody.pinned ? 1 : 0;
        n.updated_at = new Date().toISOString();
        saveDb();
      }
      return jsonRes({ ok: true });
    }
    if (m && method === 'DELETE') {
      db.study_notes = db.study_notes.filter(x => Number(x.id) !== Number(m[1]));
      saveDb();
      return jsonRes({ ok: true });
    }
    m = path.match(/^\/api\/v4\/notes\/(\d+)\/to-cards$/);
    if (m && method === 'POST') {
      const note = db.study_notes.find(x => Number(x.id) === Number(m[1]));
      if (!note) return jsonRes({ error: 'یافت نشد' }, 404);
      const lines = String(note.content || '').split(/\n+/).filter(l => l.trim().length > 8).slice(0, 3);
      const cards = (lines.length ? lines : [note.content]).map((ln, idx) => ({
        id: nextId(),
        subject_id: note.subject_id || 1,
        question: `نکته ${idx + 1} از یادداشت «${note.title}» چیست؟`,
        answer: ln.replace(/^[-*•\d.)\s]+/, '').trim(),
        repetitions: 0,
        interval_days: 1,
        ease: 2.5,
        due_date: p.date
      }));
      db.flashcards.push(...cards);
      saveDb();
      return jsonRes({ ok: true, made: cards.length, cards });
    }

    // ---- Delete helpers ----
    m = path.match(/^\/api\/v4\/(flashcards|topics|exams|mistakes)\/(\d+)$/);
    if (m && method === 'DELETE') {
      const tbl = m[1];
      const id = Number(m[2]);
      db[tbl] = (db[tbl] || []).filter(x => Number(x.id) !== id);
      saveDb();
      return jsonRes({ ok: true });
    }

    m = path.match(/^\/api\/v4\/topics\/(\d+)\/boost$/);
    if (m && method === 'POST') {
      const t = db.topics.find(x => Number(x.id) === Number(m[1]));
      if (!t) return jsonRes({ error: 'یافت نشد' }, 404);
      t.mastery = Math.min(100, Number(t.mastery || 0) + 20);
      saveDb();
      return jsonRes({ ok: true, id: t.id, mastery: t.mastery });
    }

    if (path === '/api/v4/bosses/attack' && method === 'POST') {
      const subId = Number(reqBody.subject_id || 1);
      const s = db.subjects.find(x => Number(x.id) === subId);
      if (s) s.mastery = Math.min(100, Number(s.mastery || 0) + 5);
      db.progress.push({ id: nextId(), day: p.date, subject_id: subId, minutes: 25, note: 'Boss Strike', created_at: new Date().toISOString() });
      saveDb();
      return jsonRes({ ok: true, damage: 120 });
    }

    // ---- AI Coach, Autopilot, Supervisor ----
    if (path === '/api/v4/ai/chat' && method === 'POST') {
      const prompt = String(reqBody.message || '').trim();
      db.ai_chats.push({ id: nextId(), role: 'user', content: prompt, created_at: new Date().toISOString() });
      const dash = buildFullDashboard();
      const ctx = `تراز فعلی کاربر: ${dash.life.balance.toLocaleString('fa-IR')} تومان، خرج این ماه: ${dash.life.monthExpense.toLocaleString('fa-IR')} از بودجه ${dash.life.monthlyBudget.toLocaleString('fa-IR')} تومان (${dash.life.budgetUsedPct}%). کارهای باز امروز: ${dash.smart.map(t => t.title).join('، ') || 'ندارد'}.`;
      const aiRes = await askSimorghAi(
        `تو دستیار هوشمند «سیمرغ LifeOS» ساخته سید هادی موسوی (شرکت سیمرغ) هستی. کوتاه، دقیق، دلسوزانه و عملی درباره مدیریت مالی، حساب‌وکتاب و برنامه‌ریزی پاسخ بده.\n${ctx}`,
        prompt
      );
      const reply = aiRes.text || `🦅 **تحلیل هوشمند سیمرغ:**\n• وضعیت مالی: موجودی خالص شما **${dash.life.balance.toLocaleString('fa-IR')} تومان** است و تاکنون **${dash.life.budgetUsedPct}٪** از بودجه ماهانه مصرف شده است.\n• پیشنهاد عملی: ${dash.life.categoryBreakdown[0] ? `بیشترین هزینه این ماه در دسته «${dash.life.categoryBreakdown[0].category}» (${dash.life.categoryBreakdown[0].amount.toLocaleString('fa-IR')} تومان) بوده است.` : 'هزینه‌های این ماه کاملاً تحت کنترل است.'}\n• قدم بعدی امروز: ${dash.smart[0] ? `شروع «${dash.smart[0].title}»` : 'استراحت و مرور عادت‌های روزانه 🌱'}`;
      db.ai_chats.push({ id: nextId(), role: 'assistant', content: reply, created_at: new Date().toISOString() });
      saveDb();
      return jsonRes({ ok: true, reply, executed: [] });
    }
    if (path === '/api/v4/ai/chat' && method === 'DELETE') {
      db.ai_chats = [];
      saveDb();
      return jsonRes({ ok: true });
    }
    if (path === '/api/v4/ai/generate-cards' && method === 'POST') {
      const sub = db.subjects.find(s => Number(s.id) === Number(reqBody.subject_id || 1)) || db.subjects[0];
      const count = Math.min(6, Math.max(1, Number(reqBody.count || 3)));
      const topic = String(reqBody.topic || sub?.name || 'مبحث کلیدی');
      const cards = Array.from({ length: count }, (_, i) => ({
        id: nextId(),
        subject_id: sub?.id || 1,
        question: `نکته کلیدی ${i + 1} درباره «${topic}» چیست؟`,
        answer: `مرور مفهوم، کاربرد عملی و نکات کلیدی «${topic}» در ${sub?.name || 'برنامه'}.`,
        repetitions: 0,
        interval_days: 1,
        ease: 2.5,
        due_date: p.date
      }));
      db.flashcards.push(...cards);
      saveDb();
      return jsonRes({ ok: true, made: cards.length, cards });
    }
    if (path === '/api/v4/ai/quiz' && method === 'POST') {
      const sub = db.subjects.find(s => Number(s.id) === Number(reqBody.subject_id || 1)) || db.subjects[0];
      return jsonRes({
        ok: true,
        subject_id: sub?.id || 1,
        subject_name: sub?.name || 'مهارت',
        questions: [
          {
            question: `موثرترین روش برای تثبیت یادگیری در «${sub?.name || 'این درس'}» کدام است؟`,
            options: ['روخوانی منفعلانه', 'بازیابی فعال (Active Recall) و تکرار فاصله‌دار', 'حذف تمرین‌ها', 'مطالعه بدون برنامه'],
            correct: 1,
            explanation: 'بازیابی فعال و تکرار فاصله‌دار بهینهترین روش علمی برای حافظه بلندمدت است.'
          }
        ]
      });
    }
    if (path === '/api/v4/ai/cheatsheet' && method === 'POST') {
      const sub = db.subjects.find(s => Number(s.id) === Number(reqBody.subject_id || 1)) || db.subjects[0];
      return jsonRes({
        ok: true,
        subject_name: sub?.name || 'درس',
        summary: `📌 جمع‌بندی هوشمند سیمرغ برای «${sub?.name || ''}»:\n• مرور تعاریف کلیدی و یادداشت‌های سنجاق‌شده\n• حل تمرین زمان‌دار و بررسی بانک اشتباهات`,
        topics: db.topics.filter(t => Number(t.subject_id) === Number(sub?.id)),
        notes: db.study_notes.filter(n => Number(n.subject_id) === Number(sub?.id)),
        mistakes: db.mistakes.filter(m => Number(m.subject_id) === Number(sub?.id))
      });
    }
    if (path === '/api/v4/ai/feynman' && method === 'POST') {
      const words = String(reqBody.explanation || '').trim().split(/\s+/).filter(Boolean).length;
      const score = Math.min(96, Math.max(68, 62 + words * 2));
      return jsonRes({
        ok: true,
        topic: reqBody.topic || 'مبحث',
        score,
        strengths: 'ساختار توضیح روشن و قابل فهم بود.',
        gaps: 'افزودن یک مثال عددی یا کاربردی تسلط را به ۱۰۰٪ می‌رساند.',
        question: 'در چه شرایطی فرض اصلی این مبحث نقض می‌شود؟'
      });
    }
    if (path === '/api/v4/autopilot/run' && method === 'POST') {
      const actionsTaken = [];
      let cursor = 19 * 60;
      for (const t of db.tasks.filter(x => x.status !== 'done')) {
        if (t.due_date && t.due_date < p.date) {
          t.due_date = p.date;
          actionsTaken.push(`انتقال کار عقب‌مانده «${t.title}» به برنامه امروز`);
        }
        if (t.due_date === p.date) {
          t.start_time = fmtMin(cursor);
          cursor += Number(t.duration || 45) + 15;
          scheduleTaskNativeAlarm(t);
        }
      }
      if (!actionsTaken.length) actionsTaken.push('برنامه و زنگ‌های هشدار امروز کاملاً بدون تداخل تنظیم شدند.');
      const summaryText = `🚀 خلبان خودکار سیمرغ اجرا شد:\n${actionsTaken.map(x => `• ${x}`).join('\n')}`;
      db.supervisor_logs.push({ id: nextId(), kind: 'autopilot', severity: 'success', title: 'خلبان خودکار سیمرغ', message: summaryText, created_at: new Date().toISOString() });
      saveDb();
      return jsonRes({ ok: true, engine: 'Simorgh Autopilot', actionsTaken, summaryText, sentTelegram: false });
    }
    if (path === '/api/v4/supervisor/run' && method === 'POST') {
      const dash = buildFullDashboard();
      const alerts = [
        {
          severity: dash.life.budgetUsedPct >= 85 ? 'warning' : 'success',
          title: `وضعیت بودجه ماهانه: ${dash.life.budgetUsedPct}٪ مصرف‌شده`,
          detail: `تراز فعلی شما ${dash.life.balance.toLocaleString('fa-IR')} تومان است.`
        }
      ];
      const aiMessage = `👁️ ناظر هوشمند سیمرغ (${p.time}): ${dash.smart[0] ? `اکنون زمان مناسبی برای «${dash.smart[0].title}» است.` : 'برنامه‌های امروز منظم پیش رفته‌اند.'}`;
      db.supervisor_logs.push({ id: nextId(), kind: 'audit', severity: 'info', title: alerts[0].title, message: aiMessage, created_at: new Date().toISOString() });
      saveDb();
      return jsonRes({ ok: true, engine: 'Simorgh Supervisor', time: p.time, aiMessage, alerts, logs: db.supervisor_logs.slice(-12).reverse(), sentTelegram: false });
    }
    if (path === '/api/v4/supervisor/logs' && method === 'DELETE') {
      db.supervisor_logs = [];
      saveDb();
      return jsonRes({ ok: true });
    }

    if (path === '/api/v4/restore' && method === 'POST') {
      if (reqBody && typeof reqBody === 'object') {
        const keys = [
          'preferences', 'bankAccounts', 'finance_transactions', 'finance_debts',
          'finance_goals', 'life_habits', 'life_habit_logs', 'subjects', 'subject_meta',
          'tasks', 'task_subtasks', 'schedule', 'topics', 'flashcards', 'study_notes'
        ];
        let restored = 0;
        for (const k of keys) {
          if (reqBody[k] !== undefined) {
            db[k] = reqBody[k];
            restored++;
          }
        }
        saveDb();
        return jsonRes({ ok: true, restored });
      }
      return jsonRes({ error: 'فایل پشتیبان نامعتبر است' }, 400);
    }

    return jsonRes({ ok: true });
  }

  // ==================== INTERCEPT FETCH FOR /api/* ====================

  window.fetch = async function (input, init = {}) {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url || '';
      const u = new URL(rawUrl, location.origin);
      if (u.pathname.startsWith('/api/')) {
        const method = String(init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
        let reqBody = {};
        if (init.body && typeof init.body === 'string') {
          try { reqBody = JSON.parse(init.body); } catch {}
        } else if (init.body && typeof init.body === 'object') {
          reqBody = init.body;
        }
        return await handleLocalApi(u.pathname, method, reqBody);
      }
    } catch (err) {
      console.error('Simorgh local router error:', err);
    }
    return originalFetch(input, init);
  };

  // ==================== BACKUP EXPORT CLICK INTERCEPTOR ====================
  document.addEventListener('click', e => {
    const backupLink = e.target.closest('a[href*="/api/v3/backup"], a[href*="/api/export"]');
    if (!backupLink) return;
    e.preventDefault();
    const payload = JSON.stringify(
      { app: 'Simorgh LifeOS', creator: 'Syed Hadi Mosavi - Simorgh Co.', exported_at: new Date().toISOString(), ...loadDb() },
      null,
      2
    );
    const fname = `simorgh-lifeos-backup-${localNowParts().date}.json`;
    if (window.SimorghNative?.shareTextBackup) {
      window.SimorghNative.shareTextBackup(fname, payload);
    } else {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  });

  // Expose Public API for Bank SMS, Pro Suite & Bilingual Modules
  window.SimorghVault = {
    getDb: loadDb,
    saveDb,
    nextId,
    ingestBankTransaction,
    scheduleTaskNativeAlarm,
    scheduleDebtNativeAlarm,
    exportJson: () => JSON.stringify({ app: 'Simorgh LifeOS Pro', creator: 'Syed Hadi Mosavi - Simorgh Co.', exported_at: new Date().toISOString(), ...loadDb() }, null, 2),
    importDatabase: rawObj => {
      if (!rawObj || typeof rawObj !== 'object') throw new Error('INVALID_VAULT_DATA');
      db = { ...defaultDatabase(), ...rawObj };
      db.preferences = { ...defaultDatabase().preferences, ...(rawObj.preferences || {}) };
      db.bankAccounts = rawObj.bankAccounts || {};
      db.seenSmsHashes = rawObj.seenSmsHashes || [];
      saveDb();
      syncDailyBriefAlarms();
      return true;
    },
    clearBankAccount: key => {
      loadDb();
      delete db.bankAccounts[key];
      saveDb();
    },
    getAllowedSmsSenders: () => {
      loadDb();
      return db.allowedSmsSenders || [];
    },
    addAllowedSmsSender: (sender, label = '') => {
      loadDb();
      db.allowedSmsSenders = db.allowedSmsSenders || [];
      if (!db.allowedSmsSenders.some(x => x.sender === sender)) {
        db.allowedSmsSenders.push({ sender, label });
        saveDb();
        if (window.SimorghNative?.setAllowedSmsSenders) {
          window.SimorghNative.setAllowedSmsSenders(JSON.stringify(db.allowedSmsSenders));
        }
      }
      return db.allowedSmsSenders;
    },
    removeAllowedSmsSender: sender => {
      loadDb();
      db.allowedSmsSenders = (db.allowedSmsSenders || []).filter(x => x.sender !== sender);
      saveDb();
      if (window.SimorghNative?.setAllowedSmsSenders) {
        window.SimorghNative.setAllowedSmsSenders(JSON.stringify(db.allowedSmsSenders));
      }
      return db.allowedSmsSenders;
    },
    syncDailyBriefAlarms
  };
})();
