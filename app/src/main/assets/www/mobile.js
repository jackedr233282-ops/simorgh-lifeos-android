/**
 * Simorgh LifeOS — Minimalist Mobile Dock (Pure Personal Ledger)
 * سازنده: سید هادی موسوی (Syed Hadi Mosavi) — شرکت سیمرغ (Simorgh Co.)
 */
(function () {
  'use strict';
  const mq = window.matchMedia('(max-width: 820px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function setup() {
    const aside = $('aside');
    if (!aside) return;

    if (!document.querySelector('.sp-m-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'sp-m-backdrop';
      (document.getElementById('app') || document.body).insertBefore(backdrop, aside);

      const sync = () => backdrop.classList.toggle('show', mq.matches && aside.classList.contains('open'));
      new MutationObserver(sync).observe(aside, { attributes: true, attributeFilter: ['class'] });

      const close = () => { aside.classList.remove('open'); sync(); };
      backdrop.addEventListener('click', close);
      aside.addEventListener('click', e => {
        if (mq.matches && e.target.closest('nav button[data-page]')) setTimeout(close, 60);
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }

    // نوار پایین فوق‌العاده شیک و ۲ تبی
    const dock = $('#floatingDock');
    if (dock) {
      const isEn = (document.documentElement.lang || 'fa') === 'en';
      dock.innerHTML = `
        <button type="button" class="dock-btn active" data-dock-page="home">
          💳 <span>${isEn ? 'Finances' : 'حساب‌وکتاب'}</span>
        </button>
        <button type="button" class="dock-btn" data-dock-page="settings">
          ⚙ <span>${isEn ? 'Settings' : 'تنظیمات'}</span>
        </button>
      `;

      $$('.dock-btn[data-dock-page]', dock).forEach(btn => {
        btn.onclick = () => {
          $$('.dock-btn', dock).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.dataset.dockPage;
          if (window.spPage) window.spPage(target);
          else $(`nav [data-page="${target}"]`)?.click();
        };
      });
    }

    // دکمه بزرگ شناور ＋ برای ثبت سریع خرج و دخل دستی
    if (!$('.sp-m-fab')) {
      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'sp-m-fab';
      fab.setAttribute('aria-label', 'ثبت تراکنش دستی');
      fab.textContent = '＋';
      fab.addEventListener('click', () => {
        const quickBtn = $('#homeAddTxBtn') || $('#openQuickTxBtn') || $('#quickExpenseTopBtn');
        if (quickBtn) quickBtn.click();
        else if (window.spPage) window.spPage('home');
      });
      document.body.appendChild(fab);
    }
  }

  function boot() {
    setup();
    let tries = 0;
    const t = setInterval(() => {
      setup();
      const dock = $('#floatingDock');
      if ((dock && dock.children.length === 2) || ++tries > 30) clearInterval(t);
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
