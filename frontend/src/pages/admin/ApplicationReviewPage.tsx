// frontend/src/pages/admin/ApplicationReviewPage.tsx

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
import { Check, X, Clock, ShieldAlert, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';

// 🌟 モーダルと入力用のコンポーネントを追加インポート
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

export default function ApplicationReviewPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInstructor, setIsInstructor] = useState(false);

  // 🌟 承認ポップアップ用のステート
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);
  const [approvedDate, setApprovedDate] = useState('');
  const [instructorComment, setInstructorComment] = useState('');

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
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      if (userObj.role === 'user') {
        setIsInstructor(true);
      }
    }
    fetchData();
  }, []);

  // 🌟 承認ポップアップからの送信処理
  const submitApproval = async () => {
    if (!selectedTransferId || !approvedDate) return;
    
    try {
      await updateTransferStatus(selectedTransferId, {
        status: 'approved',
        approved_date: approvedDate,
        instructor_comment: instructorComment
      });
      toast.success('振替を承認し、生徒に連絡しました');
      setIsApproveModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('承認に失敗しました');
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
    <div className="container mx-auto py-2 md:py-8 px-0 md:px-4 max-w-6xl">
      <div className="mb-8 flex justify-between items-center px-4 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">申請の確認・承認</h1>
            {isInstructor && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> 担当生徒のみ表示中
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-600">生徒から送信された振替申請と欠席報告を確認・処理します。</p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs md:text-sm font-medium transition-colors whitespace-nowrap"
        >
          再読込
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mx-4 md:mx-0">
        <Tabs defaultValue="transfer" className="w-full">
          <div className="border-b border-gray-200 bg-gray-50 p-2 md:p-3">
            <TabsList className="grid w-full grid-cols-2 max-w-md h-auto p-1 bg-gray-200/50 rounded-lg">
              <TabsTrigger 
                value="transfer" 
                className="py-2 text-xs md:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-2"
              >
                振替申請
                {transfers.filter(t => t.status === 'pending').length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                    {transfers.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="absence" 
                className="py-2 text-xs md:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-2"
              >
                欠席報告
                {absences.filter(a => a.status === 'pending').length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                    {absences.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-0">
            {/* --- 振替申請タブ --- */}
            <TabsContent value="transfer" className="m-0 outline-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">送信日時</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">生徒名</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">担当講師</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">振替元の日付</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">振替候補日 / 理由</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">ステータス詳細</th>
                      <th className="px-4 md:px-6 py-4 text-right whitespace-nowrap">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
                    ) : transfers.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">申請はありません</td></tr>
                    ) : transfers.map((t) => (
                      <tr key={t.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs">{dayjs(t.created_at).format('MM/DD HH:mm')}</td>
                        <td className="px-4 md:px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{t.student_name}</td>
                        <td className="px-4 md:px-6 py-4 text-blue-600 font-medium whitespace-nowrap">{t.instructor_name}</td>
                        <td className="px-4 md:px-6 py-4 font-medium whitespace-nowrap">{t.original_date}</td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="font-medium text-gray-800">{t.candidate_dates}</div>
                          <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={t.reason}>{t.reason}</div>
                        </td>
                        <td className="px-4 md:px-6 py-4 min-w-[180px]">
                          <StatusBadge status={t.status} />
                          {/* 🌟 承認済みの場合は、決定日と先生からのコメントを表示 */}
                          {t.status === 'approved' && t.approved_date && (
                            <div className="mt-2 text-xs bg-green-50 p-2 rounded border border-green-100">
                              <div className="text-green-800 font-bold mb-1">振替日: {t.approved_date}</div>
                              {t.instructor_comment && (
                                <div className="text-green-700 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span className="whitespace-pre-wrap break-words">{t.instructor_comment}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                          {/* 🌟 却下ボタンを削除し、承認時にモーダルを開くように変更 */}
                          {t.status === 'pending' && (
                            <button 
                              onClick={() => {
                                setSelectedTransferId(t.id);
                                setApprovedDate('');
                                setInstructorComment('');
                                setIsApproveModalOpen(true);
                              }} 
                              className="px-4 py-2 bg-blue-50 text-blue-600 font-bold border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                            >
                              承認して連絡
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* --- 欠席報告タブ --- */}
            <TabsContent value="absence" className="m-0 outline-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">送信日時</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">生徒名</th> 
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">担当講師</th> 
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">欠席日</th> 
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">補足(進捗)</th>
                      <th className="px-4 md:px-6 py-4 whitespace-nowrap">ステータス</th>
                      <th className="px-4 md:px-6 py-4 text-right whitespace-nowrap">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
                    ) : absences.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">報告はありません</td></tr>
                    ) : absences.map((a) => (
                      <tr key={a.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs">{dayjs(a.created_at).format('MM/DD HH:mm')}</td>
                        <td className="px-4 md:px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{a.student_name}</td> 
                        <td className="px-4 md:px-6 py-4 text-blue-600 font-medium whitespace-nowrap">{a.instructor_name}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-red-600">{a.absence_date}</td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="font-medium text-gray-800 max-w-[200px] truncate" title={a.reason}>{a.reason}</div>
                          <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={a.report_info}>{a.report_info}</div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap"><StatusBadge status={a.status} /></td>
                        <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                          {a.status === 'pending' && (
                            <button onClick={() => handleUpdateAbsence(a.id, 'acknowledged')} className="px-4 py-2 bg-green-50 text-green-600 font-bold border border-green-200 rounded hover:bg-green-100 transition-colors">確認済みにする</button>
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

      {/* 🌟 振替申請の承認・連絡用ポップアップ（モーダル） */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="w-[90vw] max-w-[500px] rounded-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl">振替の承認と連絡</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">決定した振替日 <span className="text-red-500">*</span></label>
              <Input 
                type="date" 
                value={approvedDate} 
                onChange={e => setApprovedDate(e.target.value)} 
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">生徒へのメッセージ（任意）</label>
              <p className="text-xs text-gray-500 mb-2">生徒の画面にここで入力したメッセージが表示されます。</p>
              <Textarea 
                placeholder="例: 部活の大会頑張ってね！12日の19時からお待ちしています。"
                value={instructorComment}
                onChange={e => setInstructorComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 flex gap-2 justify-end sm:justify-end">
            <button 
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors" 
              onClick={() => setIsApproveModalOpen(false)}
            >
              キャンセル
            </button>
            <button 
              className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              disabled={!approvedDate} 
              onClick={submitApproval}
            >
              承認して送信
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}