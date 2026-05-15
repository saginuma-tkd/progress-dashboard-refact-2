import React, { useState, useEffect } from 'react';
import { Megaphone, Save, ShieldAlert, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

interface SystemSettings {
  maintenance_mode: boolean;
  announcement_enabled: boolean;
  announcement_message: string;
}

const SystemSettingsManagement = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    announcement_enabled: false,
    announcement_message: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 開発者向け設定取得APIを呼び出す
    api.get('/developer/settings')
      .then(res => {
        setSettings(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/developer/settings', settings);
      alert('システム設定を保存しました。');
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span>設定を読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
        <p className="text-sm text-blue-700">
          全ユーザーの画面上部に表示する「お知らせバナー」の設定や、システムを「メンテナンスモード（ログイン制限）」に切り替える機能です。
        </p>
      </div>

      <div className="space-y-4">
        {/* お知らせバナー設定 */}
        <div className="border border-gray-200 p-4 rounded-lg space-y-4 shadow-sm bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-gray-800">お知らせバナー表示</h3>
            </div>
            {/* トグルスイッチ */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.announcement_enabled}
                onChange={e => setSettings({...settings, announcement_enabled: e.target.checked})}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">表示メッセージ</label>
            <textarea 
              className="w-full min-h-[100px] p-3 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              value={settings.announcement_message}
              onChange={e => setSettings({...settings, announcement_message: e.target.value})}
              placeholder="例：【重要】〇月〇日 2:00〜 メンテナンスを実施します。この期間はシステムをご利用いただけません。"
              disabled={!settings.announcement_enabled}
            />
          </div>
          
          {settings.announcement_enabled && settings.announcement_message && (
             <div className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 p-4 rounded border border-amber-200 mt-2 animate-in fade-in slide-in-from-top-1">
               <Megaphone className="w-5 h-5 shrink-0 mt-0.5" />
               <p className="whitespace-pre-wrap leading-relaxed font-medium">{settings.announcement_message}</p>
             </div>
          )}
        </div>

        {/* メンテナンスモード設定 */}
        <div className="border border-red-100 p-4 rounded-lg bg-red-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-base">メンテナンスモード</h3>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  一般ユーザー（User）および管理者（Admin）のアクセスを遮断し、メンテナンス画面を表示します。
                  <br /><span className="font-bold underline">※Developer権限のアカウントは引き続きログイン・操作が可能です。</span>
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.maintenance_mode}
                onChange={e => setSettings({...settings, maintenance_mode: e.target.checked})}
              />
              {/* left._[2px] のタイポを修正 */}
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md text-sm font-bold px-8 py-2.5 bg-slate-900 text-white hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-sm"
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 保存中...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> 設定を保存</>
          )}
        </button>
      </div>
    </div>
  );
};

export default SystemSettingsManagement;