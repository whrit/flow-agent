#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const DEFAULT_TARGETS = ['README.md', 'docs'];
const DEFAULT_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.js',
  '.ts',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
]);
const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-cjs',
  'bin',
  '.hive-mind',
]);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    paths: [],
    from: 'claude-flow',
    to: 'flow-agent',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--from':
        options.from = args[i + 1] || options.from;
        i++;
        break;
      case '--to':
        options.to = args[i + 1] || options.to;
        i++;
        break;
      case '--dry-run':
      case '--dryrun':
        options.dryRun = true;
        break;
      default:
        options.paths.push(arg);
    }
  }

  if (options.paths.length === 0) {
    options.paths = DEFAULT_TARGETS;
  }

  return options;
}

function shouldIgnore(filePath) {
  return filePath
    .split(path.sep)
    .some((segment) => DEFAULT_IGNORE_DIRS.has(segment));
}

function shouldProcessFile(filePath) {
  return DEFAULT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function processFile(filePath, pattern, replacement, dryRun) {
  if (!shouldProcessFile(filePath)) {
    return { replaced: 0 };
  }

  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.warn(`⚠️  Skipping ${filePath}: ${error.message}`);
    return { replaced: 0 };
  }

  const regex = new RegExp(pattern, 'g');
  if (!regex.test(content)) {
    return { replaced: 0 };
  }

  regex.lastIndex = 0;
  const updated = content.replace(regex, replacement);
  const countRegex = new RegExp(pattern, 'g');
  const replacementCount = (content.match(countRegex) || []).length;

  if (replacementCount === 0) {
    return { replaced: 0 };
  }

  if (!dryRun) {
    await fs.writeFile(filePath, updated, 'utf8');
  }

  const relativePath = path.relative(process.cwd(), filePath);
  const prefix = dryRun ? '[dry-run]' : '[updated]';
  console.log(`${prefix} ${relativePath} (${replacementCount} replacements)`);

  return { replaced: replacementCount };
}

async function walk(targetPath, pattern, replacement, dryRun) {
  const stats = await fs.stat(targetPath);

  if (stats.isDirectory()) {
    if (shouldIgnore(targetPath)) {
      return 0;
    }

    const entries = await fs.readdir(targetPath);
    let total = 0;
    for (const entry of entries) {
      const nextPath = path.join(targetPath, entry);
      total += await walk(nextPath, pattern, replacement, dryRun);
    }
    return total;
  }

  const result = await processFile(targetPath, pattern, replacement, dryRun);
  return result.replaced;
}

async function main() {
  const options = parseArgs();
  const pattern = `(?<![._])\\b${escapeRegex(options.from)}\\b(?!__)`;

  let total = 0;
  for (const target of options.paths) {
    const resolved = path.resolve(process.cwd(), target);
    try {
      total += await walk(resolved, pattern, options.to, options.dryRun);
    } catch (error) {
      console.warn(`⚠️  Could not process ${target}: ${error.message}`);
    }
  }

  const summaryLabel = options.dryRun ? 'Would update' : 'Updated';
  console.log(`\n${summaryLabel} ${total} occurrence${total === 1 ? '' : 's'} of "${options.from}".`);
}

main().catch((error) => {
  console.error('Rename script failed:', error);
  process.exit(1);
});
