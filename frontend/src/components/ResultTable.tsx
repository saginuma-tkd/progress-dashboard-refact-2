import React, { useState, useEffect, ChangeEvent } from 'react';
import { fetchPastResults, fetchMockResults } from '../api/exams';
// 🌟 1. types.ts からインポート！
import { PastResult, MockResult } from '../types';

interface ResultsTableProps {
  studentId: string;
}

// 🌟 2. key の型を文字列に限定しつつ、安全に定義
interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

type TabType = 'past' | 'mock';

const ResultsTable: React.FC<ResultsTableProps> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('past');
  const [data, setData] = useState<PastResult[] | MockResult[]>([]);
  const [filters, setFilters] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!studentId) return;
    setFilters({});
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 🌟 3. any を使わずに動的キーでフィルタリングする魔法！
  const filteredData = data.filter((row) => {
    return Object.keys(filters).every(key => {
      const filterVal = filters[key].toLowerCase();
      if (!filterVal) return true;

      // オブジェクトを「文字列キーを持つ未知のデータ」として一時的に扱う（anyより安全）
      const rowVal = (row as unknown as Record<string, unknown>)[key];

      if (rowVal === null || rowVal === undefined) return false;
      return String(rowVal).toLowerCase().includes(filterVal);
    });
  });

  const pastColumns: Column<PastResult>[] = [
    { key: 'university_name', label: '大学名' },
    { key: 'faculty_name', label: '学部' },
    { key: 'exam_year', label: '年度' },
    { key: 'subject', label: '科目' },
    {
      key: 'score_display', label: '得点 / 配点',
      render: (r) => `${r.correct_answers || 0} / ${r.total_questions || 0}`
    },
    {
      key: 'percentage', label: '得点率',
      render: (r) => r.total_questions ? `${Math.round((r.correct_answers / r.total_questions) * 100)}%` : '-'
    }
  ];

  const mockColumns: Column<MockResult>[] = [
    { key: 'exam_date', label: '実施日' },
    { key: 'mock_name', label: '模試名' },
    { key: 'subject', label: '科目' },
    {
      key: 'score', label: '得点',
      render: (r) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: '100px' }}>
          {r.score !== null && r.score !== undefined ? r.score : '-'}
        </div>
      )
    }
  ];

  if (!studentId) return <p>生徒を選択してください</p>;

  // ヘッダーやフィルタ用のカラム配列（描画用）
  const activeColumns = activeTab === 'past' ? pastColumns : mockColumns;

  // 🌟 4. テーブルの中身を描画する関数（タブごとに型を完璧に分ける）
  const renderTableBody = () => {
    if (filteredData.length === 0) {
      return (
        <tr>
          <td colSpan={activeColumns.length} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            データが見つかりません
          </td>
        </tr>
      );
    }

    if (activeTab === 'past') {
      const pastData = filteredData as PastResult[];
      return pastData.map((row, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
          {pastColumns.map(col => (
            <td key={col.key} style={{ padding: '10px' }}>
              {col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '')}
            </td>
          ))}
        </tr>
      ));
    } else {
      const mockData = filteredData as MockResult[];
      return mockData.map((row, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
          {mockColumns.map(col => (
            <td key={col.key} style={{ padding: '10px' }}>
              {col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '')}
            </td>
          ))}
        </tr>
      ));
    }
  };

  return (
    <div style={{ marginTop: '20px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            fontWeight: 'bold', padding: '8px 16px', cursor: 'pointer',
            borderBottom: activeTab === 'past' ? '3px solid #007bff' : '3px solid transparent',
            background: 'none', border: 'none'
          }}
        >
          過去問データ
        </button>
        <button
          onClick={() => setActiveTab('mock')}
          style={{
            fontWeight: 'bold', padding: '8px 16px', cursor: 'pointer',
            borderBottom: activeTab === 'mock' ? '3px solid #007bff' : '3px solid transparent',
            background: 'none', border: 'none'
          }}
        >
          模試データ
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="calendar-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {activeColumns.map(col => (
                <th key={col.key} style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
            </tr>
            <tr style={{ backgroundColor: '#fff' }}>
              {activeColumns.map(col => (
                <th key={`filter-${col.key}`} style={{ padding: '5px', borderBottom: '2px solid #ddd' }}>
                  {!col.render && (
                    <input
                      type="text"
                      placeholder={`${col.label}で検索...`}
                      value={filters[col.key] || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange(col.key, e.target.value)}
                      style={{
                        width: '100%', padding: '5px', fontSize: '0.85rem',
                        border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box'
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 🌟 呼び出しがスッキリ！ */}
            {renderTableBody()}
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