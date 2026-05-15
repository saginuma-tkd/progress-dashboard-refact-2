import React, { useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Send, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

export default function TransferRequestPage() {
  const [form, setForm] = useState({
    original_date: '',
    candidate_dates: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.original_date || !form.candidate_dates || !form.reason) {
      toast.error('すべての項目を入力してください。');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/applications/transfer', form);
      setIsSubmitted(true);
      toast.success('振替申請を送信しました！');
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">申請を送信しました</h2>
          <p className="text-gray-600 mb-6">
            振替申請が正常に送信されました。<br />
            講師からの確認をお待ちください。
          </p>
          <button
            onClick={() => { setIsSubmitted(false); setForm({ original_date: '', candidate_dates: '', reason: '' }); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            別の申請をする
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">振替申請</h1>
        </div>
        <p className="text-gray-600 ml-10">
          授業の振り替えを希望する場合はこちらから申請してください。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              元の授業日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.original_date}
              onChange={(e) => setForm({ ...form, original_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              振替候補日 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例: 6月3日、6月4日（複数可）"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.candidate_dates}
              onChange={(e) => setForm({ ...form, candidate_dates: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              振替理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="振替を希望する理由を記入してください"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? '送信中...' : '申請を送信する'}
          </button>
        </form>
      </div>
    </div>
  );
}
