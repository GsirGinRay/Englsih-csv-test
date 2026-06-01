// Build ian-cloze-connectors.json from the existing connectors-cloze.json:
//  - reuse all existing entries (proven example sentences)
//  - add ~24 supplements (purpose / cause / condition / extra connectors)
//  - assign each entry 3 distractors = clean connectors from DIFFERENT functional
//    groups, so only the correct answer fits the meaning (real GEPT-style cloze)
//
// Run:  node scripts/build-connectors.mjs
// Out:  word-source/ian-cloze-connectors.json

import { readFileSync, writeFileSync } from 'node:fs';

const base = JSON.parse(readFileSync('word-source/connectors-cloze.json', 'utf-8'));

// --- functional groups (every connector belongs to exactly one) ---
const GROUPS = {
  addition: ['In addition', 'In addition to', 'Furthermore', 'Moreover', 'Besides', "What's more", 'Additionally', 'Also', 'Not only', 'Apart from'],
  contrast: ['However', 'On the other hand', 'Nevertheless', 'On the contrary', 'In contrast', 'Instead', 'Even so', 'Still', 'Although', 'Even though', 'Despite', 'In spite of', 'While', 'Whereas', 'Instead of', 'Rather than'],
  cause:    ['Therefore', 'Thus', 'As a result', 'Consequently', 'Hence', 'For this reason', 'Because of', 'Due to', 'Accordingly', 'So', 'As a consequence', 'Owing to', 'Thanks to', 'Because', 'Since', 'As'],
  example:  ['For example', 'For instance', 'Such as', 'To illustrate', 'Namely'],
  summary:  ['In conclusion', 'In short', 'To sum up', 'In summary', 'All in all', 'Overall', 'On the whole', 'After all', 'In brief'],
  sequence: ['First of all', 'Firstly', 'Then', 'Next', 'After that', 'Finally', 'At last', 'In the end', 'Meanwhile', 'In the meantime', 'At first', 'Afterwards', 'Eventually', 'As soon as', 'To begin with', 'Last but not least'],
  emphasis: ['In fact', 'As a matter of fact', 'Indeed', 'Of course', 'Above all', 'In particular', 'Especially', 'Needless to say'],
  similar:  ['Similarly', 'Likewise', 'In the same way'],
  purpose:  ['In order to', 'So that'],
  condition:['Otherwise', 'If so', 'In that case', 'As long as', 'Unless', 'If'],
  restate:  ['In other words', 'That is to say'],
  misc:     ['Generally speaking', 'According to', 'By the way'],
};

// reverse lookup english -> group
const groupOf = {};
for (const [g, list] of Object.entries(GROUPS)) for (const w of list) groupOf[w] = g;

// clean, common representatives used as distractors for each group
const REPS = {
  addition: ['Moreover', 'Besides'],
  contrast: ['However', 'Instead'],
  cause:    ['Therefore', 'As a result'],
  example:  ['For example', 'For instance'],
  summary:  ['In conclusion', 'In short'],
  sequence: ['Finally', 'Meanwhile'],
  emphasis: ['In fact', 'Indeed'],
  similar:  ['Similarly', 'Likewise'],
  purpose:  ['In order to', 'So that'],
  condition:['Otherwise', 'In that case'],
  restate:  ['In other words', 'That is to say'],
  misc:     ['By the way', 'According to'],
};
const ORDER = Object.keys(REPS);

// pick 3 distractors from 3 different groups (not the answer's group, not equal to answer)
function pickDistractors(answer, group, idx) {
  const others = ORDER.filter((g) => g !== group);
  // rotate start by idx so items in the same group don't all share identical distractors
  const start = idx % others.length;
  const rotated = [...others.slice(start), ...others.slice(0, start)];
  const out = [];
  for (const g of rotated) {
    if (out.length >= 3) break;
    const cand = REPS[g][0] !== answer ? REPS[g][0] : REPS[g][1];
    if (cand && cand !== answer && !out.includes(cand)) out.push(cand);
  }
  return out;
}

