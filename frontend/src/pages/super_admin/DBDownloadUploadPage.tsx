import React from 'react';
import BackupManagement from '../../components/admin/BackupManagement';
import { Database, DatabaseBackup } from 'lucide-react';

const DBDownloadUploadPage: React.FC = () => {
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
            <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                <DatabaseBackup className="w-8 h-8 text-indigo-600" /> データベースのバックアップと復元
            </h2>

            <div className="h-full w-full p-2 md:p-6 pt-3">
                <BackupManagement />
            </div>
        </div>
    );
};

export default DBDownloadUploadPage;