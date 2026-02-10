import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { BADGES } from './data/badges.js';
import { SHOP_ITEMS, CONSUMABLE_ITEMS, CHEST_SHOP_ITEMS } from './data/shop.js';
import { EQUIPMENT_ITEMS } from './data/equipment.js';
import { QUIZ_CATEGORIES, calculateTypeBonus } from './data/categories.js';
import { PET_STAGES, PET_SPECIES, getExpForLevel, calculateRpgStats, getPetTypes, getStagesForPet, calculatePetStatus } from './data/pets.js';
import { TITLES, STICKER_SERIES, CHEST_CONFIG, WHEEL_REWARDS, weightedRandom, getAllStickers, getRandomSticker } from './data/rewards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// ============ SRS 間隔重複系統工具函數 ============

// 艾賓浩斯遺忘曲線複習間隔（天數）
const REVIEW_INTERVALS = {
  1: 1,    // Level 1: 1 天
  2: 3,    // Level 2: 3 天
  3: 7,    // Level 3: 7 天
  4: 14,   // Level 4: 14 天
  5: 30,   // Level 5: 30 天
  6: 60    // Level 6+: 60 天
};

function calculateNextReview(currentLevel, isCorrect) {
  const now = new Date();

  let newLevel;
  if (isCorrect) {
    // 答對：提升等級（最高 6）
    newLevel = Math.min(currentLevel + 1, 6);
  } else {
    // 答錯：降低等級（最低 1）
    newLevel = Math.max(currentLevel - 1, 1);
  }

  const days = REVIEW_INTERVALS[newLevel] || 60;
  const nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return { newLevel, nextReviewAt };
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 靜態檔案（前端）
app.use(express.static(join(__dirname, 'dist')));

// ============ 系統設定 API ============

// 取得設定
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'global' }
      });
    }

    // 向後相容：如果新欄位未設定，使用舊的 timePerQuestion
    if (settings.timeChoiceQuestion === null || settings.timeChoiceQuestion === undefined) {
      settings = await prisma.settings.update({
        where: { id: 'global' },
        data: {
          timeChoiceQuestion: settings.timePerQuestion || 10,
          timeSpellingQuestion: (settings.timePerQuestion || 10) * 2 // 拼寫題預設較長
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// 更新設定
app.put('/api/settings', async (req, res) => {
  try {
    const { teacherPassword, timePerQuestion, timeChoiceQuestion, timeSpellingQuestion, questionCount, questionTypes, unlockedPetRarities } = req.body;
    const updateData = {
      teacherPassword,
      timePerQuestion,
      timeChoiceQuestion,
      timeSpellingQuestion,
      questionCount,
      questionTypes
    };
    if (unlockedPetRarities !== undefined) {
      updateData.unlockedPetRarities = unlockedPetRarities;
    }
    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        teacherPassword,
        timePerQuestion,
        timeChoiceQuestion: timeChoiceQuestion || 10,
        timeSpellingQuestion: timeSpellingQuestion || 30,
        questionCount,
        questionTypes,
        unlockedPetRarities: unlockedPetRarities || ['normal', 'rare', 'legendary']
      }
    });
    res.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============ 學科分類 API ============

// 取得所有學科分類
app.get('/api/quiz-categories', (req, res) => {
  res.json(QUIZ_CATEGORIES);
});

// 設定檔案學科分類
app.put('/api/files/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;
    if (category && !QUIZ_CATEGORIES[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const file = await prisma.wordFile.update({
      where: { id },
      data: { category: category || null },
      include: { words: true }
    });
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update file category' });
  }
});

// ============ 檔案 API ============

// 取得所有檔案
app.get('/api/files', async (req, res) => {
  try {
    const files = await prisma.wordFile.findMany({
      include: { words: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(files);
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// 新增檔案
app.post('/api/files', async (req, res) => {
  try {
    const { name, words, category } = req.body;
    const file = await prisma.wordFile.create({
      data: {
        name,
        category: (category && QUIZ_CATEGORIES[category]) ? category : null,
        words: {
          create: words.map(w => ({
            english: w.english,
            chinese: w.chinese,
            partOfSpeech: w.partOfSpeech || null,
            exampleSentence: w.exampleSentence || null
          }))
        }
      },
      include: { words: true }
    });
    res.json(file);
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// 刪除檔案
app.delete('/api/files/:id', async (req, res) => {
  try {
    await prisma.wordFile.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// 新增單字到現有檔案（自動去重複）
app.post('/api/files/:id/words', async (req, res) => {
  try {
    const { words } = req.body;
    const fileId = req.params.id;

    // 確認檔案存在並取得現有單字
    const file = await prisma.wordFile.findUnique({
      where: { id: fileId },
      include: { words: true }
    });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 取得現有單字的英文（轉小寫比對）
    const existingEnglish = new Set(file.words.map(w => w.english.toLowerCase()));

    // 過濾掉重複的單字
    const newWords = words.filter(w => !existingEnglish.has(w.english.toLowerCase()));
    const duplicateCount = words.length - newWords.length;

    // 新增不重複的單字
    if (newWords.length > 0) {
      await prisma.word.createMany({
        data: newWords.map(w => ({
          english: w.english,
          chinese: w.chinese,
          partOfSpeech: w.partOfSpeech || null,
          exampleSentence: w.exampleSentence || null,
          fileId: fileId
        }))
      });
    }

    // 回傳更新後的檔案
    const updatedFile = await prisma.wordFile.findUnique({
      where: { id: fileId },
      include: { words: true }
    });

    res.json({ ...updatedFile, _addedCount: newWords.length, _duplicateCount: duplicateCount });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to add words' });
  }
});

// ============ 認證 API ============

// 學生登入
app.post('/api/auth/student-login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const profile = await prisma.profile.findFirst({
      where: { name },
      include: {
        progress: { include: { history: true } },
        quizSessions: { include: { results: true } },
        masteredWords: true
      }
    });
    if (!profile) {
      return res.json({ notFound: true });
    }
    if (profile.password && profile.password !== (password || '')) {
      return res.json({ wrongPassword: true });
    }
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// 學生註冊
app.post('/api/auth/student-register', async (req, res) => {
  try {
    const { name, password } = req.body;
    const existing = await prisma.profile.findFirst({ where: { name } });
    if (existing) {
      return res.json({ duplicate: true });
    }
    const profile = await prisma.profile.create({
      data: { name, password: password || null },
      include: {
        progress: { include: { history: true } },
        quizSessions: { include: { results: true } },
        masteredWords: true
      }
    });
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 老師登入
app.post('/api/auth/teacher-login', async (req, res) => {
  try {
    const { password } = req.body;
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const correctPassword = settings?.teacherPassword || '1234';
    if (password === correctPassword) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ 學生 API ============

// 取得所有學生
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        progress: { include: { history: true } },
        quizSessions: { include: { results: true } },
        masteredWords: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(profiles);
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to get profiles' });
  }
});

// 新增學生
app.post('/api/profiles', async (req, res) => {
  try {
    const { name, password } = req.body;
    const profile = await prisma.profile.create({
      data: { name, password: password || null },
      include: {
        progress: { include: { history: true } },
        quizSessions: { include: { results: true } },
        masteredWords: true
      }
    });
    res.json(profile);
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// 刪除學生
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    await prisma.profile.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// ============ 測驗進度 API ============

// 儲存測驗結果
app.post('/api/quiz-results', async (req, res) => {
  try {
    const { profileId, fileId, duration, completed, results, weakWordIds, correctWordIds, customQuizId, customQuizName, companionPetId, categoryUsed, typeBonus } = req.body;

    // 建立測驗記錄
    const session = await prisma.quizSession.create({
      data: {
        profileId,
        fileId,
        duration,
        completed,
        customQuizId: customQuizId || null,
        customQuizName: customQuizName || null,
        companionPetId: companionPetId || null,
        categoryUsed: categoryUsed || null,
        typeBonus: typeBonus || null,
        results: {
          create: results.map(r => ({
            wordId: r.wordId,
            correct: r.correct,
            questionType: r.questionType,
            timeSpent: r.timeSpent
          }))
        }
      },
      include: { results: true }
    });

    // 更新檔案進度
    const correctCount = results.filter(r => r.correct).length;
    const wrongCount = results.length - correctCount;
    const rate = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

    const existingProgress = await prisma.fileProgress.findUnique({
      where: { profileId_fileId: { profileId, fileId } }
    });

    if (existingProgress) {
      // 更新現有進度
      let newWeakIds = [...existingProgress.weakWordIds];
      weakWordIds.forEach(id => {
        if (!newWeakIds.includes(id)) newWeakIds.push(id);
      });
      newWeakIds = newWeakIds.filter(id => !correctWordIds.includes(id));

      await prisma.fileProgress.update({
        where: { id: existingProgress.id },
        data: {
          correct: existingProgress.correct + correctCount,
          wrong: existingProgress.wrong + wrongCount,
          weakWordIds: newWeakIds,
          history: {
            create: { rate }
          }
        }
      });
    } else {
      // 建立新進度
      await prisma.fileProgress.create({
        data: {
          profileId,
          fileId,
          correct: correctCount,
          wrong: wrongCount,
          weakWordIds,
          history: {
            create: { rate }
          }
        }
      });
    }

    // 更新週挑戰進度（題數）
    const weekStart = getWeekStartDate(new Date());
    try {
      await prisma.weeklyChallenge.upsert({
        where: {
          profileId_weekStart: { profileId, weekStart }
        },
        update: {
          progressQuiz: { increment: results.length }
        },
        create: {
          profileId,
          weekStart,
          targetWords: 20,
          targetQuiz: 50,
          targetDays: 5,
          progressQuiz: results.length
        }
      });
    } catch {
      // 忽略週挑戰更新錯誤（表可能尚未建立）
    }

    res.json({ success: true, session });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to save quiz results' });
  }
});

// 週開始日期輔助函數（與下面的 getWeekStart 功能相同，但避免重複定義）
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ============ 精熟單字 API（間隔重複系統）============

// 新增精熟單字（首次精熟，Level 1）
app.post('/api/mastered-words', async (req, res) => {
  try {
    const { profileId, wordIds } = req.body;

    // 輸入驗證
    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Invalid profileId' });
    }
    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ error: 'wordIds must be a non-empty array' });
    }
    if (!wordIds.every(id => typeof id === 'string')) {
      return res.status(400).json({ error: 'All wordIds must be strings' });
    }

    const now = new Date();
    const { nextReviewAt } = calculateNextReview(0, true); // 新單字從 Level 1 開始

    for (const wordId of wordIds) {
      // 檢查是否已存在
      const existing = await prisma.masteredWord.findUnique({
        where: { profileId_wordId: { profileId, wordId } }
      });

      if (existing) {
        // 已存在：更新 SRS 等級（複習答對）
        const { newLevel, nextReviewAt: newNextReview } = calculateNextReview(existing.level, true);
        await prisma.masteredWord.update({
          where: { profileId_wordId: { profileId, wordId } },
          data: {
            level: newLevel,
            lastReviewedAt: now,
            nextReviewAt: newNextReview,
            reviewCount: { increment: 1 },
            correctStreak: { increment: 1 }
          }
        });
      } else {
        // 不存在：建立新記錄
        await prisma.masteredWord.create({
          data: {
            profileId,
            wordId,
            level: 1,
            masteredAt: now,
            lastReviewedAt: now,
            nextReviewAt,
            reviewCount: 0,
            correctStreak: 0
          }
        });

        // 更新週挑戰進度（新精熟單字數）
        const weekStart = getWeekStartDate(new Date());
        try {
          await prisma.weeklyChallenge.upsert({
            where: {
              profileId_weekStart: { profileId, weekStart }
            },
            update: {
              progressWords: { increment: 1 }
            },
            create: {
              profileId,
              weekStart,
              targetWords: 20,
              targetQuiz: 50,
              targetDays: 5,
              progressWords: 1
            }
          });
        } catch {
          // 忽略週挑戰更新錯誤
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to add mastered words:', error);
    res.status(500).json({ error: 'Failed to add mastered words' });
  }
});

// 移除精熟單字
app.delete('/api/mastered-words/:profileId/:wordId', async (req, res) => {
  try {
    const { profileId, wordId } = req.params;
    await prisma.masteredWord.delete({
      where: { profileId_wordId: { profileId, wordId } }
    });
    res.json({ success: true });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to remove mastered word' });
  }
});

// 取得到期需複習的單字
app.get('/api/profiles/:profileId/due-words', async (req, res) => {
  try {
    const { profileId } = req.params;
    const now = new Date();

    const dueWords = await prisma.masteredWord.findMany({
      where: {
        profileId,
        nextReviewAt: { lte: now }
      },
      orderBy: { nextReviewAt: 'asc' }
    });

    res.json(dueWords);
  } catch (error) {
    console.error('Failed to get due words:', error);
    res.status(500).json({ error: 'Failed to get due words' });
  }
});

// 記錄複習結果並更新 SRS 等級
app.post('/api/mastered-words/:profileId/:wordId/review', async (req, res) => {
  try {
    const { profileId, wordId } = req.params;
    const { correct } = req.body;

    // 輸入驗證
    if (typeof correct !== 'boolean') {
      return res.status(400).json({ error: 'correct must be a boolean' });
    }

    const now = new Date();

    const masteredWord = await prisma.masteredWord.findUnique({
      where: { profileId_wordId: { profileId, wordId } }
    });

    if (!masteredWord) {
      return res.status(404).json({ error: 'Mastered word not found' });
    }

    const { newLevel, nextReviewAt } = calculateNextReview(masteredWord.level, correct);

    const updated = await prisma.masteredWord.update({
      where: { profileId_wordId: { profileId, wordId } },
      data: {
        level: newLevel,
        lastReviewedAt: now,
        nextReviewAt,
        reviewCount: { increment: 1 },
        correctStreak: correct ? masteredWord.correctStreak + 1 : 0
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// 重置所有精熟單字
app.delete('/api/mastered-words/:profileId', async (req, res) => {
  try {
    await prisma.masteredWord.deleteMany({
      where: { profileId: req.params.profileId }
    });
    res.json({ success: true });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to reset mastered words' });
  }
});

// ============ 自訂測驗 API ============

// 取得所有自訂測驗
app.get('/api/custom-quizzes', async (req, res) => {
  try {
    const quizzes = await prisma.customQuiz.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(quizzes);
  } catch (error) {
    console.error('Failed to get custom quizzes:', error);
    res.status(500).json({ error: 'Failed to get custom quizzes' });
  }
});

// 取得啟用中的自訂測驗（給學生用）
app.get('/api/custom-quizzes/active', async (req, res) => {
  try {
    const quizzes = await prisma.customQuiz.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quizzes);
  } catch (error) {
    console.error('Failed to get active custom quizzes:', error);
    res.status(500).json({ error: 'Failed to get active custom quizzes' });
  }
});

// 建立自訂測驗
app.post('/api/custom-quizzes', async (req, res) => {
  try {
    const { name, fileId, wordIds, questionTypes, starMultiplier } = req.body;

    // 輸入驗證
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '請輸入測驗名稱' });
    }
    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: '請選擇單字檔案' });
    }
    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ error: '請至少選擇一個單字' });
    }
    if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
      return res.status(400).json({ error: '請至少選擇一種題型' });
    }
    if (starMultiplier !== undefined && (typeof starMultiplier !== 'number' || starMultiplier < 1 || starMultiplier > 5)) {
      return res.status(400).json({ error: '星星倍率必須在 1 到 5 之間' });
    }

    const quiz = await prisma.customQuiz.create({
      data: {
        name: name.trim(),
        fileId,
        wordIds,
        questionTypes,
        active: true,
        ...(starMultiplier !== undefined && { starMultiplier })
      }
    });

    res.json(quiz);
  } catch (error) {
    console.error('Failed to create custom quiz:', error);
    res.status(500).json({ error: 'Failed to create custom quiz' });
  }
});

// 更新自訂測驗（啟用/停用）
app.put('/api/custom-quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, wordIds, questionTypes, active, starMultiplier } = req.body;

    if (starMultiplier !== undefined && (typeof starMultiplier !== 'number' || starMultiplier < 1 || starMultiplier > 5)) {
      return res.status(400).json({ error: '星星倍率必須在 1 到 5 之間' });
    }

    const quiz = await prisma.customQuiz.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(wordIds !== undefined && { wordIds }),
        ...(questionTypes !== undefined && { questionTypes }),
        ...(active !== undefined && { active }),
        ...(starMultiplier !== undefined && { starMultiplier })
      }
    });

    res.json(quiz);
  } catch (error) {
    console.error('Failed to update custom quiz:', error);
    res.status(500).json({ error: 'Failed to update custom quiz' });
  }
});

// 刪除自訂測驗
app.delete('/api/custom-quizzes/:id', async (req, res) => {
  try {
    await prisma.customQuiz.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete custom quiz:', error);
    res.status(500).json({ error: 'Failed to delete custom quiz' });
  }
});

// ============ 遊戲化系統 API ============

// 計算連續登入獎勵
function getLoginStreakReward(streak) {
  if (streak === 3) return 10;
  if (streak === 7) return 20;
  if (streak === 14) return 50;
  if (streak === 30) return 100;
  if (streak % 30 === 0) return 100; // 每 30 天給 100
  return 5; // 一般每天 5 星星
}

// 生成每日任務
function generateDailyQuests() {
  const questTemplates = [
    { type: 'quiz_count', target: 10, reward: 5, label: '完成 10 題測驗' },
    { type: 'quiz_count', target: 20, reward: 8, label: '完成 20 題測驗' },
    { type: 'review_count', target: 5, reward: 5, label: '複習 5 個待複習單字' },
    { type: 'review_count', target: 10, reward: 8, label: '複習 10 個待複習單字' },
    { type: 'correct_streak', target: 5, reward: 10, label: '連續答對 5 題' },
    { type: 'correct_streak', target: 10, reward: 15, label: '連續答對 10 題' },
    { type: 'accuracy', target: 80, reward: 8, label: '單次測驗正確率達 80%' },
    { type: 'accuracy', target: 100, reward: 15, label: '單次測驗 100% 正確' },
  ];

  // 隨機選 3 個不同類型的任務
  const shuffled = questTemplates.sort(() => Math.random() - 0.5);
  const selected = [];
  const usedTypes = new Set();

  for (const quest of shuffled) {
    if (!usedTypes.has(quest.type) && selected.length < 3) {
      selected.push(quest);
      usedTypes.add(quest.type);
    }
  }

  // 如果不夠 3 個，補充
  while (selected.length < 3) {
    const quest = shuffled[selected.length];
    selected.push(quest);
  }

  return selected;
}

// 檢查並更新登入狀態（學生登入時呼叫）
app.post('/api/profiles/:id/check-login', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findUnique({ where: { id } });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLogin = profile.lastLoginAt ? new Date(profile.lastLoginAt) : null;
    let newStreak = profile.loginStreak;
    let starsEarned = 0;
    let isNewDay = false;

    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // 同一天，不更新
        isNewDay = false;
      } else if (diffDays === 1) {
        // 連續登入
        newStreak = profile.loginStreak + 1;
        starsEarned = getLoginStreakReward(newStreak);
        isNewDay = true;
      } else {
        // 中斷了，重新計算
        newStreak = 1;
        starsEarned = getLoginStreakReward(1);
        isNewDay = true;
      }
    } else {
      // 第一次登入
      newStreak = 1;
      starsEarned = getLoginStreakReward(1);
      isNewDay = true;
    }

    // 更新 profile
    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        loginStreak: newStreak,
        stars: { increment: starsEarned },
        totalStars: { increment: starsEarned }
      },
      include: {
        progress: { include: { history: true } },
        quizSessions: { include: { results: true } },
        masteredWords: true,
        dailyQuests: true
      }
    });

    // 檢查今日每日任務是否存在
    let dailyQuest = await prisma.dailyQuest.findUnique({
      where: { profileId_date: { profileId: id, date: today } }
    });

    // 如果不存在，生成新的每日任務
    if (!dailyQuest) {
      const quests = generateDailyQuests();
      dailyQuest = await prisma.dailyQuest.create({
        data: {
          profileId: id,
          date: today,
          quest1Type: quests[0].type,
          quest1Target: quests[0].target,
          quest1Reward: quests[0].reward,
          quest2Type: quests[1].type,
          quest2Target: quests[1].target,
          quest2Reward: quests[1].reward,
          quest3Type: quests[2].type,
          quest3Target: quests[2].target,
          quest3Reward: quests[2].reward,
        }
      });
    }

    // 更新週挑戰學習天數（每天只計算一次）
    if (isNewDay) {
      const weekStart = getWeekStartDate(new Date());
      try {
        const challenge = await prisma.weeklyChallenge.findUnique({
          where: {
            profileId_weekStart: { profileId: id, weekStart }
          }
        });

        if (challenge) {
          // 檢查是否今天已經計算過
          const lastActive = challenge.lastActiveDate ? new Date(challenge.lastActiveDate) : null;
          if (!lastActive || lastActive.getTime() !== today.getTime()) {
            await prisma.weeklyChallenge.update({
              where: { id: challenge.id },
              data: {
                progressDays: { increment: 1 },
                lastActiveDate: today
              }
            });
          }
        } else {
          // 創建新的週挑戰
          await prisma.weeklyChallenge.create({
            data: {
              profileId: id,
              weekStart,
              targetWords: 20,
              targetQuiz: 50,
              targetDays: 5,
              progressDays: 1,
              lastActiveDate: today
            }
          });
        }
      } catch {
        // 忽略週挑戰更新錯誤
      }
    }

    res.json({
      profile: updatedProfile,
      dailyQuest,
      loginReward: isNewDay ? { stars: starsEarned, streak: newStreak } : null
    });
  } catch (error) {
    console.error('Failed to check login:', error);
    res.status(500).json({ error: 'Failed to check login' });
  }
});

// 取得今日每日任務
app.get('/api/profiles/:id/daily-quest', async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyQuest = await prisma.dailyQuest.findUnique({
      where: { profileId_date: { profileId: id, date: today } }
    });

    if (!dailyQuest) {
      const quests = generateDailyQuests();
      dailyQuest = await prisma.dailyQuest.create({
        data: {
          profileId: id,
          date: today,
          quest1Type: quests[0].type,
          quest1Target: quests[0].target,
          quest1Reward: quests[0].reward,
          quest2Type: quests[1].type,
          quest2Target: quests[1].target,
          quest2Reward: quests[1].reward,
          quest3Type: quests[2].type,
          quest3Target: quests[2].target,
          quest3Reward: quests[2].reward,
        }
      });
    }

    res.json(dailyQuest);
  } catch (error) {
    console.error('Failed to get daily quest:', error);
    res.status(500).json({ error: 'Failed to get daily quest' });
  }
});

// 更新每日任務進度
app.post('/api/profiles/:id/update-quest-progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { questType, value } = req.body; // value: 進度增量或直接值

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyQuest = await prisma.dailyQuest.findUnique({
      where: { profileId_date: { profileId: id, date: today } }
    });

    if (!dailyQuest) {
      return res.status(404).json({ error: 'Daily quest not found' });
    }

    const updates = {};
    let starsEarned = 0;

    // 更新對應任務的進度
    const questFields = [
      { type: 'quest1Type', progress: 'quest1Progress', target: 'quest1Target', reward: 'quest1Reward', done: 'quest1Done' },
      { type: 'quest2Type', progress: 'quest2Progress', target: 'quest2Target', reward: 'quest2Reward', done: 'quest2Done' },
      { type: 'quest3Type', progress: 'quest3Progress', target: 'quest3Target', reward: 'quest3Reward', done: 'quest3Done' },
    ];

    for (const field of questFields) {
      if (dailyQuest[field.type] === questType && !dailyQuest[field.done]) {
        const newProgress = questType === 'accuracy'
          ? Math.max(dailyQuest[field.progress], value) // accuracy 取最大值
          : dailyQuest[field.progress] + value; // 其他累加

        updates[field.progress] = newProgress;

        // 檢查是否完成
        if (newProgress >= dailyQuest[field.target]) {
          updates[field.done] = true;
          starsEarned += dailyQuest[field.reward];
        }
      }
    }

    // 更新任務
    const updatedQuest = await prisma.dailyQuest.update({
      where: { profileId_date: { profileId: id, date: today } },
      data: updates
    });

    // 檢查是否全部完成
    const allDone = updatedQuest.quest1Done && updatedQuest.quest2Done && updatedQuest.quest3Done;
    if (allDone && !updatedQuest.allCompleted) {
      await prisma.dailyQuest.update({
        where: { profileId_date: { profileId: id, date: today } },
        data: { allCompleted: true }
      });
      starsEarned += 10; // 全完成額外獎勵
    }

    // 發放星星
    if (starsEarned > 0) {
      await prisma.profile.update({
        where: { id },
        data: {
          stars: { increment: starsEarned },
          totalStars: { increment: starsEarned }
        }
      });
    }

    res.json({ quest: updatedQuest, starsEarned });
  } catch (error) {
    console.error('Failed to update quest progress:', error);
    res.status(500).json({ error: 'Failed to update quest progress' });
  }
});

