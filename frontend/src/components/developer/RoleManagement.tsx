// frontend/src/components/developer/RoleManagement.tsx

import React, { useState, useEffect } from 'react';
import { Shield, User, ShieldAlert, RefreshCw, AlertCircle, Landmark, UserPlus, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import api from '../../lib/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  school_id: number | null;
  school?: string; // 🌟 古いデータ用の文字列カラムも受け取れるように追加
}

interface SchoolData {
  id: number;
  name: string;
}

const RoleManagement: React.FC = () => {
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserData[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [schoolId, setSchoolId] = useState('');
  const [creating, setCreating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const fetchData = async () => {
    try {
      const [usersRes, schoolsRes] = await Promise.all([
        api.get('/developer/users'),
        api.get('/schools/')
      ]);
      setUsers(usersRes.data);
      setSchools(schoolsRes.data);
      setError(null);
    } catch (err: any) {
      setError('データの取得に失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setCreating(true);
    try {
      await api.post('/developer/users/', {
        username: username,
        role: role,
        school_id: role === 'developer' ? null : (schoolId === "" ? null : Number(schoolId))
      });

      toast.success(`アカウント「${username}」を作成しました`);
      setUsername('');
      setRole('user');
      setSchoolId('');
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'ユーザーの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (currentUser: UserData, newRole: string, newSchoolIdStr: string) => {
    const newSchoolId = newRole === 'developer' ? null :
      (newSchoolIdStr === "" ? null : Number(newSchoolIdStr));

    const isRoleChanged = currentUser.role !== newRole;

    if (isRoleChanged) {
      const isOk = await confirm({
        title: "権限を変更しますか？",
        message: `権限を「${newRole}」に変更します。\n※誤った権限付与は重大なインシデントに繋がる可能性があります。`,
        confirmText: "変更する",
        isDestructive: newRole === 'developer' || newRole === 'admin'
      });
      if (!isOk) {
        fetchData();
        return;
      }
    } else {
      const isOk = await confirm({
        title: "所属校舎を変更しますか？",
        message: "このユーザーの所属（ブランチ）を移動します。",
        confirmText: "移動する"
      });
      if (!isOk) {
        fetchData();
        return;
      }
    }

    setUpdatingId(currentUser.id);
    try {
      await api.put(`/developer/users/${currentUser.id}/role`, {
        role: newRole,
        school_id: newSchoolId
      });
      toast.success('ユーザー情報を更新しました。');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '更新に失敗しました。');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'developer': return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-amber-600" />;
      default: return <User className="w-4 h-4 text-blue-600" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 新規ユーザー作成フォーム */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between font-bold text-gray-700 hover:bg-gray-100/70 transition-colors text-sm"
        >
          <span className="flex items-center gap-1.5 text-indigo-600">
            <UserPlus className="w-4 h-4" /> 新規ユーザーアカウントの発行
          </span>
          {isFormOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isFormOpen && (
          <form onSubmit={handleCreateUser} className="p-4 border-t space-y-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">ユーザー名</label>
                <Input type="text" placeholder="例: sato_tokyo" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">役割・権限</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="user">User (一般講師)</option>
                  <option value="admin">Admin (校舎長)</option>
                  <option value="developer">Developer (塾長)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">所属校舎</label>
                <select value={schoolId} onChange={e => setSchoolId(e.target.value)} disabled={role === 'developer'} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  <option value="">未設定 (本部)</option>
                  {schools.map(school => (
                    <option key={school.id} value={String(school.id)}>{school.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">※初期パスワードは「password123」で統一されます。</p>
              <Button type="submit" disabled={creating || !username.trim()} className="font-bold">
                {creating ? 'アカウント作成中...' : 'アカウントを発行する'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 検索バー＆フィルター */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input type="text" placeholder="ユーザー名で検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-gray-50/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-10 w-48 rounded-md border border-input bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="all">すべての権限を表示</option>
            <option value="user">User (一般講師)</option>
            <option value="admin">Admin (校舎長)</option>
            <option value="developer">Developer (塾長)</option>
          </select>
        </div>
      </div>

      {/* ユーザー一覧テーブル部分 */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">ユーザー名</th>
              <th className="px-4 py-3">権限 (Role)</th>
              <th className="px-4 py-3 min-w-[200px]">所属校舎 (Branch)</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">#{user.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <select
                        value={user.role?.toLowerCase() || 'user'}
                        onChange={(e) => handleUpdate(user, e.target.value, user.school_id ? String(user.school_id) : "")}
                        disabled={updatingId === user.id}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="user">User (一般講師)</option>
                        <option value="admin">Admin (校舎長)</option>
                        <option value="developer">Developer (塾長)</option>
                      </select>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-gray-400" />
                        {/* 🌟 修正: IDの型を確実に「文字列」に揃えてバインディングする */}
                        <select
                          value={user.school_id != null ? String(user.school_id) : ""}
                          onChange={(e) => handleUpdate(user, user.role, e.target.value)}
                          disabled={user.role === 'developer' || updatingId === user.id}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 disabled:opacity-50 cursor-pointer"
                        >
                          <option value="">未設定 (本部)</option>
                          {schools.map(school => (
                            <option key={school.id} value={String(school.id)}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* 🌟 追加: IDは空だけど、文字の校舎名（school）だけは持っている古いデータへの対策 */}
                      {!user.school_id && user.school && (
                        <span className="text-[10px] text-red-500 font-bold ml-6">
                          ※データ未紐付 (文字情報: {user.school})
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  条件に一致するユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoleManagement;