import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2, CalendarX, RefreshCw } from 'lucide-react';

interface Transfer {
  id: number;
  timestamp: string;
  name: string;
  original_date: string;
  candidate_dates: string;
  reason: string;
}

interface Absence {
  id: number;
  timestamp: string;
  name: string;
  day_of_week: string;
  reason: string;
  report_info: string;
}

export default function MyStudentsAttendance() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/my-students');
      setTransfers(res.data.transfers);
      setAbsences(res.data.absences);
    } catch (error) {
      console.error("データの取得に失敗しました", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        担当生徒の欠席・振替確認
      </h2>
      
      <Tabs defaultValue="transfers" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="transfers">未完了の振替 ({transfers.length})</TabsTrigger>
          <TabsTrigger value="absences">最近の欠席 ({absences.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="space-y-4">
          {transfers.length === 0 ? (
            <p className="text-gray-500 text-sm">現在、未完了の振替申請はありません。</p>
          ) : (
            transfers.map(t => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                    {t.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>申請日時:</strong> {t.timestamp}</p>
                  <p><strong>元の日程:</strong> {t.original_date}</p>
                  <p><strong>希望日程:</strong> {t.candidate_dates}</p>
                  <p><strong>理由:</strong> {t.reason}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="absences" className="space-y-4">
          {absences.length === 0 ? (
            <p className="text-gray-500 text-sm">最近の欠席連絡はありません。</p>
          ) : (
            absences.map(a => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarX className="w-5 h-5 text-red-500" />
                    {a.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>連絡日時:</strong> {a.timestamp}</p>
                  <p><strong>欠席曜日:</strong> {a.day_of_week}</p>
                  <p><strong>理由:</strong> {a.reason}</p>
                  <p><strong>報告事項:</strong> {a.report_info}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}