#!/usr/bin/env node
/**
 * extract_mermaid.js — port of extract_mermaid.py
 *
 * Extracts ```mermaid blocks from .md files.
 * With --validate, attempts to render each block via beautiful-mermaid
 * and reports pass/fail.
 *
 * Usage:
 *   node extract_mermaid.js <file.md>
 *   node extract_mermaid.js <file.md> --validate
 *
 * Without --validate:
 *   stdout: {"found":N,"diagrams":["...", "..."]}
 *
 * With --validate:
 *   stdout: {"found":N,"results":[{"index":1,"status":"ok"}, ...]}
 *   exit 1 if any block failed, exit 0 if all passed
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid';

// --- CLI argument parsing ---

const args = process.argv.slice(2);

if (args.length === 0 || args[0].startsWith('--')) {
  console.error('Usage: node extract_mermaid.js <file.md> [--validate]');
  process.exit(1);
}

const filePath = resolve(args[0]);
const validate = args.includes('--validate');

// --- Read file ---

let content;
try {
  content = readFileSync(filePath, 'utf8');
} catch (err) {
  console.error(`Error: Cannot read file: ${filePath}`);
  console.error(err.message);
  process.exit(1);
}

// --- Extract mermaid blocks ---

// Matches ```mermaid (with optional trailing text on the fence line) ... ```
const MERMAID_RE = /^```mermaid[^\n]*\n([\s\S]*?)^```/gm;

const diagrams = [];
let match;
while ((match = MERMAID_RE.exec(content)) !== null) {
  diagrams.push(match[1].trim());
}

if (diagrams.length === 0) {
  console.log(JSON.stringify({ found: 0, diagrams: [] }));
  process.exit(0);
}

// --- Without --validate: just return the extracted blocks ---

if (!validate) {
  console.log(JSON.stringify({ found: diagrams.length, diagrams }));
  process.exit(0);
}

// --- With --validate: render each block and report pass/fail ---

const themeOptions = THEMES['zinc-light'];
const results = [];
let anyFailed = false;

for (let i = 0; i < diagrams.length; i++) {
  const index = i + 1;
  try {
    renderMermaidSVG(diagrams[i], themeOptions);
    results.push({ index, status: 'ok' });
  } catch (err) {
    results.push({ index, status: 'error', message: err.message });
    anyFailed = true;
  }
}

console.log(JSON.stringify({ found: diagrams.length, results }));
process.exit(anyFailed ? 1 : 0);
