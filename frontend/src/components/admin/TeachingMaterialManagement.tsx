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
import { Badge } from '../ui/badge';

interface RouteTableItem {
    id: number;
    filename: string;
    title?: string;
    academic_year: number;
    uploaded_at: string;
    subjects?: Tag[];
    detail_tags?: Tag[];
    school_id?: number | null;
    internal_memo?: string;
}

export default function TeachingMaterialManagement() {
    const confirm = useConfirm();

    // --- データ一覧 ---
    const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
    const [routes, setRoutes] = useState<RouteTableItem[]>([]);
    const [subjects, setSubjects] = useState<Tag[]>([]);
    const [details, setDetails] = useState<Tag[]>([]);

    const [userRole, setUserRole] = useState<string>("");

    // --- 統合フォーム用ステート ---
    const [category, setCategory] = useState<'material' | 'route_table'>('material');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
    const [selectedDetails, setSelectedDetails] = useState<number[]>([]);

    const [title, setTitle] = useState('');
    const [memo, setMemo] = useState('');
    const [routeYear, setRouteYear] = useState(new Date().getFullYear().toString());

    const [newSubjectName, setNewSubjectName] = useState('');
    const [newDetailName, setNewDetailName] = useState('');

    // --- データ取得 ---
    const fetchData = async () => {
        try {
            // ==================================================
            // 🌟 修正ポイント: どんな保存形式でも絶対に見つけ出す権限チェック
            // ==================================================
            let detectedRole = "";

            // パターン1: localStorage内のどこかに平文で保存されている場合を全探索
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) detectedRole += (localStorage.getItem(key) || "") + " ";
            }

            // パターン2: JWTトークンの中に暗号化されて入っている場合
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (token && token.includes('.')) {
                try {
                    // トークンのペイロード（中身）をデコードして展開
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    detectedRole += " " + String(payload.role || payload.user_type || '').toLowerCase();
                } catch (e) {
                    // デコード失敗時は無視
                }
            }

            // 全部合体させた文字列を小文字にしてセット
            detectedRole = detectedRole.toLowerCase();
            setUserRole(detectedRole);

            // 念のためのデバッグ用（もしこれでも出ない場合はF12の開発者ツールを見てみてください！）
            console.log("🔍 権限判定用の文字列:", detectedRole);
            // ==================================================

            const [matRes, routeRes, subRes, detRes] = await Promise.all([
                api.get('/materials/?category=material'),
                api.get('/routes/list'),
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

    // 🌟 権限チェック (includesで柔軟に判定)
    const canEditOrDelete = (item: any) => {
        if (userRole.includes("developer") || userRole.includes("super_admin")) return true;
        return item.school_id !== null && item.school_id !== undefined;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
            setTitle(fileNameWithoutExt);
        } else {
            setFile(null);
        }
    };

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
        setTitle(r.title || r.filename || '');
        setSelectedSubjects(r.subjects?.map(s => s.id) || []);
        setSelectedDetails(r.detail_tags?.map(d => d.id) || []);
        setFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUploadOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId && !file) return toast.error("新規登録時はファイルが必須です");
        if (!title) return toast.error("タイトルは必須です");

        const formData = new FormData();
        if (file) formData.append('file', file);
        formData.append('title', title);

        selectedSubjects.forEach(id => formData.append('subject_ids', String(id)));
        selectedDetails.forEach(id => formData.append('detail_tag_ids', String(id)));

        try {
            if (category === 'material') {
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
                formData.append('category', 'route_table');

                if (editingId) {
                    await api.patch(`/routes/${editingId}`, formData);
                    toast.success("ルート表情報を更新しました");
                } else {
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
            else await api.delete(`/routes/${id}`);
            toast.success("削除しました");
            fetchData();
        } catch (error) {
            toast.error("削除に失敗しました");
        }
    };

    const handleDownload = (id: number, type: 'route' | 'material') => {
        const url = `${api.getUri()}/materials/${id}/pdf`;
        api.get(url).then(res => {
            if (res.data && res.data.url) {
                window.open(res.data.url, '_blank');
            }
        }).catch(() => {
            toast.error("ファイルの取得に失敗しました");
        });
    };

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-[calc(100vh-120px)] min-h-[600px]">

            {/* =========================================
                [左列] 統合アップロードフォーム
            ========================================= */}
            <div className="lg:col-span-5 xl:col-span-4 h-full overflow-y-auto pr-2 pb-10">
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
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-start gap-2 border border-blue-100">
                            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                            <div>
                                {userRole.includes("developer") || userRole.includes("super_admin")
                                    ? <span>あなたの権限では、<strong>「テナント全体共通」</strong>のファイルとしてアップロードされます。</span>
                                    : <span>あなたの権限では、<strong>「自校舎専用」</strong>のファイルとしてアップロードされます。</span>
                                }
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-gray-700">ファイル {editingId ? <span className="text-xs text-gray-400">(変更時のみ)</span> : <span className="text-red-500">*</span>}</Label>
                                <Input id="unified-file-upload" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} required={!editingId} className="bg-gray-50" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-gray-700">タイトル <span className="text-red-500">*</span></Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="ファイル名から自動設定されます" className="bg-gray-50" />
                            </div>

                            {category === 'material' ? (
                                <div className="space-y-1.5">
                                    <Label className="text-gray-700">内部メモ・指導ポイント</Label>
                                    <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="教える際の注意点などを入力" className="h-20 bg-gray-50" />
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label className="text-gray-700">対象年度 <span className="text-red-500">*</span></Label>
                                    <Input type="number" value={routeYear} onChange={e => setRouteYear(e.target.value)} className="bg-gray-50" required />
                                </div>
                            )}
                        </div>

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
                [右列] スクロール制御を適用したリスト
            ========================================= */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 pb-10">
                <Tabs defaultValue="materials" className="w-full h-full flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100 h-12 p-1 shrink-0">
                        <TabsTrigger value="materials" className="font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700"><BookOpen className="w-4 h-4 mr-2 hidden sm:block" />プリント</TabsTrigger>
                        <TabsTrigger value="routes" className="font-bold data-[state=active]:bg-white data-[state=active]:text-purple-700"><Map className="w-4 h-4 mr-2 hidden sm:block" />ルート表</TabsTrigger>
                        <TabsTrigger value="tags" className="font-bold data-[state=active]:bg-white data-[state=active]:text-gray-700"><Tags className="w-4 h-4 mr-2 hidden sm:block" />タグ管理</TabsTrigger>
                    </TabsList>

                    {/* --- プリント一覧 --- */}
                    <TabsContent value="materials" className="mt-4 flex-1 min-h-0 relative [&>div]:h-full overflow-hidden">
                        <div className="border rounded-lg bg-white h-full overflow-y-auto shadow-sm">
                            <Table>
                                <TableHeader className="sticky top-0 bg-gray-50 z-10 ring-1 ring-gray-200">
                                    <TableRow>
                                        <TableHead className="font-bold">タイトル</TableHead>
                                        <TableHead className="font-bold w-24">公開範囲</TableHead>
                                        <TableHead className="font-bold">タグ</TableHead>
                                        {/* ボタンが減ったので幅を少し調整 */}
                                        <TableHead className="text-right font-bold w-32">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materials.map((m: any) => (
                                        <TableRow key={m.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-medium text-gray-900">{m.title}</TableCell>
                                            <TableCell>
                                                {m.school_id === null || m.school_id === undefined ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-none whitespace-nowrap"><Globe className="w-3 h-3 mr-1" />共通</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal shadow-none whitespace-nowrap"><Building2 className="w-3 h-3 mr-1" />自校舎</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {m.subjects?.map((s: any) => <span key={s.id} className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">{s.name}</span>)}
                                                    {m.detail_tags?.map((d: any) => <span key={d.id} className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded">{d.name}</span>)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {/* DL・編集・削除のみ配置 */}
                                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(m.id, 'material')} className="h-7 w-7 text-gray-500 hover:text-blue-600"><Download className="w-4 h-4" /></Button>
                                                    {canEditOrDelete(m) ? (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditMaterial(m)} className="h-7 w-7 text-gray-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, 'material')} className="h-7 w-7 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 ml-1">編集不可</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {materials.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-400">登録されているプリントはありません</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* --- ルート表一覧 --- */}
                    <TabsContent value="routes" className="mt-4 flex-1 min-h-0 relative [&>div]:h-full overflow-hidden">
                        <div className="border rounded-lg bg-white h-full overflow-y-auto shadow-sm">
                            <Table>
                                <TableHeader className="sticky top-0 bg-gray-50 z-10 ring-1 ring-gray-200">
                                    <TableRow>
                                        <TableHead className="font-bold">ファイル</TableHead>
                                        <TableHead className="font-bold w-24">公開範囲</TableHead>
                                        <TableHead className="font-bold">タグ</TableHead>
                                        <TableHead className="text-right font-bold w-32">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {routes.map((file: any) => (
                                        <TableRow key={file.id} className="hover:bg-gray-50/50">
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-gray-500 font-mono font-bold">{file.academic_year}年度</span>
                                                    <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" /> {file.title || file.filename || 'ルート表'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {file.school_id === null || file.school_id === undefined ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-none whitespace-nowrap"><Globe className="w-3 h-3 mr-1" />共通</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal shadow-none whitespace-nowrap"><Building2 className="w-3 h-3 mr-1" />自校舎</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {file.subjects?.map((s: any) => <span key={s.id} className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">{s.name}</span>)}
                                                    {file.detail_tags?.map((d: any) => <span key={d.id} className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded">{d.name}</span>)}
                                                    {(!file.subjects?.length && !file.detail_tags?.length) && <span className="text-xs text-gray-400">タグなし</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file.id, 'route')}><Download className="w-4 h-4 text-blue-500" /></Button>
                                                    {canEditOrDelete(file) ? (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRoute(file)}><Edit className="w-4 h-4 text-gray-500 hover:text-indigo-600" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(file.id, 'route')}><Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" /></Button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 ml-1">編集不可</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {routes.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-400">登録されているルート表はありません</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* --- タグ管理 --- */}
                    <TabsContent value="tags" className="mt-4 flex-1 min-h-0 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
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