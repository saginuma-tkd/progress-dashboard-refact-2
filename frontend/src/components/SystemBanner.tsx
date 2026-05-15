import React, { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useSystem } from '../contexts/SystemContext';

const SystemBanner: React.FC = () => {
  const { settings, loading } = useSystem();
  const [isVisible, setIsVisible] = useState(true);

  // 🚨 即時性のカギ: 管理者がメッセージや設定を更新したら、閉じたバナーを再度開く！
  useEffect(() => {
    if (settings?.announcement_enabled) {
      setIsVisible(true);
    }
  }, [settings?.announcement_message, settings?.announcement_enabled]);

  if (loading || !settings) {
    return null; 
  }

  // 🚨 アニメーションのカギ: return null で突然消すのではなく、CSSで高さを0にして滑らかに隠す
  const showBanner = settings.announcement_enabled && isVisible;

  return (
    <div 
      className={`overflow-hidden transition-all duration-500 ease-in-out w-full z-50
        ${showBanner ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-md relative w-full">
        {/* アイコンに animate-pulse をつけて少しだけ目立たせる（アニメーション効果） */}
        <Megaphone className="w-5 h-5 shrink-0 animate-pulse" />
        
        <p className="text-sm font-medium whitespace-pre-wrap text-center pr-8">
          {settings.announcement_message}
        </p>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-black/20 rounded-full transition-colors"
          aria-label="バナーを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SystemBanner;