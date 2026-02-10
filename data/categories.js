export const QUIZ_CATEGORIES = {
  daily_life:     { key: 'daily_life',     name: '日常生活', emoji: '🏠', strongTypes: ['一般', '草', '妖精'],                weakTypes: ['鋼', '龍'] },
  nature_science: { key: 'nature_science', name: '自然科學', emoji: '🌍', strongTypes: ['草', '水', '蟲', '地面'],            weakTypes: ['鋼', '幽靈'] },
  tech_numbers:   { key: 'tech_numbers',   name: '科技數字', emoji: '💻', strongTypes: ['電', '鋼', '超能力'],                weakTypes: ['草', '蟲'] },
  sports_action:  { key: 'sports_action',  name: '運動動作', emoji: '⚽', strongTypes: ['格鬥', '飛行', '地面'],              weakTypes: ['超能力', '幽靈'] },
  arts_emotions:  { key: 'arts_emotions',  name: '藝術情感', emoji: '🎨', strongTypes: ['妖精', '超能力', '幽靈'],            weakTypes: ['岩石', '格鬥'] },
  adventure_geo:  { key: 'adventure_geo',  name: '冒險地理', emoji: '🗺️', strongTypes: ['飛行', '水', '龍', '岩石'],          weakTypes: ['蟲', '電'] },
  mythology:      { key: 'mythology',      name: '神話奇幻', emoji: '🐉', strongTypes: ['龍', '惡', '幽靈', '火'],            weakTypes: ['一般', '草'] },
  food_health:    { key: 'food_health',    name: '飲食健康', emoji: '🍎', strongTypes: ['火', '冰', '毒', '草'],              weakTypes: ['飛行', '龍'] },
};

// 計算寵物屬性與學科分類的加成倍率
export const calculateTypeBonus = (petTypes, category) => {
  if (!category || !QUIZ_CATEGORIES[category]) return 1.0;
  const { strongTypes, weakTypes } = QUIZ_CATEGORIES[category];
  if (petTypes.some(t => strongTypes.includes(t))) return 1.3;
  if (petTypes.some(t => weakTypes.includes(t))) return 0.7;
  return 1.0;
};
