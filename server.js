import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// ============ 徽章系統 API ============

// 徽章定義（存在程式碼中）
const BADGES = [
  // 學習類
  { id: 'first_quiz', name: '初心者', icon: '🌱', description: '完成第一次測驗', rarity: 'common', condition: { type: 'quiz_count', value: 1 } },
  { id: 'quiz_10', name: '小試身手', icon: '📝', description: '完成 10 次測驗', rarity: 'common', condition: { type: 'quiz_count', value: 10 } },
  { id: 'quiz_50', name: '勤學不倦', icon: '📚', description: '完成 50 次測驗', rarity: 'rare', condition: { type: 'quiz_count', value: 50 } },
  { id: 'quiz_100', name: '學海無涯', icon: '🎓', description: '完成 100 次測驗', rarity: 'epic', condition: { type: 'quiz_count', value: 100 } },
  // 精熟類
  { id: 'master_10', name: '初窺門徑', icon: '⭐', description: '精熟 10 個單字', rarity: 'common', condition: { type: 'mastered_count', value: 10 } },
  { id: 'master_50', name: '漸入佳境', icon: '🌟', description: '精熟 50 個單字', rarity: 'rare', condition: { type: 'mastered_count', value: 50 } },
  { id: 'master_100', name: '百詞達人', icon: '💫', description: '精熟 100 個單字', rarity: 'rare', condition: { type: 'mastered_count', value: 100 } },
  { id: 'master_500', name: '詞彙大師', icon: '👑', description: '精熟 500 個單字', rarity: 'epic', condition: { type: 'mastered_count', value: 500 } },
  { id: 'master_1000', name: '千詞王者', icon: '🏆', description: '精熟 1000 個單字', rarity: 'legendary', condition: { type: 'mastered_count', value: 1000 } },
  // 準確類
  { id: 'perfect_1', name: '神射手', icon: '🎯', description: '單次測驗 100% 正確', rarity: 'common', condition: { type: 'perfect_quiz', value: 1 } },
  { id: 'perfect_5', name: '穩定輸出', icon: '🔥', description: '5 次測驗 100% 正確', rarity: 'rare', condition: { type: 'perfect_quiz', value: 5 } },
  { id: 'perfect_10', name: '完美主義', icon: '💎', description: '10 次測驗 100% 正確', rarity: 'epic', condition: { type: 'perfect_quiz', value: 10 } },
  // 連續登入類
  { id: 'streak_3', name: '持之以恆', icon: '🔥', description: '連續登入 3 天', rarity: 'common', condition: { type: 'login_streak', value: 3 } },
  { id: 'streak_7', name: '一週達人', icon: '🗓️', description: '連續登入 7 天', rarity: 'rare', condition: { type: 'login_streak', value: 7 } },
  { id: 'streak_14', name: '堅持不懈', icon: '💪', description: '連續登入 14 天', rarity: 'rare', condition: { type: 'login_streak', value: 14 } },
  { id: 'streak_30', name: '鐵人意志', icon: '🏅', description: '連續登入 30 天', rarity: 'epic', condition: { type: 'login_streak', value: 30 } },
  // 星星類
  { id: 'stars_100', name: '小富翁', icon: '💰', description: '累積獲得 100 星星', rarity: 'common', condition: { type: 'total_stars', value: 100 } },
  { id: 'stars_500', name: '星星獵人', icon: '🌠', description: '累積獲得 500 星星', rarity: 'rare', condition: { type: 'total_stars', value: 500 } },
  { id: 'stars_1000', name: '星光璀璨', icon: '✨', description: '累積獲得 1000 星星', rarity: 'epic', condition: { type: 'total_stars', value: 1000 } },
];

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
        quizSessions: true,
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

// 裝飾品定義（一次性購買）
const SHOP_ITEMS = [
  // 頭像框
  { id: 'frame_fire', name: '火焰框', icon: '🔥', description: '燃燒吧！小宇宙', type: 'frame', price: 50, preview: 'fire' },
  { id: 'frame_ice', name: '冰晶框', icon: '❄️', description: '冷靜而優雅', type: 'frame', price: 50, preview: 'ice' },
  { id: 'frame_rainbow', name: '彩虹框', icon: '🌈', description: '七彩繽紛', type: 'frame', price: 100, preview: 'rainbow' },
  { id: 'frame_gold', name: '黃金框', icon: '👑', description: '閃閃發光', type: 'frame', price: 150, preview: 'gold' },
  { id: 'frame_diamond', name: '鑽石框', icon: '💎', description: '璀璨奪目', type: 'frame', price: 300, preview: 'diamond' },
  // 主題
  { id: 'theme_ocean', name: '海洋主題', icon: '🌊', description: '清涼的藍色調', type: 'theme', price: 200, preview: 'ocean' },
  { id: 'theme_forest', name: '森林主題', icon: '🌲', description: '自然的綠色調', type: 'theme', price: 200, preview: 'forest' },
  { id: 'theme_sunset', name: '夕陽主題', icon: '🌅', description: '溫暖的橘色調', type: 'theme', price: 200, preview: 'sunset' },
  { id: 'theme_galaxy', name: '星空主題', icon: '🌌', description: '神秘的紫色調', type: 'theme', price: 300, preview: 'galaxy' },
];

// 消耗品道具定義
const CONSUMABLE_ITEMS = [
  { id: 'time_extend', name: '時間延長卡', icon: '⏰', description: '本題時間 +10 秒', price: 30, effect: 'extend_time' },
  { id: 'hint', name: '提示卡', icon: '💡', description: '顯示答案的第一個字母', price: 40, effect: 'show_hint' },
  { id: 'skip', name: '跳過卡', icon: '⏭️', description: '跳過本題，不計對錯', price: 50, effect: 'skip_question' },
  { id: 'double_star', name: '雙倍星星卡', icon: '✨', description: '本次測驗星星 ×2', price: 80, effect: 'double_stars' },
  { id: 'shield', name: '護盾卡', icon: '🛡️', description: '答錯一題不扣分', price: 60, effect: 'protect_wrong' },
];

