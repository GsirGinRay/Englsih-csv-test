import { Router } from 'express';
import { BOSS_TIERS, BOSS_EQUIPMENT, BOSS_QUESTION_TYPES, selectBossWords, calculateBattleResult, rollRepeatEquipment, calculateBossExpReward, rollBossChest, rollBossItems, rollFirstClearBonusItems } from '../data/bosses.js';
import { calculatePetStatus, calculateRpgStats, calculateCurrentHunger, getStagesForPet, PET_SPECIES } from '../data/pets.js';
import { EQUIPMENT_ITEMS, getActiveSetBonuses } from '../data/equipment.js';

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

      // 取得玩家所有活著的寵物
      const allPets = await prisma.pet.findMany({ where: { profileId, isDead: false } });
      if (allPets.length === 0) {
        // 檢查是否有死亡寵物
        const deadCount = await prisma.pet.count({ where: { profileId, isDead: true } });
        return res.json({ enabled: true, tiers: [], noPet: deadCount === 0, allDead: deadCount > 0 });
      }

      // 計算所有寵物的等級與數值
      const petsWithStats = allPets.map(pet => {
        const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
        const stats = calculateRpgStats(pet.species, status.level);
        return {
          id: pet.id,
          name: pet.name,
          species: pet.species,
          level: status.level,
          stage: status.stage,
          evolutionPath: pet.evolutionPath,
          stats,
          isActive: pet.isActive,
        };
      });

      // 找到最高等級（判斷可挑戰哪些 Boss）
      const maxPetLevel = Math.max(...petsWithStats.map(p => p.level));

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
        const canLevel = maxPetLevel >= boss.requiredLevel;
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
          questionTypes: BOSS_QUESTION_TYPES[boss.tier] || [0, 1],
          canChallenge: canLevel && !onCooldown,
          isFirstClear: !firstClearSet.has(boss.tier),
          locked: !canLevel,
          onCooldown,
          firstClearReward: boss.firstClearReward,
          repeatReward: boss.repeatReward,
        };
      });

      res.json({
        enabled: true,
        tiers,
        pets: petsWithStats,
      });
    } catch (error) {
      console.error('Failed to get available bosses:', error);
      res.status(500).json({ error: 'Failed to get available bosses' });
    }
  });

  // POST /api/boss/start — 開始 Boss 挑戰
  router.post('/api/boss/start', async (req, res) => {
    try {
      const { profileId, tier, petId } = req.body;

      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      if (!settings?.enableBossSystem) {
        return res.status(400).json({ error: 'Boss system not enabled' });
      }

      const bossData = BOSS_TIERS.find(b => b.tier === tier);
      if (!bossData) {
        return res.status(400).json({ error: 'Invalid boss tier' });
      }

      // 取得指定寵物（或 active pet）
      const selectedPet = petId
        ? await prisma.pet.findFirst({ where: { id: petId, profileId } })
        : await prisma.pet.findFirst({ where: { profileId, isActive: true } });
      if (!selectedPet) {
        return res.status(400).json({ error: 'Pet not found' });
      }
      if (selectedPet.isDead) {
        return res.status(400).json({ error: '這隻寵物已經死亡，請先復活！' });
      }

      const petStatus = calculatePetStatus(selectedPet.exp, selectedPet.species, selectedPet.evolutionPath);
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
      const questionTypes = BOSS_QUESTION_TYPES[tier] || [0, 1];
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
        questionTypes,
      });

      const petStats = calculateRpgStats(selectedPet.species, petStatus.level);

      res.json({
        boss: {
          tier: bossData.tier,
          name: bossData.name,
          icon: bossData.icon,
          hp: bossData.hp,
          attack: bossData.attack,
          questionCount: bossData.questionCount,
        },
        questionTypes,
        words: selectedWords,
        petStats,
        petId: selectedPet.id,
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

      const battlePet = await prisma.pet.findFirst({
        where: { id: petId, profileId },
        include: { equipment: true },
      });
      if (!battlePet) {
        return res.status(400).json({ error: 'Pet not found' });
      }

      const petStatus = calculatePetStatus(battlePet.exp, battlePet.species, battlePet.evolutionPath);
      const petStats = calculateRpgStats(battlePet.species, petStatus.level);

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
      let bonusItems = [];

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
          } else {
            // 首殺無保底裝備的層級也有機會掉裝備
            rewardEquip = rollRepeatEquipment(tier);
          }
          // 首殺保底道具
          bonusItems = rollFirstClearBonusItems(tier);
        } else {
          const rr = bossData.repeatReward;
          rewardStars = Math.floor(Math.random() * (rr.starsMax - rr.starsMin + 1)) + rr.starsMin;
          rewardChest = rollBossChest(tier);
          rewardEquip = rollRepeatEquipment(tier);
          bonusItems = rollBossItems(tier);
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

        // 寶箱（首殺和重複通關都給）
        if (battleResult.victory && rewardChest) {
          await tx.profileChest.upsert({
            where: { profileId_chestType: { profileId, chestType: rewardChest } },
            update: { quantity: { increment: 1 } },
            create: { profileId, chestType: rewardChest },
          });
        }

        // 稱號（僅首殺）
        if (isFirstClear && rewardTitle) {
          await tx.profileTitle.upsert({
            where: { profileId_titleId: { profileId, titleId: rewardTitle } },
            update: {},
            create: { profileId, titleId: rewardTitle },
          });
        }

        // 裝備（首殺或重複都可能掉）
        if (rewardEquip) {
          await tx.profilePurchase.upsert({
            where: { profileId_itemId: { profileId, itemId: rewardEquip } },
            update: {},
            create: { profileId, itemId: rewardEquip },
          });
        }

        // 道具掉落存入背包
        if (bonusItems.length > 0) {
          for (const item of bonusItems) {
            await tx.profileItem.upsert({
              where: { profileId_itemId: { profileId, itemId: item.itemId } },
              update: { quantity: { increment: item.count } },
              create: { profileId, itemId: item.itemId, quantity: item.count },
            });
          }
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

        // 寵物經驗獎勵（復用 gain-exp 邏輯）
        let expBonus = 0;
        for (const eq of (battlePet.equipment || [])) {
          const itemDef = EQUIPMENT_ITEMS.find(e => e.id === eq.itemId);
          if (itemDef && itemDef.bonusType === 'exp') expBonus += itemDef.bonusValue;
        }
        const equippedItemIds = (battlePet.equipment || []).map(e => e.itemId);
        const setEffects = getActiveSetBonuses(equippedItemIds);
        for (const effect of setEffects) {
          if (effect.effect === 'exp_10') expBonus += 10;
          if (effect.effect === 'pet_exp_20') expBonus += 20;
          if (effect.effect === 'pet_exp_15') expBonus += 15;
          if (effect.effect === 'pet_exp_25') expBonus += 25;
        }
        let abilityExpBonus = 0;
        if (battlePet.species === 'nebula_fish') abilityExpBonus = 20;
        if (battlePet.species === 'circuit_fish') abilityExpBonus = 10;

        const currentHungerForExp = calculateCurrentHunger(battlePet);
        let hungerExpMultiplier = 1.0;
        if (currentHungerForExp >= 80) hungerExpMultiplier = 1.5;
        else if (currentHungerForExp >= 50) hungerExpMultiplier = 1.0;
        else if (currentHungerForExp >= 20) hungerExpMultiplier = 0.75;
        else hungerExpMultiplier = 0.5;

        const bossBaseExp = calculateBossExpReward({ tier, correctCount, victory: battleResult.victory });
        const petExpGain = Math.round(bossBaseExp * (1 + (expBonus + abilityExpBonus) / 100) * hungerExpMultiplier);

        const oldPetStatus = calculatePetStatus(battlePet.exp, battlePet.species, battlePet.evolutionPath);
        const newPetExp = battlePet.exp + petExpGain;
        const newPetStatus = calculatePetStatus(newPetExp, battlePet.species, battlePet.evolutionPath);

        const petUpdateData = { exp: newPetExp, level: newPetStatus.level, stage: newPetStatus.stage };

        // 戰敗 → 寵物死亡
        if (!battleResult.victory) {
          petUpdateData.isDead = true;
          petUpdateData.deadAt = new Date();
          petUpdateData.isActive = false;
        }

        await tx.pet.update({
          where: { id: petId },
          data: petUpdateData,
        });

        // 若寵物死亡，嘗試切換 active 寵物到另一隻活著的
        if (!battleResult.victory) {
          const alivePet = await tx.pet.findFirst({
            where: { profileId, isDead: false, id: { not: petId } },
            orderBy: { createdAt: 'asc' },
          });
          if (alivePet) {
            await tx.pet.update({ where: { id: alivePet.id }, data: { isActive: true } });
          }
        }

        return { bossRecord, petExpGain, oldPetStatus, newPetStatus, petDied: !battleResult.victory, bonusItems };
      });

      res.json({
        record: record.bossRecord,
        battleResult,
        rewards: {
          stars: rewardStars,
          chest: rewardChest,
          title: rewardTitle,
          equip: rewardEquip,
          isFirstClear,
          petExp: record.petExpGain,
          petLevelUp: record.newPetStatus.level > record.oldPetStatus.level,
          petEvolved: record.newPetStatus.stage > record.oldPetStatus.stage,
          newPetLevel: record.newPetStatus.level,
          petDied: record.petDied,
          bonusItems: record.bonusItems,
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
