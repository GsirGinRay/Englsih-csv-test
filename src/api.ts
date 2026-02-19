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
} from './types';

export const API_BASE = '';

// 學科分類定義
export const QUIZ_CATEGORIES: Record<string, { key: string; name: string; emoji: string; strongTypes: string[]; weakTypes: string[] }> = {
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
export const calculateTypeBonus = (petTypes: string[], category: string | null | undefined): number => {
  if (!category || !QUIZ_CATEGORIES[category]) return 1.0;
  const { strongTypes, weakTypes } = QUIZ_CATEGORIES[category];
  if (petTypes.some(t => strongTypes.includes(t))) return 1.3;
  if (petTypes.some(t => weakTypes.includes(t))) return 0.7;
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
  unlockedPetRarities: ['normal', 'rare', 'legendary']
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

// API 函數
export const api = {
  async getSettings(): Promise<Settings> {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error(`Failed to get settings: ${res.status}`);
    return res.json();
  },
  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await fetch(`${API_BASE}/api/settings`, {
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
  async updateFileCategory(fileId: string, category: string | null): Promise<WordFile> {
    const res = await fetch(`${API_BASE}/api/files/${fileId}/category`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify({ category })
    });
    if (!res.ok) throw new Error(`Failed to update file category: ${res.status}`);
    return res.json();
  },
  async createFile(name: string, words: Omit<Word, 'id'>[]): Promise<WordFile> {
    const res = await fetch(`${API_BASE}/api/files`, {
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
    const res = await fetch(`${API_BASE}/api/files/${id}`, { method: 'DELETE', headers: teacherHeaders() });
    if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
  },
  async addWordsToFile(fileId: string, words: Omit<Word, 'id'>[]): Promise<WordFile> {
    const res = await fetch(`${API_BASE}/api/files/${fileId}/words`, {
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
    const res = await fetch(`${API_BASE}/api/profiles/${id}`, { method: 'DELETE', headers: teacherHeaders() });
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
  async addMasteredWords(profileId: string, wordIds: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/api/mastered-words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, wordIds })
    });
    if (!res.ok) throw new Error(`Failed to add mastered words: ${res.status}`);
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
  async createCustomQuiz(data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[]; starMultiplier?: number }): Promise<CustomQuiz> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes`, {
      method: 'POST',
      headers: teacherHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create custom quiz: ${res.status}`);
    return res.json();
  },
  async updateCustomQuiz(id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean; starMultiplier: number }>): Promise<CustomQuiz> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes/${id}`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update custom quiz: ${res.status}`);
    return res.json();
  },
  async deleteCustomQuiz(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes/${id}`, { method: 'DELETE', headers: teacherHeaders() });
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
    wordResults?: { wordId: string; correct: boolean }[];
    doubleStarActive?: boolean;
    difficultyMultiplier?: number;
    bonusMultiplier?: number;
    companionPetId?: string;
    category?: string;
  }): Promise<{ starsEarned: number; newTotal: number; cooldownMultiplier?: number; typeBonusMultiplier?: number; abilityBonus?: number }> {
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
  // 寵物 API
  async getPet(profileId: string): Promise<Pet> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet`);
    if (!res.ok) throw new Error(`Failed to get pet: ${res.status}`);
    return res.json();
  },
  async feedPet(profileId: string): Promise<{ success: boolean; newHunger: number; newHappiness: number; cost: number; remainingStars?: number; error?: string }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/feed`, { method: 'POST' });
    return res.json();
  },
  async gainPetExp(profileId: string, correctCount: number): Promise<{ success: boolean; expGain: number; levelUp: boolean; evolved: boolean; newLevel: number; newStage: number; stageName?: string; stageIcon?: string; needsEvolutionChoice?: boolean }> {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/pet/gain-exp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctCount })
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
  async equipPet(profileId: string, itemId: string): Promise<{ success: boolean; equipment: PetEquipment[]; newStars: number }> {
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
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/adjust-stars`, {
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
    const res = await fetch(`${API_BASE}/api/star-adjustments/${adjustmentId}`, { method: 'DELETE', headers: teacherHeaders() });
    if (!res.ok) throw new Error(`Failed to delete star adjustment: ${res.status}`);
    return res.json();
  },
  async updateStarAdjustment(adjustmentId: string, reason: string): Promise<StarAdjustment> {
    const res = await fetch(`${API_BASE}/api/star-adjustments/${adjustmentId}`, {
      method: 'PUT',
      headers: teacherHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error(`Failed to update star adjustment: ${res.status}`);
    return res.json();
  }
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
      parts = line.split(/\s+/);
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
