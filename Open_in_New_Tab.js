// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.5.1
// @description  Forces Google Main Page links to open in new tabs
// @license      MIT
// @author       Sonny Razzano a.k.a. srazzano
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @match        https://*.google.com/*
// @match        https://google.com/*
// @match        https://lens.google.com/*
// @match        https://*.lens.google.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  // ==========================================================================
  // SETTINGS: 1 / true = on, 0 / false = off
  // ==========================================================================
  const ALL_LINKS_IN_NEW_TAB = true;
  const ORGANIZE_MENU_APPS = true;
  const REMOVE_GOOGLE_SEARCH_SUFFIX = true;
  const VOICE_SEARCH_NEW_TAB = true;
  const LENS_RESULTS_NEW_TAB = true;

  const REL = 'noopener noreferrer';

  // ==========================================================================
  // GOOGLE LENS: vsrid= results -> new tab
  // Runs IMMEDIATELY, before DOMContentLoaded / body exists
  // ==========================================================================
  const LENS_MARKER = 'lens_newtab=1';

  const isLensResultUrl = (url) => {
  try {
    const u = new URL(url, location.href);
    if (!u.search.includes('vsrid=')) return false;

    // Flow 1: standalone Lens site
    // lens.google.com/v3/upload?vsrid=...
    if (u.hostname.includes('lens.google.com')) return true;

    // Flow 2: Lens embedded in Google Search — YOUR flow
    // google.com/search?vsrid=...&vsint=...&udm=26&lns_mode=un&source=lns.web.gsbubb
    if (u.hostname.includes('google.com') && u.pathname.startsWith('/search')) {
      // vsrid= alone is enough — normal Google searches never have it.
      // udm=26 / lns_mode / vsint are extra confirmation if present.
      return true;
    }

    return false;
  } catch (_) { return false; }
};

  const handleLensResultImmediate = () => {
    if (!LENS_RESULTS_NEW_TAB) return false;
    if (!isLensResultUrl(location.href)) return false;
    // This IS the new tab we already opened — do nothing
    if (location.search.includes(LENS_MARKER)) return false;

    // Build new-tab URL with marker so it won't loop
    const sep = location.search.includes('?') ? '&' : '?';
    const newUrl = location.href + sep + LENS_MARKER;

    // Stop this tab from finishing loading the Lens result
    try { window.stop(); } catch (_) {}

    let opened = false;
    try {
      if (typeof GM_openInTab === 'function') { GM_openInTab(newUrl, { active: true, insert: true }); opened = true; }
    } catch (_) {}
    if (!opened) {
      const w = window.open(newUrl, '_blank', 'noopener,noreferrer');
      opened = !!w;
    }

    if (opened) {
      // Send original tab back to Google — history.back() fails here
      // because Lens uses location.replace(), so use replace()
      try { location.replace('https://www.google.com/'); }
      catch (_) { history.back(); }
      return true;
    }
    return false;
  };

  // *** Call it right now, don't wait for start() ***
  if (handleLensResultImmediate()) return;

  // Watch for SPA navigations that add vsrid= without a full reload
  let lastLensUrl = location.href;
  const watchLensUrl = () => {
    if (location.href === lastLensUrl) return;
    lastLensUrl = location.href;
    handleLensResultImmediate();
  };

  const patchHistoryForLens = () => {
    try {
      const nativePush = history.pushState;
      const nativeReplace = history.replaceState;
      history.pushState = function (...args) {
        const ret = nativePush.apply(this, args);
        watchLensUrl();
        return ret;
      };
      history.replaceState = function (...args) {
        const ret = nativeReplace.apply(this, args);
        watchLensUrl();
        return ret;
      };
      window.addEventListener('popstate', watchLensUrl);
      setInterval(watchLensUrl, 500);
    } catch (_) {}
  };
  patchHistoryForLens();

  GM_addStyle(`
    #yDmH0d div.LVal7b.nq7pOb { box-shadow: inset 0px 0px 6px rgba(255 255 255 / 0.5) !important; }
    #yDmH0d div.LVal7b.nq7pOb button { display: none !important; }
    #yDmH0d div.LVal7b.nq7pOb a:hover { background: rgba(120 120 120 / 0.2) !important; }
    body#gsr #gb > div.gb_z > div:nth-child(2) { max-height: calc(-98px + 100vh); }
    #gb div[style*="width: 370"][style*="z-index: 991"][style*="max-width: calc("][style*="max-height: calc("] {
      height: calc(-70px + 100dvh) !important;
    }
  `);

  const openSearch = (text) => {
    const query = (text ?? '').trim();
    if (!query) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const openSearchPrivileged = (text) => {
    const query = (text ?? '').trim();
    if (!query) return false;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    try {
      if (typeof GM_openInTab === 'function') { GM_openInTab(url, { active: true, insert: true }); return true; }
    } catch (_) { }
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    return !!w;
  };

  const setFormVoiceTarget = (form) => {
    if (!form) return form;
    try {
      if (VOICE_SEARCH_NEW_TAB) form.target = '_blank';
      else form.removeAttribute('target');
    } catch (_) {}
    return form;
  };

  const openFromFormPrivileged = (form) => {
    const box = form?.querySelector('textarea[name="q"], input[name="q"]');
    if (!box) return false;
    const query = box.value.trim();
    if (!query) return false;
    voiceActive = false;
    return openSearchPrivileged(query);
  };

  const forceNewTab = (link) => {
    if (!link || link.dataset.newTabFixed) return;
    link.dataset.newTabFixed = '1';
    if (link.target !== '_blank') link.target = '_blank';
    link.rel = REL;
  };

  const fixLinksIn = (root) => {
    if (!ALL_LINKS_IN_NEW_TAB || !root) return;
    if (root.nodeType !== 1) return;
    if (root.matches?.('a[href]')) forceNewTab(root);
    for (const link of root.querySelectorAll('a[href]')) forceNewTab(link);
  };

  const initSearchBox = () => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const searchBox = document.querySelector('textarea[name="q"]');
    if (!searchBox || searchBox.dataset.searchFixed) return;
    searchBox.dataset.searchFixed = '1';
    searchBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      openSearch(searchBox.value);
    }, true);
  };

  let suggestionHandled = false;

  const isAIMode = (el) => {
    if (!el) return false;
    const hit = el.closest?.('[aria-label*="AI Mode" i], [aria-label*="AI mode" i], [data-ved*="ai-mode" i]');
    if (hit) return true;
    const btn = el.closest?.('button, [role="button"], a[href]');
    if (!btn) return false;
    const label = ((btn.textContent || '') + ' ' + (btn.getAttribute?.('aria-label') || '')).trim();
    return /^AI Mode$/i.test(label);
  };

  const MEDIA_GUARD = 'audio, video, button, a[href], [role="button"], ' +
    '[aria-label*="listen" i], [aria-label*="pronounc" i], [aria-label*="play" i], ' +
    '[aria-label*="speaker" i], [aria-label*="voice" i], [aria-label*="mic" i], ' +
    '[aria-label*="speak" i], [data-ved*="voice"]';

  document.addEventListener('mousedown', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB || e.button !== 0) return;
    suggestionHandled = false;
    if (e.target.closest(MEDIA_GUARD)) return;
    const listbox = e.target.closest('ul[role="listbox"], [role="listbox"]');
    if (!listbox) return;
    const item = e.target.closest('li');
    if (!item || !listbox.contains(item)) return;
    const span = e.target.closest('span');
    if (!span || !item.contains(span)) return;
    const text = span.textContent.trim();
    if (!text || text === 'See more' || text === 'Delete') return;
    e.preventDefault();
    e.stopPropagation();
    suggestionHandled = true;
    openSearch(text);
  }, true);

  document.addEventListener('click', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    if (isAIMode(e.target)) return;
    if (suggestionHandled) {
      suggestionHandled = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const button = e.target.closest('input[type="submit"], button');
    if (button) {
      if (button.closest('[aria-label*="listen" i], [aria-label*="pronounc" i], [aria-label*="play" i], [aria-label*="speaker" i], [aria-label*="voice" i], [aria-label*="mic" i], [aria-label*="speak" i], [data-ved*="voice"]')) return;
      const form = button.closest('form');
      const searchBox = document.querySelector('textarea[name="q"]');
      if (form && searchBox && form.contains(searchBox)) {
        if (!searchBox.value.trim()) return;
        e.preventDefault();
        e.stopPropagation();
        openSearch(searchBox.value);
        return;
    } }
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (
      link.closest('.gb_A, .apps-menu, [role="menu"]') ||
      (link.href.includes('google.com') &&
        (link.href.includes('/?authuser=') || link.href.includes('accounts.google')))
    ) {
      forceNewTab(link);
    }
  }, true);

  const APP_ORDER_1 = ['Earth', 'Calendar', 'Contacts', 'Maps', 'News', 'Photos', 'Play', 'Translate', 'YouTube'];
  const APP_ORDER_2 = ['Account', 'Arts and Culture', 'Books', 'Blogger', 'Chat', 'Chrome Web Store', 'Drive'];

  let appsOrganized = false;

  const organizeGoogleApps = () => {
    if (!ORGANIZE_MENU_APPS || appsOrganized) return;
    const items = document.querySelectorAll('li[data-is-draggable="true"] span[data-text]');
    if (items.length < APP_ORDER_1.length + APP_ORDER_2.length) return;
    const byName = new Map();
    for (const span of items) {
      const name = span.dataset.text;
      if (!byName.has(name)) byName.set(name, span.closest('li'));
    }
    const apps1 = APP_ORDER_1.map((n) => byName.get(n));
    const apps2 = APP_ORDER_2.map((n) => byName.get(n));
    if (apps1.includes(undefined) || apps2.includes(undefined)) return;
    const menu1 = apps1[0].parentElement;
    const menu2 = apps2[0].parentElement;
    if (!menu1 || !menu2 || menu1 === menu2) return;
    const isOrdered = (apps, menu) => apps.every((app, i) => menu.children[i] === app);
    if (isOrdered(apps1, menu1) && isOrdered(apps2, menu2)) {
      appsOrganized = true;
      return;
    }
    const frag1 = document.createDocumentFragment();
    const frag2 = document.createDocumentFragment();
    for (const app of apps1) frag1.append(app);
    for (const app of apps2) frag2.append(app);
    menu2.prepend(frag1);
    menu1.prepend(frag2);
  };

  let voicePatched = false;
  let voiceActive = false;

  const isSearchForm = (form) => {
    if (!form) return false;
    return !!form.querySelector('textarea[name="q"], input[name="q"]');
  };

  const openFromForm = (form) => {
    const box = form?.querySelector('textarea[name="q"], input[name="q"]');
    if (!box) return false;
    const query = box.value.trim();
    if (!query) return false;
    openSearch(query);
    return true;
  };

  const patchFormMethods = () => {
    if (voicePatched) return;
    voicePatched = true;
    const nativeSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (...args) {
      if (ALL_LINKS_IN_NEW_TAB && isSearchForm(this)) {
        if (voiceActive) { setFormVoiceTarget(this); voiceActive = false; }
        else if (openFromForm(this)) return;
      }
      return nativeSubmit.apply(this, args);
    };
    if (HTMLFormElement.prototype.requestSubmit) {
      const nativeRequestSubmit = HTMLFormElement.prototype.requestSubmit;
      HTMLFormElement.prototype.requestSubmit = function (...args) {
        if (ALL_LINKS_IN_NEW_TAB && isSearchForm(this)) {
          if (voiceActive) { setFormVoiceTarget(this); voiceActive = false; }
          else if (openFromForm(this)) return;
        }
        return nativeRequestSubmit.apply(this, args);
      };
    }
  };

  document.addEventListener('submit', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    if (voiceActive) {
      setFormVoiceTarget(e.target);
      voiceActive = false;
      return;
    }
    if (!isSearchForm(e.target)) return;
    const box = e.target.querySelector('textarea[name="q"], input[name="q"]');
    if (box && !box.value.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    openFromForm(e.target);
  }, true);

  document.addEventListener('click', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const mic = e.target.closest(
      '[aria-label*="voice" i], [aria-label*="mic" i], [aria-label*="Speak" i], ' +
      '[data-ved*="voice"], button[aria-label*="Search by voice" i], div[role="button"][aria-label*="voice" i]'
    );
    if (mic) {
      voiceActive = true;
      setFormVoiceTarget(mic.closest('form') || document.querySelector('form:has(textarea[name="q"], input[name="q"])'));
    }
  }, true);

  let voiceWatchTimer = null;
  const watchVoiceResult = () => {
    if (voiceWatchTimer) return;
    const start = Date.now();
    let lastValue = '';
    voiceWatchTimer = setInterval(() => {
      const box = document.querySelector('textarea[name="q"], input[name="q"]');
      const val = box?.value.trim() ?? '';
      if (voiceActive && val && val !== lastValue && !location.pathname.startsWith('/search')) {
        lastValue = val;
      }
      if (Date.now() - start > 15000) {
        clearInterval(voiceWatchTimer);
        voiceWatchTimer = null;
        voiceActive = false;
      }
      if (location.pathname.startsWith('/search')) {
        voiceActive = false;
      }
    }, 300);
  };

  document.addEventListener('click', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const mic = e.target.closest('[aria-label*="voice" i], [aria-label*="mic" i]');
    if (mic) watchVoiceResult();
  }, true);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        fixLinksIn(node);
        if (node.matches?.('textarea[name="q"]') || node.querySelector?.('textarea[name="q"]')) {
          initSearchBox();
      } }
      if (m.type === 'attributes' && m.target.matches?.('a[href]')) {
        forceNewTab(m.target);
    } }
    if (ORGANIZE_MENU_APPS && !appsOrganized) organizeGoogleApps();
  });

  function cleanGoogleTitle() {
    if (!REMOVE_GOOGLE_SEARCH_SUFFIX) return;
    if (document.title.endsWith(' - Google Search')) {
      document.title = document.title.replace(' - Google Search', '');
  } }

  cleanGoogleTitle();

  const titleElement = document.querySelector('title');
  if (titleElement) {
    new MutationObserver(cleanGoogleTitle).observe(titleElement, { childList: true });
  }

  const start = () => {
    if (ALL_LINKS_IN_NEW_TAB) {
      patchFormMethods();
      fixLinksIn(document.body);
      initSearchBox();
      for (const f of document.querySelectorAll('form')) if (isSearchForm(f)) setFormVoiceTarget(f);
    }
    if (ORGANIZE_MENU_APPS) organizeGoogleApps();

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'target'],
    });
  };

  document.body ? start() : document.addEventListener('DOMContentLoaded', start, { once: true });

})();
