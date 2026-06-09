import React, { useState, useEffect } from 'react';
import { Key, UserPlus, Shield, Trash2, Lock, UserCog } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import api from '../../lib/api';

interface AdminUser {
  id: number;
  username: string;
  role: string;
  tenant_id: number | null;
  school_id: number | null;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  // 管理者一覧の取得
  const fetchAdmins = async () => {
    try {
      const res = await api.get('/system_admin/super_admins');
      setAdmins(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // 管理者の追加
  const handleAddAdmin = async () => {
    if (!formData.username || !formData.password) {
      alert('ユーザー名とパスワードは必須です');
      return;
    }
    try {
      await api.post('/system_admin/super_admins', formData);
      setIsModalOpen(false);
      setFormData({ username: '', password: '' });
      fetchAdmins(); // リストを更新
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || '管理者の追加に失敗しました');
    }
  };

  // 管理者の削除
  const handleDeleteAdmin = async (id: number, username: string) => {
    if (!window.confirm(`本当にスーパー管理者「${username}」を削除しますか？\n※この操作は取り消せません。`)) {
      return;
    }
    try {
      await api.delete(`/system_admin/super_admins/${id}`);
      fetchAdmins(); // リストを更新
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || '削除に失敗しました');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="w-8 h-8 text-amber-600" /> 管理者権限の管理
          </h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" /> 管理者の招待
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
        <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex items-start gap-3 shrink-0">
          <Shield className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <strong>セキュリティ警告:</strong> super_admin権限を持つユーザーは、すべてのテナントデータの暗号化を解除し、直接操作を適用する権限を持ちます。アカウントの追加および権限の委譲は厳格なポリシーのもとで実行してください。自己管理の原則に基づき、同格の管理者を任命可能です。
          </div>
        </div>

        {/* スクロール可能なテーブルエリア */}
        <div className="flex-1 min-h-0 relative [&>div]:h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50 z-10 ring-1 ring-gray-200 shadow-sm">
              <TableRow>
                <TableHead className="w-16 text-center">ID</TableHead>
                <TableHead>ユーザー名</TableHead>
                <TableHead>権限レベル</TableHead>
                <TableHead className="text-right w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                    データを読み込んでいます...
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="text-center text-muted-foreground">{admin.id}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      {admin.username}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        <Key className="w-3 h-3" /> {admin.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 管理者追加モーダル */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Shield className="w-5 h-5" />
              新規スーパー管理者の追加
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">ユーザー名 (ID)</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="admin_name"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">初期パスワード</label>
              <div className="relative">
                <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-8"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
            <Button onClick={handleAddAdmin} className="bg-amber-600 hover:bg-amber-700 text-white">
              追加する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}