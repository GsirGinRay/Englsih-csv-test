import { Router } from 'express';
import { TITLES, STICKER_SERIES, CHEST_CONFIG, WHEEL_REWARDS, weightedRandom, getRandomSticker } from '../data/rewards.js';

// 隨機取得指定稀有度的稱號
const getRandomTitle = (rarity) => {
  const availableTitles = TITLES.filter(t => t.rarity === rarity && t.condition.type === 'special');
  if (availableTitles.length === 0) {
    const fallback = TITLES.filter(t => t.rarity === rarity);
    return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
  }
  return availableTitles[Math.floor(Math.random() * availableTitles.length)];
};

const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function createRewardsRouter({ prisma }) {
  const router = Router();

  // 取得所有稱號
  router.get('/api/titles', (req, res) => {
    res.json(TITLES);
  });

  // 取得玩家已解鎖的稱號
  router.get('/api/profiles/:id/titles', async (req, res) => {
    try {
      const profileTitles = await prisma.profileTitle.findMany({ where: { profileId: req.params.id } });
      res.json(profileTitles);
    } catch (error) {
      console.error('Failed to get titles:', error);
      res.status(500).json({ error: 'Failed to get titles' });
    }
  });

  // 裝備稱號
  router.post('/api/profiles/:id/equip-title', async (req, res) => {
    try {
      const { id } = req.params;
      const { titleId } = req.body;

      if (titleId) {
        const unlocked = await prisma.profileTitle.findUnique({
          where: { profileId_titleId: { profileId: id, titleId } }
        });
        if (!unlocked) return res.status(400).json({ error: 'Title not unlocked' });
      }

      await prisma.profile.update({ where: { id }, data: { equippedTitle: titleId || null } });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to equip title:', error);
      res.status(500).json({ error: 'Failed to equip title' });
    }
  });

  // 檢查並解鎖稱號
  router.post('/api/profiles/:id/check-titles', async (req, res) => {
    try {
      const { id } = req.params;

      const profile = await prisma.profile.findUnique({
        where: { id },
        include: { titles: true, quizSessions: true, masteredWords: true, stickers: true, chests: true }
      });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const stats = {
        quiz_count: profile.quizSessions.length,
        mastered_count: profile.masteredWords.length,
        login_streak: profile.loginStreak,
        total_stars: profile.totalStars,
        sticker_count: profile.stickers.length,
        chest_opened: 0
      };

      const unlockedTitleIds = profile.titles.map(t => t.titleId);
      const newTitles = [];

      for (const title of TITLES) {
        if (unlockedTitleIds.includes(title.id)) continue;
        if (title.condition.type === 'special') continue;
        const { type, value } = title.condition;
        if (stats[type] >= value) {
          await prisma.profileTitle.create({ data: { profileId: id, titleId: title.id } });
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
  router.get('/api/stickers/series', (req, res) => {
    const seriesInfo = Object.entries(STICKER_SERIES).map(([id, series]) => ({
      id, name: series.name, icon: series.icon, rarity: series.rarity,
      total: series.stickers.length, stickers: series.stickers
    }));
    res.json(seriesInfo);
  });

  // 取得玩家已收集的貼紙
  router.get('/api/profiles/:id/stickers', async (req, res) => {
    try {
      const stickers = await prisma.profileSticker.findMany({ where: { profileId: req.params.id } });
      res.json(stickers);
    } catch (error) {
      console.error('Failed to get stickers:', error);
      res.status(500).json({ error: 'Failed to get stickers' });
    }
  });

  // 取得寶箱配置
  router.get('/api/chests/config', (req, res) => {
    res.json(CHEST_CONFIG);
  });

  // 取得玩家的寶箱庫存
  router.get('/api/profiles/:id/chests', async (req, res) => {
    try {
      const chests = await prisma.profileChest.findMany({ where: { profileId: req.params.id } });
      res.json(chests);
    } catch (error) {
      console.error('Failed to get chests:', error);
      res.status(500).json({ error: 'Failed to get chests' });
    }
  });

  // 給予寶箱
  router.post('/api/profiles/:id/give-chest', async (req, res) => {
    try {
      const { id } = req.params;
      const { chestType, quantity = 1 } = req.body;

      if (!CHEST_CONFIG[chestType]) return res.status(400).json({ error: 'Invalid chest type' });

      const existing = await prisma.profileChest.findUnique({
        where: { profileId_chestType: { profileId: id, chestType } }
      });

      if (existing) {
        await prisma.profileChest.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
      } else {
        await prisma.profileChest.create({ data: { profileId: id, chestType, quantity } });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to give chest:', error);
      res.status(500).json({ error: 'Failed to give chest' });
    }
  });

  // 開啟寶箱
  router.post('/api/profiles/:id/open-chest', async (req, res) => {
    try {
      const { id } = req.params;
      const { chestType } = req.body;

      const config = CHEST_CONFIG[chestType];
      if (!config) return res.status(400).json({ error: 'Invalid chest type' });

      const chest = await prisma.profileChest.findUnique({
        where: { profileId_chestType: { profileId: id, chestType } }
      });
      if (!chest || chest.quantity <= 0) return res.status(400).json({ error: 'No chest available' });

      const rewardType = weightedRandom(config.rewards);
      let reward = { type: rewardType.type };

      if (rewardType.type === 'stars') {
        const stars = Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min;
        reward.value = stars;
        reward.name = `${stars} 星星`;
        reward.icon = '⭐';
        await prisma.profile.update({ where: { id }, data: { stars: { increment: stars }, totalStars: { increment: stars } } });
      } else if (rewardType.type === 'sticker') {
        const sticker = getRandomSticker(rewardType.rarity);
        reward.sticker = sticker;
        reward.name = sticker.name;
        reward.icon = sticker.icon;
        reward.rarity = sticker.rarity;

        const existing = await prisma.profileSticker.findUnique({
          where: { profileId_stickerId: { profileId: id, stickerId: sticker.id } }
        });

        if (existing) {
          const bonusStars = sticker.rarity === 'legendary' ? 30 : sticker.rarity === 'rare' ? 15 : 5;
          reward.duplicate = true;
          reward.bonusStars = bonusStars;
          await prisma.profile.update({ where: { id }, data: { stars: { increment: bonusStars }, totalStars: { increment: bonusStars } } });
        } else {
          await prisma.profileSticker.create({ data: { profileId: id, stickerId: sticker.id } });
        }
      } else if (rewardType.type === 'title') {
        const title = getRandomTitle(rewardType.rarity);
        if (title) {
          reward.title = title;
          reward.name = title.name;
          reward.icon = '🎖️';
          reward.rarity = title.rarity;

          const existing = await prisma.profileTitle.findUnique({
            where: { profileId_titleId: { profileId: id, titleId: title.id } }
          });

          if (existing) {
            const bonusStars = title.rarity === 'mythic' ? 100 : title.rarity === 'epic' ? 50 : 25;
            reward.duplicate = true;
            reward.bonusStars = bonusStars;
            await prisma.profile.update({ where: { id }, data: { stars: { increment: bonusStars }, totalStars: { increment: bonusStars } } });
          } else {
            await prisma.profileTitle.create({ data: { profileId: id, titleId: title.id } });
          }
        } else {
          const stars = 50;
          reward.type = 'stars';
          reward.value = stars;
          reward.name = `${stars} 星星`;
          reward.icon = '⭐';
          await prisma.profile.update({ where: { id }, data: { stars: { increment: stars }, totalStars: { increment: stars } } });
        }
      }

      if (chest.quantity <= 1) {
        await prisma.profileChest.delete({ where: { id: chest.id } });
      } else {
        await prisma.profileChest.update({ where: { id: chest.id }, data: { quantity: { decrement: 1 } } });
      }

      res.json({ success: true, reward, chestName: config.name, chestIcon: config.icon });
    } catch (error) {
      console.error('Failed to open chest:', error);
      res.status(500).json({ error: 'Failed to open chest' });
    }
  });

  // 取得轉盤配置
  router.get('/api/wheel/config', (req, res) => {
    res.json(WHEEL_REWARDS);
  });

  // 轉動轉盤
  router.post('/api/profiles/:id/spin-wheel', async (req, res) => {
    try {
      const { id } = req.params;

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (profile.lastSpinAt) {
        const lastSpin = new Date(profile.lastSpinAt);
        lastSpin.setHours(0, 0, 0, 0);
        if (lastSpin.getTime() === today.getTime()) {
          return res.status(400).json({ error: 'Already spun today', canSpinAt: new Date(today.getTime() + 24 * 60 * 60 * 1000) });
        }
      }

      const rewardConfig = weightedRandom(WHEEL_REWARDS);
      let reward = { ...rewardConfig };

      if (rewardConfig.type === 'stars') {
        await prisma.profile.update({
          where: { id },
          data: { stars: { increment: rewardConfig.value }, totalStars: { increment: rewardConfig.value }, lastSpinAt: new Date() }
        });
      } else if (rewardConfig.type === 'chest') {
        const existing = await prisma.profileChest.findUnique({
          where: { profileId_chestType: { profileId: id, chestType: rewardConfig.value } }
        });

        if (existing) {
          await prisma.profileChest.update({ where: { id: existing.id }, data: { quantity: { increment: 1 } } });
        } else {
          await prisma.profileChest.create({ data: { profileId: id, chestType: rewardConfig.value, quantity: 1 } });
        }

        await prisma.profile.update({ where: { id }, data: { lastSpinAt: new Date() } });
      } else if (rewardConfig.type === 'sticker') {
        const sticker = getRandomSticker(null);
        reward.sticker = sticker;
        reward.name = sticker.name;
        reward.icon = sticker.icon;

        const existing = await prisma.profileSticker.findUnique({
          where: { profileId_stickerId: { profileId: id, stickerId: sticker.id } }
        });

        if (existing) {
          const bonusStars = 10;
          reward.duplicate = true;
          reward.bonusStars = bonusStars;
          await prisma.profile.update({
            where: { id },
            data: { stars: { increment: bonusStars }, totalStars: { increment: bonusStars }, lastSpinAt: new Date() }
          });
        } else {
          await prisma.profileSticker.create({ data: { profileId: id, stickerId: sticker.id } });
          await prisma.profile.update({ where: { id }, data: { lastSpinAt: new Date() } });
        }
      }

      const rewardIndex = WHEEL_REWARDS.findIndex(r => r.id === rewardConfig.id);
      const updatedProfile = await prisma.profile.findUnique({ where: { id } });
      const updatedChests = await prisma.profileChest.findMany({ where: { profileId: id } });
      const updatedStickers = await prisma.profileSticker.findMany({ where: { profileId: id } });

      res.json({ success: true, reward, rewardIndex, newStars: updatedProfile.stars, chests: updatedChests, stickers: updatedStickers });
    } catch (error) {
      console.error('Failed to spin wheel:', error);
      res.status(500).json({ error: 'Failed to spin wheel' });
    }
  });

  // 取得排行榜
  router.get('/api/leaderboard/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const limit = 10;
      let profiles;

      if (type === 'week') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        profiles = await prisma.profile.findMany({
          include: {
            quizSessions: { where: { timestamp: { gte: weekStart } }, include: { results: true } },
            pets: { where: { isActive: true }, take: 1 }
          }
        });

        profiles = profiles.map(p => {
          const weeklyCorrect = p.quizSessions.reduce((sum, s) => sum + s.results.filter(r => r.correct).length, 0);
          return { ...p, weeklyStars: weeklyCorrect };
        })
        .sort((a, b) => b.weeklyStars - a.weeklyStars)
        .slice(0, limit);
      } else if (type === 'month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        profiles = await prisma.profile.findMany({
          include: {
            masteredWords: { where: { masteredAt: { gte: monthStart } } },
            pets: { where: { isActive: true }, take: 1 }
          }
        });

        profiles = profiles.map(p => ({ ...p, monthlyMastered: p.masteredWords.length }))
          .sort((a, b) => b.monthlyMastered - a.monthlyMastered)
          .slice(0, limit);
      } else {
        profiles = await prisma.profile.findMany({
          orderBy: { totalStars: 'desc' }, take: limit,
          include: { pets: { where: { isActive: true }, take: 1 } }
        });
      }

      const leaderboard = profiles.map((p, index) => ({
        rank: index + 1, id: p.id, name: p.name,
        totalStars: p.totalStars, weeklyStars: p.weeklyStars || 0,
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

  // 取得或創建本週挑戰
  router.get('/api/profiles/:id/weekly-challenge', async (req, res) => {
    try {
      const { id } = req.params;
      const weekStart = getWeekStartDate(new Date());

      let challenge = await prisma.weeklyChallenge.findUnique({
        where: { profileId_weekStart: { profileId: id, weekStart } }
      });

      if (!challenge) {
        challenge = await prisma.weeklyChallenge.create({
          data: { profileId: id, weekStart, targetWords: 20, targetQuiz: 50, targetDays: 5 }
        });
      }

      const now = new Date();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const daysLeft = Math.ceil((weekEnd - now) / (1000 * 60 * 60 * 24));

      res.json({ ...challenge, daysLeft: Math.max(0, daysLeft) });
    } catch (error) {
      console.error('Failed to get weekly challenge:', error);
      res.status(500).json({ error: 'Failed to get weekly challenge' });
    }
  });

  // 更新週挑戰進度
  router.post('/api/profiles/:id/update-weekly-progress', async (req, res) => {
    try {
      const { id } = req.params;
      const { type, amount } = req.body;

      if (!['quiz', 'words', 'day'].includes(type)) return res.status(400).json({ error: 'Invalid type. Must be quiz, words, or day' });
      if (type !== 'day' && amount !== undefined && (typeof amount !== 'number' || amount < 0)) return res.status(400).json({ error: 'Invalid amount' });

      const weekStart = getWeekStartDate(new Date());
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let challenge = await prisma.weeklyChallenge.findUnique({
        where: { profileId_weekStart: { profileId: id, weekStart } }
      });

      if (!challenge) {
        challenge = await prisma.weeklyChallenge.create({
          data: { profileId: id, weekStart, targetWords: 20, targetQuiz: 50, targetDays: 5 }
        });
      }

      const updateData = {};
      if (type === 'quiz') updateData.progressQuiz = { increment: amount || 1 };
      else if (type === 'words') updateData.progressWords = { increment: amount || 1 };
      else if (type === 'day') {
        if (!challenge.lastActiveDate || new Date(challenge.lastActiveDate).getTime() !== today.getTime()) {
          updateData.progressDays = { increment: 1 };
          updateData.lastActiveDate = today;
        }
      }

      if (Object.keys(updateData).length > 0) {
        challenge = await prisma.weeklyChallenge.update({ where: { id: challenge.id }, data: updateData });
      }

      res.json({ success: true, challenge });
    } catch (error) {
      console.error('Failed to update weekly progress:', error);
      res.status(500).json({ error: 'Failed to update weekly progress' });
    }
  });

  // 領取週挑戰獎勵
  router.post('/api/profiles/:id/claim-weekly-reward', async (req, res) => {
    try {
      const { id } = req.params;
      const weekStart = getWeekStartDate(new Date());

      const challenge = await prisma.weeklyChallenge.findUnique({
        where: { profileId_weekStart: { profileId: id, weekStart } }
      });

      if (!challenge) return res.status(404).json({ error: 'No weekly challenge found' });
      if (challenge.rewardClaimed) return res.json({ success: false, error: 'Reward already claimed' });

      const wordsCompleted = challenge.progressWords >= challenge.targetWords;
      const quizCompleted = challenge.progressQuiz >= challenge.targetQuiz;
      const daysCompleted = challenge.progressDays >= challenge.targetDays;

      if (!wordsCompleted || !quizCompleted || !daysCompleted) {
        return res.json({ success: false, error: 'Challenge not completed' });
      }

      await prisma.$transaction([
        prisma.weeklyChallenge.update({ where: { id: challenge.id }, data: { rewardClaimed: true } }),
        prisma.profile.update({ where: { id }, data: { stars: { increment: 50 }, totalStars: { increment: 50 } } }),
        prisma.profileChest.upsert({
          where: { profileId_chestType: { profileId: id, chestType: 'silver' } },
          update: { quantity: { increment: 1 } },
          create: { profileId: id, chestType: 'silver', quantity: 1 }
        })
      ]);

      res.json({ success: true, rewards: { stars: 50, chests: [{ type: 'silver', quantity: 1 }] } });
    } catch (error) {
      console.error('Failed to claim weekly reward:', error);
      res.status(500).json({ error: 'Failed to claim weekly reward' });
    }
  });

  return router;
}
