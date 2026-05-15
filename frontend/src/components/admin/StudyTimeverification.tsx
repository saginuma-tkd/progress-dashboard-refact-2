import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface StudyTimeSummary {
  student_id: number;
  name: string;
  grade: string;
  planned_time: number;
  actual_time: number;
  diff: number;
}

export default function StudyTimeVerification() {
    const [summaryData, setSummaryData] = useState<StudyTimeSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                // バックエンドのAPIを叩く
                const res = await api.get('/dashboard/admin/study-time-summary');
                setSummaryData(res.data);
            } catch (error) {
                console.error("集計データの取得に失敗しました", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    if (loading) return <div className="p-4 text-muted-foreground text-center">データを集計中...</div>;

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-16 text-center">学年</TableHead>
                            <TableHead>生徒名</TableHead>
                            <TableHead className="text-right">学習予定時間</TableHead>
                            <TableHead className="text-right">総学習時間 (実績)</TableHead>
                            <TableHead className="text-right">差分 (実績 - 予定)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summaryData.map((row) => (
                            <TableRow 
                                key={row.student_id} 
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <TableCell className="text-xs text-muted-foreground text-center">{row.grade}</TableCell>
                                <TableCell className="font-bold">{row.name}</TableCell>
                                <TableCell className="text-right font-medium">{row.planned_time} h</TableCell>
                                <TableCell className="text-right font-medium text-blue-600">{row.actual_time} h</TableCell>
                                <TableCell className={`text-right font-bold ${row.diff > 0 ? 'text-green-600' : row.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {row.diff > 0 ? '+' : ''}{row.diff} h
                                </TableCell>
                            </TableRow>
                        ))}
                        {summaryData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">データがありません</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}