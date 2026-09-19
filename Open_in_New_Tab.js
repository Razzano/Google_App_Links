// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.4.3
// @description  Forces Google Main Page links to open in new tabs
// @license      MIT
// @author       Sonny Razzano a.k.a. srazzano
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @match        https://*.google.com/*
// @match        https://google.com/*
// @grant        GM_addStyle
// ==/UserScript==

(() => {

  'use strict';

  // ==============================================================================================================
  // DEFAULT SETTINGS: 1 0R TRUE else 0 OR FALSE
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
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
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
      window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
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
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
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
      }
    }
  }, true);


  // =============================================================================================================
  // ORGANIZE GOOGLE MENU APPS WITH OBSERVER
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
      body#gsr #gb > div.gb_z > div:nth-child(2) { max-height: calc(-98px + 100vh); }
    `);
  };

  const observeOrganizeGoogleApps = () => {
    if (!ORGANIZE_MENU_APPS) return;
    const observer = new MutationObserver(organizeGoogleApps);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  // =============================================================================================================
  // INITIATE SHARED CODE
  // =============================================================================================================

  const start = () => {
    searchResultsTarget();
    observeAppLinkTarget();
    observeOrganizeGoogleApps();
  };

  document.body ? start() : document.addEventListener('DOMContentLoaded', start, { once: true });

})();
