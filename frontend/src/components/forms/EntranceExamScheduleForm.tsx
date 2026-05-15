import React, { useState } from 'react';
import { createEntranceSchedule } from '../../api/exams';
import { toast } from 'sonner';

interface Props {
  studentId?: number;
  onSuccess?: () => void;
}

export default function EntranceExamScheduleForm({ studentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    university_name: '',
    faculty_name: '',
    department_name: '',
    exam_system: '',
    result: '未受験',
    application_deadline: '',
    exam_date: '',
    announcement_date: '',
    procedure_deadline: '',
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
        student_id: studentId,
        application_deadline: formData.application_deadline || null,
        exam_date: formData.exam_date || null,
        announcement_date: formData.announcement_date || null,
        procedure_deadline: formData.procedure_deadline || null,
      };

      await createEntranceSchedule(payload);
      toast.success('入試日程を保存しました');
      if (onSuccess) onSuccess();
      
      // reset form
      setFormData({
        ...formData,
        university_name: '',
        faculty_name: '',
        department_name: '',
        exam_system: '',
        application_deadline: '',
        exam_date: '',
        announcement_date: '',
        procedure_deadline: '',
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
      <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">入試日程/結果の入力</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">大学名 *</label>
          <input type="text" name="university_name" required value={formData.university_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="例: 慶應義塾大学" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">学部名 *</label>
          <input type="text" name="faculty_name" required value={formData.faculty_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="例: 経済学部" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">学科名</label>
          <input type="text" name="department_name" value={formData.department_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">入試方式</label>
          <input type="text" name="exam_system" value={formData.exam_system} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="例: 一般A方式" />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">日程情報</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出願締切日</label>
            <input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">試験日</label>
            <input type="date" name="exam_date" value={formData.exam_date} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">合格発表日</label>
            <input type="date" name="announcement_date" value={formData.announcement_date} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手続締切日</label>
            <input type="date" name="procedure_deadline" value={formData.procedure_deadline} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? '保存中...' : '日程を登録'}
        </button>
      </div>
    </form>
  );
}
