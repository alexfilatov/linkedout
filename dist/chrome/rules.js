/* Shared by the content script and the regression suite. No network requests. */
(function (root) {
  'use strict';
  const normalize = (value) => String(value || '').normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();

  // Explicit sales language, not a blanket match for the word "Premium".
  const promotions = [
    /\bpremium benefit\b/i,
    /\b(?:try|buy|join|activate|reactivate|explore|discover|get|start|renew|upgrade to)\s+(?:linkedin\s+)?premium\b/i,
    /\b(?:with|using)\s+(?:linkedin\s+)?premium\b.{0,60}\b(?:see|unlock|access|view|discover)\b/i,
    /\b(?:see|unlock|access|view|discover)\b.{0,100}\bwith\s+(?:linkedin\s+)?premium\b/i,
    /\bpremium\s+(?:free trial|trial|subscription|offer|discount)\b/i,
    /\b(?:free|one.month|1.month|30.day)\s+(?:trial of\s+)?(?:linkedin\s+)?premium\b/i,
    /\b(?:save|off|discount)\b.{0,35}\bpremium\b/i
  ];
  function isPromotion({ text = '', labels = '', links = [] } = {}) {
    const copy = normalize(`${text} ${labels}`);
    if (promotions.some((pattern) => pattern.test(copy))) return true;
    // A sales destination backs up short CTA copy; a mere link isn't enough.
    return links.some((href) => {
      try {
        const url = new URL(href, 'https://www.linkedin.com');
        return /(^|\.)linkedin\.com$/.test(url.hostname) &&
          /^\/(?:premium|sales\/navigator)(?:\/|$)/.test(url.pathname);
      } catch { return false; }
    }) && /\b(?:try|upgrade|free trial|redeem|claim offer|start trial)\b/i.test(copy);
  }
  root.LinkedOutRules = Object.freeze({ normalize, isPromotion });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LinkedOutRules;
})(typeof globalThis !== 'undefined' ? globalThis : this);
