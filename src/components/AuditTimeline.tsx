import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  FileUp, 
  RefreshCcw, 
  BrainCircuit, 
  Fingerprint, 
  MessageSquare, 
  Clock, 
  User as UserIcon,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AuditLog {
  id: string;
  type: 'UPLOAD' | 'STATUS_CHANGE' | 'AI_REPORTS' | 'SIGNATURE' | 'MESSAGE' | 'SYSTEM';
  action: string;
  details?: string;
  userId?: string;
  userName?: string;
  isAI?: boolean;
  timestamp: Timestamp;
}

interface AuditTimelineProps {
  processId: string;
}

const ACTION_CONFIG = {
  UPLOAD: { icon: FileUp, color: 'bg-blue-100 text-blue-600', label: 'Documento' },
  STATUS_CHANGE: { icon: RefreshCcw, color: 'bg-purple-100 text-purple-600', label: 'Status' },
  AI_REPORTS: { icon: BrainCircuit, color: 'bg-indigo-100 text-indigo-600', label: 'IA Parecer' },
  SIGNATURE: { icon: Fingerprint, color: 'bg-green-100 text-green-600', label: 'Assinatura' },
  MESSAGE: { icon: MessageSquare, color: 'bg-amber-100 text-amber-600', label: 'Comunicação' },
  SYSTEM: { icon: Bot, color: 'bg-gray-100 text-gray-600', label: 'Sistema' }
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ processId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!processId) return;

    const logsRef = collection(db, 'processos', processId, 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar logs de auditoria:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [processId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <RefreshCcw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Sincronizando Auditoria...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-20 px-8">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-serif font-black text-gray-900 mb-2">Sem Registros</h3>
        <p className="text-sm text-gray-500 font-medium">Ainda não há ações registradas para este processo.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-12 py-4">
      {/* Vertical Line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-100 via-gray-100 to-transparent" />

      <AnimatePresence mode='popLayout'>
        {logs.map((log, index) => {
          const config = ACTION_CONFIG[log.type] || ACTION_CONFIG.SYSTEM;
          const Icon = config.icon;
          
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              {/* Dot Icon */}
              <div className={cn(
                "absolute -left-11 top-0 w-10 h-10 rounded-2xl flex items-center justify-center z-10 shadow-lg border-4 border-white transition-transform group-hover:scale-110",
                config.color
              )}>
                <Icon size={18} />
              </div>

              <div className="bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-white group-hover:border-indigo-100 transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter",
                      config.color
                    )}>
                      {config.label}
                    </span>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">{log.action}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <Clock size={12} />
                    <span>
                      {log.timestamp?.toDate().toLocaleString('pt-BR', { 
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {log.details && (
                  <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    {log.details}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                      {log.isAI ? <BrainCircuit size={14} className="text-indigo-600" /> : <UserIcon size={14} />}
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                      {log.isAI ? 'Inteligência Artificial' : (log.userName || 'Sistema')}
                    </span>
                  </div>
                  {log.isAI && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      <Fingerprint size={12} />
                      <span>Verificado</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
