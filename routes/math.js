import { Router } from 'express';
import { MATH_CATEGORIES } from '../data/math.js';

const VALID_ELEMENTS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function createMathRouter({ prisma, requireTeacher }) {
  const router = Router();

  // ============ 題目集 CRUD ============

  // 取得所有數學題目集
  router.get('/api/math-sets', async (req, res) => {
    try {
      const sets = await prisma.mathProblemSet.findMany({
        include: { problems: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(sets);
    } catch (error) {
      console.error('Failed to get math sets:', error);
      res.status(500).json({ error: 'Failed to get math sets' });
    }
  });

  // 建立數學題目集
  router.post('/api/math-sets', requireTeacher, async (req, res) => {
    try {
      const { name, category, element, problems } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const resolvedCategory = (category && MATH_CATEGORIES[category]) ? category : null;
      const resolvedElement = (element && VALID_ELEMENTS.includes(element)) ? element : null;

      const set = await prisma.mathProblemSet.create({
        data: {
          name: name.trim(),
          category: resolvedCategory,
          element: resolvedElement,
          problems: problems && problems.length > 0 ? {
            create: problems.map(p => ({
              content: (p.content || '').trim(),
              problemType: p.problemType ?? 0,
              options: p.options || [],
              correctAnswer: (p.correctAnswer || '').trim(),
              explanation: p.explanation?.trim() || null,
              imageUrl: p.imageUrl?.trim() || null,
              difficulty: p.difficulty ?? 1,
            }))
          } : undefined
        },
        include: { problems: true }
      });
      res.json(set);
    } catch (error) {
      console.error('Failed to create math set:', error);
      res.status(500).json({ error: 'Failed to create math set' });
    }
  });

  // 刪除題目集
  router.delete('/api/math-sets/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.mathProblemSet.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete math set:', error);
      res.status(500).json({ error: 'Failed to delete math set' });
    }
  });

  // 重新命名題目集
  router.put('/api/math-sets/:id/name', requireTeacher, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      const set = await prisma.mathProblemSet.update({
        where: { id: req.params.id },
        data: { name: name.trim() },
        include: { problems: true }
      });
      res.json(set);
    } catch (error) {
      console.error('Failed to rename math set:', error);
      res.status(500).json({ error: 'Failed to rename math set' });
    }
  });

  // 更新題目集分類
  router.put('/api/math-sets/:id/category', requireTeacher, async (req, res) => {
    try {
      const { category } = req.body;
      const set = await prisma.mathProblemSet.update({
        where: { id: req.params.id },
        data: { category: category || null },
        include: { problems: true }
      });
      res.json(set);
    } catch (error) {
      console.error('Failed to update math set category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  // 更新題目集元素
  router.put('/api/math-sets/:id/element', requireTeacher, async (req, res) => {
    try {
      const { element } = req.body;
      const resolvedElement = (element && VALID_ELEMENTS.includes(element)) ? element : null;
      const set = await prisma.mathProblemSet.update({
        where: { id: req.params.id },
        data: { element: resolvedElement },
        include: { problems: true }
      });
      res.json(set);
    } catch (error) {
      console.error('Failed to update math set element:', error);
      res.status(500).json({ error: 'Failed to update element' });
    }
  });

  // ============ 題目 CRUD ============

  // 批次新增題目
  router.post('/api/math-sets/:id/problems', requireTeacher, async (req, res) => {
    try {
      const { problems } = req.body;
      if (!problems || !Array.isArray(problems) || problems.length === 0) {
        return res.status(400).json({ error: 'Problems array is required' });
      }

      await prisma.mathProblem.createMany({
        data: problems.map(p => ({
          problemSetId: req.params.id,
          content: (p.content || '').trim(),
          problemType: p.problemType ?? 0,
          options: p.options || [],
          correctAnswer: (p.correctAnswer || '').trim(),
          explanation: p.explanation?.trim() || null,
          imageUrl: p.imageUrl?.trim() || null,
          difficulty: p.difficulty ?? 1,
        }))
      });

      const set = await prisma.mathProblemSet.findUnique({
        where: { id: req.params.id },
        include: { problems: true }
      });
      res.json(set);
    } catch (error) {
      console.error('Failed to add problems:', error);
      res.status(500).json({ error: 'Failed to add problems' });
    }
  });

  // 更新單題
  router.put('/api/math-problems/:id', requireTeacher, async (req, res) => {
    try {
      const { content, problemType, options, correctAnswer, explanation, imageUrl, difficulty } = req.body;
      const data = {};
      if (content !== undefined) data.content = content.trim();
      if (problemType !== undefined) data.problemType = problemType;
      if (options !== undefined) data.options = options;
      if (correctAnswer !== undefined) data.correctAnswer = correctAnswer.trim();
      if (explanation !== undefined) data.explanation = explanation?.trim() || null;
      if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;
      if (difficulty !== undefined) data.difficulty = difficulty;

      const problem = await prisma.mathProblem.update({
        where: { id: req.params.id },
        data
      });
      res.json(problem);
    } catch (error) {
      console.error('Failed to update problem:', error);
      res.status(500).json({ error: 'Failed to update problem' });
    }
  });

  // 刪除單題
  router.delete('/api/math-problems/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.mathProblem.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete problem:', error);
      res.status(500).json({ error: 'Failed to delete problem' });
    }
  });

  // CSV 匯入題目
  router.post('/api/math-sets/:id/import-csv', requireTeacher, async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData || typeof csvData !== 'string') {
        return res.status(400).json({ error: 'CSV data is required' });
      }

      const lines = csvData.split('\n').filter(l => l.trim());
      const problems = [];

      for (const line of lines) {
        // 格式：題目,題型,選項A,選項B,選項C,選項D,正確答案,解說,難度
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 7) continue;

        let content, typeStr, optA, optB, optC, optD, answer, explanation, diffStr;
        if (parts.length > 9) {
          // 解說欄位可能含有逗號，最後一個欄位是難度
          [content, typeStr, optA, optB, optC, optD, answer] = parts;
          diffStr = parts[parts.length - 1];
          explanation = parts.slice(7, -1).join(',');
        } else {
          [content, typeStr, optA, optB, optC, optD, answer, explanation, diffStr] = parts;
        }

        // 去除題號前綴（如 "1→" 或 "25→"）
        content = content.replace(/^\d+→/, '');

        const problemType = parseInt(typeStr) || 0;
        const difficulty = parseInt(diffStr) || 1;

        const options = problemType === 1 ? [] : [optA, optB, optC, optD].filter(Boolean);

        problems.push({
          problemSetId: req.params.id,
          content,
          problemType,
          options,
          correctAnswer: answer,
          explanation: explanation || null,
          difficulty: Math.min(3, Math.max(1, difficulty)),
        });
      }

      if (problems.length === 0) {
        return res.status(400).json({ error: 'No valid problems found in CSV' });
      }

      await prisma.mathProblem.createMany({ data: problems });

      const set = await prisma.mathProblemSet.findUnique({
        where: { id: req.params.id },
        include: { problems: true }
      });
      res.json({ success: true, count: problems.length, set });
    } catch (error) {
      console.error('Failed to import CSV:', error);
      res.status(500).json({ error: 'Failed to import CSV' });
    }
  });

  // ============ 數學測驗結果 ============

  // 提交數學測驗結果
  router.post('/api/math-quiz-results', async (req, res) => {
    try {
      const { profileId, problemSetId, customQuizId, companionPetId, duration, completed, results } = req.body;

      if (!profileId || !problemSetId || !results || !Array.isArray(results)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const session = await prisma.mathQuizSession.create({
        data: {
          profileId,
          problemSetId,
          customQuizId: customQuizId || null,
          companionPetId: companionPetId || null,
          duration: duration || 0,
          completed: completed ?? true,
          results: {
            create: results.map(r => ({
              problemId: r.problemId,
              correct: r.correct,
              problemType: r.problemType,
              timeSpent: r.timeSpent || 0,
              userAnswer: r.userAnswer || null,
            }))
          }
        },
        include: { results: true }
      });

      res.json({ success: true, session });
    } catch (error) {
      console.error('Failed to save math quiz results:', error);
      res.status(500).json({ error: 'Failed to save results' });
    }
  });

  // ============ 自訂數學測驗 ============

  // 取得所有自訂數學測驗
  router.get('/api/math-custom-quizzes', async (req, res) => {
    try {
      const quizzes = await prisma.mathCustomQuiz.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(quizzes);
    } catch (error) {
      console.error('Failed to get math custom quizzes:', error);
      res.status(500).json({ error: 'Failed to get quizzes' });
    }
  });

  // 取得啟用中的自訂數學測驗
  router.get('/api/math-custom-quizzes/active', async (req, res) => {
    try {
      const now = new Date();
      const quizzes = await prisma.mathCustomQuiz.findMany({
        where: {
          active: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(quizzes);
    } catch (error) {
      console.error('Failed to get active math quizzes:', error);
      res.status(500).json({ error: 'Failed to get active quizzes' });
    }
  });

  // 建立自訂數學測驗
  router.post('/api/math-custom-quizzes', requireTeacher, async (req, res) => {
    try {
      const { name, problemSetId, problemSetIds, problemIds, problemTypes, countType0, countType1, countType2, starMultiplier, assignedProfileIds, durationDays, expiresAt } = req.body;

      // 新格式用 problemSetIds，舊格式用 problemSetId + problemIds
      const resolvedSetIds = Array.isArray(problemSetIds) && problemSetIds.length > 0
        ? problemSetIds
        : (problemSetId ? [problemSetId] : []);

      if (!name || resolvedSetIds.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 計算 expiresAt：durationDays 優先，0=永不過期
      let resolvedExpiresAt = null;
      if (durationDays !== undefined && durationDays !== null) {
        if (durationDays > 0) {
          resolvedExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        }
      } else if (expiresAt) {
        resolvedExpiresAt = new Date(expiresAt);
      }

      const quiz = await prisma.mathCustomQuiz.create({
        data: {
          name: name.trim(),
          problemSetId: resolvedSetIds[0],
          problemSetIds: resolvedSetIds,
          problemIds: problemIds || [],
          problemTypes: problemTypes || [0, 1],
          countType0: countType0 ?? -1,
          countType1: countType1 ?? -1,
          countType2: countType2 ?? -1,
          starMultiplier: starMultiplier || 1.0,
          assignedProfileIds: assignedProfileIds || [],
          expiresAt: resolvedExpiresAt,
        }
      });
      res.json(quiz);
    } catch (error) {
      console.error('Failed to create math custom quiz:', error);
      res.status(500).json({ error: 'Failed to create quiz' });
    }
  });

  // 更新自訂數學測驗
  router.put('/api/math-custom-quizzes/:id', requireTeacher, async (req, res) => {
    try {
      const { name, problemSetIds, problemIds, problemTypes, countType0, countType1, countType2, active, starMultiplier, assignedProfileIds, durationDays, expiresAt } = req.body;
      const data = {};
      if (name !== undefined) data.name = name.trim();
      if (problemSetIds !== undefined) {
        data.problemSetIds = problemSetIds;
        data.problemSetId = problemSetIds.length > 0 ? problemSetIds[0] : null;
      }
      if (problemIds !== undefined) data.problemIds = problemIds;
      if (problemTypes !== undefined) data.problemTypes = problemTypes;
      if (countType0 !== undefined) data.countType0 = countType0;
      if (countType1 !== undefined) data.countType1 = countType1;
      if (countType2 !== undefined) data.countType2 = countType2;
      if (active !== undefined) data.active = active;
      if (starMultiplier !== undefined) data.starMultiplier = starMultiplier;
      if (assignedProfileIds !== undefined) data.assignedProfileIds = assignedProfileIds;
      if (durationDays !== undefined) {
        data.expiresAt = durationDays > 0
          ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
          : null;
      } else if (expiresAt !== undefined) {
        data.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      const quiz = await prisma.mathCustomQuiz.update({
        where: { id: req.params.id },
        data
      });
      res.json(quiz);
    } catch (error) {
      console.error('Failed to update math custom quiz:', error);
      res.status(500).json({ error: 'Failed to update quiz' });
    }
  });

  // 刪除自訂數學測驗
  router.delete('/api/math-custom-quizzes/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.mathCustomQuiz.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete math custom quiz:', error);
      res.status(500).json({ error: 'Failed to delete quiz' });
    }
  });

  return router;
}
