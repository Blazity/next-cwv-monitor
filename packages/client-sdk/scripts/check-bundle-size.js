import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import process from 'node:process';

const BUDGET_BYTE_LIMIT = 5120; // 5KB
const FILES_TO_CHECK = ['dist/app-router.js', 'dist/app-router.cjs', 'dist/pages-router.js', 'dist/pages-router.cjs'];

const REPO_ROOT_PATH = 'packages/client-sdk';

let failed = false;
const results = [];

const formatSize = (bytes) => (bytes / 1024).toFixed(2) + ' KB';

console.log('\n📊 Checking SDK Bundle Sizes (gzipped):');
console.log('='.repeat(60));

FILES_TO_CHECK.forEach((file) => {
  const filePath = path.resolve(process.cwd(), file);
  const relativePathForGh = path.join(REPO_ROOT_PATH, file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    console.log(`::error file=${relativePathForGh},title=Missing Artifact::Bundle artifact was not found after build.`);
    failed = true;
    return;
  }

  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  const size = gzipped.length;
  const isOverBudget = size > BUDGET_BYTE_LIMIT;

  const statusIcon = isOverBudget ? '❌' : '✅';
  const color = isOverBudget ? '\x1b[31m' : '\x1b[32m';
  const reset = '\x1b[0m';

  console.log(
    `${statusIcon} ${file.padEnd(25)}: ${color}${formatSize(size).padStart(8)}${reset} / Budget: ${formatSize(BUDGET_BYTE_LIMIT)}`
  );

  if (isOverBudget) {
    failed = true;
    console.log(
      `::error file=${relativePathForGh},title=Budget Exceeded::Size ${formatSize(size)} exceeds the ${formatSize(BUDGET_BYTE_LIMIT)} limit.`
    );
  }

  results.push({ file, size, isOverBudget });
});

console.log('='.repeat(60));

if (process.env.GITHUB_STEP_SUMMARY) {
  const tableRows = results
    .map(
      (r) =>
        `| ${r.isOverBudget ? '❌' : '✅'} | \`${r.file}\` | **${formatSize(r.size)}** | ${formatSize(BUDGET_BYTE_LIMIT)} |`
    )
    .join('\n');

  const summary = `
### 📦 SDK Bundle Size Report
Build artifacts for \`cwv-monitor-sdk\` were analyzed.

| Status | Artifact | Gzipped Size | Budget |
| :--- | :--- | :--- | :--- |
${tableRows}

${failed ? '> [!CAUTION]\n> One or more bundles exceed the size budget. Please optimize or update the budget in `scripts/check-bundle-size.js`.' : '> [!TIP]\n> All bundles are within limits.'}
`;
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (failed) {
  process.exit(1);
} else {
  console.log('\x1b[32m\nPass: All bundles are within budget.\x1b[0m\n');
  process.exit(0);
}
