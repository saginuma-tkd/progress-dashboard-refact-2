import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../lib/api'; // ※APIクライアントのパスに合わせてください

interface Message {
    role: 'ai' | 'user';
    text: string;
}

export default function SupportChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'こんにちは！システムの使い方はお困りですか？何でも質問してください。\n※本システムはβ版なので対応に不具合があることをご了承ください' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 新しいメッセージが来たら一番下までスクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userText = input;
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInput('');
        setIsLoading(true);

        try {
            // ステップ2で作ったバックエンドのAPIを叩く
            const res = await api.post('/chat/support', { message: userText }); // ※パスはご自身の環境に合わせてください
            setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'エラーが発生しました。時間を置いて再度お試しください。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* チャットウィンドウ */}
            {isOpen && (
                <Card className="w-80 sm:w-96 h-[500px] shadow-2xl flex flex-col mb-4 border-blue-100">
                    <CardHeader className="bg-blue-600 text-white rounded-t-xl py-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            AIサポートアシスタント(β版)
                        </CardTitle>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
                            <X className="w-5 h-5" />
                        </button>
                    </CardHeader>
                    
                    <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none shadow-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border text-gray-500 rounded-lg rounded-tl-none p-3 text-sm flex gap-1 items-center shadow-sm">
                                    <Bot className="w-4 h-4 animate-bounce" /> 考えています...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </CardContent>

                    <CardFooter className="p-3 bg-white border-t">
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
                            className="flex w-full gap-2"
                        >
                            <Input 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="質問を入力..." 
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {/* 右下の丸いフローティングボタン */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center"
                >
                    <MessageCircle className="w-7 h-7" />
                </button>
            )}
        </div>
    );
}