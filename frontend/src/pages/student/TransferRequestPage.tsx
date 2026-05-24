// frontend/src/pages/student/TransferRequestPage.tsx

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Clock, Check, X, MessageSquare, CalendarPlus, History, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

const TransferRequestPage: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [instructors, setInstructors] = useState<{ id: number, username: string }[]>([]);
  const [formData, setFormData] = useState({
    instructor_id: '',
    original_date: '',
    candidate_dates: '',
    reason: ''
  });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // 🌟 履歴用のステートを追加
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          setStudentName(userObj.username);
        }

        const instRes = await api.get('/students/instructors'); 
        setInstructors(instRes.data);
      } catch (err) {
        console.error("講師データの取得に失敗しました", err);
      }
    };
    fetchData();
  }, []);

  // 🌟 申請履歴を取得するEffect
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await api.get('/applications/transfer');
        console.log("🔥 取得した履歴データ:", res.data);
        setHistory(res.data);
      } catch (err) {
        console.error("履歴の取得に失敗しました", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/applications/transfer', formData);
      setMessage({ text: '✅ 振替申請を送信しました！', type: 'success' });
      setFormData({ instructor_id: '', original_date: '', candidate_dates: '', reason: '' }); 
      // 🌟 送信成功したら履歴を再読み込み
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setMessage({ text: '❌ 送信に失敗しました。', type: 'error' });
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
    <div className="container mx-auto py-2 md:py-8 px-2 md:px-4 max-w-4xl">
      <div className="mb-4 md:mb-8 px-2">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">振替申請</h1>
        <p className="text-xs md:text-sm text-gray-600">
          特訓の振替申請と、過去の申請結果の確認ができます。
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Tabs defaultValue="new" className="w-full">
          <div className="border-b border-gray-200 bg-gray-50/50 p-2">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-auto p-1 bg-gray-200/50 rounded-lg">
              <TabsTrigger
                value="new"
                className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4" /> 新規申請
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all flex items-center justify-center gap-1.5"
              >
                <History className="w-4 h-4" /> 申請履歴
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-3 md:p-6">
            {/* --- 新規申請タブ --- */}
            <TabsContent value="new" className="m-0 outline-none">
              <div className="max-w-2xl mx-auto">
                <Card className="border-none shadow-none md:border md:shadow-sm">
                  <CardContent className="pt-6 px-2 md:px-6">
                    {message && (
                      <div className={`p-3 rounded-md mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                        {message.text}
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-gray-700">生徒氏名</Label>
                        <Input value={studentName} disabled className="bg-gray-50 text-gray-500 border-gray-200" />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="instructor_id" className="text-gray-700">担当講師 <span className="text-red-500">*</span></Label>
                        <select 
                          id="instructor_id" 
                          className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                          value={formData.instructor_id}
                          onChange={e => setFormData({...formData, instructor_id: e.target.value})}
                          required
                        >
                          <option value="">選択してください</option>
                          {instructors.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.username} 先生</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="original_date" className="text-gray-700">振替元の特訓日 <span className="text-red-500">*</span></Label>
                        <Input 
                          id="original_date" 
                          type="date" 
                          value={formData.original_date}
                          onChange={e => setFormData({...formData, original_date: e.target.value})}
                          required 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="candidate_dates" className="text-gray-700">振替可能な日程（複数可） <span className="text-red-500">*</span></Label>
                        <Textarea 
                          id="candidate_dates" 
                          placeholder="例: 10月12日 18:00〜20:00、10月13日 終日可能"
                          value={formData.candidate_dates}
                          onChange={e => setFormData({...formData, candidate_dates: e.target.value})}
                          required 
                          className="resize-none h-24"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reason" className="text-gray-700">振替理由 <span className="text-red-500">*</span></Label>
                        <Textarea 
                          id="reason" 
                          placeholder="例: 学校の部活の大会が長引くため"
                          value={formData.reason}
                          onChange={e => setFormData({...formData, reason: e.target.value})}
                          required 
                          className="resize-none h-20"
                        />
                      </div>

                      <Button type="submit" className="w-full font-bold h-11 mt-2">申請する</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* --- 申請履歴タブ --- */}
            <TabsContent value="history" className="m-0 outline-none">
              {loadingHistory ? (
                <div className="py-12 text-center text-gray-500">読み込み中...</div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-gray-500">過去の申請履歴はありません。</div>
              ) : (
                <div className="space-y-4">
                  {/* 💻 PC用テーブル */}
                  <div className="hidden md:block overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3">申請日</th>
                          <th className="px-4 py-3">担当講師</th>
                          <th className="px-4 py-3">元の希望日</th>
                          <th className="px-4 py-3">振替候補日</th>
                          <th className="px-4 py-3 min-w-[200px]">結果・メッセージ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50 bg-white">
                            <td className="px-4 py-3 whitespace-nowrap">{dayjs(item.created_at).format('YYYY/MM/DD')}</td>
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{item.instructor_name || '未指定'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.original_date}</td>
                            <td className="px-4 py-3 text-xs">{item.candidate_dates}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status} />
                              {item.status === 'approved' && item.approved_date && (
                                <div className="mt-2 text-xs bg-green-50 p-2 rounded border border-green-100">
                                  <div className="text-green-800 font-bold mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> 決定日: {item.approved_date}
                                  </div>
                                  {item.instructor_comment && (
                                    <div className="text-green-700 flex items-start gap-1 mt-1.5 border-t border-green-100 pt-1.5">
                                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                      <span className="whitespace-pre-wrap break-words">{item.instructor_comment}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 📱 スマホ用カード */}
                  <div className="md:hidden flex flex-col gap-3">
                    {history.map(item => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start mb-1">
                          <StatusBadge status={item.status} />
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">{dayjs(item.created_at).format('MM/DD HH:mm')} 申請</span>
                        </div>
                        
                        <div className="text-xs text-gray-600 grid grid-cols-[70px_1fr] gap-1">
                          <span className="text-gray-400">担当講師:</span>
                          <span className="font-medium text-gray-900">{item.instructor_name || '未指定'}</span>
                          <span className="text-gray-400">元の特訓:</span>
                          <span>{item.original_date}</span>
                          <span className="text-gray-400">希望日程:</span>
                          <span>{item.candidate_dates}</span>
                        </div>

                        {/* 承認メッセージエリア */}
                        {item.status === 'approved' && item.approved_date && (
                          <div className="mt-1 text-xs bg-green-50 p-2.5 rounded border border-green-100">
                            <div className="text-green-800 font-bold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" /> 振替日: {item.approved_date}
                            </div>
                            {item.instructor_comment && (
                              <div className="text-green-700 flex items-start gap-1.5 mt-2 border-t border-green-200/60 pt-2">
                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="whitespace-pre-wrap leading-relaxed">{item.instructor_comment}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default TransferRequestPage;