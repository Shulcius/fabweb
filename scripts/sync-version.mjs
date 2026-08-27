#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = readFileSync(join(root, 'VERSION'), 'utf8').trim();

const packagePaths = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/shared/package.json',
  'packages/costing/package.json',
];

for (const rel of packagePaths) {
  const path = join(root, rel);
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${rel} → ${version}`);
}

const versionTs = join(root, 'packages/shared/src/version.ts');
writeFileSync(
  versionTs,
  `/** Синхронизируется скриптом pnpm version:sync из /VERSION */\nexport const APP_VERSION = '${version}';\n`,
);
console.log(`✓ packages/shared/src/version.ts → ${version}`);

console.log(`\nВерсия fabweb: ${version}`);
