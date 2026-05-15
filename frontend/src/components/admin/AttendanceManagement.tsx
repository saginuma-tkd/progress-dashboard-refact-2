import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle, RefreshCw, Clock, Search, Filter, UserMinus, CalendarX, FileText, Grid2X2} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import api from '../../lib/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';

// 🚨 追加：欠席データの型定義
interface AbsenceReport {
    rowNumber: number;
    timestamp: string;
    name: string;
    instructor: string;
    dayOfWeek: string;
    reason: string;
    reportInfo: string;
}

interface TransferRequest {
    rowNumber: number;
    timestamp: string;
    name: string;
    instructor: string;
    originalDate: string;
    candidateDates: string;
    reason: string;
    isConfirmed: boolean | string;
}

interface StudentCount {
    name: string;
    count: number;
}

export default function AttendanceManagement() {
    // データ用State
    const [pendingTransfers, setPendingTransfers] = useState<TransferRequest[]>([]);
    const [remainingCounts, setRemainingCounts] = useState<StudentCount[]>([]);
    const [recentAbsences, setRecentAbsences] = useState<AbsenceReport[]>([]); // 🚨 追加
    const [absenceCounts, setAbsenceCounts] = useState<StudentCount[]>([]);     // 🚨 追加
    
    // UI制御用State
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'transfers' | 'absences'>('transfers'); // 🚨 タブの状態管理

    // 検索・絞り込み用State
    const [filterInstructor, setFilterInstructor] = useState("");
    const [filterStudent, setFilterStudent] = useState("");

    const confirm = useConfirm();

    // 🚨 変更：バックエンドから4種類のデータをまとめて受け取る
    const fetchData = async (force: boolean = false) => {
        try {
            const url = force ? '/attendance/transfers?force_refresh=true' : '/attendance/transfers';
            const res = await api.get(url);
            setPendingTransfers(res.data.pending_transfers || []);
            setRemainingCounts(res.data.remaining_counts || []);
            setRecentAbsences(res.data.recent_absences || []);
            setAbsenceCounts(res.data.absence_counts || []);
        } catch (e) {
            toast.error("データの取得に失敗しました");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ----------------------------------------------------
    // 🚨 ここから追加：リアルタイム通知レーダー（30秒に1回チェック）
    // ----------------------------------------------------
    useEffect(() => {
        const checkNotifications = async () => {
            try {
                // 1. 未読の通知がないか聞きに行く
                const res = await api.get('/attendance/notifications/unread');
                const unreadNotifs = res.data;

                // 2. もし未読の通知があったら！
                if (unreadNotifs && unreadNotifs.length > 0) {
                    for (const notif of unreadNotifs) {
                        // 画面右下にカッコよくポップアップ（トースト）を出す！
                        toast.info(notif.title, {
                            description: notif.message,
                            duration: 8000, // 8秒間表示する
                            icon: notif.title.includes('振替') ? <Clock className="w-5 h-5 text-indigo-500" /> : <UserMinus className="w-5 h-5 text-rose-500" />,
                        });

                        // 表示したらすぐにバックエンドへ「既読にしたよ！」と伝える
                        await api.post(`/attendance/notifications/${notif.id}/read`);
                    }
                    
                    // 🌟 ついでに、表のデータも自動で最新に更新（リフレッシュ）する！
                    fetchData(true);
                }
            } catch (e) {
                console.error("通知の取得に失敗しました", e);
            }
        };

        // 画面を開いた瞬間に1回チェック
        checkNotifications();

        // その後、30秒ごと（30000ミリ秒）にずっとチェックし続ける
        const interval = setInterval(checkNotifications, 30000);

        // 画面を閉じた時はレーダーを止める
        return () => clearInterval(interval);
    }, []);
    // ----------------------------------------------------
    
    const handleComplete = async (rowNumber: number, name: string) => {
        const isOk = await confirm({
            title: "振替を完了にしますか？",
            message: `${name}さんのこの振替を「完了」としてスプレッドシートに記録します。\n※完了すると振替残数が1つ減ります。`,
            confirmText: "完了にする",
            isDestructive: false
        });

        if (!isOk) return;

        setProcessingId(rowNumber);
        try {
            await api.post('/attendance/transfers/complete', { rowNumber, name });
            toast.success(`${name}さんの振替を完了しました！`);
            fetchData(true); // 完了時は強制リフレッシュ
        } catch (e) {
            toast.error("スプレッドシートの更新に失敗しました");
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 h-full">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="flex gap-4 mb-6"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
            </div>
        );
    }

    // --- 🚨 表示用データの計算（アクティブなタブによって切り替える） ---

    // 1. サマリーカードのデータ
    const displayCounts = activeTab === 'transfers' 
        ? remainingCounts.filter(s => s.count > 0).sort((a, b) => b.count - a.count)
        : absenceCounts.filter(s => s.count > 0).sort((a, b) => b.count - a.count);

    // 2. プルダウン検索用の選択肢
    const currentList = activeTab === 'transfers' ? pendingTransfers : recentAbsences;
    const uniqueInstructors = Array.from(new Set(currentList.map(req => req.instructor).filter(Boolean)));
    const uniqueStudents = Array.from(new Set(currentList.map(req => req.name).filter(Boolean)));

    // 3. テーブルに表示するデータ（絞り込み適用後）
    const filteredTransfers = pendingTransfers.filter(req => 
        req.instructor.toLowerCase().includes(filterInstructor.toLowerCase()) &&
        req.name.toLowerCase().includes(filterStudent.toLowerCase())
    );
    
    const filteredAbsences = recentAbsences.filter(req => 
        req.instructor.toLowerCase().includes(filterInstructor.toLowerCase()) &&
        req.name.toLowerCase().includes(filterStudent.toLowerCase())
    );

    return (
        <div className="space-y-6 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                    <Grid2X2 className="w-6 h-6 text-indigo-600" />
                    振替・欠席管理
                </h2>
                <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(true); }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> 最新のシートを読み込む
                </Button>
            </div>

            {/* 🚨 タブ切り替えボタン */}
            <div className="flex gap-2 border-b pb-2">
                <Button 
                    variant={activeTab === 'transfers' ? 'default' : 'ghost'} 
                    onClick={() => { setActiveTab('transfers'); setFilterInstructor(""); setFilterStudent(""); }}
                    className={activeTab === 'transfers' ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-gray-500'}
                >
                    <Clock className="w-4 h-4 mr-2" /> 振替待ちリスト
                </Button>
                <Button 
                    variant={activeTab === 'absences' ? 'default' : 'ghost'} 
                    onClick={() => { setActiveTab('absences'); setFilterInstructor(""); setFilterStudent(""); }}
                    className={activeTab === 'absences' ? 'bg-rose-600 hover:bg-rose-700' : 'text-gray-500'}
                >
                    <UserMinus className="w-4 h-4 mr-2" /> 欠席連絡リスト
                </Button>
            </div>

            {/* サマリーカード（振替残数 or 今年度欠席総数） */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {displayCounts.length > 0 ? (
                    displayCounts.map((student, idx) => (
                        <div key={idx} className="bg-white border rounded-lg p-3 shadow-sm flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-bold text-gray-700 truncate w-full">{student.name}</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-black ${activeTab === 'transfers' ? 'text-indigo-600' : 'text-rose-600'}`}>
                                    {student.count}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {activeTab === 'transfers' ? '回待ち' : '回休み'}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-4 bg-gray-50 text-gray-500 rounded-lg text-sm text-center border">
                        {activeTab === 'transfers' ? '現在、振替待ちの生徒はいません 🎉' : '今年度の欠席記録はありません ✨'}
                    </div>
                )}
            </div>

            {/* フィルターバー（両方のタブで共通稼働） */}
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mr-2">
                    <Filter className="w-4 h-4" /> 絞り込み:
                </div>
                <div className="flex-1 w-full max-w-xs relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <Input 
                        list="instructor-list"
                        placeholder="講師名を入力または選択..." 
                        value={filterInstructor}
                        onChange={(e) => setFilterInstructor(e.target.value)}
                        className="h-9 pl-9 text-sm"
                    />
                    <datalist id="instructor-list">
                        {uniqueInstructors.map(inst => <option key={inst} value={inst} />)}
                    </datalist>
                </div>
                <div className="flex-1 w-full max-w-xs relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <Input 
                        list="student-list"
                        placeholder="生徒名を入力または選択..." 
                        value={filterStudent}
                        onChange={(e) => setFilterStudent(e.target.value)}
                        className="h-9 pl-9 text-sm"
                    />
                    <datalist id="student-list">
                        {uniqueStudents.map(student => <option key={student} value={student} />)}
                    </datalist>
                </div>
                {(filterInstructor || filterStudent) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterInstructor(""); setFilterStudent(""); }} className="text-gray-500">
                        クリア
                    </Button>
                )}
            </div>

            {/* 🚨 テーブル切り替え（アクティブなタブに応じて表示を変える） */}
            <Card className={`shadow-sm ${activeTab === 'transfers' ? 'border-indigo-100' : 'border-rose-100'}`}>
                <CardHeader className={`${activeTab === 'transfers' ? 'bg-indigo-50/50' : 'bg-rose-50/50'} border-b pb-4`}>
                    <CardTitle className={`text-lg flex items-center gap-2 ${activeTab === 'transfers' ? 'text-indigo-900' : 'text-rose-900'}`}>
                        {activeTab === 'transfers' ? <Clock className="w-5 h-5" /> : <CalendarX className="w-5 h-5" />}
                        {activeTab === 'transfers' ? `未完了の振替リクエスト (${filteredTransfers.length}件)` : `欠席連絡一覧 (${filteredAbsences.length}件)`}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            {activeTab === 'transfers' ? (
                                <TableRow>
                                    <TableHead className="w-32">生徒名</TableHead>
                                    <TableHead className="w-24">担当講師</TableHead>
                                    <TableHead className="w-32">振替元日程</TableHead>
                                    <TableHead>振替先候補 / 理由</TableHead>
                                    <TableHead className="w-24 text-center">操作</TableHead>
                                </TableRow>
                            ) : (
                                <TableRow>
                                    <TableHead className="w-32">送信日時</TableHead>
                                    <TableHead className="w-32">生徒名</TableHead>
                                    <TableHead className="w-24">担当講師</TableHead>
                                    <TableHead className="w-24">特訓曜日</TableHead>
                                    <TableHead>欠席理由 / レポート進捗</TableHead>
                                </TableRow>
                            )}
                        </TableHeader>
                        <TableBody>
                            {/* --- 振替タブの表示 --- */}
                            {activeTab === 'transfers' && (
                                filteredTransfers.length > 0 ? filteredTransfers.map((req) => (
                                    <TableRow key={req.rowNumber} className="hover:bg-indigo-50/30">
                                        <TableCell className="font-bold text-gray-900">{req.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">{req.instructor}</TableCell>
                                        <TableCell><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">{req.originalDate}</span></TableCell>
                                        <TableCell className="text-sm whitespace-pre-wrap text-gray-700">
                                            {req.candidateDates}
                                            {req.reason && <div className="text-xs text-gray-400 mt-1 line-clamp-1">理由: {req.reason}</div>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button size="sm" onClick={() => handleComplete(req.rowNumber, req.name)} disabled={processingId === req.rowNumber} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
                                                {processingId === req.rowNumber ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> 完了</>}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500"><CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />条件に一致するリクエストはありません</TableCell></TableRow>
                                )
                            )}

                            {/* --- 欠席タブの表示 --- */}
                            {activeTab === 'absences' && (
                                filteredAbsences.length > 0 ? filteredAbsences.map((req) => (
                                    <TableRow key={req.rowNumber} className="hover:bg-rose-50/30">
                                        <TableCell className="text-sm text-gray-500">{req.timestamp}</TableCell>
                                        <TableCell className="font-bold text-gray-900">{req.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">{req.instructor}</TableCell>
                                        <TableCell><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">{req.dayOfWeek}</span></TableCell>
                                        <TableCell className="text-sm whitespace-pre-wrap text-gray-700">
                                            {req.reason && <div className="font-medium">📝 {req.reason}</div>}
                                            {req.reportInfo && (
                                                <div className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded border border-gray-100 flex gap-1 items-start">
                                                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                                    <span>{req.reportInfo}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500"><CalendarX className="w-8 h-8 text-gray-300 mx-auto mb-2" />条件に一致する欠席連絡はありません</TableCell></TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}