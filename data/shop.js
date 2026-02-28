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
  { id: 'time_extend', name: '時間延長卡', icon: '⏰', description: '本題時間 +10 秒', price: 3, effect: 'extend_time' },
  { id: 'hint', name: '提示卡', icon: '💡', description: '顯示答案的第一個字母', price: 5, effect: 'show_hint' },
  { id: 'skip', name: '跳過卡', icon: '⏭️', description: '跳過本題，不計對錯', price: 8, effect: 'skip_question' },
  { id: 'double_star', name: '雙倍星星卡', icon: '✨', description: '本次測驗星星 ×2', price: 15, effect: 'double_stars' },
  { id: 'shield', name: '護盾卡', icon: '🛡️', description: '答錯一題不扣分', price: 5, effect: 'protect_wrong' },
];

// 寶箱商品定義（可重複購買）
export const CHEST_SHOP_ITEMS = [
  { id: 'chest_bronze', name: '銅寶箱', icon: '🥉', description: '包含隨機獎勵', chestType: 'bronze', price: 50 },
  { id: 'chest_silver', name: '銀寶箱', icon: '🥈', description: '更高機率獲得稀有獎勵', chestType: 'silver', price: 120 },
  { id: 'chest_gold', name: '金寶箱', icon: '🥇', description: '保底獲得稀有獎勵', chestType: 'gold', price: 250 },
  { id: 'chest_diamond', name: '鑽石寶箱', icon: '💎', description: '必得史詩或以上獎勵', chestType: 'diamond', price: 500 },
];
