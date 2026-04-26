// Rebuild 英文初級檢定 quizzes: 22 days × 5 sessions/day × 20 words.
// 1) Delete all existing "英文初級檢定 Day" quizzes
// 2) Recreate as Day NN-S（range）, 20 words each, 3x multiplier, assigned to Ian, never expire.

const BASE = 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = '5520';
const STUDENT_NAME = 'Ian';
const FILE_NAME_KEYWORD = '英文初級檢定';
const WORDS_PER_SESSION = 20;
const SESSIONS_PER_DAY = 5;
const TOTAL_DAYS = 22;
const NAME_PREFIX = '英文初級檢定 Day';
const QUESTION_TYPES = [0, 1];
const STAR_MULTIPLIER = 3.0;
const DURATION_DAYS = 0;

async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) { console.error('Login failed', loginData); process.exit(1); }
  const token = loginData.token;
  const headers = { 'Content-Type': 'application/json', 'x-teacher-token': token };
  console.log(`Login ok.`);

  // Fetch file & student
  const files = await (await fetch(`${BASE}/api/files`)).json();
  const file = files.find((f) => f.name.includes(FILE_NAME_KEYWORD));
  if (!file) { console.error('File not found'); process.exit(1); }
  const allWords = [...file.words].sort((a, b) => (a.id < b.id ? -1 : 1));
  console.log(`File: ${file.name}  words=${allWords.length}`);

  const profiles = await (await fetch(`${BASE}/api/profiles`)).json();
  const ian = profiles.find((p) => p.name === STUDENT_NAME);
  if (!ian) { console.error('Ian not found'); process.exit(1); }
  console.log(`Student: ${ian.name}`);

  // Delete existing
  const all = await (await fetch(`${BASE}/api/custom-quizzes`)).json();
  const existing = all.filter((q) => q.name?.startsWith(NAME_PREFIX));
  console.log(`\nDeleting ${existing.length} existing quizzes...`);
  for (const q of existing) {
    const r = await fetch(`${BASE}/api/custom-quizzes/${q.id}`, { method: 'DELETE', headers });
    if (!r.ok) console.error(`  ✗ delete ${q.name} status=${r.status}`);
  }
  console.log('  done');

  // Build & create new
  console.log(`\nCreating new quizzes (20 words × 5 sessions × 22 days)...`);
  let created = 0, failed = 0;
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const dayStart = (day - 1) * SESSIONS_PER_DAY * WORDS_PER_SESSION;
    if (dayStart >= allWords.length) break;
    for (let s = 1; s <= SESSIONS_PER_DAY; s++) {
      const start = dayStart + (s - 1) * WORDS_PER_SESSION;
      const end = Math.min(start + WORDS_PER_SESSION, allWords.length);
      if (start >= allWords.length) break;
      const slice = allWords.slice(start, end);
      const dd = String(day).padStart(2, '0');
      const name = `${NAME_PREFIX} ${dd}-${s}（${start + 1}-${end}）`;
      const r = await fetch(`${BASE}/api/custom-quizzes`, {
        method: 'POST', headers,
        body: JSON.stringify({
          name, fileId: file.id, wordIds: slice.map((w) => w.id),
          questionTypes: QUESTION_TYPES, starMultiplier: STAR_MULTIPLIER,
          assignedProfileIds: [ian.id], durationDays: DURATION_DAYS,
        }),
      });
      if (r.ok) { created++; console.log(`  ✓ ${name}  (${slice.length} words)`); }
      else { failed++; console.error(`  ✗ ${name}  status=${r.status}  ${await r.text()}`); }
    }
  }
  console.log(`\nDone. created=${created}  failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
