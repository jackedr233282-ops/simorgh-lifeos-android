/**
 * Simorgh LifeOS — Bilingual Engine (FA/EN), Native Alarm & Biometric Controls, Official Humanitarian Branding,
 * and 100% Fully Customizable Logo & Emblem System
 * سازنده و توسعه‌دهنده: سید هادی موسوی (Syed Hadi Mosavi)
 * شرکت سازنده: شرکت سیمرغ (Simorgh Co.)
 */
(function () {
  'use strict';

  const LANG_KEY = 'simorgh_lang';
  const BIO_KEY = 'simorgh_biometric_enabled';
  const LOGO_KEY = 'simorgh_custom_logo';
  const BRAND_TITLE_KEY = 'simorgh_custom_brand_title';

  // Exact reversible Persian -> English UI Dictionary
  const FA_TO_EN = {
    'زندگی من · سیمرغ': 'Simorgh LifeOS',
    'زندگی من · LifeOS': 'Simorgh LifeOS',
    'حساب‌وکتاب، روتین و پیشرفت': 'Finance, Routine & Growth',
    'فضای روزانه': 'DAILY SPACE',
    'ویترین امروز': 'Today Overview',
    'حساب‌وکتاب مالی': 'Finance & Ledger',
    'روتین و عادت‌ها': 'Habits & Routine',
    'تقویم هفتگی': 'Weekly Calendar',
    'کارها و لیست‌ها': 'Tasks & Checklists',
    'اتاق تمرکز': 'Focus Room',
    'یادداشت‌ها': 'Smart Notes',
    '🎓 میز دانشگاه و مطالعه': '🎓 Study & University',
    'درس‌ها و معدل': 'Courses & GPA',
    'سرفصل‌ها': 'Syllabus Topics',
    'فلش‌کارت': 'Flashcards',
    'امتحان': 'Exam Mode',
    'اشتباهات': 'Mistake Bank',
    'روز من': 'Wellness & Sleep',
    'آمار و گزارش': 'Insights & Stats',
    'تنظیمات': 'Settings & Simorgh',
    'ویترین': 'Home',
    'حساب‌وکتاب': 'Finance',
    'روتین زندگی': 'Routine',
    'کارها': 'Tasks',
    'تمرکز': 'Focus',
    '💳 ثبت خرج / دخل': '💳 Quick Transaction',
    '💳 ثبت دستی خرج / دخل': '💳 Manual Transaction Entry',
    'جستجو': 'Search',
    '＋ کار جدید': '＋ New Task',
    '＋ کار تازه': '＋ New Task',
    'من': 'Me',
    'کارت اصلی زندگی': 'Simorgh Main Card',
    'کارت هوشمند سیمرغ': 'Simorgh Smart Card',
    'تراز خالص حساب‌وکتاب': 'Net Account Balance',
    'تومان': 'Toman',
    '▲ ورودی ماه': '▲ Monthly Inflow',
    '▼ خرج این ماه': '▼ Monthly Spend',
    '＋ ثبت دخل و خرج': '＋ Add Income / Spend',
    '＋ ثبت دستی خرج و دخل': '＋ Manual Income / Spend',
    'میز حساب‌وکتاب ←': 'Open Ledger →',
    'ریتم امروز من': 'TODAY’S RHYTHM',
    'پیشرفت کارها و عادت‌ها': 'Tasks & Daily Habits',
    'انجام امروز': 'Done Today',
    'مرتب‌سازی امروز': 'Auto-Arrange',
    'یادآور مالی': 'FINANCIAL REMINDERS',
    'طلب، بدهی و قبوض': 'Debts, Bills & Receivables',
    'مشاهده همه': 'View All',
    'اولویت‌های روز': 'TOP PRIORITIES',
    'مهم‌ترین کارهای پیش‌رو': 'Upcoming Key Tasks',
    '● امروز': '● Today',
    'وضعیت درس‌ها و پروژه‌ها': 'Courses & Projects Pulse',
    'مدیریت واحدها و معدل': 'Manage GPA',
    'برنامه روزانه': 'DAILY SCHEDULE',
    'خط زمانی امروز': 'Today’s Timeline',
    'حساب‌وکتاب، دخل‌وخرج و مدیریت مالی': 'Personal Finance, Ledger & Bank Sync',
    'ثبت آنی مخارج و درآمدها به تومان، کنترل بودجه ماهانه، دفتر طلب و بدهی، قبوض و قلک پس‌انداز.': 'Track expenses & income in Toman, sync bank SMS automatically, manage monthly budget, bills, debts, and savings goals.',
    '⚙ بودجه ماهانه و نام کارت': '⚙ Monthly Budget & Card',
    '＋ ثبت سریع دخل / خرج': '＋ Quick Income / Expense',
    'ثبت در دفتر کل': 'LEDGER ENTRY',
    '💳 ثبت تراکنش جدید (خرج یا درآمد)': '💳 Add Transaction (Expense or Income)',
    '▼ ثبت خرج / پرداخت': '▼ Expense / Debit',
    '▲ ثبت درآمد / واریزی': '▲ Income / Deposit',
    'ثبت در حساب‌وکتاب': 'Save Transaction',
    'تحلیل مخارج این ماه': 'MONTHLY ANALYTICS',
    '📊 تفکیک هزینه‌ها و وضعیت بودجه': '📊 Expense Breakdown & Budget',
    'دفتر کل تراکنش‌ها': 'TRANSACTION HISTORY',
    '🧾 ریز دخل‌وخرج‌های اخیر': '🧾 Recent Transactions',
    'همه': 'All',
    'فقط مخارج': 'Expenses Only',
    'فقط ورودی‌ها': 'Income Only',
    'کنترل کامل': 'FULL CONTROL · SIMORGH CO.',
    'اعلان روزانه': 'Daily Reminders',
    'گزارش صبح': 'Morning Reminder',
    'جمع‌بندی شب': 'Evening Summary',
    'ارسال اعلان آزمایشی': 'Send Test Screen Alert',
    'زمان‌ها': 'Schedule Times',
    'برنامه‌ریزی تطبیقی': 'Adaptive Scheduling',
    'انتقال خودکار عقب‌ماندگی': 'Auto-reschedule overdue tasks',
    'سقف مطالعه روزانه': 'Daily focus limit (minutes)',
    'سلامت سیستم و بازیابی': 'Vault Health & Backup',
    'ذخیره تنظیمات': 'Save Settings',
    '📂 بازیابی فایل پشتیبان': '📂 Restore Backup JSON',
    'دریافت پشتیبان کامل': 'Export Full Backup',
    'قفل اثر انگشت': 'Biometric Lock',
    'خروج امن': 'Lock Vault 🔐',
    'حالت آفلاین امن فعال': '100% Private Offline Vault',
    'شرکت سیمرغ · سید هادی موسوی': 'By Syed Hadi Mosavi · Simorgh Co.'
  };

  const origTextMap = new WeakMap();

  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'fa';
  }

  function getCustomLogo() {
    return localStorage.getItem(LOGO_KEY) || '🦅';
  }

  function getCustomBrandTitle() {
    const saved = localStorage.getItem(BRAND_TITLE_KEY);
    if (saved) return saved;
    return getLang() === 'en' ? 'Simorgh LifeOS' : 'زندگی من · سیمرغ';
  }

  function updateLogoEverywhere(logoVal) {
    localStorage.setItem(LOGO_KEY, logoVal);
    const isImage = logoVal.startsWith('data:image/') || logoVal.startsWith('http') || logoVal.startsWith('/') || logoVal.startsWith('./');

    const renderToBox = el => {
      if (!el) return;
      if (isImage) {
        el.innerHTML = `<img src="${logoVal}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="Logo">`;
      } else {
        el.textContent = logoVal;
      }
    };

    renderToBox(document.querySelector('aside .brand .logo'));
    renderToBox(document.querySelector('#login .logo'));
    const preview = document.getElementById('customLogoPreviewBox');
    if (preview) renderToBox(preview);
  }

  function updateBrandTitleEverywhere(titleVal) {
    if (titleVal) localStorage.setItem(BRAND_TITLE_KEY, titleVal);
    else localStorage.removeItem(BRAND_TITLE_KEY);
    const el = document.querySelector('aside .brand b');
    if (el) el.textContent = titleVal || (getLang() === 'en' ? 'Simorgh LifeOS' : 'زندگی من · سیمرغ');
  }

  function translateElementTree(root, lang) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const parentTag = node.parentElement?.tagName;
      if (parentTag === 'SCRIPT' || parentTag === 'STYLE') continue;
      if (!origTextMap.has(node)) {
        const trimmed = node.nodeValue.trim();
        if (FA_TO_EN[trimmed]) {
          origTextMap.set(node, node.nodeValue);
        }
      }
      const orig = origTextMap.get(node);
      if (orig) {
        const trimmedOrig = orig.trim();
        if (lang === 'en' && FA_TO_EN[trimmedOrig]) {
          node.nodeValue = orig.replace(trimmedOrig, FA_TO_EN[trimmedOrig]);
        } else if (lang === 'fa') {
          node.nodeValue = orig;
        }
      }
    }

    if (lang === 'en') {
      const helloEl = document.getElementById('hello');
      if (helloEl) {
        const h = new Date().getHours();
        helloEl.textContent = h < 12 ? 'Good Morning ☀️' : h < 18 ? 'Good Afternoon 🌿' : 'Good Evening ✨';
      }
      const dateLbl = document.getElementById('dateLabel');
      if (dateLbl) {
        dateLbl.textContent = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date());
      }
    }
  }

  function applyLanguage(lang) {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.classList.toggle('simorgh-ltr', lang === 'en');

    const langBtn = document.getElementById('simorghLangBtn');
    if (langBtn) {
      langBtn.innerHTML = lang === 'en' ? '🌐 <span>فارسی</span>' : '🌐 <span>EN</span>';
      langBtn.title = lang === 'en' ? 'تغییر زبان به فارسی' : 'Switch Language to English';
    }

    injectSimorghBrandingAndSettings();
    translateElementTree(document.body, lang);
    window.dispatchEvent(new CustomEvent('simorgh:lang-changed', { detail: { lang } }));
  }

  function injectLanguageStyles() {
    if (document.getElementById('simorghCustomCss')) return;
    const st = document.createElement('style');
    st.id = 'simorghCustomCss';
    st.textContent = `
      body.simorgh-ltr { direction: ltr; text-align: left; }
      body.simorgh-ltr aside { border-left: none; border-right: 1px solid var(--line); }
      .simorgh-creator-badge {
        margin: 10px 0 6px;
        padding: 10px 12px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(234,179,8,0.08));
        border: 1px solid rgba(16,185,129,0.25);
        font-size: 11.5px;
        line-height: 1.55;
      }
      .simorgh-creator-badge b { display: block; color: var(--green2); font-size: 12px; }
      .simorgh-creator-badge small { color: var(--muted); display: block; }
      aside .brand .logo { cursor: pointer; transition: transform 0.2s; user-select: none; }
      aside .brand .logo:hover { transform: scale(1.08); }
      .logo-preset-pill {
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 12px;
        border: 1px solid var(--line);
        background: var(--surface-2);
        font-size: 13px;
        font-family: inherit;
        color: var(--ink);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: border-color 0.2s, background 0.2s;
      }
      .logo-preset-pill:hover { border-color: var(--green2); background: rgba(16,185,129,0.1); }
      #simorghBioOverlay {
        position: fixed; inset: 0; z-index: 999999;
        background: rgba(9, 11, 16, 0.96);
        backdrop-filter: blur(20px);
        display: flex; align-items: center; justify-content: center;
        padding: 24px; text-align: center;
      }
      #simorghBioOverlay.hidden { display: none !important; }
      .simorgh-bio-card {
        max-width: 360px; width: 100%;
        padding: 28px 22px; border-radius: 24px;
        background: rgba(20, 26, 38, 0.92);
        border: 1px solid rgba(16,185,129,0.35);
        box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      }
    `;
    document.head.appendChild(st);
  }

  function injectHeaderLangButton() {
    const actions = document.querySelector('.head-actions');
    if (!actions || document.getElementById('simorghLangBtn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'simorghLangBtn';
    btn.className = 'v4-icon-btn';
    const lang = getLang();
    btn.innerHTML = lang === 'en' ? '🌐 <span>فارسی</span>' : '🌐 <span>EN</span>';
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.insertAdjacentElement('afterend', btn);
    else actions.prepend(btn);
  }

  function injectSimorghBrandingAndSettings() {
    const en = getLang() === 'en';
    const customLogo = getCustomLogo();
    const customTitle = getCustomBrandTitle();

    // ۱. به‌روزرسانی لوگو و عنوان دلخواه در نوار کناری
    updateLogoEverywhere(customLogo);
    updateBrandTitleEverywhere(customTitle);

    const sideHealth = document.querySelector('aside .side-health');
    if (sideHealth) {
      sideHealth.innerHTML = `<i></i><div><b>${en ? '100% Private Offline Vault' : 'حالت آفلاین امن فعال'}</b><small>${en ? 'By Syed Hadi Mosavi · Simorgh Co.' : 'شرکت سیمرغ · سید هادی موسوی'}</small></div>`;
    }

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.textContent = en ? 'Lock Vault 🔐' : 'قفل امنیتی برنامه 🔐';
    }

    let creatorBadge = document.getElementById('simorghSidebarCreator');
    if (!creatorBadge && sideHealth) {
      creatorBadge = document.createElement('div');
      creatorBadge.id = 'simorghSidebarCreator';
      creatorBadge.className = 'simorgh-creator-badge';
      sideHealth.insertAdjacentElement('beforebegin', creatorBadge);
    }
    if (creatorBadge) {
      creatorBadge.innerHTML = en
        ? `<b>🦅 Simorgh Co.</b><small>Creator: Syed Hadi Mosavi</small>`
        : `<b>🦅 شرکت سیمرغ (Simorgh Co.)</b><small>سازنده: سید هادی موسوی</small>`;
    }

    // ۲. پنل‌های اندروید و شخصی‌سازی کامل لوگو در صفحه تنظیمات
    const settingsGrid = document.querySelector('#page-settings .settings');
    if (!settingsGrid) return;

    let nativeBox = document.getElementById('simorghNativeSettingsCard');
    if (!nativeBox) {
      nativeBox = document.createElement('article');
      nativeBox.id = 'simorghNativeSettingsCard';
      nativeBox.className = 'panel setting';
      nativeBox.style.gridColumn = '1 / -1';
      settingsGrid.prepend(nativeBox);
    }

    const bioEnabled = localStorage.getItem(BIO_KEY) === 'true';

    nativeBox.innerHTML = `
      <i>🦅</i>
      <div style="width:100%">
        <h3>${en ? 'Simorgh System Controls & Fully Customizable Logo' : 'مرکز کنترل سیمرغ، هشدار زنگ و شخصی‌سازی لوگو'}</h3>
        <p style="font-size:12.5px;color:var(--muted);margin:4px 0 12px">
          ${en
            ? '100% Offline & Private. Tasks and bills schedule exact alarms. Customize logo and emblems anytime.'
            : '۱۰۰٪ آفلاین، خصوصی و بدون هوش مصنوعی ابری. هشدار دقیق زنگ و اعلان صفحه برای تمام کارها و سررسیدها فعال است.'}
        </p>

        <div class="action-row" style="flex-wrap:wrap;gap:8px;margin-bottom:14px">
          <button type="button" id="btnTestScreenNotif" class="btn primary">
            ${en ? '🔔 Send Instant Screen Notification' : '🔔 ارسال فوری اعلان روی صفحه'}
          </button>
          <button type="button" id="btnTestAlarmNow" class="btn pale">
            ${en ? '⏰ Ring Alarm Sound Now' : '⏰ تست صدای زنگ هشدار'}
          </button>
          <button type="button" id="btnTestAlarm10s" class="btn pale">
            ${en ? '⏱ Schedule Alarm in 10s' : '⏱ تست زنگ ۱۰ ثانیه دیگر'}
          </button>
          <button type="button" id="btnStopAlarmAudio" class="btn pale">
            ${en ? '🔇 Stop Ringing' : '🔇 توقف صدای زنگ'}
          </button>
          <button type="button" id="btnGrantNativePerms" class="btn pale">
            ${en ? '🔔 Grant Notification Access' : '🔔 تایید مجوز اعلان و هشدار'}
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;padding-top:14px;border-top:1px solid var(--line)">
          <div>
            <label class="toggle" style="margin-bottom:8px">
              <input id="simorghBioToggle" type="checkbox" ${bioEnabled ? 'checked' : ''}>
              <span></span>
              ${en ? '🔐 Require Fingerprint / Face Unlock' : '🔐 قفل اثر انگشت / تشخیص چهره در بدو ورود'}
            </label>
            <small style="color:var(--muted);display:block">
              ${en ? 'Protects your financial ledger with Android Biometric Vault.' : 'محافظت از اطلاعات حساب‌وکتاب شخصی با حسگر اثر انگشت گوشی.'}
            </small>
          </div>

          <div>
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">
              ${en ? '🎨 Custom Logo & Application Title (Click anywhere to change)' : '🎨 لوگوی دلخواه و نام برنامه (کاملاً به انتخاب شما)'}
            </label>
            <div style="display:flex;align-items:center;gap:10px">
              <div id="customLogoPreviewBox" style="width:42px;height:42px;border-radius:12px;background:var(--card-bg);border:1px solid var(--green2);display:grid;place-items:center;font-size:22px;flex-shrink:0">
                ${customLogo}
              </div>
              <div style="flex:1">
                <input id="customBrandTitleInput" value="${customTitle}" placeholder="${en ? 'Simorgh LifeOS' : 'زندگی من · سیمرغ'}" style="width:100%;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:13px">
              </div>
              <button type="button" id="saveCustomBrandTitleBtn" class="btn pale">${en ? 'Save' : 'ذخیره'}</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
              <button type="button" class="logo-preset-pill" data-logo-val="🦅">🦅 سیمرغ</button>
              <button type="button" class="logo-preset-pill" data-logo-val="💎">💎 الماس</button>
              <button type="button" class="logo-preset-pill" data-logo-val="👑">👑 تاج</button>
              <button type="button" class="logo-preset-pill" data-logo-val="🌿">🌿 زیتون</button>
              <button type="button" class="logo-preset-pill" data-logo-val="🪙">🪙 سکه</button>
              <button type="button" class="logo-preset-pill" data-logo-val="🛡️">🛡️ سپر</button>
              <button type="button" id="uploadCustomLogoBtn" class="logo-preset-pill" style="border-color:var(--green2)">📁 آپلود عکس از دستگاه</button>
              <input type="file" id="customLogoFileInput" accept="image/*" class="hidden">
            </div>
          </div>
        </div>

        <div style="margin-top:16px;padding:14px 16px;border-radius:16px;background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(234,179,8,0.08));border:1px solid rgba(234,179,8,0.28);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <small style="color:var(--green2);font-weight:800">${en ? 'OFFICIAL HUMANITARIAN EDITION · 100% AD-FREE & PRIVATE' : 'نسخه رسمی و بشردوستانه · ۱۰۰٪ رایگان، بدون تبلیغات و کاملاً آفلاین'}</small>
            <h4 style="margin:4px 0 2px;font-size:15px">${en ? 'Designed & Architected by Syed Hadi Mosavi' : 'طراح و سازنده: سید هادی موسوی (Syed Hadi Mosavi)'}</h4>
            <small style="color:var(--muted)">${en ? 'Company: Simorgh Co. (شرکت سیمرغ) · Version 2.1.0' : 'شرکت سازنده: شرکت سیمرغ (Simorgh Co.) · نسخه ۲.۱.۰ سیمرغ'}</small>
          </div>
          <span class="tag" style="font-weight:800">🦅 Simorgh Co.</span>
        </div>
      </div>
    `;
  }

  // ==================== BIOMETRIC LOCK OVERLAY ====================

  function initBiometricLockGuard() {
    if (localStorage.getItem(BIO_KEY) !== 'true') return;
    if (!window.SimorghNative?.triggerBiometricLock) return;

    let overlay = document.getElementById('simorghBioOverlay');
    if (!overlay) {
      const en = getLang() === 'en';
      overlay = document.createElement('div');
      overlay.id = 'simorghBioOverlay';
      overlay.innerHTML = `
        <div class="simorgh-bio-card">
          <div style="font-size:42px;margin-bottom:8px">🦅</div>
          <h2 style="margin:0 0 6px">${en ? 'Simorgh Vault Locked' : 'گنجینه شخصی سیمرغ قفل است'}</h2>
          <p style="font-size:13px;color:var(--muted);margin:0 0 18px">
            ${en ? 'Authenticate with Fingerprint or Face ID to view your accounts.' : 'برای مشاهده حساب‌وکتاب، اثر انگشت یا قفل گوشی را تایید کنید.'}
          </p>
          <button type="button" id="simorghUnlockBioBtn" class="btn primary full">
            ${en ? '🔓 Unlock with Biometrics' : '🔓 بازگشایی با اثر انگشت'}
          </button>
          <small style="display:block;margin-top:14px;color:var(--muted);font-size:11px">
            ${en ? 'Simorgh Co. · Syed Hadi Mosavi' : 'شرکت سیمرغ · سید هادی موسوی'}
          </small>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    setTimeout(() => window.SimorghNative?.triggerBiometricLock(), 250);
  }

  window.__onSimorghBiometricResult = function (unlocked) {
    const overlay = document.getElementById('simorghBioOverlay');
    if (unlocked && overlay) {
      overlay.classList.add('hidden');
      window.SimorghNative?.vibrate?.(30);
    }
  };

  // ==================== ANDROID HARDWARE BACK HANDLER ====================

  window.__handleSimorghAndroidBack = function () {
    const openDialog = document.querySelector('dialog[open]');
    if (openDialog) {
      openDialog.close();
      return true;
    }
    const side = document.querySelector('aside.open');
    if (side) {
      side.classList.remove('open');
      return true;
    }
    const activePage = document.querySelector('.page.active')?.id?.replace('page-', '') || 'home';
    if (activePage !== 'home' && window.spPage) {
      window.spPage('home');
      return true;
    }
    return false;
  };

  // ==================== EVENT LISTENERS ====================

  document.addEventListener('click', e => {
    const langBtn = e.target.closest('#simorghLangBtn');
    if (langBtn) {
      const next = getLang() === 'fa' ? 'en' : 'fa';
      applyLanguage(next);
      window.spToast?.(next === 'en' ? '🌐 Switched to English (LTR)' : '🌐 زبان برنامه به فارسی تغییر یافت');
      return;
    }

    if (e.target.closest('#simorghUnlockBioBtn')) {
      window.SimorghNative?.triggerBiometricLock?.();
      return;
    }

    // کلیک روی لوگوی نوار کناری جهت باز کردن سریع تنظیمات لوگو
    if (e.target.closest('aside .brand .logo')) {
      window.spPage?.('settings');
      setTimeout(() => {
        document.getElementById('simorghNativeSettingsCard')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    // انتخاب از نشان‌های آماده لوگو
    const presetBtn = e.target.closest('[data-logo-val]');
    if (presetBtn) {
      const val = presetBtn.dataset.logoVal;
      updateLogoEverywhere(val);
      window.spToast?.(getLang() === 'en' ? `Emblem set to ${val}` : `لوگوی برنامه به ${val} تغییر یافت`);
      return;
    }

    // آپلود عکس شخصی برای لوگو
    if (e.target.closest('#uploadCustomLogoBtn')) {
      document.getElementById('customLogoFileInput')?.click();
      return;
    }

    // ذخیره نام دلخواه برنامه
    if (e.target.closest('#saveCustomBrandTitleBtn')) {
      const title = document.getElementById('customBrandTitleInput')?.value?.trim() || '';
      updateBrandTitleEverywhere(title);
      window.spToast?.(getLang() === 'en' ? 'App title updated!' : 'نام برنامه با موفقیت ذخیره شد');
      return;
    }

    if (e.target.closest('#btnTestScreenNotif')) {
      const en = getLang() === 'en';
      if (window.SimorghNative?.sendScreenNotification) {
        window.SimorghNative.sendScreenNotification(
          en ? '🦅 Simorgh Screen Notification' : '🦅 اعلان روی صفحه شرکت سیمرغ',
          en ? 'On-screen alert delivered successfully! (Creator: Syed Hadi Mosavi)' : 'اعلان روی صفحه با موفقیت نمایش داده شد! (سازنده: سید هادی موسوی)',
          false
        );
      } else if ('Notification' in window) {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('🦅 سیمرغ LifeOS', { body: 'اعلان آزمایشی روی صفحه فعال است!' });
        });
      }
      window.spToast?.(en ? '🔔 Screen notification sent!' : '🔔 اعلان آزمایشی روی صفحه ارسال شد!');
      return;
    }

    if (e.target.closest('#btnTestAlarmNow')) {
      const en = getLang() === 'en';
      if (window.SimorghNative?.sendScreenNotification) {
        window.SimorghNative.sendScreenNotification(
          en ? '⏰ Simorgh Wake-Up Alarm' : '⏰ زنگ هشدار سیمرغ',
          en ? 'Tap "Dismiss" on the notification or "Stop Ringing" here.' : 'زنگ هشدار فعال شد! از روی اعلان یا دکمه «توقف صدای زنگ» قطع کنید.',
          true
        );
      } else {
        window.spToast?.(en ? '⏰ Native alarm ringtone runs on Android!' : '⏰ پخش زنگ هشدار سیستم‌عامل در گوشی اندروید اجرا می‌شود.');
      }
      return;
    }

    if (e.target.closest('#btnTestAlarm10s')) {
      const en = getLang() === 'en';
      if (window.SimorghNative?.scheduleAlarm) {
        window.SimorghNative.scheduleAlarm(
          9999,
          Date.now() + 10000,
          en ? '⏰ Scheduled Simorgh Alarm' : '⏰ زنگ زمان‌بندی‌شده سیمرغ',
          en ? '10-second exact wake-up alarm test succeeded! Lock your screen to test.' : 'تست زنگ دقیق ۱۰ ثانیه‌ای با موفقیت اجرا شد (حتی با صفحه خاموش)!',
          true
        );
        window.spToast?.(en ? '⏱ Alarm set for 10 seconds from now! You can lock your phone.' : '⏱ زنگ هشدار برای ۱۰ ثانیه دیگر تنظیم شد! می‌توانید صفحه گوشی را قفل کنید.');
      } else {
        window.spToast?.(en ? '⏱ Exact AlarmManager runs on Android.' : '⏱ زمان‌بندی دقیق AlarmManager مخصوص اندروید است.');
      }
      return;
    }

    if (e.target.closest('#btnStopAlarmAudio')) {
      window.SimorghNative?.stopRingingAlarm?.();
      window.spToast?.(getLang() === 'en' ? '🔇 Alarm sound stopped.' : '🔇 صدای زنگ هشدار متوقف شد.');
      return;
    }

    if (e.target.closest('#btnGrantNativePerms')) {
      if (window.SimorghNative?.requestPermissions) {
        window.SimorghNative.requestPermissions();
      } else {
        window.spToast?.(getLang() === 'en' ? 'Permissions dialog opens on Android.' : 'پنجره مجوزهای اندروید روی گوشی نمایش داده می‌شود.');
      }
      return;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'simorghBioToggle') {
      const checked = e.target.checked;
      localStorage.setItem(BIO_KEY, checked ? 'true' : 'false');
      window.spToast?.(
        checked
          ? (getLang() === 'en' ? '🔐 Biometric lock enabled.' : '🔐 قفل اثر انگشت فعال شد.')
          : (getLang() === 'en' ? '🔓 Biometric lock disabled.' : '🔓 قفل اثر انگشت غیرفعال شد.')
      );
    }

    if (e.target.id === 'customLogoFileInput' && e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result;
        if (dataUrl) {
          updateLogoEverywhere(String(dataUrl));
          window.spToast?.(getLang() === 'en' ? 'Custom logo image loaded!' : 'تصویر لوگوی دلخواه با موفقیت اعمال شد ✨');
        }
      };
      reader.readAsDataURL(file);
    }
  });

  window.addEventListener('sp:loaded', () => {
    injectHeaderLangButton();
    injectSimorghBrandingAndSettings();
    const lang = getLang();
    if (lang === 'en') {
      setTimeout(() => translateElementTree(document.body, 'en'), 30);
    }
  });

  // Boot
  injectLanguageStyles();
  setTimeout(() => {
    injectHeaderLangButton();
    injectSimorghBrandingAndSettings();
    applyLanguage(getLang());
    initBiometricLockGuard();
    window.SimorghVault?.syncDailyBriefAlarms?.();
  }, 120);
})();
