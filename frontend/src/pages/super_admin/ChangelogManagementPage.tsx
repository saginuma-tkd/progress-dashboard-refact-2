import React from 'react';
import { BookOpen, Megaphone, FileText, FileEdit } from 'lucide-react';
import SystemSettingsManagement from '../../components/developer/SystemSettingsManagement'; // 🌟 移植
import ChangelogManagement from '../../components/admin/ChangelogManagement'; // 🌟 移植（以前のパスに合わせて調整してください）

export default function MaintenanceManualPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
      <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
        <FileEdit className="w-5 h-5 text-pink-500" /> リリースノート (更新履歴) の執筆
      </h2>
      <div>
        <ChangelogManagement />
      </div>
    </div>
  );
}