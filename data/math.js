// 數學題型
export const MATH_PROBLEM_TYPES = {
  0: { name: '選擇題', icon: '🔢' },
  1: { name: '填答題', icon: '✏️' },
  2: { name: '素養題', icon: '📖' },
};

// 數學主題分類
export const MATH_CATEGORIES = {
  arithmetic: { name: '四則運算', icon: '➕' },
  geometry: { name: '幾何圖形', icon: '📐' },
  fraction: { name: '分數小數', icon: '🔣' },
  measurement: { name: '測量單位', icon: '📏' },
  word_problem: { name: '應用題', icon: '📝' },
  logic: { name: '邏輯推理', icon: '🧩' },
  statistics: { name: '統計圖表', icon: '📊' },
};

// 難度設定
export const MATH_DIFFICULTY = {
  1: { name: '簡單', icon: '🟢', multiplier: 0.8 },
  2: { name: '中等', icon: '🟡', multiplier: 1.0 },
  3: { name: '困難', icon: '🔴', multiplier: 1.5 },
};

// 數學題型星星倍率
export const MATH_TYPE_MULTIPLIER = {
  0: 1.0,   // 選擇題
  1: 1.5,   // 填答題
  2: 2.0,   // 素養題
};

// 驗證數學答案
export function validateMathAnswer(userAnswer, correctAnswer, problemType) {
  const user = (userAnswer || '').trim();
  const correct = (correctAnswer || '').trim();

  if (!user) return false;

  // 選擇題：精確比對
  if (problemType === 0) return user === correct;

  // 填答題/素養題：數值比對
  const userNum = parseFloat(user);
  const correctNum = parseFloat(correct);
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    return Math.abs(userNum - correctNum) < 0.001;
  }

  // 文字答案：忽略空白比對
  return user.replace(/\s/g, '') === correct.replace(/\s/g, '');
}
