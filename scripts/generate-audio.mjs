// Generate per-word MP3 audio for all words in 英文初級檢定 using edge-tts.
// Output: public/audio/<voice>/<wordId>.mp3
//
// Usage:
//   node scripts/generate-audio.mjs                # all voices, all words
//   node scripts/generate-audio.mjs --voice aria   # only one voice
//   node scripts/generate-audio.mjs --limit 20     # only first 20 words (smoke test)
//   node scripts/generate-audio.mjs --concurrency 5

import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const AUDIT_FILE = 'scripts/audit-data/word-audit.json';
const OUT_ROOT = 'public/audio';

// Voice catalog: short id → edge-tts voice name
const VOICES = {
  aria:  'en-US-AriaNeural',
  jenny: 'en-US-JennyNeural',
  guy:   'en-US-GuyNeural',
  sonia: 'en-GB-SoniaNeural',
};

// Args
const args = process.argv.slice(2);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const onlyVoice = argVal('--voice');
const limit = argVal('--limit') ? Number(argVal('--limit')) : Infinity;
const concurrency = argVal('--concurrency') ? Number(argVal('--concurrency')) : 4;

const voiceList = onlyVoice ? [onlyVoice] : Object.keys(VOICES);
for (const v of voiceList) {
  if (!VOICES[v]) {
    console.error(`Unknown voice "${v}". Available: ${Object.keys(VOICES).join(', ')}`);
    process.exit(1);
  }
}

if (!existsSync(AUDIT_FILE)) {
  console.error(`Missing ${AUDIT_FILE}. Run scripts/audit-elementary-words.mjs first.`);
  process.exit(1);
}
const audit = JSON.parse(readFileSync(AUDIT_FILE, 'utf-8'));
const records = audit.records.slice(0, limit);

console.log(`Words: ${records.length}  voices: ${voiceList.join(', ')}  concurrency: ${concurrency}`);

// Strip parenthetical content (mirrors stripParenthetical in src/App.tsx)
const stripParen = (s) => s.replace(/\s*[\(（].*?[\)）]\s*/g, ' ').trim();

// Plan tasks
const tasks = [];
for (const v of voiceList) {
  const dir = path.join(OUT_ROOT, v);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  for (const r of records) {
    const file = path.join(dir, `${r.id}.mp3`);
    if (existsSync(file) && statSync(file).size > 256) continue; // already done; skip tiny corrupt files
    tasks.push({ voice: v, voiceFull: VOICES[v], wordId: r.id, text: stripParen(r.english), file });
  }
}
console.log(`Tasks to run (skipping existing): ${tasks.length}`);
if (tasks.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

const startedAt = Date.now();
let done = 0, failed = 0;
const failures = [];

function runOne(task) {
  return new Promise((resolve) => {
    const proc = spawn('python', [
      '-m', 'edge_tts',
      '-t', task.text,
      '-v', task.voiceFull,
      '--write-media', task.file,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && existsSync(task.file) && statSync(task.file).size > 256) {
        done++;
        if (done % 25 === 0) {
          const elapsed = (Date.now() - startedAt) / 1000;
          const rate = done / elapsed;
          const eta = (tasks.length - done - failed) / rate;
          console.log(`  ${done}/${tasks.length} (${rate.toFixed(1)}/s, ETA ${(eta / 60).toFixed(1)}min, fail=${failed})`);
        }
      } else {
        failed++;
        failures.push({ ...task, code, stderr: stderr.slice(0, 400) });
      }
      resolve();
    });
  });
}

// Pool runner
async function runPool() {
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (next < tasks.length) {
      const i = next++;
      await runOne(tasks[i]);
    }
  });
  await Promise.all(workers);
}

await runPool();

const elapsed = (Date.now() - startedAt) / 1000;
console.log(`\nDone in ${elapsed.toFixed(1)}s. ok=${done} failed=${failed}`);
if (failures.length > 0) {
  console.log('First 10 failures:');
  for (const f of failures.slice(0, 10)) {
    console.log(`  ${f.voice}/${f.wordId} ("${f.text}")  exit=${f.code}  ${f.stderr.slice(0, 100)}`);
  }
}
