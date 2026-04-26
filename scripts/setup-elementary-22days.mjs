// Setup 22-day custom quizzes for student Ian on the deployed app.
// Each day: 100 words. Day N covers words ((N-1)*100 + 1) .. (N*100).

const BASE = 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = '5520';
const STUDENT_NAME = 'Ian';
const FILE_NAME_KEYWORD = '英文初級檢定';
const WORDS_PER_DAY = 100;
const TOTAL_DAYS = 22;
const QUESTION_TYPES = [0, 1]; // 看中文選英文 + 看英文選中文
const STAR_MULTIPLIER = 1.0;
const DURATION_DAYS = 0; // 0 = never expire
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`[1/6] Login as teacher...`);
  const loginRes = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.token;
  console.log(`  ok, token=${token.slice(0, 8)}...`);

  const teacherHeaders = {
    'Content-Type': 'application/json',
    'x-teacher-token': token,
  };

  console.log(`\n[2/6] Find file matching "${FILE_NAME_KEYWORD}"...`);
  const filesRes = await fetch(`${BASE}/api/files`);
  const files = await filesRes.json();
  const candidates = files.filter((f) => f.name.includes(FILE_NAME_KEYWORD));
  if (candidates.length === 0) {
    console.error(`  No file found containing "${FILE_NAME_KEYWORD}". Available files:`);
    for (const f of files) console.error(`    - ${f.name} (${f.words?.length ?? 0} words)`);
    process.exit(1);
  }
  if (candidates.length > 1) {
    console.error(`  Multiple files match — please disambiguate:`);
    for (const f of candidates) console.error(`    - ${f.id}  ${f.name} (${f.words?.length ?? 0} words)`);
    process.exit(1);
  }
  const file = candidates[0];
  const allWords = [...file.words].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  console.log(`  ok: ${file.name}  id=${file.id}  totalWords=${allWords.length}`);
  if (allWords.length < TOTAL_DAYS * WORDS_PER_DAY) {
    console.warn(`  warning: only ${allWords.length} words but plan needs ${TOTAL_DAYS * WORDS_PER_DAY}; last day(s) may be partial.`);
  }

  console.log(`\n[3/6] Find student "${STUDENT_NAME}"...`);
  const profilesRes = await fetch(`${BASE}/api/profiles`);
  const profiles = await profilesRes.json();
  const ian = profiles.find((p) => p.name === STUDENT_NAME) ?? profiles.find((p) => p.name?.toLowerCase() === STUDENT_NAME.toLowerCase());
  if (!ian) {
    console.error(`  No profile named "${STUDENT_NAME}". Available:`);
    for (const p of profiles) console.error(`    - ${p.name}`);
    process.exit(1);
  }
  console.log(`  ok: ${ian.name}  id=${ian.id}`);

  console.log(`\n[4/6] Check for existing same-named quizzes...`);
  const existingRes = await fetch(`${BASE}/api/custom-quizzes`);
  const existing = await existingRes.json();
  const namePrefix = `${FILE_NAME_KEYWORD} Day`;
  const dupes = existing.filter((q) => q.name?.startsWith(namePrefix));
  if (dupes.length > 0) {
    console.log(`  found ${dupes.length} existing — will SKIP days that already exist:`);
    for (const d of dupes) console.log(`    - ${d.name}`);
  }
  const existingNames = new Set(dupes.map((d) => d.name));

  console.log(`\n[5/6] Plan:`);
  const plan = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const start = (day - 1) * WORDS_PER_DAY;
    const end = Math.min(start + WORDS_PER_DAY, allWords.length);
    if (start >= allWords.length) break;
    const slice = allWords.slice(start, end);
    const dayLabel = String(day).padStart(2, '0');
    const rangeLabel = `${start + 1}-${end}`;
    const name = `${FILE_NAME_KEYWORD} Day ${dayLabel}（${rangeLabel}）`;
    plan.push({ day, name, wordIds: slice.map((w) => w.id), rangeLabel });
  }
  for (const p of plan) {
    const skip = existingNames.has(p.name) ? '  [SKIP — exists]' : '';
    console.log(`  Day ${String(p.day).padStart(2, '0')}: ${p.name}  words=${p.wordIds.length}${skip}`);
  }

  if (DRY_RUN) {
    console.log(`\n[DRY-RUN] not creating. Re-run without --dry-run to actually create.`);
    return;
  }

  console.log(`\n[6/6] Creating CustomQuizzes...`);
  let created = 0, skipped = 0, failed = 0;
  for (const p of plan) {
    if (existingNames.has(p.name)) { skipped++; continue; }
    const body = {
      name: p.name,
      fileId: file.id,
      wordIds: p.wordIds,
      questionTypes: QUESTION_TYPES,
      starMultiplier: STAR_MULTIPLIER,
      assignedProfileIds: [ian.id],
      durationDays: DURATION_DAYS,
    };
    const r = await fetch(`${BASE}/api/custom-quizzes`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      failed++;
      const t = await r.text();
      console.error(`  ✗ ${p.name}  status=${r.status}  ${t}`);
      continue;
    }
    const j = await r.json();
    created++;
    console.log(`  ✓ Day ${String(p.day).padStart(2, '0')}  id=${j.id}  words=${p.wordIds.length}`);
  }

  console.log(`\nDone. created=${created}  skipped=${skipped}  failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
