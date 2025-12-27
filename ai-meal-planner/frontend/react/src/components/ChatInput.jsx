import { useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend, isLoading, placeholder }) {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSend(input.trim());
            setInput('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Send className="h-4 w-4" />
            </button>
        </form>
    );
}
