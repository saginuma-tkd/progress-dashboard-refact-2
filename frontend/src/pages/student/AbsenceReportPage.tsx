import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Send, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

const DAYS_OF_WEEK = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];

export default function AbsenceReportPage() {
  const [form, setForm] = useState({
    day_of_week: '',
    reason: '',
    report_info: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.day_of_week || !form.reason) {
      toast.error('曜日と欠席理由は必須です。');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/applications/absence', form);
      setIsSubmitted(true);
      toast.success('欠席報告を送信しました！');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-lg text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">報告を送信しました</h2>
          <p className="text-gray-600 mb-6">
            欠席報告が正常に送信されました。<br />
            講師への連絡は完了しています。
          </p>
          <button
            onClick={() => { setIsSubmitted(false); setForm({ day_of_week: '', reason: '', report_info: '' }); }}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            別の報告をする
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-7 h-7 text-amber-500" />
          <h1 className="text-3xl font-bold text-gray-900">欠席報告</h1>
        </div>
        <p className="text-gray-600 ml-10">
          授業を欠席する場合はこちらから報告してください。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              欠席する曜日 <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
            >
              <option value="">曜日を選択してください</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              欠席理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="欠席する理由を記入してください（例: 体調不良）"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              補足・連絡事項 <span className="text-gray-400 font-normal">(任意)</span>
            </label>
            <textarea
              rows={3}
              placeholder="補講の希望など、追加で伝えたいことがあれば記入してください"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              value={form.report_info}
              onChange={(e) => setForm({ ...form, report_info: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? '送信中...' : '報告を送信する'}
          </button>
        </form>
      </div>
    </div>
  );
}
