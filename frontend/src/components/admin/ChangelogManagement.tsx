import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Save, Edit, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangelogManagement() {
    const { user } = useAuth();
    const isDeveloper = user?.role === 'developer';
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [version, setVersion] = useState("");
    
    // 🚨 追加: 一覧データと編集モードのState
    const [changelogs, setChangelogs] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // 🚨 追加: 既存の履歴を取得
    const fetchChangelogs = async () => {
        try {
            const res = await api.get('/system/changelog');
            setChangelogs(res.data);
        } catch (e) {
            console.error(e);
            toast.error("履歴の取得に失敗しました");
        }
    };

    useEffect(() => {
        fetchChangelogs();
    }, []);

    // 🚨 追加: 編集モードに入る
    const startEdit = (log: any) => {
        setIsEditing(true);
        setEditId(log.id);
        setVersion(log.version);
        setTitle(log.title);
        setDesc(log.description);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 🚨 追加: 編集キャンセル
    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setVersion("");
        setTitle("");
        setDesc("");
    };

    // 🚨 修正: 新規と更新で処理を分ける
    const handleSave = async () => {
        if (!version || !title) {
            return toast.error("バージョンとタイトルは必須です");
        }

        try {
            if (isEditing && editId) {
                // 更新 (PATCH)
                await api.patch(`/system/changelog/${editId}`, {
                    version: version,
                    title: title,
                    description: desc
                });
                toast.success("リリースノートを更新しました");
            } else {
                // 新規追加 (POST)
                await api.post('/system/changelog', {
                    version: version,
                    title: title,
                    description: desc
                });
                toast.success("リリースノートを公開しました");
            }
            
            cancelEdit();
            fetchChangelogs(); // 一覧を再取得
            
        } catch (e) {
            console.error(e);
            toast.error("処理に失敗しました");
        }
    };

    // 🚨 追加: 削除処理
    const handleDelete = async (id: number) => {
        if (!confirm("本当にこの履歴を削除しますか？")) return;
        try {
            await api.delete(`/system/changelog/${id}`);
            toast.success("削除しました");
            if (editId === id) cancelEdit(); // 編集中ならリセット
            fetchChangelogs();
        } catch (e) {
            console.error(e);
            toast.error("削除に失敗しました");
        }
    };

    return (
        <div className="space-y-8">
            {isDeveloper ? (
                <div className={`p-4 rounded-lg border transition-colors ${isEditing ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                    {/* === フォームエリア === */}
                    <div className={`p-4 rounded-lg border transition-colors ${isEditing ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-4">
                            {isEditing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isEditing ? "リリースノートを編集" : "新規リリースノート公開"}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1">
                                <Label>バージョン</Label>
                                <Input placeholder="v1.0.1" value={version} onChange={(e) => setVersion(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>タイトル</Label>
                                <Input placeholder="新機能追加" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1 mb-4">
                            <Label>詳細内容</Label>
                            <Textarea 
                                className="h-32 bg-white" 
                                placeholder="更新内容を入力..." 
                                value={desc} 
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDesc(e.target.value)} 
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            {isEditing && (
                                <Button variant="outline" onClick={cancelEdit}>
                                    <X className="w-4 h-4 mr-2" />キャンセル
                                </Button>
                            )}
                            <Button onClick={handleSave}>
                                <Save className="w-4 h-4 mr-2" />
                                {isEditing ? "更新を保存" : "更新を公開"}
                            </Button>
                        </div>
                    </div>

                    {/* === 🚨 追加: 既存の履歴一覧エリア === */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm border-b pb-2">過去のリリースノート</h4>
                        <div className="space-y-3">
                            {changelogs.map((log) => (
                                <div key={log.id} className="p-4 border rounded-md bg-white shadow-sm flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-blue-700">{log.title}</span>
                                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {log.version}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">{log.release_date}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
                                            {log.description}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => startEdit(log)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(log.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {changelogs.length === 0 && (
                                <p className="text-center text-sm text-gray-500 py-4">履歴がありません</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-lg border bg-gray-50 text-sm text-gray-500">
                    ※ リリースノートの公開・編集は開発者のみ可能です。
                </div>
            )}
            
        </div>
    );
}