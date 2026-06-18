import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Plus, Trash2, Save, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import { SchoolEvent } from '../../types';

// カレンダー日付生成ユーティリティ
const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length < 35) { days.push(null); }
    return days;
};

export default function SchoolEventManagement() {
    const confirm = useConfirm();
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [userRoleStr, setUserRoleStr] = useState<string>("");

    // カレンダー用状態
    const [currentDate, setCurrentDate] = useState(new Date());
    const calendarDays = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

    // モーダル用状態
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ title: '', start_date: '', end_date: '', category: 'event', description: '' });

    const categoryLabels: Record<string, string> = { 'exam': '模試・試験', 'holiday': '休校日', 'event': '校舎行事', 'other': 'その他' };

    const fetchData = async () => {
        try {
            let rawUserData = localStorage.getItem('user') || "";
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (token && token.includes('.')) {
                try { rawUserData += JSON.stringify(JSON.parse(atob(token.split('.')[1]))); } catch (e) { }
            }
            setUserRoleStr(rawUserData.toLowerCase());

            const res = await api.get('/calendar/events');
            setEvents(res.data);
        } catch (e) { toast.error("データ取得失敗"); }
    };

    useEffect(() => { fetchData(); }, []);

    const canEditOrDelete = (event: SchoolEvent) => {
        if (userRoleStr.includes("developer") || userRoleStr.includes("super")) return true;
        return event.school_id !== null && event.school_id !== undefined;
    };

    // 空の日付セルをクリックしたとき（新規作成）
    const handleDayClick = (day: number | null) => {
        if (!day) return;
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setIsEditing(false);
        setEditId(null);
        setFormData({ title: '', start_date: dateStr, end_date: dateStr, category: 'event', description: '' });
        setIsModalOpen(true);
    };

    // 既存のイベント帯をクリックしたとき（編集）
    const handleEventClick = (e: React.MouseEvent, event: SchoolEvent) => {
        e.stopPropagation();
        if (!canEditOrDelete(event)) return toast.error("この予定は他校舎または上位権限で作成されたため編集できません");
        setIsEditing(true);
        setEditId(event.id);
        setFormData({
            title: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
            category: event.category,
            description: event.description || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title) return toast.error("タイトルは必須です");
        if (formData.start_date > formData.end_date) return toast.error("終了日は開始日以降にしてください");

        try {
            if (isEditing && editId) {
                // PATCHがない前提なので、削除して新規作成で擬似更新
                await api.post('/calendar/events', formData);
                await api.delete(`/calendar/events/${editId}`);
                toast.success("予定を更新しました");
            } else {
                await api.post('/calendar/events', formData);
                toast.success("予定を登録しました");
            }
            fetchData();
            setIsModalOpen(false);
        } catch (e) { toast.error("保存失敗"); }
    };

    const handleDelete = async () => {
        if (!editId) return;
        const isOk = await confirm({ title: "予定を削除しますか？", message: "元に戻せません。", confirmText: "削除する", isDestructive: true });
        if (!isOk) return;

        try {
            await api.delete(`/calendar/events/${editId}`);
            toast.success("削除しました");
            fetchData();
            setIsModalOpen(false);
        } catch (e) { toast.error("削除失敗"); }
    };

    const getDayEvents = (day: number | null) => {
        if (!day) return [];
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(ev => dateStr >= ev.start_date && dateStr <= ev.end_date).map(ev => {
            let color = 'bg-gray-100 text-gray-700 border-gray-200';
            if (ev.category === 'holiday') color = 'bg-red-50 text-red-600 border-red-200';
            else if (ev.category === 'exam') color = 'bg-blue-50 text-blue-600 border-blue-200';
            else if (ev.category === 'event') color = 'bg-orange-50 text-orange-600 border-orange-200';
            return { ...ev, color };
        });
    };

    return (
        <Card className="h-full flex flex-col border shadow-sm">
            <CardContent className="flex-1 overflow-hidden p-4 bg-gray-50/30 flex flex-col">
                {/* カレンダーヘッダー */}
                <div className="flex items-center justify-between mb-4 bg-white p-2 rounded border shadow-sm shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> 前月
                    </Button>
                    <span className="font-bold text-lg">
                        {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                        次月 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>

                {/* カレンダー本体 */}
                <div className="flex-1 bg-white border rounded-md flex flex-col min-h-[600px] shadow-sm">
                    <div className="grid grid-cols-7 border-b bg-gray-50 text-center py-2 text-sm font-medium shrink-0">
                        <div className="text-red-500">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-500">土</div>
                    </div>
                    <div className="flex-1 grid grid-cols-7 grid-rows-5">
                        {calendarDays.map((day, i) => (
                            <div
                                key={i}
                                onClick={() => handleDayClick(day)}
                                className={`border-b border-r p-2 flex flex-col overflow-hidden transition-colors ${(i + 1) % 7 === 0 ? 'border-r-0' : ''} ${!day ? 'bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}
                            >
                                {day && (
                                    <>
                                        <div className="text-xs font-bold text-gray-500 mb-1">{day}</div>
                                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                                            {getDayEvents(day).map((ev, j) => (
                                                <div
                                                    key={j}
                                                    onClick={(e) => handleEventClick(e, ev)}
                                                    className={`text-xs px-1.5 py-1 rounded border truncate ${ev.color} leading-tight shadow-sm cursor-pointer hover:opacity-80`}
                                                >
                                                    <span className="font-bold mr-1">[{categoryLabels[ev.category]?.slice(0, 1) || '他'}]</span>
                                                    {ev.title}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>

            {/* 予定追加・編集モーダル */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader className="bg-gray-50 p-4 border-b -m-6 mb-2 rounded-t-lg">
                        <DialogTitle>{isEditing ? "予定を編集" : "新規予定を登録"}</DialogTitle>
                    </DialogHeader>

                    <div className="bg-blue-50 text-blue-800 p-2 mt-2 rounded text-xs flex items-center gap-2 border border-blue-100">
                        <Info className="w-4 h-4 shrink-0 text-blue-500" />
                        <span>{userRoleStr.includes("developer") ? "「テナント全体」" : "「自校舎専用」"}の予定として登録されます。</span>
                    </div>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1.5">
                            <Label>タイトル <span className="text-red-500">*</span></Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="例: 全統マーク模試" />
                        </div>

                        <div className="space-y-1.5">
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
                            <div className="space-y-1.5">
                                <Label>開始日 <span className="text-red-500">*</span></Label>
                                <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>終了日 <span className="text-red-500">*</span></Label>
                                <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5 border-t pt-4">
                            <Label>詳細（任意）</Label>
                            <textarea
                                className="w-full h-20 text-sm p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="持ち物、時間、対象学年などのメモ"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between items-center sm:justify-between border-t pt-4 -mx-6 px-6 pb-2">
                        {isEditing ? (
                            <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-1" /> 削除
                            </Button>
                        ) : <div></div>}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
                            <Button onClick={handleSave}>{isEditing ? "更新する" : "登録する"}</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}