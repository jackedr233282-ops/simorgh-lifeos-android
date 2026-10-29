/**
 * Simorgh LifeOS — Mobile Hub (4 Clean Tabs + Smooth Drawer & FAB)
 * سازنده: سید هادی موسوی (Syed Hadi Mosavi) — شرکت سیمرغ (Simorgh Co.)
 */
(function () {
  'use strict';
  const mq = window.matchMedia('(max-width: 820px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function setup() {
    const aside = $('aside');
    if (!aside || document.querySelector('.sp-m-backdrop')) return;

    // ۱. لایه تیره شیک پشت منو
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

    // ۲. نوار ۴ گانه تمیز در پایین صفحه
    const dock = $('#floatingDock');
    if (dock) {
      const isEn = (document.documentElement.lang || 'fa') === 'en';
      dock.innerHTML = `
        <button type="button" class="dock-btn" data-dock-page="home">⌂ <span>${isEn ? 'Home' : 'خانه'}</span></button>
        <button type="button" class="dock-btn" data-dock-page="finance">💳 <span>${isEn ? 'Finance' : 'حساب‌وکتاب'}</span></button>
        <button type="button" class="dock-btn" data-dock-page="life">🌿 <span>${isEn ? 'Routine' : 'روتین'}</span></button>
        <button type="button" class="dock-btn" data-dock-page="settings">⚙ <span>${isEn ? 'Settings' : 'تنظیمات'}</span></button>
      `;
      
      // همگام‌سازی رویداد کلیک دکمه‌های نوار پایین
      $$('.dock-btn[data-dock-page]', dock).forEach(btn => {
        btn.onclick = () => {
          const target = btn.dataset.dockPage;
          if (window.spPage) window.spPage(target);
          else $(`nav [data-page="${target}"]`)?.click();
        };
      });
    }

    // ۳. دکمه بزرگ شناور ＋ برای ثبت سریع خرج و دخل دستی
    if (!$('.sp-m-fab')) {
      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'sp-m-fab';
      fab.setAttribute('aria-label', 'ثبت تراکنش دستی');
      fab.textContent = '＋';
      fab.addEventListener('click', () => {
        const quickBtn = $('#openQuickTxBtn') || $('#quickExpenseTopBtn');
        if (quickBtn) quickBtn.click();
        else if (window.spPage) window.spPage('finance');
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
      if ((dock && dock.children.length === 4) || ++tries > 30) clearInterval(t);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
