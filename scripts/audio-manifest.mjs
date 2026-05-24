// Generate a TTS manifest for a WordFile so you can produce per-word MP3 with
// your own local TTS model. Output: [{ id: <wordId>, text: <english, parens stripped> }]
//
// Run your local TTS over each entry and save the audio as <id>.mp3 into one folder,
// then distribute with scripts/distribute-audio.mjs.
//
// Usage:
//   node scripts/audio-manifest.mjs --name "Eason英皇Week15" --out scripts/audio-manifest-eason.json
//
// Env overrides: APP_BASE

import { writeFileSync } from 'node:fs';

const BASE = process.env.APP_BASE || 'https://englsih-csv-test.zeabur.app';
const args = process.argv.slice(2);
const argVal = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const name = argVal('--name');
const out = argVal('--out');
if (!name || !out) {
  console.error('Usage: node scripts/audio-manifest.mjs --name "<WordFile name>" --out <path>');
  process.exit(1);
}

// Mirror stripParenthetical in src/App.tsx (and generate-audio.mjs:53)
const stripParen = (s) => s.replace(/\s*[\(（].*?[\)）]\s*/g, ' ').trim();

const files = await (await fetch(`${BASE}/api/files`)).json();
const file = Array.isArray(files) && files.find((f) => f.name === name);
if (!file) {
  console.error(`No WordFile named "${name}" on ${BASE}`);
  process.exit(1);
}
const manifest = file.words.map((w) => ({ id: w.id, text: stripParen(w.english) }));
writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`Wrote ${manifest.length} entries to ${out}`);
console.log('Each entry: produce <id>.mp3 from "text" with your TTS, save to one folder, then:');
console.log('  node scripts/distribute-audio.mjs --src <that-folder>');
