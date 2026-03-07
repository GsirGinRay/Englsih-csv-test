import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import type {
  Word, WordFile, HistoryEntry, FileProgress, QuizSettings, QuizSession, QuizResultDetail,
  MasteredWord, Profile, ProfileBadge, ProfilePurchase, Badge, ShopItem, DailyQuest,
  Pet, PetStageData, LeaderboardEntry, Title, ProfileTitle, Sticker, StickerSeries,
  ProfileSticker, ChestConfig, ProfileChest, WheelReward, WeeklyChallenge, PetSpecies,
  PetEquipment, EquipmentItem, PokedexEntry, PokedexData, StarAdjustment, ChestReward,
  ConsumableItem, ChestShopItem, ProfileItem, Settings, CustomQuiz, QuizResult, QuizState,
} from './types';
import {
  api, API_BASE, QUIZ_CATEGORIES, DAY_ELEMENTS, DAY_ELEMENTS_ORDERED, calculateTypeBonus, getElementByDate, DIFFICULTY_CONFIG, defaultSettings,
  shuffleArray, parseCSV, parseMultiLineInput, hasGarbledText, formatDate, formatDuration,
  REVIEW_INTERVALS, isDue, getIntervalText, getLevelColor, formatNextReview, teacherHeaders,
} from './api';

// ============ 共用元件 ============

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message, onConfirm, onCancel, confirmText = '確定', cancelText = '取消', confirmVariant = 'danger'
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
      <p className="text-lg text-gray-800 mb-6 whitespace-pre-line">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">{cancelText}</button>
        <button onClick={onConfirm} className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${confirmVariant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>{confirmText}</button>
      </div>
    </div>
  </div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', disabled, className = '' }) => {
  const baseClass = "px-4 py-2 rounded-lg font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    success: "bg-green-500 hover:bg-green-600 text-white shadow-lg",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseClass} ${variants[variant]} ${className}`}>{children}</button>;
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>{children}</div>
);

const RARITY_LABELS: Record<string, { label: string; color: string; border: string; bg: string }> = {
  normal: { label: '普通', color: 'text-gray-600', border: 'border-gray-300', bg: 'bg-gray-50' },
  rare: { label: '稀有', color: 'text-blue-600', border: 'border-blue-400', bg: 'bg-blue-50' },
  legendary: { label: '傳說', color: 'text-yellow-600', border: 'border-yellow-400', bg: 'bg-yellow-50' },
};

// 屬性顏色和 emoji 配置
const TYPE_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  '一般': { color: '#9CA3AF', bg: '#F3F4F6', emoji: '⚪' },
  '火': { color: '#EF4444', bg: '#FEF2F2', emoji: '🔥' },
  '水': { color: '#3B82F6', bg: '#EFF6FF', emoji: '💧' },
  '草': { color: '#22C55E', bg: '#F0FDF4', emoji: '🌿' },
  '電': { color: '#EAB308', bg: '#FEFCE8', emoji: '⚡' },
  '冰': { color: '#67E8F9', bg: '#ECFEFF', emoji: '❄️' },
  '格鬥': { color: '#DC2626', bg: '#FEF2F2', emoji: '🥊' },
  '毒': { color: '#A855F7', bg: '#FAF5FF', emoji: '☠️' },
  '地面': { color: '#A16207', bg: '#FEF9C3', emoji: '🌍' },
  '飛行': { color: '#818CF8', bg: '#EEF2FF', emoji: '🦅' },
  '超能力': { color: '#EC4899', bg: '#FDF2F8', emoji: '🔮' },
  '蟲': { color: '#84CC16', bg: '#F7FEE7', emoji: '🐛' },
  '岩石': { color: '#78716C', bg: '#F5F5F4', emoji: '🪨' },
  '幽靈': { color: '#7C3AED', bg: '#F5F3FF', emoji: '👻' },
  '龍': { color: '#6366F1', bg: '#EEF2FF', emoji: '🐉' },
  '惡': { color: '#374151', bg: '#F9FAFB', emoji: '🌑' },
  '鋼': { color: '#6B7280', bg: '#F9FAFB', emoji: '⚙️' },
  '妖精': { color: '#F472B6', bg: '#FDF2F8', emoji: '🧚' },
};

// TypeBadge 屬性標籤組件
const TypeBadge: React.FC<{ type: string; size?: 'sm' | 'md' }> = ({ type, size = 'sm' }) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG['一般'];
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.color}30` }}
    >
      <span>{config.emoji}</span>
      <span>{type}</span>
    </span>
  );
};

// 正規化撇號與引號（用於顯示和比對，保留原始大小寫）
const normalizeApostrophe = (text: string): string => {
  return text
    .replace(/[\u2018\u2019\u201B\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/'\s+(?=[a-zA-Z])/g, "'");  // "it' s" → "it's"
};

// 正規化拼寫答案：去除括號內容、統一引號、去除尾部標點
const normalizeSpellAnswer = (text: string): string => {
  return text
    .replace(/\s*[\(（].*?[\)）]\s*/g, ' ')
    .replace(/[\u2018\u2019\u201B\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/'\s+(?=[a-zA-Z])/g, "'")
    .replace(/[!?.,;:!？。，；：]+$/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

// 去除括號內容（用於 TTS 發音）
const stripParenthetical = (text: string): string => {
  return text.replace(/\s*[\(（].*?[\)）]\s*/g, ' ').trim();
};

// 取得寵物圖片路徑（支援分支進化）
const getPetImageSrc = (species: string, stage: number, evolutionPath?: string | null): string => {
  if (stage === 1) return `/pets/${species}-1.svg`;
  if (stage === 2) return `/pets/${species}-2.png`;
  if (stage >= 3) {
    if (!evolutionPath) return '/pets/mystery-evolution.png';
    const pathPrefix = evolutionPath.toLowerCase();
    return `/pets/${species}-${pathPrefix}${stage}.png`;
  }
  return `/pets/${species}-2.png`;
};

// ============ PetSprite 寵物圖片組件 ============

interface PixelPetProps {
  species: string;
  stage: number;
  evolutionPath?: string | null;
  rarity?: string;
  size?: number;
  scale?: number;
  animate?: boolean;
  showAura?: boolean;
  onClick?: () => void;
  className?: string;
}

const PixelPet: React.FC<PixelPetProps> = ({
  species, stage, evolutionPath, rarity = 'normal', size = 4, scale = 2,
  animate = true, showAura = true, onClick, className = ''
}) => {
  const imgSize = Math.round(size * scale * 16);
  const src = getPetImageSrc(species, stage, evolutionPath);

  const auraClass = showAura
    ? rarity === 'legendary' ? 'pixel-aura-legendary'
    : rarity === 'rare' ? 'pixel-aura-rare'
    : ''
    : '';

  const animClass = animate
    ? rarity === 'legendary' ? 'pixel-float-legendary'
    : rarity === 'rare' ? 'pixel-float-rare'
    : 'pixel-float-normal'
    : '';

  return (
    <div
      className={`pixel-pet-container ${auraClass} ${animClass} ${className}`}
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: onClick ? 'pointer' : 'default' }}
    >
      {showAura && rarity === 'legendary' && (
        <div className="pixel-particles">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="pixel-particle" style={{
              left: `${15 + Math.random() * 70}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${1.5 + Math.random()}s`,
            }} />
          ))}
        </div>
      )}
      {showAura && rarity === 'rare' && (
        <div className="pixel-particles">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="pixel-sparkle" style={{
              left: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 0.6}s`,
            }} />
          ))}
        </div>
      )}
      <img
        src={src}
        alt={`${species} stage ${stage}`}
        width={imgSize}
        height={imgSize}
        style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
        draggable={false}
      />
    </div>
  );
};

// ============ 頭像框/主題對映 ============

const FRAME_STYLES: Record<string, string> = {
  frame_fire: 'avatar-frame-fire',
  frame_ice: 'avatar-frame-ice',
  frame_rainbow: 'avatar-frame-rainbow',
  frame_gold: 'avatar-frame-gold',
  frame_diamond: 'avatar-frame-diamond',
};


// ============ Avatar 元件 ============

