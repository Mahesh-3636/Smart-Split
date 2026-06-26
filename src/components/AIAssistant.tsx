/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, Sparkles, SendToBack, ArrowRight, CornerDownLeft } from 'lucide-react';
import { User, ChatMessage } from '../types';

interface AIAssistantProps {
  currentUser: User;
  activeGroupId?: string;
}

export default function AIAssistant({ currentUser, activeGroupId }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'model',
      text: `👋 Hi ${currentUser.name}! I am your **SplitSmart AI** budget assistant.\n\nAsk me anything! Like:\n- **"Who owes me the most money?"**\n- **"Which categories am I spending too much on?"**\n- **"Give me custom user budgeting tips!"**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestionPrompts = [
    { label: "Who owes me?", text: "Based on active groups, who owes me the most?" },
    { label: "Owe summary", text: "Summarize what I currently owe and who owes me." },
    { label: "Budget tips", text: "Give me 3 concrete tips to manage bill shares better." }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    if (!rawText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      role: 'user',
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: rawText,
          currentUserId: currentUser.id,
          groupId: activeGroupId
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: "msg_model_" + Date.now(),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: "msg_error_" + Date.now(),
        role: 'model',
        text: "⚠️ I had a tiny glitch syncing with the ledger database. Please try again! In the meantime, you can review your active groups in the main dashboard.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format Markdown safely inside our app
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      // Bold rendering
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet items
      if (line.trim().startsWith('- ')) {
        const content = formatted.replace(/^\s*-\s+/, '');
        return (
          <li key={idx} className="list-disc ml-4 text-xs font-bold text-slate-800 mt-1" dangerouslySetInnerHTML={{ __html: content }} />
        );
      }
      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-800 mt-1 font-bold" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen ? (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="w-96 max-w-[calc(100vw-2rem)] h-[500px] rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-neon-purple to-neon-pink p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center animate-pulse">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1">
                    SplitSmart AI <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
                  </h3>
                  <span className="text-[10px] text-orange-200 font-mono tracking-wider">BUDGET COMPANION</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 text-white/90 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.map((msg) => {
                const isModel = msg.role === 'model';
                return (
                  <div key={msg.id} className={`flex gap-2 w-full ${isModel ? 'justify-start' : 'justify-end'}`}>
                    {isModel && (
                      <div className="w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-xs flex items-center justify-center shrink-0 self-start mt-0.5">
                        🤖
                      </div>
                    )}
                    <div className="max-w-[75%] space-y-1">
                      <div className={`p-3 rounded-2xl ${
                        isModel 
                          ? 'bg-slate-100 border border-slate-200 rounded-tl-none' 
                          : 'bg-neon-purple/10 border border-neon-purple/20 rounded-tr-none text-slate-800 font-bold'
                      }`}>
                        {renderMessageText(msg.text)}
                      </div>
                      <div className={`text-[10px] text-slate-500 font-mono ${!isModel ? 'text-right' : ''}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-xs flex items-center justify-center">
                    🤖
                  </div>
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-none max-w-[75%] flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-black font-mono">Solving balance matrix</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-teal animate-bounce delay-0" />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-bounce delay-300" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestion Prompts */}
            {messages.length === 1 && (
              <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50">
                {suggestionPrompts.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.text)}
                    className="text-[10px] font-black px-2.5 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-neon-purple transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>{s.label}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask SplitSmart AI..."
                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-neon-purple rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-none transition-all placeholder:text-slate-400"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSendMessage()}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-neon-purple to-neon-pink flex items-center justify-center text-white cursor-pointer shrink-0 shadow-md"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            id="ai-chatbot-toggle"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-neon-purple via-neon-pink to-neon-purple flex items-center justify-center text-white shadow-xl cursor-pointer hover:opacity-95 transition-all text-center relative border border-slate-200"
          >
            <Bot className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-teal rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-teal rounded-full flex items-center justify-center text-[8px] text-white font-extrabold font-mono">AI</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
