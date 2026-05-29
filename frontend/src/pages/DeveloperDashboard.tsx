import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldAlert, Database, KeyRound, Wrench,
  Users, HardDrive, AlertTriangle, CheckCircle2,
  UserCog, FileSpreadsheet, BookOpen, GraduationCap,
  Landmark
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import api from '../lib/api';

// --- 外部コンポーネントのインポート ---
import PasswordResetForm from '../components/PasswordResetForm';
import GradeUpdateManagement from '../components/developer/GradeUpdateManagement';

// --- 新規追加コンポーネントのインポート (Phase 2, 3, 4) ---
import RoleManagement from '../components/developer/RoleManagement';
import CsvImportManagement from '../components/developer/CsvImportManagement';
import SchoolManagement from '../components/developer/SchoolManagement';

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
  const [stats, setStats] = useState({ total_branches: 0, total_students: 0, total_teachers: 0, total_materials: 0 });

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
    // 統計データの取得
    api.get('/developer/stats').then(res => setStats(res.data)).catch(console.error);
  }, []);

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
      title: "校舎・ブランチ管理",
      icon: Landmark,
      description: "校舎（ブランチ）の開設と一覧の確認",
      colorClass: "bg-teal-100 text-teal-600",
      component: <SchoolManagement />
    },
    {
      title: "権限・ロール管理",
      icon: UserCog,
      description: "Admin/User権限の付与・剥奪、アカウント発行",
      colorClass: "bg-indigo-100 text-indigo-600",
      component: <RoleManagement />
    },
    {
      title: "学年一括更新",
      icon: AlertTriangle,
      description: "全生徒の学年を強制的に繰り上げ",
      colorClass: "bg-orange-100 text-orange-600",
      component: <GradeUpdateManagement onUpdate={fetchSystemInfo} />
    },
    {
      title: "パスワードリセット",
      icon: KeyRound,
      description: "ユーザーのパスワード強制上書き",
      colorClass: "bg-purple-100 text-purple-600",
      component: <div className="flex justify-center -mx-6 -mb-6 p-6 bg-gray-50/50"><PasswordResetForm /></div>
    },
    {
      title: "CSV一括インポート",
      icon: FileSpreadsheet,
      description: "生徒データや模試成績の一括登録",
      colorClass: "bg-emerald-100 text-emerald-600",
      component: <CsvImportManagement />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 校舎数 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-lg"><Landmark className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">稼働校舎数</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total_branches} <span className="text-sm font-normal text-gray-500">校</span></h3>
          </div>
        </div>
        {/* 総生徒数 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><GraduationCap className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">総生徒数</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total_students} <span className="text-sm font-normal text-gray-500">名</span></h3>
          </div>
        </div>
        {/* 総講師数 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">在籍講師・スタッフ</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total_teachers} <span className="text-sm font-normal text-gray-500">名</span></h3>
          </div>
        </div>
        {/* 公式マスタデータ数 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><BookOpen className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">公式教材・ルート表</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total_materials} <span className="text-sm font-normal text-gray-500">ファイル</span></h3>
          </div>
        </div>
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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