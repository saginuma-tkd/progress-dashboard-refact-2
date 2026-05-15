import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Shield, Plus, Building2, Users, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
    id: number;
    name: string;
    user_count: number;
    users: { id: number; username: string; role: string }[];
}

export default function SystemAdminDashboard() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 新規テナントフォーム
    const [newTenantName, setNewTenantName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const fetchTenants = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/system-admin/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('テナント取得エラー:', error);
            toast.error('テナント一覧の取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/system-admin/tenants', {
                tenant_name: newTenantName,
                admin_username: adminUsername,
                admin_password: adminPassword
            });
            toast.success('新規テナントを開設しました');
            setNewTenantName('');
            setAdminUsername('');
            setAdminPassword('');
            fetchTenants();
        } catch (error: any) {
            console.error('テナント作成エラー:', error);
            toast.error(error.response?.data?.detail || 'テナントの作成に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTenant = async (id: number) => {
        if (!window.confirm('本当にこのテナントを削除しますか？紐づく全データが失われます。')) return;
        
        try {
            await api.delete(`/system-admin/tenants/${id}`);
            toast.success('テナントを削除しました');
            fetchTenants();
        } catch (error) {
            console.error('テナント削除エラー:', error);
            toast.error('テナントの削除に失敗しました');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                    <Shield className="w-8 h-8 text-red-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">システム管理ダッシュボード</h1>
                    <p className="text-muted-foreground">全テナントの監視と新規開設</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 新規テナント登録フォーム */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" /> 新規テナント開設
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">テナント名（塾名・校舎名）</label>
                                <Input 
                                    placeholder="例: 横浜スカイ校" 
                                    value={newTenantName}
                                    onChange={(e) => setNewTenantName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="pt-4 border-t space-y-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">最初の管理者アカウント</p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">管理者ユーザー名（メール等）</label>
                                    <Input 
                                        placeholder="admin@example.com" 
                                        value={adminUsername}
                                        onChange={(e) => setAdminUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">パスワード</label>
                                    <Input 
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button className="w-full" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'テナントを開設する'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* テナント一覧 */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" /> 登録済みテナント一覧
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>テナント名</TableHead>
                                        <TableHead>ユーザー数</TableHead>
                                        <TableHead>メイン管理者</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenants.map((tenant) => (
                                        <TableRow key={tenant.id}>
                                            <TableCell className="font-medium">{tenant.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    {tenant.user_count}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {tenant.users.find(u => u.role === 'admin')?.username || 'なし'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeleteTenant(tenant.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {tenants.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                登録されているテナントはありません
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
