import React, { useState, useEffect, useRef, useCallback } from 'react';

const APP_STORAGE_KEY = 'vocab-quiz-app-data-v4';

// 類型定義
interface Word {
  id: string;
  english: string;
  chinese: string;
}

interface WordFile {
  id: string;
  name: string;
  words: Word[];
}

interface HistoryEntry {
  rate: number;
  timestamp: number;
}

interface FileProgress {
  correct: number;
  wrong: number;
  history: HistoryEntry[];
  weakWordIds: string[];
}

// 新增測驗設定
interface QuizSettings {
  timePerQuestion: number;    // 每題秒數 (5-60)
  questionCount: number;      // 題目數量 (0 = 全部)
  questionTypes: number[];    // 啟用的題型 [0,1,2]
}

// 新增測驗歷史詳細紀錄
interface QuizSession {
  id: string;
  fileId: string;
  timestamp: number;
  duration: number;           // 實際花費秒數
  results: QuizResultDetail[];
  completed: boolean;         // 是否完成（支援中斷）
}

interface QuizResultDetail {
  wordId: string;
  correct: boolean;
  questionType: number;
  timeSpent: number;
}

// 擴展 Profile
interface Profile {
  id: string;
  name: string;
  progress: Record<string, FileProgress>;
  quizSessions: QuizSession[];  // 新增：詳細測驗歷史
}

// 擴展 AppData
interface AppData {
  profiles: Profile[];
  files: WordFile[];
  teacherPassword: string;      // 老師密碼
  quizSettings: QuizSettings;   // 全域測驗設定
  masteredWords: Record<string, string[]>;  // profileId -> 已精熟單字ID
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
}

// 預設資料
const defaultQuizSettings: QuizSettings = {
  timePerQuestion: 10,
  questionCount: 0,
  questionTypes: [0, 1, 2]
};

const defaultAppData: AppData = {
  profiles: [],
  files: [],
  teacherPassword: '1234',
  quizSettings: defaultQuizSettings,
  masteredWords: {}
};

// 儲存與載入
const saveToStorage = (data: AppData) => {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
};

const loadFromStorage = (): AppData => {
  try {
    // 嘗試載入 v4
    const result = localStorage.getItem(APP_STORAGE_KEY);
    if (result) {
      const parsed = JSON.parse(result);
      // 確保所有新欄位存在
      return {
        ...defaultAppData,
        ...parsed,
        quizSettings: { ...defaultQuizSettings, ...parsed.quizSettings },
        masteredWords: parsed.masteredWords || {},
        profiles: (parsed.profiles || []).map((p: Profile) => ({
          ...p,
          quizSessions: p.quizSessions || []
        }))
      };
    }

    // 嘗試從 v3 遷移
    const v3Data = localStorage.getItem('vocab-quiz-app-data-v3');
    if (v3Data) {
      const parsed = JSON.parse(v3Data);
      const migrated: AppData = {
        ...defaultAppData,
        profiles: (parsed.profiles || []).map((p: Profile) => ({
          ...p,
          quizSessions: []
        })),
        files: parsed.files || []
      };
      saveToStorage(migrated);
      return migrated;
    }

    return defaultAppData;
  } catch (e) {
    console.error('Storage load error:', e);
    return defaultAppData;
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

const parseCSV = (text: string): Word[] => {
  const lines = text.trim().split('\n');
  const words: Word[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 2) {
      const english = parts[0].trim();
      const chinese = parts.slice(1).join(',').trim();
      if (english && chinese && !/^english$/i.test(english)) {
        words.push({ english, chinese, id: `${english}-${i}` });
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

// 格式化時間
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
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
  message,
  onConfirm,
  onCancel,
  confirmText = '確定',
  cancelText = '取消',
  confirmVariant = 'danger'
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
      <p className="text-lg text-gray-800 mb-6 whitespace-pre-line">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${
            confirmVariant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {confirmText}
        </button>
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
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClass} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>{children}</div>
);

// ============ 角色選擇畫面 ============

interface RoleSelectScreenProps {
  onSelectStudent: () => void;
  onSelectTeacher: () => void;
}

const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onSelectStudent, onSelectTeacher }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-600">英文單字練習</h1>
        <p className="text-gray-600 text-center mb-8">請選擇您的身分</p>

        <div className="space-y-4">
          <button
            onClick={onSelectStudent}
            className="w-full p-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl text-white font-bold text-xl hover:from-green-500 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            <div className="text-4xl mb-2">👨‍🎓</div>
            我是學生
          </button>

          <button
            onClick={onSelectTeacher}
            className="w-full p-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl text-white font-bold text-xl hover:from-purple-500 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
          >
            <div className="text-4xl mb-2">👨‍🏫</div>
            我是老師
          </button>
        </div>
      </Card>
    </div>
  );
};

// ============ 老師登入畫面 ============

interface TeacherLoginProps {
  correctPassword: string;
  onSuccess: () => void;
  onBack: () => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ correctPassword, onSuccess, onBack }) => {
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
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="密碼"
              className={`w-full px-4 py-2 border-2 rounded-lg outline-none ${error ? 'border-red-500' : 'border-purple-300 focus:border-purple-500'}`}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-1">密碼錯誤，請重試</p>}
          </div>

          <Button onClick={handleSubmit} className="w-full">登入</Button>

          <p className="text-xs text-gray-500 text-center">預設密碼：1234</p>
        </div>
      </Card>
    </div>
  );
};

