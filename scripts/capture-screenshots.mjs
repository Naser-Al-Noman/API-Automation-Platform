/**
 * Capture README screenshots from a running app (local or deployed).
 * Usage:
 *   node capture-screenshots.mjs
 *   APP_URL=https://... DEMO_EMAIL=... DEMO_PASSWORD=... node capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE = process.env.APP_URL || 'http://localhost:5173';
const EMAIL = process.env.DEMO_EMAIL || 'demo@example.com';
const PASSWORD = process.env.DEMO_PASSWORD || 'demopass123';

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', path.relative(path.join(__dirname, '..'), file));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  page.setDefaultTimeout(90000);

  console.log('Opening', BASE);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

  const email = page.locator('input[type="email"]');
  await email.waitFor({ state: 'visible' });
  await email.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 90000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('heading', { name: /dashboard/i }).waitFor({ timeout: 60000 });
  // Wait until summary cards render (not the loading spinner)
  await page
    .getByText(/loading summary/i)
    .waitFor({ state: 'hidden', timeout: 90000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'dashboard');

  await page.goto(`${BASE}/collections`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /collections/i }).waitFor({ timeout: 60000 });
  await shot(page, 'collections');

  await page.goto(`${BASE}/executions`, { waitUntil: 'networkidle' });
  const viewLink = page.getByRole('link', { name: /^view$/i }).first();
  if ((await viewLink.count()) > 0) {
    await viewLink.click();
    await page.waitForURL(/\/executions\/\d+/, { timeout: 60000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, 'execution-detail');
  } else {
    console.warn('No executions found — skipping execution-detail');
  }

  await page.goto(`${BASE}/analytics`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /analytics/i }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(2000);
  await shot(page, 'analytics');

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
