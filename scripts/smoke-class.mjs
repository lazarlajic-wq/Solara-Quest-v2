/**
 * End-to-end check of the level-5 class-selection flow: seed a level-5 Novice
 * standing in the training camp next to the class masters, interact (Space),
 * confirm the staged class-select screen opens, choose the Swordsman, and
 * assert the HUD now shows that class (equipment/skills granted on selection).
 */
import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const exe = process.env.PW_EXE || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// mage master is at the row center in the reserved training pad
const cx = Math.round(192 * 0.55); // training-camp width = 192 tiles
const cy = Math.round(160 * 0.5); // height = 160
const seed = {
  version: 1, name: 'Solaris', classId: 'novice', level: 5, xp: 0, hp: 90, gold: 0,
  currentMapId: 'r1_training', x: cx * 32 + 16, y: cy * 32 + 16,
  equipment: { weapon: null, armor: null, helm: null, shield: null, boots: null, gloves: null, cloak: null, accessory: null },
  inventory: ['starter_sword'], pets: [], activePet: null, clearedRaids: [], completedQuests: [],
  keybinds: {},
};

const errors = [];
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

// Seed the save before the app boots.
await page.addInitScript((s) => {
  try { localStorage.setItem('solara-quest:save', JSON.stringify(s)); } catch {}
}, seed);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Fortsetzen').click();
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(2600); // preload -> world

// Interact with a nearby master. Nudge slightly in case spawn is a touch off.
let opened = false;
for (let i = 0; i < 12 && !opened; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  opened = (await page.locator('.sq-modal').count()) > 0;
  if (!opened) { await page.keyboard.down('d'); await page.waitForTimeout(90); await page.keyboard.up('d'); }
}

const classSelectOpen = await page.locator('.sq-classgrid').count();
if (classSelectOpen === 0) {
  await page.screenshot({ path: 'artifacts/class-fail.png' });
  console.error('Class select did not open'); await browser.close(); process.exit(1);
}

// choose Swordsman
await page.locator('.sq-class', { hasText: 'Schwertkämpfer' }).click();
await page.getByText('Klasse bestätigen').click();
await page.waitForTimeout(600);

const hudText = await page.locator('.sq-hud').innerText();
await page.screenshot({ path: 'artifacts/class-select.png' });
await browser.close();

const filtered = errors.filter((e) => !/favicon|DevTools|WebGL warning/i.test(e));
console.log('HUD:', hudText.replace(/\n/g, ' | '));
console.log('Console errors:', filtered.length);
const ok = /Schwertkämpfer/.test(hudText) && filtered.length === 0;
console.log(ok ? 'CLASS SMOKE OK' : 'CLASS SMOKE FAILED');
process.exit(ok ? 0 : 1);
