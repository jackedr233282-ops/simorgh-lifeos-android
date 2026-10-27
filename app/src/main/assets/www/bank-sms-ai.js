/**
 * Simorgh Bank SMS Auditor — Offline Financial Ledger with Strict Sender Whitelist & Manual SMS Entry
 * سازنده و معمار سیستم: سید هادی موسوی (Syed Hadi Mosavi) — شرکت سیمرغ (Simorgh Co.)
 *
 * قابلیت‌های کلیدی:
 * ۱. فیلتر مخاطب خاص: کاربر می‌تواند فقط سرشماره/مخاطب خاص بانک خود را تعیین کند تا برنامه فقط همان پیامک‌ها را بخواند.
 * ۲. ثبت دستی پیامک: امکان چسباندن متن هر پیامک بانکی به صورت دستی و ثبت آنی در حساب‌ها.
 * ۳. مسدودسازی مطلق رمزهای پویا (OTP) و پیامک‌های شخصی.
 */
(function () {
  'use strict';

  const ALLOWED_SENDERS_KEY = 'simorgh_allowed_sms_senders';
  const OTP_BLOCK_RE = /(رمز\s*پویا|رمز\s*دوم|کد\s*تایید|کد\s*تأیید|کد\s*ورود|کد\s*فعال|محرمانه|otp|verification\s*code|security\s*code|passcode)/i;
  const CURRENCY_OR_BAL_RE = /(مانده|موجودی|موجودي|ریال|ريال|تومان|مبلغ|balance|avail|irr|usd)/i;
  const EXPENSE_RE = /(برداشت|خرید|کسر|انتقال\s*از|پرداخت|حواله\s*صادره|کارمزد|کاهش\s*موجودی|debit|withdraw|purchase|spent|payment)/i;
  const INCOME_RE = /(واریز|افزایش\s*موجودی|انتقال\s*به|سود|حقوق|پایا\s*واریز|ساتنا\s*واریز|برگشت\s*وجه|credit|deposit|received)/i;

  const BANK_SIGNATURES = [
    ['ملت', 'بانک ملت'], ['mellat', 'بانک ملت'],
    ['بلوبانک', 'بلوبانک'], ['دیجیتال خاورمیانه', 'بلوبانک'], ['blubank', 'بلوبانک'], ['blu', 'بلوبانک'],
    ['ملی', 'بانک ملی'], ['melli', 'بانک ملی'], ['bmi', 'بانک ملی'],
    ['سامان', 'بانک سامان'], ['saman', 'بانک سامان'],
    ['پاسارگاد', 'بانک پاسارگاد'], ['pasargad', 'بانک پاسارگاد'],
    ['تجارت', 'بانک تجارت'], ['tejarat', 'بانک تجارت'],
    ['صادرات', 'بانک صادرات'], ['saderat', 'بانک صادرات'], ['bsi', 'بانک صادرات'],
    ['سپه', 'بانک سپه'], ['sepah', 'بانک سپه'],
    ['کشاورزی', 'بانک کشاورزی'], ['رفاه', 'بانک رفاه'],
    ['پارسیان', 'بانک پارسیان'], ['آینده', 'بانک آینده'],
    ['رسالت', 'بانک رسالت'], ['مسکن', 'بانک مسکن'],
    ['سینا', 'بانک سینا'], ['شهر', 'بانک شهر'],
    ['گردشگری', 'بانک گردشگری'], ['اقتصاد', 'اقتصاد نوین'],
    ['مهر ایران', 'قرض‌الحسنه مهر ایران'], ['پست بانک', 'پست بانک']
  ];

  function normalizeDigits(str = '') {
    return String(str)
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک');
  }

  function normalizeSender(s = '') {
    return String(s).trim().toLowerCase()
      .replace(/[\s\-]/g, '')
      .replace(/^\+98/, '')
      .replace(/^0098/, '')
      .replace(/^0/, '');
  }

  function getAllowedSenders() {
    try {
      const raw = localStorage.getItem(ALLOWED_SENDERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  function saveAllowedSenders(list) {
    localStorage.setItem(ALLOWED_SENDERS_KEY, JSON.stringify(list));
    if (window.SimorghNative?.setAllowedSmsSenders) {
      window.SimorghNative.setAllowedSmsSenders(JSON.stringify(list));
    }
    renderBankHubPanel();
  }

  function isSenderAllowed(sender = '') {
    const list = getAllowedSenders();
    if (!list.length) return true; // اگر هنوز تنظیم نشده، فیلتر الگوهای بانکی عمل می‌کند
    const normIn = normalizeSender(sender);
    return list.some(item => {
      const normTarget = normalizeSender(item.sender || '');
      const label = String(item.label || '').toLowerCase();
      if (normTarget && (normIn.includes(normTarget) || normTarget.includes(normIn))) return true;
      if (label && sender.toLowerCase().includes(label)) return true;
      return false;
    });
  }

  function autoCategorize(text, kind) {
    if (kind === 'income') return 'حقوق و درآمد';
    if (/(اسنپ|تپسی|بنزین|جایگاه|مترو|تاکسی|بلیت|snapp|tapsi)/i.test(text)) return 'رفت‌وآمد';
    if (/(رستوران|کافه|فست|پیتزا|غذا|اسنپ\s*فود|نانوایی|شیرینی)/i.test(text)) return 'خوراک و کافه';
    if (/(کوروش|رفاه|جانبو|هایپر|سوپرمارکت|دیجی\s*کالا|میوه|پروتئین)/i.test(text)) return 'خرید روزمره';
    if (/(قبض|برق|گاز|آب|اجاره|همراه\s*اول|ایرانسل|رایتل|اینترنت|شارژ)/i.test(text)) return 'قبض و مسکن';
    if (/(داروخانه|بیمارستان|کلینیک|پزشک|آزمایشگاه|باشگاه)/i.test(text)) return 'سلامت و ورزش';
    if (/(دانشگاه|کتاب|شهریه|آموزش)/i.test(text)) return 'دانشگاه و آموزش';
    return 'سایر';
  }

  function parseBankSmsJs(rawBody, sender = 'BANK') {
    const clean = normalizeDigits(rawBody).trim();
    if (clean.length < 16) return { ok: false, reason: 'SHORT_OR_PERSONAL' };
    if (OTP_BLOCK_RE.test(clean)) return { ok: false, reason: 'OTP_BLOCKED' };
    if (!CURRENCY_OR_BAL_RE.test(clean)) return { ok: false, reason: 'NOT_BANK_TX' };

    const hasExp = EXPENSE_RE.test(clean);
    const hasInc = INCOME_RE.test(clean);
    const signedMinus = /^\s*-\s*[0-9,]{4,}/m.test(clean) || clean.includes('مبلغ-') || clean.includes('برداشت:');
    const signedPlus = /^\s*\+\s*[0-9,]{4,}/m.test(clean) || clean.includes('مبلغ+') || clean.includes('واریز:');

    if (!hasExp && !hasInc && !signedMinus && !signedPlus) {
      return { ok: false, reason: 'NOT_BANK_TX' };
    }

    const kind = (hasInc && !hasExp) || (signedPlus && !signedMinus) ? 'income' : 'expense';
    const isExplicitToman = clean.includes('تومان') && !clean.includes('ریال');

    const balMatch = clean.match(/(?:مانده|موجودی|balance|bal)\s*[:：=-]?\s*([0-9][0-9,]{3,})/i);
    const rawBal = balMatch ? Number(balMatch[1].replace(/,/g, '')) : null;
    const balanceAfter = rawBal != null && Number.isFinite(rawBal)
      ? (isExplicitToman ? rawBal : Math.round(rawBal / 10))
      : null;

    let rawAmt = null;
    const lblMatch = clean.match(/(?:مبلغ|برداشت|واریز|خرید|کسر|افزایش|کاهش|amount|debit|credit)\s*[:：+-]?\s*([0-9][0-9,]{3,})/i);
    if (lblMatch) rawAmt = Number(lblMatch[1].replace(/,/g, ''));
    if (!rawAmt) {
      const sgn = clean.match(/[+-]\s*([0-9][0-9,]{3,})/);
      if (sgn) rawAmt = Number(sgn[1].replace(/,/g, ''));
    }
    if (!rawAmt) {
      const nums = [...clean.matchAll(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,12})/g)]
        .map(m => Number(m[1].replace(/,/g, '')))
        .filter(n => n !== rawBal && n >= 10000 && n <= 500000000000);
      rawAmt = nums[0] || null;
    }

    if (!rawAmt || rawAmt <= 0) return { ok: false, reason: 'NO_VALID_AMOUNT' };
    const amountToman = isExplicitToman ? rawAmt : Math.round(rawAmt / 10);
    if (amountToman < 500) return { ok: false, reason: 'AMOUNT_TOO_SMALL' };

    const meta = `${normalizeDigits(sender).toLowerCase()} ${clean.toLowerCase()}`;
    const foundBank = BANK_SIGNATURES.find(([k]) => meta.includes(k));
    const bankName = foundBank ? foundBank[1] : 'حساب بانکی';

    const accMatch = clean.match(/(?:حساب|کارت|سپرده|card|acc)[^0-9]*([0-9.*-]{4,})/i);
    const digits = accMatch ? accMatch[1].replace(/[^0-9]/g, '') : '';
    const accountMask = digits.length >= 4 ? digits.slice(-4) : '';

    const category = autoCategorize(clean, kind);
    const actionLbl = kind === 'income' ? 'واریز به' : 'برداشت از';
    const title = `${actionLbl} ${bankName}${accountMask ? ` (${accountMask})` : ''}`;

    return {
      ok: true,
      tx: {
        id_hash: `js_${bankName}_${kind}_${amountToman}_${balanceAfter || 0}_${Date.now()}`,
        kind,
        amount: amountToman,
        balance_after: balanceAfter,
        bank_name: bankName,
        account_mask: accountMask,
        category,
        title,
        timestamp_ms: Date.now()
      }
    };
  }

  function isEn() {
    return (localStorage.getItem('simorgh_lang') || 'fa') === 'en';
  }

  function fmtNum(n) {
    return new Intl.NumberFormat(isEn() ? 'en-US' : 'fa-IR').format(Math.round(Number(n || 0)));
  }

  function daysLeftInPersianOrGregorianMonth() {
    try {
      if (isEn()) {
        const now = new Date();
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return Math.max(1, last - now.getDate() + 1);
      }
      const pDayStr = new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric' }).format(new Date());
      const pMonthStr = new Intl.DateTimeFormat('en-US-u-ca-persian', { month: 'numeric' }).format(new Date());
      const pDay = Number(pDayStr) || 15;
      const pMonth = Number(pMonthStr) || 7;
      const maxDays = pMonth <= 6 ? 31 : pMonth <= 11 ? 30 : 29;
      return Math.max(1, maxDays - pDay + 1);
    } catch {
      return 15;
    }
  }

  function renderBankHubPanel() {
    const finPage = document.getElementById('page-finance');
    if (!finPage) return;

    let hub = document.getElementById('simorghBankSmsHub');
    if (!hub) {
      hub = document.createElement('article');
      hub.id = 'simorghBankSmsHub';
      hub.className = 'panel';
      hub.style.cssText = 'margin-top:18px;margin-bottom:18px;border:1px solid rgba(16,185,129,0.25);background:var(--surface-2);';
      // قرار دادن پنل پیامک در زیر بخش فرم ثبت دستی و نمودار دونات تا ثبت دستی در صدر بماند
      const txGrid = finPage.querySelector('.grid.two');
      if (txGrid) txGrid.insertAdjacentElement('afterend', hub);
      else finPage.appendChild(hub);
    }

    const data = window.__spData;
    const life = data?.life || {};
    const cards = life.bankAccounts || [];
    const allowedSenders = getAllowedSenders();
    const daysLeft = daysLeftInPersianOrGregorianMonth();
    const upcomingObligations = Number(life.debtSummary?.openBills || 0) + Number(life.debtSummary?.openPayable || 0);
    const spendablePool = life.hasSyncedBankBalance
      ? Math.max(0, Number(life.balance || 0) - upcomingObligations)
      : Math.max(0, Number(life.monthlyBudget || 18000000) - Number(life.monthExpense || 0));
    const dailySafeQuota = Math.round(spendablePool / daysLeft);
    const en = isEn();
    const isAndroid = !!window.SimorghNative;

    const cardsHtml = cards.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0">
          ${cards.map(c => `
            <div style="flex:1;min-width:200px;padding:10px 14px;border-radius:14px;background:var(--card-bg);border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div>
                <small style="color:var(--muted);display:block">🏦 ${c.bank_name}${c.account_mask ? ` · ****${c.account_mask}` : ''}</small>
                <b class="money-val" style="font-size:15px;color:var(--green2)">${fmtNum(c.balance_toman)} <span style="font-size:11px;font-weight:500">${en ? 'Toman' : 'تومان'}</span></b>
              </div>
              <button type="button" class="btn pale" style="padding:4px 8px;font-size:11px" data-remove-bank="${c.key}" title="${en ? 'Remove card' : 'حذف کارت'}">×</button>
            </div>
          `).join('')}
        </div>`
      : '';

    const sendersChipsHtml = allowedSenders.length
      ? allowedSenders.map((s, idx) => `
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);font-size:12px;color:var(--ink)">
            <b>${s.label ? `${s.label}: ` : ''}${s.sender}</b>
            <button type="button" data-del-allowed-sender="${idx}" style="background:none;border:none;color:var(--muted);cursor:pointer;font-weight:bold;padding:0 2px" title="حذف">×</button>
          </span>
        `).join('')
      : `<span style="font-size:12px;color:var(--muted)">${en ? 'All standard Iranian bank transaction SMS allowed (tap + to restrict to a specific number).' : 'در حال حاضر پیامک‌های معمول بانکی خوانده می‌شوند. برای محدودسازی، سرشماره یا نام بانک خود را اضافه کنید.'}</span>`;

    hub.innerHTML = `
      <div class="panel-head" style="flex-wrap:wrap;gap:10px">
        <div>
          <small style="color:var(--green2);font-weight:800">${en ? 'BANK SMS AUDITOR & SENDER WHITELIST' : 'حسابرس پیامک بانکی · فیلتر مخاطب خاص'}</small>
          <h3 style="margin-top:3px">${en ? '📩 Strict Bank SMS Contact Filter & Manual SMS Entry' : '📩 خواندن پیامک از مخاطب خاص بانکی + ثبت دستی پیامک'}</h3>
        </div>
        <div class="action-row" style="margin:0">
          <button type="button" id="syncNativeSmsBtn" class="btn primary">
            ${en ? '🔄 Sync Phone Bank SMS' : '🔄 خواندن پیامک‌های بانکی گوشی'}
          </button>
        </div>
      </div>

      <!-- ۱. فیلتر مخاطب خاص بانکی -->
      <div style="margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--card-bg);border:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <b style="font-size:13px;color:var(--ink)">${en ? '🎯 Allowed Bank Senders / Contacts' : '🎯 مخاطبان و سرشماره‌های مجاز بانکی (فقط این مخاطب خوانده شود)'}</b>
            <small style="display:block;color:var(--muted);font-size:11.5px;margin-top:2px">
              ${en ? 'Only SMS from these senders will be processed. Personal messages & OTPs are always blocked.' : 'پیامک‌ها فقط از این سرشماره یا نام فرستنده خوانده می‌شوند و سایر پیامک‌های گوشی کاملاً نادیده گرفته می‌شوند.'}
            </small>
          </div>
          ${isAndroid ? `<button type="button" id="pickRecentSmsSenderBtn" class="btn pale" style="font-size:11.5px;padding:5px 10px">📋 انتخاب از پیامک‌های اخیر گوشی</button>` : ''}
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;align-items:center">
          ${sendersChipsHtml}
        </div>

        <form id="addAllowedSenderForm" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <input name="sender" required placeholder="${en ? 'Sender (e.g. 98200033, BLU, Mellat)' : 'سرشماره یا نام فرستنده (مثلاً 98200033 یا BLU)'}" style="flex:1;min-width:180px;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:12.5px">
          <input name="label" placeholder="${en ? 'Card label (optional)' : 'نام کارت (اختیاری، مثلاً ملت)'}" style="width:140px;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:12.5px">
          <button type="submit" class="btn pale" style="padding:6px 12px;font-size:12px">＋ ${en ? 'Add Contact' : 'افزودن مخاطب مجاز'}</button>
        </form>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px">
        <div style="padding:12px 14px;border-radius:14px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.22)">
          <small style="color:var(--muted)">${en ? `🛡️ Safe Daily Spend (${fmtNum(daysLeft)} days left)` : `🛡️ سهمیه خرج امن روزانه (${fmtNum(daysLeft)} روز تا پایان ماه)`}</small>
          <div class="money-val" style="font-size:18px;font-weight:900;margin-top:4px;color:var(--ink)">
            ${fmtNum(dailySafeQuota)} <span style="font-size:12px;font-weight:600;color:var(--green2)">${en ? 'Toman / day' : 'تومان در روز'}</span>
          </div>
        </div>

        <div style="padding:12px 14px;border-radius:14px;background:rgba(255,255,255,0.02);border:1px solid var(--line)">
          <small style="color:var(--muted)">${en ? '🔒 Offline Privacy Guarantee' : '🔒 تضمین حریم خصوصی آفلاین'}</small>
          <p style="margin:4px 0 0;font-size:12px;color:var(--muted);line-height:1.6">
            ${en ? 'Converts Rial to Toman automatically. Personal chats & OTP codes are strictly ignored.' : 'تبدیل خودکار ریال به تومان. کدهای رمز پویا و پیام‌های شخصی مطلقاً ذخیره یا خوانده نمی‌شوند.'}
          </p>
        </div>
      </div>

      ${cardsHtml}

      <!-- ۲. ثبت دستی پیامک بانکی دلخواه -->
      <details style="margin-top:12px;border-top:1px dashed var(--line);padding-top:10px">
        <summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--green2);user-select:none">
          ${en ? '✍️ Paste an SMS Manually / Quick Test' : '✍️ ثبت دستی با چسباندن پیامک بانکی / تست سریع'}
        </summary>
        <div style="margin-top:10px">
          <textarea id="manualSmsInput" rows="3" style="width:100%;border-radius:12px;padding:10px;background:var(--bg);color:var(--ink);border:1px solid var(--line);font-family:inherit;font-size:12.5px" placeholder="${
            en
              ? 'Paste a bank transaction SMS here (e.g. Bank Mellat / BluBank)...'
              : 'متن پیامک تراکنش بانک را اینجا بچسبانید تا خودکار محاسبه و به حساب‌های شما اضافه شود...'
          }"></textarea>
          <div class="action-row" style="margin-top:8px;flex-wrap:wrap;gap:8px">
            <button type="button" id="parseManualSmsBtn" class="btn primary">${en ? '⚡ Record This SMS' : '⚡ ثبت این پیامک در حساب‌ها'}</button>
            <button type="button" class="btn pale" data-sample-sms="mellat_exp">${en ? 'Sample: Mellat Expense' : 'نمونه برداشت بانک ملت'}</button>
            <button type="button" class="btn pale" data-sample-sms="blu_inc">${en ? 'Sample: BluBank Deposit' : 'نمونه واریز حقوق بلوبانک'}</button>
            <button type="button" class="btn pale" data-sample-sms="otp_block">${en ? 'Sample: OTP (Blocked!)' : 'تست رمز پویا (مسدود می‌شود!)'}</button>
          </div>
        </div>
      </details>
    `;
  }

  function drainNativeQueueOnStartup() {
    if (!window.SimorghNative?.drainPendingBankTransactions) return;
    try {
      const raw = window.SimorghNative.drainPendingBankTransactions();
      const parsed = JSON.parse(raw || '{}');
      if (Array.isArray(parsed.items) && parsed.items.length) {
        let addedCount = 0;
        for (const item of parsed.items) {
          const r = window.SimorghVault?.ingestBankTransaction(item, { silent: true });
          if (r?.added) addedCount++;
        }
        if (addedCount > 0) {
          window.spToast?.(
            isEn()
              ? `📲 ${addedCount} bank SMS transaction(s) recorded!`
              : `📲 ${fmtNum(addedCount)} پیامک تراکنش بانکی جدید خودکار محاسبه شد!`
          );
          window.spReload?.();
        }
      }
    } catch (e) {
      console.warn('Drain bank SMS error:', e);
    }
  }

  window.__onSimorghBankSmsReceived = function (jsonStr) {
    try {
      const tx = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      const res = window.SimorghVault?.ingestBankTransaction(tx);
      if (res?.added) {
        window.SimorghNative?.vibrate?.(45);
        const amt = fmtNum(res.tx.amount);
        window.spToast?.(
          isEn()
            ? `📲 Auto-Synced: ${res.tx.title} (${amt} Toman)`
            : `📲 ثبت خودکار پیامک بانکی: ${res.tx.title} · ${amt} تومان`
        );
        window.spReload?.();
      }
    } catch (e) {
      console.warn('Live SMS parse error:', e);
    }
  };

  window.__onSimorghPermissionsUpdated = function (smsGranted) {
    if (smsGranted) {
      syncPhoneSmsNow();
    } else {
      window.spToast?.(
        isEn()
          ? 'SMS permission was not granted. You can still paste bank SMS manually.'
          : 'مجوز پیامک تایید نشد؛ می‌توانید متن پیامک بانکی را دستی بچسبانید.'
      );
    }
  };

  function syncPhoneSmsNow() {
    if (!window.SimorghNative?.syncBankSmsInbox) {
      window.spToast?.(
        isEn()
          ? 'Direct phone inbox sync runs on Android. You can paste bank SMS manually below!'
          : 'خواندن مستقیم صندوق پیامک مخصوص گوشی اندروید است. در مرورگر می‌توانید متن پیامک را دستی بچسبانید.'
      );
      return;
    }
    try {
      const raw = window.SimorghNative.syncBankSmsInbox(250);
      const res = JSON.parse(raw || '{}');
      if (!res.ok && res.reason === 'PERMISSION_REQUIRED') {
        window.spToast?.(
          isEn()
            ? 'Please grant SMS permission to detect bank transactions.'
            : 'لطفاً دسترسی پیامک را تایید کنید تا فقط تراکنش‌های بانکی محاسبه شوند.'
        );
        return;
      }
      const items = res.items || [];
      let added = 0;
      for (const it of items) {
        if (window.SimorghVault?.ingestBankTransaction(it, { silent: true })?.added) added++;
      }
      window.spToast?.(
        added > 0
          ? (isEn() ? `✅ ${added} bank SMS transactions synced!` : `✅ ${fmtNum(added)} تراکنش بانکی از پیامک‌های گوشی استخراج و محاسبه شد!`)
          : (isEn() ? '✓ Accounts are up to date.' : '✓ حساب‌ها به‌روز هستند (پیامک تراکنش جدیدی از مخاطبان مجاز یافت نشد).')
      );
      window.spReload?.();
    } catch (e) {
      window.spToast?.(e.message || 'خطا در خواندن پیامک بانکی');
    }
  }

  document.addEventListener('submit', e => {
    if (e.target.id === 'addAllowedSenderForm') {
      e.preventDefault();
      const form = e.target;
      const sender = form.sender?.value?.trim();
      const label = form.label?.value?.trim() || '';
      if (!sender) return;
      const list = getAllowedSenders();
      if (!list.some(x => normalizeSender(x.sender) === normalizeSender(sender))) {
        list.push({ sender, label });
        saveAllowedSenders(list);
        window.spToast?.(isEn() ? `Added bank contact: ${sender}` : `مخاطب بانکی «${sender}» به لیست مجاز اضافه شد`);
      }
      form.reset();
    }
  });

  document.addEventListener('click', e => {
    const syncBtn = e.target.closest('#syncNativeSmsBtn');
    if (syncBtn) {
      syncPhoneSmsNow();
      return;
    }

    const delSenderBtn = e.target.closest('[data-del-allowed-sender]');
    if (delSenderBtn) {
      const idx = Number(delSenderBtn.dataset.delAllowedSender);
      const list = getAllowedSenders();
      if (idx >= 0 && idx < list.length) {
        list.splice(idx, 1);
        saveAllowedSenders(list);
        window.spToast?.(isEn() ? 'Bank contact removed' : 'مخاطب بانکی از فیلتر حذف شد');
      }
      return;
    }

    const pickSenderBtn = e.target.closest('#pickRecentSmsSenderBtn');
    if (pickSenderBtn) {
      if (!window.SimorghNative?.listRecentSmsSenders) return;
      const raw = window.SimorghNative.listRecentSmsSenders(50);
      try {
        const j = JSON.parse(raw);
        if (j.ok && Array.isArray(j.senders) && j.senders.length) {
          const list = getAllowedSenders();
          let promptText = isEn() ? 'Choose a number to whitelist:\n' : 'شماره فرستنده مورد نظر را از پیامک‌های اخیر انتخاب کنید:\n';
          j.senders.slice(0, 10).forEach((s, i) => {
            promptText += `${i + 1}. ${s.sender} (${s.preview})\n`;
          });
          const choice = prompt(promptText + (isEn() ? 'Enter index (1-10):' : 'عدد ۱ تا ۱۰ را وارد کنید:'));
          const idx = Number(choice) - 1;
          if (idx >= 0 && idx < j.senders.length) {
            const picked = j.senders[idx].sender;
            if (!list.some(x => normalizeSender(x.sender) === normalizeSender(picked))) {
              list.push({ sender: picked, label: 'بانک' });
              saveAllowedSenders(list);
              window.spToast?.(`مخاطب ${picked} اضافه شد`);
            }
          }
        } else {
          window.spToast?.('پیامکی یافت نشد یا مجوز داده نشده است.');
        }
      } catch {}
      return;
    }

    const remBtn = e.target.closest('[data-remove-bank]');
    if (remBtn) {
      window.SimorghVault?.clearBankAccount(remBtn.dataset.removeBank);
      window.spReload?.();
      return;
    }

    const sampleBtn = e.target.closest('[data-sample-sms]');
    if (sampleBtn) {
      const inp = document.getElementById('manualSmsInput');
      if (!inp) return;
      const key = sampleBtn.dataset.sampleSms;
      if (key === 'mellat_exp') {
        inp.value = 'بانک ملت\nخرید کالا - اسنپ فود\nحساب 4821\nمبلغ: 3,850,000 ریال\nمانده: 146,150,000 ریال\n1404/08/05-21:14';
      } else if (key === 'blu_inc') {
        inp.value = 'بلوبانک\nواریز به حساب 9012\nمبلغ: 185,000,000 ریال\nافزایش موجودی حقوق\nموجودی: 214,500,000 ریال';
      } else if (key === 'otp_block') {
        inp.value = 'بانک ملت\nرمز پویا خرید اینترنتی شما: 849201\nمبلغ: 2,500,000 ریال\nمحرمانه';
      }
      return;
    }

    const parseBtn = e.target.closest('#parseManualSmsBtn');
    if (parseBtn) {
      const inp = document.getElementById('manualSmsInput');
      const txt = inp?.value?.trim() || '';
      if (!txt) {
        window.spToast?.(isEn() ? 'Paste a bank SMS first.' : 'لطفاً ابتدا متن پیامک بانکی را وارد کنید.');
        return;
      }
      const res = parseBankSmsJs(txt, 'MANUAL_SMS');
      if (!res.ok) {
        const msg = res.reason === 'OTP_BLOCKED'
          ? (isEn() ? '🛡️ Blocked! OTP / Security codes are strictly ignored for your privacy.' : '🛡️ مسدود شد! پیامک حاوی «رمز پویا / کد امنیتی» است و طبق پروتکل حریم خصوصی سیمرغ نادیده گرفته شد.')
          : (isEn() ? 'Ignored: Not a valid bank debit/credit SMS.' : 'نادیده گرفته شد: این پیامک یک تراکنش واریز/برداشت بانکی نیست.');
        window.spToast?.(msg);
        return;
      }
      const ing = window.SimorghVault?.ingestBankTransaction(res.tx);
      if (ing?.added) {
        inp.value = '';
        window.spToast?.(
          isEn()
            ? `✅ Recorded: ${res.tx.title} · ${fmtNum(res.tx.amount)} Toman`
            : `✅ ثبت دستی با موفقیت انجام شد: ${res.tx.title} · ${fmtNum(res.tx.amount)} تومان`
        );
        window.spReload?.();
      }
    }
  });

  window.addEventListener('sp:loaded', () => {
    renderBankHubPanel();
  });

  window.addEventListener('simorgh:lang-changed', () => {
    renderBankHubPanel();
  });

  setTimeout(() => {
    drainNativeQueueOnStartup();
    renderBankHubPanel();
  }, 250);
})();
