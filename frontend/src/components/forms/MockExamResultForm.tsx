import React, { useState } from 'react';
import { createMockExam } from '../../api/exams';
import { toast } from 'sonner';

interface Props {
  studentId?: number;
  onSuccess?: () => void;
}

export default function MockExamResultForm({ studentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    result_type: '記述',
    mock_exam_name: '',
    mock_exam_format: '',
    grade: '',
    round: '',
    exam_date: '',
    
    // Description (記述) scores/deviations
    subject_kokugo_desc: '',
    subject_math_desc: '',
    subject_english_desc: '',
    subject_rika1_desc: '',
    subject_rika2_desc: '',
    subject_shakai1_desc: '',
    subject_shakai2_desc: '',

    // Mark (マーク) scores/deviations
    subject_kokugo_mark: '',
    subject_math1a_mark: '',
    subject_math2bc_mark: '',
    subject_english_r_mark: '',
    subject_english_l_mark: '',
    subject_rika1_mark: '',
    subject_rika2_mark: '',
    subject_shakai1_mark: '',
    subject_shakai2_mark: '',
    subject_rika_kiso1_mark: '',
    subject_rika_kiso2_mark: '',
    subject_info_mark: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        ...formData,
        student_id: studentId, // undefined or null if not provided
        exam_date: formData.exam_date || null,
      };

      // Convert number fields to numeric or null
      Object.keys(payload).forEach(key => {
        if (key.includes('_desc') || key.includes('_mark')) {
          payload[key] = payload[key] ? Number(payload[key]) : null;
        }
      });

      await createMockExam(payload);
      toast.success('模試結果を保存しました');
      if (onSuccess) onSuccess();
      
      // reset form
      setFormData(prev => ({
        ...prev,
        mock_exam_name: '',
        exam_date: '',
        subject_kokugo_desc: '',
        subject_math_desc: '',
        subject_english_desc: '',
        subject_rika1_desc: '',
        subject_rika2_desc: '',
        subject_shakai1_desc: '',
        subject_shakai2_desc: '',
        subject_kokugo_mark: '',
        subject_math1a_mark: '',
        subject_math2bc_mark: '',
        subject_english_r_mark: '',
        subject_english_l_mark: '',
        subject_rika1_mark: '',
        subject_rika2_mark: '',
        subject_shakai1_mark: '',
        subject_shakai2_mark: '',
        subject_rika_kiso1_mark: '',
        subject_rika_kiso2_mark: '',
        subject_info_mark: '',
      }));
    } catch (err) {
      console.error(err);
      toast.error('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const isDesc = formData.result_type === '記述';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2">模試結果の入力</h3>
      
      {/* 基本情報セクション */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-3">基本情報</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">形式 *</label>
            <select name="result_type" value={formData.result_type} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="記述">記述式</option>
              <option value="マーク">マーク式</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模試名 *</label>
            <input type="text" name="mock_exam_name" required value={formData.mock_exam_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 全統模試" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主催/フォーマット *</label>
            <input type="text" name="mock_exam_format" required value={formData.mock_exam_format} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 河合塾" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学年 *</label>
            <input type="text" name="grade" required value={formData.grade} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 高3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">第何回 *</label>
            <input type="text" name="round" required value={formData.round} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="例: 第1回" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">受験日</label>
            <input type="date" name="exam_date" value={formData.exam_date} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      </div>

      {/* 科目別点数セクション */}
      <div className="bg-white p-4 rounded-md border border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-3">各科目の成績 (偏差値や点数)</h4>
        
        {isDesc ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'kokugo', label: '国語' },
              { id: 'math', label: '数学' },
              { id: 'english', label: '英語' },
              { id: 'rika1', label: '理科①' },
              { id: 'rika2', label: '理科②' },
              { id: 'shakai1', label: '社会①' },
              { id: 'shakai2', label: '社会②' },
            ].map(sub => (
              <div key={sub.id}>
                <label className="block text-sm text-gray-600 mb-1">{sub.label}</label>
                <input 
                  type="number" 
                  step="0.1"
                  name={`subject_${sub.id}_desc`} 
                  value={(formData as any)[`subject_${sub.id}_desc`]} 
                  onChange={handleChange} 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'kokugo', label: '国語' },
              { id: 'math1a', label: '数IA' },
              { id: 'math2bc', label: '数IIBC' },
              { id: 'english_r', label: '英語(R)' },
              { id: 'english_l', label: '英語(L)' },
              { id: 'rika_kiso1', label: '理科基礎①' },
              { id: 'rika_kiso2', label: '理科基礎②' },
              { id: 'rika1', label: '理科①' },
              { id: 'rika2', label: '理科②' },
              { id: 'shakai1', label: '社会①' },
              { id: 'shakai2', label: '社会②' },
              { id: 'info', label: '情報' },
            ].map(sub => (
              <div key={sub.id}>
                <label className="block text-sm text-gray-600 mb-1">{sub.label}</label>
                <input 
                  type="number" 
                  step="0.1"
                  name={`subject_${sub.id}_mark`} 
                  value={(formData as any)[`subject_${sub.id}_mark`]} 
                  onChange={handleChange} 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? '保存中...' : '模試結果を登録'}
        </button>
      </div>
    </form>
  );
}
