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

app.listen(PORT, async () => {
  await migrateOldPets();
});
