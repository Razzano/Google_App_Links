// ==UserScript==
// @name         Google Apps Links - Open in New Tab
// @namespace    srazzano
// @version      1.0.3
// @description  Forces Google apps menu (9 dots) links to open in new tabs
// @author       Sonny Razzano a.k.a. srazzano
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @match        https://*.google.com/*
// @match        https://google.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {

  'use strict';

  const fixLinks = () => {
    document.querySelectorAll('a[target="_top"]').forEach(link => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const innerDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (innerDoc) {
          innerDoc.querySelectorAll('a[href]').forEach(link => {
            if (link.target === '_top' || !link.target) {
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
            }
          });
        }
      } catch (e) {}
    });
  };

  fixLinks();

  const observer = new MutationObserver(fixLinks);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  setInterval(fixLinks, 2000);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.href && (
      link.closest('.gb_A, .apps-menu, [role="menu"], iframe') ||
      link.href.includes('google.com') &&
      (link.href.includes('/?authuser=') || link.href.includes('accounts.google'))
    )) {
      if (link.target === '_top') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    } }
  }, true);

  const reorderGoogleApps = () => {
    const appOrder = ['Earth', 'YouTube', 'Maps', 'Play', 'Translate', 'Gmail'];
    const apps = appOrder.map(name => document
      .querySelector(`li[data-is-draggable="true"] span[data-text="${name}"]`)
      ?.closest('li')
    );
    if (apps.some(app => !app)) return;
    const menu = apps[0].parentElement;
    if (apps.every((app, i) => menu.children[i] === app)) return;
    apps.reverse().forEach(app => menu.prepend(app));
  };

  const observeGoogleAppsMenu = () => {
    const observer = new MutationObserver(() => {
      reorderGoogleApps();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  observeGoogleAppsMenu();

})();
