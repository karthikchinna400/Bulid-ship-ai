import React from 'react';
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react';

export const DEFAULT_SUGGESTED_QUESTIONS = [
  'Is it safe to share my Aadhaar card?',
  'How can I protect my PAN details?',
  'What should I hide before uploading a bank statement?',
  'How can I identify a phishing attempt?',
  'What are API keys and how do I secure them?',
  'How do I secure my personal documents before sharing?',
];

export const SuggestedQuestions: React.FC<{
  questions?: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}> = ({ questions = DEFAULT_SUGGESTED_QUESTIONS, onSelect, disabled }) => (
  <div className="flex flex-wrap gap-2">
    {questions.map((q) => (
      <button
        key={q}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(q)}
        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-cyan-500/50 hover:text-cyan-300 text-xs text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
        <span>{q}</span>
      </button>
    ))}
  </div>
);

export const ChatMessage: React.FC<{
  role: 'user' | 'assistant';
  content: string;
}> = ({ role, content }) => {
  const isUser = role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          isUser
            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
            : 'bg-slate-800 border-slate-700 text-emerald-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? 'bg-cyan-500/15 border border-cyan-500/30 text-slate-100'
            : 'bg-slate-900/90 border border-slate-800 text-slate-200'
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export const ChatWindow: React.FC<{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isLoading: boolean;
}> = ({ messages, isLoading }) => (
  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px] max-h-[520px]">
    {messages.map((m, idx) => (
      <ChatMessage key={idx} role={m.role} content={m.content} />
    ))}
    {isLoading && (
      <div className="flex items-center gap-2.5 text-xs text-cyan-400 pl-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>PrivacyGuard AI Assistant is analyzing your question...</span>
      </div>
    )}
  </div>
);

export const ChatInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  disabled?: boolean;
}> = ({ value, onChange, onSend, disabled }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about Aadhaar/PAN safety, redacting bank statements, API keys, phishing..."
        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSend}
        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Send className="w-4 h-4" />
        <span>Ask</span>
      </button>
    </div>
  );
};

