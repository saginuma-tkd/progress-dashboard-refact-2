import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Database, Terminal, Shield, Wrench, Code } from 'lucide-react';
import { ScrollArea } from '../../components/ui/scroll-area';

import overviewMd from '../../docs/overview.md?raw';
import databaseMd from '../../docs/database.md?raw';
import authMd from '../../docs/auth.md?raw';
import apiMd from '../../docs/api.md?raw';

const manualData = [
    {
        id: 'overview',
        icon: <BookOpen className="w-4 h-4" />,
        title: 'システム概要と技術スタック',
        content: overviewMd
    },
    {
        id: 'database',
        icon: <Database className="w-4 h-4" />,
        title: 'データベース構造',
        content: databaseMd
    },
    {
        id: 'auth',
        icon: <Shield className="w-4 h-4" />,
        title: '権限・セキュリティ管理',
        content: authMd
    },
    {
        id: 'api',
        icon: <Terminal className="w-4 h-4" />,
        title: 'API仕様とS3連携',
        content: apiMd
    }
];

export default function DeveloperManualPage() {
    const [activeTab, setActiveTab] = useState(manualData[0].id);
    const activeContent = manualData.find(m => m.id === activeTab)?.content || '';

    return (
        // 先ほど統一した「画面全体を使ってスクロールする」レイアウト
        <div className="h-full w-full flex flex-col p-2 md:p-8 pt-2 md:pt-6 gap-2 md:gap-4">

            {/* ヘッダーエリア */}
            <div className="flex-none flex items-center justify-between gap-4">
                <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Code className="w-6 h-6 hidden md:block text-indigo-600" />
                    開発者・管理者マニュアル
                </h2>
            </div>

            {/* メインエリア (2カラム構成) */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">

                {/* 左側：目次（サイドバー） */}
                <div className="w-full md:w-64 flex-none bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-700 flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> 目次
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {manualData.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${activeTab === item.id
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <span className={`${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        {item.icon}
                                    </span>
                                    {item.title}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* 右側：マニュアル本文（Markdown表示） */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-6 md:p-8">
                            {/* 🌟 prose クラスでMarkdownを超綺麗にレンダリング */}
                            <div className="prose prose-sm md:prose-base prose-indigo max-w-none text-gray-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {activeContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

            </div>
        </div>
    );
}