const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
for (const browser of ['chrome', 'safari']) test(`${browser} package references existing local assets with restricted hosts`, () => {
  const base = `dist/${browser}/`;
  const manifest = JSON.parse(readFileSync(`${base}manifest.json`, 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://www.linkedin.com/*']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://www.linkedin.com/*']);
  for (const path of [...manifest.content_scripts[0].js, ...manifest.content_scripts[0].css, manifest.action.default_popup, ...Object.values(manifest.icons)]) {
    assert.equal(existsSync(base + path), true, path);
  }
  assert.equal(manifest.optional_permissions?.includes('contentSettings') ?? false, browser === 'chrome');
  const css = readFileSync(base + 'popup.css', 'utf8');
  assert.ok(css.length > 1000);
  assert.equal(/https?:\/\//.test(css.replace(/\/\*[^]*?\*\//g, '')), false);
});
