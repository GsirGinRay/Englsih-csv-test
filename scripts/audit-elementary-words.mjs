// Audit 英文初級檢定 word file: count missing exampleSentence / englishDefinition.
// Output: scripts/audit-data/word-audit.json with all words + flags.
//
// Usage: node scripts/audit-elementary-words.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const BASE = 'https://englsih-csv-test.zeabur.app';
const FILE_NAME_KEYWORD = '英文初級檢定';
const OUT_DIR = 'scripts/audit-data';
const OUT_FILE = `${OUT_DIR}/word-audit.json`;

async function main() {
  const filesRes = await fetch(`${BASE}/api/files`);
  if (!filesRes.ok) {
    console.error(`GET /api/files failed: ${filesRes.status}`);
    process.exit(1);
  }
  const files = await filesRes.json();
  const file = files.find((f) => f.name.includes(FILE_NAME_KEYWORD));
  if (!file) {
    console.error(`File not found containing "${FILE_NAME_KEYWORD}".`);
    process.exit(1);
  }

  const sortedWords = [...file.words].sort((a, b) => (a.id < b.id ? -1 : 1));
  const stats = {
    total: sortedWords.length,
    missingExample: 0,
    missingDefinition: 0,
    missingBoth: 0,
    fullyComplete: 0,
  };
  const records = sortedWords.map((w, i) => {
    const hasEx = !!(w.exampleSentence && w.exampleSentence.trim());
    const hasDef = !!(w.englishDefinition && w.englishDefinition.trim());
    if (!hasEx) stats.missingExample++;
    if (!hasDef) stats.missingDefinition++;
    if (!hasEx && !hasDef) stats.missingBoth++;
    if (hasEx && hasDef) stats.fullyComplete++;
    return {
      index: i + 1,
      id: w.id,
      english: w.english,
      chinese: w.chinese,
      partOfSpeech: w.partOfSpeech || null,
      hasExample: hasEx,
      hasDefinition: hasDef,
      currentExample: hasEx ? w.exampleSentence : null,
      currentDefinition: hasDef ? w.englishDefinition : null,
    };
  });

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT_FILE,
    JSON.stringify({ fileId: file.id, fileName: file.name, stats, records }, null, 2),
    'utf-8'
  );

  console.log(`File: ${file.name}  id=${file.id}`);
  console.log(`Total words: ${stats.total}`);
  console.log(`  missing exampleSentence: ${stats.missingExample}`);
  console.log(`  missing englishDefinition: ${stats.missingDefinition}`);
  console.log(`  missing both: ${stats.missingBoth}`);
  console.log(`  fully complete: ${stats.fullyComplete}`);
  console.log(`\nWrote ${OUT_FILE}`);

  // Print first 5 missing samples
  const missing = records.filter((r) => !r.hasExample || !r.hasDefinition).slice(0, 5);
  if (missing.length > 0) {
    console.log(`\nFirst 5 missing (sample):`);
    for (const m of missing) {
      console.log(`  #${m.index}  ${m.english} (${m.chinese})  ex=${m.hasExample}  def=${m.hasDefinition}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
