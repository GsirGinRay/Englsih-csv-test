export const BADGES = [
  // 學習類
  { id: 'first_quiz', name: '初心者', icon: '🌱', description: '完成第一次測驗', rarity: 'common', condition: { type: 'quiz_count', value: 1 } },
  { id: 'quiz_10', name: '小試身手', icon: '📝', description: '完成 10 次測驗', rarity: 'common', condition: { type: 'quiz_count', value: 10 } },
  { id: 'quiz_50', name: '勤學不倦', icon: '📚', description: '完成 50 次測驗', rarity: 'rare', condition: { type: 'quiz_count', value: 50 } },
  { id: 'quiz_100', name: '學海無涯', icon: '🎓', description: '完成 100 次測驗', rarity: 'epic', condition: { type: 'quiz_count', value: 100 } },
  // 精熟類
  { id: 'master_10', name: '初窺門徑', icon: '⭐', description: '精熟 10 個單字', rarity: 'common', condition: { type: 'mastered_count', value: 10 } },
  { id: 'master_50', name: '漸入佳境', icon: '🌟', description: '精熟 50 個單字', rarity: 'rare', condition: { type: 'mastered_count', value: 50 } },
  { id: 'master_100', name: '百詞達人', icon: '💫', description: '精熟 100 個單字', rarity: 'rare', condition: { type: 'mastered_count', value: 100 } },
  { id: 'master_500', name: '詞彙大師', icon: '👑', description: '精熟 500 個單字', rarity: 'epic', condition: { type: 'mastered_count', value: 500 } },
  { id: 'master_1000', name: '千詞王者', icon: '🏆', description: '精熟 1000 個單字', rarity: 'legendary', condition: { type: 'mastered_count', value: 1000 } },
  // 準確類
  { id: 'perfect_1', name: '神射手', icon: '🎯', description: '單次測驗 100% 正確', rarity: 'common', condition: { type: 'perfect_quiz', value: 1 } },
  { id: 'perfect_5', name: '穩定輸出', icon: '🔥', description: '5 次測驗 100% 正確', rarity: 'rare', condition: { type: 'perfect_quiz', value: 5 } },
  { id: 'perfect_10', name: '完美主義', icon: '💎', description: '10 次測驗 100% 正確', rarity: 'epic', condition: { type: 'perfect_quiz', value: 10 } },
  // 連續登入類
  { id: 'streak_3', name: '持之以恆', icon: '🔥', description: '連續登入 3 天', rarity: 'common', condition: { type: 'login_streak', value: 3 } },
  { id: 'streak_7', name: '一週達人', icon: '🗓️', description: '連續登入 7 天', rarity: 'rare', condition: { type: 'login_streak', value: 7 } },
  { id: 'streak_14', name: '堅持不懈', icon: '💪', description: '連續登入 14 天', rarity: 'rare', condition: { type: 'login_streak', value: 14 } },
  { id: 'streak_30', name: '鐵人意志', icon: '🏅', description: '連續登入 30 天', rarity: 'epic', condition: { type: 'login_streak', value: 30 } },
  // 星星類
  { id: 'stars_100', name: '小富翁', icon: '💰', description: '累積獲得 100 星星', rarity: 'common', condition: { type: 'total_stars', value: 100 } },
  { id: 'stars_500', name: '星星獵人', icon: '🌠', description: '累積獲得 500 星星', rarity: 'rare', condition: { type: 'total_stars', value: 500 } },
  { id: 'stars_1000', name: '星光璀璨', icon: '✨', description: '累積獲得 1000 星星', rarity: 'epic', condition: { type: 'total_stars', value: 1000 } },
];
