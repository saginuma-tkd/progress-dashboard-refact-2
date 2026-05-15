import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Download, Database, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function BackupManagement() {
    const [uploading, setUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const handleDownload = async () => {
        try {
            toast.info("ダウンロードを準備中...");
            
            // blobとしてレスポンスを受け取る
            const response = await api.get('/backup/export', {
                responseType: 'blob',
            });
            
            // ダウンロードリンクを生成してクリックさせる
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // ファイル名を取得 (ヘッダーから、もしくは現在時刻で生成)
            const contentDisposition = response.headers['content-disposition'];
            let filename = `backup_${new Date().toISOString().slice(0,10)}.db`; // .db -> .json
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            // 後始末
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("ダウンロードを開始しました");
        } catch (e) {
            console.error(e);
            toast.error("ダウンロードに失敗しました");
        }
    };
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm("データベースを上書きします。現在のデータはすべて失われますが、よろしいですか？")) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post('/backup/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("復元が完了しました。ページをリロードしてください。");
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            toast.error("復元に失敗しました。正しい.dbファイルか確認してください。");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" /> データベースバックアップ
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 注意書き */}
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex gap-3 text-sm text-amber-800">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">取り扱い注意</p>
                            <p className="leading-relaxed">
                                この機能は、現在のシステムデータ（生徒情報、学習記録、アカウント情報など）がすべて含まれた
                                SQLiteデータベースファイル（.db）をダウンロードします。<br />
                                <strong>個人情報が含まれるため、ダウンロードしたファイルの管理には十分ご注意ください。</strong>
                            </p>
                        </div>
                    </div>
                    
                    {/* アクションエリア */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border p-6 rounded-lg bg-gray-50">
                        <div className="space-y-1">
                            <h4 className="font-medium text-base">フルバックアップを実行</h4>
                            <p className="text-sm text-muted-foreground">
                                現在のデータベースのスナップショットを作成して保存します。
                            </p>
                        </div>
                        <Button onClick={handleDownload} className="w-full sm:w-auto">
                            <Download className="w-4 h-4 mr-2" /> バックアップをダウンロード
                        </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border p-6 rounded-lg bg-red-50/50 border-red-100">
                        <div className="space-y-1">
                            <h4 className="font-medium text-base text-red-900">データベースを復元</h4>
                            <p className="text-sm text-red-700/70">.dbファイルをアップロードして現在のデータを完全に置き換えます。</p>
                        </div>
                        <div className="w-full sm:w-auto">
                            <input type="file" accept=".db" className="hidden" ref={fileInputRef} onChange={handleUpload} />
                            <Button 
                                variant="outline" 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={uploading}
                                className="w-full border-red-200 hover:bg-red-50 text-red-700"
                            >
                                {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                ファイルを選択して復元
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
