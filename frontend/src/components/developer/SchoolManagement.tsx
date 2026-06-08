// frontend/src/components/admin/SchoolManagement.tsx

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Building2, ShieldCheck, Landmark } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext'; // 🌟 ここで確実な権限情報を呼び出す

export default function SchoolManagement() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSchoolName, setNewSchoolName] = useState('');

  // 🌟 localStorage ではなく確実に Context からユーザー情報を取得
  const { user } = useAuth();
  const userRole = user?.role || '';

  useEffect(() => {
    fetchSchools();
  }, []);

  // 校舎一覧の取得 API
  const fetchSchools = async () => {
    setLoading(true);
    try {
      // 🌟 APIの末尾にスラッシュ (/) を追加 (FastAPIのリダイレクトエラー対策)
      const res = await api.get('/schools/');
      setSchools(res.data);
    } catch (err) {
      console.error(err);
      toast.error('校舎データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 新規校舎の追加処理
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    try {
      // 🌟 APIの末尾にスラッシュ (/) を追加
      await api.post('/schools/', { name: newSchoolName });
      toast.success(`校舎「${newSchoolName}」を開設しました`);
      setNewSchoolName('');
      fetchSchools();
    } catch (err) {
      console.error(err);
      toast.error('校舎の開設に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">
            現在の権限: <strong className="text-indigo-700">{userRole === 'developer' ? 'テナント長（全体管理者）' : '校舎長（ブランチ管理者）'}</strong>
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {userRole === 'developer' ? '全校舎の開設・削除権限があります。' : '所属校舎の閲覧権限があります。'}
        </p>
      </div>

      {/* 🏢 テナント長（developer）だけに表示する「新規校舎作成フォーム」 */}
      {userRole === 'developer' && (
        <form onSubmit={handleCreateSchool} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-gray-500" /> 新規校舎（ブランチ）の開設
          </h4>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="例: 横浜校、千葉校"
              value={newSchoolName}
              onChange={e => setNewSchoolName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newSchoolName.trim()} className="font-bold shrink-0">
              <Plus className="w-4 h-4 mr-1" /> 校舎を追加
            </Button>
          </div>
        </form>
      )}

      {/* 📊 校舎一覧表示エリア */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">校舎ID</th>
              <th className="px-6 py-3">校舎名</th>
              <th className="px-6 py-3 text-right">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">読み込み中...</td></tr>
            ) : schools.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">登録されている校舎はありません。</td></tr>
            ) : (
              schools.map((school) => (
                <tr key={school.id} className="border-b hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">#{school.id}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-gray-400" /> {school.name}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      稼働中
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}