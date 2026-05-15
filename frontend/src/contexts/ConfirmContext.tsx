// contexts/ConfirmContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

type ConfirmOptions = {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
};

// Promiseを返す関数として定義するのがミソ！
type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [resolver, setResolver] = useState<(value: boolean) => void>();

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
        // ダイアログが開いた時点でPromiseを返し、ユーザーがボタンを押すまで待機する
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        resolver?.(true); // Promiseをtrueで解決
        setIsOpen(false);
    };

    const handleCancel = () => {
        resolver?.(false); // Promiseをfalseで解決
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {/* アプリの最上位に1つだけダイアログを常駐させる */}
            {options && (
                <ConfirmDialog
                    isOpen={isOpen}
                    title={options.title}
                    message={options.message}
                    confirmText={options.confirmText}
                    cancelText={options.cancelText}
                    isDestructive={options.isDestructive ?? true}
                    onConfirm={handleConfirm}
                    onClose={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
}

// どこからでも呼び出せるカスタムフック
export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
    return context;
};