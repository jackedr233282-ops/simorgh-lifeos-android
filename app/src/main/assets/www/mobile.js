/**
 * Simorgh LifeOS — Mobile helpers (classic script, safe to run on desktop too)
 * - Drawer backdrop + auto-close after choosing a page
 * - "More" tab in the bottom bar to open the full menu
 * - Floating "＋" button for fast manual income/expense entry
 * Creator: Syed Hadi Mosavi — Simorgh Co.
 */
(function () {
  'use strict';
  const mq = window.matchMedia('(max-width: 820px)');
  const $ = (s, r = document) => r.querySelector(s);

  function setup() {
    const aside = $('aside');
    if (!aside || document.querySelector('.sp-m-backdrop')) return;

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

    // Bottom bar: "More" opens drawer
    const dock = $('#floatingDock');
    if (dock && !$('.sp-m-more', dock)) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'dock-btn sp-m-more';
      const fa = (document.documentElement.lang || 'fa') !== 'en';
      more.innerHTML = '☰ <span>' + (fa ? 'بیشتر' : 'More') + '</span>';
      more.addEventListener('click', e => {
        e.stopPropagation();
        aside.classList.add('open');
        sync();
      });
      dock.appendChild(more);
    }

    // FAB for quick manual expense/income
    if (!$('.sp-m-fab')) {
      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'sp-m-fab';
      fab.setAttribute('aria-label', 'Add transaction');
      fab.textContent = '＋';
      fab.addEventListener('click', () => {
        const topBtn = $('#quickExpenseTopBtn') || $('#openQuickTxBtn');
        if (topBtn) topBtn.click();
        else window.spPage?.('finance');
      });
      document.body.appendChild(fab);
    }
  }

  function boot() {
    setup();
    // Dock / app are created asynchronously by v4.js — retry briefly.
    let tries = 0;
    const t = setInterval(() => {
      setup();
      const dock = $('#floatingDock');
      if ((dock && dock.querySelector('.sp-m-more')) || ++tries > 40) clearInterval(t);
    }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
