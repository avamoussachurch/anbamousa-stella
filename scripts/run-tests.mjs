import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'tests'].map(resolve);
const testPattern = /\.(?:test|spec)\.(?:mjs|cjs|js|ts|tsx)$/;
const testFiles = [];

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) collect(absolutePath);
    else if (entry.isFile() && testPattern.test(entry.name)) {
      testFiles.push(relative(process.cwd(), absolutePath));
    }
  }
}

for (const root of roots) collect(root);
testFiles.sort();

if (testFiles.length === 0) {
  throw new Error('No test files were found under src/ or tests/.');
}

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...testFiles],
  { stdio: 'inherit' }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