interface AvatarProps {
  name: string;
  equippedFrame?: string | null;
  petSpecies?: string;
  petStage?: number;
  petEvolutionPath?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ name, equippedFrame, petSpecies, petStage, petEvolutionPath, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-3xl',
  };
  const frameClass = equippedFrame ? FRAME_STYLES[equippedFrame] || '' : '';
  const isRainbow = equippedFrame === 'frame_rainbow';

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center shrink-0 ${isRainbow ? frameClass : ''} ${!isRainbow && frameClass ? frameClass : ''} bg-gray-800 overflow-hidden`}>
      {petSpecies && petStage ? (
        <img src={getPetImageSrc(petSpecies, petStage, petEvolutionPath)} alt="" className="w-full h-full object-contain" />
      ) : (
        <span>{name.charAt(0)}</span>
      )}
    </div>
  );
};

// ============ 角色選擇畫面 ============

const RoleSelectScreen: React.FC<{ onSelectStudent: () => void; onSelectTeacher: () => void }> = ({ onSelectStudent, onSelectTeacher }) => (
  <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
    <Card className="w-full max-w-md border border-gray-200">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">英文單字練習</h1>
      <p className="text-gray-500 text-center mb-8">請選擇您的身分</p>
      <div className="space-y-4">
        <button onClick={onSelectStudent} className="w-full p-6 bg-gray-900 rounded-xl text-white font-bold text-xl hover:bg-gray-800 transition-all transform hover:scale-[1.02] shadow-sm">
          <div className="text-4xl mb-2">👨‍🎓</div>我是學生
        </button>
        <button onClick={onSelectTeacher} className="w-full p-6 bg-white border-2 border-gray-900 rounded-xl text-gray-900 font-bold text-xl hover:bg-gray-50 transition-all transform hover:scale-[1.02] shadow-sm">
          <div className="text-4xl mb-2">👨‍🏫</div>我是老師
        </button>
      </div>
    </Card>
  </div>
);

// ============ 老師登入畫面 ============

const TeacherLogin: React.FC<{ onSuccess: (token?: string) => void; onBack: () => void }> = ({ onSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await api.teacherLogin(password);
      if (result.success) {
        onSuccess(result.token);
      } else {
        setError(true);
        setPassword('');
      }
    } catch {
      setError(true);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-sm border border-gray-200">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mb-4">← 返回</button>
        <h1 className="text-xl font-bold text-center mb-6 text-gray-900">老師登入</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">請輸入密碼</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(false); }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="密碼" className={`w-full px-4 py-2 border-2 rounded-lg outline-none ${error ? 'border-red-500' : 'border-gray-300 focus:border-gray-900'}`} autoFocus />
            {error && <p className="text-red-500 text-sm mt-1">密碼錯誤，請重試</p>}
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={loading}>{loading ? '驗證中...' : '登入'}</Button>
        </div>
      </Card>
    </div>
  );
};

// ============ 老師後台 ============

interface TeacherDashboardProps {
  files: WordFile[];
  profiles: Profile[];
  settings: Settings;
  customQuizzes: CustomQuiz[];
  onUploadFile: (name: string, words: Omit<Word, 'id'>[]) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onAddWords: (fileId: string, words: Omit<Word, 'id'>[]) => Promise<WordFile & { _addedCount?: number; _duplicateCount?: number }>;
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>;
  onToggleMastered: (profileId: string, wordId: string) => Promise<void>;
  onResetMastered: (profileId: string) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onCreateCustomQuiz: (data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[]; starMultiplier?: number; assignedProfileIds?: string[]; durationDays?: number }) => Promise<void>;
  onUpdateCustomQuiz: (id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean; starMultiplier: number; assignedProfileIds: string[]; durationDays: number }>) => Promise<void>;
  onDeleteCustomQuiz: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  files, profiles, settings, customQuizzes, onUploadFile, onDeleteFile, onAddWords, onUpdateSettings, onToggleMastered, onResetMastered, onDeleteProfile, onCreateCustomQuiz, onUpdateCustomQuiz, onDeleteCustomQuiz, onRefresh, onBack
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'students' | 'settings' | 'custom-quiz' | 'pet-management' | 'star-management'>('files');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<Profile | null>(null);
  const [previewFile, setPreviewFile] = useState<WordFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WordFile | null>(null);
  const [addWordsTarget, setAddWordsTarget] = useState<WordFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addWordsInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newWord, setNewWord] = useState({ english: '', chinese: '', partOfSpeech: '', exampleSentence: '' });
  const [addingWord, setAddingWord] = useState(false);
  // 批次貼上狀態
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState<Omit<Word, 'id'>[]>([]);
  const [addingBatch, setAddingBatch] = useState(false);
  // 手動建立檔案狀態
  const [manualCreateMode, setManualCreateMode] = useState(false);
  const [manualFileName, setManualFileName] = useState('');
  const [manualBatchText, setManualBatchText] = useState('');
  const [manualBatchPreview, setManualBatchPreview] = useState<Omit<Word, 'id'>[]>([]);
  const [creatingFile, setCreatingFile] = useState(false);
  // 自訂測驗狀態
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [quizFileId, setQuizFileId] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [quizQuestionTypes, setQuizQuestionTypes] = useState<number[]>([0, 1]);
  const [editingQuiz, setEditingQuiz] = useState<CustomQuiz | null>(null);
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<CustomQuiz | null>(null);
  const [quizStarMultiplier, setQuizStarMultiplier] = useState<number>(1);
  const [quizDurationDays, setQuizDurationDays] = useState<number>(3);
  // 單字編輯狀態
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editWordData, setEditWordData] = useState({ english: '', chinese: '', partOfSpeech: '', exampleSentence: '' });
  const [savingWord, setSavingWord] = useState(false);
  const [deleteWordTarget, setDeleteWordTarget] = useState<Word | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const tryReadFile = (encoding: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file, encoding);
      });
    };

    const encodings = ['UTF-8', 'Big5', 'GBK', 'GB2312', 'GB18030'];
    let bestWords: Omit<Word, 'id'>[] = [];

    for (const encoding of encodings) {
      const content = await tryReadFile(encoding);
      if (!content) continue;
      const words = parseCSV(content);
      if (words.length === 0) continue;
      const allChinese = words.map(w => w.chinese).join('');
      if (!hasGarbledText(allChinese)) {
        bestWords = words;
        break;
      }
      if (bestWords.length === 0) bestWords = words;
    }

    setUploading(false);

    if (bestWords.length > 0) {
      try {
        await onUploadFile(file.name.replace(/\.csv$/i, ''), bestWords);
        alert(`上傳成功！共 ${bestWords.length} 個單字`);
      } catch (error) {
        // 錯誤已顯示給使用者
        alert('上傳失敗！請確認伺服器連線正常。\n\n錯誤訊息：' + (error instanceof Error ? error.message : '未知錯誤'));
      }
    } else {
      alert('無法解析檔案，請確認格式為：英文,中文\n\n建議：在 Excel 存檔時選擇「CSV UTF-8」格式');
    }
    e.target.value = '';
  };

  // 處理新增單字 CSV
  const handleAddWordsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !addWordsTarget) return;

    const tryReadFile = (encoding: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file, encoding);
      });
    };

    const encodings = ['UTF-8', 'Big5', 'GBK', 'GB2312', 'GB18030'];
    let bestWords: Omit<Word, 'id'>[] = [];

    for (const encoding of encodings) {
      const content = await tryReadFile(encoding);
      if (!content) continue;
      const words = parseCSV(content);
      if (words.length === 0) continue;
      const allChinese = words.map(w => w.chinese).join('');
      if (!hasGarbledText(allChinese)) {
        bestWords = words;
        break;
      }
      if (bestWords.length === 0) bestWords = words;
    }

    if (bestWords.length > 0) {
      try {
        const result = await onAddWords(addWordsTarget.id, bestWords);
        const addedCount = (result as any)?._addedCount ?? bestWords.length;
        const duplicateCount = (result as any)?._duplicateCount ?? 0;
        if (duplicateCount > 0) {
          alert(`新增成功！\n\n新增 ${addedCount} 個單字\n跳過 ${duplicateCount} 個重複單字`);
        } else {
          alert(`新增成功！共新增 ${addedCount} 個單字`);
        }
        await onRefresh();
        setAddWordsTarget(null);
      } catch (error) {
        alert('新增失敗！' + (error instanceof Error ? error.message : '未知錯誤'));
      }
    } else {
      alert('無法解析檔案');
    }
    e.target.value = '';
  };

  // 批次貼上新增
  const handleBatchAdd = async () => {
    if (!addWordsTarget || batchPreview.length === 0) return;
    setAddingBatch(true);
    try {
      const result = await onAddWords(addWordsTarget.id, batchPreview);
      const added = (result as { _addedCount?: number })._addedCount ?? batchPreview.length;
      const duplicates = (result as { _duplicateCount?: number })._duplicateCount ?? 0;
      alert(`新增成功！共 ${added} 個單字${duplicates > 0 ? `（${duplicates} 個重複已略過）` : ''}`);
      setBatchText('');
      setBatchPreview([]);
      await onRefresh();
    } catch (error) {
      alert('新增失敗！' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setAddingBatch(false);
    }
  };

  // 手動建立檔案
  const handleManualCreateFile = async () => {
    if (!manualFileName.trim() || manualBatchPreview.length === 0) return;
    setCreatingFile(true);
    try {
      await onUploadFile(manualFileName.trim(), manualBatchPreview);
      alert(`建立成功！「${manualFileName.trim()}」共 ${manualBatchPreview.length} 個單字`);
      setManualCreateMode(false);
      setManualFileName('');
      setManualBatchText('');
      setManualBatchPreview([]);
      await onRefresh();
    } catch (error) {
      alert('建立失敗！' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setCreatingFile(false);
    }
  };

  // 手動新增單字
  const handleAddSingleWord = async () => {
    if (!addWordsTarget || !newWord.english.trim() || !newWord.chinese.trim()) return;
    setAddingWord(true);
    try {
      await onAddWords(addWordsTarget.id, [{
        english: newWord.english.trim(),
        chinese: newWord.chinese.trim(),
        partOfSpeech: newWord.partOfSpeech.trim() || undefined,
        exampleSentence: newWord.exampleSentence.trim() || undefined
      }]);
      setNewWord({ english: '', chinese: '', partOfSpeech: '', exampleSentence: '' });
      await onRefresh();
      // 更新 addWordsTarget 以顯示新單字
      const updatedFile = files.find(f => f.id === addWordsTarget.id);
      if (updatedFile) setAddWordsTarget(updatedFile);
    } catch (error) {
      alert('新增失敗！' + (error instanceof Error ? error.message : '未知錯誤'));
    }
    setAddingWord(false);
  };

  if (selectedStudent) {
    const masteredWordIds = selectedStudent.masteredWords.map(m => m.wordId);
    return (
      <StudentProgress
        student={selectedStudent}
        files={files}
        masteredWords={masteredWordIds}
        onToggleMastered={(wordId) => onToggleMastered(selectedStudent.id, wordId)}
        onResetMastered={() => onResetMastered(selectedStudent.id)}
        onBack={async () => { await onRefresh(); setSelectedStudent(null); }}
      />
    );
  }

  if (previewFile) {
    const currentPreviewFile = files.find(f => f.id === previewFile.id) || previewFile;
    const handleSaveWord = async (wordId: string) => {
      setSavingWord(true);
      try {
        await api.updateWord(wordId, {
          english: editWordData.english.trim(),
          chinese: editWordData.chinese.trim(),
          partOfSpeech: editWordData.partOfSpeech.trim() || undefined,
          exampleSentence: editWordData.exampleSentence.trim() || undefined
        });
        setEditingWordId(null);
        await onRefresh();
      } catch { alert('儲存失敗'); }
      setSavingWord(false);
    };
    const handleDeleteWord = async (wordId: string) => {
      try {
        await api.deleteWord(wordId);
        setDeleteWordTarget(null);
        await onRefresh();
      } catch { alert('刪除失敗'); }
    };
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        {deleteWordTarget && (
          <ConfirmDialog
            message={`確定要刪除「${deleteWordTarget.english}」嗎？`}
            onConfirm={() => handleDeleteWord(deleteWordTarget.id)}
            onCancel={() => setDeleteWordTarget(null)}
          />
        )}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setPreviewFile(null); setEditingWordId(null); }} className="text-slate-600 text-2xl">←</button>
            <h1 className="text-xl font-bold text-slate-700">{currentPreviewFile.name}</h1>
            <div className="w-8"></div>
          </div>
          <Card>
            <p className="text-gray-600 mb-3">共 {currentPreviewFile.words.length} 個單字（點擊編輯按鈕可修改）</p>
            <div className="max-h-[70vh] overflow-y-auto space-y-2">
              {currentPreviewFile.words.map((word, i) => (
                <div key={word.id} className="p-2 bg-gray-50 rounded">
                  {editingWordId === word.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" value={editWordData.english} onChange={e => setEditWordData({...editWordData, english: e.target.value})} placeholder="英文" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:border-gray-900 outline-none" />
                        <input type="text" value={editWordData.chinese} onChange={e => setEditWordData({...editWordData, chinese: e.target.value})} placeholder="中文" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:border-gray-900 outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={editWordData.partOfSpeech} onChange={e => setEditWordData({...editWordData, partOfSpeech: e.target.value})} placeholder="詞性（選填）" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:border-gray-900 outline-none" />
                        <input type="text" value={editWordData.exampleSentence} onChange={e => setEditWordData({...editWordData, exampleSentence: e.target.value})} placeholder="例句（選填）" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:border-gray-900 outline-none" onKeyDown={e => e.key === 'Enter' && editWordData.english.trim() && editWordData.chinese.trim() && handleSaveWord(word.id)} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingWordId(null)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">取消</button>
                        <button onClick={() => handleSaveWord(word.id)} disabled={!editWordData.english.trim() || !editWordData.chinese.trim() || savingWord} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">{savingWord ? '儲存中...' : '儲存'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1 min-w-0">
                          <span className="text-gray-500 w-8 shrink-0">{i + 1}.</span>
                          <span className="font-medium mr-2">{word.english}</span>
                          <span className="text-gray-600 truncate">{word.chinese}{word.partOfSpeech && <span className="text-gray-500 ml-1">({word.partOfSpeech})</span>}</span>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <button onClick={() => { setEditingWordId(word.id); setEditWordData({ english: word.english, chinese: word.chinese, partOfSpeech: word.partOfSpeech || '', exampleSentence: word.exampleSentence || '' }); }} className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 hover:bg-blue-50 rounded">編輯</button>
                          <button onClick={() => setDeleteWordTarget(word)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 hover:bg-red-50 rounded">刪除</button>
                        </div>
                      </div>
                      {word.exampleSentence && <div className="text-xs text-gray-400 ml-8 mt-1">{word.exampleSentence}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (addWordsTarget) {
    const currentFile = files.find(f => f.id === addWordsTarget.id) || addWordsTarget;
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setAddWordsTarget(null); setNewWord({ english: '', chinese: '', partOfSpeech: '', exampleSentence: '' }); setBatchText(''); setBatchPreview([]); }} className="text-gray-800 text-2xl">←</button>
            <h1 className="text-xl font-bold text-gray-900">新增單字到「{currentFile.name}」</h1>
            <div className="w-8"></div>
          </div>

          <Card className="mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-700">批次貼上</h2>
            <textarea
              value={batchText}
              onChange={e => { setBatchText(e.target.value); setBatchPreview(parseMultiLineInput(e.target.value)); }}
              placeholder={"apple\t蘋果\tn.\nbanana\t香蕉\tn.\nrun\t跑\tv.\n\n支援從 Excel / Google Sheets 直接貼上\n也支援逗號或空格分隔"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none font-mono text-sm"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-1">支援 Tab / 逗號 / 空格分隔，格式：英文、中文、詞性（選填）、例句（選填）</p>
            {batchPreview.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">預覽：{batchPreview.length} 個單字</p>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1 text-gray-600">英文</th>
                        <th className="text-left px-2 py-1 text-gray-600">中文</th>
                        <th className="text-left px-2 py-1 text-gray-600">詞性</th>
                        <th className="text-left px-2 py-1 text-gray-600">例句</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchPreview.map((w, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1 font-medium">{w.english}</td>
                          <td className="px-2 py-1 text-gray-600">{w.chinese}</td>
                          <td className="px-2 py-1 text-gray-500">{w.partOfSpeech || ''}</td>
                          <td className="px-2 py-1 text-gray-400 text-xs truncate max-w-[120px]" title={w.exampleSentence || ''}>{w.exampleSentence || ''}</td>
                          <td className="px-1 py-1">
                            <button
                              onClick={() => {
                                const updated = batchPreview.filter((_, idx) => idx !== i);
                                setBatchPreview(updated);
                              }}
                              className="text-red-400 hover:text-red-600 text-xs"
                            >✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={handleBatchAdd} disabled={addingBatch} variant="success" className="w-full mt-2">{addingBatch ? '新增中...' : `全部新增（${batchPreview.length} 個）`}</Button>
              </div>
            )}
          </Card>

          <Card className="mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-700">手動新增</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newWord.english} onChange={e => setNewWord({...newWord, english: e.target.value})} placeholder="英文" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none" />
                <input type="text" value={newWord.chinese} onChange={e => setNewWord({...newWord, chinese: e.target.value})} placeholder="中文" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="text" value={newWord.partOfSpeech} onChange={e => setNewWord({...newWord, partOfSpeech: e.target.value})} placeholder="詞性（選填）" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none" />
                <input type="text" value={newWord.exampleSentence} onChange={e => setNewWord({...newWord, exampleSentence: e.target.value})} placeholder="例句（選填）" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none" onKeyDown={e => e.key === 'Enter' && handleAddSingleWord()} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddSingleWord} disabled={!newWord.english.trim() || !newWord.chinese.trim() || addingWord} variant="success">{addingWord ? '新增中...' : '新增'}</Button>
              </div>
            </div>
          </Card>

          <Card className="mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-700">上傳 CSV 檔案</h2>
            <input type="file" accept=".csv,.txt" ref={addWordsInputRef} onChange={handleAddWordsCSV} className="hidden" />
            <Button onClick={() => addWordsInputRef.current?.click()} className="w-full" variant="primary">選擇檔案</Button>
            <p className="text-xs text-gray-500 mt-2 text-center">格式：英文,中文,詞性,例句（詞性與例句選填，有例句可出填空題）</p>
          </Card>

          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">目前單字（{currentFile.words.length} 個）</h2>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {currentFile.words.map((word, i) => (
                <div key={word.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 w-6">{i + 1}.</span>
                    <span className="flex-1 font-medium">{word.english}</span>
                    <span className="flex-1 text-gray-600">{word.chinese}{word.partOfSpeech && <span className="text-gray-500 ml-1">({word.partOfSpeech})</span>}</span>
                  </div>
                  {word.exampleSentence && <div className="text-xs text-gray-400 ml-6 mt-0.5">{word.exampleSentence}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {deleteTarget && (
        <ConfirmDialog
          message={`確定要刪除「${deleteTarget.name}」這個單字檔案嗎？\n\n所有學生的相關學習紀錄也會被刪除。`}
          onConfirm={async () => { await onDeleteFile(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-gray-600 text-sm px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">登出</button>
          <h1 className="text-xl font-bold text-gray-900">老師後台</h1>
          <div className="w-8"></div>
        </div>

        <div className="flex mb-4 bg-gray-200 rounded-lg p-1 flex-wrap gap-1">
          <button onClick={() => setActiveTab('files')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'files' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>單字檔案</button>
          <button onClick={() => setActiveTab('custom-quiz')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'custom-quiz' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>自訂測驗</button>
          <button onClick={() => setActiveTab('students')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'students' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>學生進度</button>
          <button onClick={() => setActiveTab('star-management')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'star-management' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>星星管理</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'settings' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>測驗設定</button>
          <button onClick={() => setActiveTab('pet-management')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'pet-management' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>寵物管理</button>
        </div>

        {activeTab === 'files' && (
          <>
            <Card className="mb-4">
              <h2 className="font-bold text-lg mb-3 text-gray-700">單字檔案管理</h2>
              <div className="flex gap-2 mb-3">
                <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} className="flex-1" variant="primary" disabled={uploading}>{uploading ? '上傳中...' : '上傳 CSV 檔案'}</Button>
                <Button onClick={() => setManualCreateMode(!manualCreateMode)} className="flex-1" variant={manualCreateMode ? 'secondary' : 'success'}>{manualCreateMode ? '收起' : '手動建立'}</Button>
              </div>
              <p className="text-xs text-gray-500 mb-3 text-center">上傳支援 UTF-8、Big5 編碼 · 手動建立可直接貼上單字</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map(f => (
                  <div key={f.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div><span className="font-medium">{f.name}</span><span className="text-sm text-gray-500 ml-2">({f.words.length} 個單字)</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewFile(f)} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 hover:bg-blue-50 rounded">編輯</button>
                        <button onClick={() => setAddWordsTarget(f)} className="text-green-500 hover:text-green-700 text-sm px-2 py-1 hover:bg-green-50 rounded">新增</button>
                      <button onClick={() => setDeleteTarget(f)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded">刪除</button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">元素：</span>
                      <select
                        value={f.category || ''}
                        onChange={async (e) => {
                          try {
                            await api.updateFileCategory(f.id, e.target.value || null);
                            await onRefresh();
                          } catch { /* ignore */ }
                        }}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white"
                      >
                        <option value="">未分類</option>
                        {DAY_ELEMENTS_ORDERED.map(el => (
                          <option key={el.key} value={el.key}>{el.emoji} {el.element}{settings.enableMonsterSystem ? ` (${el.monster})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {files.length === 0 && <p className="text-gray-500 text-center py-4">尚未上傳任何檔案</p>}
              </div>
            </Card>

            {manualCreateMode && (
              <Card>
                <h2 className="font-bold text-lg mb-3 text-gray-700">手動建立單字檔案</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">檔案名稱</label>
                    <input
                      type="text"
                      value={manualFileName}
                      onChange={e => setManualFileName(e.target.value)}
                      placeholder="輸入檔案名稱，例如：Unit 1"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">貼上單字</label>
                    <textarea
                      value={manualBatchText}
                      onChange={e => { setManualBatchText(e.target.value); setManualBatchPreview(parseMultiLineInput(e.target.value)); }}
                      placeholder={"apple\t蘋果\tn.\tI like apples.\nbanana\t香蕉\tn.\tThe banana is yellow.\nrun\t跑\tv.\tI run every morning.\n\n格式：英文、中文、詞性（選填）、例句（選填）\n支援 Tab / 逗號 / 空格分隔，可從 Excel 直接貼上"}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none font-mono text-sm"
                      rows={5}
                    />
                    <p className="text-xs text-gray-500 mt-1">支援 Tab / 逗號 / 空格分隔，格式：英文、中文、詞性（選填）、例句（選填）</p>
                  </div>
                  {manualBatchPreview.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">預覽：{manualBatchPreview.length} 個單字</p>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1 text-gray-600">英文</th>
                              <th className="text-left px-2 py-1 text-gray-600">中文</th>
                              <th className="text-left px-2 py-1 text-gray-600">詞性</th>
                              <th className="text-left px-2 py-1 text-gray-600">例句</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {manualBatchPreview.map((w, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="px-2 py-1 font-medium">{w.english}</td>
                                <td className="px-2 py-1 text-gray-600">{w.chinese}</td>
                                <td className="px-2 py-1 text-gray-500">{w.partOfSpeech || ''}</td>
                                <td className="px-2 py-1 text-gray-400 text-xs truncate max-w-[120px]" title={w.exampleSentence || ''}>{w.exampleSentence || ''}</td>
                                <td className="px-1 py-1">
                                  <button
                                    onClick={() => {
                                      const updated = manualBatchPreview.filter((_, idx) => idx !== i);
                                      setManualBatchPreview(updated);
                                    }}
                                    className="text-red-400 hover:text-red-600 text-xs"
                                  >✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleManualCreateFile}
                    disabled={!manualFileName.trim() || manualBatchPreview.length === 0 || creatingFile}
                    variant="success"
                    className="w-full"
                  >
                    {creatingFile ? '建立中...' : `建立檔案（${manualBatchPreview.length} 個單字）`}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'students' && (
          <>
          {deleteProfileTarget && (
            <ConfirmDialog
              message={`確定要刪除學生「${deleteProfileTarget.name}」嗎？所有學習紀錄、星星、寵物都會一起刪除，此操作無法復原！`}
              onConfirm={async () => {
                await onDeleteProfile(deleteProfileTarget.id);
                setDeleteProfileTarget(null);
                await onRefresh();
              }}
              onCancel={() => setDeleteProfileTarget(null)}
            />
          )}
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">學生學習狀況</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {profiles.map(student => {
                const totalCorrect = student.progress.reduce((sum, p) => sum + p.correct, 0);
                const totalWrong = student.progress.reduce((sum, p) => sum + p.wrong, 0);
                const totalQuestions = totalCorrect + totalWrong;
                const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                const sessionCount = student.quizSessions.length;
                const lastSession = student.quizSessions[student.quizSessions.length - 1];
                const weakWordCount = student.progress.reduce((sum, p) => sum + p.weakWordIds.length, 0);

                return (
                  <div key={student.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-lg">{student.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedStudent(student)} className="text-blue-500 hover:text-blue-700 text-sm px-3 py-1 hover:bg-blue-50 rounded">詳細 →</button>
                        <button onClick={() => setDeleteProfileTarget(student)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded">刪除</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">整體正確率</span><div className="font-bold text-lg text-green-600">{overallRate}%</div></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">測驗次數</span><div className="font-bold text-lg text-blue-600">{sessionCount}</div></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">待加強</span><div className="font-bold text-lg text-red-600">{weakWordCount}</div></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">最近測驗</span><div className="font-bold text-sm text-gray-700">{lastSession ? formatDate(lastSession.timestamp) : '無'}</div></div>
                    </div>
                  </div>
                );
              })}
              {profiles.length === 0 && <p className="text-gray-500 text-center py-4">尚未建立任何學生角色</p>}
            </div>
          </Card>
          </>
        )}

        {activeTab === 'star-management' && (
          <StarManagement profiles={profiles} onRefresh={onRefresh} />
        )}

        {activeTab === 'settings' && (
          <QuizSettingsPanel settings={settings} onUpdateSettings={onUpdateSettings} />
        )}

        {activeTab === 'custom-quiz' && (
          <CustomQuizManager
            files={files}
            profiles={profiles}
            customQuizzes={customQuizzes}
            creatingQuiz={creatingQuiz}
            setCreatingQuiz={setCreatingQuiz}
            quizName={quizName}
            setQuizName={setQuizName}
            quizFileId={quizFileId}
            setQuizFileId={setQuizFileId}
            selectedWordIds={selectedWordIds}
            setSelectedWordIds={setSelectedWordIds}
            quizQuestionTypes={quizQuestionTypes}
            setQuizQuestionTypes={setQuizQuestionTypes}
            editingQuiz={editingQuiz}
            setEditingQuiz={setEditingQuiz}
            deleteQuizTarget={deleteQuizTarget}
            setDeleteQuizTarget={setDeleteQuizTarget}
            onCreateCustomQuiz={onCreateCustomQuiz}
            onUpdateCustomQuiz={onUpdateCustomQuiz}
            onDeleteCustomQuiz={onDeleteCustomQuiz}
            onRefresh={onRefresh}
            quizStarMultiplier={quizStarMultiplier}
            setQuizStarMultiplier={setQuizStarMultiplier}
            quizDurationDays={quizDurationDays}
            setQuizDurationDays={setQuizDurationDays}
          />
        )}

        {activeTab === 'pet-management' && (
          <PetManagementPanel settings={settings} onUpdateSettings={onUpdateSettings} />
        )}
      </div>
    </div>
  );
};

// ============ 寵物管理面板 ============

const PET_RARITY_CONFIG = [
  { key: 'normal', label: '普通寵物', count: 10, locked: true, color: 'gray' },
  { key: 'rare', label: '稀有寵物', count: 7, locked: false, color: 'blue' },
  { key: 'legendary', label: '傳說寵物', count: 3, locked: false, color: 'yellow' },
] as const;

const SPECIES_NAMES_BY_RARITY: Record<string, string[]> = {
  normal: ['靈犬', '雛鳥', '甲蟲', '微電鼠', '硬殼蟹', '擬態蜥', '種子球', '沙丘蟲', '音波蝠', '蘑菇'],
  rare: ['幼鱗', '漂浮水母', '礦石巨人', '叢林幼獸', '雪原獸', '電路魚', '發條鳥'],
  legendary: ['天空幼龍', '水晶獸', '星雲魚'],
};

const PetManagementPanel: React.FC<{ settings: Settings; onUpdateSettings: (settings: Partial<Settings>) => Promise<void> }> = ({ settings, onUpdateSettings }) => {
  const [localRarities, setLocalRarities] = useState<string[]>(settings.unlockedPetRarities || ['normal', 'rare', 'legendary']);
  const [saved, setSaved] = useState(false);

  const handleToggle = (rarity: string) => {
    if (rarity === 'normal') return;
    const updated = localRarities.includes(rarity)
      ? localRarities.filter(r => r !== rarity)
      : [...localRarities, rarity];
    setLocalRarities(updated);
  };

  const handleSave = async () => {
    await onUpdateSettings({ unlockedPetRarities: localRarities });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <h2 className="font-bold text-lg mb-4 text-gray-700">寵物開放設定</h2>
      <p className="text-sm text-gray-500 mb-4">控制學生可以購買哪些稀有度的寵物蛋。普通寵物永遠開放。</p>
      <div className="space-y-4">
        {PET_RARITY_CONFIG.map(({ key, label, count, locked, color }) => (
          <div key={key} className={`p-4 rounded-lg border-2 ${localRarities.includes(key) ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-gray-50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localRarities.includes(key)}
                onChange={() => handleToggle(key)}
                disabled={locked}
                className="w-5 h-5 rounded text-gray-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    color === 'gray' ? 'bg-gray-200 text-gray-600' :
                    color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>{count} 隻</span>
                  {locked && <span className="text-xs text-gray-400">（永遠開放）</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1">{SPECIES_NAMES_BY_RARITY[key]?.join('、')}</p>
              </div>
            </label>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} className="w-full mt-4" variant={saved ? 'success' : 'primary'}>{saved ? '已儲存' : '儲存設定'}</Button>
    </Card>
  );
};

// ============ 範圍選取工具 ============

const RangeSelector: React.FC<{
  totalCount: number;
  onSelectRange: (start: number, end: number) => void;
  onSelectOnly: (start: number, end: number) => void;
}> = ({ totalCount, onSelectRange, onSelectOnly }) => {
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.min(100, totalCount));

  useEffect(() => {
    setRangeStart(1);
    setRangeEnd(Math.min(100, totalCount));
  }, [totalCount]);

  return (
    <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">範圍：</span>
        <span className="text-xs text-gray-600">第</span>
        <input
          type="number"
          min={1}
          max={totalCount}
          value={rangeStart}
          onChange={e => setRangeStart(Math.max(1, Math.min(Number(e.target.value), totalCount)))}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:border-gray-900 outline-none"
        />
        <span className="text-xs text-gray-600">到</span>
        <input
          type="number"
          min={1}
          max={totalCount}
          value={rangeEnd}
          onChange={e => setRangeEnd(Math.max(1, Math.min(Number(e.target.value), totalCount)))}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:border-gray-900 outline-none"
        />
        <span className="text-xs text-gray-400">個</span>
        <button
          onClick={() => onSelectOnly(Math.min(rangeStart, rangeEnd), Math.max(rangeStart, rangeEnd))}
          className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-700 transition-all"
        >
          只選此範圍
        </button>
        <button
          onClick={() => onSelectRange(Math.min(rangeStart, rangeEnd), Math.max(rangeStart, rangeEnd))}
          className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-all"
        >
          加選
        </button>
      </div>
    </div>
  );
};

// ============ 自訂測驗管理 ============

interface CustomQuizManagerProps {
  files: WordFile[];
  profiles: Profile[];
  customQuizzes: CustomQuiz[];
  creatingQuiz: boolean;
  setCreatingQuiz: (v: boolean) => void;
  quizName: string;
  setQuizName: (v: string) => void;
  quizFileId: string;
  setQuizFileId: (v: string) => void;
  selectedWordIds: string[];
  setSelectedWordIds: (v: string[]) => void;
  quizQuestionTypes: number[];
  setQuizQuestionTypes: (v: number[]) => void;
  editingQuiz: CustomQuiz | null;
  setEditingQuiz: (v: CustomQuiz | null) => void;
  deleteQuizTarget: CustomQuiz | null;
  setDeleteQuizTarget: (v: CustomQuiz | null) => void;
  onCreateCustomQuiz: (data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[]; starMultiplier?: number; assignedProfileIds?: string[]; durationDays?: number }) => Promise<void>;
  onUpdateCustomQuiz: (id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean; starMultiplier: number; assignedProfileIds: string[]; durationDays: number }>) => Promise<void>;
  onDeleteCustomQuiz: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  quizStarMultiplier: number;
  setQuizStarMultiplier: (v: number) => void;
  quizDurationDays: number;
  setQuizDurationDays: (v: number) => void;
}

const CustomQuizManager: React.FC<CustomQuizManagerProps> = ({
  files, profiles, customQuizzes, creatingQuiz, setCreatingQuiz, quizName, setQuizName, quizFileId, setQuizFileId,
  selectedWordIds, setSelectedWordIds, quizQuestionTypes, setQuizQuestionTypes,
  editingQuiz, setEditingQuiz, deleteQuizTarget, setDeleteQuizTarget,
  onCreateCustomQuiz, onUpdateCustomQuiz, onDeleteCustomQuiz, onRefresh,
  quizStarMultiplier, setQuizStarMultiplier, quizDurationDays, setQuizDurationDays
}) => {
  const [assignedProfileIds, setAssignedProfileIds] = useState<string[]>([]);
  const selectedFile = files.find(f => f.id === quizFileId);
  const questionTypeLabels = [
    { type: 0, label: '看中文選英文' },
    { type: 1, label: '看英文選中文' },
    { type: 2, label: '看中文寫英文' },
    { type: 3, label: '看英文寫中文' },
    { type: 4, label: '聽英文選中文' },
    { type: 5, label: '聽英文寫英文' },
    { type: 6, label: '看例句填空' },
    { type: 7, label: '看例句選答案' }
  ];

  const resetForm = () => {
    setQuizName('');
    setQuizFileId('');
    setSelectedWordIds([]);
    setQuizQuestionTypes([0, 1]);
    setQuizStarMultiplier(1);
    setQuizDurationDays(3);
    setAssignedProfileIds([]);
    setCreatingQuiz(false);
    setEditingQuiz(null);
  };

  const handleStartEdit = (quiz: CustomQuiz) => {
    setEditingQuiz(quiz);
    setQuizName(quiz.name);
    setQuizFileId(quiz.fileId);
    setSelectedWordIds([...quiz.wordIds]);
    setQuizQuestionTypes([...quiz.questionTypes]);
    setQuizStarMultiplier(quiz.starMultiplier || 1);
    // 從 expiresAt 反算：null = 永不過期(0)，否則取最接近的天數選項
    if (!quiz.expiresAt) {
      setQuizDurationDays(0);
    } else {
      const remaining = (new Date(quiz.expiresAt).getTime() - Date.now()) / 86400000;
      if (remaining <= 0) setQuizDurationDays(1);
      else if (remaining <= 1.5) setQuizDurationDays(1);
      else if (remaining <= 2.5) setQuizDurationDays(2);
      else if (remaining <= 4) setQuizDurationDays(3);
      else if (remaining <= 6) setQuizDurationDays(5);
      else setQuizDurationDays(7);
    }
    setAssignedProfileIds([...(quiz.assignedProfileIds || [])]);
    setCreatingQuiz(true);
  };

  const handleSave = async () => {
    if (!quizName.trim() || !quizFileId || selectedWordIds.length === 0 || quizQuestionTypes.length === 0) {
      alert('請填寫完整資訊：測驗名稱、選擇單字、啟用題型');
      return;
    }
    try {
      if (editingQuiz) {
        await onUpdateCustomQuiz(editingQuiz.id, {
          name: quizName.trim(),
          wordIds: selectedWordIds,
          questionTypes: quizQuestionTypes,
          starMultiplier: quizStarMultiplier,
          assignedProfileIds,
          durationDays: quizDurationDays
        });
      } else {
        await onCreateCustomQuiz({
          name: quizName.trim(),
          fileId: quizFileId,
          wordIds: selectedWordIds,
          questionTypes: quizQuestionTypes,
          starMultiplier: quizStarMultiplier > 1 ? quizStarMultiplier : undefined,
          assignedProfileIds: assignedProfileIds.length > 0 ? assignedProfileIds : undefined,
          durationDays: quizDurationDays
        });
      }
      resetForm();
      await onRefresh();
    } catch (error) {
      alert('儲存失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  const handleDelete = async () => {
    if (!deleteQuizTarget) return;
    try {
      await onDeleteCustomQuiz(deleteQuizTarget.id);
      setDeleteQuizTarget(null);
      await onRefresh();
    } catch (error) {
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  const toggleWordSelection = (wordId: string) => {
    if (selectedWordIds.includes(wordId)) {
      setSelectedWordIds(selectedWordIds.filter(id => id !== wordId));
    } else {
      setSelectedWordIds([...selectedWordIds, wordId]);
    }
  };

  const toggleAllWords = () => {
    if (!selectedFile) return;
    if (selectedWordIds.length === selectedFile.words.length) {
      setSelectedWordIds([]);
    } else {
      setSelectedWordIds(selectedFile.words.map(w => w.id));
    }
  };

  const toggleQuizType = (type: number) => {
    if (quizQuestionTypes.includes(type)) {
      if (quizQuestionTypes.length > 1) {
        setQuizQuestionTypes(quizQuestionTypes.filter(t => t !== type));
      }
    } else {
      setQuizQuestionTypes([...quizQuestionTypes, type].sort());
    }
  };

  // 建立/編輯介面
  if (creatingQuiz) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-700">{editingQuiz ? '編輯自訂測驗' : '建立自訂測驗'}</h2>
          <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">測驗名稱</label>
            <input
              type="text"
              value={quizName}
              onChange={e => setQuizName(e.target.value)}
              placeholder="輸入測驗名稱"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選擇單字檔案</label>
            <select
              value={quizFileId}
              onChange={e => { setQuizFileId(e.target.value); setSelectedWordIds([]); }}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none"
              disabled={!!editingQuiz}
            >
              <option value="">-- 選擇檔案 --</option>
              {files.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.words.length} 個單字)</option>
              ))}
            </select>
          </div>

          {selectedFile && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">選擇單字 ({selectedWordIds.length}/{selectedFile.words.length})</label>
                <button onClick={toggleAllWords} className="text-sm text-gray-700 hover:text-gray-900">
                  {selectedWordIds.length === selectedFile.words.length ? '取消全選' : '全選'}
                </button>
              </div>
              {/* 範圍快速選取 */}
              <RangeSelector
                totalCount={selectedFile.words.length}
                onSelectRange={(start, end) => {
                  const rangeIds = selectedFile.words.slice(start - 1, end).map(w => w.id);
                  const merged = [...new Set([...selectedWordIds, ...rangeIds])];
                  setSelectedWordIds(merged);
                }}
                onSelectOnly={(start, end) => {
                  setSelectedWordIds(selectedFile.words.slice(start - 1, end).map(w => w.id));
                }}
              />
              <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-lg p-2 space-y-1">
                {selectedFile.words.map((word, idx) => (
                  <label key={word.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedWordIds.includes(word.id) ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={selectedWordIds.includes(word.id)}
                      onChange={() => toggleWordSelection(word.id)}
                      className="w-4 h-4 rounded text-gray-500"
                    />
                    <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}</span>
                    <span className="font-medium">{word.english}</span>
                    <span className="text-gray-500">= {word.chinese}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">啟用題型（至少選一個）</label>
            <div className="space-y-2">
              {questionTypeLabels.map(({ type, label }) => {
                const isListeningType = type === 4 || type === 5;
                const speechSupported = 'speechSynthesis' in window;
                const isDisabled = isListeningType && !speechSupported;
                return (
                  <label key={type} className={`flex items-center gap-2 ${isDisabled ? '' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={quizQuestionTypes.includes(type)}
                      onChange={() => toggleQuizType(type)}
                      className="w-5 h-5 rounded text-gray-500"
                      disabled={isDisabled}
                    />
                    <span className={isDisabled ? 'text-gray-400' : ''}>{label}</span>
                    {isDisabled && <span className="text-xs text-red-500">（不支援）</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">測驗期限</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { days: 1, label: '1 天' },
                { days: 2, label: '2 天' },
                { days: 3, label: '3 天' },
                { days: 5, label: '5 天' },
                { days: 7, label: '7 天' },
                { days: 0, label: '永不過期' }
              ].map(({ days, label }) => (
                <button
                  key={days}
                  onClick={() => setQuizDurationDays(days)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${quizDurationDays === days ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {quizDurationDays > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                {editingQuiz
                  ? `測驗將從現在起 ${quizDurationDays} 天後過期`
                  : `測驗將在建立後 ${quizDurationDays} 天自動過期`
                }
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">星星倍率</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 1.5, 2, 3].map(multiplier => (
                <button
                  key={multiplier}
                  onClick={() => setQuizStarMultiplier(multiplier)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${quizStarMultiplier === multiplier ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {multiplier}x
                </button>
              ))}
            </div>
            {quizStarMultiplier > 1 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                學生完成此測驗可獲得 {quizStarMultiplier}x 星星獎勵
              </div>
            )}
          </div>

          {/* 指定學生 */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                指定學生
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {assignedProfileIds.length === 0 ? '全體學生' : `已選 ${assignedProfileIds.length} 位`}
                </span>
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setAssignedProfileIds([])}
                  className={`text-xs px-3 py-1 rounded-lg transition-all ${
                    assignedProfileIds.length === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全體學生
                </button>
                <button
                  onClick={() => setAssignedProfileIds(profiles.map(p => p.id))}
                  className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  全選
                </button>
                {assignedProfileIds.length > 0 && (
                  <button
                    onClick={() => setAssignedProfileIds([])}
                    className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto border-2 border-gray-200 rounded-lg p-2 space-y-1">
                {profiles.map(p => (
                  <label key={p.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${assignedProfileIds.includes(p.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={assignedProfileIds.includes(p.id)}
                      onChange={() => {
                        if (assignedProfileIds.includes(p.id)) {
                          setAssignedProfileIds(assignedProfileIds.filter(id => id !== p.id));
                        } else {
                          setAssignedProfileIds([...assignedProfileIds, p.id]);
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-500"
                    />
                    <span className="text-sm">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={resetForm} variant="secondary" className="flex-1">取消</Button>
            <Button onClick={handleSave} variant="primary" className="flex-1">{editingQuiz ? '更新' : '建立'}</Button>
          </div>
        </div>
      </Card>
    );
  }

  // 列表介面
  return (
    <>
      {deleteQuizTarget && (
        <ConfirmDialog
          message={`確定要刪除「${deleteQuizTarget.name}」這個自訂測驗嗎？`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteQuizTarget(null)}
        />
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-700">自訂測驗管理</h2>
          <Button onClick={() => setCreatingQuiz(true)} variant="primary" className="text-sm">+ 新增測驗</Button>
        </div>

        {customQuizzes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>尚未建立任何自訂測驗</p>
            <p className="text-sm mt-1">點擊「新增測驗」來建立第一個自訂測驗</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customQuizzes.map(quiz => {
              const file = files.find(f => f.id === quiz.fileId);
              const typeLabels = quiz.questionTypes.map(t => questionTypeLabels.find(q => q.type === t)?.label || '').join('、');
              const isExpired = quiz.expiresAt ? new Date(quiz.expiresAt).getTime() < Date.now() : false;
              const getExpiryText = () => {
                if (!quiz.expiresAt) return '永不過期';
                const remaining = new Date(quiz.expiresAt).getTime() - Date.now();
                if (remaining <= 0) return '已過期';
                const days = remaining / 86400000;
                if (days < 1) {
                  const hours = Math.ceil(remaining / 3600000);
                  return `剩餘 ${hours} 小時`;
                }
                return `剩餘 ${Math.ceil(days)} 天`;
              };
              return (
                <div key={quiz.id} className={`p-3 rounded-lg border-2 ${isExpired ? 'bg-gray-100 border-gray-300 opacity-60' : quiz.active ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-lg ${isExpired ? 'text-gray-400' : ''}`}>{quiz.name}</span>
                      {quiz.starMultiplier > 1 && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-bold">{quiz.starMultiplier}x</span>}
                      {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">已過期</span>}
                      {!quiz.active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">已停用</span>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onUpdateCustomQuiz(quiz.id, { active: !quiz.active }).then(onRefresh)}
                        className={`text-sm px-2 py-1 rounded ${quiz.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {quiz.active ? '停用' : '啟用'}
                      </button>
                      <button onClick={() => handleStartEdit(quiz)} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 hover:bg-blue-50 rounded">編輯</button>
                      <button onClick={() => setDeleteQuizTarget(quiz)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded">刪除</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>來源：{file?.name || '(已刪除)'}</p>
                    <p>單字數：{quiz.wordIds.length} 個</p>
                    <p>題型：{typeLabels}</p>
                    <p>期限：<span className={isExpired ? 'text-red-500 font-medium' : quiz.expiresAt ? 'text-blue-600' : 'text-gray-400'}>{getExpiryText()}</span></p>
                    <p>對象：{!quiz.assignedProfileIds || quiz.assignedProfileIds.length === 0
                      ? '全體學生'
                      : quiz.assignedProfileIds.map(id => profiles.find(p => p.id === id)?.name || '?').join('、')
                    }</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
};

// ============ 星星管理面板（全學生集中管理） ============

interface StarManagementProps {
  profiles: Profile[];
  onRefresh: () => Promise<void>;
}

const StarManagement: React.FC<StarManagementProps> = ({ profiles, onRefresh }) => {
  // 每個學生的本地星星數量（即時更新不需 re-fetch）
  const [localStars, setLocalStars] = useState<Record<string, number>>(() =>
    Object.fromEntries(profiles.map(p => [p.id, p.stars]))
  );
  // 展開的學生 ID（顯示歷史）
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 展開的自訂金額輸入
  const [customInputId, setCustomInputId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [customReason, setCustomReason] = useState('');
  // 調整歷史
  const [adjustments, setAdjustments] = useState<Record<string, StarAdjustment[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  // 編輯中的紀錄
  const [editingAdj, setEditingAdj] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  // 刪除確認
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // 操作中
  const [busy, setBusy] = useState(false);

  // 同步 profiles 的星星數量
  useEffect(() => {
    setLocalStars(Object.fromEntries(profiles.map(p => [p.id, p.stars])));
  }, [profiles]);

  // 載入調整歷史
  const loadHistory = async (profileId: string) => {
    setLoadingHistory(profileId);
    try {
      const data = await api.getStarAdjustments(profileId);
      setAdjustments(prev => ({ ...prev, [profileId]: data }));
    } catch { /* ignore */ }
    setLoadingHistory(null);
  };

  // 切換展開
  const toggleExpand = (profileId: string) => {
    if (expandedId === profileId) {
      setExpandedId(null);
    } else {
      setExpandedId(profileId);
      if (!adjustments[profileId]) loadHistory(profileId);
    }
  };

  // 快速加減
  const quickAdjust = async (profileId: string, amount: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.adjustStars(profileId, amount);
      setLocalStars(prev => ({ ...prev, [profileId]: result.newStars }));
      // 如果歷史已載入，加入新紀錄
      if (adjustments[profileId]) {
        setAdjustments(prev => ({
          ...prev,
          [profileId]: [result.adjustment, ...prev[profileId]]
        }));
      }
    } catch { alert('調整失敗'); }
    setBusy(false);
  };

  // 自訂金額
  const submitCustom = async (profileId: string) => {
    const amount = parseInt(customAmount, 10);
    if (!Number.isInteger(amount) || amount === 0) { alert('請輸入非零整數'); return; }
    setBusy(true);
    try {
      const result = await api.adjustStars(profileId, amount, customReason.trim() || undefined);
      setLocalStars(prev => ({ ...prev, [profileId]: result.newStars }));
      if (adjustments[profileId]) {
        setAdjustments(prev => ({
          ...prev,
          [profileId]: [result.adjustment, ...prev[profileId]]
        }));
      }
      setCustomAmount('');
      setCustomReason('');
      setCustomInputId(null);
    } catch { alert('調整失敗'); }
    setBusy(false);
  };

  // 刪除調整紀錄
  const handleDeleteAdj = async (adj: StarAdjustment) => {
    setBusy(true);
    try {
      const result = await api.deleteStarAdjustment(adj.id);
      setLocalStars(prev => ({ ...prev, [adj.profileId]: result.newStars }));
      setAdjustments(prev => ({
        ...prev,
        [adj.profileId]: prev[adj.profileId].filter(a => a.id !== adj.id)
      }));
      setDeleteConfirmId(null);
    } catch { alert('刪除失敗'); }
    setBusy(false);
  };

  // 更新調整原因
  const handleUpdateReason = async (adjId: string, profileId: string) => {
    if (!editReason.trim()) { alert('原因不能為空'); return; }
    setBusy(true);
    try {
      const updated = await api.updateStarAdjustment(adjId, editReason.trim());
      setAdjustments(prev => ({
        ...prev,
        [profileId]: prev[profileId].map(a => a.id === adjId ? { ...a, reason: updated.reason } : a)
      }));
      setEditingAdj(null);
      setEditReason('');
    } catch { alert('更新失敗'); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      {/* 全班總覽標題 */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg text-gray-700">星星管理</h2>
          <button onClick={onRefresh} className="text-sm text-gray-500 hover:text-gray-800">重新整理</button>
        </div>
        <p className="text-xs text-gray-500">點擊按鈕直接加減星星，展開可查看與編輯歷史紀錄</p>
      </Card>

      {profiles.length === 0 && (
        <Card><p className="text-gray-500 text-center py-4">尚未建立任何學生</p></Card>
      )}

      {/* 學生卡片列表 */}
      {profiles.map(student => {
        const stars = localStars[student.id] ?? student.stars;
        const isExpanded = expandedId === student.id;
        const showCustom = customInputId === student.id;
        const history = adjustments[student.id] || [];

        return (
          <Card key={student.id} className="!p-3">
            {/* 學生基本資訊行 */}
            <div className="flex items-center gap-3 mb-2">
              <Avatar name={student.name} equippedFrame={student.equippedFrame} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">{student.name}</div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-bold text-lg shrink-0">
                ⭐ {stars}
              </div>
            </div>

            {/* 快速加減按鈕 — 2 排 */}
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {[1, 2, 3, 5, 10, 20].map(n => (
                <button
                  key={`add-${n}`}
                  onClick={() => quickAdjust(student.id, n)}
                  disabled={busy}
                  className="py-2.5 rounded-lg font-bold text-sm text-white bg-green-500 hover:bg-green-600 active:scale-95 transition-all disabled:opacity-40"
                >
                  +{n}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {[1, 2, 3, 5, 10, 20].map(n => (
                <button
                  key={`sub-${n}`}
                  onClick={() => quickAdjust(student.id, -n)}
                  disabled={busy}
                  className="py-2.5 rounded-lg font-bold text-sm text-white bg-red-400 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-40"
                >
                  -{n}
                </button>
              ))}
            </div>

            {/* 操作列：自訂 / 歷史 */}
            <div className="flex gap-2">
              <button
                onClick={() => { setCustomInputId(showCustom ? null : student.id); setCustomAmount(''); setCustomReason(''); }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${showCustom ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {showCustom ? '收起' : '自訂金額'}
              </button>
              <button
                onClick={() => toggleExpand(student.id)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {isExpanded ? '收起歷史' : '調整歷史'}
                {history.length > 0 && !isExpanded && <span className="ml-1 text-xs opacity-60">({history.length})</span>}
              </button>
            </div>

            {/* 自訂金額面板 */}
            {showCustom && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    placeholder="數量"
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none text-center font-bold"
                  />
                  <button
                    onClick={() => submitCustom(student.id)}
                    disabled={busy || !customAmount}
                    className={`px-5 py-2 rounded-lg font-bold text-white transition-all ${busy || !customAmount ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-800 active:scale-95'}`}
                  >
                    確定
                  </button>
                </div>
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="原因（選填）"
                  className="w-full px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none text-sm"
                  onKeyDown={e => e.key === 'Enter' && submitCustom(student.id)}
                />
              </div>
            )}

            {/* 歷史紀錄面板 */}
            {isExpanded && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                {loadingHistory === student.id ? (
                  <p className="text-center text-gray-500 text-sm py-2">載入中...</p>
                ) : history.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-2">無調整紀錄</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {history.map(adj => (
                      <div key={adj.id} className="flex items-center gap-2 p-2 bg-white rounded-lg text-sm">
                        {/* 金額 */}
                        <div className={`font-bold w-14 text-center shrink-0 ${adj.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {adj.amount > 0 ? '+' : ''}{adj.amount}
                        </div>

                        {/* 原因 + 日期 */}
                        <div className="flex-1 min-w-0">
                          {editingAdj === adj.id ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editReason}
                                onChange={e => setEditReason(e.target.value)}
                                className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-sm outline-none"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleUpdateReason(adj.id, adj.profileId);
                                  if (e.key === 'Escape') { setEditingAdj(null); setEditReason(''); }
                                }}
                              />
                              <button onClick={() => handleUpdateReason(adj.id, adj.profileId)} className="text-green-600 hover:text-green-800 text-xs px-1">✓</button>
                              <button onClick={() => { setEditingAdj(null); setEditReason(''); }} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
                            </div>
                          ) : (
                            <>
                              <div className="text-gray-700 truncate">{adj.reason}</div>
                              <div className="text-xs text-gray-400">{formatDate(adj.adjustedAt)}</div>
                            </>
                          )}
                        </div>

                        {/* 操作按鈕 */}
                        {editingAdj !== adj.id && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingAdj(adj.id); setEditReason(adj.reason); }}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="編輯原因"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            {deleteConfirmId === adj.id ? (
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => handleDeleteAdj(adj)}
                                  disabled={busy}
                                  className="px-1.5 py-0.5 bg-red-500 text-white rounded text-xs font-medium"
                                >
                                  確認
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-gray-300 text-gray-700 rounded text-xs"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(adj.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="刪除（回滾星星）"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// ============ 測驗設定面板 ============

const QuizSettingsPanel: React.FC<{ settings: Settings; onUpdateSettings: (settings: Partial<Settings>) => Promise<void> }> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const choiceTimeOptions = [5, 10, 15, 20];
  const spellingTimeOptions = [20, 30, 45, 60];
  const countOptions = [0, 10, 20, 30, 50];

  const handleSave = async () => {
    await onUpdateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleQuestionType = (type: number) => {
    const types = localSettings.questionTypes;
    if (types.includes(type)) {
      if (types.length > 1) setLocalSettings({ ...localSettings, questionTypes: types.filter(t => t !== type) });
    } else {
      setLocalSettings({ ...localSettings, questionTypes: [...types, type].sort() });
    }
  };

  return (
    <Card>
      <h2 className="font-bold text-lg mb-4 text-gray-700">測驗設定</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">選擇題作答時間</label>
          <p className="text-xs text-gray-500 mb-2">適用於：看中文選英文、看英文選中文</p>
          <div className="flex flex-wrap gap-2">
            {choiceTimeOptions.map(time => (
              <button key={time} onClick={() => setLocalSettings({ ...localSettings, timeChoiceQuestion: time })} className={`px-4 py-2 rounded-lg font-medium transition-all ${localSettings.timeChoiceQuestion === time ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{time} 秒</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">拼寫題作答時間</label>
          <p className="text-xs text-gray-500 mb-2">適用於：看中文寫英文、看英文寫中文</p>
          <div className="flex flex-wrap gap-2">
            {spellingTimeOptions.map(time => (
              <button key={time} onClick={() => setLocalSettings({ ...localSettings, timeSpellingQuestion: time })} className={`px-4 py-2 rounded-lg font-medium transition-all ${localSettings.timeSpellingQuestion === time ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{time} 秒</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">題目數量</label>
          <div className="flex flex-wrap gap-2">
            {countOptions.map(count => (
              <button key={count} onClick={() => setLocalSettings({ ...localSettings, questionCount: count })} className={`px-4 py-2 rounded-lg font-medium transition-all ${localSettings.questionCount === count ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{count === 0 ? '全部' : `${count} 題`}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">啟用題型（至少選一個）</label>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">選擇題</p>
            {[{ type: 0, label: '看中文選英文' }, { type: 1, label: '看英文選中文' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-gray-500" />
                <span>{label}</span>
              </label>
            ))}
            <p className="text-xs text-gray-500 mt-3">拼寫題</p>
            {[{ type: 2, label: '看中文寫英文' }, { type: 3, label: '看英文寫中文' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-gray-500" />
                <span>{label}</span>
              </label>
            ))}
            <p className="text-xs text-gray-500 mt-3">聽力題</p>
            {!('speechSynthesis' in window) && (
              <p className="text-xs text-red-500 mb-1">⚠️ 您的瀏覽器不支援語音功能</p>
            )}
            {[{ type: 4, label: '聽英文選中文' }, { type: 5, label: '聽英文寫英文' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-gray-500" disabled={!('speechSynthesis' in window)} />
                <span className={!('speechSynthesis' in window) ? 'text-gray-400' : ''}>{label}</span>
              </label>
            ))}
            <p className="text-xs text-gray-500 mt-3">填空題</p>
            {[{ type: 6, label: '看例句填空' }, { type: 7, label: '看例句選答案' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-gray-500" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">進階系統開關</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={localSettings.enableMonsterSystem} onChange={e => setLocalSettings({ ...localSettings, enableMonsterSystem: e.target.checked })} className="w-5 h-5 rounded text-gray-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">元素怪物系統</span>
                <p className="text-xs text-gray-500">寵物助陣顯示屬性相剋</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={localSettings.enableComboSystem} onChange={e => setLocalSettings({ ...localSettings, enableComboSystem: e.target.checked })} className="w-5 h-5 rounded text-gray-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">Combo 連續答對獎勵</span>
                <p className="text-xs text-gray-500">連續答對 3/5/7/10/15/20 題可獲得額外星星</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={localSettings.enableNewEquipment} onChange={e => setLocalSettings({ ...localSettings, enableNewEquipment: e.target.checked })} className="w-5 h-5 rounded text-gray-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">套裝/專屬裝備</span>
                <p className="text-xs text-gray-500">開箱可獲得套裝裝備（集齊有被動效果）和寵物專屬裝備</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={localSettings.enablePetStarBonus} onChange={e => setLocalSettings({ ...localSettings, enablePetStarBonus: e.target.checked })} className="w-5 h-5 rounded text-gray-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">寵物等級星星加成</span>
                <p className="text-xs text-gray-500">寵物等級越高、階段越高，測驗星星加成越多（最高 45%）</p>
              </div>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">老師密碼</label>
          <input type="text" value={localSettings.teacherPassword} onChange={e => setLocalSettings({ ...localSettings, teacherPassword: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none" placeholder="輸入新密碼" />
        </div>
        <Button onClick={handleSave} className="w-full" variant={saved ? 'success' : 'primary'}>{saved ? '已儲存' : '儲存設定'}</Button>
      </div>
    </Card>
  );
};

// ============ 學生進度詳情 ============

interface StudentProgressProps {
  student: Profile;
  files: WordFile[];
  masteredWords: string[];
  onToggleMastered: (wordId: string) => Promise<void>;
  onResetMastered: () => Promise<void>;
  onBack: () => void;
}

const StudentProgress: React.FC<StudentProgressProps> = ({ student, files, masteredWords, onToggleMastered, onResetMastered, onBack }) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'history' | 'mastered' | 'stars'>('progress');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [starAdjustAmount, setStarAdjustAmount] = useState<string>('');
  const [starAdjustReason, setStarAdjustReason] = useState('');
  const [starAdjustments, setStarAdjustments] = useState<StarAdjustment[]>([]);
  const [starAdjustLoading, setStarAdjustLoading] = useState(false);
  const [currentStars, setCurrentStars] = useState(student.stars);

  useEffect(() => {
    if (activeTab === 'stars') {
      api.getStarAdjustments(student.id).then(setStarAdjustments).catch(() => {});
    }
  }, [activeTab, student.id]);

  const getProgressForFile = (fileId: string): { correct: number; wrong: number; weakWordIds: string[]; history: HistoryEntry[] } =>
    student.progress.find(p => p.fileId === fileId) || { correct: 0, wrong: 0, weakWordIds: [] as string[], history: [] as HistoryEntry[] };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {resetConfirm && (
        <ConfirmDialog message={`確定要重置「${student.name}」的所有已精熟單字嗎？\n\n這些單字會重新出現在測驗中。`} onConfirm={async () => { await onResetMastered(); setResetConfirm(false); }} onCancel={() => setResetConfirm(false)} />
      )}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-gray-800 text-2xl">←</button>
          <h1 className="text-xl font-bold text-gray-900">{student.name} 的學習紀錄</h1>
          <div className="w-8"></div>
        </div>
        <div className="flex mb-4 bg-gray-200 rounded-lg p-1">
          <button onClick={() => setActiveTab('progress')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'progress' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>檔案進度</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>測驗歷史</button>
          <button onClick={() => setActiveTab('mastered')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'mastered' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>已精熟</button>
          <button onClick={() => setActiveTab('stars')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'stars' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>星星管理</button>
        </div>

        {activeTab === 'progress' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">各檔案正確率</h2>
            <div className="space-y-3">
              {files.map(file => {
                const progress = getProgressForFile(file.id);
                const total = progress.correct + progress.wrong;
                const rate = total > 0 ? Math.round((progress.correct / total) * 100) : 0;
                return (
                  <div key={file.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2"><span className="font-medium">{file.name}</span><span className="text-sm text-gray-500">{file.words.length} 單字</span></div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${rate}%` }}></div></div>
                      <span className="font-bold text-lg w-12 text-right">{rate}%</span>
                    </div>
                    <div className="text-sm text-gray-500">答對 {progress.correct} / 答錯 {progress.wrong} · 待加強 {progress.weakWordIds.length} 個</div>
                  </div>
                );
              })}
              {files.length === 0 && <p className="text-gray-500 text-center py-4">尚無檔案</p>}
            </div>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">測驗歷史</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {student.quizSessions.slice().reverse().map(session => {
                const file = files.find(f => f.id === session.fileId);
                const correctCount = session.results.filter(r => r.correct).length;
                const rate = session.results.length > 0 ? Math.round((correctCount / session.results.length) * 100) : 0;
                return (
                  <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{file?.name || '已刪除的檔案'}</span>
                      <span className={`px-2 py-0.5 rounded text-sm ${session.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{session.completed ? '完成' : '中斷'}</span>
                    </div>
                    <div className="text-sm text-gray-600">{formatDate(session.timestamp)} · {correctCount}/{session.results.length} 正確 ({rate}%) · {formatDuration(session.duration)}</div>
                  </div>
                );
              })}
              {student.quizSessions.length === 0 && <p className="text-gray-500 text-center py-4">尚無測驗紀錄</p>}
            </div>
          </Card>
        )}

        {activeTab === 'mastered' && (
          <Card>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg text-gray-700">已精熟單字 ({masteredWords.length})</h2>
              {masteredWords.length > 0 && <button onClick={() => setResetConfirm(true)} className="text-red-500 hover:text-red-700 text-sm">全部重置</button>}
            </div>
            <p className="text-sm text-gray-500 mb-3">已精熟的單字不會出現在測驗中。點擊單字可取消精熟狀態。</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map(file => {
                const fileMasteredWords = file.words.filter(w => masteredWords.includes(w.id));
                if (fileMasteredWords.length === 0) return null;
                return (
                  <div key={file.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-sm text-gray-600 mb-2">{file.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {fileMasteredWords.map(word => (
                        <button key={word.id} onClick={() => onToggleMastered(word.id)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors">{word.english}{word.partOfSpeech ? ` (${word.partOfSpeech})` : ''}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {masteredWords.length === 0 && <p className="text-gray-500 text-center py-4">尚未有已精熟單字</p>}
            </div>
          </Card>
        )}

        {activeTab === 'stars' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">星星管理</h2>
            <div className="bg-yellow-50 rounded-lg p-4 mb-4 text-center">
              <div className="text-sm text-yellow-600 mb-1">目前星星</div>
              <div className="text-3xl font-bold text-yellow-600">{currentStars} <span className="text-xl">⭐</span></div>
            </div>

            {/* 快速加減按鈕 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-700 mb-3">快速加減</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 3, 5].map(n => (
                  <button
                    key={`add-${n}`}
                    onClick={async () => {
                      setStarAdjustLoading(true);
                      try {
                        const result = await api.adjustStars(student.id, n);
                        setCurrentStars(result.newStars);
                        setStarAdjustments(prev => [result.adjustment, ...prev]);
                      } catch { alert('調整失敗'); }
                      finally { setStarAdjustLoading(false); }
                    }}
                    disabled={starAdjustLoading}
                    className="py-3 rounded-xl font-bold text-lg text-white bg-green-500 hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50"
                  >
                    +{n} ⭐
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5].map(n => (
                  <button
                    key={`sub-${n}`}
                    onClick={async () => {
                      setStarAdjustLoading(true);
                      try {
                        const result = await api.adjustStars(student.id, -n);
                        setCurrentStars(result.newStars);
                        setStarAdjustments(prev => [result.adjustment, ...prev]);
                      } catch { alert('調整失敗'); }
                      finally { setStarAdjustLoading(false); }
                    }}
                    disabled={starAdjustLoading}
                    className="py-3 rounded-xl font-bold text-lg text-white bg-red-400 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50"
                  >
                    -{n} ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* 自訂金額 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-700 mb-3">自訂金額</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={starAdjustAmount}
                  onChange={e => setStarAdjustAmount(e.target.value)}
                  placeholder="數量（正=加 負=扣）"
                  className="flex-1 px-3 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none text-center text-lg"
                />
                <button
                  onClick={async () => {
                    const amount = parseInt(starAdjustAmount, 10);
                    if (!Number.isInteger(amount) || amount === 0) { alert('請輸入非零整數'); return; }
                    setStarAdjustLoading(true);
                    try {
                      const result = await api.adjustStars(student.id, amount, starAdjustReason.trim() || undefined);
                      setCurrentStars(result.newStars);
                      setStarAdjustments(prev => [result.adjustment, ...prev]);
                      setStarAdjustAmount('');
                      setStarAdjustReason('');
                    } catch { alert('調整失敗'); }
                    finally { setStarAdjustLoading(false); }
                  }}
                  disabled={starAdjustLoading || !starAdjustAmount}
                  className={`px-5 py-3 rounded-lg font-bold text-white transition-all ${starAdjustLoading || !starAdjustAmount ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-800 active:scale-95'}`}
                >
                  確定
                </button>
              </div>
              <input
                type="text"
                value={starAdjustReason}
                onChange={e => setStarAdjustReason(e.target.value)}
                placeholder="原因（選填）"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none text-sm"
              />
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">調整歷史</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {starAdjustments.map(adj => (
                  <div key={adj.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{adj.reason}</div>
                      <div className="text-xs text-gray-500">{formatDate(adj.adjustedAt)}</div>
                    </div>
                    <div className={`font-bold ${adj.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adj.amount > 0 ? '+' : ''}{adj.amount} ⭐
                    </div>
                  </div>
                ))}
                {starAdjustments.length === 0 && <p className="text-gray-500 text-center py-4">尚無調整紀錄</p>}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============ 學生角色選擇畫面 ============

interface StudentLoginScreenProps {
  onLogin: (profile: Profile) => void;
  onBack: () => void;
}

const StudentLoginScreen: React.FC<StudentLoginScreenProps> = ({ onLogin, onBack }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.studentLogin(name.trim(), password || undefined);
      if (result.notFound) {
        setError('找不到此名字，請先建立帳號');
      } else if (result.wrongPassword) {
        setError('密碼錯誤');
      } else if (result.success && result.profile) {
        onLogin(result.profile);
      }
    } catch {
      setError('登入失敗，請稍後再試');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.studentRegister(name.trim(), password || undefined);
      if (result.duplicate) {
        setError('此名字已被使用，請直接登入或使用其他名字');
      } else if (result.success && result.profile) {
        onLogin(result.profile);
      }
    } catch {
      setError('建立帳號失敗，請稍後再試');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md border border-gray-200">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mb-4">← 返回</button>
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">英文單字練習</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">輸入你的名字</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="你的名字"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none text-lg"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼（選填）</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="輸入密碼或留空"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={handleLogin} disabled={!name.trim() || loading} className="flex-1" variant="primary">
              {loading ? '處理中...' : '登入'}
            </Button>
            <Button onClick={handleRegister} disabled={!name.trim() || loading} className="flex-1" variant="success">
              {loading ? '處理中...' : '建立新帳號'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============ 學習旅程組件 ============

interface LearningJourneyProps {
  profile: Profile;
  files: WordFile[];
  weeklyChallenge: WeeklyChallenge | null;
  onClaimWeeklyReward: () => void;
  claimingReward: boolean;
}

const LearningJourney: React.FC<LearningJourneyProps> = ({ profile, files, weeklyChallenge, onClaimWeeklyReward, claimingReward }) => {
  // 計算統計數據
  const totalWords = files.flatMap(f => f.words).length;
  const masteredCount = profile.masteredWords.length;
  const masteryRate = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // 計算本週精熟的單字
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 週一為一週開始
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekStart = getWeekStart(new Date());
  const weekMasteredWords = profile.masteredWords.filter(m => {
    const masteredDate = new Date(m.masteredAt);
    return masteredDate >= weekStart;
  });

  // 最近精熟的單字（取最新 8 個）
  const allWords = files.flatMap(f => f.words);
  const recentMastered = [...profile.masteredWords]
    .sort((a, b) => new Date(b.masteredAt).getTime() - new Date(a.masteredAt).getTime())
    .slice(0, 8)
    .map(m => {
      const word = allWords.find(w => w.id === m.wordId);
      return word ? { ...word, level: m.level, masteredAt: m.masteredAt } : null;
    })
    .filter((w): w is Word & { level: number; masteredAt: Date | string } => w !== null);

  // 計算各等級單字數
  const levelCounts = [1, 2, 3, 4, 5, 6].map(level =>
    profile.masteredWords.filter(m => m.level === level).length
  );

  return (
    <Card className="mb-4">
      <h2 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
        <span>📊</span> 我的學習旅程
      </h2>

      {/* 精熟單字進度 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="font-medium text-gray-700">已精熟單字</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-green-600">{masteredCount}</span>
            <span className="text-gray-500"> / {totalWords} 個</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${masteryRate}%` }}
          ></div>
        </div>
        <div className="text-right text-sm text-green-600 font-medium">{masteryRate}% 完成</div>
      </div>

      {/* 本週進步 + 連續學習 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">📈</div>
          <div className="text-2xl font-bold text-blue-600">+{weekMasteredWords.length}</div>
          <div className="text-xs text-gray-500">本週新精熟</div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-bold text-orange-600">{profile.loginStreak}</div>
          <div className="text-xs text-gray-500">連續學習天數</div>
        </div>
      </div>

      {/* 週挑戰 */}
      {weeklyChallenge && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <span className="font-bold text-gray-700">本週挑戰</span>
            </div>
            <span className="text-sm text-gray-500">剩餘 {weeklyChallenge.daysLeft} 天</span>
          </div>

          {/* 挑戰進度 */}
          <div className="space-y-3">
            {/* 學會單字 */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">📚 學會 {weeklyChallenge.targetWords} 個新單字</span>
                <span className="font-medium">{weeklyChallenge.progressWords} / {weeklyChallenge.targetWords}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${weeklyChallenge.progressWords >= weeklyChallenge.targetWords ? 'bg-green-500' : 'bg-gray-400'}`}
                  style={{ width: `${Math.min(100, (weeklyChallenge.progressWords / weeklyChallenge.targetWords) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* 完成題數 */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">✏️ 完成 {weeklyChallenge.targetQuiz} 題測驗</span>
                <span className="font-medium">{weeklyChallenge.progressQuiz} / {weeklyChallenge.targetQuiz}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${weeklyChallenge.progressQuiz >= weeklyChallenge.targetQuiz ? 'bg-green-500' : 'bg-gray-400'}`}
                  style={{ width: `${Math.min(100, (weeklyChallenge.progressQuiz / weeklyChallenge.targetQuiz) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* 學習天數 */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">🔥 學習 {weeklyChallenge.targetDays} 天</span>
                <span className="font-medium">{weeklyChallenge.progressDays} / {weeklyChallenge.targetDays}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${weeklyChallenge.progressDays >= weeklyChallenge.targetDays ? 'bg-green-500' : 'bg-gray-400'}`}
                  style={{ width: `${Math.min(100, (weeklyChallenge.progressDays / weeklyChallenge.targetDays) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 獎勵 */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            {weeklyChallenge.rewardClaimed ? (
              <div className="text-center text-green-600 font-medium">
                ✅ 已領取獎勵！下週再接再厲！
              </div>
            ) : weeklyChallenge.progressWords >= weeklyChallenge.targetWords &&
               weeklyChallenge.progressQuiz >= weeklyChallenge.targetQuiz &&
               weeklyChallenge.progressDays >= weeklyChallenge.targetDays ? (
              <button
                onClick={onClaimWeeklyReward}
                disabled={claimingReward}
                className="w-full py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all"
              >
                {claimingReward ? '領取中...' : '🎁 領取獎勵：銀寶箱 x1 + 50⭐'}
              </button>
            ) : (
              <div className="text-center text-sm text-gray-500">
                🎁 完成獎勵：銀寶箱 x1 + 50⭐
              </div>
            )}
          </div>
        </div>
      )}

      {/* 精熟等級分布 */}
      {masteredCount > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📚</span>
            <span className="font-medium text-gray-700">精熟等級分布</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {levelCounts.map((count, index) => (
              <div key={index} className="text-center">
                <div className={`rounded-lg p-2 mb-1 ${
                  index === 0 ? 'bg-gray-200' :
                  index === 1 ? 'bg-green-200' :
                  index === 2 ? 'bg-blue-200' :
                  index === 3 ? 'bg-gray-200' :
                  index === 4 ? 'bg-orange-200' :
                  'bg-yellow-200'
                }`}>
                  <div className="font-bold text-gray-700">{count}</div>
                </div>
                <div className="text-xs text-gray-500">Lv.{index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近精熟的單字 */}
      {recentMastered.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⭐</span>
            <span className="font-medium text-gray-700">最近精熟的單字</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentMastered.map((word, index) => (
              <div
                key={word.id}
                className="px-3 py-1 bg-white rounded-full text-sm shadow-sm border border-yellow-200"
                title={`${word.chinese} - Lv.${word.level}`}
              >
                <span className="font-medium text-gray-700">{word.english}</span>
                <span className="ml-1 text-xs text-gray-400">Lv.{word.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {masteredCount === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🌱</div>
          <p>開始做測驗來精熟單字吧！</p>
          <p className="text-sm mt-1">答對的單字會被記錄為精熟單字</p>
        </div>
      )}
    </Card>
  );
};


// ============ 學生儀表板 ============

// 每日任務顯示名稱
const questTypeLabels: Record<string, string> = {
  quiz_count: '完成測驗題數',
  review_count: '用複習模式作答',
  correct_streak: '連續答對題數',
  accuracy: '單次測驗正確率'
};

interface DashboardProps {
  profile: Profile;
  files: WordFile[];
  settings: Settings;
  customQuizzes: CustomQuiz[];
  dailyQuest: DailyQuest | null;
  loginReward: { stars: number; streak: number } | null;
  onStartQuiz: (file: WordFile, options?: { difficulty?: 'easy' | 'normal' | 'hard'; questionCount?: number; companionPetId?: string; companionPet?: Pet; category?: string; typeBonusMultiplier?: number; wordRange?: { start: number; end: number } }) => void;
  onStartReview: (file: WordFile, weakWords: Word[]) => void;
  onStartCustomQuiz: (quiz: CustomQuiz, words: Word[]) => void;
  onDismissLoginReward: () => void;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile: initialProfile, files, settings, customQuizzes, dailyQuest, loginReward, onStartQuiz, onStartReview, onStartCustomQuiz, onDismissLoginReward, onBack }) => {
  // 使用本地 state 追蹤 profile 變化，避免使用 window.location.reload()
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [activeTab, setActiveTab] = useState<'stats' | 'quizzes' | 'srs' | 'badges' | 'shop' | 'pet' | 'leaderboard' | 'mystery' | 'history' | 'pokedex'>('stats');
  const [showLoginReward, setShowLoginReward] = useState(!!loginReward);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [profileBadges, setProfileBadges] = useState<ProfileBadge[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<ProfilePurchase[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'week' | 'month' | 'all'>('week');
  const [petEvolved, setPetEvolved] = useState<{ stageName: string; stageIcon?: string; species?: string; stage?: number; rarity?: string; evolutionPath?: string | null } | null>(null);
  // 神秘獎勵系統狀態
  const [titles, setTitles] = useState<Title[]>([]);
  const [profileTitles, setProfileTitles] = useState<ProfileTitle[]>([]);
  const [stickerSeries, setStickerSeries] = useState<StickerSeries[]>([]);
  const [profileStickers, setProfileStickers] = useState<ProfileSticker[]>([]);
  const [profileChests, setProfileChests] = useState<ProfileChest[]>([]);
  const [wheelRewards, setWheelRewards] = useState<WheelReward[]>([]);
  const [mysteryTab, setMysteryTab] = useState<'chests' | 'stickers' | 'titles' | 'wheel'>('chests');
  const [openingChest, setOpeningChest] = useState<string | null>(null);
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<WheelReward | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  // 消耗品商店狀態
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [chestShopItems, setChestShopItems] = useState<ChestShopItem[]>([]);
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([]);
  const [shopSubTab, setShopSubTab] = useState<'decorations' | 'consumables' | 'chests' | 'equipment'>('consumables');
  // 測驗開始對話框狀態
  const [quizStartDialog, setQuizStartDialog] = useState<{ file: WordFile; availableCount: number } | null>(null);
  // 單字預覽狀態
  const [wordPreview, setWordPreview] = useState<WordFile | null>(null);
  const [previewRange, setPreviewRange] = useState<{ start: number; end: number }>({ start: 1, end: 50 });
  // 進化選擇 Modal
  const [showEvolutionChoice, setShowEvolutionChoice] = useState(false);
  // 寵物蛋選擇和多寵物狀態
  const [petSpecies, setPetSpecies] = useState<PetSpecies[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [showEggSelection, setShowEggSelection] = useState(false);
  const [hatchingSpecies, setHatchingSpecies] = useState<string | null>(null);
  const [hatchPhase, setHatchPhase] = useState<'idle' | 'shake' | 'crack' | 'hatch'>('idle');
  const [selectedEggSpecies, setSelectedEggSpecies] = useState<string | null>(null);
  // 寵物對話和動畫狀態
  const [petDialogue, setPetDialogue] = useState<string>('');
  const [petAnimation, setPetAnimation] = useState<'idle' | 'bounce' | 'shake' | 'heart'>('idle');
  // 圖鑑和裝備狀態
  const [pokedexData, setPokedexData] = useState<PokedexData | null>(null);
  const [pokedexFilter, setPokedexFilter] = useState<'all' | 'normal' | 'rare' | 'legendary' | 'owned'>('all');
  const [pokedexDetail, setPokedexDetail] = useState<string | null>(null);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [petEquipment, setPetEquipment] = useState<PetEquipment[]>([]);
  const [equipShopSlot, setEquipShopSlot] = useState<string | null>(null);
  // 週挑戰狀態
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
  const [claimingWeeklyReward, setClaimingWeeklyReward] = useState(false);
  // Toast 通知
  const [toast, setToast] = useState<{ message: string; type: 'earn' | 'spend' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'earn' | 'spend' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);
  // 星星歷史
  const [showStarHistory, setShowStarHistory] = useState(false);
  const [starHistory, setStarHistory] = useState<StarAdjustment[]>([]);
  const [starSummary, setStarSummary] = useState<{ earned: number; spent: number }>({ earned: 0, spent: 0 });

  // 載入徽章和商店資料
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const [badgesData, profileBadgesData, shopData, purchasesData, petData, titlesData, profileTitlesData, seriesData, profileStickersData, chestsData, wheelData, consumablesData, chestShopData, profileItemsData, weeklyChallengeData, petSpeciesData, allPetsData, equipItemsData, petEquipData, pokedexResult] = await Promise.all([
          api.getBadges(),
          api.getProfileBadges(profile.id),
          api.getShopItems(),
          api.getProfilePurchases(profile.id),
          api.getPet(profile.id),
          api.getTitles(),
          api.getProfileTitles(profile.id),
          api.getStickerSeries(),
          api.getProfileStickers(profile.id),
          api.getProfileChests(profile.id),
          api.getWheelConfig(),
          api.getConsumables(),
          api.getChestShopItems(),
          api.getProfileItems(profile.id),
          api.getWeeklyChallenge(profile.id).catch(() => null),
          api.getPetSpecies(),
          api.getAllPets(profile.id),
          api.getEquipmentItems(),
          api.getPetEquipment(profile.id),
          api.getPokedex(profile.id)
        ]);
        setBadges(badgesData);
        setProfileBadges(profileBadgesData);
        setShopItems(shopData);
        setPurchases(purchasesData);
        setPet(petData.hasPet === false ? null : petData);
        setTitles(titlesData);
        setProfileTitles(profileTitlesData);
        setStickerSeries(seriesData);
        setProfileStickers(profileStickersData);
        setProfileChests(chestsData);
        setWheelRewards(wheelData);
        setConsumables(consumablesData);
        setChestShopItems(chestShopData);
        setProfileItems(profileItemsData);
        setWeeklyChallenge(weeklyChallengeData);
        setPetSpecies(petSpeciesData);
        setAllPets(allPetsData);
        setEquipmentItems(equipItemsData);
        setPetEquipment(petEquipData);
        setPokedexData(pokedexResult);
      } catch { /* 忽略錯誤 */ }
    };
    loadGameData();
  }, [profile.id]);

  // 偵測寵物需要進化選擇
  useEffect(() => {
    if (pet && pet.needsEvolutionChoice) {
      setShowEvolutionChoice(true);
    }
  }, [pet?.needsEvolutionChoice]);

  // 取得啟用的自訂測驗（依指定學生過濾 + 排除過期）
  const activeQuizzes = customQuizzes.filter(q => {
    if (!q.active) return false;
    if (q.expiresAt && new Date(q.expiresAt).getTime() < Date.now()) return false;
    if (q.assignedProfileIds && q.assignedProfileIds.length > 0) {
      return q.assignedProfileIds.includes(profile.id);
    }
    return true;
  });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const masteredWordIds = profile.masteredWords.map(m => m.wordId);
  const getProgressForFile = (fileId: string): { correct: number; wrong: number; weakWordIds: string[]; history: HistoryEntry[] } =>
    profile.progress.find(p => p.fileId === fileId) || { correct: 0, wrong: 0, weakWordIds: [] as string[], history: [] as HistoryEntry[] };

  // 取得所有單字的對照表（用於歷史紀錄顯示）
  const wordMap = useMemo(() => {
    const map = new Map<string, Word>();
    files.forEach(f => f.words.forEach(w => map.set(w.id, w)));
    return map;
  }, [files]);

  // SRS：計算到期需複習的單字
  const dueWords = useMemo(() => {
    return profile.masteredWords.filter(m => isDue(m.nextReviewAt));
  }, [profile.masteredWords]);

  // SRS：取得待複習單字的 Word 物件
  const srsWordObjects = useMemo(() => {
    const wordIds = dueWords.map(m => m.wordId);
    return files.flatMap(f => f.words.filter(w => wordIds.includes(w.id)));
  }, [dueWords, files]);

  // 收集所有答錯但未精熟的單字
  const allWeakWordObjects = useMemo(() => {
    return files.flatMap(f => {
      const progress = getProgressForFile(f.id);
      return f.words.filter(w =>
        progress.weakWordIds.includes(w.id) && !masteredWordIds.includes(w.id)
      );
    });
  }, [files, profile.progress, masteredWordIds]);

  // 合併去重：SRS 到期 + 答錯未精熟
  const allReviewWordObjects = useMemo(() => {
    const srsIds = new Set(srsWordObjects.map(w => w.id));
    const weakOnly = allWeakWordObjects.filter(w => !srsIds.has(w.id));
    return [...srsWordObjects, ...weakOnly];
  }, [srsWordObjects, allWeakWordObjects]);

  const totalReviewCount = allReviewWordObjects.length;

  // 開始統一複習
  const startUnifiedReview = () => {
    if (allReviewWordObjects.length === 0) return;
    const fileWordCounts = files.map(f => ({
      file: f,
      count: allReviewWordObjects.filter(w => f.words.some(fw => fw.id === w.id)).length
    }));
    const primaryFile = fileWordCounts.sort((a, b) => b.count - a.count)[0]?.file;
    if (primaryFile) {
      onStartReview(primaryFile, allReviewWordObjects);
    }
  };

  // 載入排行榜
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      api.getLeaderboard(leaderboardType).then(setLeaderboard).catch(() => {});
    }
  }, [activeTab, leaderboardType]);

  // 寵物對話系統
  const getPetDialogue = useCallback((petData: Pet | null, event?: 'feed' | 'tap' | 'levelUp' | 'quiz'): string => {
    if (!petData) return '';

    const dialogues = {
      hungry: ['肚子好餓...', '主人，可以餵我嗎？', '我想吃東西～', '咕嚕咕嚕...'],
      happy: ['今天也要一起加油！', '主人好棒！', '學習真開心！', '嘿嘿～', '陪我玩嘛！'],
      sad: ['主人好久沒來看我了...', '我好想你...', '一起來學習吧？', '嗚嗚...'],
      morning: ['早安！今天也要努力喔！', '新的一天開始了！', '精神滿滿！'],
      night: ['晚安，明天見！', '今天辛苦了～', '好睏...zzz'],
      feed: ['好吃！謝謝主人！', '嗝～好飽！', '最喜歡吃東西了！', '❤️ 幸福 ❤️'],
      tap: ['嘿嘿～被摸了！', '咯咯咯～', '主人在叫我嗎？', '喵～', '汪！'],
      levelUp: ['耶！我升級了！', '我變強了！', '再接再厲！'],
      quiz: ['做得好！繼續加油！', '答對啦！', '真厲害！']
    };

    // 根據事件優先返回
    if (event && dialogues[event]) {
      return dialogues[event][Math.floor(Math.random() * dialogues[event].length)];
    }

    // 根據狀態返回
    if (petData.hunger < 30) return dialogues.hungry[Math.floor(Math.random() * dialogues.hungry.length)];
    if (petData.happiness < 30) return dialogues.sad[Math.floor(Math.random() * dialogues.sad.length)];

    // 根據時間返回
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return dialogues.morning[Math.floor(Math.random() * dialogues.morning.length)];
    if (hour >= 21 || hour < 5) return dialogues.night[Math.floor(Math.random() * dialogues.night.length)];

    return dialogues.happy[Math.floor(Math.random() * dialogues.happy.length)];
  }, []);

  // 初始化寵物對話
  useEffect(() => {
    if (pet && activeTab === 'pet' && !petDialogue) {
      setPetDialogue(getPetDialogue(pet));
    }
  }, [pet, activeTab, petDialogue, getPetDialogue]);

  // 點擊寵物互動
  const handlePetTap = () => {
    if (!pet) return;
    setPetDialogue(getPetDialogue(pet, 'tap'));
    setPetAnimation('shake');
    setTimeout(() => setPetAnimation('idle'), 500);
  };

  // 餵食寵物
  const handleFeedPet = async () => {
    if (!pet || pet.hunger >= 100) return;
    const result = await api.feedPet(profile.id);
    if (result.success) {
      setPet(prev => prev ? { ...prev, hunger: result.newHunger, happiness: result.newHappiness } : null);
      // 顯示餵食對話和動畫
      setPetDialogue(getPetDialogue(pet, 'feed'));
      setPetAnimation('heart');
      setTimeout(() => setPetAnimation('idle'), 1500);
      // 更新星星數量（不重新載入頁面）
      if (result.remainingStars !== undefined) {
        setProfile(prev => ({ ...prev, stars: result.remainingStars! }));
        showToast(`⭐ -${result.cost} → 剩餘 ${result.remainingStars}`, 'spend');
      }
    } else {
      alert(result.error || '餵食失敗');
    }
  };

  // 重命名寵物
  const handleRenamePet = async () => {
    const newName = prompt('請輸入新名字：', pet?.name);
    if (newName && newName.trim() && newName !== pet?.name) {
      try {
        const result = await api.renamePet(profile.id, newName.trim());
        if (result.success) {
          setPet(prev => prev ? { ...prev, name: newName.trim() } : null);
        }
      } catch {
        alert('重命名失敗');
      }
    }
  };

  // 領取週挑戰獎勵
  const handleClaimWeeklyReward = async () => {
    if (!weeklyChallenge || claimingWeeklyReward) return;
    setClaimingWeeklyReward(true);
    try {
      const result = await api.claimWeeklyReward(profile.id);
      if (result.success) {
        // 更新週挑戰狀態
        setWeeklyChallenge(prev => prev ? { ...prev, rewardClaimed: true } : null);
        // 更新寶箱數量
        const newChests = await api.getProfileChests(profile.id);
        setProfileChests(newChests);
        // 更新星星數量（不重新載入頁面）
        if (result.rewards?.stars) {
          setProfile(prev => ({ ...prev, stars: prev.stars + result.rewards!.stars }));
          showToast(`⭐ +${result.rewards.stars} → 領取週挑戰獎勵`, 'earn');
        }
      } else {
        alert(result.error || '領取失敗');
      }
    } catch {
      alert('領取失敗');
    } finally {
      setClaimingWeeklyReward(false);
    }
  };

  const loadStarHistory = async () => {
    try {
      const data = await api.getStarHistory(profile.id, 7);
      setStarHistory(data.history);
      setStarSummary(data.summary);
      setShowStarHistory(true);
    } catch {
      alert('載入星星歷史失敗');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Toast 通知 */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-medium text-sm animate-bounce-in ${toast.type === 'earn' ? 'bg-green-600' : toast.type === 'spend' ? 'bg-gray-700' : 'bg-gray-600'}`}>
          {toast.message}
        </div>
      )}

      {/* 星星歷史 */}
      {showStarHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStarHistory(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">⭐ 星星歷史（最近7天）</h3>
              <button onClick={() => setShowStarHistory(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                <div className="text-green-600 font-bold text-lg">+{starSummary.earned}</div>
                <div className="text-green-600 text-xs">收入</div>
              </div>
              <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
                <div className="text-red-500 font-bold text-lg">-{starSummary.spent}</div>
                <div className="text-red-500 text-xs">支出</div>
              </div>
            </div>
            {starHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-6">暫無紀錄</p>
            ) : (
              <div className="space-y-2">
                {starHistory.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 truncate">{item.reason}</div>
                      <div className="text-xs text-gray-400">{formatDate(item.adjustedAt)}</div>
                    </div>
                    <div className={`font-bold text-sm ml-3 whitespace-nowrap ${item.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount} ⭐
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 登入獎勵彈窗 */}
      {showLoginReward && loginReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 text-center animate-bounce-in max-w-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">連續登入第 {loginReward.streak} 天！</h2>
            <div className="text-4xl font-bold text-yellow-500 mb-4">+{loginReward.stars} ⭐</div>
            <p className="text-gray-600 mb-4">繼續保持，明天還有獎勵！</p>
            <Button onClick={() => { setShowLoginReward(false); onDismissLoginReward(); }} variant="primary" className="w-full">太棒了！</Button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* 頭部：名稱 + 星星 */}
        <div className="flex items-center justify-between mb-3 sticky top-0 z-30 bg-gray-50 pb-2 -mx-4 px-4 pt-1">
          <button onClick={onBack} className="text-gray-600 text-sm px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">登出</button>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Avatar name={profile.name} equippedFrame={profile.equippedFrame} petSpecies={pet?.species} petStage={pet?.stage} petEvolutionPath={pet?.evolutionPath} size="sm" />
            {profile.name}
          </h1>
          <button onClick={loadStarHistory} className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold hover:bg-yellow-500 transition-colors">
            <span>⭐</span>
            <span>{profile.stars}</span>
          </button>
        </div>

        {/* 連續登入 + 每日任務 */}
        <Card className="mb-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="font-bold text-gray-700">連續登入 {profile.loginStreak} 天</div>
                <div className="text-xs text-gray-500">累積獲得 {profile.totalStars} 星星</div>
              </div>
            </div>
          </div>
          {dailyQuest && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">📋 今日任務</div>
              {[
                { type: dailyQuest.quest1Type, target: dailyQuest.quest1Target, progress: dailyQuest.quest1Progress, reward: dailyQuest.quest1Reward, done: dailyQuest.quest1Done },
                { type: dailyQuest.quest2Type, target: dailyQuest.quest2Target, progress: dailyQuest.quest2Progress, reward: dailyQuest.quest2Reward, done: dailyQuest.quest2Done },
                { type: dailyQuest.quest3Type, target: dailyQuest.quest3Target, progress: dailyQuest.quest3Progress, reward: dailyQuest.quest3Reward, done: dailyQuest.quest3Done },
              ].map((quest, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${quest.done ? 'bg-green-100' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={quest.done ? 'text-green-500' : 'text-gray-400'}>{quest.done ? '✓' : '○'}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${quest.done ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                        {questTypeLabels[quest.type] || quest.type} {quest.type === 'accuracy' ? `${quest.target}%` : quest.target}
                      </span>
                      {!quest.done && quest.progress > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((quest.progress / quest.target) * 100))}%` }}></div></div>
                          <span className="text-xs text-gray-500">{quest.progress}/{quest.target}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ml-2 ${quest.done ? 'text-green-600' : 'text-yellow-600'}`}>+{quest.reward} ⭐</span>
                </div>
              ))}
              {dailyQuest.allCompleted && (
                <div className="text-center text-green-600 font-medium text-sm mt-2">🎊 今日任務全部完成！額外獲得 10 星星</div>
              )}
            </div>
          )}
        </Card>

        {/* 分頁切換 */}
        <div className="flex mb-4 bg-gray-200 rounded-lg p-1 flex-wrap gap-1">
          <button onClick={() => setActiveTab('stats')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'stats' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            📊 旅程
          </button>
<button onClick={() => setActiveTab('quizzes')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'quizzes' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            測驗題目
            {activeQuizzes.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">{activeQuizzes.length}</span>}
          </button>
          <button onClick={() => setActiveTab('srs')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'srs' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            待複習
            {totalReviewCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{totalReviewCount}</span>}
          </button>
          <button onClick={() => setActiveTab('badges')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'badges' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            成就
            {profileBadges.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full">{profileBadges.length}</span>}
          </button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'shop' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            商店
          </button>
          <button onClick={() => setActiveTab('pet')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'pet' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            寵物
            {pet && <img src={getPetImageSrc(pet.species, pet.stage, pet.evolutionPath)} alt="" className="w-4 h-4 inline-block ml-1" />}
          </button>
          <button onClick={() => setActiveTab('pokedex')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'pokedex' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            圖鑑
            {pokedexData && <span className="ml-1 text-xs">{pokedexData.unlocked}/{pokedexData.total}</span>}
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'leaderboard' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            排行榜
          </button>
          <button onClick={() => setActiveTab('mystery')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'mystery' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            神秘
            {profileChests.reduce((sum, c) => sum + c.quantity, 0) > 0 && <span className="ml-1 px-1.5 py-0.5 bg-gray-900 text-white text-xs rounded-full">{profileChests.reduce((sum, c) => sum + c.quantity, 0)}</span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'history' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>測驗歷史</button>
        </div>

        {activeTab === 'stats' && (
          <LearningJourney
            profile={profile}
            files={files}
            weeklyChallenge={weeklyChallenge}
            onClaimWeeklyReward={handleClaimWeeklyReward}
            claimingReward={claimingWeeklyReward}
          />
        )}


{activeTab === 'quizzes' && (
          <>
            <Card className="mb-4">
              <div className="bg-gray-50 p-2 rounded-lg mb-3 text-sm text-gray-700">目前設定：選擇題 {settings.timeChoiceQuestion || 10} 秒 · 拼寫題 {settings.timeSpellingQuestion || 30} 秒 · {settings.questionCount === 0 ? '全部題目' : `${settings.questionCount} 題`}</div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {/* 老師自訂測驗 - 優先顯示 */}
                {activeQuizzes.map(quiz => {
                  const file = files.find(f => f.id === quiz.fileId);
                  const quizWords = file ? quiz.wordIds.map(id => file.words.find(w => w.id === id)).filter((w): w is Word => w !== undefined) : [];
                  const typeLabels = quiz.questionTypes.map(t => {
                    const labels = ['看中文選英文', '看英文選中文', '看中文寫英文', '看英文寫中文', '聽英文選中文', '聽英文寫英文', '看例句填空'];
                    return labels[t] || '';
                  }).join('、');
                  const canStart = quizWords.length > 0;

                  const isBonus = quiz.starMultiplier > 1;
                  return (
                    <div key={`custom-${quiz.id}`} className={`p-3 rounded-lg border-2 ${isBonus ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' : 'bg-orange-50 border-orange-200'}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">老師指定</span>
                        {isBonus && <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs rounded font-bold animate-pulse">{quiz.starMultiplier}x 加分!</span>}
                        <span className="font-bold text-orange-700">{quiz.name}</span>
                        <span className="text-sm text-gray-500">({quizWords.length} 題)</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">題型：{typeLabels}</div>
                      {canStart ? (
                        <Button onClick={() => onStartCustomQuiz(quiz, quizWords)} variant="warning" className="w-full text-sm py-1">{isBonus ? `開始測驗 (${quiz.starMultiplier}x)` : '開始測驗'}</Button>
                      ) : (
                        <p className="text-red-500 text-sm text-center">無法開始（來源檔案已刪除）</p>
                      )}
                    </div>
                  );
                })}

                {/* 單字檔案 */}
                {files.map(f => {
                  const progress = getProgressForFile(f.id);
                  const total = progress.correct + progress.wrong;
                  const rate = total > 0 ? Math.round((progress.correct / total) * 100) : 0;
                  const weakWords = f.words.filter(w => progress.weakWordIds.includes(w.id) && !masteredWordIds.includes(w.id));
                  const masteredCount = f.words.filter(w => masteredWordIds.includes(w.id)).length;
                  const availableWords = f.words.filter(w => !masteredWordIds.includes(w.id)).length;
                  return (
                    <div key={`file-${f.id}`} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">單字庫</span>
                        {f.category && DAY_ELEMENTS[f.category] && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{DAY_ELEMENTS[f.category].emoji} {settings.enableMonsterSystem ? DAY_ELEMENTS[f.category].monster : DAY_ELEMENTS[f.category].element}</span>}
                        <span className="font-medium">{f.name}</span>
                        <span className="text-sm text-gray-500">({f.words.length} 個單字)</span>
                        {masteredCount > 0 && <span className="text-sm text-green-600">({masteredCount} 已精熟)</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${rate}%` }}></div></div>
                        <span className="text-sm font-medium">{rate}%</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setWordPreview(f); setPreviewRange({ start: 1, end: Math.min(50, f.words.length) }); }} className="px-3 py-1 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">先看單字</button>
                        <Button onClick={() => setQuizStartDialog({ file: f, availableCount: availableWords })} variant="primary" className="flex-1 text-sm py-1">開始測驗</Button>
                        {weakWords.length > 0 && <Button onClick={() => onStartReview(f, weakWords)} variant="warning" className="flex-1 text-sm py-1">複習 ({weakWords.length})</Button>}
                      </div>
                    </div>
                  );
                })}

                {files.length === 0 && activeQuizzes.length === 0 && (
                  <p className="text-gray-500 text-center py-4">老師尚未上傳單字檔案或建立測驗</p>
                )}
              </div>
            </Card>
            {files.length > 0 && <ProgressChart profile={profile} files={files} />}
          </>
        )}

        {activeTab === 'srs' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">待複習</h2>
            {totalReviewCount > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  你有 <span className="font-bold text-red-600">{totalReviewCount}</span> 個單字需要複習
                  {allWeakWordObjects.length > 0 && srsWordObjects.length > 0 && (
                    <span>（{allWeakWordObjects.length} 個答錯 + {srsWordObjects.length} 個精熟到期）</span>
                  )}
                </p>
                <Button onClick={startUnifiedReview} variant="warning" className="w-full mb-4">
                  開始複習（{totalReviewCount} 個單字）
                </Button>

                {/* 答錯的單字 */}
                {allWeakWordObjects.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-sm text-red-600 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      答錯待學習（{allWeakWordObjects.length}）
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allWeakWordObjects.slice(0, 20).map(word => {
                        const sourceFile = files.find(f => f.words.some(fw => fw.id === word.id));
                        return (
                          <div key={word.id} className="p-2 bg-red-50 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-medium">{word.english}</span>
                              <span className="text-gray-500 ml-2">{word.chinese}</span>
                            </div>
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                              {sourceFile ? sourceFile.name : ''}
                            </span>
                          </div>
                        );
                      })}
                      {allWeakWordObjects.length > 20 && (
                        <p className="text-gray-500 text-sm text-center">...還有 {allWeakWordObjects.length - 20} 個</p>
                      )}
                    </div>
                  </div>
                )}

                {/* SRS 精熟到期 */}
                {srsWordObjects.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-sm text-yellow-700 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      精熟複習到期（{srsWordObjects.length}）
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {srsWordObjects.slice(0, 20).map(word => {
                        const mastered = dueWords.find(m => m.wordId === word.id);
                        return (
                          <div key={word.id} className="p-2 bg-yellow-50 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-medium">{word.english}</span>
                              <span className="text-gray-500 ml-2">{word.chinese}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${getLevelColor(mastered?.level || 1)}`}>
                              Lv.{mastered?.level || 1}
                            </span>
                          </div>
                        );
                      })}
                      {srsWordObjects.length > 20 && (
                        <p className="text-gray-500 text-sm text-center">...還有 {srsWordObjects.length - 20} 個</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">&#127881;</div>
                <p className="text-gray-600">太棒了！目前沒有需要複習的單字。</p>
                <p className="text-sm text-gray-500 mt-2">繼續練習新單字，或等待已精熟單字到期複習。</p>
              </div>
            )}

            {/* 精熟單字統計 */}
            {profile.masteredWords.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-sm text-gray-600 mb-2">精熟單字統計 ({profile.masteredWords.length})</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[1, 2, 3, 4, 5, 6].map(level => {
                    const count = profile.masteredWords.filter(m => m.level === level).length;
                    if (count === 0) return null;
                    return (
                      <div key={level} className={`p-2 rounded text-center ${getLevelColor(level)}`}>
                        <div className="font-bold">{count}</div>
                        <div className="text-xs opacity-75">Lv.{level} ({getIntervalText(level)})</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'pet' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">我的寵物</h2>

            {/* 孵化動畫覆蓋層 */}
            {hatchingSpecies && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
                  {hatchPhase === 'shake' && (
                    <div className="animate-egg-shake mb-4">
                      <PixelPet species={hatchingSpecies} stage={1} rarity={petSpecies.find(s => s.species === hatchingSpecies)?.rarity || 'normal'} size={5} scale={2.5} animate={false} showAura={false} />
                    </div>
                  )}
                  {hatchPhase === 'crack' && (
                    <div className="animate-egg-crack mb-4">
                      <PixelPet species={hatchingSpecies} stage={1} rarity={petSpecies.find(s => s.species === hatchingSpecies)?.rarity || 'normal'} size={5} scale={2.5} animate={false} showAura={false} />
                    </div>
                  )}
                  {hatchPhase === 'hatch' && (
                    <div className="animate-egg-hatch mb-4">
                      <PixelPet species={hatchingSpecies} stage={1} rarity={petSpecies.find(s => s.species === hatchingSpecies)?.rarity || 'normal'} size={5} scale={2.5} animate={true} showAura={true} />
                    </div>
                  )}
                  <p className="text-lg font-bold text-gray-700">
                    {hatchPhase === 'shake' ? '蛋在搖晃...' : hatchPhase === 'crack' ? '快要孵化了！' : '新寵物誕生！'}
                  </p>
                  {hatchPhase === 'hatch' && (
                    <button
                      onClick={async () => {
                        setHatchingSpecies(null);
                        setHatchPhase('idle');
                        const [petData, allPetsData] = await Promise.all([
                          api.getPet(profile.id),
                          api.getAllPets(profile.id)
                        ]);
                        setPet(petData.hasPet === false ? null : petData);
                        setAllPets(allPetsData);
                        setShowEggSelection(false);
                      }}
                      className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
                    >
                      太棒了！
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 沒有寵物或要選擇新蛋 */}
            {(!pet || showEggSelection) && !hatchingSpecies && (
              <div>
                <p className="text-sm text-gray-500 mb-4 text-center">
                  {pet ? '選擇一顆新蛋來孵化！' : '選擇你的第一顆寵物蛋！'}
                </p>
                {pet && (
                  <button onClick={() => setShowEggSelection(false)} className="text-sm text-gray-500 hover:text-gray-800 mb-3">
                    ← 返回寵物頁
                  </button>
                )}
                {(['normal', 'rare', 'legendary'] as const).map(rarity => {
                  const rarityInfo = RARITY_LABELS[rarity];
                  const speciesInRarity = petSpecies.filter(sp => sp.rarity === rarity);
                  if (speciesInRarity.length === 0) return null;
                  return (
                    <div key={rarity} className="mb-4">
                      <div className={`flex items-center gap-2 mb-2 px-2`}>
                        <span className={`text-sm font-bold ${rarityInfo.color}`}>
                          {rarity === 'rare' ? '💎 ' : rarity === 'legendary' ? '🌟 ' : ''}{rarityInfo.label}
                        </span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {speciesInRarity.map(sp => {
                          const alreadyOwned = allPets.some(p => p.species === sp.species);
                          const canAfford = sp.price === 0 || profile.stars >= sp.price;
                          const isSelected = selectedEggSpecies === sp.species;
                          return (
                            <div
                              key={sp.species}
                              onClick={() => !alreadyOwned && setSelectedEggSpecies(isSelected ? null : sp.species)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                alreadyOwned ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' :
                                isSelected ? `${rarityInfo.border} ${rarityInfo.bg} scale-[1.02]` :
                                `${rarityInfo.border} bg-white hover:${rarityInfo.bg}`
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="animate-egg-wobble">
                                <PixelPet species={sp.species} stage={1} rarity={sp.rarity} size={4} scale={1.5} animate={false} showAura={false} />
                              </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-700">{sp.name}</span>
                                    {rarity !== 'normal' && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rarity === 'rare' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {rarityInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1">{sp.description}</div>
                                  <div className="flex gap-0.5 items-center flex-wrap">
                                    <TypeBadge type={sp.baseType} />
                                    <span className="text-gray-400 text-xs mx-1">|</span>
                                    {sp.stages.shared.map(st => (
                                      <div key={st.stage} title={`${st.name} (Lv.${st.minLevel})`}>
                                        <PixelPet species={sp.species} stage={st.stage} rarity={sp.rarity} size={2} scale={1} animate={false} showAura={false} />
                                      </div>
                                    ))}
                                    <span className="text-gray-400 text-xs">→ A/B</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {alreadyOwned ? (
                                    <span className="text-xs text-green-600 font-medium">已擁有</span>
                                  ) : sp.price === 0 ? (
                                    <span className="text-xs text-green-600 font-medium">免費</span>
                                  ) : (
                                    <span className={`text-sm font-bold ${canAfford ? 'text-yellow-600' : 'text-red-400'}`}>{sp.price} ⭐</span>
                                  )}
                                </div>
                              </div>
                              {isSelected && !alreadyOwned && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!canAfford) {
                                      alert('星星不足！');
                                      return;
                                    }
                                    try {
                                      const result = await api.choosePet(profile.id, sp.species);
                                      if (result.success) {
                                        setProfile(prev => ({ ...prev, stars: result.newStars }));
                                        if (sp.price > 0) showToast(`⭐ -${sp.price} → 剩餘 ${result.newStars}`, 'spend');
                                        setSelectedEggSpecies(null);
                                        setHatchingSpecies(sp.species);
                                        setHatchPhase('shake');
                                        setTimeout(() => setHatchPhase('crack'), 1200);
                                        setTimeout(() => setHatchPhase('hatch'), 2000);
                                      }
                                    } catch {
                                      alert('孵化失敗，請稍後再試');
                                    }
                                  }}
                                  disabled={!canAfford}
                                  className={`mt-3 w-full py-2 rounded-lg font-bold text-white ${canAfford ? 'bg-gray-500 hover:bg-gray-800' : 'bg-gray-400 cursor-not-allowed'}`}
                                >
                                  {sp.price === 0 ? '孵化！' : `花費 ${sp.price} ⭐ 孵化！`}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 有寵物時顯示現有 UI */}
            {pet && !showEggSelection && !hatchingSpecies && (
              <div className="text-center">
                {/* 寵物顯示 + 對話泡泡 */}
                <div className="relative inline-block mb-4">
                  {petDialogue && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
                      <div className="bg-white rounded-xl px-4 py-2 shadow-lg border-2 border-gray-200 min-w-[120px] max-w-[200px]">
                        <div className="text-sm text-gray-700">{petDialogue}</div>
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-r-2 border-b-2 border-gray-200 rotate-45"></div>
                    </div>
                  )}
                  {petAnimation === 'heart' && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-float-up">
                      <span className="text-3xl">❤️</span>
                    </div>
                  )}
                  <div
                    onClick={handlePetTap}
                    className={`mb-2 cursor-pointer relative inline-block ${
                      profile.equippedFrame ? FRAME_STYLES[profile.equippedFrame] || '' : ''
                    } ${
                      petAnimation === 'shake' ? 'animate-wiggle' :
                      petAnimation === 'heart' ? 'animate-pulse' : ''
                    }`}
                    title="點擊和寵物互動！"
                  >
                    <PixelPet
                      species={pet.species}
                      stage={pet.stage}
                      evolutionPath={pet.evolutionPath}
                      rarity={pet.rarity || 'normal'}
                      size={4}
                      scale={2.5}
                      animate={petAnimation === 'idle'}
                      showAura={true}
                    />
                    {/* 裝備 emoji 顯示 */}
                    {petEquipment.length > 0 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 text-lg bg-white/80 rounded-full px-2 py-0.5 shadow-sm">
                        {petEquipment.map(eq => {
                          const item = equipmentItems.find(i => i.id === eq.itemId);
                          return item ? <span key={eq.id} title={item.name}>{item.icon}</span> : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-bold text-gray-700">{pet.name}</div>
                  <button onClick={handleRenamePet} className="text-xs text-gray-400 hover:text-gray-600">✏️ 改名</button>
                </div>

                {/* 等級和進化階段 + RPG 數值 */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-700 font-bold">Lv.{pet.level}</span>
                    <span className="text-sm text-gray-700">{pet.stageName}</span>
                    {pet.types?.map(t => <TypeBadge key={t} type={t} />)}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">經驗值 {pet.currentExp}/{pet.expToNext}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-gray-500 h-2 rounded-full transition-all" style={{ width: `${(pet.currentExp / pet.expToNext) * 100}%` }}></div>
                  </div>
                  {/* RPG 數值條 */}
                  {pet.rpgStats && (
                    <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
                      <div>
                        <div className="text-xs text-red-600 mb-0.5">HP {pet.rpgStats.hp}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pet.rpgStats.hp / 4)}%` }}></div></div>
                      </div>
                      <div>
                        <div className="text-xs text-orange-600 mb-0.5">ATK {pet.rpgStats.attack}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pet.rpgStats.attack / 4)}%` }}></div></div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-600 mb-0.5">DEF {pet.rpgStats.defense}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pet.rpgStats.defense / 4)}%` }}></div></div>
                      </div>
                    </div>
                  )}
                  {/* 特殊能力 */}
                  {pet.ability && (
                    <div className="text-xs bg-white/60 rounded p-1.5 mb-2">
                      <span className="font-medium text-gray-700">{pet.ability.name}</span>
                      <span className="text-gray-500 ml-1">{pet.ability.desc}</span>
                    </div>
                  )}
                  {/* 分支進化樹 */}
                  <div className="mt-3">
                    <div className="flex justify-center items-end gap-1">
                      {pet.stages.shared.map((s: { stage: number; name: string; minLevel: number }, idx: number) => (
                        <React.Fragment key={s.stage}>
                          <div className={`text-center ${s.stage <= pet.stage ? '' : 'opacity-25 grayscale'}`}>
                            <PixelPet species={pet.species} stage={s.stage} rarity={pet.rarity || 'normal'} size={2} scale={1} animate={false} showAura={false} />
                            <div className="text-xs text-gray-500">Lv.{s.minLevel}</div>
                          </div>
                          {idx < pet.stages.shared.length - 1 && <span className="text-gray-300 text-xs mb-4">→</span>}
                        </React.Fragment>
                      ))}
                      <span className="text-gray-300 text-xs mb-4">→</span>
                    </div>
                    {/* Path A / Path B */}
                    <div className="flex flex-col gap-1 mt-1">
                      {(['A', 'B'] as const).map(path => {
                        const pathStages = path === 'A' ? pet.stages.pathA : pet.stages.pathB;
                        const isChosen = pet.evolutionPath === path;
                        const isOther = pet.evolutionPath && pet.evolutionPath !== path;
                        return (
                          <div key={path} className={`flex items-center gap-1 ${isOther ? 'opacity-30' : ''}`}>
                            <span className={`text-xs font-bold w-4 ${isChosen ? 'text-gray-700' : 'text-gray-400'}`}>{path}</span>
                            {pathStages.map((s: { stage: number; name: string; minLevel: number }) => (
                              <div key={s.stage} className={`text-center ${s.stage <= pet.stage && isChosen ? '' : 'opacity-40 grayscale'}`}>
                                <PixelPet species={pet.species} stage={s.stage} evolutionPath={isChosen ? path : undefined} rarity={pet.rarity || 'normal'} size={2} scale={1} animate={false} showAura={false} />
                                <div className="text-xs text-gray-400">Lv.{s.minLevel}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 狀態條 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-orange-600 mb-1">🍖 飽足度</div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full transition-all ${pet.hunger > 50 ? 'bg-green-500' : pet.hunger > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pet.hunger}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{pet.hunger}/100</div>
                    {pet.hunger >= 80 && <div className="text-xs text-green-600 font-medium mt-1">🔥 經驗 +50%</div>}
                    {pet.hunger >= 20 && pet.hunger < 50 && <div className="text-xs text-yellow-600 font-medium mt-1">⚠️ 經驗 -25%，加成減半</div>}
                    {pet.hunger < 20 && <div className="text-xs text-red-600 font-medium mt-1">💀 經驗 -50%，加成僅 25%</div>}
                  </div>
                  <div className="bg-pink-50 rounded-lg p-3">
                    <div className="text-xs text-pink-600 mb-1">💕 快樂度</div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full transition-all ${pet.happiness > 50 ? 'bg-green-500' : pet.happiness > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pet.happiness}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{pet.happiness}/100</div>
                  </div>
                </div>

                {/* 飽足度效果說明 */}
                <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-600">📖 飽足度效果：</span>餵食可提升飽足度，飽足度越高，測驗後寵物獲得的<span className="text-orange-600 font-medium">經驗值</span>越多，裝備和能力的<span className="text-yellow-600 font-medium">星星加成</span>也越高。飽足度會隨時間自然下降。
                  </div>
                </div>

                {/* 裝備槽位 */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-600 font-medium mb-2">⚔️ 裝備欄（已擁有 {purchases.filter(p => equipmentItems.some(e => e.id === p.itemId)).length}/{equipmentItems.length}）</div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['hat', 'necklace', 'wings', 'weapon'] as const).map(slot => {
                      const slotLabels: Record<string, string> = { hat: '帽子', necklace: '項鍊', wings: '翅膀', weapon: '武器' };
                      const slotIcons: Record<string, string> = { hat: '🎩', necklace: '📿', wings: '🪶', weapon: '🗡️' };
                      const equipped = petEquipment.find(e => e.slot === slot);
                      const equippedItem = equipped ? equipmentItems.find(i => i.id === equipped.itemId) : null;
                      return (
                        <div
                          key={slot}
                          onClick={() => setEquipShopSlot(equipShopSlot === slot ? null : slot)}
                          className={`p-2 rounded-lg border-2 text-center cursor-pointer transition-all ${
                            equippedItem
                              ? equippedItem.rarity === 'legendary' ? 'border-yellow-400 bg-yellow-50' :
                                equippedItem.rarity === 'rare' ? 'border-blue-400 bg-blue-50' :
                                'border-green-400 bg-green-50'
                              : 'border-dashed border-gray-300 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xl">{equippedItem ? equippedItem.icon : slotIcons[slot]}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {equippedItem ? equippedItem.name : slotLabels[slot]}
                          </div>
                          {equippedItem && (
                            <div className="text-xs text-green-600 font-medium">{equippedItem.description}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* 總加成顯示 */}
                  {petEquipment.length > 0 && (() => {
                    let totalExpBonus = 0;
                    let totalStarsBonus = 0;
                    for (const eq of petEquipment) {
                      const item = equipmentItems.find(i => i.id === eq.itemId);
                      if (item) {
                        if (item.bonusType === 'exp') totalExpBonus += item.bonusValue;
                        if (item.bonusType === 'stars') totalStarsBonus += item.bonusValue;
                      }
                    }
                    return (
                      <div className="mt-2 flex gap-3 justify-center text-xs">
                        {totalExpBonus > 0 && <span className="text-gray-700 font-medium">經驗值 +{totalExpBonus}%</span>}
                        {totalStarsBonus > 0 && <span className="text-yellow-600 font-medium">星星 +{totalStarsBonus}%</span>}
                      </div>
                    );
                  })()}
                  {/* 裝備商店展開（點擊槽位後） */}
                  {equipShopSlot && (
                    <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {{ hat: '🎩 帽子', necklace: '📿 項鍊', wings: '🪶 翅膀', weapon: '🗡️ 武器' }[equipShopSlot]} 裝備
                        </span>
                        <button onClick={() => setEquipShopSlot(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const slotItems = equipmentItems.filter(i => i.slot === equipShopSlot);
                          const ownedItems = slotItems.filter(i => petEquipment.some(e => e.itemId === i.id) || purchases.some(p => p.itemId === i.id));
                          const unownedItems = slotItems.filter(i => !petEquipment.some(e => e.itemId === i.id) && !purchases.some(p => p.itemId === i.id));
                          const stageLabels: Record<number, string> = { 1: '第1階', 2: '第2階', 3: '第3階', 4: '第4階', 5: '第5階' };
                          const renderItem = (item: EquipmentItem) => {
                            const isEquipped = petEquipment.some(e => e.itemId === item.id);
                            const isOwned = purchases.some(p => p.itemId === item.id);
                            const canAfford = profile.stars >= item.price;
                            const stageLocked = item.requiredStage && pet && pet.stage < item.requiredStage;
                            const speciesLocked = item.exclusiveSpecies && item.exclusiveSpecies !== pet?.species;
                            const rarityColors: Record<string, string> = {
                              normal: 'border-gray-200',
                              rare: 'border-blue-300 bg-blue-50/50',
                              legendary: 'border-yellow-300 bg-yellow-50/50'
                            };
                            return (
                              <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg border ${rarityColors[item.rarity]}`}>
                                <div className="text-2xl">{item.icon}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    {item.rarity !== 'normal' && (
                                      <span className={`text-xs px-1 rounded ${item.rarity === 'rare' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {RARITY_LABELS[item.rarity].label}
                                      </span>
                                    )}
                                    {isOwned && !isEquipped && (
                                      <span className="text-xs px-1 rounded bg-green-100 text-green-700">已擁有</span>
                                    )}
                                    {item.category === 'set' && (
                                      <span className="text-xs px-1 rounded bg-purple-100 text-purple-700">套裝</span>
                                    )}
                                    {item.category === 'exclusive' && (
                                      <span className="text-xs px-1 rounded bg-orange-100 text-orange-700">專屬</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-green-600">{item.description}</div>
                                  {speciesLocked && (
                                    <div className="text-xs text-red-500">僅限 {petSpecies.find(s => s.species === item.exclusiveSpecies)?.name || item.exclusiveSpecies} 使用</div>
                                  )}
                                  {item.requiredStage && item.requiredStage > 1 && (
                                    <div className={`text-xs ${pet && pet.stage >= item.requiredStage ? 'text-gray-400' : 'text-red-500'}`}>
                                      需進化至{stageLabels[item.requiredStage]}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {isEquipped ? (
                                    <button
                                      onClick={async () => {
                                        const result = await api.unequipPet(profile.id, item.slot);
                                        if (result.success) {
                                          setPetEquipment(result.equipment);
                                        }
                                      }}
                                      className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                    >
                                      卸下
                                    </button>
                                  ) : stageLocked ? (
                                    <span className="px-2 py-1 text-xs text-gray-400">🔒 需{stageLabels[item.requiredStage!]}</span>
                                  ) : speciesLocked ? (
                                    <span className="px-2 py-1 text-xs text-orange-500">不可裝備</span>
                                  ) : isOwned ? (
                                    <button
                                      onClick={async () => {
                                        const result = await api.equipPet(profile.id, item.id);
                                        if (result.success) {
                                          setPetEquipment(result.equipment);
                                        } else {
                                          alert(result.error || '裝備失敗');
                                        }
                                      }}
                                      className="px-2 py-1 text-xs bg-gray-700 text-white rounded-full hover:bg-gray-800 font-medium"
                                    >
                                      裝備
                                    </button>
                                  ) : item.category !== 'common' ? (
                                    <button
                                      onClick={() => { setActiveTab('shop'); setShopSubTab('chests'); }}
                                      className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium"
                                    >📦 去開寶箱</button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        if (!canAfford) {
                                          alert('星星不足！');
                                          return;
                                        }
                                        const result = await api.equipPet(profile.id, item.id);
                                        if (result.success) {
                                          setPetEquipment(result.equipment);
                                          setProfile(prev => ({ ...prev, stars: result.newStars }));
                                          setPurchases(prev => [...prev, { itemId: item.id, profileId: profile.id } as ProfilePurchase]);
                                          showToast(`⭐ -${item.price} → 剩餘 ${result.newStars}`, 'spend');
                                        } else {
                                          alert('裝備失敗');
                                        }
                                      }}
                                      disabled={!canAfford}
                                      className={`px-2 py-1 text-xs rounded-full font-medium ${canAfford ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                      ⭐ {item.price}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          };
                          return (
                            <>
                              {ownedItems.length > 0 && (
                                <>
                                  <div className="text-xs text-gray-500 font-medium">已擁有</div>
                                  {ownedItems.map(renderItem)}
                                </>
                              )}
                              {ownedItems.length > 0 && unownedItems.length > 0 && (
                                <div className="border-t border-gray-200 my-1" />
                              )}
                              {unownedItems.length > 0 && (
                                <>
                                  <div className="text-xs text-gray-500 font-medium">未購買</div>
                                  {unownedItems.map(renderItem)}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 餵食按鈕 */}
                <button
                  onClick={handleFeedPet}
                  disabled={profile.stars < 5 || (pet?.hunger ?? 0) >= 100}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all ${(pet?.hunger ?? 0) >= 100 ? 'bg-gray-400 cursor-not-allowed' : profile.stars >= 5 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  {(pet?.hunger ?? 0) >= 100 ? '🍖 已經吃飽了' : '🍖 餵食寵物 (5 ⭐)'}
                </button>
                {(pet?.hunger ?? 0) >= 100 ? <p className="text-xs text-green-600 mt-1">寵物已經吃飽囉！</p> : profile.stars < 5 && <p className="text-xs text-red-500 mt-1">星星不足</p>}

                {/* 我的寵物列表（多寵物切換） */}
                {allPets.length > 1 && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">我的寵物們</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {allPets.map(p => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            if (p.isActive) return;
                            try {
                              await api.switchPet(profile.id, p.id);
                              const [petData, allPetsData] = await Promise.all([
                                api.getPet(profile.id),
                                api.getAllPets(profile.id)
                              ]);
                              setPet(petData.hasPet === false ? null : petData);
                              setAllPets(allPetsData);
                            } catch {
                              alert('切換失敗');
                            }
                          }}
                          className={`flex flex-col items-center p-2 rounded-lg transition-all ${p.isActive ? 'bg-gray-200 border-2 border-gray-900' : 'bg-white border-2 border-gray-200 hover:border-gray-300'}`}
                        >
                          <PixelPet species={p.species} stage={p.stage} evolutionPath={p.evolutionPath} rarity={p.rarity || 'normal'} size={3} scale={1} animate={false} showAura={false} />
                          <span className="text-xs text-gray-600">{p.name}</span>
                          <span className="text-xs text-gray-400">Lv.{p.level}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 進化選擇按鈕 */}
                {pet.needsEvolutionChoice && (
                  <button
                    onClick={() => setShowEvolutionChoice(true)}
                    className="w-full mb-3 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800"
                  >
                    🔮 選擇進化路線！（Lv.{pet.level} 可進化）
                  </button>
                )}

                {/* 孵化新蛋按鈕 */}
                <button
                  onClick={() => setShowEggSelection(true)}
                  className="mt-3 w-full py-2 rounded-lg font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300"
                >
                  + 孵化新寵物蛋
                </button>

                {/* 說明 */}
                <div className="mt-4 text-xs text-gray-500 text-left bg-gray-50 rounded-lg p-3">
                  <p className="font-medium mb-1">💡 如何養成寵物？</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>每答對 1 題 → +5 經驗值、+2 快樂度</li>
                    <li>餵食 → +30 飽足度、+20 快樂度</li>
                    <li>飽足度和快樂度會隨時間下降</li>
                    <li>達到特定等級會進化！</li>
                    <li>裝備道具可加成經驗值和星星！</li>
                    <li>收集不同物種解鎖圖鑑！</li>
                  </ul>
                </div>
              </div>
            )}
          </Card>
        )}

        {petEvolved && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
              <div className="flex justify-center mb-4">
                {petEvolved.species && petEvolved.stage ? (
                  <PixelPet species={petEvolved.species} stage={petEvolved.stage} evolutionPath={petEvolved.evolutionPath} rarity={petEvolved.rarity || 'normal'} size={5} scale={2.5} animate={true} showAura={true} />
                ) : (
                  <span className="text-6xl">{petEvolved.stageIcon || '🎉'}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">🎉 寵物進化了！</h2>
              <p className="text-gray-600 mb-4">你的寵物進化成了 <span className="font-bold">{petEvolved.stageName}</span>！</p>
              <button onClick={() => setPetEvolved(null)} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">太棒了！</button>
            </div>
          </div>
        )}

        {/* 進化選擇 Modal */}
        {showEvolutionChoice && pet && (() => {
          const speciesInfo = petSpecies.find(s => s.species === pet.species);
          if (!speciesInfo) return null;
          const handleChooseEvolution = async (path: 'A' | 'B') => {
            if (!confirm(`確定選擇${path === 'A' ? speciesInfo.pathA.name : speciesInfo.pathB.name}嗎？\n\n⚠️ 選擇後不可更改！`)) return;
            try {
              const res = await fetch(`/api/profiles/${profile.id}/pet/choose-evolution`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
              });
              const data = await res.json();
              if (data.success) {
                const [petData, allPetsData] = await Promise.all([
                  api.getPet(profile.id),
                  api.getAllPets(profile.id)
                ]);
                setPet(petData.hasPet === false ? null : petData);
                setAllPets(allPetsData);
                setShowEvolutionChoice(false);
                setPetEvolved({ stageName: data.stageName, species: pet.species, stage: 3, rarity: pet.rarity, evolutionPath: path });
              }
            } catch { alert('進化選擇失敗'); }
          };
          return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-bounce-in max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center text-gray-700 mb-2">🔮 進化分歧點！</h2>
                <p className="text-sm text-gray-600 text-center mb-4">{pet.name} 達到了 Lv.30，可以選擇進化路線了！</p>
                <div className="text-center mb-4">
                  <PixelPet species={pet.species} stage={2} rarity={pet.rarity || 'normal'} size={3} scale={2} animate={true} showAura={true} />
                </div>
                <div className="space-y-3">
                  {(['A', 'B'] as const).map(path => {
                    const pathInfo = path === 'A' ? speciesInfo.pathA : speciesInfo.pathB;
                    const pathStages = path === 'A' ? speciesInfo.stages.pathA : speciesInfo.stages.pathB;
                    return (
                      <div key={path} className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-gray-700">路線 {path}</span>
                          <span className="text-sm font-medium text-gray-700">{pathInfo.name}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {pathInfo.types.map((t: string) => <TypeBadge key={t} type={t} />)}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          {pathStages.map((st: { stage: number; name: string; minLevel: number }) => (
                            <div key={st.stage} className="text-center">
                              <PixelPet species={pet.species} stage={st.stage} evolutionPath={path} rarity={pet.rarity || 'normal'} size={2} scale={1.2} animate={false} showAura={false} />
                              <div className="text-xs text-gray-500">{st.name}</div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleChooseEvolution(path)}
                          className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"
                        >
                          選擇路線 {path}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setShowEvolutionChoice(false)} className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700">稍後再選</button>
              </div>
            </div>
          );
        })()}

        {activeTab === 'pokedex' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">寵物圖鑑</h2>
            {pokedexData && (
              <div>
                {/* 收集進度 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">收集進度</span>
                    <span className="text-sm font-bold text-gray-700">{pokedexData.unlocked} / {pokedexData.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-gray-900 h-2.5 rounded-full transition-all" style={{ width: `${(pokedexData.unlocked / pokedexData.total) * 100}%` }}></div>
                  </div>
                </div>

                {/* 篩選標籤 */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {([['all', '全部'], ['normal', '普通'], ['rare', '稀有'], ['legendary', '傳說'], ['owned', '已擁有']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setPokedexFilter(key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        pokedexFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {key === 'rare' ? '💎 ' : key === 'legendary' ? '🌟 ' : ''}{label}
                    </button>
                  ))}
                </div>

                {/* 圖鑑網格 */}
                <div className="grid grid-cols-3 gap-3">
                  {pokedexData.entries
                    .filter(entry => {
                      if (pokedexFilter === 'all') return true;
                      if (pokedexFilter === 'owned') return entry.unlocked;
                      return entry.rarity === pokedexFilter;
                    })
                    .map(entry => {
                      const rarityInfo = RARITY_LABELS[entry.rarity];
                      return (
                        <div
                          key={entry.species}
                          onClick={() => setPokedexDetail(pokedexDetail === entry.species ? null : entry.species)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                            entry.unlocked
                              ? `${rarityInfo.border} ${rarityInfo.bg} hover:scale-105`
                              : 'border-gray-200 bg-gray-100'
                          }`}
                        >
                          <div className="mb-1 flex justify-center">
                            {entry.unlocked ? (
                              <PixelPet species={entry.species} stage={1} rarity={entry.rarity} size={3} scale={1.2} animate={false} showAura={false} />
                            ) : (
                              <span className="text-3xl">❓</span>
                            )}
                          </div>
                          <div className={`text-xs font-medium ${entry.unlocked ? rarityInfo.color : 'text-gray-400'}`}>
                            {entry.unlocked ? entry.name : '???'}
                          </div>
                          {entry.unlocked && entry.ownedCount > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5">x{entry.ownedCount}</div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* 詳情展開 */}
                {pokedexDetail && (() => {
                  const entry = pokedexData.entries.find(e => e.species === pokedexDetail);
                  if (!entry || !entry.unlocked) return null;
                  const rarityInfo = RARITY_LABELS[entry.rarity];
                  return (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${rarityInfo.border} ${rarityInfo.bg}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <PixelPet species={entry.species} stage={1} rarity={entry.rarity} size={2} scale={1.2} animate={false} showAura={false} />
                          <div>
                            <div className="font-bold text-gray-700">{entry.name}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                entry.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
                                entry.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {rarityInfo.label}
                              </span>
                              <TypeBadge type={entry.baseType} />
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setPokedexDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                      {entry.ability && (
                        <div className="text-xs bg-white/60 rounded p-1.5 mb-3">
                          <span className="font-medium text-gray-700">{entry.ability.name}</span>
                          <span className="text-gray-500 ml-1">{entry.ability.desc}</span>
                        </div>
                      )}
                      {/* 分支進化樹 */}
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="flex items-end gap-1 mb-2">
                          {entry.stages.shared.map((st: { stage: number; name: string; minLevel: number }, idx: number) => (
                            <React.Fragment key={st.stage}>
                              <div className="text-center flex-shrink-0">
                                <PixelPet species={entry.species} stage={st.stage} rarity={entry.rarity} size={2} scale={1} animate={false} showAura={false} />
                                <div className="text-xs text-gray-500">{st.name}</div>
                              </div>
                              {idx < entry.stages.shared.length - 1 && <span className="text-gray-300 text-xs mb-4">→</span>}
                            </React.Fragment>
                          ))}
                          <span className="text-gray-300 text-xs mb-4">→</span>
                        </div>
                        {(['A', 'B'] as const).map(path => {
                          const pathStages = path === 'A' ? entry.stages.pathA : entry.stages.pathB;
                          const pathInfo = path === 'A' ? entry.pathA : entry.pathB;
                          const unlocked = entry.unlockedPaths[path];
                          return (
                            <div key={path} className={`flex items-center gap-1 mb-1 ${unlocked ? '' : 'opacity-50'}`}>
                              <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                                <span className="text-xs font-bold text-gray-500">{path}</span>
                                {pathInfo.types.map((t: string) => <TypeBadge key={t} type={t} size="sm" />)}
                              </div>
                              {pathStages.map((st: { stage: number; name: string; minLevel: number }) => (
                                <div key={st.stage} className="text-center flex-shrink-0">
                                  {unlocked ? (
                                    <PixelPet species={entry.species} stage={st.stage} evolutionPath={path} rarity={entry.rarity} size={2} scale={1} animate={false} showAura={false} />
                                  ) : (
                                    <div className="w-8 h-8 flex items-center justify-center text-lg">❓</div>
                                  )}
                                  <div className="text-xs text-gray-400">{unlocked ? st.name : '???'}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      {entry.ownedCount > 0 && (
                        <div className="mt-2 text-xs text-gray-500 text-right">擁有數量：{entry.ownedCount}</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {!pokedexData && <p className="text-gray-500 text-center py-4">載入中...</p>}
          </Card>
        )}

        {activeTab === 'leaderboard' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">排行榜</h2>
            {/* 排行榜類型切換 */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setLeaderboardType('week')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${leaderboardType === 'week' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>本週答題</button>
              <button onClick={() => setLeaderboardType('month')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${leaderboardType === 'month' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>本月精熟</button>
              <button onClick={() => setLeaderboardType('all')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${leaderboardType === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>累積星星</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {leaderboardType === 'week' && '本週答對題數排名 📝'}
              {leaderboardType === 'month' && '本月新精熟單字排名 📚'}
              {leaderboardType === 'all' && '累積星星排名 ⭐'}
            </p>
            {/* 排行榜列表 */}
            <div className="space-y-2">
              {leaderboard.map(entry => {
                const isMe = entry.id === profile.id;
                const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                return (
                  <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-gray-100 border-2 border-gray-400' : 'bg-gray-50'}`}>
                    <div className="text-xl w-8 text-center">{rankEmoji}</div>
                    <Avatar name={entry.name} equippedFrame={entry.equippedFrame} petSpecies={entry.petSpecies || undefined} petStage={entry.petStage || undefined} size="sm" />
                    <div className="flex-1">
                      <div className="font-medium">{entry.name} {isMe && <span className="text-xs text-gray-700">(你)</span>}</div>
                      <div className="text-xs text-gray-500">Lv.{entry.petLevel}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-700">
                        {leaderboardType === 'week' && `答對 ${entry.weeklyStars} 題`}
                        {leaderboardType === 'month' && `精熟 ${entry.monthlyMastered} 字`}
                        {leaderboardType === 'all' && `${entry.totalStars} ⭐`}
                      </div>
                    </div>
                  </div>
                );
              })}
              {leaderboard.length === 0 && <p className="text-gray-500 text-center py-4">暫無排名資料</p>}
            </div>
          </Card>
        )}

        {activeTab === 'mystery' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">🔮 神秘獎勵</h2>
            {/* 子分頁切換 */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setMysteryTab('chests')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mysteryTab === 'chests' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                寶箱 {profileChests.reduce((sum, c) => sum + c.quantity, 0) > 0 && `(${profileChests.reduce((sum, c) => sum + c.quantity, 0)})`}
              </button>
              <button onClick={() => setMysteryTab('wheel')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mysteryTab === 'wheel' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>轉盤</button>
              <button onClick={() => setMysteryTab('stickers')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mysteryTab === 'stickers' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>貼紙冊</button>
              <button onClick={() => setMysteryTab('titles')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mysteryTab === 'titles' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>稱號</button>
            </div>

            {/* 寶箱區域 */}
            {mysteryTab === 'chests' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">開啟寶箱獲得隨機獎勵！道具、寵物蛋、貼紙、星星、甚至稀有裝備！</p>
                <div className="grid grid-cols-2 gap-3">
                  {['bronze', 'silver', 'gold', 'diamond'].map(type => {
                    const chest = profileChests.find(c => c.chestType === type);
                    const quantity = chest?.quantity || 0;
                    const config: Record<string, { name: string; color: string; light: string; dark: string; band: string }> = {
                      bronze: { name: '銅寶箱', color: '#cd7f32', light: '#daa06d', dark: '#8b5a2b', band: '#f0d0a0' },
                      silver: { name: '銀寶箱', color: '#a8a8a8', light: '#d0d0d0', dark: '#707070', band: '#e8e8e8' },
                      gold: { name: '金寶箱', color: '#daa520', light: '#ffd700', dark: '#b8860b', band: '#fff0a0' },
                      diamond: { name: '鑽石寶箱', color: '#5b9bd5', light: '#a0d2f0', dark: '#2a6496', band: '#d0e8ff' }
                    };
                    const c = config[type];
                    return (
                      <div key={type} className={`p-4 rounded-lg border-2 text-center ${quantity > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-gray-50 opacity-50'}`}>
                        <div className="mx-auto w-14 h-12 rounded-lg relative mb-2" style={{ background: `linear-gradient(135deg, ${c.light}, ${c.color})`, border: `2px solid ${c.dark}`, boxShadow: `0 2px 4px ${c.dark}40` }}>
                          <div className="absolute rounded-t-lg inset-x-0 top-0 h-[40%]" style={{ background: `linear-gradient(to bottom, ${c.light}80, transparent)` }} />
                          <div className="absolute top-[45%] left-0 right-0 h-[3px]" style={{ backgroundColor: c.band }} />
                          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-sm" style={{ backgroundColor: c.band, border: `1.5px solid ${c.dark}` }} />
                        </div>
                        <div className="font-medium" style={{ color: c.color }}>{c.name}</div>
                        <div className="text-sm text-gray-500 mb-2">x {quantity}</div>
                        <button
                          onClick={async () => {
                            if (quantity <= 0) return;
                            setOpeningChest(type);
                            const result = await api.openChest(profile.id, type);
                            setTimeout(() => {
                              setOpeningChest(null);
                              if (result.success) {
                                setChestReward(result.reward);
                                // 重新載入寶箱數量與相關資料
                                api.getProfileChests(profile.id).then(setProfileChests);
                                api.getProfileStickers(profile.id).then(setProfileStickers);
                                api.getProfileTitles(profile.id).then(setProfileTitles);
                                api.getProfileItems(profile.id).then(setProfileItems);
                                if (result.reward.type === 'pet_egg') {
                                  api.getPet(profile.id).then(d => setPet(d.hasPet === false ? null : d));
                                  api.getAllPets(profile.id).then(setAllPets);
                                }
                              }
                            }, 1500);
                          }}
                          disabled={quantity <= 0 || openingChest !== null}
                          className={`w-full py-2 rounded-lg text-sm font-medium ${quantity > 0 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                          {openingChest === type ? '開啟中...' : '開啟'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {profileChests.length === 0 && (
                  <p className="text-center text-gray-400 mt-4">完成每日任務、達成成就來獲得寶箱！</p>
                )}
              </div>
            )}

            {/* 轉盤區域 */}
            {mysteryTab === 'wheel' && (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">每天可以免費轉一次，試試你的運氣！</p>
                <div className="relative w-64 h-64 mx-auto mb-4">
                  {/* 轉盤背景 */}
                  <div className={`w-full h-full rounded-full border-8 border-gray-400 bg-gray-100 ${spinning ? 'animate-spin' : ''}`} style={{ animationDuration: '0.5s' }}>
                    <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎰</div>
                        <div className="text-sm text-gray-500">幸運轉盤</div>
                      </div>
                    </div>
                  </div>
                  {/* 獎勵顯示在周圍 */}
                  {wheelRewards.slice(0, 8).map((reward, i) => {
                    const angle = (i * 45 - 90) * (Math.PI / 180);
                    const x = 50 + 40 * Math.cos(angle);
                    const y = 50 + 40 * Math.sin(angle);
                    return (
                      <div key={reward.id} className="absolute text-2xl" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                        {reward.icon}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={async () => {
                    if (spinning) return;
                    setSpinning(true);
                    setWheelResult(null);
                    const result = await api.spinWheel(profile.id);
                    setTimeout(() => {
                      setSpinning(false);
                      if (result.success) {
                        setWheelResult(result.reward);
                        setCanSpin(false);
                        // 更新本地狀態（不重新載入頁面）
                        if (result.newStars !== undefined) {
                          setProfile(prev => ({ ...prev, stars: result.newStars! }));
                        }
                        if (result.chests) {
                          setProfileChests(result.chests);
                        }
                        if (result.stickers) {
                          setProfileStickers(result.stickers);
                        }
                      } else if (result.error === 'Already spun today') {
                        setCanSpin(false);
                        alert('今天已經轉過了，明天再來！');
                      }
                    }, 2000);
                  }}
                  disabled={spinning || !canSpin}
                  className={`px-8 py-3 rounded-lg text-lg font-bold ${!spinning && canSpin ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {spinning ? '轉動中...' : canSpin ? '🎲 免費轉一次！' : '明天再來'}
                </button>
              </div>
            )}

            {/* 貼紙冊區域 */}
            {mysteryTab === 'stickers' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">收集貼紙，或賣出換星星！長按貼紙可賣出。</p>
                <div className="space-y-4">
                  {stickerSeries.map(series => {
                    const ownedIds = profileStickers.map(s => s.stickerId);
                    const ownedCount = series.stickers.filter(s => ownedIds.includes(s.id)).length;
                    const isComplete = ownedCount === series.total;
                    const sellPrice = series.rarity === 'legendary' ? 20 : series.rarity === 'rare' ? 8 : 3;
                    const rarityColors: Record<string, string> = {
                      common: 'border-gray-300 bg-gray-50',
                      rare: 'border-blue-300 bg-blue-50',
                      legendary: 'border-yellow-400 bg-yellow-50'
                    };
                    return (
                      <div key={series.id} className={`p-3 rounded-lg border-2 ${rarityColors[series.rarity]} ${isComplete ? 'ring-2 ring-green-400' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{series.icon}</span>
                            <span className="font-medium">{series.name}</span>
                            {isComplete && <span className="text-green-500 text-sm">✓ 完成</span>}
                          </div>
                          <span className="text-sm text-gray-500">{ownedCount}/{series.total} (賣 {sellPrice}⭐)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {series.stickers.map(sticker => {
                            const owned = ownedIds.includes(sticker.id);
                            return (
                              <button
                                key={sticker.id}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${owned ? 'bg-white shadow hover:bg-red-50 hover:ring-2 hover:ring-red-300 transition-all' : 'bg-gray-200 cursor-default'}`}
                                title={owned ? `${sticker.name} (點擊賣出 ${sellPrice}⭐)` : '???'}
                                onClick={async () => {
                                  if (!owned) return;
                                  if (!confirm(`確定要賣出「${sticker.name}」換 ${sellPrice} 顆星星嗎？`)) return;
                                  const result = await api.sellItem(profile.id, 'sticker', sticker.id);
                                  if (result.success) {
                                    setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                    const stickers = await api.getProfileStickers(profile.id);
                                    setProfileStickers(stickers);
                                    showToast(`賣出 ${sticker.name} +${result.sellPrice}⭐`, 'earn');
                                  }
                                }}
                              >
                                {owned ? sticker.icon : '❓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 稱號區域 */}
            {mysteryTab === 'titles' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">解鎖稱號並裝備展示！</p>
                {/* 目前裝備的稱號 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-700 mb-1">目前稱號</div>
                  {profile.equippedTitle ? (
                    <div className="font-bold" style={{ color: titles.find(t => t.id === profile.equippedTitle)?.color }}>
                      {titles.find(t => t.id === profile.equippedTitle)?.name || '未知'}
                    </div>
                  ) : (
                    <div className="text-gray-400">尚未裝備稱號</div>
                  )}
                </div>
                <div className="space-y-2">
                  {titles.map(title => {
                    const unlocked = profileTitles.some(pt => pt.titleId === title.id);
                    const equipped = profile.equippedTitle === title.id;
                    const rarityLabels: Record<string, string> = { common: '普通', rare: '稀有', epic: '史詩', legendary: '傳說', mythic: '神話' };
                    const rarityColors: Record<string, string> = { common: 'bg-gray-100', rare: 'bg-blue-100', epic: 'bg-gray-100', legendary: 'bg-yellow-100', mythic: 'bg-red-100' };
                    return (
                      <div key={title.id} className={`p-3 rounded-lg ${rarityColors[title.rarity]} ${unlocked ? '' : 'opacity-50'} ${equipped ? 'ring-2 ring-gray-400' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold" style={{ color: unlocked ? title.color : '#999', textShadow: title.glow && unlocked ? `0 0 10px ${title.color}` : 'none' }}>
                              {unlocked ? title.name : '???'}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">{rarityLabels[title.rarity]}</span>
                          </div>
                          {unlocked && (
                            <button
                              onClick={async () => {
                                const newTitleId = equipped ? null : title.id;
                                const result = await api.equipTitle(profile.id, newTitleId);
                                if (result.success) {
                                  setProfile(prev => ({ ...prev, equippedTitle: newTitleId }));
                                }
                              }}
                              className={`px-3 py-1 text-xs rounded-full ${equipped ? 'bg-gray-400 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                            >
                              {equipped ? '卸下' : '裝備'}
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{unlocked ? title.description : '繼續努力解鎖此稱號'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 寶箱開啟獎勵彈窗 */}
        {chestReward && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
              <div className="text-6xl mb-4">{chestReward.icon}</div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">🎉 恭喜獲得！</h2>
              <div className={`text-lg font-bold mb-2 ${chestReward.rarity === 'legendary' ? 'text-yellow-500' : chestReward.rarity === 'epic' ? 'text-purple-500' : chestReward.rarity === 'rare' ? 'text-blue-500' : 'text-gray-700'}`}>
                {chestReward.name}
              </div>
              {chestReward.type === 'consumable' && chestReward.items && (
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {chestReward.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                      {item.icon} {item.name}
                    </span>
                  ))}
                </div>
              )}
              {chestReward.type === 'pet_egg' && chestReward.species && (
                <div className="mb-2">
                  <div className="text-sm text-gray-500">{chestReward.species.description}</div>
                  <div className="text-sm font-medium text-yellow-600 mt-1">商店價值：⭐ {chestReward.species.price}</div>
                </div>
              )}
              {chestReward.type === 'equipment' && chestReward.equipment && (
                <div className="mb-2">
                  <div className="text-sm text-gray-500">{chestReward.equipment.description}</div>
                  <div className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${chestReward.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-700' : chestReward.rarity === 'rare' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {chestReward.rarity === 'legendary' ? '傳說' : chestReward.rarity === 'rare' ? '稀有' : '普通'}裝備
                  </div>
                </div>
              )}
              {chestReward.duplicate && (
                <div className="text-sm text-gray-500 mb-2">
                  已擁有，轉換為 {chestReward.bonusStars} 星星
                </div>
              )}
              {chestReward.type === 'equipment' && chestReward.equipment && !chestReward.duplicate ? (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={async () => {
                      const result = await api.equipPet(profile.id, chestReward.equipment!.id);
                      if (result.success) {
                        setPetEquipment(result.equipment);
                        setPurchases(prev => [...prev, { itemId: chestReward.equipment!.id, profileId: profile.id } as ProfilePurchase]);
                        showToast(`已裝備 ${chestReward.name}！`, 'earn');
                      }
                      setChestReward(null);
                    }}
                    className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
                  >
                    立即裝備
                  </button>
                  <button onClick={() => setChestReward(null)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">稍後再說</button>
                </div>
              ) : (
                <button onClick={() => setChestReward(null)} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">太棒了！</button>
              )}
            </div>
          </div>
        )}

        {/* 轉盤獎勵彈窗 */}
        {wheelResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
              <div className="text-6xl mb-4">{wheelResult.icon}</div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">🎰 轉盤獎勵！</h2>
              <div className="text-lg font-bold text-gray-700 mb-4">{wheelResult.name}</div>
              <button onClick={() => setWheelResult(null)} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">太棒了！</button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">測驗歷史紀錄</h2>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {profile.quizSessions.slice().reverse().map(session => {
                const file = files.find(f => f.id === session.fileId);
                const correctCount = session.results.filter(r => r.correct).length;
                const rate = session.results.length > 0 ? Math.round((correctCount / session.results.length) * 100) : 0;
                const wrongResults = session.results.filter(r => !r.correct);
                const correctResults = session.results.filter(r => r.correct);
                const isExpanded = expandedSessionId === session.id;

                const wrongWords = wrongResults
                  .map(r => wordMap.get(r.wordId))
                  .filter((w): w is Word => w !== undefined);

                const reviewableWords = file
                  ? wrongWords.filter(w => !masteredWordIds.includes(w.id))
                  : [];

                const allWrongMastered = wrongWords.length > 0 && reviewableWords.length === 0;

                return (
                  <div key={session.id} className="bg-gray-50 rounded-lg overflow-hidden">
                    <div
                      className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{session.customQuizName || file?.name || '已刪除的檔案'}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-sm ${session.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {session.completed ? '完成' : '中斷'}
                          </span>
                          <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(session.timestamp)} · 正確 {correctCount}/{session.results.length} · {rate}%
                      </div>
                      {wrongResults.length > 0 && !isExpanded && (
                        <div className="text-xs text-red-500 mt-1">
                          答錯: {wrongWords.slice(0, 3).map(w => w.english).join(', ')}{wrongWords.length > 3 ? ` ...等${wrongWords.length}個` : ''}
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-3 bg-white">
                        <div className="text-xs text-gray-500 mb-2">耗時 {formatDuration(session.duration)}</div>

                        {session.results.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">測驗單字：</p>
                            <div className="flex flex-wrap gap-1">
                              {correctResults.map((r, i) => {
                                const word = wordMap.get(r.wordId);
                                return word ? (
                                  <span key={`c-${i}`} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                    ✓ {word.english} = {word.chinese}
                                  </span>
                                ) : null;
                              })}
                              {wrongResults.map((r, i) => {
                                const word = wordMap.get(r.wordId);
                                return word ? (
                                  <span key={`w-${i}`} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                                    ✗ {word.english} = {word.chinese}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {wrongResults.length > 0 && (
                          <div className="pt-2 border-t border-gray-100">
                            {!file ? (
                              <p className="text-xs text-gray-400">單字檔案已刪除，無法複習</p>
                            ) : allWrongMastered ? (
                              <p className="text-xs text-green-600">✓ 錯誤單字已全部精熟</p>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartReview(file, reviewableWords);
                                }}
                                className="w-full text-sm py-2 px-4 rounded-lg font-bold transition-all transform active:scale-95 bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
                              >
                                🔄 複習這次測驗的錯誤單字 ({reviewableWords.length}個)
                              </button>
                            )}
                          </div>
                        )}

                        {wrongResults.length === 0 && (
                          <p className="text-xs text-green-600 pt-2 border-t border-gray-100">✓ 全部答對！無需複習</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {profile.quizSessions.length === 0 && <p className="text-gray-500 text-center py-4">還沒有測驗紀錄，開始你的第一次測驗吧！</p>}
            </div>
          </Card>
        )}

        {activeTab === 'badges' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">成就徽章</h2>
            <p className="text-sm text-gray-500 mb-4">完成特定目標來解鎖徽章！</p>
            <div className="grid grid-cols-2 gap-3">
              {badges.map(badge => {
                const unlocked = profileBadges.some(pb => pb.badgeId === badge.id);
                const rarityColors: Record<string, string> = {
                  common: 'from-gray-100 to-gray-200 border-gray-300',
                  rare: 'from-blue-100 to-blue-200 border-blue-400',
                  epic: 'from-purple-100 to-purple-200 border-gray-400',
                  legendary: 'from-yellow-100 to-orange-200 border-yellow-500'
                };
                const rarityLabels: Record<string, string> = {
                  common: '普通',
                  rare: '稀有',
                  epic: '史詩',
                  legendary: '傳說'
                };
                return (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border-2 bg-gradient-to-br ${rarityColors[badge.rarity]} ${unlocked ? '' : 'opacity-50 grayscale'}`}
                  >
                    <div className="text-3xl text-center mb-1">{unlocked ? badge.icon : '🔒'}</div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{badge.name}</div>
                      <div className="text-xs text-gray-500">{badge.description}</div>
                      <div className={`text-xs mt-1 ${unlocked ? 'text-green-600' : 'text-gray-400'}`}>
                        {unlocked ? '✓ 已解鎖' : rarityLabels[badge.rarity]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {badges.length === 0 && <p className="text-gray-500 text-center py-4">載入中...</p>}
          </Card>
        )}

        {activeTab === 'shop' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-gray-700">星星商店</h2>
              <div className="text-lg font-bold text-yellow-600">⭐ {profile.stars}</div>
            </div>

            {/* 商店子分頁 */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setShopSubTab('consumables')} className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${shopSubTab === 'consumables' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                🎴 道具卡
              </button>
              <button onClick={() => setShopSubTab('chests')} className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${shopSubTab === 'chests' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                📦 寶箱
              </button>
              <button onClick={() => setShopSubTab('equipment')} className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${shopSubTab === 'equipment' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                ⚔️ 裝備
              </button>
              <button onClick={() => setShopSubTab('decorations')} className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${shopSubTab === 'decorations' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                🎨 裝飾
              </button>
            </div>

            {/* 消耗品道具 */}
            {shopSubTab === 'consumables' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">購買道具卡，在測驗中使用！用完會消耗。</p>
                <div className="space-y-3">
                  {consumables.map(item => {
                    const owned = profileItems.find(p => p.itemId === item.id)?.quantity || 0;
                    const canAfford = profile.stars >= item.price;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{item.icon}</div>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {owned > 0 && (
                            <>
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                擁有 {owned}
                              </span>
                              <button
                                onClick={async () => {
                                  const result = await api.sellItem(profile.id, 'consumable', item.id, 1);
                                  if (result.success) {
                                    setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                    const items = await api.getProfileItems(profile.id);
                                    setProfileItems(items);
                                    showToast(`賣出 ${item.name} +${result.sellPrice}⭐`, 'earn');
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-600 hover:bg-red-200"
                              >
                                賣 {Math.ceil(item.price / 2)}⭐
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => {
                              if (canAfford) {
                                const result = await api.purchaseConsumable(profile.id, item.id, 1);
                                if (result.success) {
                                  setProfileItems(result.items || []);
                                  if (result.newStars !== undefined) {
                                    setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                    showToast(`⭐ -${item.price} → 剩餘 ${result.newStars}`, 'spend');
                                  }
                                } else {
                                  alert(result.error || '購買失敗');
                                }
                              }
                            }}
                            disabled={!canAfford}
                            className={`px-3 py-1 text-sm rounded-full font-medium ${canAfford ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                          >
                            ⭐ {item.price}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 道具使用說明 */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium mb-1">💡 如何使用道具？</p>
                  <p className="text-xs text-blue-600">進入測驗後，畫面上會顯示你擁有的道具卡，點擊即可使用！</p>
                </div>
              </div>
            )}

            {/* 寶箱購買 */}
            {shopSubTab === 'chests' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">購買寶箱，開啟獲得神秘獎勵！</p>
                <div className="grid grid-cols-2 gap-3">
                  {chestShopItems.map(chest => {
                    const owned = profileChests.find(c => c.chestType === chest.chestType)?.quantity || 0;
                    const canAfford = profile.stars >= chest.price;
                    const chestColors: Record<string, { color: string; light: string; dark: string; band: string }> = {
                      bronze: { color: '#cd7f32', light: '#daa06d', dark: '#8b5a2b', band: '#f0d0a0' },
                      silver: { color: '#a8a8a8', light: '#d0d0d0', dark: '#707070', band: '#e8e8e8' },
                      gold: { color: '#daa520', light: '#ffd700', dark: '#b8860b', band: '#fff0a0' },
                      diamond: { color: '#5b9bd5', light: '#a0d2f0', dark: '#2a6496', band: '#d0e8ff' }
                    };
                    const cc = chestColors[chest.chestType] || chestColors.bronze;
                    return (
                      <div key={chest.id} className={`p-3 rounded-lg border-2 ${canAfford ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                        <div className="flex justify-center mb-2">
                          <div className="w-14 h-12 rounded-lg relative" style={{ background: `linear-gradient(135deg, ${cc.light}, ${cc.color})`, border: `2px solid ${cc.dark}`, boxShadow: `0 2px 4px ${cc.dark}40` }}>
                            <div className="absolute rounded-t-lg inset-x-0 top-0 h-[40%]" style={{ background: `linear-gradient(to bottom, ${cc.light}80, transparent)` }} />
                            <div className="absolute top-[45%] left-0 right-0 h-[3px]" style={{ backgroundColor: cc.band }} />
                            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-sm" style={{ backgroundColor: cc.band, border: `1.5px solid ${cc.dark}` }} />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-sm">{chest.name}</div>
                          <div className="text-xs text-gray-500 mb-2">{chest.description}</div>
                          {owned > 0 && (
                            <div className="text-xs text-green-600 mb-2">已擁有: {owned} 個</div>
                          )}
                          <button
                            onClick={async () => {
                              if (canAfford) {
                                const result = await api.purchaseChest(profile.id, chest.chestType, 1);
                                if (result.success) {
                                  if (result.newStars !== undefined) {
                                    setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                    showToast(`⭐ -${chest.price} → 剩餘 ${result.newStars}`, 'spend');
                                  }
                                  if (result.chests) {
                                    setProfileChests(result.chests);
                                  }
                                } else {
                                  alert(result.error || '購買失敗');
                                }
                              }
                            }}
                            disabled={!canAfford}
                            className={`px-3 py-1 text-xs rounded-full ${canAfford ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                          >
                            ⭐ {chest.price}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-700 font-medium mb-1">📦 如何開啟寶箱？</p>
                  <p className="text-xs text-gray-700">到「神秘」頁籤的「寶箱」分頁開啟你的寶箱！</p>
                </div>
              </div>
            )}

            {/* 裝飾品 */}
            {/* 裝備商店 */}
            {shopSubTab === 'equipment' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">為寵物購買裝備，獲得經驗值和星星加成！</p>
                {!pet && <p className="text-center text-gray-400 py-4">請先孵化一隻寵物</p>}
                {pet && (() => {
                  const slotLabels: Record<string, string> = { hat: '🎩 帽子', necklace: '📿 項鍊', wings: '🪶 翅膀', weapon: '🗡️ 武器' };
                  const stageLabels: Record<number, string> = { 1: '第1階', 2: '第2階', 3: '第3階', 4: '第4階', 5: '第5階' };
                  const rarityColors: Record<string, string> = {
                    normal: 'border-gray-200 bg-white',
                    rare: 'border-blue-300 bg-blue-50',
                    legendary: 'border-yellow-300 bg-yellow-50'
                  };
                  // 套裝效果配置（通用 + 專屬）
                  const allSetConfigs = [
                    { id: 'guardian', name: '守護者套裝', icon: '🛡️', bonuses: ['2件：每場自動 1 次護盾', '3件：所有題目 +3 秒', '4件：星星 +10%'] },
                    { id: 'scholar', name: '學者套裝', icon: '📚', bonuses: ['2件：每場自動 1 次提示', '3件：經驗 +10%', '4件：精熟連對 -1'] },
                    { id: 'lucky', name: '幸運套裝', icon: '🍀', bonuses: ['2件：寶箱品質提升', '3件：每日登入 +3 星', '4件：星星 +15%'] },
                    { id: 'sky_dragon', name: '天空幼龍套裝', icon: '🐲', bonuses: ['2件：答對 +2 額外星星', '3件：寵物經驗 +20%', '4件：Combo 獎勵 x1.5'], exclusive: true },
                    { id: 'crystal_beast', name: '水晶獸套裝', icon: '💎', bonuses: ['2件：護盾次數 +1', '3件：寵物經驗 +15%', '4件：正確星星 x1.3'], exclusive: true },
                    { id: 'nebula_fish', name: '星雲魚套裝', icon: '🌌', bonuses: ['2件：每場自動 1 次跳過', '3件：精熟連對 -1', '4件：星星加成 x1.2'], exclusive: true },
                  ];

                  const handleEquip = async (item: EquipmentItem) => {
                    const result = await api.equipPet(profile.id, item.id);
                    if (result.success) {
                      setPetEquipment(result.equipment);
                      if (item.price > 0 && !purchases.some(p => p.itemId === item.id)) {
                        setProfile(prev => ({ ...prev, stars: result.newStars }));
                        setPurchases(prev => [...prev, { itemId: item.id, profileId: profile.id } as ProfilePurchase]);
                        showToast(`⭐ -${item.price} → 剩餘 ${result.newStars}`, 'spend');
                      }
                    } else {
                      alert(result.error || '裝備失敗');
                    }
                  };

                  const renderEquipButton = (item: EquipmentItem) => {
                    const isEquipped = petEquipment.some(e => e.itemId === item.id);
                    const isOwned = purchases.some(p => p.itemId === item.id);
                    const canAfford = profile.stars >= item.price;
                    const stageLocked = item.requiredStage && pet.stage < item.requiredStage;
                    const speciesLocked = item.exclusiveSpecies && item.exclusiveSpecies !== pet.species;

                    if (isEquipped) {
                      return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">已裝備</span>;
                    }
                    if (stageLocked) {
                      return <span className="px-2 py-1 text-xs text-gray-400">🔒 需{stageLabels[item.requiredStage!]}</span>;
                    }
                    if (speciesLocked) {
                      return <span className="px-2 py-1 text-xs text-orange-500">僅限 {petSpecies.find(s => s.species === item.exclusiveSpecies)?.name || item.exclusiveSpecies}</span>;
                    }
                    if (isOwned) {
                      return (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEquip(item)} className="px-3 py-1 text-sm rounded-full font-medium bg-gray-700 text-white hover:bg-gray-800">裝備</button>
                          {item.category === 'common' && item.price > 0 && (
                            <button
                              onClick={async () => {
                                if (!confirm(`確定賣出「${item.name}」換 ${Math.ceil(item.price / 2)} 顆星星嗎？`)) return;
                                const result = await api.sellItem(profile.id, 'equipment', item.id);
                                if (result.success) {
                                  setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                  const [newPurchases, newEquip] = await Promise.all([api.getProfilePurchases(profile.id), api.getPetEquipment(profile.id)]);
                                  setPurchases(newPurchases);
                                  setPetEquipment(newEquip);
                                  showToast(`賣出 ${item.name} +${result.sellPrice}⭐`, 'earn');
                                }
                              }}
                              className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                            >賣 {Math.ceil(item.price / 2)}⭐</button>
                          )}
                        </div>
                      );
                    }
                    if (item.category === 'common') {
                      return (
                        <button onClick={() => handleEquip(item)} disabled={!canAfford}
                          className={`px-3 py-1 text-sm rounded-full font-medium ${canAfford ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >⭐ {item.price}</button>
                      );
                    }
                    // set / exclusive 未擁有 → 去開寶箱
                    return (
                      <button onClick={() => setShopSubTab('chests')} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium">
                        📦 去開寶箱
                      </button>
                    );
                  };

                  return (
                    <>
                      {(['hat', 'necklace', 'wings', 'weapon'] as const).map(slot => {
                        const commonItems = equipmentItems.filter(i => i.slot === slot && i.category === 'common');
                        const setItems = settings.enableNewEquipment ? equipmentItems.filter(i => i.slot === slot && i.category === 'set') : [];
                        const exclusiveItems = settings.enableNewEquipment ? equipmentItems.filter(i => i.slot === slot && i.category === 'exclusive') : [];
                        const allSlotItems = [...commonItems, ...setItems, ...exclusiveItems];
                        return (
                          <div key={slot} className="mb-4">
                            <h3 className="font-medium text-gray-600 mb-2">{slotLabels[slot]}</h3>
                            <div className="space-y-2">
                              {allSlotItems.map(item => (
                                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 ${rarityColors[item.rarity]}`}>
                                  <div className="text-3xl">{item.icon}</div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="font-medium">{item.name}</span>
                                      {item.rarity !== 'normal' && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.rarity === 'rare' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                          {RARITY_LABELS[item.rarity].label}
                                        </span>
                                      )}
                                      {item.category === 'set' && item.setId && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                          {allSetConfigs.find(s => s.id === item.setId)?.icon} {allSetConfigs.find(s => s.id === item.setId)?.name}
                                        </span>
                                      )}
                                      {item.category === 'exclusive' && item.setId && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                          {allSetConfigs.find(s => s.id === item.setId)?.icon} {allSetConfigs.find(s => s.id === item.setId)?.name}
                                        </span>
                                      )}
                                      {item.exclusiveSpecies && !item.setId && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                          {petSpecies.find(s => s.species === item.exclusiveSpecies)?.name || item.exclusiveSpecies} 專屬
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-green-600">{item.description}</div>
                                    {item.requiredStage && item.requiredStage > 1 && (
                                      <div className={`text-xs ${pet.stage >= item.requiredStage ? 'text-gray-400' : 'text-red-500'}`}>
                                        需進化至{stageLabels[item.requiredStage]}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {renderEquipButton(item)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-700 font-medium mb-1">💡 裝備提示</p>
                        <p className="text-xs text-gray-600">裝備會直接穿戴在目前展示的寵物身上，每個槽位只能裝備一件。已購買的裝備可以隨時免費裝備和卸下。裝備穿在其他寵物身上時需先卸下。</p>
                      </div>

                      {/* 套裝效果總覽 */}
                      {settings.enableNewEquipment && (
                        <div className="mt-6 space-y-4">
                          <h3 className="font-bold text-gray-700">套裝效果</h3>
                          {allSetConfigs.map(set => {
                            const setPieces = equipmentItems.filter(i =>
                              (i.category === 'set' && i.setId === set.id) ||
                              (i.category === 'exclusive' && i.setId === set.id)
                            );
                            const ownedCount = setPieces.filter(p => purchases.some(pu => pu.itemId === p.id)).length;
                            if (setPieces.length === 0) return null;
                            return (
                              <div key={set.id} className={`border-2 rounded-lg p-3 ${'exclusive' in set && set.exclusive ? 'border-yellow-200 bg-yellow-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{set.icon}</span>
                                    <span className="font-bold text-gray-700">{set.name}</span>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ownedCount === setPieces.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {ownedCount}/{setPieces.length}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {set.bonuses.map((bonus, i) => (
                                    <div key={i} className={`text-xs px-2 py-1 rounded ${ownedCount >= (i + 2) ? ('exclusive' in set && set.exclusive ? 'bg-yellow-100 text-yellow-700 font-medium' : 'bg-blue-100 text-blue-700 font-medium') : 'bg-gray-100 text-gray-400'}`}>
                                      {bonus}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {shopSubTab === 'decorations' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">購買裝飾品，個人化你的帳號！</p>

                {/* 頭像框 */}
            <div className="mb-4">
              <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-1">
                <span>🖼️</span> 頭像框
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {shopItems.filter(item => item.type === 'frame').map(item => {
                  const owned = purchases.some(p => p.itemId === item.id);
                  const equipped = profile.equippedFrame === item.id;
                  const canAfford = profile.stars >= item.price;
                  return (
                    <div key={item.id} className={`p-3 rounded-lg border-2 ${owned ? 'border-green-400 bg-green-50' : canAfford ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                      <div className="flex justify-center mb-2">
                        <Avatar name={profile.name} equippedFrame={item.id} petSpecies={pet?.species} petStage={pet?.stage} petEvolutionPath={pet?.evolutionPath} size="lg" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500 mb-2">{item.description}</div>
                        {owned ? (
                          <div className="flex items-center justify-center gap-2">
                            {equipped ? (
                              <button
                                onClick={async () => {
                                  const result = await api.equipItem(profile.id, '', 'frame');
                                  if (result.success) {
                                    setProfile(prev => ({ ...prev, equippedFrame: null }));
                                  }
                                }}
                                className="inline-block px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-red-400 transition-colors"
                                title="點擊卸下"
                              >
                                使用中 (卸下)
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={async () => {
                                    const result = await api.equipItem(profile.id, item.id, 'frame');
                                    if (result.success) {
                                      setProfile(prev => ({ ...prev, equippedFrame: item.id }));
                                    }
                                  }}
                                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600"
                                >
                                  裝備
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`確定賣出「${item.name}」換 ${Math.ceil(item.price / 2)} 顆星星嗎？`)) return;
                                    const result = await api.sellItem(profile.id, 'frame', item.id);
                                    if (result.success) {
                                      setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                      const newPurchases = await api.getProfilePurchases(profile.id);
                                      setPurchases(newPurchases);
                                      showToast(`賣出 ${item.name} +${result.sellPrice}⭐`, 'earn');
                                    }
                                  }}
                                  className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                  賣 {Math.ceil(item.price / 2)}⭐
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              if (canAfford) {
                                const result = await api.purchaseItem(profile.id, item.id);
                                if (result.success) {
                                  if (result.newStars !== undefined) {
                                    setProfile(prev => ({ ...prev, stars: result.newStars! }));
                                    showToast(`⭐ -${item.price} → 剩餘 ${result.newStars}`, 'spend');
                                  }
                                  const newPurchases = await api.getProfilePurchases(profile.id);
                                  setPurchases(newPurchases);
                                } else {
                                  alert(result.error || '購買失敗');
                                }
                              }
                            }}
                            disabled={!canAfford}
                            className={`px-3 py-1 text-xs rounded-full ${canAfford ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                          >
                            ⭐ {item.price}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

              </div>
            )}

            {shopItems.length === 0 && consumables.length === 0 && <p className="text-gray-500 text-center py-4">載入中...</p>}
          </Card>
        )}

        {/* 單字預覽 */}
        {wordPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setWordPreview(null)}>
            <div className="bg-white rounded-2xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">{wordPreview.name}</h2>
                <button onClick={() => setWordPreview(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {/* 範圍選擇 */}
              {wordPreview.words.length > 20 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">顯示範圍（共 {wordPreview.words.length} 個單字）</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">從</span>
                    <input
                      type="number"
                      min={1}
                      max={wordPreview.words.length}
                      value={previewRange.start}
                      onChange={e => {
                        const v = Math.max(1, Math.min(wordPreview.words.length, parseInt(e.target.value) || 1));
                        setPreviewRange(prev => ({ ...prev, start: v, end: Math.max(v, prev.end) }));
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                    />
                    <span className="text-sm text-gray-500">到</span>
                    <input
                      type="number"
                      min={1}
                      max={wordPreview.words.length}
                      value={previewRange.end}
                      onChange={e => {
                        const v = Math.max(previewRange.start, Math.min(wordPreview.words.length, parseInt(e.target.value) || 1));
                        setPreviewRange(prev => ({ ...prev, end: v }));
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                    />
                    <button onClick={() => setPreviewRange({ start: 1, end: wordPreview.words.length })} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">全部</button>
                  </div>
                </div>
              )}

              {/* 單字列表 */}
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {wordPreview.words.slice(previewRange.start - 1, previewRange.end).map((w, i) => (
                  <div key={w.id} className="flex items-baseline gap-2 py-1.5 px-2 rounded hover:bg-gray-50 border-b border-gray-100">
                    <span className="text-xs text-gray-400 w-6 text-right shrink-0">{previewRange.start + i}</span>
                    <span className="font-medium text-gray-900">{w.english}</span>
                    <span className="text-gray-500 text-sm">{w.chinese}</span>
                    {w.partOfSpeech && <span className="text-gray-400 text-xs">({w.partOfSpeech})</span>}
                  </div>
                ))}
              </div>

              {/* 底部按鈕 */}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button onClick={() => setWordPreview(null)} className="flex-1 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium text-sm">關閉</button>
                <Button
                  onClick={() => {
                    const availableWords = wordPreview.words.filter(w => !masteredWordIds.includes(w.id)).length;
                    setWordPreview(null);
                    setQuizStartDialog({ file: wordPreview, availableCount: availableWords });
                  }}
                  variant="primary"
                  className="flex-1 text-sm"
                >
                  開始測驗
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 測驗開始選擇對話框 */}
        {quizStartDialog && (
          <QuizStartDialog
            file={quizStartDialog.file}
            availableCount={quizStartDialog.availableCount}
            masteredWordIds={masteredWordIds}
            pets={allPets.length > 0 ? allPets : undefined}
            enableMonsterSystem={settings.enableMonsterSystem}
            onStart={(options) => {
              onStartQuiz(quizStartDialog.file, options);
              setQuizStartDialog(null);
            }}
            onCancel={() => setQuizStartDialog(null)}
          />
        )}
      </div>
    </div>
  );
};

// ============ 測驗開始選擇對話框 ============

interface QuizStartDialogProps {
  file: WordFile;
  availableCount: number;
  masteredWordIds: string[];
  pets?: Pet[];
  enableMonsterSystem: boolean;
  onStart: (options: { difficulty: 'easy' | 'normal' | 'hard'; questionCount: number; companionPetId?: string; companionPet?: Pet; category?: string; typeBonusMultiplier?: number; wordRange?: { start: number; end: number } }) => void;
  onCancel: () => void;
}

const QuizStartDialog: React.FC<QuizStartDialogProps> = ({ file, availableCount, masteredWordIds, pets, enableMonsterSystem, onStart, onCancel }) => {
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const activePet = pets?.find(p => p.isActive);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(activePet?.id);

  // 範圍選擇
  const [rangeMode, setRangeMode] = useState<'all' | 'preset' | 'custom'>('all');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(1);
  const [customEnd, setCustomEnd] = useState(file.words.length);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // 自動分區
  const presets = useMemo(() => {
    const total = file.words.length;
    const chunkSize = total <= 50 ? 10 : total <= 200 ? 50 : total <= 500 ? 100 : 200;
    const chunks: { label: string; start: number; end: number }[] = [];
    for (let i = 0; i < total; i += chunkSize) {
      const start = i + 1;
      const end = Math.min(i + chunkSize, total);
      chunks.push({ label: `${start}-${end}`, start, end });
    }
    return chunks;
  }, [file.words.length]);

  // 計算當前有效範圍
  const activeRange = useMemo((): { start: number; end: number } | null => {
    if (rangeMode === 'preset' && selectedPreset) {
      const preset = presets.find(p => p.label === selectedPreset);
      return preset ? { start: preset.start, end: preset.end } : null;
    }
    if (rangeMode === 'custom') {
      const s = Math.max(1, Math.min(customStart, file.words.length));
      const e = Math.max(s, Math.min(customEnd, file.words.length));
      return { start: s, end: e };
    }
    return null;
  }, [rangeMode, selectedPreset, presets, customStart, customEnd, file.words.length]);

  // 計算範圍內扣除已精熟後的可用題數
  const effectiveAvailableCount = useMemo(() => {
    if (!activeRange) return availableCount;
    const rangeWords = file.words.slice(activeRange.start - 1, activeRange.end);
    return rangeWords.filter(w => !masteredWordIds.includes(w.id)).length;
  }, [activeRange, file.words, masteredWordIds, availableCount]);

  // 計算實際可用的題數選項
  const countOptions = useMemo(() => {
    const options = [20, 50, 100, 0].filter(c => c === 0 || c <= effectiveAvailableCount);
    if (options.length === 0 || (options.length === 1 && options[0] === 0)) {
      options.unshift(effectiveAvailableCount);
    }
    return options;
  }, [effectiveAvailableCount]);

  // 初始化題數為 20（預設）
  const [questionCount, setQuestionCount] = useState(() => {
    const initialOptions = [20, 50, 100, 0].filter(c => c === 0 || c <= availableCount);
    if (initialOptions.length === 0 || (initialOptions.length === 1 && initialOptions[0] === 0)) {
      return availableCount;
    }
    return initialOptions.includes(20) ? 20 : initialOptions[0];
  });

  // 範圍改變時重設題數
  useEffect(() => {
    if (!countOptions.includes(questionCount)) {
      setQuestionCount(countOptions.includes(20) ? 20 : countOptions[0]);
    }
  }, [countOptions]);

  const difficultyConfig = {
    easy: { emoji: '😊', label: '簡單', desc: '只有選擇題', multiplier: '×0.8' },
    normal: { emoji: '😐', label: '普通', desc: '混合題型', multiplier: '×1' },
    hard: { emoji: '😤', label: '困難', desc: '限時更短', multiplier: '×1.5' }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-bounce-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-1">開始練習</h2>
        <p className="text-sm text-gray-500 mb-4">{file.name} · {effectiveAvailableCount} 題可練習{activeRange ? ` (第 ${activeRange.start}-${activeRange.end} 個)` : ''}</p>

        {/* 範圍選擇 */}
        {file.words.length > 20 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">選擇範圍 (共 {file.words.length} 個單字)</p>
            <div className="flex gap-2 flex-wrap mb-2 max-h-24 overflow-y-auto">
              <button
                onClick={() => { setRangeMode('all'); setSelectedPreset(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  rangeMode === 'all' ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setRangeMode('preset'); setSelectedPreset(p.label); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    rangeMode === 'preset' && selectedPreset === p.label ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCustomRange(!showCustomRange)}
              className="text-xs text-gray-500 hover:text-gray-700 mb-1"
            >
              {showCustomRange ? '收起自訂範圍 ▲' : '自訂範圍 ▼'}
            </button>
            {showCustomRange && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">從</span>
                <input
                  type="number"
                  min={1}
                  max={file.words.length}
                  value={customStart}
                  onChange={e => {
                    const v = Math.max(1, Math.min(file.words.length, parseInt(e.target.value) || 1));
                    setCustomStart(v);
                    setCustomEnd(prev => Math.max(v, prev));
                    setRangeMode('custom');
                    setSelectedPreset(null);
                  }}
                  onBlur={e => {
                    if (!e.target.value) setCustomStart(1);
                  }}
                  className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm text-center focus:border-gray-900 outline-none"
                />
                <span className="text-sm text-gray-600">到</span>
                <input
                  type="number"
                  min={1}
                  max={file.words.length}
                  value={customEnd}
                  onChange={e => {
                    const v = Math.max(customStart, Math.min(file.words.length, parseInt(e.target.value) || 1));
                    setCustomEnd(v);
                    setRangeMode('custom');
                    setSelectedPreset(null);
                  }}
                  onBlur={e => {
                    if (!e.target.value) setCustomEnd(file.words.length);
                  }}
                  className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm text-center focus:border-gray-900 outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* 題數選擇 */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">想練習幾題？</p>
          <div className="flex gap-2 flex-wrap">
            {countOptions.map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  questionCount === count
                    ? 'bg-gray-900 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {count === 0 ? '全部' : count}
              </button>
            ))}
          </div>
        </div>

        {/* 難度選擇 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">選擇難度</p>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as const).map(d => {
              const config = difficultyConfig[d];
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    difficulty === d
                      ? 'bg-gray-900 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{config.emoji}</div>
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className={`text-xs mt-1 ${difficulty === d ? 'text-white/80' : 'text-gray-500'}`}>{config.desc}</div>
                  <div className={`text-xs mt-1 font-medium ${
                    difficulty === d ? 'text-yellow-200' : 'text-yellow-600'
                  }`}>獎勵 {config.multiplier}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 寵物助陣選擇 */}
        {pets && pets.length > 0 && (() => {
          const category = file.category || undefined;
          const elInfo = category ? DAY_ELEMENTS[category] : null;
          const selectedPet = pets.find(p => p.id === selectedPetId);
          const selectedPetTypes = selectedPet?.types || [];
          const bonus = calculateTypeBonus(selectedPetTypes, category);
          return (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">選擇助陣寵物</span>
                {elInfo && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{elInfo.emoji} {enableMonsterSystem ? elInfo.monster : elInfo.element}</span>}
              </div>
              {elInfo && enableMonsterSystem && (
                <p className="text-xs text-gray-500 mb-2">克制 {elInfo.monster} 的寵物屬性：{elInfo.strongTypes.join('、')}（1.3x）</p>
              )}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pets.map(p => {
                  const pTypes = p.types || [];
                  const pBonus = calculateTypeBonus(pTypes, category);
                  const bonusLabel = pBonus > 1 ? `超有效 ×${pBonus}` : pBonus < 1 ? `不擅長 ×${pBonus}` : '普通';
                  const bonusColor = pBonus > 1 ? 'text-green-600' : pBonus < 1 ? 'text-orange-500' : 'text-gray-400';
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPetId(p.id)}
                      className={`flex-shrink-0 p-2 rounded-xl text-center transition-all min-w-[80px] ${
                        selectedPetId === p.id
                          ? 'bg-gray-900 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex justify-center"><img src={getPetImageSrc(p.species, p.stage, p.evolutionPath)} alt="" className="w-8 h-8 object-contain" /></div>
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className={`text-xs ${selectedPetId === p.id ? 'text-gray-300' : 'text-gray-400'}`}>Lv.{p.level}</div>
                      {elInfo && <div className={`text-xs font-medium ${selectedPetId === p.id ? 'text-yellow-200' : bonusColor}`}>{bonusLabel}</div>}
                    </button>
                  );
                })}
              </div>
              {elInfo && selectedPet && (
                <div className={`mt-2 text-center text-sm font-medium ${
                  bonus > 1 ? 'text-green-600' : bonus < 1 ? 'text-orange-500' : 'text-gray-500'
                }`}>
                  {bonus > 1 ? `⚡ 超有效！星星 +${Math.round((bonus - 1) * 100)}%` :
                   bonus < 1 ? `💤 不擅長 星星 -${Math.round((1 - bonus) * 100)}%` :
                   '普通效果'}
                </div>
              )}
            </div>
          );
        })()}

        {/* 按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
          >
            取消
          </button>
          <button
            onClick={() => {
              const selectedPet = pets?.find(p => p.id === selectedPetId);
              const category = file.category || undefined;
              const petTypes = selectedPet?.types || [];
              const bonus = calculateTypeBonus(petTypes, category);
              onStart({
                difficulty,
                questionCount,
                companionPetId: selectedPetId,
                companionPet: selectedPet,
                category,
                typeBonusMultiplier: bonus,
                wordRange: activeRange || undefined
              });
            }}
            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg"
          >
            開始！
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ 進度圖表 ============

const ProgressChart: React.FC<{ profile: Profile; files: WordFile[] }> = ({ profile, files }) => {
  const chartId = useId();
  const masteredWordIds = profile.masteredWords.map(m => m.wordId);
  const allHistory = profile.progress.flatMap(p => p.history.map(h => ({ ...h, fileId: p.fileId })));
  allHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const recent = allHistory.slice(-10);

  const allWeakWords = files.flatMap(f => {
    const progress = profile.progress.find(p => p.fileId === f.id);
    if (!progress) return [];
    return f.words.filter(w => progress.weakWordIds.includes(w.id) && !masteredWordIds.includes(w.id));
  });

  const renderLineChart = () => {
    if (recent.length === 0) return null;

    const width = 400;
    const height = 120;
    const padding = { top: 20, right: 30, bottom: 25, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const gradientId = `areaGradient-${chartId}`;

    const points = recent.map((h, i) => ({
      x: padding.left + (recent.length === 1 ? chartWidth / 2 : (i / (recent.length - 1)) * chartWidth),
      y: padding.top + chartHeight - (h.rate / 100) * chartHeight,
      rate: h.rate
    }));

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const polygonPoints = [
      `${points[0].x},${padding.top + chartHeight}`,
      ...points.map(p => `${p.x},${p.y}`),
      `${points[points.length - 1].x},${padding.top + chartHeight}`
    ].join(' ');

    const gridLines = [25, 50, 75, 100];

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 bg-gray-50 rounded">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {gridLines.map(pct => {
          const y = padding.top + chartHeight - (pct / 100) * chartHeight;
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,4" />
              <text x={padding.left - 5} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">{pct}%</text>
            </g>
          );
        })}

        <polygon points={polygonPoints} fill={`url(#${gradientId})`} />

        <polyline points={polylinePoints} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#3B82F6" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[10px] font-medium fill-gray-700">{p.rate}%</text>
            <text x={p.x} y={height - 5} textAnchor="middle" className="text-[9px] fill-gray-400">{i + 1}</text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <Card>
      <h2 className="font-bold text-lg mb-3 text-gray-700">學習統計</h2>
      {recent.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-sm text-gray-600 mb-2">進步曲線（最近10次）</h3>
          {renderLineChart()}
        </div>
      )}
      {allWeakWords.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-gray-600 mb-2">待加強單字 ({allWeakWords.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {allWeakWords.slice(0, 30).map((w, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-red-50 rounded text-sm">
                <span className="font-medium text-red-800">{w.english}</span>
                <span className="text-red-600">{w.chinese}{w.partOfSpeech ? ` (${w.partOfSpeech})` : ''}</span>
              </div>
            ))}
            {allWeakWords.length > 30 && <p className="text-gray-500 text-sm text-center py-1">...還有 {allWeakWords.length - 30} 個單字</p>}
          </div>
        </div>
      )}
      {recent.length === 0 && allWeakWords.length === 0 && <p className="text-gray-500 text-center py-4">開始測驗後會顯示統計資料</p>}
    </Card>
  );
};

// ============ 測驗畫面 ============

interface QuizScreenProps {
  file: WordFile;
  words: Word[];
  isReview: boolean;
  settings: Settings;
  allFiles: WordFile[];              // 所有檔案（用於跨檔案選項混合）
  customQuestionTypes?: number[];  // 自訂測驗的題型（覆蓋全域設定）
  customQuizName?: string;         // 自訂測驗名稱
  bonusMultiplier?: number;        // 加分測驗倍率
  difficulty?: 'easy' | 'normal' | 'hard';  // 難度設定
  profileId: string;               // 學生 ID（用於道具）
  profileItems: ProfileItem[];     // 學生擁有的道具
  companionPet?: Pet;              // 助陣寵物
  category?: string;               // 學科分類
  typeBonusMultiplier?: number;    // 屬性加成倍率
  onSaveProgress: (results: QuizResult[], completed: boolean, duration: number, doubleStars: boolean, difficultyMultiplier: number, doubleExp?: boolean) => Promise<{ starsEarned: number; comboBonus?: number; maxStreak?: number; accuracyMultiplier?: number; petLevelBonus?: number } | void>;
  onExit: () => void;
  onItemsUpdate: (items: ProfileItem[]) => void;  // 道具更新回調
}

const QuizScreen: React.FC<QuizScreenProps> = ({ file, words, isReview, settings, allFiles, customQuestionTypes, customQuizName, bonusMultiplier, difficulty = 'normal', profileId, profileItems, companionPet, category, typeBonusMultiplier, onSaveProgress, onExit, onItemsUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionType, setQuestionType] = useState(0);
  const [options, setOptions] = useState<Word[]>([]);
  const [selected, setSelected] = useState<Word | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timePerQuestion);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizStartTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 寵物助陣動畫 & 能力狀態
  const [petAnim, setPetAnim] = useState<'idle' | 'bounce' | 'shake'>('idle');
  const [sonicBatHighlight, setSonicBatHighlight] = useState<string | null>(null);  // 音波蝠高亮的錯誤選項ID
  const [dailyFirstMissUsed, setDailyFirstMissUsed] = useState(false);  // 硬殼蟹每日首錯保護
  // 道具狀態
  const [items, setItems] = useState<ProfileItem[]>(profileItems);
  const [hint, setHint] = useState<string | null>(null);  // 顯示的提示
  const [shieldActive, setShieldActive] = useState(false);  // 護盾是否啟用
  const [doubleStarActive, setDoubleStarActive] = useState(false);  // 雙倍星星是否啟用
  const [starsEarned, setStarsEarned] = useState<number | null>(null);  // 測驗獲得的星星數
  const [itemUsedThisQuestion, setItemUsedThisQuestion] = useState<string | null>(null);  // 本題已使用的道具
  // Combo 連續答對
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [comboPopup, setComboPopup] = useState<{ bonus: number; streak: number } | null>(null);
  // 雙倍經驗卡
  const [doubleExpActive, setDoubleExpActive] = useState(false);
  // 20 題覆蓋限制
  const [doubleStarCoverage, setDoubleStarCoverage] = useState(0);  // 覆蓋到第幾題
  const [doubleExpCoverage, setDoubleExpCoverage] = useState(0);
  // 結果頁額外資訊
  const [comboBonus, setComboBonus] = useState(0);
  const [accuracyMultiplier, setAccuracyMultiplier] = useState(1);
  const [petLevelBonus, setPetLevelBonus] = useState(0);

  const questionLimit = settings.questionCount > 0 ? Math.min(settings.questionCount, words.length) : words.length;
  const quizWords = useRef(shuffleArray([...words]).slice(0, questionLimit)).current;
  const currentWord = quizWords[currentIndex];
  const totalQuestions = quizWords.length;

  const questionTypes = [
    { type: 'ch2en', label: '看中文選英文' },
    { type: 'en2ch', label: '看英文選中文' },
    { type: 'spell_en', label: '看中文寫英文' },
    { type: 'spell_ch', label: '看英文寫中文' },
    { type: 'listen_ch', label: '聽英文選中文' },
    { type: 'listen_en', label: '聽英文寫英文' },
    { type: 'fill_blank', label: '看例句填空' },
    { type: 'fill_blank_choice', label: '看例句選答案' }
  ];

  // 語音合成：優先選擇自然發音的聲音模型
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const selectBestVoice = () => {
      const voices = speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      // 優先順序：自然聲音 > 線上聲音 > 任何英文聲音
      const preferred = [
        'Microsoft Aria Online (Natural)',
        'Microsoft Jenny Online (Natural)',
        'Microsoft Ana Online (Natural)',
        'Microsoft Guy Online (Natural)',
        'Google US English',
        'Samantha',  // macOS
        'Karen',     // macOS Australian
      ];
      for (const name of preferred) {
        const match = enVoices.find(v => v.name.includes(name));
        if (match) { bestVoiceRef.current = match; return; }
      }
      const natural = enVoices.find(v => v.name.includes('Natural'));
      if (natural) { bestVoiceRef.current = natural; return; }
      const online = enVoices.find(v => v.name.includes('Online'));
      if (online) { bestVoiceRef.current = online; return; }
      if (enVoices.length > 0) bestVoiceRef.current = enVoices[0];
    };
    selectBestVoice();
    speechSynthesis.addEventListener('voiceschanged', selectBestVoice);
    return () => speechSynthesis.removeEventListener('voiceschanged', selectBestVoice);
  }, []);

  const speak = useCallback((text: string): boolean => {
    if (!('speechSynthesis' in window)) {
      alert('您的瀏覽器不支援語音功能，請使用 Chrome、Edge 或 Safari');
      return false;
    }
    speechSynthesis.cancel();
    // Chrome/Edge workaround: resume paused state before speaking
    speechSynthesis.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    if (bestVoiceRef.current) {
      utterance.voice = bestVoiceRef.current;
    }
    speechSynthesis.speak(utterance);
    // Chrome workaround: periodically resume to prevent speech from getting stuck
    const keepAlive = setInterval(() => {
      if (!speechSynthesis.speaking) { clearInterval(keepAlive); return; }
      speechSynthesis.resume();
    }, 5000);
    utterance.onend = () => clearInterval(keepAlive);
    utterance.onerror = () => clearInterval(keepAlive);
    return true;
  }, []);

  // 取得道具數量
  const getItemCount = (itemId: string) => items.find(i => i.itemId === itemId)?.quantity || 0;

  // 使用道具
  const useItem = async (itemId: string) => {
    if (showResult || isFinished) return;
    if (getItemCount(itemId) < 1) return;
    if (itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star') return; // 本題已用過道具（雙倍星星除外）

    // 靈犬直覺能力：使用提示時 15% 機率不消耗道具
    const spiritDogFreeHint = itemId === 'hint' && companionPet?.species === 'spirit_dog' && Math.random() < 0.15;

    if (!spiritDogFreeHint) {
      const result = await api.useItem(profileId, itemId);
      if (!result.success) {
        alert(result.error || '使用道具失敗');
        return;
      }
      // 更新道具列表
      setItems(result.items || []);
      onItemsUpdate(result.items || []);
    }

    // 執行道具效果
    switch (itemId) {
      case 'time_extend':
        setTimeLeft(t => t + 10);
        setItemUsedThisQuestion('time_extend');
        break;
      case 'hint':
        // 顯示答案的第一個字母
        const firstLetter = currentWord.english.charAt(0).toUpperCase();
        setHint(spiritDogFreeHint ? `提示：${firstLetter}... (靈犬直覺！免費)` : `提示：${firstLetter}...`);
        setItemUsedThisQuestion('hint');
        break;
      case 'skip':
        // 跳過本題，不計對錯
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrentIndex(i => i + 1);
        setItemUsedThisQuestion(null);
        setHint(null);
        break;
      case 'double_star': {
        // 本次測驗星星 x2（每張覆蓋 20 題）
        const remainingQ = totalQuestions - currentIndex;
        const cardsNeeded = Math.ceil(remainingQ / 20);
        const cardsAvailable = getItemCount('double_star');
        const cardsToUse = Math.min(cardsNeeded, cardsAvailable);
        // 第一張已消耗，額外消耗 cardsToUse-1 張
        for (let i = 1; i < cardsToUse; i++) {
          await api.useItem(profileId, 'double_star');
        }
        if (cardsToUse > 1) {
          // 重新取得道具列表
          const latestItems = await api.getProfileItems(profileId);
          setItems(latestItems);
          onItemsUpdate(latestItems);
        }
        setDoubleStarActive(true);
        setDoubleStarCoverage(currentIndex + cardsToUse * 20);
        break;
      }
      case 'double_exp': {
        // 本次測驗寵物經驗 x2（每張覆蓋 20 題）
        const remainingQExp = totalQuestions - currentIndex;
        const cardsNeededExp = Math.ceil(remainingQExp / 20);
        const cardsAvailableExp = getItemCount('double_exp');
        const cardsToUseExp = Math.min(cardsNeededExp, cardsAvailableExp);
        // 第一張已消耗，額外消耗 cardsToUseExp-1 張
        for (let i = 1; i < cardsToUseExp; i++) {
          await api.useItem(profileId, 'double_exp');
        }
        if (cardsToUseExp > 1) {
          const latestItems = await api.getProfileItems(profileId);
          setItems(latestItems);
          onItemsUpdate(latestItems);
        }
        setDoubleExpActive(true);
        setDoubleExpCoverage(currentIndex + cardsToUseExp * 20);
        break;
      }
      case 'shield':
        // 本次測驗所有答錯不扣分
        setShieldActive(true);
        setItemUsedThisQuestion('shield');
        break;
    }
  };

  // 難度設定
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

  // 根據題型取得對應時間（含難度調整）
  const getTimeForType = (type: number): number => {
    const baseTime = (type < 2 || type === 4 || type === 7)
      ? (settings.timeChoiceQuestion || 10)  // 選擇題（含聽力選擇、例句選答案）
      : (settings.timeSpellingQuestion || 30);  // 拼寫題（含聽力拼寫、填空題）
    // 發條鳥能力：測驗計時器 +5 秒
    const petTimeBonus = companionPet?.species === 'clockwork_bird' ? 5 : 0;
    return Math.max(5, baseTime + difficultyConfig.timeBonus + petTimeBonus);  // 最少 5 秒
  };

  const generateQuestion = useCallback(() => {
    if (!currentWord) return;
    // 難度限制題型：簡單模式只有選擇題
    let enabledTypes = customQuestionTypes || settings.questionTypes;
    if (difficultyConfig.types !== null) {
      enabledTypes = enabledTypes.filter(t => difficultyConfig.types!.includes(t));
      if (enabledTypes.length === 0) enabledTypes = difficultyConfig.types;
    }
    let type = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

    // 填空題（type 6, 7）：如果單字沒有例句，或單字無法在例句中挖空，回退到其他題型
    if ((type === 6 || type === 7)) {
      let canBlank = false;
      if (currentWord.exampleSentence) {
        const ns = normalizeApostrophe(currentWord.exampleSentence);
        if (ns.includes('___')) {
          canBlank = true; // 手動標記的空格
        } else {
          // 檢查單字是否能在例句中找到（避免動詞時態變化等導致挖空失敗）
          const mt = normalizeApostrophe(stripParenthetical(currentWord.english))
            .replace(/[!?.,;:!？。，；：]+$/g, '').trim().replace(/\s+/g, ' ');
          const rp = mt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          canBlank = new RegExp(rp, 'gi').test(ns);
        }
      }
      if (!canBlank) {
        const fallbackTypes = enabledTypes.filter(t => t !== 6 && t !== 7);
        type = fallbackTypes.length > 0
          ? fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)]
          : 0; // 完全沒有其他題型時回退到預設
      }
    }

    setQuestionType(type);
    setSelected(null);
    setInputValue('');
    setShowResult(false);
    setTimeLeft(getTimeForType(type));
    setQuestionStartTime(Date.now());
    // 重置道具狀態（護盾除外，護盾在使用後才消耗）
    setItemUsedThisQuestion(null);
    setHint(null);
    setSonicBatHighlight(null);

    // 選擇題（type 0, 1）、聽力選中文（type 4）、例句選答案（type 7）需要生成選項（跨檔案混合）
    if (type < 2 || type === 4 || type === 7) {
      const correctChinese = currentWord.chinese;
      const normalizedCorrectEnglish = normalizeSpellAnswer(currentWord.english);
      const sameFileWords = file.words.filter(w =>
        w.id !== currentWord.id && w.chinese !== correctChinese &&
        normalizeSpellAnswer(w.english) !== normalizedCorrectEnglish
      );
      const otherFileWords = allFiles
        .filter(f => f.id !== file.id)
        .flatMap(f => f.words)
        .filter(w =>
          w.chinese !== correctChinese &&
          normalizeSpellAnswer(w.english) !== normalizedCorrectEnglish
        );

      const shuffledSame = shuffleArray(sameFileWords);
      const shuffledOther = shuffleArray(otherFileWords);

      const wrongOptions: Word[] = [];
      // 從同檔案取最多 2 個
      wrongOptions.push(...shuffledSame.slice(0, Math.min(2, shuffledSame.length)));
      // 從其他檔案補到 3 個
      const remaining = 3 - wrongOptions.length;
      if (remaining > 0) {
        wrongOptions.push(...shuffledOther.slice(0, remaining));
      }
      // 仍不足則用 fake
      while (wrongOptions.length < 3) {
        wrongOptions.push({ id: `fake-${wrongOptions.length}`, english: `word${wrongOptions.length + 1}`, chinese: `選項${wrongOptions.length + 1}` });
      }

      const allOptions = shuffleArray([currentWord, ...wrongOptions]);
      setOptions(allOptions);
      // 音波蝠能力：5% 機率高亮一個錯誤選項
      if (companionPet?.species === 'sonic_bat' && Math.random() < 0.05) {
        const wrongOpt = allOptions.find(o => o.id !== currentWord.id);
        if (wrongOpt) setSonicBatHighlight(wrongOpt.id);
      }
    }

    // 題目含英文時自動播放發音（聽力題 + 看英文選中文，不含看中文選英文和看例句填空）
    if (type === 1 || type === 3 || type === 4 || type === 5) {
      setTimeout(() => speak(stripParenthetical(currentWord.english)), 300);
    }
  }, [currentWord, file.words, allFiles, customQuestionTypes, settings.questionTypes, settings.timeChoiceQuestion, settings.timeSpellingQuestion, speak]);

  useEffect(() => { if (currentWord && !isFinished) generateQuestion(); }, [currentIndex, isFinished]);

  useEffect(() => {
    if (showResult || isFinished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, showResult, isFinished, currentWord, questionStartTime, questionType]);

  // 時間到時透過 processAnswer 處理（包含護盾和 combo）
  useEffect(() => {
    if (timeLeft === 0 && !showResult && !isFinished) {
      processAnswer(false);
    }
  }, [timeLeft, showResult, isFinished]);

  useEffect(() => { if ((questionType === 2 || questionType === 3 || questionType === 5 || questionType === 6) && !showResult && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100); }, [questionType, showResult, currentIndex]);

  // 答案出現時自動播放英文發音（所有題型都發音，加強記憶）
  useEffect(() => {
    if (showResult && currentWord) {
      setTimeout(() => speak(stripParenthetical(currentWord.english)), 300);
    }
  }, [showResult]);

  const processAnswer = (isCorrect: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    // 護盾效果：答錯時不扣分（整局有效）
    let finalCorrect = isCorrect;
    if (!isCorrect && shieldActive) {
      finalCorrect = true;  // 護盾保護，不扣分（整局有效，不消耗）
    }
    // 硬殼蟹能力：每日首次錯誤不扣分
    if (!isCorrect && !finalCorrect && companionPet?.species === 'hard_crab' && !dailyFirstMissUsed) {
      finalCorrect = true;
      setDailyFirstMissUsed(true);
    }
    // Combo 連續答對追蹤（需啟用）
    if (settings.enableComboSystem) {
      const COMBO_MILESTONES = [
        { streak: 3, bonus: 2 }, { streak: 5, bonus: 5 }, { streak: 7, bonus: 8 },
        { streak: 10, bonus: 15 }, { streak: 15, bonus: 25 }, { streak: 20, bonus: 40 },
      ];
      if (finalCorrect) {
        const newCombo = comboCount + 1;
        setComboCount(newCombo);
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        const milestone = COMBO_MILESTONES.find(m => m.streak === newCombo);
        if (milestone) {
          setComboPopup({ bonus: milestone.bonus, streak: milestone.streak });
          setTimeout(() => setComboPopup(null), 2000);
        }
      } else {
        setComboCount(0);
      }
    }
    // 檢查雙倍星星/經驗覆蓋是否超出
    const questionNum = results.length + 1;  // 目前第幾題
    if (doubleStarActive && doubleStarCoverage > 0 && questionNum > doubleStarCoverage) {
      setDoubleStarActive(false);
    }
    if (doubleExpActive && doubleExpCoverage > 0 && questionNum > doubleExpCoverage) {
      setDoubleExpActive(false);
    }
    setResults(prev => [...prev, { word: currentWord, correct: finalCorrect, questionType, timeSpent }]);
    setShowResult(true);
    // 寵物助陣動畫
    if (companionPet) {
      setPetAnim(finalCorrect ? 'bounce' : 'shake');
      setTimeout(() => setPetAnim('idle'), 800);
    }
  };

  const handleSelect = (option: Word) => {
    if (showResult) return;
    setSelected(option);
    // 題型 1 (看英文選中文) 和 題型 4 (聽英文選中文) 比對中文，其他比對英文（正規化撇號）
    const isCorrect = (questionType === 1 || questionType === 4) ? option.chinese === currentWord.chinese : normalizeApostrophe(option.english) === normalizeApostrophe(currentWord.english);
    processAnswer(isCorrect);
  };

  const handleSpellSubmit = () => {
    if (showResult) return;
    const userAnswer = normalizeSpellAnswer(inputValue);
    if (questionType === 2 || questionType === 5 || questionType === 6) {
      // 看中文寫英文 / 聽英文寫英文 / 看例句填空
      processAnswer(userAnswer === normalizeSpellAnswer(currentWord.english));
    } else if (questionType === 3) {
      // 看英文寫中文 - 支援「/」分隔的多個正確答案
      const possibleAnswers = currentWord.chinese.split(/[\/、,，]/).map(a => normalizeSpellAnswer(a));
      processAnswer(possibleAnswers.some(ans => userAnswer === ans));
    }
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
      const duration = Math.round((Date.now() - quizStartTime) / 1000);
      const saveResult = await onSaveProgress(results, true, duration, doubleStarActive, difficultyConfig.rewardMultiplier, doubleExpActive);
      if (saveResult?.starsEarned !== undefined) setStarsEarned(saveResult.starsEarned);
      if (saveResult?.comboBonus !== undefined) setComboBonus(saveResult.comboBonus);
      if (saveResult?.accuracyMultiplier !== undefined) setAccuracyMultiplier(saveResult.accuracyMultiplier);
      if (saveResult?.petLevelBonus !== undefined) setPetLevelBonus(saveResult.petLevelBonus);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleExit = async () => {
    const duration = Math.round((Date.now() - quizStartTime) / 1000);
    await onSaveProgress(results, false, duration, doubleStarActive, difficultyConfig.rewardMultiplier, doubleExpActive);
    onExit();
  };

  const isCurrentCorrect = results.length > 0 && results[results.length - 1]?.correct;

  if (isFinished) {
    const correct = results.filter(r => r.correct).length;
    const rate = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
    const wrongWords = results.filter(r => !r.correct).map(r => r.word);
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          {customQuizName && <p className="text-sm text-gray-500 mb-1">{customQuizName}</p>}
          <h1 className="text-3xl mb-4">測驗完成！</h1>
          <div className="text-6xl font-bold text-gray-700 mb-2">{rate}%</div>
          <p className="text-gray-600 mb-4">答對 {correct} / {results.length} 題</p>
          {starsEarned !== null && starsEarned > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">+{starsEarned} ⭐</div>
              {accuracyMultiplier !== 1 && (
                <div className="text-sm text-yellow-700 mt-1">準確率乘數 x{accuracyMultiplier}</div>
              )}
              {comboBonus > 0 && (
                <div className="text-sm text-orange-600 mt-1">Combo 獎勵 +{comboBonus} ⭐</div>
              )}
              {petLevelBonus > 0 && (
                <div className="text-sm text-purple-600 mt-1">寵物加成 +{petLevelBonus}%</div>
              )}
            </div>
          )}
          {maxCombo >= 3 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-xl font-bold text-orange-600">最高連續答對 {maxCombo} 題</div>
            </div>
          )}
          {bonusMultiplier && bonusMultiplier > 1 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-yellow-700 font-bold">加分獎勵 {bonusMultiplier}x</p>
              <p className="text-yellow-600 text-sm">此測驗的星星獎勵已乘以 {bonusMultiplier} 倍！</p>
            </div>
          )}
          {companionPet && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <PixelPet species={companionPet.species} stage={companionPet.stage} evolutionPath={companionPet.evolutionPath} rarity={companionPet.rarity} size={2} scale={1} animate={false} showAura={false} />
                <span className="font-medium text-gray-700">{companionPet.name} 助陣</span>
              </div>
              {typeBonusMultiplier && typeBonusMultiplier !== 1.0 && (
                <p className={`text-sm font-medium ${typeBonusMultiplier > 1 ? 'text-green-600' : 'text-orange-500'}`}>
                  {category && DAY_ELEMENTS[category] ? `${DAY_ELEMENTS[category].emoji} ` : ''}
                  屬性加成 ×{typeBonusMultiplier}
                  {typeBonusMultiplier > 1 ? ' 超有效！' : ' 不擅長'}
                </p>
              )}
            </div>
          )}
          {wrongWords.length > 0 && (
            <div className="mb-4 text-left bg-red-50 p-3 rounded-lg">
              <p className="font-medium text-red-700 mb-2">需要加強的單字：</p>
              <div className="flex flex-wrap gap-1">{wrongWords.map((w, i) => <span key={i} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">{normalizeApostrophe(w.english)} ({w.chinese}{w.partOfSpeech ? `, ${w.partOfSpeech}` : ''})</span>)}</div>
            </div>
          )}
          <Button onClick={onExit} className="w-full">返回</Button>
        </Card>
      </div>
    );
  }

  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p>載入中...</p></div>;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {showExitConfirm && <ConfirmDialog message={results.length > 0 ? '確定要離開嗎？\n\n目前進度會自動儲存。' : '確定要離開測驗嗎？'} confirmText="離開" cancelText="繼續測驗" confirmVariant="primary" onConfirm={handleExit} onCancel={() => setShowExitConfirm(false)} />}
      {/* Combo 里程碑彈出動畫 */}
      {settings.enableComboSystem && comboPopup && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 animate-bounce-in pointer-events-none">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl text-center">
            <div className="text-2xl font-bold">{comboPopup.streak} 連續答對!</div>
            <div className="text-lg font-bold">+{comboPopup.bonus} ⭐</div>
          </div>
        </div>
      )}
      {/* Combo 計數器 */}
      {settings.enableComboSystem && comboCount >= 2 && !showResult && (
        <div className="fixed top-4 right-4 z-40 bg-orange-500/90 text-white px-3 py-1 rounded-full text-sm font-bold">
          {comboCount} 連對
        </div>
      )}
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4 text-gray-100">
          <button onClick={() => setShowExitConfirm(true)} className="text-2xl">✕</button>
          <span className="font-bold">{customQuizName || (isReview ? '複習模式' : '測驗模式')}</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className="mb-4">
          <div className="bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full transition-all ${timeLeft <= 3 ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${(timeLeft / getTimeForType(questionType)) * 100}%` }}></div></div>
          <div className="text-center text-gray-300 mt-1">{timeLeft} 秒</div>
        </div>

        {/* 道具欄 */}
        {!showResult && !isFinished && (items.length > 0 || doubleStarActive || doubleExpActive || shieldActive) && (
          <div className="mb-3 p-2 bg-white/90 rounded-lg">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap">
                {getItemCount('time_extend') > 0 && (
                  <button
                    onClick={() => useItem('time_extend')}
                    disabled={!!itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star'}
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star' ? 'bg-gray-200 text-gray-400' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                    title="時間 +10 秒"
                  >
                    ⏰ {getItemCount('time_extend')}
                  </button>
                )}
                {getItemCount('hint') > 0 && (
                  <button
                    onClick={() => useItem('hint')}
                    disabled={!!itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star'}
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star' ? 'bg-gray-200 text-gray-400' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                    title="顯示第一個字母"
                  >
                    💡 {getItemCount('hint')}
                  </button>
                )}
                {getItemCount('skip') > 0 && (
                  <button
                    onClick={() => useItem('skip')}
                    disabled={!!itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star'}
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star' ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    title="跳過本題"
                  >
                    ⏭️ {getItemCount('skip')}
                  </button>
                )}
                {getItemCount('shield') > 0 && !shieldActive && (
                  <button
                    onClick={() => useItem('shield')}
                    disabled={!!itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star'}
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${itemUsedThisQuestion && itemUsedThisQuestion !== 'double_star' ? 'bg-gray-200 text-gray-400' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    title="本次測驗所有答錯不扣分"
                  >
                    🛡️ {getItemCount('shield')}
                  </button>
                )}
                {getItemCount('double_star') > 0 && !doubleStarActive && (
                  <button
                    onClick={() => useItem('double_star')}
                    className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="本次測驗星星 ×2（每張 20 題）"
                  >
                    ✨ {getItemCount('double_star')}
                  </button>
                )}
                {getItemCount('double_exp') > 0 && !doubleExpActive && (
                  <button
                    onClick={() => useItem('double_exp')}
                    className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
                    title="本次測驗寵物經驗 ×2（每張 20 題）"
                  >
                    📈 {getItemCount('double_exp')}
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {shieldActive && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">🛡️ 全場護盾</span>
                )}
                {doubleStarActive && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-900 text-white">✨ 雙倍星星</span>
                )}
                {doubleExpActive && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-700 text-white">📈 雙倍經驗</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 提示顯示 */}
        {hint && !showResult && (
          <div className="mb-3 p-2 bg-yellow-100 rounded-lg text-center">
            <span className="text-yellow-800 font-medium">{hint}</span>
          </div>
        )}

        <Card className="mb-4">
          <div className="text-sm text-gray-500 mb-2">{questionTypes[questionType]?.label || '未知題型'}</div>
          {questionType === 0 && <div className="text-center py-4"><div className="text-3xl font-bold text-gray-800">{currentWord.chinese}</div>{currentWord.partOfSpeech && <div className="text-sm text-gray-500 mt-1">({currentWord.partOfSpeech})</div>}</div>}
          {questionType === 1 && <div className="text-center text-3xl font-bold text-gray-800 py-4">{normalizeApostrophe(currentWord.english)}</div>}
          {questionType === 2 && (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-800">{currentWord.chinese}</div>
              {currentWord.partOfSpeech && <div className="text-sm text-gray-500 mb-4">({currentWord.partOfSpeech})</div>}
              {!currentWord.partOfSpeech && <div className="mb-4"></div>}
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="輸入英文單字..." className="w-full px-4 py-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
          {questionType === 3 && (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-800">{normalizeApostrophe(currentWord.english)}</div>
              {currentWord.partOfSpeech && <div className="text-sm text-gray-500 mb-4">({currentWord.partOfSpeech})</div>}
              {!currentWord.partOfSpeech && <div className="mb-4"></div>}
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="輸入中文意思..." className="w-full px-4 py-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
          {questionType === 4 && (
            <div className="text-center py-4">
              <button
                onClick={() => speak(stripParenthetical(currentWord.english))}
                className="w-20 h-20 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-4xl shadow-lg transition-all active:scale-95"
                title="播放發音"
              >
                🔊
              </button>
              <p className="text-sm text-gray-500 mt-2">點擊播放發音（可無限次播放）</p>
            </div>
          )}
          {questionType === 5 && (
            <div className="text-center py-4">
              <button
                onClick={() => speak(stripParenthetical(currentWord.english))}
                className="w-20 h-20 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-4xl shadow-lg transition-all active:scale-95 mb-4"
                title="播放發音"
              >
                🔊
              </button>
              <p className="text-sm text-gray-500 mb-4">點擊播放發音（可無限次播放）</p>
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="輸入聽到的英文單字..." className="w-full px-4 py-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
          {questionType === 6 && (
            <div className="text-center py-4">
              <div className="text-lg text-gray-800 mb-2 leading-relaxed">
                {(() => {
                  const sentence = currentWord.exampleSentence || '';
                  const normalizedSentence = normalizeApostrophe(sentence);
                  if (normalizedSentence.includes('___')) {
                    return normalizedSentence.split('___').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && <span className="inline-block mx-1 px-3 py-0.5 bg-yellow-200 text-yellow-800 rounded font-bold border-b-2 border-yellow-400">___</span>}
                      </React.Fragment>
                    ));
                  }
                  // 清理英文：正規化撇號 → 去括號內容 → 去尾部標點 → 正規化空格
                  const matchText = normalizeApostrophe(stripParenthetical(currentWord.english))
                    .replace(/[!?.,;:!？。，；：]+$/g, '')
                    .trim().replace(/\s+/g, ' ');
                  // 建立彈性 regex：空格用 \s+ 匹配，大小寫不敏感
                  const regexPattern = matchText
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\s+/g, '\\s+');
                  const blankSentence = normalizedSentence.replace(new RegExp(regexPattern, 'gi'), '___');
                  return blankSentence.split('___').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="inline-block mx-1 px-3 py-0.5 bg-yellow-200 text-yellow-800 rounded font-bold border-b-2 border-yellow-400">___</span>}
                    </React.Fragment>
                  ));
                })()}
              </div>
              <div className="text-sm text-gray-500 mb-4">{currentWord.chinese}{currentWord.partOfSpeech && <span className="ml-1">({currentWord.partOfSpeech})</span>}</div>
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="填入正確的英文單字..." className="w-full px-4 py-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
          {questionType === 7 && (
            <div className="text-center py-4">
              <div className="text-lg text-gray-800 mb-2 leading-relaxed">
                {(() => {
                  const sentence = currentWord.exampleSentence || '';
                  const normalizedSentence = normalizeApostrophe(sentence);
                  if (normalizedSentence.includes('___')) {
                    return normalizedSentence.split('___').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && <span className="inline-block mx-1 px-3 py-0.5 bg-yellow-200 text-yellow-800 rounded font-bold border-b-2 border-yellow-400">___</span>}
                      </React.Fragment>
                    ));
                  }
                  const matchText = normalizeApostrophe(stripParenthetical(currentWord.english))
                    .replace(/[!?.,;:!？。，；：]+$/g, '')
                    .trim().replace(/\s+/g, ' ');
                  const regexPattern = matchText
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\s+/g, '\\s+');
                  const blankSentence = normalizedSentence.replace(new RegExp(regexPattern, 'gi'), '___');
                  return blankSentence.split('___').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="inline-block mx-1 px-3 py-0.5 bg-yellow-200 text-yellow-800 rounded font-bold border-b-2 border-yellow-400">___</span>}
                    </React.Fragment>
                  ));
                })()}
              </div>
              <div className="text-sm text-gray-500 mb-2">{currentWord.chinese}{currentWord.partOfSpeech && <span className="ml-1">({currentWord.partOfSpeech})</span>}</div>
            </div>
          )}
        </Card>
        {(questionType < 2 || questionType === 4 || questionType === 7) && (
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt, i) => {
              // 題型 1 (看英文選中文) 和 題型 4 (聽英文選中文) 比對中文，其他比對英文（正規化撇號）
              const isThis = (questionType === 1 || questionType === 4) ? opt.chinese === currentWord.chinese : normalizeApostrophe(opt.english) === normalizeApostrophe(currentWord.english);
              const isSelected = selected?.id === opt.id;
              let bgClass = 'bg-white hover:bg-gray-50';
              if (showResult) { if (isThis) bgClass = 'bg-green-500 text-white'; else if (isSelected) bgClass = 'bg-red-500 text-white'; }
              // 音波蝠能力：高亮錯誤選項
              const isSonicHighlighted = sonicBatHighlight === opt.id && !showResult;
              if (isSonicHighlighted) bgClass = 'bg-red-100 text-red-400 line-through opacity-60';
              // 題型 1 和 題型 4 顯示中文選項，其他顯示英文選項
              return <button key={i} onClick={() => handleSelect(opt)} disabled={showResult || isSonicHighlighted} className={`p-4 rounded-xl font-medium text-lg shadow transition-all ${bgClass}`}>{(questionType === 1 || questionType === 4) ? opt.chinese : normalizeApostrophe(opt.english)}</button>;
            })}
          </div>
        )}
        {showResult && (
          <Card className={`mt-4 ${isCurrentCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-center">
              <div className="text-4xl mb-2">{isCurrentCorrect ? '✓' : '✗'}</div>
              {!isCurrentCorrect && timeLeft === 0 && <p className="text-red-500 text-sm mb-2">時間到！</p>}
              <div className="flex items-center justify-center gap-2">
                <div className="font-bold text-lg">{normalizeApostrophe(currentWord.english)}</div>
                <button onClick={() => speak(stripParenthetical(currentWord.english))} className="text-blue-500 hover:text-blue-700 transition-colors" title="播放發音">🔊</button>
              </div>
              <div className="text-gray-600">{currentWord.chinese}{currentWord.partOfSpeech && <span className="text-gray-500 ml-1">({currentWord.partOfSpeech})</span>}</div>
              <Button onClick={nextQuestion} className="mt-3" variant={isCurrentCorrect ? 'success' : 'primary'}>{currentIndex + 1 >= totalQuestions ? '查看結果' : '下一題'}</Button>
            </div>
          </Card>
        )}

        {/* 寵物助陣浮動視窗 */}
        {companionPet && (
          <div className={`fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3 text-center z-40 transition-transform ${
            petAnim === 'bounce' ? 'animate-bounce' : petAnim === 'shake' ? 'animate-pulse' : ''
          }`} style={{ minWidth: 72 }}>
            <PixelPet species={companionPet.species} stage={companionPet.stage} evolutionPath={companionPet.evolutionPath} rarity={companionPet.rarity} size={2} scale={1.2} animate={true} showAura={false} />
            <div className="text-xs font-medium text-gray-700 truncate max-w-[64px]">{companionPet.name}</div>
            {typeBonusMultiplier && typeBonusMultiplier !== 1.0 && (
              <div className={`text-xs font-bold mt-0.5 ${typeBonusMultiplier > 1 ? 'text-green-600' : 'text-orange-500'}`}>
                {typeBonusMultiplier > 1 ? `+${Math.round((typeBonusMultiplier - 1) * 100)}%` : `${Math.round((typeBonusMultiplier - 1) * 100)}%`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ 主應用程式 ============

type AppScreen = 'role-select' | 'student-login' | 'teacher-login' | 'teacher-dashboard' | 'student-dashboard' | 'quiz';

export default function App() {
  const [files, setFiles] = useState<WordFile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('role-select');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyQuest, setDailyQuest] = useState<DailyQuest | null>(null);
  const [loginReward, setLoginReward] = useState<{ stars: number; streak: number } | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [petEvolution, setPetEvolution] = useState<{ stageName: string; species: string; stage: number; evolutionPath?: string | null; rarity?: string } | null>(null);
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([]);
  const [cooldownWarning, setCooldownWarning] = useState<number | null>(null);
  const [hungerExpMultiplier, setHungerExpMultiplier] = useState<number | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoadError(null);
      const [filesData, profilesData, settingsData, quizzesData] = await Promise.all([
        api.getFiles(), api.getProfiles(), api.getSettings(), api.getCustomQuizzes()
      ]);
      setFiles(filesData);
      setProfiles(profilesData);
      setSettings(settingsData);
      setCustomQuizzes(quizzesData);
    } catch (error) {
      // 錯誤已顯示給使用者
      setLoadError(error instanceof Error ? error.message : '無法連線到伺服器');
    }
  };

  // 自動登入：檢查 localStorage
  const tryAutoLogin = async (profilesData: Profile[]) => {
    try {
      const savedAuth = localStorage.getItem('auth');
      if (!savedAuth) return;
      const auth = JSON.parse(savedAuth);
      if (auth.role === 'teacher') {
        if (auth.teacherToken) {
          const valid = await api.verifyTeacher();
          if (valid) {
            setCurrentScreen('teacher-dashboard');
          } else {
            localStorage.removeItem('auth');
          }
        } else {
          localStorage.removeItem('auth');
        }
      } else if (auth.role === 'student' && auth.profileId) {
        const profile = profilesData.find(p => p.id === auth.profileId);
        if (profile) {
          await handleSelectProfile(profile);
        } else {
          localStorage.removeItem('auth');
        }
      }
    } catch {
      localStorage.removeItem('auth');
    }
  };

  useEffect(() => {
    loadData().then(() => {
      // tryAutoLogin needs the latest profiles data, so we use a ref-like approach
    }).finally(() => setLoading(false));
  }, []);

  // Auto-login after data loads
  const autoLoginAttempted = useRef(false);
  useEffect(() => {
    if (!loading && profiles.length >= 0 && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      tryAutoLogin(profiles);
    }
  }, [loading, profiles]);

  useEffect(() => {
    if (currentProfile) {
      const updated = profiles.find(p => p.id === currentProfile.id);
      if (updated) setCurrentProfile(updated);
    }
  }, [profiles]);

  const handleUploadFile = async (name: string, words: Omit<Word, 'id'>[]) => {
    await api.createFile(name, words);
    await loadData();
  };

  const handleDeleteFile = async (fileId: string) => {
    await api.deleteFile(fileId);
    await loadData();
  };

  const handleAddWords = async (fileId: string, words: Omit<Word, 'id'>[]) => {
    const result = await api.addWordsToFile(fileId, words);
    await loadData();
    return result;
  };


  const handleUpdateSettings = async (newSettings: Partial<Settings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  };

  const handleToggleMastered = async (profileId: string, wordId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const isMastered = profile.masteredWords.some(m => m.wordId === wordId);
    if (isMastered) {
      await api.removeMasteredWord(profileId, wordId);
    } else {
      await api.addMasteredWords(profileId, [wordId]);
    }
    await loadData();
  };

  const handleResetMastered = async (profileId: string) => {
    await api.resetMasteredWords(profileId);
    await loadData();
  };

  const handleDeleteProfile = async (profileId: string) => {
    await api.deleteProfile(profileId);
    await loadData();
  };

  // 處理學生選擇角色（含登入檢查）
  const handleSelectProfile = async (profile: Profile) => {
    try {
      const [result, items] = await Promise.all([
        api.checkLogin(profile.id),
        api.getProfileItems(profile.id)
      ]);
      setCurrentProfile(result.profile);
      setDailyQuest(result.dailyQuest);
      setLoginReward(result.loginReward);
      setProfileItems(items);
      setCurrentScreen('student-dashboard');
      // 同步更新 profiles 列表
      setProfiles(prev => prev.map(p => p.id === result.profile.id ? result.profile : p));
      // 記住登入狀態
      localStorage.setItem('auth', JSON.stringify({ role: 'student', profileId: result.profile.id }));
    } catch {
      // 如果 API 失敗，仍然允許進入（向後相容）
      setCurrentProfile(profile);
      setProfileItems([]);
      setCurrentScreen('student-dashboard');
      localStorage.setItem('auth', JSON.stringify({ role: 'student', profileId: profile.id }));
    }
  };

  // 自訂測驗處理函數
  const handleCreateCustomQuiz = async (data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[]; starMultiplier?: number; assignedProfileIds?: string[]; durationDays?: number }) => {
    await api.createCustomQuiz(data);
    await loadData();
  };

  const handleUpdateCustomQuiz = async (id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean; starMultiplier: number; assignedProfileIds: string[]; durationDays: number }>) => {
    await api.updateCustomQuiz(id, data);
    await loadData();
  };

  const handleDeleteCustomQuiz = async (id: string) => {
    await api.deleteCustomQuiz(id);
    await loadData();
  };

  const startQuiz = (
    file: WordFile,
    reviewWords: Word[] | null = null,
    options?: { difficulty?: 'easy' | 'normal' | 'hard'; questionCount?: number; companionPetId?: string; companionPet?: Pet; category?: string; typeBonusMultiplier?: number; wordRange?: { start: number; end: number } }
  ) => {
    if (!currentProfile) return;
    const isReview = reviewWords !== null;
    const masteredIds = currentProfile.masteredWords.map(m => m.wordId);
    let baseWords = isReview ? reviewWords : file.words;
    if (!isReview && options?.wordRange) {
      baseWords = file.words.slice(options.wordRange.start - 1, options.wordRange.end);
    }
    let wordsToQuiz = isReview ? baseWords : baseWords.filter(w => !masteredIds.includes(w.id));
    if (wordsToQuiz.length === 0) { alert('沒有可測驗的單字（全部已精熟或已完成複習）'); return; }

    // 根據題數設定限制單字數量
    const questionCount = options?.questionCount;
    if (questionCount && questionCount > 0 && questionCount < wordsToQuiz.length) {
      // 隨機選取指定數量的單字
      const shuffled = [...wordsToQuiz].sort(() => Math.random() - 0.5);
      wordsToQuiz = shuffled.slice(0, questionCount);
    }

    setQuizState({
      file,
      words: wordsToQuiz,
      isReview,
      difficulty: options?.difficulty,
      questionCount: options?.questionCount,
      companionPetId: options?.companionPetId,
      companionPet: options?.companionPet,
      category: options?.category || file.category || undefined,
      typeBonusMultiplier: options?.typeBonusMultiplier
    });
    setCurrentScreen('quiz');
  };

  const startCustomQuiz = (quiz: CustomQuiz, words: Word[]) => {
    if (!currentProfile) return;
    if (words.length === 0) { alert('此自訂測驗沒有可測驗的單字'); return; }
    const file = files.find(f => f.id === quiz.fileId);
    if (!file) { alert('來源檔案已被刪除'); return; }
    setQuizState({
      file,
      words,
      isReview: false,
      customQuestionTypes: quiz.questionTypes,
      customQuizId: quiz.id,
      customQuizName: quiz.name,
      bonusMultiplier: quiz.starMultiplier > 1 ? quiz.starMultiplier : undefined
    });
    setCurrentScreen('quiz');
  };

  const saveProgress = async (results: QuizResult[], completed: boolean, duration: number, doubleStars: boolean = false, difficultyMultiplier: number = 1, doubleExp: boolean = false) => {
    if (results.length === 0 || !currentProfile || !quizState) return;
    const wrongWordIds = results.filter(r => !r.correct).map(r => r.word.id);
    const correctWordIds = results.filter(r => r.correct).map(r => r.word.id);

    await api.saveQuizResults({
      profileId: currentProfile.id,
      fileId: quizState.file.id,
      duration,
      completed,
      results: results.map(r => ({ wordId: r.word.id, correct: r.correct, questionType: r.questionType, timeSpent: r.timeSpent })),
      weakWordIds: wrongWordIds,
      correctWordIds,
      customQuizId: quizState.customQuizId,
      customQuizName: quizState.customQuizName,
      companionPetId: quizState.companionPetId,
      categoryUsed: quizState.category,
      typeBonus: quizState.typeBonusMultiplier
    });

    if (quizState.isReview) {
      // SRS 複習模式：根據答對/答錯更新等級（錯誤不影響後續任務獎勵）
      try {
        for (const result of results) {
          const isMastered = currentProfile.masteredWords.some(m => m.wordId === result.word.id);
          if (isMastered) {
            await api.updateReview(currentProfile.id, result.word.id, result.correct);
          } else if (result.correct) {
            await api.addMasteredWords(currentProfile.id, [result.word.id]);
          }
        }
      } catch (e) {
        console.error('SRS update failed:', e);
      }
    }

    // 遊戲化：發放星星獎勵（由後端統一計算）
    const correctCount = results.filter(r => r.correct).length;
    const totalCount = results.length;
    const wordResultsData = results.map(r => ({ wordId: r.word.id, correct: r.correct, questionType: r.questionType }));
    try {
      const awardResult = await api.awardStars(currentProfile.id, {
        correctCount,
        totalCount,
        fileId: quizState.file.id,
        wordResults: wordResultsData,
        doubleStarActive: doubleStars,
        difficultyMultiplier,
        bonusMultiplier: quizState.bonusMultiplier,
        companionPetId: quizState.companionPetId,
        category: quizState.category,
        isReview: quizState.isReview
      });

      // 如果有冷卻倍率，存到 state 供結果頁顯示
      if (awardResult.cooldownMultiplier !== undefined && awardResult.cooldownMultiplier < 1) {
        setCooldownWarning(awardResult.cooldownMultiplier);
      }

      // 更新每日任務進度
      if (totalCount > 0) {
        // 更新測驗題數任務
        await api.updateQuestProgress(currentProfile.id, 'quiz_count', totalCount);

        // 更新正確率任務
        const accuracy = Math.round((correctCount / totalCount) * 100);
        await api.updateQuestProgress(currentProfile.id, 'accuracy', accuracy);

        // 計算連續答對（簡化：如果全對則算連對數）
        if (correctCount === totalCount) {
          await api.updateQuestProgress(currentProfile.id, 'correct_streak', correctCount);
        }

        // 如果是複習模式，更新複習任務
        if (quizState.isReview) {
          await api.updateQuestProgress(currentProfile.id, 'review_count', totalCount);
        }
      }

      // 重新載入每日任務
      const newDailyQuest = await api.getDailyQuest(currentProfile.id);
      setDailyQuest(newDailyQuest);

      // 檢查新徽章
      const badgeResult = await api.checkBadges(currentProfile.id);
      if (badgeResult.newBadges.length > 0) {
        setNewBadges(badgeResult.newBadges);
      }

      // 增加寵物經驗值
      if (correctCount > 0) {
        const petResult = await api.gainPetExp(currentProfile.id, correctCount, doubleExp);
        if (petResult.evolved && petResult.stageName) {
          setPetEvolution({ stageName: petResult.stageName, species: petResult.species || 'spirit_dog', stage: petResult.newStage, evolutionPath: petResult.evolutionPath, rarity: petResult.rarity });
        }
        if (petResult.hungerExpMultiplier !== undefined && petResult.hungerExpMultiplier !== 1.0) {
          setHungerExpMultiplier(petResult.hungerExpMultiplier);
        }
      }

      // 滿分獎勵寶箱
      if (correctCount === totalCount && totalCount >= 5) {
        await api.giveChest(currentProfile.id, 'bronze');
      }

      // 檢查新稱號
      await api.checkTitles(currentProfile.id);

      await loadData();
      return {
        starsEarned: awardResult.starsEarned || 0,
        comboBonus: awardResult.comboBonus || 0,
        maxStreak: awardResult.maxStreak || 0,
        accuracyMultiplier: awardResult.accuracyMultiplier || 1,
        petLevelBonus: awardResult.petLevelBonus || 0,
      };
    } catch {
      // 遊戲化功能失敗不影響主流程
      await loadData();
    }
  };

  const exitQuiz = () => { setQuizState(null); setCurrentScreen('student-dashboard'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-800 text-xl">載入中...</div></div>;

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-400 to-orange-400 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md text-center shadow-xl">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-red-600 mb-2">連線失敗</h1>
        <p className="text-gray-600 mb-4">{loadError}</p>
        <p className="text-sm text-gray-500 mb-4">請確認：<br/>1. 伺服器是否正常運行<br/>2. DATABASE_URL 環境變數是否設定正確</p>
        <button onClick={() => { setLoading(true); loadData().finally(() => setLoading(false)); }} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">重試</button>
      </div>
    </div>
  );

  if (currentScreen === 'quiz' && quizState && currentProfile) {
    return <QuizScreen file={quizState.file} words={quizState.words} isReview={quizState.isReview} settings={settings} allFiles={files} customQuestionTypes={quizState.customQuestionTypes} customQuizName={quizState.customQuizName} bonusMultiplier={quizState.bonusMultiplier} difficulty={quizState.difficulty} profileId={currentProfile.id} profileItems={profileItems} companionPet={quizState.companionPet} category={quizState.category} typeBonusMultiplier={quizState.typeBonusMultiplier} onSaveProgress={saveProgress} onExit={exitQuiz} onItemsUpdate={setProfileItems} />;
  }

  // 新徽章彈窗
  const newBadgePopup = newBadges.length > 0 ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">獲得新徽章！</h2>
        <div className="space-y-3 mb-4">
          {newBadges.map(badge => {
            const rarityColors: Record<string, string> = {
              common: 'from-gray-100 to-gray-200',
              rare: 'from-blue-100 to-blue-200',
              epic: 'from-purple-100 to-purple-200',
              legendary: 'from-yellow-100 to-orange-200'
            };
            return (
              <div key={badge.id} className={`p-3 rounded-lg bg-gradient-to-br ${rarityColors[badge.rarity]}`}>
                <div className="text-3xl mb-1">{badge.icon}</div>
                <div className="font-bold">{badge.name}</div>
                <div className="text-sm text-gray-600">{badge.description}</div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setNewBadges([])}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
        >
          太棒了！
        </button>
      </div>
    </div>
  ) : null;

  // 飽足度經驗倍率彈窗
  const hungerExpPopup = hungerExpMultiplier !== null ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in shadow-xl border ${hungerExpMultiplier > 1 ? 'bg-gradient-to-b from-green-50 to-white border-green-200' : 'bg-gradient-to-b from-orange-50 to-white border-orange-200'}`}>
        <div className="text-6xl mb-3">{hungerExpMultiplier > 1 ? '🍖' : '😿'}</div>
        <h2 className={`text-xl font-bold mb-1 ${hungerExpMultiplier > 1 ? 'text-green-700' : 'text-orange-700'}`}>
          {hungerExpMultiplier > 1 ? '寵物吃飽飽！' : '寵物肚子餓了...'}
        </h2>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-3 ${hungerExpMultiplier > 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          經驗值 ×{hungerExpMultiplier}
        </div>
        <p className="text-gray-500 text-sm mb-4">
          {hungerExpMultiplier > 1
            ? '吃飽的寵物學習更有效率！'
            : '記得餵食寵物，才能獲得更多經驗喔！'}
        </p>
        <button
          onClick={() => setHungerExpMultiplier(null)}
          className={`w-full py-2.5 text-white rounded-xl font-medium transition-all ${hungerExpMultiplier > 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
        >
          {hungerExpMultiplier > 1 ? '太棒了！' : '知道了'}
        </button>
      </div>
    </div>
  ) : null;

  // 冷卻警告彈窗
  const cooldownWarningPopup = cooldownWarning !== null ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
        <div className="text-5xl mb-4">💡</div>
        <h2 className="text-lg font-bold text-yellow-600 mb-2">星星獲得減少</h2>
        <p className="text-gray-600 mb-2">
          你已經很熟練這些單字了！重複練習精熟的單字，星星倍率會降為 <span className="font-bold text-yellow-600">{Math.round(cooldownWarning * 100)}%</span>。
        </p>
        <p className="text-sm text-gray-500 mb-4">
          試試選擇還沒背過的單字範圍，或挑戰其他單字檔案來賺更多星星！
        </p>
        <button
          onClick={() => setCooldownWarning(null)}
          className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium"
        >
          知道了
        </button>
      </div>
    </div>
  ) : null;

  // 寵物進化彈窗
  const petEvolutionPopup = petEvolution ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
        <div className="flex justify-center mb-4"><PixelPet species={petEvolution.species} stage={petEvolution.stage} evolutionPath={petEvolution.evolutionPath} rarity={petEvolution.rarity} size={5} scale={2.5} animate={true} showAura={true} /></div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">🎉 寵物進化了！</h2>
        <p className="text-gray-600 mb-4">
          你的寵物進化成了<br />
          <span className="text-2xl font-bold text-gray-700">{petEvolution.stageName}</span>！
        </p>
        <button
          onClick={() => setPetEvolution(null)}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
        >
          太棒了！
        </button>
      </div>
    </div>
  ) : null;

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setCurrentProfile(null);
    setDailyQuest(null);
    setLoginReward(null);
    setCurrentScreen('role-select');
  };

  if (currentScreen === 'role-select') {
    return <RoleSelectScreen onSelectStudent={() => setCurrentScreen('student-login')} onSelectTeacher={() => setCurrentScreen('teacher-login')} />;
  }

  if (currentScreen === 'student-login') {
    return <StudentLoginScreen onLogin={async (profile) => { await handleSelectProfile(profile); }} onBack={() => setCurrentScreen('role-select')} />;
  }

  if (currentScreen === 'teacher-login') {
    return <TeacherLogin onSuccess={(token) => { localStorage.setItem('auth', JSON.stringify({ role: 'teacher', teacherToken: token })); setCurrentScreen('teacher-dashboard'); }} onBack={() => setCurrentScreen('role-select')} />;
  }

  if (currentScreen === 'teacher-dashboard') {
    return <TeacherDashboard files={files} profiles={profiles} settings={settings} customQuizzes={customQuizzes} onUploadFile={handleUploadFile} onDeleteFile={handleDeleteFile} onAddWords={handleAddWords} onUpdateSettings={handleUpdateSettings} onToggleMastered={handleToggleMastered} onResetMastered={handleResetMastered} onDeleteProfile={handleDeleteProfile} onCreateCustomQuiz={handleCreateCustomQuiz} onUpdateCustomQuiz={handleUpdateCustomQuiz} onDeleteCustomQuiz={handleDeleteCustomQuiz} onRefresh={loadData} onBack={handleLogout} />;
  }

  if (currentScreen === 'student-dashboard' && currentProfile) {
    return (
      <>
        {newBadgePopup}
        {petEvolutionPopup}
        {cooldownWarningPopup}
        {hungerExpPopup}
        <Dashboard profile={currentProfile} files={files} settings={settings} customQuizzes={customQuizzes} dailyQuest={dailyQuest} loginReward={loginReward} onStartQuiz={(f, options) => startQuiz(f, null, options)} onStartReview={(f, weakWords) => startQuiz(f, weakWords)} onStartCustomQuiz={startCustomQuiz} onDismissLoginReward={() => setLoginReward(null)} onBack={handleLogout} />
      </>
    );
  }

  return <RoleSelectScreen onSelectStudent={() => setCurrentScreen('student-login')} onSelectTeacher={() => setCurrentScreen('teacher-login')} />;
}
