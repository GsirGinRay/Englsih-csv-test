// Poll the live app until the new backend + Word.distractors column are live.
// Strategy: create a tiny probe WordFile whose word carries distractors,
// read it back, confirm distractors round-trips, then delete the probe file.
// Exits 0 when live, 1 if it never went live within the time budget.

const BASE = process.env.APP_BASE || 'https://englsih-csv-test.zeabur.app';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '5520';
const PROBE_NAME = '__probe_distractors__';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login() {
  const r = await fetch(`${BASE}/api/auth/teacher-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEACHER_PASSWORD }),
  });
  if (!r.ok) throw new Error('login http ' + r.status);
  const j = await r.json();
  if (!j.success) throw new Error('login failed');
  return j.token;
}

async function cleanup(token) {
  try {
    const files = await (await fetch(`${BASE}/api/files`)).json();
    for (const f of files.filter((x) => x.name === PROBE_NAME)) {
      await fetch(`${BASE}/api/files/${f.id}`, { method: 'DELETE', headers: { 'x-teacher-token': token } });
    }
  } catch { /* ignore */ }
}

async function probeOnce() {
  const token = await login();
  await cleanup(token);
  const res = await fetch(`${BASE}/api/files`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teacher-token': token },
    body: JSON.stringify({ name: PROBE_NAME, words: [{ english: 'probe', chinese: '測試', distractors: 'a|b|c' }] }),
  });
  if (!res.ok) throw new Error('create http ' + res.status);
  const file = await res.json();
  const live = file?.words?.[0]?.distractors === 'a|b|c';
  await cleanup(token);
  return live;
}

const DEADLINE = Date.now() + 10 * 60 * 1000; // up to 10 min
let attempt = 0;
while (Date.now() < DEADLINE) {
  attempt++;
  try {
    const live = await probeOnce();
    if (live) { console.log(`LIVE after ${attempt} attempt(s): distractors column is active.`); process.exit(0); }
    console.log(`attempt ${attempt}: backend up but distractors NOT yet present (old build still serving). retrying...`);
  } catch (e) {
    console.log(`attempt ${attempt}: not ready (${e.message}). retrying...`);
  }
  await sleep(20000);
}
console.error('Timed out waiting for deploy to expose distractors.');
process.exit(1);
