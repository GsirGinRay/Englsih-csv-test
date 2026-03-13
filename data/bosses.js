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
    element: '惡',
    weakTo: ['格鬥', '蟲', '妖精'],
    firstClearReward: { stars: 500, chest: 'silver', title: 'boss_slayer_1', equipGuaranteed: true },
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
    element: '毒',
    weakTo: ['地面', '超能力'],
    firstClearReward: { stars: 800, chest: 'gold', title: 'boss_slayer_2', equipGuaranteed: true },
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
    element: '龍',
    weakTo: ['冰', '龍', '妖精'],
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
    element: '火',
    weakTo: ['水', '岩石'],
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
    element: '幽靈',
    weakTo: ['妖精'],
    firstClearReward: { stars: 3000, chest: 'diamond', title: 'boss_slayer_5', equipGuaranteed: true },
    repeatReward: { starsMin: 500, starsMax: 800 },
  },
];

// ===== Boss 套裝裝備（5 套 x 4 件 = 20 件，各層級獨立掉落） =====
export const BOSS_EQUIPMENT = [
  // T1 暗影狼套裝 (shadow_wolf, rare, stage 2)
  { id: 'boss_shadow_hat', name: '暗影狼冠', icon: '🌑', slot: 'hat', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 8, combatStat: 'hp', combatValue: 8, description: '暗影狼套裝·帽子（經驗 +8%）', dropTier: 1 },
  { id: 'boss_shadow_neck', name: '狼牙項鍊', icon: '🐺', slot: 'necklace', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 8, combatStat: 'def', combatValue: 5, description: '暗影狼套裝·項鍊（星星 +8%）', dropTier: 1 },
  { id: 'boss_shadow_wings', name: '夜影披風', icon: '🌙', slot: 'wings', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 10, combatStat: 'atk', combatValue: 3, description: '暗影狼套裝·翅膀（經驗 +10%）', dropTier: 1 },
  { id: 'boss_shadow_weapon', name: '月光爪刃', icon: '🔪', slot: 'weapon', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 12, combatStat: 'atk', combatValue: 8, description: '暗影狼套裝·武器（星星 +12%）', dropTier: 1 },
  // T2 毒霧蛇套裝 (venom_snake, rare, stage 2)
  { id: 'boss_venom_hat', name: '毒蛇面冠', icon: '🐍', slot: 'hat', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 12, combatStat: 'hp', combatValue: 12, description: '毒霧蛇套裝·帽子（星星 +12%）', dropTier: 2 },
  { id: 'boss_venom_neck', name: '蛇鱗護符', icon: '🧿', slot: 'necklace', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 12, combatStat: 'def', combatValue: 8, description: '毒霧蛇套裝·項鍊（經驗 +12%）', dropTier: 2 },
  { id: 'boss_venom_wings', name: '毒霧斗篷', icon: '💨', slot: 'wings', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 15, combatStat: 'atk', combatValue: 5, description: '毒霧蛇套裝·翅膀（星星 +15%）', dropTier: 2 },
  { id: 'boss_venom_weapon', name: '毒牙短劍', icon: '🗡️', slot: 'weapon', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 15, combatStat: 'atk', combatValue: 12, description: '毒霧蛇套裝·武器（經驗 +15%）', dropTier: 2 },
  // T3 石甲龍套裝 (stone_dragon, legendary, stage 3)
  { id: 'boss_stone_hat', name: '龍角戰盔', icon: '🪖', slot: 'hat', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 20, combatStat: 'hp', combatValue: 20, description: '石甲龍套裝·帽子（經驗 +20%）', dropTier: 3 },
  { id: 'boss_stone_neck', name: '龍鱗護心鏡', icon: '🐉', slot: 'necklace', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 18, combatStat: 'def', combatValue: 15, description: '石甲龍套裝·項鍊（星星 +18%）', dropTier: 3 },
  { id: 'boss_stone_wings', name: '岩翼', icon: '🪨', slot: 'wings', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 22, combatStat: 'atk', combatValue: 10, description: '石甲龍套裝·翅膀（星星 +22%）', dropTier: 3 },
  { id: 'boss_stone_weapon', name: '碎岩巨錘', icon: '🔨', slot: 'weapon', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 25, combatStat: 'atk', combatValue: 18, description: '石甲龍套裝·武器（經驗 +25%）', dropTier: 3 },
  // T4 烈焰鳳凰套裝 (flame_phoenix, legendary, stage 3)
  { id: 'boss_flame_hat', name: '鳳凰火冠', icon: '🔥', slot: 'hat', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 28, combatStat: 'hp', combatValue: 30, description: '烈焰鳳凰套裝·帽子（星星 +28%）', dropTier: 4 },
  { id: 'boss_flame_neck', name: '鳳凰心焰', icon: '❤️‍🔥', slot: 'necklace', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 30, combatStat: 'def', combatValue: 20, description: '烈焰鳳凰套裝·項鍊（經驗 +30%）', dropTier: 4 },
  { id: 'boss_flame_wings', name: '涅槃之翼', icon: '🦅', slot: 'wings', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 32, combatStat: 'atk', combatValue: 15, description: '烈焰鳳凰套裝·翅膀（經驗 +32%）', dropTier: 4 },
  { id: 'boss_flame_weapon', name: '焰滅神弓', icon: '🏹', slot: 'weapon', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 35, combatStat: 'atk', combatValue: 25, description: '烈焰鳳凰套裝·武器（星星 +35%）', dropTier: 4 },
  // T5 虛空魔神套裝 (void_demon, legendary, stage 4)
  { id: 'boss_void_hat', name: '虛空魔冠', icon: '👿', slot: 'hat', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 35, combatStat: 'hp', combatValue: 45, description: '虛空魔神套裝·帽子（星星 +35%）', dropTier: 5 },
  { id: 'boss_void_neck', name: '深淵之心', icon: '🖤', slot: 'necklace', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 38, combatStat: 'def', combatValue: 30, description: '虛空魔神套裝·項鍊（經驗 +38%）', dropTier: 5 },
  { id: 'boss_void_wings', name: '虛空裂翼', icon: '🦇', slot: 'wings', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 40, combatStat: 'atk', combatValue: 25, description: '虛空魔神套裝·翅膀（星星 +40%）', dropTier: 5 },
  { id: 'boss_void_weapon', name: '終焉之刃', icon: '⚔️', slot: 'weapon', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 45, combatStat: 'atk', combatValue: 40, description: '虛空魔神套裝·武器（經驗 +45%）', dropTier: 5 },
];

