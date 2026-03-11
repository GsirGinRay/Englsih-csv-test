import { Router } from 'express';
import { BOSS_TIERS, BOSS_EQUIPMENT, selectBossWords, calculateBattleResult, rollRepeatEquipment } from '../data/bosses.js';
import { calculatePetStatus, calculateRpgStats } from '../data/pets.js';

export default function createBossRouter({ prisma }) {
  const router = Router();

  // UTC+8 今天的日期字串
  function getTodayUTC8() {
    const nowMs = Date.now() + 8 * 60 * 60 * 1000;
    return new Date(nowMs).toISOString().slice(0, 10);
  }

  // GET /api/boss/available/:profileId — 查詢可挑戰 Boss
  router.get('/api/boss/available/:profileId', async (req, res) => {
    try {
      const { profileId } = req.params;

      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      if (!settings?.enableBossSystem) {
        return res.json({ enabled: false, tiers: [] });
      }

      // 取得玩家活躍寵物
      const activePet = await prisma.pet.findFirst({
        where: { profileId, isActive: true },
      });
      if (!activePet) {
        return res.json({ enabled: true, tiers: [], noPet: true });
      }

      const petStatus = calculatePetStatus(activePet.exp, activePet.species, activePet.evolutionPath);
      const petLevel = petStatus.level;

      // 檢查單字數量
      const wordCount = await prisma.word.count();
      if (wordCount < 20) {
        return res.json({ enabled: true, tiers: [], notEnoughWords: true });
      }

      // 取得冷卻紀錄
      const cooldowns = await prisma.bossCooldown.findMany({ where: { profileId } });
      const cooldownMap = new Map(cooldowns.map(c => [c.tier, c.lastChallengedAt]));

      // 取得首殺紀錄
      const firstClears = await prisma.bossRecord.findMany({
        where: { profileId, firstClear: true },
        select: { tier: true },
      });
      const firstClearSet = new Set(firstClears.map(r => r.tier));

      const todayStr = getTodayUTC8();

      const tiers = BOSS_TIERS.map(boss => {
        const canLevel = petLevel >= boss.requiredLevel;
        const lastChallenge = cooldownMap.get(boss.tier);
        let onCooldown = false;
        if (lastChallenge) {
          const lastMs = lastChallenge.getTime() + 8 * 60 * 60 * 1000;
          const lastStr = new Date(lastMs).toISOString().slice(0, 10);
          onCooldown = lastStr === todayStr;
        }
        return {
          tier: boss.tier,
          name: boss.name,
          icon: boss.icon,
          requiredLevel: boss.requiredLevel,
          hp: boss.hp,
          attack: boss.attack,
          questionCount: boss.questionCount,
          canChallenge: canLevel && !onCooldown,
          isFirstClear: !firstClearSet.has(boss.tier),
          locked: !canLevel,
          onCooldown,
        };
      });

      const petStats = calculateRpgStats(activePet.species, petLevel);

      res.json({
        enabled: true,
        tiers,
        pet: {
          id: activePet.id,
          name: activePet.name,
          species: activePet.species,
          level: petLevel,
          stage: petStatus.stage,
          evolutionPath: activePet.evolutionPath,
          stats: petStats,
        },
      });
    } catch (error) {
      console.error('Failed to get available bosses:', error);
      res.status(500).json({ error: 'Failed to get available bosses' });
    }
  });

  // POST /api/boss/start — 開始 Boss 挑戰
  router.post('/api/boss/start', async (req, res) => {
    try {
      const { profileId, tier } = req.body;

      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      if (!settings?.enableBossSystem) {
        return res.status(400).json({ error: 'Boss system not enabled' });
      }

      const bossData = BOSS_TIERS.find(b => b.tier === tier);
      if (!bossData) {
        return res.status(400).json({ error: 'Invalid boss tier' });
      }

      // 驗證寵物等級
      const activePet = await prisma.pet.findFirst({
        where: { profileId, isActive: true },
      });
      if (!activePet) {
        return res.status(400).json({ error: 'No active pet' });
      }

      const petStatus = calculatePetStatus(activePet.exp, activePet.species, activePet.evolutionPath);
      if (petStatus.level < bossData.requiredLevel) {
        return res.status(400).json({ error: 'Pet level too low' });
      }

      // 冷卻檢查
      const todayStr = getTodayUTC8();
      const cooldown = await prisma.bossCooldown.findUnique({
        where: { profileId_tier: { profileId, tier } },
      });
      if (cooldown) {
        const lastMs = cooldown.lastChallengedAt.getTime() + 8 * 60 * 60 * 1000;
        const lastStr = new Date(lastMs).toISOString().slice(0, 10);
        if (lastStr === todayStr) {
          return res.status(400).json({ error: 'Already challenged today', onCooldown: true });
        }
      }

      // 選字
      const allWords = await prisma.word.findMany({
        include: { file: { select: { name: true } } },
      });
      if (allWords.length < 20) {
        return res.status(400).json({ error: 'Not enough words (need 20+)' });
      }

      const wordAttempts = await prisma.wordAttempt.findMany({ where: { profileId } });
      const masteredWords = await prisma.masteredWord.findMany({ where: { profileId } });
      const fileProgresses = await prisma.fileProgress.findMany({ where: { profileId } });

      const selectedWords = selectBossWords({
        allWords,
        wordAttempts,
        masteredWords,
        fileProgresses,
        count: bossData.questionCount,
      });

      const petStats = calculateRpgStats(activePet.species, petStatus.level);

      res.json({
        boss: {
          tier: bossData.tier,
          name: bossData.name,
          icon: bossData.icon,
          hp: bossData.hp,
          attack: bossData.attack,
          questionCount: bossData.questionCount,
        },
        words: selectedWords,
        petStats,
        petId: activePet.id,
        petLevel: petStatus.level,
      });
    } catch (error) {
      console.error('Failed to start boss challenge:', error);
      res.status(500).json({ error: 'Failed to start boss challenge' });
    }
  });

  // POST /api/boss/complete — 完成 Boss 挑戰
  router.post('/api/boss/complete', async (req, res) => {
    try {
      const { profileId, tier, petId, petLevel, correctCount, totalCount, results } = req.body;

      const bossData = BOSS_TIERS.find(b => b.tier === tier);
      if (!bossData) {
        return res.status(400).json({ error: 'Invalid boss tier' });
      }

      const activePet = await prisma.pet.findFirst({ where: { id: petId, profileId } });
      if (!activePet) {
        return res.status(400).json({ error: 'Pet not found' });
      }

      const petStatus = calculatePetStatus(activePet.exp, activePet.species, activePet.evolutionPath);
      const petStats = calculateRpgStats(activePet.species, petStatus.level);

      const battleResult = calculateBattleResult({
        bossData,
        petStats,
        correctCount,
        totalCount,
      });

      // 檢查是否首殺
      const existingFirstClear = await prisma.bossRecord.findFirst({
        where: { profileId, tier, firstClear: true },
      });
      const isFirstClear = !existingFirstClear && battleResult.victory;

      // 計算獎勵
      let rewardStars = 0;
      let rewardChest = null;
      let rewardTitle = null;
      let rewardEquip = null;

      if (battleResult.victory) {
        if (isFirstClear) {
          const fcr = bossData.firstClearReward;
          rewardStars = fcr.stars;
          rewardChest = fcr.chest;
          rewardTitle = fcr.title;
          if (fcr.equipGuaranteed) {
            // 保底掉一件未擁有的勇者裝備
            const owned = await prisma.profilePurchase.findMany({
              where: { profileId, itemId: { in: BOSS_EQUIPMENT.map(e => e.id) } },
              select: { itemId: true },
            });
            const ownedSet = new Set(owned.map(o => o.itemId));
            const unowned = BOSS_EQUIPMENT.filter(e => !ownedSet.has(e.id));
            if (unowned.length > 0) {
              rewardEquip = unowned[Math.floor(Math.random() * unowned.length)].id;
            }
          }
        } else {
          const rr = bossData.repeatReward;
          rewardStars = Math.floor(Math.random() * (rr.starsMax - rr.starsMin + 1)) + rr.starsMin;
          rewardEquip = rollRepeatEquipment();
        }
      }

      // 寫入資料庫（transaction）
      const record = await prisma.$transaction(async (tx) => {
        // 建立 BossRecord
        const bossRecord = await tx.bossRecord.create({
          data: {
            profileId,
            tier,
            petId,
            petLevel: petLevel || petStatus.level,
            petHp: petStats.hp,
            petAttack: petStats.attack,
            petDefense: petStats.defense,
            correctCount,
            totalCount,
            victory: battleResult.victory,
            damageDealt: battleResult.damageDealt,
            damageTaken: battleResult.damageTaken,
            firstClear: isFirstClear,
            rewardStars,
            rewardChest,
            rewardTitle,
            rewardEquip,
          },
        });

        // 更新冷卻
        await tx.bossCooldown.upsert({
          where: { profileId_tier: { profileId, tier } },
          update: { lastChallengedAt: new Date() },
          create: { profileId, tier },
        });

        if (battleResult.victory && rewardStars > 0) {
          // 加星星
          await tx.profile.update({
            where: { id: profileId },
            data: {
              stars: { increment: rewardStars },
              totalStars: { increment: rewardStars },
            },
          });
          await tx.starAdjustment.create({
            data: {
              profileId,
              amount: rewardStars,
              reason: isFirstClear
                ? `首次擊敗 ${bossData.name}！`
                : `再次擊敗 ${bossData.name}`,
              source: 'boss',
            },
          });
        }

        if (isFirstClear) {
          // 寶箱
          if (rewardChest) {
            await tx.profileChest.upsert({
              where: { profileId_chestType: { profileId, chestType: rewardChest } },
              update: { quantity: { increment: 1 } },
              create: { profileId, chestType: rewardChest },
            });
          }
          // 稱號
          if (rewardTitle) {
            await tx.profileTitle.upsert({
              where: { profileId_titleId: { profileId, titleId: rewardTitle } },
              update: {},
              create: { profileId, titleId: rewardTitle },
            });
          }
        }

        // 裝備（首殺或重複都可能掉）
        if (rewardEquip) {
          await tx.profilePurchase.upsert({
            where: { profileId_itemId: { profileId, itemId: rewardEquip } },
            update: {},
            create: { profileId, itemId: rewardEquip },
          });
        }

        // 更新 WordAttempt
        if (results && Array.isArray(results)) {
          for (const r of results) {
            if (!r.wordId) continue;
            await tx.wordAttempt.upsert({
              where: { profileId_wordId: { profileId, wordId: r.wordId } },
              update: {
                totalCount: { increment: 1 },
                correctCount: r.correct ? { increment: 1 } : undefined,
                lastAttemptAt: new Date(),
              },
              create: {
                profileId,
                wordId: r.wordId,
                totalCount: 1,
                correctCount: r.correct ? 1 : 0,
              },
            });
          }
        }

        return bossRecord;
      });

      res.json({
        record,
        battleResult,
        rewards: {
          stars: rewardStars,
          chest: rewardChest,
          title: rewardTitle,
          equip: rewardEquip,
          isFirstClear,
        },
      });
    } catch (error) {
      console.error('Failed to complete boss challenge:', error);
      res.status(500).json({ error: 'Failed to complete boss challenge' });
    }
  });

  // GET /api/boss/records/:profileId — 挑戰歷史
  router.get('/api/boss/records/:profileId', async (req, res) => {
    try {
      const { profileId } = req.params;
      const records = await prisma.bossRecord.findMany({
        where: { profileId },
        orderBy: { challengedAt: 'desc' },
        take: 50,
      });
      res.json(records);
    } catch (error) {
      console.error('Failed to get boss records:', error);
      res.status(500).json({ error: 'Failed to get boss records' });
    }
  });

  return router;
}
