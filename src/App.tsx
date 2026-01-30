import React, { useState, useEffect, useRef, useCallback } from 'react';

const APP_STORAGE_KEY = 'vocab-quiz-app-data-v3';

// 改用標準的 localStorage API
const saveToStorage = (data: AppData) => {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
};

const loadFromStorage = (): AppData | null => {
  try {
    const result = localStorage.getItem(APP_STORAGE_KEY);
    return result ? JSON.parse(result) : null;
  } catch (e) {
    console.error('Storage load error:', e);
    return null;
  }
};

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

interface Profile {
  id: string;
  name: string;
  progress: Record<string, FileProgress>;
}

interface AppData {
  profiles: Profile[];
  files: WordFile[];
}

interface QuizResult {
  word: Word;
  correct: boolean;
}

interface QuizState {
  file: WordFile;
  words: Word[];
  isReview: boolean;
}

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

interface ProfileScreenProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ profiles, onSelect, onCreate, onDelete }) => {
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
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-600">🎓 英文單字練習</h1>
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
            ＋ 建立新角色
          </Button>
        )}
      </Card>
    </div>
  );
};

interface DashboardProps {
  profile: Profile;
  files: WordFile[];
  onUpload: (name: string, words: Word[]) => void;
  onStartQuiz: (file: WordFile) => void;
  onStartReview: (file: WordFile, weakWords: Word[]) => void;
  onBack: () => void;
  onDeleteFile: (fileId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, files, onUpload, onStartQuiz, onStartReview, onBack, onDeleteFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<WordFile | null>(null);
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
      onUpload(file.name.replace(/\.csv$/i, ''), bestWords);
    } else {
      alert('無法解析檔案，請確認格式為：英文,中文\n\n建議：在 Excel 存檔時選擇「CSV UTF-8」格式');
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      {deleteTarget && (
        <ConfirmDialog
          message={`確定要刪除「${deleteTarget.name}」這個單字檔案嗎？`}
          onConfirm={() => { onDeleteFile(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white text-2xl">←</button>
          <h1 className="text-xl font-bold text-white">👤 {profile.name} 的學習中心</h1>
          <div className="w-8"></div>
        </div>

        <Card className="mb-4">
          <h2 className="font-bold text-lg mb-3 text-gray-700">📚 我的單字檔案</h2>
          <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} className="w-full mb-3" variant="primary" disabled={uploading}>
            {uploading ? '📤 上傳中...' : '📤 上傳 CSV 檔案'}
          </Button>

          <p className="text-xs text-gray-500 mb-3 text-center">支援 UTF-8、Big5 編碼，格式：英文,中文</p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(f => {
              const progress = profile.progress?.[f.id] || { correct: 0, wrong: 0, history: [], weakWordIds: [] };
              const total = progress.correct + progress.wrong;
              const rate = total > 0 ? Math.round((progress.correct / total) * 100) : 0;
              const weakWordIds = progress.weakWordIds || [];
              const weakWords = f.words.filter(w => weakWordIds.includes(w.id));

              return (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({f.words.length} 個單字)</span>
                    </div>
                    <button onClick={() => setDeleteTarget(f)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded">
                      刪除
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${rate}%` }}></div>
                    </div>
                    <span className="text-sm font-medium">{rate}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onStartQuiz(f)} variant="primary" className="flex-1 text-sm py-1">
                      🎮 開始測驗
                    </Button>
                    {weakWords.length > 0 && (
                      <Button onClick={() => onStartReview(f, weakWords)} variant="warning" className="flex-1 text-sm py-1">
                        📝 複習 ({weakWords.length})
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {files.length === 0 && <p className="text-gray-500 text-center py-4">上傳 CSV 檔案開始學習</p>}
          </div>
        </Card>

        {files.length > 0 && <ProgressChart profile={profile} files={files} />}
      </div>
    </div>
  );
};

interface ProgressChartProps {
  profile: Profile;
  files: WordFile[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ profile, files }) => {
  const allHistory = files.flatMap(f => (profile.progress?.[f.id]?.history || []).map(h => ({ ...h, fileName: f.name })));
  allHistory.sort((a, b) => a.timestamp - b.timestamp);
  const recent = allHistory.slice(-10);

  const allWeakWords = files.flatMap(f => {
    const weakWordIds = profile.progress?.[f.id]?.weakWordIds || [];
    return f.words.filter(w => weakWordIds.includes(w.id)).map(w => ({ ...w, fileName: f.name }));
  });

  return (
    <Card>
      <h2 className="font-bold text-lg mb-3 text-gray-700">📊 學習統計</h2>

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
          <h3 className="font-medium text-sm text-gray-600 mb-2">❌ 待加強單字 ({allWeakWords.length})</h3>
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

interface QuizScreenProps {
  file: WordFile;
  words: Word[];
  isReview: boolean;
  onSaveProgress: (results: QuizResult[]) => void;
  onExit: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ file, words, isReview, onSaveProgress, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionType, setQuestionType] = useState(0);
  const [options, setOptions] = useState<Word[]>([]);
  const [selected, setSelected] = useState<Word | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quizWords = useRef(shuffleArray([...words])).current;
  const currentWord = quizWords[currentIndex];
  const totalQuestions = quizWords.length;

  const questionTypes = [
    { type: 'ch2en', label: '看中文選英文', time: 10 },
    { type: 'en2ch', label: '看英文選中文', time: 10 },
    { type: 'spell', label: '拼寫題', time: 30 }
  ];

  const generateQuestion = useCallback(() => {
    if (!currentWord) return;

    const type = Math.floor(Math.random() * 3);
    setQuestionType(type);
    setSelected(null);
    setInputValue('');
    setShowResult(false);
    setTimeLeft(questionTypes[type].time);

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
  }, [currentWord, file.words]);

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
          setResults(prev => [...prev, { word: currentWord, correct: false }]);
          setShowResult(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, showResult, isFinished, currentWord]);

  useEffect(() => {
    if (questionType === 2 && !showResult && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [questionType, showResult, currentIndex]);

  const processAnswer = (isCorrect: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);
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
      onSaveProgress(results);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleExit = () => {
    if (results.length > 0) {
      onSaveProgress(results);
    }
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
          <h1 className="text-3xl mb-4">🎉 測驗完成！</h1>
          <div className="text-6xl font-bold text-purple-600 mb-2">{rate}%</div>
          <p className="text-gray-600 mb-4">答對 {correct} / {results.length} 題</p>

          {wrongWords.length > 0 && (
            <div className="mb-4 text-left bg-red-50 p-3 rounded-lg">
              <p className="font-medium text-red-700 mb-2">❌ 需要加強的單字：</p>
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
            ? `確定要離開嗎？\n\n目前進度會自動儲存，答錯的 ${results.filter(r => !r.correct).length} 個單字會加入複習清單。`
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
          <span className="font-bold">{isReview ? '📝 複習模式' : '🎮 測驗模式'}</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>

        <div className="mb-4">
          <div className="bg-white/30 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 3 ? 'bg-red-500' : 'bg-white'}`}
              style={{ width: `${(timeLeft / questionTypes[questionType].time) * 100}%` }}
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
              <div className="text-4xl mb-2">{isCurrentCorrect ? '✅' : '❌'}</div>
              {!isCurrentCorrect && timeLeft === 0 && (
                <p className="text-red-500 text-sm mb-2">⏰ 時間到！</p>
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

export default function App() {
  const [appData, setAppData] = useState<AppData>({ profiles: [], files: [] });
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = loadFromStorage();
    if (data) setAppData(data);
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

  const createProfile = (name: string) => {
    const newProfile: Profile = { id: Date.now().toString(), name, progress: {} };
    setAppData(d => ({ ...d, profiles: [...d.profiles, newProfile] }));
  };

  const deleteProfile = (id: string) => {
    setAppData(d => ({ ...d, profiles: d.profiles.filter(p => p.id !== id) }));
  };

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

  const startQuiz = (file: WordFile, reviewWords: Word[] | null = null) => {
    const isReview = reviewWords !== null;
    const words = isReview ? reviewWords : file.words;
    setQuizState({ file, words, isReview });
  };

  const saveProgress = (results: QuizResult[]) => {
    if (results.length === 0 || !currentProfile || !quizState) return;

    const correct = results.filter(r => r.correct).length;
    const rate = Math.round((correct / results.length) * 100);
    const wrongWordIds = results.filter(r => !r.correct).map(r => r.word.id);
    const correctWordIds = results.filter(r => r.correct).map(r => r.word.id);

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
          }
        };
      });
      return { ...d, profiles };
    });
  };

  const exitQuiz = () => {
    setQuizState(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-400">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  if (quizState) {
    return (
      <QuizScreen
        file={quizState.file}
        words={quizState.words}
        isReview={quizState.isReview}
        onSaveProgress={saveProgress}
        onExit={exitQuiz}
      />
    );
  }

  if (currentProfile) {
    return (
      <Dashboard
        profile={currentProfile}
        files={appData.files}
        onUpload={uploadFile}
        onStartQuiz={(f) => startQuiz(f)}
        onStartReview={(f, weakWords) => startQuiz(f, weakWords)}
        onBack={() => setCurrentProfile(null)}
        onDeleteFile={deleteFile}
      />
    );
  }

  return (
    <ProfileScreen
      profiles={appData.profiles}
      onSelect={setCurrentProfile}
      onCreate={createProfile}
      onDelete={deleteProfile}
    />
  );
}
