// ===== 通用裝備（星星購買） =====
export const COMMON_EQUIPMENT = [
  // 帽子 (hat)
  { id: 'hat_wizard', name: '魔法師帽', icon: '🎩', slot: 'hat', category: 'common', rarity: 'normal', requiredStage: 1, price: 200, bonusType: 'exp', bonusValue: 10, description: '經驗值 +10%' },
  { id: 'hat_crown', name: '王者之冠', icon: '👑', slot: 'hat', category: 'common', rarity: 'rare', requiredStage: 2, price: 500, bonusType: 'exp', bonusValue: 25, description: '經驗值 +25%' },
  { id: 'hat_halo', name: '天使光環', icon: '😇', slot: 'hat', category: 'common', rarity: 'legendary', requiredStage: 3, price: 1000, bonusType: 'exp', bonusValue: 50, description: '經驗值 +50%' },
  // 項鍊 (necklace)
  { id: 'neck_bell', name: '幸運鈴鐺', icon: '🔔', slot: 'necklace', category: 'common', rarity: 'normal', requiredStage: 1, price: 250, bonusType: 'exp', bonusValue: 10, description: '經驗值 +10%' },
  { id: 'neck_crystal', name: '水晶項鍊', icon: '💎', slot: 'necklace', category: 'common', rarity: 'rare', requiredStage: 2, price: 600, bonusType: 'exp', bonusValue: 20, description: '經驗值 +20%' },
  { id: 'neck_relic', name: '遠古聖物', icon: '🔮', slot: 'necklace', category: 'common', rarity: 'legendary', requiredStage: 3, price: 1500, bonusType: 'exp', bonusValue: 50, description: '經驗值 +50%' },
  // 翅膀 (wings)
  { id: 'wings_feather', name: '羽毛翅膀', icon: '🪶', slot: 'wings', category: 'common', rarity: 'normal', requiredStage: 1, price: 300, bonusType: 'exp', bonusValue: 15, description: '經驗值 +15%' },
  { id: 'wings_fairy', name: '精靈之翼', icon: '🧚', slot: 'wings', category: 'common', rarity: 'rare', requiredStage: 2, price: 700, bonusType: 'exp', bonusValue: 30, description: '經驗值 +30%' },
  { id: 'wings_dragon', name: '龍翼', icon: '🦋', slot: 'wings', category: 'common', rarity: 'legendary', requiredStage: 3, price: 1800, bonusType: 'exp', bonusValue: 60, description: '經驗值 +60%' },
  // 武器 (weapon)
  { id: 'weapon_wand', name: '魔杖', icon: '🪄', slot: 'weapon', category: 'common', rarity: 'normal', requiredStage: 1, price: 350, bonusType: 'exp', bonusValue: 20, description: '經驗值 +20%' },
  { id: 'weapon_sword', name: '聖劍', icon: '⚔️', slot: 'weapon', category: 'common', rarity: 'rare', requiredStage: 2, price: 800, bonusType: 'exp', bonusValue: 40, description: '經驗值 +40%' },
  { id: 'weapon_staff', name: '賢者之杖', icon: '🔱', slot: 'weapon', category: 'common', rarity: 'legendary', requiredStage: 3, price: 2000, bonusType: 'exp', bonusValue: 80, description: '經驗值 +80%' },
];

// ===== 套裝裝備（寶箱抽取） =====
// 守護者套裝 🛡️
// 2件: 每場自動獲得 1 次護盾（不消耗道具）
// 3件: 每場所有題目 +3 秒
// 4件: 額外星星 +10%
export const GUARDIAN_SET = [
  { id: 'set_guardian_hat', name: '守護者頭盔', icon: '⛑️', slot: 'hat', category: 'set', setId: 'guardian', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 5, description: '守護者套裝·帽子（星星 +5%）' },
  { id: 'set_guardian_neck', name: '守護者護符', icon: '📿', slot: 'necklace', category: 'set', setId: 'guardian', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 5, description: '守護者套裝·項鍊（星星 +5%）' },
  { id: 'set_guardian_wings', name: '守護者披風', icon: '🦸', slot: 'wings', category: 'set', setId: 'guardian', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 5, description: '守護者套裝·翅膀（經驗 +5%）' },
  { id: 'set_guardian_weapon', name: '守護者之盾', icon: '🛡️', slot: 'weapon', category: 'set', setId: 'guardian', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 5, description: '守護者套裝·武器（經驗 +5%）' },
];

