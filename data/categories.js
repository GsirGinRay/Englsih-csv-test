// 星期元素怪物系統 — 每天對應一個元素怪物
export const DAY_ELEMENTS = {
  mon: { key: 'mon', day: 1, element: '火焰', monster: '烈焰獸', emoji: '🔥', strongTypes: ['水', '岩石', '地面'],              weakTypes: ['草', '蟲', '鋼'] },
  tue: { key: 'tue', day: 2, element: '海洋', monster: '深海蛇', emoji: '💧', strongTypes: ['電', '草', '毒'],                weakTypes: ['火', '鋼', '冰'] },
  wed: { key: 'wed', day: 3, element: '森林', monster: '樹靈',   emoji: '🌿', strongTypes: ['火', '冰', '飛行', '蟲'],        weakTypes: ['水', '電', '地面'] },
  thu: { key: 'thu', day: 4, element: '雷電', monster: '雷霆虎', emoji: '⚡', strongTypes: ['地面', '岩石', '龍', '惡'],       weakTypes: ['飛行', '鋼', '電'] },
  fri: { key: 'fri', day: 5, element: '冰霜', monster: '冰霜龍', emoji: '❄️', strongTypes: ['火', '格鬥', '岩石', '鋼'],       weakTypes: ['冰', '超能力', '妖精'] },
  sat: { key: 'sat', day: 6, element: '大地', monster: '巨岩魔', emoji: '🪨', strongTypes: ['水', '草', '格鬥', '超能力'],     weakTypes: ['火', '飛行', '毒'] },
  sun: { key: 'sun', day: 0, element: '龍族', monster: '遠古龍王', emoji: '🐉', strongTypes: ['冰', '妖精', '幽靈', '惡'],     weakTypes: ['火', '水', '草', '電'] },
};

// 向後相容 alias
export const QUIZ_CATEGORIES = DAY_ELEMENTS;

// 根據日期取得對應元素 key（星期日=0, 星期一=1, ...）
const DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const getElementByDate = (date = new Date()) => {
  return DAY_TO_KEY[date.getDay()];
};

// 計算寵物屬性與元素怪物的加成倍率
export const calculateTypeBonus = (petTypes, category) => {
  if (!category || !DAY_ELEMENTS[category]) return 1.0;
  const { strongTypes, weakTypes } = DAY_ELEMENTS[category];
  if (petTypes.some(t => strongTypes.includes(t))) return 1.3;
  if (petTypes.some(t => weakTypes.includes(t))) return 0.7;
  return 1.0;
};
