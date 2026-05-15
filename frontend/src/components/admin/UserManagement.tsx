// frontend/src/components/admin/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Edit, Trash2, UserPlus, Save, X, UserCog, Building2 } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function UserManagement() {
    const { user } = useAuth();
    const confirm = useConfirm();
    const [users, setUsers] = useState<any[]>([]);
    const [schools, setSchools] = useState<string[]>([]); // 校舎リスト用のState
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ username: "", school: "", password: "", role: "user" }); // デフォルトをuserに

    // 自由入力かドロップダウンかを選択するフラグ
    const [isNewSchool, setIsNewSchool] = useState(false); 

    useEffect(() => { 
        fetchUsers(); 
        fetchSchools(); // コンポーネントマウント時に校舎リストを取得
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/instructors');
            setUsers(res.data);
        } catch (e) { toast.error("取得エラー"); }
    };

    const fetchSchools = async () => {
        try {
            const res = await api.get('/admin/schools');
            setSchools(res.data);
            if (res.data.length === 0) setIsNewSchool(true); // 登録校舎がない場合は自由入力をデフォルトに
        } catch (e) { console.error("校舎取得エラー", e); }
    };

    const handleCreate = async () => {
        if (!createForm.username || !createForm.password) {
            toast.error("ユーザー名とパスワードは必須です");
            return;
        }
        try {
            await api.post('/admin/users', createForm);
            toast.success("講師を作成しました");
            setIsCreateOpen(false);
            setCreateForm({ username: "", school: "", password: "", role: "user" });
            setIsNewSchool(false);
            fetchUsers();
            fetchSchools(); // 校舎が増えたかもしれないので更新
        } catch (e) { toast.error("作成失敗: ユーザー名が重複している可能性があります"); }
    };

    const handleSave = async () => {
        try {
            await api.patch(`/admin/users/${editingId}`, editForm);
            toast.success("更新しました");
            setEditingId(null);
            fetchUsers();
            fetchSchools();
        } catch (e) { toast.error("更新失敗"); }
    };

const handleDelete = async (id: number) => {
        const isOk = await confirm({
            title: "講師データを削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true 
        });
        
        if (!isOk) return;

        try {
            // 🚨 修正1: students ではなく users (講師) のエンドポイントに修正！
            await api.delete(`/admin/users/${id}`);
            
            // 🚨 修正2: fetchData を消して、以下の2つに差し替え！
            fetchUsers();
            fetchSchools();
            
            toast.success("削除しました");
        } catch (e) { 
            toast.error("削除失敗"); 
        }
    };
    
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <UserCog className="w-5 h-5" /> 講師アカウント管理
                </CardTitle>
                <Button onClick={() => setIsCreateOpen(true)} size="sm">
                    <UserPlus className="w-4 h-4 mr-2" /> 新規登録
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>氏名 (ユーザー名)</TableHead>
                            <TableHead>所属校舎</TableHead>
                            <TableHead>権限</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell>{u.id}</TableCell>
                                {editingId === u.id ? (
                                    <>
                                        <TableCell>
                                            <Input 
                                                value={editForm.username} 
                                                onChange={e => setEditForm({...editForm, username: e.target.value})} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={editForm.school || ""} 
                                                onChange={e => setEditForm({...editForm, school: e.target.value})} 
                                                placeholder="例: 東京校"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v})}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="user">User</SelectItem>
                                                    {/* DeveloperがDeveloperを編集する場合などは要件に合わせて追加 */}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="text-green-600" onClick={handleSave}>
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="font-medium">{u.username}</TableCell>
                                        <TableCell>
                                            {u.school ? (
                                                <div className="flex items-center gap-1 text-gray-700">
                                                    <Building2 className="w-3 h-3" /> {u.school}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell><span className="px-2 py-1 rounded bg-blue-100 text-xs">{u.role}</span></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" onClick={() => { setEditingId(u.id); setEditForm({...u}); }}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDelete(u.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>新規講師登録</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>ユーザー名 (必須)</Label>
                            <Input 
                                value={createForm.username} 
                                onChange={e => setCreateForm({...createForm, username: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>パスワード (必須)</Label>
                            <Input 
                                type="password" 
                                value={createForm.password} 
                                onChange={e => setCreateForm({...createForm, password: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>権限 (ロール)</Label>
                            <Select value={createForm.role} onValueChange={v => setCreateForm({...createForm, role: v})}>
                                <SelectTrigger><SelectValue placeholder="権限を選択" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">管理者 (Admin)</SelectItem>
                                    <SelectItem value="user">一般講師 (User)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>所属校舎</Label>
                                {/* 🚨 Developer権限の時だけ「新しい校舎を追加する」ボタンを表示 */}
                                {user?.role === 'developer' && schools.length > 0 && (
                                    <Button 
                                        variant="link" 
                                        className="h-auto p-0 text-xs text-blue-600" 
                                        onClick={() => {
                                            setIsNewSchool(!isNewSchool);
                                            setCreateForm({...createForm, school: ""});
                                        }}
                                    >
                                        {isNewSchool ? "リストから選択する" : "新しい校舎を入力する"}
                                    </Button>
                                )}
                            </div>
                            
                            {/* 🚨 Admin権限の場合は自分の校舎で固定して入力をロックする */}
                            {user?.role === 'admin' ? (
                                <Input 
                                    value={user.school || ""} 
                                    disabled 
                                    className="bg-gray-100 text-gray-500 cursor-not-allowed"
                                    title="管理者は自校舎のみユーザーを作成できます"
                                />
                            ) : (
                                /* Developer権限の場合は今まで通り自由に選択・入力できる */
                                isNewSchool || schools.length === 0 ? (
                                    <Input 
                                        value={createForm.school} 
                                        onChange={e => setCreateForm({...createForm, school: e.target.value})} 
                                        placeholder="新しい校舎名を入力"
                                    />
                                ) : (
                                    <Select value={createForm.school} onValueChange={v => setCreateForm({...createForm, school: v})}>
                                        <SelectTrigger><SelectValue placeholder="校舎を選択してください" /></SelectTrigger>
                                        <SelectContent>
                                            {schools.map(school => (
                                                <SelectItem key={school} value={school}>{school}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>キャンセル</Button>
                        <Button onClick={handleCreate}>登録</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}