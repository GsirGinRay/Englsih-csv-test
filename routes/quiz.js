import { Router } from 'express';

// SRS 間隔重複系統
const REVIEW_INTERVALS = {
  1: 1, 2: 3, 3: 7, 4: 14, 5: 30, 6: 60
};

function calculateNextReview(currentLevel, isCorrect) {
  const now = new Date();
  const newLevel = isCorrect
    ? Math.min(currentLevel + 1, 6)
    : Math.max(currentLevel - 1, 1);
  const days = REVIEW_INTERVALS[newLevel] || 60;
  const nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return { newLevel, nextReviewAt };
}

const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function createQuizRouter({ prisma, requireTeacher }) {
  const router = Router();

  // 儲存測驗結果
  router.post('/api/quiz-results', async (req, res) => {
    try {
      const { profileId, fileId, duration, completed, results, weakWordIds, correctWordIds, customQuizId, customQuizName, companionPetId, categoryUsed, typeBonus } = req.body;

      const session = await prisma.quizSession.create({
        data: {
          profileId, fileId, duration, completed,
          customQuizId: customQuizId || null,
          customQuizName: customQuizName || null,
          companionPetId: companionPetId || null,
          categoryUsed: categoryUsed || null,
          typeBonus: typeBonus || null,
          results: {
            create: results.map(r => ({
              wordId: r.wordId, correct: r.correct,
              questionType: r.questionType, timeSpent: r.timeSpent
            }))
          }
        },
        include: { results: true }
      });

      const correctCount = results.filter(r => r.correct).length;
      const wrongCount = results.length - correctCount;
      const rate = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

      const existingProgress = await prisma.fileProgress.findUnique({
        where: { profileId_fileId: { profileId, fileId } }
      });

      if (existingProgress) {
        let newWeakIds = [...existingProgress.weakWordIds];
        weakWordIds.forEach(id => { if (!newWeakIds.includes(id)) newWeakIds.push(id); });
        newWeakIds = newWeakIds.filter(id => !correctWordIds.includes(id));

        await prisma.fileProgress.update({
          where: { id: existingProgress.id },
          data: {
            correct: existingProgress.correct + correctCount,
            wrong: existingProgress.wrong + wrongCount,
            weakWordIds: newWeakIds,
            history: { create: { rate } }
          }
        });
      } else {
        await prisma.fileProgress.create({
          data: {
            profileId, fileId,
            correct: correctCount, wrong: wrongCount,
            weakWordIds,
            history: { create: { rate } }
          }
        });
      }

      // 更新週挑戰進度（題數）
      const weekStart = getWeekStartDate(new Date());
      try {
        await prisma.weeklyChallenge.upsert({
          where: { profileId_weekStart: { profileId, weekStart } },
          update: { progressQuiz: { increment: results.length } },
          create: { profileId, weekStart, targetWords: 20, targetQuiz: 50, targetDays: 5, progressQuiz: results.length }
        });
      } catch { /* ignore */ }

      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save quiz results' });
    }
  });

  // 新增精熟單字
  router.post('/api/mastered-words', async (req, res) => {
    try {
      const { profileId, wordIds } = req.body;

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
      const { nextReviewAt } = calculateNextReview(0, true);

      for (const wordId of wordIds) {
        const existing = await prisma.masteredWord.findUnique({
          where: { profileId_wordId: { profileId, wordId } }
        });

        if (existing) {
          const { newLevel, nextReviewAt: newNextReview } = calculateNextReview(existing.level, true);
          await prisma.masteredWord.update({
            where: { profileId_wordId: { profileId, wordId } },
            data: {
              level: newLevel, lastReviewedAt: now, nextReviewAt: newNextReview,
              reviewCount: { increment: 1 }, correctStreak: { increment: 1 }
            }
          });
        } else {
          await prisma.masteredWord.create({
            data: { profileId, wordId, level: 1, masteredAt: now, lastReviewedAt: now, nextReviewAt, reviewCount: 0, correctStreak: 0 }
          });

          const weekStart = getWeekStartDate(new Date());
          try {
            await prisma.weeklyChallenge.upsert({
              where: { profileId_weekStart: { profileId, weekStart } },
              update: { progressWords: { increment: 1 } },
              create: { profileId, weekStart, targetWords: 20, targetQuiz: 50, targetDays: 5, progressWords: 1 }
            });
          } catch { /* ignore */ }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add mastered words:', error);
      res.status(500).json({ error: 'Failed to add mastered words' });
    }
  });

  // 移除精熟單字
  router.delete('/api/mastered-words/:profileId/:wordId', async (req, res) => {
    try {
      const { profileId, wordId } = req.params;
      await prisma.masteredWord.delete({ where: { profileId_wordId: { profileId, wordId } } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove mastered word' });
    }
  });

  // 取得到期需複習的單字
  router.get('/api/profiles/:profileId/due-words', async (req, res) => {
    try {
      const { profileId } = req.params;
      const dueWords = await prisma.masteredWord.findMany({
        where: { profileId, nextReviewAt: { lte: new Date() } },
        orderBy: { nextReviewAt: 'asc' }
      });
      res.json(dueWords);
    } catch (error) {
      console.error('Failed to get due words:', error);
      res.status(500).json({ error: 'Failed to get due words' });
    }
  });

  // 記錄複習結果並更新 SRS 等級
  router.post('/api/mastered-words/:profileId/:wordId/review', async (req, res) => {
    try {
      const { profileId, wordId } = req.params;
      const { correct } = req.body;

      if (typeof correct !== 'boolean') {
        return res.status(400).json({ error: 'correct must be a boolean' });
      }

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
          level: newLevel, lastReviewedAt: new Date(), nextReviewAt,
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
  router.delete('/api/mastered-words/:profileId', async (req, res) => {
    try {
      await prisma.masteredWord.deleteMany({ where: { profileId: req.params.profileId } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset mastered words' });
    }
  });

  // 取得所有自訂測驗
  router.get('/api/custom-quizzes', async (req, res) => {
    try {
      const quizzes = await prisma.customQuiz.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(quizzes);
    } catch (error) {
      console.error('Failed to get custom quizzes:', error);
      res.status(500).json({ error: 'Failed to get custom quizzes' });
    }
  });

  // 取得啟用中的自訂測驗
  router.get('/api/custom-quizzes/active', async (req, res) => {
    try {
      const quizzes = await prisma.customQuiz.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
      res.json(quizzes);
    } catch (error) {
      console.error('Failed to get active custom quizzes:', error);
      res.status(500).json({ error: 'Failed to get active custom quizzes' });
    }
  });

  // 建立自訂測驗
  router.post('/api/custom-quizzes', requireTeacher, async (req, res) => {
    try {
      const { name, fileId, wordIds, questionTypes, starMultiplier } = req.body;

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
          name: name.trim(), fileId, wordIds, questionTypes, active: true,
          ...(starMultiplier !== undefined && { starMultiplier })
        }
      });
      res.json(quiz);
    } catch (error) {
      console.error('Failed to create custom quiz:', error);
      res.status(500).json({ error: 'Failed to create custom quiz' });
    }
  });

  // 更新自訂測驗
  router.put('/api/custom-quizzes/:id', requireTeacher, async (req, res) => {
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
  router.delete('/api/custom-quizzes/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.customQuiz.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete custom quiz:', error);
      res.status(500).json({ error: 'Failed to delete custom quiz' });
    }
  });

  return router;
}
