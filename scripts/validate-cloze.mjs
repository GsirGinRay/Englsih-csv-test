// Validate the Ian cloze banks: valid JSON, every item blankable,
// exactly 3 unique distractors, answer not among its own distractors.
import { readFileSync } from 'node:fs';

const files = ['ian-cloze-grammar', 'ian-cloze-connectors', 'ian-cloze-relative', 'ian-cloze-phrases'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
let total = 0, problems = 0;

for (const f of files) {
  const arr = JSON.parse(readFileSync(`word-source/${f}.json`, 'utf-8'));
  total += arr.length;
  const probs = [];
  for (const e of arr) {
    const s = e.exampleSentence || '';
    const blankable = s.includes('___') || new RegExp(esc(e.english), 'i').test(s);
    if (!blankable) probs.push(`NOTBLANK: ${e.english} | ${s}`);
    const d = e.distractors;
    if (!Array.isArray(d) || d.length !== 3) probs.push(`DCOUNT(${d ? d.length : 0}): ${e.english}`);
    else {
      if (d.map((x) => x.toLowerCase()).includes((e.english || '').toLowerCase())) probs.push(`DSELF: ${e.english}`);
      if (new Set(d.map((x) => x.toLowerCase())).size !== 3) probs.push(`DDUP: ${e.english} ${JSON.stringify(d)}`);
    }
    if (!e.chinese || !e.english) probs.push(`MISSING: ${JSON.stringify(e)}`);
  }
  problems += probs.length;
  console.log(`${f}: ${arr.length} items${probs.length ? `  !! ${probs.length} problems` : '  OK'}`);
  probs.slice(0, 12).forEach((p) => console.log('   - ' + p));
}
console.log(`\nTOTAL items: ${total}  | problems: ${problems}`);
process.exit(problems ? 1 : 0);
