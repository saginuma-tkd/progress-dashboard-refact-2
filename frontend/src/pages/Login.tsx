import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
// 🚨 追加: ログインUXをリッチにするアイコンたち
import { Loader2, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    // 🚨 追加: UX向上のためのState群
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isShake, setIsShake] = useState(false);
    
    const { login } = useAuth();

    // エラー時にカードを「ブルッ」と震わせる関数
    const triggerShake = () => {
        setIsShake(true);
        setTimeout(() => setIsShake(false), 400); // 0.4秒後に元に戻す
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 入力チェック（空のまま押されたらエラーにして震わせる）
        if (!username || !password) {
            setError('ユーザー名とパスワードを入力してください。');
            triggerShake();
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            login(response.data.access_token);
            toast.success('ログインに成功しました！', { icon: '👋' });
        } catch (err: any) {
            console.error(err);
            setError('ログインに失敗しました。入力内容をご確認ください。');
            toast.error('ログインエラー');
            triggerShake(); // 失敗したらブルッと震わせる
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
            {/* 🚨 追加: Shakeアニメーション用のカスタムCSS */}
            <style>
                {`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-6px); }
                        40%, 80% { transform: translateX(6px); }
                    }
                    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                `}
            </style>

            <Card className={`w-[350px] shadow-lg transition-colors duration-300 ${isShake ? 'animate-shake border-red-500 shadow-red-100' : 'border-gray-200'}`}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-center text-gray-800">
                        LearningDB
                        ログイン
                    </CardTitle>
                </CardHeader>
                
                {/* 🚨 修正: <form> タグで CardContent と CardFooter を丸ごと囲む！ 
                          これで「Enterキー」で送信できるようになります */}
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="username">ユーザー名</Label>
                            <Input 
                                id="username" 
                                placeholder="ユーザー名を入力" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                className={error ? "border-red-300 focus-visible:ring-red-500" : ""}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password">パスワード</Label>
                            {/* 🚨 追加: パスワード表示/非表示の切り替えUI */}
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="パスワードを入力" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className={`pr-10 ${error ? "border-red-300 focus-visible:ring-red-500" : ""}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    disabled={isLoading}
                                    tabIndex={-1} // Tabキーでの移動から除外
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* エラーメッセージを少しリッチに */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2.5 rounded-md border border-red-100">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="pt-2 pb-6">
                        {/* 🚨 修正: type="submit" を明示し、ローディング状態を反映 */}
                        <Button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all h-10"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ログイン中...
                                </>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    ログイン
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}