import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Upload, Trash2, Download, FileText, Edit, Save, X, Filter } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';

interface RouteTableItem {
    id: number;
    filename: string;
    subject: string;
    level: string;
    academic_year: number;
    uploaded_at: string;
}

export default function RouteTableManagement() {
    const confirm = useConfirm();
    const [files, setFiles] = useState<RouteTableItem[]>([]);
    
    // 編集・アップロード用ステート
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    const [formData, setFormData] = useState({
        subject: "英語",
        level: "",
        year: new Date().getFullYear().toString()
    });

    // フィルター用ステート
    const [filterSubject, setFilterSubject] = useState("ALL");
    const [filterYear, setFilterYear] = useState("ALL");

    // 一覧取得
    const fetchFiles = async () => {
        try {
            const res = await api.get('/routes/list');
            setFiles(res.data);
        } catch (e) {
            console.error(e);
            toast.error("一覧の取得に失敗しました");
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    // 科目リスト生成 (デフォルト + 登録済みから抽出)
    const existingSubjects = files.map(f => f.subject).filter(Boolean);
    const uniqueSubjects = Array.from(new Set([...existingSubjects]));

    const existingLevels = files.map(f => f.level).filter(Boolean);
    const uniqueLevels = Array.from(new Set([...existingLevels]));

    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [isCustomLevel, setIsCustomLevel] = useState(false);

    // 編集モード開始
    const startEdit = (file: RouteTableItem) => {
        setIsEditing(true);
        setEditId(file.id);
        setFormData({
            subject: file.subject,
            level: file.level,
            year: file.academic_year.toString()
        });
        setSelectedFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 編集キャンセル
    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ subject: "英語", level: "", year: new Date().getFullYear().toString() });
        setSelectedFile(null);
        const fileInput = document.getElementById('route-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    // 送信処理
    const handleSubmit = async () => {
        if (!isEditing && !selectedFile) return toast.error("ファイルを選択してください");
        if (!formData.level) return toast.error("レベルを入力してください");
        if (!formData.subject) return toast.error("科目を選択してください");

        const data = new FormData();
        if (selectedFile) data.append("file", selectedFile);
        data.append("subject", formData.subject);
        data.append("level", formData.level);
        data.append("academic_year", formData.year);

        try {
            if (isEditing && editId) {
                await api.patch(`/routes/${editId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("更新しました");
                cancelEdit();
                fetchFiles();
            } else {
                // 新規アップロード
                await api.post('/routes/upload', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("アップロードしました");
                cancelEdit();
                fetchFiles();
            }
        } catch (e) {
            console.error(e);
            toast.error("処理に失敗しました");
        }
    };

    // 削除処理
    const handleDelete = async (id: number) => {
        // 🚨 3. window.confirm を消して、自作の confirm に置き換え！
        const isOk = await confirm({
            title: "ルート表を削除しますか？",
            message: "この操作は取り消せません。本当によろしいですか？",
            confirmText: "削除する",
            isDestructive: true
        });

        if (!isOk) return;

        try {
            await api.delete(`/routes/${id}`);
            toast.success("削除しました");
            fetchFiles();
        } catch (e) {
            toast.error("削除失敗");
        }
    };

    // ダウンロード処理
    const handleDownload = (id: number) => {
        const url = `${api.getUri()}/routes/download/${id}`;
        window.open(url, '_blank');
    };

    // フィルタリング
    const uniqueYears = Array.from(new Set(files.map(f => f.academic_year))).sort((a, b) => b - a);
    const filteredFiles = files.filter(f => {
        const matchSubject = filterSubject === "ALL" || f.subject === filterSubject;
        const matchYear = filterYear === "ALL" || f.academic_year.toString() === filterYear;
        return matchSubject && matchYear;
    });

    return (
        <div className="space-y-6">
            {/* アップロード/編集フォームエリア */}
            <div className={`p-4 rounded-lg border transition-colors ${isEditing ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                <h4 className="font-medium text-sm flex items-center gap-2 mb-4">
                    {isEditing ? <Edit className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {isEditing ? "ルート表情報を編集" : "新規ルート表登録"}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label>科目</Label>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] text-blue-600 mb-1" 
                                    onClick={() => {
                                        setIsCustomSubject(!isCustomSubject);
                                        setFormData({...formData, subject: ""});
                                    }}
                                >
                                    {isCustomSubject ? "リストから選択" : "手入力する"}
                                </Button>
                            </div>
                            
                            {!isCustomSubject && uniqueSubjects.length > 0 ? (
                                <Select value={formData.subject} onValueChange={v => setFormData({...formData, subject: v})}>
                                    <SelectTrigger><SelectValue placeholder="科目を選択" /></SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {uniqueSubjects.map(subj => (
                                            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input 
                                    placeholder="例: 英語、数学" 
                                    value={formData.subject} 
                                    onChange={e => setFormData({...formData, subject: e.target.value})} 
                                />
                            )}
                        </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label>レベル</Label>
                            <Button 
                                variant="link" 
                                className="h-auto p-0 text-[10px] text-blue-600 mb-1" 
                                onClick={() => {
                                    setIsCustomLevel(!isCustomLevel);
                                    setFormData({...formData, level: ""});
                                }}
                            >
                                {isCustomLevel ? "リストから選択" : "手入力する"}
                            </Button>
                        </div>

                        {!isCustomLevel && uniqueLevels.length > 0 ? (
                            <Select value={formData.level} onValueChange={v => setFormData({...formData, level: v})}>
                                <SelectTrigger><SelectValue placeholder="レベルを選択" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {uniqueLevels.map(lvl => (
                                        <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                value={formData.level} 
                                onChange={e => setFormData({...formData, level: e.target.value})} 
                                placeholder="例: 東大レベル" 
                            />
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <Label>年度</Label>
                        <Input 
                            type="number" 
                            value={formData.year} 
                            onChange={e => setFormData({...formData, year: e.target.value})} 
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <Label>ファイル {isEditing ? "(変更する場合のみ)" : "(PDF推奨)"}</Label>
                        <Input 
                            id="route-file-upload"
                            type="file" 
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                            className="cursor-pointer bg-white"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    {isEditing && (
                        <Button variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-2" /> キャンセル
                        </Button>
                    )}
                    <Button onClick={handleSubmit} disabled={!isEditing && !selectedFile}>
                        {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        {isEditing ? "更新する" : "アップロード"}
                    </Button>
                </div>
            </div>

            {/* 一覧エリア */}
            <div className="space-y-4">
                {/* フィルター */}
                <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-2 border rounded-md shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                        <Filter className="w-4 h-4" /> 絞り込み:
                    </div>
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                        <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="全科目" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL">全科目</SelectItem>
                            {uniqueSubjects.map(subj => (
                                <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="全年度" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL">全年度</SelectItem>
                            {uniqueYears.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}年度</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="w-24">科目</TableHead>
                                <TableHead className="w-32">レベル</TableHead>
                                <TableHead className="w-24">年度</TableHead>
                                <TableHead>ファイル名</TableHead>
                                <TableHead className="w-32 text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFiles.map((file) => (
                                <TableRow key={file.id} className="hover:bg-gray-50/50">
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                                            file.subject === '英語' ? 'bg-blue-500' :
                                            file.subject === '数学' ? 'bg-green-500' :
                                            file.subject === '国語' ? 'bg-red-500' :
                                            'bg-gray-500'
                                        }`}>
                                            {file.subject}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium">{file.level}</TableCell>
                                    <TableCell>{file.academic_year}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> {file.filename}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleDownload(file.id)}>
                                                <Download className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(file)}>
                                                <Edit className="w-4 h-4 text-gray-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredFiles.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        {files.length === 0 ? "ルート表が登録されていません" : "条件に一致するファイルがありません"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-xs text-muted-foreground text-right px-2">
                    合計: {filteredFiles.length} 件
                </div>
            </div>
        </div>
    );
}