// ============ 積分制度 Helper Functions ============

// 根據單字熟悉度計算倍率
function getWordFamiliarityMultiplier(correctCount, masteredLevel) {
  if (correctCount === 0) return 2;          // 全新單字 2x
  if (correctCount <= 2) return 1;           // 部分學過 1x
  if (correctCount <= 5 && masteredLevel < 3) return 0.5; // 熟悉 0.5x
  return 0;                                   // 近乎精熟 0x
}

// 根據冷卻計算倍率（防刷）
function getCooldownMultiplier(attemptCount, firstAttemptAt) {
  // 超過 30 分鐘重置
  const minutesSinceFirst = (Date.now() - new Date(firstAttemptAt).getTime()) / (1000 * 60);
  if (minutesSinceFirst > 30) return 1;

  if (attemptCount <= 1) return 1;
  if (attemptCount === 2) return 0.5;
  if (attemptCount === 3) return 0.25;
  return 0; // 第 4 次以後
}

// 發放測驗星星獎勵（含防刷+熟悉度機制）
app.post('/api/profiles/:id/award-stars', async (req, res) => {
  try {
    const { id } = req.params;
    const { correctCount, totalCount, starsFromQuiz, fileId, wordResults, doubleStarActive, difficultyMultiplier, bonusMultiplier, companionPetId, category } = req.body;

    // 向後相容：若無 wordResults，使用舊邏輯
    if (!wordResults || !fileId) {
      let totalStarsOld = starsFromQuiz || correctCount;
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      if (accuracy === 100 && totalCount >= 5) {
        totalStarsOld += 5;
      } else if (accuracy >= 80) {
        totalStarsOld += 2;
      }
      const updatedProfile = await prisma.profile.update({
        where: { id },
        data: {
          stars: { increment: totalStarsOld },
          totalStars: { increment: totalStarsOld }
        }
      });
      return res.json({ starsEarned: totalStarsOld, newTotal: updatedProfile.stars, cooldownMultiplier: 1 });
    }

    // === 新積分邏輯 ===

    // 1. 查詢/更新冷卻
    let cooldown = await prisma.quizCooldown.findUnique({
      where: { profileId_fileId: { profileId: id, fileId } }
    });

    const now = new Date();
    let cooldownMultiplier = 1;

    if (cooldown) {
      const minutesSinceFirst = (now.getTime() - new Date(cooldown.firstAttemptAt).getTime()) / (1000 * 60);
      if (minutesSinceFirst > 30) {
        // 超過 30 分鐘，重置
        cooldown = await prisma.quizCooldown.update({
          where: { id: cooldown.id },
          data: { attemptCount: 1, firstAttemptAt: now, lastAttemptAt: now }
        });
        cooldownMultiplier = 1;
      } else {
        cooldown = await prisma.quizCooldown.update({
          where: { id: cooldown.id },
          data: { attemptCount: { increment: 1 }, lastAttemptAt: now }
        });
        cooldownMultiplier = getCooldownMultiplier(cooldown.attemptCount, cooldown.firstAttemptAt);
      }
    } else {
      cooldown = await prisma.quizCooldown.create({
        data: { profileId: id, fileId, attemptCount: 1, firstAttemptAt: now, lastAttemptAt: now }
      });
      cooldownMultiplier = 1;
    }

    // 2. 批次查詢 WordAttempt + MasteredWord
    const wordIds = wordResults.map(w => w.wordId);
    const [existingAttempts, existingMastered] = await Promise.all([
      prisma.wordAttempt.findMany({
        where: { profileId: id, wordId: { in: wordIds } }
      }),
      prisma.masteredWord.findMany({
        where: { profileId: id, wordId: { in: wordIds } }
      })
    ]);

    const attemptMap = new Map(existingAttempts.map(a => [a.wordId, a]));
    const masteredMap = new Map(existingMastered.map(m => [m.wordId, m]));

    // 3. 計算每字星星（含熟悉度倍率）
    let baseStars = 0;
    for (const wr of wordResults) {
      if (!wr.correct) continue;
      const attempt = attemptMap.get(wr.wordId);
      const mastered = masteredMap.get(wr.wordId);
      const famMultiplier = getWordFamiliarityMultiplier(
        attempt?.correctCount || 0,
        mastered?.level || 0
      );
      baseStars += famMultiplier; // 每答對一題的基礎分 × 熟悉度倍率
    }

    // 4. 準確率 bonus
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    let accuracyBonus = 0;
    if (accuracy === 100 && totalCount >= 5) {
      accuracyBonus = 5;
    } else if (accuracy >= 80) {
      accuracyBonus = 2;
    }

    // 5. 套用冷卻倍率
    let finalStars = Math.round((baseStars + accuracyBonus) * cooldownMultiplier);

    // 6. 套用雙倍星星、難度倍率和加分測驗倍率
    if (doubleStarActive) finalStars *= 2;
    if (difficultyMultiplier && difficultyMultiplier > 1) {
      finalStars = Math.round(finalStars * difficultyMultiplier);
    }
    if (bonusMultiplier && bonusMultiplier > 1) {
      finalStars = Math.round(finalStars * bonusMultiplier);
    }

    // 6.5 套用寵物裝備星星加成
    // 使用助陣寵物（若有指定），否則使用展示中的寵物
    let companionPet = null;
    if (companionPetId) {
      companionPet = await prisma.pet.findFirst({
        where: { id: companionPetId, profileId: id },
        include: { equipment: true }
      });
    }
    if (!companionPet) {
      companionPet = await prisma.pet.findFirst({
        where: { profileId: id, isActive: true },
        include: { equipment: true }
      });
    }
    let equipStarsBonus = 0;
    if (companionPet) {
      for (const eq of (companionPet.equipment || [])) {
        const itemDef = EQUIPMENT_ITEMS.find(e => e.id === eq.itemId);
        if (itemDef && itemDef.bonusType === 'stars') {
          equipStarsBonus += itemDef.bonusValue;
        }
      }
      if (equipStarsBonus > 0) {
        finalStars = Math.round(finalStars * (1 + equipStarsBonus / 100));
      }
    }

    // 6.6 套用屬性加成（寵物 vs 學科分類）
    let typeBonusMultiplier = 1.0;
    if (companionPet && category) {
      const petTypes = getPetTypes(companionPet.species, companionPet.evolutionPath, companionPet.stage);
      typeBonusMultiplier = calculateTypeBonus(petTypes, category);
      if (typeBonusMultiplier !== 1.0) {
        finalStars = Math.round(finalStars * typeBonusMultiplier);
      }
    }

    // 6.7 套用寵物能力加成
    let abilityBonus = 0;
    if (companionPet) {
      const speciesInfo = PET_SPECIES.find(s => s.species === companionPet.species);
      if (speciesInfo) {
        switch (companionPet.species) {
          case 'crystal_beast': // 水晶共鳴：所有測驗獎勵+15%
            finalStars = Math.round(finalStars * 1.15);
            abilityBonus = Math.round(finalStars * 0.15 / 1.15);
            break;
          case 'sky_dragon': // 龍威：滿分測驗星星+30%
            if (accuracy === 100 && totalCount >= 5) {
              finalStars = Math.round(finalStars * 1.30);
              abilityBonus = Math.round(finalStars * 0.30 / 1.30);
            }
            break;
          case 'dune_bug': // 沙漠潛行：測驗後額外獲得1星星
            finalStars += 1;
            abilityBonus = 1;
            break;
          case 'mimic_lizard': // 變色偽裝：隨機獲得雙倍星星10%
            if (Math.random() < 0.10) {
              abilityBonus = finalStars;
              finalStars *= 2;
            }
            break;
          case 'electric_mouse': // 靜電感應：連對加成+5%
            if (correctCount === totalCount && totalCount >= 3) {
              const streakBonus = Math.round(finalStars * 0.05);
              finalStars += streakBonus;
              abilityBonus = streakBonus;
            }
            break;
          case 'beetle': // 硬殼防禦：扣分減少10%（此處體現為少扣一些）
            // 在前端已有效果，此處不重複
            break;
          case 'chick_bird': // 疾風之翼：答題時間+10%獎勵（速度獎勵由前端計算）
            break;
          case 'jungle_cub': // 叢林本能：答題速度獎勵+15%（速度獎勵由前端計算）
            break;
        }
      }
    }

    // 確保至少 0 星
    finalStars = Math.max(0, finalStars);

    // 7. 批次 upsert WordAttempt
    const upsertOps = wordResults.map(wr =>
      prisma.wordAttempt.upsert({
        where: { profileId_wordId: { profileId: id, wordId: wr.wordId } },
        update: {
          totalCount: { increment: 1 },
          correctCount: wr.correct ? { increment: 1 } : undefined,
          lastAttemptAt: now
        },
        create: {
          profileId: id,
          wordId: wr.wordId,
          totalCount: 1,
          correctCount: wr.correct ? 1 : 0,
          lastAttemptAt: now
        }
      })
    );

    // 8. 更新星星
    const [updatedProfile] = await prisma.$transaction([
      prisma.profile.update({
        where: { id },
        data: {
          stars: { increment: finalStars },
          totalStars: { increment: finalStars }
        }
      }),
      ...upsertOps
    ]);

    res.json({
      starsEarned: finalStars,
      newTotal: updatedProfile.stars,
      cooldownMultiplier,
      baseStars: Math.round(baseStars),
      accuracyBonus,
      typeBonusMultiplier,
      abilityBonus
    });
  } catch (error) {
    console.error('Failed to award stars:', error);
    res.status(500).json({ error: 'Failed to award stars' });
  }
});

