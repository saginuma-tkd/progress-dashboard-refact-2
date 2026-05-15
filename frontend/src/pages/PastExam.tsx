import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ExamManager from '../components/ExamManager';
import api from '../lib/api';
// ★ 追加: 新しく作った共通コンポーネントをインポート
import StudentSelect from '../components/common/StudentSelect';
import { BookOpen } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  email: string;
  grade?: string;
  school?: string;
}

const PastExam: React.FC = () => {
    const { user } = useAuth();
    
    // 生徒リストと選択中の生徒ID
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // ★ 追加: 学年のソート順を定義（ダッシュボードと同じ）
    const GRADE_ORDER = ["中1", "中2", "中3", "高1", "高2", "高3", "既卒", "退塾済"];

    // データ取得ロジック
    useEffect(() => {
        const init = async () => {
            if (!user) return;

            try {
                // 1. 生徒自身がログインしている場合: /students/me で自分の student_id を取得
                if (user.role === 'student') {
                    const res = await api.get('/students/me');
                    setSelectedStudentId(res.data.id);
                    setLoading(false);
                    return;
                }

                // 2. 講師/管理者の場合 -> 生徒一覧を取得
                const res = await api.get('/students'); 
                
                let fetchedStudents = res.data.filter((s: Student) => s.grade !== "退塾済");
                fetchedStudents.sort((a: Student, b: Student) => {
                    const indexA = GRADE_ORDER.indexOf(a.grade || "");
                    const indexB = GRADE_ORDER.indexOf(b.grade || "");
                    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                });

                setStudents(fetchedStudents);

                const cachedId = localStorage.getItem('lastSelectedStudentId');
                
                if (cachedId && fetchedStudents.some((s:Student) => s.id === Number(cachedId))) {
                    setSelectedStudentId(Number(cachedId));
                } else if (fetchedStudents.length > 0) {
                    setSelectedStudentId(fetchedStudents[0].id);
                }
            } catch (e) {
                console.error("Failed to fetch students", e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [user]);

    // ローディング中
    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
    }

    // 生徒が選択されていない場合
    if (!selectedStudentId) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <p className="text-lg font-semibold text-red-500 mb-2">表示できる生徒がいません</p>
                <p className="text-sm text-center">
                    担当している生徒が登録されていない可能性があります。<br />
                    管理者にご確認ください。
                </p>
            </div>
        );
    }

    const isStudent = user?.role === 'student';

    return (
        <div className="h-full w-full flex flex-col p-4 md:p-8 pt-6 gap-4">
            
            {/* ヘッダーエリア */}
            <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-none">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BookOpen className="w-6 h-6" /> 過去問/模試/入試日程
                    </h2>
                </div>
                {/* student 以外のみ生徒セレクターを表示 */}
                {!isStudent && students.length > 0 && (
                    <div className="w-full md:w-64">
                        <StudentSelect 
                            students={students}
                            selectedStudentId={selectedStudentId}
                            onSelect={(id) => {
                                setSelectedStudentId(id);
                                localStorage.setItem('lastSelectedStudentId', String(id));
                            }}
                        />
                    </div>
                )}
                {/* student の場合は自分のデータである旨を表示 */}
                {isStudent && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        自分のデータを表示中
                    </span>
                )}
            </div>

            {/* メイン機能エリア */}
            <div className="flex-1 min-h-0">
                <ExamManager key={selectedStudentId} studentId={selectedStudentId} readOnly={isStudent} />
            </div>
        </div>
    );
};

export default PastExam;
