import { Router } from 'express';
import { BADGES } from '../data/badges.js';
import { EQUIPMENT_ITEMS, getActiveSetBonuses } from '../data/equipment.js';
import { calculateTypeBonus } from '../data/categories.js';
import { PET_SPECIES, getPetTypes, calculateCurrentHunger, calculatePetStatus } from '../data/pets.js';

// 連續登入獎勵
function getLoginStreakReward(streak) {
  if (streak === 3) return 10;
  if (streak === 7) return 20;
  if (streak === 14) return 50;
  if (streak === 30) return 100;
  if (streak % 30 === 0) return 100;
  return 5;
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

  const shuffled = questTemplates.sort(() => Math.random() - 0.5);
  const selected = [];
  const usedTypes = new Set();

  for (const quest of shuffled) {
    if (!usedTypes.has(quest.type) && selected.length < 3) {
      selected.push(quest);
      usedTypes.add(quest.type);
    }
  }

  while (selected.length < 3) {
    selected.push(shuffled[selected.length]);
  }

  return selected;
}

// 熟悉度倍率
// 新單字給較多星星鼓勵學習，精熟單字仍給少量星星
function getWordFamiliarityMultiplier(correctCount, masteredLevel) {
  if (correctCount === 0) return 2;       // 全新單字：雙倍鼓勵
  if (correctCount <= 2) return 1;        // 還在學：正常
  if (correctCount <= 5) return 0.5;      // 漸漸熟了：半星
  if (masteredLevel >= 3) return 0.1;     // 已精熟(level>=3)：僅少量
  return 0.25;                            // 做過很多次但還沒精熟：少量
}

// 題型難度倍率
// 0=看中文選英文, 1=看英文選中文, 2=看中文拼英文, 3=看英文寫中文
// 4=聽英文選中文, 5=聽英文拼英文, 6=看例句填空
const QUESTION_TYPE_MULTIPLIER = {
  0: 1, 1: 1, 2: 1.5, 3: 1.5, 4: 1.2, 5: 1.8, 6: 1.5
};

function getQuestionTypeMultiplier(questionType) {
  return QUESTION_TYPE_MULTIPLIER[questionType] ?? 1;
}

// 冷卻倍率（根據本次測驗的精熟單字比例決定）
// masteredRatio: 本次測驗中已精熟(level>=3)的單字佔比 (0~1)
// attemptCount: 30 分鐘內同檔案測驗次數
function getCooldownMultiplier(attemptCount, firstAttemptAt, masteredRatio = 0) {
  const minutesSinceFirst = (Date.now() - new Date(firstAttemptAt).getTime()) / (1000 * 60);
  if (minutesSinceFirst > 30) return 1;
  // 如果大部分是不熟的單字，不扣星星
  if (masteredRatio < 0.5) return 1;
  // 超過一半是精熟單字才啟動冷卻
  if (attemptCount <= 1) return 1;
  if (attemptCount === 2) return 0.7;
  if (attemptCount === 3) return 0.4;
  return 0.1;
}

// Combo 連續答對里程碑獎勵
const COMBO_MILESTONES = [
  { streak: 3, bonus: 2 },
  { streak: 5, bonus: 5 },
  { streak: 7, bonus: 8 },
  { streak: 10, bonus: 15 },
  { streak: 15, bonus: 25 },
  { streak: 20, bonus: 40 },
];

function calculateComboBonus(wordResults) {
  let currentStreak = 0;
  let maxStreak = 0;
  let totalComboBonus = 0;
  const achievedMilestones = [];

  for (const wr of wordResults) {
    if (wr.correct) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      const milestone = COMBO_MILESTONES.find(m => m.streak === currentStreak);
      if (milestone) {
        totalComboBonus += milestone.bonus;
        achievedMilestones.push(milestone);
      }
    } else {
      currentStreak = 0;
    }
  }

  return { totalComboBonus, maxStreak, achievedMilestones };
}

// 準確率乘數（替代舊的 flat bonus）
function getAccuracyMultiplier(accuracy, totalCount) {
  if (accuracy === 100 && totalCount >= 5) return 1.5;
  if (accuracy >= 90) return 1.3;
  if (accuracy >= 80) return 1.15;
  if (accuracy >= 60) return 1.0;
  return 0.8;
}

// 寵物等級/階段星星加成
const PET_STAGE_BONUS = { 1: 0, 2: 2, 3: 5, 4: 10, 5: 20 };
const PET_RARITY_MULTIPLIER = { normal: 1.0, rare: 1.2, legendary: 1.5 };

