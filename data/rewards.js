export const TITLES = [
  // 普通稱號
  { id: 'learner', name: '學習者', description: '開始學習之旅', rarity: 'common', color: '#6b7280', glow: false, condition: { type: 'quiz_count', value: 1 } },
  { id: 'bookworm', name: '小書蟲', description: '完成 10 次測驗', rarity: 'common', color: '#6b7280', glow: false, condition: { type: 'quiz_count', value: 10 } },
  { id: 'diligent', name: '勤奮小蜜蜂', description: '連續登入 3 天', rarity: 'common', color: '#6b7280', glow: false, condition: { type: 'login_streak', value: 3 } },
  // 稀有稱號
  { id: 'memory_master', name: '記憶高手', description: '精熟 50 個單字', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'mastered_count', value: 50 } },
  { id: 'speed_star', name: '速度之星', description: '完成 50 次測驗', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'quiz_count', value: 50 } },
  { id: 'persistent', name: '堅持不懈', description: '連續登入 7 天', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'login_streak', value: 7 } },
  { id: 'collector', name: '收藏家', description: '收集 20 張貼紙', rarity: 'rare', color: '#3b82f6', glow: false, condition: { type: 'sticker_count', value: 20 } },
  // 史詩稱號
  { id: 'word_hunter', name: '單字獵人', description: '精熟 200 個單字', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'mastered_count', value: 200 } },
  { id: 'genius', name: '小學霸', description: '完成 100 次測驗', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'quiz_count', value: 100 } },
  { id: 'iron_will', name: '鐵人意志', description: '連續登入 14 天', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'login_streak', value: 14 } },
  { id: 'treasure_hunter', name: '寶藏獵人', description: '開啟 30 個寶箱', rarity: 'epic', color: '#9333ea', glow: true, condition: { type: 'chest_opened', value: 30 } },
  // 傳說稱號
  { id: 'prodigy', name: '英語小天才', description: '精熟 500 個單字', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'mastered_count', value: 500 } },
  { id: 'super_scholar', name: '超級學霸', description: '獲得 1000 顆星星', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'total_stars', value: 1000 } },
  { id: 'marathon', name: '學習馬拉松', description: '連續登入 30 天', rarity: 'legendary', color: '#f59e0b', glow: true, condition: { type: 'login_streak', value: 30 } },
  // 神話稱號
  { id: 'legend', name: '傳說學神', description: '神秘的傳說稱號', rarity: 'mythic', color: '#ef4444', glow: true, condition: { type: 'special', value: 0 } },
  { id: 'chosen_one', name: '天選之人', description: '被命運選中的人', rarity: 'mythic', color: '#ef4444', glow: true, condition: { type: 'special', value: 0 } },
];

