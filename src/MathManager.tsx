import React, { useState, useRef } from 'react';
import type { MathProblemSet, MathProblem, MathCustomQuiz, Profile, Settings } from './types';
import { api, hasGarbledText, DAY_ELEMENTS_ORDERED } from './api';

const MATH_CATEGORIES: Record<string, { name: string; icon: string }> = {
  arithmetic: { name: '四則運算', icon: '➕' },
  geometry: { name: '幾何圖形', icon: '📐' },
  fraction: { name: '分數小數', icon: '🔣' },
  measurement: { name: '測量單位', icon: '📏' },
  word_problem: { name: '應用題', icon: '📝' },
  logic: { name: '邏輯推理', icon: '🧩' },
  statistics: { name: '統計圖表', icon: '📊' },
};

const PROBLEM_TYPE_NAMES: Record<number, string> = {
  0: '選擇題',
  1: '填答題',
  2: '素養題',
};

const DIFFICULTY_NAMES: Record<number, { name: string; color: string }> = {
  1: { name: '簡單', color: 'text-green-600 bg-green-50' },
  2: { name: '中等', color: 'text-yellow-600 bg-yellow-50' },
  3: { name: '困難', color: 'text-red-600 bg-red-50' },
};

interface MathManagerProps {
  mathSets: MathProblemSet[];
  mathCustomQuizzes: MathCustomQuiz[];
  profiles: Profile[];
  settings: Settings;
  onRefresh: () => void;
}

