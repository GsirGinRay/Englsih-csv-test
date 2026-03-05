/**
 * 遷移腳本：將舊學科分類 (daily_life, nature_science, ...) 轉換為新星期元素 (mon, tue, ...)
 *
 * 執行方式：node scripts/migrate-categories.js
 *
 * 影響的資料表：WordFile, CustomQuiz, QuizSession
 * 不會刪除任何資料，只更新 category 欄位。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 舊學科 → 新元素 對照（主題相近原則）
const MIGRATION_MAP = {
  sports_action:  'mon',  // 運動動作 → 🔥 火焰（熱血運動）
  food_health:    'tue',  // 飲食健康 → 💧 海洋（水與健康）
  nature_science: 'wed',  // 自然科學 → 🌿 森林（自然生態）
  tech_numbers:   'thu',  // 科技數字 → ⚡ 雷電（電力科技）
  arts_emotions:  'fri',  // 藝術情感 → ❄️ 冰霜（冰晶之美）
  adventure_geo:  'sat',  // 冒險地理 → 🪨 大地（地理探索）
  mythology:      'sun',  // 神話奇幻 → 🐉 龍族（神話龍族）
  daily_life:     'sun',  // 日常生活 → 🐉 龍族（週日日常）
};

const OLD_KEYS = Object.keys(MIGRATION_MAP);

async function migrate() {
  console.log('=== 開始遷移舊學科分類 → 星期元素 ===\n');

  // 1. WordFile
  const files = await prisma.wordFile.findMany({
    where: { category: { in: OLD_KEYS } },
    select: { id: true, name: true, category: true },
  });
  console.log(`WordFile：找到 ${files.length} 筆需要遷移`);
  for (const f of files) {
    const newCat = MIGRATION_MAP[f.category];
    await prisma.wordFile.update({ where: { id: f.id }, data: { category: newCat } });
    console.log(`  ${f.name}: ${f.category} → ${newCat}`);
  }

  // 2. CustomQuiz
  const quizzes = await prisma.customQuiz.findMany({
    where: { category: { in: OLD_KEYS } },
    select: { id: true, name: true, category: true },
  });
  console.log(`\nCustomQuiz：找到 ${quizzes.length} 筆需要遷移`);
  for (const q of quizzes) {
    const newCat = MIGRATION_MAP[q.category];
    await prisma.customQuiz.update({ where: { id: q.id }, data: { category: newCat } });
    console.log(`  ${q.name}: ${q.category} → ${newCat}`);
  }

  // 3. QuizSession（歷史記錄，categoryUsed 欄位）
  const sessions = await prisma.quizSession.findMany({
    where: { categoryUsed: { in: OLD_KEYS } },
    select: { id: true, categoryUsed: true },
  });
  console.log(`\nQuizSession：找到 ${sessions.length} 筆需要遷移`);
  if (sessions.length > 0) {
    // 批次更新，避免逐筆太慢
    for (const oldKey of OLD_KEYS) {
      const newKey = MIGRATION_MAP[oldKey];
      const result = await prisma.quizSession.updateMany({
        where: { categoryUsed: oldKey },
        data: { categoryUsed: newKey },
      });
      if (result.count > 0) {
        console.log(`  ${oldKey} → ${newKey}：${result.count} 筆`);
      }
    }
  }

  console.log('\n=== 遷移完成 ===');
}

migrate()
  .catch(e => { console.error('遷移失敗:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