// ============ 老師調整星星 API ============

// 調整學生星星
app.post('/api/profiles/:id/adjust-stars', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!Number.isInteger(amount) || amount === 0) {
      return res.status(400).json({ error: 'amount must be a non-zero integer' });
    }
    if (Math.abs(amount) > 1000) {
      return res.status(400).json({ error: 'amount must be between -1000 and 1000' });
    }
    if (reason && typeof reason === 'string' && reason.trim().length > 200) {
      return res.status(400).json({ error: 'reason must be 200 characters or less' });
    }

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const newStars = Math.max(0, profile.stars + amount);

    const [updatedProfile, adjustment] = await prisma.$transaction([
      prisma.profile.update({
        where: { id },
        data: { stars: newStars }
      }),
      prisma.starAdjustment.create({
        data: {
          profileId: id,
          amount,
          reason: (reason && reason.trim()) || (amount > 0 ? '加分' : '扣分')
        }
      })
    ]);

    res.json({
      success: true,
      newStars: updatedProfile.stars,
      adjustment
    });
  } catch (error) {
    console.error('Failed to adjust stars:', error);
    res.status(500).json({ error: 'Failed to adjust stars' });
  }
});

// 取得星星調整歷史
app.get('/api/profiles/:id/star-adjustments', async (req, res) => {
  try {
    const adjustments = await prisma.starAdjustment.findMany({
      where: { profileId: req.params.id },
      orderBy: { adjustedAt: 'desc' },
      take: 50
    });
    res.json(adjustments);
  } catch (error) {
    console.error('Failed to get star adjustments:', error);
    res.status(500).json({ error: 'Failed to get star adjustments' });
  }
});

