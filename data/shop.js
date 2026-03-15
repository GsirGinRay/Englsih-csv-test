// 裝飾品定義（一次性購買）
export const SHOP_ITEMS = [
  // 頭像框
  { id: 'frame_fire', name: '火焰框', icon: '🔥', description: '燃燒吧！小宇宙', type: 'frame', price: 50, preview: 'fire' },
  { id: 'frame_ice', name: '冰晶框', icon: '❄️', description: '冷靜而優雅', type: 'frame', price: 50, preview: 'ice' },
  { id: 'frame_rainbow', name: '彩虹框', icon: '🌈', description: '七彩繽紛', type: 'frame', price: 100, preview: 'rainbow' },
  { id: 'frame_gold', name: '黃金框', icon: '👑', description: '閃閃發光', type: 'frame', price: 150, preview: 'gold' },
  { id: 'frame_diamond', name: '鑽石框', icon: '💎', description: '璀璨奪目', type: 'frame', price: 300, preview: 'diamond' },
];

// 消耗品道具定義
export const CONSUMABLE_ITEMS = [
  { id: 'time_extend', name: '時間延長卡', icon: '⏰', description: '本題時間 +10 秒', price: 2, effect: 'extend_time' },
  { id: 'hint', name: '提示卡', icon: '💡', description: '顯示答案的第一個字母', price: 3, effect: 'show_hint' },
  { id: 'skip', name: '跳過卡', icon: '⏭️', description: '跳過本題，不計對錯', price: 5, effect: 'skip_question' },
  { id: 'double_star', name: '雙倍星星卡', icon: '✨', description: '本次測驗星星 ×2（每張覆蓋 20 題）', price: 20, effect: 'double_stars' },
  { id: 'shield', name: '護盾卡', icon: '🛡️', description: '本次測驗答錯不影響準確率加成', price: 10, effect: 'protect_accuracy' },
  { id: 'double_exp', name: '雙倍經驗卡', icon: '📈', description: '本次測驗寵物經驗 ×2（每張覆蓋 20 題）', price: 12, effect: 'double_exp' },
];

// 寶箱商品定義（可重複購買）
export const CHEST_SHOP_ITEMS = [
  { id: 'chest_bronze', name: '銅寶箱', icon: '📦', description: '星星、道具、普通寵物蛋', chestType: 'bronze', price: 50 },
  { id: 'chest_silver', name: '銀寶箱', icon: '📦', description: '更多星星與道具、稀有貼紙', chestType: 'silver', price: 120 },
  { id: 'chest_gold', name: '金寶箱', icon: '📦', description: '大量星星、稀有寵物蛋、史詩稱號', chestType: 'gold', price: 250 },
  { id: 'chest_diamond', name: '鑽石寶箱', icon: '📦', description: '頂級獎勵：傳說寵物蛋、大量星星、神話稱號', chestType: 'diamond', price: 500 },
];
