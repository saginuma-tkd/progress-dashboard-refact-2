import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  getTransferRequests, 
  getAbsenceReports, 
  updateTransferStatus, 
  updateAbsenceStatus 
} from '../../api/applications';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Check, X, Clock } from 'lucide-react';
import dayjs from 'dayjs';

export default function ApplicationReviewPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transfersData, absencesData] = await Promise.all([
        getTransferRequests(),
        getAbsenceReports(),
      ]);
      setTransfers(transfersData);
      setAbsences(absencesData);
    } catch (err) {
      console.error(err);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTransfer = async (id: number, status: string) => {
    try {
      await updateTransferStatus(id, status);
      toast.success('ステータスを更新しました');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('ステータスの更新に失敗しました');
    }
  };

  const handleUpdateAbsence = async (id: number, status: string) => {
    try {
      await updateAbsenceStatus(id, status);
      toast.success('ステータスを更新しました');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('ステータスの更新に失敗しました');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> 確認待ち</Badge>;
      case 'approved':
      case 'acknowledged':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><Check className="w-3 h-3 mr-1" /> 承認済</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><X className="w-3 h-3 mr-1" /> 却下</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">申請の確認・承認</h1>
          <p className="text-gray-600">生徒から送信された振替申請と欠席報告を確認・処理します。</p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
        >
          再読み込み
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Tabs defaultValue="transfer" className="w-full">
          <div className="border-b border-gray-200 bg-gray-50 p-3">
            <TabsList className="grid w-full grid-cols-2 max-w-md h-auto p-1 bg-gray-200/50 rounded-lg">
              <TabsTrigger 
                value="transfer" 
                className="py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-2"
              >
                振替申請
                {transfers.filter(t => t.status === 'pending').length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {transfers.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="absence" 
                className="py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-2"
              >
                欠席報告
                {absences.filter(a => a.status === 'pending').length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {absences.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-0">
            {/* Transfer Tab */}
            <TabsContent value="transfer" className="m-0 outline-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4">送信日時</th>
                      <th className="px-6 py-4">生徒ID</th>
                      <th className="px-6 py-4">元の希望日</th>
                      <th className="px-6 py-4">振替候補日</th>
                      <th className="px-6 py-4">理由</th>
                      <th className="px-6 py-4">ステータス</th>
                      <th className="px-6 py-4 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
                    ) : transfers.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">申請はありません</td></tr>
                    ) : transfers.map((t) => (
                      <tr key={t.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{dayjs(t.created_at).format('YYYY/MM/DD HH:mm')}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{t.student_id}</td>
                        <td className="px-6 py-4">{t.original_date}</td>
                        <td className="px-6 py-4">{t.candidate_dates}</td>
                        <td className="px-6 py-4 max-w-xs truncate" title={t.reason}>{t.reason}</td>
                        <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          {t.status === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateTransfer(t.id, 'approved')} className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 transition-colors">承認</button>
                              <button onClick={() => handleUpdateTransfer(t.id, 'rejected')} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors">却下</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Absence Tab */}
            <TabsContent value="absence" className="m-0 outline-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4">送信日時</th>
                      <th className="px-6 py-4">生徒ID</th>
                      <th className="px-6 py-4">曜日</th>
                      <th className="px-6 py-4">理由</th>
                      <th className="px-6 py-4">補足</th>
                      <th className="px-6 py-4">ステータス</th>
                      <th className="px-6 py-4 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
                    ) : absences.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">報告はありません</td></tr>
                    ) : absences.map((a) => (
                      <tr key={a.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{dayjs(a.created_at).format('YYYY/MM/DD HH:mm')}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{a.student_id}</td>
                        <td className="px-6 py-4">{a.day_of_week}</td>
                        <td className="px-6 py-4 max-w-xs truncate" title={a.reason}>{a.reason}</td>
                        <td className="px-6 py-4 max-w-xs truncate" title={a.report_info}>{a.report_info}</td>
                        <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          {a.status === 'pending' && (
                            <button onClick={() => handleUpdateAbsence(a.id, 'acknowledged')} className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 transition-colors">確認済</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </div>
    </div>
  );
}
