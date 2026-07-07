import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Process } from '../types';
import { FileText, Search, Filter, Plus, Clock, Sparkles, Scale, AlertCircle, FileSignature, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AIAssistantModal } from './AIAssistantModal';
import { generateDocumentWithTenantContext } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export const ProcessManagementView: React.FC = () => {
  const { profile, tenant, isMaster, isAdminUnidade } = useAuth();
  const [processos, setProcessos] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [isGeneratingAgreement, setIsGeneratingAgreement] = useState<string | null>(null);
  const [processoSelecionado, setProcessoSelecionado] = useState<Process | null>(null);
  const navigate = useNavigate();

  const handleGerarTermoAcordo = async (proc: Process) => {
    setIsGeneratingAgreement(proc.id);
    try {
      const valorMedio = ((proc.blind_bidding?.proposta_requerente || 0) + (proc.blind_bidding?.proposta_requerido || 0)) / 2;
      const instrucoes = `As partes chegaram a um consenso através de negociação cega. O valor do acordo é de R$ ${valorMedio.toFixed(2)}. Redija um termo de acordo institucional, com linguagem técnica jurídica mas clara, prevendo o encerramento do processo ${proc.nup}.`;
      
      const markdown = await generateDocumentWithTenantContext('TERMO', proc, tenant, instrucoes);
      
      // Abre o modal de IA com o texto gerado
      setProcessoSelecionado({ ...proc, laudo_tecnico: markdown }); // Reutilizando campo para preview
      setModalIAOpen(true);
    } catch (error) {
      console.error("Erro ao gerar termo:", error);
      alert("Falha ao gerar o termo via IA.");
    } finally {
      setIsGeneratingAgreement(null);
    }
  };

  const processosIminentes = processos.filter(p => p.status === 'ACORDO_IMINENTE');

  useEffect(() => {
    if (!profile) return;
    setLoading(true);

    const processosRef = collection(db, 'processos');
    let restricoes = [];

    // 1. ISOLAMENTO MULTI-TENANT (Obrigatório)
    if (!isMaster) {
      if (!profile.tenantId) {
        setLoading(false);
        return;
      }
      restricoes.push(where('tenantId', '==', profile.tenantId));
    } else if (tenant) {
      restricoes.push(where('tenantId', '==', tenant.id));
    }

    // 2. ISOLAMENTO POR PAPEL (RBAC)
    if (!isMaster && !isAdminUnidade) {
      if (profile.tipo_usuario === 'ADVOGADO') {
        restricoes.push(where('advogado_id', '==', profile.id));
      } else if (profile.tipo_usuario === 'Procurador') {
        restricoes.push(where('procurador_responsavel_id', '==', profile.id));
      } else if (profile.tipo_usuario === 'Mediador' || profile.tipo_usuario === 'MEDIADOR') {
        restricoes.push(where('mediadorId', '==', profile.id));
      } else if (profile.tipo_usuario === 'CLIENTE') {
        restricoes.push(where('cliente_id', '==', profile.id));
      }
    }

    // 3. FILTRO DE STATUS
    if (filtroStatus !== 'TODOS') {
      restricoes.push(where('status', '==', filtroStatus));
    }

    const q = query(processosRef, ...restricoes, orderBy('data_abertura', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Process[];
      setProcessos(dados);
      setLoading(false);
    }, (error) => {
      console.error("Erro no onSnapshot de processos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, isMaster, isAdminUnidade, tenant, filtroStatus]);

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-gray-500 font-medium font-sans">A carregar processos da unidade...</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">Gestão de Processos</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {isMaster && !tenant ? 'Visão Global (GSA Master)' : `Unidade: ${tenant?.nome_unidade}`}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
            <Filter className="w-5 h-5 text-gray-400" /> Exportar
          </button>
          
          <button 
            onClick={() => navigate('novo')}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-primary/10"
          >
            <Plus className="w-5 h-5" /> Novo Processo
          </button>
        </div>
      </div>

      {/* BANNER DE ACORDO IMINENTE */}
      <AnimatePresence>
        {processosIminentes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 bg-indigo-600 rounded-[2rem] text-white shadow-2xl flex items-center justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
              <Scale size={180} />
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center animate-pulse">
                <Sparkles size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Consenso Detectado via Blind Bidding</h3>
                <p className="text-indigo-100 text-sm font-medium mt-1">
                  Existem <span className="font-black text-white">{processosIminentes.length} processos</span> onde os valores de proposta das partes convergiram.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <button 
                onClick={() => setFiltroStatus('ACORDO_IMINENTE')}
                className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
              >
                Filtrar Casos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTROS RÁPIDOS */}
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-black/5 border border-gray-50 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
          {['TODOS', 'TRIAGEM', 'NOTIFICACAO', 'AUDIENCIA', 'ACORDO_IMINENTE', 'ACORDO'].map(status => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                filtroStatus === status 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-5 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por NUP ou Cliente..." 
            className="w-full pl-14 pr-6 py-3 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none text-sm transition-all font-medium"
          />
        </div>
      </div>

      {/* TABELA DE PROCESSOS */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#fcfbf9] border-b border-gray-50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">NUP / Data</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente (Requerente)</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Parte Contrária</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mx-auto">
                        <FileText size={40} />
                      </div>
                      <p className="text-gray-900 font-bold text-lg">Nenhum processo encontrado</p>
                      <p className="text-gray-400 text-sm">Não encontramos nenhum processo com os filtros selecionados nesta unidade.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processos.map((proc) => (
                  <tr key={proc.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-8">
                      <div className="font-mono text-sm font-black text-primary group-hover:underline cursor-pointer" onClick={() => navigate(proc.id)}>
                        {proc.nup || 'SEM NUP'}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 mt-2 uppercase tracking-tight">
                        <Clock className="w-3 h-3" />
                        {proc.data_abertura?.toDate ? proc.data_abertura.toDate().toLocaleDateString('pt-BR') : 'Sem Data'}
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="font-bold text-gray-900 text-base">{proc.cliente_nome || 'Não informado'}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-1">{proc.cliente_documento}</div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="text-sm font-bold text-gray-700">{proc.parte_contraria_nome || 'Aguardando...'}</div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border max-w-fit ${
                          proc.status === 'ACORDO_IMINENTE'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : proc.status === 'ACORDO' || proc.status === 'ACORDO_HOMOLOGADO' 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : proc.status === 'AUDIENCIA' 
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {proc.status.replace(/_/g, ' ')}
                        </span>
                        
                        {proc.mediadorNome && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/40 backdrop-blur-md border border-white/50 rounded-lg shadow-sm text-[9px] font-black uppercase text-indigo-600 tracking-tighter max-w-fit">
                            <Clock size={10} className="text-indigo-400" />
                            {proc.mediadorNome}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex justify-end items-center gap-4">
                        {proc.status === 'ACORDO_IMINENTE' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGerarTermoAcordo(proc);
                            }}
                            disabled={isGeneratingAgreement === proc.id}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                          >
                            {isGeneratingAgreement === proc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileSignature className="w-3.5 h-3.5" />
                            )}
                            Gerar Minuta
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setProcessoSelecionado(proc);
                            setModalIAOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95 border border-amber-100"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Redigir
                        </button>
                        <button 
                          onClick={() => navigate(proc.id)}
                          className="inline-flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:text-black transition-colors"
                        >
                          <FileText className="w-4 h-4" /> Autos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AIAssistantModal 
        isOpen={modalIAOpen} 
        onClose={() => setModalIAOpen(false)} 
        processo={processoSelecionado} 
      />
    </div>
  );
};
