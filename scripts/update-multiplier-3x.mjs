// Update all "英文初級檢定 Day NN" custom quizzes to starMultiplier=3.0
// (server applies the same multiplier to EXP — see routes/pets.js bonusMultiplier).

const BASE = 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = '5520';
const NAME_PREFIX = '英文初級檢定 Day';
const NEW_MULTIPLIER = 3.0;

async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) { console.error('Login failed', loginData); process.exit(1); }
  const token = loginData.token;
  const headers = { 'Content-Type': 'application/json', 'x-teacher-token': token };

  const listRes = await fetch(`${BASE}/api/custom-quizzes`);
  const all = await listRes.json();
  const targets = all.filter((q) => q.name?.startsWith(NAME_PREFIX));
  console.log(`Found ${targets.length} matching quizzes. Updating to ${NEW_MULTIPLIER}x...`);

  let ok = 0, fail = 0;
  for (const q of targets) {
    const r = await fetch(`${BASE}/api/custom-quizzes/${q.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ starMultiplier: NEW_MULTIPLIER }),
    });
    if (r.ok) { ok++; console.log(`  ✓ ${q.name}`); }
    else { fail++; console.error(`  ✗ ${q.name}  status=${r.status}  ${await r.text()}`); }
  }
  console.log(`\nDone. updated=${ok} failed=${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
