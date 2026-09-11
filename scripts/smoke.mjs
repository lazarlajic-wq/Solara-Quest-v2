/**
 * Headless smoke test: boots the built game in Chromium, starts a new game,
 * drives movement/dash/attack input, and asserts there are no console errors
 * and that the Phaser canvas rendered. Captures a screenshot to artifacts/.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const artifacts = resolve(__dirname, '..', 'artifacts');
mkdirSync(artifacts, { recursive: true });

const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const exe = process.env.PW_EXE || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const errors = [];
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Neues Spiel').click();

// wait for canvas + preload -> world
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(2500); // preload generates assets then starts World

// drive input: move around, dash, attack
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
await hold('d', 500);
await page.keyboard.press('Shift');
await page.waitForTimeout(200);
await hold('s', 400);
// attack with mouse
await page.mouse.click(760, 420);
await page.waitForTimeout(150);
await page.mouse.click(760, 420);
await page.waitForTimeout(150);
await page.keyboard.press('q');
await hold('w', 400);
await page.keyboard.press('Space');
await page.waitForTimeout(400);

// Is the HUD present?
const hasHud = await page.locator('.sq-hud').count();

await page.screenshot({ path: resolve(artifacts, 'smoke.png') });
await browser.close();

const filtered = errors.filter((e) => !/favicon|Download the React DevTools|WebGL warning|GroupMarker/i.test(e));
console.log('HUD present:', hasHud > 0);
console.log('Console errors:', filtered.length);
if (filtered.length) { filtered.forEach((e) => console.log('  -', e)); }

if (filtered.length > 0 || hasHud === 0) {
  console.error('SMOKE FAILED');
  process.exit(1);
}
console.log('SMOKE OK');
