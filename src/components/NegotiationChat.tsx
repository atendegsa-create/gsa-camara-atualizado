import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Send, Bot, User, CheckCircle2, AlertTriangle, MessageCircle } from 'lucide-react';
import { apiUrl } from '../lib/apiClient';

interface NegotiationChatProps {
  processId: string;
  tenantBranding: {
    primaryColor: string;
    nome: string;
  };
  onStatusChange?: (newStatus: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp?: any;
}

export const NegotiationChat: React.FC<NegotiationChatProps> = ({ processId, tenantBranding, onStatusChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [negotiationStatus, setNegotiationStatus] = useState<string>('EM_ANDAMENTO');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Monitorar mensagens em tempo real via Firestore
  useEffect(() => {
    if (!processId) return;

    const chatRef = collection(db, 'processos', processId, 'negotiation_chats');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          role: data.role,
          text: data.text,
          timestamp: data.timestamp,
        });
      });
      setMessages(msgs);

      // Se não houver mensagens ainda, envia um olá simulado do devedor ou inicia conversa
      if (msgs.length === 0) {
        initiateBotConversation();
      }
    }, (error) => {
      console.error("Erro ao ler chat de negociação:", error);
    });

    return () => unsubscribe();
  }, [processId]);

  // Rolar até o fim ao receber nova mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const initiateBotConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/negotiation/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processId,
          message: 'Olá, gostaria de verificar as propostas de negociação para o meu caso.',
          sender: 'user'
        }),
      });

      const data = await response.json();
      if (data.status) {
        setNegotiationStatus(data.status);
        if (onStatusChange) onStatusChange(data.status);
      }
    } catch (err) {
      console.error("Falha ao iniciar conversa com o bot:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/negotiation/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processId,
          message: userText,
          sender: 'user'
        }),
      });

      const data = await response.json();
      if (data.status) {
        setNegotiationStatus(data.status);
        if (onStatusChange) onStatusChange(data.status);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg flex flex-col h-[500px]">
      {/* Header do Chat */}
      <div 
        className="p-4 text-white flex items-center justify-between shadow"
        style={{ backgroundColor: tenantBranding.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold border border-white/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Dr. GSA — Conciliador IA</h4>
            <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase animate-pulse">
              ● Online / Extrajudicial
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {negotiationStatus === 'ACORDO_FECHADO' && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase">
              <CheckCircle2 className="w-3 h-3" /> Acordo Fechado
            </span>
          )}
          {negotiationStatus === 'IMPASSE' && (
            <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase">
              <AlertTriangle className="w-3 h-3" /> Impasse
            </span>
          )}
          {negotiationStatus === 'EM_ANDAMENTO' && (
            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase animate-pulse">
              Em Andamento
            </span>
          )}
        </div>
      </div>

      {/* Corpo do Chat / Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          return (
            <div 
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isModel ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${isModel ? 'bg-slate-700' : 'bg-indigo-600'}`}>
                {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div 
                className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isModel 
                    ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none' 
                    : 'text-white rounded-tr-none'
                }`}
                style={!isModel ? { backgroundColor: tenantBranding.primaryColor } : {}}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white text-slate-800 border border-slate-200 p-4 rounded-2xl rounded-tl-none text-sm shadow-sm flex items-center gap-2">
              <span className="text-slate-400 italic">Dr. GSA está analisando os parâmetros...</span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></span>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></span>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-300"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input / Envio de Mensagem */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            negotiationStatus === 'ACORDO_FECHADO' 
              ? 'Acordo já concluído com sucesso!' 
              : negotiationStatus === 'IMPASSE' 
              ? 'Negociação encerrada com impasse.' 
              : 'Digite sua mensagem ou contraproposta...'
          }
          disabled={loading || negotiationStatus === 'ACORDO_FECHADO' || negotiationStatus === 'IMPASSE'}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim() || negotiationStatus === 'ACORDO_FECHADO' || negotiationStatus === 'IMPASSE'}
          className="text-white p-3.5 rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0"
          style={{ backgroundColor: tenantBranding.primaryColor }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
