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
    firstClearReward: { stars: 500, chest: 'silver', title: 'boss_slayer_1' },
    repeatReward: { starsMin: 200, starsMax: 300 },
  },
  {
    tier: 2,
    name: '毒霧蛇',
    icon: '🐍',
    requiredLevel: 25,
    hp: 1800,
    attack: 50,
    questionCount: 18,
    firstClearReward: { stars: 800, chest: 'gold', title: 'boss_slayer_2' },
    repeatReward: { starsMin: 250, starsMax: 400 },
  },
  {
    tier: 3,
    name: '石甲龍',
    icon: '🦎',
    requiredLevel: 40,
    hp: 3300,
    attack: 80,
    questionCount: 22,
    firstClearReward: { stars: 1200, chest: 'gold', title: 'boss_slayer_3', equipGuaranteed: true },
    repeatReward: { starsMin: 300, starsMax: 500 },
  },
  {
    tier: 4,
    name: '烈焰鳳凰',
    icon: '🔥',
    requiredLevel: 60,
    hp: 5000,
    attack: 110,
    questionCount: 25,
    firstClearReward: { stars: 1800, chest: 'diamond', title: 'boss_slayer_4', equipGuaranteed: true },
    repeatReward: { starsMin: 400, starsMax: 600 },
  },
  {
    tier: 5,
    name: '虛空魔神',
    icon: '👿',
    requiredLevel: 80,
    hp: 7000,
    attack: 150,
    questionCount: 28,
    firstClearReward: { stars: 3000, chest: 'diamond', title: 'boss_slayer_5', equipGuaranteed: true },
    repeatReward: { starsMin: 500, starsMax: 800 },
  },
];

// ===== 勇者裝備（Boss 限定，分階級） =====
// Tier 3 掉落：勇者之冠（入門）
// Tier 4 掉落：勇者之心 + 勇者之翼（進階）
// Tier 5 掉落：勇者之劍（最終）
export const BOSS_EQUIPMENT = [
  { id: 'hero_hat', name: '勇者之冠', icon: '👑', slot: 'hat', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 35, description: '勇者套裝·帽子（星星 +35%）', dropTier: 3 },
  { id: 'hero_neck', name: '勇者之心', icon: '🏅', slot: 'necklace', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 45, description: '勇者套裝·項鍊（經驗 +45%）', dropTier: 4 },
  { id: 'hero_wings', name: '勇者之翼', icon: '🦅', slot: 'wings', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 40, description: '勇者套裝·翅膀（星星 +40%）', dropTier: 4 },
  { id: 'hero_weapon', name: '勇者之劍', icon: '⚔️', slot: 'weapon', category: 'set', setId: 'hero', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 50, description: '勇者套裝·武器（經驗 +50%）', dropTier: 5 },
];

// ===== 勇者套裝效果 =====
export const HERO_SET_BONUSES = {
  hero: {
    name: '勇者套裝',
    icon: '⚔️',
    bonuses: [
      { count: 2, effect: 'auto_shield_3', description: '每場自動獲得 3 次護盾' },
      { count: 3, effect: 'exp_25', description: '額外經驗 +25%' },
      { count: 4, effect: 'hero_full', description: '所有星星 +30% 且所有經驗 +30%' },
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

// ===== 重複通關寶箱掉落表（加權隨機） =====
export const BOSS_CHEST_DROP_TABLE = {
  1: [{ type: 'bronze', weight: 50 }, { type: 'silver', weight: 35 }, { type: 'gold', weight: 12 }, { type: 'diamond', weight: 3 }],
  2: [{ type: 'bronze', weight: 30 }, { type: 'silver', weight: 40 }, { type: 'gold', weight: 22 }, { type: 'diamond', weight: 8 }],
  3: [{ type: 'bronze', weight: 10 }, { type: 'silver', weight: 35 }, { type: 'gold', weight: 38 }, { type: 'diamond', weight: 17 }],
  4: [{ type: 'bronze', weight: 5 }, { type: 'silver', weight: 20 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 30 }],
  5: [{ type: 'silver', weight: 10 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 45 }],
};

// ===== 額外掉落配置 =====
export const BOSS_BONUS_DROPS = {
  1: { itemRate: 0.30, itemCountMin: 1, itemCountMax: 2, equipRate: 0.01 },
  2: { itemRate: 0.40, itemCountMin: 1, itemCountMax: 3, equipRate: 0.02 },
  3: { itemRate: 0.50, itemCountMin: 2, itemCountMax: 4, equipRate: 0.03 },
  4: { itemRate: 0.65, itemCountMin: 2, itemCountMax: 5, equipRate: 0.05 },
  5: { itemRate: 0.80, itemCountMin: 3, itemCountMax: 5, equipRate: 0.08 },
};

// ===== 首殺保底道具數量 =====
export const BOSS_FIRST_CLEAR_ITEMS = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 8 };

// ===== 道具掉落池（加權） =====
const BOSS_ITEM_POOL = [
  { id: 'time_extend', weight: 25 },
  { id: 'hint', weight: 25 },
  { id: 'skip', weight: 20 },
  { id: 'shield', weight: 15 },
  { id: 'double_exp', weight: 10 },
  { id: 'double_star', weight: 5 },
];

function rollFromPool(count) {
  const totalWeight = BOSS_ITEM_POOL.reduce((sum, e) => sum + e.weight, 0);
  const items = [];
  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    for (const entry of BOSS_ITEM_POOL) {
      roll -= entry.weight;
      if (roll <= 0) { items.push(entry.id); break; }
    }
  }
  const countMap = new Map();
  for (const id of items) countMap.set(id, (countMap.get(id) || 0) + 1);
  return Array.from(countMap.entries()).map(([itemId, qty]) => ({ itemId, count: qty }));
}

// 隨機寶箱（依層級加權）
export function rollBossChest(tier) {
  const table = BOSS_CHEST_DROP_TABLE[tier] || BOSS_CHEST_DROP_TABLE[1];
  const totalWeight = table.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return table[table.length - 1].type;
}

// 重複通關隨機道具掉落
export function rollBossItems(tier) {
  const config = BOSS_BONUS_DROPS[tier] || BOSS_BONUS_DROPS[1];
  if (Math.random() >= config.itemRate) return [];
  const count = Math.floor(Math.random() * (config.itemCountMax - config.itemCountMin + 1)) + config.itemCountMin;
  return rollFromPool(count);
}

// 首殺保底道具
export function rollFirstClearBonusItems(tier) {
  const count = BOSS_FIRST_CLEAR_ITEMS[tier] || 2;
  return rollFromPool(count);
}

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

// ===== 隨機裝備（依層級 + 擁有數量遞減） =====
export function rollRepeatEquipment(tier, ownedHeroIds = []) {
  if (tier < 3) return null; // Tier 1-2 不掉勇者裝備
  const config = BOSS_BONUS_DROPS[tier] || BOSS_BONUS_DROPS[1];
  // 該層級可掉落的裝備池
  const pool = BOSS_EQUIPMENT.filter(e => e.dropTier === tier);
  // 排除已擁有的
  const available = pool.filter(e => !ownedHeroIds.includes(e.id));
  if (available.length === 0) return null;
  // 每多擁有一件勇者裝備，機率大幅降低
  const ownedCount = ownedHeroIds.length;
  const penalties = [1.0, 0.5, 0.2, 0.08];
  const penalty = penalties[Math.min(ownedCount, 3)];
  if (Math.random() >= config.equipRate * penalty) return null;
  return available[Math.floor(Math.random() * available.length)].id;
}
