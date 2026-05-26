import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:5173/NigelBrowser/';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSingleGame(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    await context.close();
    return { success: false, error: `Navigation: ${e.message}`, time: 0 };
  }

  // Wait for app to load
  for (let i = 0; i < 60; i++) {
    try {
      const ready = await page.evaluate(() => {
        return document.querySelector('.main-menu') !== null;
      });
      if (ready) break;
    } catch {}
    await sleep(1000);
    if (i === 59) {
      await context.close();
      return { success: false, error: 'App did not load', time: 0 };
    }
  }

  await sleep(2000);

  // Click "New Game" to open setup modal
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const hasModal = await page.evaluate(() => !!document.querySelector('.game-setup'));
      if (hasModal) break;
      const btn = await page.$('button:has-text("New Game")');
      if (btn) { await btn.click(); }
    } catch {}
    await sleep(1000);
  }

  await sleep(1000);

  // Set all players to AI
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const configs = await page.$$('.player-config');
      if (configs.length >= 2) {
        for (const config of configs) {
          const selects = await config.$$('select');
          if (selects.length >= 1) {
            try { await selects[0].selectOption('computer'); } catch {}
          }
        }
        break;
      }
    } catch {}
    await sleep(500);
  }

  await sleep(1000);

  // Click "Start Game"
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const btn = await page.$('button:has-text("Start Game")');
      if (btn) { await btn.click(); break; }
    } catch {}
    await sleep(1000);
  }

  await sleep(3000);

  // Verify game is active
  const gameActive = await page.evaluate(() => {
    return document.querySelector('.game-board') !== null ||
           document.querySelector('.board-grid') !== null;
  });
  if (!gameActive) {
    await context.close();
    return { success: false, error: 'Game did not activate', time: 0 };
  }

  // Speed up AI delay
  await page.evaluate(() => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, delay, ...args) => {
      if (delay > 500) return orig(fn, 100, ...args);
      return orig(fn, delay, ...args);
    };
  });

  // Wait for game to complete
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000;
  let gameOver = false;

  while (Date.now() - startTime < maxWait) {
    await sleep(3000);
    try {
      gameOver = await page.evaluate(() => {
        // Game over screen renders a modal with class "game-over"
        if (document.querySelector('.game-over')) return true;
        // Main menu is back (game was reset)
        if (document.querySelector('.main-menu')) return true;
        // Text check
        const text = document.body.innerText || '';
        return text.includes('Game Over') || text.includes('Final Scores');
      });
    } catch {}
    if (gameOver) break;
  }

  const elapsed = Date.now() - startTime;
  const scores = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const matches = text.match(/(\d+)\s*points?/gi) || [];
    return matches.map(m => parseInt(m.match(/\d+/)[0]));
  }).catch(() => []);

  await context.close();

  if (!gameOver) {
    return { success: false, error: 'Game did not complete', time: elapsed, scores };
  }

  const fatalErrors = errors.filter(e =>
    e.includes('TypeError') || e.includes('Error') ||
    e.includes('bag.draw') || e.includes('is not a function') ||
    e.includes('Cannot read properties')
  );
  if (fatalErrors.length > 0) {
    return { success: false, error: `JS errors: ${fatalErrors.slice(0, 3).join('; ')}`, time: elapsed, scores };
  }

  return { success: true, error: null, time: elapsed, scores, consoleErrors: errors.length };
}

async function main() {
  console.log('=== Nigel Game Test Suite ===');
  console.log(`Starting at ${new Date().toISOString()}\n`);

  const totalGames = parseInt(process.argv[2] || '5', 10);
  console.log(`Will play ${totalGames} games\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const results = [];
  for (let i = 0; i < totalGames; i++) {
    const result = await runSingleGame(browser);
    results.push(result);

    const status = result.success ? 'PASS' : 'FAIL';
    const time = (result.time / 1000).toFixed(1);
    let msg = `[${i + 1}/${totalGames}] ${status} (${time}s)`;
    if (result.scores && result.scores.length > 0) msg += ` scores: [${result.scores.join(', ')}]`;
    if (result.consoleErrors > 0) msg += ` ${result.consoleErrors} console errors`;
    if (!result.success) msg += ` ERROR: ${result.error}`;
    console.log(msg);
  }

  await browser.close();

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const errors = results.filter(r => !r.success).map(r => r.error);
  const avgTime = results.reduce((s, r) => s + r.time, 0) / results.length / 1000;
  const totalErrors = results.reduce((s, r) => s + (r.consoleErrors || 0), 0);

  console.log('\n=== Results ===');
  console.log(`Games: ${totalGames}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Rate: ${(passed / totalGames * 100).toFixed(1)}%`);
  console.log(`Avg time: ${avgTime.toFixed(1)}s`);
  console.log(`Total console errors: ${totalErrors}`);

  if (errors.length > 0) {
    console.log('\nFailures:');
    for (const e of errors.slice(0, 15)) console.log(`  - ${e}`);
    if (errors.length > 15) console.log(`  ... and ${errors.length - 15} more`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