export const STICKER_SERIES = {
  animals: {
    name: '動物系列', icon: '🐾', rarity: 'common',
    stickers: [
      { id: 'animal_dog', name: '小狗', icon: '🐕' }, { id: 'animal_cat', name: '小貓', icon: '🐱' },
      { id: 'animal_rabbit', name: '小兔', icon: '🐰' }, { id: 'animal_bear', name: '小熊', icon: '🐻' },
      { id: 'animal_panda', name: '熊貓', icon: '🐼' }, { id: 'animal_fox', name: '狐狸', icon: '🦊' },
      { id: 'animal_lion', name: '獅子', icon: '🦁' }, { id: 'animal_tiger', name: '老虎', icon: '🐯' },
      { id: 'animal_elephant', name: '大象', icon: '🐘' }, { id: 'animal_monkey', name: '猴子', icon: '🐵' },
      { id: 'animal_penguin', name: '企鵝', icon: '🐧' }, { id: 'animal_koala', name: '無尾熊', icon: '🐨' },
    ]
  },
  space: {
    name: '太空系列', icon: '🚀', rarity: 'common',
    stickers: [
      { id: 'space_rocket', name: '火箭', icon: '🚀' }, { id: 'space_moon', name: '月球', icon: '🌙' },
      { id: 'space_star', name: '星星', icon: '⭐' }, { id: 'space_sun', name: '太陽', icon: '☀️' },
      { id: 'space_earth', name: '地球', icon: '🌍' }, { id: 'space_saturn', name: '土星', icon: '🪐' },
      { id: 'space_alien', name: '外星人', icon: '👽' }, { id: 'space_ufo', name: '幽浮', icon: '🛸' },
      { id: 'space_astronaut', name: '太空人', icon: '👨‍🚀' }, { id: 'space_meteor', name: '流星', icon: '☄️' },
      { id: 'space_galaxy', name: '銀河', icon: '🌌' }, { id: 'space_telescope', name: '望遠鏡', icon: '🔭' },
    ]
  },
  food: {
    name: '美食系列', icon: '🍔', rarity: 'common',
    stickers: [
      { id: 'food_burger', name: '漢堡', icon: '🍔' }, { id: 'food_pizza', name: '披薩', icon: '🍕' },
      { id: 'food_icecream', name: '冰淇淋', icon: '🍦' }, { id: 'food_cake', name: '蛋糕', icon: '🎂' },
      { id: 'food_donut', name: '甜甜圈', icon: '🍩' }, { id: 'food_cookie', name: '餅乾', icon: '🍪' },
      { id: 'food_fries', name: '薯條', icon: '🍟' }, { id: 'food_hotdog', name: '熱狗', icon: '🌭' },
      { id: 'food_sushi', name: '壽司', icon: '🍣' }, { id: 'food_ramen', name: '拉麵', icon: '🍜' },
      { id: 'food_candy', name: '糖果', icon: '🍬' }, { id: 'food_chocolate', name: '巧克力', icon: '🍫' },
    ]
  },
  dinosaurs: {
    name: '恐龍系列', icon: '🦕', rarity: 'rare',
    stickers: [
      { id: 'dino_trex', name: '暴龍', icon: '🦖' }, { id: 'dino_bronto', name: '雷龍', icon: '🦕' },
      { id: 'dino_tricera', name: '三角龍', icon: '🦏' }, { id: 'dino_pterano', name: '翼龍', icon: '🦅' },
      { id: 'dino_stego', name: '劍龍', icon: '🦔' }, { id: 'dino_raptor', name: '迅猛龍', icon: '🦎' },
      { id: 'dino_ankylo', name: '甲龍', icon: '🐢' }, { id: 'dino_spino', name: '棘龍', icon: '🐊' },
      { id: 'dino_egg', name: '恐龍蛋', icon: '🥚' }, { id: 'dino_fossil', name: '化石', icon: '🦴' },
      { id: 'dino_footprint', name: '腳印', icon: '🐾' }, { id: 'dino_volcano', name: '火山', icon: '🌋' },
    ]
  },
  mythology: {
    name: '神話系列', icon: '🐉', rarity: 'legendary',
    stickers: [
      { id: 'myth_dragon', name: '神龍', icon: '🐉' }, { id: 'myth_phoenix', name: '鳳凰', icon: '🔥' },
      { id: 'myth_unicorn', name: '獨角獸', icon: '🦄' }, { id: 'myth_mermaid', name: '美人魚', icon: '🧜‍♀️' },
      { id: 'myth_fairy', name: '精靈', icon: '🧚' }, { id: 'myth_wizard', name: '巫師', icon: '🧙' },
      { id: 'myth_crown', name: '王冠', icon: '👑' }, { id: 'myth_crystal', name: '魔法水晶', icon: '🔮' },
      { id: 'myth_sword', name: '神劍', icon: '⚔️' }, { id: 'myth_shield', name: '盾牌', icon: '🛡️' },
      { id: 'myth_potion', name: '魔藥', icon: '🧪' }, { id: 'myth_castle', name: '城堡', icon: '🏰' },
    ]
  }
};

