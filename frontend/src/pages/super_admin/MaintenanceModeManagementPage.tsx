import React from 'react';
import SystemSettingManagement from '../../components/developer/SystemSettingsManagement';
import { Code, Construction } from 'lucide-react';

const SystemSettingManagementPage: React.FC = () => {
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
            <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                <Construction className="w-6 h-6 hidden md:block text-indigo-600" />
                メンテナンスモード管理
            </h2>
            <div className="h-full w-full p-2 md:p-6 pt-3">
                <SystemSettingManagement />
            </div>
        </div>
    );
};

export default SystemSettingManagementPage;