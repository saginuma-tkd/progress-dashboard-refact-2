import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Database, Terminal, Shield, Wrench, Code, Folder, Plug, PlusCircle, Rocket, Braces, Layers } from 'lucide-react';
import { ScrollArea } from '../../components/ui/scroll-area';

import overviewMd from '../../docs/01_overview.md?raw';
import architectureMd from '../../docs/02_architecture.md?raw';
import directoryMd from '../../docs/03_directory.md?raw';
import setupMd from '../../docs/04_setup.md?raw';
import apiMd from '../../docs/05_api.md?raw';
import databaseMd from '../../docs/06_database.md?raw';
import roleMd from '../../docs/07_role.md?raw';
import addFeaturesMd from '../../docs/08_add-new-features.md?raw';
import codingRuleMd from '../../docs/09_coding-rule.md?raw';
import deployMd from '../../docs/10_deploy.md?raw';
import variableMd from '../../docs/11_variable.md?raw';

const manualData = [
    {
        id: '01_overview',
        icon: <BookOpen className="w-4 h-4" />,
        title: 'システム概要',
        content: overviewMd
    },
    {
        id: '02_architecture',
        icon: <Layers className="w-4 h-4" />,
        title: 'アーキテクチャと設計思想',
        content: architectureMd
    },
    {
        id: '03_directory',
        icon: <Folder className="w-4 h-4" />,
        title: 'ディレクトリ構成',
        content: directoryMd
    },
    {
        id: '04_setup',
        icon: <Terminal className="w-4 h-4" />,
        title: 'ローカル開発環境のセットアップ',
        content: setupMd
    },
    {
        id: '05_api',
        icon: <Plug className="w-4 h-4" />,
        title: 'APIエンドポイント一覧',
        content: apiMd
    },
    {
        id: '06_database',
        icon: <Database className="w-4 h-4" />,
        title: 'データベース設計',
        content: databaseMd
    },
    {
        id: '07_role',
        icon: <Shield className="w-4 h-4" />,
        title: '権限システム',
        content: roleMd
    },
    {
        id: '08_addFeatures',
        icon: <PlusCircle className="w-4 h-4" />,
        title: '新機能追加の手順',
        content: addFeaturesMd
    },
    {
        id: '09_codingRule',
        icon: <Code className="w-4 h-4" />,
        title: 'コーディングガイドライン',
        content: codingRuleMd
    },
    {
        id: '10_deploy',
        icon: <Rocket className="w-4 h-4" />,
        title: '本番環境デプロイ手順',
        content: deployMd
    },
    {
        id: '11_variable',
        icon: <Braces className="w-4 h-4" />,
        title: '変数一覧',
        content: variableMd
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