function calculatePetLevelBonus(pet) {
  if (!pet) return 0;
  const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
  const speciesInfo = PET_SPECIES.find(s => s.species === pet.species);
  const rarity = speciesInfo?.rarity || 'normal';
  const levelBonus = Math.floor(status.level / 10);
  const stageBonus = PET_STAGE_BONUS[status.stage] || 0;
  const rarityMult = PET_RARITY_MULTIPLIER[rarity] || 1.0;
  return Math.round((levelBonus + stageBonus) * rarityMult);
}

const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function createGamificationRouter({ prisma, requireTeacher }) {
  const router = Router();

  // 檢查並更新登入狀態
  router.post('/api/profiles/:id/check-login', async (req, res) => {
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
          isNewDay = false;
        } else if (diffDays === 1) {
          newStreak = profile.loginStreak + 1;
          starsEarned = getLoginStreakReward(newStreak);
          isNewDay = true;
        } else {
          newStreak = 1;
          starsEarned = getLoginStreakReward(1);
          isNewDay = true;
        }
      } else {
        newStreak = 1;
        starsEarned = getLoginStreakReward(1);
        isNewDay = true;
      }

      const loginOps = [
        prisma.profile.update({
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
        })
      ];
      if (starsEarned > 0) {
        loginOps.push(prisma.starAdjustment.create({ data: { profileId: id, amount: starsEarned, reason: `連續登入第 ${newStreak} 天`, source: 'login' } }));
      }
      const [updatedProfile] = await prisma.$transaction(loginOps);

      let dailyQuest = await prisma.dailyQuest.findUnique({
        where: { profileId_date: { profileId: id, date: today } }
      });

      if (!dailyQuest) {
        const quests = generateDailyQuests();
        dailyQuest = await prisma.dailyQuest.create({
          data: {
            profileId: id, date: today,
            quest1Type: quests[0].type, quest1Target: quests[0].target, quest1Reward: quests[0].reward,
            quest2Type: quests[1].type, quest2Target: quests[1].target, quest2Reward: quests[1].reward,
            quest3Type: quests[2].type, quest3Target: quests[2].target, quest3Reward: quests[2].reward,
          }
        });
      }

      if (isNewDay) {
        const weekStart = getWeekStartDate(new Date());
        try {
          const challenge = await prisma.weeklyChallenge.findUnique({
            where: { profileId_weekStart: { profileId: id, weekStart } }
          });

          if (challenge) {
            const lastActive = challenge.lastActiveDate ? new Date(challenge.lastActiveDate) : null;
            if (!lastActive || lastActive.getTime() !== today.getTime()) {
              await prisma.weeklyChallenge.update({
                where: { id: challenge.id },
                data: { progressDays: { increment: 1 }, lastActiveDate: today }
              });
            }
          } else {
            await prisma.weeklyChallenge.create({
              data: { profileId: id, weekStart, targetWords: 20, targetQuiz: 50, targetDays: 5, progressDays: 1, lastActiveDate: today }
            });
          }
        } catch { /* ignore */ }
      }

      res.json({
        profile: updatedProfile, dailyQuest,
        loginReward: isNewDay ? { stars: starsEarned, streak: newStreak } : null
      });
    } catch (error) {
      console.error('Failed to check login:', error);
      res.status(500).json({ error: 'Failed to check login' });
    }
  });

  // 取得今日每日任務
  router.get('/api/profiles/:id/daily-quest', async (req, res) => {
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
            profileId: id, date: today,
            quest1Type: quests[0].type, quest1Target: quests[0].target, quest1Reward: quests[0].reward,
            quest2Type: quests[1].type, quest2Target: quests[1].target, quest2Reward: quests[1].reward,
            quest3Type: quests[2].type, quest3Target: quests[2].target, quest3Reward: quests[2].reward,
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
  router.post('/api/profiles/:id/update-quest-progress', async (req, res) => {
    try {
      const { id } = req.params;
      const { questType, value } = req.body;

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

      const questFields = [
        { type: 'quest1Type', progress: 'quest1Progress', target: 'quest1Target', reward: 'quest1Reward', done: 'quest1Done' },
        { type: 'quest2Type', progress: 'quest2Progress', target: 'quest2Target', reward: 'quest2Reward', done: 'quest2Done' },
        { type: 'quest3Type', progress: 'quest3Progress', target: 'quest3Target', reward: 'quest3Reward', done: 'quest3Done' },
      ];

      for (const field of questFields) {
        if (dailyQuest[field.type] === questType && !dailyQuest[field.done]) {
          const newProgress = questType === 'accuracy'
            ? Math.max(dailyQuest[field.progress], value)
            : dailyQuest[field.progress] + value;

          updates[field.progress] = newProgress;

          if (newProgress >= dailyQuest[field.target]) {
            updates[field.done] = true;
            starsEarned += dailyQuest[field.reward];
          }
        }
      }

      const updatedQuest = await prisma.dailyQuest.update({
        where: { profileId_date: { profileId: id, date: today } },
        data: updates
      });

      const allDone = updatedQuest.quest1Done && updatedQuest.quest2Done && updatedQuest.quest3Done;
      if (allDone && !updatedQuest.allCompleted) {
        await prisma.dailyQuest.update({
          where: { profileId_date: { profileId: id, date: today } },
          data: { allCompleted: true }
        });
        starsEarned += 10;
      }

      if (starsEarned > 0) {
        await prisma.$transaction([
          prisma.profile.update({
            where: { id },
            data: { stars: { increment: starsEarned }, totalStars: { increment: starsEarned } }
          }),
          prisma.starAdjustment.create({ data: { profileId: id, amount: starsEarned, reason: '每日任務獎勵', source: 'quest' } })
        ]);
      }

      res.json({ quest: updatedQuest, starsEarned });
    } catch (error) {
      console.error('Failed to update quest progress:', error);
      res.status(500).json({ error: 'Failed to update quest progress' });
    }
  });

  // 發放測驗星星獎勵（含防刷+熟悉度機制）
  router.post('/api/profiles/:id/award-stars', async (req, res) => {
    try {
      const { id } = req.params;
      const { correctCount, totalCount, starsFromQuiz, fileId, wordResults, doubleStarActive, difficultyMultiplier, bonusMultiplier, companionPetId, category, isReview } = req.body;

      // 讀取設定（用於功能開關）
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

      // 向後相容
      if (!wordResults || !fileId) {
        let totalStarsOld = starsFromQuiz || correctCount;
        const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        if (accuracy === 100 && totalCount >= 5) totalStarsOld += 5;
        else if (accuracy >= 80) totalStarsOld += 2;

        const updatedProfile = await prisma.profile.update({
          where: { id },
          data: { stars: { increment: totalStarsOld }, totalStars: { increment: totalStarsOld } }
        });
        return res.json({ starsEarned: totalStarsOld, newTotal: updatedProfile.stars, cooldownMultiplier: 1 });
      }

      const now = new Date();

      // 1. 批次查詢單字作答紀錄和精熟紀錄
      const wordIds = wordResults.map(w => w.wordId);
      const [existingAttempts, existingMastered] = await Promise.all([
        prisma.wordAttempt.findMany({ where: { profileId: id, wordId: { in: wordIds } } }),
        prisma.masteredWord.findMany({ where: { profileId: id, wordId: { in: wordIds } } })
      ]);

      const attemptMap = new Map(existingAttempts.map(a => [a.wordId, a]));
      const masteredMap = new Map(existingMastered.map(m => [m.wordId, m]));

      // 2. 計算本次測驗的精熟單字比例（level >= 3 視為精熟）
      const masteredCount = wordResults.filter(wr => {
        const m = masteredMap.get(wr.wordId);
        return m && m.level >= 3;
      }).length;
      const masteredRatio = wordResults.length > 0 ? masteredCount / wordResults.length : 0;

      // 3. 查詢/更新冷卻（複習模式完全跳過冷卻）
      let cooldownMultiplier = 1;

      if (!isReview) {
        let cooldown = await prisma.quizCooldown.findUnique({
          where: { profileId_fileId: { profileId: id, fileId } }
        });

        if (cooldown) {
          const minutesSinceFirst = (now.getTime() - new Date(cooldown.firstAttemptAt).getTime()) / (1000 * 60);
          if (minutesSinceFirst > 30) {
            cooldown = await prisma.quizCooldown.update({
              where: { id: cooldown.id },
              data: { attemptCount: 1, firstAttemptAt: now, lastAttemptAt: now }
            });
            cooldownMultiplier = 1;
          } else {
            cooldown = await prisma.quizCooldown.update({
              where: { id: cooldown.id },
              data: { attemptCount: { increment: 1 }, lastAttemptAt: now }
            });
            cooldownMultiplier = getCooldownMultiplier(cooldown.attemptCount, cooldown.firstAttemptAt, masteredRatio);
          }
        } else {
          await prisma.quizCooldown.create({
            data: { profileId: id, fileId, attemptCount: 1, firstAttemptAt: now, lastAttemptAt: now }
          });
        }
      }

      // 4. 計算每字星星（含題型難度倍率）
      let baseStars = 0;
      for (const wr of wordResults) {
        if (!wr.correct) continue;
        const attempt = attemptMap.get(wr.wordId);
        const mastered = masteredMap.get(wr.wordId);
        // 複習模式固定每字 x1，鼓勵學生回來複習
        const familiarityStars = isReview ? 1 : getWordFamiliarityMultiplier(attempt?.correctCount || 0, mastered?.level || 0);
        baseStars += familiarityStars * getQuestionTypeMultiplier(wr.questionType);
      }

      // 4.1 Combo 連續答對獎勵（需啟用）
      const combo = settings?.enableComboSystem ? calculateComboBonus(wordResults) : { totalComboBonus: 0, maxStreak: 0, achievedMilestones: [] };
      baseStars += combo.totalComboBonus;

      // 4.2 準確率乘數（替代舊的 flat bonus）
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      const accuracyMultiplier = getAccuracyMultiplier(accuracy, totalCount);

      // 5. 套用準確率乘數 + 冷卻倍率
      let finalStars = Math.round(baseStars * accuracyMultiplier * cooldownMultiplier);

      // 6. 套用倍率
      if (doubleStarActive) finalStars *= 2;
      if (difficultyMultiplier && difficultyMultiplier > 1) finalStars = Math.round(finalStars * difficultyMultiplier);
      if (bonusMultiplier && bonusMultiplier > 1) finalStars = Math.round(finalStars * bonusMultiplier);

      // 6.5 寵物裝備星星加成
      let companionPet = null;
      if (companionPetId) {
        companionPet = await prisma.pet.findFirst({ where: { id: companionPetId, profileId: id }, include: { equipment: true } });
      }
      if (!companionPet) {
        companionPet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true }, include: { equipment: true } });
      }

      // 計算寵物當前飽足度
      let petHungerMultiplier = 1.0;
      if (companionPet) {
        const currentHunger = calculateCurrentHunger(companionPet);

        if (currentHunger >= 50) petHungerMultiplier = 1.0;
        else if (currentHunger >= 20) petHungerMultiplier = 0.5;
        else petHungerMultiplier = 0.25;
      }

      let equipStarsBonus = 0;
      if (companionPet) {
        for (const eq of (companionPet.equipment || [])) {
          const itemDef = EQUIPMENT_ITEMS.find(e => e.id === eq.itemId);
          if (itemDef && itemDef.bonusType === 'stars') equipStarsBonus += itemDef.bonusValue;
        }
        if (equipStarsBonus > 0) {
          const adjustedBonus = Math.round(equipStarsBonus * petHungerMultiplier);
          finalStars = Math.round(finalStars * (1 + adjustedBonus / 100));
        }
      }

      // 6.5b 套裝星星加成
      let setBonusStars = 0;
      if (companionPet) {
        const equippedItemIds = (companionPet.equipment || []).map(e => e.itemId);
        const setEffects = getActiveSetBonuses(equippedItemIds);
        for (const effect of setEffects) {
          if (effect.effect === 'stars_10') setBonusStars += 10;
          if (effect.effect === 'stars_15') setBonusStars += 15;
        }
        if (setBonusStars > 0) {
          const adjustedSetBonus = Math.round(setBonusStars * petHungerMultiplier);
          finalStars = Math.round(finalStars * (1 + adjustedSetBonus / 100));
        }
      }

      // 6.6 屬性加成
      let typeBonusMultiplier = 1.0;
      if (companionPet && category) {
        const petTypes = getPetTypes(companionPet.species, companionPet.evolutionPath, companionPet.stage);
        typeBonusMultiplier = calculateTypeBonus(petTypes, category);
        if (typeBonusMultiplier !== 1.0) finalStars = Math.round(finalStars * typeBonusMultiplier);
      }

      // 6.7 寵物等級/階段星星加成（需啟用，受飽足度影響）
      let petLevelBonus = 0;
      if (companionPet && settings?.enablePetStarBonus) {
        petLevelBonus = calculatePetLevelBonus(companionPet);
        if (petLevelBonus > 0) {
          const adjustedLevelBonus = Math.round(petLevelBonus * petHungerMultiplier);
          finalStars = Math.round(finalStars * (1 + adjustedLevelBonus / 100));
        }
      }

      // 6.8 寵物能力加成（受飽足度影響）
      let abilityBonus = 0;
      if (companionPet) {
        const speciesInfo = PET_SPECIES.find(s => s.species === companionPet.species);
        if (speciesInfo) {
          switch (companionPet.species) {
            case 'crystal_beast': {
              const before1 = finalStars;
              const mult1 = 1 + (0.15 * petHungerMultiplier);
              finalStars = Math.round(finalStars * mult1);
              abilityBonus = finalStars - before1;
              break;
            }
            case 'sky_dragon':
              if (accuracy === 100 && totalCount >= 5) {
                const before2 = finalStars;
                const mult2 = 1 + (0.30 * petHungerMultiplier);
                finalStars = Math.round(finalStars * mult2);
                abilityBonus = finalStars - before2;
              }
              break;
            case 'dune_bug': {
              const bonus = Math.round(1 * petHungerMultiplier);
              finalStars += bonus;
              abilityBonus = bonus;
              break;
            }
            case 'mimic_lizard':
              if (Math.random() < 0.10) {
                const mimicBonus = Math.round(finalStars * petHungerMultiplier);
                abilityBonus = mimicBonus;
                finalStars += mimicBonus;
              }
              break;
            case 'electric_mouse':
              if (correctCount === totalCount && totalCount >= 3) {
                const streakBonus = Math.round(finalStars * 0.05 * petHungerMultiplier);
                finalStars += streakBonus;
                abilityBonus = streakBonus;
              }
              break;
          }
        }
      }

      finalStars = Math.max(0, finalStars);

      // 7. 批次 upsert WordAttempt
      const upsertOps = wordResults.map(wr =>
        prisma.wordAttempt.upsert({
          where: { profileId_wordId: { profileId: id, wordId: wr.wordId } },
          update: { totalCount: { increment: 1 }, correctCount: wr.correct ? { increment: 1 } : undefined, lastAttemptAt: now },
          create: { profileId: id, wordId: wr.wordId, totalCount: 1, correctCount: wr.correct ? 1 : 0, lastAttemptAt: now }
        })
      );

      // 8. 更新星星
      const starOps = [
        prisma.profile.update({ where: { id }, data: { stars: { increment: finalStars }, totalStars: { increment: finalStars } } }),
        ...upsertOps
      ];
      if (finalStars > 0) {
        starOps.push(prisma.starAdjustment.create({ data: { profileId: id, amount: finalStars, reason: '測驗獎勵', source: 'quiz' } }));
      }
      const [updatedProfile] = await prisma.$transaction(starOps);

      res.json({ starsEarned: finalStars, newTotal: updatedProfile.stars, cooldownMultiplier, baseStars: Math.round(baseStars), accuracyMultiplier, comboBonus: combo.totalComboBonus, maxStreak: combo.maxStreak, typeBonusMultiplier, abilityBonus, petHungerMultiplier, petLevelBonus });
    } catch (error) {
      console.error('Failed to award stars:', error);
      res.status(500).json({ error: 'Failed to award stars' });
    }
  });

  // 調整學生星星
  router.post('/api/profiles/:id/adjust-stars', requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      if (!Number.isInteger(amount) || amount === 0) return res.status(400).json({ error: 'amount must be a non-zero integer' });
      if (Math.abs(amount) > 1000) return res.status(400).json({ error: 'amount must be between -1000 and 1000' });
      if (reason && typeof reason === 'string' && reason.trim().length > 200) return res.status(400).json({ error: 'reason must be 200 characters or less' });

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const newStars = Math.max(0, profile.stars + amount);

      const [updatedProfile, adjustment] = await prisma.$transaction([
        prisma.profile.update({ where: { id }, data: { stars: newStars } }),
        prisma.starAdjustment.create({ data: { profileId: id, amount, reason: (reason && reason.trim()) || (amount > 0 ? '加分' : '扣分'), source: 'teacher' } })
      ]);

      res.json({ success: true, newStars: updatedProfile.stars, adjustment });
    } catch (error) {
      console.error('Failed to adjust stars:', error);
      res.status(500).json({ error: 'Failed to adjust stars' });
    }
  });

  // 取得星星調整歷史（預設只回傳 teacher 來源，向後相容）
  router.get('/api/profiles/:id/star-adjustments', async (req, res) => {
    try {
      const source = req.query.source || 'teacher';
      const where = { profileId: req.params.id };
      if (source !== 'all') where.source = source;
      const adjustments = await prisma.starAdjustment.findMany({
        where,
        orderBy: { adjustedAt: 'desc' },
        take: 50
      });
      res.json(adjustments);
    } catch (error) {
      console.error('Failed to get star adjustments:', error);
      res.status(500).json({ error: 'Failed to get star adjustments' });
    }
  });

  // 取得學生星星歷史（所有來源）
  router.get('/api/profiles/:id/star-history', async (req, res) => {
    try {
      const { id } = req.params;
      const days = parseInt(req.query.days) || 7;
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const history = await prisma.starAdjustment.findMany({
        where: { profileId: id, adjustedAt: { gte: since } },
        orderBy: { adjustedAt: 'desc' }
      });

      const summary = history.reduce((acc, item) => {
        if (item.amount > 0) acc.earned += item.amount;
        else acc.spent += Math.abs(item.amount);
        return acc;
      }, { earned: 0, spent: 0 });

      res.json({ history, summary });
    } catch (error) {
      console.error('Failed to get star history:', error);
      res.status(500).json({ error: 'Failed to get star history' });
    }
  });

  // 刪除星星調整紀錄（僅限 teacher 來源）
  router.delete('/api/star-adjustments/:id', requireTeacher, async (req, res) => {
    try {
      const adjustment = await prisma.starAdjustment.findUnique({ where: { id: req.params.id } });
      if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' });
      if (adjustment.source !== 'teacher') return res.status(403).json({ error: 'Only teacher adjustments can be deleted' });

      const profile = await prisma.profile.findUnique({ where: { id: adjustment.profileId } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const newStars = Math.max(0, profile.stars - adjustment.amount);

      await prisma.$transaction([
        prisma.profile.update({ where: { id: adjustment.profileId }, data: { stars: newStars } }),
        prisma.starAdjustment.delete({ where: { id: req.params.id } })
      ]);

      res.json({ success: true, newStars });
    } catch (error) {
      console.error('Failed to delete star adjustment:', error);
      res.status(500).json({ error: 'Failed to delete star adjustment' });
    }
  });

  // 更新星星調整紀錄的原因（僅限 teacher 來源）
  router.put('/api/star-adjustments/:id', requireTeacher, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0 || reason.trim().length > 200) {
        return res.status(400).json({ error: 'reason must be 1-200 characters' });
      }

      const existing = await prisma.starAdjustment.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Adjustment not found' });
      if (existing.source !== 'teacher') return res.status(403).json({ error: 'Only teacher adjustments can be edited' });

      const adjustment = await prisma.starAdjustment.update({
        where: { id: req.params.id },
        data: { reason: reason.trim() }
      });
      res.json(adjustment);
    } catch (error) {
      console.error('Failed to update star adjustment:', error);
      res.status(500).json({ error: 'Failed to update star adjustment' });
    }
  });

  // 取得所有徽章定義
  router.get('/api/badges', (req, res) => {
    res.json(BADGES);
  });

  // 取得學生已解鎖的徽章
  router.get('/api/profiles/:id/badges', async (req, res) => {
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
  router.post('/api/profiles/:id/check-badges', async (req, res) => {
    try {
      const { id } = req.params;

      const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
          quizSessions: { include: { results: true } },
          masteredWords: true,
          badges: true
        }
      });

      if (!profile) return res.status(404).json({ error: 'Profile not found' });

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

      const unlockedBadgeIds = profile.badges.map(b => b.badgeId);
      const newBadges = [];

      for (const badge of BADGES) {
        if (unlockedBadgeIds.includes(badge.id)) continue;
        const { type, value } = badge.condition;
        if (stats[type] >= value) {
          const newBadge = await prisma.profileBadge.create({ data: { profileId: id, badgeId: badge.id } });
          newBadges.push({ ...badge, unlockedAt: newBadge.unlockedAt });
        }
      }

      res.json({ newBadges, stats });
    } catch (error) {
      console.error('Failed to check badges:', error);
      res.status(500).json({ error: 'Failed to check badges' });
    }
  });

  return router;
}
