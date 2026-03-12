import { Router } from 'express';
import { QUIZ_CATEGORIES, getElementByDate } from '../data/categories.js';

export default function createFilesRouter({ prisma, requireTeacher }) {
  const router = Router();

  // 取得所有檔案
  router.get('/api/files', async (req, res) => {
    try {
      const files = await prisma.wordFile.findMany({
        include: { words: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get files' });
    }
  });

  // 新增檔案
  router.post('/api/files', requireTeacher, async (req, res) => {
    try {
      const { name, words, category } = req.body;
      // 如果未指定分類或分類無效，自動依今天星期幾指定元素
      const resolvedCategory = (category && QUIZ_CATEGORIES[category]) ? category : getElementByDate();
      const file = await prisma.wordFile.create({
        data: {
          name,
          category: resolvedCategory,
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
      res.status(500).json({ error: 'Failed to create file' });
    }
  });

  // 重新命名檔案
  router.put('/api/files/:id/name', requireTeacher, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
      const file = await prisma.wordFile.update({
        where: { id: req.params.id },
        data: { name: name.trim() },
        include: { words: true }
      });
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: 'Failed to rename file' });
    }
  });

  // 刪除檔案
  router.delete('/api/files/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.wordFile.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // 更新單字
  router.put('/api/words/:id', requireTeacher, async (req, res) => {
    try {
      const { english, chinese, partOfSpeech, exampleSentence } = req.body;
      const word = await prisma.word.update({
        where: { id: req.params.id },
        data: {
          english,
          chinese,
          partOfSpeech: partOfSpeech || null,
          exampleSentence: exampleSentence || null
        }
      });
      res.json(word);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update word' });
    }
  });

  // 刪除單字
  router.delete('/api/words/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.word.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete word' });
    }
  });

  // 新增單字到現有檔案（自動去重複）
  router.post('/api/files/:id/words', requireTeacher, async (req, res) => {
    try {
      const { words } = req.body;
      const fileId = req.params.id;

      const file = await prisma.wordFile.findUnique({
        where: { id: fileId },
        include: { words: true }
      });
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const existingEnglish = new Set(file.words.map(w => w.english.toLowerCase()));
      const newWords = words.filter(w => !existingEnglish.has(w.english.toLowerCase()));
      const duplicateCount = words.length - newWords.length;

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

      const updatedFile = await prisma.wordFile.findUnique({
        where: { id: fileId },
        include: { words: true }
      });

      res.json({ ...updatedFile, _addedCount: newWords.length, _duplicateCount: duplicateCount });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add words' });
    }
  });

  return router;
}
