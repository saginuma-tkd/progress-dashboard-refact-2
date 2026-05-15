import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Tag, TeachingMaterial } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';

export default function TeachingMaterialManagement() {
    const confirm = useConfirm();
    
    const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
    const [subjects, setSubjects] = useState<Tag[]>([]);
    const [details, setDetails] = useState<Tag[]>([]);
    
    // フォーム用ステート
    const [editingId, setEditingId] = useState<number | null>(null); // ★編集モード判定用
    const [title, setTitle] = useState('');
    const [memo, setMemo] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]); // ★複数選択用
    const [selectedDetails, setSelectedDetails] = useState<number[]>([]);   // ★複数選択用
    const [file, setFile] = useState<File | null>(null);

    const [newSubjectName, setNewSubjectName] = useState('');
    const [newDetailName, setNewDetailName] = useState('');

    const fetchData = async () => {
        try {
            const [matRes, subRes, detRes] = await Promise.all([
                api.get('/materials/'),
                api.get('/materials/tags/subjects'),
                api.get('/materials/tags/details')
            ]);
            setMaterials(matRes.data);
            setSubjects(subRes.data);
            setDetails(detRes.data);
        } catch (error) {
            console.error("データの取得に失敗しました", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // フォームのリセット
    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setMemo('');
        setSelectedSubjects([]);
        setSelectedDetails([]);
        setFile(null);
        // input[type="file"] の表示もクリアするために少し強引ですが要素を取得してリセットします
        const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    // ★追加: 編集ボタンを押した時の処理
    const handleEditClick = (m: TeachingMaterial) => {
        setEditingId(m.id);
        setTitle(m.title);
        setMemo(m.internal_memo || '');
        setSelectedSubjects(m.subjects?.map(s => s.id) || []);
        setSelectedDetails(m.detail_tags?.map(d => d.id) || []);
        setFile(null); // 編集時はファイルは空（差し替えたい時だけ選択させる）
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 上部にスクロール
    };

    // アップロード or 更新処理
    const handleUploadOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return alert("タイトルは必須です");
        if (!editingId && !file) return alert("新規登録時はファイルが必須です");

        const formData = new FormData();
        formData.append('title', title);
        if (memo) formData.append('internal_memo', memo);
        if (file) formData.append('file', file);
        
        // ★複数タグのIDをFormDataに追加 (FastAPI側でListとして受け取るための書き方)
        selectedSubjects.forEach(id => formData.append('subject_ids', String(id)));
        selectedDetails.forEach(id => formData.append('detail_tag_ids', String(id)));

        try {
            if (editingId) {
                // 編集（PUT）
                await api.put(`/materials/${editingId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert("更新が完了しました！");
            } else {
                // 新規（POST）
                await api.post('/materials/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert("アップロード成功しました！");
            }
            resetForm();
            fetchData();
        } catch (error) {
            console.error("保存失敗", error);
            alert("保存に失敗しました。ファイル形式等を確認してください。");
        }
    };

// 教材の削除処理
    const handleDeleteMaterial = async (id: number) => {
        // 🚨 3-1. 自作の confirm に置き換え
        const isOk = await confirm({
            title: "教材を削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });
        if (!isOk) return;

        try {
            await api.delete(`/materials/${id}`);
            toast.success("教材を削除しました"); // alertからtoastへ
            fetchData();
        } catch (error) {
            toast.error("削除に失敗しました"); // alertからtoastへ
        }
    };

    // タグの削除処理
    const handleDeleteTag = async (type: 'subjects' | 'details', id: number) => {
        // 🚨 3-2. 自作の confirm に置き換え
        const isOk = await confirm({
            title: "このタグを削除しますか？",
            message: "※登録済みの教材からもこのタグが外れます。よろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });
        if (!isOk) return;

        try {
            await api.delete(`/materials/tags/${type}/${id}`);
            toast.success("タグを削除しました"); // alertからtoastへ
            fetchData();
            // もし選択中のタグだったら選択解除する
            if (type === 'subjects') setSelectedSubjects(prev => prev.filter(tid => tid !== id));
            if (type === 'details') setSelectedDetails(prev => prev.filter(tid => tid !== id));
        } catch (error) {
            toast.error("タグの削除に失敗しました"); // alertからtoastへ
        }
    };

    // タグの追加処理
    const handleAddTag = async (type: 'subjects' | 'details', name: string, setName: (val: string) => void) => {
        if (!name) return;
        try {
            await api.post(`/materials/tags/${type}`, { name });
            setName('');
            fetchData();
        } catch (error) {
            alert("タグの追加に失敗しました");
        }
    };

    // ★追加: タグ選択のトグル関数（クリックでON/OFF）
    const toggleSubject = (id: number) => {
        setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleDetail = (id: number) => {
        setSelectedDetails(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">教材アップロード・一覧</TabsTrigger>
                    <TabsTrigger value="tags">タグ管理</TabsTrigger>
                </TabsList>

                {/* --- 教材管理タブ --- */}
                <TabsContent value="upload" className="space-y-6">
                    {/* アップロード/編集フォーム */}
                    <form onSubmit={handleUploadOrUpdate} className={`p-4 rounded-lg space-y-4 border ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">
                                {editingId ? "✏️ 教材の編集" : "✨ 新規教材アップロード"}
                            </h3>
                            {editingId && (
                                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                                    編集をキャンセル
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>教材タイトル (必須)</Label>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="例: 関係代名詞 基本プリント" />
                                </div>
                                <div className="space-y-2">
                                    <Label>PDFファイル {editingId ? "(変更する場合のみ選択)" : "(必須)"}</Label>
                                    <Input id="pdf-upload" type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required={!editingId} />
                                </div>
                                <div className="space-y-2">
                                    <Label>内部メモ・指導ポイント</Label>
                                    <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="教える際の注意点などを入力" className="h-24" />
                                </div>
                            </div>

                            {/* ★変更: タグの複数選択UI（クリック式のバッジ） */}
                            <div className="space-y-4 bg-white p-4 rounded border">
                                <div>
                                    <Label className="mb-2 block">科目タグ (複数選択可)</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.length === 0 && <span className="text-sm text-gray-400">タグがありません</span>}
                                        {subjects.map(s => (
                                            <button
                                                key={s.id} type="button"
                                                onClick={() => toggleSubject(s.id)}
                                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                    selectedSubjects.includes(s.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-2 block mt-4">詳細タグ (複数選択可)</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {details.length === 0 && <span className="text-sm text-gray-400">タグがありません</span>}
                                        {details.map(d => (
                                            <button
                                                key={d.id} type="button"
                                                onClick={() => toggleDetail(d.id)}
                                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                    selectedDetails.includes(d.id) ? 'bg-green-500 text-white border-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {d.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
                            {editingId ? "この内容で更新する" : "アップロード"}
                        </Button>
                    </form>

                    {/* 教材一覧テーブル */}
                    <div>
                        <h3 className="font-bold text-lg mb-2">登録済み教材一覧</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead>タイトル</TableHead>
                                        <TableHead>科目タグ</TableHead>
                                        <TableHead>詳細タグ</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materials.map(m => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium">{m.title}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {m.subjects?.map(s => <span key={s.id} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">{s.name}</span>)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {m.detail_tags?.map(d => <span key={d.id} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">{d.name}</span>)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleEditClick(m)}>編集</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteMaterial(m.id)}>削除</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {materials.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">教材がありません</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                {/* --- タグ管理タブ --- */}
                <TabsContent value="tags" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-lg border">
                        {/* 科目タグ */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-blue-700 border-b-2 border-blue-200 pb-2">科目タグ (英語, 数学など)</h3>
                            <div className="flex gap-2">
                                <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="新しい科目" />
                                <Button onClick={() => handleAddTag('subjects', newSubjectName, setNewSubjectName)}>追加</Button>
                            </div>
                            <ul className="space-y-2 mt-4">
                                {subjects.map(s => (
                                    <li key={s.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border">
                                        <span>{s.name}</span>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-8" onClick={() => handleDeleteTag('subjects', s.id)}>削除</Button>
                                    </li>
                                ))}
                                {subjects.length === 0 && <p className="text-sm text-gray-400">登録されていません</p>}
                            </ul>
                        </div>

                        {/* 詳細タグ */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-green-700 border-b-2 border-green-200 pb-2">詳細タグ (長文, 単語など)</h3>
                            <div className="flex gap-2">
                                <Input value={newDetailName} onChange={e => setNewDetailName(e.target.value)} placeholder="新しい詳細" />
                                <Button onClick={() => handleAddTag('details', newDetailName, setNewDetailName)}>追加</Button>
                            </div>
                            <ul className="space-y-2 mt-4">
                                {details.map(d => (
                                    <li key={d.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border">
                                        <span>{d.name}</span>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-8" onClick={() => handleDeleteTag('details', d.id)}>削除</Button>
                                    </li>
                                ))}
                                {details.length === 0 && <p className="text-sm text-gray-400">登録されていません</p>}
                            </ul>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}