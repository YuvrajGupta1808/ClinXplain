import { ArrowLeft, ArrowRight, Bot, Mic, Sparkles, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { patientsAPI } from '../services/api';
import { Patient } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PatientChatProps {
  patient: Patient;
  onBack: () => void;
}

const PatientChat: React.FC<PatientChatProps> = ({ patient, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial message
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your AI Research Assistant for **${patient.name}**. How can I help you analyze this patient's history or prepare for their next visit?`,
        timestamp: new Date()
      }
    ]);
  }, [patient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history
      const history: { query: string; response: string }[] = [];
      let lastUserContent: string | null = null;
      
      messages.forEach(msg => {
        if (msg.role === 'user') {
          lastUserContent = msg.content;
        } else if (msg.role === 'assistant' && lastUserContent) {
          history.push({ query: lastUserContent, response: msg.content });
          lastUserContent = null;
        }
      });

      const response = await patientsAPI.chat({
        message: userMsg.content,
        patient_id: patient.id,
        conversation_history: history
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response, // API returns { response: "string", ... }
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      // Optional: Add error message to chat
      const errorMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: 'Sorry, I encountered an error connecting to the AI service. Please try again.',
         timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
              {patient.avatarInitials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">{patient.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">AI Agent Consultation Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs uppercase tracking-widest border border-blue-100">
          <Sparkles size={14} className="animate-pulse" />
          Clinical Intelligence
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 scroll-smooth"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === 'assistant' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
            </div>
            
            <div className={`max-w-[70%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'assistant' 
                  ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none' 
                  : 'bg-blue-600 text-white rounded-tr-none font-medium'
              }`}>
                {msg.role === 'assistant' ? (
                  msg.content.includes('**Response:**') ? (
                    // Parse the structured AI response
                    <div>
                      {/* Main Response */}
                      <p className="mb-4 text-base">
                        {msg.content.split('**Response:**')[1]?.split('---')[0]?.trim().split('**').map((part, i) => i % 2 === 1 ? <b key={i}>{part}</b> : part)}
                      </p>
                      
                      {/* Metadata / Stats (Collapsible or Small) */}
                      {msg.content.includes('Evolution Statistics:') && (
                         <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                           <p className="font-bold mb-1 uppercase tracking-wider">Evolution Stats</p>
                           {msg.content.split('**Evolution Statistics:**')[1]?.trim().split('\n').map((line, i) => (
                             <div key={i}>{line.replace(/- /g, '').trim()}</div>
                           ))}
                         </div>
                      )}
                    </div>
                  ) : (
                    // Fallback for simple markdown
                    msg.content.split('**').map((part, i) => i % 2 === 1 ? <b key={i}>{part}</b> : part)
                  )
                ) : (
                  msg.content
                )}
              </div>
              <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-400 flex items-center justify-center shrink-0">
              <Bot size={20} />
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-none shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-8 bg-white border-t border-slate-100 shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask about ${patient.name}...`}
            className="w-full pl-6 pr-32 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all font-medium text-slate-700"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
               <Mic size={20} />
            </button>
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`p-2.5 rounded-xl transition-all shadow-lg ${
                input.trim() && !isTyping 
                ? 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95' 
                : 'bg-slate-100 text-slate-300 shadow-none'
              }`}
            >
               <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.2em] mt-4">
          ClinXplain AI can hallucinate. Verify clinical details for medical safety.
        </p>
      </div>
    </div>
  );
};

export default PatientChat;
