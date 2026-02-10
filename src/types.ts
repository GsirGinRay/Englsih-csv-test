export interface Word {
  id: string;
  english: string;
  chinese: string;
  partOfSpeech?: string;
  exampleSentence?: string;
}

export interface WordFile {
  id: string;
  name: string;
  category?: string | null;
  words: Word[];
}

export interface HistoryEntry {
  rate: number;
  timestamp: Date | string;
}

export interface FileProgress {
  id: string;
  fileId: string;
  correct: number;
  wrong: number;
  weakWordIds: string[];
  history: HistoryEntry[];
}

export interface QuizSettings {
  timePerQuestion: number;
  questionCount: number;
  questionTypes: number[];
}

export interface QuizSession {
  id: string;
  fileId: string;
  customQuizId?: string;
  customQuizName?: string;
  timestamp: Date | string;
  duration: number;
  completed: boolean;
  results: QuizResultDetail[];
}

export interface QuizResultDetail {
  wordId: string;
  correct: boolean;
  questionType: number;
  timeSpent: number;
}

export interface MasteredWord {
  id: string;
  wordId: string;
  level: number;
  masteredAt: Date | string;
  lastReviewedAt: Date | string;
  nextReviewAt: Date | string;
  reviewCount: number;
  correctStreak: number;
}

export interface Profile {
  id: string;
  name: string;
  stars: number;
  totalStars: number;
  lastLoginAt: Date | string | null;
  loginStreak: number;
  equippedFrame: string | null;
  equippedTheme: string | null;
  equippedTitle: string | null;
  lastSpinAt: Date | string | null;
  progress: FileProgress[];
  quizSessions: QuizSession[];
  masteredWords: MasteredWord[];
  badges?: ProfileBadge[];
  purchases?: ProfilePurchase[];
}

export interface ProfileBadge {
  id: string;
  profileId: string;
  badgeId: string;
  unlockedAt: Date | string;
}

export interface ProfilePurchase {
  id: string;
  profileId: string;
  itemId: string;
  purchasedAt: Date | string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: { type: string; value: number };
}

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'frame' | 'theme';
  price: number;
  preview: string;
}

export interface DailyQuest {
  id: string;
  profileId: string;
  date: Date | string;
  quest1Type: string;
  quest1Target: number;
  quest1Progress: number;
  quest1Reward: number;
  quest1Done: boolean;
  quest2Type: string;
  quest2Target: number;
  quest2Progress: number;
  quest2Reward: number;
  quest2Done: boolean;
  quest3Type: string;
  quest3Target: number;
  quest3Progress: number;
  quest3Reward: number;
  quest3Done: boolean;
  allCompleted: boolean;
  bonusClaimed: boolean;
}

export interface Pet {
  id: string;
  profileId: string;
  name: string;
  species: string;
  isActive: boolean;
  hasPet?: boolean;
  exp: number;
  level: number;
  stage: number;
  evolutionPath?: string | null;
  hunger: number;
  happiness: number;
  lastFedAt: string;
  expToNext: number;
  currentExp: number;
  stageName: string;
  stageIcon: string;
  stages: PetStageData;
  equipment?: PetEquipment[];
  rarity?: string;
  rpgStats?: { hp: number; attack: number; defense: number };
  types?: string[];
  needsEvolutionChoice?: boolean;
  ability?: { name: string; desc: string };
}

export interface PetStageData {
  shared: { stage: number; name: string; minLevel: number }[];
  pathA: { stage: number; name: string; minLevel: number }[];
  pathB: { stage: number; name: string; minLevel: number }[];
  evolutionLevel: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  totalStars: number;
  weeklyStars: number;
  monthlyMastered: number;
  equippedFrame: string | null;
  petIcon: string;
  petLevel: number;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  color: string;
  glow: boolean;
  condition: { type: string; value: number };
}

export interface ProfileTitle {
  id: string;
  profileId: string;
  titleId: string;
  unlockedAt: string;
}

