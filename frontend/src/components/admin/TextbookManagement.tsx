import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus, Trash2, Search, Filter, Edit, Save, X } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function TextbookManagement() {
    const confirm = useConfirm();
    const [textbooks, setTextbooks] = useState<any[]>([]);
    
    // 編集モード管理
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // フォームデータ
    const [formData, setFormData] = useState({
        book_name: '',
        subject: '英語',
        level: '基礎徹底',
        duration: 0
    });

    // フィルター
    const [filterSubject, setFilterSubject] = useState("ALL");
    const [filterLevel, setFilterLevel] = useState("ALL");
    const [filterName, setFilterName] = useState("");

    const fetchBooks = async () => {
        try { 
            const res = await api.get('/common/textbooks'); 
            
            // 科目のカスタム順序
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

            // レベルのカスタム順序
            const levelOrder: Record<string, number> = {
                "基礎徹底": 1,
                "日大": 2,
                "MARCH": 3,
                "早慶": 4
            };

            // 取得したデータをソートする
            const sortedData = [...res.data].sort((a, b) => {
                // 1. 科目で比較
                const subjA = subjectOrder[a.subject] || 99;
                const subjB = subjectOrder[b.subject] || 99;
                if (subjA !== subjB) {
                    return subjA - subjB;
                }
                
                // 2. レベルで比較
                const rankA = levelOrder[a.level] || 99;
                const rankB = levelOrder[b.level] || 99;
                if (rankA !== rankB) {
                    return rankA - rankB;
                }
                
                // 3. 50音順 (参考書名)
                return a.book_name.localeCompare(b.book_name, 'ja');
            });

            // ソート済みのデータをセットする
            setTextbooks(sortedData); 
        } 
        catch (e) { 
            toast.error("データ取得失敗"); 
        }
    };
    useEffect(() => { fetchBooks(); }, []);

    // ユニークな科目リスト生成
    const uniqueSubjects = Array.from(new Set(textbooks.map(t => t.subject).filter(Boolean)));
    if (uniqueSubjects.length === 0) uniqueSubjects.push("英語", "数学", "国語");

    const uniqueLevels = Array.from(new Set(textbooks.map(t => t.level).filter(Boolean)));
    if (uniqueLevels.length === 0) uniqueLevels.push("基礎徹底", "日大", "MARCH", "早慶");

    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [isCustomLevel, setIsCustomLevel] = useState(false);

    // 編集開始
    const startEdit = (book: any) => {
        setIsEditing(true);
        setEditId(book.id);
        setFormData({
            book_name: book.book_name,
            subject: book.subject,
            level: book.level,
            duration: book.duration
        });
    };

    // 編集キャンセル
    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ book_name: '', subject: '英語', level: '基礎徹底', duration: 0 });
    };

    // 保存 (新規作成 or 更新)
    const handleSave = async () => {
        if (!formData.book_name) return toast.error("参考書名は必須です");
        if (!formData.subject) return toast.error("科目を選択してください");

        try {
            if (isEditing && editId) {
                // 更新
                await api.patch(`/admin/textbooks/${editId}`, formData);
                toast.success("更新しました");
            } else {
                // 新規
                await api.post('/admin/textbooks', formData);
                toast.success("登録しました");
            }
            fetchBooks();
            cancelEdit();
        } catch (e) { toast.error("保存失敗"); }
    };