// 刪除星星調整紀錄（回滾星星數量）
app.delete('/api/star-adjustments/:id', async (req, res) => {
  try {
    const adjustment = await prisma.starAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    const profile = await prisma.profile.findUnique({ where: { id: adjustment.profileId } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 回滾：扣回原本加的，或加回原本扣的
    const newStars = Math.max(0, profile.stars - adjustment.amount);

    await prisma.$transaction([
      prisma.profile.update({
        where: { id: adjustment.profileId },
        data: { stars: newStars }
      }),
      prisma.starAdjustment.delete({ where: { id: req.params.id } })
    ]);

    res.json({ success: true, newStars });
  } catch (error) {
    console.error('Failed to delete star adjustment:', error);
    res.status(500).json({ error: 'Failed to delete star adjustment' });
  }
});

// 更新星星調整紀錄的原因
app.put('/api/star-adjustments/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0 || reason.trim().length > 200) {
      return res.status(400).json({ error: 'reason must be 1-200 characters' });
    }

    const adjustment = await prisma.starAdjustment.update({
      where: { id: req.params.id },
      data: { reason: reason.trim() }
    });

    res.json(adjustment);
  } catch (error) {
    console.error('Failed to update star adjustment:', error);
    res.status(500).json({ error: 'Failed to update star adjustment' });
  }
});

// ============ 徽章系統 API ============

// 取得所有徽章定義
app.get('/api/badges', (req, res) => {
  res.json(BADGES);
});

