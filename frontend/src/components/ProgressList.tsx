// frontend/src/components/ProgressList.tsx

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Trash2, BookOpen, Clock, Layers, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
import api from '../lib/api';
import { ProgressItem, MasterBook, Preset, BookCandidate } from '../types';

export default function ProgressList({ studentId, onUpdate, readOnly = false }: { studentId: number, onUpdate?: () => void, readOnly?: boolean }) {
  // --- State ---
  const [fullList, setFullList] = useState<ProgressItem[]>([]);
  const [filteredList, setFilteredList] = useState<ProgressItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>(["全体"]);
  const [selectedSubject, setSelectedSubject] = useState("全体");

  const [editingItem, setEditingItem] = useState<ProgressItem | null>(null);
  const [editCompleted, setEditCompleted] = useState<number>(0);
  const [editTotal, setEditTotal] = useState<number>(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [masterBooks, setMasterBooks] = useState<MasterBook[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<BookCandidate[]>([]);

  // 編集モード管理
  const [isEditingMode, setIsEditingMode] = useState(false);

  // プリセット詳細展開管理
  const [expandedPresetId, setExpandedPresetId] = useState<number | null>(null);

  const [masterSubjects, setMasterSubjects] = useState<string[]>([]);
  const [masterLevels, setMasterLevels] = useState<string[]>([]);

  const [filterLeft, setFilterLeft] = useState({ subject: "", level: "", name: "" });
  const [filterRight, setFilterRight] = useState({ subject: "", level: "", name: "" });
  const [filterPresetSubject, setFilterPresetSubject] = useState("");

  const [customForm, setCustomForm] = useState({
    subject: "",
    level: "",
    book_name: "",
    duration: 0
  });

  const [isCustomLevelManual, setIsCustomLevelManual] = useState(false);
  const [isCustomSubjectManual, setIsCustomSubjectManual] = useState(false);

  // --- データ取得 ---
  const fetchData = async () => {
    try {
      const subjRes = await api.get<string[]>(`/charts/subjects/${studentId}`);
      if (subjRes.data) setSubjects(subjRes.data);

      const listRes = await api.get<ProgressItem[]>(`/dashboard/list/${studentId}`);
      setFullList(listRes.data);
      setFilteredList(listRes.data);
    } catch (e) { console.error(e); }
  };

  const fetchMasterData = async () => {
    try {
      const booksRes = await api.get<MasterBook[]>('/dashboard/books/master');
      setMasterBooks(booksRes.data);
      const presetsRes = await api.get<Preset[]>('/dashboard/presets');
      setPresets(presetsRes.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (studentId) fetchData();
  }, [studentId]);

  useEffect(() => {
    if (isAddModalOpen) fetchMasterData();
  }, [isAddModalOpen]);

  useEffect(() => {
    if (masterBooks.length > 0) {
      const uniqueSubjects = Array.from(new Set(masterBooks.map(b => b.subject).filter(Boolean)));
      const uniqueLevels = Array.from(new Set(masterBooks.map(b => b.level).filter(Boolean)));
      setMasterSubjects(uniqueSubjects);
      setMasterLevels(uniqueLevels);
    }
  }, [masterBooks]);

  useEffect(() => {
    if (selectedSubject === "全体") {
      setFilteredList(fullList);
    } else {
      setFilteredList(fullList.filter(item => item.subject === selectedSubject));
    }
  }, [selectedSubject, fullList]);

  // --- ハンドラ ---
  const handleUpdate = async () => {
    if (!editingItem) return;
    try {
      await api.post(`/students/${studentId}/progress`, [
        {
          id: editingItem.id,
          completed_units: editCompleted,
          total_units: editTotal
        }
      ]);
      setEditingItem(null);
      fetchData();
      onUpdate?.();
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  };

  const handleDelete = async (item: ProgressItem) => {
    if (!window.confirm(`「${item.book_name}」を削除しますか？\nこの操作は取り消せません。`)) return;

    try {
      await api.delete(`/dashboard/progress/${item.id}`);
      fetchData();
      onUpdate?.();
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  const handleAddBatch = async () => {
    if (selectedBooks.length === 0) return;

    const bookIds = selectedBooks.filter(b => !b.isCustom && b.masterId).map(b => b.masterId!);
    const customBooks = selectedBooks.filter(b => b.isCustom).map(b => ({
      subject: b.subject,
      level: b.level,
      book_name: b.book_name,
      duration: b.duration
    }));

    try {
      await api.post('/dashboard/progress/batch', {
        student_id: studentId,
        book_ids: bookIds,
        custom_books: customBooks
      });
      setIsAddModalOpen(false);
      setSelectedBooks([]);
      fetchData();
      onUpdate?.();
    } catch (e) { alert("登録失敗"); }
  };

  const moveToRight = (book: MasterBook) => {
    if (!selectedBooks.find(b => b.masterId === book.id)) {
      const candidate: BookCandidate = {
        tempId: `m_${book.id}`,
        masterId: book.id,
        subject: book.subject,
        level: book.level,
        book_name: book.book_name,
        duration: book.duration,
        isCustom: false
      };
      setSelectedBooks([...selectedBooks, candidate]);
    }
  };

  const addPresetToRight = (preset: Preset) => {
    let addedCount = 0;
    const newCandidates = [...selectedBooks];

    preset.books.forEach(book => {
      const uniqueKey = book.id ? `m_${book.id}` : `p_${preset.id}_${book.book_name}`;
      const exists = newCandidates.find(b =>
        b.tempId === uniqueKey || (book.id && b.masterId === book.id)
      );

      if (!exists) {
        newCandidates.push({
          tempId: uniqueKey,
          masterId: book.id || undefined,
          subject: book.subject,
          level: book.level,
          book_name: book.book_name,
          duration: book.duration,
          isCustom: !book.is_master
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setSelectedBooks(newCandidates);
    } else {
      alert("このプリセットの参考書は既に追加候補に含まれています");
    }
  };

  const addCustomBook = () => {
    if (!customForm.subject || !customForm.book_name) {
      alert("科目と参考書名は必須です");
      return;
    }
    const candidate: BookCandidate = {
      tempId: `c_${Date.now()}`,
      subject: customForm.subject,
      level: customForm.level || "カスタム",
      book_name: customForm.book_name,
      duration: customForm.duration,
      isCustom: true
    };
    setSelectedBooks([...selectedBooks, candidate]);
    setCustomForm({ subject: "", level: "", book_name: "", duration: 0 });
  };

  const removeFromRight = (tempId: string) => {
    setSelectedBooks(selectedBooks.filter(b => b.tempId !== tempId));
  };

  // フィルタ関数
  const filterMasterBooks = (books: MasterBook[], filter: typeof filterLeft) => {
    return books.filter(b => {
      const matchSubj = filter.subject === "" || b.subject === filter.subject;
      const matchLevel = filter.level === "" || b.level === filter.level;
      const matchName = filter.name === "" || b.book_name.includes(filter.name);
      return matchSubj && matchLevel && matchName;
    });
  };

  const filterCandidates = (books: BookCandidate[], filter: typeof filterRight) => {
    return books.filter(b => {
      const matchSubj = filter.subject === "" || b.subject === filter.subject;
      const matchLevel = filter.level === "" || b.level === filter.level;
      const matchName = filter.name === "" || b.book_name.includes(filter.name);
      return matchSubj && matchLevel && matchName;
    });
  };

  // --- サブコンポーネント ---

  // 1. プリセット一覧
  const renderLeftColumnPresetList = () => {
    const filteredPresets = presets.filter(p =>
      filterPresetSubject === "" || p.subject === filterPresetSubject
    );

    const toggleExpand = (id: number) => {
      setExpandedPresetId(expandedPresetId === id ? null : id);
    };

    return (
      <div className="border rounded-md flex flex-col h-full overflow-hidden bg-white">
        <div className="p-3 bg-purple-50/50 font-bold text-sm border-b text-purple-900 flex items-center">
          <Layers className="w-4 h-4 mr-2" />
          プリセット一覧
        </div>
        <div className="p-2 border-b bg-gray-50/50">
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
            value={filterPresetSubject}
            onChange={e => setFilterPresetSubject(e.target.value)}
          >
            <option value="">科目: 全て</option>
            {masterSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredPresets.map(preset => {
            const isExpanded = expandedPresetId === preset.id;
            return (
              <div key={preset.id} className="border rounded bg-white hover:bg-gray-50 transition-colors">
                <div className="p-2 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-[10px] bg-purple-100 text-purple-800 px-1.5 rounded w-fit mb-1">
                      {preset.subject}
                    </div>
                    <div className="text-sm font-bold text-gray-800">{preset.name}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleExpand(preset.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </Button>
                    <Button size="sm" className="h-7 bg-purple-600 hover:bg-purple-700 text-white text-xs px-2" onClick={() => addPresetToRight(preset)}>
                      <Plus className="w-3 h-3" />
                      <span className="ml-1 hidden sm:inline">追加</span>
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-2 bg-gray-50/50 text-xs text-muted-foreground space-y-1 border-t border-dashed">
                    {preset.books.map((b, i) => (
                      <div key={i} className="flex items-center gap-1.5 pl-1">
                        <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                        <span className="truncate">{b.book_name}</span>
                      </div>
                    ))}
                    {preset.books.length === 0 && <span className="pl-1">(参考書なし)</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. マスタ一覧
  const renderLeftColumnMasterList = () => (
    <div className="border rounded-md flex flex-col h-full overflow-hidden bg-white">
      <div className="p-3 bg-muted/30 font-bold text-sm border-b">参考書一覧 (DB)</div>
      <div className="p-2 grid grid-cols-3 gap-2 border-b bg-gray-50/50">
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={filterLeft.subject}
          onChange={e => setFilterLeft({ ...filterLeft, subject: e.target.value })}
        >
          <option value="">科目: 全て</option>
          {masterSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={filterLeft.level}
          onChange={e => setFilterLeft({ ...filterLeft, level: e.target.value })}
        >
          <option value="">レベル: 全て</option>
          {masterLevels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <Input placeholder="名称" className="h-8 text-xs"
          value={filterLeft.name} onChange={e => setFilterLeft({ ...filterLeft, name: e.target.value })} />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filterMasterBooks(masterBooks, filterLeft).map(book => (
          <div key={book.id} className="flex items-center justify-between p-2 border rounded bg-white hover:bg-gray-50 transition-colors">
            <div>
              <div className="text-xs text-muted-foreground">{book.subject} / {book.level}</div>
              <div className="text-sm font-medium">{book.book_name}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveToRight(book)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  // 3. カスタムフォーム
  const renderLeftColumnCustomForm = () => (
    <div className="border rounded-md flex flex-col h-full overflow-hidden bg-yellow-50/50">
      <div className="p-3 font-bold text-sm text-yellow-800 flex items-center border-b border-yellow-200 bg-yellow-100/30">
        <BookOpen className="w-4 h-4 mr-2" />
        新しい参考書を入力
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-yellow-900">科目 <span className="text-red-500">*</span></label>
              <Button
                variant="link"
                className="h-auto p-0 text-[10px] text-yellow-700"
                onClick={() => {
                  setIsCustomSubjectManual(!isCustomSubjectManual);
                  setCustomForm({ ...customForm, subject: "" });
                }}
              >
                {isCustomSubjectManual ? "リストから選択" : "手入力する"}
              </Button>
            </div>

            {!isCustomSubjectManual && masterSubjects.length > 0 ? (
              <Select value={customForm.subject} onValueChange={v => setCustomForm({ ...customForm, subject: v })}>
                <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {masterSubjects.map(subj => (
                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input placeholder="例: 英語" className="bg-white h-9 text-xs"
                value={customForm.subject} onChange={e => setCustomForm({ ...customForm, subject: e.target.value })} />
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-yellow-900">レベル</label>
              <Button
                variant="link"
                className="h-auto p-0 text-[10px] text-yellow-700"
                onClick={() => {
                  setIsCustomLevelManual(!isCustomLevelManual);
                  setCustomForm({ ...customForm, level: "" });
                }}
              >
                {isCustomLevelManual ? "リストから選択" : "手入力する"}
              </Button>
            </div>

            {!isCustomLevelManual && masterLevels.length > 0 ? (
              <Select value={customForm.level} onValueChange={v => setCustomForm({ ...customForm, level: v })}>
                <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {masterLevels.map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input placeholder="例: 基礎" className="bg-white h-9 text-xs"
                value={customForm.level} onChange={e => setCustomForm({ ...customForm, level: e.target.value })} />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-yellow-900">参考書名 <span className="text-red-500">*</span></label>
          <Input placeholder="参考書名を入力" className="bg-white h-9 text-xs"
            value={customForm.book_name} onChange={e => setCustomForm({ ...customForm, book_name: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-yellow-900">目安時間 (h)</label>
          <div className="flex items-center gap-2">
            <div className="relative w-24">
              <Clock className="w-3 h-3 absolute left-2 top-3 text-gray-400" />
              <Input type="number" placeholder="0" className="bg-white h-9 text-xs pl-7"
                value={customForm.duration || ""} onChange={e => setCustomForm({ ...customForm, duration: Number(e.target.value) })} />
            </div>
            <span className="text-xs text-muted-foreground">時間</span>
          </div>
        </div>

        <div className="pt-4">
          <Button size="sm" onClick={addCustomBook} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white h-9">
            <Plus className="w-4 h-4 mr-2" />
            リストに追加
          </Button>
        </div>
      </div>
    </div>
  );

  const renderRightColumnSelectedList = () => (
    <div className="border rounded-md flex flex-col h-full overflow-hidden bg-white">
      <div className="p-3 bg-blue-50/50 font-bold text-sm border-b text-blue-700 flex justify-between items-center">
        <span>追加候補リスト</span>
        <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
          {selectedBooks.length}件
        </span>
      </div>

      <div className="p-2 grid grid-cols-3 gap-2 border-b bg-gray-50/50">
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={filterRight.subject}
          onChange={e => setFilterRight({ ...filterRight, subject: e.target.value })}
        >
          <option value="">科目: 全て</option>
          {masterSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={filterRight.level}
          onChange={e => setFilterRight({ ...filterRight, level: e.target.value })}
        >
          <option value="">レベル: 全て</option>
          {masterLevels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <Input placeholder="名称" className="h-8 text-xs"
          value={filterRight.name} onChange={e => setFilterRight({ ...filterRight, name: e.target.value })} />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filterCandidates(selectedBooks, filterRight).length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-50">
            <BookOpen className="w-8 h-8" />
            <span className="text-xs">左列から追加してください</span>
          </div>
        )}
        {filterCandidates(selectedBooks, filterRight).map(book => (
          <div key={book.tempId} className="flex items-center justify-between p-2 border rounded bg-white hover:bg-gray-50 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-medium text-gray-500 border px-1 rounded">{book.subject}</span>
                {book.isCustom && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200">カスタム</span>}
              </div>
              <div className="text-sm font-medium">{book.book_name}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeFromRight(book.tempId)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="p-3 border-t bg-gray-50 flex justify-end">
        <Button size="sm" onClick={handleAddBatch} disabled={selectedBooks.length === 0} className="w-32">
          登録する ({selectedBooks.length})
        </Button>
      </div>
    </div>
  );

  // 🌟 追加: 表示用リストをグラフと同じルールで並び替える
  const levelOrder = ["基礎徹底", "日大", "MARCH", "早慶"];
  const sortedList = [...filteredList].sort((a, b) => {
    const lvlA = a.level || "その他";
    const lvlB = b.level || "その他";

    // levelOrder のキーワードが、実際のレベル名(lvlA)に含まれているか探す
    const aIndex = levelOrder.findIndex(keyword => lvlA.includes(keyword));
    const bIndex = levelOrder.findIndex(keyword => lvlB.includes(keyword));

    const aRank = aIndex === -1 ? 99 : aIndex;
    const bRank = bIndex === -1 ? 99 : bIndex;

    return aRank - bRank;
  });

  return (
    // 🌟 修正1：外枠に min-h-0 を追加（これで親要素を突き破らなくなります）
    <div className="h-[600px] flex flex-col space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap border ${selectedSubject === subj
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-muted-foreground border-gray-200 hover:bg-gray-100"
                }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 ml-2 pt-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-3 h-3 mr-1" /> 追加
            </Button>
            <Button
              size="sm"
              variant={isEditingMode ? "secondary" : "outline"}
              className={`h-7 text-xs ${isEditingMode ? "bg-gray-200 hover:bg-gray-300" : ""}`}
              onClick={() => setIsEditingMode(!isEditingMode)}
            >
              {isEditingMode ? (
                <>
                  <X className="w-3 h-3 mr-1" /> 完了
                </>
              ) : (
                <>
                  <Pencil className="w-3 h-3 mr-1" /> 編集
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 🌟 修正2：ここにも min-h-0 を追加し、overflow-y-auto で縦スクロールを有効化 */}
      <div className="flex-1 min-h-0 border rounded-md relative bg-white [&>div]:h-full">
        <Table>
          {/* 🌟 修正3：sticky top-0 と bg-gray-50 をつけて、見出しを上部に固定！ */}
          <TableHeader className="sticky top-0 z-20 bg-gray-50 ring-1 ring-gray-200 shadow-sm">
            <TableRow>
              <TableHead>参考書</TableHead>
              <TableHead className="text-center w-24">進捗</TableHead>
              <TableHead className="text-right w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedList.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground text-xs">
                  データがありません。「追加」ボタンから登録してください。
                </TableCell>
              </TableRow>
            )}
            {sortedList.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="text-xs text-muted-foreground mb-0.5">
                    {item.subject} / {item.level || 'カスタム'}
                  </div>
                  {item.book_name}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {item.completed_units} / {item.total_units}
                </TableCell>
                <TableCell className="text-right">
                  {!readOnly && (
                    isEditingMode ? (
                      <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        setEditingItem(item);
                        setEditCompleted(item.completed_units);
                        setEditTotal(item.total_units);
                      }}>
                        更新
                      </Button>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 編集モーダル */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>進捗を更新</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm font-medium">{editingItem?.book_name}</p>
            <div className="flex items-center gap-4">
              <div className="grid gap-2 flex-1">
                <label className="text-xs">完了数</label>
                <Input type="number" value={editCompleted} onChange={(e) => setEditCompleted(Number(e.target.value))} onFocus={(e) => e.target.select()} />
              </div>
              <span className="mt-6 text-xl">/</span>
              <div className="grid gap-2 flex-1">
                <label className="text-xs">総数</label>
                <Input type="number" value={editTotal} onChange={(e) => setEditTotal(Number(e.target.value))} onFocus={(e) => e.target.select()} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 追加モーダル（変更なし） */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle>参考書を追加</DialogTitle>
            </DialogHeader>
          </div>

          <Tabs defaultValue="preset" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preset">プリセットから登録</TabsTrigger>
                <TabsTrigger value="individual">個別に登録</TabsTrigger>
                <TabsTrigger value="custom">カスタム登録</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden p-6 pt-4 bg-gray-50/50">
              <TabsContent value="preset" className="h-full m-0 data-[state=active]:flex flex-col">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {renderLeftColumnPresetList()}
                  {renderRightColumnSelectedList()}
                </div>
              </TabsContent>

              <TabsContent value="individual" className="h-full m-0 data-[state=active]:flex flex-col">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {renderLeftColumnMasterList()}
                  {renderRightColumnSelectedList()}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="h-full m-0 data-[state=active]:flex flex-col">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {renderLeftColumnCustomForm()}
                  {renderRightColumnSelectedList()}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}