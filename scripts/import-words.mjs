// Generic word importer: log in to the deployed app and create a new WordFile
// with all words from a JSON file. Reusable for any student / week.
//
// JSON format: [{ english, chinese, partOfSpeech?, exampleSentence?, englishDefinition? }, ...]
//
// Usage:
//   node scripts/import-words.mjs --json word-source/eason-week15.json --name "Eason英皇Week15"
//   node scripts/import-words.mjs --json <path> --name "<name>" --dry-run
//   node scripts/import-words.mjs --json <path> --name "<name>" --category <categoryKey>
//
// Env overrides: APP_BASE, TEACHER_PASSWORD

import { readFileSync } from 'node:fs';

const BASE = process.env.APP_BASE || 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '5520';

const args = process.argv.slice(2);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const DRY = args.includes('--dry-run');
const jsonPath = argVal('--json');
const name = argVal('--name');
const category = argVal('--category');

if (!jsonPath || !name) {
  console.error('Usage: node scripts/import-words.mjs --json <path> --name "<WordFile name>" [--category <key>] [--dry-run]');
  process.exit(1);
}

const words = JSON.parse(readFileSync(jsonPath, 'utf-8'));
if (!Array.isArray(words) || words.length === 0) {
  console.error('JSON must be a non-empty array of word objects.');
  process.exit(1);
}
for (const w of words) {
  if (!w.english || !w.chinese) {
    console.error('Each word needs at least english + chinese:', JSON.stringify(w));
    process.exit(1);
  }
}

async function login() {
  const r = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('teacher login failed (check TEACHER_PASSWORD)');
  return j.token;
}

async function main() {
  console.log(`File name: "${name}"  words: ${words.length}  base: ${BASE}`);

  // Guard: refuse to create a duplicate file name
  const existing = await (await fetch(`${BASE}/api/files`)).json();
  const dup = Array.isArray(existing) && existing.find((f) => f.name === name);
  if (dup) {
    console.error(`A file named "${name}" already exists (id=${dup.id}, words=${dup.words?.length ?? '?'}).`);
    console.error('Choose another --name or delete the existing file first.');
    process.exit(1);
  }

  console.log('Preview (first 5):');
  for (const w of words.slice(0, 5)) {
    console.log(`  ${w.english} (${w.partOfSpeech || ''}) ${w.chinese}`);
    console.log(`    def: ${w.englishDefinition || '(none)'}`);
    console.log(`    ex:  ${w.exampleSentence || '(none)'}`);
  }
  if (DRY) {
    console.log('\n[dry-run] Nothing created. Re-run without --dry-run to create the file.');
    return;
  }

  const token = await login();
  const body = {
    name,
    category: category || undefined,
    words: words.map((w) => ({
      english: w.english,
      chinese: w.chinese,
      partOfSpeech: w.partOfSpeech || null,
      exampleSentence: w.exampleSentence || null,
      englishDefinition: w.englishDefinition || null,
    })),
  };
  const res = await fetch(`${BASE}/api/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-teacher-token': token },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error('Create failed:', res.status, await res.text().catch(() => ''));
    process.exit(1);
  }
  const file = await res.json();
  console.log(`\nCreated file id=${file.id}  name="${file.name}"  words=${file.words?.length}`);
  console.log('Next: node scripts/audio-manifest.mjs --name "' + name + '" --out scripts/audio-manifest.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