// 取得學生已解鎖的徽章
app.get('/api/profiles/:id/badges', async (req, res) => {
  try {
    const badges = await prisma.profileBadge.findMany({
      where: { profileId: req.params.id },
      orderBy: { unlockedAt: 'desc' }
    });
    res.json(badges);
  } catch (error) {
    console.error('Failed to get badges:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

// 檢查並解鎖徽章
app.post('/api/profiles/:id/check-badges', async (req, res) => {
  try {
    const { id } = req.params;

    // 取得學生資料
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        quizSessions: { include: { results: true } },
        masteredWords: true,
        badges: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 計算各種統計數據
    const stats = {
      quiz_count: profile.quizSessions.length,
      mastered_count: profile.masteredWords.length,
      perfect_quiz: profile.quizSessions.filter(s => {
        const correct = s.results?.filter(r => r.correct).length || 0;
        const total = s.results?.length || 0;
        return total >= 5 && correct === total;
      }).length,
      login_streak: profile.loginStreak,
      total_stars: profile.totalStars
    };

    // 檢查每個徽章
    const unlockedBadgeIds = profile.badges.map(b => b.badgeId);
    const newBadges = [];

    for (const badge of BADGES) {
      if (unlockedBadgeIds.includes(badge.id)) continue;

      const { type, value } = badge.condition;
      if (stats[type] >= value) {
        // 解鎖徽章
        const newBadge = await prisma.profileBadge.create({
          data: { profileId: id, badgeId: badge.id }
        });
        newBadges.push({ ...badge, unlockedAt: newBadge.unlockedAt });
      }
    }

    res.json({ newBadges, stats });
  } catch (error) {
    console.error('Failed to check badges:', error);
    res.status(500).json({ error: 'Failed to check badges' });
  }
});

// ============ 積分商店 API ============

// 取得所有商品
app.get('/api/shop/items', (req, res) => {
  res.json(SHOP_ITEMS);
});

// 取得學生已購買的商品
app.get('/api/profiles/:id/purchases', async (req, res) => {
  try {
    const purchases = await prisma.profilePurchase.findMany({
      where: { profileId: req.params.id }
    });
    res.json(purchases);
  } catch (error) {
    console.error('Failed to get purchases:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

// 購買商品
app.post('/api/profiles/:id/purchase', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId } = req.body;

    // 找到商品
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // 取得學生資料
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 檢查是否已購買
    const existing = await prisma.profilePurchase.findUnique({
      where: { profileId_itemId: { profileId: id, itemId } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Already purchased' });
    }

    // 礦石巨人能力：商店價格-10%
    const activePet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
    const priceMultiplier = activePet?.species === 'ore_giant' ? 0.9 : 1.0;
    const finalPrice = Math.round(item.price * priceMultiplier);

    // 檢查星星是否足夠
    if (profile.stars < finalPrice) {
      return res.status(400).json({ error: 'Not enough stars' });
    }

    // 扣除星星並記錄購買
    await prisma.$transaction([
      prisma.profile.update({
        where: { id },
        data: { stars: { decrement: finalPrice } }
      }),
      prisma.profilePurchase.create({
        data: { profileId: id, itemId }
      })
    ]);

    // 取得更新後的資料
    const updatedProfile = await prisma.profile.findUnique({
      where: { id },
      include: { purchases: true }
    });

    res.json({ success: true, newStars: updatedProfile.stars, item });
  } catch (error) {
    console.error('Failed to purchase:', error);
    res.status(500).json({ error: 'Failed to purchase' });
  }
});

// 裝備物品
app.post('/api/profiles/:id/equip', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId, type } = req.body; // type: 'frame' | 'theme'

    // 檢查是否已購買
    if (itemId) {
      const purchase = await prisma.profilePurchase.findUnique({
        where: { profileId_itemId: { profileId: id, itemId } }
      });
      if (!purchase) {
        return res.status(400).json({ error: 'Item not purchased' });
      }
    }

    // 更新裝備
    const updateData = type === 'frame'
      ? { equippedFrame: itemId || null }
      : { equippedTheme: itemId || null };

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('Failed to equip:', error);
    res.status(500).json({ error: 'Failed to equip' });
  }
});

// ============ 消耗品道具 API ============

// 取得所有消耗品
app.get('/api/shop/consumables', (req, res) => {
  res.json(CONSUMABLE_ITEMS);
});

// 取得寶箱商品
app.get('/api/shop/chests', (req, res) => {
  res.json(CHEST_SHOP_ITEMS);
});

// 取得學生道具庫存
app.get('/api/profiles/:id/items', async (req, res) => {
  try {
    const items = await prisma.profileItem.findMany({
      where: { profileId: req.params.id }
    });
    res.json(items);
  } catch (error) {
    console.error('Failed to get items:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
});

// 購買消耗品（可重複購買，增加數量）
app.post('/api/profiles/:id/purchase-consumable', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId, quantity = 1 } = req.body;

    // 找到道具
    const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // 取得學生資料
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const totalPrice = item.price * quantity;

    // 檢查星星是否足夠
    if (profile.stars < totalPrice) {
      return res.status(400).json({ error: 'Not enough stars' });
    }

    // 扣除星星並更新道具數量
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id },
        data: { stars: { decrement: totalPrice } }
      });

      await tx.profileItem.upsert({
        where: { profileId_itemId: { profileId: id, itemId } },
        create: { profileId: id, itemId, quantity },
        update: { quantity: { increment: quantity } }
      });
    });

    // 取得更新後的資料
    const updatedProfile = await prisma.profile.findUnique({ where: { id } });
    const updatedItems = await prisma.profileItem.findMany({ where: { profileId: id } });

    res.json({ success: true, newStars: updatedProfile.stars, items: updatedItems });
  } catch (error) {
    console.error('Failed to purchase consumable:', error);
    res.status(500).json({ error: 'Failed to purchase consumable' });
  }
});

// 購買寶箱（可重複購買）
app.post('/api/profiles/:id/purchase-chest', async (req, res) => {
  try {
    const { id } = req.params;
    const { chestType, quantity = 1 } = req.body;

    // 找到寶箱商品
    const chestItem = CHEST_SHOP_ITEMS.find(c => c.chestType === chestType);
    if (!chestItem) {
      return res.status(404).json({ error: 'Chest type not found' });
    }

    // 取得學生資料
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const totalPrice = chestItem.price * quantity;

    // 檢查星星是否足夠
    if (profile.stars < totalPrice) {
      return res.status(400).json({ error: 'Not enough stars' });
    }

    // 扣除星星並增加寶箱數量
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id },
        data: { stars: { decrement: totalPrice } }
      });

      await tx.profileChest.upsert({
        where: { profileId_chestType: { profileId: id, chestType } },
        create: { profileId: id, chestType, quantity },
        update: { quantity: { increment: quantity } }
      });
    });

    // 取得更新後的資料
    const updatedProfile = await prisma.profile.findUnique({ where: { id } });
    const updatedChests = await prisma.profileChest.findMany({ where: { profileId: id } });

    res.json({ success: true, newStars: updatedProfile.stars, chests: updatedChests });
  } catch (error) {
    console.error('Failed to purchase chest:', error);
    res.status(500).json({ error: 'Failed to purchase chest' });
  }
});

// 使用消耗品道具
app.post('/api/profiles/:id/use-item', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId } = req.body;

    // 找到道具
    const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // 檢查庫存
    const profileItem = await prisma.profileItem.findUnique({
      where: { profileId_itemId: { profileId: id, itemId } }
    });

    if (!profileItem || profileItem.quantity < 1) {
      return res.status(400).json({ error: 'No item available' });
    }

    // 扣除道具數量
    if (profileItem.quantity === 1) {
      await prisma.profileItem.delete({
        where: { profileId_itemId: { profileId: id, itemId } }
      });
    } else {
      await prisma.profileItem.update({
        where: { profileId_itemId: { profileId: id, itemId } },
        data: { quantity: { decrement: 1 } }
      });
    }

    // 取得更新後的庫存
    const updatedItems = await prisma.profileItem.findMany({ where: { profileId: id } });

    res.json({ success: true, effect: item.effect, items: updatedItems });
  } catch (error) {
    console.error('Failed to use item:', error);
    res.status(500).json({ error: 'Failed to use item' });
  }
});

// ============ 虛擬寵物 API ============

// 寵物資料富化（共用）
const enrichPetData = (pet) => {
  const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
  const hungerDecay = Math.floor(hoursSinceLastFed * 2);
  const currentHunger = Math.max(0, pet.hunger - hungerDecay);
  const currentHappiness = Math.max(0, pet.happiness - Math.floor(hungerDecay / 2));
  const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
  const stages = PET_STAGES[pet.species] || PET_STAGES.spirit_dog;
  const allStages = getStagesForPet(pet.species, pet.evolutionPath);
  const currentStage = allStages.find(s => s.stage === status.stage);
  const speciesInfo = PET_SPECIES.find(s => s.species === pet.species);
  const rpgStats = calculateRpgStats(pet.species, status.level);
  const types = getPetTypes(pet.species, pet.evolutionPath, status.stage);
  return {
    ...pet,
    hunger: currentHunger,
    happiness: currentHappiness,
    level: status.level,
    stage: status.stage,
    expToNext: status.expToNext,
    currentExp: status.currentExp,
    stageName: currentStage?.name || '蛋',
    stageIcon: '🐾',
    stages,
    rarity: speciesInfo?.rarity || 'normal',
    rpgStats,
    types,
    evolutionPath: pet.evolutionPath,
    needsEvolutionChoice: status.needsEvolutionChoice,
    ability: speciesInfo?.ability,
  };
};

// 取得可選寵物物種（根據老師開放的稀有度過濾）
app.get('/api/pet-species', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const unlockedRarities = settings?.unlockedPetRarities || ['normal', 'rare', 'legendary'];
    const filtered = PET_SPECIES.filter(s => unlockedRarities.includes(s.rarity));
    const speciesWithStages = filtered.map(s => ({
      ...s,
      stages: PET_STAGES[s.species] || PET_STAGES.spirit_dog
    }));
    res.json(speciesWithStages);
  } catch (error) {
    console.error('Failed to get pet species:', error);
    res.status(500).json({ error: 'Failed to get pet species' });
  }
});

// 取得所有寵物列表
app.get('/api/profiles/:id/pets', async (req, res) => {
  try {
    const pets = await prisma.pet.findMany({
      where: { profileId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { equipment: true }
    });

    const enrichedPets = pets.map(enrichPetData);

    res.json(enrichedPets);
  } catch (error) {
    console.error('Failed to get pets:', error);
    res.status(500).json({ error: 'Failed to get pets' });
  }
});

// 取得 active 寵物資料
app.get('/api/profiles/:id/pet', async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true },
      include: { equipment: true }
    });

    // 沒有寵物時不自動建立，改為回傳 hasPet: false
    if (!pet) {
      return res.json({ hasPet: false });
    }

    res.json({ hasPet: true, ...enrichPetData(pet) });
  } catch (error) {
    console.error('Failed to get pet:', error);
    res.status(500).json({ error: 'Failed to get pet' });
  }
});

// 選擇並孵化寵物蛋
app.post('/api/profiles/:id/pet/choose', async (req, res) => {
  try {
    const { id } = req.params;
    const { species } = req.body;

    const speciesInfo = PET_SPECIES.find(s => s.species === species);
    if (!speciesInfo) {
      return res.status(400).json({ error: 'Invalid species' });
    }

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.stars < speciesInfo.price) {
      return res.status(400).json({ error: 'Not enough stars', required: speciesInfo.price, current: profile.stars });
    }

    const defaultName = `小${speciesInfo.name}`;

    // Transaction: deactivate current pet, create new, deduct stars
    const operations = [];

    // 將現有 active 寵物設為 inactive
    operations.push(
      prisma.pet.updateMany({
        where: { profileId: id, isActive: true },
        data: { isActive: false }
      })
    );

    // 建立新寵物
    operations.push(
      prisma.pet.create({
        data: {
          profileId: id,
          species,
          name: defaultName,
          isActive: true
        }
      })
    );

    // 扣除星星（免費寵物不扣）+ 更新已解鎖物種
    const profileUpdateData = {};
    if (speciesInfo.price > 0) {
      profileUpdateData.stars = { decrement: speciesInfo.price };
    }
    // 將物種加入已解鎖列表（圖鑑用）
    if (!profile.unlockedSpecies.includes(species)) {
      profileUpdateData.unlockedSpecies = { push: species };
    }
    if (Object.keys(profileUpdateData).length > 0) {
      operations.push(
        prisma.profile.update({
          where: { id },
          data: profileUpdateData
        })
      );
    }

    const results = await prisma.$transaction(operations);
    const newPet = results[1]; // second operation is create

    res.json({ success: true, pet: newPet, newStars: profile.stars - speciesInfo.price });
  } catch (error) {
    console.error('Failed to choose pet:', error);
    res.status(500).json({ error: 'Failed to choose pet' });
  }
});

