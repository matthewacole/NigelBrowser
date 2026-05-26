import { execSync } from 'child_process';

const { green, red, yellow, reset } = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', reset: '\x1b[0m' };

function run(cmd, label) {
  console.log(`\n${yellow}=== ${label} ===${reset}\n`);
  try {
    execSync(cmd, { cwd: process.cwd(), stdio: 'inherit', shell: true });
    console.log(`\n${green}✓ ${label} passed${reset}`);
    return true;
  } catch {
    console.log(`\n${red}✗ ${label} failed${reset}`);
    return false;
  }
}

const unitPass = run('npx vitest run', 'Unit Tests');
const e2ePass = run('node tests/run-games.mjs 5', 'E2E Tests (5 games)');

console.log(`\n${unitPass && e2ePass ? green : red}=== OVERALL: ${unitPass && e2ePass ? 'ALL PASSED' : 'SOME FAILED'} ===${reset}`);
process.exit(unitPass && e2ePass ? 0 : 1);
