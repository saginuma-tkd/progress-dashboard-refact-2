import React, { useState } from 'react';
import { createPastExam } from '../../api/exams';
import { toast } from 'sonner';

interface Props {
  studentId?: number;
  onSuccess?: () => void;
}

export default function PastExamResultForm({ studentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    university_name: '',
    faculty_name: '',
    exam_system: '',
    year: new Date().getFullYear(),
    subject: '',
    time_required: '',
    total_time_allowed: '',
    correct_answers: '',
    total_questions: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        student_id: studentId, // undefined or null if not provided
        year: Number(formData.year),
        time_required: formData.time_required ? Number(formData.time_required) : null,
        total_time_allowed: formData.total_time_allowed ? Number(formData.total_time_allowed) : null,
        correct_answers: formData.correct_answers ? Number(formData.correct_answers) : null,
        total_questions: formData.total_questions ? Number(formData.total_questions) : null,
      };
      await createPastExam(payload);
      toast.success('過去問結果を保存しました');
      if (onSuccess) onSuccess();
      // reset form
      setFormData({
        ...formData,
        date: '',
        university_name: '',
        faculty_name: '',
        exam_system: '',
        subject: '',
        time_required: '',
        total_time_allowed: '',
        correct_answers: '',
        total_questions: '',
      });
    } catch (err) {
      console.error(err);
      toast.error('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">過去問結果の入力</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">受験日 *</label>
          <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">年度 *</label>
          <input type="number" name="year" required value={formData.year} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">大学名 *</label>
          <input type="text" name="university_name" required value={formData.university_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 早稲田大学" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">学部名</label>
          <input type="text" name="faculty_name" value={formData.faculty_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 商学部" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">入試方式</label>
          <input type="text" name="exam_system" value={formData.exam_system} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 一般" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">科目 *</label>
          <input type="text" name="subject" required value={formData.subject} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 英語" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">所要時間 (分)</label>
          <input type="number" name="time_required" value={formData.time_required} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 85" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">制限時間 (分)</label>
          <input type="number" name="total_time_allowed" value={formData.total_time_allowed} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 90" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">正答数</label>
          <input type="number" name="correct_answers" value={formData.correct_answers} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 35" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">問題数</label>
          <input type="number" name="total_questions" value={formData.total_questions} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 50" />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? '保存中...' : '登録する'}
        </button>
      </div>
    </form>
  );
}
