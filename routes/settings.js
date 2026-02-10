import { Router } from 'express';
import { QUIZ_CATEGORIES } from '../data/categories.js';

export default function createSettingsRouter({ prisma, requireTeacher }) {
  const router = Router();

  // 取得設定
  router.get('/api/settings', async (req, res) => {
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
            timeSpellingQuestion: (settings.timePerQuestion || 10) * 2
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
  router.put('/api/settings', requireTeacher, async (req, res) => {
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

  // 取得所有學科分類
  router.get('/api/quiz-categories', (req, res) => {
    res.json(QUIZ_CATEGORIES);
  });

  // 設定檔案學科分類
  router.put('/api/files/:id/category', requireTeacher, async (req, res) => {
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

  return router;
}
