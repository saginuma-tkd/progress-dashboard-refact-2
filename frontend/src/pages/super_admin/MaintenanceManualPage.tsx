import React from 'react';
import { BookOpen, Megaphone, FileText } from 'lucide-react';
import SystemSettingsManagement from '../../components/developer/SystemSettingsManagement'; // 🌟 移植
import ChangelogManagement from '../../components/admin/ChangelogManagement'; // 🌟 移植（以前のパスに合わせて調整してください）

export default function MaintenanceManualPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-emerald-600" /> 運営・保守・システム設定
        </h1>
        <p className="text-sm text-gray-600 mt-1">アプリ全体のシステム稼働設定、お知らせ、およびアップデート情報の管理を行います。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側: システム設定・通知 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Megaphone className="w-5 h-5 text-amber-500" /> アプリ全体の稼働設定
          </h2>
          <SystemSettingsManagement />
        </div>

        {/* 右側: リリースノート更新 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <FileText className="w-5 h-5 text-pink-500" /> リリースノート (更新履歴) の執筆
          </h2>
          <ChangelogManagement />
        </div>
      </div>
    </div>
  );
}