const MathManager: React.FC<MathManagerProps> = ({ mathSets, mathCustomQuizzes, profiles, settings, onRefresh }) => {
  const [subTab, setSubTab] = useState<'sets' | 'custom'>('sets');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showAddSet, setShowAddSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetCategory, setNewSetCategory] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editSetName, setEditSetName] = useState('');

  // 新增題目表單
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [newProblem, setNewProblem] = useState({
    content: '', problemType: 0, options: ['', '', '', ''],
    correctAnswer: '', explanation: '', imageUrl: '', difficulty: 1
  });

  // CSV 匯入
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvData, setCsvData] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // 編輯題目
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [editProblem, setEditProblem] = useState<Partial<MathProblem>>({});

  // 自訂測驗
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustomQuizId, setEditingCustomQuizId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customSetIds, setCustomSetIds] = useState<string[]>([]);
  const [customCountType0, setCustomCountType0] = useState(-1);
  const [customCountType1, setCustomCountType1] = useState(-1);
  const [customCountType2, setCustomCountType2] = useState(-1);
  const [customMultiplier, setCustomMultiplier] = useState(1.0);
  const [customAssigned, setCustomAssigned] = useState<string[]>([]);
  const [customDurationDays, setCustomDurationDays] = useState(0);

  const selectedSet = mathSets.find(s => s.id === selectedSetId);

  const handleCreateSet = async () => {
    if (!newSetName.trim()) return;
    try {
      await api.createMathSet(newSetName.trim(), newSetCategory || undefined);
      setNewSetName('');
      setNewSetCategory('');
      setShowAddSet(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create set:', error);
    }
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm('確定刪除此題目集？所有題目將一併刪除。')) return;
    try {
      await api.deleteMathSet(id);
      if (selectedSetId === id) setSelectedSetId(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete set:', error);
    }
  };

  const handleRenameSet = async (id: string) => {
    if (!editSetName.trim()) return;
    try {
      await api.renameMathSet(id, editSetName.trim());
      setEditingSetId(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to rename set:', error);
    }
  };

  const handleAddProblem = async () => {
    if (!selectedSetId || !newProblem.content.trim() || !newProblem.correctAnswer.trim()) return;
    try {
      const options = newProblem.problemType === 1 ? [] : newProblem.options.filter(o => o.trim());
      await api.addMathProblems(selectedSetId, [{
        content: newProblem.content.trim(),
        problemType: newProblem.problemType,
        options,
        correctAnswer: newProblem.correctAnswer.trim(),
        explanation: newProblem.explanation.trim() || undefined,
        imageUrl: newProblem.imageUrl.trim() || undefined,
        difficulty: newProblem.difficulty,
      }]);
      setNewProblem({ content: '', problemType: 0, options: ['', '', '', ''], correctAnswer: '', explanation: '', imageUrl: '', difficulty: 1 });
      setShowAddProblem(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to add problem:', error);
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!confirm('確定刪除此題目？')) return;
    try {
      await api.deleteMathProblem(id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete problem:', error);
    }
  };

  const handleUpdateProblem = async (id: string) => {
    try {
      await api.updateMathProblem(id, editProblem);
      setEditingProblemId(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to update problem:', error);
    }
  };

  const handleCsvImport = async () => {
    if (!selectedSetId || !csvData.trim()) return;
    try {
      const result = await api.importMathCsv(selectedSetId, csvData);
      if (result.success) {
        alert(`成功匯入 ${result.count} 題`);
        setCsvData('');
        setShowCsvImport(false);
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      alert('匯入失敗');
    }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tryReadFile = (encoding: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file, encoding);
      });
    };

    const encodings = ['UTF-8', 'Big5', 'GBK', 'GB2312', 'GB18030'];
    for (const encoding of encodings) {
      const content = await tryReadFile(encoding);
      if (!content) continue;
      if (!hasGarbledText(content)) {
        setCsvData(content.trim());
        setShowCsvImport(true);
        break;
      }
    }
    e.target.value = '';
  };

  const resetCustomForm = () => {
    setShowCustomForm(false);
    setEditingCustomQuizId(null);
    setCustomName('');
    setCustomSetIds([]);
    setCustomCountType0(-1);
    setCustomCountType1(-1);
    setCustomCountType2(-1);
    setCustomMultiplier(1.0);
    setCustomAssigned([]);
    setCustomDurationDays(0);
  };

  const handleStartEdit = (quiz: MathCustomQuiz) => {
    setEditingCustomQuizId(quiz.id);
    setCustomName(quiz.name);
    const ids = quiz.problemSetIds.length > 0 ? quiz.problemSetIds : (quiz.problemSetId ? [quiz.problemSetId] : []);
    setCustomSetIds(ids);
    setCustomCountType0(quiz.countType0);
    setCustomCountType1(quiz.countType1);
    setCustomCountType2(quiz.countType2);
    setCustomMultiplier(quiz.starMultiplier);
    setCustomAssigned(quiz.assignedProfileIds);
    setCustomDurationDays(0);
    setShowCustomForm(true);
  };

  const handleSaveCustomQuiz = async () => {
    if (!customName.trim() || customSetIds.length === 0) return;
    try {
      const payload = {
        name: customName.trim(),
        problemSetIds: customSetIds,
        problemIds: [] as string[],
        problemTypes: [0, 1, 2].filter(t => {
          const c = [customCountType0, customCountType1, customCountType2][t];
          return c !== 0;
        }),
        countType0: customCountType0,
        countType1: customCountType1,
        countType2: customCountType2,
        starMultiplier: customMultiplier,
        assignedProfileIds: customAssigned,
        durationDays: customDurationDays,
      };

      if (editingCustomQuizId) {
        await api.updateMathCustomQuiz(editingCustomQuizId, payload);
      } else {
        await api.createMathCustomQuiz(payload);
      }
      resetCustomForm();
      onRefresh();
    } catch (error) {
      console.error('Failed to save custom quiz:', error);
    }
  };

  const handleToggleCustomActive = async (quiz: MathCustomQuiz) => {
    try {
      await api.updateMathCustomQuiz(quiz.id, { active: !quiz.active });
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle custom quiz:', error);
    }
  };

  const handleDeleteCustomQuiz = async (id: string) => {
    if (!confirm('確定刪除此自訂測驗？')) return;
    try {
      await api.deleteMathCustomQuiz(id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete custom quiz:', error);
    }
  };

  // 所選題目集的各類型可用題數統計
  const selectedSetsProblems = mathSets.filter(s => customSetIds.includes(s.id)).flatMap(s => s.problems);
  const availableType0 = selectedSetsProblems.filter(p => p.problemType === 0).length;
  const availableType1 = selectedSetsProblems.filter(p => p.problemType === 1).length;
  const availableType2 = selectedSetsProblems.filter(p => p.problemType === 2).length;

  const DURATION_OPTIONS = [
    { label: '1天', value: 1 },
    { label: '2天', value: 2 },
    { label: '3天', value: 3 },
    { label: '5天', value: 5 },
    { label: '7天', value: 7 },
    { label: '永不過期', value: 0 },
  ];

  return (
    <div className="space-y-4">
      {/* 子分頁 */}
      <div className="flex gap-2">
        <button onClick={() => setSubTab('sets')} className={`px-4 py-2 rounded-lg text-sm font-medium ${subTab === 'sets' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          題目集管理
        </button>
        <button onClick={() => setSubTab('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium ${subTab === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          自訂測驗
        </button>
      </div>

      {subTab === 'sets' && (
        <>
          {/* 題目集列表 */}
          {!selectedSet ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-700">數學題目集</h3>
                <button onClick={() => setShowAddSet(true)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">
                  + 新增題目集
                </button>
              </div>

              {showAddSet && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    placeholder="題目集名稱"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleCreateSet()}
                  />
                  <select value={newSetCategory} onChange={e => setNewSetCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">不分類</option>
                    {Object.entries(MATH_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleCreateSet} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">建立</button>
                    <button onClick={() => setShowAddSet(false)} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg">取消</button>
                  </div>
                </div>
              )}

              {mathSets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📐</div>
                  <p>還沒有數學題目集</p>
                  <p className="text-sm">點擊「新增題目集」開始建立</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mathSets.map(set => (
                    <div key={set.id} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedSetId(set.id)}>
                        {editingSetId === set.id ? (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editSetName}
                              onChange={e => setEditSetName(e.target.value)}
                              className="flex-1 px-2 py-1 border rounded text-sm"
                              onKeyDown={e => e.key === 'Enter' && handleRenameSet(set.id)}
                              autoFocus
                            />
                            <button onClick={() => handleRenameSet(set.id)} className="text-sm text-blue-600">儲存</button>
                            <button onClick={() => setEditingSetId(null)} className="text-sm text-gray-500">取消</button>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-800 truncate">
                              {set.category && MATH_CATEGORIES[set.category] ? `${MATH_CATEGORIES[set.category].icon} ` : ''}
                              {set.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{set.problems.length} 題</span>
                              {set.element && DAY_ELEMENTS_ORDERED.find(el => el.key === set.element) && (
                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">
                                  {DAY_ELEMENTS_ORDERED.find(el => el.key === set.element)!.emoji} {settings.enableMonsterSystem ? DAY_ELEMENTS_ORDERED.find(el => el.key === set.element)!.monster : DAY_ELEMENTS_ORDERED.find(el => el.key === set.element)!.element}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 items-center" onClick={e => e.stopPropagation()}>
                        <select
                          value={set.element || ''}
                          onChange={async (e) => {
                            try {
                              await api.updateMathSetElement(set.id, e.target.value || null);
                              onRefresh();
                            } catch { /* ignore */ }
                          }}
                          className="text-xs px-1 py-1 border border-gray-200 rounded bg-white"
                          title="元素"
                        >
                          <option value="">無元素</option>
                          {DAY_ELEMENTS_ORDERED.map(el => (
                            <option key={el.key} value={el.key}>{el.emoji} {el.element}</option>
                          ))}
                        </select>
                        <button onClick={() => { setEditingSetId(set.id); setEditSetName(set.name); }} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">改名</button>
                        <button onClick={() => handleDeleteSet(set.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">刪除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 題目集詳情 */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedSetId(null)} className="text-sm text-blue-600">← 返回</button>
                <h3 className="font-bold text-gray-700 truncate">{selectedSet.name}</h3>
                <span className="text-xs text-gray-500">({selectedSet.problems.length} 題)</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowAddProblem(true)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">
                  + 手動新增
                </button>
                <button onClick={() => setShowCsvImport(true)} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg">
                  CSV 貼上
                </button>
                <button onClick={() => csvFileInputRef.current?.click()} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg">
                  CSV 檔案匯入
                </button>
                <input type="file" accept=".csv,.txt" ref={csvFileInputRef} onChange={handleCsvFileChange} className="hidden" />
              </div>
              <p className="text-xs text-gray-500">支援 UTF-8、Big5 編碼的 CSV 檔案</p>

              {/* CSV 匯入 */}
              {showCsvImport && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                  <div className="text-xs text-gray-600">
                    格式：題目,題型(0/1/2),選項A,選項B,選項C,選項D,正確答案,解說,難度(1/2/3)
                  </div>
                  <textarea
                    value={csvData}
                    onChange={e => setCsvData(e.target.value)}
                    placeholder={`3+5=?,0,6,7,8,9,8,,1\n50-23=?,0,25,27,30,33,27,,1`}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono h-32"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCsvImport} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg">匯入</button>
                    <button onClick={() => { setShowCsvImport(false); setCsvData(''); }} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg">取消</button>
                  </div>
                </div>
              )}

              {/* 手動新增題目 */}
              {showAddProblem && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                  <textarea
                    value={newProblem.content}
                    onChange={e => setNewProblem({ ...newProblem, content: e.target.value })}
                    placeholder="題目敘述"
                    className="w-full px-3 py-2 border rounded-lg text-sm h-20"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newProblem.problemType}
                      onChange={e => setNewProblem({ ...newProblem, problemType: parseInt(e.target.value) })}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value={0}>選擇題</option>
                      <option value={1}>填答題</option>
                      <option value={2}>素養題</option>
                    </select>
                    <select
                      value={newProblem.difficulty}
                      onChange={e => setNewProblem({ ...newProblem, difficulty: parseInt(e.target.value) })}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value={1}>簡單</option>
                      <option value={2}>中等</option>
                      <option value={3}>困難</option>
                    </select>
                  </div>
                  {newProblem.problemType !== 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      {newProblem.options.map((opt, i) => (
                        <input
                          key={i}
                          type="text"
                          value={opt}
                          onChange={e => {
                            const opts = [...newProblem.options];
                            opts[i] = e.target.value;
                            setNewProblem({ ...newProblem, options: opts });
                          }}
                          placeholder={`選項 ${String.fromCharCode(65 + i)}`}
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={newProblem.correctAnswer}
                    onChange={e => setNewProblem({ ...newProblem, correctAnswer: e.target.value })}
                    placeholder="正確答案"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newProblem.explanation}
                    onChange={e => setNewProblem({ ...newProblem, explanation: e.target.value })}
                    placeholder="解說（選填）"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newProblem.imageUrl}
                    onChange={e => setNewProblem({ ...newProblem, imageUrl: e.target.value })}
                    placeholder="圖片 URL（選填）"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddProblem} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">新增</button>
                    <button onClick={() => setShowAddProblem(false)} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg">取消</button>
                  </div>
                </div>
              )}

              {/* 題目列表 */}
              <div className="space-y-2">
                {selectedSet.problems.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>此題目集尚無題目</p>
                  </div>
                ) : (
                  selectedSet.problems.map((p, i) => (
                    <div key={p.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                      {editingProblemId === p.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editProblem.content ?? p.content}
                            onChange={e => setEditProblem({ ...editProblem, content: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm h-16"
                          />
                          <div className="flex gap-2">
                            <select
                              value={editProblem.problemType ?? p.problemType}
                              onChange={e => setEditProblem({ ...editProblem, problemType: parseInt(e.target.value) })}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value={0}>選擇題</option>
                              <option value={1}>填答題</option>
                              <option value={2}>素養題</option>
                            </select>
                            <select
                              value={editProblem.difficulty ?? p.difficulty}
                              onChange={e => setEditProblem({ ...editProblem, difficulty: parseInt(e.target.value) })}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value={1}>簡單</option>
                              <option value={2}>中等</option>
                              <option value={3}>困難</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={editProblem.correctAnswer ?? p.correctAnswer}
                            onChange={e => setEditProblem({ ...editProblem, correctAnswer: e.target.value })}
                            placeholder="正確答案"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateProblem(p.id)} className="text-sm text-blue-600">儲存</button>
                            <button onClick={() => setEditingProblemId(null)} className="text-sm text-gray-500">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs text-gray-400">#{i + 1}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{PROBLEM_TYPE_NAMES[p.problemType] || '未知'}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_NAMES[p.difficulty]?.color || ''}`}>{DIFFICULTY_NAMES[p.difficulty]?.name || '?'}</span>
                            </div>
                            <div className="text-sm text-gray-800 mb-1">{p.content}</div>
                            {p.options.length > 0 && (
                              <div className="flex gap-2 flex-wrap text-xs text-gray-500">
                                {p.options.map((opt, oi) => (
                                  <span key={oi} className={opt === p.correctAnswer ? 'text-green-600 font-medium' : ''}>
                                    {String.fromCharCode(65 + oi)}. {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                            {p.problemType === 1 && (
                              <div className="text-xs text-green-600">答案：{p.correctAnswer}</div>
                            )}
                            {p.explanation && <div className="text-xs text-gray-400 mt-1">解說：{p.explanation}</div>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingProblemId(p.id); setEditProblem({}); }} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">編輯</button>
                            <button onClick={() => handleDeleteProblem(p.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">刪除</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {subTab === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700">自訂數學測驗</h3>
            <button onClick={() => { resetCustomForm(); setShowCustomForm(true); }} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">
              + 新增測驗
            </button>
          </div>

          {showCustomForm && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="text-sm font-medium text-blue-700">{editingCustomQuizId ? '編輯測驗' : '新增測驗'}</div>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="測驗名稱"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />

              {/* 多選題目集 */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">選擇題目集（可多選）：</label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-white space-y-1">
                  {mathSets.map(s => {
                    const elInfo = s.element ? DAY_ELEMENTS_ORDERED.find(el => el.key === s.element) : null;
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={customSetIds.includes(s.id)}
                          onChange={e => {
                            setCustomSetIds(
                              e.target.checked
                                ? [...customSetIds, s.id]
                                : customSetIds.filter(id => id !== s.id)
                            );
                          }}
                        />
                        <span className="truncate">{s.name}</span>
                        <span className="text-xs text-gray-400">({s.problems.length} 題)</span>
                        {elInfo && <span className="text-xs">{elInfo.emoji}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 各題型出題數 */}
              {customSetIds.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">各題型出題數（-1=全部, 0=不出）：</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">選擇題 ({availableType0})</div>
                      <input type="number" min={-1} max={availableType0 || 999} value={customCountType0} onChange={e => setCustomCountType0(parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm text-center" />
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">填答題 ({availableType1})</div>
                      <input type="number" min={-1} max={availableType1 || 999} value={customCountType1} onChange={e => setCustomCountType1(parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm text-center" />
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">素養題 ({availableType2})</div>
                      <input type="number" min={-1} max={availableType2 || 999} value={customCountType2} onChange={e => setCustomCountType2(parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm text-center" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 items-center flex-wrap">
                <label className="text-sm text-gray-600">
                  星星倍率：
                  <select value={customMultiplier} onChange={e => setCustomMultiplier(parseFloat(e.target.value))} className="ml-1 px-2 py-1 border rounded text-sm">
                    <option value={1}>x1</option>
                    <option value={1.5}>x1.5</option>
                    <option value={2}>x2</option>
                    <option value={3}>x3</option>
                  </select>
                </label>
              </div>

              {/* 期限 preset 按鈕 */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">期限：</label>
                <div className="flex gap-1 flex-wrap">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCustomDurationDays(opt.value)}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        customDurationDays === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {profiles.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">指定學生（不選=全體）：</label>
                  <div className="max-h-24 overflow-y-auto border rounded p-2 bg-white grid grid-cols-2 gap-1">
                    {profiles.map(p => (
                      <label key={p.id} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={customAssigned.includes(p.id)}
                          onChange={e => {
                            setCustomAssigned(
                              e.target.checked
                                ? [...customAssigned, p.id]
                                : customAssigned.filter(id => id !== p.id)
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleSaveCustomQuiz} disabled={!customName.trim() || customSetIds.length === 0} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
                  {editingCustomQuizId ? '儲存' : '建立'}
                </button>
                <button onClick={resetCustomForm} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg">取消</button>
              </div>
            </div>
          )}

          {mathCustomQuizzes.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>還沒有自訂數學測驗</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mathCustomQuizzes.map(quiz => {
                const setIds = quiz.problemSetIds.length > 0 ? quiz.problemSetIds : (quiz.problemSetId ? [quiz.problemSetId] : []);
                const sets = mathSets.filter(s => setIds.includes(s.id));
                const setsLabel = sets.length > 0 ? sets.map(s => s.name).join('、') : '未知題目集';
                const totalProblems = sets.flatMap(s => s.problems).length;
                const countLabel = [
                  quiz.countType0 !== 0 ? `選${quiz.countType0 < 0 ? '全' : quiz.countType0}` : null,
                  quiz.countType1 !== 0 ? `填${quiz.countType1 < 0 ? '全' : quiz.countType1}` : null,
                  quiz.countType2 !== 0 ? `素${quiz.countType2 < 0 ? '全' : quiz.countType2}` : null,
                ].filter(Boolean).join('/');
                const isExpired = quiz.expiresAt && new Date(quiz.expiresAt) < new Date();
                return (
                  <div key={quiz.id} className={`p-3 border rounded-lg ${!quiz.active || isExpired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800 truncate">{quiz.name}</div>
                        <div className="text-xs text-gray-500">
                          {setsLabel} · {countLabel || `${totalProblems} 題`} · x{quiz.starMultiplier}
                          {quiz.assignedProfileIds.length > 0 && ` · ${quiz.assignedProfileIds.length} 人`}
                          {quiz.expiresAt && (
                            <span className={isExpired ? 'text-red-500' : ''}>
                              {' '}· {isExpired ? '已過期' : `${new Date(quiz.expiresAt).toLocaleDateString()} 截止`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(quiz)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">編輯</button>
                        <button onClick={() => handleToggleCustomActive(quiz)} className={`text-xs px-2 py-1 rounded ${quiz.active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {quiz.active ? '停用' : '啟用'}
                        </button>
                        <button onClick={() => handleDeleteCustomQuiz(quiz.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">刪除</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MathManager;