// ===== Boss 套裝效果（5 套，全用已實作 effect） =====
export const HERO_SET_BONUSES = {
  shadow_wolf: {
    name: '暗影狼套裝',
    icon: '🐺',
    bonuses: [
      { count: 2, effect: 'stars_10', description: '額外星星 +10%' },
      { count: 3, effect: 'exp_10', description: '額外經驗 +10%' },
      { count: 4, effect: 'correct_stars_2', description: '答對時 +2 額外星星' },
    ],
  },
  venom_snake: {
    name: '毒霧蛇套裝',
    icon: '🐍',
    bonuses: [
      { count: 2, effect: 'stars_15', description: '額外星星 +15%' },
      { count: 3, effect: 'pet_exp_20', description: '寵物經驗 +20%' },
      { count: 4, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
    ],
  },
  stone_dragon: {
    name: '石甲龍套裝',
    icon: '🐉',
    bonuses: [
      { count: 2, effect: 'bonus_stars_20', description: '測驗星星獎勵 +20%' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'combo_milestone_1_5', description: 'Combo 里程碑獎勵 x1.5' },
    ],
  },
  flame_phoenix: {
    name: '烈焰鳳凰套裝',
    icon: '🔥',
    bonuses: [
      { count: 2, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
      { count: 3, effect: 'all_stars_1_5', description: '所有星星加成 x1.5' },
      { count: 4, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
    ],
  },
  void_demon: {
    name: '虛空魔神套裝',
    icon: '👿',
    bonuses: [
      { count: 2, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
      { count: 3, effect: 'combo_milestone_1_5', description: 'Combo 里程碑獎勵 x1.5' },
      { count: 4, effect: 'all_stars_1_5', description: '所有星星加成 x1.5' },
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
  1: { itemRate: 0.30, itemCountMin: 1, itemCountMax: 2, equipRate: 0.15 },
  2: { itemRate: 0.40, itemCountMin: 1, itemCountMax: 3, equipRate: 0.10 },
  3: { itemRate: 0.50, itemCountMin: 2, itemCountMax: 4, equipRate: 0.05 },
  4: { itemRate: 0.65, itemCountMin: 2, itemCountMax: 5, equipRate: 0.05 },
  5: { itemRate: 0.80, itemCountMin: 3, itemCountMax: 5, equipRate: 0.015 },
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

// ===== Boss 數學題型配置（依層級解鎖） =====
export const BOSS_MATH_QUESTION_TYPES = {
  1: [0],           // Tier 1: 選擇題
  2: [0],           // Tier 2: 選擇題
  3: [0, 1],        // Tier 3: + 填答
  4: [0, 1],        // Tier 4: 選擇 + 填答
  5: [0, 1, 2],     // Tier 5: 全題型
};

// ===== Boss 數學出題策略：隨機選出 N 題 =====
export function selectBossMathProblems({ allProblems, count, tier }) {
  const allowedTypes = BOSS_MATH_QUESTION_TYPES[tier] || [0];
  const filtered = allProblems.filter(p => allowedTypes.includes(p.problemType));
  if (filtered.length === 0) return [];
  // 洗牌後取前 count 題
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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

// ===== 裝備戰鬥加成計算（Boss 戰鬥專用） =====
export function applyEquipCombatBonus(basePetStats, equipmentRecords, allEquipmentItems) {
  let hpBonus = 0, atkBonus = 0, defBonus = 0;
  for (const eq of equipmentRecords) {
    const itemDef = allEquipmentItems.find(e => e.id === eq.itemId);
    if (!itemDef || !itemDef.combatStat) continue;
    if (itemDef.combatStat === 'hp') hpBonus += itemDef.combatValue;
    if (itemDef.combatStat === 'atk') atkBonus += itemDef.combatValue;
    if (itemDef.combatStat === 'def') defBonus += itemDef.combatValue;
  }
  return {
    ...basePetStats,
    hp: basePetStats.hp + hpBonus,
    attack: basePetStats.attack + atkBonus,
    defense: basePetStats.defense + defBonus,
  };
}

// ===== Boss 元素克制倍率計算 =====
export function calculateBossTypeBonus(petTypes, bossWeakTo) {
  if (!bossWeakTo || bossWeakTo.length === 0) return 1.0;
  if (petTypes.some(t => bossWeakTo.includes(t))) return 1.3;
  return 1.0;
}

// ===== 隨機裝備（依層級 + 該套已擁有數量遞減） =====
export function rollRepeatEquipment(tier, ownedHeroIds = []) {
  const config = BOSS_BONUS_DROPS[tier] || BOSS_BONUS_DROPS[1];
  // 該層級可掉落的裝備池
  const pool = BOSS_EQUIPMENT.filter(e => e.dropTier === tier);
  // 排除已擁有的
  const available = pool.filter(e => !ownedHeroIds.includes(e.id));
  if (available.length === 0) return null;
  // 懲罰只看「該套已擁有件數」（pool 共 4 件，ownedInSet = 0~3）
  const ownedInSet = pool.length - available.length;
  const penalties = [1.0, 0.6, 0.3, 0.12];
  const penalty = penalties[Math.min(ownedInSet, 3)];
  if (Math.random() >= config.equipRate * penalty) return null;
  return available[Math.floor(Math.random() * available.length)].id;
}
