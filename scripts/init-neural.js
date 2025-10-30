#!/usr/bin/env node

/**
 * CLI helper that delegates to the neural module initializer used by the main CLI.
 * Keeps the legacy `npm run init:neural` script working after the migration.
 */

import process from 'process';
import { initNeuralModule } from '../src/cli/commands/neural-goal-init.js';

function parseArgs(argv) {
  const result = {
    force: false,
    targetDir: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if ((arg === '--target' || arg === '-t') && i + 1 < argv.length) {
      result.targetDir = argv[i + 1];
      i += 1;
    }
  }

  return result;
}

const options = parseArgs(process.argv.slice(2));

async function main() {
  await initNeuralModule(options);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
