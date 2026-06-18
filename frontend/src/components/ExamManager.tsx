// frontend/src/components/ExamManager.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Calendar, FileText, BarChart2, Clock, CheckCircle, ChevronLeft, ChevronRight, Eye, Printer, Edit } from 'lucide-react';
import api from '../lib/api';
import { SchoolEvent } from '../types';
import html2canvas from 'html2canvas';


interface ExamManagerProps {
    studentId: number;
    readOnly?: boolean;
}

// --- 型定義 ---
interface Acceptance {
    id: number;
    university_name: string;
    faculty_name: string;
    department_name: string;
    exam_system: string;
    result: string;
    application_deadline: string;
    exam_date: string;
    announcement_date: string;
    procedure_deadline: string;
}

interface PastExam {
    id: number;
    date: string;
    university_name: string;
    faculty_name: string;
    exam_system: string;
    year: number;
    subject: string;
    time_required: number;
    total_time_allowed: number;
    correct_answers: number;
    total_questions: number;
}

interface MockExam {
    id: number;
    mock_exam_name: string;
    exam_date: string;
    grade: string;
    result_type: string;
    mock_exam_format: string;
    round: string;

    subject_kokugo_desc?: string | number;
    subject_math_desc?: string | number;
    subject_english_desc?: string | number;
    subject_rika1_desc?: string | number;
    subject_rika2_desc?: string | number;
    subject_shakai1_desc?: string | number;
    subject_shakai2_desc?: string | number;

    subject_kokugo_mark?: string | number;
    subject_math1a_mark?: string | number;
    subject_math2bc_mark?: string | number;
    subject_english_r_mark?: string | number;
    subject_english_l_mark?: string | number;
    subject_rika1_mark?: string | number;
    subject_rika2_mark?: string | number;
    subject_shakai1_mark?: string | number;
    subject_shakai2_mark?: string | number;
    subject_rika_kiso1_mark?: string | number;
    subject_rika_kiso2_mark?: string | number;
    subject_info_mark?: string | number;
}

// --- カレンダー用ユーティリティ ---
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

