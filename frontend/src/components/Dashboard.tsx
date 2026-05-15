import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Printer, Edit2, Clock, Target, TrendingUp, Award, Calendar, Loader2, ChevronDown, Search, House, FileText, Copy, Check } from 'lucide-react';

// コンポーネント読み込み
import ProgressChart from './ProgressChart';
import ProgressList from './ProgressList';
import PrintSettingsDialog from './common/PrintSettingsDialog';
import StudentSelect from './common/StudentSelect';

// 型定義
interface Student {
  id: number;
  name: string;
  grade?: string;
}

interface DashboardData {
  total_study_time: number;
  total_planned_time?: number;
  progress_rate?: number;
  eiken_grade?: string; 
  eiken_score?: string;
  eiken_date?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  
  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 英検編集用State
  const [isEikenModalOpen, setIsEikenModalOpen] = useState(false);
  const [editEikenGrade, setEditEikenGrade] = useState("");
  const [editEikenScore, setEditEikenScore] = useState("");
  const [editEikenDate, setEditEikenDate] = useState("");

  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [memoText, setMemoText] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  const [isCopied, setIsCopied] = useState(false);

  // ★追加: 印刷ダイアログ開閉ステート
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // 表示用に整形したデータを保持するState
  const [displayEiken, setDisplayEiken] = useState({
    grade: "未登録",
    score: "-",
    date: "-"
  });
  const isStudent = user?.role === 'student';

  const GRADE_ORDER = ["中1", "中2", "中3", "高1", "高2", "高3", "既卒", "退塾済"];

  useEffect(() => {}, []);

  // 1. 生徒一覧取得 & 初期選択
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        if (isStudent) {
          // studentロールの場合: 自分自身の student_id を取得
          const res = await api.get('/students/me');
          setSelectedStudentId(res.data.id);
          setLoading(false);
          return;
        }
        const res = await api.get('/students');

