// frontend/src/DashboardLayout.tsx

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import {
    LogOut, Home, BookOpen, Settings, ScrollText, MessagesSquare,
    Key, Wrench, Files, ChevronLeft, ChevronRight, File,
    Calendar, ShieldAlert, Menu, X, Database
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

    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            { name: '申請の確認・承認', path: '/applications-review', icon: File },
            { name: '教材・ルート表', path: '/materials', icon: Files },
            { name: 'バグ報告/要望', path: '/bug-report', icon: MessagesSquare }
        );
    }

    // 🏢 テナント管理者 / 塾長 (admin)
    if (user?.role === 'admin') {
        navItems.push(
            { name: 'ダッシュボード', path: '/', icon: Home },
            { name: '過去問/模試/入試', path: '/past-exam', icon: BookOpen },
            { name: '申請の確認・承認', path: '/applications-review', icon: File },
            { name: '教材・ルート表', path: '/materials', icon: Files },
            { name: '管理者メニュー', path: '/admin', icon: Settings },
            { name: 'バグ報告/要望', path: '/bug-report', icon: MessagesSquare },
            { name: '更新履歴', path: '/changelog', icon: ScrollText }
        );
    }

    // 💻 開発者 (developer)
    if (user?.role === 'developer') {
        navItems.push(
            { name: '開発ダッシュボード', path: '/developer', icon: Wrench },
            { name: 'ダッシュボード', path: '/', icon: Home },
            { name: '過去問/模試/入試', path: '/past-exam', icon: BookOpen },
            { name: '申請の確認・承認', path: '/applications-review', icon: File },
            { name: '教材・ルート表', path: '/materials', icon: Files },
            { name: '管理者メニュー', path: '/admin', icon: Settings },
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
            { name: '運営/保守マニュアル', path: '/system_admin/manual', icon: BookOpen }
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
            { name: '申請確認', path: '/applications-review', icon: File },
            { name: '教材管理', path: '/materials', icon: Files },
            { name: 'その他', path: '#more', icon: Menu, isTrigger: true }
        );
    } else {
        // developer と super_admin はスマホで下部ナビを使わず、ドロワーのみとする
        mobileBottomItems.push(
            { name: 'メニュー', path: '#more', icon: Menu, isTrigger: true }
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">

            {/* 📱 スマホ用：トップヘッダー（PCでは非表示） */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
                <h1 className="text-lg font-bold text-gray-800 tracking-tight">Learning DB</h1>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {user?.username}
                    </span>
                    {/* 生徒の場合は、右上ボタンからログアウトやパスワード変更のメニュー（ドロワー）を開く */}
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

            {/* 📱 スマホ用：メニューが開いているときの背景マスク */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* サイドバー（PCでは常時表示、スマホでは「その他」を押した時だけスライド出現） */}
            <aside
                className={cn(
                    "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50",
                    "fixed inset-y-0 left-0 transform",
                    isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
                    "md:relative md:translate-x-0 md:shadow-none",
                    isCollapsed ? "md:w-20" : "w-64"
                )}
            >
                {/* スマホ用：ドロワーを閉じるXボタン */}
                <button
                    className="md:hidden absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* PC用：サイドバー折りたたみボタン */}
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
                            ようこそ、{user?.username}先生
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
                            <item.icon className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "md:mr-3 mr-3")} />
                            <span className={cn("whitespace-nowrap", isCollapsed && "md:hidden")}>{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 space-y-2 pb-8 md:pb-4">
                    <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full text-gray-700 hover:bg-gray-100",
                                    isCollapsed ? "md:justify-center px-0" : "justify-start px-4"
                                )}
                            >
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

                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full text-red-500 hover:text-red-700 hover:bg-red-50",
                            isCollapsed ? "md:justify-center px-0" : "justify-start px-4"
                        )}
                        onClick={logout}
                    >
                        <LogOut className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "md:mr-3 mr-3")} />
                        <span className={cn("whitespace-nowrap", isCollapsed && "md:hidden")}>ログアウト</span>
                    </Button>
                </div>
            </aside>

            {/* 📱 スマホ用：画面最下部のボトムナビゲーションバー（PCでは非表示） */}
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
                            <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
                            <span className="text-[10px] tracking-tighter">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto transition-all duration-300">
                {/* 🌟 修正: 確実に存在する pt-20 と pb-24 を使って、上下の隠れを完全に防止！ */}
                <div className="pt-20 md:pt-8 px-4 md:px-8 pb-24 md:pb-8">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}