// 學者套裝 📚
// 2件: 每場自動獲得 1 次提示（不消耗道具）
// 3件: 額外經驗 +10%
// 4件: 精熟升級連對次數要求 -1
export const SCHOLAR_SET = [
  { id: 'set_scholar_hat', name: '學者方帽', icon: '🎓', slot: 'hat', category: 'set', setId: 'scholar', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 5, description: '學者套裝·帽子（經驗 +5%）' },
  { id: 'set_scholar_neck', name: '智慧之鏈', icon: '🔗', slot: 'necklace', category: 'set', setId: 'scholar', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 5, description: '學者套裝·項鍊（經驗 +5%）' },
  { id: 'set_scholar_wings', name: '書頁之翼', icon: '📖', slot: 'wings', category: 'set', setId: 'scholar', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 5, description: '學者套裝·翅膀（經驗 +5%）' },
  { id: 'set_scholar_weapon', name: '羽毛筆', icon: '🪶', slot: 'weapon', category: 'set', setId: 'scholar', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'exp', bonusValue: 5, description: '學者套裝·武器（經驗 +5%）' },
];

// 幸運套裝 🍀
// 2件: 寶箱獎勵品質提升
// 3件: 每日登入額外 +3 星星
// 4件: 額外星星 +15%
export const LUCKY_SET = [
  { id: 'set_lucky_hat', name: '幸運帽', icon: '🍀', slot: 'hat', category: 'set', setId: 'lucky', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 5, description: '幸運套裝·帽子（星星 +5%）' },
  { id: 'set_lucky_neck', name: '四葉草項鍊', icon: '☘️', slot: 'necklace', category: 'set', setId: 'lucky', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 5, description: '幸運套裝·項鍊（星星 +5%）' },
  { id: 'set_lucky_wings', name: '彩虹翅膀', icon: '🌈', slot: 'wings', category: 'set', setId: 'lucky', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 5, description: '幸運套裝·翅膀（星星 +5%）' },
  { id: 'set_lucky_weapon', name: '幸運骰子', icon: '🎲', slot: 'weapon', category: 'set', setId: 'lucky', rarity: 'rare', requiredStage: 2, price: 0, bonusType: 'stars', bonusValue: 5, description: '幸運套裝·武器（星星 +5%）' },
];

export const SET_EQUIPMENT = [...GUARDIAN_SET, ...SCHOLAR_SET, ...LUCKY_SET];

