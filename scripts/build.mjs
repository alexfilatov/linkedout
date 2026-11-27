import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
await mkdir('extension/icons', { recursive: true });
for (const size of [16, 32, 48, 128, 256, 512]) {
  execFileSync('magick', ['-background', 'none', 'assets/icon.svg', '-resize', `${size}x${size}`, `extension/icons/icon-${size}.png`]);
}
execFileSync(process.env.LINKEDOUT_TAILWIND || 'node_modules/.bin/tailwindcss', ['-i', 'assets/popup.css', '-o', 'extension/popup.css', '--minify'], { stdio: 'inherit' });
for (const browser of ['chrome', 'safari']) {
  const dest = `dist/${browser}`;
  await mkdir(dest, { recursive: true });
  await cp('extension', dest, { recursive: true });
  const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
  if (browser === 'chrome') {
    manifest.minimum_chrome_version = '120';
    manifest.optional_permissions = ['contentSettings'];
  }
  await writeFile(`${dest}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
}
console.log('Built Chrome and Safari extensions in dist/.');
