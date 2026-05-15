import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShieldAlert, Database, KeyRound, Wrench,
  Users, HardDrive, AlertTriangle, CheckCircle2,
  UserCog, UserPlus, Megaphone, FileSearch, FileSpreadsheet, FileText, Settings
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import api from '../lib/api';

// --- 外部コンポーネントのインポート ---
import PasswordResetForm from '../components/PasswordResetForm';
import GradeUpdateManagement from '../components/developer/GradeUpdateManagement';
import BackupManagement from '../components/admin/BackupManagement'; // DatabaseManagementの代わりに使用

// --- 新規追加コンポーネントのインポート (Phase 2, 3, 4) ---
import RoleManagement from '../components/developer/RoleManagement';
import DeveloperAccountManagement from '../components/developer/DeveloperAccountManagement';
import SystemSettingsManagement from '../components/developer/SystemSettingsManagement';
import AuditLogViewer from '../components/developer/AuditLogViewer';
import CsvImportManagement from '../components/developer/CsvImportManagement';
import ChangelogManagement from '../components/admin/ChangelogManagement';

interface SystemInfo {
  db_size_mb: number;
  last_backup: string;
  active_users: number;
  total_students: number;
}

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // システム情報の取得
  const fetchSystemInfo = async () => {
    try {
      const response = await api.get('/developer/system-info');
      setSysInfo(response.data);
    } catch (error) {
      console.error("Failed to fetch system info", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'developer') {
      fetchSystemInfo();
    }
  }, [user]);

  // Developer以外はアクセス禁止
  if (user?.role !== 'developer') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">アクセス拒否</h2>
        <p className="text-gray-500 mt-2">このページは開発者専用です。</p>
      </div>
    );
  }

  // --- 機能リスト定義 (全8機能) ---
  const features = [
    { 
      title: "学年一括更新", 
      icon: AlertTriangle, 
      description: "全生徒の学年を強制的に繰り上げ", 
      colorClass: "bg-orange-100 text-orange-600",
      component: <GradeUpdateManagement onUpdate={fetchSystemInfo} /> 
    },
    { 
      title: "データベース管理", 
      icon: HardDrive, 
      description: "本番データのバックアップ取得", 
      colorClass: "bg-blue-100 text-blue-600",
      component: <BackupManagement /> 
    },
    { 
      title: "パスワードリセット", 
      icon: KeyRound, 
      description: "ユーザーのパスワード強制上書き", 
      colorClass: "bg-purple-100 text-purple-600",
      component: <div className="flex justify-center -mx-6 -mb-6 p-6 bg-gray-50/50"><PasswordResetForm /></div> 
    },
    { 
      title: "権限・ロール管理", 
      icon: UserCog, 
      description: "Admin/Developer権限の付与と剥奪", 
      colorClass: "bg-indigo-100 text-indigo-600",
      component: <RoleManagement /> 
    },
    { 
      title: "開発者アカウント", 
      icon: UserPlus, 
      description: "開発者アカウントの追加・停止", 
      colorClass: "bg-sky-100 text-sky-600",
      component: <DeveloperAccountManagement /> 
    },
    { 
      title: "システム設定・通知", 
      icon: Megaphone, 
      description: "メンテナンスモードとお知らせバナー", 
      colorClass: "bg-amber-100 text-amber-600",
      component: <SystemSettingsManagement /> 
    },
    // { 
    //   title: "監査ログ閲覧", 
    //   icon: FileSearch, 
    //   description: "システム内の操作・変更履歴の追跡", 
    //   colorClass: "bg-slate-200 text-slate-700",
    //   component: <AuditLogViewer /> 
    // },
    { 
      title: "CSV一括インポート", 
      icon: FileSpreadsheet, 
      description: "生徒データや模試成績の一括登録", 
      colorClass: "bg-emerald-100 text-emerald-600",
      component: <CsvImportManagement /> 
    },
    { 
      title: "リリースノート更新",
      icon: FileText, 
      description: "更新履歴の追加・編集", 
      colorClass: "bg-pink-100 text-pink-600", 
      component: <ChangelogManagement /> 
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* ヘッダー部分 */}
      <div className="flex-none">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="w-6 h-6" /> 開発者メニュー
        </h2>
      </div>

      {/* システムステータス (メトリクス) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">DBサイズ</p>
              <h3 className="text-2xl font-bold">{loading ? '-' : `${sysInfo?.db_size_mb} MB`}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">総生徒数</p>
              <h3 className="text-2xl font-bold">{loading ? '-' : sysInfo?.total_students}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">登録アカウント</p>
              <h3 className="text-2xl font-bold">{loading ? '-' : sysInfo?.active_users}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">システム状態</p>
              <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> 正常
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 機能メニュー (8項目なので 4列x2段 のグリッドに配置) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, i) => (
          <Dialog key={i}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full hover:bg-gray-50/50">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className={`p-4 rounded-full ${feature.colorClass}`}>
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <feature.icon className="w-5 h-5" />
                  {feature.title}
                </DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                {feature.component}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}