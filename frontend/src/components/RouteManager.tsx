import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Download, FileText, Search, Filter, ExternalLink } from 'lucide-react';
import api from '../lib/api';

// --- 型定義 ---
interface RouteFile {
  id: number;
  filename: string;
  subject: string;
  level: string;
  academic_year: number;
  uploaded_at: string;
}

// Props
interface RouteManagerProps {
  studentId: number; 
}

export default function RouteManager({ studentId }: RouteManagerProps) {
  const [files, setFiles] = useState<RouteFile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // フィルタ用State
  const [filterSubject, setFilterSubject] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterYear, setFilterYear] = useState(""); // ★追加: 年度フィルタ

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes/list');
      setFiles(res.data);
    } catch (e) {
      console.error("Failed to fetch routes", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewPdf = async (file: RouteFile) => {
    try {
      // responseType: 'blob' でバイナリを取得
      const response = await api.get(`/routes/download/${file.id}`, {
        responseType: 'blob',
      });
      
      // Blob URLを作成
      const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const newWindow = window.open('', '_blank');
      if (newWindow) {
          // 新しいタブにHTMLを書き込み、タイトルを設定した上でPDFを全画面表示で埋め込む
          newWindow.document.write(`
              <!DOCTYPE html>
              <html>
                  <head>
                      <title>${file.filename}</title>
                      <style>
                          body { margin: 0; padding: 0; overflow: hidden; background-color: #525659; }
                          embed { width: 100vw; height: 100vh; border: none; }
                      </style>
                  </head>
                  <body>
                      <embed src="${fileURL}" type="application/pdf">
                  </body>
              </html>
          `);
          newWindow.document.close(); // 書き込みを完了させて表示を確定
      } else {
          // 万が一ポップアップブロック等でHTML書き込みが失敗した時の予備ルート
          window.open(fileURL, '_blank');
      }
      
      // 注意: createObjectURLで作成したURLはGCされないため、厳密にはrevokeが必要ですが
      // 別タブで開く場合、即座にrevokeすると読み込み前に消える可能性があるため、ここでは明示的なrevokeを省略するか
      // 一定時間後にrevokeするなどの工夫がいりますが、簡易実装としてはこれで動作します。
    } catch (e) {
      alert("ファイルの表示に失敗しました");
      console.error(e);
    }
  };

  // ダウンロード処理
  const handleDownload = async (file: RouteFile) => {
    try {
      const response = await api.get(`/routes/download/${file.id}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("ダウンロードに失敗しました");
      console.error(e);
    }
  };

  // フィルタリング処理
  const filteredFiles = files.filter(f => {
      const matchSubj = filterSubject === "" || (f.subject && f.subject.includes(filterSubject));
      const matchLevel = filterLevel === "" || (f.level && f.level.includes(filterLevel));
      // ★追加: 年度フィルタ (数値->文字列変換して比較)
      const matchYear = filterYear === "" || (f.academic_year && String(f.academic_year) === filterYear);
      return matchSubj && matchLevel && matchYear;
  });

  // ユニークなリストを作成（セレクトボックス用）
  const subjects = Array.from(new Set(files.map(f => f.subject).filter(Boolean)));
  const levels = Array.from(new Set(files.map(f => f.level).filter(Boolean)));
  // ★追加: 年度リスト (降順ソート)
  const years = Array.from(new Set(files.map(f => f.academic_year).filter(Boolean))).sort((a, b) => b - a);

  return (
    <Card className="h-full flex flex-col border shadow-sm min-h-[90vh]">
      
      <CardContent className="flex-1 overflow-hidden p-4 bg-gray-50/30 flex flex-col min-h-0">
        {/* フィルタエリア */}
        <div className="flex gap-2 mb-4 bg-white p-2 rounded border shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select 
                    className="h-8 text-xs border rounded px-2 min-w-[120px]"
                    value={filterSubject}
                    onChange={e => setFilterSubject(e.target.value)}
                >
                    <option value="">全科目</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <select 
                    className="h-8 text-xs border rounded px-2 min-w-[120px]"
                    value={filterLevel}
                    onChange={e => setFilterLevel(e.target.value)}
                >
                    <option value="">全レベル</option>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
            {/* ★追加: 年度フィルタ */}
            <div className="flex items-center gap-2">
                <select 
                    className="h-8 text-xs border rounded px-2 min-w-[100px]"
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                >
                    <option value="">全年度</option>
                    {years.map(y => <option key={y} value={String(y)}>{y}年度</option>)}
                </select>
            </div>
        </div>

        {/* ファイルリスト */}
        <div className="flex-1 overflow-auto border rounded-md bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        {/* ★変更: ファイル名の列幅を広めに取り、アップロード日を削除 */}
                        <TableHead className="min-w-[200px]">ファイル名</TableHead>
                        <TableHead className="w-28">科目</TableHead>
                        <TableHead className="w-24">レベル</TableHead>
                        <TableHead className="w-28">年度</TableHead>
                        <TableHead className="w-28 text-center">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredFiles.map((file) => (
                        <TableRow key={file.id} className="hover:bg-gray-50 transition-colors">
                            {/* ★変更: ファイル名を太字・少し大きめ・濃い色にして視認性バツグンに！ */}
                            <TableCell className="font-bold text-base text-gray-800">
                                <div className="flex items-center">
                                    {/* shrink-0 を入れることで、ファイル名が長くてもアイコンが潰れません */}
                                    <FileText className="w-5 h-5 mr-2 text-red-500 shrink-0" />
                                    {/* 長すぎるファイル名対策（2行で省略） */}
                                    <span className="line-clamp-2 break-all">{file.filename}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {file.subject && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap">{file.subject}</span>}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap text-gray-600">{file.level}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap text-gray-600">{file.academic_year}年度</TableCell>
                            {/* ★変更: アップロード日のセルを丸ごと削除しました */}
                            <TableCell className="text-center">
                                {/* ★変更: ボタンを少しスタイリッシュに調整 */}
                                <Button size="sm" variant="outline" className="h-8 text-xs border-blue-200 hover:bg-blue-50 hover:text-blue-700" onClick={() => handleViewPdf(file)}>
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    表示
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredFiles.length === 0 && (
                        <TableRow>
                            {/* ★変更: カラムが1つ減ったので colSpan を 6 から 5 に修正 */}
                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                {loading ? "読み込み中..." : "該当するファイルがありません"}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
