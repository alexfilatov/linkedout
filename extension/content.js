(() => {
  'use strict';
  if (globalThis.__linkedOutLoaded) return;
  globalThis.__linkedOutLoaded = true;
  const api = globalThis.browser ?? globalThis.chrome;
  const MARKER = 'data-linkedout-hidden';
  const CARD = [
    '.nt-card', '.notification-card', '.notifications-card',
    '[data-view-name="notification-card"]',
    '[data-urn*="urn:li:notification:"]',
    '[data-urn*="urn:li:fs_notification:"]'
  ].join(',');
  const TOAST = '.artdeco-toast-item, [role="alert"]';
  let enabled = true;
  let timer;

  function hasAvatar(container) {
    // Menu and Premium-chip SVGs are decoration, not profile images. Counting
    // a menu icon as an avatar makes the menu wrapper look like a sibling row.
    return [...container.querySelectorAll('img, svg[role="img"], [role="img"], figure')]
      .some((image) => image.getAttribute('aria-hidden') !== 'true' &&
        !image.closest('button, [role="button"], [role="menu"]'));
  }

  function promotion(card) {
    const labels = [card, ...card.querySelectorAll('[aria-label], img[alt]')]
      .map((el) => el.getAttribute('aria-label') || el.getAttribute('alt') || '').join(' ');
    const textNodes = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const parts = [];
    let part;
    while ((part = textNodes.nextNode())) parts.push(part.textContent);
    return globalThis.LinkedOutRules.isPromotion({
      text: parts.join(' '), labels,
      links: [...card.querySelectorAll('a[href]')].map((el) => el.href)
    });
  }

  function completeRow(row) {
    const parent = row.parentElement;
    if (!parent || parent.matches('body, main, [role="main"], ul, ol, [role="list"]')) return row;
    const siblings = [...parent.children].filter((child) => child !== row);
    const isOverlay = (child) => {
      if (!child.matches('a[href][aria-labelledby]') || !promotion(child)) return false;
      try {
        const url = new URL(child.href);
        return url.origin === location.origin && /^\/notifications\/?$/.test(url.pathname);
      } catch { return false; }
    };
    // LinkedIn's current row wrapper also holds a divider and a full-row link
    // with duplicate accessible text. Keep that link inside the hidden row.
    return siblings.some(isOverlay) && siblings.every((child) => child.tagName === 'HR' || isOverlay(child))
      ? parent : row;
  }

  function textCandidates() {
    const rows = new Set();
    const checked = new Set();
    const excluded = 'nav, header, footer, script, style, textarea, [contenteditable="true"], [role="dialog"], .msg-overlay-list-bubble';
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      if (!text.textContent.trim() || text.parentElement?.closest(excluded)) continue;
      // LinkedIn also ships anonymous div rows without main/list semantics or
      // stable classes. Discover sales copy first, including copy split across
      // bold/span elements, then require an actual row boundary.
      for (let el = text.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (checked.has(el)) break;
        checked.add(el);
        if (el.textContent.length > 1400) break;
        if (!promotion(el)) continue;
        // A match inherited from a child is handled when the walk reaches that
        // child's text. Do not use unrelated sibling text to discover a group.
        if ([...el.children].some((child) => promotion(child))) break;
        for (let row = el; row && row !== document.body && row !== document.documentElement; row = row.parentElement) {
          if (row.matches('main, [role="main"], ul, ol, [role="list"]') || row.textContent.length > 1400) break;
          if ([...row.children].some((child) => !child.contains(el) &&
            hasAvatar(child) && child.querySelector('button, [role="button"]'))) break;
          const semanticRow = row.matches(`${CARD}, li, [role="listitem"], article`);
          const hasAvatarAndControl = hasAvatar(row) &&
            row.querySelectorAll('button, [role="button"]').length === 1 &&
            row.querySelectorAll('img').length <= 1;
          if (semanticRow || hasAvatarAndControl) {
            // Never promote a whole list/group into a hidden row.
            if (row.querySelectorAll(`${CARD}, li, [role="listitem"], article`).length <= 1) rows.add(completeRow(row));
            break;
          }
        }
        break;
      }
    }
    return rows;
  }

  function candidates() {
    const cards = new Set(document.querySelectorAll(CARD));
    if (/(?:^|\/)notifications(?:\/|$)/.test(location.pathname)) {
      // Fallback for LinkedIn's newer list markup, only on Notifications.
      document.querySelectorAll('main li, main [role="listitem"], [role="main"] li, [role="main"] [role="listitem"]').forEach((card) => cards.add(card));
      textCandidates().forEach((card) => cards.add(card));
    }
    document.querySelectorAll(TOAST).forEach((card) => cards.add(card));
    return [...cards];
  }
  function scan() {
    timer = undefined;
    const keep = new Set();
    if (enabled) {
      for (const card of candidates()) {
        if (promotion(card)) keep.add(card);
      }
      // Prefer the deepest *matching* row. A nonpromotional menu list item
      // inside a notification must not prevent its parent from being hidden.
      const matches = [...keep];
      for (const card of matches) {
        if (matches.some((child) => child !== card && card.contains(child))) keep.delete(card);
      }
    }
    document.querySelectorAll(`[${MARKER}]`).forEach((card) => {
      if (!keep.has(card)) card.removeAttribute(MARKER);
    });
    for (const card of keep) if (!card.hasAttribute(MARKER)) card.setAttribute(MARKER, '');
  }
  function schedule() {
    if (timer === undefined) timer = setTimeout(scan, 40);
  }
  function status() {
    return { enabled, hidden: document.querySelectorAll(`[${MARKER}]`).length };
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['href', 'aria-label', 'alt', 'data-urn', 'data-view-name']
  });
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) {
      enabled = changes.enabled.newValue !== false;
      scan();
    }
  });
  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'linkedout:status') { scan(); respond(status()); }
  });
  // popstate covers back/forward; DOM changes cover LinkedIn's SPA rendering.
  addEventListener('popstate', schedule);
  api.storage.local.get({ enabled: true }).then((settings) => {
    enabled = settings.enabled !== false;
    scan();
  }).catch(() => {
    // If extension storage is unavailable, retain the default local filter.
    scan();
  });
})();
