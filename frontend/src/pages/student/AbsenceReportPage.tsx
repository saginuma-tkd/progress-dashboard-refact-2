// frontend/src/pages/student/AbsenceReportPage.tsx

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Calendar } from 'lucide-react';

const AbsenceReportPage: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [StudentPlofile, setStudentPlofile] = useState<any>(null);
  const [instructors, setInstructors] = useState<{ id: number, username: string }[]>([]);
  const [formData, setFormData] = useState({
    instructor_id: '',
    absence_date: '',
    reason: '',
    report_info: ''
  });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🌟 トークンからログイン中のユーザー名（sub）を抽出
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log("トークンデコード成功:", payload); // コンソールで中身が確認できます！

            if (payload.sub) {
              setStudentName(payload.sub); // subに入っているユーザー名をセット！
            }
          } catch (e) {
            console.error("トークンの解読に失敗しました", e);
          }
        }

        const instRes = await api.get('/students/instructors');
        setInstructors(instRes.data);
      } catch (err) {
        console.error("講師データの取得に失敗しました", err);
      }
    };
    api.get('students/me')
      .then(res => setStudentPlofile(res.data))
      .catch(err => console.error(err));
    fetchData();
  }, []);

  // 🌟【修正点3】ボタンが押された時は、APIを叩かずにダイアログを開くだけにする
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsConfirmOpen(true); // ダイアログをパッと開く
  };

  // 🌟【修正点4】ダイアログで「送信する（OK）」が押された時に、実際にAPIを叩く関数
  const handleConfirmSubmit = async () => {
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
      <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
        <Calendar className='text-red-600' />
        欠席連絡
      </h2>
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
                onChange={e => setFormData({ ...formData, instructor_id: e.target.value })}
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
                onChange={e => setFormData({ ...formData, absence_date: e.target.value })}
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
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>

            {/* レポート作成用の進捗 */}
            <div className="space-y-2">
              <Label htmlFor="report_info">レポート作成用の進捗（実施済みの範囲など）</Label>
              <Textarea
                id="report_info"
                placeholder="例: ターゲット1900は1-200まで、英文法ポラリスは1-100まで終わりました"
                value={formData.report_info}
                onChange={e => setFormData({ ...formData, report_info: e.target.value })}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full">送信する</Button>
          </form>

          {/* 🌟【修正点5】formタグの外（CardContentの中）に確認ダイアログを設置 */}
          <ConfirmDialog
            isOpen={isConfirmOpen}
            title="送信内容の確認"
            message={
              <div className="space-y-3">
                <p className="text-sm text-gray-600">以下の内容で欠席報告を送信します。よろしいですか？</p>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-left space-y-2 text-sm text-gray-700">
                  <div>
                    <span className="font-medium text-gray-500 mr-2">生徒氏名:</span>
                    {StudentPlofile?.name}
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 mr-2">担当講師:</span>
                    {instructors.find(inst => inst.id === Number(formData.instructor_id))?.username || '未選択'} 先生
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 mr-2">欠席特訓日:</span>
                    {formData.absence_date}
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 mr-2">欠席理由:</span>
                    <span className="text-gray-900 font-medium">{formData.reason}</span>
                  </div>
                  {formData.report_info && (
                    <div className="pt-1 border-t border-gray-200 mt-1">
                      <span className="font-medium text-gray-500 block mb-0.5">実施済みの範囲:</span>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border border-gray-100">
                        {formData.report_info}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            }
            confirmText="送信する"
            cancelText="キャンセル"
            isDestructive={false}
            onConfirm={handleConfirmSubmit}
            onClose={() => setIsConfirmOpen(false)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AbsenceReportPage;