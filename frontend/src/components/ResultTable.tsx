import React, { useState, useEffect, ChangeEvent } from 'react';
import { fetchPastResults, fetchMockResults } from '../api/axios';

// --- 型定義 ---
interface ResultsTableProps {
  studentId: string;
}

// 過去問データの型 (APIレスポンスに基づく)
interface PastResult {
  id: number;
  university_name: string;
  faculty_name: string;
  department_name?: string;
  exam_year: number;
  subject: string;
  correct_answers: number;
  total_questions: number;
  date: string;
  created_at?: string;
  [key: string]: any; // インデックスシグネチャ (フィルタ用)
}

// 模試データの型 (縦持ち変換後)
interface MockResult {
  id: number;
  mock_name: string;
  exam_date: string;
  subject: string;
  score: number | string;
  [key: string]: any; // インデックスシグネチャ (フィルタ用)
}

// カラム定義の型
interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

type TabType = 'past' | 'mock';

const ResultsTable: React.FC<ResultsTableProps> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('past');
  // データは過去問か模試のどちらかの配列
  const [data, setData] = useState<PastResult[] | MockResult[]>([]);
  
  // フィルタ状態: { columnKey: "search text", ... }
  const [filters, setFilters] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!studentId) return;
    setFilters({}); // 生徒やタブが変わったらフィルタをリセット
    loadData();
  }, [studentId, activeTab]);

  const loadData = async () => {
    if (activeTab === 'past') {
      const res = await fetchPastResults(studentId);
      setData(res);
    } else {
      const res = await fetchMockResults(studentId);
      setData(res);
    }
  };

  // フィルタ入力のハンドラ
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // フィルタリング実行ロジック
  const filteredData = data.filter((row: any) => {
    // 全てのフィルタ条件を満たすかチェック
    return Object.keys(filters).every(key => {
      const filterVal = filters[key].toLowerCase();
      if (!filterVal) return true; // 空なら無視

      const rowVal = row[key];
      // 値が存在しない、または文字列化して含まれていなければ除外
      if (rowVal === null || rowVal === undefined) return false;
      return String(rowVal).toLowerCase().includes(filterVal);
    });
  });

  // --- タブごとのカラム定義 ---
  const pastColumns: Column<PastResult>[] = [
    { key: 'university_name', label: '大学名' },
    { key: 'faculty_name', label: '学部' },
    { key: 'exam_year', label: '年度' },
    { key: 'subject', label: '科目' },
    // 得点 / 配点
    { key: 'score_display', label: '得点 / 配点', 
      render: (r) => `${r.correct_answers || 0} / ${r.total_questions || 0}` },
    // 得点率
    { key: 'percentage', label: '得点率', 
      render: (r) => r.total_questions ? `${Math.round((r.correct_answers / r.total_questions) * 100)}%` : '-' }
  ];

  const mockColumns: Column<MockResult>[] = [
    { key: 'exam_date', label: '実施日' },
    { key: 'mock_name', label: '模試名' },
    { key: 'subject', label: '科目' },
    { 
      key: 'score', 
      label: '得点', 
      render: (r) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: '100px' }}>
          {r.score !== null && r.score !== undefined ? r.score : '-'}
        </div>
      )
    }
  ];

  // 現在のアクティブなカラムを選択 (型アサーションでany[]として扱うことで共通化)
  const columns = (activeTab === 'past' ? pastColumns : mockColumns) as Column<any>[];

  if (!studentId) return <p>生徒を選択してください</p>;

  return (
    <div style={{ marginTop: '20px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
      
      {/* タブ切り替え */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
          onClick={() => setActiveTab('past')}
          style={{ 
            fontWeight: 'bold', 
            padding: '8px 16px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'past' ? '3px solid #007bff' : '3px solid transparent',
            background: 'none', border: 'none'
          }}
        >
          過去問データ
        </button>
        <button 
          onClick={() => setActiveTab('mock')}
          style={{ 
            fontWeight: 'bold', 
            padding: '8px 16px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'mock' ? '3px solid #007bff' : '3px solid transparent',
            background: 'none', border: 'none'
          }}
        >
          模試データ
        </button>
      </div>

      {/* テーブル */}
      <div style={{ overflowX: 'auto' }}>
        <table className="calendar-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
          <thead>
            {/* 1行目: ヘッダータイトル */}
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {columns.map(col => (
                <th key={col.key} style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
            </tr>
            {/* 2行目: 検索フィルタ入力欄 */}
            <tr style={{ backgroundColor: '#fff' }}>
              {columns.map(col => (
                <th key={`filter-${col.key}`} style={{ padding: '5px', borderBottom: '2px solid #ddd' }}>
                  {/* renderプロパティがある（計算項目の）場合はフィルタ不可にするか、単純検索にする */}
                  {!col.render && (
                    <input
                      type="text"
                      placeholder={`${col.label}で検索...`}
                      value={filters[col.key] || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange(col.key, e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '5px', 
                        fontSize: '0.85rem', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '10px' }}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  データが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666', textAlign: 'right' }}>
        全 {filteredData.length} 件を表示中
      </div>
    </div>
  );
};

export default ResultsTable;
