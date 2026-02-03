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
    const { profileId, fileId, duration, completed, results, weakWordIds, correctWordIds } = req.body;

    // 建立測驗記錄
    const session = await prisma.quizSession.create({
      data: {
        profileId,
        fileId,
        duration,
        completed,
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

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  // Server started
});