// ============ 老師後台 ============

interface TeacherDashboardProps {
  appData: AppData;
  onUploadFile: (name: string, words: Word[]) => void;
  onDeleteFile: (fileId: string) => void;
  onUpdateSettings: (settings: QuizSettings) => void;
  onUpdatePassword: (password: string) => void;
  onToggleMastered: (profileId: string, wordId: string, fileId: string) => void;
  onResetMastered: (profileId: string) => void;
  onBack: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  appData,
  onUploadFile,
  onDeleteFile,
  onUpdateSettings,
  onUpdatePassword,
  onToggleMastered,
  onResetMastered,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'students' | 'settings'>('files');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [previewFile, setPreviewFile] = useState<WordFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WordFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    let bestWords: Word[] = [];

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

      if (bestWords.length === 0) {
        bestWords = words;
      }
    }

    setUploading(false);

    if (bestWords.length > 0) {
      onUploadFile(file.name.replace(/\.csv$/i, ''), bestWords);
    } else {
      alert('無法解析檔案，請確認格式為：英文,中文\n\n建議：在 Excel 存檔時選擇「CSV UTF-8」格式');
    }
    e.target.value = '';
  };

  // 學生詳細資訊頁面
  if (selectedStudent) {
    return (
      <StudentProgress
        student={selectedStudent}
        files={appData.files}
        masteredWords={appData.masteredWords[selectedStudent.id] || []}
        onToggleMastered={(wordId, fileId) => onToggleMastered(selectedStudent.id, wordId, fileId)}
        onResetMastered={() => onResetMastered(selectedStudent.id)}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  // 預覽單字檔案
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
                  <span className="flex-1 text-gray-600">{word.chinese}</span>
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
          onConfirm={() => { onDeleteFile(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">老師後台</h1>
          <div className="w-8"></div>
        </div>

        {/* 標籤頁 */}
        <div className="flex mb-4 bg-white/20 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'files' ? 'bg-white text-purple-600' : 'text-white'}`}
          >
            單字檔案
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'students' ? 'bg-white text-purple-600' : 'text-white'}`}
          >
            學生進度
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-purple-600' : 'text-white'}`}
          >
            測驗設定
          </button>
        </div>

        {/* 單字檔案管理 */}
        {activeTab === 'files' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">單字檔案管理</h2>
            <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full mb-3" variant="primary" disabled={uploading}>
              {uploading ? '上傳中...' : '上傳 CSV 檔案'}
            </Button>
            <p className="text-xs text-gray-500 mb-3 text-center">支援 UTF-8、Big5 編碼，格式：英文,中文</p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {appData.files.map(f => (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-medium">{f.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({f.words.length} 個單字)</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewFile(f)} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 hover:bg-blue-50 rounded">
                      預覽
                    </button>
                    <button onClick={() => setDeleteTarget(f)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded">
                      刪除
                    </button>
                  </div>
                </div>
              ))}
              {appData.files.length === 0 && <p className="text-gray-500 text-center py-4">尚未上傳任何檔案</p>}
            </div>
          </Card>
        )}

        {/* 學生進度 */}
        {activeTab === 'students' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">學生學習狀況</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appData.profiles.map(student => {
                const totalCorrect = Object.values(student.progress || {}).reduce((sum, p) => sum + p.correct, 0);
                const totalWrong = Object.values(student.progress || {}).reduce((sum, p) => sum + p.wrong, 0);
                const totalQuestions = totalCorrect + totalWrong;
                const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                const sessionCount = student.quizSessions?.length || 0;
                const lastSession = student.quizSessions?.[student.quizSessions.length - 1];
                const weakWordCount = Object.values(student.progress || {}).reduce((sum, p) => sum + (p.weakWordIds?.length || 0), 0);

                return (
                  <div key={student.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-lg">{student.name}</span>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="text-blue-500 hover:text-blue-700 text-sm px-3 py-1 hover:bg-blue-50 rounded"
                      >
                        詳細 →
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">整體正確率</span>
                        <div className="font-bold text-lg text-green-600">{overallRate}%</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">測驗次數</span>
                        <div className="font-bold text-lg text-blue-600">{sessionCount}</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">待加強</span>
                        <div className="font-bold text-lg text-red-600">{weakWordCount}</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">最近測驗</span>
                        <div className="font-bold text-sm text-purple-600">
                          {lastSession ? formatDate(lastSession.timestamp) : '無'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {appData.profiles.length === 0 && <p className="text-gray-500 text-center py-4">尚未建立任何學生角色</p>}
            </div>
          </Card>
        )}

        {/* 測驗設定 */}
        {activeTab === 'settings' && (
          <QuizSettingsPanel
            settings={appData.quizSettings}
            password={appData.teacherPassword}
            onUpdateSettings={onUpdateSettings}
            onUpdatePassword={onUpdatePassword}
          />
        )}
      </div>
    </div>
  );
};

// ============ 測驗設定面板 ============

interface QuizSettingsPanelProps {
  settings: QuizSettings;
  password: string;
  onUpdateSettings: (settings: QuizSettings) => void;
  onUpdatePassword: (password: string) => void;
}

const QuizSettingsPanel: React.FC<QuizSettingsPanelProps> = ({
  settings,
  password,
  onUpdateSettings,
  onUpdatePassword
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localPassword, setLocalPassword] = useState(password);
  const [saved, setSaved] = useState(false);

  const timeOptions = [5, 10, 15, 20, 30, 60];
  const countOptions = [0, 10, 20, 30, 50];

  const handleSave = () => {
    onUpdateSettings(localSettings);
    if (localPassword.trim()) {
      onUpdatePassword(localPassword);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleQuestionType = (type: number) => {
    const types = localSettings.questionTypes;
    if (types.includes(type)) {
      if (types.length > 1) {
        setLocalSettings({ ...localSettings, questionTypes: types.filter(t => t !== type) });
      }
    } else {
      setLocalSettings({ ...localSettings, questionTypes: [...types, type].sort() });
    }
  };

  return (
    <Card>
      <h2 className="font-bold text-lg mb-4 text-gray-700">測驗設定</h2>

      <div className="space-y-6">
        {/* 每題時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">每題作答時間</label>
          <div className="flex flex-wrap gap-2">
            {timeOptions.map(time => (
              <button
                key={time}
                onClick={() => setLocalSettings({ ...localSettings, timePerQuestion: time })}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  localSettings.timePerQuestion === time
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {time} 秒
              </button>
            ))}
          </div>
        </div>

        {/* 題目數量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">題目數量</label>
          <div className="flex flex-wrap gap-2">
            {countOptions.map(count => (
              <button
                key={count}
                onClick={() => setLocalSettings({ ...localSettings, questionCount: count })}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  localSettings.questionCount === count
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {count === 0 ? '全部' : `${count} 題`}
              </button>
            ))}
          </div>
        </div>

        {/* 題型選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">啟用題型（至少選一個）</label>
          <div className="space-y-2">
            {[
              { type: 0, label: '看中文選英文' },
              { type: 1, label: '看英文選中文' },
              { type: 2, label: '拼寫題' }
            ].map(({ type, label }) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.questionTypes.includes(type)}
                  onChange={() => toggleQuestionType(type)}
                  className="w-5 h-5 rounded text-purple-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 密碼設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">老師密碼</label>
          <input
            type="text"
            value={localPassword}
            onChange={e => setLocalPassword(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
            placeholder="輸入新密碼"
          />
        </div>

        <Button onClick={handleSave} className="w-full" variant={saved ? 'success' : 'primary'}>
          {saved ? '已儲存' : '儲存設定'}
        </Button>
      </div>
    </Card>
  );
};

// ============ 學生進度詳情 ============

interface StudentProgressProps {
  student: Profile;
  files: WordFile[];
  masteredWords: string[];
  onToggleMastered: (wordId: string, fileId: string) => void;
  onResetMastered: () => void;
  onBack: () => void;
}

const StudentProgress: React.FC<StudentProgressProps> = ({
  student,
  files,
  masteredWords,
  onToggleMastered,
  onResetMastered,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'history' | 'mastered'>('progress');
  const [resetConfirm, setResetConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      {resetConfirm && (
        <ConfirmDialog
          message={`確定要重置「${student.name}」的所有已精熟單字嗎？\n\n這些單字會重新出現在測驗中。`}
          onConfirm={() => { onResetMastered(); setResetConfirm(false); }}
          onCancel={() => setResetConfirm(false)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">{student.name} 的學習紀錄</h1>
          <div className="w-8"></div>
        </div>

        {/* 標籤頁 */}
        <div className="flex mb-4 bg-white/20 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('progress')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'progress' ? 'bg-white text-purple-600' : 'text-white'}`}
          >
            檔案進度
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-white text-purple-600' : 'text-white'}`}
          >
            測驗歷史
          </button>
          <button
            onClick={() => setActiveTab('mastered')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'mastered' ? 'bg-white text-purple-600' : 'text-white'}`}
          >
            已精熟
          </button>
        </div>

        {/* 檔案進度 */}
        {activeTab === 'progress' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">各檔案正確率</h2>
            <div className="space-y-3">
              {files.map(file => {
                const progress = student.progress?.[file.id] || { correct: 0, wrong: 0, history: [], weakWordIds: [] };
                const total = progress.correct + progress.wrong;
                const rate = total > 0 ? Math.round((progress.correct / total) * 100) : 0;
                const weakCount = progress.weakWordIds?.length || 0;

                return (
                  <div key={file.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-gray-500">{file.words.length} 單字</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${rate}%` }}></div>
                      </div>
                      <span className="font-bold text-lg w-12 text-right">{rate}%</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      答對 {progress.correct} / 答錯 {progress.wrong} · 待加強 {weakCount} 個
                    </div>
                  </div>
                );
              })}
              {files.length === 0 && <p className="text-gray-500 text-center py-4">尚無檔案</p>}
            </div>
          </Card>
        )}

        {/* 測驗歷史 */}
        {activeTab === 'history' && (
          <Card>
            <h2 className="font-bold text-lg mb-3 text-gray-700">測驗歷史</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(student.quizSessions || []).slice().reverse().map(session => {
                const file = files.find(f => f.id === session.fileId);
                const correctCount = session.results.filter(r => r.correct).length;
                const rate = session.results.length > 0 ? Math.round((correctCount / session.results.length) * 100) : 0;

                return (
                  <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{file?.name || '已刪除的檔案'}</span>
                      <span className={`px-2 py-0.5 rounded text-sm ${session.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {session.completed ? '完成' : '中斷'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(session.timestamp)} · {correctCount}/{session.results.length} 正確 ({rate}%) · {formatDuration(session.duration)}
                    </div>
                  </div>
                );
              })}
              {(!student.quizSessions || student.quizSessions.length === 0) && (
                <p className="text-gray-500 text-center py-4">尚無測驗紀錄</p>
              )}
            </div>
          </Card>
        )}

        {/* 已精熟單字 */}
        {activeTab === 'mastered' && (
          <Card>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg text-gray-700">已精熟單字 ({masteredWords.length})</h2>
              {masteredWords.length > 0 && (
                <button
                  onClick={() => setResetConfirm(true)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  全部重置
                </button>
              )}
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
                        <button
                          key={word.id}
                          onClick={() => onToggleMastered(word.id, file.id)}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                          title={`${word.english} - ${word.chinese}`}
                        >
                          {word.english}
                        </button>
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
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ profiles, onSelect, onCreate, onDelete, onBack }) => {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
      {deleteTarget && (
        <ConfirmDialog
          message={`確定要刪除角色「${deleteTarget.name}」嗎？所有學習紀錄都會消失！`}
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <Card className="w-full max-w-md">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mb-4">← 返回</button>
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-600">英文單字練習</h1>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">選擇或建立角色</h2>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelect(p)}
                className="flex-1 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg hover:from-blue-200 hover:to-purple-200 text-left font-medium"
              >
                👤 {p.name}
              </button>
              <button onClick={() => setDeleteTarget(p)} className="p-2 text-red-500 hover:bg-red-100 rounded">
                ✕
              </button>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-gray-500 text-center py-4">還沒有角色，建立一個吧！</p>}
        </div>

        {showCreate ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="輸入名字"
              className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) {
                  onCreate(newName.trim());
                  setNewName('');
                  setShowCreate(false);
                }
              }}
            />
            <Button onClick={() => { if(newName.trim()) { onCreate(newName.trim()); setNewName(''); setShowCreate(false); } }}>
              確定
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowCreate(true)} className="w-full" variant="success">
            + 建立新角色
          </Button>
        )}
      </Card>
    </div>
  );
};

// ============ 學生儀表板（已移除上傳功能） ============

interface DashboardProps {
  profile: Profile;
  files: WordFile[];
  quizSettings: QuizSettings;
  masteredWords: string[];
  onStartQuiz: (file: WordFile) => void;
  onStartReview: (file: WordFile, weakWords: Word[]) => void;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, files, quizSettings, masteredWords, onStartQuiz, onStartReview, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">👤 {profile.name} 的學習中心</h1>
          <div className="w-8"></div>
        </div>

        <Card className="mb-4">
          <h2 className="font-bold text-lg mb-3 text-gray-700">我的單字檔案</h2>

          {/* 測驗設定提示 */}
          <div className="bg-purple-50 p-2 rounded-lg mb-3 text-sm text-purple-700">
            目前設定：每題 {quizSettings.timePerQuestion} 秒 · {quizSettings.questionCount === 0 ? '全部題目' : `${quizSettings.questionCount} 題`}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(f => {
              const progress = profile.progress?.[f.id] || { correct: 0, wrong: 0, history: [], weakWordIds: [] };
              const total = progress.correct + progress.wrong;
              const rate = total > 0 ? Math.round((progress.correct / total) * 100) : 0;
              const weakWordIds = progress.weakWordIds || [];
              // 排除已精熟的單字
              const weakWords = f.words.filter(w => weakWordIds.includes(w.id) && !masteredWords.includes(w.id));
              const masteredCount = f.words.filter(w => masteredWords.includes(w.id)).length;

              return (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({f.words.length} 個單字)</span>
                      {masteredCount > 0 && (
                        <span className="text-sm text-green-600 ml-2">({masteredCount} 已精熟)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${rate}%` }}></div>
                    </div>
                    <span className="text-sm font-medium">{rate}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onStartQuiz(f)} variant="primary" className="flex-1 text-sm py-1">
                      開始測驗
                    </Button>
                    {weakWords.length > 0 && (
                      <Button onClick={() => onStartReview(f, weakWords)} variant="warning" className="flex-1 text-sm py-1">
                        複習 ({weakWords.length})
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {files.length === 0 && <p className="text-gray-500 text-center py-4">老師尚未上傳單字檔案</p>}
          </div>
        </Card>

        {files.length > 0 && <ProgressChart profile={profile} files={files} masteredWords={masteredWords} />}
      </div>
    </div>
  );
};

// ============ 進度圖表 ============

interface ProgressChartProps {
  profile: Profile;
  files: WordFile[];
  masteredWords: string[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ profile, files, masteredWords }) => {
  const allHistory = files.flatMap(f => (profile.progress?.[f.id]?.history || []).map(h => ({ ...h, fileName: f.name })));
  allHistory.sort((a, b) => a.timestamp - b.timestamp);
  const recent = allHistory.slice(-10);

  const allWeakWords = files.flatMap(f => {
    const weakWordIds = profile.progress?.[f.id]?.weakWordIds || [];
    return f.words.filter(w => weakWordIds.includes(w.id) && !masteredWords.includes(w.id)).map(w => ({ ...w, fileName: f.name }));
  });

  return (
    <Card>
      <h2 className="font-bold text-lg mb-3 text-gray-700">學習統計</h2>

      {recent.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-sm text-gray-600 mb-2">進步曲線（最近10次）</h3>
          <div className="flex items-end gap-1 h-24 bg-gray-50 rounded p-2">
            {recent.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t transition-all" style={{ height: `${h.rate}%` }}></div>
                <span className="text-xs mt-1">{h.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allWeakWords.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-gray-600 mb-2">待加強單字 ({allWeakWords.length})</h3>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {allWeakWords.slice(0, 20).map((w, i) => (
              <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">{w.english}</span>
            ))}
            {allWeakWords.length > 20 && <span className="text-gray-500 text-sm">...還有更多</span>}
          </div>
        </div>
      )}

      {recent.length === 0 && allWeakWords.length === 0 && (
        <p className="text-gray-500 text-center py-4">開始測驗後會顯示統計資料</p>
      )}
    </Card>
  );
};

// ============ 測驗畫面 ============

interface QuizScreenProps {
  file: WordFile;
  words: Word[];
  isReview: boolean;
  quizSettings: QuizSettings;
  onSaveProgress: (results: QuizResult[], completed: boolean, duration: number) => void;
  onExit: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ file, words, isReview, quizSettings, onSaveProgress, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionType, setQuestionType] = useState(0);
  const [options, setOptions] = useState<Word[]>([]);
  const [selected, setSelected] = useState<Word | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(quizSettings.timePerQuestion);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizStartTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 根據設定決定題目數量
  const questionLimit = quizSettings.questionCount > 0
    ? Math.min(quizSettings.questionCount, words.length)
    : words.length;
  const quizWords = useRef(shuffleArray([...words]).slice(0, questionLimit)).current;
  const currentWord = quizWords[currentIndex];
  const totalQuestions = quizWords.length;

  const questionTypes = [
    { type: 'ch2en', label: '看中文選英文' },
    { type: 'en2ch', label: '看英文選中文' },
    { type: 'spell', label: '拼寫題' }
  ];

  const generateQuestion = useCallback(() => {
    if (!currentWord) return;

    // 從啟用的題型中隨機選擇
    const enabledTypes = quizSettings.questionTypes;
    const type = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
    setQuestionType(type);
    setSelected(null);
    setInputValue('');
    setShowResult(false);
    setTimeLeft(quizSettings.timePerQuestion);
    setQuestionStartTime(Date.now());

    if (type < 2) {
      const allWords = file.words;
      const otherWords = allWords.filter(w => w.id !== currentWord.id);
      const shuffledOthers = shuffleArray(otherWords);
      const wrongOptions = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));

      while (wrongOptions.length < 3) {
        wrongOptions.push({
          id: `fake-${wrongOptions.length}`,
          english: `word${wrongOptions.length + 1}`,
          chinese: `選項${wrongOptions.length + 1}`
        });
      }

      setOptions(shuffleArray([currentWord, ...wrongOptions]));
    }
  }, [currentWord, file.words, quizSettings.questionTypes, quizSettings.timePerQuestion]);

  useEffect(() => {
    if (currentWord && !isFinished) {
      generateQuestion();
    }
  }, [currentIndex, isFinished]);

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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, showResult, isFinished, currentWord, questionStartTime, questionType]);

  useEffect(() => {
    if (questionType === 2 && !showResult && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [questionType, showResult, currentIndex]);

  const processAnswer = (isCorrect: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect, questionType, timeSpent }]);
    setShowResult(true);
  };

  const handleSelect = (option: Word) => {
    if (showResult) return;
    setSelected(option);
    const isCorrect = questionType === 1
      ? option.chinese === currentWord.chinese
      : option.english === currentWord.english;
    processAnswer(isCorrect);
  };

  const handleSpellSubmit = () => {
    if (showResult) return;
    const isCorrect = inputValue.trim().toLowerCase() === currentWord.english.toLowerCase();
    processAnswer(isCorrect);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
      const duration = Math.round((Date.now() - quizStartTime) / 1000);
      onSaveProgress(results, true, duration);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleExit = () => {
    const duration = Math.round((Date.now() - quizStartTime) / 1000);
    onSaveProgress(results, false, duration);
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
          <h1 className="text-3xl mb-4">測驗完成！</h1>
          <div className="text-6xl font-bold text-purple-600 mb-2">{rate}%</div>
          <p className="text-gray-600 mb-4">答對 {correct} / {results.length} 題</p>

          {wrongWords.length > 0 && (
            <div className="mb-4 text-left bg-red-50 p-3 rounded-lg">
              <p className="font-medium text-red-700 mb-2">需要加強的單字：</p>
              <div className="flex flex-wrap gap-1">
                {wrongWords.map((w, i) => (
                  <span key={i} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    {w.english} ({w.chinese})
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button onClick={onExit} className="w-full">返回</Button>
        </Card>
      </div>
    );
  }

  if (!currentWord) {
    return <div className="min-h-screen flex items-center justify-center"><p>載入中...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4">
      {showExitConfirm && (
        <ConfirmDialog
          message={results.length > 0
            ? `確定要離開嗎？\n\n目前進度會自動儲存。`
            : '確定要離開測驗嗎？'}
          confirmText="離開"
          cancelText="繼續測驗"
          confirmVariant="primary"
          onConfirm={handleExit}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}

      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4 text-white">
          <button onClick={() => setShowExitConfirm(true)} className="text-2xl">✕</button>
          <span className="font-bold">{isReview ? '複習模式' : '測驗模式'}</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>

        <div className="mb-4">
          <div className="bg-white/30 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 3 ? 'bg-red-500' : 'bg-white'}`}
              style={{ width: `${(timeLeft / quizSettings.timePerQuestion) * 100}%` }}
            ></div>
          </div>
          <div className="text-center text-white mt-1">{timeLeft} 秒</div>
        </div>

        <Card className="mb-4">
          <div className="text-sm text-gray-500 mb-2">{questionTypes[questionType].label}</div>

          {questionType === 0 && (
            <div className="text-center text-3xl font-bold text-gray-800 py-4">{currentWord.chinese}</div>
          )}

          {questionType === 1 && (
            <div className="text-center text-3xl font-bold text-gray-800 py-4">{currentWord.english}</div>
          )}

          {questionType === 2 && (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-800 mb-4">{currentWord.chinese}</div>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !showResult && handleSpellSubmit()}
                disabled={showResult}
                placeholder="輸入英文單字..."
                className="w-full px-4 py-3 text-xl text-center border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
              />
              {!showResult && (
                <Button onClick={handleSpellSubmit} className="mt-3 w-full" variant="success">
                  確定
                </Button>
              )}
            </div>
          )}
        </Card>

        {questionType < 2 && (
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt, i) => {
              const isThis = questionType === 1 ? opt.chinese === currentWord.chinese : opt.english === currentWord.english;
              const isSelected = selected?.id === opt.id;
              let bgClass = 'bg-white hover:bg-gray-50';
              if (showResult) {
                if (isThis) bgClass = 'bg-green-500 text-white';
                else if (isSelected) bgClass = 'bg-red-500 text-white';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  disabled={showResult}
                  className={`p-4 rounded-xl font-medium text-lg shadow transition-all ${bgClass}`}
                >
                  {questionType === 1 ? opt.chinese : opt.english}
                </button>
              );
            })}
          </div>
        )}

        {showResult && (
          <Card className={`mt-4 ${isCurrentCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-center">
              <div className="text-4xl mb-2">{isCurrentCorrect ? '✓' : '✗'}</div>
              {!isCurrentCorrect && timeLeft === 0 && (
                <p className="text-red-500 text-sm mb-2">時間到！</p>
              )}
              <div className="font-bold text-lg">{currentWord.english}</div>
              <div className="text-gray-600">{currentWord.chinese}</div>
              <Button onClick={nextQuestion} className="mt-3" variant={isCurrentCorrect ? 'success' : 'primary'}>
                {currentIndex + 1 >= totalQuestions ? '查看結果' : '下一題'}
              </Button>
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
  const [appData, setAppData] = useState<AppData>(defaultAppData);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('role-select');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = loadFromStorage();
    setAppData(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) saveToStorage(appData);
  }, [appData, loading]);

  useEffect(() => {
    if (currentProfile) {
      const updated = appData.profiles.find(p => p.id === currentProfile.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentProfile)) {
        setCurrentProfile(updated);
      }
    }
  }, [appData.profiles, currentProfile]);

  // 角色管理
  const createProfile = (name: string) => {
    const newProfile: Profile = { id: Date.now().toString(), name, progress: {}, quizSessions: [] };
    setAppData(d => ({ ...d, profiles: [...d.profiles, newProfile] }));
  };

  const deleteProfile = (id: string) => {
    setAppData(d => {
      const { [id]: _, ...restMastered } = d.masteredWords;
      return { ...d, profiles: d.profiles.filter(p => p.id !== id), masteredWords: restMastered };
    });
  };

  // 檔案管理
  const uploadFile = (name: string, words: Word[]) => {
    const fileId = Date.now().toString();
    setAppData(d => ({ ...d, files: [...d.files, { id: fileId, name, words }] }));
  };

  const deleteFile = (fileId: string) => {
    setAppData(d => {
      const newFiles = d.files.filter(f => f.id !== fileId);
      const newProfiles = d.profiles.map(p => {
        const newProgress = { ...p.progress };
        delete newProgress[fileId];
        return { ...p, progress: newProgress };
      });
      return { ...d, files: newFiles, profiles: newProfiles };
    });
  };

  // 測驗設定
  const updateQuizSettings = (settings: QuizSettings) => {
    setAppData(d => ({ ...d, quizSettings: settings }));
  };

  const updatePassword = (password: string) => {
    setAppData(d => ({ ...d, teacherPassword: password }));
  };

  // 精熟單字管理
  const toggleMastered = (profileId: string, wordId: string, _fileId: string) => {
    setAppData(d => {
      const current = d.masteredWords[profileId] || [];
      const newMastered = current.includes(wordId)
        ? current.filter(id => id !== wordId)
        : [...current, wordId];
      return { ...d, masteredWords: { ...d.masteredWords, [profileId]: newMastered } };
    });
  };

  const resetMastered = (profileId: string) => {
    setAppData(d => ({ ...d, masteredWords: { ...d.masteredWords, [profileId]: [] } }));
  };

  // 測驗
  const startQuiz = (file: WordFile, reviewWords: Word[] | null = null) => {
    if (!currentProfile) return;

    const isReview = reviewWords !== null;
    const masteredIds = appData.masteredWords[currentProfile.id] || [];

    // 排除已精熟的單字
    let wordsToQuiz = isReview ? reviewWords : file.words.filter(w => !masteredIds.includes(w.id));

    if (wordsToQuiz.length === 0) {
      alert('沒有可測驗的單字（全部已精熟或已完成複習）');
      return;
    }

    setQuizState({ file, words: wordsToQuiz, isReview });
    setCurrentScreen('quiz');
  };

  const saveProgress = (results: QuizResult[], completed: boolean, duration: number) => {
    if (results.length === 0 || !currentProfile || !quizState) return;

    const correct = results.filter(r => r.correct).length;
    const rate = Math.round((correct / results.length) * 100);
    const wrongWordIds = results.filter(r => !r.correct).map(r => r.word.id);
    const correctWordIds = results.filter(r => r.correct).map(r => r.word.id);

    // 建立測驗 session 紀錄
    const session: QuizSession = {
      id: Date.now().toString(),
      fileId: quizState.file.id,
      timestamp: Date.now(),
      duration,
      results: results.map(r => ({
        wordId: r.word.id,
        correct: r.correct,
        questionType: r.questionType,
        timeSpent: r.timeSpent
      })),
      completed
    };

    setAppData(d => {
      const profiles = d.profiles.map(p => {
        if (p.id !== currentProfile.id) return p;

        const fileProgress = p.progress?.[quizState.file.id] || {
          correct: 0, wrong: 0, history: [], weakWordIds: []
        };

        let newWeakIds = [...(fileProgress.weakWordIds || [])];

        wrongWordIds.forEach(id => {
          if (!newWeakIds.includes(id)) newWeakIds.push(id);
        });

        newWeakIds = newWeakIds.filter(id => !correctWordIds.includes(id));

        return {
          ...p,
          progress: {
            ...p.progress,
            [quizState.file.id]: {
              correct: fileProgress.correct + correct,
              wrong: fileProgress.wrong + (results.length - correct),
              history: [...(fileProgress.history || []), { rate, timestamp: Date.now() }].slice(-20),
              weakWordIds: newWeakIds
            }
          },
          quizSessions: [...(p.quizSessions || []), session]
        };
      });

      // 精熟單字邏輯：弱點單字連續正確 2 次標記為精熟
      // 簡化實作：複習模式中答對的弱點單字直接標記為精熟
      let newMastered = { ...d.masteredWords };
      if (quizState.isReview) {
        const currentMastered = newMastered[currentProfile.id] || [];
        const newlyMastered = correctWordIds.filter(id => !currentMastered.includes(id));
        if (newlyMastered.length > 0) {
          newMastered[currentProfile.id] = [...currentMastered, ...newlyMastered];
        }
      }

      return { ...d, profiles, masteredWords: newMastered };
    });
  };

  const exitQuiz = () => {
    setQuizState(null);
    setCurrentScreen('student-dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-400">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  // 測驗畫面
  if (currentScreen === 'quiz' && quizState) {
    return (
      <QuizScreen
        file={quizState.file}
        words={quizState.words}
        isReview={quizState.isReview}
        quizSettings={appData.quizSettings}
        onSaveProgress={saveProgress}
        onExit={exitQuiz}
      />
    );
  }

  // 角色選擇畫面
  if (currentScreen === 'role-select') {
    return (
      <RoleSelectScreen
        onSelectStudent={() => setCurrentScreen('student-profiles')}
        onSelectTeacher={() => setCurrentScreen('teacher-login')}
      />
    );
  }

  // 老師登入畫面
  if (currentScreen === 'teacher-login') {
    return (
      <TeacherLogin
        correctPassword={appData.teacherPassword}
        onSuccess={() => setCurrentScreen('teacher-dashboard')}
        onBack={() => setCurrentScreen('role-select')}
      />
    );
  }

  // 老師後台
  if (currentScreen === 'teacher-dashboard') {
    return (
      <TeacherDashboard
        appData={appData}
        onUploadFile={uploadFile}
        onDeleteFile={deleteFile}
        onUpdateSettings={updateQuizSettings}
        onUpdatePassword={updatePassword}
        onToggleMastered={toggleMastered}
        onResetMastered={resetMastered}
        onBack={() => setCurrentScreen('role-select')}
      />
    );
  }

  // 學生角色選擇
  if (currentScreen === 'student-profiles') {
    return (
      <ProfileScreen
        profiles={appData.profiles}
        onSelect={(profile) => {
          setCurrentProfile(profile);
          setCurrentScreen('student-dashboard');
        }}
        onCreate={createProfile}
        onDelete={deleteProfile}
        onBack={() => setCurrentScreen('role-select')}
      />
    );
  }

  // 學生儀表板
  if (currentScreen === 'student-dashboard' && currentProfile) {
    return (
      <Dashboard
        profile={currentProfile}
        files={appData.files}
        quizSettings={appData.quizSettings}
        masteredWords={appData.masteredWords[currentProfile.id] || []}
        onStartQuiz={(f) => startQuiz(f)}
        onStartReview={(f, weakWords) => startQuiz(f, weakWords)}
        onBack={() => {
          setCurrentProfile(null);
          setCurrentScreen('student-profiles');
        }}
      />
    );
  }

  // 預設回到角色選擇
  return (
    <RoleSelectScreen
      onSelectStudent={() => setCurrentScreen('student-profiles')}
      onSelectTeacher={() => setCurrentScreen('teacher-login')}
    />
  );
}
