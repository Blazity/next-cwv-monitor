import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import process from 'node:process';

const BUDGET_BYTE_LIMIT = 5120; // 5KB
const FILES_TO_CHECK = ['dist/app-router.js', 'dist/app-router.cjs', 'dist/pages-router.js', 'dist/pages-router.cjs'];

let failed = false;

console.log('📊 Checking SDK Bundle Sizes (gzipped):');
console.log('='.repeat(50));

const formatSize = (bytes) => (bytes / 1024).toFixed(2) + ' KB';

FILES_TO_CHECK.forEach((file) => {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${file}`);
    failed = true;
    return;
  }

  const content = fs.readFileSync(file);
  const gzipped = zlib.gzipSync(content);
  const size = gzipped.length;
  const isOverBudget = size > BUDGET_BYTE_LIMIT;

  const status = isOverBudget ? '❌' : '✅';
  const color = isOverBudget ? '\x1b[31m' : '\x1b[32m';
  const reset = '\x1b[0m';

  console.log(
    `${status} ${file.padEnd(25)}: ${color}${formatSize(size).padStart(8)}${reset} / Budget: ${formatSize(BUDGET_BYTE_LIMIT)}`
  );

  if (size > BUDGET_BYTE_LIMIT) {
    failed = true;
  }
});

console.log('='.repeat(50));
if (failed) {
  console.log('\x1b[31m\nBudget exceeded! Optimize the bundle or update budget if intentional.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m\nAll bundles are within the 5KB limit.\x1b[0m');
  process.exit(0);
}
