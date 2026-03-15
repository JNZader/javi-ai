#!/usr/bin/env node
/**
 * resilient_diagram.js — orchestrator that renders a .mmd file to SVG,
 * and on error searches troubleshooting.md for a matching suggestion.
 *
 * Usage:
 *   node resilient_diagram.js <input.mmd> --output-dir <dir> [--theme <name>] [--custom-theme '{"bg":"#...","fg":"#..."}']
 *
 * On success stdout:  {"status":"ok","output":"<path>"}
 * On error  stderr:   {"status":"error","message":"<msg>","suggestion":"<hint>"}  then exit 1
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Derive __dir (equivalent of __dirname) from import.meta.url
const __dir = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------------------
// beautiful-mermaid availability guard
// ---------------------------------------------------------------------------
let renderMermaidSVG;
let THEMES;

try {
  const bm = await import('beautiful-mermaid');
  renderMermaidSVG = bm.renderMermaidSVG;
  THEMES = bm.THEMES;
} catch {
  process.stderr.write(
    JSON.stringify({
      status: 'error',
      message:
        'beautiful-mermaid not installed. Run /mermaid-config → option 7 (health check) to install.',
    }) + '\n'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Theme resolution (same logic as render.js)
// ---------------------------------------------------------------------------
function resolveTheme(name, customJson) {
  if (customJson) {
    try {
      return JSON.parse(customJson);
    } catch {
      process.stderr.write(
        JSON.stringify({ status: 'error', message: `Invalid --custom-theme JSON: ${customJson}` }) + '\n'
      );
      process.exit(1);
    }
  }
  if (THEMES[name] !== undefined) return THEMES[name];
  return THEMES['zinc-light'] ?? THEMES[Object.keys(THEMES)[0]];
}

// ---------------------------------------------------------------------------
// Troubleshooting suggestion lookup
// ---------------------------------------------------------------------------
function findSuggestion(errorMessage) {
  const troubleshootingPath = join(
    __dir,
    '..',
    'references',
    'guides',
    'troubleshooting.md'
  );
  if (!existsSync(troubleshootingPath))
    return 'Check references/guides/troubleshooting.md for syntax help';

  const content = readFileSync(troubleshootingPath, 'utf8');
  const sections = content.split(/^## /m).slice(1);
  const errLower = errorMessage.toLowerCase();
  const keywords = errLower.split(/\W+/).filter((w) => w.length > 3);

  let best = null;
  let bestScore = 0;
  for (const section of sections) {
    const lines = section.split('\n');
    const score = keywords.reduce(
      (n, kw) => n + (section.toLowerCase().includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = `See troubleshooting: "${lines[0].trim()}"`;
    }
  }
  return bestScore > 0
    ? best
    : 'Check references/guides/troubleshooting.md for syntax help';
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.length === 0 || args[0].startsWith('--')) {
  process.stderr.write(
    'Usage: node resilient_diagram.js <input.mmd> --output-dir <dir> [--theme <name>]\n'
  );
  process.exit(1);
}

const inputArg = args[0];
const inputPath = resolve(inputArg);

if (!existsSync(inputPath)) {
  process.stderr.write(
    JSON.stringify({ status: 'error', message: `Input file not found: ${inputPath}` }) + '\n'
  );
  process.exit(1);
}

// --output-dir (default: ./diagrams)
const outputDirFlagIndex = args.indexOf('--output-dir');
const outputDir =
  outputDirFlagIndex !== -1 && args[outputDirFlagIndex + 1]
    ? resolve(args[outputDirFlagIndex + 1])
    : resolve('./diagrams');

// --theme (default: 'zinc-light')
const themeFlagIndex = args.indexOf('--theme');
const themeName =
  themeFlagIndex !== -1 && args[themeFlagIndex + 1]
    ? args[themeFlagIndex + 1]
    : 'zinc-light';

// --custom-theme (JSON string: '{"bg":"#...","fg":"#..."}')
const customThemeFlagIndex = args.indexOf('--custom-theme');
const customThemeRaw =
  customThemeFlagIndex !== -1 && args[customThemeFlagIndex + 1]
    ? args[customThemeFlagIndex + 1]
    : null;

// ---------------------------------------------------------------------------
// Derive output path
// ---------------------------------------------------------------------------
const stem = basename(inputPath, extname(inputPath));
const outputPath = join(outputDir, `${stem}.svg`);

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
try {
  const diagram = readFileSync(inputPath, 'utf8');
  const themeOptions = resolveTheme(themeName, customThemeRaw);
  const svg = renderMermaidSVG(diagram, themeOptions);
  writeFileSync(outputPath, svg, 'utf8');
  process.stdout.write(JSON.stringify({ status: 'ok', output: outputPath }) + '\n');
  process.exit(0);
} catch (err) {
  const suggestion = findSuggestion(err.message);
  process.stderr.write(
    JSON.stringify({ status: 'error', message: err.message, suggestion }) + '\n'
  );
  process.exit(1);
}
