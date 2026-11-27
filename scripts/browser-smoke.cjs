const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.addInitScript(() => {
      let data = { enabled: true, desktopBlocked: false };
      let permission = false, blocked = false;
      window.chrome = {
        runtime: { getManifest: () => ({ optional_permissions: ['contentSettings'] }) },
        storage: { local: { get: async (defaults) => ({ ...defaults, ...data }), set: async (next) => Object.assign(data, next) } },
        tabs: { query: async () => [{ id: 1, url: 'https://www.linkedin.com/notifications/' }], sendMessage: async () => ({ hidden: data.enabled ? 1 : 0, enabled: data.enabled }) },
        permissions: { contains: async () => permission, request: async () => (permission = true) },
        contentSettings: { notifications: { get: async () => ({ setting: blocked ? 'block' : 'ask' }), set: async () => { blocked = true; }, clear: async () => { blocked = false; } } }
      };
    });
    await page.goto(`file://${resolve('dist/chrome/popup.html')}`);
    await page.getByText('1 Premium upsell hidden on this page.').waitFor();
    await page.screenshot({ path: '.impeccable/review/chrome-popup.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByLabel('Hide Premium upsells').uncheck();
    await page.getByText('Paused. Premium has the floor again.').waitFor();
    await page.getByLabel('Hide Premium upsells').check();
    await page.getByRole('button', { name: 'Block all LinkedIn desktop alerts', exact: true }).click();
    await page.getByRole('button', { name: 'Remove LinkedOut’s desktop block', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Remove LinkedOut’s desktop block', exact: true }).click();
    await page.getByRole('button', { name: 'Block all LinkedIn desktop alerts', exact: true }).waitFor();
    // The Safari path has no contentSettings API.
    await page.addInitScript(() => { delete window.chrome.contentSettings; window.chrome.runtime.getManifest = () => ({}); });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await page.getByRole('button', { name: 'How to silence Safari notifications' }).click();
    await page.getByText(/If it isn’t listed/).waitFor();
    await page.screenshot({ path: '.impeccable/review/safari-popup.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    // Run the actual content script in a real rendering engine, against a fixture.
    await page.route('https://www.linkedin.com/notifications/', (route) => route.fulfill({
      contentType: 'text/html', body: '<html><head></head><body><main><ul><li class="nt-card" id="promo">3 people viewed your profile. See the full list with Premium. Premium benefit</li><li class="nt-card" id="normal">Alex sent you a message.</li></ul></main></body></html>'
    }));
    await page.addInitScript(() => {
      chrome.runtime = { onMessage: { addListener() {} } };
      chrome.storage.onChanged = { addListener(fn) { window.toggleFilter = (value) => fn({ enabled: { newValue: value } }, 'local'); } };
    });
    await page.goto('https://www.linkedin.com/notifications/');
    await page.addScriptTag({ content: readFileSync('extension/rules.js', 'utf8') });
    await page.addStyleTag({ content: readFileSync('extension/content.css', 'utf8') });
    await page.addScriptTag({ content: readFileSync('extension/content.js', 'utf8') });
    await page.locator('#promo').waitFor({ state: 'hidden' });
    await page.locator('#normal').waitFor({ state: 'visible' });
    await page.evaluate(() => toggleFilter(false));
    await page.locator('#promo').waitFor({ state: 'visible' });
    console.log('Browser smoke passed: Chrome controls, Safari instructions, responsive popup, DOM filtering and restore.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
