import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { HelpCircle } from 'lucide-react';

interface InlineHelpProps {
    title: string;
    content: React.ReactNode;
}

export default function InlineHelp({ title, content }: InlineHelpProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center justify-center p-1 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all focus:outline-none"
                >
                    <HelpCircle className="w-4 h-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 text-xs leading-relaxed bg-white shadow-xl border rounded-lg z-50">
                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <span className="text-indigo-500">💡</span> {title}
                </h5>
                <div className="text-gray-600 space-y-2">
                    {content}
                </div>
            </PopoverContent>
        </Popover>
    );
}