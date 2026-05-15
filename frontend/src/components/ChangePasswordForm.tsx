// frontend/src/components/ChangePasswordForm.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button'; // プロジェクトのUIコンポーネントを使用
import { Input } from './ui/input';   // プロジェクトのUIコンポーネントを使用
import { Label } from './ui/label';   // プロジェクトのUIコンポーネントを使用

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export default function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://progress-dashboard-backend.onrender.com';

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword) {
      setStatus('error');
      setMessage('すべての項目を入力してください。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('新しいパスワードと確認用パスワードが一致しません。');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/auth/change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStatus('success');
      setMessage(response.data.message || 'パスワードを更新しました。');
      
      // フォームをクリア
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 1.5秒後にモーダルを閉じるコールバックを実行
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      setStatus('error');
      const errorMsg = error.response?.data?.detail || 'パスワードの変更に失敗しました。現在のパスワードを確認してください。';
      setMessage(errorMsg);
    }
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center gap-2">
      </div>

      <form onSubmit={handleChange} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">現在のパスワード</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">新しいパスワード</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">新しいパスワード (確認)</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 rounded-lg animate-in fade-in duration-300">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg animate-in fade-in duration-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 更新中...</>
          ) : (
            '変更を保存する'
          )}
        </Button>
      </form>
    </div>
  );
}