// 切換展示寵物
app.post('/api/profiles/:id/pet/switch', async (req, res) => {
  try {
    const { id } = req.params;
    const { petId } = req.body;

    if (!petId || typeof petId !== 'string') {
      return res.status(400).json({ error: 'Invalid petId' });
    }

    // 驗證寵物屬於此玩家
    const pet = await prisma.pet.findFirst({
      where: { id: petId, profileId: id }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    await prisma.$transaction([
      prisma.pet.updateMany({
        where: { profileId: id, isActive: true },
        data: { isActive: false }
      }),
      prisma.pet.update({
        where: { id: petId },
        data: { isActive: true }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to switch pet:', error);
    res.status(500).json({ error: 'Failed to switch pet' });
  }
});

// 餵食寵物（只餵 active pet）
app.post('/api/profiles/:id/pet/feed', async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 餵食需要 5 星星
    const feedCost = 5;
    if (profile.stars < feedCost) {
      return res.status(400).json({ error: 'Not enough stars', required: feedCost, current: profile.stars });
    }

    const pet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true }
    });
    if (!pet) {
      return res.status(404).json({ error: 'No active pet' });
    }

    // 計算當前飽足度（種子球能力：飽足度恢復+20%，即衰減-20%）
    const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
    const hungerDecayRate = pet.species === 'seed_ball' ? 1.6 : 2;
    const hungerDecay = Math.floor(hoursSinceLastFed * hungerDecayRate);
    const currentHunger = Math.max(0, pet.hunger - hungerDecay);

    // 餵食增加 30 飽足度和 20 快樂度（水母能力：餵食效果+30%）
    const feedMultiplier = pet.species === 'jellyfish' ? 1.3 : 1.0;
    const newHunger = Math.min(100, currentHunger + Math.round(30 * feedMultiplier));
    const newHappiness = Math.min(100, pet.happiness + Math.round(20 * feedMultiplier));

    // 更新寵物和扣除星星
    await prisma.$transaction([
      prisma.pet.update({
        where: { id: pet.id },
        data: {
          hunger: newHunger,
          happiness: newHappiness,
          lastFedAt: new Date()
        }
      }),
      prisma.profile.update({
        where: { id },
        data: { stars: { decrement: feedCost } }
      })
    ]);

    const remainingStars = profile.stars - feedCost;
    res.json({ success: true, newHunger, newHappiness, cost: feedCost, remainingStars });
  } catch (error) {
    console.error('Failed to feed pet:', error);
    res.status(500).json({ error: 'Failed to feed pet' });
  }
});

// 增加寵物經驗值（答對題目時呼叫，只給 active pet）
app.post('/api/profiles/:id/pet/gain-exp', async (req, res) => {
  try {
    const { id } = req.params;
    const { correctCount } = req.body;

    const pet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true },
      include: { equipment: true }
    });

    if (!pet) {
      return res.json({ success: false, expGain: 0, levelUp: false, evolved: false, newLevel: 0, newStage: 0 });
    }

    // 計算裝備經驗加成
    let expBonus = 0;
    for (const eq of (pet.equipment || [])) {
      const itemDef = EQUIPMENT_ITEMS.find(e => e.id === eq.itemId);
      if (itemDef && itemDef.bonusType === 'exp') {
        expBonus += itemDef.bonusValue;
      }
    }

    // 寵物能力經驗加成
    let abilityExpBonus = 0;
    if (pet.species === 'nebula_fish') abilityExpBonus = 20;   // 星際感知：+20%
    if (pet.species === 'circuit_fish') abilityExpBonus = 10;  // 電路超載：+10%

    // 每答對一題 +5 經驗值、+2 快樂度（含裝備加成+能力加成）
    const baseExpGain = correctCount * 5;
    const expGain = Math.round(baseExpGain * (1 + (expBonus + abilityExpBonus) / 100));
    const happinessGain = correctCount * 2;

    const oldStatus = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
    const newExp = pet.exp + expGain;
    const newStatus = calculatePetStatus(newExp, pet.species, pet.evolutionPath);

    // 計算當前快樂度（考慮衰減，蘑菇能力：快樂度衰減-20%）
    const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
    const happinessDecayRate = pet.species === 'mushroom' ? 0.8 : 1.0;
    const happinessDecay = Math.floor(hoursSinceLastFed * happinessDecayRate);
    const currentHappiness = Math.max(0, pet.happiness - happinessDecay);
    const newHappiness = Math.min(100, currentHappiness + happinessGain);

    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        exp: newExp,
        level: newStatus.level,
        stage: newStatus.stage,
        happiness: newHappiness
      }
    });

    const levelUp = newStatus.level > oldStatus.level;
    const evolved = newStatus.stage > oldStatus.stage;

    const allStages = getStagesForPet(pet.species, pet.evolutionPath);
    const newStageInfo = allStages.find(s => s.stage === newStatus.stage);

    res.json({
      success: true,
      expGain,
      levelUp,
      evolved,
      newLevel: newStatus.level,
      newStage: newStatus.stage,
      stageName: newStageInfo?.name,
      stageIcon: '🐾',
      needsEvolutionChoice: newStatus.needsEvolutionChoice,
    });
  } catch (error) {
    console.error('Failed to gain exp:', error);
    res.status(500).json({ error: 'Failed to gain exp' });
  }
});

// 重新命名寵物（只改 active pet）
app.post('/api/profiles/:id/pet/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0 || name.length > 20) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    const activePet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true }
    });

    if (!activePet) {
      return res.status(404).json({ error: 'No active pet' });
    }

    const pet = await prisma.pet.update({
      where: { id: activePet.id },
      data: { name: name.trim() }
    });

    res.json({ success: true, pet });
  } catch (error) {
    console.error('Failed to rename pet:', error);
    res.status(500).json({ error: 'Failed to rename pet' });
  }
});

// 選擇進化路線
app.post('/api/profiles/:id/pet/choose-evolution', async (req, res) => {
  try {
    const { id } = req.params;
    const { path } = req.body;

    if (!path || !['A', 'B'].includes(path)) {
      return res.status(400).json({ error: 'Invalid path, must be A or B' });
    }

    const activePet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true }
    });

    if (!activePet) {
      return res.status(404).json({ error: 'No active pet' });
    }

    if (activePet.evolutionPath) {
      return res.status(400).json({ error: 'Evolution path already chosen' });
    }

    const status = calculatePetStatus(activePet.exp, activePet.species, null);
    const stageData = PET_STAGES[activePet.species];
    if (!stageData || status.level < (stageData.evolutionLevel || 30)) {
      return res.status(400).json({ error: 'Pet level too low for evolution' });
    }

    // Update evolution path and recalculate stage
    const newStatus = calculatePetStatus(activePet.exp, activePet.species, path);
    const updatedPet = await prisma.pet.update({
      where: { id: activePet.id },
      data: {
        evolutionPath: path,
        stage: newStatus.stage,
      }
    });

    const speciesInfo = PET_SPECIES.find(s => s.species === activePet.species);
    const types = getPetTypes(activePet.species, path, newStatus.stage);
    const allStages = getStagesForPet(activePet.species, path);
    const currentStage = allStages.find(s => s.stage === newStatus.stage);

    // 幼鱗能力：每次進化額外獲得 50 星星
    let evolutionStarBonus = 0;
    if (activePet.species === 'young_scale') {
      evolutionStarBonus = 50;
      await prisma.profile.update({
        where: { id },
        data: { stars: { increment: evolutionStarBonus }, totalStars: { increment: evolutionStarBonus } }
      });
    }

    res.json({
      success: true,
      pet: updatedPet,
      newTypes: types,
      stageName: currentStage?.name,
      pathName: path === 'A' ? speciesInfo?.pathA?.name : speciesInfo?.pathB?.name,
      evolutionStarBonus,
    });
  } catch (error) {
    console.error('Failed to choose evolution:', error);
    res.status(500).json({ error: 'Failed to choose evolution' });
  }
});

// ============ 寵物裝備系統 ============

// 裝備商品列表
app.get('/api/equipment-items', (req, res) => {
  res.json(EQUIPMENT_ITEMS);
});

// 購買並裝備
app.post('/api/profiles/:id/pet/equip', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId } = req.body;

    const itemDef = EQUIPMENT_ITEMS.find(e => e.id === itemId);
    if (!itemDef) {
      return res.status(400).json({ error: 'Invalid equipment item' });
    }

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.stars < itemDef.price) {
      return res.status(400).json({ error: 'Not enough stars', required: itemDef.price, current: profile.stars });
    }

    const activePet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true }
    });
    if (!activePet) {
      return res.status(404).json({ error: 'No active pet' });
    }

    // 刪除該槽位的舊裝備（如果有），然後建立新裝備
    await prisma.$transaction([
      prisma.petEquipment.deleteMany({
        where: { petId: activePet.id, slot: itemDef.slot }
      }),
      prisma.petEquipment.create({
        data: {
          profileId: id,
          petId: activePet.id,
          slot: itemDef.slot,
          itemId: itemDef.id
        }
      }),
      prisma.profile.update({
        where: { id },
        data: { stars: { decrement: itemDef.price } }
      })
    ]);

    const equipment = await prisma.petEquipment.findMany({
      where: { petId: activePet.id }
    });

    res.json({ success: true, equipment, newStars: profile.stars - itemDef.price });
  } catch (error) {
    console.error('Failed to equip:', error);
    res.status(500).json({ error: 'Failed to equip' });
  }
});

