import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus, Trash2, Search, Filter, Edit, Save, X, Globe, Building2, Info, Calendar as CalendarIcon } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Badge } from '../ui/badge';
import { SchoolEvent } from '../../types';

export default function SchoolEventManagement() {
    const confirm = useConfirm();
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [userRoleStr, setUserRoleStr] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        title: '',
        start_date: today,
        end_date: today,
        category: 'event',
        description: ''
    });

    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterTitle, setFilterTitle] = useState("");

    const categoryLabels: Record<string, string> = {
        'exam': '模試・試験',
        'holiday': '休校日',
        'event': '校舎行事',
        'other': 'その他'
    };

    const fetchData = async () => {
        try {
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

            const res = await api.get('/calendar/events');
            // 日付が近い順にソート
            const sortedData = res.data.sort((a: SchoolEvent, b: SchoolEvent) =>
                new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
            );
            setEvents(sortedData);
        } catch (e) {
            toast.error("データ取得失敗");
        }
    };

    useEffect(() => { fetchData(); }, []);

    const canEditOrDelete = (event: SchoolEvent) => {
        if (userRoleStr.includes("developer") || userRoleStr.includes("super")) return true;
        return event.school_id !== null && event.school_id !== undefined;
    };

    const startEdit = (event: SchoolEvent) => {
        setIsEditing(true);
        setEditId(event.id);
        setFormData({
            title: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
            category: event.category,
            description: event.description || ''
        });
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ title: '', start_date: today, end_date: today, category: 'event', description: '' });
    };

    const handleSave = async () => {
        if (!formData.title) return toast.error("タイトルは必須です");
        if (formData.start_date > formData.end_date) return toast.error("終了日は開始日以降にしてください");

        try {
            if (isEditing && editId) {
                // 更新はエンドポイントがないため、一度削除して作り直すか、APIを追加する必要がありますが、
                // 今回は既存の POST と DELETE で対応するか、APIにPATCHを追加前提で書きます。
                // （もしバックエンドに PATCH /events/{id} が無ければ後で追加推奨）
                await api.post('/calendar/events', formData); // 暫定対応: もし編集APIを作っていなければ新規作成になってしまうので注意
                if (editId) await api.delete(`/calendar/events/${editId}`);
                toast.success("更新しました");
            } else {
                await api.post('/calendar/events', formData);
                toast.success("登録しました");
            }
            fetchData();
            cancelEdit();
        } catch (e) { toast.error("保存失敗"); }
    };

    const handleDelete = async (id: number) => {
        const isOk = await confirm({
            title: "予定を削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });
        if (!isOk) return;

        try {
            await api.delete(`/calendar/events/${id}`);
            toast.success("削除しました");
            fetchData();
        } catch (e) { toast.error("削除失敗"); }
    };

    const filteredEvents = events.filter(e => {
        const matchCategory = filterCategory === "ALL" || e.category === filterCategory;
        const matchTitle = e.title.toLowerCase().includes(filterTitle.toLowerCase());
        return matchCategory && matchTitle;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
            {/* 左列: フォーム */}
            <Card className="lg:col-span-4 bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        {isEditing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isEditing ? "予定を編集" : "新規予定登録"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-pink-50 text-pink-800 p-3 rounded-md text-xs flex items-start gap-2 border border-pink-100">
                        <Info className="w-4 h-4 mt-0.5 shrink-0 text-pink-500" />
                        <div>
                            {userRoleStr.includes("developer") || userRoleStr.includes("super")
                                ? <span>あなたの権限では、<strong>「テナント全体共通」</strong>の予定としてカレンダーに表示されます。</span>
                                : <span>あなたの権限では、<strong>「自校舎専用」</strong>の予定としてカレンダーに表示されます。</span>
                            }
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>タイトル <span className="text-red-500">*</span></Label>
                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="例: 第1回 全統マーク模試" />
                    </div>

                    <div className="space-y-1">
                        <Label>カテゴリ <span className="text-red-500">*</span></Label>
                        <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(categoryLabels).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>開始日 <span className="text-red-500">*</span></Label>
                            <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>終了日 <span className="text-red-500">*</span></Label>
                            <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        {isEditing && (
                            <Button variant="outline" className="flex-1" onClick={cancelEdit}><X className="w-4 h-4 mr-2" /> キャンセル</Button>
                        )}
                        <Button className="flex-1 bg-pink-600 hover:bg-pink-700 text-white" onClick={handleSave}>
                            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {isEditing ? "更新する" : "追加する"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 右列: 一覧 */}
            <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                        <Filter className="w-4 h-4" /> 絞り込み:
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="全カテゴリ" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">全カテゴリ</SelectItem>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex-1 w-full relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input placeholder="タイトルで検索..." value={filterTitle} onChange={e => setFilterTitle(e.target.value)} className="h-9 pl-8 text-xs" />
                    </div>
                </div>

                <div className="border rounded-md bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="overflow-auto flex-1">
                        <Table>
                            <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-24">公開範囲</TableHead>
                                    <TableHead>期間</TableHead>
                                    <TableHead>タイトル</TableHead>
                                    <TableHead className="w-24">カテゴリ</TableHead>
                                    <TableHead className="w-20 text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEvents.map((e) => (
                                    <TableRow key={e.id} className="hover:bg-gray-50/50">
                                        <TableCell className="py-2">
                                            {e.school_id === null || e.school_id === undefined ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-none whitespace-nowrap"><Globe className="w-3 h-3 mr-1" />共通</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal shadow-none whitespace-nowrap"><Building2 className="w-3 h-3 mr-1" />自校舎</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs font-mono">
                                            {e.start_date === e.end_date ? e.start_date : `${e.start_date} ~ ${e.end_date}`}
                                        </TableCell>
                                        <TableCell className="font-medium py-2 text-sm">{e.title}</TableCell>
                                        <TableCell className="py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                                                {categoryLabels[e.category] || e.category}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                            {canEditOrDelete(e) ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={() => startEdit(e)}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(e.id)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">編集不可</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredEvents.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">予定がありません</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}