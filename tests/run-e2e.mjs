import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:5173/NigelBrowser/';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) { proc.kill(); reject(new Error('Dev server did not start in 30s')); }
    }, 30000);
    const check = (text) => {
      if (text.includes('Local:') && !started) {
        started = true;
        clearTimeout(timeout);
        sleep(2000).then(() => resolve(proc));
      }
    };
    proc.stdout.on('data', d => check(d.toString()));
    proc.stderr.on('data', d => check(d.toString()));
    proc.on('error', e => { clearTimeout(timeout); reject(e); });
    proc.on('exit', c => { if (!started) { clearTimeout(timeout); reject(new Error(`exit ${c}`)); } });
  });
}

async function waitForApp(page) {
  for (let i = 0; i < 60; i++) {
    try {
      const ready = await page.evaluate(() => {
        return document.querySelector('.app') !== null &&
               document.querySelector('.main-menu') !== null;
      });
      if (ready) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
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
  const ready = await waitForApp(page);
  if (!ready) {
    await context.close();
    return { success: false, error: 'App did not load', time: 0 };
  }

  await sleep(2000);

  // Click "New Game" to open setup modal
  let modalOpen = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      // Check if modal already open
      const hasModal = await page.evaluate(() => !!document.querySelector('.game-setup'));
      if (hasModal) { modalOpen = true; break; }

      const btn = await page.$('button:has-text("New Game")');
      if (btn) { await btn.click(); await sleep(1000); }
    } catch {}
    await sleep(1000);
  }

  if (!modalOpen) {
    await context.close();
    return { success: false, error: 'Could not open setup', time: 0 };
  }

  await sleep(1000);

  // Set all players to AI using Playwright's selectOption
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const configs = await page.$$('.player-config');
      if (configs.length >= 2) {
        for (const config of configs) {
          const selects = await config.$$('select');
          if (selects.length >= 1) {
            try {
              await selects[0].selectOption('computer');
            } catch {}
          }
        }
        break;
      }
    } catch {}
    await sleep(500);
  }

  await sleep(1000);

  // Click "Start Game"
  let started = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const startBtn = await page.$('button:has-text("Start Game")');
      if (startBtn) { await startBtn.click(); started = true; break; }
    } catch {}
    await sleep(1000);
  }

  if (!started) {
    await context.close();
    return { success: false, error: 'Could not start game', time: 0 };
  }

  await sleep(3000);

  // Check if game actually started
  const gameActive = await page.evaluate(() => {
    return document.querySelector('.board') !== null ||
           document.querySelector('.game-interface') !== null;
  });
  if (!gameActive) {
    await context.close();
    return { success: false, error: 'Game did not activate', time: 0 };
  }

  // Speed up AI delay (override setTimeout for future timers)
  await page.evaluate(() => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, delay, ...args) => {
      if (delay > 500) return orig(fn, 100, ...args);
      return orig(fn, delay, ...args);
    };
  });

  // Wait for game to complete (max 10 min)
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000;
  let gameOver = false;

  while (Date.now() - startTime < maxWait) {
    await sleep(3000);

    try {
      gameOver = await page.evaluate(() => {
        const el = document.querySelector('.game-over-overlay');
        if (el) return true;
        // Check for common game-over texts
        const text = document.body.innerText || '';
        return text.includes('Game Over') || 
               text.includes('Final Scores') ||
               text.includes('wins!');
      });
    } catch {}
    if (gameOver) break;
  }

  const elapsed = Date.now() - startTime;

  // Collect scores
  const scores = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const matches = text.match(/(\d+)\s*points?/gi) || [];
    return matches.map(m => parseInt(m.match(/\d+/)[0]));
  }).catch(() => []);

  await context.close();

  if (!gameOver) {
    return { success: false, error: 'Game did not complete', time: elapsed, scores };
  }

  // Check for fatal JS errors
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

async function runAllGames(totalGames) {
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
  return results;
}

async function main() {
  console.log('=== Nigel E2E Test Suite ===');
  console.log(`Starting at ${new Date().toISOString()}\n`);

  const totalGames = parseInt(process.argv[2] || '5', 10);
  console.log(`Will play ${totalGames} games\n`);

  console.log('Starting dev server...');
  let devServer;
  try {
    devServer = await startDevServer();
    console.log('Dev server started\n');
  } catch (e) {
    console.error(`Failed to start dev server: ${e.message}`);
    process.exit(1);
  }

  let exitCode = 0;
  try {
    const results = await runAllGames(totalGames);
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

    if (failed > 0) exitCode = 1;
  } catch (e) {
    console.error(`Suite crashed: ${e.message}`);
    exitCode = 1;
  } finally {
    devServer.kill();
    process.exit(exitCode);
  }
}

main();
