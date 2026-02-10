import { Router } from 'express';

export default function createAuthRouter({ prisma, requireTeacher, teacherTokens, generateToken }) {
  const router = Router();

  // 學生登入
  router.post('/api/auth/student-login', async (req, res) => {
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
  router.post('/api/auth/student-register', async (req, res) => {
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
  router.post('/api/auth/teacher-login', async (req, res) => {
    try {
      const { password } = req.body;
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      const correctPassword = settings?.teacherPassword || '1234';
      if (password === correctPassword) {
        const token = generateToken();
        teacherTokens.add(token);
        res.json({ success: true, token });
      } else {
        res.json({ success: false });
      }
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // 取得所有學生
  router.get('/api/profiles', async (req, res) => {
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
      res.status(500).json({ error: 'Failed to get profiles' });
    }
  });

  // 新增學生
  router.post('/api/profiles', async (req, res) => {
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
      res.status(500).json({ error: 'Failed to create profile' });
    }
  });

  // 刪除學生
  router.delete('/api/profiles/:id', requireTeacher, async (req, res) => {
    try {
      await prisma.profile.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  });

  return router;
}