// 寶箱商品定義（可重複購買）
const CHEST_SHOP_ITEMS = [
  { id: 'chest_bronze', name: '銅寶箱', icon: '🥉', description: '包含隨機獎勵', chestType: 'bronze', price: 50 },
  { id: 'chest_silver', name: '銀寶箱', icon: '🥈', description: '更高機率獲得稀有獎勵', chestType: 'silver', price: 120 },
  { id: 'chest_gold', name: '金寶箱', icon: '🥇', description: '保底獲得稀有獎勵', chestType: 'gold', price: 250 },
  { id: 'chest_diamond', name: '鑽石寶箱', icon: '💎', description: '必得史詩或以上獎勵', chestType: 'diamond', price: 500 },
];

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

// ============ 學科分類系統 ============

const QUIZ_CATEGORIES = {
  daily_life:     { key: 'daily_life',     name: '日常生活', emoji: '🏠', strongTypes: ['一般', '草', '妖精'],                weakTypes: ['鋼', '龍'] },
  nature_science: { key: 'nature_science', name: '自然科學', emoji: '🌍', strongTypes: ['草', '水', '蟲', '地面'],            weakTypes: ['鋼', '幽靈'] },
  tech_numbers:   { key: 'tech_numbers',   name: '科技數字', emoji: '💻', strongTypes: ['電', '鋼', '超能力'],                weakTypes: ['草', '蟲'] },
  sports_action:  { key: 'sports_action',  name: '運動動作', emoji: '⚽', strongTypes: ['格鬥', '飛行', '地面'],              weakTypes: ['超能力', '幽靈'] },
  arts_emotions:  { key: 'arts_emotions',  name: '藝術情感', emoji: '🎨', strongTypes: ['妖精', '超能力', '幽靈'],            weakTypes: ['岩石', '格鬥'] },
  adventure_geo:  { key: 'adventure_geo',  name: '冒險地理', emoji: '🗺️', strongTypes: ['飛行', '水', '龍', '岩石'],          weakTypes: ['蟲', '電'] },
  mythology:      { key: 'mythology',      name: '神話奇幻', emoji: '🐉', strongTypes: ['龍', '惡', '幽靈', '火'],            weakTypes: ['一般', '草'] },
  food_health:    { key: 'food_health',    name: '飲食健康', emoji: '🍎', strongTypes: ['火', '冰', '毒', '草'],              weakTypes: ['飛行', '龍'] },
};

// 計算寵物屬性與學科分類的加成倍率
const calculateTypeBonus = (petTypes, category) => {
  if (!category || !QUIZ_CATEGORIES[category]) return 1.0;
  const { strongTypes, weakTypes } = QUIZ_CATEGORIES[category];
  // 擅長優先：寵物任一屬性命中擅長 → 超有效
  if (petTypes.some(t => strongTypes.includes(t))) return 1.3;
  if (petTypes.some(t => weakTypes.includes(t))) return 0.7;
  return 1.0;
};

// ============ 虛擬寵物 API ============

