// Builds docs/TEST_CASES.md and docs/test-cases.csv from docs/test-cases.json.
// Usage: node scripts/build-test-cases.js
import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync('docs/test-cases.json', 'utf8'));
const cases = src.cases.map((c, i) => ({ id: `TC-${String(i + 1).padStart(3, '0')}`, ...c }));

// ── Markdown ──
const md = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const count = (key) => cases.reduce((m, c) => m.set(c[key], (m.get(c[key]) ?? 0) + 1), new Map());
const categories = [...new Set(cases.map((c) => c.category))];

const lines = [
  `# ${src.title}`,
  '',
  `${cases.length} test cases covering the PRD's use cases plus edge cases, negative cases and vague requests. Generated from [test-cases.json](test-cases.json) by \`node scripts/build-test-cases.js\`; edit the JSON, not this file. A spreadsheet version is in [test-cases.csv](test-cases.csv).`,
  '',
  `**Standard user** (precondition used by many cases): ${src.standardUser}`,
  '',
  '## Summary',
  '',
  '| Category | Cases | IDs |',
  '| --- | ---: | --- |',
  ...categories.map((cat) => {
    const ids = cases.filter((c) => c.category === cat).map((c) => c.id);
    return `| ${cat} | ${ids.length} | ${ids[0]} – ${ids.at(-1)} |`;
  }),
  `| **Total** | **${cases.length}** | |`,
  '',
  '| Type | Cases | Meaning |',
  '| --- | ---: | --- |',
  ...[
    ['Positive', 'The feature works as described'],
    ['Negative', 'Invalid input, forbidden action or unsafe request is handled correctly'],
    ['Edge', 'Boundary values, unusual timing or state'],
    ['Vague', 'Ambiguous, minimal or messy user wording'],
  ].map(([t, d]) => `| ${t} | ${count('type').get(t) ?? 0} | ${d} |`),
  '',
  `Priority: **P0** must pass before release (${count('priority').get('P0') ?? 0}) · **P1** important (${count('priority').get('P1') ?? 0}) · **P2** nice to have (${count('priority').get('P2') ?? 0}).`,
  '',
  'Cases marked **Known gap** describe expected PRD behaviour that the current build does not fully meet yet.',
  '',
];

for (const cat of categories) {
  lines.push(`## ${cat}`, '');
  lines.push('| ID | Title | Type | Pri | PRD | Preconditions | Steps | Expected result |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const c of cases.filter((x) => x.category === cat)) {
    const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const expected = c.notes ? `${c.expected}\n**Known gap:** ${c.notes.replace(/^Known gap:\s*/i, '')}` : c.expected;
    lines.push(`| ${c.id} | ${md(c.title)} | ${c.type} | ${c.priority} | ${md(c.prd)} | ${md(c.preconditions)} | ${md(steps)} | ${md(expected)} |`);
  }
  lines.push('');
}
fs.writeFileSync('docs/TEST_CASES.md', lines.join('\n'));

// ── CSV (Excel / Google Sheets) with Status and Actual result columns for test runs ──
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const header = ['ID', 'Category', 'Title', 'Type', 'Priority', 'PRD reference', 'Preconditions', 'Steps', 'Expected result', 'Notes', 'Status', 'Actual result'];
const rows = cases.map((c) => [c.id, c.category, c.title, c.type, c.priority, c.prd, c.preconditions, c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), c.expected, c.notes ?? '', '', '']);
// BOM so Excel opens UTF-8 (₹, emoji) correctly.
fs.writeFileSync('docs/test-cases.csv', `﻿${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`);

console.log(`${cases.length} cases → docs/TEST_CASES.md, docs/test-cases.csv`);
for (const cat of categories) console.log(`  ${cat}: ${cases.filter((c) => c.category === cat).length}`);
console.log('  types:', Object.fromEntries(count('type')), 'priorities:', Object.fromEntries(count('priority')));
