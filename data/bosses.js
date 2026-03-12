// ===== Boss 挑戰系統定義 =====

export const BOSS_TIERS = [
  {
    tier: 1,
    name: '暗影狼',
    icon: '🐺',
    requiredLevel: 10,
    hp: 750,
    attack: 30,
    questionCount: 15,
    firstClearReward: { stars: 200, chest: 'silver', title: 'boss_slayer_1' },
    repeatReward: { starsMin: 60, starsMax: 100 },
  },
  {
    tier: 2,
    name: '毒霧蛇',
    icon: '🐍',
    requiredLevel: 25,
    hp: 1800,
    attack: 50,
    questionCount: 18,
    firstClearReward: { stars: 350, chest: 'silver', title: 'boss_slayer_2' },
    repeatReward: { starsMin: 80, starsMax: 130 },
  },
  {
    tier: 3,
    name: '石甲龍',
    icon: '🦎',
    requiredLevel: 40,
    hp: 3300,
    attack: 80,
    questionCount: 22,
    firstClearReward: { stars: 500, chest: 'gold', title: 'boss_slayer_3', equipGuaranteed: true },
    repeatReward: { starsMin: 100, starsMax: 160 },
  },
  {
    tier: 4,
    name: '烈焰鳳凰',
    icon: '🔥',
    requiredLevel: 60,
    hp: 5000,
    attack: 110,
    questionCount: 25,
    firstClearReward: { stars: 700, chest: 'gold', title: 'boss_slayer_4', equipGuaranteed: true },
    repeatReward: { starsMin: 130, starsMax: 200 },
  },
  {
    tier: 5,
    name: '虛空魔神',
    icon: '👿',
    requiredLevel: 80,
    hp: 7000,
    attack: 150,
    questionCount: 28,
    firstClearReward: { stars: 1000, chest: 'diamond', title: 'boss_slayer_5', equipGuaranteed: true },
    repeatReward: { starsMin: 160, starsMax: 250 },
  },
];

// ===== 勇者裝備（Boss 限定） =====
export const BOSS_EQUIPMENT = [
  { id: 'hero_hat', name: '勇者之冠', icon: '👑', slot: 'hat', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 25, description: '勇者套裝·帽子（星星 +25%）' },
  { id: 'hero_neck', name: '勇者之心', icon: '🏅', slot: 'necklace', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 40, description: '勇者套裝·項鍊（經驗 +40%）' },
  { id: 'hero_wings', name: '勇者之翼', icon: '🦅', slot: 'wings', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 20, description: '勇者套裝·翅膀（星星 +20%）' },
  { id: 'hero_weapon', name: '勇者之劍', icon: '⚔️', slot: 'weapon', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 35, description: '勇者套裝·武器（經驗 +35%）' },
];

// ===== 勇者套裝效果 =====
export const HERO_SET_BONUSES = {
  hero: {
    name: '勇者套裝',
    icon: '⚔️',
    bonuses: [
      { count: 2, effect: 'auto_shield_2', description: '每場自動獲得 2 次護盾' },
      { count: 3, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 4, effect: 'hero_full', description: '所有星星 +20% 且所有經驗 +20%' },
    ],
  },
};

// ===== Boss 稱號 =====
export const BOSS_TITLES = [
  { id: 'boss_slayer_1', name: '影狼獵手', description: '首次擊敗暗影狼', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'boss_clear', value: 1 } },
  { id: 'boss_slayer_2', name: '毒蛇剋星', description: '首次擊敗毒霧蛇', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'boss_clear', value: 2 } },
  { id: 'boss_slayer_3', name: '屠龍勇士', description: '首次擊敗石甲龍', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'boss_clear', value: 3 } },
  { id: 'boss_slayer_4', name: '鳳凰征服者', description: '首次擊敗烈焰鳳凰', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'boss_clear', value: 4 } },
  { id: 'boss_slayer_5', name: '魔神終結者', description: '首次擊敗虛空魔神', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'boss_clear', value: 5 } },
];

// ===== Boss 題型配置（依層級解鎖） =====
export const BOSS_QUESTION_TYPES = {
  1: [0, 1],                    // Tier 1: 基礎選擇題
  2: [0, 1, 7],                 // Tier 2: + 例句選答案
  3: [0, 1, 2, 7],              // Tier 3: + 拼寫
  4: [0, 1, 2, 6, 7],           // Tier 4: + 例句填空
  5: [0, 1, 2, 4, 5, 6, 7],     // Tier 5: 全題型
};

// ===== Boss 經驗計算 =====
export function calculateBossExpReward({ tier, correctCount, victory }) {
  const baseExp = correctCount * 8;
  const tierMultiplier = 1 + (tier - 1) * 0.3;
  const victoryBonus = victory ? 1.5 : 0.5;
  return Math.round(baseExp * tierMultiplier * victoryBonus);
}

// ===== 出題策略：選出學生最弱的 N 個單字 =====
export function selectBossWords({ allWords, wordAttempts, masteredWords, fileProgresses, count, questionTypes }) {
  const attemptMap = new Map(wordAttempts.map(a => [a.wordId, a]));
  const masteredMap = new Map(masteredWords.map(m => [m.wordId, m]));

  const weakWordIds = new Set();
  for (const fp of fileProgresses) {
    for (const wid of (fp.weakWordIds || [])) {
      weakWordIds.add(wid);
    }
  }

  // 當題型包含 6/7 時，優先選有 exampleSentence 的單字
  const needsSentence = questionTypes && questionTypes.some(t => t === 6 || t === 7);

  const scored = allWords.map(word => {
    const attempt = attemptMap.get(word.id);
    const mastered = masteredMap.get(word.id);

    let score = 50;

    if (attempt && attempt.totalCount > 0) {
      score += (1 - attempt.correctCount / attempt.totalCount) * 50;
    }

    if (!mastered) {
      score += 20;
    } else {
      score -= mastered.level * 5;
    }

    if (weakWordIds.has(word.id)) {
      score += 15;
    }

    if (needsSentence && word.exampleSentence) {
      score += 10;
    }

    return { word, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map(s => s.word);
}

// ===== 戰鬥計算 =====
export function calculateBattleResult({ bossData, petStats, correctCount, totalCount }) {
  const petEffectiveHp = petStats.hp + petStats.defense;
  const damageDealt = correctCount * petStats.attack;
  const wrongCount = totalCount - correctCount;
  const damageTaken = wrongCount * bossData.attack;

  const bossRemaining = Math.max(0, bossData.hp - damageDealt);
  const petRemaining = Math.max(0, petEffectiveHp - damageTaken);

  const victory = bossRemaining <= 0;

  return {
    victory,
    damageDealt,
    damageTaken,
    bossRemainingHp: bossRemaining,
    petRemainingHp: petRemaining,
    petEffectiveHp,
  };
}

// ===== 重複通關隨機裝備（20% 機率） =====
export function rollRepeatEquipment() {
  if (Math.random() >= 0.2) return null;
  const idx = Math.floor(Math.random() * BOSS_EQUIPMENT.length);
  return BOSS_EQUIPMENT[idx].id;
}
