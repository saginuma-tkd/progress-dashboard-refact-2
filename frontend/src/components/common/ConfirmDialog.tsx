import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
// 🚨 追加: Shadcn UI の Dialog をインポート！
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "OK",
    cancelText = "キャンセル",
    isDestructive = true,
    onConfirm,
    onClose
}: ConfirmDialogProps) {
    
    // Shadcn UI がフォーカスやEscキーを全部自動でやってくれるので、
    // 自前で書いていた useEffect や Ref は不要になります！超スッキリ！

    return (
        // 🚨 自作の div ではなく、Shadcn の Dialog コンポーネントを使う
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            {/* z-[200] で Shadcn 同士の中でも一番上に来るように念押し */}
            <DialogContent className="z-[200] sm:max-w-md p-6">
                
                <DialogHeader className="flex flex-row items-start gap-4 space-y-0">
                    {/* アイコン */}
                    <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>

                    {/* テキストエリア */}
                    <div className="flex flex-col space-y-1.5 text-left">
                        <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
                        <div className="text-sm text-gray-500 whitespace-pre-wrap">{message}</div>
                    </div>
                </DialogHeader>

                {/* アクションボタン */}
                <DialogFooter className="flex justify-end gap-3 mt-4 sm:justify-end">
                    <Button 
                        variant="outline" 
                        onClick={onClose}
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                    >
                        {cancelText}
                    </Button>
                    <Button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`w-full sm:w-auto ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}