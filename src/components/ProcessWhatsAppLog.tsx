import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WhatsAppLog } from '../services/whatsappService';
import { MessageSquare, Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProcessWhatsAppLogProps {
  processoId: string;
}

export const ProcessWhatsAppLog: React.FC<ProcessWhatsAppLogProps> = ({ processoId }) => {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!processoId) return;

    const q = query(
      collection(db, 'processos', processoId, 'whatsapp_logs'),
      orderBy('data_envio', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppLog));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.warn("WhatsApp - onSnapshot ignorado por rules:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [processoId]);

  const renderStatusIcon = (status: WhatsAppLog['status']) => {
    switch (status) {
      case 'ENVIADO': return <Check size={14} className="text-gray-400" />;
      case 'ENTREGUE': return <CheckCheck size={14} className="text-gray-400" />;
      case 'LIDO': return <CheckCheck size={14} className="text-blue-500" />;
      case 'ERRO': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-[#EFEAE2] rounded-3xl border border-gray-200">
        <span className="text-emerald-700 font-medium animate-pulse">Carregando histórico...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#EFEAE2] rounded-[2rem] border border-gray-200 shadow-inner overflow-hidden flex flex-col h-[600px] relative">
      {/* WhatsApp Chat Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/448/804/HD-wallpaper-whatsapp-background-theme-pattern.jpg")', backgroundSize: 'cover' }}></div>
      
      <div className="bg-[#075E54] p-4 flex items-center gap-3 relative z-10 shadow-md">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <MessageSquare className="text-white" size={20} />
        </div>
        <div>
          <h3 className="text-white font-bold">Histórico WhatsApp</h3>
          <p className="text-white/70 text-xs font-medium">Comunicações Oficiais</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
        {logs.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center text-sm text-gray-500 shadow-sm mx-auto max-w-sm mt-8">
            Nenhuma mensagem registrada neste processo.
          </div>
        ) : (
          <AnimatePresence>
            {logs.map(log => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-sm p-4 max-w-[80%] shadow-sm relative">
                  <p className="text-xs text-emerald-800 font-bold mb-1 opacity-70 flex items-center gap-2">
                    Para: {log.telefone} {log.tipo === 'LINK' && <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Ação</span>}
                  </p>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                    {log.texto}
                  </p>
                  
                  {log.status === 'ERRO' && log.error && (
                    <div className="mt-2 bg-red-100 text-red-700 text-xs p-2 rounded-lg">
                      <AlertCircle size={12} className="inline mr-1" />
                      {log.error}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-2">
                    <span className="text-[10px] text-emerald-700/60 font-medium">
                      {log.data_envio?.toDate ? log.data_envio.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                    {renderStatusIcon(log.status)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
