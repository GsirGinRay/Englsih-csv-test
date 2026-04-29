// Adjust question types in all CustomQuiz entries whose name contains "英文初級檢定":
//   - Replace type 9 (看英文解釋寫單字) with type 8 (看英文解釋選單字)
//   - Ensure types 0 (看中文選英文), 1 (看英文選中文), 7 (看例句選答案) are present
//
// Usage:
//   node scripts/swap-def-spell-to-choice.mjs            # apply
//   node scripts/swap-def-spell-to-choice.mjs --dry-run  # preview only

const BASE = 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = '5520';
const NAME_FILTER = '英文初級檢定';
const FROM_TYPE = 9;
const TO_TYPE = 8;
const ENSURE_TYPES = [0, 1, 7];

const DRY = process.argv.includes('--dry-run');

async function login() {
  const r = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('login failed');
  return j.token;
}

async function getQuizzes() {
  const r = await fetch(`${BASE}/api/custom-quizzes`);
  if (!r.ok) throw new Error(`fetch quizzes failed: ${r.status}`);
  return r.json();
}

async function updateQuiz(token, id, questionTypes) {
  const r = await fetch(`${BASE}/api/custom-quizzes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-teacher-token': token,
    },
    body: JSON.stringify({ questionTypes }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`update ${id} failed: ${r.status} ${text}`);
  }
  return r.json();
}

function transform(types) {
  // 1. Replace 9 with 8
  const replaced = types.map((t) => (t === FROM_TYPE ? TO_TYPE : t));
  // 2. Append ENSURE_TYPES that are missing
  const merged = [...replaced];
  for (const t of ENSURE_TYPES) {
    if (!merged.includes(t)) merged.push(t);
  }
  // 3. Dedupe preserving order
  const seen = new Set();
  const out = [];
  for (const t of merged) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function main() {
  const quizzes = await getQuizzes();
  const matchedAll = quizzes.filter((q) => (q.name || '').includes(NAME_FILTER));
  const targets = matchedAll.filter((q) => {
    if (!Array.isArray(q.questionTypes)) return false;
    const next = transform(q.questionTypes);
    return !arraysEqual(q.questionTypes, next);
  });

  console.log(`Found ${matchedAll.length} quizzes matching "${NAME_FILTER}"`);
  console.log(`Of those, ${targets.length} need updating.\n`);

  if (targets.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  for (const q of targets) {
    const next = transform(q.questionTypes);
    console.log(`  - [${q.id}] ${q.name}`);
    console.log(`      ${JSON.stringify(q.questionTypes)} -> ${JSON.stringify(next)}`);
  }

  if (DRY) {
    console.log('\n(dry-run) no changes applied.');
    return;
  }

  console.log('\nLogging in...');
  const token = await login();

  let ok = 0;
  for (const q of targets) {
    const next = transform(q.questionTypes);
    try {
      await updateQuiz(token, q.id, next);
      ok++;
      console.log(`  ✓ ${q.name}`);
    } catch (e) {
      console.error(`  ✗ ${q.name}: ${e.message}`);
    }
  }
  console.log(`\nDone. Updated ${ok}/${targets.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
