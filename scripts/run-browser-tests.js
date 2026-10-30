import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--test', 'tests/browser.test.js'], {
  stdio: 'inherit',
  env: { ...process.env, RUN_BROWSER_TESTS: 'true' },
});
process.exit(result.status ?? 1);