// 卸除裝備（裝備消失）
app.post('/api/profiles/:id/pet/unequip', async (req, res) => {
  try {
    const { id } = req.params;
    const { slot } = req.body;

    if (!['hat', 'necklace', 'wings', 'weapon'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid slot' });
    }

    const activePet = await prisma.pet.findFirst({
      where: { profileId: id, isActive: true }
    });
    if (!activePet) {
      return res.status(404).json({ error: 'No active pet' });
    }

    await prisma.petEquipment.deleteMany({
      where: { petId: activePet.id, slot }
    });

    const equipment = await prisma.petEquipment.findMany({
      where: { petId: activePet.id }
    });

    res.json({ success: true, equipment });
  } catch (error) {
    console.error('Failed to unequip:', error);
    res.status(500).json({ error: 'Failed to unequip' });
  }
});

// 取得寵物裝備
app.get('/api/profiles/:id/pet/equipment', async (req, res) => {
  try {
    const activePet = await prisma.pet.findFirst({
      where: { profileId: req.params.id, isActive: true }
    });
    if (!activePet) {
      return res.json([]);
    }
    const equipment = await prisma.petEquipment.findMany({
      where: { petId: activePet.id }
    });
    res.json(equipment);
  } catch (error) {
    console.error('Failed to get equipment:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// 圖鑑 API
app.get('/api/profiles/:id/pokedex', async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
      select: { unlockedSpecies: true }
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 計算每種物種的擁有數量
    const pets = await prisma.pet.findMany({
      where: { profileId: req.params.id },
      select: { species: true }
    });

    const ownedCount = {};
    for (const p of pets) {
      ownedCount[p.species] = (ownedCount[p.species] || 0) + 1;
    }

    // Also get evolution paths from owned pets
    const ownedPets = await prisma.pet.findMany({
      where: { profileId: req.params.id },
      select: { species: true, evolutionPath: true }
    });
    const unlockedPaths = {};
    for (const p of ownedPets) {
      if (!unlockedPaths[p.species]) unlockedPaths[p.species] = { A: false, B: false };
      if (p.evolutionPath === 'A') unlockedPaths[p.species].A = true;
      if (p.evolutionPath === 'B') unlockedPaths[p.species].B = true;
    }

    const pokedex = PET_SPECIES.map(sp => ({
      species: sp.species,
      name: sp.name,
      price: sp.price,
      rarity: sp.rarity,
      description: sp.description,
      baseType: sp.baseType,
      pathA: sp.pathA,
      pathB: sp.pathB,
      ability: sp.ability,
      stages: PET_STAGES[sp.species] || PET_STAGES.spirit_dog,
      unlocked: profile.unlockedSpecies.includes(sp.species),
      ownedCount: ownedCount[sp.species] || 0,
      unlockedPaths: unlockedPaths[sp.species] || { A: false, B: false },
    }));

    res.json({
      total: PET_SPECIES.length,
      unlocked: profile.unlockedSpecies.length,
      entries: pokedex
    });
  } catch (error) {
    console.error('Failed to get pokedex:', error);
    res.status(500).json({ error: 'Failed to get pokedex' });
  }
});

// ============ 神秘獎勵系統 API ============

// 隨機取得指定稀有度的稱號（只能從寶箱獲得的）
const getRandomTitle = (rarity) => {
  const availableTitles = TITLES.filter(t => t.rarity === rarity && t.condition.type === 'special');
  if (availableTitles.length === 0) {
    // 如果沒有特殊稱號，返回該稀有度的任一稱號
    const fallback = TITLES.filter(t => t.rarity === rarity);
    return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
  }
  return availableTitles[Math.floor(Math.random() * availableTitles.length)];
};

// 取得所有稱號
app.get('/api/titles', (req, res) => {
  res.json(TITLES);
});

// 取得玩家已解鎖的稱號
app.get('/api/profiles/:id/titles', async (req, res) => {
  try {
    const { id } = req.params;
    const profileTitles = await prisma.profileTitle.findMany({
      where: { profileId: id }
    });
    res.json(profileTitles);
  } catch (error) {
    console.error('Failed to get titles:', error);
    res.status(500).json({ error: 'Failed to get titles' });
  }
});

// 裝備稱號
app.post('/api/profiles/:id/equip-title', async (req, res) => {
  try {
    const { id } = req.params;
    const { titleId } = req.body;

    if (titleId) {
      // 檢查是否已解鎖
      const unlocked = await prisma.profileTitle.findUnique({
        where: { profileId_titleId: { profileId: id, titleId } }
      });
      if (!unlocked) {
        return res.status(400).json({ error: 'Title not unlocked' });
      }
    }

    await prisma.profile.update({
      where: { id },
      data: { equippedTitle: titleId || null }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to equip title:', error);
    res.status(500).json({ error: 'Failed to equip title' });
  }
});

// 檢查並解鎖稱號
app.post('/api/profiles/:id/check-titles', async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        titles: true,
        quizSessions: true,
        masteredWords: true,
        stickers: true,
        chests: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 計算統計數據
    const stats = {
      quiz_count: profile.quizSessions.length,
      mastered_count: profile.masteredWords.length,
      login_streak: profile.loginStreak,
      total_stars: profile.totalStars,
      sticker_count: profile.stickers.length,
      chest_opened: 0 // 需要額外追蹤
    };

    const unlockedTitleIds = profile.titles.map(t => t.titleId);
    const newTitles = [];

    for (const title of TITLES) {
      if (unlockedTitleIds.includes(title.id)) continue;
      if (title.condition.type === 'special') continue; // 特殊稱號只能從寶箱獲得

      const { type, value } = title.condition;
      if (stats[type] >= value) {
        await prisma.profileTitle.create({
          data: { profileId: id, titleId: title.id }
        });
        newTitles.push(title);
      }
    }

    res.json({ newTitles, stats });
  } catch (error) {
    console.error('Failed to check titles:', error);
    res.status(500).json({ error: 'Failed to check titles' });
  }
});

// 取得貼紙系列資訊
app.get('/api/stickers/series', (req, res) => {
  const seriesInfo = Object.entries(STICKER_SERIES).map(([id, series]) => ({
    id,
    name: series.name,
    icon: series.icon,
    rarity: series.rarity,
    total: series.stickers.length,
    stickers: series.stickers
  }));
  res.json(seriesInfo);
});

// 取得玩家已收集的貼紙
app.get('/api/profiles/:id/stickers', async (req, res) => {
  try {
    const { id } = req.params;
    const stickers = await prisma.profileSticker.findMany({
      where: { profileId: id }
    });
    res.json(stickers);
  } catch (error) {
    console.error('Failed to get stickers:', error);
    res.status(500).json({ error: 'Failed to get stickers' });
  }
});

// 取得寶箱配置
app.get('/api/chests/config', (req, res) => {
  res.json(CHEST_CONFIG);
});

// 取得玩家的寶箱庫存
app.get('/api/profiles/:id/chests', async (req, res) => {
  try {
    const { id } = req.params;
    const chests = await prisma.profileChest.findMany({
      where: { profileId: id }
    });
    res.json(chests);
  } catch (error) {
    console.error('Failed to get chests:', error);
    res.status(500).json({ error: 'Failed to get chests' });
  }
});

// 給予寶箱
app.post('/api/profiles/:id/give-chest', async (req, res) => {
  try {
    const { id } = req.params;
    const { chestType, quantity = 1 } = req.body;

    if (!CHEST_CONFIG[chestType]) {
      return res.status(400).json({ error: 'Invalid chest type' });
    }

    const existing = await prisma.profileChest.findUnique({
      where: { profileId_chestType: { profileId: id, chestType } }
    });

    if (existing) {
      await prisma.profileChest.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } }
      });
    } else {
      await prisma.profileChest.create({
        data: { profileId: id, chestType, quantity }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to give chest:', error);
    res.status(500).json({ error: 'Failed to give chest' });
  }
});

// 開啟寶箱
app.post('/api/profiles/:id/open-chest', async (req, res) => {
  try {
    const { id } = req.params;
    const { chestType } = req.body;

    const config = CHEST_CONFIG[chestType];
    if (!config) {
      return res.status(400).json({ error: 'Invalid chest type' });
    }

    // 檢查是否有寶箱
    const chest = await prisma.profileChest.findUnique({
      where: { profileId_chestType: { profileId: id, chestType } }
    });

    if (!chest || chest.quantity <= 0) {
      return res.status(400).json({ error: 'No chest available' });
    }

    // 隨機選擇獎勵
    const rewardType = weightedRandom(config.rewards);
    let reward = { type: rewardType.type };

    if (rewardType.type === 'stars') {
      const stars = Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min;
      reward.value = stars;
      reward.name = `${stars} 星星`;
      reward.icon = '⭐';

      // 發放星星
      await prisma.profile.update({
        where: { id },
        data: { stars: { increment: stars }, totalStars: { increment: stars } }
      });
    } else if (rewardType.type === 'sticker') {
      const sticker = getRandomSticker(rewardType.rarity);
      reward.sticker = sticker;
      reward.name = sticker.name;
      reward.icon = sticker.icon;
      reward.rarity = sticker.rarity;

      // 檢查是否已擁有
      const existing = await prisma.profileSticker.findUnique({
        where: { profileId_stickerId: { profileId: id, stickerId: sticker.id } }
      });

      if (existing) {
        // 已擁有，轉換為星星
        const bonusStars = sticker.rarity === 'legendary' ? 30 : sticker.rarity === 'rare' ? 15 : 5;
        reward.duplicate = true;
        reward.bonusStars = bonusStars;
        await prisma.profile.update({
          where: { id },
          data: { stars: { increment: bonusStars }, totalStars: { increment: bonusStars } }
        });
      } else {
        await prisma.profileSticker.create({
          data: { profileId: id, stickerId: sticker.id }
        });
      }
    } else if (rewardType.type === 'title') {
      const title = getRandomTitle(rewardType.rarity);
      if (title) {
        reward.title = title;
        reward.name = title.name;
        reward.icon = '🎖️';
        reward.rarity = title.rarity;

        // 檢查是否已擁有
        const existing = await prisma.profileTitle.findUnique({
          where: { profileId_titleId: { profileId: id, titleId: title.id } }
        });

        if (existing) {
          // 已擁有，轉換為星星
          const bonusStars = title.rarity === 'mythic' ? 100 : title.rarity === 'epic' ? 50 : 25;
          reward.duplicate = true;
          reward.bonusStars = bonusStars;
          await prisma.profile.update({
            where: { id },
            data: { stars: { increment: bonusStars }, totalStars: { increment: bonusStars } }
          });
        } else {
          await prisma.profileTitle.create({
            data: { profileId: id, titleId: title.id }
          });
        }
      } else {
        // 沒有可發放的稱號，給星星
        const stars = 50;
        reward.type = 'stars';
        reward.value = stars;
        reward.name = `${stars} 星星`;
        reward.icon = '⭐';
        await prisma.profile.update({
          where: { id },
          data: { stars: { increment: stars }, totalStars: { increment: stars } }
        });
      }
    }

    // 扣除寶箱
    if (chest.quantity <= 1) {
      await prisma.profileChest.delete({ where: { id: chest.id } });
    } else {
      await prisma.profileChest.update({
        where: { id: chest.id },
        data: { quantity: { decrement: 1 } }
      });
    }

    res.json({ success: true, reward, chestName: config.name, chestIcon: config.icon });
  } catch (error) {
    console.error('Failed to open chest:', error);
    res.status(500).json({ error: 'Failed to open chest' });
  }
});

// 取得轉盤配置
app.get('/api/wheel/config', (req, res) => {
  res.json(WHEEL_REWARDS);
});

// 轉動轉盤
app.post('/api/profiles/:id/spin-wheel', async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 檢查今天是否已轉過
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (profile.lastSpinAt) {
      const lastSpin = new Date(profile.lastSpinAt);
      lastSpin.setHours(0, 0, 0, 0);
      if (lastSpin.getTime() === today.getTime()) {
        return res.status(400).json({ error: 'Already spun today', canSpinAt: new Date(today.getTime() + 24 * 60 * 60 * 1000) });
      }
    }

    // 隨機選擇獎勵
    const rewardConfig = weightedRandom(WHEEL_REWARDS);
    let reward = { ...rewardConfig };

    if (rewardConfig.type === 'stars') {
      await prisma.profile.update({
        where: { id },
        data: {
          stars: { increment: rewardConfig.value },
          totalStars: { increment: rewardConfig.value },
          lastSpinAt: new Date()
        }
      });
    } else if (rewardConfig.type === 'chest') {
      const existing = await prisma.profileChest.findUnique({
        where: { profileId_chestType: { profileId: id, chestType: rewardConfig.value } }
      });

      if (existing) {
        await prisma.profileChest.update({
          where: { id: existing.id },
          data: { quantity: { increment: 1 } }
        });
      } else {
        await prisma.profileChest.create({
          data: { profileId: id, chestType: rewardConfig.value, quantity: 1 }
        });
      }

      await prisma.profile.update({
        where: { id },
        data: { lastSpinAt: new Date() }
      });
    } else if (rewardConfig.type === 'sticker') {
      const sticker = getRandomSticker(null);
      reward.sticker = sticker;
      reward.name = sticker.name;
      reward.icon = sticker.icon;

      const existing = await prisma.profileSticker.findUnique({
        where: { profileId_stickerId: { profileId: id, stickerId: sticker.id } }
      });

      if (existing) {
        // 已擁有，給星星
        const bonusStars = 10;
        reward.duplicate = true;
        reward.bonusStars = bonusStars;
        await prisma.profile.update({
          where: { id },
          data: {
            stars: { increment: bonusStars },
            totalStars: { increment: bonusStars },
            lastSpinAt: new Date()
          }
        });
      } else {
        await prisma.profileSticker.create({
          data: { profileId: id, stickerId: sticker.id }
        });
        await prisma.profile.update({
          where: { id },
          data: { lastSpinAt: new Date() }
        });
      }
    }

    // 計算轉盤停止的位置索引
    const rewardIndex = WHEEL_REWARDS.findIndex(r => r.id === rewardConfig.id);

    // 取得更新後的 profile 和寶箱數量
    const updatedProfile = await prisma.profile.findUnique({ where: { id } });
    const updatedChests = await prisma.profileChest.findMany({ where: { profileId: id } });
    const updatedStickers = await prisma.profileSticker.findMany({ where: { profileId: id } });

    res.json({
      success: true,
      reward,
      rewardIndex,
      newStars: updatedProfile.stars,
      chests: updatedChests,
      stickers: updatedStickers
    });
  } catch (error) {
    console.error('Failed to spin wheel:', error);
    res.status(500).json({ error: 'Failed to spin wheel' });
  }
});

