// frontend/src/components/PasswordResetForm.tsx

import React, { useState } from 'react';
import api from '../lib/api'
import { KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function PasswordResetForm() {
  const [targetUsername, setTargetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUsername || !newPassword) {
      setStatus('error');
      setMessage('ユーザー名と新しいパスワードを入力してください。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('確認用パスワードが一致しません。');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await api.post('/auth/admin/reset-password', {
        username: targetUsername,
        new_password: newPassword
    });

      setStatus('success');
      setMessage(response.data.message || 'パスワードを正常に更新しました。');
      setTargetUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setStatus('error');
      const errorMsg = error.response?.data?.detail || 'パスワードの更新に失敗しました。ユーザー名を確認してください。';
      setMessage(errorMsg);
    }
  };

  return (
    <div className="p-6 bg-white border rounded-xl shadow-sm max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-800">パスワード強制リセット</h2>
      </div>
      
      <p className="text-sm text-gray-500 mb-6">
        ログインできなくなったユーザーのパスワードを新しいものに上書き保存します。
      </p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">対象のユーザーID</label>
          <input
            type="text"
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            placeholder="例: saginuma_admin"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新しいパスワードを入力"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード (確認)</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="もう一度入力してください"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* メッセージ表示エリア */}
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 rounded-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              更新中...
            </>
          ) : (
            'パスワードを上書きする'
          )}
        </button>
      </form>
    </div>
  );
}