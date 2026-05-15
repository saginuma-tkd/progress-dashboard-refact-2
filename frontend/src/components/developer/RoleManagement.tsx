// frontend/src/components/developer/RoleManagement.tsx
import React, { useState, useEffect } from 'react';
import { Shield, User, ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
}

const RoleManagement: React.FC = () => {
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/developer/users');
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      setError('ユーザー一覧の取得に失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    // 🚨 3. リッチな確認ダイアログに変更！
    const isOk = await confirm({
      title: "権限を変更しますか？",
      message: `権限を「${newRole}」に変更します。\n※誤った権限付与は重大なインシデントに繋がる可能性があります。`,
      confirmText: "変更する",
      // developerやadminへの昇格は危険な操作として扱う（赤いボタンにする）
      isDestructive: newRole === 'developer' || newRole === 'admin'
    });

    if (!isOk) {
        // キャンセルされた場合、selectの見た目を元に戻すために一覧を再描画
        fetchUsers();
        return;
    }

    setUpdatingId(userId);
    try {
      await api.put(`/developer/users/${userId}/role`, { role: newRole });
      toast.success(`権限を ${newRole} に更新しました。`); // alertからtoastへ
      fetchUsers(); // 成功したら一覧を再取得
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '権限の更新に失敗しました。'); // alertからtoastへ
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
      
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-md mb-4 text-sm text-indigo-800 leading-relaxed">
        システム内の全アカウントの権限（ロール）を管理します。<br />
        <span className="font-bold">user:</span> 一般講師 / <span className="font-bold">admin:</span> 教室長・管理者 / <span className="font-bold">developer:</span> システム開発者
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">ユーザー名</th>
              <th className="px-4 py-3">現在の権限</th>
              <th className="px-4 py-3 text-center">権限変更</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-medium">
                    {getRoleIcon(user.role)}
                    {user.role}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={user.role?.toLowerCase() || 'user'}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={updatingId === user.id}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="user">User (一般)</option>
                    <option value="admin">Admin (管理者)</option>
                    <option value="developer">Developer (開発者)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoleManagement;