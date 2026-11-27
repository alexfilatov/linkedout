const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const source = (name) => readFileSync(`extension/${name}.js`, 'utf8');
const sleep = () => new Promise((resolve) => setTimeout(resolve, 100));
async function fixture(markup, path = 'notifications/') {
  const dom = new JSDOM(`<html><head></head><body>${markup}</body></html>`, {
    url: `https://www.linkedin.com/${path}`, runScripts: 'outside-only', pretendToBeVisual: true
  });
  const stylesheet = dom.window.document.createElement('style');
  stylesheet.textContent = readFileSync('extension/content.css', 'utf8');
  dom.window.document.head.append(stylesheet);
  let storageChanged, onMessage;
  dom.window.chrome = {
    storage: { local: { get: async () => ({ enabled: true }) }, onChanged: { addListener(fn) { storageChanged = fn; } } },
    runtime: { onMessage: { addListener(fn) { onMessage = fn; } } }
  };
  dom.window.eval(source('rules')); dom.window.eval(source('content'));
  await sleep();
  return {
    dom, document: dom.window.document,
    toggle(value) { storageChanged({ enabled: { newValue: value } }, 'local'); },
    status() { let result; onMessage({ type: 'linkedout:status' }, {}, (value) => result = value); return result; }
  };
}
test('hides screenshot notification while preserving normal rows and unread counts', async () => {
  const f = await fixture('<nav>3</nav><main><ul><li id="promo" class="nt-card">3 people viewed your profile. See the full list with Premium.<span>Premium benefit</span></li><li id="message" class="nt-card">Alex sent a message</li></ul></main>');
  try {
    assert.equal(f.document.querySelector('#promo').hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.document.querySelector('#message').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('nav').textContent, '3');
    assert.equal(f.status().hidden, 1);
    f.toggle(false); assert.equal(f.status().hidden, 0);
    f.toggle(true); assert.equal(f.status().hidden, 1);
  } finally { f.dom.window.close(); }
});
test('handles dynamically inserted cards, recycled rows and removal', async () => {
  const f = await fixture('<main></main>');
  try {
    f.document.querySelector('main').innerHTML = '<li class="nt-card">Try Premium for free</li>';
    await sleep(); assert.equal(f.status().hidden, 1);
    f.document.querySelector('li').textContent = 'A recruiter sent you a message';
    await sleep(); assert.equal(f.status().hidden, 0);
    f.document.querySelector('li').textContent = 'Premium benefit';
    await sleep(); assert.equal(f.status().hidden, 1);
    f.document.querySelector('li').remove(); await sleep(); assert.equal(f.status().hidden, 0);
  } finally { f.dom.window.close(); }
});
test('never hides a group wrapper or unaffected siblings', async () => {
  const f = await fixture('<main><ul><li id="group"><ul><li id="promo">Premium benefit</li><li id="normal">New message</li></ul></li></ul></main>');
  try {
    assert.equal(f.document.querySelector('#group').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('#normal').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.status().hidden, 1);
  } finally { f.dom.window.close(); }
});
test('preserves feed posts and filters promotional toasts after SPA navigation', async () => {
  const f = await fixture('<main><ul><li id="post">Try Premium is an annoying slogan</li></ul></main>', 'feed/');
  try {
    assert.equal(f.status().hidden, 0);
    f.dom.window.history.pushState({}, '', '/notifications/');
    f.document.querySelector('main').innerHTML = '<div role="listitem">Premium benefit</div><div role="listitem">Sarah is a Premium member</div>';
    await sleep(); assert.equal(f.status().hidden, 1);
    f.dom.window.history.pushState({}, '', '/feed/');
    f.document.querySelector('main').innerHTML = '<p>Normal feed</p>';
    f.document.body.insertAdjacentHTML('beforeend', '<div role="alert">Try Premium</div>');
    await sleep(); assert.equal(f.status().hidden, 1);
  } finally { f.dom.window.close(); }
});
test('preserves existing native hidden state when paused', async () => {
  const f = await fixture('<main><li class="nt-card" hidden style="display:none">Premium benefit</li></main>');
  try {
    f.toggle(false);
    const card = f.document.querySelector('li');
    assert.equal(card.hidden, true); assert.equal(card.style.display, 'none');
  } finally { f.dom.window.close(); }
});

