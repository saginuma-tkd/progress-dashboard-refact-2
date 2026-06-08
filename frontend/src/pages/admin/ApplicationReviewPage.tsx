// frontend/src/pages/admin/ApplicationReviewPage.tsx

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { updateTransferStatus, updateAbsenceStatus } from '../../api/applications';
import { useApplications } from '../../hooks/useApplications';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Check, X, Clock, ShieldAlert, MessageSquare, Trash2, Search, Filter, BellRing, File } from 'lucide-react';
import dayjs from 'dayjs';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export default function ApplicationReviewPage() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'user';
  const isAdmin = ['admin', 'developer', 'super_admin'].includes(user?.role ?? '');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterStudent, setFilterStudent] = useState<string>('');
  const [filterInstructor, setFilterInstructor] = useState<string>('');

  const [studentList, setStudentList] = useState<any[]>([]);
  const [instructorList, setInstructorList] = useState<any[]>([]);

  const { data, isLoading, isError, refetch } = useApplications({
    status: filterStatus === 'all' ? undefined : filterStatus,
    student_id: filterStudent || undefined,
    instructor_id: filterInstructor || undefined,
  });

  const transfers = data?.transfers || [];
  const absences = data?.absences || [];

  // 🌟 追加: 現在表示されている未承認の合計件数を計算
  const pendingTransfersCount = transfers.filter((t: any) => t.status === 'pending').length;
  const pendingAbsencesCount = absences.filter((a: any) => a.status === 'pending').length;
  const totalPendingCount = pendingTransfersCount + pendingAbsencesCount;

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);
  const [approvedDate, setApprovedDate] = useState('');
  const [instructorComment, setInstructorComment] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'transfer' | 'absence', id: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchLists = async () => {
      try {
        const studentsRes = await api.get('/students');
        const sData = Array.isArray(studentsRes.data)
          ? studentsRes.data
          : (studentsRes.data?.items || []);
        setStudentList(sData);

        if (isAdmin) {
          const instructorsRes = await api.get('/admin/users');
          const iData = Array.isArray(instructorsRes.data)
            ? instructorsRes.data
            : (instructorsRes.data?.items || []);
          setInstructorList(iData.filter((i: any) => i.role === 'user'));
        }
      } catch (e) {
        console.error("リストの取得に失敗しました", e);
      }
    };

    fetchLists();
  }, [user, isAdmin]);

  const triggerNavRefresh = () => {
    window.dispatchEvent(new Event('refreshPendingCount'));
  };

  const deleteTransferMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/applications/transfer/${id}`),
    onSuccess: () => {
      toast.success('振替申請を削除しました');
      refetch();
      triggerNavRefresh(); // 🌟 合図を飛ばす
    },
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/applications/absence/${id}`),
    onSuccess: () => {
      toast.success('欠席報告を削除しました');
      refetch();
      triggerNavRefresh(); // 🌟 合図を飛ばす
    },
  });

  const confirmDeleteTransfer = (id: number) => { setDeleteTarget({ type: 'transfer', id }); setIsConfirmOpen(true); };
  const confirmDeleteAbsence = (id: number) => { setDeleteTarget({ type: 'absence', id }); setIsConfirmOpen(true); };

  const executeDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'transfer') deleteTransferMutation.mutate(deleteTarget.id);
    else deleteAbsenceMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const submitApproval = async () => {
    if (!selectedTransferId || !approvedDate) return;
    try {
      await updateTransferStatus(selectedTransferId, { status: 'approved', approved_date: approvedDate, instructor_comment: instructorComment });
      toast.success('振替を承認し、生徒に連絡しました');
      setIsApproveModalOpen(false);
      refetch();
      triggerNavRefresh(); // 🌟 合図を飛ばす
    } catch (err) {
      toast.error('承認に失敗しました');
    }
  };

  const handleUpdateAbsence = async (id: number, status: string) => {
    try {
      await updateAbsenceStatus(id, status);
      toast.success('ステータスを更新しました');
      refetch();
      triggerNavRefresh(); // 🌟 合図を飛ばす
    } catch (err) {
      toast.error('ステータスの更新に失敗しました');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> 確認待ち</Badge>;
      case 'approved':
      case 'acknowledged': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><Check className="w-3 h-3 mr-1" /> 承認済</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><X className="w-3 h-3 mr-1" /> 却下</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    // 🌟 1. 一番外枠を前者に統一
    <div className="h-full w-full flex flex-col p-2 md:p-8 pt-2 md:pt-6 gap-2 md:gap-4">

      {/* 🌟 2. ヘッダーエリア */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
            {/* 🌟 3. アイコンをスマホで非表示に */}
            <File className="w-6 h-6 text-purple-600" />
            申請の確認・承認
            {totalPendingCount > 0 && (
              <span className="bg-red-50 text-red-600 border border-red-200 text-xs md:text-sm px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                <BellRing className="w-3.5 h-3.5" /> 未処理 {totalPendingCount}件
              </span>
            )}
          </h2>
          {isInstructor && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> 担当生徒のみ
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-4 py-2 flex items-center gap-1.5 text-xs md:text-sm font-medium rounded-md transition-colors ${filterStatus !== 'all' || filterStudent || filterInstructor
              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            <Filter className="w-4 h-4" /> 絞り込み
          </button>
          <button onClick={() => refetch()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs md:text-sm font-medium transition-colors whitespace-nowrap">
            再読込
          </button>
        </div>
      </div>

      {/* 🌟 4. メイン機能エリア（flex-1 min-h-0 を設定し、カード全体を縦に伸ばす） */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Tabs defaultValue="transfer" className="w-full h-full flex flex-col">
          {/* タブのボタン部分 (ここはスクロールせず固定) */}
          <div className="flex-none border-b border-gray-200 bg-gray-50 p-2 md:p-3">
            <TabsList className="grid w-full grid-cols-2 max-w-md h-auto p-1 bg-gray-200/50 rounded-lg">
              <TabsTrigger value="transfer" className="py-2 text-xs md:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-2">
                振替申請
                {pendingTransfersCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                    {pendingTransfersCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="absence" className="py-2 text-xs md:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-2">
                欠席報告
                {pendingAbsencesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                    {pendingAbsencesCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 🌟 テーブル部分 (ここだけがスクロールするように flex-1 overflow-y-auto を設定) */}
          <div className="flex-1 min-h-0 overflow-y-auto relative">
            <TabsContent value="transfer" className="m-0 outline-none h-full">
              <div className="overflow-x-auto min-h-full">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
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
                    {isLoading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
                    ) : isError ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-red-500">データの取得に失敗しました。</td></tr>
                    ) : transfers.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center"><Search className="w-8 h-8 text-gray-300 mb-2" />条件に一致する申請はありません</td></tr>
                    ) : transfers.map((t: any) => (
                      <tr key={t.id} className={`border-b transition-colors ${t.status === 'pending' ? 'bg-orange-50/30' : 'bg-white hover:bg-gray-50'}`}>
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
                          {t.status === 'approved' && t.approved_date && (
                            <div className="mt-2 text-xs bg-green-50 p-2 rounded border border-green-100">
                              <div className="text-green-800 font-bold mb-1">振替日: {t.approved_date}</div>
                              {t.instructor_comment && (
                                <div className="text-green-700 flex items-start gap-1"><MessageSquare className="w-3 h-3 mt-0.5 shrink-0" /><span className="whitespace-pre-wrap break-words">{t.instructor_comment}</span></div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {t.status === 'pending' && (
                              <button onClick={() => { setSelectedTransferId(t.id); setApprovedDate(''); setInstructorComment(''); setIsApproveModalOpen(true); }} className="px-4 py-2 bg-blue-50 text-blue-600 font-bold border border-blue-200 rounded hover:bg-blue-100 transition-colors">承認して連絡</button>
                            )}
                            <button onClick={() => confirmDeleteTransfer(t.id)} className="inline-flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="absence" className="m-0 outline-none h-full">
              <div className="overflow-x-auto min-h-full">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
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
                    {isLoading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
                    ) : isError ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-red-500">データの取得に失敗しました。</td></tr>
                    ) : absences.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center"><Search className="w-8 h-8 text-gray-300 mb-2" />条件に一致する報告はありません</td></tr>
                    ) : absences.map((a: any) => (
                      <tr key={a.id} className={`border-b transition-colors ${a.status === 'pending' ? 'bg-orange-50/30' : 'bg-white hover:bg-gray-50'}`}>
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
                          <div className="flex items-center justify-end gap-2">
                            {a.status === 'pending' && (
                              <button onClick={() => handleUpdateAbsence(a.id, 'acknowledged')} className="px-4 py-2 bg-green-50 text-green-600 font-bold border border-green-200 rounded hover:bg-green-100 transition-colors">確認済みにする</button>
                            )}
                            <button onClick={() => confirmDeleteAbsence(a.id)} className="inline-flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
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

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" /> 表示の絞り込み
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 font-bold">ステータス</label>
              <select
                className="w-full border rounded-md p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">すべて表示</option>
                <option value="pending">確認待ち（未承認）のみ</option>
                <option value="approved">承認済のみ</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 font-bold">生徒名</label>
              <select
                className="w-full border rounded-md p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
              >
                <option value="">すべての生徒</option>
                {studentList.map(s => {
                  const sName = s.user?.username || s.user?.full_name || s.username || s.full_name || s.name || `ID:${s.id}`;
                  return <option key={s.id} value={s.id}>{sName}</option>;
                })}
              </select>
            </div>

            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700 font-bold text-blue-600">担当講師 (校舎長権限)</label>
                <select
                  className="w-full border rounded-md p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  value={filterInstructor}
                  onChange={(e) => setFilterInstructor(e.target.value)}
                >
                  <option value="">すべての講師</option>
                  {instructorList.map(i => {
                    const iName = i.user?.username || i.username || i.full_name || i.name || `ID:${i.id}`;
                    return <option key={i.id} value={i.id}>{iName} 先生</option>;
                  })}
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterStudent('');
                setFilterInstructor('');
              }}
              className="mr-auto px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              条件をリセット
            </button>
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors"
            >
              閉じる
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="w-[90vw] max-w-[500px] rounded-xl">
          <DialogHeader className="border-b pb-4"><DialogTitle className="text-xl">振替の承認と連絡</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">決定した振替日 <span className="text-red-500">*</span></label>
              <Input type="date" value={approvedDate} onChange={e => setApprovedDate(e.target.value)} className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">生徒へのメッセージ（任意）</label>
              <Textarea value={instructorComment} onChange={e => setInstructorComment(e.target.value)} rows={4} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="border-t pt-4 flex gap-2 justify-end sm:justify-end">
            <button className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200" onClick={() => setIsApproveModalOpen(false)}>キャンセル</button>
            <button className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={!approvedDate} onClick={submitApproval}>承認して送信</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="削除の確認"
        message={
          <div className="space-y-2 mt-2">
            <p className="text-gray-700">本当にこの<span className="font-bold">{deleteTarget?.type === 'transfer' ? '振替申請' : '欠席報告'}</span>を削除しますか？</p>
            <p className="text-red-500 text-sm font-bold">※この操作は取り消せません。</p>
          </div>
        }
        confirmText="削除する"
        cancelText="キャンセル"
        isDestructive={true}
        onConfirm={executeDelete}
        onClose={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}