// ===== 專屬裝備（寶箱抽取） =====
// 稀有寵物（7 隻，各 1 件）— 無套裝效果，僅單件加成
export const EXCLUSIVE_EQUIPMENT = [
  { id: 'excl_young_scale', name: '龍鱗護符', icon: '🐉', slot: 'necklace', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 20, description: '幼鱗專屬·星星 +20%', exclusiveSpecies: 'young_scale' },
  { id: 'excl_jellyfish', name: '深海之心', icon: '🫧', slot: 'necklace', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 20, description: '水母專屬·經驗 +20% + 餵食增強', exclusiveSpecies: 'jellyfish', specialEffect: 'feed_boost' },
  { id: 'excl_ore_giant', name: '礦石核心', icon: '⛏️', slot: 'weapon', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 15, description: '礦石巨人專屬·星星 +15%', exclusiveSpecies: 'ore_giant' },
  { id: 'excl_jungle_cub', name: '叢林牙爪', icon: '🐾', slot: 'weapon', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 25, description: '叢林幼獸專屬·經驗 +25%', exclusiveSpecies: 'jungle_cub' },
  { id: 'excl_snow_beast', name: '極光項圈', icon: '🌌', slot: 'necklace', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 15, description: '雪原獸專屬·星星 +15%', exclusiveSpecies: 'snow_beast' },
  { id: 'excl_circuit_fish', name: '電路晶片', icon: '💻', slot: 'hat', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'exp', bonusValue: 25, description: '電路魚專屬·經驗 +25%', exclusiveSpecies: 'circuit_fish' },
  { id: 'excl_clockwork_bird', name: '精密齒輪', icon: '⚙️', slot: 'wings', category: 'exclusive', rarity: 'legendary', requiredStage: 3, price: 0, bonusType: 'stars', bonusValue: 10, description: '發條鳥專屬·星星 +10% + 計時器 +5 秒', exclusiveSpecies: 'clockwork_bird', specialEffect: 'time_extend_5' },
  // 傳說寵物套裝（3 隻，各 4 件）
  // 天空幼龍套裝
  { id: 'excl_sky_dragon_hat', name: '天空之冠', icon: '☁️', slot: 'hat', category: 'exclusive', setId: 'sky_dragon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 30, description: '天空幼龍專屬·經驗 +30%', exclusiveSpecies: 'sky_dragon' },
  { id: 'excl_sky_dragon_neck', name: '龍焰項鍊', icon: '🔥', slot: 'necklace', category: 'exclusive', setId: 'sky_dragon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 20, description: '天空幼龍專屬·經驗 +20%', exclusiveSpecies: 'sky_dragon' },
  { id: 'excl_sky_dragon_wings', name: '烈風之翼', icon: '🌪️', slot: 'wings', category: 'exclusive', setId: 'sky_dragon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 20, description: '天空幼龍專屬·星星 +20%', exclusiveSpecies: 'sky_dragon' },
  { id: 'excl_sky_dragon_weapon', name: '炎龍之牙', icon: '🔥', slot: 'weapon', category: 'exclusive', setId: 'sky_dragon', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 30, description: '天空幼龍專屬·星星 +30%', exclusiveSpecies: 'sky_dragon' },
  // 水晶獸套裝
  { id: 'excl_crystal_beast_hat', name: '水晶皇冠', icon: '👑', slot: 'hat', category: 'exclusive', setId: 'crystal_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 15, description: '水晶獸專屬·星星 +15%', exclusiveSpecies: 'crystal_beast' },
  { id: 'excl_crystal_beast_neck', name: '水晶之心', icon: '💎', slot: 'necklace', category: 'exclusive', setId: 'crystal_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 25, description: '水晶獸專屬·星星 +25%', exclusiveSpecies: 'crystal_beast' },
  { id: 'excl_crystal_beast_wings', name: '水晶之翼', icon: '🦋', slot: 'wings', category: 'exclusive', setId: 'crystal_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 25, description: '水晶獸專屬·經驗 +25%', exclusiveSpecies: 'crystal_beast' },
  { id: 'excl_crystal_beast_weapon', name: '稜鏡之杖', icon: '🔱', slot: 'weapon', category: 'exclusive', setId: 'crystal_beast', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 20, description: '水晶獸專屬·經驗 +20%', exclusiveSpecies: 'crystal_beast' },
  // 星雲魚套裝
  { id: 'excl_nebula_fish_hat', name: '宇宙之眼', icon: '👁️', slot: 'hat', category: 'exclusive', setId: 'nebula_fish', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 20, description: '星雲魚專屬·星星 +20%', exclusiveSpecies: 'nebula_fish' },
  { id: 'excl_nebula_fish_neck', name: '星雲核心', icon: '🌠', slot: 'necklace', category: 'exclusive', setId: 'nebula_fish', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 35, description: '星雲魚專屬·經驗 +35%', exclusiveSpecies: 'nebula_fish' },
  { id: 'excl_nebula_fish_wings', name: '星塵之翼', icon: '✨', slot: 'wings', category: 'exclusive', setId: 'nebula_fish', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'stars', bonusValue: 15, description: '星雲魚專屬·星星 +15%', exclusiveSpecies: 'nebula_fish' },
  { id: 'excl_nebula_fish_weapon', name: '彗星之杖', icon: '☄️', slot: 'weapon', category: 'exclusive', setId: 'nebula_fish', rarity: 'legendary', requiredStage: 4, price: 0, bonusType: 'exp', bonusValue: 20, description: '星雲魚專屬·經驗 +20%', exclusiveSpecies: 'nebula_fish' },
];

// ===== 勇者裝備（Boss 限定） =====
import { BOSS_EQUIPMENT, HERO_SET_BONUSES } from './bosses.js';

// 所有裝備合集
export const EQUIPMENT_ITEMS = [...COMMON_EQUIPMENT, ...SET_EQUIPMENT, ...EXCLUSIVE_EQUIPMENT, ...BOSS_EQUIPMENT];

// ===== 套裝效果系統 =====
export const SET_BONUSES = {
  guardian: {
    name: '守護者套裝',
    icon: '🛡️',
    bonuses: [
      { count: 2, effect: 'auto_shield', description: '每場自動獲得 1 次護盾' },
      { count: 3, effect: 'time_extend_3', description: '每場所有題目 +3 秒' },
      { count: 4, effect: 'stars_10', description: '額外星星 +10%' },
    ],
  },
  scholar: {
    name: '學者套裝',
    icon: '📚',
    bonuses: [
      { count: 2, effect: 'auto_hint', description: '每場自動獲得 1 次提示' },
      { count: 3, effect: 'exp_10', description: '額外經驗 +10%' },
      { count: 4, effect: 'mastery_minus_1', description: '精熟升級連對次數 -1' },
    ],
  },
  lucky: {
    name: '幸運套裝',
    icon: '🍀',
    bonuses: [
      { count: 2, effect: 'chest_quality_up', description: '寶箱獎勵品質提升' },
      { count: 3, effect: 'login_stars_3', description: '每日登入額外 +3 星星' },
      { count: 4, effect: 'stars_15', description: '額外星星 +15%' },
    ],
  },
};

// ===== 專屬套裝效果系統 =====
export const EXCLUSIVE_SET_BONUSES = {
  sky_dragon: {
    name: '天空幼龍套裝',
    icon: '🐲',
    bonuses: [
      { count: 2, effect: 'correct_stars_2', description: '答對時 +2 額外星星' },
      { count: 3, effect: 'pet_exp_20', description: '寵物經驗 +20%' },
      { count: 4, effect: 'combo_milestone_1_5', description: 'Combo 里程碑獎勵 x1.5' },
    ],
  },
  crystal_beast: {
    name: '水晶獸套裝',
    icon: '💎',
    bonuses: [
      { count: 2, effect: 'correct_stars_3', description: '答對時 +3 額外星星' },
      { count: 3, effect: 'pet_exp_20', description: '寵物經驗 +20%' },
      { count: 4, effect: 'correct_stars_1_3', description: '答題正確星星 x1.3' },
    ],
  },
  nebula_fish: {
    name: '星雲魚套裝',
    icon: '🌌',
    bonuses: [
      { count: 2, effect: 'bonus_stars_20', description: '測驗星星獎勵 +20%' },
      { count: 3, effect: 'pet_exp_25', description: '寵物經驗 +25%' },
      { count: 4, effect: 'all_stars_1_5', description: '所有星星加成 x1.5' },
    ],
  },
};

// 計算寵物已裝備的套裝效果（含通用套裝和專屬套裝）
export const getActiveSetBonuses = (equippedItemIds) => {
  const setCounts = {};
  const allSetItems = [...SET_EQUIPMENT, ...EXCLUSIVE_EQUIPMENT];

  for (const itemId of equippedItemIds) {
    const item = allSetItems.find(e => e.id === itemId);
    if (item && item.setId) {
      setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
    }
  }

  const allBonuses = { ...SET_BONUSES, ...EXCLUSIVE_SET_BONUSES, ...HERO_SET_BONUSES };
  const activeEffects = [];
  for (const [setId, count] of Object.entries(setCounts)) {
    const setConfig = allBonuses[setId];
    if (!setConfig) continue;
    for (const bonus of setConfig.bonuses) {
      if (count >= bonus.count) {
        activeEffects.push({ setId, setName: setConfig.name, setIcon: setConfig.icon, ...bonus });
      }
    }
  }
  return activeEffects;
};