// --- supplements (full data; manual ___ for short subordinators) ---
const supplements = [
  { english: 'Instead of', chinese: '而不是;取代', partOfSpeech: 'phr.', exampleSentence: '___ watching TV, let us go out for a walk.', englishDefinition: 'in place of; rather than', group: 'contrast' },
  { english: 'Rather than', chinese: '而非;寧願', partOfSpeech: 'phr.', exampleSentence: '___ complain about the problem, he tried to fix it.', englishDefinition: 'instead of; in preference to', group: 'contrast' },
  { english: 'Apart from', chinese: '除了…之外', partOfSpeech: 'phr.', exampleSentence: '___ English, she also studies French and German.', englishDefinition: 'except for; in addition to', group: 'addition' },
  { english: 'In order to', chinese: '為了', partOfSpeech: 'phr.', exampleSentence: 'She got up early ___ catch the first train.', englishDefinition: 'for the purpose of doing something', group: 'purpose' },
  { english: 'So that', chinese: '以便;為了', partOfSpeech: 'conj.', exampleSentence: 'He spoke slowly ___ everyone could understand him.', englishDefinition: 'with the aim that; in order that', group: 'purpose' },
  { english: 'Because', chinese: '因為', partOfSpeech: 'conj.', exampleSentence: 'We stayed at home ___ it was raining hard.', englishDefinition: 'for the reason that', group: 'cause' },
  { english: 'Since', chinese: '既然;因為', partOfSpeech: 'conj.', exampleSentence: '___ you are already here, let us begin the meeting.', englishDefinition: 'because; for the reason that', group: 'cause' },
  { english: 'As', chinese: '因為;由於', partOfSpeech: 'conj.', exampleSentence: '___ it was getting late, we decided to go home.', englishDefinition: 'because; for the reason that', group: 'cause' },
  { english: 'Owing to', chinese: '由於;因為', partOfSpeech: 'phr.', exampleSentence: '___ the heavy storm, the flight was canceled.', englishDefinition: 'because of; as a result of', group: 'cause' },
  { english: 'Thanks to', chinese: '多虧;由於', partOfSpeech: 'phr.', exampleSentence: '___ your help, we finished the work on time.', englishDefinition: 'because of (a good cause or person)', group: 'cause' },
  { english: 'As a consequence', chinese: '因此;結果', partOfSpeech: 'phr.', exampleSentence: 'He never practiced. ___, he played very badly.', englishDefinition: 'as a result; therefore', group: 'cause' },
  { english: 'Unless', chinese: '除非', partOfSpeech: 'conj.', exampleSentence: 'You will be late ___ you leave right now.', englishDefinition: 'except if; if not', group: 'condition' },
  { english: 'As long as', chinese: '只要', partOfSpeech: 'phr.', exampleSentence: 'You may go out ___ you finish your homework first.', englishDefinition: 'provided that; on condition that', group: 'condition' },
  { english: 'If', chinese: '如果', partOfSpeech: 'conj.', exampleSentence: '___ it rains tomorrow, we will stay inside.', englishDefinition: 'on condition that; in the event that', group: 'condition' },
  { english: 'Once', chinese: '一旦;一…就', partOfSpeech: 'conj.', exampleSentence: '___ you try this game, you will love it at once.', englishDefinition: 'as soon as; from the moment that', group: 'condition' },
  { english: 'Until', chinese: '直到', partOfSpeech: 'conj.', exampleSentence: 'Please wait here ___ I come back from the office.', englishDefinition: 'up to the time that', group: 'sequence' },
  { english: 'To begin with', chinese: '首先;一開始', partOfSpeech: 'phr.', exampleSentence: '___, let us go over the rules of the game.', englishDefinition: 'as the first point; firstly', group: 'sequence' },
  { english: 'Last but not least', chinese: '最後但同樣重要', partOfSpeech: 'phr.', exampleSentence: '___, I want to thank my family for their support.', englishDefinition: 'mentioned last but just as important', group: 'sequence' },
  { english: 'Needless to say', chinese: '不用說;當然', partOfSpeech: 'phr.', exampleSentence: '___, everyone was happy when the team won.', englishDefinition: 'obviously; it is so clear it need not be said', group: 'emphasis' },
  { english: 'In the first place', chinese: '首先;一開始', partOfSpeech: 'phr.', exampleSentence: 'You should not have gone there ___ in the first place.', englishDefinition: 'at the very start; before anything else', group: 'sequence' },
];

const out = [];
let i = 0;
for (const e of base) {
  const group = groupOf[e.english] || 'misc';
  out.push({ ...e, distractors: pickDistractors(e.english, group, i) });
  i++;
}
for (const s of supplements) {
  const { group, ...rest } = s;
  out.push({ ...rest, distractors: pickDistractors(s.english, group, i) });
  i++;
}

// sanity: every entry blankable (has ___ OR answer appears in sentence)
const bad = out.filter((e) => {
  const s = e.exampleSentence || '';
  if (s.includes('___')) return false;
  return !new RegExp(e.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i').test(s);
});
if (bad.length) { console.error('NOT BLANKABLE:', bad.map((b) => b.english)); process.exit(1); }
const bad2 = out.filter((e) => e.distractors.length !== 3 || e.distractors.includes(e.english));
if (bad2.length) { console.error('BAD DISTRACTORS:', bad2.map((b) => b.english)); process.exit(1); }

writeFileSync('word-source/ian-cloze-connectors.json', JSON.stringify(out, null, 0).replace(/^\[/, '[\n  ').replace(/\},\{/g, '},\n  {').replace(/\}\]$/, '}\n]') + '\n');
console.log(`Wrote ${out.length} connectors (${base.length} base + ${supplements.length} supplements).`);
