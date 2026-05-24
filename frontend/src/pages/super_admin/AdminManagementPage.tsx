import React from 'react';
import { Key, UserPlus, Shield } from 'lucide-react';

export default function AdminManagementPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-8 h-8 text-amber-600" /> 管理者権限の管理
          </h1>
          <p className="text-sm text-gray-600 mt-1">super_adminユーザーの追加、および最高管理権限の監査を行います。</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium shadow-sm transition-colors">
          <UserPlus className="w-4 h-4" /> 管理者の招待
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <strong>セキュリティ警告:</strong> super_admin権限を持つユーザーは、すべてのテナントデータの暗号化を解除し、直接操作を適用する権限を持ちます。アカウントの追加および権限の委譲は厳格なポリシーのもとで実行してください。自己管理の原則に基づき、同格の管理者を任命可能です。
          </div>
        </div>
        <div className="p-12 text-center text-gray-500 text-sm">
          現在、super_admin ロールのユーザー一覧を表示するコンポーネントを準備中です。
        </div>
      </div>
    </div>
  );
}