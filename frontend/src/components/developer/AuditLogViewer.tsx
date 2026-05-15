import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, MapPin, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import api from '../../lib/api';

// バックエンドのスキーマに合わせた型定義
interface AuditLog {
  id: number;
  user_id: number | null;
  user_name?: string | null; // 🌟これを追加
  action: string;
  branch_id: number | null;
  details: string | null;
  timestamp: string;
}

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ★追加: 進捗更新のみをフィルタリングするState
  const [filterProgressOnly, setFilterProgressOnly] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit/logs');
      setLogs(response.data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('監査ログの取得に失敗しました。権限を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 日時を日本時間にフォーマットする関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // アクションの種類によってバッジの色を変える演出
  const getActionBadge = (action: string) => {
    const upperAction = action.toUpperCase();
    
    // ★追加: 進捗更新アクションを特別に目立たせる（アクション名に PROGRESS が含まれると想定）
    if (upperAction.includes('PROGRESS')) {
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full shadow-sm">{action}</span>;
    }
    if (upperAction.includes('DELETE') || upperAction.includes('DROP') || upperAction.includes('FAIL')) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">{action}</span>;
    }
    if (upperAction.includes('UPDATE') || upperAction.includes('EDIT')) {
      return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">{action}</span>;
    }
    if (upperAction.includes('LOGIN')) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">{action}</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full">{action}</span>;
  };

  // ★追加: 詳細(details)を見やすくパースする関数
  const formatDetails = (details: string | null) => {
    if (!details) return '-';
    try {
        // JSON形式の場合はパースしてバッジ化を試みる
        const parsed = JSON.parse(details);
        
        // 特定のキー（student_name, book_nameなど）があればバッジとして表示
        const badges = [];
        if (parsed.student_name || parsed.student_id) {
            badges.push(<span key="student" className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-xs font-medium">生徒: {parsed.student_name || parsed.student_id}</span>);
        }
        if (parsed.book_name || parsed.book_title || parsed.textbook_id) {
            badges.push(<span key="book" className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200 text-xs font-medium">参考書: {parsed.book_name || parsed.book_title || parsed.textbook_id}</span>);
        }
        if (parsed.completed !== undefined) {
            badges.push(<span key="completed" className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-xs font-medium">進捗: {parsed.completed}</span>);
        }

        if (badges.length > 0) {
            return (
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1">{badges}</div>
                    <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">{details}</div>
                </div>
            );
        }
        
        // バッジ化できるキーがないJSONの場合
        return <div className="text-xs text-gray-600 whitespace-pre-wrap break-all font-mono bg-gray-50 p-1 rounded">{JSON.stringify(parsed)}</div>;
    } catch (e) {
        // JSONではない（ただの文字列）の場合
        return <div className="text-xs text-gray-600 whitespace-pre-wrap break-all">{details}</div>;
    }
  };

  // ★追加: フィルタリング適用
  const filteredLogs = filterProgressOnly 
    ? logs.filter(log => log.action.toUpperCase().includes('PROGRESS')) 
    : logs;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>ログを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold">システム監査ログ</h2>
        </div>
        <div className="flex items-center gap-4">
            {/* ★追加: 進捗フィルタートグル */}
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none bg-gray-50 hover:bg-gray-100 border px-3 py-1.5 rounded-full transition-colors">
                <Filter className={`w-4 h-4 ${filterProgressOnly ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className={filterProgressOnly ? 'text-emerald-700 font-medium' : 'text-gray-600'}>進捗更新のみ表示</span>
                <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={filterProgressOnly} 
                    onChange={(e) => setFilterProgressOnly(e.target.checked)} 
                />
            </label>

            <button 
            onClick={fetchLogs}
            className="text-sm flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors"
            >
            <RefreshCw className="w-4 h-4" /> 更新
            </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap"><Clock className="w-4 h-4 inline mr-1"/>日時</th>
                <th className="px-4 py-3 whitespace-nowrap"><Activity className="w-4 h-4 inline mr-1"/>アクション</th>
                <th className="px-4 py-3 whitespace-nowrap"><User className="w-4 h-4 inline mr-1"/>実行者</th>
                <th className="px-4 py-3 whitespace-nowrap"><MapPin className="w-4 h-4 inline mr-1"/>校舎ID</th>
                {/* ★変更: 詳細情報の幅を広げる */}
                <th className="px-4 py-3 min-w-[300px]">詳細情報</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <Filter className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    記録されたログはありません。
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-indigo-700">
                      {log.user_name || log.user_id || 'システム'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{log.branch_id || 'ALL'}</td>
                    {/* ★変更: formatDetails関数を通して描画 */}
                    <td className="px-4 py-3">
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;