#!/usr/bin/env node

/**
 * Updates the VERSION in the primary CLI shim to match package.json.
 * Falls back gracefully if the target file does not include a VERSION marker.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

const candidateFiles = [
  path.join(__dirname, '..', 'bin', 'bot-flow'),
  path.join(__dirname, '..', 'bin', 'bot-flow.js'),
  path.join(__dirname, '..', 'bin', 'agent-flow'),
  path.join(__dirname, '..', 'bin', 'agent-flow.js'),
  path.join(__dirname, '..', 'bin', 'claude-flow'),
  path.join(__dirname, '..', 'bin', 'claude-flow.js'),
];

const binPath = candidateFiles.find((file) => fs.existsSync(file));

if (!binPath) {
  console.warn('⚠️  No bot-flow/claude-flow shim found to update VERSION.');
  process.exit(0);
}

let binContent = fs.readFileSync(binPath, 'utf8');

if (!/^VERSION=".*"$/m.test(binContent)) {
  console.warn(`ℹ️  ${path.basename(binPath)} has no VERSION marker; skipping update.`);
  process.exit(0);
}

binContent = binContent.replace(/^VERSION=".*"$/m, `VERSION="${version}"`);
fs.writeFileSync(binPath, binContent);

console.log(`✅ Updated ${path.basename(binPath)} VERSION to ${version}`);
