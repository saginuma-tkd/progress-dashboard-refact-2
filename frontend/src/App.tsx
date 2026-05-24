import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DashboardLayout from './DashboardLayout';
import Dashboard from './pages/DashboardHome';
import Admin from './pages/Admin';
import PastExam from './pages/PastExam';
import Statistics from './pages/Statistics';
import BugReport from './pages/BugReport';
import Changelog from './pages/Changelog';
import DeveloperDashboard from './pages/DeveloperDashboard';
import { Toaster } from 'sonner';
import { SystemProvider, useSystem } from './contexts/SystemContext';
import SystemBanner from './components/SystemBanner';
import Maintenance from './pages/Maintenance';
import { useAuth } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import ReportPrintView from './pages/ReportPrintView';
import MaterialSearch from './pages/MaterialSearch';
import SubmitResultsPage from './pages/student/SubmitResultsPage';
import TransferRequestPage from './pages/student/TransferRequestPage';
import AbsenceReportPage from './pages/student/AbsenceReportPage';
import ApplicationReviewPage from './pages/admin/ApplicationReviewPage';
import SystemAdminDashboard from './pages/admin/SystemAdminDashboard';
import DbViewerPage from './pages/super_admin/DBViewerPage';
import AdminManagementPage from './pages/super_admin/AdminManagementPage';
import MaintenanceManualPage from './pages/super_admin/MaintenanceManualPage';

// メンテナンスモードのガードコンポーネント
const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, loading: systemLoading } = useSystem();
  const { user } = useAuth(); // ← authLoading を削除しました！
  const location = useLocation();

  // システム設定のロード中のみ待機
  if (systemLoading) return null;

  // 1. ログイン画面へのアクセスは常に許可 (開発者が入るため)
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  // 2. メンテナンスモードONの場合
  if (settings?.maintenance_mode) {
    // 開発者(developer)ロールなら通過
    if (user?.role === 'developer') {
      return <>{children}</>;
    }
    // それ以外はメンテナンス画面を表示
    return <Maintenance />;
  }

  return <>{children}</>;
};

// --- App コンポーネント本体 ---
const App: React.FC = () => {
  useEffect(() => {
    // Viteの機能で、開発環境（npm run dev）の時だけ実行される
    if (import.meta.env.DEV) {
      if (!document.title.startsWith('[LOCAL]')) {
        document.title = `[LOCAL] ${document.title}`;
      }
    }
  }, []);
  return (
    <ConfirmProvider>
      <Router>
        <AuthProvider>
          <SystemProvider> {/* 追加: システム設定のコンテキスト */}

            {/* 追加: 画面最上部に常駐するお知らせバナー */}
            <SystemBanner />

            {/* 追加: メンテナンス状態を監視するガード */}
            <MaintenanceGuard>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/print-report/:studentId" element={<ReportPrintView />} />

                {/* 保護されたルート (ログイン必須) */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  {/* ダッシュボードホーム */}
                  <Route index element={<Dashboard />} />

                  {/* 各機能ページ */}
                  <Route path="past-exam" element={<PastExam />} />
                  <Route path="materials" element={<MaterialSearch />} />
                  <Route path="statistics" element={<Statistics />} />
                  <Route path="bug-report" element={<BugReport />} />
                  <Route path="changelog" element={<Changelog />} />
                  <Route path="student/submit-results" element={<SubmitResultsPage />} />
                  <Route path="student/transfer-request" element={<TransferRequestPage />} />
                  <Route path="student/absence-report" element={<AbsenceReportPage />} />

                  {/* 講師・管理者用ページ */}
                  <Route path="applications-review" element={
                    <ProtectedRoute roles={['admin', 'developer', 'user']}>
                      <ApplicationReviewPage />
                    </ProtectedRoute>
                  } />

                  {/* 管理者専用ページ */}
                  <Route path="admin" element={
                    <ProtectedRoute roles={['admin', 'developer']}>
                      <Admin />
                    </ProtectedRoute>
                  } />

                  {/* 開発者用ページ */}
                  <Route path="developer" element={
                    <ProtectedRoute roles={['developer']}>
                      <DeveloperDashboard />
                    </ProtectedRoute>
                  } />

                  {/* システム管理者用ページ */}
                  <Route path="system_admin" element={
                    <ProtectedRoute roles={['super_admin']}>
                      <SystemAdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/system_admin/db" element={<DbViewerPage />} />
                  <Route path="/system_admin/admins" element={<AdminManagementPage />} />
                  <Route path="/system_admin/manual" element={<MaintenanceManualPage />} />
                </Route>
              </Routes>
            </MaintenanceGuard>

            <Toaster />
          </SystemProvider>
        </AuthProvider>
      </Router>
    </ConfirmProvider>
  );
};

export default App;