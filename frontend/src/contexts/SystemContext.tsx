import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface SystemSettings {
  maintenance_mode: boolean;
  announcement_enabled: boolean;
  announcement_message: string;
}

interface SystemContextType {
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      // 誰でもアクセスできる公開APIエンドポイントから取得する想定
      const response = await api.get('/system_status/settings/public');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // 60秒（1分）ごとに短縮。これくらいならサーバーは余裕です！
    const interval = setInterval(fetchSettings, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SystemContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};