import React from 'react';
import { Database, RefreshCw, HardDrive } from 'lucide-react';
import BackupManagement from '../../components/admin/BackupManagement'; 

export default function DbViewerPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-8 h-8 text-indigo-600" /> データベース直接ビューア & 管理
        </h1>
        <p className="text-sm text-gray-600 mt-1">全テナントのRAWデータの検証、およびシステム全体のバックアップ作成を行います。</p>
      </div>

      {/* 🌟 バックアップ管理コンポーネントをここに埋め込み */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" /> システムバックアップの作成・履歴
        </h2>
        <BackupManagement />
      </div>

      {/* RAWデータビューア（下段に配置） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">RAWデータ直接閲覧ツリー</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> スキーマ再読み込み
          </button>
        </div>
        <div className="border border-dashed rounded-lg p-12 text-center py-20 bg-gray-50/50">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-700 mb-1">テーブルが選択されていません</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">閲覧したいエンティティを選択するか、クエリを実行してください。</p>
          <div className="max-w-md mx-auto flex gap-2">
            <input type="text" placeholder="テーブル名（例: tenants, users...）" className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-2 text-xs" />
            <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md text-xs hover:bg-indigo-700 shrink-0">検索</button>
          </div>
        </div>
      </div>
    </div>
  );
}