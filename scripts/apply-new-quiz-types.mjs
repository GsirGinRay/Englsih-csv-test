// Update questionTypes for all 109 "英文初級檢定 Day NN-S" custom quizzes
// to [2, 4, 5, 8, 9] and update global Settings.questionTypes default to same.
//
// Usage: node scripts/apply-new-quiz-types.mjs

const BASE = 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = '5520';
const NAME_PREFIX = '英文初級檢定 Day';
const NEW_TYPES = [2, 4, 5, 8, 9];

async function main() {
  const r = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const j = await r.json();
  if (!j.success) { console.error('login failed', j); process.exit(1); }
  const headers = { 'Content-Type': 'application/json', 'x-teacher-token': j.token };

  // 1) Update all matching CustomQuizzes
  const all = await (await fetch(`${BASE}/api/custom-quizzes`)).json();
  const targets = all.filter((q) => q.name?.startsWith(NAME_PREFIX));
  console.log(`Found ${targets.length} quizzes. Updating questionTypes -> ${JSON.stringify(NEW_TYPES)}...`);
  let ok = 0, fail = 0;
  for (const q of targets) {
    const r = await fetch(`${BASE}/api/custom-quizzes/${q.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ questionTypes: NEW_TYPES }),
    });
    if (r.ok) { ok++; }
    else { fail++; console.error(`  ✗ ${q.name}  status=${r.status}  ${await r.text()}`); }
  }
  console.log(`Quizzes updated: ok=${ok} fail=${fail}`);

  // 2) Update global Settings.questionTypes default
  const sRes = await fetch(`${BASE}/api/settings`, {
    method: 'PUT', headers, body: JSON.stringify({ questionTypes: NEW_TYPES }),
  });
  if (sRes.ok) {
    console.log(`Settings.questionTypes -> ${JSON.stringify(NEW_TYPES)} ok`);
  } else {
    console.error(`Settings update failed: ${sRes.status} ${await sRes.text()}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
