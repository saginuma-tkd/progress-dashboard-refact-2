// frontend/src/DashboardLayout.tsx

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
// ChevronLeft, ChevronRight を追加（折りたたみボタン用）
import { LogOut, Home, BookOpen, BarChart2, Settings, ScrollText, MessagesSquare, Key, Wrench, Files, ChevronLeft, ChevronRight, File, Calendar, ShieldAlert } from 'lucide-react';

// Dialog コンポーネントをインポート
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import ChangePasswordForm from './components/ChangePasswordForm';
import SupportChatbot from './components/SupportChatbot';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    
    // モーダルの開閉状態を管理
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    // サイドバーの折りたたみ状態を管理 ★追加
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isStudent = user?.role === 'student';

    const navItems = [
        { name: 'ダッシュボード', path: '/', icon: Home },
        { name: '過去問/模試/入試日程', path: '/past-exam', icon: BookOpen },
        // 非student向けメニュー
        ...(!isStudent ? [
            { name: '教材・ルート表管理', path: '/materials', icon: Files },
            { name: 'バグ報告/要望', path: '/bug-report', icon: MessagesSquare },
            { name: '更新履歴', path: '/changelog', icon: ScrollText },
        ] : []),
    ];

    if (user?.role === 'admin' || user?.role === 'developer' || user?.role === 'instructor') {
        navItems.push({ name: '申請の確認・承認', path: '/applications-review', icon: File });
    }

    if (isStudent) {
        navItems.push({ name: '成績・入試日程の入力', path: '/student/submit-results', icon: ScrollText });
        navItems.push({ name: '振替申請', path: '/student/transfer-request', icon: Calendar });
        navItems.push({ name: '欠席報告', path: '/student/absence-report', icon: MessagesSquare });
    }

    if (user?.role === 'admin' || user?.role === 'developer') {
        navItems.push({ name: '管理者ページ', path: '/admin', icon: Settings });
    }
    
    if (user?.role === 'developer') {
        navItems.push({ name: '開発者ページ', path: '/developer', icon: Wrench});
    }

    if (user?.role === 'super_admin') {
        navItems.push({ name: 'システム管理', path: '/system-admin', icon: ShieldAlert });
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <aside 
                className={cn(
                    "bg-white shadow-md flex flex-col relative transition-all duration-300 z-20",
                    isCollapsed ? "w-20" : "w-64" // ★幅を動的に変更
                )}
            >
                {/* 折りたたみトグルボタン ★追加 */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-7 bg-white border border-gray-200 shadow-sm rounded-full p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-50 z-30 transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className={cn("p-6 flex flex-col", isCollapsed ? "items-center px-2" : "items-start")}>
                    {isCollapsed ? (
                        <h1 className="text-xl font-bold text-gray-800">DB</h1>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Learning DB</h1>
                            <p className="text-sm text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full">ようこそ、{user?.username}</p>
                        </>
                    )}
                </div>

                <nav className="flex-1 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.name : undefined} // ★縮んでいる時はツールチップを表示
                            className={cn(
                                "flex items-center py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors",
                                isCollapsed ? "justify-center px-0" : "px-4", // 縮んでいる時は中央揃え
                                location.pathname === item.path && "bg-gray-100 font-medium text-primary"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t space-y-2">
                    {/* パスワード変更モーダル */}
                    <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                title={isCollapsed ? "パスワード変更" : undefined}
                                className={cn(
                                    "w-full text-gray-700 hover:bg-gray-100",
                                    isCollapsed ? "justify-center px-0" : "justify-start px-4"
                                )}
                            >
                                <Key className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                                {!isCollapsed && <span className="whitespace-nowrap">パスワード変更</span>}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>パスワードの変更</DialogTitle>
                            </DialogHeader>
                            <ChangePasswordForm onSuccess={() => setIsPasswordOpen(false)} />
                        </DialogContent>
                    </Dialog>

                    {/* ログアウトボタン */}
                    <Button 
                        variant="ghost" 
                        title={isCollapsed ? "ログアウト" : undefined}
                        className={cn(
                            "w-full text-red-500 hover:text-red-700 hover:bg-red-50",
                            isCollapsed ? "justify-center px-0" : "justify-start px-4"
                        )} 
                        onClick={logout}
                    >
                        <LogOut className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                        {!isCollapsed && <span className="whitespace-nowrap">ログアウト</span>}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto p-8 transition-all duration-300">
                <Outlet />
            </main>

            {/* <SupportChatbot/> */}
        </div>
    );
}