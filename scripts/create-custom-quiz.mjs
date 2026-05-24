// Generic custom-quiz creator: log in, find a WordFile by name (→ fileId + all wordIds),
// optionally assign to specific students by name/id, and POST /api/custom-quizzes.
// Reusable for any student.
//
// Usage:
//   node scripts/create-custom-quiz.mjs --file-name "Ian英檢測驗單字練習" --name "Ian 專屬英檢測驗" --assign Ian
//   ... --types 0,1,2,4,5,6,7,8   (default; renderable types)
//   ... --multiplier 1            (star multiplier 1-5, default 1)
//   ... --days 0                  (0 = never expires, default 0)
//
// Env overrides: APP_BASE, TEACHER_PASSWORD

const BASE = process.env.APP_BASE || 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '5520';

const args = process.argv.slice(2);
const argVal = (f) => { const i = args.indexOf(f); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

const fileName = argVal('--file-name');
const quizName = argVal('--name');
const assign = argVal('--assign');              // student name OR profile id (optional)
const types = (argVal('--types') || '0,1,2,4,5,6,7,8').split(',').map((s) => Number(s.trim()));
const multiplier = argVal('--multiplier') ? Number(argVal('--multiplier')) : 1;
const days = argVal('--days') ? Number(argVal('--days')) : 0;

if (!fileName || !quizName) {
  console.error('Usage: node scripts/create-custom-quiz.mjs --file-name "<WordFile>" --name "<quiz name>" [--assign <student>] [--types a,b,c] [--multiplier N] [--days N]');
  process.exit(1);
}

async function login() {
  const r = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('teacher login failed');
  return j.token;
}

async function main() {
  const files = await (await fetch(`${BASE}/api/files`)).json();
  const file = files.find((f) => f.name === fileName);
  if (!file) { console.error(`No WordFile named "${fileName}"`); process.exit(1); }
  const wordIds = file.words.map((w) => w.id);
  console.log(`File "${fileName}" id=${file.id} words=${wordIds.length}`);

  let assignedProfileIds = [];
  if (assign) {
    const profiles = await (await fetch(`${BASE}/api/profiles?light=true`)).json();
    const hit = profiles.find((p) => p.id === assign || p.name === assign);
    if (!hit) { console.error(`No profile matching "${assign}". Available: ${profiles.map((p) => p.name).join(', ')}`); process.exit(1); }
    assignedProfileIds = [hit.id];
    console.log(`Assigned exclusively to: ${hit.name} (${hit.id})`);
  } else {
    console.log('Assigned to: ALL students (no --assign given)');
  }

  const token = await login();
  const body = {
    name: quizName, fileId: file.id, wordIds,
    questionTypes: types, starMultiplier: multiplier,
    assignedProfileIds, durationDays: days,
  };
  const res = await fetch(`${BASE}/api/custom-quizzes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teacher-token': token },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.error('create quiz failed', res.status, await res.text().catch(() => '')); process.exit(1); }
  const quiz = await res.json();
  console.log(`\nCreated quiz id=${quiz.id} name="${quiz.name}"`);
  console.log(`  types=${quiz.questionTypes}  multiplier=${quiz.starMultiplier}  expires=${quiz.expiresAt || 'never'}`);
  console.log(`  assignedProfileIds=${JSON.stringify(quiz.assignedProfileIds)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
