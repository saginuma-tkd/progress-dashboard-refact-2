import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, UserX } from 'lucide-react';
import api from '../../lib/api';

interface InactiveUser {
    user_id: number;
    name: string;
    last_update: string;
    days_inactive: number | string;
}

export default function InactiveUserPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);

    useEffect(() => {
        const checkInactiveUsers = async () => {
            try {
                // セッションストレージを使って「ログイン中1回しか出さない」ようにする工夫
                if (sessionStorage.getItem('inactivePopupShown')) return;

                const res = await api.get('/admin/inactive-users'); // ※パスはバックエンドに合わせてください
                
                if (res.data && res.data.length > 0) {
                    setInactiveUsers(res.data);
                    setIsOpen(true);
                    sessionStorage.setItem('inactivePopupShown', 'true'); // 見たことを記憶
                }
            } catch (error) {
                console.error("未更新ユーザーの取得に失敗しました", error);
            }
        };

        checkInactiveUsers();
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                        進捗未更新アラート
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-2">
                    <p className="text-sm text-gray-600 mb-4">
                        以下の講師は、過去30日間、生徒の進捗データを一度も更新していません。状況の確認を推奨します。
                    </p>
                    
                    <div className="max-h-[300px] overflow-y-auto space-y-2 border p-2 rounded-md bg-gray-50">
                        {inactiveUsers.map((user, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white rounded border-l-4 border-red-500 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <UserX className="w-4 h-4 text-gray-400" />
                                    <span className="font-bold text-sm text-gray-800">{user.name}</span>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="text-[10px] text-gray-500">最終更新: {user.last_update}</span>
                                    <span className="text-xs font-bold text-red-600">{user.days_inactive}日 放置</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>閉じる</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}