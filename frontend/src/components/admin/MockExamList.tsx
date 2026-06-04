import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Search, Filter, BarChart3, Calendar, User, Layers } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { MockExamRecord } from '../../types';

export default function MockExamList() {
    const [exams, setExams] = useState<MockExamRecord[]>([]);

    // フィルター用ステート
    const [filterStudent, setFilterStudent] = useState("");
    const [filterSubject, setFilterSubject] = useState("ALL");
    const [filterExamName, setFilterExamName] = useState("");

    // モーダル用ステート
    const [selectedGroupRecords, setSelectedGroupRecords] = useState<MockExamRecord[]>([]);
    const [selectedGroupInfo, setSelectedGroupInfo] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await api.get<MockExamRecord[]>('/admin/mock_exams');
            setExams(res.data);
        } catch (e) {
            console.error(e);
            toast.error("模試データの取得に失敗しました");
        }
    };

    // 🌟 1. データを「1回の模試（生徒＋模試名＋日付）」ごとにグループ化する！
    const groupedExamsMap = new Map<string, any>();
    exams.forEach(exam => {
        const key = `${exam.student_name}_${exam.exam_name}_${exam.exam_date}`;
        if (!groupedExamsMap.has(key)) {
            groupedExamsMap.set(key, {
                id: key,
                student_name: exam.student_name,
                student_grade: exam.student_grade,
                exam_name: exam.exam_name,
                exam_date: exam.exam_date,
                subjects: [],
                total_score: 0,
                records: [] // モーダル表示用に元のデータも丸ごと保持
            });
        }
        const group = groupedExamsMap.get(key);
        // 科目をリストに追加
        if (!group.subjects.includes(exam.subject)) {
            group.subjects.push(exam.subject);
        }
        // 合計得点を計算
        if (exam.score && !isNaN(Number(exam.score))) {
            group.total_score += Number(exam.score);
        }
        group.records.push(exam);
    });

    const groupedExams = Array.from(groupedExamsMap.values());

    // 🌟 2. フィルタリング処理（合体したデータに対して行う）
    const filteredGroups = groupedExams.filter(group => {
        const matchStudent = group.student_name.toLowerCase().includes(filterStudent.toLowerCase());
        const matchSubject = filterSubject === "ALL" || group.subjects.includes(filterSubject);
        const matchExamName = group.exam_name.toLowerCase().includes(filterExamName.toLowerCase());
        return matchStudent && matchSubject && matchExamName;
    });

    // ユニークな科目リスト（フィルターのドロップダウン用）
    const subjectsList = Array.from(new Set(exams.map(e => e.subject).filter(Boolean)));
    const defaultSubjects = ["英語", "数学", "国語", "理科", "社会"];
    const uniqueSubjects = Array.from(new Set([...defaultSubjects, ...subjectsList]));

    // 行をクリックしたときの処理
    const handleRowClick = (group: any) => {
        setSelectedGroupInfo(group);
        setSelectedGroupRecords(group.records);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* フィルターエリア */}
            <Card className="flex-shrink-0">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                            <Filter className="w-4 h-4" /> 絞り込み:
                        </div>

                        {/* 生徒名検索 */}
                        <div className="space-y-1 flex-1">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                                <Input
                                    placeholder="生徒名で検索..."
                                    value={filterStudent}
                                    onChange={e => setFilterStudent(e.target.value)}
                                    className="pl-8 h-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* 模試名検索 */}
                        <div className="space-y-1 flex-1">
                            <Input
                                placeholder="模試名で検索 (例: 全統記述)..."
                                value={filterExamName}
                                onChange={e => setFilterExamName(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* 科目選択 */}
                        <div className="space-y-1 w-full md:w-40">
                            <Select value={filterSubject} onValueChange={setFilterSubject}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="全科目" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">全科目</SelectItem>
                                    {uniqueSubjects.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* データ一覧 */}
            <Card className="flex-1 overflow-hidden flex flex-col border-none shadow-none bg-transparent">
                <div className="rounded-md border bg-white flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-32">受験日</TableHead>
                                <TableHead className="w-40">生徒名</TableHead>
                                <TableHead className="w-24">学年</TableHead>
                                <TableHead className="w-64">模試名</TableHead>
                                <TableHead>受験科目</TableHead>
                                <TableHead className="w-32 text-right">総合得点</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGroups.map((group) => (
                                <TableRow
                                    key={group.id}
                                    onClick={() => handleRowClick(group)}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                >
                                    <TableCell className="text-sm text-gray-600 font-mono">
                                        {group.exam_date}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {group.student_name}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {group.student_grade || '-'}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-800">
                                        {group.exam_name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {group.subjects.map((subj: string) => (
                                                <span key={subj} className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    {subj}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-blue-700">
                                        {group.total_score} <span className="text-xs font-normal text-gray-500">点</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredGroups.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <BarChart3 className="w-8 h-8 text-gray-300" />
                                            <p>データが見つかりません</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-2 px-2 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <Layers className="w-4 h-4" />
                        <span>各行をクリックすると詳細スコアを確認できます</span>
                    </div>
                    <div>
                        全 {groupedExams.length} 回中 {filteredGroups.length} 回を表示
                    </div>
                </div>
            </Card>

            {/* 詳細表示モーダル */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            成績詳細
                        </DialogTitle>
                        {selectedGroupInfo && (
                            <DialogDescription className="space-y-2 pt-4">
                                <div className="flex items-center gap-2 text-gray-800 text-base font-medium bg-gray-50 p-2 rounded-md">
                                    <User className="w-4 h-4 text-gray-500" />
                                    {selectedGroupInfo.student_name} <span className="text-sm font-normal text-gray-500">({selectedGroupInfo.student_grade || '-'})</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 px-2 pt-1">
                                    <span className="font-semibold">{selectedGroupInfo.exam_name}</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {selectedGroupInfo.exam_date}
                                    </span>
                                </div>
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    <div className="mt-4 border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="w-2/5">科目</TableHead>
                                    <TableHead className="text-right w-[30%]">得点</TableHead>
                                    <TableHead className="text-right w-[30%]">偏差値</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedGroupRecords.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.subject}</TableCell>
                                        <TableCell className="text-right">
                                            {item.score !== null && item.score !== undefined ? (
                                                <span className="font-bold">{item.score} <span className="text-xs font-normal text-gray-500">点</span></span>
                                            ) : <span className="text-gray-300">-</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.deviation !== null && item.deviation !== undefined ? (
                                                <span className={`font-bold ${item.deviation >= 60 ? 'text-pink-600' :
                                                    item.deviation >= 50 ? 'text-blue-600' : 'text-gray-600'
                                                    }`}>
                                                    {item.deviation}
                                                </span>
                                            ) : <span className="text-gray-300">-</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}