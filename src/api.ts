import type {
  Word,
  WordFile,
  Settings,
  QuizResultDetail,
  MasteredWord,
  CustomQuiz,
  Profile,
  DailyQuest,
  Badge,
  ProfileBadge,
  ShopItem,
  ProfilePurchase,
  ConsumableItem,
  ChestShopItem,
  ProfileItem,
  ProfileChest,
  Pet,
  PetSpecies,
  PokedexData,
  PetEquipment,
  EquipmentItem,
  LeaderboardEntry,
  Title,
  ProfileTitle,
  StickerSeries,
  ProfileSticker,
  ChestConfig,
  ChestReward,
  WheelReward,
  WeeklyChallenge,
  StarAdjustment,
  BossAvailableResponse,
  BossStartResponse,
  BossCompleteResponse,
  BossRecord,
  PetExpLog,
  MathProblemSet,
  MathProblem,
  MathCustomQuiz,
  MathQuizResult,
  MathProblemAttempt,
} from './types';

export const API_BASE = '';

// 星期元素怪物系統
interface DayElement {
  key: string;
  day: number;
  element: string;
  monster: string;
  emoji: string;
  strongTypes: string[];
  weakTypes: string[];
}

export const DAY_ELEMENTS: Record<string, DayElement> = {
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

// 星期幾 → element key 對照
const DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const getElementByDate = (date = new Date()): string => {
  return DAY_TO_KEY[date.getDay()];
};

// 按星期排序的 elements 列表（週一～週日）
export const DAY_ELEMENTS_ORDERED: DayElement[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(k => DAY_ELEMENTS[k]);

// 計算寵物屬性與元素怪物的加成倍率
export const calculateTypeBonus = (petTypes: string[], category: string | null | undefined): number => {
  if (!category || !DAY_ELEMENTS[category]) return 1.0;
  const { strongTypes, weakTypes } = DAY_ELEMENTS[category];
  if (petTypes.some(t => strongTypes.includes(t))) return 1.3;
  if (petTypes.some(t => weakTypes.includes(t))) return 0.7;
  return 1.0;
};

// Boss 元素克制倍率計算（前端用於 UI 顯示）
export const calculateBossTypeBonus = (petTypes: string[], bossWeakTo: string[] | undefined): number => {
  if (!bossWeakTo || bossWeakTo.length === 0) return 1.0;
  if (petTypes.some(t => bossWeakTo.includes(t))) return 1.3;
  return 1.0;
};

// 難度設定
export const DIFFICULTY_CONFIG = {
  easy: { label: '簡單', types: [0, 1] as number[] | null, timeBonus: 5, rewardMultiplier: 0.8 },
  normal: { label: '普通', types: null as number[] | null, timeBonus: 0, rewardMultiplier: 1 },
  hard: { label: '困難', types: null as number[] | null, timeBonus: -3, rewardMultiplier: 1.5 }
};

// 預設資料
export const defaultSettings: Settings = {
  teacherPassword: '1234',
  timePerQuestion: 10,
  timeChoiceQuestion: 10,
  timeSpellingQuestion: 30,
  questionCount: 0,
  questionTypes: [0, 1, 2, 3],
  unlockedPetRarities: ['normal', 'rare', 'legendary'],
  enableMonsterSystem: false,
  enableComboSystem: false,
  enableNewEquipment: false,
  enablePetStarBonus: false,
  enableBossSystem: false,
  bossQuizSource: 'english',
  enableMathModule: false,
  mathTimeChoiceQuestion: 20,
  mathTimeFillQuestion: 45,
  mathTimeLiteracyQuestion: 90,
  mathQuestionCount: 0,
  mathQuestionTypes: [0, 1],
};

// 老師 token 管理
export const getTeacherToken = (): string | null => {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    return auth.teacherToken || null;
  } catch { return null; }
};

export const teacherHeaders = (): Record<string, string> => {
  const token = getTeacherToken();
  return token ? { 'Content-Type': 'application/json', 'x-teacher-token': token } : { 'Content-Type': 'application/json' };
};

// 老師 API 專用 fetch：401 時自動清除登入並重新整理頁面
const teacherFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('auth');
    alert('登入已過期，請重新登入');
    window.location.reload();
    throw new Error('登入已過期');
  }
  return res;
};

