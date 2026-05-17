// frontend/src/pages/admin/SystemAdminDashboard.tsx

import React, { useState, useEffect } from 'react';
import api from '../../lib/api'; // プロジェクトのaxiosインスタンスを使用
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface Tenant {
    id: number;
    name: string;
}

const SystemAdminDashboard: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [newTenantName, setNewTenantName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const fetchTenants = async () => {
        try {
            const response = await api.get('system_admin/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        try {
            await api.post('/system_admin/tenants', {
                tenant_name: newTenantName,
                admin_email: adminEmail,
                admin_password: adminPassword
            });

            setMessage({ text: '✅ 新規テナントと管理者アカウントを作成しました！', type: 'success' });
            setNewTenantName('');
            setAdminEmail('');
            setAdminPassword('');
            fetchTenants();
        } catch (error: any) {
            setMessage({
                text: `❌ 作成に失敗しました: ${error.response?.data?.detail || error.message}`,
                type: 'error'
            });
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">システム管理 (SaaS Control)</h1>

            <div className="grid md:grid-cols-2 gap-6">
                {/* テナント作成フォーム */}
                <Card>
                    <CardHeader>
                        <CardTitle>新規テナント（塾）の登録</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {message && (
                            <div className={`p-3 rounded-md mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message.text}
                            </div>
                        )}
                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="tenantName">塾の名前</Label>
                                <Input id="tenantName" value={newTenantName} onChange={e => setNewTenantName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adminEmail">初期管理者（塾長）のメールアドレス</Label>
                                <Input id="adminEmail" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adminPassword">初期パスワード</Label>
                                <Input id="adminPassword" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full">テナントを作成する</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* テナント一覧 */}
                <Card>
                    <CardHeader>
                        <CardTitle>登録済みテナント一覧</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>テナント名</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.map(tenant => (
                                    <TableRow key={tenant.id}>
                                        <TableCell className="font-medium">{tenant.id}</TableCell>
                                        <TableCell>{tenant.name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SystemAdminDashboard;