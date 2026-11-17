// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.4.8
// @description  Forces Google Main Page links to open in new tabs
// @license      MIT
// @author       Sonny Razzano a.k.a. srazzano
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @match        https://*.google.com/*
// @match        https://google.com/*
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

  const REL = 'noopener noreferrer';

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
  const setFormNewTab = (form) => {
    if (form) { try { form.target = '_blank'; } catch (_) {} }
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

  const MEDIA_GUARD = 'audio, video, button, a[href], [role="button"], ' +
    '[aria-label*="listen" i], [aria-label*="pronounc" i], [aria-label*="play" i], ' +
    '[aria-label*="speaker" i], [aria-label*="voice" i], [aria-label*="mic" i], ' +
    '[aria-label*="speak" i], [data-ved*="voice"]';
  document.addEventListener('mousedown', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB || e.button !== 0) return;
    suggestionHandled = false;
    if (e.target.closest(MEDIA_GUARD)) return;               // never eat media controls
    const listbox = e.target.closest('ul[role="listbox"], [role="listbox"]');
    if (!listbox) return;                                   // not autocomplete: leave it alone
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
        if (voiceActive) { setFormNewTab(this); voiceActive = false; /* fall through to native */ }
        else if (openFromForm(this)) return;
      }
      return nativeSubmit.apply(this, args);
    };
    if (HTMLFormElement.prototype.requestSubmit) {
      const nativeRequestSubmit = HTMLFormElement.prototype.requestSubmit;
      HTMLFormElement.prototype.requestSubmit = function (...args) {
        if (ALL_LINKS_IN_NEW_TAB && isSearchForm(this)) {
          if (voiceActive) { setFormNewTab(this); voiceActive = false; /* fall through to native */ }
          else if (openFromForm(this)) return;
        }
        return nativeRequestSubmit.apply(this, args);
      };
    }
  };

  document.addEventListener('submit', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    if (voiceActive) {
      setFormNewTab(e.target);
      voiceActive = false;
      return;
    }
    if (!isSearchForm(e.target)) return;
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
      setFormNewTab(mic.closest('form') || document.querySelector('form:has(textarea[name="q"], input[name="q"])'));
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
      for (const f of document.querySelectorAll('form')) if (isSearchForm(f)) setFormNewTab(f);
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
