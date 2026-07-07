import React, { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2, 
  MessageSquare, 
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiResponse } from '../services/geminiService';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProcessSidebarAIProps {
  processData: any;
  isOpen: boolean;
  onClose: () => void;
}

export const ProcessSidebarAI: React.FC<ProcessSidebarAIProps> = ({ 
  processData, 
  isOpen, 
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting or summary
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Olá! Sou o assistente de IA da Câmara GSA. Já analisei os detalhes do processo **${processData?.numero_processo || 'em destaque'}**. Como posso ajudar você com este caso hoje?`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Construct context for Gemini
      const context = `
        VOCÊ É O ASSISTENTE JURÍDICO DA CÂMARA GSA.
        O CONTEXTO ABAIXO SÃO OS DADOS REAIS DO PROCESSO QUE ESTÁ SENDO VISUALIZADO:
        ${JSON.stringify(processData, null, 2)}

        DIRETRIZES:
        1. Responda de forma profissional e concisa.
        2. Baseie suas respostas estritamente nos dados do processo fornecidos acima.
        3. Se não encontrar uma informação, diga claramente.
        4. Você pode sugerir estratégias de acordo ou resumir fatos.
      `;

      const response = await getGeminiResponse(input, context);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro no Assistente IA:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Lamento, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for Mobile */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80] lg:hidden"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-0 top-0 h-full bg-white/90 backdrop-blur-3xl shadow-2xl z-[90] flex flex-col border-l border-white/20 transition-all duration-500",
              isExpanded ? "w-full lg:w-[600px]" : "w-full lg:w-[400px]"
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-black text-gray-900 tracking-tight">IA Copilot</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Contexto Ativo</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all hidden lg:block"
                >
                  {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button 
                  onClick={onClose}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-gray-100",
                    msg.role === 'assistant' ? "bg-indigo-50 text-indigo-600" : "bg-gray-900 text-white"
                  )}>
                    {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-[1.5rem] shadow-sm text-sm font-medium leading-relaxed",
                    msg.role === 'assistant' 
                      ? "bg-white border border-gray-100 text-gray-700 rounded-tl-none" 
                      : "bg-indigo-600 text-white rounded-tr-none"
                  )}>
                    {msg.content}
                    <div className={cn(
                      "text-[9px] mt-2 font-black uppercase tracking-widest opacity-50",
                      msg.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm px-6 py-4 rounded-[1.5rem] text-sm text-gray-400 italic font-medium animate-pulse border border-white">
                    Analisando processo e redigindo resposta...
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Questions */}
            {messages.length === 1 && !loading && (
              <div className="px-6 py-4 flex flex-wrap gap-2">
                {[
                  "Resuma os principais argumentos",
                  "Qual a chance de acordo?",
                  "Existe alguma divergência nos dados?",
                  "Próximos passos sugeridos"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100/50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 bg-white/50 border-t border-gray-100">
              <form 
                onSubmit={handleSendMessage}
                className="relative"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Faça uma pergunta sobre o processo..."
                  className="w-full pl-6 pr-14 py-4 bg-white border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all shadow-sm font-medium placeholder:text-gray-300"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50 disabled:hover:bg-indigo-600"
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                <Sparkles size={12} />
                Powered by Gemini 1.5 Pro & GSA Law Engine
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
