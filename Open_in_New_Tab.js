// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.4.4
// @description  Forces Google Main Page links to open in new tabs
// @license      MIT
// @author       Sonny Razzano a.k.a. srazzano
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @match        https://*.google.com/*
// @grant        GM_addStyle
// @grant        GM_openInTab
// @noframes
// ==/UserScript==

(() => {

  'use strict';

  let lastKey = '', lastTime = 0;
  const openSearchTab = (href) => {
    let key;
    try { key = new URL(href, location.origin).searchParams.get('q') || href; } catch { key = href; }
    const now = Date.now();
    if (key === lastKey && now - lastTime < 2000) return;
    lastKey = key;
    lastTime = now;
    GM_openInTab(href, { active: true, insert: true });
  };
  
  // ==============================================================================================================
  // MANUAL DEFAULT SETTINGS: 1 0R true else 0 OR false
  // ==============================================================================================================

  const ALL_LINKS_IN_NEW_TAB = true;
  const ORGANIZE_MENU_APPS = true;

  // =============================================================================================================
  // TEXTAREA SEARCH RESULTS IN NEW TAB
  // =============================================================================================================

  const searchResultsTarget = () => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const searchBox = document.querySelector('textarea[name="q"]');
    if (!searchBox) return;
    const openSearch = () => {
      const query = searchBox.value.trim();
      if (!query) return;
      //window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
	  openSearchTab(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    };
    searchBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openSearch();
    }, true);
    let suppressSuggestionClick = false;
    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const menuItem = e.target.closest('li');
      if (!menuItem) return;
      const span = e.target.closest('span');
      if (!span || !menuItem.contains(span)) return;
      const text = span.textContent.trim();
      if (!text) return;
      if (text === 'See more' || text === 'Delete') return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      suppressSuggestionClick = true;
      //window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
	  openSearchTab(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
    }, true);
    document.addEventListener('click', (e) => {
      if (suppressSuggestionClick) {
        suppressSuggestionClick = false;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      const button = e.target.closest('input[type="submit"], button');
      if (!button) return;
      const form = button.closest('form');
      if (!form || !form.contains(searchBox)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openSearch();
    }, true);
  };

  // =============================================================================================================
  // APP LINKS IN NEW TAB WITH OBSERVER
  // =============================================================================================================

  const appLinkTarget = () => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.target !== '_blank') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const innerDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (innerDoc) {
          innerDoc.querySelectorAll('a[href]').forEach(link => {
            if (link.target !== '_blank') {
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
            }
          });
        }
      } catch (e) {}
    });
  };

  const observeAppLinkTarget = () => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    appLinkTarget();
    const observer = new MutationObserver(appLinkTarget);
    observer.observe(document.body, { childList: true, subtree: true, });
  };

  document.addEventListener('click', (e) => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const link = e.target.closest('a');
    if (!link) return;
    if (link.closest('.gb_A, .apps-menu, [role="menu"]') || (link.href.includes('google.com') &&
       (link.href.includes('/?authuser=') || link.href.includes('accounts.google')))) {
      if (link.target !== '_blank') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    } }
  }, true);

  // =============================================================================================================
  // VOICE SEARCH → OPEN RESULTS IN NEW TAB
  // =============================================================================================================
  
  const voiceSearchNewTab = () => {
    if (!ALL_LINKS_IN_NEW_TAB) return;
    const nav = unsafeWindow.navigation;
    if (!nav) return;
    nav.addEventListener('navigate', (e) => {
      // Ignore back/forward, reloads, hash changes, downloads
      if (!e.cancelable || e.hashChange || e.downloadRequest) return;
      if (e.navigationType === 'traverse' || e.navigationType === 'reload') return;
      // Ignore real user clicks/submits (handled elsewhere in this script)
      //if (e.userInitiated || e.sourceElement) return;
      let url;
      try { url = new URL(e.destination.url); } catch { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname !== '/search' || !url.searchParams.has('q')) return;
      e.preventDefault();
      //GM_openInTab(url.href, { active: true, insert: true });
	  openSearchTab(url.href);
    });
    // Extra safety: intercept form submits that contain the search box
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const searchBox = form.querySelector('textarea[name="q"], input[name="q"]');
      if (!searchBox) return;
      const query = searchBox.value.trim();
      if (!query) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      //GM_openInTab(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { active: true, insert: true });
	  openSearchTab(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    }, true);
  };

  // =============================================================================================================
  // ORGANIZE GOOGLE 9 DOT MENU APPS WITH OBSERVER
  // =============================================================================================================

  const organizeGoogleApps = () => {
    if (!ORGANIZE_MENU_APPS) return;
    const appOrder1 = ['Earth', 'Calendar', 'Contacts', 'Maps', 'News', 'Photos', 'Play', 'Translate', 'YouTube'];
    const appOrder2 = ['Account', 'Arts and Culture', 'Books', 'Blogger', 'Chat', 'Chrome Web Store', 'Drive'];
    const getApps = order => order.map(name =>
      document.querySelector(`li[data-is-draggable="true"] span[data-text="${name}"]`)?.closest('li')
    );
    const apps1 = getApps(appOrder1);
    const apps2 = getApps(appOrder2);
    if (apps1.some(app => !app) || apps2.some(app => !app)) return;
    const menu1 = apps1[0].parentElement;
    const menu2 = apps2[0].parentElement;
    const apps1Correct = apps1.every((app, i) => menu1.children[i] === app);
    const apps2Correct = apps2.every((app, i) => menu2.children[i] === app);
    if (apps1Correct && apps2Correct) return;
    apps1.reverse().forEach(app => menu2.prepend(app));
    apps2.reverse().forEach(app => menu1.prepend(app));
    GM_addStyle(`
      #yDmH0d div.LVal7b.nq7pOb { box-shadow: inset 0px 0px 6px rgba(255 255 255 / 0.5) !important; }
      #yDmH0d div.LVal7b.nq7pOb button { display: none !important; }
      #yDmH0d div.LVal7b.nq7pOb a:hover { background: rgba(120 120 120 / 0.2) !important; }
    `);
  };

  const observeOrganizeGoogleApps = () => {
    if (!ORGANIZE_MENU_APPS) return;
    const observer = new MutationObserver(organizeGoogleApps);
    observer.observe(document.body, { childList: true, subtree: true, });
  };

  // =============================================================================================================
  // START CODE
  // =============================================================================================================

  const start = () => {
    searchResultsTarget();
    observeAppLinkTarget();
    observeOrganizeGoogleApps();
	voiceSearchNewTab();
  };

  document.body ? start() : document.addEventListener('DOMContentLoaded', start, { once: true });

  // GOOGLE 9 DOT MENU GLOBAL CSS

  GM_addStyle(`
    #gb div[style*="width: 370"][style*="z-index: 991"][style*="max-width: calc("][style*="max-height: calc("] {
      height: calc(-70px + 100dvh) !important;
    }
  `);

})();
