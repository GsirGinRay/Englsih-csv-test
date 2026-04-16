// ===== Boss 挑戰系統定義 =====

export const BOSS_TIERS = [
  {
    tier: 1,
    name: '暗影狼', icon: '🐺', requiredLevel: 10,
    hp: 750, attack: 30, questionCount: 15,
    element: '惡', weakTo: ['格鬥', '蟲', '妖精'],
    firstClearReward: { stars: 500, chest: 'silver', title: 'boss_slayer_1', equipGuaranteed: true },
    repeatReward: { starsMin: 200, starsMax: 300 },
  },
  {
    tier: 2,
    name: '暗影蝙蝠', icon: '🦇', requiredLevel: 15,
    hp: 1100, attack: 37, questionCount: 16,
    element: '惡', weakTo: ['格鬥', '蟲'],
    firstClearReward: { stars: 200, chest: 'bronze', equipGuaranteed: true },
    repeatReward: { starsMin: 210, starsMax: 320 },
  },
  {
    tier: 3,
    name: '暗夜蜘蛛', icon: '🕷️', requiredLevel: 20,
    hp: 1450, attack: 43, questionCount: 17,
    element: '蟲', weakTo: ['火', '飛行', '岩石'],
    firstClearReward: { stars: 350, chest: 'bronze', equipGuaranteed: true },
    repeatReward: { starsMin: 230, starsMax: 350 },
  },
  {
    tier: 4,
    name: '毒霧蛇', icon: '🐍', requiredLevel: 25,
    hp: 1800, attack: 50, questionCount: 18,
    element: '毒', weakTo: ['地面', '超能力'],
    firstClearReward: { stars: 800, chest: 'gold', title: 'boss_slayer_2', equipGuaranteed: true },
    repeatReward: { starsMin: 250, starsMax: 400 },
  },
  {
    tier: 5,
    name: '沼澤蟾蜍', icon: '🐸', requiredLevel: 30,
    hp: 2300, attack: 60, questionCount: 19,
    element: '毒', weakTo: ['地面', '超能力'],
    firstClearReward: { stars: 400, chest: 'silver', equipGuaranteed: true },
    repeatReward: { starsMin: 260, starsMax: 430 },
  },
  {
    tier: 6,
    name: '岩石巨人', icon: '🗿', requiredLevel: 35,
    hp: 2800, attack: 70, questionCount: 20,
    element: '岩石', weakTo: ['水', '草', '格鬥', '鋼'],
    firstClearReward: { stars: 600, chest: 'silver', equipGuaranteed: true },
    repeatReward: { starsMin: 280, starsMax: 460 },
  },
  {
    tier: 7,
    name: '石甲龍', icon: '🦎', requiredLevel: 40,
    hp: 3300, attack: 80, questionCount: 22,
    element: '龍', weakTo: ['冰', '龍', '妖精'],
    firstClearReward: { stars: 1200, chest: 'gold', title: 'boss_slayer_3', equipGuaranteed: true },
    repeatReward: { starsMin: 300, starsMax: 500 },
  },
  {
    tier: 8,
    name: '冰晶翼龍', icon: '🐲', requiredLevel: 45,
    hp: 3725, attack: 88, questionCount: 23,
    element: '冰', weakTo: ['火', '格鬥', '岩石', '鋼'],
    firstClearReward: { stars: 600, chest: 'silver', equipGuaranteed: true },
    repeatReward: { starsMin: 320, starsMax: 520 },
  },
  {
    tier: 9,
    name: '雷霆鷹', icon: '🦅', requiredLevel: 50,
    hp: 4150, attack: 95, questionCount: 23,
    element: '電', weakTo: ['地面'],
    firstClearReward: { stars: 700, chest: 'gold', equipGuaranteed: true },
    repeatReward: { starsMin: 340, starsMax: 550 },
  },
  {
    tier: 10,
    name: '熔岩蜥蜴', icon: '🦎', requiredLevel: 55,
    hp: 4575, attack: 103, questionCount: 24,
    element: '火', weakTo: ['水', '地面', '岩石'],
    firstClearReward: { stars: 900, chest: 'gold', equipGuaranteed: true },
    repeatReward: { starsMin: 360, starsMax: 570 },
  },
  {
    tier: 11,
    name: '烈焰鳳凰', icon: '🔥', requiredLevel: 60,
    hp: 5000, attack: 110, questionCount: 25,
    element: '火', weakTo: ['水', '岩石'],
    firstClearReward: { stars: 1800, chest: 'diamond', title: 'boss_slayer_4', equipGuaranteed: true },
    repeatReward: { starsMin: 400, starsMax: 600 },
  },
  {
    tier: 12,
    name: '幽魂騎士', icon: '⚔️', requiredLevel: 65,
    hp: 5500, attack: 120, questionCount: 26,
    element: '鋼', weakTo: ['火', '格鬥', '地面'],
    firstClearReward: { stars: 900, chest: 'gold', equipGuaranteed: true },
    repeatReward: { starsMin: 420, starsMax: 650 },
  },
  {
    tier: 13,
    name: '深淵水母', icon: '🪼', requiredLevel: 70,
    hp: 6000, attack: 130, questionCount: 26,
    element: '水', weakTo: ['電', '草'],
    firstClearReward: { stars: 1200, chest: 'gold', equipGuaranteed: true },
    repeatReward: { starsMin: 450, starsMax: 700 },
  },
  {
    tier: 14,
    name: '混沌魔獸', icon: '🐙', requiredLevel: 75,
    hp: 6500, attack: 140, questionCount: 27,
    element: '超能力', weakTo: ['蟲', '幽靈', '惡'],
    firstClearReward: { stars: 1500, chest: 'diamond', equipGuaranteed: true },
    repeatReward: { starsMin: 480, starsMax: 750 },
  },
  {
    tier: 15,
    name: '虛空魔神', icon: '👿', requiredLevel: 80,
    hp: 7000, attack: 150, questionCount: 28,
    element: '幽靈', weakTo: ['妖精'],
    firstClearReward: { stars: 3000, chest: 'diamond', title: 'boss_slayer_5', equipGuaranteed: true },
    repeatReward: { starsMin: 500, starsMax: 800 },
  },
];