export const CHEST_CONFIG = {
  bronze: {
    name: '銅寶箱', color: '#cd7f32',
    rewards: [
      { type: 'stars', min: 15, max: 40, weight: 25 },
      { type: 'consumable', count: 3, weight: 20 },
      { type: 'sticker', rarity: 'common', weight: 15 },
      { type: 'stars', min: 60, max: 120, weight: 15 },
      { type: 'sticker', rarity: 'rare', weight: 10 },
      { type: 'pet_egg', rarity: 'normal', weight: 10 },
      { type: 'consumable', count: 5, weight: 5 }
    ]
  },
  silver: {
    name: '銀寶箱', color: '#c0c0c0',
    rewards: [
      { type: 'stars', min: 50, max: 100, weight: 17 },
      { type: 'consumable', count: 5, weight: 14 },
      { type: 'sticker', rarity: 'rare', weight: 14 },
      { type: 'pet_egg', rarity: 'normal', weight: 11 },
      { type: 'stars', min: 150, max: 250, weight: 11 },
      { type: 'sticker', rarity: 'legendary', weight: 9 },
      { type: 'pet_egg', rarity: 'rare', weight: 6 },
      { type: 'consumable', count: 8, weight: 5 },
      { type: 'consumable', count: 10, weight: 5 },
      { type: 'set_equipment', weight: 8 }
    ]
  },
  gold: {
    name: '金寶箱', color: '#ffd700',
    rewards: [
      { type: 'stars', min: 120, max: 220, weight: 15 },
      { type: 'pet_egg', rarity: 'rare', weight: 13 },
      { type: 'sticker', rarity: 'legendary', weight: 12 },
      { type: 'consumable', count: 8, weight: 10 },
      { type: 'stars', min: 350, max: 600, weight: 10 },
      { type: 'equipment', rarity: 'normal', weight: 5 },
      { type: 'equipment', rarity: 'rare', weight: 5 },
      { type: 'pet_egg', rarity: 'normal', weight: 5 },
      { type: 'consumable', count: 12, weight: 5 },
      { type: 'pet_egg', rarity: 'legendary', weight: 5 },
      { type: 'set_equipment', weight: 12 },
      { type: 'exclusive_equipment', weight: 3 }
    ]
  },
  diamond: {
    name: '鑽石寶箱', color: '#b9f2ff',
    rewards: [
      { type: 'stars', min: 300, max: 500, weight: 13 },
      { type: 'pet_egg', rarity: 'rare', weight: 10 },
      { type: 'sticker', rarity: 'legendary', weight: 8 },
      { type: 'equipment', rarity: 'rare', weight: 8 },
      { type: 'pet_egg', rarity: 'legendary', weight: 10 },
      { type: 'stars', min: 600, max: 1000, weight: 8 },
      { type: 'consumable', count: 15, weight: 6 },
      { type: 'equipment', rarity: 'legendary', weight: 5 },
      { type: 'stars', min: 1000, max: 1500, weight: 5 },
      { type: 'set_equipment', weight: 12 },
      { type: 'exclusive_equipment', weight: 10 }
    ]
  }
};

export const WHEEL_REWARDS = [
  { id: 'stars_5', name: '5 星星', icon: '⭐', type: 'stars', value: 5, weight: 25 },
  { id: 'stars_10', name: '10 星星', icon: '🌟', type: 'stars', value: 10, weight: 20 },
  { id: 'stars_20', name: '20 星星', icon: '✨', type: 'stars', value: 20, weight: 15 },
  { id: 'stars_50', name: '50 星星', icon: '💫', type: 'stars', value: 50, weight: 5 },
  { id: 'chest_bronze', name: '銅寶箱', icon: '📦', type: 'chest', value: 'bronze', weight: 15 },
  { id: 'chest_silver', name: '銀寶箱', icon: '🎁', type: 'chest', value: 'silver', weight: 10 },
  { id: 'chest_gold', name: '金寶箱', icon: '🏆', type: 'chest', value: 'gold', weight: 5 },
  { id: 'sticker_random', name: '隨機貼紙', icon: '🎨', type: 'sticker', value: 'random', weight: 5 },
];

// 依權重隨機選擇
export const weightedRandom = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
};

// 取得所有貼紙的扁平清單
export const getAllStickers = () => {
  const stickers = [];
  for (const [seriesId, series] of Object.entries(STICKER_SERIES)) {
    for (const sticker of series.stickers) {
      stickers.push({ ...sticker, seriesId, seriesName: series.name, rarity: series.rarity });
    }
  }
  return stickers;
};

// 隨機取得指定稀有度的貼紙
export const getRandomSticker = (rarity) => {
  const allStickers = getAllStickers();
  const filteredStickers = rarity ? allStickers.filter(s => s.rarity === rarity) : allStickers;
  if (filteredStickers.length === 0) return allStickers[Math.floor(Math.random() * allStickers.length)];
  return filteredStickers[Math.floor(Math.random() * filteredStickers.length)];
};
