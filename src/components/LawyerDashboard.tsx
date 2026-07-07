import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Process } from '../types';
import { Scale, FileText, Download, Briefcase, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

export const LawyerDashboard = () => {
  const { profile } = useAuth();
  const [processos, setProcessos] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  useEffect(() => {
    fetchProcessos();
  }, [profile?.id]);

  const fetchProcessos = async () => {
    if (!profile?.id) return;
    try {
      const q = query(
        collection(db, 'processos'), 
        where('advogado_id', '==', profile.id),
        where('tipoJustica', '==', 'judicial')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Process));
      setProcessos(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'processos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Carregando seus processos...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      
      {/* HEADER ISOLADO */}
      <div className="flex justify-between items-end mb-8 border-b-2 border-red-50 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-inner">
              <Scale size={24} />
            </div>
            Painel do Advogado
          </h1>
          <p className="text-gray-500 mt-2 font-medium max-w-2xl">
            Bem-vindo Dr(a). {profile?.nome_completo}. Abaixo estão os processos com mediação frustrada que foram encaminhados para litígio.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total de Atribuições</p>
          <p className="text-3xl font-bold text-gray-900">{processos.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTA DE PROCESSOS */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 ml-2">Casos Pendentes</h3>
          {processos.length === 0 && (
            <div className="bg-gray-50 rounded-[2rem] p-8 text-center border-2 border-dashed border-gray-200">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhum processo judicial atribuído.</p>
            </div>
          )}
          {processos.map(proc => (
            <button 
              key={proc.id}
              onClick={() => setSelectedProcess(proc)}
              className={`w-full text-left bg-white rounded-[2rem] p-6 border-2 transition-all group relative overflow-hidden ${
                selectedProcess?.id === proc.id 
                  ? 'border-red-500 shadow-xl shadow-red-500/10' 
                  : 'border-transparent shadow-xl shadow-gray-200/40 hover:border-red-200'
              }`}
            >
              <div className={`absolute top-0 right-0 w-2 h-full transition-colors ${
                selectedProcess?.id === proc.id ? 'bg-red-500' : 'bg-transparent group-hover:bg-red-200'
              }`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">{proc.status.replace(/_/g, ' ')}</p>
              <h4 className="text-lg font-bold text-gray-900 mb-1">{proc.cliente_nome || 'Cliente não identificado'}</h4>
              <p className="font-mono text-xs text-gray-500 mb-4">NUP: {proc.nup}</p>
              
              <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                <span>R$ {proc.valor_causa?.toFixed(2) || '0.00'}</span>
                <ChevronRight size={18} className={selectedProcess?.id === proc.id ? 'text-red-500' : 'text-gray-300'} />
              </div>
            </button>
          ))}
        </div>

        {/* DETALHES DO PROCESSO */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedProcess ? (
              <motion.div 
                key={selectedProcess.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-red-900/5 border border-white/50 relative overflow-hidden h-full"
              >
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedProcess.cliente_nome} vs {selectedProcess.parte_contraria_nome || 'Requerido'}</h2>
                    <p className="font-mono text-sm text-gray-500">NUP: {selectedProcess.nup}</p>
                  </div>
                  <span className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-100">
                    Fase Judicial
                  </span>
                </div>

                {selectedProcess.notas_procurador && (
                  <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200 mb-8 relative z-10">
                    <h4 className="text-yellow-800 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                      <AlertCircle size={16} /> Notas do Procurador
                    </h4>
                    <p className="text-yellow-900/80 font-medium whitespace-pre-wrap text-sm">{selectedProcess.notas_procurador}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" /> 1. Dossiê de Provas
                    </h4>
                    <p className="text-xs text-gray-500 font-medium mb-4">Relatório completo do histórico extrajudicial, AR Online e lances frustrados.</p>
                    {selectedProcess.dossie_provas_url ? (
                      <a 
                        href={selectedProcess.dossie_provas_url} 
                        download={`Dossie_${selectedProcess.nup}.pdf`}
                        target="_blank" rel="noopener noreferrer"
                        className="w-full bg-white text-gray-900 font-bold py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-900 transition-colors flex justify-center items-center gap-2 text-sm"
                      >
                        <Download size={16} /> Baixar PDF Original
                      </a>
                    ) : (
                      <span className="text-red-500 text-sm font-bold">Dossiê não encontrado.</span>
                    )}
                  </div>

                  <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-400" /> 2. Peça Inicial (IA)
                    </h4>
                    <p className="text-xs text-indigo-500/80 font-medium mb-4">Rascunho elaborado pela IA destacando a via extrajudicial esgotada.</p>
                    <button 
                      onClick={() => {
                        const content = selectedProcess.peticao_inicial_url || '';
                        navigator.clipboard.writeText(content);
                        alert("Petição copiada para a área de transferência!");
                      }}
                      className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 text-sm shadow-xl shadow-indigo-600/20"
                    >
                      Copiar Texto da Peça
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 ml-2">Conteúdo da Petição (Preview)</h4>
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-inner h-[400px] overflow-y-auto prose prose-sm prose-indigo max-w-none">
                    {selectedProcess.peticao_inicial_url ? (
                      <Markdown>{selectedProcess.peticao_inicial_url}</Markdown>
                    ) : (
                      <p className="text-gray-400 italic">Petição não gerada.</p>
                    )}
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="h-full bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-200 mb-6">
                  <Scale size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhum processo selecionado</h3>
                <p className="text-gray-400 font-medium max-w-md">Selecione um caso na lista lateral para acessar as provas e rascunhos judiciais.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
