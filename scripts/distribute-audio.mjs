// Copy each <wordId>.mp3 from a source folder into ALL voice folders the app uses.
// src/App.tsx randomly plays /audio/<voice>/<wordId>.mp3 (TTS_VOICES), falling back
// to browser speechSynthesis on error — so the file must exist in every voice folder
// to guarantee the natural MP3 plays every time.
//
// Usage:
//   node scripts/distribute-audio.mjs --src word-source/eason-mp3
//   node scripts/distribute-audio.mjs --src <dir> --voices aria,jenny,guy,sonia

import { readdirSync, copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const OUT_ROOT = 'public/audio';
const args = process.argv.slice(2);
const argVal = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const src = argVal('--src');
const VOICES = (argVal('--voices') || 'aria,jenny,guy,sonia').split(',').map((s) => s.trim()).filter(Boolean);
if (!src) {
  console.error('Usage: node scripts/distribute-audio.mjs --src <dir-with-wordId.mp3> [--voices a,b,c]');
  process.exit(1);
}

const mp3s = readdirSync(src).filter((n) => n.toLowerCase().endsWith('.mp3'));
if (mp3s.length === 0) {
  console.error(`No .mp3 files found in ${src}`);
  process.exit(1);
}
console.log(`Found ${mp3s.length} mp3 in ${src}; distributing to voices: ${VOICES.join(', ')}`);

let copied = 0, skipped = 0;
for (const v of VOICES) {
  const dir = path.join(OUT_ROOT, v);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  for (const f of mp3s) {
    const srcFile = path.join(src, f);
    if (statSync(srcFile).size <= 256) { skipped++; continue; } // skip tiny/corrupt
    copyFileSync(srcFile, path.join(dir, f));
    copied++;
  }
}
console.log(`Done. copied=${copied} skipped=${skipped}`);
console.log('Next: git add public/audio && git commit && git push  → Zeabur redeploy');
