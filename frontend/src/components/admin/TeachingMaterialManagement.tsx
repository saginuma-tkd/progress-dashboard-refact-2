// frontend/src/components/admin/TeachingMaterialManagement.tsx

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
import { Upload, Trash2, Download, FileText, Edit, Save, X, BookOpen, Map, Tags, Globe, Building2, Info } from 'lucide-react';
import { Badge } from '../ui/badge'; // 🌟 追加

interface RouteTableItem {
    id: number;
    filename: string;
    academic_year: number;
    uploaded_at: string;
    subjects?: Tag[];
    detail_tags?: Tag[];
    school_id?: number | null; // 🌟 追加
}

export default function TeachingMaterialManagement() {
    const confirm = useConfirm();

    // --- データ一覧 ---
    const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
    const [routes, setRoutes] = useState<RouteTableItem[]>([]);
    const [subjects, setSubjects] = useState<Tag[]>([]);
    const [details, setDetails] = useState<Tag[]>([]);

    // 🌟 権限管理用のステート
    const [userRole, setUserRole] = useState<string>("");

    // --- 統合フォーム用ステート ---
    const [category, setCategory] = useState<'material' | 'route_table'>('material');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [file, setFile] = useState<File | null>(null);

    // 共通タグステート
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
    const [selectedDetails, setSelectedDetails] = useState<number[]>([]);

    // 教材専用
    const [title, setTitle] = useState('');
    const [memo, setMemo] = useState('');

    // ルート表専用
    const [routeYear, setRouteYear] = useState(new Date().getFullYear().toString());

    // タグ追加用
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newDetailName, setNewDetailName] = useState('');

    // --- データ取得 ---
    const fetchData = async () => {
        try {
            // 🌟 ユーザー情報を取得
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                const userObj = JSON.parse(savedUser);
                setUserRole(String(userObj.role || '').toLowerCase());
            }

            const [matRes, routeRes, subRes, detRes] = await Promise.all([
                api.get('/materials/?category=material'),
                api.get('/routes/list'), // ← ルート表一覧を取得するAPI（バックエンドの実装に依存）
                api.get('/materials/tags/subjects'),
                api.get('/materials/tags/details')
            ]);
            setMaterials(matRes.data);
            setRoutes(routeRes.data);
            setSubjects(subRes.data);
            setDetails(detRes.data);
        } catch (error) {
            console.error(error);
            toast.error("データの取得に失敗しました");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🌟 権限チェック：この教材・ルート表を編集・削除していいか？
    const canEditOrDelete = (item: any) => {
        // 開発者・テナント長ならすべて編集可能
        if (userRole === "developer" || userRole === "super_admin") return true;
        // 校舎長なら、自分の校舎専用のもの（school_idが入っているもの）だけ編集可能
        return item.school_id !== null && item.school_id !== undefined;
    };

    // --- フォーム操作 ---
    const resetForm = () => {
        setEditingId(null);
        setFile(null);
        setSelectedSubjects([]);
        setSelectedDetails([]);
        setTitle('');
        setMemo('');
        setRouteYear(new Date().getFullYear().toString());

        const fileInput = document.getElementById('unified-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleEditMaterial = (m: TeachingMaterial) => {
        setCategory('material');
        setEditingId(m.id);
        setTitle(m.title);
        setMemo(m.internal_memo || '');
        setSelectedSubjects(m.subjects?.map(s => s.id) || []);
        setSelectedDetails(m.detail_tags?.map(d => d.id) || []);
        setFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditRoute = (r: RouteTableItem) => {
        setCategory('route_table');
        setEditingId(r.id);
        setRouteYear(r.academic_year.toString());
        setSelectedSubjects(r.subjects?.map(s => s.id) || []);
        setSelectedDetails(r.detail_tags?.map(d => d.id) || []);
        setFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- 送信処理 ---
    const handleUploadOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId && !file) return toast.error("新規登録時はファイルが必須です");

        const formData = new FormData();
        if (file) formData.append('file', file);

        selectedSubjects.forEach(id => formData.append('subject_ids', String(id)));
        selectedDetails.forEach(id => formData.append('detail_tag_ids', String(id)));

        try {
            if (category === 'material') {
                if (!title) return toast.error("タイトルは必須です");
                formData.append('title', title);
                if (memo) formData.append('internal_memo', memo);

                if (editingId) {
                    await api.put(`/materials/${editingId}`, formData);
                    toast.success("プリント情報を更新しました");
                } else {
                    await api.post('/materials/', formData);
                    toast.success("プリントをアップロードしました");
                }
            } else {
                if (!routeYear) return toast.error("対象年度は必須です");
                formData.append('academic_year', routeYear);

                // 🌟 ルート表アップロードの際も category を明示的に送るよう修正
                formData.append('category', 'route_table');
                formData.append('title', `${routeYear}年度 ルート表`); // DB制約回避用

                if (editingId) {
                    await api.patch(`/routes/${editingId}`, formData);
                    toast.success("ルート表情報を更新しました");
                } else {
                    // ルート表もmaterialsエンドポイントからアップロードする設計になっている場合
                    await api.post('/materials/', formData);
                    toast.success("ルート表をアップロードしました");
                }
            }
            resetForm();
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("保存に失敗しました");
        }
    };

    // --- 削除・ダウンロード ---
    const handleDelete = async (id: number, type: 'material' | 'route') => {
        const isOk = await confirm({
            title: "ファイルを削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });
        if (!isOk) return;

        try {
            if (type === 'material') await api.delete(`/materials/${id}`);
            else await api.delete(`/routes/${id}`); // バックエンドの構成に応じて適宜変更
            toast.success("削除しました");
            fetchData();
        } catch (error) {
            toast.error("削除に失敗しました");
        }
    };

    const handleDownload = (id: number, type: 'route' | 'material') => {
        // materialsエンドポイントに一本化されていると想定
        const url = `${api.getUri()}/materials/${id}/pdf`;

        // 事前署名付きURLを取得してから開く
        api.get(url).then(res => {
            if (res.data && res.data.url) {
                window.open(res.data.url, '_blank');
            }
        }).catch(() => {
            toast.error("ファイルの取得に失敗しました");
        });
    };

    // --- タグ管理 ---
    const handleAddTag = async (type: 'subjects' | 'details', name: string, setName: (val: string) => void) => {
        if (!name) return;
        try {
            await api.post(`/materials/tags/${type}`, { name });
            setName('');
            fetchData();
            toast.success("タグを追加しました");
        } catch (error) {
            toast.error("タグの追加に失敗しました");
        }
    };

    const handleDeleteTag = async (type: 'subjects' | 'details', id: number) => {
        const isOk = await confirm({
            title: "タグを削除しますか？",
            message: "登録済みの教材からもこのタグが外れます。",
            confirmText: "削除する",
            isDestructive: true
        });
        if (!isOk) return;

        try {
            await api.delete(`/materials/tags/${type}/${id}`);
            toast.success("タグを削除しました");
            fetchData();
        } catch (error) {
            toast.error("削除に失敗しました");
        }
    };

    const toggleTag = (id: number, type: 'subject' | 'detail') => {
        if (type === 'subject') {
            setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelectedDetails(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* =========================================
                [左列] 統合アップロードフォーム (5/12の幅を占有)
            ========================================= */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
                <form onSubmit={handleUploadOrUpdate} className={`p-5 rounded-xl border shadow-sm transition-colors ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col gap-3 mb-6 border-b pb-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            {editingId ? <Edit className="w-5 h-5 text-indigo-600" /> : <Upload className="w-5 h-5 text-indigo-600" />}
                            {editingId ? "ファイル情報の編集" : "新規ファイル追加"}
                        </h3>

                        <div className="flex bg-gray-100 p-1 rounded-lg w-full">
                            <button
                                type="button"
                                disabled={editingId !== null}
                                onClick={() => setCategory('material')}
                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${category === 'material' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'} disabled:opacity-50`}
                            >
                                📚 プリント
                            </button>
                            <button
                                type="button"
                                disabled={editingId !== null}
                                onClick={() => setCategory('route_table')}
                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${category === 'route_table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'} disabled:opacity-50`}
                            >
                                🗺️ ルート表
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">

                        {/* 🌟 登録範囲のガイダンス */}
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-start gap-2 border border-blue-100">
                            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                            <div>
                                {userRole === "developer" || userRole === "super_admin"
                                    ? <span>あなたの権限では、<strong>「テナント全体共通」</strong>のファイルとしてアップロードされます。</span>
                                    : <span>あなたの権限では、<strong>「自校舎専用」</strong>のファイルとしてアップロードされます。</span>
                                }
                            </div>
                        </div>

                        {/* ファイル・入力フィールド */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-gray-700">ファイル {editingId ? <span className="text-xs text-gray-400">(変更時のみ)</span> : <span className="text-red-500">*</span>}</Label>
                                <Input id="unified-file-upload" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} required={!editingId} className="bg-gray-50" />
                            </div>

                            {category === 'material' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700">タイトル <span className="text-red-500">*</span></Label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="例: 関係代名詞 演習" className="bg-gray-50" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700">内部メモ・指導ポイント</Label>
                                        <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="教える際の注意点などを入力" className="h-20 bg-gray-50" />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label className="text-gray-700">対象年度 <span className="text-red-500">*</span></Label>
                                    <Input type="number" value={routeYear} onChange={e => setRouteYear(e.target.value)} className="bg-gray-50" required />
                                </div>
                            )}
                        </div>

                        {/* タグ選択エリア */}
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                            <div>
                                <Label className="mb-2 block text-gray-700 text-sm">科目タグ</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {subjects.length === 0 && <span className="text-xs text-gray-400">タグがありません</span>}
                                    {subjects.map(s => (
                                        <button key={s.id} type="button" onClick={() => toggleTag(s.id, 'subject')}
                                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${selectedSubjects.includes(s.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                        >{s.name}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label className="mb-2 block text-gray-700 text-sm">詳細タグ (レベル指定等)</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {details.length === 0 && <span className="text-xs text-gray-400">タグがありません</span>}
                                    {details.map(d => (
                                        <button key={d.id} type="button" onClick={() => toggleTag(d.id, 'detail')}
                                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${selectedDetails.includes(d.id) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                        >{d.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-6 pt-4 border-t">
                        <Button type="submit" className={`w-full font-bold py-5 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}>
                            {editingId ? <Save className="w-4 h-4 mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />}
                            {editingId ? "更新を保存する" : "アップロード実行"}
                        </Button>
                        {editingId && (
                            <Button type="button" variant="ghost" onClick={resetForm} className="font-bold w-full text-gray-500">
                                <X className="w-4 h-4 mr-1.5" /> キャンセル
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* =========================================
                [右列] ファイル一覧 & タグ管理タブ (7/12の幅を占有)
            ========================================= */}
            <div className="lg:col-span-7 xl:col-span-8">
                <Tabs defaultValue="materials" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100 h-12 p-1 sticky top-6 z-10 shadow-sm">
                        <TabsTrigger value="materials" className="font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700"><BookOpen className="w-4 h-4 mr-2 hidden sm:block" />プリント</TabsTrigger>
                        <TabsTrigger value="routes" className="font-bold data-[state=active]:bg-white data-[state=active]:text-purple-700"><Map className="w-4 h-4 mr-2 hidden sm:block" />ルート表</TabsTrigger>
                        <TabsTrigger value="tags" className="font-bold data-[state=active]:bg-white data-[state=active]:text-gray-700"><Tags className="w-4 h-4 mr-2 hidden sm:block" />タグ管理</TabsTrigger>
                    </TabsList>

                    {/* --- プリント一覧 --- */}
                    <TabsContent value="materials" className="mt-4">
                        <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-gray-50/80">
                                    <TableRow>
                                        <TableHead className="font-bold">タイトル</TableHead>
                                        <TableHead className="font-bold w-24">公開範囲</TableHead> {/* 🌟 追加 */}
                                        <TableHead className="font-bold">タグ</TableHead>
                                        <TableHead className="text-right font-bold w-28">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materials.map((m: any) => (
                                        <TableRow key={m.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-medium text-gray-900">{m.title}</TableCell>

                                            {/* 🌟 バッジ表示 */}
                                            <TableCell>
                                                {m.school_id === null || m.school_id === undefined ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-none whitespace-nowrap">
                                                        <Globe className="w-3 h-3 mr-1" />共通
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal shadow-none whitespace-nowrap">
                                                        <Building2 className="w-3 h-3 mr-1" />自校舎
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {m.subjects?.map((s: any) => <span key={s.id} className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">{s.name}</span>)}
                                                    {m.detail_tags?.map((d: any) => <span key={d.id} className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded">{d.name}</span>)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-0.5">
                                                <Button variant="ghost" size="icon" onClick={() => handleDownload(m.id, 'material')} className="h-8 w-8 text-gray-500 hover:text-blue-600"><Download className="w-4 h-4" /></Button>
                                                {/* 🌟 権限チェック */}
                                                {canEditOrDelete(m) ? (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditMaterial(m)} className="h-8 w-8 text-gray-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, 'material')} className="h-8 w-8 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 ml-2">編集不可</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {materials.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-400">登録されているプリントはありません</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* --- ルート表一覧 --- */}
                    <TabsContent value="routes" className="mt-4">
                        <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-gray-50/80">
                                    <TableRow>
                                        <TableHead className="font-bold">ファイル</TableHead>
                                        <TableHead className="font-bold w-24">公開範囲</TableHead> {/* 🌟 追加 */}
                                        <TableHead className="font-bold">タグ</TableHead>
                                        <TableHead className="text-right font-bold w-28">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {routes.map((file: any) => (
                                        <TableRow key={file.id} className="hover:bg-gray-50/50">
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-gray-500 font-mono font-bold">{file.academic_year}年度</span>
                                                    <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" /> {file.filename || file.title || 'ルート表'}</span>
                                                </div>
                                            </TableCell>

                                            {/* 🌟 バッジ表示 */}
                                            <TableCell>
                                                {file.school_id === null || file.school_id === undefined ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-none whitespace-nowrap">
                                                        <Globe className="w-3 h-3 mr-1" />共通
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal shadow-none whitespace-nowrap">
                                                        <Building2 className="w-3 h-3 mr-1" />自校舎
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {file.subjects?.map((s: any) => <span key={s.id} className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">{s.name}</span>)}
                                                    {file.detail_tags?.map((d: any) => <span key={d.id} className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded">{d.name}</span>)}
                                                    {(!file.subjects?.length && !file.detail_tags?.length) && <span className="text-xs text-gray-400">タグなし</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-0.5">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(file.id, 'route')}><Download className="w-4 h-4 text-blue-500" /></Button>
                                                {/* 🌟 権限チェック */}
                                                {canEditOrDelete(file) ? (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRoute(file)}><Edit className="w-4 h-4 text-gray-500 hover:text-indigo-600" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(file.id, 'route')}><Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" /></Button>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 ml-2">編集不可</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {routes.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-400">登録されているルート表はありません</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* --- タグ管理 --- */}
                    <TabsContent value="tags" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-xl border shadow-sm">
                                <h3 className="font-bold text-blue-700 border-b pb-2 mb-4">科目タグ</h3>
                                <div className="flex gap-2 mb-4">
                                    <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="新しい科目" className="bg-gray-50" />
                                    <Button onClick={() => handleAddTag('subjects', newSubjectName, setNewSubjectName)} className="font-bold">追加</Button>
                                </div>
                                <ul className="space-y-2">
                                    {subjects.map(s => (
                                        <li key={s.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border text-sm font-medium text-gray-700">
                                            {s.name} <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 h-8" onClick={() => handleDeleteTag('subjects', s.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-5 rounded-xl border shadow-sm">
                                <h3 className="font-bold text-green-700 border-b pb-2 mb-4">詳細タグ</h3>
                                <div className="flex gap-2 mb-4">
                                    <Input value={newDetailName} onChange={e => setNewDetailName(e.target.value)} placeholder="新しい詳細" className="bg-gray-50" />
                                    <Button onClick={() => handleAddTag('details', newDetailName, setNewDetailName)} className="font-bold">追加</Button>
                                </div>
                                <ul className="space-y-2">
                                    {details.map(d => (
                                        <li key={d.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border text-sm font-medium text-gray-700">
                                            {d.name} <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 h-8" onClick={() => handleDeleteTag('details', d.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}