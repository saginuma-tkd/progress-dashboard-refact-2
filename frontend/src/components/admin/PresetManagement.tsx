import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Library, Plus, Trash2, Edit, ChevronDown, ChevronUp, X, Check, Search, Filter } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function PresetManagement() {
    const confirm = useConfirm();

    const [presets, setPresets] = useState<any[]>([]);
    const [textbooks, setTextbooks] = useState<any[]>([]);
    
    // モーダル制御用
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // フォーム用ステート
    const [formName, setFormName] = useState("");
    const [formSubject, setFormSubject] = useState(""); // 初期値は動的に設定
    const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
    
    // フィルター用ステート (メイン画面: プリセット一覧)
    const [presetFilterSubject, setPresetFilterSubject] = useState("ALL");

    // フィルター用ステート (モーダル内: 参考書検索)
    const [bookFilterName, setBookFilterName] = useState("");
    const [bookFilterLevel, setBookFilterLevel] = useState("ALL");

    // 詳細表示トグル用 (IDの配列)
    const [expandedPresets, setExpandedPresets] = useState<number[]>([]);

    // --- データ取得 ---
    const fetchData = async () => {
        try {
            const [resPresets, resBooks] = await Promise.all([
                api.get('/admin/presets'),
                api.get('/common/textbooks')
            ]);
            
            // --- カスタム順序の定義 ---
            const subjectOrder: Record<string, number> = {
                "英語": 1,
                "数学(文系)": 2,
                "数学(理系)": 3,
                "現代文": 4,
                "古文": 5,
                "漢文": 6,
                "物理": 7,
                "化学": 8,
                "生物": 9,
                "日本史": 10,
                "世界史": 11,
                "政治経済": 12
            };

            const levelOrder: Record<string, number> = {
                "基礎徹底": 1,
                "日大": 2,
                "MARCH": 3,
                "早慶": 4
            };

            // 1. プリセットのソート (科目 ＞ プリセット名の50音順)
            const sortedPresets = [...resPresets.data].sort((a, b) => {
                const subjA = subjectOrder[a.subject] || 99;
                const subjB = subjectOrder[b.subject] || 99;
                if (subjA !== subjB) {
                    return subjA - subjB;
                }
                return a.preset_name.localeCompare(b.preset_name, 'ja');
            });

            // 2. 参考書のソート (科目 ＞ レベル ＞ 参考書名の50音順)
            // ※これをやっておくことで、モーダル内の選択リストも綺麗に並びます！
            const sortedBooks = [...resBooks.data].sort((a, b) => {
                const subjA = subjectOrder[a.subject] || 99;
                const subjB = subjectOrder[b.subject] || 99;
                if (subjA !== subjB) {
                    return subjA - subjB;
                }
                
                const rankA = levelOrder[a.level] || 99;
                const rankB = levelOrder[b.level] || 99;
                if (rankA !== rankB) {
                    return rankA - rankB;
                }
                
                return a.book_name.localeCompare(b.book_name, 'ja');
            });

            // ソート済みのデータをそれぞれセット
            setPresets(sortedPresets);
            setTextbooks(sortedBooks);
            
        } catch (e) {
            toast.error("データ取得に失敗しました");
        }
    };
    useEffect(() => { fetchData(); }, []);

    // --- 動的データの生成 ---
    // 登録済み参考書から科目リストを抽出
    const uniqueSubjects = Array.from(new Set(textbooks.map((t: any) => t.subject).filter(Boolean)));
    // レベルリストを抽出 (固定でも良いが動的にすると柔軟)
    const uniqueLevels = Array.from(new Set(textbooks.map((t: any) => t.level).filter(Boolean)));

    // --- フィルタリングロジック ---
    // 1. メイン画面: プリセット一覧の絞り込み
    const filteredPresets = presets.filter(p => 
        presetFilterSubject === "ALL" || p.subject === presetFilterSubject
    );

    // 2. モーダル内: 選択用参考書リストの絞り込み
    const availableBooks = textbooks.filter((t: any) => {
        // フォームで選択中の科目に一致するもの
        const matchSubject = t.subject === formSubject;
        // 検索条件
        const matchName = t.book_name.toLowerCase().includes(bookFilterName.toLowerCase());
        const matchLevel = bookFilterLevel === "ALL" || t.level === bookFilterLevel;
        
        return matchSubject && matchName && matchLevel;
    });

    // --- モーダル開閉・初期化 ---
    const openCreateModal = () => {
        setEditingId(null);
        setFormName("");
        // 科目の初期値はリストの先頭、なければ英語
        setFormSubject(uniqueSubjects.length > 0 ? uniqueSubjects[0] : "英語");
        setSelectedBooks([]);
        
        // フィルターリセット
        setBookFilterName("");
        setBookFilterLevel("ALL");
        
        setIsModalOpen(true);
    };

    const openEditModal = (preset: any) => {
        setEditingId(preset.id);
        setFormName(preset.preset_name);
        setFormSubject(preset.subject);
        setSelectedBooks(preset.books);
        
        // フィルターリセット
        setBookFilterName("");
        setBookFilterLevel("ALL");

        setIsModalOpen(true);
    };

    // --- 登録・更新処理 ---
    const handleSave = async () => {
        if (!formName) return toast.error("プリセット名は必須です");
        if (selectedBooks.length === 0) return toast.error("参考書を選択してください");

        const payload = {
            subject: formSubject,
            preset_name: formName,
            book_names: selectedBooks
        };

        try {
            if (editingId) {
                await api.put(`/admin/presets/${editingId}`, payload);
                toast.success("更新しました");
            } else {
                await api.post('/admin/presets', payload);
                toast.success("作成しました");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (e) {
            toast.error("保存に失敗しました");
        }
    };

    const handleDelete = async (id: number) => {
        // 🚨 3-1. 自作の confirm に置き換え
        const isOk = await confirm({
            title: "プリセットを削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });

        if (!isOk) return;

        try {
            await api.delete(`/admin/presets/${id}`);
            toast.success("削除しました");
            fetchData();
        } catch (e) { toast.error("削除失敗"); }
    };

    const toggleDetails = (id: number) => {
        setExpandedPresets(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    // --- 参考書選択操作 ---
    const toggleBookSelection = (bookName: string) => {
        setSelectedBooks(prev => 
            prev.includes(bookName) ? prev.filter(b => b !== bookName) : [...prev, bookName]
        );
    };
    const removeBook = (bookName: string) => {
        setSelectedBooks(prev => prev.filter(b => b !== bookName));
    };

    return (
        <div className="space-y-6 h-full">
            {/* ヘッダーエリア */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Library className="w-5 h-5" /> プリセット一覧
                    </h3>
                    
                    {/* プリセット絞り込み */}
                    <div className="flex items-center gap-2 ml-4">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <Select value={presetFilterSubject} onValueChange={setPresetFilterSubject}>
                            <SelectTrigger className="w-[140px] h-8 text-sm">
                                <SelectValue placeholder="全科目" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">全科目</SelectItem>
                                {uniqueSubjects.map((subj: any) => (
                                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" /> 新規プリセット追加
                </Button>
            </div>

            {/* プリセット一覧エリア */}
            <div className="space-y-4">
                {filteredPresets.map((preset: any) => (
                    <Card key={preset.id} className="overflow-hidden">
                        <div className="p-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white min-w-[60px] text-center ${
                                    preset.subject === '英語' ? 'bg-blue-500' :
                                    preset.subject === '数学' ? 'bg-green-500' :
                                    preset.subject === '国語' ? 'bg-red-500' :
                                    'bg-gray-500'
                                }`}>
                                    {preset.subject}
                                </span>
                                <div>
                                    <h4 className="font-bold text-base">{preset.preset_name}</h4>
                                    <p className="text-xs text-muted-foreground">登録参考書数: {preset.books.length}冊</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => toggleDetails(preset.id)}>
                                    {expandedPresets.includes(preset.id) ? (
                                        <>閉じる <ChevronUp className="w-4 h-4 ml-1" /></>
                                    ) : (
                                        <>詳細 <ChevronDown className="w-4 h-4 ml-1" /></>
                                    )}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEditModal(preset)}>
                                    <Edit className="w-4 h-4 text-gray-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(preset.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                        
                        {/* 詳細エリア */}
                        {expandedPresets.includes(preset.id) && (
                            <div className="bg-gray-50 p-4 border-t animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {preset.books.map((book: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded border text-sm shadow-sm">
                                            <Check className="w-3 h-3 text-green-500" />
                                            {book}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
                
                {filteredPresets.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg bg-gray-50">
                        {presets.length === 0 ? "プリセットが登録されていません" : "条件に一致するプリセットがありません"}
                    </div>
                )}
            </div>

            {/* 追加・編集モーダル */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "プリセット編集" : "新規プリセット作成"}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
                        {/* 1. 基本設定フォーム */}
                        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                            <div className="space-y-2">
                                <Label>プリセット名 <span className="text-red-500">*</span></Label>
                                <Input 
                                    value={formName} 
                                    onChange={e => setFormName(e.target.value)} 
                                    placeholder="例: 日大ルート" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>科目</Label>
                                <Select 
                                    value={formSubject} 
                                    // 🚨 3-2. async をつけて、自作の confirm を待つように変更！
                                    onValueChange={async (v) => {
                                        if (v !== formSubject) {
                                            if (selectedBooks.length === 0) {
                                                setFormSubject(v);
                                                setSelectedBooks([]);
                                            } else {
                                                const isOk = await confirm({
                                                    title: "科目を変更しますか？",
                                                    message: "科目を変更すると、現在選択中の参考書リストがクリアされます。よろしいですか？",
                                                    confirmText: "変更してクリア",
                                                    isDestructive: true
                                                });
                                                
                                                if (isOk) {
                                                    setFormSubject(v);
                                                    setSelectedBooks([]);
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {uniqueSubjects.map((subj: any) => (
                                            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* 2. 参考書選択エリア (2カラム) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0">
                            
                            {/* 左列: 参考書リスト (選択元) */}
                            <div className="border rounded-md flex flex-col bg-gray-50 overflow-hidden">
                                {/* リストヘッダー & フィルター */}
                                <div className="p-3 border-b bg-white space-y-3">
                                    <div className="flex justify-between items-center font-medium text-sm">
                                        <span>参考書リスト ({formSubject})</span>
                                        <span className="text-xs text-muted-foreground">{availableBooks.length}冊</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2 top-2.5 w-3 h-3 text-muted-foreground" />
                                            <Input 
                                                className="h-8 pl-7 text-xs" 
                                                placeholder="参考書名で検索" 
                                                value={bookFilterName}
                                                onChange={e => setBookFilterName(e.target.value)}
                                            />
                                        </div>
                                        <Select value={bookFilterLevel} onValueChange={setBookFilterLevel}>
                                            <SelectTrigger className="w-[110px] h-8 text-xs">
                                                <SelectValue placeholder="レベル" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">全レベル</SelectItem>
                                                {uniqueLevels.map((lvl: any) => (
                                                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                {/* リスト本体 */}
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {availableBooks.length > 0 ? availableBooks.map((book: any) => (
                                            <div 
                                                key={book.id} 
                                                className={`flex items-center space-x-2 p-2 rounded cursor-pointer border transition-all ${
                                                    selectedBooks.includes(book.book_name) 
                                                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                                        : 'bg-white border-transparent hover:border-gray-200'
                                                }`}
                                                onClick={() => toggleBookSelection(book.book_name)}
                                            >
                                                <div className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                                                    selectedBooks.includes(book.book_name) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                                                }`}>
                                                    {selectedBooks.includes(book.book_name) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1 text-sm min-w-0">
                                                    <div className="font-medium truncate">{book.book_name}</div>
                                                    <div className="text-xs text-muted-foreground flex gap-2">
                                                        <span>{book.level}</span>
                                                        <span>{book.duration}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-10 text-sm text-muted-foreground">
                                                条件に一致する参考書がありません
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* 右列: 選択済みリスト (追加先) */}
                            <div className="border rounded-md flex flex-col bg-white border-blue-200 overflow-hidden">
                                <div className="p-3 border-b bg-blue-50 font-medium text-sm flex justify-between items-center text-blue-900">
                                    <span>選択済み参考書</span>
                                    <span className="text-xs font-bold bg-blue-200 px-2 py-0.5 rounded-full text-blue-800">{selectedBooks.length}冊</span>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-2">
                                        {selectedBooks.length > 0 ? selectedBooks.map((bookName, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded border bg-gray-50 text-sm group hover:bg-red-50 hover:border-red-100 transition-colors">
                                                <span className="truncate flex-1">{bookName}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-gray-400 group-hover:text-red-500"
                                                    onClick={() => removeBook(bookName)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-20 text-sm text-muted-foreground flex flex-col items-center gap-2">
                                                <Library className="w-8 h-8 text-gray-200" />
                                                <span>左のリストから選択してください</span>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t mt-auto">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
                        <Button onClick={handleSave} className="min-w-[100px]">
                            {editingId ? "更新する" : "作成する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}