// ============ 排行榜 API ============

// 取得排行榜
app.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params; // week, month, all
    const limit = 10;

    let profiles;

    if (type === 'week') {
      // 本週獲得星星最多（根據本週測驗答對數計算）
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      profiles = await prisma.profile.findMany({
        include: {
          quizSessions: {
            where: {
              timestamp: { gte: weekStart }
            },
            include: { results: true }
          },
          pets: { where: { isActive: true }, take: 1 }
        }
      });

      // 計算本週獲得的星星（答對數）
      profiles = profiles.map(p => {
        const weeklyCorrect = p.quizSessions.reduce((sum, s) => {
          return sum + s.results.filter(r => r.correct).length;
        }, 0);
        return { ...p, weeklyStars: weeklyCorrect };
      })
      .sort((a, b) => b.weeklyStars - a.weeklyStars)
      .slice(0, limit);

    } else if (type === 'month') {
      // 本月精熟單字最多
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      profiles = await prisma.profile.findMany({
        include: {
          masteredWords: {
            where: {
              masteredAt: { gte: monthStart }
            }
          },
          pets: { where: { isActive: true }, take: 1 }
        }
      });

      profiles = profiles.map(p => ({
        ...p,
        monthlyMastered: p.masteredWords.length
      }))
      .sort((a, b) => b.monthlyMastered - a.monthlyMastered)
      .slice(0, limit);

    } else {
      // 總榜：累積總星星數
      profiles = await prisma.profile.findMany({
        orderBy: { totalStars: 'desc' },
        take: limit,
        include: { pets: { where: { isActive: true }, take: 1 } }
      });
    }

    // 格式化回傳資料
    const leaderboard = profiles.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      totalStars: p.totalStars,
      weeklyStars: p.weeklyStars || 0,
      monthlyMastered: p.monthlyMastered || 0,
      equippedFrame: p.equippedFrame,
      petIcon: p.pets?.[0] ? '🐾' : '🥚',
      petLevel: p.pets?.[0]?.level || 1
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ============ 週挑戰 API ============

// 使用 getWeekStartDate（已在上方定義）

// 取得或創建本週挑戰
app.get('/api/profiles/:id/weekly-challenge', async (req, res) => {
  try {
    const { id } = req.params;
    const weekStart = getWeekStartDate(new Date());

    let challenge = await prisma.weeklyChallenge.findUnique({
      where: {
        profileId_weekStart: { profileId: id, weekStart }
      }
    });

    if (!challenge) {
      // 創建新的週挑戰
      challenge = await prisma.weeklyChallenge.create({
        data: {
          profileId: id,
          weekStart,
          targetWords: 20,
          targetQuiz: 50,
          targetDays: 5
        }
      });
    }

    // 計算剩餘天數
    const now = new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const daysLeft = Math.ceil((weekEnd - now) / (1000 * 60 * 60 * 24));

    res.json({
      ...challenge,
      daysLeft: Math.max(0, daysLeft)
    });
  } catch (error) {
    console.error('Failed to get weekly challenge:', error);
    res.status(500).json({ error: 'Failed to get weekly challenge' });
  }
});

// 更新週挑戰進度
app.post('/api/profiles/:id/update-weekly-progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount } = req.body; // type: 'quiz' | 'words' | 'day'

    // 輸入驗證
    if (!['quiz', 'words', 'day'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be quiz, words, or day' });
    }
    if (type !== 'day' && amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const weekStart = getWeekStartDate(new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let challenge = await prisma.weeklyChallenge.findUnique({
      where: {
        profileId_weekStart: { profileId: id, weekStart }
      }
    });

    if (!challenge) {
      challenge = await prisma.weeklyChallenge.create({
        data: {
          profileId: id,
          weekStart,
          targetWords: 20,
          targetQuiz: 50,
          targetDays: 5
        }
      });
    }

    // 根據類型更新進度
    const updateData = {};

    if (type === 'quiz') {
      updateData.progressQuiz = { increment: amount || 1 };
    } else if (type === 'words') {
      updateData.progressWords = { increment: amount || 1 };
    } else if (type === 'day') {
      // 只有不同的日期才增加天數
      if (!challenge.lastActiveDate || new Date(challenge.lastActiveDate).getTime() !== today.getTime()) {
        updateData.progressDays = { increment: 1 };
        updateData.lastActiveDate = today;
      }
    }

    if (Object.keys(updateData).length > 0) {
      challenge = await prisma.weeklyChallenge.update({
        where: { id: challenge.id },
        data: updateData
      });
    }

    res.json({ success: true, challenge });
  } catch (error) {
    console.error('Failed to update weekly progress:', error);
    res.status(500).json({ error: 'Failed to update weekly progress' });
  }
});

// 領取週挑戰獎勵
app.post('/api/profiles/:id/claim-weekly-reward', async (req, res) => {
  try {
    const { id } = req.params;
    const weekStart = getWeekStartDate(new Date());

    const challenge = await prisma.weeklyChallenge.findUnique({
      where: {
        profileId_weekStart: { profileId: id, weekStart }
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'No weekly challenge found' });
    }

    if (challenge.rewardClaimed) {
      return res.json({ success: false, error: 'Reward already claimed' });
    }

    // 檢查是否完成所有挑戰
    const wordsCompleted = challenge.progressWords >= challenge.targetWords;
    const quizCompleted = challenge.progressQuiz >= challenge.targetQuiz;
    const daysCompleted = challenge.progressDays >= challenge.targetDays;

    if (!wordsCompleted || !quizCompleted || !daysCompleted) {
      return res.json({ success: false, error: 'Challenge not completed' });
    }

    // 發放獎勵：銀寶箱 x1 + 50 星星
    await prisma.$transaction([
      // 更新挑戰為已領取
      prisma.weeklyChallenge.update({
        where: { id: challenge.id },
        data: { rewardClaimed: true }
      }),
      // 增加星星
      prisma.profile.update({
        where: { id },
        data: {
          stars: { increment: 50 },
          totalStars: { increment: 50 }
        }
      }),
      // 增加銀寶箱
      prisma.profileChest.upsert({
        where: { profileId_chestType: { profileId: id, chestType: 'silver' } },
        update: { quantity: { increment: 1 } },
        create: { profileId: id, chestType: 'silver', quantity: 1 }
      })
    ]);

    res.json({
      success: true,
      rewards: {
        stars: 50,
        chests: [{ type: 'silver', quantity: 1 }]
      }
    });
  } catch (error) {
    console.error('Failed to claim weekly reward:', error);
    res.status(500).json({ error: 'Failed to claim weekly reward' });
  }
});

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