export default function ExamManager({ studentId, readOnly = false }: ExamManagerProps) {
    const [activeTab, setActiveTab] = useState("past_exam");

    // --- State ---
    const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
    const [pastExams, setPastExams] = useState<PastExam[]>([]);
    const [mockExams, setMockExams] = useState<MockExam[]>([]);

    // Modals
    const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);
    const [newAcceptance, setNewAcceptance] = useState<Partial<Acceptance>>({});

    const [isPastModalOpen, setIsPastModalOpen] = useState(false);
    const [newPastExam, setNewPastExam] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        year: new Date().getFullYear(),
        correct_answers: 0, total_questions: 0, time_required: 0, total_time_allowed: 0
    });

    const [isMockModalOpen, setIsMockModalOpen] = useState(false);
    const [selectedMockExam, setSelectedMockExam] = useState<MockExam | null>(null);
    const [isMockDetailOpen, setIsMockDetailOpen] = useState(false);
    const [newMockExam, setNewMockExam] = useState<Partial<MockExam>>({
        result_type: "マーク", mock_exam_name: "", grade: ""
    });

    const [currentDate, setCurrentDate] = useState(new Date());

    const [editingAcceptanceId, setEditingAcceptanceId] = useState<number | null>(null);
    const [editingPastId, setEditingPastId] = useState<number | null>(null);
    const [editingMockId, setEditingMockId] = useState<number | null>(null);

    const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
    const [selectedCalEvent, setSelectedCalEvent] = useState<any>(null);

    // --- データ取得 ---
    const fetchData = async () => {
        try {
            const [accRes, pastRes, mockRes, calRes] = await Promise.all([
                api.get(`/exams/acceptance/${studentId}`),
                api.get(`/exams/pastexam/${studentId}`),
                api.get(`/exams/mock/${studentId}`),
                api.get('/calendar/events')
            ]);
            setAcceptances(accRes.data);
            setPastExams(pastRes.data);
            setMockExams(mockRes.data);
            setSchoolEvents(calRes.data)
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (studentId) fetchData();
    }, [studentId]);

    // --- ハンドラ ---
    const handleSaveAcceptance = async () => {
        try {
            if (editingAcceptanceId) {
                await api.patch(`/exams/acceptance/${editingAcceptanceId}`, newAcceptance);
            } else {
                await api.post('/exams/acceptance', { student_id: studentId, ...newAcceptance });
            }
            setIsAcceptanceModalOpen(false); setNewAcceptance({}); setEditingAcceptanceId(null); fetchData();
        } catch (e) { alert("保存失敗"); }
    };
    const handleDeleteAcceptance = async (id: number) => {
        if (!confirm("削除しますか？")) return;
        try { await api.delete(`/exams/acceptance/${id}`); fetchData(); } catch (e) { alert("削除失敗"); }
    };
    const handleUpdateResult = async (id: number, newResult: string) => {
        try { await api.patch(`/exams/acceptance/${id}`, { result: newResult }); fetchData(); } catch (e) { console.error(e); }
    };

    const handleSavePastExam = async () => {
        try {
            if (editingPastId) {
                await api.patch(`/exams/pastexam/${editingPastId}`, newPastExam);
            } else {
                await api.post('/exams/pastexam', { student_id: studentId, ...newPastExam });
            }
            setIsPastModalOpen(false); setNewPastExam({ date: new Date().toISOString().split('T')[0], year: new Date().getFullYear(), correct_answers: 0, total_questions: 0, time_required: 0, total_time_allowed: 0 }); setEditingPastId(null); fetchData();
        } catch (e) { alert("保存失敗"); }
    };
    const handleDeletePastExam = async (id: number) => {
        if (!confirm("削除しますか？")) return;
        try { await api.delete(`/exams/pastexam/${id}`); fetchData(); } catch (e) { alert("削除失敗"); }
    };

    const handleSaveMockExam = async () => {
        try {
            const formatVal = (val: string | number | undefined) => {
                if (val === "" || val === undefined || val === null) return null;
                return val;
            };

            const payload = {
                student_id: studentId,
                ...newMockExam,
                mock_exam_format: newMockExam.result_type,
                round: newMockExam.round || "1",
                grade: "-",
                subject_kokugo_desc: formatVal(newMockExam.subject_kokugo_desc),
                subject_math_desc: formatVal(newMockExam.subject_math_desc),
                subject_english_desc: formatVal(newMockExam.subject_english_desc),
                subject_rika1_desc: formatVal(newMockExam.subject_rika1_desc),
                subject_rika2_desc: formatVal(newMockExam.subject_rika2_desc),
                subject_shakai1_desc: formatVal(newMockExam.subject_shakai1_desc),
                subject_shakai2_desc: formatVal(newMockExam.subject_shakai2_desc),

                subject_kokugo_mark: formatVal(newMockExam.subject_kokugo_mark),
                subject_math1a_mark: formatVal(newMockExam.subject_math1a_mark),
                subject_math2bc_mark: formatVal(newMockExam.subject_math2bc_mark),
                subject_english_r_mark: formatVal(newMockExam.subject_english_r_mark),
                subject_english_l_mark: formatVal(newMockExam.subject_english_l_mark),
                subject_rika1_mark: formatVal(newMockExam.subject_rika1_mark),
                subject_rika2_mark: formatVal(newMockExam.subject_rika2_mark),
                subject_shakai1_mark: formatVal(newMockExam.subject_shakai1_mark),
                subject_shakai2_mark: formatVal(newMockExam.subject_shakai2_mark),
                subject_rika_kiso1_mark: formatVal(newMockExam.subject_rika_kiso1_mark),
                subject_rika_kiso2_mark: formatVal(newMockExam.subject_rika_kiso2_mark),
                subject_info_mark: formatVal(newMockExam.subject_info_mark),
            };

            if (editingMockId) {
                await api.patch(`/exams/mock/${editingMockId}`, payload);
            } else {
                await api.post('/exams/mock', payload);
            }

            setIsMockModalOpen(false); setNewMockExam({ result_type: "マーク", mock_exam_name: "", grade: "" }); setEditingMockId(null); fetchData();
        } catch (e) { alert("保存失敗"); }
    };
    const handleDeleteMockExam = async (id: number) => {
        if (!confirm("削除しますか？")) return;
        try { await api.delete(`/exams/mock/${id}`); fetchData(); } catch (e) { alert("削除失敗"); }
    };

    const handlePrint = async (type: 'past' | 'mock' | 'acceptance' | 'calendar') => {
        // ...(省略: 既存のPDF出力機能そのまま)
    };

    const calendarDays = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

    const getDayEvents = (day: number | null) => {
        if (!day) return [];
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const events: any[] = []; // 🌟 型を any[] に変更

        // --- 入試日程 ---
        acceptances.forEach(acc => {
            const title = `${acc.university_name} ${acc.faculty_name || ''}`.trim();
            // 🌟 rawData と source を追加
            if (acc.application_deadline === dateStr) events.push({ type: '願書', title, color: 'bg-purple-100 text-purple-800 border-purple-200', source: 'acceptance', rawData: acc });
            if (acc.exam_date === dateStr) events.push({ type: '試験', title, color: 'bg-red-100 text-red-800 border-red-200', source: 'acceptance', rawData: acc });
            if (acc.announcement_date === dateStr) events.push({ type: '発表', title, color: 'bg-green-100 text-green-800 border-green-200', source: 'acceptance', rawData: acc });
            if (acc.procedure_deadline === dateStr) events.push({ type: '手続', title, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', source: 'acceptance', rawData: acc });
        });

        // --- 校舎・テナント共通の予定 ---
        schoolEvents.forEach(ev => {
            if (dateStr >= ev.start_date && dateStr <= ev.end_date) {
                let color = 'bg-gray-100 text-gray-700 border-gray-200';
                let typeName = '予定';

                if (ev.category === 'holiday') { color = 'bg-red-50 text-red-600 border-red-200'; typeName = '休校'; }
                else if (ev.category === 'exam') { color = 'bg-blue-50 text-blue-600 border-blue-200'; typeName = '模試'; }
                else if (ev.category === 'event') { color = 'bg-orange-50 text-orange-600 border-orange-200'; typeName = '行事'; }

                // 🌟 rawData と source を追加
                events.push({ type: typeName, title: ev.title, color, source: 'school_event', rawData: ev });
            }
        });
        return events;
    };

    const DetailRow = ({ label, value }: { label: string, value?: string | number }) => {
        if (value === undefined || value === null || value === "") return null;
        return <div className="flex justify-between border-b border-gray-100 py-1"><span>{label}</span><span className="font-medium">{value}</span></div>;
    };

    return (
        <Card className="h-full flex flex-col border shadow-sm min-h-[85vh]">
            <CardContent className="flex-1 overflow-hidden p-0 bg-gray-50/30 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    {/* 🌟 スマホのときはタブの文字を小さくし、文字を省略してはみ出しを防ぐ */}
                    <div className="px-2 md:px-4 py-2 bg-white border-b shrink-0 overflow-x-auto">
                        <TabsList className="grid w-full grid-cols-4 min-w-[300px]">
                            <TabsTrigger value="past_exam" className="text-[10px] md:text-sm px-1"><Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" /><span className="hidden sm:inline">過去問</span><span className="sm:hidden">過去</span></TabsTrigger>
                            <TabsTrigger value="mock_exam" className="text-[10px] md:text-sm px-1"><BarChart2 className="w-3 h-3 md:w-4 md:h-4 mr-1" /><span className="hidden sm:inline">模試</span><span className="sm:hidden">模試</span></TabsTrigger>
                            <TabsTrigger value="acceptance" className="text-[10px] md:text-sm px-1"><FileText className="w-3 h-3 md:w-4 md:h-4 mr-1" /><span className="hidden sm:inline">入試日程</span><span className="sm:hidden">日程</span></TabsTrigger>
                            <TabsTrigger value="calendar" className="text-[10px] md:text-sm px-1"><Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" /><span className="hidden sm:inline">カレンダー</span><span className="sm:hidden">カレンダ</span></TabsTrigger>
                        </TabsList>
                    </div>

                    {/* === 過去問タブ === */}
                    <TabsContent value="past_exam" className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden m-0 data-[state=inactive]:hidden">
                        <div className="flex justify-end mb-2 shrink-0">
                            {!readOnly && (
                                <Button size="sm" onClick={() => { setEditingPastId(null); setNewPastExam({ date: new Date().toISOString().split('T')[0], year: new Date().getFullYear(), correct_answers: 0, total_questions: 0, time_required: 0, total_time_allowed: 0 }); setIsPastModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-1" /> 結果を記録
                                </Button>
                            )}
                        </div>

                        <div id="past-exam-table" className="flex-1 overflow-y-auto overflow-x-hidden border rounded-md bg-white">
                            {/* 💻 PC用テーブル表示 */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>実施日</TableHead>
                                            <TableHead>大学・年度</TableHead>
                                            <TableHead>科目</TableHead>
                                            <TableHead>得点</TableHead>
                                            <TableHead>時間</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pastExams.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-xs whitespace-nowrap">{item.date}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-bold">{item.university_name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.year}年 / {item.exam_system}</div>
                                                </TableCell>
                                                <TableCell className="text-sm">{item.subject}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                                        <span className="font-bold">{item.correct_answers}</span>
                                                        <span className="text-muted-foreground text-xs">/{item.total_questions}</span>
                                                    </div>
                                                    {item.total_questions > 0 && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {Math.round((item.correct_answers / item.total_questions) * 100)}%
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-blue-500" />
                                                        <span>{item.time_required}分</span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground">規定: {item.total_time_allowed}分</span>
                                                </TableCell>
                                                <TableCell>
                                                    {!readOnly && (
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600" onClick={() => { setEditingPastId(item.id); setNewPastExam(item); setIsPastModalOpen(true); }}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-500" onClick={() => handleDeletePastExam(item.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {pastExams.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">記録がありません</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* 📱 スマホ用カード表示 (ここが最大のポイントです！) */}
                            <div className="md:hidden flex flex-col gap-2 p-2 bg-gray-50/50">
                                {pastExams.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded p-3 flex flex-col gap-2 relative shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-sm text-gray-900">{item.university_name}</div>
                                                <div className="text-[11px] text-gray-500">{item.year}年 / {item.exam_system}</div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{item.date}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">{item.subject}</span>
                                            <div className="flex gap-3 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    <span className="font-bold text-gray-800">{item.correct_answers}</span><span className="text-gray-400">/{item.total_questions}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-blue-500" />
                                                    <span className="font-bold text-gray-800">{item.time_required}</span><span className="text-gray-400">/{item.total_time_allowed}分</span>
                                                </div>
                                            </div>
                                        </div>
                                        {!readOnly && (
                                            <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 mt-1">
                                                <button className="text-gray-500 flex items-center gap-1 hover:text-blue-600" onClick={() => { setEditingPastId(item.id); setNewPastExam(item); setIsPastModalOpen(true); }}>
                                                    <Edit className="w-3 h-3" /><span className="text-[10px]">編集</span>
                                                </button>
                                                <button className="text-gray-400 flex items-center gap-1 hover:text-red-500" onClick={() => handleDeletePastExam(item.id)}>
                                                    <Trash2 className="w-3 h-3" /><span className="text-[10px]">削除</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {pastExams.length === 0 && <div className="text-center py-10 text-xs text-gray-400">記録がありません</div>}
                            </div>
                        </div>
                    </TabsContent>

                    {/* === 模試タブ === */}
                    <TabsContent value="mock_exam" className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden m-0 data-[state=inactive]:hidden">
                        <div className="flex justify-end mb-2 shrink-0">
                            {!readOnly && (
                                <Button size="sm" onClick={() => { setEditingMockId(null); setNewMockExam({ result_type: "マーク", mock_exam_name: "", grade: "" }); setIsMockModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-1" /> 模試を追加
                                </Button>
                            )}
                        </div>
                        <div id="mock-exam-table" className="flex-1 overflow-y-auto overflow-x-hidden border rounded-md bg-white">
                            {/* 💻 PC用テーブル表示 */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>実施日</TableHead>
                                            <TableHead>模試名</TableHead>
                                            <TableHead>形式</TableHead>
                                            <TableHead className="w-20">詳細</TableHead>
                                            <TableHead className="w-16 text-center">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mockExams.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-xs whitespace-nowrap">{item.exam_date}</TableCell>
                                                <TableCell className="font-medium text-sm">{item.mock_exam_name}</TableCell>
                                                <TableCell className="text-xs">{item.result_type}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 py-0 text-blue-500 border border-blue-200 hover:bg-blue-50" onClick={() => { setSelectedMockExam(item); setIsMockDetailOpen(true); }}>
                                                        <Eye className="w-3 h-3 mr-1" />詳細
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    {!readOnly && (
                                                        <div className="flex justify-center gap-1">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600" onClick={() => { setEditingMockId(item.id); setNewMockExam(item); setIsMockModalOpen(true); }}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-500" onClick={() => handleDeleteMockExam(item.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {mockExams.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">記録がありません</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* 📱 スマホ用カード表示 */}
                            <div className="md:hidden flex flex-col gap-2 p-2 bg-gray-50/50">
                                {mockExams.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded p-3 flex flex-col gap-2 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-sm text-gray-900">{item.mock_exam_name}</span>
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{item.exam_date}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1 border-t border-gray-100 pt-2">
                                            <div className="text-[11px] text-gray-600 font-medium">形式: <span className="bg-gray-100 px-1 rounded">{item.result_type}</span></div>
                                            <div className="flex items-center gap-3">
                                                <button className="text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded" onClick={() => { setSelectedMockExam(item); setIsMockDetailOpen(true); }}>
                                                    <Eye className="w-3 h-3" /><span className="text-[10px] font-bold">詳細</span>
                                                </button>
                                                {!readOnly && (
                                                    <div className="flex gap-2">
                                                        <button className="text-gray-500" onClick={() => { setEditingMockId(item.id); setNewMockExam(item); setIsMockModalOpen(true); }}>
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button className="text-gray-400" onClick={() => handleDeleteMockExam(item.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {mockExams.length === 0 && <div className="text-center py-10 text-xs text-gray-400">記録がありません</div>}
                            </div>
                        </div>
                    </TabsContent>

                    {/* === 入試日程タブ === */}
                    <TabsContent value="acceptance" className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden m-0 data-[state=inactive]:hidden">
                        <div className="flex justify-end mb-2 shrink-0">
                            {!readOnly && (
                                <Button size="sm" onClick={() => { setEditingAcceptanceId(null); setNewAcceptance({}); setIsAcceptanceModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-1" /> 日程を追加
                                </Button>
                            )}
                        </div>
                        <div id="acceptance-table" className="flex-1 overflow-y-auto overflow-x-hidden border rounded-md bg-white">
                            {/* 💻 PC用テーブル表示 */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>大学・学部</TableHead>
                                            <TableHead>願書〆切</TableHead>
                                            <TableHead>試験日</TableHead>
                                            <TableHead>発表日</TableHead>
                                            <TableHead>手続締切</TableHead>
                                            <TableHead>結果</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {acceptances.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="text-sm font-bold">{item.university_name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.faculty_name} {item.department_name} ({item.exam_system})</div>
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap text-purple-600 font-medium">{item.application_deadline}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap text-red-600 font-medium">{item.exam_date}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap text-green-600 font-medium">{item.announcement_date}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap text-yellow-600 font-medium">{item.procedure_deadline}</TableCell>
                                                <TableCell>
                                                    <select
                                                        className={`text-xs p-1 rounded border ${item.result === "合格" ? "bg-green-100 text-green-800" :
                                                            item.result === "不合格" ? "bg-red-50 text-red-800" : "bg-gray-50"
                                                            }`}
                                                        value={item.result || "未受験"}
                                                        onChange={(e) => handleUpdateResult(item.id, e.target.value)}
                                                        disabled={readOnly}
                                                    >
                                                        <option value="未受験">未受験</option>
                                                        <option value="合格">合格</option>
                                                        <option value="不合格">不合格</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell>
                                                    {!readOnly && (
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600" onClick={() => { setEditingAcceptanceId(item.id); setNewAcceptance(item); setIsAcceptanceModalOpen(true); }}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-500" onClick={() => handleDeleteAcceptance(item.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {acceptances.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">登録がありません</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* 📱 スマホ用カード表示 */}
                            <div className="md:hidden flex flex-col gap-2 p-2 bg-gray-50/50">
                                {acceptances.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded p-3 flex flex-col gap-2 shadow-sm">
                                        <div className="font-bold text-sm text-gray-900">{item.university_name}</div>
                                        <div className="text-[11px] text-gray-500">{item.faculty_name} {item.department_name} ({item.exam_system})</div>

                                        <div className="grid grid-cols-2 gap-1 text-[10px] mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="text-purple-600 font-medium">願書: {item.application_deadline}</div>
                                            <div className="text-red-600 font-medium">試験: {item.exam_date}</div>
                                            <div className="text-green-600 font-medium">発表: {item.announcement_date}</div>
                                            <div className="text-yellow-600 font-medium">手続: {item.procedure_deadline}</div>
                                        </div>

                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                            <select
                                                className={`text-xs p-1 px-2 rounded font-medium ${item.result === "合格" ? "bg-green-100 text-green-800" :
                                                    item.result === "不合格" ? "bg-red-50 text-red-800" : "bg-gray-100 text-gray-600"
                                                    }`}
                                                value={item.result || "未受験"}
                                                onChange={(e) => handleUpdateResult(item.id, e.target.value)}
                                                disabled={readOnly}
                                            >
                                                <option value="未受験">未受験</option>
                                                <option value="合格">合格</option>
                                                <option value="不合格">不合格</option>
                                            </select>
                                            {!readOnly && (
                                                <div className="flex gap-3">
                                                    <button className="text-gray-500 flex items-center gap-1" onClick={() => { setEditingAcceptanceId(item.id); setNewAcceptance(item); setIsAcceptanceModalOpen(true); }}>
                                                        <Edit className="w-3 h-3" /><span className="text-[10px]">編集</span>
                                                    </button>
                                                    <button className="text-gray-400 flex items-center gap-1" onClick={() => handleDeleteAcceptance(item.id)}>
                                                        <Trash2 className="w-3 h-3" /><span className="text-[10px]">削除</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {acceptances.length === 0 && <div className="text-center py-10 text-xs text-gray-400">登録がありません</div>}
                            </div>
                        </div>
                    </TabsContent>

                    {/* === カレンダータブ === */}
                    <TabsContent value="calendar" className="flex-1 flex flex-col p-2 md:p-4 overflow-y-auto m-0 data-[state=inactive]:hidden">
                        <div className="flex items-center justify-between mb-2 bg-white p-2 rounded border shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-bold text-sm md:text-lg">
                                {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        <div id="calendar-view" className="flex-1 bg-white border rounded-md flex flex-col min-h-[600px] md:min-h-[800px]">
                            <div className="grid grid-cols-7 border-b bg-gray-50 text-center py-2 text-[10px] md:text-sm font-medium shrink-0">
                                <div className="text-red-500">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-500">土</div>
                            </div>
                            <div className="flex-1 grid grid-cols-7 grid-rows-5">
                                {calendarDays.map((day, i) => (
                                    <div key={i} className={`border-b border-r p-1 md:p-2 flex flex-col overflow-hidden ${!day ? 'bg-gray-50' : ''} ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}>
                                        {day && (
                                            <>
                                                <div className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">{day}</div>
                                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                                                    {getDayEvents(day).map((ev, j) => (
                                                        <div
                                                            key={j}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedCalEvent(ev); }} // 🌟 クリックイベント追加
                                                            className={`text-[9px] md:text-xs px-1 md:px-1.5 py-0.5 md:py-1 rounded border truncate ${ev.color} leading-tight shadow-sm cursor-pointer hover:opacity-80 transition-opacity`} // 🌟 cursor-pointer等追加
                                                        >
                                                            <span className="font-bold mr-0.5">[{ev.type.slice(0, 1)}]</span><span className="hidden md:inline">{ev.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>
            </CardContent>

            {/* --- モーダル群 (変更なし) --- */}
            {/* 入試日程追加モーダル */}
            <Dialog open={isAcceptanceModalOpen} onOpenChange={setIsAcceptanceModalOpen}>
                <DialogContent className="w-[90vw] max-w-[500px]">
                    <DialogHeader className="bg-gray-50/50 p-4 border-b -m-6 mb-2 rounded-t-lg"><DialogTitle>入試日程を追加</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Input className="h-8 text-xs" placeholder="大学名" value={newAcceptance.university_name || ''} onChange={e => setNewAcceptance({ ...newAcceptance, university_name: e.target.value })} />
                            <Input className="h-8 text-xs" placeholder="学部" value={newAcceptance.faculty_name || ''} onChange={e => setNewAcceptance({ ...newAcceptance, faculty_name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input className="h-8 text-xs" placeholder="学科" value={newAcceptance.department_name || ''} onChange={e => setNewAcceptance({ ...newAcceptance, department_name: e.target.value })} />
                            <Input className="h-8 text-xs" placeholder="入試方式" value={newAcceptance.exam_system || ''} onChange={e => setNewAcceptance({ ...newAcceptance, exam_system: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1"><label className="text-[10px]">願書〆切</label>
                                <Input className="h-8 text-xs" type="date" value={newAcceptance.application_deadline || ''} onChange={e => setNewAcceptance({ ...newAcceptance, application_deadline: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-[10px]">試験日</label>
                                <Input className="h-8 text-xs" type="date" value={newAcceptance.exam_date || ''} onChange={e => setNewAcceptance({ ...newAcceptance, exam_date: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-[10px]">発表日</label>
                                <Input className="h-8 text-xs" type="date" value={newAcceptance.announcement_date || ''} onChange={e => setNewAcceptance({ ...newAcceptance, announcement_date: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-[10px]">手続締切</label>
                                <Input className="h-8 text-xs" type="date" value={newAcceptance.procedure_deadline || ''} onChange={e => setNewAcceptance({ ...newAcceptance, procedure_deadline: e.target.value })} /></div>
                        </div>
                    </div>
                    <DialogFooter className="mt-2"><Button size="sm" onClick={handleSaveAcceptance}>{editingAcceptanceId ? "更新" : "登録"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 過去問結果モーダル */}
            <Dialog open={isPastModalOpen} onOpenChange={setIsPastModalOpen}>
                <DialogContent className="w-[90vw] max-w-[500px]">
                    <DialogHeader className="bg-gray-50/50 p-4 border-b -m-6 mb-2 rounded-t-lg"><DialogTitle>過去問結果</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Input className="h-8 text-xs" type="date" value={newPastExam.date || ''} onChange={e => setNewPastExam({ ...newPastExam, date: e.target.value })} />
                            <Input className="h-8 text-xs" placeholder="科目" value={newPastExam.subject || ''} onChange={e => setNewPastExam({ ...newPastExam, subject: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input className="h-8 text-xs" placeholder="大学名" value={newPastExam.university_name || ''} onChange={e => setNewPastExam({ ...newPastExam, university_name: e.target.value })} />
                            <Input className="h-8 text-xs" type="number" placeholder="年度" value={newPastExam.year ?? ''} onChange={e => setNewPastExam({ ...newPastExam, year: Number(e.target.value) })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px]">正解/総問</label>
                                <div className="flex gap-2">
                                    <Input className="h-8 text-xs" type="number" placeholder="正解" value={newPastExam.correct_answers ?? ''} onChange={e => setNewPastExam({ ...newPastExam, correct_answers: Number(e.target.value) })} />
                                    <Input className="h-8 text-xs" type="number" placeholder="総問" value={newPastExam.total_questions ?? ''} onChange={e => setNewPastExam({ ...newPastExam, total_questions: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px]">時間(所要/制限)</label>
                                <div className="flex gap-2">
                                    <Input className="h-8 text-xs" type="number" placeholder="所要" value={newPastExam.time_required ?? ''} onChange={e => setNewPastExam({ ...newPastExam, time_required: Number(e.target.value) })} />
                                    <Input className="h-8 text-xs" type="number" placeholder="制限" value={newPastExam.total_time_allowed ?? ''} onChange={e => setNewPastExam({ ...newPastExam, total_time_allowed: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-2"><Button size="sm" onClick={handleSavePastExam}>{editingPastId ? "更新" : "記録"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 模試結果追加モーダル */}
            <Dialog open={isMockModalOpen} onOpenChange={setIsMockModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="bg-gray-50/50 p-4 border-b -m-6 mb-2 rounded-t-lg"><DialogTitle>模試結果を追加</DialogTitle></DialogHeader>
                    {/* 中身は既存のままでOKです（省略） */}
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-xs font-medium">実施日</label>
                                <Input className="h-8 text-xs" type="date" value={newMockExam.exam_date || ''} onChange={e => setNewMockExam({ ...newMockExam, exam_date: e.target.value })} /></div>
                            <div className="space-y-1.5"><label className="text-xs font-medium">模試名</label>
                                <Input className="h-8 text-xs" placeholder="模試名" value={newMockExam.mock_exam_name || ''} onChange={e => setNewMockExam({ ...newMockExam, mock_exam_name: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-xs font-medium">形式 (主)</label>
                                <Select value={newMockExam.result_type} onValueChange={v => setNewMockExam({ ...newMockExam, result_type: v })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="マーク">マーク</SelectItem><SelectItem value="記述">記述</SelectItem></SelectContent>
                                </Select></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 border-t pt-2">
                            {/* マーク式 */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded block">マーク式 得点</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-[10px]">英語R</label><Input className="h-7 text-xs" value={newMockExam.subject_english_r_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_english_r_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">英語L</label><Input className="h-7 text-xs" value={newMockExam.subject_english_l_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_english_l_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">数IA</label><Input className="h-7 text-xs" value={newMockExam.subject_math1a_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_math1a_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">数IIBC</label><Input className="h-7 text-xs" value={newMockExam.subject_math2bc_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_math2bc_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">国語</label><Input className="h-7 text-xs" value={newMockExam.subject_kokugo_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_kokugo_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">情報</label><Input className="h-7 text-xs" value={newMockExam.subject_info_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_info_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">理科①</label><Input className="h-7 text-xs" value={newMockExam.subject_rika1_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_rika1_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">理科②</label><Input className="h-7 text-xs" value={newMockExam.subject_rika2_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_rika2_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">理科基礎①</label><Input className="h-7 text-xs" value={newMockExam.subject_rika_kiso1_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_rika_kiso1_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">理科基礎②</label><Input className="h-7 text-xs" value={newMockExam.subject_rika_kiso2_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_rika_kiso2_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">社会①</label><Input className="h-7 text-xs" value={newMockExam.subject_shakai1_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_shakai1_mark: e.target.value })} /></div>
                                    <div><label className="text-[10px]">社会②</label><Input className="h-7 text-xs" value={newMockExam.subject_shakai2_mark || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_shakai2_mark: e.target.value })} /></div>
                                </div>
                            </div>

                            {/* 記述式 */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded block">記述式 得点</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-[10px]">英語</label><Input className="h-7 text-xs" value={newMockExam.subject_english_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_english_desc: e.target.value })} /></div>
                                    <div><label className="text-[10px]">数学</label><Input className="h-7 text-xs" value={newMockExam.subject_math_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_math_desc: e.target.value })} /></div>
                                    <div><label className="text-[10px]">国語</label><Input className="h-7 text-xs" value={newMockExam.subject_kokugo_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_kokugo_desc: e.target.value })} /></div>
                                    <div><label className="text-[10px]">理科①</label><Input className="h-7 text-xs" value={newMockExam.subject_rika1_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_rika1_desc: e.target.value })} /></div>
                                    <div><label className="text-[10px]">理科②</label><Input className="h-7 text-xs" value={newMockExam.subject_rika2_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_rika2_desc: e.target.value })} /></div>
                                    <div><label className="text-[10px]">社会①</label><Input className="h-7 text-xs" value={newMockExam.subject_shakai1_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_shakai1_desc: e.target.value })} /></div>
                                    <div><label className="text-[10px]">社会②</label><Input className="h-7 text-xs" value={newMockExam.subject_shakai2_desc || ''} onChange={e => setNewMockExam({ ...newMockExam, subject_shakai2_desc: e.target.value })} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button size="sm" onClick={handleSaveMockExam}>
                            {editingMockId ? "更新" : "追加"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 模試詳細表示モーダル */}
            <Dialog open={isMockDetailOpen} onOpenChange={setIsMockDetailOpen}>
                <DialogContent className="w-[90vw] sm:max-w-[500px]">
                    <DialogHeader className="bg-gray-50/50 p-4 border-b -m-6 mb-2 rounded-t-lg"><DialogTitle>{selectedMockExam?.mock_exam_name} 結果</DialogTitle></DialogHeader>
                    <div className="py-2 overflow-y-auto max-h-[60vh]">
                        <div className="flex justify-between mb-4 border-b pb-2">
                            <span className="font-bold">主: {selectedMockExam?.result_type}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="font-bold mb-2 text-blue-700">マーク式</div>
                                <div className="space-y-1">
                                    <DetailRow label="英R" value={selectedMockExam?.subject_english_r_mark} />
                                    <DetailRow label="英L" value={selectedMockExam?.subject_english_l_mark} />
                                    <DetailRow label="数IA" value={selectedMockExam?.subject_math1a_mark} />
                                    <DetailRow label="数IIBC" value={selectedMockExam?.subject_math2bc_mark} />
                                    <DetailRow label="国語" value={selectedMockExam?.subject_kokugo_mark} />
                                    <DetailRow label="情報" value={selectedMockExam?.subject_info_mark} />
                                    <DetailRow label="理科①" value={selectedMockExam?.subject_rika1_mark} />
                                    <DetailRow label="理科②" value={selectedMockExam?.subject_rika2_mark} />
                                    <DetailRow label="理基①" value={selectedMockExam?.subject_rika_kiso1_mark} />
                                    <DetailRow label="理基②" value={selectedMockExam?.subject_rika_kiso2_mark} />
                                    <DetailRow label="社会①" value={selectedMockExam?.subject_shakai1_mark} />
                                    <DetailRow label="社会②" value={selectedMockExam?.subject_shakai2_mark} />
                                </div>
                            </div>
                            <div>
                                <div className="font-bold mb-2 text-purple-700">記述式</div>
                                <div className="space-y-1">
                                    <DetailRow label="英語" value={selectedMockExam?.subject_english_desc} />
                                    <DetailRow label="数学" value={selectedMockExam?.subject_math_desc} />
                                    <DetailRow label="国語" value={selectedMockExam?.subject_kokugo_desc} />
                                    <DetailRow label="理科①" value={selectedMockExam?.subject_rika1_desc} />
                                    <DetailRow label="理科②" value={selectedMockExam?.subject_rika2_desc} />
                                    <DetailRow label="社会①" value={selectedMockExam?.subject_shakai1_desc} />
                                    <DetailRow label="社会②" value={selectedMockExam?.subject_shakai2_desc} />
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* カレンダー詳細表示モーダル */}
            <Dialog open={!!selectedCalEvent} onOpenChange={(open) => !open && setSelectedCalEvent(null)}>
                <DialogContent className="w-[90vw] sm:max-w-[400px]">
                    <DialogHeader className={`${selectedCalEvent?.color?.split(' ')[0]} p-4 border-b -m-6 mb-2 rounded-t-lg`}>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="bg-white px-2 py-0.5 rounded text-xs border">{selectedCalEvent?.type}</span>
                            {selectedCalEvent?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {/* 予定・行事の場合 */}
                        {selectedCalEvent?.source === 'school_event' && (
                            <>
                                <DetailRow label="期間" value={`${selectedCalEvent.rawData.start_date} 〜 ${selectedCalEvent.rawData.end_date}`} />
                                <div className="mt-2 border-t pt-2">
                                    <label className="text-xs text-gray-500 font-bold">詳細メモ</label>
                                    <p className="text-sm whitespace-pre-wrap mt-1 text-gray-800">
                                        {selectedCalEvent.rawData.description || "詳細なし"}
                                    </p>
                                </div>
                            </>
                        )}
                        {/* 入試日程の場合 */}
                        {selectedCalEvent?.source === 'acceptance' && (
                            <>
                                <DetailRow label="大学名" value={selectedCalEvent.rawData.university_name} />
                                <DetailRow label="学部・学科" value={`${selectedCalEvent.rawData.faculty_name} ${selectedCalEvent.rawData.department_name}`} />
                                <DetailRow label="入試方式" value={selectedCalEvent.rawData.exam_system} />
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}