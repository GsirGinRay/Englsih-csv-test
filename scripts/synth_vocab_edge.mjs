// Generate per-word MP3 for a manifest using edge-tts (Microsoft neural voices) —
// the SAME 4 voices the app already uses for its other 2169 words. Clean, stable,
// correct single-word pronunciation. Writes directly to public/audio/<voice>/<id>.mp3
// (no separate distribute step needed; each voice folder gets its own real voice).
//
// Usage:
//   node scripts/synth_vocab_edge.mjs --manifest scripts/audio-manifest-ian.json
//   node scripts/synth_vocab_edge.mjs --manifest <path> --concurrency 6

import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

// short id -> edge-tts voice (mirrors scripts/generate-audio.mjs)
const VOICES = {
  aria: 'en-US-AriaNeural',
  jenny: 'en-US-JennyNeural',
  guy: 'en-US-GuyNeural',
  sonia: 'en-GB-SoniaNeural',
};
const OUT_ROOT = 'public/audio';

const args = process.argv.slice(2);
const argVal = (f) => { const i = args.indexOf(f); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
const manifestPath = argVal('--manifest');
const concurrency = argVal('--concurrency') ? Number(argVal('--concurrency')) : 6;
if (!manifestPath) {
  console.error('Usage: node scripts/synth_vocab_edge.mjs --manifest <path> [--concurrency N]');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

// Make placeholder/grammar tokens speakable
const speak = (t) => (t || '')
  .replace(/\.\.\.|…/g, ', ')
  .replace(/\bsb\b/g, 'someone').replace(/\bsth\b/g, 'something')
  .replace(/V-ing/g, 'doing something').replace(/\+ ?pp/g, '').replace(/\+/g, ' ')
  .replace(/\s+/g, ' ').trim().replace(/^,+|,+$/g, '').trim();

const tasks = [];
for (const v of Object.keys(VOICES)) {
  const dir = path.join(OUT_ROOT, v);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  for (const e of manifest) {
    if (!e.id || !e.text) continue;
    tasks.push({ voice: VOICES[v], file: path.join(dir, `${e.id}.mp3`), text: speak(e.text) || e.text });
  }
}
console.log(`Tasks: ${tasks.length} (${manifest.length} words x ${Object.keys(VOICES).length} voices)`);

let done = 0, fail = 0;
const failures = [];
function runOne(t) {
  return new Promise((resolve) => {
    const p = spawn('python', ['-m', 'edge_tts', '-t', t.text, '-v', t.voice, '--write-media', t.file],
      { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('close', (code) => {
      if (code === 0 && existsSync(t.file) && statSync(t.file).size > 256) {
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${tasks.length}`);
      } else {
        fail++;
        failures.push({ file: t.file, code, err: err.slice(0, 150) });
      }
      resolve();
    });
  });
}

let next = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next < tasks.length) await runOne(tasks[next++]);
}));
console.log(`Done. ok=${done} fail=${fail}`);
if (failures.length) {
  console.log('first 5 failures:');
  for (const f of failures.slice(0, 5)) console.log('  ', f.file, f.code, f.err);
}
