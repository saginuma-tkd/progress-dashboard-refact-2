import React from 'react';
import { Settings, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full space-y-6">
        <div className="inline-flex p-4 bg-amber-100 text-amber-600 rounded-full animate-pulse">
          <Settings size={48} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">只今メンテナンス中です</h1>
        <p className="text-gray-600 leading-relaxed">
          より良いサービス提供のため、現在システムメンテナンスを実施しております。
          終了まで今しばらくお待ちください。
        </p>
        <div className="pt-6 border-t border-gray-100">
          <Link to="/login" className="text-xs text-gray-400 hover:text-indigo-600 flex items-center justify-center gap-1">
            <LogIn size={14} /> スタッフ専用ログイン
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;