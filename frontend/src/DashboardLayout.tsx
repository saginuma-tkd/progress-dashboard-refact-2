// frontend/src/DashboardLayout.tsx

import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import api from './lib/api';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import {
    LogOut, Home, BookOpen, Settings, ScrollText, MessagesSquare,
    Key, Wrench, Files, ChevronLeft, ChevronRight, File,
    Calendar, ShieldAlert, Menu, X, Database, Bell
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./components/ui/dialog";
import ChangePasswordForm from './components/ChangePasswordForm';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [StudentPlofile, setStudentPlofile] = useState<any>(null);
    // 🌟 追加: 未承認申請の件数ステート
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const fetchPendingCount = () => {
            if (user && ['user', 'admin', 'developer'].includes(user.role)) {
                api.get('/applications/pending-count')
                    .then(res => setPendingCount(res.data.count))
                    .catch(err => console.error("未承認申請の取得に失敗:", err));
            }
        };

        if (user?.role === 'student') {
            api.get('students/me')
                .then(res => setStudentPlofile(res.data))
                .catch(err => console.error(err));
        } else {
            fetchPendingCount(); // 初回とページ遷移時に取得
        }

        // 🌟 ここを追加！: ページ側から「refreshPendingCount」の合図が来たら再取得する
        window.addEventListener('refreshPendingCount', fetchPendingCount);

        // クリーンアップ
        return () => {
            window.removeEventListener('refreshPendingCount', fetchPendingCount);
        };
    }, [user, location.pathname]);

    const isStudent = user?.role === 'student';

    const navItems = [];

    // 🎓 生徒 (student)
    if (user?.role === 'student') {
        navItems.push(
            { name: 'ダッシュボード', path: '/', icon: Home },
            { name: '過去問/模試/入試', path: '/past-exam', icon: BookOpen },
            { name: '成績・入試日程入力', path: '/student/submit-results', icon: ScrollText },
            { name: '振替申請', path: '/student/transfer-request', icon: Calendar },
            { name: '欠席報告', path: '/student/absence-report', icon: Calendar }
        );
    }

    // 👨‍🏫 講師 (user)
    if (user?.role === 'user') {
        navItems.push(
            { name: 'ダッシュボード', path: '/', icon: Home },
            { name: '過去問/模試/入試', path: '/past-exam', icon: BookOpen },
            { name: '申請の確認・承認', path: '/applications-review', icon: File, badge: pendingCount }, // 🌟 バッジ情報を追加
            { name: '教材・ルート表', path: '/materials', icon: Files },
            { name: 'バグ報告/要望', path: '/bug-report', icon: MessagesSquare },
            { name: '更新履歴', path: '/changelog', icon: ScrollText }
        );
    }

    // 🏢 テナント管理者 / 塾長 (admin)
    if (user?.role === 'admin') {
        navItems.push(
            { name: 'ダッシュボード', path: '/', icon: Home },
            { name: '過去問/模試/入試', path: '/past-exam', icon: BookOpen },
            { name: '申請の確認・承認', path: '/applications-review', icon: File, badge: pendingCount }, // 🌟 バッジ情報を追加
            { name: '教材・ルート表', path: '/materials', icon: Files },
            { name: '校舎管理者メニュー', path: '/admin', icon: Settings },
            { name: 'バグ報告/要望', path: '/bug-report', icon: MessagesSquare },
            { name: '更新履歴', path: '/changelog', icon: ScrollText }
        );
    }

    // 💻 開発者 (developer)
    if (user?.role === 'developer') {
        navItems.push(
            { name: 'ダッシュボード', path: '/', icon: Home },
            { name: '過去問/模試/入試', path: '/past-exam', icon: BookOpen },
            { name: '申請の確認・承認', path: '/applications-review', icon: File, badge: pendingCount }, // 🌟 バッジ情報を追加
            { name: '教材・ルート表', path: '/materials', icon: Files },
            { name: '校舎管理者メニュー', path: '/admin', icon: Settings },
            { name: 'テナント管理者メニュー', path: '/developer', icon: Wrench },
            { name: 'バグ報告/要望', path: '/bug-report', icon: MessagesSquare },
            { name: '更新履歴', path: '/changelog', icon: ScrollText }
        );
    }

    // 👑 システム管理者 (super_admin)
    if (user?.role === 'super_admin') {
        navItems.push(
            { name: 'テナント管理', path: '/system_admin', icon: ShieldAlert },
            { name: 'DB直接ビューア', path: '/system_admin/db', icon: Database },
            { name: '管理者権限の管理', path: '/system_admin/admins', icon: Key },
            { name: '運営/保守マニュアル', path: '/system_admin/manual', icon: BookOpen },
            { name: '更新履歴', path: '/changelog', icon: ScrollText }
        );
    }

    // 📱 スマホ用ボトムナビゲーションの最適化
    const mobileBottomItems = [];
    if (user?.role === 'student') {
        mobileBottomItems.push(
            { name: 'ホーム', path: '/', icon: Home },
            { name: '成績入力', path: '/student/submit-results', icon: ScrollText },
            { name: '振替申請', path: '/student/transfer-request', icon: Calendar },
            { name: '欠席報告', path: '/student/absence-report', icon: Calendar },
            { name: '過去問', path: '/past-exam', icon: BookOpen }
        );
    } else if (user?.role === 'user' || user?.role === 'admin') {
        mobileBottomItems.push(
            { name: 'ホーム', path: '/', icon: Home },
            { name: '申請確認', path: '/applications-review', icon: File, badge: pendingCount }, // 🌟 バッジ情報を追加
            { name: '教材管理', path: '/materials', icon: Files },
            { name: 'その他', path: '#more', icon: Menu, isTrigger: true }
        );
    } else {
        mobileBottomItems.push(
            { name: 'メニュー', path: '#more', icon: Menu, isTrigger: true }
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">

            {/* 📱 スマホ用：トップヘッダー（PCでは非表示） */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
                <h1 className="text-lg font-bold text-gray-800 tracking-tight">Learning DB</h1>

                <div className="flex items-center gap-4">
                    {/* 🌟 追加: スマホヘッダーの通知ベルアイコン */}
                    {!isStudent && (
                        <button
                            onClick={() => navigate('/applications-review')}
                            className="relative p-1 text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {pendingCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    )}

                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {user?.username}
                    </span>
                    {/* 生徒の場合はメニューボタン */}
                    {isStudent && (
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* サイドバー */}
            <aside
                className={cn(
                    "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50",
                    "fixed inset-y-0 left-0 transform",
                    isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
                    "md:relative md:translate-x-0 md:shadow-none",
                    isCollapsed ? "md:w-20" : "w-64"
                )}
            >
                <button
                    className="md:hidden absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <X className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:block absolute -right-3 top-7 bg-white border border-gray-200 shadow-sm rounded-full p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-50 z-30 transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className={cn("p-6 flex flex-col mt-4 md:mt-0", isCollapsed ? "md:items-center px-2" : "items-start")}>
                    <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap hidden md:block">
                        {isCollapsed ? "DB" : "Learning DB"}
                    </h1>
                    {!isCollapsed && (
                        <p className="text-sm text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full hidden md:block">
                            {user?.role === 'student' ? `ようこそ、${StudentPlofile?.name} さん` : `ようこそ、${user?.username} 先生`}
                        </p>
                    )}
                    <h2 className="text-lg font-bold text-gray-800 md:hidden mb-2">メニュー一覧</h2>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden py-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center py-3 md:py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors",
                                isCollapsed ? "md:justify-center px-0" : "px-4",
                                location.pathname === item.path && "bg-gray-100 font-medium text-primary"
                            )}
                        >
                            {/* 🌟 追加: アイコンにバッジを重ねる（折りたたみ時用） */}
                            <div className="relative">
                                <item.icon className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "md:mr-3 mr-3")} />
                                {(item as any).badge > 0 && isCollapsed && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white" />
                                )}
                            </div>

                            <span className={cn("whitespace-nowrap flex-1", isCollapsed && "md:hidden")}>{item.name}</span>

                            {/* 🌟 追加: 開いている時の右端バッジ表示 */}
                            {(item as any).badge > 0 && !isCollapsed && (
                                <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">
                                    {(item as any).badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 space-y-2 pb-8 md:pb-4">
                    <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className={cn("w-full text-gray-700 hover:bg-gray-100", isCollapsed ? "md:justify-center px-0" : "justify-start px-4")}>
                                <Key className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "md:mr-3 mr-3")} />
                                <span className={cn("whitespace-nowrap", isCollapsed && "md:hidden")}>パスワード変更</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[92vw] max-w-[425px] rounded-xl">
                            <DialogHeader>
                                <DialogTitle>パスワードの変更</DialogTitle>
                            </DialogHeader>
                            <ChangePasswordForm onSuccess={() => setIsPasswordOpen(false)} />
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" className={cn("w-full text-red-500 hover:text-red-700 hover:bg-red-50", isCollapsed ? "md:justify-center px-0" : "justify-start px-4")} onClick={logout}>
                        <LogOut className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "md:mr-3 mr-3")} />
                        <span className={cn("whitespace-nowrap", isCollapsed && "md:hidden")}>ログアウト</span>
                    </Button>
                </div>
            </aside>

            {/* 📱 スマホ用：画面最下部のボトムナビゲーションバー */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-40 flex justify-around items-center px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
                {mobileBottomItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;

                    if (item.isTrigger) {
                        return (
                            <button
                                key={idx}
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 active:text-gray-900 gap-0.5"
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={idx}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                                isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                            )}
                        >
                            {/* 🌟 追加: スマホ下部のバッジ表示 */}
                            <div className="relative">
                                <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
                                {(item as any).badge > 0 && (
                                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white">
                                        {(item as any).badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] tracking-tighter">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto transition-all duration-300">
                <div className="pt-20 md:pt-8 px-4 md:px-8 pb-24 md:pb-8">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}