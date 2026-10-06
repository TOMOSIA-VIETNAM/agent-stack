#!/usr/bin/env node
// Mechanical front matter checks for skills and commands under review.
// Usage: node frontmatter.mjs <file>...   — prints one line per file, exits 1 on any finding.
//
// Claude Code ignores an unknown field without a word, and loads a skill whose YAML does
// not parse with no fields at all — `/name` still works but the description never
// matches a task. Neither shows up in `npm run check` or `claude plugin validate`.
import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { parse } from 'yaml';

const KNOWN = new Set([
  'name', 'description', 'when_to_use', 'argument-hint', 'arguments',
  'disable-model-invocation', 'user-invocable', 'allowed-tools', 'disallowed-tools',
  'model', 'effort', 'context', 'agent', 'background', 'hooks', 'paths', 'shell',
  'metadata', 'license', 'compatibility',
]);
const LISTING_CAP = 1536; // description + when_to_use, per skill listing entry

let failed = false;
for (const file of process.argv.slice(2)) {
  const findings = [];
  const isSkill = basename(file) === 'SKILL.md';
  const text = readFileSync(file, 'utf8');
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  let fm = {};
  if (!block) {
    findings.push('no front matter (the opening --- must be the first line)');
  } else {
    try {
      fm = parse(block[1]) ?? {};
    } catch (error) {
      findings.push(`YAML does not parse: ${error.message.split('\n')[0]}`);
    }
  }

  for (const key of Object.keys(fm)) {
    if (!KNOWN.has(key)) findings.push(`unknown field "${key}" — Claude Code ignores it`);
  }
  if (!fm.description) findings.push('no description');
  const listed = `${fm.description ?? ''}${fm.when_to_use ?? ''}`.length;
  if (listed > LISTING_CAP) findings.push(`description + when_to_use is ${listed} chars, over ${LISTING_CAP}`);

  if (isSkill) {
    const dir = basename(dirname(file));
    if (fm.name !== undefined && fm.name !== dir) findings.push(`name "${fm.name}" differs from directory "${dir}"`);
  } else if ('name' in fm || 'paths' in fm) {
    findings.push('a command takes neither name nor paths');
  }

  const tools = fm['allowed-tools'];
  const list = Array.isArray(tools) ? tools : typeof tools === 'string' ? tools.split(/[\s,]+(?![^(]*\))/) : [];
  for (const tool of list) {
    if (/^Bash(\(\s*\*?\s*\))?$/.test(tool.trim())) {
      findings.push('allowed-tools pre-approves every shell command — scope it to the commands the workflow runs');
    }
  }

  if (findings.length) failed = true;
  console.log(findings.length ? `${file}\n  - ${findings.join('\n  - ')}` : `${file}: ok (${listed} chars listed)`);
}
process.exit(failed ? 1 : 0);
