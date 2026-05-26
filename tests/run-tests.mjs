import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createServer } from 'vite';

const TEST_RUNS = 5;
const SERVER_PORT = 5199;
const BASE_URL = `http://localhost:${SERVER_PORT}/NigelBrowser/`;

let server;
let browser;
let serverProcess;

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const vite = spawn('npx', ['vite', '--port', String(SERVER_PORT)], {
      cwd: new URL('..', import.meta.url).pathname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    vite.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes('Local:')) {
        serverProcess = vite;
        resolve(vite);
      }
    });
    vite.stderr.on('data', (data) => process.stderr.write(data.toString()));
    setTimeout(() => reject(new Error('Server start timeout')), 15000);
  });
}

async function waitForApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  // Wait for the word validator to finish loading
  await page.waitForSelector('.main-menu', { timeout: 10000 }).catch(() => {});
  await page.waitForSelector('.game-board', { timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
}

async function runTestGame(runNumber) {
  log(`=== Test run ${runNumber}/${TEST_RUNS} ===`);
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push({ type: 'pageerror', message: err.message }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push({ type: 'console', message: msg.text() });
  });

  try {
    await waitForApp(page);

    // Check page loaded
    const hasGameBoard = await page.$('.game-board');
    const hasMainMenu = await page.$('.main-menu');
    log(`Page loaded: ${hasGameBoard ? 'GameBoard' : hasMainMenu ? 'MainMenu' : 'unknown'}`);

    if (hasMainMenu) {
      // Click "New Game" button (the second .menu-card or the one with "+")
      const newGameBtn = await page.$('.menu-card:nth-child(1)');
      if (!newGameBtn) {
        // Look for Resume Game or New Game buttons
        const cards = await page.$$('.menu-card');
        for (const card of cards) {
          const text = await card.textContent();
          if (text.includes('New Game')) {
            await card.click();
            break;
          }
        }
      } else {
        await newGameBtn.click();
      }
      await new Promise(r => setTimeout(r, 500));

      // Click "Start Game" in setup modal (default is 2 players, human vs expert AI)
      const startBtn = await page.$('.btn-primary');
      if (startBtn) {
        const text = await startBtn.textContent();
        if (text.includes('Start Game')) {
          await startBtn.click();
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Wait for game board to appear
    await page.waitForSelector('.game-board', { timeout: 10000 });
    log('Game board loaded');

    // Wait for first AI move to complete
    await new Promise(r => setTimeout(r, 10000));

    // Check for game over or errors after some turns
    let turns = 0;
    const maxTurns = 30;
    while (turns < maxTurns) {
      const gameOver = await page.$('.game-over');
      if (gameOver) {
        log(`Game over detected at turn ${turns + 1}`);
        break;
      }

      // Wait for AI turn + some buffer
      await new Promise(r => setTimeout(r, 8000));
      turns++;

      // Check for score updates (game is progressing)
      const scoreEl = await page.$('.player-score-value');
      if (scoreEl) {
        const scoreText = await scoreEl.textContent();
        log(`Turn ${turns}: Score visible - ${scoreText}`);
      }
    }

    const hasErrors = errors.length > 0;
    if (hasErrors) {
      log(`ERRORS found (${errors.length}):`);
      errors.slice(0, 5).forEach(e => log(`  ${e.type}: ${e.message}`));
    }

    return { run: runNumber, passed: !hasErrors, errors, turns };
  } catch (err) {
    log(`CRASH: ${err.message}`);
    return { run: runNumber, passed: false, errors: [{ type: 'crash', message: err.message }], turns: 0 };
  } finally {
    await context.close();
  }
}

async function main() {
  log('Starting Vite dev server...');
  try {
    await startServer();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }

  log('Launching browser...');
  browser = await chromium.launch({ headless: true });

  const results = [];
  for (let i = 1; i <= TEST_RUNS; i++) {
    const result = await runTestGame(i);
    results.push(result);
    log(`Run ${i}: ${result.passed ? 'PASSED' : 'FAILED'} (${result.turns} turns)`);
    // Brief pause between runs
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();
  if (serverProcess) serverProcess.kill();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  log('');
  log('='.repeat(50));
  log(`RESULTS: ${passed}/${TEST_RUNS} passed, ${failed} failed`);
  results.forEach(r => log(`  Run ${r.run}: ${r.passed ? 'PASS' : 'FAIL'} (${r.turns} turns, ${r.errors.length} errors)`));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
