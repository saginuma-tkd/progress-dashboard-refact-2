import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Printer, Loader2, MessageSquare } from 'lucide-react';
import { Label } from '../ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';
import html2canvas from 'html2canvas'; // ★追加

interface PrintSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: number | null;
}

export default function PrintSettingsDialog({ open, onOpenChange, studentId }: PrintSettingsDialogProps) {
    const [selected, setSelected] = useState<string[]>(["dashboard", "calendar", "mock_exams", "past_exams"]);
    const [loading, setLoading] = useState(false);

    const [teacherComment, setTeacherComment] = useState("");
    const [nextAction, setNextAction] = useState("");

const handlePrint = async () => {
        if (!studentId) {
            toast.error("対象の生徒が特定できません。");
            return;
        }

        try {
            // URLパラメータ（クエリストリング）を構築
            const params = new URLSearchParams();
            
            // 1. コメントやNext Actionが入力されていればURLに含める
            if (teacherComment) {
                params.append('comment', teacherComment);
            }
            if (nextAction) {
                params.append('action', nextAction);
            }

            // 2. 選択されたセクション（ダッシュボード、模試など）を含める
            if (selected && selected.length > 0) {
                params.append('sections', selected.join(','));
            }

            // 3. 新しく作成したReactの印刷用ルートを別タブで開く
            const printUrl = `/print-report/${studentId}?${params.toString()}`;
            window.open(printUrl, '_blank');
            
            // ダイアログを閉じる
            onOpenChange(false);

        } catch (e) {
            console.error(e);
            toast.error("レポート画面の表示に失敗しました");
        }
    };

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-blue-600" /> 
                        学習レポート出力
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-500">
                        PDFレポートに含める項目を選択してください。
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                        <label className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer transition-colors ${selected.includes("dashboard") ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}`}>
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={selected.includes("dashboard")} onChange={() => toggle("dashboard")} />
                            <span className="font-medium text-sm">学習ダッシュボード (グラフ付き)</span>
                        </label>
                        <label className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer transition-colors ${selected.includes("calendar") ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}`}>
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={selected.includes("calendar")} onChange={() => toggle("calendar")} />
                            <span className="font-medium text-sm">入試日程カレンダー</span>
                        </label>
                        <label className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer transition-colors ${selected.includes("mock_exams") ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}`}>
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={selected.includes("mock_exams")} onChange={() => toggle("mock_exams")} />
                            <span className="font-medium text-sm">模試成績一覧</span>
                        </label>
                        <label className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer transition-colors ${selected.includes("past_exams") ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}`}>
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={selected.includes("past_exams")} onChange={() => toggle("past_exams")} />
                            <span className="font-medium text-sm">過去問演習記録</span>
                        </label>
                    </div>
                </div>

                {/* --- ★新規追加: コメント入力セクション --- */}
                <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MessageSquare className="w-4 h-4" />
                        先生からのメッセージ（PDFに印字されます）
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="teacher-comment" className="text-xs text-gray-500">総合コメント・総評</Label>
                        <Textarea 
                            id="teacher-comment"
                            placeholder="今月の学習の様子や、よく頑張った点などを入力してください..."
                            className="resize-none h-24"
                            value={teacherComment}
                            onChange={(e) => setTeacherComment(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="next-action" className="text-xs text-gray-500">来月の目標・Next Action</Label>
                        <Textarea 
                            id="next-action"
                            placeholder="来月重点的に取り組むべき課題や目標を入力してください..."
                            className="resize-none h-16"
                            value={nextAction}
                            onChange={(e) => setNextAction(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button onClick={handlePrint} disabled={loading || selected.length === 0 || !studentId}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <Printer className="mr-2 h-4 w-4" />
                                PDFを表示
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}