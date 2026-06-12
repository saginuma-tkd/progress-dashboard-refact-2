import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus, Trash2, Search, Filter, Edit, Save, X, Globe, Building2, Info } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Badge } from '../ui/badge';

// 🌟 バックエンドから取得する型の定義を追加
interface RouteLevel {
    id: number;
    level_name: string;
    sequence_order: number;
}
interface TenantSubject {
    id: number;
    name: string;
}

export default function TextbookManagement() {
    const confirm = useConfirm();
    const [textbooks, setTextbooks] = useState<any[]>([]);

    // 🌟 テナントの公式設定を保持するState
    const [tenantSubjects, setTenantSubjects] = useState<TenantSubject[]>([]);
    const [tenantLevels, setTenantLevels] = useState<RouteLevel[]>([]);

    const [userRoleStr, setUserRoleStr] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // フォームデータ (初期値は後で動的にセットします)
    const [formData, setFormData] = useState({
        book_name: '',
        subject: '',
        level: '',
        duration: 0
    });

    const [filterSubject, setFilterSubject] = useState("ALL");
    const [filterLevel, setFilterLevel] = useState("ALL");
    const [filterName, setFilterName] = useState("");

    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [isCustomLevel, setIsCustomLevel] = useState(false);

    // 🌟 1. データ取得とソートのロジックを一新！
    const fetchData = async () => {
        try {
            // 権限チェックロジック（そのまま）
            let rawUserData = "";
            const savedUser = localStorage.getItem('user');
            if (savedUser) rawUserData += savedUser;
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (token && token.includes('.')) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    rawUserData += JSON.stringify(payload);
                } catch (e) { }
            }
            setUserRoleStr(rawUserData.toLowerCase());

            // 🌟 APIから設定と参考書を同時に取得
            const [subjRes, levelRes, booksRes] = await Promise.all([
                api.get('/tenant-config/subjects'),
                api.get('/tenant-config/route-levels'),
                api.get('/common/textbooks')
            ]);

            const fetchedSubjects: TenantSubject[] = subjRes.data;
            const fetchedLevels: RouteLevel[] = levelRes.data;

            setTenantSubjects(fetchedSubjects);
            setTenantLevels(fetchedLevels.sort((a, b) => a.sequence_order - b.sequence_order));

            // 🌟 フォームの初期値を、設定の1番目のものに動的に設定する
            if (!isEditing && formData.subject === '') {
                setFormData(prev => ({
                    ...prev,
                    subject: fetchedSubjects.length > 0 ? fetchedSubjects[0].name : '',
                    level: fetchedLevels.length > 0 ? fetchedLevels[0].level_name : ''
                }));
            }

            // 🌟 APIから取得した設定を使って、ソート用の順序マップを動的に作成！
            const dynamicSubjectOrder: Record<string, number> = {};
            fetchedSubjects.forEach((s, index) => { dynamicSubjectOrder[s.name] = index + 1; });

            const dynamicLevelOrder: Record<string, number> = {};
            fetchedLevels.forEach(l => { dynamicLevelOrder[l.level_name] = l.sequence_order; });

            // 取得したデータを動的マップでソート
            const sortedData = [...booksRes.data].sort((a, b) => {
                const subjA = dynamicSubjectOrder[a.subject] || 999;
                const subjB = dynamicSubjectOrder[b.subject] || 999;
                if (subjA !== subjB) return subjA - subjB;

                const rankA = dynamicLevelOrder[a.level] || 999;
                const rankB = dynamicLevelOrder[b.level] || 999;
                if (rankA !== rankB) return rankA - rankB;

                return a.book_name.localeCompare(b.book_name, 'ja');
            });

            setTextbooks(sortedData);
        }
        catch (e) {
            toast.error("データ取得失敗");
        }
    };

    useEffect(() => { fetchData(); }, []);

    const canEditOrDelete = (book: any) => {
        if (userRoleStr.includes("developer") || userRoleStr.includes("admin") || userRoleStr.includes("super")) return true;
        return book.school_id !== null && book.school_id !== undefined;
    };

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

    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        // 🌟 キャンセル時も、テナント設定の1番目の項目に戻す
        setFormData({
            book_name: '',
            subject: tenantSubjects.length > 0 ? tenantSubjects[0].name : '',
            level: tenantLevels.length > 0 ? tenantLevels[0].level_name : '',
            duration: 0
        });
    };

    const handleSave = async () => {
        if (!formData.book_name) return toast.error("参考書名は必須です");
        if (!formData.subject) return toast.error("科目を選択してください");

        try {
            if (isEditing && editId) {
                await api.patch(`/admin/textbooks/${editId}`, formData);
                toast.success("更新しました");
            } else {
                await api.post('/admin/textbooks', formData);
                toast.success("登録しました");
            }
            fetchData();
            cancelEdit();
        } catch (e) { toast.error("保存失敗"); }
    };

    const handleDelete = async (id: number) => {
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
            fetchData();
        } catch (e) {
            toast.error("削除失敗");
        }
    };

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
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-start gap-2 border border-blue-100">
                        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                        <div>
                            {userRoleStr.includes("developer") || userRoleStr.includes("admin") || userRoleStr.includes("super")
                                ? <span>あなたの権限では、<strong>「テナント全体共通」</strong>の参考書として登録されます。</span>
                                : <span>あなたの権限では、<strong>「自校舎専用」</strong>の参考書として登録されます。</span>
                            }
                        </div>
                    </div>

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
                                    setFormData({ ...formData, subject: "" });
                                }}
                            >
                                {isCustomSubject ? "リストから選択" : "手入力する"}
                            </Button>
                        </div>

                        {/* 🌟 2. プルダウンの選択肢をテナント設定から生成 */}
                        {!isCustomSubject && tenantSubjects.length > 0 ? (
                            <Select value={formData.subject} onValueChange={v => setFormData({ ...formData, subject: v })}>
                                <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {tenantSubjects.map(subj => (
                                        <SelectItem key={subj.id} value={subj.name}>{subj.name}</SelectItem>
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
                                    setFormData({ ...formData, level: "" });
                                }}
                            >
                                {isCustomLevel ? "リストから選択" : "手入力する"}
                            </Button>
                        </div>

                        {/* 🌟 プルダウンの選択肢をテナント設定から生成 */}
                        {!isCustomLevel && tenantLevels.length > 0 ? (
                            <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                                <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {tenantLevels.map(lvl => (
                                        <SelectItem key={lvl.id} value={lvl.level_name}>{lvl.level_name}</SelectItem>
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
                            value={formData.duration || ""}
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
                    {/* 🌟 フィルタのプルダウンもテナント設定から生成 */}
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="全科目" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL">全科目</SelectItem>
                            {tenantSubjects.map(subj => (
                                <SelectItem key={subj.id} value={subj.name}>{subj.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterLevel} onValueChange={setFilterLevel}>
                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="全レベル" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL">全レベル</SelectItem>
                            {tenantLevels.map(lvl => (
                                <SelectItem key={lvl.id} value={lvl.level_name}>{lvl.level_name}</SelectItem>
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
                                    <TableHead className="w-24">公開範囲</TableHead>
                                    <TableHead className="w-24">科目</TableHead>
                                    <TableHead className="w-20">レベル</TableHead>
                                    <TableHead className="w-16 text-right">時間</TableHead>
                                    <TableHead className="w-20 text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTextbooks.map((t: any) => (
                                    <TableRow key={t.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-medium py-2">{t.book_name}</TableCell>

                                        <TableCell className="py-2">
                                            {t.school_id === null || t.school_id === undefined ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-none whitespace-nowrap">
                                                    <Globe className="w-3 h-3 mr-1" />共通
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal shadow-none whitespace-nowrap">
                                                    <Building2 className="w-3 h-3 mr-1" />自校舎
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                {t.subject}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-muted-foreground">{t.level}</TableCell>
                                        <TableCell className="text-right py-2 text-xs">{t.duration}h</TableCell>
                                        <TableCell className="py-2 text-right">
                                            {canEditOrDelete(t) ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={() => startEdit(t)}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(t.id)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">編集不可</span>
                                            )}
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