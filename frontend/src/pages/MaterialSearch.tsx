import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Tag, TeachingMaterial } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Search, Printer, Files, Info, Upload, X, Map, BookOpen, LayoutGrid, Plus } from 'lucide-react';
import { toast } from 'sonner';

// カテゴリ定義
const CATEGORIES = [
    { id: 'all',         label: 'すべて',    icon: LayoutGrid },
    { id: 'material',    label: '教材',      icon: BookOpen },
    { id: 'route_table', label: 'ルート表',  icon: Map },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// アップロードモーダル
interface UploadModalProps {
    onClose: () => void;
    onSuccess: () => void;
    subjects: Tag[];
    details: Tag[];
}

function UploadModal({ onClose, onSuccess, subjects, details }: UploadModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<'material' | 'route_table'>('material');
    const [internalMemo, setInternalMemo] = useState('');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
    const [selectedDetailIds, setSelectedDetailIds] = useState<number[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleTag = (id: number, list: number[], setter: React.Dispatch<React.SetStateAction<number[]>>) => {
        setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error('ファイルを選択してください'); return; }
        if (!title.trim()) { toast.error('タイトルを入力してください'); return; }

        setLoading(true);
        const form = new FormData();
        form.append('title', title);
        form.append('category', category);
        form.append('internal_memo', internalMemo);
        form.append('file', file);
        selectedSubjectIds.forEach(id => form.append('subject_ids', String(id)));
        selectedDetailIds.forEach(id => form.append('detail_tag_ids', String(id)));

        try {
            await api.post('/materials/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('アップロードが完了しました');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'アップロードに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold">ファイルをアップロード</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* カテゴリ選択 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">カテゴリ *</label>
                        <div className="grid grid-cols-2 gap-3">
                            {([['material', '教材', BookOpen], ['route_table', 'ルート表', Map]] as const).map(([val, label, Icon]) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setCategory(val)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                        category === val
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* タイトル */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">タイトル *</label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 英語長文テキスト2024" required />
                    </div>

                    {/* ファイル選択 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">PDFファイル *</label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                                file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                            }`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {file ? (
                                <p className="text-sm text-green-700 font-medium">✓ {file.name}</p>
                            ) : (
                                <p className="text-sm text-gray-500">クリックしてPDFを選択</p>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    </div>

                    {/* 科目タグ */}
                    {subjects.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">科目タグ</label>
                            <div className="flex flex-wrap gap-2">
                                {subjects.map(s => (
                                    <button key={s.id} type="button" onClick={() => toggleTag(s.id, selectedSubjectIds, setSelectedSubjectIds)}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedSubjectIds.includes(s.id) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 詳細タグ */}
                    {details.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">詳細タグ</label>
                            <div className="flex flex-wrap gap-2">
                                {details.map(d => (
                                    <button key={d.id} type="button" onClick={() => toggleTag(d.id, selectedDetailIds, setSelectedDetailIds)}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedDetailIds.includes(d.id) ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                                        {d.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 指導メモ */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">指導メモ（任意）</label>
                        <textarea
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={internalMemo}
                            onChange={e => setInternalMemo(e.target.value)}
                            placeholder="このファイルに関する備考を入力..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
                        <Button type="submit" disabled={loading} className="flex-1 gap-2">
                            <Upload className="w-4 h-4" />
                            {loading ? 'アップロード中...' : 'アップロード'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// メインページ
export default function MaterialSearch() {
    const [allMaterials, setAllMaterials] = useState<TeachingMaterial[]>([]);
    const [filteredMaterials, setFilteredMaterials] = useState<TeachingMaterial[]>([]);
    const [subjects, setSubjects] = useState<Tag[]>([]);
    const [details, setDetails] = useState<Tag[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const fetchData = async () => {
        try {
            const [matRes, subRes, detRes] = await Promise.all([
                api.get('/materials/'),
                api.get('/materials/tags/subjects'),
                api.get('/materials/tags/details'),
            ]);
            setAllMaterials(matRes.data);
            setSubjects(subRes.data);
            setDetails(detRes.data);
        } catch (error) {
            console.error('データ取得エラー', error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // フロントエンドフィルタリング
    useEffect(() => {
        let result = allMaterials;
        if (selectedCategory !== 'all') result = result.filter(m => m.category === selectedCategory);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(m => m.title.toLowerCase().includes(q) || (m.internal_memo && m.internal_memo.toLowerCase().includes(q)));
        }
        if (selectedSubjectId) result = result.filter(m => m.subjects?.some(s => s.id === selectedSubjectId));
        if (selectedDetailId) result = result.filter(m => m.detail_tags?.some(d => d.id === selectedDetailId));
        setFilteredMaterials(result);
    }, [searchQuery, selectedCategory, selectedSubjectId, selectedDetailId, allMaterials]);

    // PDFを presigned URL で別タブ表示
    const handlePreviewAndPrint = async (materialId: number) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/materials/${materialId}/pdf`);
            window.open(response.data.url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('PDFの取得に失敗しました', error);
            toast.error('ファイルの読み込みに失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    // カテゴリバッジ
    const getCategoryBadge = (category?: string) => {
        if (category === 'route_table') return <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Map className="w-3 h-3"/>ルート表</span>;
        return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><BookOpen className="w-3 h-3"/>教材</span>;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Files className="w-6 h-6" /> 教材・ルート表管理
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">教材やルート表のPDFをアップロード・検索・閲覧できます</p>
                </div>
                <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> アップロード
                </Button>
            </div>

            {/* カテゴリタブ */}
            <div className="flex gap-2 border-b border-gray-200 pb-0">
                {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const count = cat.id === 'all' ? allMaterials.length : allMaterials.filter(m => m.category === cat.id).length;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                selectedCategory === cat.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {cat.label}
                            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${selectedCategory === cat.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 検索フィルター */}
            <div className="bg-white p-5 rounded-lg shadow-sm border space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <Input
                        className="pl-10 text-base py-5"
                        placeholder="タイトルやメモの内容で検索..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-col md:flex-row gap-6 pt-2">
                    <div className="flex-1">
                        <span className="text-sm font-bold text-gray-700 block mb-2">科目で絞り込む</span>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSelectedSubjectId(null)} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${!selectedSubjectId ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>すべて</button>
                            {subjects.map(s => (
                                <button key={s.id} onClick={() => setSelectedSubjectId(s.id)} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${selectedSubjectId === s.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>{s.name}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-bold text-gray-700 block mb-2">詳細で絞り込む</span>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSelectedDetailId(null)} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${!selectedDetailId ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>すべて</button>
                            {details.map(d => (
                                <button key={d.id} onClick={() => setSelectedDetailId(d.id)} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${selectedDetailId === d.id ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{d.name}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 結果一覧 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMaterials.map(m => (
                    <Card key={m.id} className="hover:border-blue-300 hover:shadow-md transition-all flex flex-col h-full">
                        <CardContent className="p-5 flex flex-col h-full">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start gap-2">
                                    {getCategoryBadge(m.category)}
                                </div>
                                <h3 className="font-bold text-base text-gray-900 leading-tight">{m.title}</h3>
                                <div className="flex flex-wrap gap-1">
                                    {m.subjects?.map(s => <span key={s.id} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">{s.name}</span>)}
                                    {m.detail_tags?.map(d => <span key={d.id} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">{d.name}</span>)}
                                </div>
                                {m.internal_memo && (
                                    <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-900">
                                        <div className="flex items-center gap-1 font-bold mb-1"><Info className="w-4 h-4" /> 指導メモ</div>
                                        <p className="whitespace-pre-wrap">{m.internal_memo}</p>
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 mt-auto">
                                <Button className="w-full gap-2" onClick={() => handlePreviewAndPrint(m.id)} disabled={isLoading}>
                                    <Printer className="w-4 h-4" />
                                    プレビュー / 印刷
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredMaterials.length === 0 && (
                    <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-lg border border-dashed">
                        <Files className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>該当するファイルが見つかりませんでした</p>
                    </div>
                )}
            </div>

            {/* アップロードモーダル */}
            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={fetchData}
                    subjects={subjects}
                    details={details}
                />
            )}
        </div>
    );
}