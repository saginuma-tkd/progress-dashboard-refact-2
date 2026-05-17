// frontend/src/pages/student/AbsenceReportPage.tsx

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

const AbsenceReportPage: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [instructors, setInstructors] = useState<{ id: number, username: string }[]>([]);
  const [formData, setFormData] = useState({
    instructor_id: '',
    absence_date: '',
    reason: '',
    report_info: ''
  });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. 自分の名前はローカルストレージ（ログイン情報）から直接取得する
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          setStudentName(userObj.username);
        }

        // 2. 講師一覧は先ほど新しく作った専用APIから取得する
        const instRes = await api.get('/students/instructors'); // ※もし common.py に書いた場合は /common/instructors にしてください
        setInstructors(instRes.data);
      } catch (err) {
        console.error("講師データの取得に失敗しました", err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/applications/absence', formData);
      setMessage({ text: '✅ 欠席連絡を送信しました。', type: 'success' });
      setFormData({ instructor_id: '', absence_date: '', reason: '', report_info: '' });
    } catch (err) {
      setMessage({ text: '❌ 送信に失敗しました。', type: 'error' });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">欠席連絡</h1>
      <Card>
        <CardContent className="pt-6">
          {message && (
            <div className={`p-3 rounded-md mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 生徒氏名 */}
            <div className="space-y-2">
              <Label>生徒氏名</Label>
              <Input value={studentName} disabled className="bg-gray-100" />
            </div>

            {/* 担当講師 */}
            <div className="space-y-2">
              <Label htmlFor="instructor_id">担当講師</Label>
              <select 
                id="instructor_id" 
                className="w-full border rounded-md p-2" 
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

            {/* 欠席する特訓日 */}
            <div className="space-y-2">
              <Label htmlFor="absence_date">欠席する特訓日</Label>
              <Input 
                id="absence_date" 
                type="date" 
                value={formData.absence_date}
                onChange={e => setFormData({...formData, absence_date: e.target.value})}
                required 
              />
            </div>

            {/* 欠席理由 */}
            <div className="space-y-2">
              <Label htmlFor="reason">欠席理由</Label>
              <Textarea 
                id="reason" 
                placeholder="例: 体調不良のため"
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                required 
              />
            </div>

            {/* レポート作成用の進捗 */}
            <div className="space-y-2">
              <Label htmlFor="report_info">レポート作成用の進捗（実施済みの範囲など）</Label>
              <Textarea 
                id="report_info" 
                placeholder="例: 英語ルート表の単語帳 100〜200番まで完了しました。"
                value={formData.report_info}
                onChange={e => setFormData({...formData, report_info: e.target.value})}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full">送信する</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AbsenceReportPage;