import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import PastExamResultForm from '../../components/forms/PastExamResultForm';
import MockExamResultForm from '../../components/forms/MockExamResultForm';
import EntranceExamScheduleForm from '../../components/forms/EntranceExamScheduleForm';
import api from '../../lib/api';
import { BookOpen, BarChart2, Calendar, RefreshCw, Eye } from 'lucide-react';

interface MockExamSummary {
  id: number;
  mock_exam_name: string;
  exam_date: string;
  result_type: string;
  round: string;
}

interface PastExamSummary {
  id: number;
  date: string;
  university_name: string;
  subject: string;
  correct_answers: number;
  total_questions: number;
}

interface AcceptanceSummary {
  id: number;
  university_name: string;
  faculty_name: string;
  exam_date: string;
  result: string;
}

export default function SubmitResultsPage() {
  const [studentId, setStudentId] = useState<number | null>(null);
  const [mockExams, setMockExams] = useState<MockExamSummary[]>([]);
  const [pastExams, setPastExams] = useState<PastExamSummary[]>([]);
  const [acceptances, setAcceptances] = useState<AcceptanceSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 自分の student_id を取得
  useEffect(() => {
    api.get('/students/me')
      .then(res => setStudentId(res.data.id))
      .catch(err => console.error('Failed to fetch student profile:', err));
  }, []);

  // 自分のデータを取得
  useEffect(() => {
    if (!studentId) return;
    setLoadingData(true);
    Promise.all([
      api.get(`/exams/mock/${studentId}`),
      api.get(`/exams/pastexam/${studentId}`),
      api.get(`/exams/acceptance/${studentId}`),
    ]).then(([mockRes, pastRes, accRes]) => {
      setMockExams(mockRes.data);
      setPastExams(pastRes.data);
      setAcceptances(accRes.data);
    }).catch(err => console.error('Failed to fetch exam data:', err))
      .finally(() => setLoadingData(false));
  }, [studentId, refreshKey]);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">成績・入試日程の管理</h1>
        <p className="text-gray-600">
          過去問の結果、模試の成績、入試日程を登録・確認できます。
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Tabs defaultValue="mock" className="w-full">
          <div className="border-b border-gray-200 bg-gray-50/50 p-2">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto h-auto p-1 bg-gray-200/50 rounded-lg">
              <TabsTrigger
                value="mock"
                className="py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-1.5"
              >
                <BarChart2 className="w-4 h-4" /> 模試成績
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" /> 過去問結果
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" /> 入試日程
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 space-y-8">
            {/* ── 模試タブ ── */}
            <TabsContent value="mock" className="m-0 outline-none space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <MockExamResultForm studentId={studentId ?? undefined} onSuccess={handleSuccess} />
              </div>

              {/* 登録済みデータ一覧 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> 登録済みの模試成績
                  </h3>
                  <button onClick={() => setRefreshKey(k => k + 1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {loadingData ? (
                  <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
                ) : mockExams.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">まだ登録がありません</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                        <tr>
                          <th className="px-4 py-2">受験日</th>
                          <th className="px-4 py-2">模試名</th>
                          <th className="px-4 py-2">形式</th>
                          <th className="px-4 py-2">回</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockExams.map(item => (
                          <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600">{item.exam_date}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{item.mock_exam_name}</td>
                            <td className="px-4 py-2 text-gray-600">{item.result_type}</td>
                            <td className="px-4 py-2 text-gray-600">{item.round}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── 過去問タブ ── */}
            <TabsContent value="past" className="m-0 outline-none space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <PastExamResultForm studentId={studentId ?? undefined} onSuccess={handleSuccess} />
              </div>

              {/* 登録済みデータ一覧 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> 登録済みの過去問結果
                  </h3>
                  <button onClick={() => setRefreshKey(k => k + 1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {loadingData ? (
                  <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
                ) : pastExams.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">まだ登録がありません</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                        <tr>
                          <th className="px-4 py-2">実施日</th>
                          <th className="px-4 py-2">大学名</th>
                          <th className="px-4 py-2">科目</th>
                          <th className="px-4 py-2">得点</th>
                          <th className="px-4 py-2">正答率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastExams.map(item => (
                          <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600">{item.date}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{item.university_name}</td>
                            <td className="px-4 py-2 text-gray-600">{item.subject}</td>
                            <td className="px-4 py-2 text-gray-700 font-medium">{item.correct_answers} / {item.total_questions}</td>
                            <td className="px-4 py-2">
                              {item.total_questions > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {Math.round((item.correct_answers / item.total_questions) * 100)}%
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── 入試日程タブ ── */}
            <TabsContent value="schedule" className="m-0 outline-none space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <EntranceExamScheduleForm studentId={studentId ?? undefined} onSuccess={handleSuccess} />
              </div>

              {/* 登録済みデータ一覧 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> 登録済みの入試日程
                  </h3>
                  <button onClick={() => setRefreshKey(k => k + 1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {loadingData ? (
                  <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
                ) : acceptances.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">まだ登録がありません</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                        <tr>
                          <th className="px-4 py-2">大学名</th>
                          <th className="px-4 py-2">学部</th>
                          <th className="px-4 py-2">試験日</th>
                          <th className="px-4 py-2">結果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptances.map(item => (
                          <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">{item.university_name}</td>
                            <td className="px-4 py-2 text-gray-600">{item.faculty_name}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600">{item.exam_date}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.result === '合格' ? 'bg-green-100 text-green-700' :
                                item.result === '不合格' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {item.result || '未受験'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
