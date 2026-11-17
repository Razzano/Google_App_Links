// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.4.6
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

  const REL = 'noopener noreferrer';

  // Inject styles ONCE — was re-injected on every organize pass.
  GM_addStyle(`
    #yDmH0d div.LVal7b.nq7pOb { box-shadow: inset 0px 0px 6px rgba(255 255 255 / 0.5) !important; }
    #yDmH0d div.LVal7b.nq7pOb button { display: none !important; }
    #yDmH0d div.LVal7b.nq7pOb a:hover { background: rgba(120 120 120 / 0.2) !important; }
    body#gsr #gb > div.gb_z > div:nth-child(2) { max-height: calc(-98px + 100vh); }
    #gb div[style*="width: 370"][style*="z-index: 991"][style*="max-width: calc("][style*="max-height: calc("] {
      height: calc(-70px + 100dvh) !important;
    }
  `);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const openSearch = (text) => {
    const query = (text ?? '').trim();
    if (!query) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  // Mark a link once. Checking dataset is cheaper than re-setting
  // target/rel + triggering attribute observers on every mutation.
  const forceNewTab = (link) => {
    if (!link || link.dataset.newTabFixed) return;
    link.dataset.newTabFixed = '1';
    if (link.target !== '_blank') link.target = '_blank';
    link.rel = REL;
  };

  // Only touch links inside a subtree — no more full-document scans.
  const fixLinksIn = (root) => {
    if (!ALL_LINKS_IN_NEW_TAB || !root) return;
    if (root.nodeType !== 1) return;
    if (root.matches?.('a[href]')) forceNewTab(root);
    // querySelectorAll on the subtree, not document
    for (const link of root.querySelectorAll('a[href]')) forceNewTab(link);
  };

  // ==========================================================================
  // SEARCH BOX: Enter + suggestion clicks + search button
  // ==========================================================================

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

  // One delegated handler replaces the old mousedown + click pair
  // (and the suppressSuggestionClick flag dance).
  let suggestionHandled = false;

  document.addEventListener('mousedown', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB || e.button !== 0) return;
    // Reset per-gesture; mousedown always precedes click for the same gesture
    suggestionHandled = false;

    const item = e.target.closest('li');
    if (!item) return;
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

    // Swallow the click that follows a handled suggestion mousedown
    if (suggestionHandled) {
      suggestionHandled = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Search submit button
    const button = e.target.closest('input[type="submit"], button');
    if (button) {
      const form = button.closest('form');
      const searchBox = document.querySelector('textarea[name="q"]');
      if (form && searchBox && form.contains(searchBox)) {
        e.preventDefault();
        e.stopPropagation();
        openSearch(searchBox.value);
        return;
      }
    }

    // App-menu / account links — delegation instead of pre-scanning all <a>
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

  // ==========================================================================
  // ORGANIZE GOOGLE APPS MENU
  // ==========================================================================

  const APP_ORDER_1 = ['Earth', 'Calendar', 'Contacts', 'Maps', 'News', 'Photos', 'Play', 'Translate', 'YouTube'];
  const APP_ORDER_2 = ['Account', 'Arts and Culture', 'Books', 'Blogger', 'Chat', 'Chrome Web Store', 'Drive'];

  let appsOrganized = false;

  const organizeGoogleApps = () => {
    if (!ORGANIZE_MENU_APPS || appsOrganized) return;

    // Single pass: build a Map of name -> <li> instead of 16 querySelector calls
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
      appsOrganized = true; // done — stop checking
      return;
    }

    // Use DocumentFragment + append (one reflow per menu) instead of
    // repeated prepend() calls that each trigger layout.
    const frag1 = document.createDocumentFragment();
    const frag2 = document.createDocumentFragment();
    for (const app of apps1) frag1.append(app);
    for (const app of apps2) frag2.append(app);

    // Swap: apps1 go to menu2, apps2 go to menu1 (preserves original intent)
    menu2.prepend(frag1);
    menu1.prepend(frag2);

    // Verify on next mutation; if still wrong we'll retry, otherwise lock in
    // (avoids infinite re-sort loop if Google re-renders the menu)
  };


  // ==========================================================================
  // VOICE SEARCH: force voice results into a new tab
  // ==========================================================================
  // Why this needs its own handling:
  //  - Tapping the mic does NOT fire keydown / click on a submit button
  //  - Google fills textarea[name="q"] programmatically, then submits
  //  - form.submit() does NOT fire a "submit" event, so a listener alone misses it
  //
  // So we patch the form methods themselves + listen for submit events.

  let voicePatched = false;
  let voiceActive = false; // set when the mic button is pressed

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

    // 1) form.submit() — programmatic submit, no event fires
    const nativeSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (...args) {
      if (ALL_LINKS_IN_NEW_TAB && isSearchForm(this)) {
        if (openFromForm(this)) return; // swallowed, opened in new tab instead
      }
      return nativeSubmit.apply(this, args);
    };

    // 2) form.requestSubmit() — DOES fire submit, but patch anyway
    //    so voice-initiated submits are caught even if the event is stopped
    if (HTMLFormElement.prototype.requestSubmit) {
      const nativeRequestSubmit = HTMLFormElement.prototype.requestSubmit;
      HTMLFormElement.prototype.requestSubmit = function (...args) {
        if (ALL_LINKS_IN_NEW_TAB && isSearchForm(this)) {
          if (openFromForm(this)) return;
        }
        return nativeRequestSubmit.apply(this, args);
      };
    }
  };

  // 3) Normal submit event (Enter via form, requestSubmit, etc.)
  document.addEventListener('submit', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    if (!isSearchForm(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    openFromForm(e.target);
  }, true);

  // 4) Mic button: flag that the NEXT submit came from voice.
  //    This matters because Google sometimes navigates via location
  //    instead of a form submit — the flag lets us catch the value
  //    change + fall back to polling below.
  document.addEventListener('click', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const mic = e.target.closest(
      '[aria-label*="voice" i], [aria-label*="mic" i], [aria-label*="Speak" i], ' +
      '[data-ved*="voice"], button[aria-label*="Search by voice" i], div[role="button"][aria-label*="voice" i]'
    );
    if (mic) voiceActive = true;
  }, true);

  // 5) Fallback: if voice filled the box but Google is about to navigate
  //    without a form submit, catch the box value changing + page hiding.
  //    Polling is cheap here because it only runs while voice is active,
  //    and stops as soon as we handle it or after 15s.
  let voiceWatchTimer = null;
  const watchVoiceResult = () => {
    if (voiceWatchTimer) return;
    const start = Date.now();
    let lastValue = '';
    voiceWatchTimer = setInterval(() => {
      const box = document.querySelector('textarea[name="q"], input[name="q"]');
      const val = box?.value.trim() ?? '';
      // Voice filled the box, and we're still on the homepage (not results yet)
      if (voiceActive && val && val !== lastValue && !location.pathname.startsWith('/search')) {
        lastValue = val;
        // Give Google a beat to submit on its own — if it hasn't navigated
        // in 800ms, assume it will submit via JS and our patched
        // submit() above will catch it. Don't open here to avoid doubles.
      }
      if (Date.now() - start > 15000) {
        clearInterval(voiceWatchTimer);
        voiceWatchTimer = null;
        voiceActive = false;
      }
      // Once we land on /search in THIS tab, voice already navigated —
      // reset so the next voice search works cleanly.
      if (location.pathname.startsWith('/search')) {
        voiceActive = false;
      }
    }, 300);
  };

  // Start the voice watcher when the mic is used
  document.addEventListener('click', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const mic = e.target.closest('[aria-label*="voice" i], [aria-label*="mic" i]');
    if (mic) watchVoiceResult();
  }, true);

  // ==========================================================================
  // SINGLE MUTATION OBSERVER — replaces 2 observers + full rescans
  // ==========================================================================

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        fixLinksIn(node);
        // Search box may be added late (SPA navigation)
        if (node.matches?.('textarea[name="q"]') || node.querySelector?.('textarea[name="q"]')) {
          initSearchBox();
        }
      }
      // Attributes: only react if a link's href/target changed
      if (m.type === 'attributes' && m.target.matches?.('a[href]')) {
        forceNewTab(m.target);
      }
    }
    if (ORGANIZE_MENU_APPS && !appsOrganized) organizeGoogleApps();
  });

  // ==========================================================================
  // INIT
  // ==========================================================================

  const start = () => {
    if (ALL_LINKS_IN_NEW_TAB) {
      patchFormMethods();
      fixLinksIn(document.body); // one initial pass
      initSearchBox();
    }
    if (ORGANIZE_MENU_APPS) organizeGoogleApps();

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'target'], // don't fire on class/style churn
    });
  };

  document.body ? start() : document.addEventListener('DOMContentLoaded', start, { once: true });
})();
