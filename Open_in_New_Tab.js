// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.3.8
// @description  Forces Google apps menu (9 dots) links to open in new tabs
// @license      MIT
// @author       Sonny Razzano a.k.a. srazzano
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @match        https://*.google.com/*
// @match        https://google.com/*
// @grant        GM_addStyle
// ==/UserScript==

(() => {

  'use strict';

  // ===================================================================================================
  // DEFAULT SETTINGS
  // ===================================================================================================

  let allLinksInNewTab = true; // true/1 of false/0
  let organizeAppLinks = true; // true/1 of false/0

  // ===================================================================================================
  // LINKS IN NEW TAB WITH OBSERVER
  // ===================================================================================================

  const linkTarget = () => {
    if (!allLinksInNewTab) return;
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

  const observeLinkTarget = () => {
    if (!allLinksInNewTab) return;
    linkTarget();
    const observer = new MutationObserver(linkTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  document.addEventListener('click', (e) => {
    if (!allLinksInNewTab) return;
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

  // ===================================================================================================
  // ORGANIZE LINKS WITH OBSERVER
  // ===================================================================================================

  const reorderGoogleApps = () => {
    const appOrder1 = ['Earth', 'YouTube', 'Maps', 'Play', 'Translate', 'Photos', 'Calendar', 'Contacts'];
    const appOrder2 = ['Account', 'Chrome Web Store', 'Books', 'Blogger', 'Chat', 'Drive'];
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
      #yDmH0d div.o83JEf > div.LVal7b.nq7pOb button { display: none !important; }
    `);
  };

  const observeReorderGoogleApps = () => {
    if (!organizeAppLinks) return;
    const observer = new MutationObserver(reorderGoogleApps);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  // ===================================================================================================
  // SHARED CODE
  // ===================================================================================================

  if (document.body) {
    observeLinkTarget();
    observeReorderGoogleApps();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observeLinkTarget();
      observeReorderGoogleApps();
    }, { once: true });
  }

})();
