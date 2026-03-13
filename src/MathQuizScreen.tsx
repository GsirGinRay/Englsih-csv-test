import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MathProblem, MathQuizResult, Settings, Pet } from './types';
import { shuffleArray } from './api';

const DIFFICULTY_NAMES: Record<number, string> = { 1: '簡單', 2: '中等', 3: '困難' };

// 寵物圖片路徑（與 App.tsx 中 getPetImageSrc 相同邏輯）
const getPetImageSrc = (species: string, stage: number, evolutionPath?: string | null): string => {
  const suffix = stage >= 4 && evolutionPath ? `_${stage}${evolutionPath.toLowerCase()}` : `_${stage}`;
  const tryPng = `/pets/${species}${suffix}.png`;
  return tryPng;
};

interface MathQuizScreenProps {
  problems: MathProblem[];
  settings: Settings;
  customQuizName?: string;
  bonusMultiplier?: number;
  typeBonusMultiplier?: number;
  companionPet?: Pet;
  onComplete: (results: MathQuizResult[], duration: number) => void;
  onExit: () => void;
}

function validateMathAnswer(userAnswer: string, correctAnswer: string, problemType: number): boolean {
  const user = (userAnswer || '').trim();
  const correct = (correctAnswer || '').trim();
  if (!user) return false;
  if (problemType === 0) return user === correct;
  const userNum = parseFloat(user);
  const correctNum = parseFloat(correct);
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    return Math.abs(userNum - correctNum) < 0.001;
  }
  return user.replace(/\s/g, '') === correct.replace(/\s/g, '');
}

