#!/usr/bin/env node
/**
 * render.js — thin CLI wrapper around beautiful-mermaid
 *
 * Usage:
 *   node render.js <input.mmd> --output <output.svg> [--theme <name>] [--custom-theme '{"bg":"#...","fg":"#..."}']
 *
 * On success stdout:  {"status":"ok","output":"<path>"}
 * On error  stderr:   {"status":"error","message":"<msg>"}  then exit 1
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid';

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node render.js <input.mmd> --output <output.svg> [--theme <name>]');
  process.exit(1);
}

const inputPath = args[0];

const outputFlagIndex = args.indexOf('--output');
if (outputFlagIndex === -1 || !args[outputFlagIndex + 1]) {
  console.error('Usage: node render.js <input.mmd> --output <output.svg> [--theme <name>]');
  process.exit(1);
}
const outputPath = resolve(args[outputFlagIndex + 1]);

const themeFlagIndex = args.indexOf('--theme');
const theme = (themeFlagIndex !== -1 && args[themeFlagIndex + 1]) ? args[themeFlagIndex + 1] : 'zinc-light';

const customThemeFlagIndex = args.indexOf('--custom-theme');
const customThemeRaw = (customThemeFlagIndex !== -1 && args[customThemeFlagIndex + 1]) ? args[customThemeFlagIndex + 1] : null;

function resolveTheme(name, customJson) {
  // Custom theme JSON takes priority
  if (customJson) {
    try {
      return JSON.parse(customJson);
    } catch {
      console.error(JSON.stringify({ status: 'error', message: `Invalid --custom-theme JSON: ${customJson}` }));
      process.exit(1);
    }
  }
  // Exact match in beautiful-mermaid THEMES
  if (THEMES[name] !== undefined) return THEMES[name];
  // Fallback to zinc-light
  return THEMES['zinc-light'] ?? THEMES[Object.keys(THEMES)[0]];
}

try {
  const diagram = readFileSync(resolve(inputPath), 'utf8');
  const themeOptions = resolveTheme(theme, customThemeRaw);
  const svg = renderMermaidSVG(diagram, themeOptions);
  writeFileSync(outputPath, svg, 'utf8');
  console.log(JSON.stringify({ status: 'ok', output: outputPath }));
} catch (err) {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
}
