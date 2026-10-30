import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Trash2, MessageSquare, ShieldAlert } from 'lucide-react';
import { apiClient, extractApiError } from '../services/api';
import { AssistantConversation } from '../types';
import {
  ChatInput,
  ChatWindow,
  DEFAULT_SUGGESTED_QUESTIONS,
  SuggestedQuestions,
} from '../components/assistant/AssistantComponents';
import { useToast } from '../context/ToastContext';

export const AssistantPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        'Hello! I am the PrivacyGuard AI Assistant. Ask me anything about protecting Aadhaar or PAN cards, redacting bank statements, securing API keys, or identifying phishing attempts.',
    },
  ]);
  const [input, setInput] = useState('');
  const [suggested, setSuggested] = useState<string[]>(DEFAULT_SUGGESTED_QUESTIONS);
  const [isSending, setIsSending] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: ['assistant-conversations'],
    queryFn: async () => {
      const res = await apiClient.get('/assistant/conversations');
      return res.data.data.conversations as AssistantConversation[];
    },
  });

  const handleLoadConversation = async (convId: string) => {
    try {
      const res = await apiClient.get(`/assistant/conversations/${convId}`);
      const loadedMessages = res.data.data.messages as Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
      setActiveConversationId(convId);
      setMessages(loadedMessages);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Unable to load conversation',
        message: extractApiError(err),
      });
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([
      {
        role: 'assistant',
        content:
          'Started a fresh consultation. How can I help you protect your personal or organizational data today?',
      },
    ]);
    setSuggested(DEFAULT_SUGGESTED_QUESTIONS);
  };

  const sendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setIsSending(true);

    try {
      const res = await apiClient.post('/assistant/chat', {
        message: trimmed,
        conversationId: activeConversationId,
        saveHistory: true,
      });

      const { conversationId, reply, suggestedFollowUps } = res.data.data;
      if (conversationId) {
        setActiveConversationId(conversationId);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (Array.isArray(suggestedFollowUps) && suggestedFollowUps.length > 0) {
        setSuggested(suggestedFollowUps);
      }
      await queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Assistant Error',
        message: extractApiError(err),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await apiClient.delete(`/assistant/conversations/${convId}`);
      if (activeConversationId === convId) {
        handleNewChat();
      }
      await queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: extractApiError(err),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-cyan-400" />
            <span>Privacy & Digital Security AI Assistant</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Educational guidance on personal data protection, safe document sharing, credential
            hygiene, and phishing defense.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          New Consultation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conversation History Sidebar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3 h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Saved Consultations
          </h2>
          {!conversationsQuery.data || conversationsQuery.data.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 px-1">
              Your privacy questions will appear here.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {conversationsQuery.data.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleLoadConversation(conv.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteConversation(conv.id)}
                    className="text-slate-500 hover:text-red-400 cursor-pointer"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Chat Interface */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <ChatWindow messages={messages} isLoading={isSending} />

          <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/40">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Suggested Privacy Questions:
            </p>
            <SuggestedQuestions
              questions={suggested}
              onSelect={(q) => sendMessage(q)}
              disabled={isSending}
            />
          </div>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => sendMessage(input)}
            disabled={isSending}
          />
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 flex items-center gap-2.5 text-xs text-amber-200/90">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Privacy Disclaimer:</strong> Never paste live passwords, OTPs, or unmasked card
          numbers into chat. The assistant provides educational security guidance, not legal
          compliance certification.
        </span>
      </div>
    </div>
  );
};

