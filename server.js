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
    const { teacherPassword, timePerQuestion, timeChoiceQuestion, timeSpellingQuestion, questionCount, questionTypes } = req.body;
    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: {
        teacherPassword,
        timePerQuestion,
        timeChoiceQuestion,
        timeSpellingQuestion,
        questionCount,
        questionTypes
      },
      create: {
        id: 'global',
        teacherPassword,
        timePerQuestion,
        timeChoiceQuestion: timeChoiceQuestion || 10,
        timeSpellingQuestion: timeSpellingQuestion || 30,
        questionCount,
        questionTypes
      }
    });
    res.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
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
    const { name, words } = req.body;
    const file = await prisma.wordFile.create({
      data: {
        name,
        words: {
          create: words.map(w => ({
            english: w.english,
            chinese: w.chinese,
            partOfSpeech: w.partOfSpeech || null
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
    const { name } = req.body;
    const profile = await prisma.profile.create({
      data: { name },
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
    const { profileId, fileId, duration, completed, results, weakWordIds, correctWordIds, customQuizId, customQuizName } = req.body;

    // 建立測驗記錄
    const session = await prisma.quizSession.create({
      data: {
        profileId,
        fileId,
        duration,
        completed,
        customQuizId: customQuizId || null,
        customQuizName: customQuizName || null,
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

    res.json({ success: true, session });
  } catch (error) {
    // 錯誤已回傳給前端
    res.status(500).json({ error: 'Failed to save quiz results' });
  }
});

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
    const { name, fileId, wordIds, questionTypes } = req.body;

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

    const quiz = await prisma.customQuiz.create({
      data: {
        name: name.trim(),
        fileId,
        wordIds,
        questionTypes,
        active: true
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
    const { name, wordIds, questionTypes, active } = req.body;

    const quiz = await prisma.customQuiz.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(wordIds !== undefined && { wordIds }),
        ...(questionTypes !== undefined && { questionTypes }),
        ...(active !== undefined && { active })
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

// 發放測驗星星獎勵
app.post('/api/profiles/:id/award-stars', async (req, res) => {
  try {
    const { id } = req.params;
    const { correctCount, totalCount, starsFromQuiz } = req.body;

    let totalStars = starsFromQuiz || correctCount; // 預設每答對 1 題 = 1 星星
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 額外獎勵
    if (accuracy === 100 && totalCount >= 5) {
      totalStars += 5; // 100% 正確且至少 5 題
    } else if (accuracy >= 80) {
      totalStars += 2; // 80% 以上
    }

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: {
        stars: { increment: totalStars },
        totalStars: { increment: totalStars }
      }
    });

    res.json({ starsEarned: totalStars, newTotal: updatedProfile.stars });
  } catch (error) {
    console.error('Failed to award stars:', error);
    res.status(500).json({ error: 'Failed to award stars' });
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

// 商品定義
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

    // 檢查星星是否足夠
    if (profile.stars < item.price) {
      return res.status(400).json({ error: 'Not enough stars' });
    }

    // 扣除星星並記錄購買
    await prisma.$transaction([
      prisma.profile.update({
        where: { id },
        data: { stars: { decrement: item.price } }
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

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  // Server started
});