        let fetchedStudents = res.data.filter((s: Student) => s.grade !== "退塾済");
        fetchedStudents.sort((a: Student, b: Student) => {
          const indexA = GRADE_ORDER.indexOf(a.grade || "");
          const indexB = GRADE_ORDER.indexOf(b.grade || "");
          return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        setStudents(fetchedStudents);
        // ★ 修正: ローカルストレージから前回選択した生徒のIDを取得
        const cachedId = localStorage.getItem('lastSelectedStudentId');
        
        if (cachedId && fetchedStudents.some((s:Student) => s.id === Number(cachedId))) {
            // 記憶があった ＆ その生徒が今のリストに存在する場合
            setSelectedStudentId(Number(cachedId));
        } else if (fetchedStudents.length > 0) {
            // 記憶がない場合は一番上の生徒を選択
            setSelectedStudentId(fetchedStudents[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // 2. ダッシュボード基本データ取得
  const fetchDashboardData = async () => {
    if (!selectedStudentId) return;
    try {
      const res = await api.get(`/dashboard/${selectedStudentId}`);
      setData(res.data);
      
      // === データ解析ロジック ===
      let g = res.data.eiken_grade || "";
      let s = res.data.eiken_score || "";
      let d = res.data.eiken_date || "";

      if (s.includes(" / ")) {
          const parts = s.split(" / ");
          g = parts[0] || ""; 
          s = parts[1] || ""; 
          d = parts[2] || ""; 
      }

      g = g.replace(" None", "").replace(" 合格", "").replace(" 不合格", "").trim();
      s = s.replace("CSE ", "").trim();

      if (g !== "未登録" && g !== "" && !g.endsWith("級")) {
          g = `${g}級`;
      }

      setDisplayEiken({
          grade: g || "未登録",
          score: s || "-",
          date: d || "-"
      });

      setEditEikenGrade(g);
      setEditEikenScore(s);
      setEditEikenDate(d);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedStudentId, refreshTrigger]);

  // 3. 英検スコア更新
  const handleUpdateEiken = async () => {
    try {
      const combinedScore = `${editEikenGrade} / CSE ${editEikenScore} / ${editEikenDate}`;
      await api.patch(`/students/${selectedStudentId}/eiken`, { 
          score: combinedScore
      });
      setIsEikenModalOpen(false);
      fetchDashboardData();
    } catch (e) {
      alert("更新失敗");
    }
  };

  const handleCopyMemo = async () => {
    try {
      await navigator.clipboard.writeText(memoText);
      setIsCopied(true);
      // 2秒後に「コピーしました」の表示を元に戻す
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      alert("クリップボードへのコピーに失敗しました");
    }
  };

  const handleOpenMemo = async () => {
    if (!selectedStudentId) return;
    setIsMemoModalOpen(true);
    setMemoText(""); // 初期化
    try {
      const res = await api.get(`/students/${selectedStudentId}/memo`);
      setMemoText(res.data.memo || "");
    } catch (error) {
      console.error("メモの取得に失敗しました", error);
    }
  };

  const handleSaveMemo = async () => {
    if (!selectedStudentId) return;
    setIsSavingMemo(true);
    try {
      await api.patch(`/students/${selectedStudentId}/memo`, { memo: memoText });
      setIsMemoModalOpen(false);
    } catch (error) {
      alert("メモの保存に失敗しました");
    } finally {
      setIsSavingMemo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[80vh] gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-lg font-medium text-gray-600">学習データを解析中...</p>
        <p className="text-sm text-gray-400">偏差値と学習ルートの傾斜計算を行っています</p>
      </div>
    );
  }
  if (!selectedStudentId) return <div className="p-8 text-center">生徒が選択されていません</div>;

  return (
    <div className="flex flex-col gap-6 h-full p-1">
      {/* ヘッダーエリア */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex-none">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <House className="w-6 h-6" /> 学習ダッシュボード
          </h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* student以外は生徒セレクターを表示 */}
          {!isStudent && students.length > 0 && (
            <StudentSelect 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelect={(id) => {
                    setSelectedStudentId(id);
                    localStorage.setItem('lastSelectedStudentId', String(id));
                }}
            />
          )}
          {/* メモボタン: student以外のみ */}
          {!isStudent && (
            <Button variant="outline" onClick={handleOpenMemo}>
              <FileText className="w-4 h-4 mr-2" /> メモ
            </Button>
          )}
          {/* 印刷ボタン: student以外のみ */}
          {!isStudent && (
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(true)}>
              <Printer className="w-4 h-4 mr-2" /> レポート出力
            </Button>
          )}
          {/* studentの場合は自分の学習データであることを明示 */}
          {isStudent && (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">自分のデータを表示中</span>
          )}
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start print:block h-full">
        
        {/* === 左列: グラフ(上) + KPI(下) === */}
        <div className="flex flex-col gap-4 w-full h-full">
            
            {/* 1. グラフコンポーネント */}
            <div id="chart-container" className="w-full flex-1 min-h-[300px] bg-white p-2 rounded border">
                <ProgressChart studentId={selectedStudentId} refreshTrigger={refreshTrigger} />
            </div>

            {/* 2. KPIカード群 */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium">総学習時間</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{data?.total_study_time || 0}<span className="text-sm font-normal ml-1">時間</span></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium">学習予定</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{data?.total_planned_time || 0}<span className="text-sm font-normal ml-1">時間</span></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium">達成率</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{data?.progress_rate || 0}<span className="text-sm font-normal ml-1">%</span></div>
                    </CardContent>
                </Card>
                
                <Card className="relative">
                    {/* 英検編集ボタン: studentは非表示 */}
                    {!isStudent && (
                      <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-2 right-2 h-6 w-6 p-0 print:hidden" 
                          onClick={() => setIsEikenModalOpen(true)}
                      >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                      </Button>
                    )}
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium">英検スコア</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="flex flex-col gap-0.5">
                            <div className="text-lg font-bold truncate leading-tight">
                                {displayEiken.grade} <span className="text-sm font-normal">CSE: {displayEiken.score}</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {displayEiken.date}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* === 右列: 参考書リスト === */}
        <div className="w-full h-full overflow-hidden rounded-lg border bg-white shadow-sm print:h-auto print:overflow-visible">
            <div className="h-full overflow-y-auto p-1">
                <ProgressList 
                    studentId={selectedStudentId} 
                    onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                    readOnly={isStudent}
                />
            </div>
        </div>

      </div>

      {/* 英検編集モーダル */}
      <Dialog open={isEikenModalOpen} onOpenChange={setIsEikenModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>英検情報編集</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="grade">級</Label>
                    <Input id="grade" value={editEikenGrade} onChange={(e) => setEditEikenGrade(e.target.value)} placeholder="例: 準2級" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="score">CSEスコア</Label>
                    <Input id="score" value={editEikenScore} onChange={(e) => setEditEikenScore(e.target.value)} placeholder="例: 1950" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="date">試験日</Label>
                <Input id="date" value={editEikenDate} onChange={(e) => setEditEikenDate(e.target.value)} placeholder="例: 2025-06-01" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateEiken}>更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ★追加: メモ編集モーダル (returnの一番下、他のDialogの隣等に配置) */}
      <Dialog open={isMemoModalOpen} onOpenChange={setIsMemoModalOpen}>
        <DialogContent className="sm:max-w-[800px] w-[95vw]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>自分専用メモ</DialogTitle>
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleCopyMemo}
                className="mt-0 flex items-center gap-2"
            >
              {isCopied ? (
                  <><Check className="w-4 h-4 text-green-600" /> コピー完了</>
              ) : (
                  <><Copy className="w-4 h-4" /> 一括コピー</>
              )}
            </Button>
          </DialogHeader>
          <div className="py-2">
            <Textarea 
              value={memoText} 
              onChange={(e) => setMemoText(e.target.value)} 
              placeholder="自分だけが見れるメモを入力してください..."
              className="min-h-[50vh] md:min-h-[500px] text-base leading-relaxed resize-y"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMemoModalOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveMemo} disabled={isSavingMemo}>
              {isSavingMemo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ★追加: 印刷設定ダイアログ */}
      <PrintSettingsDialog 
        open={isPrintDialogOpen} 
        onOpenChange={setIsPrintDialogOpen}
        studentId={selectedStudentId}
      />
    </div>
  );
}