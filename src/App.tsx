import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';

const API_BASE = '';

// 類型定義
interface Word {
  id: string;
  english: string;
  chinese: string;
  partOfSpeech?: string;
}

interface WordFile {
  id: string;
  name: string;
  words: Word[];
}

interface HistoryEntry {
  rate: number;
  timestamp: Date | string;
}

interface FileProgress {
  id: string;
  fileId: string;
  correct: number;
  wrong: number;
  weakWordIds: string[];
  history: HistoryEntry[];
}

interface QuizSettings {
  timePerQuestion: number;
  questionCount: number;
  questionTypes: number[];
}

interface QuizSession {
  id: string;
  fileId: string;
  timestamp: Date | string;
  duration: number;
  completed: boolean;
  results: QuizResultDetail[];
}

interface QuizResultDetail {
  wordId: string;
  correct: boolean;
  questionType: number;
  timeSpent: number;
}

interface MasteredWord {
  id: string;
  wordId: string;
  level: number;
  masteredAt: Date | string;
  lastReviewedAt: Date | string;
  nextReviewAt: Date | string;
  reviewCount: number;
  correctStreak: number;
}

interface Profile {
  id: string;
  name: string;
  progress: FileProgress[];
  quizSessions: QuizSession[];
  masteredWords: MasteredWord[];
}

interface Settings {
  teacherPassword: string;
  timePerQuestion: number;
  timeChoiceQuestion: number;    // 選擇題時間（秒）
  timeSpellingQuestion: number;  // 拼寫題時間（秒）
  questionCount: number;
  questionTypes: number[];
}

interface CustomQuiz {
  id: string;
  name: string;
  fileId: string;
  wordIds: string[];
  questionTypes: number[];
  active: boolean;
  createdAt: Date | string;
}

interface QuizResult {
  word: Word;
  correct: boolean;
  questionType: number;
  timeSpent: number;
}

interface QuizState {
  file: WordFile;
  words: Word[];
  isReview: boolean;
  customQuestionTypes?: number[];  // 自訂測驗使用的題型（覆蓋全域設定）
  customQuizName?: string;         // 自訂測驗名稱
}

// 預設資料
const defaultSettings: Settings = {
  teacherPassword: '1234',
  timePerQuestion: 10,
  timeChoiceQuestion: 10,
  timeSpellingQuestion: 30,
  questionCount: 0,
  questionTypes: [0, 1, 2, 3]
};