// ===== Boss 套裝裝備（15 套 x 4 件 = 60 件，tier === dropTier 1:1 對應） =====
export const BOSS_EQUIPMENT = [
  // T1 暗影狼套裝 (shadow_wolf, rare, stage 2)
  { id: 'boss_shadow_hat', name: '暗影狼冠', icon: '🌑', slot: 'hat', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 15, combatStat: 'hp', combatValue: 8, description: '暗影狼套裝·帽子（經驗 +15%）', dropTier: 1 },
  { id: 'boss_shadow_neck', name: '狼牙項鍊', icon: '🐺', slot: 'necklace', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 16, combatStat: 'def', combatValue: 5, description: '暗影狼套裝·項鍊（經驗 +16%）', dropTier: 1 },
  { id: 'boss_shadow_wings', name: '夜影披風', icon: '🌙', slot: 'wings', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 18, combatStat: 'atk', combatValue: 3, description: '暗影狼套裝·翅膀（經驗 +18%）', dropTier: 1 },
  { id: 'boss_shadow_weapon', name: '月光爪刃', icon: '🔪', slot: 'weapon', category: 'set', setId: 'shadow_wolf', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 12, combatStat: 'atk', combatValue: 8, description: '暗影狼套裝·武器（星星 +12%）', dropTier: 1 },
  // T2 暗影蝙蝠套裝 (night_bat, rare, stage 2)
  { id: 'boss_bat_hat', name: '蝙蝠耳冠', icon: '🦇', slot: 'hat', category: 'set', setId: 'night_bat', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 17, combatStat: 'hp', combatValue: 4, description: '暗影蝙蝠套裝·帽子（經驗 +17%）', dropTier: 2 },
  { id: 'boss_bat_neck', name: '暗夜吊墜', icon: '🌑', slot: 'necklace', category: 'set', setId: 'night_bat', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 18, combatStat: 'def', combatValue: 5, description: '暗影蝙蝠套裝·項鍊（經驗 +18%）', dropTier: 2 },
  { id: 'boss_bat_wings', name: '蝠翼斗篷', icon: '🌙', slot: 'wings', category: 'set', setId: 'night_bat', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 20, combatStat: 'atk', combatValue: 7, description: '暗影蝙蝠套裝·翅膀（經驗 +20%）', dropTier: 2 },
  { id: 'boss_bat_weapon', name: '超音波刃', icon: '🔊', slot: 'weapon', category: 'set', setId: 'night_bat', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 13, combatStat: 'atk', combatValue: 9, description: '暗影蝙蝠套裝·武器（星星 +13%）', dropTier: 2 },
  // T3 暗夜蜘蛛套裝 (dark_spider, rare, stage 2)
  { id: 'boss_spider_hat', name: '蛛絲頭冠', icon: '🕸️', slot: 'hat', category: 'set', setId: 'dark_spider', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 19, combatStat: 'hp', combatValue: 5, description: '暗夜蜘蛛套裝·帽子（經驗 +19%）', dropTier: 3 },
  { id: 'boss_spider_neck', name: '毒蛛墜飾', icon: '🕷️', slot: 'necklace', category: 'set', setId: 'dark_spider', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 20, combatStat: 'def', combatValue: 6, description: '暗夜蜘蛛套裝·項鍊（經驗 +20%）', dropTier: 3 },
  { id: 'boss_spider_wings', name: '蛛網披風', icon: '🕸️', slot: 'wings', category: 'set', setId: 'dark_spider', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 14, combatStat: 'atk', combatValue: 8, description: '暗夜蜘蛛套裝·翅膀（星星 +14%）', dropTier: 3 },
  { id: 'boss_spider_weapon', name: '毒牙匕首', icon: '🗡️', slot: 'weapon', category: 'set', setId: 'dark_spider', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 22, combatStat: 'atk', combatValue: 10, description: '暗夜蜘蛛套裝·武器（經驗 +22%）', dropTier: 3 },
  // T4 毒霧蛇套裝 (venom_snake, rare, stage 2)
  { id: 'boss_venom_hat', name: '毒蛇面冠', icon: '🐍', slot: 'hat', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 21, combatStat: 'hp', combatValue: 12, description: '毒霧蛇套裝·帽子（經驗 +21%）', dropTier: 4 },
  { id: 'boss_venom_neck', name: '蛇鱗護符', icon: '🧿', slot: 'necklace', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 22, combatStat: 'def', combatValue: 8, description: '毒霧蛇套裝·項鍊（經驗 +22%）', dropTier: 4 },
  { id: 'boss_venom_wings', name: '毒霧斗篷', icon: '💨', slot: 'wings', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 15, combatStat: 'atk', combatValue: 5, description: '毒霧蛇套裝·翅膀（星星 +15%）', dropTier: 4 },
  { id: 'boss_venom_weapon', name: '毒牙短劍', icon: '🗡️', slot: 'weapon', category: 'set', setId: 'venom_snake', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 24, combatStat: 'atk', combatValue: 12, description: '毒霧蛇套裝·武器（經驗 +24%）', dropTier: 4 },
  // T5 沼澤蟾蜍套裝 (swamp_toad, rare, stage 2)
  { id: 'boss_toad_hat', name: '蟾蜍王冠', icon: '🐸', slot: 'hat', category: 'set', setId: 'swamp_toad', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 23, combatStat: 'hp', combatValue: 6, description: '沼澤蟾蜍套裝·帽子（經驗 +23%）', dropTier: 5 },
  { id: 'boss_toad_neck', name: '沼澤護符', icon: '🍀', slot: 'necklace', category: 'set', setId: 'swamp_toad', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 24, combatStat: 'def', combatValue: 9, description: '沼澤蟾蜍套裝·項鍊（經驗 +24%）', dropTier: 5 },
  { id: 'boss_toad_wings', name: '毒沼斗篷', icon: '🌿', slot: 'wings', category: 'set', setId: 'swamp_toad', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 25, combatStat: 'atk', combatValue: 11, description: '沼澤蟾蜍套裝·翅膀（經驗 +25%）', dropTier: 5 },
  { id: 'boss_toad_weapon', name: '毒舌鞭', icon: '👅', slot: 'weapon', category: 'set', setId: 'swamp_toad', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 17, combatStat: 'atk', combatValue: 13, description: '沼澤蟾蜍套裝·武器（星星 +17%）', dropTier: 5 },
  // T6 岩石巨人套裝 (rock_giant, rare, stage 2)
  { id: 'boss_rock_hat', name: '巨岩頭盔', icon: '🗿', slot: 'hat', category: 'set', setId: 'rock_giant', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 25, combatStat: 'hp', combatValue: 8, description: '岩石巨人套裝·帽子（經驗 +25%）', dropTier: 6 },
  { id: 'boss_rock_neck', name: '岩心護符', icon: '💎', slot: 'necklace', category: 'set', setId: 'rock_giant', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 26, combatStat: 'def', combatValue: 11, description: '岩石巨人套裝·項鍊（經驗 +26%）', dropTier: 6 },
  { id: 'boss_rock_wings', name: '碎石披風', icon: '🪨', slot: 'wings', category: 'set', setId: 'rock_giant', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 20, combatStat: 'atk', combatValue: 13, description: '岩石巨人套裝·翅膀（星星 +20%）', dropTier: 6 },
  { id: 'boss_rock_weapon', name: '巨石戰錘', icon: '🔨', slot: 'weapon', category: 'set', setId: 'rock_giant', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 28, combatStat: 'atk', combatValue: 15, description: '岩石巨人套裝·武器（經驗 +28%）', dropTier: 6 },
  // T7 石甲龍套裝 (stone_dragon, legendary, stage 3)
  { id: 'boss_stone_hat', name: '龍角戰盔', icon: '🪖', slot: 'hat', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 36, combatStat: 'hp', combatValue: 20, description: '石甲龍套裝·帽子（經驗 +36%）', dropTier: 7 },
  { id: 'boss_stone_neck', name: '龍鱗護心鏡', icon: '🐉', slot: 'necklace', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 38, combatStat: 'def', combatValue: 15, description: '石甲龍套裝·項鍊（經驗 +38%）', dropTier: 7 },
  { id: 'boss_stone_wings', name: '岩翼', icon: '🪨', slot: 'wings', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 26, combatStat: 'atk', combatValue: 10, description: '石甲龍套裝·翅膀（星星 +26%）', dropTier: 7 },
  { id: 'boss_stone_weapon', name: '碎岩巨錘', icon: '🔨', slot: 'weapon', category: 'set', setId: 'stone_dragon', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 40, combatStat: 'atk', combatValue: 18, description: '石甲龍套裝·武器（經驗 +40%）', dropTier: 7 },
  // T8 冰晶翼龍套裝 (ice_wyvern, legendary, stage 3)
  { id: 'boss_ice_hat', name: '冰晶王冠', icon: '❄️', slot: 'hat', category: 'set', setId: 'ice_wyvern', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 38, combatStat: 'hp', combatValue: 12, description: '冰晶翼龍套裝·帽子（經驗 +38%）', dropTier: 8 },
  { id: 'boss_ice_neck', name: '霜龍之心', icon: '💠', slot: 'necklace', category: 'set', setId: 'ice_wyvern', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 40, combatStat: 'def', combatValue: 16, description: '冰晶翼龍套裝·項鍊（經驗 +40%）', dropTier: 8 },
  { id: 'boss_ice_wings', name: '冰霜之翼', icon: '🧊', slot: 'wings', category: 'set', setId: 'ice_wyvern', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 42, combatStat: 'atk', combatValue: 18, description: '冰晶翼龍套裝·翅膀（經驗 +42%）', dropTier: 8 },
  { id: 'boss_ice_weapon', name: '冰柱長槍', icon: '🔱', slot: 'weapon', category: 'set', setId: 'ice_wyvern', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 28, combatStat: 'atk', combatValue: 22, description: '冰晶翼龍套裝·武器（星星 +28%）', dropTier: 8 },
  // T9 雷霆鷹套裝 (thunder_eagle, legendary, stage 3)
  { id: 'boss_thunder_hat', name: '雷霆戰冠', icon: '⚡', slot: 'hat', category: 'set', setId: 'thunder_eagle', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 41, combatStat: 'hp', combatValue: 14, description: '雷霆鷹套裝·帽子（經驗 +41%）', dropTier: 9 },
  { id: 'boss_thunder_neck', name: '閃電項圈', icon: '🌩️', slot: 'necklace', category: 'set', setId: 'thunder_eagle', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 43, combatStat: 'def', combatValue: 18, description: '雷霆鷹套裝·項鍊（經驗 +43%）', dropTier: 9 },
  { id: 'boss_thunder_wings', name: '雷電之翼', icon: '🦅', slot: 'wings', category: 'set', setId: 'thunder_eagle', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 30, combatStat: 'atk', combatValue: 20, description: '雷霆鷹套裝·翅膀（星星 +30%）', dropTier: 9 },
  { id: 'boss_thunder_weapon', name: '閃電之爪', icon: '⚡', slot: 'weapon', category: 'set', setId: 'thunder_eagle', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 45, combatStat: 'atk', combatValue: 24, description: '雷霆鷹套裝·武器（經驗 +45%）', dropTier: 9 },
  // T10 熔岩蜥蜴套裝 (lava_lizard, legendary, stage 3)
  { id: 'boss_lava_hat', name: '熔岩角冠', icon: '🌋', slot: 'hat', category: 'set', setId: 'lava_lizard', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 43, combatStat: 'hp', combatValue: 16, description: '熔岩蜥蜴套裝·帽子（經驗 +43%）', dropTier: 10 },
  { id: 'boss_lava_neck', name: '岩漿之心', icon: '❤️‍🔥', slot: 'necklace', category: 'set', setId: 'lava_lizard', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 45, combatStat: 'def', combatValue: 20, description: '熔岩蜥蜴套裝·項鍊（經驗 +45%）', dropTier: 10 },
  { id: 'boss_lava_wings', name: '火焰披風', icon: '🔥', slot: 'wings', category: 'set', setId: 'lava_lizard', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 47, combatStat: 'atk', combatValue: 22, description: '熔岩蜥蜴套裝·翅膀（經驗 +47%）', dropTier: 10 },
  { id: 'boss_lava_weapon', name: '熔岩戰斧', icon: '🪓', slot: 'weapon', category: 'set', setId: 'lava_lizard', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 32, combatStat: 'atk', combatValue: 26, description: '熔岩蜥蜴套裝·武器（星星 +32%）', dropTier: 10 },
  // T11 烈焰鳳凰套裝 (flame_phoenix, legendary, stage 3)
  { id: 'boss_flame_hat', name: '鳳凰火冠', icon: '🔥', slot: 'hat', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 46, combatStat: 'hp', combatValue: 30, description: '烈焰鳳凰套裝·帽子（經驗 +46%）', dropTier: 11 },
  { id: 'boss_flame_neck', name: '鳳凰心焰', icon: '❤️‍🔥', slot: 'necklace', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 48, combatStat: 'def', combatValue: 20, description: '烈焰鳳凰套裝·項鍊（經驗 +48%）', dropTier: 11 },
  { id: 'boss_flame_wings', name: '涅槃之翼', icon: '🦅', slot: 'wings', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 50, combatStat: 'atk', combatValue: 15, description: '烈焰鳳凰套裝·翅膀（經驗 +50%）', dropTier: 11 },
  { id: 'boss_flame_weapon', name: '焰滅神弓', icon: '🏹', slot: 'weapon', category: 'set', setId: 'flame_phoenix', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 35, combatStat: 'atk', combatValue: 25, description: '烈焰鳳凰套裝·武器（星星 +35%）', dropTier: 11 },
  // T12 幽魂騎士套裝 (ghost_knight, legendary, stage 3)
  { id: 'boss_ghost_hat', name: '幽魂戰盔', icon: '👻', slot: 'hat', category: 'set', setId: 'ghost_knight', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 48, combatStat: 'hp', combatValue: 18, description: '幽魂騎士套裝·帽子（經驗 +48%）', dropTier: 12 },
  { id: 'boss_ghost_neck', name: '亡靈護符', icon: '💀', slot: 'necklace', category: 'set', setId: 'ghost_knight', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 50, combatStat: 'def', combatValue: 24, description: '幽魂騎士套裝·項鍊（經驗 +50%）', dropTier: 12 },
  { id: 'boss_ghost_wings', name: '幽魂披風', icon: '⚔️', slot: 'wings', category: 'set', setId: 'ghost_knight', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 52, combatStat: 'atk', combatValue: 28, description: '幽魂騎士套裝·翅膀（經驗 +52%）', dropTier: 12 },
  { id: 'boss_ghost_weapon', name: '靈魂戰劍', icon: '🗡️', slot: 'weapon', category: 'set', setId: 'ghost_knight', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 38, combatStat: 'atk', combatValue: 32, description: '幽魂騎士套裝·武器（星星 +38%）', dropTier: 12 },
  // T13 深淵水母套裝 (abyss_jelly, legendary, stage 3)
  { id: 'boss_abyss_hat', name: '深淵冠冕', icon: '🪼', slot: 'hat', category: 'set', setId: 'abyss_jelly', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 50, combatStat: 'hp', combatValue: 20, description: '深淵水母套裝·帽子（經驗 +50%）', dropTier: 13 },
  { id: 'boss_abyss_neck', name: '深海之淚', icon: '💧', slot: 'necklace', category: 'set', setId: 'abyss_jelly', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 52, combatStat: 'def', combatValue: 26, description: '深淵水母套裝·項鍊（經驗 +52%）', dropTier: 13 },
  { id: 'boss_abyss_wings', name: '水母觸手斗篷', icon: '🌊', slot: 'wings', category: 'set', setId: 'abyss_jelly', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 54, combatStat: 'atk', combatValue: 30, description: '深淵水母套裝·翅膀（經驗 +54%）', dropTier: 13 },
  { id: 'boss_abyss_weapon', name: '深淵毒刺', icon: '🔱', slot: 'weapon', category: 'set', setId: 'abyss_jelly', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 40, combatStat: 'atk', combatValue: 35, description: '深淵水母套裝·武器（星星 +40%）', dropTier: 13 },
  // T14 混沌魔獸套裝 (chaos_beast, legendary, stage 4)
  { id: 'boss_chaos_hat', name: '混沌之冠', icon: '🐙', slot: 'hat', category: 'set', setId: 'chaos_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 52, combatStat: 'hp', combatValue: 22, description: '混沌魔獸套裝·帽子（經驗 +52%）', dropTier: 14 },
  { id: 'boss_chaos_neck', name: '混沌核心', icon: '🌀', slot: 'necklace', category: 'set', setId: 'chaos_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 54, combatStat: 'def', combatValue: 28, description: '混沌魔獸套裝·項鍊（經驗 +54%）', dropTier: 14 },
  { id: 'boss_chaos_wings', name: '混沌之翼', icon: '🌑', slot: 'wings', category: 'set', setId: 'chaos_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 57, combatStat: 'atk', combatValue: 33, description: '混沌魔獸套裝·翅膀（經驗 +57%）', dropTier: 14 },
  { id: 'boss_chaos_weapon', name: '混沌觸手', icon: '🐙', slot: 'weapon', category: 'set', setId: 'chaos_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 42, combatStat: 'atk', combatValue: 38, description: '混沌魔獸套裝·武器（星星 +42%）', dropTier: 14 },
  // T15 虛空魔神套裝 (void_demon, legendary, stage 4)
  { id: 'boss_void_hat', name: '虛空魔冠', icon: '👿', slot: 'hat', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 55, combatStat: 'hp', combatValue: 45, description: '虛空魔神套裝·帽子（經驗 +55%）', dropTier: 15 },
  { id: 'boss_void_neck', name: '深淵之心', icon: '🖤', slot: 'necklace', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 57, combatStat: 'def', combatValue: 30, description: '虛空魔神套裝·項鍊（經驗 +57%）', dropTier: 15 },
  { id: 'boss_void_wings', name: '虛空裂翼', icon: '🦇', slot: 'wings', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 45, combatStat: 'atk', combatValue: 25, description: '虛空魔神套裝·翅膀（星星 +45%）', dropTier: 15 },
  { id: 'boss_void_weapon', name: '終焉之刃', icon: '⚔️', slot: 'weapon', category: 'set', setId: 'void_demon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 60, combatStat: 'atk', combatValue: 40, description: '虛空魔神套裝·武器（經驗 +60%）', dropTier: 15 },
];

// ===== Boss 套裝效果（15 套，全用已實作 effect） =====
export const HERO_SET_BONUSES = {
  shadow_wolf: {
    name: '暗影狼套裝',
    icon: '🐺',
    bonuses: [
      { count: 2, effect: 'exp_10', description: '額外經驗 +10%' },
      { count: 3, effect: 'pet_exp_15', description: '寵物經驗 +15%' },
      { count: 4, effect: 'correct_stars_2', description: '答對時 +2 額外星星' },
    ],
  },
  night_bat: {
    name: '暗影蝙蝠套裝',
    icon: '🦇',
    bonuses: [
      { count: 2, effect: 'exp_10', description: '額外經驗 +10%' },
      { count: 3, effect: 'pet_exp_15', description: '寵物經驗 +15%' },
      { count: 4, effect: 'correct_stars_2', description: '答對時 +2 額外星星' },
    ],
  },
  dark_spider: {
    name: '暗夜蜘蛛套裝',
    icon: '🕷️',
    bonuses: [
      { count: 2, effect: 'exp_15', description: '額外經驗 +15%' },
      { count: 3, effect: 'pet_exp_15', description: '寵物經驗 +15%' },
      { count: 4, effect: 'correct_stars_2', description: '答對時 +2 額外星星' },
    ],
  },
  venom_snake: {
    name: '毒霧蛇套裝',
    icon: '🐍',
    bonuses: [
      { count: 2, effect: 'exp_15', description: '額外經驗 +15%' },
      { count: 3, effect: 'pet_exp_20', description: '寵物經驗 +20%' },
      { count: 4, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
    ],
  },
  swamp_toad: {
    name: '沼澤蟾蜍套裝',
    icon: '🐸',
    bonuses: [
      { count: 2, effect: 'exp_15', description: '額外經驗 +15%' },
      { count: 3, effect: 'pet_exp_20', description: '寵物經驗 +20%' },
      { count: 4, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
    ],
  },
  rock_giant: {
    name: '岩石巨人套裝',
    icon: '🗿',
    bonuses: [
      { count: 2, effect: 'exp_15', description: '額外經驗 +15%' },
      { count: 3, effect: 'pet_exp_20', description: '寵物經驗 +20%' },
      { count: 4, effect: 'bonus_stars_20', description: '測驗星星獎勵 +20%' },
    ],
  },
  stone_dragon: {
    name: '石甲龍套裝',
    icon: '🐉',
    bonuses: [
      { count: 2, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'combo_milestone_1_5', description: 'Combo 里程碑獎勵 x1.5' },
    ],
  },
  ice_wyvern: {
    name: '冰晶翼龍套裝',
    icon: '🐲',
    bonuses: [
      { count: 2, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
    ],
  },
  thunder_eagle: {
    name: '雷霆鷹套裝',
    icon: '🦅',
    bonuses: [
      { count: 2, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'combo_milestone_1_5', description: 'Combo 里程碑獎勵 x1.5' },
    ],
  },
  lava_lizard: {
    name: '熔岩蜥蜴套裝',
    icon: '🦎',
    bonuses: [
      { count: 2, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
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
  ghost_knight: {
    name: '幽魂騎士套裝',
    icon: '⚔️',
    bonuses: [
      { count: 2, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 3, effect: 'pet_exp_30', description: '寵物經驗 +30%' },
      { count: 4, effect: 'combo_milestone_1_5', description: 'Combo 里程碑獎勵 x1.5' },
    ],
  },
  abyss_jelly: {
    name: '深淵水母套裝',
    icon: '🪼',
    bonuses: [
      { count: 2, effect: 'exp_20', description: '額外經驗 +20%' },
      { count: 3, effect: 'pet_exp_30', description: '寵物經驗 +30%' },
      { count: 4, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
    ],
  },
  chaos_beast: {
    name: '混沌魔獸套裝',
    icon: '🐙',
    bonuses: [
      { count: 2, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'all_stars_1_5', description: '所有星星加成 x1.5' },
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
  1: [0, 1],                    // T1-3: 基礎選擇題
  2: [0, 1],
  3: [0, 1],
  4: [0, 1, 7],                 // T4-5: + 例句選答案
  5: [0, 1, 7],
  6: [0, 1, 2, 7],              // T6-7: + 拼寫
  7: [0, 1, 2, 7],
  8: [0, 1, 2, 6, 7],           // T8-10: + 例句填空
  9: [0, 1, 2, 6, 7],
  10: [0, 1, 2, 6, 7],
  11: [0, 1, 2, 4, 6, 7],       // T11-13: + 聽選
  12: [0, 1, 2, 4, 6, 7],
  13: [0, 1, 2, 4, 6, 7],
  14: [0, 1, 2, 4, 5, 6, 7],    // T14-15: 全題型
  15: [0, 1, 2, 4, 5, 6, 7],
};

// ===== 重複通關寶箱掉落表（加權隨機） =====
export const BOSS_CHEST_DROP_TABLE = {
  1:  [{ type: 'bronze', weight: 50 }, { type: 'silver', weight: 35 }, { type: 'gold', weight: 12 }, { type: 'diamond', weight: 3 }],
  2:  [{ type: 'bronze', weight: 48 }, { type: 'silver', weight: 36 }, { type: 'gold', weight: 13 }, { type: 'diamond', weight: 3 }],
  3:  [{ type: 'bronze', weight: 45 }, { type: 'silver', weight: 37 }, { type: 'gold', weight: 14 }, { type: 'diamond', weight: 4 }],
  4:  [{ type: 'bronze', weight: 30 }, { type: 'silver', weight: 40 }, { type: 'gold', weight: 22 }, { type: 'diamond', weight: 8 }],
  5:  [{ type: 'bronze', weight: 25 }, { type: 'silver', weight: 40 }, { type: 'gold', weight: 25 }, { type: 'diamond', weight: 10 }],
  6:  [{ type: 'bronze', weight: 20 }, { type: 'silver', weight: 38 }, { type: 'gold', weight: 30 }, { type: 'diamond', weight: 12 }],
  7:  [{ type: 'bronze', weight: 10 }, { type: 'silver', weight: 35 }, { type: 'gold', weight: 38 }, { type: 'diamond', weight: 17 }],
  8:  [{ type: 'bronze', weight: 8 }, { type: 'silver', weight: 32 }, { type: 'gold', weight: 40 }, { type: 'diamond', weight: 20 }],
  9:  [{ type: 'bronze', weight: 7 }, { type: 'silver', weight: 28 }, { type: 'gold', weight: 42 }, { type: 'diamond', weight: 23 }],
  10: [{ type: 'bronze', weight: 6 }, { type: 'silver', weight: 25 }, { type: 'gold', weight: 43 }, { type: 'diamond', weight: 26 }],
  11: [{ type: 'bronze', weight: 5 }, { type: 'silver', weight: 20 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 30 }],
  12: [{ type: 'bronze', weight: 4 }, { type: 'silver', weight: 18 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 33 }],
  13: [{ type: 'bronze', weight: 3 }, { type: 'silver', weight: 15 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 37 }],
  14: [{ type: 'silver', weight: 12 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 43 }],
  15: [{ type: 'silver', weight: 10 }, { type: 'gold', weight: 45 }, { type: 'diamond', weight: 45 }],
};

// ===== 額外掉落配置 =====
export const BOSS_BONUS_DROPS = {
  1:  { itemRate: 0.30, itemCountMin: 1, itemCountMax: 2, equipRate: 0.15 },
  2:  { itemRate: 0.32, itemCountMin: 1, itemCountMax: 2, equipRate: 0.14 },
  3:  { itemRate: 0.35, itemCountMin: 1, itemCountMax: 2, equipRate: 0.12 },
  4:  { itemRate: 0.40, itemCountMin: 1, itemCountMax: 3, equipRate: 0.10 },
  5:  { itemRate: 0.43, itemCountMin: 1, itemCountMax: 3, equipRate: 0.09 },
  6:  { itemRate: 0.47, itemCountMin: 2, itemCountMax: 3, equipRate: 0.07 },
  7:  { itemRate: 0.50, itemCountMin: 2, itemCountMax: 4, equipRate: 0.05 },
  8:  { itemRate: 0.54, itemCountMin: 2, itemCountMax: 4, equipRate: 0.05 },
  9:  { itemRate: 0.57, itemCountMin: 2, itemCountMax: 4, equipRate: 0.05 },
  10: { itemRate: 0.61, itemCountMin: 2, itemCountMax: 5, equipRate: 0.05 },
  11: { itemRate: 0.65, itemCountMin: 2, itemCountMax: 5, equipRate: 0.05 },
  12: { itemRate: 0.69, itemCountMin: 2, itemCountMax: 5, equipRate: 0.04 },
  13: { itemRate: 0.73, itemCountMin: 3, itemCountMax: 5, equipRate: 0.03 },
  14: { itemRate: 0.76, itemCountMin: 3, itemCountMax: 5, equipRate: 0.02 },
  15: { itemRate: 0.80, itemCountMin: 3, itemCountMax: 5, equipRate: 0.015 },
};

// ===== 首殺保底道具數量 =====
export const BOSS_FIRST_CLEAR_ITEMS = { 1: 2, 2: 1, 3: 1, 4: 3, 5: 2, 6: 2, 7: 4, 8: 2, 9: 3, 10: 3, 11: 5, 12: 3, 13: 4, 14: 4, 15: 8 };

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
// 設計：BOSS EXP 應明顯 > 一般 / 自訂測驗，鼓勵挑戰（即使 T1 也要贏過 ×2 自訂）
export function calculateBossExpReward({ tier, correctCount, victory }) {
  const baseExp = correctCount * 30;                       // 15 → 30
  const tierMultiplier = 1 + (tier - 1) * (2.0 / 14);      // T1=1.0, T15=3.0
  const victoryBonus = victory ? 2.5 : 0.6;                // 2.2 → 2.5
  return Math.round(baseExp * tierMultiplier * victoryBonus);
}

// ===== Boss 數學題型配置（依層級解鎖） =====
export const BOSS_MATH_QUESTION_TYPES = {
  1: [0],           // T1-3: 選擇題
  2: [0],
  3: [0],
  4: [0],           // T4-5: 選擇題
  5: [0],
  6: [0, 1],        // T6-7: + 填答
  7: [0, 1],
  8: [0, 1],        // T8-10: 選擇 + 填答
  9: [0, 1],
  10: [0, 1],
  11: [0, 1, 2],    // T11-13: 全題型
  12: [0, 1, 2],
  13: [0, 1, 2],
  14: [0, 1, 2],    // T14-15: 全題型
  15: [0, 1, 2],
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

// ===== 隨機裝備（tier === dropTier 直接對應 + 該套已擁有數量遞減） =====
export function rollRepeatEquipment(tier, ownedHeroIds = []) {
  const config = BOSS_BONUS_DROPS[tier] || BOSS_BONUS_DROPS[1];
  // 該 tier 可掉落的裝備池（tier === dropTier）
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
