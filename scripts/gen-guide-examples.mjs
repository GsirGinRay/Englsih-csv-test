// Regenerate Part 2 (連接詞) and Part 4 (片語介係詞) of the study guide so that
// EVERY connector / collocation has an example sentence, reusing the vetted
// sentences from the ian-cloze-* banks. Splices into public/ian-study-guide.html.
import { readFileSync, writeFileSync } from 'node:fs';

const phrases = JSON.parse(readFileSync('word-source/ian-cloze-phrases.json', 'utf-8'));
const connectors = JSON.parse(readFileSync('word-source/ian-cloze-connectors.json', 'utf-8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// fill a manual ___ blank with the highlighted answer
const fillBlank = (sentence, ans) => esc(sentence).replace('___', `<b class="ans">${esc(ans)}</b>`);
// highlight the first case-insensitive occurrence of `word` in a sentence
function highlight(sentence, word) {
  const s = esc(sentence);
  const pat = esc(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return s.replace(new RegExp(pat, 'i'), (m) => `<b class="ans">${m}</b>`);
}
// render an example: fill a manual ___ blank, otherwise highlight the inline word
const renderEx = (sentence, word) => (sentence.includes('___') ? fillBlank(sentence, word) : highlight(sentence, word));
// split "afraid of 害怕" -> ["afraid of", "害怕"]
function splitPhrase(zh) {
  const m = zh.match(/[　-鿿]/);
  if (!m) return [zh.trim(), ''];
  const i = zh.indexOf(m[0]);
  return [zh.slice(0, i).trim(), zh.slice(i).trim()];
}

/* ---------- Part 4: phrases grouped by preposition ---------- */
const PREP_ORDER = ['of', 'in', 'at', 'on', 'for', 'to', 'with', 'about', 'from', 'into', 'up', 'off'];
const byPrep = {};
for (const p of phrases) (byPrep[p.english] ||= []).push(p);
let part4 = `  <h2 id="p"><span class="no">四</span>🧷 片語介係詞填空</h2>
  <div class="keypoint"><span class="lab">一句話重點</span>這些介係詞<b>沒有道理可講</b>，要把「<b>動詞/形容詞 + 介係詞</b>」<b>整組一起背</b>，例如 <span class="en">be afraid <b>of</b> dogs</span>（怕狗）。</div>
  <p class="lead">下面依介係詞分類，每個搭配都配一句例句，照著句子記最快。</p>
`;
const prepKeys = [...PREP_ORDER.filter((k) => byPrep[k]), ...Object.keys(byPrep).filter((k) => !PREP_ORDER.includes(k))];
for (const k of prepKeys) {
  part4 += `  <h4>介係詞 <span class="en">${esc(k)}</span></h4>\n  <div class="tb"><table>\n    <tr><th>片語</th><th>中文</th><th>例句</th></tr>\n`;
  for (const p of byPrep[k]) {
    const [coll, zh] = splitPhrase(p.chinese);
    part4 += `    <tr><td class="en">${esc(coll)}</td><td>${esc(zh)}</td><td class="en">${fillBlank(p.exampleSentence, p.english)}</td></tr>\n`;
  }
  part4 += `  </table></div>\n`;
}

/* ---------- Part 2: connectors grouped by function ---------- */
const GROUPS = {
  addition: ['In addition', 'In addition to', 'Furthermore', 'Moreover', 'Besides', "What's more", 'Additionally', 'Also', 'Not only', 'Apart from'],
  contrast: ['However', 'On the other hand', 'Nevertheless', 'On the contrary', 'In contrast', 'Instead', 'Even so', 'Still', 'Although', 'Even though', 'Despite', 'In spite of', 'While', 'Whereas', 'Instead of', 'Rather than'],
  cause: ['Therefore', 'Thus', 'As a result', 'Consequently', 'Hence', 'For this reason', 'Because of', 'Due to', 'Accordingly', 'So', 'As a consequence', 'Owing to', 'Thanks to', 'Because', 'Since', 'As'],
  example: ['For example', 'For instance', 'Such as', 'To illustrate', 'Namely'],
  summary: ['In conclusion', 'In short', 'To sum up', 'In summary', 'All in all', 'Overall', 'On the whole', 'After all', 'In brief'],
  sequence: ['First of all', 'Firstly', 'Then', 'Next', 'After that', 'Finally', 'At last', 'In the end', 'Meanwhile', 'In the meantime', 'At first', 'Afterwards', 'Eventually', 'As soon as', 'To begin with', 'Last but not least', 'Until', 'In the first place'],
  emphasis: ['In fact', 'As a matter of fact', 'Indeed', 'Of course', 'Above all', 'In particular', 'Especially', 'Needless to say'],
  similar: ['Similarly', 'Likewise', 'In the same way'],
  purpose: ['In order to', 'So that'],
  condition: ['Otherwise', 'If so', 'In that case', 'As long as', 'Unless', 'If', 'Once'],
  restate: ['In other words', 'That is to say'],
  misc: ['Generally speaking', 'According to', 'By the way'],
};
const groupOf = {};
for (const [g, list] of Object.entries(GROUPS)) for (const w of list) groupOf[w] = g;
const LABEL = { addition: '增加（補充一點）', contrast: '轉折（相反、但是）', cause: '因果（所以、因為）', example: '舉例', summary: '總結', sequence: '順序／時間', emphasis: '強調／事實', similar: '相似', purpose: '目的（為了）', condition: '條件（如果、除非）', restate: '換句話說', misc: '其他' };
const buckets = {};
for (const c of connectors) (buckets[groupOf[c.english] || 'misc'] ||= []).push(c);

let part2 = `  <h2 id="c"><span class="no">二</span>🔗 連接詞填空</h2>
  <div class="keypoint"><span class="lab">一句話重點</span>先想「前後兩句是什麼關係」——是<b>再補一點</b>、<b>相反</b>、還是<b>前因後果</b>？想通關係，詞就選對了。</div>
  <p class="lead">下面依「功能」分類，每個連接詞都配一句例句。</p>
`;
for (const g of Object.keys(LABEL)) {
  if (!buckets[g]) continue;
  part2 += `  <h4>${LABEL[g]}</h4>\n  <div class="tb"><table>\n    <tr><th>連接詞</th><th>中文</th><th>例句</th></tr>\n`;
  for (const c of buckets[g]) {
    part2 += `    <tr><td class="en">${esc(c.english)}</td><td>${esc(c.chinese)}</td><td class="en">${renderEx(c.exampleSentence, c.english)}</td></tr>\n`;
  }
  part2 += `  </table></div>\n`;
}

/* ---------- splice into the HTML ---------- */
let html = readFileSync('public/ian-study-guide.html', 'utf-8');
function replaceRegion(html, startAnchor, endAnchor, replacement) {
  const i = html.indexOf(startAnchor);
  const j = html.indexOf(endAnchor);
  if (i < 0 || j < 0 || j < i) throw new Error(`anchors not found: ${startAnchor} .. ${endAnchor}`);
  return html.slice(0, i) + replacement + '\n  ' + html.slice(j);
}
// Part 2: from its <h2> up to the Part-3 comment
html = replaceRegion(html, '  <h2 id="c">', '  <!-- ===== 3 RELATIVE', part2);
// Part 4: from its <h2> up to the Part-5 comment
html = replaceRegion(html, '  <h2 id="p">', '  <!-- ===== 5 CONFUSABLES', part4);
writeFileSync('public/ian-study-guide.html', html);
console.log(`Spliced. Part2 groups: ${Object.keys(buckets).length}, connectors: ${connectors.length}. Part4 prep groups: ${prepKeys.length}, phrases: ${phrases.length}.`);