// API 函數
export const api = {
  async getSettings(): Promise<Settings> {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error(`Failed to get settings: ${res.status}`);
    return res.json();
  },
  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await teacherFetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error(`Failed to update settings: ${res.status}`);
    return res.json();
  },
  async getFiles(): Promise<WordFile[]> {
    const res = await fetch(`${API_BASE}/api/files`);
    if (!res.ok) throw new Error(`Failed to get files: ${res.status}`);
    return res.json();
  },
  async renameFile(fileId: string, name: string): Promise<WordFile> {
    const res = await teacherFetch(`${API_BASE}/api/files/${fileId}/name`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`Failed to rename file: ${res.status}`);
    return res.json();
  },
  async updateFileCategory(fileId: string, category: string | null): Promise<WordFile> {
    const res = await teacherFetch(`${API_BASE}/api/files/${fileId}/category`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify({ category })
    });
    if (!res.ok) throw new Error(`Failed to update file category: ${res.status}`);
    return res.json();
  },
  async createFile(name: string, words: Omit<Word, 'id'>[]): Promise<WordFile> {
    const res = await teacherFetch(`${API_BASE}/api/files`, {
      method: 'POST',
      headers: teacherHeaders(),
      body: JSON.stringify({ name, words })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  async deleteFile(id: string): Promise<void> {
    const res = await teacherFetch(`${API_BASE}/api/files/${id}`, { method: 'DELETE', headers: teacherHeaders() });
    if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
  },
  async addWordsToFile(fileId: string, words: Omit<Word, 'id'>[]): Promise<WordFile> {
    const res = await teacherFetch(`${API_BASE}/api/files/${fileId}/words`, {
      method: 'POST',
      headers: teacherHeaders(),
      body: JSON.stringify({ words })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  async updateWord(wordId: string, data: { english: string; chinese: string; partOfSpeech?: string; exampleSentence?: string }): Promise<Word> {
    const res = await teacherFetch(`${API_BASE}/api/words/${wordId}`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update word: ${res.status}`);
    return res.json();
  },
  async deleteWord(wordId: string): Promise<void> {
    const res = await teacherFetch(`${API_BASE}/api/words/${wordId}`, {
      method: 'DELETE',
      headers: teacherHeaders()
    });
    if (!res.ok) throw new Error(`Failed to delete word: ${res.status}`);
  },
  async getProfiles(): Promise<Profile[]> {
    const res = await fetch(`${API_BASE}/api/profiles`);
    if (!res.ok) throw new Error(`Failed to get profiles: ${res.status}`);
    return res.json();
  },
  async createProfile(name: string, password?: string): Promise<Profile> {
    const res = await fetch(`${API_BASE}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    if (!res.ok) throw new Error(`Failed to create profile: ${res.status}`);
    return res.json();
  },
  async studentLogin(name: string, password?: string): Promise<{ success?: boolean; notFound?: boolean; wrongPassword?: boolean; profile?: Profile }> {
    const res = await fetch(`${API_BASE}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    return res.json();
  },
  async studentRegister(name: string, password?: string): Promise<{ success?: boolean; duplicate?: boolean; profile?: Profile }> {
    const res = await fetch(`${API_BASE}/api/auth/student-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
    return res.json();
  },
  async teacherLogin(password: string): Promise<{ success: boolean; token?: string }> {
    const res = await fetch(`${API_BASE}/api/auth/teacher-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    return res.json();
  },
  async verifyTeacher(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-teacher`, { headers: teacherHeaders() });
      if (!res.ok) return false;
      const data = await res.json();
      return data.valid === true;
    } catch { return false; }
  },
  async deleteProfile(id: string): Promise<void> {
    const res = await teacherFetch(`${API_BASE}/api/profiles/${id}`, { method: 'DELETE', headers: teacherHeaders() });
    if (!res.ok) throw new Error(`Failed to delete profile: ${res.status}`);
  },
  async saveQuizResults(data: {
    profileId: string;
    fileId: string;
    duration: number;
    completed: boolean;
    results: QuizResultDetail[];
    weakWordIds: string[];
    correctWordIds: string[];
    customQuizId?: string;
    customQuizName?: string;
    companionPetId?: string;
    categoryUsed?: string;
    typeBonus?: number;
  }): Promise<void> {
    const res = await fetch(`${API_BASE}/api/quiz-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to save quiz results: ${res.status}`);
  },
  async addMasteredWords(profileId: string, wordIds: string[]): Promise<{ success: boolean; completedFiles?: { fileId: string; fileName: string; tier: number; bonus: number; chest: boolean }[] }> {
    const res = await fetch(`${API_BASE}/api/mastered-words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, wordIds })
    });
    if (!res.ok) throw new Error(`Failed to add mastered words: ${res.status}`);
    return res.json();
  },
  async removeMasteredWord(profileId: string, wordId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/mastered-words/${profileId}/${wordId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to remove mastered word: ${res.status}`);
  },
  async resetMasteredWords(profileId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/mastered-words/${profileId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to reset mastered words: ${res.status}`);
  },
  async getDueWords(profileId: string): Promise<MasteredWord[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/due-words`);
    if (!res.ok) throw new Error(`Failed to get due words: ${res.status}`);
    return res.json();
  },
  async updateReview(profileId: string, wordId: string, correct: boolean): Promise<MasteredWord> {
    const res = await fetch(`${API_BASE}/api/mastered-words/${profileId}/${wordId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct })
    });
    if (!res.ok) throw new Error(`Failed to update review: ${res.status}`);
    return res.json();
  },
  // 自訂測驗 API
  async getCustomQuizzes(): Promise<CustomQuiz[]> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes`);
    if (!res.ok) throw new Error(`Failed to get custom quizzes: ${res.status}`);
    return res.json();
  },
  async getActiveCustomQuizzes(): Promise<CustomQuiz[]> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes/active`);
    if (!res.ok) throw new Error(`Failed to get active custom quizzes: ${res.status}`);
    return res.json();
  },
  async createCustomQuiz(data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[]; starMultiplier?: number; assignedProfileIds?: string[]; durationDays?: number }): Promise<CustomQuiz> {
    const res = await teacherFetch(`${API_BASE}/api/custom-quizzes`, {
      method: 'POST',
      headers: teacherHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create custom quiz: ${res.status}`);
    return res.json();
  },
  async updateCustomQuiz(id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean; starMultiplier: number; assignedProfileIds: string[]; durationDays: number }>): Promise<CustomQuiz> {
    const res = await teacherFetch(`${API_BASE}/api/custom-quizzes/${id}`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update custom quiz: ${res.status}`);
    return res.json();
  },
  async deleteCustomQuiz(id: string): Promise<void> {
    const res = await teacherFetch(`${API_BASE}/api/custom-quizzes/${id}`, { method: 'DELETE', headers: teacherHeaders() });
    if (!res.ok) throw new Error(`Failed to delete custom quiz: ${res.status}`);
  },
  // 遊戲化 API
  async checkLogin(profileId: string): Promise<{ profile: Profile; dailyQuest: DailyQuest; loginReward: { stars: number; streak: number } | null }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/check-login`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to check login: ${res.status}`);
    return res.json();
  },
  async getDailyQuest(profileId: string): Promise<DailyQuest> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/daily-quest`);
    if (!res.ok) throw new Error(`Failed to get daily quest: ${res.status}`);
    return res.json();
  },
  async updateQuestProgress(profileId: string, questType: string, value: number): Promise<{ quest: DailyQuest; starsEarned: number }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/update-quest-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questType, value })
    });
    if (!res.ok) throw new Error(`Failed to update quest progress: ${res.status}`);
    return res.json();
  },
  async awardStars(profileId: string, params: {
    correctCount: number;
    totalCount: number;
    fileId?: string;
    wordResults?: { wordId: string; correct: boolean; questionType?: number }[];
    doubleStarActive?: boolean;
    difficultyMultiplier?: number;
    bonusMultiplier?: number;
    companionPetId?: string;
    category?: string;
    isReview?: boolean;
    shieldProtectedCount?: number;
  }): Promise<{ starsEarned: number; newTotal: number; cooldownMultiplier?: number; typeBonusMultiplier?: number; abilityBonus?: number; petHungerMultiplier?: number; comboBonus?: number; maxStreak?: number; accuracyMultiplier?: number; petLevelBonus?: number }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/award-stars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed to award stars: ${res.status}`);
    return res.json();
  },
  // 徽章 API
  async getBadges(): Promise<Badge[]> {
    const res = await fetch(`${API_BASE}/api/badges`);
    if (!res.ok) throw new Error(`Failed to get badges: ${res.status}`);
    return res.json();
  },
  async getProfileBadges(profileId: string): Promise<ProfileBadge[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/badges`);
    if (!res.ok) throw new Error(`Failed to get profile badges: ${res.status}`);
    return res.json();
  },
  async checkBadges(profileId: string): Promise<{ newBadges: Badge[]; stats: Record<string, number> }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/check-badges`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to check badges: ${res.status}`);
    return res.json();
  },
  // 商店 API
  async getShopItems(): Promise<ShopItem[]> {
    const res = await fetch(`${API_BASE}/api/shop/items`);
    if (!res.ok) throw new Error(`Failed to get shop items: ${res.status}`);
    return res.json();
  },
  async getProfilePurchases(profileId: string): Promise<ProfilePurchase[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/purchases`);
    if (!res.ok) throw new Error(`Failed to get purchases: ${res.status}`);
    return res.json();
  },
  async purchaseItem(profileId: string, itemId: string): Promise<{ success: boolean; newStars?: number; item?: ShopItem; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    return res.json();
  },
  async equipItem(profileId: string, itemId: string | null, type: 'frame' | 'theme'): Promise<{ success: boolean; profile: Profile }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type })
    });
    if (!res.ok) throw new Error(`Failed to equip: ${res.status}`);
    return res.json();
  },
  // 消耗品 API
  async getConsumables(): Promise<ConsumableItem[]> {
    const res = await fetch(`${API_BASE}/api/shop/consumables`);
    if (!res.ok) throw new Error(`Failed to get consumables: ${res.status}`);
    return res.json();
  },
  async getChestShopItems(): Promise<ChestShopItem[]> {
    const res = await fetch(`${API_BASE}/api/shop/chests`);
    if (!res.ok) throw new Error(`Failed to get chest shop items: ${res.status}`);
    return res.json();
  },
  async getProfileItems(profileId: string): Promise<ProfileItem[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/items`);
    if (!res.ok) throw new Error(`Failed to get profile items: ${res.status}`);
    return res.json();
  },
  async purchaseConsumable(profileId: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; newStars?: number; items?: ProfileItem[]; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/purchase-consumable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity })
    });
    return res.json();
  },
  async purchaseChest(profileId: string, chestType: string, quantity: number = 1): Promise<{ success: boolean; newStars?: number; chests?: ProfileChest[]; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/purchase-chest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chestType, quantity })
    });
    return res.json();
  },
  async useItem(profileId: string, itemId: string): Promise<{ success: boolean; effect?: string; items?: ProfileItem[]; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/use-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    return res.json();
  },
  async sellItem(profileId: string, type: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; sellPrice?: number; newStars?: number; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/sell-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, itemId, quantity })
    });
    return res.json();
  },
  // 寵物 API
  async getPet(profileId: string): Promise<Pet> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet`);
    if (!res.ok) throw new Error(`Failed to get pet: ${res.status}`);
    return res.json();
  },
  async feedPet(profileId: string): Promise<{ success: boolean; newHunger: number; newHappiness: number; cost: number; remainingStars?: number; error?: string; full?: boolean }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/feed`, { method: 'POST' });
    return res.json();
  },
  async gainPetExp(profileId: string, correctCount: number, doubleExpActive?: boolean, petId?: string): Promise<{ success: boolean; expGain: number; levelUp: boolean; evolved: boolean; newLevel: number; newStage: number; stageName?: string; species?: string; evolutionPath?: string | null; rarity?: string; needsEvolutionChoice?: boolean; hungerExpMultiplier?: number }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/gain-exp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctCount, doubleExpActive, petId })
    });
    if (!res.ok) throw new Error(`Failed to gain exp: ${res.status}`);
    return res.json();
  },
  async renamePet(profileId: string, name: string): Promise<{ success: boolean; pet: Pet }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`Failed to rename pet: ${res.status}`);
    return res.json();
  },
  async getPetExpLog(profileId: string, petId: string): Promise<PetExpLog[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/${petId}/exp-log`);
    if (!res.ok) throw new Error(`Failed to get pet exp log: ${res.status}`);
    return res.json();
  },
  async getPetSpecies(): Promise<PetSpecies[]> {
    const res = await fetch(`${API_BASE}/api/pet-species`);
    if (!res.ok) throw new Error(`Failed to get pet species: ${res.status}`);
    return res.json();
  },
  async getAllPets(profileId: string): Promise<Pet[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pets`);
    if (!res.ok) throw new Error(`Failed to get pets: ${res.status}`);
    return res.json();
  },
  async choosePet(profileId: string, species: string): Promise<{ success: boolean; pet: Pet; newStars: number }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/choose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species })
    });
    if (!res.ok) throw new Error(`Failed to choose pet: ${res.status}`);
    return res.json();
  },
  async switchPet(profileId: string, petId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId })
    });
    if (!res.ok) throw new Error(`Failed to switch pet: ${res.status}`);
    return res.json();
  },
  async revivePet(profileId: string, petId: string): Promise<{ success: boolean; pet?: Pet; cost?: number; remainingStars?: number; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/revive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId })
    });
    return res.json();
  },
  // 圖鑑 API
  async getPokedex(profileId: string): Promise<PokedexData> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pokedex`);
    if (!res.ok) throw new Error(`Failed to get pokedex: ${res.status}`);
    return res.json();
  },
  // 裝備 API
  async getEquipmentItems(): Promise<EquipmentItem[]> {
    const res = await fetch(`${API_BASE}/api/equipment-items`);
    if (!res.ok) throw new Error(`Failed to get equipment items: ${res.status}`);
    return res.json();
  },
  async getPetEquipment(profileId: string): Promise<PetEquipment[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/equipment`);
    if (!res.ok) throw new Error(`Failed to get pet equipment: ${res.status}`);
    return res.json();
  },
  async getAllPetEquipment(profileId: string): Promise<PetEquipment[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/equipment?all=true`);
    if (!res.ok) throw new Error(`Failed to get all pet equipment: ${res.status}`);
    return res.json();
  },
  async equipPet(profileId: string, itemId: string): Promise<{ success: boolean; equipment: PetEquipment[]; newStars: number; error?: string; transferred?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    return res.json();
  },
  async unequipPet(profileId: string, slot: string): Promise<{ success: boolean; equipment: PetEquipment[] }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/unequip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot })
    });
    return res.json();
  },
  // 排行榜 API
  async getLeaderboard(type: 'week' | 'month' | 'all'): Promise<LeaderboardEntry[]> {
    const res = await fetch(`${API_BASE}/api/leaderboard/${type}`);
    if (!res.ok) throw new Error(`Failed to get leaderboard: ${res.status}`);
    return res.json();
  },
  // 稱號 API
  async getTitles(): Promise<Title[]> {
    const res = await fetch(`${API_BASE}/api/titles`);
    if (!res.ok) throw new Error(`Failed to get titles: ${res.status}`);
    return res.json();
  },
  async getProfileTitles(profileId: string): Promise<ProfileTitle[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/titles`);
    if (!res.ok) throw new Error(`Failed to get profile titles: ${res.status}`);
    return res.json();
  },
  async equipTitle(profileId: string, titleId: string | null): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/equip-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleId })
    });
    return res.json();
  },
  async checkTitles(profileId: string): Promise<{ newTitles: Title[] }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/check-titles`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to check titles: ${res.status}`);
    return res.json();
  },
  // 貼紙 API
  async getStickerSeries(): Promise<StickerSeries[]> {
    const res = await fetch(`${API_BASE}/api/stickers/series`);
    if (!res.ok) throw new Error(`Failed to get sticker series: ${res.status}`);
    return res.json();
  },
  async getProfileStickers(profileId: string): Promise<ProfileSticker[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/stickers`);
    if (!res.ok) throw new Error(`Failed to get profile stickers: ${res.status}`);
    return res.json();
  },
  // 寶箱 API
  async getChestConfig(): Promise<ChestConfig> {
    const res = await fetch(`${API_BASE}/api/chests/config`);
    if (!res.ok) throw new Error(`Failed to get chest config: ${res.status}`);
    return res.json();
  },
  async getProfileChests(profileId: string): Promise<ProfileChest[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/chests`);
    if (!res.ok) throw new Error(`Failed to get profile chests: ${res.status}`);
    return res.json();
  },
  async openChest(profileId: string, chestType: string): Promise<{ success: boolean; reward: ChestReward; chestName: string; chestIcon: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/open-chest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chestType })
    });
    return res.json();
  },
  // 轉盤 API
  async getWheelConfig(): Promise<WheelReward[]> {
    const res = await fetch(`${API_BASE}/api/wheel/config`);
    if (!res.ok) throw new Error(`Failed to get wheel config: ${res.status}`);
    return res.json();
  },
  async canSpin(profileId: string): Promise<{ canSpin: boolean }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/can-spin`);
    return res.json();
  },
  async spinWheel(profileId: string): Promise<{ success: boolean; reward: WheelReward; rewardIndex: number; newStars?: number; chests?: ProfileChest[]; stickers?: ProfileSticker[]; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/spin-wheel`, { method: 'POST' });
    return res.json();
  },
  async giveChest(profileId: string, chestType: string, quantity = 1): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/give-chest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chestType, quantity })
    });
    return res.json();
  },
  // 週挑戰 API
  async getWeeklyChallenge(profileId: string): Promise<WeeklyChallenge> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/weekly-challenge`);
    if (!res.ok) throw new Error(`Failed to get weekly challenge: ${res.status}`);
    return res.json();
  },
  async claimWeeklyReward(profileId: string): Promise<{ success: boolean; rewards?: { stars: number; chests: { type: string; quantity: number }[] }; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/claim-weekly-reward`, {
      method: 'POST'
    });
    return res.json();
  },
  // 星星調整 API
  async adjustStars(profileId: string, amount: number, reason?: string): Promise<{ success: boolean; newStars: number; adjustment: StarAdjustment }> {
    const res = await teacherFetch(`${API_BASE}/api/profiles/${profileId}/adjust-stars`, {
      method: 'POST',
      headers: teacherHeaders(),
      body: JSON.stringify({ amount, reason: reason || undefined })
    });
    if (!res.ok) throw new Error(`Failed to adjust stars: ${res.status}`);
    return res.json();
  },
  async getStarAdjustments(profileId: string): Promise<StarAdjustment[]> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/star-adjustments`);
    if (!res.ok) throw new Error(`Failed to get star adjustments: ${res.status}`);
    return res.json();
  },
  async deleteStarAdjustment(adjustmentId: string): Promise<{ success: boolean; newStars: number }> {
    const res = await teacherFetch(`${API_BASE}/api/star-adjustments/${adjustmentId}`, { method: 'DELETE', headers: teacherHeaders() });
    if (!res.ok) throw new Error(`Failed to delete star adjustment: ${res.status}`);
    return res.json();
  },
  async updateStarAdjustment(adjustmentId: string, reason: string): Promise<StarAdjustment> {
    const res = await teacherFetch(`${API_BASE}/api/star-adjustments/${adjustmentId}`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error(`Failed to update star adjustment: ${res.status}`);
    return res.json();
  },
  async getStarHistory(profileId: string, days = 7): Promise<{ history: StarAdjustment[]; summary: { earned: number; spent: number } }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/star-history?days=${days}`);
    if (!res.ok) throw new Error(`Failed to get star history: ${res.status}`);
    return res.json();
  },
  // Boss 挑戰 API
  async getAvailableBosses(profileId: string): Promise<BossAvailableResponse> {
    const res = await fetch(`${API_BASE}/api/boss/available/${profileId}`);
    if (!res.ok) throw new Error(`Failed to get available bosses: ${res.status}`);
    return res.json();
  },
  async startBossChallenge(profileId: string, tier: number, petId?: string): Promise<BossStartResponse> {
    const res = await fetch(`${API_BASE}/api/boss/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, tier, petId })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  async completeBossChallenge(data: {
    profileId: string;
    tier: number;
    petId: string;
    petLevel: number;
    correctCount: number;
    totalCount: number;
    results: { wordId: string; correct: boolean }[];
  }): Promise<BossCompleteResponse> {
    const res = await fetch(`${API_BASE}/api/boss/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to complete boss challenge: ${res.status}`);
    return res.json();
  },
  async getBossRecords(profileId: string): Promise<BossRecord[]> {
    const res = await fetch(`${API_BASE}/api/boss/records/${profileId}`);
    if (!res.ok) throw new Error(`Failed to get boss records: ${res.status}`);
    return res.json();
  },

  // ============ 數學模組 API ============

  async getMathSets(): Promise<MathProblemSet[]> {
    const res = await fetch(`${API_BASE}/api/math-sets`);
    if (!res.ok) throw new Error(`Failed to get math sets: ${res.status}`);
    return res.json();
  },
  async createMathSet(name: string, category?: string, problems?: Partial<MathProblem>[]): Promise<MathProblemSet> {
    const res = await fetch(`${API_BASE}/api/math-sets`, {
      method: 'POST',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, problems })
    });
    if (!res.ok) throw new Error(`Failed to create math set: ${res.status}`);
    return res.json();
  },
  async deleteMathSet(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/math-sets/${id}`, {
      method: 'DELETE',
      headers: teacherHeaders()
    });
    return res.json();
  },
  async renameMathSet(id: string, name: string): Promise<MathProblemSet> {
    const res = await fetch(`${API_BASE}/api/math-sets/${id}/name`, {
      method: 'PUT',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`Failed to rename math set: ${res.status}`);
    return res.json();
  },
  async updateMathSetCategory(id: string, category: string | null): Promise<MathProblemSet> {
    const res = await fetch(`${API_BASE}/api/math-sets/${id}/category`, {
      method: 'PUT',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    });
    if (!res.ok) throw new Error(`Failed to update math set category: ${res.status}`);
    return res.json();
  },
  async updateMathSetElement(id: string, element: string | null): Promise<MathProblemSet> {
    const res = await fetch(`${API_BASE}/api/math-sets/${id}/element`, {
      method: 'PUT',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ element })
    });
    if (!res.ok) throw new Error(`Failed to update math set element: ${res.status}`);
    return res.json();
  },
  async addMathProblems(setId: string, problems: Partial<MathProblem>[]): Promise<MathProblemSet> {
    const res = await fetch(`${API_BASE}/api/math-sets/${setId}/problems`, {
      method: 'POST',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ problems })
    });
    if (!res.ok) throw new Error(`Failed to add problems: ${res.status}`);
    return res.json();
  },
  async updateMathProblem(id: string, data: Partial<MathProblem>): Promise<MathProblem> {
    const res = await fetch(`${API_BASE}/api/math-problems/${id}`, {
      method: 'PUT',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update problem: ${res.status}`);
    return res.json();
  },
  async deleteMathProblem(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/math-problems/${id}`, {
      method: 'DELETE',
      headers: teacherHeaders()
    });
    return res.json();
  },
  async importMathCsv(setId: string, csvData: string, overwrite = false): Promise<{ success: boolean; count: number; set: MathProblemSet }> {
    const res = await fetch(`${API_BASE}/api/math-sets/${setId}/import-csv`, {
      method: 'POST',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData, overwrite })
    });
    if (!res.ok) throw new Error(`Failed to import CSV: ${res.status}`);
    return res.json();
  },
  async submitMathQuizResults(data: {
    profileId: string;
    problemSetId: string;
    customQuizId?: string;
    companionPetId?: string;
    duration: number;
    completed: boolean;
    results: MathQuizResult[];
    isReview?: boolean;
  }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/math-quiz-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async getMathAttempts(profileId: string): Promise<MathProblemAttempt[]> {
    const res = await fetch(`${API_BASE}/api/math-attempts/${profileId}`);
    if (!res.ok) throw new Error(`Failed to get math attempts: ${res.status}`);
    return res.json();
  },
  async getMathCustomQuizzes(): Promise<MathCustomQuiz[]> {
    const res = await fetch(`${API_BASE}/api/math-custom-quizzes`);
    if (!res.ok) throw new Error(`Failed to get math custom quizzes: ${res.status}`);
    return res.json();
  },
  async getActiveMathCustomQuizzes(): Promise<MathCustomQuiz[]> {
    const res = await fetch(`${API_BASE}/api/math-custom-quizzes/active`);
    if (!res.ok) throw new Error(`Failed to get active math quizzes: ${res.status}`);
    return res.json();
  },
  async createMathCustomQuiz(data: Partial<MathCustomQuiz>): Promise<MathCustomQuiz> {
    const res = await fetch(`${API_BASE}/api/math-custom-quizzes`, {
      method: 'POST',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create math custom quiz: ${res.status}`);
    return res.json();
  },
  async updateMathCustomQuiz(id: string, data: Partial<MathCustomQuiz>): Promise<MathCustomQuiz> {
    const res = await fetch(`${API_BASE}/api/math-custom-quizzes/${id}`, {
      method: 'PUT',
      headers: { ...teacherHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update math custom quiz: ${res.status}`);
    return res.json();
  },
  async deleteMathCustomQuiz(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/math-custom-quizzes/${id}`, {
      method: 'DELETE',
      headers: teacherHeaders()
    });
    return res.json();
  },
};

// 工具函數
export const shuffleArray = <T,>(arr: T[]): T[] => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// 從自訂測驗抽題（新格式用 countType*，舊格式用 problemIds）
export const drawMathProblems = (
  allSets: MathProblemSet[],
  quiz: MathCustomQuiz
): MathProblem[] => {
  // Legacy fallback：舊格式直接用指定的 problemIds
  if (quiz.problemIds && quiz.problemIds.length > 0 &&
      quiz.countType0 === -1 && quiz.countType1 === -1 && quiz.countType2 === -1) {
    const setIds = quiz.problemSetIds.length > 0 ? quiz.problemSetIds : (quiz.problemSetId ? [quiz.problemSetId] : []);
    const allProblems = allSets.filter(s => setIds.includes(s.id)).flatMap(s => s.problems);
    return shuffleArray(allProblems.filter(p => quiz.problemIds.includes(p.id) && quiz.problemTypes.includes(p.problemType)));
  }

  // 新格式：從 problemSetIds 的題庫按 countType 抽題
  const setIds = quiz.problemSetIds.length > 0 ? quiz.problemSetIds : (quiz.problemSetId ? [quiz.problemSetId] : []);
  const pool = allSets.filter(s => setIds.includes(s.id)).flatMap(s => s.problems);

  const counts: Record<number, number> = { 0: quiz.countType0, 1: quiz.countType1, 2: quiz.countType2 };
  const drawn: MathProblem[] = [];

  for (const type of [0, 1, 2]) {
    const count = counts[type] ?? -1;
    if (count === 0) continue;
    const typePool = shuffleArray(pool.filter(p => p.problemType === type));
    if (count < 0) {
      drawn.push(...typePool);
    } else {
      drawn.push(...typePool.slice(0, count));
    }
  }

  return shuffleArray(drawn);
};

export const parseCSV = (text: string): Omit<Word, 'id'>[] => {
  const lines = text.trim().split('\n');
  const words: Omit<Word, 'id'>[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 2) {
      const english = parts[0].trim();
      const chinese = parts[1].trim();
      const partOfSpeech = parts.length >= 3 ? parts[2].trim() : undefined;
      const exampleSentence = parts.length >= 4 ? parts.slice(3).join(',').trim() : undefined;
      if (english && chinese && !/^english$/i.test(english)) {
        words.push({ english, chinese, partOfSpeech: partOfSpeech || undefined, exampleSentence: exampleSentence || undefined });
      }
    }
  }
  return words;
};

export const parseMultiLineInput = (text: string): Omit<Word, 'id'>[] => {
  const lines = text.trim().split('\n');
  const words: Omit<Word, 'id'>[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let parts: string[];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else {
      continue;
    }

    if (parts.length >= 2) {
      const english = parts[0].trim();
      const chinese = parts[1].trim();
      const partOfSpeech = parts.length >= 3 ? parts[2].trim() : undefined;
      const exampleSentence = parts.length >= 4 ? parts.slice(3).join(line.includes('\t') ? '\t' : ',').trim() : undefined;
      if (english && chinese && !/^english$/i.test(english)) {
        words.push({ english, chinese, partOfSpeech: partOfSpeech || undefined, exampleSentence: exampleSentence || undefined });
      }
    }
  }
  return words;
};

export const hasGarbledText = (text: string): boolean => {
  if (!text) return false;
  const garbledPattern = /[\ufffd\u0000-\u0008\u000e-\u001f]/g;
  const matches = text.match(garbledPattern);
  return matches !== null && matches.length > 0;
};

export const formatDate = (timestamp: Date | string | number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
};

// SRS 間隔重複系統工具函數
export const REVIEW_INTERVALS: Record<number, number> = {
  1: 1, 2: 3, 3: 7, 4: 14, 5: 30, 6: 60
};

export const isDue = (nextReviewAt: Date | string): boolean => {
  return new Date(nextReviewAt) <= new Date();
};

export const getIntervalText = (level: number): string => {
  const days = REVIEW_INTERVALS[Math.min(level, 6)] || 60;
  if (days === 1) return '1天';
  if (days < 30) return `${days}天`;
  if (days === 30) return '1個月';
  return '2個月';
};

export const getLevelColor = (level: number): string => {
  const colors: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-700',
    2: 'bg-lime-100 text-lime-700',
    3: 'bg-green-100 text-green-700',
    4: 'bg-cyan-100 text-cyan-700',
    5: 'bg-blue-100 text-blue-700',
    6: 'bg-purple-100 text-purple-700'
  };
  return colors[Math.min(level, 6)] || colors[6];
};

export const formatNextReview = (nextReviewAt: Date | string): string => {
  const next = new Date(nextReviewAt);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays < 7) return `${diffDays}天後`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)}週後`;
  return `${Math.ceil(diffDays / 30)}個月後`;
};
