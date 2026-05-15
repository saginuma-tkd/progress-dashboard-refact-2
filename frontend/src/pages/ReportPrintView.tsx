// frontend/src/pages/ReportPrintView.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// バックエンドから受け取るデータの型定義（必要に応じて拡張してください）
interface ReportData {
    student: { name: string; target_university?: string; grade?: string };
    dashboard: {
        total_study_time: number;
        total_progress_pct: number;
        progress_list: Array<{ book_name: string; subject: string; pct: number }>;
    };
    eiken_str: string;
    teacher_comment?: string;
    next_action?: string;
    mock_exams: Array<any>;
    past_exams: Array<any>;
}

export default function ReportPrintView() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    // URLのクエリパラメータからコメントを受け取る（オプショナル）
    const searchParams = new URLSearchParams(window.location.search);
    const comment = searchParams.get('comment');
    const action = searchParams.get('action');

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                // ※ ここは実際のバックエンドのエンドポイントに合わせて調整してください
                // 現在はPOSTで画像を一緒に送る仕様になっていますが、
                // フロントエンド完結にする場合はGETでデータだけ取得するAPIが必要です。
                const res = await api.get(`/reports/data/${studentId}`);
                setData(res.data);
            } catch (err) {
                console.error(err);
                toast.error("レポートデータの取得に失敗しました");
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchReportData();
        }
    }, [studentId]);

    // データ取得完了後、少し待ってから自動で印刷ダイアログを開く
    useEffect(() => {
        if (!loading && data) {
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 font-medium">レポート生成中...</span>
            </div>
        );
    }

    if (!data) return null;

    // 教材のステータス振り分け
    const completedBooks = data.dashboard.progress_list.filter(b => b.pct >= 100);
    const inProgressBooks = data.dashboard.progress_list.filter(b => b.pct > 0 && b.pct < 100);
    const notStartedBooks = data.dashboard.progress_list.filter(b => b.pct === 0);

    const today = new Date().toLocaleDateString('ja-JP');

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-800 p-8 print:p-0 print:bg-white">
            
            <style type="text/css">
                {`
                    @media print {
                        @page {
                            margin: 0; /* これで上下のURLと日付が消えます */
                        }
                        body {
                            /* 紙の端っこギリギリに印刷されないように、物理的な余白を少しだけ確保 */
                            padding: 10mm; 
                        }
                    }
                `}
            </style>

            {/* 画面確認用の戻るボタン＆手動印刷ボタン（印刷時は非表示） */}
            <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center print:hidden">
                {/* <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-md shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                </button> */}
                <button 
                    onClick={() => window.print()}
                    className="flex items-center text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md shadow-sm"
                >
                    <Printer className="w-4 h-4 mr-2" /> 印刷ダイアログを開く-
                </button>
            </div>

            {/* A4 Container */}
            <main className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full flex flex-col overflow-hidden relative pb-10">
                
                {/* Header */}
                <header className="bg-gray-50 flex justify-between items-center w-full px-10 py-6 border-b border-gray-200 relative z-10">
                    <div className="text-2xl font-bold tracking-tight text-blue-900">LearningDB</div>
                    <div className="text-right">
                        <p className="text-gray-500 font-medium text-sm">作成日: <span className="text-gray-900">{today}</span></p>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 px-10 py-8 flex flex-col gap-8">
                    
                    {/* 1. Report Title & Meta */}
                    <section className="flex flex-col gap-6">
                        <div className="border-b-4 border-blue-800 pb-4">
                            <span className="text-amber-700 font-bold tracking-widest text-xs uppercase">Monthly Report</span>
                            <h1 className="font-extrabold text-3xl text-blue-900 mt-1">学習進捗 統合レポート</h1>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Student Name</p>
                                <p className="font-bold text-xl text-blue-900">{data.student.name} 様</p>
                            </div>
                            {data.student.target_university && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Target University</p>
                                    <p className="font-bold text-xl text-blue-900">{data.student.target_university}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Teacher's Message (URLパラメータ or データから) */}
                    {(comment || data.teacher_comment) && (
                        <section className="break-inside-avoid">
                            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl relative overflow-hidden shadow-sm">
                                <h3 className="font-bold text-amber-800 mb-3 text-sm tracking-widest">📝 担当講師からのメッセージ</h3>
                                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                    {comment || data.teacher_comment}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* 3. KPI Cards */}
                    <section className="grid grid-cols-3 gap-6 break-inside-avoid">
                        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 mb-2">総学習時間 (推定)</p>
                            <h4 className="font-extrabold text-3xl text-blue-900">{data.dashboard.total_study_time} <span className="text-base font-bold text-gray-500">時間</span></h4>
                        </div>
                        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 mb-2">全体カリキュラム進捗率</p>
                            <h4 className="font-extrabold text-3xl text-blue-900">{data.dashboard.total_progress_pct} <span className="text-base font-bold text-gray-500">%</span></h4>
                        </div>
                        <div className="bg-blue-900 p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between border border-blue-800">
                            <p className="text-xs font-bold text-blue-200 mb-2">最新 英検ステータス</p>
                            <h4 className="font-extrabold text-2xl text-white leading-tight">{data.eiken_str}</h4>
                        </div>
                    </section>

                    {/* 4. Learning Materials Status */}
                    <section className="break-inside-avoid">
                        <h2 className="font-bold text-blue-900 text-lg mb-4 border-l-4 border-blue-900 pl-3">教材別 進捗状況</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {/* Completed */}
                            <div className="bg-gray-50 p-5 rounded-xl border-t-4 border-green-500 shadow-sm">
                                <div className="font-bold text-gray-800 text-sm mb-3">✅ 完了した教材</div>
                                <ul className="space-y-2 text-xs text-gray-600">
                                    {completedBooks.map((b, i) => <li key={i} className="line-clamp-2">{b.book_name}</li>)}
                                    {completedBooks.length === 0 && <li className="text-gray-400 italic">なし</li>}
                                </ul>
                            </div>
                            {/* In Progress */}
                            <div className="bg-gray-50 p-5 rounded-xl border-t-4 border-blue-500 shadow-sm">
                                <div className="font-bold text-gray-800 text-sm mb-3">🔵 進行中の教材</div>
                                <ul className="space-y-2 text-xs text-gray-600">
                                    {inProgressBooks.map((b, i) => <li key={i} className="line-clamp-2">{b.book_name} <span className="text-blue-600">({b.pct}%)</span></li>)}
                                    {inProgressBooks.length === 0 && <li className="text-gray-400 italic">なし</li>}
                                </ul>
                            </div>
                            {/* Not Started */}
                            <div className="bg-gray-50 p-5 rounded-xl border-t-4 border-gray-400 shadow-sm">
                                <div className="font-bold text-gray-800 text-sm mb-3">⚪ 未完了の教材</div>
                                <ul className="space-y-2 text-xs text-gray-600">
                                    {notStartedBooks.map((b, i) => <li key={i} className="line-clamp-2">{b.book_name}</li>)}
                                    {notStartedBooks.length === 0 && <li className="text-gray-400 italic">なし</li>}
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* 5. Data Tables */}
                    {data.mock_exams && data.mock_exams.length > 0 && (
                        <section className="break-inside-avoid">
                            <h2 className="font-bold text-blue-900 text-lg mb-4 border-l-4 border-blue-900 pl-3">模試成績一覧</h2>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-blue-900 bg-gray-50">
                                        <th className="py-2 px-3 font-bold text-xs text-gray-700">試験名称</th>
                                        <th className="py-2 px-3 font-bold text-xs text-gray-700">受験型</th>
                                        <th className="py-2 px-3 font-bold text-xs text-gray-700 text-center">判定</th>
                                        <th className="py-2 px-3 font-bold text-xs text-gray-700 text-right">スコア詳細</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {data.mock_exams.map((exam, i) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            <td className="py-3 px-3 font-bold text-gray-800">{exam.name}</td>
                                            <td className="py-3 px-3 text-gray-600">{exam.type}</td>
                                            <td className="py-3 px-3 text-center font-bold text-amber-700">{exam.grade}</td>
                                            <td className="py-3 px-3 text-right text-gray-600">{exam.score_summary}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                </div>
            </main>
        </div>
    );
}