// API 函數
const api = {
  async getSettings(): Promise<Settings> {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error(`Failed to get settings: ${res.status}`);
    return res.json();
  },
  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
  async createFile(name: string, words: Omit<Word, 'id'>[]): Promise<WordFile> {
    const res = await fetch(`${API_BASE}/api/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, words })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  async deleteFile(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
  },
  async addWordsToFile(fileId: string, words: Omit<Word, 'id'>[]): Promise<WordFile> {
    const res = await fetch(`${API_BASE}/api/files/${fileId}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  async createProfile(name: string): Promise<Profile> {
    const res = await fetch(`${API_BASE}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`Failed to create profile: ${res.status}`);
    return res.json();
  },
  async deleteProfile(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/profiles/${id}`, { method: 'DELETE' });
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
  async createCustomQuiz(data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[] }): Promise<CustomQuiz> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create custom quiz: ${res.status}`);
    return res.json();
  },
  async updateCustomQuiz(id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean }>): Promise<CustomQuiz> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update custom quiz: ${res.status}`);
    return res.json();
  },
  async deleteCustomQuiz(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/custom-quizzes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete custom quiz: ${res.status}`);
  }
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const parseCSV = (text: string): Omit<Word, 'id'>[] => {
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
      if (english && chinese && !/^english$/i.test(english)) {
        words.push({ english, chinese, partOfSpeech: partOfSpeech || undefined });
      }
    }
  }
  return words;
};

const hasGarbledText = (text: string): boolean => {
  if (!text) return false;
  const garbledPattern = /[\ufffd\u0000-\u0008\u000e-\u001f]/g;
  const matches = text.match(garbledPattern);
  return matches !== null && matches.length > 0;
};

const formatDate = (timestamp: Date | string | number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
};

// ============ SRS 間隔重複系統工具函數 ============

const REVIEW_INTERVALS: Record<number, number> = {
  1: 1, 2: 3, 3: 7, 4: 14, 5: 30, 6: 60
};

const isDue = (nextReviewAt: Date | string): boolean => {
  return new Date(nextReviewAt) <= new Date();
};

const getIntervalText = (level: number): string => {
  const days = REVIEW_INTERVALS[Math.min(level, 6)] || 60;
  if (days === 1) return '1天';
  if (days < 30) return `${days}天`;
  if (days === 30) return '1個月';
  return '2個月';
};

const getLevelColor = (level: number): string => {
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

const formatNextReview = (nextReviewAt: Date | string): string => {
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

// ============ 角色選擇畫面 ============

const RoleSelectScreen: React.FC<{ onSelectStudent: () => void; onSelectTeacher: () => void }> = ({ onSelectStudent, onSelectTeacher }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-purple-600">英文單字練習</h1>
      <p className="text-gray-600 text-center mb-8">請選擇您的身分</p>
      <div className="space-y-4">
        <button onClick={onSelectStudent} className="w-full p-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl text-white font-bold text-xl hover:from-green-500 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg">
          <div className="text-4xl mb-2">👨‍🎓</div>我是學生
        </button>
        <button onClick={onSelectTeacher} className="w-full p-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl text-white font-bold text-xl hover:from-purple-500 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg">
          <div className="text-4xl mb-2">👨‍🏫</div>我是老師
        </button>
      </div>
    </Card>
  </div>
);

// ============ 老師登入畫面 ============

const TeacherLogin: React.FC<{ correctPassword: string; onSuccess: () => void; onBack: () => void }> = ({ correctPassword, onSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (password === correctPassword) {
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mb-4">← 返回</button>
        <h1 className="text-xl font-bold text-center mb-6 text-purple-600">老師登入</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">請輸入密碼</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(false); }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="密碼" className={`w-full px-4 py-2 border-2 rounded-lg outline-none ${error ? 'border-red-500' : 'border-purple-300 focus:border-purple-500'}`} autoFocus />
            {error && <p className="text-red-500 text-sm mt-1">密碼錯誤，請重試</p>}
          </div>
          <Button onClick={handleSubmit} className="w-full">登入</Button>
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
  onCreateCustomQuiz: (data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[] }) => Promise<void>;
  onUpdateCustomQuiz: (id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean }>) => Promise<void>;
  onDeleteCustomQuiz: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  files, profiles, settings, customQuizzes, onUploadFile, onDeleteFile, onAddWords, onUpdateSettings, onToggleMastered, onResetMastered, onCreateCustomQuiz, onUpdateCustomQuiz, onDeleteCustomQuiz, onRefresh, onBack
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'students' | 'settings' | 'custom-quiz'>('files');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [previewFile, setPreviewFile] = useState<WordFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WordFile | null>(null);
  const [addWordsTarget, setAddWordsTarget] = useState<WordFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addWordsInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newWord, setNewWord] = useState({ english: '', chinese: '', partOfSpeech: '' });
  const [addingWord, setAddingWord] = useState(false);
  // 自訂測驗狀態
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [quizFileId, setQuizFileId] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [quizQuestionTypes, setQuizQuestionTypes] = useState<number[]>([0, 1]);
  const [editingQuiz, setEditingQuiz] = useState<CustomQuiz | null>(null);
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<CustomQuiz | null>(null);

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

  // 手動新增單字
  const handleAddSingleWord = async () => {
    if (!addWordsTarget || !newWord.english.trim() || !newWord.chinese.trim()) return;
    setAddingWord(true);
    try {
      await onAddWords(addWordsTarget.id, [{
        english: newWord.english.trim(),
        chinese: newWord.chinese.trim(),
        partOfSpeech: newWord.partOfSpeech.trim() || undefined
      }]);
      setNewWord({ english: '', chinese: '', partOfSpeech: '' });
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setPreviewFile(null)} className="text-white text-2xl">←</button>
            <h1 className="text-xl font-bold text-white">{previewFile.name}</h1>
            <div className="w-8"></div>
          </div>
          <Card>
            <p className="text-gray-600 mb-3">共 {previewFile.words.length} 個單字</p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {previewFile.words.map((word, i) => (
                <div key={word.id} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 w-8">{i + 1}.</span>
                  <span className="flex-1 font-medium">{word.english}</span>
                  <span className="flex-1 text-gray-600">{word.chinese}{word.partOfSpeech && <span className="text-purple-500 ml-1">({word.partOfSpeech})</span>}</span>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setAddWordsTarget(null); setNewWord({ english: '', chinese: '', partOfSpeech: '' }); }} className="text-white text-2xl">←</button>
            <h1 className="text-xl font-bold text-white">新增單字到「{currentFile.name}」</h1>
            <div className="w-8"></div>
          </div>

          <Card className="mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-700">手動新增</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newWord.english} onChange={e => setNewWord({...newWord, english: e.target.value})} placeholder="英文" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none" />
                <input type="text" value={newWord.chinese} onChange={e => setNewWord({...newWord, chinese: e.target.value})} placeholder="中文" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="text" value={newWord.partOfSpeech} onChange={e => setNewWord({...newWord, partOfSpeech: e.target.value})} placeholder="詞性（選填）" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleAddSingleWord()} />
                <Button onClick={handleAddSingleWord} disabled={!newWord.english.trim() || !newWord.chinese.trim() || addingWord} variant="success">{addingWord ? '新增中...' : '新增'}</Button>
              </div>
            </div>
          </Card>

          <Card className="mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-700">批次新增（CSV）</h2>
            <input type="file" accept=".csv,.txt" ref={addWordsInputRef} onChange={handleAddWordsCSV} className="hidden" />
            <Button onClick={() => addWordsInputRef.current?.click()} className="w-full" variant="primary">上傳 CSV 檔案</Button>
            <p className="text-xs text-gray-500 mt-2 text-center">格式：英文,中文,詞性（詞性選填）</p>
          </Card>

          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">目前單字（{currentFile.words.length} 個）</h2>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {currentFile.words.map((word, i) => (
                <div key={word.id} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="text-gray-500 w-6">{i + 1}.</span>
                  <span className="flex-1 font-medium">{word.english}</span>
                  <span className="flex-1 text-gray-600">{word.chinese}{word.partOfSpeech && <span className="text-purple-500 ml-1">({word.partOfSpeech})</span>}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      {deleteTarget && (
        <ConfirmDialog
          message={`確定要刪除「${deleteTarget.name}」這個單字檔案嗎？\n\n所有學生的相關學習紀錄也會被刪除。`}
          onConfirm={async () => { await onDeleteFile(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">老師後台</h1>
          <div className="w-8"></div>
        </div>

        <div className="flex mb-4 bg-white/20 rounded-lg p-1 flex-wrap gap-1">
          <button onClick={() => setActiveTab('files')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'files' ? 'bg-white text-purple-600' : 'text-white'}`}>單字檔案</button>
          <button onClick={() => setActiveTab('custom-quiz')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'custom-quiz' ? 'bg-white text-purple-600' : 'text-white'}`}>自訂測驗</button>
          <button onClick={() => setActiveTab('students')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'students' ? 'bg-white text-purple-600' : 'text-white'}`}>學生進度</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'settings' ? 'bg-white text-purple-600' : 'text-white'}`}>測驗設定</button>
        </div>

        {activeTab === 'files' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">單字檔案管理</h2>
            <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full mb-3" variant="primary" disabled={uploading}>{uploading ? '上傳中...' : '上傳 CSV 檔案'}</Button>
            <p className="text-xs text-gray-500 mb-3 text-center">支援 UTF-8、Big5 編碼，格式：英文,中文,詞性</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map(f => (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div><span className="font-medium">{f.name}</span><span className="text-sm text-gray-500 ml-2">({f.words.length} 個單字)</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewFile(f)} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 hover:bg-blue-50 rounded">預覽</button>
                    <button onClick={() => setAddWordsTarget(f)} className="text-green-500 hover:text-green-700 text-sm px-2 py-1 hover:bg-green-50 rounded">新增</button>
                    <button onClick={() => setDeleteTarget(f)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded">刪除</button>
                  </div>
                </div>
              ))}
              {files.length === 0 && <p className="text-gray-500 text-center py-4">尚未上傳任何檔案</p>}
            </div>
          </Card>
        )}

        {activeTab === 'students' && (
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
                      <button onClick={() => setSelectedStudent(student)} className="text-blue-500 hover:text-blue-700 text-sm px-3 py-1 hover:bg-blue-50 rounded">詳細 →</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">整體正確率</span><div className="font-bold text-lg text-green-600">{overallRate}%</div></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">測驗次數</span><div className="font-bold text-lg text-blue-600">{sessionCount}</div></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">待加強</span><div className="font-bold text-lg text-red-600">{weakWordCount}</div></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">最近測驗</span><div className="font-bold text-sm text-purple-600">{lastSession ? formatDate(lastSession.timestamp) : '無'}</div></div>
                    </div>
                  </div>
                );
              })}
              {profiles.length === 0 && <p className="text-gray-500 text-center py-4">尚未建立任何學生角色</p>}
            </div>
          </Card>
        )}

        {activeTab === 'settings' && (
          <QuizSettingsPanel settings={settings} onUpdateSettings={onUpdateSettings} />
        )}

        {activeTab === 'custom-quiz' && (
          <CustomQuizManager
            files={files}
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
          />
        )}
      </div>
    </div>
  );
};

// ============ 自訂測驗管理 ============

interface CustomQuizManagerProps {
  files: WordFile[];
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
  onCreateCustomQuiz: (data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[] }) => Promise<void>;
  onUpdateCustomQuiz: (id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean }>) => Promise<void>;
  onDeleteCustomQuiz: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const CustomQuizManager: React.FC<CustomQuizManagerProps> = ({
  files, customQuizzes, creatingQuiz, setCreatingQuiz, quizName, setQuizName, quizFileId, setQuizFileId,
  selectedWordIds, setSelectedWordIds, quizQuestionTypes, setQuizQuestionTypes,
  editingQuiz, setEditingQuiz, deleteQuizTarget, setDeleteQuizTarget,
  onCreateCustomQuiz, onUpdateCustomQuiz, onDeleteCustomQuiz, onRefresh
}) => {
  const selectedFile = files.find(f => f.id === quizFileId);
  const questionTypeLabels = [
    { type: 0, label: '看中文選英文' },
    { type: 1, label: '看英文選中文' },
    { type: 2, label: '看中文寫英文' },
    { type: 3, label: '看英文寫中文' },
    { type: 4, label: '聽英文選中文' },
    { type: 5, label: '聽英文寫英文' }
  ];

  const resetForm = () => {
    setQuizName('');
    setQuizFileId('');
    setSelectedWordIds([]);
    setQuizQuestionTypes([0, 1]);
    setCreatingQuiz(false);
    setEditingQuiz(null);
  };

  const handleStartEdit = (quiz: CustomQuiz) => {
    setEditingQuiz(quiz);
    setQuizName(quiz.name);
    setQuizFileId(quiz.fileId);
    setSelectedWordIds([...quiz.wordIds]);
    setQuizQuestionTypes([...quiz.questionTypes]);
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
          questionTypes: quizQuestionTypes
        });
      } else {
        await onCreateCustomQuiz({
          name: quizName.trim(),
          fileId: quizFileId,
          wordIds: selectedWordIds,
          questionTypes: quizQuestionTypes
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
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選擇單字檔案</label>
            <select
              value={quizFileId}
              onChange={e => { setQuizFileId(e.target.value); setSelectedWordIds([]); }}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
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
                <button onClick={toggleAllWords} className="text-sm text-purple-600 hover:text-purple-800">
                  {selectedWordIds.length === selectedFile.words.length ? '取消全選' : '全選'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-lg p-2 space-y-1">
                {selectedFile.words.map(word => (
                  <label key={word.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedWordIds.includes(word.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={selectedWordIds.includes(word.id)}
                      onChange={() => toggleWordSelection(word.id)}
                      className="w-4 h-4 rounded text-purple-500"
                    />
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
                      className="w-5 h-5 rounded text-purple-500"
                      disabled={isDisabled}
                    />
                    <span className={isDisabled ? 'text-gray-400' : ''}>{label}</span>
                    {isDisabled && <span className="text-xs text-red-500">（不支援）</span>}
                  </label>
                );
              })}
            </div>
          </div>

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
              return (
                <div key={quiz.id} className={`p-3 rounded-lg border-2 ${quiz.active ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-lg">{quiz.name}</span>
                      {!quiz.active && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">已停用</span>}
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
              <button key={time} onClick={() => setLocalSettings({ ...localSettings, timeChoiceQuestion: time })} className={`px-4 py-2 rounded-lg font-medium transition-all ${localSettings.timeChoiceQuestion === time ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{time} 秒</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">拼寫題作答時間</label>
          <p className="text-xs text-gray-500 mb-2">適用於：看中文寫英文、看英文寫中文</p>
          <div className="flex flex-wrap gap-2">
            {spellingTimeOptions.map(time => (
              <button key={time} onClick={() => setLocalSettings({ ...localSettings, timeSpellingQuestion: time })} className={`px-4 py-2 rounded-lg font-medium transition-all ${localSettings.timeSpellingQuestion === time ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{time} 秒</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">題目數量</label>
          <div className="flex flex-wrap gap-2">
            {countOptions.map(count => (
              <button key={count} onClick={() => setLocalSettings({ ...localSettings, questionCount: count })} className={`px-4 py-2 rounded-lg font-medium transition-all ${localSettings.questionCount === count ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{count === 0 ? '全部' : `${count} 題`}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">啟用題型（至少選一個）</label>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">選擇題</p>
            {[{ type: 0, label: '看中文選英文' }, { type: 1, label: '看英文選中文' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-purple-500" />
                <span>{label}</span>
              </label>
            ))}
            <p className="text-xs text-gray-500 mt-3">拼寫題</p>
            {[{ type: 2, label: '看中文寫英文' }, { type: 3, label: '看英文寫中文' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-purple-500" />
                <span>{label}</span>
              </label>
            ))}
            <p className="text-xs text-gray-500 mt-3">聽力題</p>
            {!('speechSynthesis' in window) && (
              <p className="text-xs text-red-500 mb-1">⚠️ 您的瀏覽器不支援語音功能</p>
            )}
            {[{ type: 4, label: '聽英文選中文' }, { type: 5, label: '聽英文寫英文' }].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSettings.questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="w-5 h-5 rounded text-purple-500" disabled={!('speechSynthesis' in window)} />
                <span className={!('speechSynthesis' in window) ? 'text-gray-400' : ''}>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">老師密碼</label>
          <input type="text" value={localSettings.teacherPassword} onChange={e => setLocalSettings({ ...localSettings, teacherPassword: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none" placeholder="輸入新密碼" />
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
  const [activeTab, setActiveTab] = useState<'progress' | 'history' | 'mastered'>('progress');
  const [resetConfirm, setResetConfirm] = useState(false);

  const getProgressForFile = (fileId: string): { correct: number; wrong: number; weakWordIds: string[]; history: HistoryEntry[] } =>
    student.progress.find(p => p.fileId === fileId) || { correct: 0, wrong: 0, weakWordIds: [] as string[], history: [] as HistoryEntry[] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      {resetConfirm && (
        <ConfirmDialog message={`確定要重置「${student.name}」的所有已精熟單字嗎？\n\n這些單字會重新出現在測驗中。`} onConfirm={async () => { await onResetMastered(); setResetConfirm(false); }} onCancel={() => setResetConfirm(false)} />
      )}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">{student.name} 的學習紀錄</h1>
          <div className="w-8"></div>
        </div>
        <div className="flex mb-4 bg-white/20 rounded-lg p-1">
          <button onClick={() => setActiveTab('progress')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'progress' ? 'bg-white text-purple-600' : 'text-white'}`}>檔案進度</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-white text-purple-600' : 'text-white'}`}>測驗歷史</button>
          <button onClick={() => setActiveTab('mastered')} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'mastered' ? 'bg-white text-purple-600' : 'text-white'}`}>已精熟</button>
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
      </div>
    </div>
  );
};

// ============ 學生角色選擇畫面 ============

interface ProfileScreenProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ profiles, onSelect, onCreate, onDelete, onBack }) => {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
      {deleteTarget && (
        <ConfirmDialog message={`確定要刪除角色「${deleteTarget.name}」嗎？所有學習紀錄都會消失！`} onConfirm={async () => { await onDelete(deleteTarget.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />
      )}
      <Card className="w-full max-w-md">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mb-4">← 返回</button>
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-600">英文單字練習</h1>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">選擇或建立角色</h2>
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <button onClick={() => onSelect(p)} className="flex-1 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg hover:from-blue-200 hover:to-purple-200 text-left font-medium">👤 {p.name}</button>
              <button onClick={() => setDeleteTarget(p)} className="p-2 text-red-500 hover:bg-red-100 rounded">✕</button>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-gray-500 text-center py-4">還沒有角色，建立一個吧！</p>}
        </div>
        {showCreate ? (
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="輸入名字" className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none" autoFocus onKeyDown={async e => { if (e.key === 'Enter' && newName.trim()) { await onCreate(newName.trim()); setNewName(''); setShowCreate(false); } }} />
            <Button onClick={async () => { if (newName.trim()) { await onCreate(newName.trim()); setNewName(''); setShowCreate(false); } }}>確定</Button>
          </div>
        ) : (
          <Button onClick={() => setShowCreate(true)} className="w-full" variant="success">+ 建立新角色</Button>
        )}
      </Card>
    </div>
  );
};

// ============ 學生儀表板 ============

interface DashboardProps {
  profile: Profile;
  files: WordFile[];
  settings: Settings;
  customQuizzes: CustomQuiz[];
  onStartQuiz: (file: WordFile) => void;
  onStartReview: (file: WordFile, weakWords: Word[]) => void;
  onStartCustomQuiz: (quiz: CustomQuiz, words: Word[]) => void;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, files, settings, customQuizzes, onStartQuiz, onStartReview, onStartCustomQuiz, onBack }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'custom' | 'srs' | 'history'>('files');

  // 取得啟用的自訂測驗
  const activeQuizzes = customQuizzes.filter(q => q.active);
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
  const dueWordObjects = useMemo(() => {
    const wordIds = dueWords.map(m => m.wordId);
    return files.flatMap(f => f.words.filter(w => wordIds.includes(w.id)));
  }, [dueWords, files]);

  // SRS：開始複習
  const startSrsReview = () => {
    if (dueWordObjects.length === 0) return;
    const file = files.find(f => f.words.some(w => dueWords.map(d => d.wordId).includes(w.id)));
    if (file) {
      onStartReview(file, dueWordObjects);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">👤 {profile.name} 的學習中心</h1>
          <div className="w-8"></div>
        </div>

        {/* 分頁切換 */}
        <div className="flex mb-4 bg-white/20 rounded-lg p-1 flex-wrap gap-1">
          <button onClick={() => setActiveTab('files')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'files' ? 'bg-white text-purple-600' : 'text-white'}`}>單字檔案</button>
          {activeQuizzes.length > 0 && (
            <button onClick={() => setActiveTab('custom')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'custom' ? 'bg-white text-purple-600' : 'text-white'}`}>
              自訂測驗
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">{activeQuizzes.length}</span>
            </button>
          )}
          <button onClick={() => setActiveTab('srs')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'srs' ? 'bg-white text-purple-600' : 'text-white'}`}>
            待複習
            {dueWords.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{dueWords.length}</span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'history' ? 'bg-white text-purple-600' : 'text-white'}`}>測驗歷史</button>
        </div>

        {activeTab === 'files' && (
          <>
            <Card className="mb-4">
              <h2 className="font-bold text-lg mb-3 text-gray-700">我的單字檔案</h2>
              <div className="bg-purple-50 p-2 rounded-lg mb-3 text-sm text-purple-700">目前設定：選擇題 {settings.timeChoiceQuestion || 10} 秒 · 拼寫題 {settings.timeSpellingQuestion || 30} 秒 · {settings.questionCount === 0 ? '全部題目' : `${settings.questionCount} 題`}</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map(f => {
                  const progress = getProgressForFile(f.id);
                  const total = progress.correct + progress.wrong;
                  const rate = total > 0 ? Math.round((progress.correct / total) * 100) : 0;
                  const weakWords = f.words.filter(w => progress.weakWordIds.includes(w.id) && !masteredWordIds.includes(w.id));
                  const masteredCount = f.words.filter(w => masteredWordIds.includes(w.id)).length;
                  return (
                    <div key={f.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div><span className="font-medium">{f.name}</span><span className="text-sm text-gray-500 ml-2">({f.words.length} 個單字)</span>{masteredCount > 0 && <span className="text-sm text-green-600 ml-2">({masteredCount} 已精熟)</span>}</div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${rate}%` }}></div></div>
                        <span className="text-sm font-medium">{rate}%</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => onStartQuiz(f)} variant="primary" className="flex-1 text-sm py-1">開始測驗</Button>
                        {weakWords.length > 0 && <Button onClick={() => onStartReview(f, weakWords)} variant="warning" className="flex-1 text-sm py-1">複習 ({weakWords.length})</Button>}
                      </div>
                    </div>
                  );
                })}
                {files.length === 0 && <p className="text-gray-500 text-center py-4">老師尚未上傳單字檔案</p>}
              </div>
            </Card>
            {files.length > 0 && <ProgressChart profile={profile} files={files} />}
          </>
        )}

        {activeTab === 'custom' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">老師自訂測驗</h2>
            {activeQuizzes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">目前沒有可用的自訂測驗</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {activeQuizzes.map(quiz => {
                  const file = files.find(f => f.id === quiz.fileId);
                  const quizWords = file ? quiz.wordIds.map(id => file.words.find(w => w.id === id)).filter((w): w is Word => w !== undefined) : [];
                  const typeLabels = quiz.questionTypes.map(t => {
                    const labels = ['看中文選英文', '看英文選中文', '看中文寫英文', '看英文寫中文', '聽英文選中文', '聽英文寫英文'];
                    return labels[t] || '';
                  }).join('、');
                  const canStart = quizWords.length > 0;

                  return (
                    <div key={quiz.id} className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-lg text-orange-700">{quiz.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({quizWords.length} 個單字)</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <p>來源：{file?.name || '(檔案已刪除)'}</p>
                        <p>題型：{typeLabels}</p>
                      </div>
                      {canStart ? (
                        <Button onClick={() => onStartCustomQuiz(quiz, quizWords)} variant="warning" className="w-full">
                          開始測驗
                        </Button>
                      ) : (
                        <p className="text-red-500 text-sm text-center">無法開始（來源檔案已刪除或單字不存在）</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'srs' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">間隔重複複習</h2>
            {dueWords.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  你有 <span className="font-bold text-red-600">{dueWords.length}</span> 個已精熟單字需要複習，以鞏固長期記憶。
                </p>
                <Button onClick={startSrsReview} variant="warning" className="w-full mb-4">
                  開始複習 ({dueWords.length} 個單字)
                </Button>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dueWordObjects.slice(0, 20).map(word => {
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
                  {dueWords.length > 20 && (
                    <p className="text-gray-500 text-sm text-center">...還有 {dueWords.length - 20} 個</p>
                  )}
                </div>
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
                        <span className="font-medium">{file?.name || '已刪除的檔案'}</span>
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
  customQuestionTypes?: number[];  // 自訂測驗的題型（覆蓋全域設定）
  customQuizName?: string;         // 自訂測驗名稱
  onSaveProgress: (results: QuizResult[], completed: boolean, duration: number) => Promise<void>;
  onExit: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ file, words, isReview, settings, customQuestionTypes, customQuizName, onSaveProgress, onExit }) => {
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
    { type: 'listen_en', label: '聽英文寫英文' }
  ];

  // 語音合成函數
  const speak = useCallback((text: string): boolean => {
    if (!('speechSynthesis' in window)) {
      alert('您的瀏覽器不支援語音功能，請使用 Chrome、Edge 或 Safari');
      return false;
    }
    speechSynthesis.cancel(); // 停止任何正在播放的語音
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // 稍微放慢速度，便於學習
    speechSynthesis.speak(utterance);
    return true;
  }, []);

  // 根據題型取得對應時間
  const getTimeForType = (type: number): number => {
    if (type < 2 || type === 4) return settings.timeChoiceQuestion || 10;  // 選擇題（含聽力選擇）
    return settings.timeSpellingQuestion || 30;               // 拼寫題（含聽力拼寫）
  };

  const generateQuestion = useCallback(() => {
    if (!currentWord) return;
    const enabledTypes = customQuestionTypes || settings.questionTypes;
    const type = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
    setQuestionType(type);
    setSelected(null);
    setInputValue('');
    setShowResult(false);
    setTimeLeft(getTimeForType(type));
    setQuestionStartTime(Date.now());

    // 選擇題（type 0, 1）和聽力選中文（type 4）需要生成選項
    if (type < 2 || type === 4) {
      const otherWords = file.words.filter(w => w.id !== currentWord.id);
      const shuffledOthers = shuffleArray(otherWords);
      const wrongOptions = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));
      while (wrongOptions.length < 3) wrongOptions.push({ id: `fake-${wrongOptions.length}`, english: `word${wrongOptions.length + 1}`, chinese: `選項${wrongOptions.length + 1}` });
      setOptions(shuffleArray([currentWord, ...wrongOptions]));
    }

    // 聽力題目自動播放發音
    if (type === 4 || type === 5) {
      setTimeout(() => speak(currentWord.english), 300);
    }
  }, [currentWord, file.words, customQuestionTypes, settings.questionTypes, settings.timeChoiceQuestion, settings.timeSpellingQuestion, speak]);

  useEffect(() => { if (currentWord && !isFinished) generateQuestion(); }, [currentIndex, isFinished]);

  useEffect(() => {
    if (showResult || isFinished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
          setResults(prev => [...prev, { word: currentWord, correct: false, questionType, timeSpent }]);
          setShowResult(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, showResult, isFinished, currentWord, questionStartTime, questionType]);

  useEffect(() => { if ((questionType === 2 || questionType === 3 || questionType === 5) && !showResult && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100); }, [questionType, showResult, currentIndex]);

  const processAnswer = (isCorrect: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect, questionType, timeSpent }]);
    setShowResult(true);
  };

  const handleSelect = (option: Word) => {
    if (showResult) return;
    setSelected(option);
    // 題型 1 (看英文選中文) 和 題型 4 (聽英文選中文) 比對中文
    const isCorrect = (questionType === 1 || questionType === 4) ? option.chinese === currentWord.chinese : option.english === currentWord.english;
    processAnswer(isCorrect);
  };

  const handleSpellSubmit = () => {
    if (showResult) return;
    const userAnswer = inputValue.trim().toLowerCase();
    if (questionType === 2 || questionType === 5) {
      // 看中文寫英文 / 聽英文寫英文 - 精確匹配
      processAnswer(userAnswer === currentWord.english.toLowerCase());
    } else if (questionType === 3) {
      // 看英文寫中文 - 支援「/」分隔的多個正確答案
      const correctAnswer = currentWord.chinese.toLowerCase();
      const possibleAnswers = correctAnswer.split(/[\/、,，]/).map(a => a.trim());
      processAnswer(possibleAnswers.some(ans => userAnswer === ans));
    }
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
      const duration = Math.round((Date.now() - quizStartTime) / 1000);
      await onSaveProgress(results, true, duration);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleExit = async () => {
    const duration = Math.round((Date.now() - quizStartTime) / 1000);
    await onSaveProgress(results, false, duration);
    onExit();
  };

  const isCurrentCorrect = results.length > 0 && results[results.length - 1]?.correct;

  if (isFinished) {
    const correct = results.filter(r => r.correct).length;
    const rate = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
    const wrongWords = results.filter(r => !r.correct).map(r => r.word);
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          {customQuizName && <p className="text-sm text-gray-500 mb-1">{customQuizName}</p>}
          <h1 className="text-3xl mb-4">測驗完成！</h1>
          <div className="text-6xl font-bold text-purple-600 mb-2">{rate}%</div>
          <p className="text-gray-600 mb-4">答對 {correct} / {results.length} 題</p>
          {wrongWords.length > 0 && (
            <div className="mb-4 text-left bg-red-50 p-3 rounded-lg">
              <p className="font-medium text-red-700 mb-2">需要加強的單字：</p>
              <div className="flex flex-wrap gap-1">{wrongWords.map((w, i) => <span key={i} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">{w.english} ({w.chinese}{w.partOfSpeech ? `, ${w.partOfSpeech}` : ''})</span>)}</div>
            </div>
          )}
          <Button onClick={onExit} className="w-full">返回</Button>
        </Card>
      </div>
    );
  }

  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p>載入中...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4">
      {showExitConfirm && <ConfirmDialog message={results.length > 0 ? '確定要離開嗎？\n\n目前進度會自動儲存。' : '確定要離開測驗嗎？'} confirmText="離開" cancelText="繼續測驗" confirmVariant="primary" onConfirm={handleExit} onCancel={() => setShowExitConfirm(false)} />}
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4 text-white">
          <button onClick={() => setShowExitConfirm(true)} className="text-2xl">✕</button>
          <span className="font-bold">{customQuizName || (isReview ? '複習模式' : '測驗模式')}</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className="mb-4">
          <div className="bg-white/30 rounded-full h-2"><div className={`h-2 rounded-full transition-all ${timeLeft <= 3 ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${(timeLeft / getTimeForType(questionType)) * 100}%` }}></div></div>
          <div className="text-center text-white mt-1">{timeLeft} 秒</div>
        </div>
        <Card className="mb-4">
          <div className="text-sm text-gray-500 mb-2">{questionTypes[questionType]?.label || '未知題型'}</div>
          {questionType === 0 && <div className="text-center py-4"><div className="text-3xl font-bold text-gray-800">{currentWord.chinese}</div>{currentWord.partOfSpeech && <div className="text-sm text-purple-500 mt-1">({currentWord.partOfSpeech})</div>}</div>}
          {questionType === 1 && <div className="text-center text-3xl font-bold text-gray-800 py-4">{currentWord.english}</div>}
          {questionType === 2 && (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-800">{currentWord.chinese}</div>
              {currentWord.partOfSpeech && <div className="text-sm text-purple-500 mb-4">({currentWord.partOfSpeech})</div>}
              {!currentWord.partOfSpeech && <div className="mb-4"></div>}
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="輸入英文單字..." className="w-full px-4 py-3 text-xl text-center border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
          {questionType === 3 && (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-800">{currentWord.english}</div>
              {currentWord.partOfSpeech && <div className="text-sm text-purple-500 mb-4">({currentWord.partOfSpeech})</div>}
              {!currentWord.partOfSpeech && <div className="mb-4"></div>}
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="輸入中文意思..." className="w-full px-4 py-3 text-xl text-center border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
          {questionType === 4 && (
            <div className="text-center py-4">
              <button
                onClick={() => speak(currentWord.english)}
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
                onClick={() => speak(currentWord.english)}
                className="w-20 h-20 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-4xl shadow-lg transition-all active:scale-95 mb-4"
                title="播放發音"
              >
                🔊
              </button>
              <p className="text-sm text-gray-500 mb-4">點擊播放發音（可無限次播放）</p>
              <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()} disabled={showResult} placeholder="輸入聽到的英文單字..." className="w-full px-4 py-3 text-xl text-center border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none" />
              {!showResult && <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">確定</Button>}
            </div>
          )}
        </Card>
        {(questionType < 2 || questionType === 4) && (
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt, i) => {
              // 題型 1 (看英文選中文) 和 題型 4 (聽英文選中文) 比對中文，其他比對英文
              const isThis = (questionType === 1 || questionType === 4) ? opt.chinese === currentWord.chinese : opt.english === currentWord.english;
              const isSelected = selected?.id === opt.id;
              let bgClass = 'bg-white hover:bg-gray-50';
              if (showResult) { if (isThis) bgClass = 'bg-green-500 text-white'; else if (isSelected) bgClass = 'bg-red-500 text-white'; }
              // 題型 1 和 題型 4 顯示中文選項，其他顯示英文選項
              return <button key={i} onClick={() => handleSelect(opt)} disabled={showResult} className={`p-4 rounded-xl font-medium text-lg shadow transition-all ${bgClass}`}>{(questionType === 1 || questionType === 4) ? opt.chinese : opt.english}</button>;
            })}
          </div>
        )}
        {showResult && (
          <Card className={`mt-4 ${isCurrentCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-center">
              <div className="text-4xl mb-2">{isCurrentCorrect ? '✓' : '✗'}</div>
              {!isCurrentCorrect && timeLeft === 0 && <p className="text-red-500 text-sm mb-2">時間到！</p>}
              <div className="font-bold text-lg">{currentWord.english}</div>
              <div className="text-gray-600">{currentWord.chinese}{currentWord.partOfSpeech && <span className="text-purple-500 ml-1">({currentWord.partOfSpeech})</span>}</div>
              <Button onClick={nextQuestion} className="mt-3" variant={isCurrentCorrect ? 'success' : 'primary'}>{currentIndex + 1 >= totalQuestions ? '查看結果' : '下一題'}</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============ 主應用程式 ============

type AppScreen = 'role-select' | 'teacher-login' | 'teacher-dashboard' | 'student-profiles' | 'student-dashboard' | 'quiz';

export default function App() {
  const [files, setFiles] = useState<WordFile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('role-select');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

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

  const handleCreateProfile = async (name: string) => {
    await api.createProfile(name);
    await loadData();
  };

  const handleDeleteProfile = async (id: string) => {
    await api.deleteProfile(id);
    await loadData();
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

  // 自訂測驗處理函數
  const handleCreateCustomQuiz = async (data: { name: string; fileId: string; wordIds: string[]; questionTypes: number[] }) => {
    await api.createCustomQuiz(data);
    await loadData();
  };

  const handleUpdateCustomQuiz = async (id: string, data: Partial<{ name: string; wordIds: string[]; questionTypes: number[]; active: boolean }>) => {
    await api.updateCustomQuiz(id, data);
    await loadData();
  };

  const handleDeleteCustomQuiz = async (id: string) => {
    await api.deleteCustomQuiz(id);
    await loadData();
  };

  const startQuiz = (file: WordFile, reviewWords: Word[] | null = null) => {
    if (!currentProfile) return;
    const isReview = reviewWords !== null;
    const masteredIds = currentProfile.masteredWords.map(m => m.wordId);
    const wordsToQuiz = isReview ? reviewWords : file.words.filter(w => !masteredIds.includes(w.id));
    if (wordsToQuiz.length === 0) { alert('沒有可測驗的單字（全部已精熟或已完成複習）'); return; }
    setQuizState({ file, words: wordsToQuiz, isReview });
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
      customQuizName: quiz.name
    });
    setCurrentScreen('quiz');
  };

  const saveProgress = async (results: QuizResult[], completed: boolean, duration: number) => {
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
      correctWordIds
    });

    if (quizState.isReview) {
      // SRS 複習模式：根據答對/答錯更新等級
      for (const result of results) {
        const isMastered = currentProfile.masteredWords.some(m => m.wordId === result.word.id);
        if (isMastered) {
          // 已精熟單字：更新 SRS 等級
          await api.updateReview(currentProfile.id, result.word.id, result.correct);
        } else if (result.correct) {
          // 未精熟單字答對：加入精熟（Level 1）
          await api.addMasteredWords(currentProfile.id, [result.word.id]);
        }
      }
    }

    await loadData();
  };

  const exitQuiz = () => { setQuizState(null); setCurrentScreen('student-dashboard'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-400"><div className="text-white text-xl">載入中...</div></div>;

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

  if (currentScreen === 'quiz' && quizState) {
    return <QuizScreen file={quizState.file} words={quizState.words} isReview={quizState.isReview} settings={settings} customQuestionTypes={quizState.customQuestionTypes} customQuizName={quizState.customQuizName} onSaveProgress={saveProgress} onExit={exitQuiz} />;
  }

  if (currentScreen === 'role-select') {
    return <RoleSelectScreen onSelectStudent={() => setCurrentScreen('student-profiles')} onSelectTeacher={() => setCurrentScreen('teacher-login')} />;
  }

  if (currentScreen === 'teacher-login') {
    return <TeacherLogin correctPassword={settings.teacherPassword} onSuccess={() => setCurrentScreen('teacher-dashboard')} onBack={() => setCurrentScreen('role-select')} />;
  }

  if (currentScreen === 'teacher-dashboard') {
    return <TeacherDashboard files={files} profiles={profiles} settings={settings} customQuizzes={customQuizzes} onUploadFile={handleUploadFile} onDeleteFile={handleDeleteFile} onAddWords={handleAddWords} onUpdateSettings={handleUpdateSettings} onToggleMastered={handleToggleMastered} onResetMastered={handleResetMastered} onCreateCustomQuiz={handleCreateCustomQuiz} onUpdateCustomQuiz={handleUpdateCustomQuiz} onDeleteCustomQuiz={handleDeleteCustomQuiz} onRefresh={loadData} onBack={() => setCurrentScreen('role-select')} />;
  }

  if (currentScreen === 'student-profiles') {
    return <ProfileScreen profiles={profiles} onSelect={(profile) => { setCurrentProfile(profile); setCurrentScreen('student-dashboard'); }} onCreate={handleCreateProfile} onDelete={handleDeleteProfile} onBack={() => setCurrentScreen('role-select')} />;
  }

  if (currentScreen === 'student-dashboard' && currentProfile) {
    return <Dashboard profile={currentProfile} files={files} settings={settings} customQuizzes={customQuizzes} onStartQuiz={(f) => startQuiz(f)} onStartReview={(f, weakWords) => startQuiz(f, weakWords)} onStartCustomQuiz={startCustomQuiz} onBack={() => { setCurrentProfile(null); setCurrentScreen('student-profiles'); }} />;
  }

  return <RoleSelectScreen onSelectStudent={() => setCurrentScreen('student-profiles')} onSelectTeacher={() => setCurrentScreen('teacher-login')} />;
}