export interface Sticker {
  id: string;
  name: string;
  icon: string;
  seriesId: string;
  seriesName: string;
  rarity: string;
}

export interface StickerSeries {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  total: number;
  stickers: { id: string; name: string; icon: string }[];
}

export interface ProfileSticker {
  id: string;
  profileId: string;
  stickerId: string;
  obtainedAt: string;
}

export interface ChestConfig {
  [key: string]: {
    name: string;
    icon: string;
    color: string;
    rewards: { type: string; min?: number; max?: number; rarity?: string; weight: number }[];
  };
}

export interface ProfileChest {
  id: string;
  profileId: string;
  chestType: string;
  quantity: number;
}

export interface WheelReward {
  id: string;
  name: string;
  icon: string;
  type: string;
  value: number | string;
  weight: number;
}

export interface WeeklyChallenge {
  id: string;
  profileId: string;
  weekStart: string;
  targetWords: number;
  targetQuiz: number;
  targetDays: number;
  progressWords: number;
  progressQuiz: number;
  progressDays: number;
  rewardClaimed: boolean;
  daysLeft: number;
}

export interface PetSpecies {
  species: string;
  name: string;
  price: number;
  rarity: 'normal' | 'rare' | 'legendary';
  description: string;
  baseType: string;
  pathA: { types: string[]; name: string };
  pathB: { types: string[]; name: string };
  baseStats: { hp: number; attack: number; defense: number };
  growthRates: { hp: number; attack: number; defense: number };
  ability: { name: string; desc: string };
  stages: PetStageData;
}

export interface PetEquipment {
  id: string;
  profileId: string;
  petId: string;
  slot: string;
  itemId: string;
  equippedAt: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  icon: string;
  slot: string;
  rarity: 'normal' | 'rare' | 'legendary';
  price: number;
  bonusType: 'exp' | 'stars';
  bonusValue: number;
  description: string;
}

export interface PokedexEntry {
  species: string;
  name: string;
  price: number;
  rarity: 'normal' | 'rare' | 'legendary';
  description: string;
  baseType: string;
  pathA: { types: string[]; name: string };
  pathB: { types: string[]; name: string };
  ability: { name: string; desc: string };
  stages: PetStageData;
  unlocked: boolean;
  ownedCount: number;
  unlockedPaths: { A: boolean; B: boolean };
}

export interface PokedexData {
  total: number;
  unlocked: number;
  entries: PokedexEntry[];
}

export interface StarAdjustment {
  id: string;
  profileId: string;
  amount: number;
  reason: string;
  adjustedAt: string;
}

export interface ChestReward {
  type: string;
  name: string;
  icon: string;
  value?: number;
  sticker?: Sticker;
  title?: Title;
  rarity?: string;
  duplicate?: boolean;
  bonusStars?: number;
}

export interface ConsumableItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  effect: string;
}

export interface ChestShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  chestType: string;
  price: number;
}

export interface ProfileItem {
  id: string;
  profileId: string;
  itemId: string;
  quantity: number;
}

export interface Settings {
  teacherPassword: string;
  timePerQuestion: number;
  timeChoiceQuestion: number;
  timeSpellingQuestion: number;
  questionCount: number;
  questionTypes: number[];
  unlockedPetRarities: string[];
}

export interface CustomQuiz {
  id: string;
  name: string;
  fileId: string;
  wordIds: string[];
  questionTypes: number[];
  active: boolean;
  starMultiplier: number;
  category?: string | null;
  createdAt: Date | string;
}

export interface QuizResult {
  word: Word;
  correct: boolean;
  questionType: number;
  timeSpent: number;
}

export interface QuizState {
  file: WordFile;
  words: Word[];
  isReview: boolean;
  customQuestionTypes?: number[];
  customQuizId?: string;
  customQuizName?: string;
  bonusMultiplier?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  questionCount?: number;
  companionPetId?: string;
  companionPet?: Pet;
  category?: string;
  typeBonusMultiplier?: number;
}