// 寵物進化階段定義（分支式）
const PET_STAGES = {
  spirit_dog: {
    shared: [
      { stage: 1, name: '靈犬蛋', minLevel: 1 },
      { stage: 2, name: '絨絨犬', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '輝樂狼', minLevel: 30 },
      { stage: 4, name: '聖光麒麟犬', minLevel: 60 },
      { stage: 5, name: '最終聖光麒麟犬', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '影爪狼', minLevel: 30 },
      { stage: 4, name: '月蝕狼人', minLevel: 60 },
      { stage: 5, name: '最終月蝕狼人', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  chick_bird: {
    shared: [
      { stage: 1, name: '雛鳥蛋', minLevel: 1 },
      { stage: 2, name: '雲雀寶寶', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '雷雲鷹', minLevel: 30 },
      { stage: 4, name: '嘉雷鵬王', minLevel: 60 },
      { stage: 5, name: '最終嘉雷鵬王', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '霜翼鴞', minLevel: 30 },
      { stage: 4, name: '極地冰鳳', minLevel: 60 },
      { stage: 5, name: '最終極地冰鳳', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  young_scale: {
    shared: [
      { stage: 1, name: '幼鱗蛋', minLevel: 1 },
      { stage: 2, name: '黏黏泥鰻', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '激流海蛇', minLevel: 30 },
      { stage: 4, name: '深海滄龍', minLevel: 60 },
      { stage: 5, name: '最終深海滄龍', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '沼澤巨蛙', minLevel: 30 },
      { stage: 4, name: '劇毒沼王', minLevel: 60 },
      { stage: 5, name: '最終劇毒沼王', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  beetle: {
    shared: [
      { stage: 1, name: '甲蟲蛋', minLevel: 1 },
      { stage: 2, name: '硬殼幼蟲', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '武士蟑', minLevel: 30 },
      { stage: 4, name: '鋼鐵大獨角仙', minLevel: 60 },
      { stage: 5, name: '最終鋼鐵獨角仙', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '幻夢蛾', minLevel: 30 },
      { stage: 4, name: '星雲皇蛾', minLevel: 60 },
      { stage: 5, name: '最終星雲皇蛾', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  electric_mouse: {
    shared: [
      { stage: 1, name: '微電鼠蛋', minLevel: 1 },
      { stage: 2, name: '微電鼠', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '數據鼠', minLevel: 30 },
      { stage: 4, name: '賽博黑麥鼠', minLevel: 60 },
      { stage: 5, name: '最終量子主機鼠', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '孢子鼠', minLevel: 30 },
      { stage: 4, name: '蘑菇發電鼠', minLevel: 60 },
      { stage: 5, name: '最終真菌雷神鼠', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  hard_crab: {
    shared: [
      { stage: 1, name: '硬殼蟹蛋', minLevel: 1 },
      { stage: 2, name: '小石蟹', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '熔岩蟹', minLevel: 30 },
      { stage: 4, name: '火山壘疊蟹', minLevel: 60 },
      { stage: 5, name: '最終熔岩巨像蟹', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '深海發光蟹', minLevel: 30 },
      { stage: 4, name: '煙霧安康蟹', minLevel: 60 },
      { stage: 5, name: '最終深淵海溝蟹', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  mimic_lizard: {
    shared: [
      { stage: 1, name: '擬態蜥蛋', minLevel: 1 },
      { stage: 2, name: '變色小蜥', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '幻影蜥', minLevel: 30 },
      { stage: 4, name: '鏡像魔蜥', minLevel: 60 },
      { stage: 5, name: '最終虛空幻象龍', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '格鬥蜥', minLevel: 30 },
      { stage: 4, name: '武術大師蜥', minLevel: 60 },
      { stage: 5, name: '最終宗師門戰龍', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  seed_ball: {
    shared: [
      { stage: 1, name: '種子球蛋', minLevel: 1 },
      { stage: 2, name: '奇異種子', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '太陽花苞', minLevel: 30 },
      { stage: 4, name: '光合向日葵', minLevel: 60 },
      { stage: 5, name: '最終太陽神木精', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '寄生蘑蔓', minLevel: 30 },
      { stage: 4, name: '吸血荊棘怪', minLevel: 60 },
      { stage: 5, name: '最終腐朽魔花君主', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  jellyfish: {
    shared: [
      { stage: 1, name: '水母蛋', minLevel: 1 },
      { stage: 2, name: '軟綿水母', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '光輝水母', minLevel: 30 },
      { stage: 4, name: '聖潔水母', minLevel: 60 },
      { stage: 5, name: '最終治癒海靈', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '劇毒水母', minLevel: 30 },
      { stage: 4, name: '腐蝕水母', minLevel: 60 },
      { stage: 5, name: '最終深淵毒皇', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  ore_giant: {
    shared: [
      { stage: 1, name: '礦石蛋', minLevel: 1 },
      { stage: 2, name: '小石怪', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '鐵礦怪', minLevel: 30 },
      { stage: 4, name: '合金堡壘', minLevel: 60 },
      { stage: 5, name: '最終鋼鐵巨神', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '晶石怪', minLevel: 30 },
      { stage: 4, name: '雷電晶簇', minLevel: 60 },
      { stage: 5, name: '最終能量晶核', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  jungle_cub: {
    shared: [
      { stage: 1, name: '幼獸蛋', minLevel: 1 },
      { stage: 2, name: '葉尾小獸', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '猛葉獸', minLevel: 30 },
      { stage: 4, name: '森之力士', minLevel: 60 },
      { stage: 5, name: '最終叢林霸主', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '擬態葉靈', minLevel: 30 },
      { stage: 4, name: '幽影樹靈', minLevel: 60 },
      { stage: 5, name: '最終森林魅影', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  sky_dragon: {
    shared: [
      { stage: 1, name: '幼龍蛋', minLevel: 1 },
      { stage: 2, name: '幼龍寶寶', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '炎翼龍', minLevel: 30 },
      { stage: 4, name: '爆炎飛龍', minLevel: 60 },
      { stage: 5, name: '最終末日炎龍', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '暴風龍', minLevel: 30 },
      { stage: 4, name: '疾風天龍', minLevel: 60 },
      { stage: 5, name: '最終蒼穹風神', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  dune_bug: {
    shared: [
      { stage: 1, name: '沙丘蟲蛋', minLevel: 1 },
      { stage: 2, name: '沙塵幼蟲', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '岩甲蟻', minLevel: 30 },
      { stage: 4, name: '沙暴巨蜈蚣', minLevel: 60 },
      { stage: 5, name: '最終鋼鐵沙皇蟲', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '掘地蟲', minLevel: 30 },
      { stage: 4, name: '流沙蟻獅', minLevel: 60 },
      { stage: 5, name: '最終沙漠死神蠍', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  sonic_bat: {
    shared: [
      { stage: 1, name: '音波蝠蛋', minLevel: 1 },
      { stage: 2, name: '小耳蝠', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '共鳴蝠', minLevel: 30 },
      { stage: 4, name: '心靈聲波蝠', minLevel: 60 },
      { stage: 5, name: '最終超聲波女皇', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '毒牙蝠', minLevel: 30 },
      { stage: 4, name: '腐蝕音波蝠', minLevel: 60 },
      { stage: 5, name: '最終瘟疫夜魔蝠', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  snow_beast: {
    shared: [
      { stage: 1, name: '雪獸蛋', minLevel: 1 },
      { stage: 2, name: '絨毛小怪', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '冰爪獸', minLevel: 30 },
      { stage: 4, name: '暴雪拳師', minLevel: 60 },
      { stage: 5, name: '最終絕對零度格鬥家', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '雪精靈', minLevel: 30 },
      { stage: 4, name: '冰晶舞者', minLevel: 60 },
      { stage: 5, name: '最終極光雪女皇', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  circuit_fish: {
    shared: [
      { stage: 1, name: '電路魚蛋', minLevel: 1 },
      { stage: 2, name: '小銅魚', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '電流鰻', minLevel: 30 },
      { stage: 4, name: '高壓電鰻', minLevel: 60 },
      { stage: 5, name: '最終雪暴海龍王', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '裝甲魚', minLevel: 30 },
      { stage: 4, name: '深海潛艇魚', minLevel: 60 },
      { stage: 5, name: '最終機械海神鎧', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  mushroom: {
    shared: [
      { stage: 1, name: '蘑菇蛋', minLevel: 1 },
      { stage: 2, name: '小蘑菇', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '拳擊菇', minLevel: 30 },
      { stage: 4, name: '森林守護者', minLevel: 60 },
      { stage: 5, name: '最終森之蘑菇王', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '毒孢菇', minLevel: 30 },
      { stage: 4, name: '腐爛蘑菇怪', minLevel: 60 },
      { stage: 5, name: '最終瘟疫蘑菇皇', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  crystal_beast: {
    shared: [
      { stage: 1, name: '水晶獸蛋', minLevel: 1 },
      { stage: 2, name: '晶體寶寶', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '聖晶獸', minLevel: 30 },
      { stage: 4, name: '光輝獨角獸', minLevel: 60 },
      { stage: 5, name: '最終水晶天馬', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '影晶獸', minLevel: 30 },
      { stage: 4, name: '詛咒石像鬼', minLevel: 60 },
      { stage: 5, name: '最終黑曜石魔像', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  nebula_fish: {
    shared: [
      { stage: 1, name: '星雲魚蛋', minLevel: 1 },
      { stage: 2, name: '太空小魚', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '星系魚', minLevel: 30 },
      { stage: 4, name: '引力海龍', minLevel: 60 },
      { stage: 5, name: '最終宇宙鯨皇', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '黑洞', minLevel: 30 },
      { stage: 4, name: '吞噬海怪', minLevel: 60 },
      { stage: 5, name: '最終深淵星雲獸', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  clockwork_bird: {
    shared: [
      { stage: 1, name: '發條鳥蛋', minLevel: 1 },
      { stage: 2, name: '機械雛鳥', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '時鐘鷹', minLevel: 30 },
      { stage: 4, name: '精密獵隼', minLevel: 60 },
      { stage: 5, name: '最終時間領主鳶', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '廢鐵鳥', minLevel: 30 },
      { stage: 4, name: '故障鳳凰', minLevel: 60 },
      { stage: 5, name: '最終末日機械鳥', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
};

// 寵物物種定義（含價格、稀有度、屬性、能力）
const PET_SPECIES = [
  // Normal 普通
  { species: 'spirit_dog', name: '靈犬', price: 0, rarity: 'normal', description: '忠誠的靈犬，能感知主人的心意', baseType: '一般', pathA: { types: ['一般', '妖精'], name: '聖光靈犬路線' }, pathB: { types: ['一般', '惡'], name: '闇影獵犬路線' }, baseStats: { hp: 75, attack: 60, defense: 55 }, growthRates: { hp: 3.0, attack: 2.5, defense: 2.2 }, ability: { name: '忠犬直覺', desc: '提示不消耗道具機率15%' } },
  { species: 'chick_bird', name: '雛鳥', price: 80, rarity: 'normal', description: '展翅翱翔的小小鳥兒', baseType: '飛行', pathA: { types: ['飛行', '電'], name: '雷電飛鷹路線' }, pathB: { types: ['飛行', '冰'], name: '極地冰鳳路線' }, baseStats: { hp: 60, attack: 70, defense: 45 }, growthRates: { hp: 2.4, attack: 2.8, defense: 1.8 }, ability: { name: '疾風之翼', desc: '答題時間+10%獎勵' } },
  { species: 'beetle', name: '甲蟲', price: 130, rarity: 'normal', description: '堅硬外殼下藏著無限潛能', baseType: '蟲', pathA: { types: ['蟲', '鋼'], name: '鋼鐵甲蟲路線' }, pathB: { types: ['蟲', '超能力'], name: '幻夢蛾路線' }, baseStats: { hp: 70, attack: 65, defense: 70 }, growthRates: { hp: 2.8, attack: 2.6, defense: 2.8 }, ability: { name: '硬殼防禦', desc: '測驗扣分減少10%' } },
  { species: 'electric_mouse', name: '微電鼠', price: 80, rarity: 'normal', description: '帶電的小小鼠，活力十足', baseType: '電', pathA: { types: ['電', '鋼'], name: '賽博電鼠路線' }, pathB: { types: ['電', '草'], name: '真菌雷神路線' }, baseStats: { hp: 55, attack: 75, defense: 40 }, growthRates: { hp: 2.2, attack: 3.0, defense: 1.6 }, ability: { name: '靜電感應', desc: '連對加成額外+5%' } },
  { species: 'hard_crab', name: '硬殼蟹', price: 150, rarity: 'normal', description: '堅如磐石的小螃蟹', baseType: '岩石', pathA: { types: ['岩石', '火'], name: '熔岩蟹路線' }, pathB: { types: ['岩石', '水'], name: '深海蟹路線' }, baseStats: { hp: 80, attack: 55, defense: 80 }, growthRates: { hp: 3.2, attack: 2.2, defense: 3.2 }, ability: { name: '岩石護盾', desc: '每日首次錯誤不扣分' } },
  { species: 'mimic_lizard', name: '擬態蜥', price: 100, rarity: 'normal', description: '善於偽裝的神秘蜥蜴', baseType: '一般', pathA: { types: ['一般', '超能力'], name: '幻象龍路線' }, pathB: { types: ['一般', '格鬥'], name: '格鬥龍路線' }, baseStats: { hp: 65, attack: 65, defense: 60 }, growthRates: { hp: 2.6, attack: 2.6, defense: 2.4 }, ability: { name: '變色偽裝', desc: '隨機獲得雙倍星星10%' } },
  { species: 'seed_ball', name: '種子球', price: 80, rarity: 'normal', description: '充滿生命力的小種子', baseType: '草', pathA: { types: ['草', '火'], name: '太陽神木路線' }, pathB: { types: ['草', '惡'], name: '腐朽魔花路線' }, baseStats: { hp: 70, attack: 55, defense: 60 }, growthRates: { hp: 2.8, attack: 2.2, defense: 2.4 }, ability: { name: '光合作用', desc: '飽足度自然恢復+20%' } },
  { species: 'dune_bug', name: '沙丘蟲', price: 120, rarity: 'normal', description: '在沙漠中穿行的小蟲', baseType: '地面', pathA: { types: ['地面', '鋼'], name: '鋼鐵沙皇路線' }, pathB: { types: ['地面', '蟲'], name: '沙漠死神路線' }, baseStats: { hp: 75, attack: 60, defense: 65 }, growthRates: { hp: 3.0, attack: 2.4, defense: 2.6 }, ability: { name: '沙漠潛行', desc: '測驗後額外獲得1星星' } },
  { species: 'sonic_bat', name: '音波蝠', price: 100, rarity: 'normal', description: '以超音波探索世界的蝙蝠', baseType: '飛行', pathA: { types: ['飛行', '超能力'], name: '超聲波女皇路線' }, pathB: { types: ['飛行', '毒'], name: '瘟疫夜魔路線' }, baseStats: { hp: 60, attack: 70, defense: 50 }, growthRates: { hp: 2.4, attack: 2.8, defense: 2.0 }, ability: { name: '回聲定位', desc: '選擇題錯誤選項高亮一個5%' } },
  { species: 'mushroom', name: '蘑菇', price: 100, rarity: 'normal', description: '可愛的小蘑菇，別小看它', baseType: '草', pathA: { types: ['草', '格鬥'], name: '森之蘑菇王路線' }, pathB: { types: ['草', '毒'], name: '瘟疫蘑菇皇路線' }, baseStats: { hp: 75, attack: 55, defense: 65 }, growthRates: { hp: 3.0, attack: 2.2, defense: 2.6 }, ability: { name: '孢子散播', desc: '快樂度衰減速度-20%' } },
  // Rare 稀有
  { species: 'young_scale', name: '幼鱗', price: 320, rarity: 'rare', description: '古老水龍的後裔', baseType: '水', pathA: { types: ['水', '龍'], name: '深海滄龍路線' }, pathB: { types: ['毒', '地面'], name: '劇毒沼王路線' }, baseStats: { hp: 80, attack: 70, defense: 65 }, growthRates: { hp: 3.2, attack: 2.8, defense: 2.6 }, ability: { name: '龍鱗庇護', desc: '每次進化額外獲得50星星' } },
  { species: 'jellyfish', name: '漂浮水母', price: 250, rarity: 'rare', description: '透明美麗的深海精靈', baseType: '水', pathA: { types: ['水', '妖精'], name: '治癒海靈路線' }, pathB: { types: ['水', '毒'], name: '深淵毒皇路線' }, baseStats: { hp: 70, attack: 60, defense: 70 }, growthRates: { hp: 2.8, attack: 2.4, defense: 2.8 }, ability: { name: '療癒觸手', desc: '餵食效果+30%' } },
  { species: 'ore_giant', name: '礦石巨人', price: 400, rarity: 'rare', description: '由礦物結晶而成的守護者', baseType: '岩石', pathA: { types: ['岩石', '鋼'], name: '鋼鐵巨神路線' }, pathB: { types: ['岩石', '電'], name: '能量晶核路線' }, baseStats: { hp: 90, attack: 65, defense: 85 }, growthRates: { hp: 3.6, attack: 2.6, defense: 3.4 }, ability: { name: '礦脈感知', desc: '商店物品價格-10%' } },
  { species: 'jungle_cub', name: '叢林幼獸', price: 300, rarity: 'rare', description: '叢林中最敏捷的獵手', baseType: '草', pathA: { types: ['草', '格鬥'], name: '叢林霸主路線' }, pathB: { types: ['草', '幽靈'], name: '森林魅影路線' }, baseStats: { hp: 75, attack: 75, defense: 60 }, growthRates: { hp: 3.0, attack: 3.0, defense: 2.4 }, ability: { name: '叢林本能', desc: '答題速度獎勵+15%' } },
  { species: 'snow_beast', name: '雪原獸', price: 380, rarity: 'rare', description: '冰雪中純白的神秘生物', baseType: '冰', pathA: { types: ['冰', '格鬥'], name: '絕對零度格鬥家路線' }, pathB: { types: ['冰', '妖精'], name: '極光雪女皇路線' }, baseStats: { hp: 80, attack: 65, defense: 75 }, growthRates: { hp: 3.2, attack: 2.6, defense: 3.0 }, ability: { name: '冰霜之息', desc: '連錯不超過2題時保護連對紀錄' } },
  { species: 'circuit_fish', name: '電路魚', price: 320, rarity: 'rare', description: '半生物半機械的奇特魚類', baseType: '水', pathA: { types: ['水', '電'], name: '雪暴海龍王路線' }, pathB: { types: ['水', '鋼'], name: '機械海神鎧路線' }, baseStats: { hp: 70, attack: 75, defense: 65 }, growthRates: { hp: 2.8, attack: 3.0, defense: 2.6 }, ability: { name: '電路超載', desc: '經驗值獲取+10%' } },
  { species: 'clockwork_bird', name: '發條鳥', price: 350, rarity: 'rare', description: '精密齒輪驅動的機械鳥', baseType: '鋼', pathA: { types: ['鋼', '飛行'], name: '時間領主鳶路線' }, pathB: { types: ['鋼', '火'], name: '末日機械鳥路線' }, baseStats: { hp: 70, attack: 70, defense: 75 }, growthRates: { hp: 2.8, attack: 2.8, defense: 3.0 }, ability: { name: '精密計時', desc: '測驗計時器+5秒' } },
  // Legendary 傳說
  { species: 'sky_dragon', name: '天空幼龍', price: 800, rarity: 'legendary', description: '翱翔天際的傳說龍族', baseType: '龍', pathA: { types: ['龍', '火'], name: '末日炎龍路線' }, pathB: { types: ['龍', '飛行'], name: '蒼穹風神路線' }, baseStats: { hp: 90, attack: 85, defense: 70 }, growthRates: { hp: 3.6, attack: 3.4, defense: 2.8 }, ability: { name: '龍威', desc: '滿分測驗星星+30%' } },
  { species: 'crystal_beast', name: '水晶獸', price: 900, rarity: 'legendary', description: '由純淨水晶孕育的神獸', baseType: '岩石', pathA: { types: ['岩石', '妖精'], name: '水晶天馬路線' }, pathB: { types: ['岩石', '幽靈'], name: '黑曜石魔像路線' }, baseStats: { hp: 85, attack: 80, defense: 80 }, growthRates: { hp: 3.4, attack: 3.2, defense: 3.2 }, ability: { name: '水晶共鳴', desc: '所有測驗獎勵+15%' } },
  { species: 'nebula_fish', name: '星雲魚', price: 1000, rarity: 'legendary', description: '來自宇宙深處的神秘魚類', baseType: '水', pathA: { types: ['水', '超能力'], name: '宇宙鯨皇路線' }, pathB: { types: ['水', '惡'], name: '深淵星雲獸路線' }, baseStats: { hp: 85, attack: 85, defense: 75 }, growthRates: { hp: 3.4, attack: 3.4, defense: 3.0 }, ability: { name: '星際感知', desc: '所有經驗值+20%' } },
];

// 計算升級所需經驗值
const getExpForLevel = (level) => level * 50;

// 計算 RPG 數值
const calculateRpgStats = (species, level) => {
  const speciesInfo = PET_SPECIES.find(s => s.species === species);
  if (!speciesInfo) return { hp: 100, attack: 50, defense: 50 };
  const { baseStats, growthRates } = speciesInfo;
  return {
    hp: Math.floor(baseStats.hp + level * growthRates.hp),
    attack: Math.floor(baseStats.attack + level * growthRates.attack),
    defense: Math.floor(baseStats.defense + level * growthRates.defense),
  };
};

// 取得寵物目前的屬性列表
const getPetTypes = (species, evolutionPath, stage) => {
  const speciesInfo = PET_SPECIES.find(s => s.species === species);
  if (!speciesInfo) return ['一般'];
  if (stage < 3 || !evolutionPath) return [speciesInfo.baseType];
  const path = evolutionPath === 'A' ? speciesInfo.pathA : speciesInfo.pathB;
  return path ? path.types : [speciesInfo.baseType];
};

// 取得階段列表（根據進化路線）
const getStagesForPet = (species, evolutionPath) => {
  const stageData = PET_STAGES[species];
  if (!stageData) return [];
  const shared = stageData.shared || [];
  if (!evolutionPath) return shared;
  const pathStages = evolutionPath === 'A' ? stageData.pathA : stageData.pathB;
  return [...shared, ...(pathStages || [])];
};

// 計算當前等級和階段（分支式）
const calculatePetStatus = (exp, species = 'spirit_dog', evolutionPath = null) => {
  let level = 1;
  let remainingExp = exp;

  while (remainingExp >= getExpForLevel(level) && level < 100) {
    remainingExp -= getExpForLevel(level);
    level++;
  }

  const stageData = PET_STAGES[species] || PET_STAGES.spirit_dog;
  let stage = 1;

  // Shared stages (1-2)
  for (const s of (stageData.shared || [])) {
    if (level >= s.minLevel) stage = s.stage;
  }

  // Path stages (3-5) only if evolution path chosen
  if (evolutionPath && stage >= 2) {
    const pathStages = evolutionPath === 'A' ? stageData.pathA : stageData.pathB;
    for (const s of (pathStages || [])) {
      if (level >= s.minLevel) stage = s.stage;
    }
  }

  // Check if evolution choice is needed
  const needsEvolutionChoice = !evolutionPath && level >= (stageData.evolutionLevel || 30) && stage <= 2;

  return { level, stage, expToNext: getExpForLevel(level), currentExp: remainingExp, needsEvolutionChoice };
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

    const enrichedPets = pets.map(pet => {
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
    });

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

    // 計算飽足度和快樂度衰減（每小時 -2）
    const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
    const hungerDecay = Math.floor(hoursSinceLastFed * 2);
    const currentHunger = Math.max(0, pet.hunger - hungerDecay);
    const currentHappiness = Math.max(0, pet.happiness - Math.floor(hungerDecay / 2));

    // 計算等級和階段
    const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
    const stages = PET_STAGES[pet.species] || PET_STAGES.spirit_dog;
    const allStages = getStagesForPet(pet.species, pet.evolutionPath);
    const currentStage = allStages.find(s => s.stage === status.stage);
    const speciesInfo = PET_SPECIES.find(s => s.species === pet.species);
    const rpgStats = calculateRpgStats(pet.species, status.level);
    const types = getPetTypes(pet.species, pet.evolutionPath, status.stage);

    res.json({
      hasPet: true,
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
      rpgStats,
      types,
      evolutionPath: pet.evolutionPath,
      needsEvolutionChoice: status.needsEvolutionChoice,
      ability: speciesInfo?.ability,
      rarity: speciesInfo?.rarity || 'normal',
    });
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

const EQUIPMENT_ITEMS = [
  // 帽子 (hat) - Normal / Rare / Legendary
  { id: 'hat_wizard', name: '魔法師帽', icon: '🎩', slot: 'hat', rarity: 'normal', price: 200, bonusType: 'exp', bonusValue: 10, description: '經驗值 +10%' },
  { id: 'hat_crown', name: '王者之冠', icon: '👑', slot: 'hat', rarity: 'rare', price: 500, bonusType: 'exp', bonusValue: 25, description: '經驗值 +25%' },
  { id: 'hat_halo', name: '天使光環', icon: '😇', slot: 'hat', rarity: 'legendary', price: 1000, bonusType: 'exp', bonusValue: 50, description: '經驗值 +50%' },
  // 項鍊 (necklace) - Normal / Rare / Legendary
  { id: 'neck_bell', name: '幸運鈴鐺', icon: '🔔', slot: 'necklace', rarity: 'normal', price: 250, bonusType: 'stars', bonusValue: 10, description: '星星 +10%' },
  { id: 'neck_crystal', name: '水晶項鍊', icon: '💎', slot: 'necklace', rarity: 'rare', price: 600, bonusType: 'stars', bonusValue: 20, description: '星星 +20%' },
  { id: 'neck_relic', name: '遠古聖物', icon: '🔮', slot: 'necklace', rarity: 'legendary', price: 1500, bonusType: 'stars', bonusValue: 50, description: '星星 +50%' },
  // 翅膀 (wings) - Normal / Rare / Legendary
  { id: 'wings_feather', name: '羽毛翅膀', icon: '🪶', slot: 'wings', rarity: 'normal', price: 300, bonusType: 'exp', bonusValue: 15, description: '經驗值 +15%' },
  { id: 'wings_fairy', name: '精靈之翼', icon: '🧚', slot: 'wings', rarity: 'rare', price: 700, bonusType: 'exp', bonusValue: 30, description: '經驗值 +30%' },
  { id: 'wings_dragon', name: '龍翼', icon: '🦋', slot: 'wings', rarity: 'legendary', price: 1800, bonusType: 'exp', bonusValue: 60, description: '經驗值 +60%' },
  // 武器 (weapon) - Normal / Rare / Legendary
  { id: 'weapon_wand', name: '魔杖', icon: '🪄', slot: 'weapon', rarity: 'normal', price: 350, bonusType: 'exp', bonusValue: 20, description: '經驗值 +20%' },
  { id: 'weapon_sword', name: '聖劍', icon: '⚔️', slot: 'weapon', rarity: 'rare', price: 800, bonusType: 'exp', bonusValue: 40, description: '經驗值 +40%' },
  { id: 'weapon_staff', name: '賢者之杖', icon: '🔱', slot: 'weapon', rarity: 'legendary', price: 2000, bonusType: 'exp', bonusValue: 80, description: '經驗值 +80%' },
];

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

// 稱號定義
const TITLES = [
  // 普通稱號
  { id: 'learner', name: '學習者', description: '開始學習之旅', rarity: 'common', color: '#6b7280', glow: false, condition: { type: 'quiz_count', value: 1 } },
  { id: 'bookworm', name: '小書蟲', description: '完成 10 次測驗', rarity: 'common', color: '#6b7280', glow: false, condition: { type: 'quiz_count', value: 10 } },
  { id: 'diligent', name: '勤奮小蜜蜂', description: '連續登入 3 天', rarity: 'common', color: '#6b7280', glow: false, condition: { type: 'login_streak', value: 3 } },
  // 稀有稱號
  { id: 'memory_master', name: '記憶高手', description: '精熟 50 個單字', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'mastered_count', value: 50 } },
  { id: 'speed_star', name: '速度之星', description: '完成 50 次測驗', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'quiz_count', value: 50 } },
  { id: 'persistent', name: '堅持不懈', description: '連續登入 7 天', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'login_streak', value: 7 } },
  { id: 'collector', name: '收藏家', description: '收集 20 張貼紙', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'sticker_count', value: 20 } },
  // 史詩稱號
  { id: 'word_hunter', name: '單字獵人', description: '精熟 200 個單字', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'mastered_count', value: 200 } },
  { id: 'genius', name: '小學霸', description: '完成 100 次測驗', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'quiz_count', value: 100 } },
  { id: 'iron_will', name: '鐵人意志', description: '連續登入 14 天', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'login_streak', value: 14 } },
  { id: 'treasure_hunter', name: '寶藏獵人', description: '開啟 30 個寶箱', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'chest_opened', value: 30 } },
  // 傳說稱號
  { id: 'prodigy', name: '英語小天才', description: '精熟 500 個單字', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'mastered_count', value: 500 } },
  { id: 'super_scholar', name: '超級學霸', description: '獲得 1000 顆星星', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'total_stars', value: 1000 } },
  { id: 'marathon', name: '學習馬拉松', description: '連續登入 30 天', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'login_streak', value: 30 } },
  // 神話稱號（極稀有，只能從鑽石寶箱抽到）
  { id: 'legend', name: '傳說學神', description: '神秘的傳說稱號', rarity: 'mythic', color: '#ef4444', glow: true, condition: { type: 'special', value: 0 } },
  { id: 'chosen_one', name: '天選之人', description: '被命運選中的人', rarity: 'mythic', color: '#ef4444', glow: true, condition: { type: 'special', value: 0 } },
];

// 貼紙系列定義
const STICKER_SERIES = {
  animals: {
    name: '動物系列',
    icon: '🐾',
    rarity: 'common',
    stickers: [
      { id: 'animal_dog', name: '小狗', icon: '🐕' },
      { id: 'animal_cat', name: '小貓', icon: '🐱' },
      { id: 'animal_rabbit', name: '小兔', icon: '🐰' },
      { id: 'animal_bear', name: '小熊', icon: '🐻' },
      { id: 'animal_panda', name: '熊貓', icon: '🐼' },
      { id: 'animal_fox', name: '狐狸', icon: '🦊' },
      { id: 'animal_lion', name: '獅子', icon: '🦁' },
      { id: 'animal_tiger', name: '老虎', icon: '🐯' },
      { id: 'animal_elephant', name: '大象', icon: '🐘' },
      { id: 'animal_monkey', name: '猴子', icon: '🐵' },
      { id: 'animal_penguin', name: '企鵝', icon: '🐧' },
      { id: 'animal_koala', name: '無尾熊', icon: '🐨' },
    ]
  },
  space: {
    name: '太空系列',
    icon: '🚀',
    rarity: 'common',
    stickers: [
      { id: 'space_rocket', name: '火箭', icon: '🚀' },
      { id: 'space_moon', name: '月球', icon: '🌙' },
      { id: 'space_star', name: '星星', icon: '⭐' },
      { id: 'space_sun', name: '太陽', icon: '☀️' },
      { id: 'space_earth', name: '地球', icon: '🌍' },
      { id: 'space_saturn', name: '土星', icon: '🪐' },
      { id: 'space_alien', name: '外星人', icon: '👽' },
      { id: 'space_ufo', name: '幽浮', icon: '🛸' },
      { id: 'space_astronaut', name: '太空人', icon: '👨‍🚀' },
      { id: 'space_meteor', name: '流星', icon: '☄️' },
      { id: 'space_galaxy', name: '銀河', icon: '🌌' },
      { id: 'space_telescope', name: '望遠鏡', icon: '🔭' },
    ]
  },
  food: {
    name: '美食系列',
    icon: '🍔',
    rarity: 'common',
    stickers: [
      { id: 'food_burger', name: '漢堡', icon: '🍔' },
      { id: 'food_pizza', name: '披薩', icon: '🍕' },
      { id: 'food_icecream', name: '冰淇淋', icon: '🍦' },
      { id: 'food_cake', name: '蛋糕', icon: '🎂' },
      { id: 'food_donut', name: '甜甜圈', icon: '🍩' },
      { id: 'food_cookie', name: '餅乾', icon: '🍪' },
      { id: 'food_fries', name: '薯條', icon: '🍟' },
      { id: 'food_hotdog', name: '熱狗', icon: '🌭' },
      { id: 'food_sushi', name: '壽司', icon: '🍣' },
      { id: 'food_ramen', name: '拉麵', icon: '🍜' },
      { id: 'food_candy', name: '糖果', icon: '🍬' },
      { id: 'food_chocolate', name: '巧克力', icon: '🍫' },
    ]
  },
  dinosaurs: {
    name: '恐龍系列',
    icon: '🦕',
    rarity: 'rare',
    stickers: [
      { id: 'dino_trex', name: '暴龍', icon: '🦖' },
      { id: 'dino_bronto', name: '雷龍', icon: '🦕' },
      { id: 'dino_tricera', name: '三角龍', icon: '🦏' },
      { id: 'dino_pterano', name: '翼龍', icon: '🦅' },
      { id: 'dino_stego', name: '劍龍', icon: '🦔' },
      { id: 'dino_raptor', name: '迅猛龍', icon: '🦎' },
      { id: 'dino_ankylo', name: '甲龍', icon: '🐢' },
      { id: 'dino_spino', name: '棘龍', icon: '🐊' },
      { id: 'dino_egg', name: '恐龍蛋', icon: '🥚' },
      { id: 'dino_fossil', name: '化石', icon: '🦴' },
      { id: 'dino_footprint', name: '腳印', icon: '🐾' },
      { id: 'dino_volcano', name: '火山', icon: '🌋' },
    ]
  },
  mythology: {
    name: '神話系列',
    icon: '🐉',
    rarity: 'legendary',
    stickers: [
      { id: 'myth_dragon', name: '神龍', icon: '🐉' },
      { id: 'myth_phoenix', name: '鳳凰', icon: '🔥' },
      { id: 'myth_unicorn', name: '獨角獸', icon: '🦄' },
      { id: 'myth_mermaid', name: '美人魚', icon: '🧜‍♀️' },
      { id: 'myth_fairy', name: '精靈', icon: '🧚' },
      { id: 'myth_wizard', name: '巫師', icon: '🧙' },
      { id: 'myth_crown', name: '王冠', icon: '👑' },
      { id: 'myth_crystal', name: '魔法水晶', icon: '🔮' },
      { id: 'myth_sword', name: '神劍', icon: '⚔️' },
      { id: 'myth_shield', name: '盾牌', icon: '🛡️' },
      { id: 'myth_potion', name: '魔藥', icon: '🧪' },
      { id: 'myth_castle', name: '城堡', icon: '🏰' },
    ]
  }
};

// 取得所有貼紙的扁平清單
const getAllStickers = () => {
  const stickers = [];
  for (const [seriesId, series] of Object.entries(STICKER_SERIES)) {
    for (const sticker of series.stickers) {
      stickers.push({ ...sticker, seriesId, seriesName: series.name, rarity: series.rarity });
    }
  }
  return stickers;
};

// 寶箱配置
const CHEST_CONFIG = {
  bronze: {
    name: '銅寶箱',
    icon: '📦',
    color: '#cd7f32',
    rewards: [
      { type: 'stars', min: 5, max: 15, weight: 70 },
      { type: 'sticker', rarity: 'common', weight: 25 },
      { type: 'sticker', rarity: 'rare', weight: 5 }
    ]
  },
  silver: {
    name: '銀寶箱',
    icon: '🎁',
    color: '#c0c0c0',
    rewards: [
      { type: 'stars', min: 15, max: 40, weight: 55 },
      { type: 'sticker', rarity: 'common', weight: 25 },
      { type: 'sticker', rarity: 'rare', weight: 15 },
      { type: 'sticker', rarity: 'legendary', weight: 5 }
    ]
  },
  gold: {
    name: '金寶箱',
    icon: '🏆',
    color: '#ffd700',
    rewards: [
      { type: 'stars', min: 30, max: 80, weight: 40 },
      { type: 'sticker', rarity: 'rare', weight: 35 },
      { type: 'sticker', rarity: 'legendary', weight: 20 },
      { type: 'title', rarity: 'rare', weight: 5 }
    ]
  },
  diamond: {
    name: '鑽石寶箱',
    icon: '💎',
    color: '#b9f2ff',
    rewards: [
      { type: 'stars', min: 80, max: 150, weight: 30 },
      { type: 'sticker', rarity: 'legendary', weight: 40 },
      { type: 'title', rarity: 'epic', weight: 20 },
      { type: 'title', rarity: 'mythic', weight: 10 }
    ]
  }
};

// 轉盤獎勵配置
const WHEEL_REWARDS = [
  { id: 'stars_5', name: '5 星星', icon: '⭐', type: 'stars', value: 5, weight: 25 },
  { id: 'stars_10', name: '10 星星', icon: '🌟', type: 'stars', value: 10, weight: 20 },
  { id: 'stars_20', name: '20 星星', icon: '✨', type: 'stars', value: 20, weight: 15 },
  { id: 'stars_50', name: '50 星星', icon: '💫', type: 'stars', value: 50, weight: 5 },
  { id: 'chest_bronze', name: '銅寶箱', icon: '📦', type: 'chest', value: 'bronze', weight: 15 },
  { id: 'chest_silver', name: '銀寶箱', icon: '🎁', type: 'chest', value: 'silver', weight: 10 },
  { id: 'chest_gold', name: '金寶箱', icon: '🏆', type: 'chest', value: 'gold', weight: 5 },
  { id: 'sticker_random', name: '隨機貼紙', icon: '🎨', type: 'sticker', value: 'random', weight: 5 },
];

// 依權重隨機選擇
const weightedRandom = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
};

// 隨機取得指定稀有度的貼紙
const getRandomSticker = (rarity) => {
  const allStickers = getAllStickers();
  const filteredStickers = rarity ? allStickers.filter(s => s.rarity === rarity) : allStickers;
  if (filteredStickers.length === 0) return allStickers[Math.floor(Math.random() * allStickers.length)];
  return filteredStickers[Math.floor(Math.random() * filteredStickers.length)];
};

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
