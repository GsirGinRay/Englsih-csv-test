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

// ============ 虛擬寵物 API ============

// 寵物進化階段定義
const PET_STAGES = {
  dragon: [
    { stage: 1, name: '龍蛋', icon: '🥚', minLevel: 1 },
    { stage: 2, name: '小龍寶寶', icon: '🐣', minLevel: 10 },
    { stage: 3, name: '幼龍', icon: '🦎', minLevel: 30 },
    { stage: 4, name: '成年龍', icon: '🐉', minLevel: 60 },
    { stage: 5, name: '傳說神龍', icon: '🌟', minLevel: 100 }
  ]
};

// 計算升級所需經驗值
const getExpForLevel = (level) => level * 50;

// 計算當前等級和階段
const calculatePetStatus = (exp, species = 'dragon') => {
  let level = 1;
  let remainingExp = exp;

  while (remainingExp >= getExpForLevel(level) && level < 100) {
    remainingExp -= getExpForLevel(level);
    level++;
  }

  const stages = PET_STAGES[species] || PET_STAGES.dragon;
  let stage = 1;
  for (const s of stages) {
    if (level >= s.minLevel) {
      stage = s.stage;
    }
  }

  return { level, stage, expToNext: getExpForLevel(level), currentExp: remainingExp };
};

// 取得寵物資料
app.get('/api/profiles/:id/pet', async (req, res) => {
  try {
    const { id } = req.params;

    let pet = await prisma.pet.findUnique({
      where: { profileId: id }
    });

    // 如果沒有寵物，自動建立一個
    if (!pet) {
      pet = await prisma.pet.create({
        data: { profileId: id }
      });
    }

    // 計算飽足度和快樂度衰減（每小時 -2）
    const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
    const hungerDecay = Math.floor(hoursSinceLastFed * 2);
    const currentHunger = Math.max(0, pet.hunger - hungerDecay);
    const currentHappiness = Math.max(0, pet.happiness - Math.floor(hungerDecay / 2));

    // 計算等級和階段
    const status = calculatePetStatus(pet.exp, pet.species);
    const stages = PET_STAGES[pet.species] || PET_STAGES.dragon;
    const currentStage = stages.find(s => s.stage === status.stage);

    res.json({
      ...pet,
      hunger: currentHunger,
      happiness: currentHappiness,
      level: status.level,
      stage: status.stage,
      expToNext: status.expToNext,
      currentExp: status.currentExp,
      stageName: currentStage?.name || '龍蛋',
      stageIcon: currentStage?.icon || '🥚',
      stages
    });
  } catch (error) {
    console.error('Failed to get pet:', error);
    res.status(500).json({ error: 'Failed to get pet' });
  }
});

// 餵食寵物
app.post('/api/profiles/:id/pet/feed', async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: { pet: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 餵食需要 5 星星
    const feedCost = 5;
    if (profile.stars < feedCost) {
      return res.status(400).json({ error: 'Not enough stars', required: feedCost, current: profile.stars });
    }

    let pet = profile.pet;
    if (!pet) {
      pet = await prisma.pet.create({
        data: { profileId: id }
      });
    }

    // 計算當前飽足度
    const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
    const hungerDecay = Math.floor(hoursSinceLastFed * 2);
    const currentHunger = Math.max(0, pet.hunger - hungerDecay);

    // 餵食增加 30 飽足度和 20 快樂度
    const newHunger = Math.min(100, currentHunger + 30);
    const newHappiness = Math.min(100, pet.happiness + 20);

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

    res.json({ success: true, newHunger, newHappiness, cost: feedCost });
  } catch (error) {
    console.error('Failed to feed pet:', error);
    res.status(500).json({ error: 'Failed to feed pet' });
  }
});

// 增加寵物經驗值（答對題目時呼叫）
app.post('/api/profiles/:id/pet/gain-exp', async (req, res) => {
  try {
    const { id } = req.params;
    const { correctCount } = req.body;

    let pet = await prisma.pet.findUnique({
      where: { profileId: id }
    });

    if (!pet) {
      pet = await prisma.pet.create({
        data: { profileId: id }
      });
    }

    // 每答對一題 +5 經驗值、+2 快樂度
    const expGain = correctCount * 5;
    const happinessGain = correctCount * 2;

    const oldStatus = calculatePetStatus(pet.exp, pet.species);
    const newExp = pet.exp + expGain;
    const newStatus = calculatePetStatus(newExp, pet.species);

    // 計算當前快樂度（考慮衰減）
    const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
    const happinessDecay = Math.floor(hoursSinceLastFed);
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

    const stages = PET_STAGES[pet.species] || PET_STAGES.dragon;
    const newStage = stages.find(s => s.stage === newStatus.stage);

    res.json({
      success: true,
      expGain,
      levelUp,
      evolved,
      newLevel: newStatus.level,
      newStage: newStatus.stage,
      stageName: newStage?.name,
      stageIcon: newStage?.icon
    });
  } catch (error) {
    console.error('Failed to gain exp:', error);
    res.status(500).json({ error: 'Failed to gain exp' });
  }
});

// 重新命名寵物
app.post('/api/profiles/:id/pet/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0 || name.length > 20) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    const pet = await prisma.pet.update({
      where: { profileId: id },
      data: { name: name.trim() }
    });

    res.json({ success: true, pet });
  } catch (error) {
    console.error('Failed to rename pet:', error);
    res.status(500).json({ error: 'Failed to rename pet' });
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

    res.json({ success: true, reward, rewardIndex });
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
          pet: true
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
          pet: true
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
        include: { pet: true }
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
      petIcon: p.pet ? (PET_STAGES[p.pet.species] || PET_STAGES.dragon).find(s => s.stage === p.pet.stage)?.icon : '🥚',
      petLevel: p.pet?.level || 1
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  // Server started
});