const MathQuizScreen: React.FC<MathQuizScreenProps> = ({
  problems, settings, customQuizName, bonusMultiplier, typeBonusMultiplier, companionPet, onComplete, onExit
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<MathQuizResult[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quizProblems = useRef(shuffleArray([...problems])).current;
  const currentProblem = quizProblems[currentIndex];
  const totalQuestions = quizProblems.length;

  const correctCount = results.filter(r => r.correct).length;

  // 取得題目時間
  const getTimeForProblem = useCallback((problem: MathProblem) => {
    switch (problem.problemType) {
      case 0: return settings.mathTimeChoiceQuestion;
      case 1: return settings.mathTimeFillQuestion;
      case 2: return settings.mathTimeLiteracyQuestion;
      default: return 30;
    }
  }, [settings]);

  // 準備題目（計時器 + 選項洗牌）
  useEffect(() => {
    if (!currentProblem || showResult || isFinished) return;
    setTimeLeft(getTimeForProblem(currentProblem));
    setQuestionStartTime(Date.now());
    if (currentProblem.problemType === 0) {
      setShuffledOptions(shuffleArray([...currentProblem.options]));
    }
  }, [currentIndex, currentProblem, isFinished, getTimeForProblem]);

  const processAnswer = useCallback((correct: boolean, userAnswer: string) => {
    setShowResult(prev => {
      if (prev) return prev; // already showing result
      setIsCorrect(correct);
      if (timerRef.current) clearInterval(timerRef.current);
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      const newResult: MathQuizResult = {
        problemId: currentProblem.id,
        correct,
        problemType: currentProblem.problemType,
        timeSpent,
        userAnswer,
      };
      setResults(r => [...r, newResult]);
      return true;
    });
  }, [questionStartTime, currentProblem]);

  useEffect(() => {
    if (showResult || isFinished || !currentProblem) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          processAnswer(false, '');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, showResult, isFinished, processAnswer]);

  // 自動 focus 填答題輸入框
  useEffect(() => {
    if (currentProblem && currentProblem.problemType !== 0 && !showResult) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentIndex, showResult, currentProblem]);

  const handleSelectOption = (option: string) => {
    if (showResult) return;
    setSelected(option);
    const correct = validateMathAnswer(option, currentProblem.correctAnswer, 0);
    processAnswer(correct, option);
  };

  const handleFillSubmit = () => {
    if (showResult || !inputValue.trim()) return;
    const correct = validateMathAnswer(inputValue, currentProblem.correctAnswer, currentProblem.problemType);
    processAnswer(correct, inputValue.trim());
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
      const duration = Math.round((Date.now() - startTime) / 1000);
      onComplete(results, duration);
      return;
    }
    setCurrentIndex(i => i + 1);
    setShowResult(false);
    setIsCorrect(false);
    setSelected(null);
    setInputValue('');
  };

  if (isFinished) {
    const rate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md text-center">
          <div className="text-5xl mb-3">{rate >= 80 ? '🎉' : rate >= 50 ? '👍' : '💪'}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">數學測驗完成！</h1>
          {customQuizName && <p className="text-sm text-purple-600 mb-2">{customQuizName}</p>}
          <div className="my-4 p-4 bg-gray-50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">正確率</span>
              <span className="font-bold">{correctCount}/{totalQuestions} ({rate}%)</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
            </div>
            {bonusMultiplier && bonusMultiplier > 1 && (
              <div className="text-xs text-purple-600">星星倍率 x{bonusMultiplier}</div>
            )}
            {typeBonusMultiplier && typeBonusMultiplier !== 1.0 && (
              <div className={`text-xs font-medium ${typeBonusMultiplier > 1 ? 'text-green-600' : 'text-orange-500'}`}>
                屬性加成 ×{typeBonusMultiplier}{typeBonusMultiplier > 1 ? ' 超有效！' : ' 不擅長'}
              </div>
            )}
          </div>
          <button onClick={onExit} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold mt-2">
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!currentProblem) return null;

  const progressPct = ((currentIndex) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 頂部進度條 */}
      <div className="bg-white shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onExit} className="text-sm text-gray-500 px-2 py-1 hover:bg-gray-100 rounded">退出</button>
          <span className="text-sm text-gray-600">{currentIndex + 1}/{totalQuestions}</span>
          <div className="flex items-center gap-2">
            {typeBonusMultiplier && typeBonusMultiplier !== 1.0 && (
              <span className={`text-xs font-bold ${typeBonusMultiplier > 1 ? 'text-green-600' : 'text-orange-500'}`}>
                {typeBonusMultiplier > 1 ? `+${Math.round((typeBonusMultiplier - 1) * 100)}%` : `${Math.round((typeBonusMultiplier - 1) * 100)}%`}
              </span>
            )}
            <div className={`text-xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* 題目區域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        {/* 難度 + 類型標籤 */}
        <div className="flex gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded ${currentProblem.difficulty === 1 ? 'bg-green-100 text-green-700' : currentProblem.difficulty === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {DIFFICULTY_NAMES[currentProblem.difficulty] || '?'}
          </span>
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
            {currentProblem.problemType === 0 ? '選擇題' : currentProblem.problemType === 1 ? '填答題' : '素養題'}
          </span>
        </div>

        {/* 題目圖片 */}
        {currentProblem.imageUrl && (
          <div className="mb-3 max-w-sm">
            <img src={currentProblem.imageUrl} alt="題目圖片" className="rounded-lg max-h-40 mx-auto" />
          </div>
        )}

        {/* 題目內容 */}
        <div className="text-lg font-medium text-gray-800 text-center mb-4 max-w-lg leading-relaxed whitespace-pre-wrap">
          {currentProblem.content}
        </div>

        {/* 選擇題選項 */}
        {currentProblem.problemType === 0 && (
          <div className="w-full max-w-md space-y-2">
            {shuffledOptions.map((option, i) => {
              const isCorrectOption = option === currentProblem.correctAnswer;
              let btnClass = 'bg-white border-2 border-gray-200 hover:border-blue-400 text-gray-800';
              if (showResult) {
                if (isCorrectOption) btnClass = 'bg-green-100 border-2 border-green-500 text-green-800';
                else if (selected === option && !isCorrectOption) btnClass = 'bg-red-100 border-2 border-red-500 text-red-800';
                else btnClass = 'bg-gray-50 border-2 border-gray-200 text-gray-400';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(option)}
                  disabled={showResult}
                  className={`w-full p-3 rounded-xl font-medium transition-all text-left ${btnClass}`}
                >
                  <span className="text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {/* 填答題/素養題輸入 */}
        {currentProblem.problemType !== 0 && (
          <div className="w-full max-w-md quiz-input-sticky">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !showResult && handleFillSubmit()}
              disabled={showResult}
              placeholder="輸入你的答案..."
              className="w-full px-4 py-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none"
              autoComplete="off"
            />
            {!showResult && (
              <button
                onClick={handleFillSubmit}
                disabled={!inputValue.trim()}
                className="mt-3 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                確定
              </button>
            )}
          </div>
        )}

        {/* 答題結果 */}
        {showResult && (
          <div className="mt-4 w-full max-w-md">
            <div className={`p-4 rounded-xl mb-3 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-center">
                <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                <div className={`font-bold mt-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? '正確！' : `正確答案：${currentProblem.correctAnswer}`}
                </div>
                {currentProblem.explanation && (
                  <div className="text-sm text-gray-600 mt-2 p-2 bg-white rounded border border-gray-100">
                    💡 {currentProblem.explanation}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={nextQuestion}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all"
            >
              {currentIndex + 1 >= totalQuestions ? '查看結果' : '下一題'}
            </button>
          </div>
        )}
      </div>

      {/* 浮動寵物小圖示 */}
      {companionPet && (
        <div className="fixed bottom-16 right-3 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center overflow-hidden">
          <img src={getPetImageSrc(companionPet.species, companionPet.stage, companionPet.evolutionPath)} alt="" className="w-10 h-10 object-contain" />
        </div>
      )}

      {/* 底部答對數 */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>答對：{correctCount}</span>
          <span>答錯：{results.length - correctCount}</span>
        </div>
      </div>
    </div>
  );
};

export default MathQuizScreen;
