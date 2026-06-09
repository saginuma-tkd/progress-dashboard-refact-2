import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, HardDrive, Search, AlertCircle, Pencil, Save, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import BackupManagement from '../../components/admin/BackupManagement';
import api from '../../lib/api';

export default function DbViewerPage() {
  const [tableName, setTableName] = useState("");
  const [availableTables, setAvailableTables] = useState<string[]>([]);

  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 🌟 編集モード用の状態管理
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const fetchTableList = async () => {
    try {
      const res = await api.get('/system_admin/db/tables');
      setAvailableTables(res.data.tables);
    } catch (e) {
      console.error("テーブル一覧の取得に失敗しました", e);
    }
  };

  useEffect(() => {
    fetchTableList();
  }, []);

  const handleSearch = async (targetTable: string = tableName) => {
    if (!targetTable) return;
    setIsLoading(true);
    setError("");
    setEditingRowId(null); // テーブル切り替え時に編集モードを解除
    try {
      const res = await api.get(`/system_admin/db/tables/${targetTable}`);
      setColumns(res.data.columns);
      setRows(res.data.rows);
      setTableName(targetTable);
    } catch (e: any) {
      setError(e.response?.data?.detail || "データの取得に失敗しました");
      setColumns([]);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 編集を開始する
  const startEditing = (row: any) => {
    if (row.id === undefined) {
      alert("このテーブルには 'id' カラムがないため、ブラウザからの直接編集はできません。");
      return;
    }
    setEditingRowId(row.id);
    setEditValues({ ...row }); // 現在の行のデータをフォームの初期値にコピー
  };

  // 🌟 編集を保存する
  const handleSaveEdit = async () => {
    if (editingRowId === null) return;

    // 更新するデータの抽出 (idは除外)
    const updates: Record<string, any> = {};
    columns.forEach(col => {
      if (col !== 'id') {
        // 空文字をnullに変換する等の微調整（DBの仕様に合わせて適宜変更）
        let val = editValues[col];
        if (val === "null" || val === "") val = null;
        updates[col] = val;
      }
    });

    try {
      await api.put('/system_admin/db/tables/row', {
        table_name: tableName,
        row_id: editingRowId,
        updates: updates
      });
      // 成功したら編集モードを抜けてデータを再取得
      setEditingRowId(null);
      handleSearch(tableName);
    } catch (e: any) {
      alert(e.response?.data?.detail || "更新に失敗しました");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div>
        <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Database className="w-8 h-8 text-indigo-600" /> データベース直接ビューア & 管理
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">RAWデータ直接閲覧ツリー</h2>
          <button
            onClick={fetchTableList}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> スキーマ再読み込み
          </button>
        </div>

        <div className="flex gap-2 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="テーブル名（例: users, students...）"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full flex h-9 rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md text-xs hover:bg-indigo-700 shrink-0 disabled:opacity-50"
          >
            {isLoading ? "読込中..." : "クエリ実行"}
          </button>
        </div>

        {availableTables.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
            <span className="text-[10px] text-gray-500 py-1">利用可能なテーブル:</span>
            {availableTables.map(t => (
              <button
                key={t}
                onClick={() => handleSearch(t)}
                className="text-[10px] bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 px-2 py-1 rounded transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto border rounded-md relative bg-white [&>div]:h-full">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="text-sm font-bold mb-1">テーブルが選択されていません</h3>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10 ring-1 ring-gray-200">
                <TableRow>
                  {/* 🌟 一番左に「操作」のヘッダーを追加 */}
                  <TableHead className="w-16 bg-gray-50 z-20 sticky left-0 shadow-[1px_0_0_#e5e7eb]">操作</TableHead>
                  {columns.map(col => (
                    <TableHead key={col} className="whitespace-nowrap text-xs font-bold text-gray-700">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center h-32 text-gray-500">
                      レコードが0件です
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, i) => {
                    const isEditing = editingRowId === row.id;
                    return (
                      <TableRow key={i}>
                        {/* 🌟 操作ボタン */}
                        <TableCell className="w-16 bg-white sticky left-0 shadow-[1px_0_0_#e5e7eb] z-10">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" onClick={handleSaveEdit} className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white">
                                <Save className="w-3 h-3 mr-1" /> 保存
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingRowId(null)} className="h-6 w-6 p-0">
                                <X className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => startEditing(row)} className="h-6 w-8 p-0 text-gray-400 hover:text-indigo-600">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </TableCell>

                        {/* 🌟 データセル */}
                        {columns.map(col => (
                          <TableCell key={col} className="whitespace-nowrap text-xs text-gray-600 min-w-[120px] max-w-[300px]">
                            {isEditing && col !== 'id' ? (
                              <Input
                                className="h-7 text-xs px-2"
                                value={editValues[col] === null ? "" : editValues[col]}
                                onChange={(e: any) => setEditValues({ ...editValues, [col]: e.target.value })}
                              />
                            ) : (
                              <div className="truncate">
                                {row[col] === null ? <span className="text-gray-300 italic">null</span> : String(row[col])}
                              </div>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}