import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Filter, BarChart3 } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

interface MockExamRecord {
    id: number;
    student_name: string;
    student_grade: string;
    exam_name: string;
    subject: string;
    score: number;
    deviation: number | null;
    exam_date: string;
}

export default function MockExamList() {
    const [exams, setExams] = useState<MockExamRecord[]>([]);
    
    // フィルター用ステート
    const [filterStudent, setFilterStudent] = useState("");
    const [filterSubject, setFilterSubject] = useState("ALL");
    const [filterExamName, setFilterExamName] = useState("");

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await api.get('/admin/mock_exams');
            setExams(res.data);
        } catch (e) {
            console.error(e);
            toast.error("模試データの取得に失敗しました");
        }
    };

    // フィルタリング処理
    const filteredExams = exams.filter(exam => {
        const matchStudent = exam.student_name.toLowerCase().includes(filterStudent.toLowerCase());
        const matchSubject = filterSubject === "ALL" || exam.subject === filterSubject;
        const matchExamName = exam.exam_name.toLowerCase().includes(filterExamName.toLowerCase());
        return matchStudent && matchSubject && matchExamName;
    });

    // ユニークな科目リスト（データから抽出）
    const subjects = Array.from(new Set(exams.map(e => e.subject).filter(Boolean)));
    const defaultSubjects = ["英語", "数学", "国語", "理科", "社会"];
    const uniqueSubjects = Array.from(new Set([...defaultSubjects, ...subjects]));

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
                                <TableHead>模試名</TableHead>
                                <TableHead className="w-24">科目</TableHead>
                                <TableHead className="w-24 text-right">得点</TableHead>
                                <TableHead className="w-24 text-right">偏差値</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExams.map((exam) => (
                                <TableRow key={exam.id} className="hover:bg-gray-50/50">
                                    <TableCell className="text-sm text-gray-600 font-mono">
                                        {exam.exam_date}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {exam.student_name}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {exam.student_grade || '-'}
                                    </TableCell>
                                    <TableCell>{exam.exam_name}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                            exam.subject === '英語' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            exam.subject === '数学' ? 'bg-green-50 text-green-700 border-green-200' :
                                            exam.subject === '国語' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}>
                                            {exam.subject}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-700">
                                        {exam.score}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {exam.deviation ? (
                                            <span className={`font-bold ${
                                                exam.deviation >= 60 ? 'text-pink-600' :
                                                exam.deviation >= 50 ? 'text-blue-600' :
                                                'text-gray-600'
                                            }`}>
                                                {exam.deviation}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredExams.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
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
                <div className="text-xs text-muted-foreground text-right mt-2 px-2">
                    全 {exams.length} 件中 {filteredExams.length} 件を表示
                </div>
            </Card>
        </div>
    );
}