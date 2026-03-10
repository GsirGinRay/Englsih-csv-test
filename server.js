import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PET_SPECIES } from './data/pets.js';

// Route modules
import createSettingsRouter from './routes/settings.js';
import createFilesRouter from './routes/files.js';
import createAuthRouter from './routes/auth.js';
import createQuizRouter from './routes/quiz.js';
import createGamificationRouter from './routes/gamification.js';
import createShopRouter from './routes/shop.js';
import createPetsRouter from './routes/pets.js';
import createRewardsRouter from './routes/rewards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API 回應禁止快取（避免 PWA/瀏覽器快取導致資料不同步）
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// 靜態檔案（前端）
app.use(express.static(join(__dirname, 'dist')));

// ============ 老師認證 ============

// 活躍的老師 session tokens（記憶體儲存，重啟後清除）
const teacherTokens = new Set();

// 產生安全的 token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// 老師認證中間件
const requireTeacher = (req, res, next) => {
  const token = req.headers['x-teacher-token'];
  if (!token || !teacherTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: teacher login required' });
  }
  next();
};

// ============ 掛載路由 ============

const deps = { prisma, requireTeacher, teacherTokens, generateToken };

app.use(createSettingsRouter(deps));
app.use(createFilesRouter(deps));
app.use(createAuthRouter(deps));
app.use(createQuizRouter(deps));
app.use(createGamificationRouter(deps));
app.use(createShopRouter(deps));
app.use(createPetsRouter(deps));
app.use(createRewardsRouter(deps));

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// 一次性遷移舊寵物（將無效物種轉為 spirit_dog）
async function migrateOldPets() {
  try {
    const validSpecies = PET_SPECIES.map(s => s.species);
    const oldPets = await prisma.pet.findMany({
      where: { species: { notIn: validSpecies } }
    });
    if (oldPets.length > 0) {
      await prisma.pet.updateMany({
        where: { species: { notIn: validSpecies } },
        data: { species: 'spirit_dog', name: '靈犬', evolutionPath: null }
      });
      console.log(`Migrated ${oldPets.length} old pets to spirit_dog`);
    }
  } catch (error) {
    console.error('Failed to migrate old pets:', error);
  }
}

// 一次性遷移：為已有裝備的玩家補建 ProfilePurchase 記錄
async function migrateEquipmentOwnership() {
  try {
    const allEquipment = await prisma.petEquipment.findMany({
      select: { profileId: true, itemId: true }
    });
    if (allEquipment.length === 0) return;

    let migrated = 0;
    for (const eq of allEquipment) {
      const existing = await prisma.profilePurchase.findUnique({
        where: { profileId_itemId: { profileId: eq.profileId, itemId: eq.itemId } }
      });
      if (!existing) {
        await prisma.profilePurchase.create({
          data: { profileId: eq.profileId, itemId: eq.itemId }
        });
        migrated++;
      }
    }
    if (migrated > 0) {
      console.log(`Migrated ${migrated} equipment ownership records to ProfilePurchase`);
    }
  } catch (error) {
    console.error('Failed to migrate equipment ownership:', error);
  }
}

// 一次性遷移：舊學科分類 → 星期元素
async function migrateOldCategories() {
  const map = {
    sports_action:  'mon',
    food_health:    'tue',
    nature_science: 'wed',
    tech_numbers:   'thu',
    arts_emotions:  'fri',
    adventure_geo:  'sat',
    mythology:      'sun',
    daily_life:     'sun',
  };
  const oldKeys = Object.keys(map);
  try {
    let total = 0;
    for (const [oldKey, newKey] of Object.entries(map)) {
      const files = await prisma.wordFile.updateMany({ where: { category: oldKey }, data: { category: newKey } });
      const quizzes = await prisma.customQuiz.updateMany({ where: { category: oldKey }, data: { category: newKey } });
      const sessions = await prisma.quizSession.updateMany({ where: { categoryUsed: oldKey }, data: { categoryUsed: newKey } });
      const count = files.count + quizzes.count + sessions.count;
      if (count > 0) {
        console.log(`  ${oldKey} → ${newKey}: ${count} records`);
        total += count;
      }
    }
    if (total > 0) console.log(`Migrated ${total} old category records to day elements`);
  } catch (error) {
    console.error('Failed to migrate old categories:', error);
  }
}

// 一次性修復：刪除因快速連擊 bug 導致的重複測驗星星獎勵
async function fixDuplicateQuizStars() {
  try {
    // 找出所有 source='quiz' 的星星紀錄，按學生和時間排序
    const adjustments = await prisma.starAdjustment.findMany({
      where: { source: 'quiz' },
      orderBy: [{ profileId: 'asc' }, { adjustedAt: 'asc' }],
      select: { id: true, profileId: true, amount: true, adjustedAt: true }
    });

    // 找出同學生、同金額、10秒內的重複紀錄（保留第一筆，標記後續為重複）
    const duplicateIds = [];
    const rollbackByProfile = {};
    for (let i = 1; i < adjustments.length; i++) {
      const prev = adjustments[i - 1];
      const curr = adjustments[i];
      if (prev.profileId !== curr.profileId) continue;
      const timeDiff = new Date(curr.adjustedAt).getTime() - new Date(prev.adjustedAt).getTime();
      if (timeDiff < 10000 && prev.amount === curr.amount && curr.amount > 0) {
        duplicateIds.push(curr.id);
        rollbackByProfile[curr.profileId] = (rollbackByProfile[curr.profileId] || 0) + curr.amount;
      }
    }

    if (duplicateIds.length === 0) return;

    // 在 transaction 中：扣回多得的星星 + 刪除重複紀錄
    const ops = [];
    for (const [profileId, amount] of Object.entries(rollbackByProfile)) {
      ops.push(prisma.profile.update({
        where: { id: profileId },
        data: { stars: { decrement: amount }, totalStars: { decrement: amount } }
      }));
    }
    ops.push(prisma.starAdjustment.deleteMany({ where: { id: { in: duplicateIds } } }));
    await prisma.$transaction(ops);

    // 確保星星不會變成負數
    await prisma.$executeRawUnsafe(`UPDATE "Profile" SET stars = 0 WHERE stars < 0`);
    await prisma.$executeRawUnsafe(`UPDATE "Profile" SET "totalStars" = 0 WHERE "totalStars" < 0`);

    const names = await prisma.profile.findMany({
      where: { id: { in: Object.keys(rollbackByProfile) } },
      select: { id: true, name: true }
    });
    const nameMap = Object.fromEntries(names.map(n => [n.id, n.name]));
    for (const [profileId, amount] of Object.entries(rollbackByProfile)) {
      console.log(`  ${nameMap[profileId] || profileId}: 扣回 ${amount} 顆重複星星`);
    }
    console.log(`Fixed ${duplicateIds.length} duplicate quiz star records`);
  } catch (error) {
    console.error('Failed to fix duplicate quiz stars:', error);
  }
}

// 一次性修復：重設 Eason 的轉盤狀態（PWA 快取導致前端未正確顯示結果）
async function resetEasonSpin() {
  try {
    const eason = await prisma.profile.findFirst({ where: { name: 'Eason' } });
    if (eason && eason.lastSpinAt) {
      await prisma.profile.update({ where: { id: eason.id }, data: { lastSpinAt: null } });
      console.log('Reset Eason lastSpinAt to null');
    }
  } catch (error) {
    console.error('Failed to reset Eason spin:', error);
  }
}

app.listen(PORT, async () => {
  await migrateOldPets();
  await migrateEquipmentOwnership();
  await migrateOldCategories();
  await fixDuplicateQuizStars();
  await resetEasonSpin();
});