const handleDelete = async (id: number) => {
        // 🚨 3. window.confirm を消して、自作の confirm に置き換え！
        const isOk = await confirm({
            title: "参考書を削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });

        if (!isOk) return;

        try {
            await api.delete(`/admin/textbooks/${id}`);
            toast.success("削除しました");
            fetchBooks();
        } catch (e) { 
            toast.error("削除失敗"); 
        }
    };

    // フィルタリング
    const filteredTextbooks = textbooks.filter(t => {
        const matchSubject = filterSubject === "ALL" || t.subject === filterSubject;
        const matchLevel = filterLevel === "ALL" || t.level === filterLevel;
        const matchName = t.book_name.toLowerCase().includes(filterName.toLowerCase());
        return matchSubject && matchLevel && matchName;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
            
            {/* 左列: フォーム (4/12) */}
            <Card className="lg:col-span-4 bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        {isEditing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isEditing ? "参考書を編集" : "新規参考書登録"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label>参考書名 <span className="text-red-500">*</span></Label>
                        <Input 
                            value={formData.book_name} 
                            onChange={e => setFormData({ ...formData, book_name: e.target.value })} 
                            placeholder="例: システム英単語"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label>科目 <span className="text-red-500">*</span></Label>
                            <Button 
                                variant="link" 
                                className="h-auto p-0 text-[10px] text-blue-600 mb-1" 
                                onClick={() => {
                                    setIsCustomSubject(!isCustomSubject);
                                    setFormData({...formData, subject: ""});
                                }}
                            >
                                {isCustomSubject ? "リストから選択" : "手入力する"}
                            </Button>
                        </div>
                        
                        {!isCustomSubject && uniqueSubjects.length > 0 ? (
                            <Select value={formData.subject} onValueChange={v => setFormData({ ...formData, subject: v })}>
                                <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {uniqueSubjects.map((subj: any) => (
                                        <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                placeholder="例: 情報、小論文" 
                                value={formData.subject} 
                                onChange={e => setFormData({ ...formData, subject: e.target.value })} 
                            />
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label>レベル</Label>
                            <Button 
                                variant="link" 
                                className="h-auto p-0 text-[10px] text-blue-600 mb-1" 
                                onClick={() => {
                                    setIsCustomLevel(!isCustomLevel);
                                    setFormData({...formData, level: ""});
                                }}
                            >
                                {isCustomLevel ? "リストから選択" : "手入力する"}
                            </Button>
                        </div>

                        {!isCustomLevel && uniqueLevels.length > 0 ? (
                            <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                                <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {uniqueLevels.map((lvl: any) => (
                                        <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                placeholder="例: 東大、地方国公立" 
                                value={formData.level} 
                                onChange={e => setFormData({ ...formData, level: e.target.value })} 
                            />
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label>所要時間 (h)</Label>
                        <Input 
                            type="number" 
                            value={formData.duration} 
                            onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })} 
                            min={0}
                        />
                    </div>

                    <div className="flex gap-2 mt-4">
                        {isEditing && (
                            <Button variant="outline" className="flex-1" onClick={cancelEdit}>
                                <X className="w-4 h-4 mr-2" /> キャンセル
                            </Button>
                        )}
                        <Button className="flex-1" onClick={handleSave}>
                            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {isEditing ? "更新する" : "追加する"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 右列: 一覧 (8/12) */}
            <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                        <Filter className="w-4 h-4" /> 絞り込み:
                    </div>
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="全科目" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL">全科目</SelectItem>
                            {uniqueSubjects.map((subj: any) => (
                                <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterLevel} onValueChange={setFilterLevel}>
                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="全レベル" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">全レベル</SelectItem>
                            {uniqueLevels.map((lvl: any) => (
                                <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex-1 w-full relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input 
                            placeholder="参考書名で検索..." 
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="overflow-auto flex-1">
                        <Table>
                            <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead>参考書名</TableHead>
                                    <TableHead className="w-24">科目</TableHead>
                                    <TableHead className="w-24">レベル</TableHead>
                                    <TableHead className="w-16 text-right">時間</TableHead>
                                    <TableHead className="w-24 text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTextbooks.map((t: any) => (
                                    <TableRow key={t.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-medium py-2">{t.book_name}</TableCell>
                                        <TableCell className="py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                {t.subject}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-muted-foreground">{t.level}</TableCell>
                                        <TableCell className="text-right py-2 text-xs">{t.duration}h</TableCell>
                                        <TableCell className="py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={() => startEdit(t)}>
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(t.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}