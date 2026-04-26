// Read all batch JSON files in scripts/word-content/ and PUT englishDefinition
// (and exampleSentence if provided) to /api/words/:id on the deployed app.
//
// Batch JSON format:
//   [{ "id": "cmm...", "english": "abandon", "englishDefinition": "...", "exampleSentence"?: "..." }, ...]
//
// Usage:
//   node scripts/backfill-word-definitions.mjs                # apply all
//   node scripts/backfill-word-definitions.mjs --dry-run      # show plan only
//   node scripts/backfill-word-definitions.mjs --batch 03     # only batch-03.json

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = '5520';
const BATCH_DIR = 'scripts/word-content';
const RATE_PER_SEC = 8;

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const onlyBatch = (() => {
  const i = args.indexOf('--batch');
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
})();

async function login() {
  const r = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('login failed');
  return j.token;
}

async function getCurrentWords() {
  const r = await fetch(`${BASE}/api/files`);
  const files = await r.json();
  const file = files.find((f) => f.name.includes('英文初級檢定'));
  if (!file) throw new Error('file not found');
  const map = new Map();
  for (const w of file.words) map.set(w.id, w);
  return map;
}

function loadBatches() {
  let names;
  try {
    names = readdirSync(BATCH_DIR).filter((n) => n.startsWith('batch-') && n.endsWith('.json'));
  } catch {
    console.error(`No batch dir at ${BATCH_DIR}. Create it and add batch-NN.json files.`);
    process.exit(1);
  }
  if (onlyBatch) {
    names = names.filter((n) => n.includes(`batch-${onlyBatch}`));
  }
  names.sort();
  const records = [];
  for (const n of names) {
    const data = JSON.parse(readFileSync(path.join(BATCH_DIR, n), 'utf-8'));
    if (!Array.isArray(data)) {
      console.error(`${n} is not an array; skipping.`);
      continue;
    }
    for (const r of data) {
      if (!r.id || !r.englishDefinition) continue;
      records.push({ ...r, _source: n });
    }
  }
  return records;
}

async function main() {
  const records = loadBatches();
  console.log(`Loaded ${records.length} records from ${BATCH_DIR}/`);
  if (records.length === 0) { console.log('Nothing to apply.'); return; }

  const wordMap = await getCurrentWords();

  // Filter: skip ones that already have englishDefinition matching what we'd write
  const toApply = [];
  let skipMissing = 0, skipNoChange = 0;
  for (const r of records) {
    const cur = wordMap.get(r.id);
    if (!cur) { skipMissing++; continue; }
    const sameDef = (cur.englishDefinition || '').trim() === r.englishDefinition.trim();
    const wantEx = r.exampleSentence !== undefined && r.exampleSentence !== null;
    const sameEx = !wantEx || (cur.exampleSentence || '').trim() === r.exampleSentence.trim();
    if (sameDef && sameEx) { skipNoChange++; continue; }
    toApply.push(r);
  }

  console.log(`Plan: apply=${toApply.length}  skip_no_change=${skipNoChange}  skip_missing=${skipMissing}`);
  if (DRY) {
    console.log('First 5 sample writes:');
    for (const r of toApply.slice(0, 5)) {
      console.log(`  [${r._source}] ${r.id} ${r.english}`);
      console.log(`    def: ${r.englishDefinition}`);
    }
    return;
  }

  const token = await login();
  const headers = { 'Content-Type': 'application/json', 'x-teacher-token': token };

  let ok = 0, fail = 0;
  const startedAt = Date.now();
  for (let i = 0; i < toApply.length; i++) {
    const r = toApply[i];
    const cur = wordMap.get(r.id);
    const body = {
      english: cur.english,
      chinese: cur.chinese,
      partOfSpeech: cur.partOfSpeech,
      exampleSentence: r.exampleSentence ?? cur.exampleSentence,
      englishDefinition: r.englishDefinition,
    };
    const res = await fetch(`${BASE}/api/words/${r.id}`, {
      method: 'PUT', headers, body: JSON.stringify(body),
    });
    if (res.ok) {
      ok++;
    } else {
      fail++;
      console.error(`  ✗ ${r.id} ${r.english}  status=${res.status}  ${await res.text().catch(() => '')}`);
    }
    if ((i + 1) % 50 === 0 || i === toApply.length - 1) {
      const elapsed = (Date.now() - startedAt) / 1000;
      console.log(`  progress: ${i + 1}/${toApply.length}  ok=${ok} fail=${fail}  ${(((i + 1) / elapsed)).toFixed(1)}/s`);
    }
    // Rate-limit
    await new Promise((res2) => setTimeout(res2, 1000 / RATE_PER_SEC));
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
