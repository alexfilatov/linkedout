const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
async function fixture({ safari = false, deny = false } = {}) {
  const dom = new JSDOM(readFileSync('extension/popup.html', 'utf8'), { runScripts: 'outside-only', url: 'https://extension.test/popup.html' });
  const state = { enabled: true, desktopBlocked: false };
  const calls = [];
  let granted = false, blocked = false;
  dom.window.chrome = {
    runtime: { getManifest: () => ({ optional_permissions: safari ? [] : ['contentSettings'] }) },
    storage: { local: { get: async (defaults) => ({ ...defaults, ...state }), set: async (next) => Object.assign(state, next) } },
    tabs: { query: async () => [{ id: 1, url: 'https://www.linkedin.com/notifications/' }], sendMessage: async () => ({ hidden: 1 }) },
    permissions: { contains: async () => granted, request: async () => { calls.push('request'); return granted = !deny; } },
    contentSettings: safari ? undefined : { notifications: {
      get: async () => ({ setting: blocked ? 'block' : 'ask' }),
      set: async (rule) => { calls.push(rule); blocked = true; },
      clear: async () => { calls.push('clear'); blocked = false; }
    } }
  };
  dom.window.eval(readFileSync('extension/popup.js', 'utf8'));
  await settle();
  return { dom, state, calls, document: dom.window.document };
}
test('popup persists pause and shows current page count', async () => {
  const f = await fixture();
  try {
    assert.match(f.document.querySelector('#page-status').textContent, /1 Premium upsell/);
    const toggle = f.document.querySelector('#enabled');
    toggle.checked = false; toggle.dispatchEvent(new f.dom.window.Event('change')); await settle();
    assert.equal(f.state.enabled, false);
    assert.match(f.document.querySelector('#page-status').textContent, /Paused/);
  } finally { f.dom.window.close(); }
});
test('desktop block requests permission and restores existing policy using clear', async () => {
  const f = await fixture();
  try {
    const button = f.document.querySelector('#desktop');
    button.click(); await settle();
    assert.equal(f.calls[0], 'request');
    assert.equal(f.calls[1].primaryPattern, 'https://[*.]linkedin.com/*');
    assert.equal(f.calls[1].setting, 'block');
    assert.equal(f.state.desktopBlocked, true);
    button.click(); await settle();
    assert.equal(f.calls.at(-1), 'clear');
    assert.equal(f.state.desktopBlocked, false);
  } finally { f.dom.window.close(); }
});
test('denied permission leaves desktop policy unchanged', async () => {
  const f = await fixture({ deny: true });
  try {
    f.document.querySelector('#desktop').click(); await settle();
    assert.deepEqual(f.calls, ['request']);
    assert.equal(f.state.desktopBlocked, false);
    assert.match(f.document.querySelector('#desktop-status').textContent, /wasn’t granted/);
  } finally { f.dom.window.close(); }
});
test('Safari shows manual site notification instructions', async () => {
  const f = await fixture({ safari: true });
  try {
    f.document.querySelector('#desktop').click(); await settle();
    assert.match(f.document.querySelector('#desktop-status').textContent, /choose Deny/);
    assert.equal(f.calls.length, 0);
  } finally { f.dom.window.close(); }
});