test('finds anonymous div notification rows without main, list roles or stable classes', async () => {
  const f = await fixture(`<div id="notifications"><div id="promo"><img alt="Profile photo"><div><p><strong>3 people</strong> viewed your profile. See the full list with <span>Premium</span>.</p><span>Premium benefit</span></div><span>1h</span><button aria-label="More options">…</button></div><div id="normal"><img alt="Alex"><p>Alex sent you a message</p><button aria-label="More options">…</button></div></div>`);
  try {
    assert.equal(f.document.querySelector('#promo').hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.document.querySelector('#normal').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('#notifications').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.status().hidden, 1);
    f.toggle(false); assert.equal(f.status().hidden, 0);
  } finally { f.dom.window.close(); }
});
test('matches promotional text split across adjacent nodes with no whitespace', async () => {
  const f = await fixture('<div id="promo"><img alt=""><p><span>See the full list with</span><strong>Premium</strong></p><button>Options</button></div>');
  try { assert.equal(f.status().hidden, 1); }
  finally { f.dom.window.close(); }
});
test('preserves anonymous row siblings and sidebar promotions', async () => {
  const f = await fixture('<nav><div><img alt=""><p>Try Premium</p><button>Open</button></div></nav><div id="rows"><div id="normal"><img alt=""><p>A recruiter sent you a message</p><button>Options</button></div><div id="promo"><img alt=""><p>Premium benefit</p><button>Options</button></div></div>');
  try {
    assert.equal(f.status().hidden, 1);
    assert.equal(f.document.querySelector('#promo').hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.document.querySelector('#normal').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('#rows').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('nav div').hasAttribute('data-linkedout-hidden'), false);
  } finally { f.dom.window.close(); }
});
test('handles role=main without a semantic main element', async () => {
  const f = await fixture('<div role="main"><div role="listitem">Premium benefit</div><div role="listitem">New message</div></div>');
  try { assert.equal(f.status().hidden, 1); }
  finally { f.dom.window.close(); }
});
test('filters anonymous rows only on Notifications, including dynamically inserted rows', async () => {
  const f = await fixture('<div id="promo"><img alt=""><p>Premium benefit</p><button>Options</button></div>', 'feed/');
  try {
    assert.equal(f.status().hidden, 0);
    f.dom.window.history.pushState({}, '', '/notifications/');
    f.document.querySelector('#promo').insertAdjacentHTML('afterend', '<div id="new"><img alt=""><p>Try Premium</p><button>Options</button></div>');
    await sleep(); assert.equal(f.status().hidden, 2);
    f.document.querySelector('#new p').textContent = 'Alex sent you a message';
    await sleep(); assert.equal(f.status().hidden, 1);
    assert.equal(f.document.querySelector('#new').hasAttribute('data-linkedout-hidden'), false);
  } finally { f.dom.window.close(); }
});

test('does not let an unrelated nested menu suppress a matching notification', async () => {
  const f = await fixture('<main><div class="nt-card" id="promo"><p>Premium benefit</p><ul role="menu"><li>Notification settings</li><li>Delete notification</li></ul></div><div class="nt-card" id="normal">New message</div></main>');
  try {
    assert.equal(f.document.querySelector('#promo').hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.document.querySelector('#normal').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.status().hidden, 1);
  } finally { f.dom.window.close(); }
});
test('does not promote a wrapper discovered through unrelated sibling text', async () => {
  const f = await fixture('<div id="group"><p id="normal">A recruiter sent you a message</p><div id="promo"><img alt=""><p>Premium benefit</p><button>Options</button></div></div>');
  try {
    assert.equal(f.document.querySelector('#group').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('#normal').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('#promo').hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.status().hidden, 1);
  } finally { f.dom.window.close(); }
});

test('hides the complete user-supplied LinkedIn row with an SVG avatar and nested SVG menu', async () => {
  const realRow = readFileSync('tests/fixtures/linkedin-premium-notification.html', 'utf8');
  const f = await fixture(`<div id="notifications">${realRow}<div id="normal"><img alt="Alex"><p>Alex sent you a message</p><div><button aria-label="More options"><svg aria-hidden="true"></svg></button></div></div></div>`);
  try {
    const actualRow = f.document.querySelector('#notifications').firstElementChild;
    assert.equal(actualRow.hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.dom.window.getComputedStyle(actualRow).display, 'none');
    assert.equal(f.document.querySelector('#notifications').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.document.querySelector('#normal').hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.status().hidden, 1);
    f.toggle(false);
    assert.equal(actualRow.hasAttribute('data-linkedout-hidden'), false);
    assert.notEqual(f.dom.window.getComputedStyle(actualRow).display, 'none');
  } finally { f.dom.window.close(); }
});

test('handles the real row after insertion and class changes, then restores a recycled normal row', async () => {
  const realRow = readFileSync('tests/fixtures/linkedin-premium-notification.html', 'utf8')
    .replace(/class="[^"]*"/g, 'class="new-generated-class"');
  const f = await fixture('<div id="notifications"></div>');
  try {
    const list = f.document.querySelector('#notifications');
    list.innerHTML = realRow;
    await sleep();
    const row = list.firstElementChild;
    assert.equal(row.hasAttribute('data-linkedout-hidden'), true);
    assert.equal(f.status().hidden, 1);
    row.innerHTML = row.innerHTML
      .replaceAll('viewed your profile. See the full list with Premium.', 'sent you a message.')
      .replaceAll('Premium benefit', 'Message');
    await sleep();
    assert.equal(row.hasAttribute('data-linkedout-hidden'), false);
    assert.equal(f.status().hidden, 0);
  } finally { f.dom.window.close(); }
});
