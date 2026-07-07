import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, CheckCircle, Clock, ArrowRight, Shield, AlertTriangle, Filter, Zap, Activity, Brain } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

interface LeadRequerimento {
  id: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_whatsapp: string;
  cliente_email: string;
  parte_contraria_nome?: string;
  parte_contraria_telefone?: string;
  valor_causa?: number;
  resumo_fato: string;
  status: string;
  tenantSlug: string;
  tipo_lead?: string;
  servico_alvo?: string;
  valor_pago?: number;
  createdAt: any;
}

export default function OnlineLeadsAdmin() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRequerimento[]>([]);
  const [filterServico, setFilterServico] = useState('REQUERIMENTO_MEDIACAO');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE'); // Default based on user request "registrados em uma planilha no sistema"

  // Ouve os leads em tempo real
  useEffect(() => {
    if (!user?.tenantId) return;

    // Filtra apenas os requerimentos. Filtro pelo tenantId
    const q = query(
      collection(db, 'leads'), 
      where('tenantSlug', '==', user.tenantId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeadRequerimento[];
      
      // Ordena do mais recente para o mais antigo 
      leadsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
      setLeads(leadsData);
    }, (error) => {
      console.warn("Online Leads - onSnapshot ignorado por rules:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredLeads = leads.filter(lead => {
    const servico = lead.tipo_lead || lead.servico_alvo || 'REQUERIMENTO_MEDIACAO';
    if (filterServico !== 'TODOS' && servico !== filterServico) return false;
    return true;
  });

  const handleDownloadCSV = () => {
    let csv = "Nome,Documento,WhatsApp,Email,Status,Contratou,Valor Pago,Data\n";
    filteredLeads.forEach(lead => {
      const contratou = lead.status === 'EM_ANÁLISE' || lead.status === 'CONVERTIDO' || lead.status === 'PAGO' ? 'Sim' : 'Nao';
      const valor = lead.valor_pago ? lead.valor_pago.toFixed(2) : '0.00';
      const dataStr = lead.createdAt && typeof lead.createdAt.toDate === 'function' 
        ? lead.createdAt.toDate().toLocaleString('pt-BR') 
        : '';
      
      csv += `"${lead.cliente_nome}","${lead.cliente_documento}","${lead.cliente_whatsapp}","${lead.cliente_email}","${lead.status}","${contratou}","${valor}","${dataStr}"\n`;
    });
    
    // Formato com BOM para Excel reconhecer acentos
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${filterServico.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'AGUARDANDO_PAGAMENTO_ANALISE') return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">Aguardando Pgto</span>;
    if (status === 'EM_ANÁLISE' || status === 'PAGO') return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200">Taxa Paga</span>;
    return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{status}</span>;
  };

  const converterParaProcesso = async (lead: LeadRequerimento) => {
    if (!window.confirm(`Tem a certeza que deseja aprovar o requerimento de ${lead.cliente_nome} e iniciar o processo?`)) return;
    
    setLoadingId(lead.id);
    try {
      // 1. Cria o Processo Oficial na coleção 'processos'
      const novoProcessoRef = await addDoc(collection(db, 'processos'), {
        nup: `GSA.${new Date().getFullYear()}.${Math.floor(Math.random() * 100000)}`,
        status: 'AGUARDANDO_TAP', 
        tipoJustica: 'extrajudicial',
        cliente_nome: lead.cliente_nome,
        cliente_documento: lead.cliente_documento,
        cliente_whatsapp: lead.cliente_whatsapp,
        cliente_email: lead.cliente_email,
        parte_contraria_nome: lead.parte_contraria_nome || '',
        parte_contraria_telefone: lead.parte_contraria_telefone || '',
        valor_causa: lead.valor_causa || 0,
        resumo_fato: lead.resumo_fato,
        servico_alvo: lead.servico_alvo || lead.tipo_lead || 'MEDIACAO',
        tenantId: user?.tenantId || 'gsa-master',
        procurador_responsavel_id: user?.uid, // Atribui ao procurador que clicou em aprovar
        data_abertura: serverTimestamp(),
        ultima_atualizacao: serverTimestamp(),
      });

      // 2. Atualiza o status do Lead para que desapareça desta lista de pendentes
      await updateDoc(doc(db, 'leads', lead.id), {
        status: 'CONVERTIDO',
        processoGeradoId: novoProcessoRef.id,
        convertidoPor: user?.uid,
        data_conversao: serverTimestamp()
      });
      
      alert("Sucesso! O Lead foi convertido e encontra-se agora na aba de Processos.");
    } catch (error) {
      console.error("Erro ao converter lead:", error);
      alert("Erro ao converter o requerimento. Tente novamente.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Filter className="text-amber-500 w-6 h-6" /> Monitor de Prospecção
            </h1>
            <p className="text-slate-500 text-sm mt-1">Faça a triagem dos leads captados pelos seus diferentes funis de vendas.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
              {filteredLeads.filter(l => l.status !== 'CONVERTIDO').length} Pendentes
            </div>
            
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'TABLE' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Planilha
              </button>
              <button 
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'CARDS' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Cards
              </button>
            </div>

            <button 
              onClick={handleDownloadCSV}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              Baixar Excel
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS (TABS) */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-px hide-scrollbar">
          <button 
            onClick={() => setFilterServico('REQUERIMENTO_MEDIACAO')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${filterServico === 'REQUERIMENTO_MEDIACAO' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Brain className="w-4 h-4" /> Mediação (App Online)
          </button>
          <button 
            onClick={() => setFilterServico('LIMPA_NOME')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${filterServico === 'LIMPA_NOME' ? 'border-indigo-500 text-indigo-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Zap className="w-4 h-4" /> Limpa Nome (Rec. Crédito)
          </button>
          <button 
            onClick={() => setFilterServico('RX_INSS')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${filterServico === 'RX_INSS' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Activity className="w-4 h-4" /> RX INSS (Auditoria)
          </button>
        </div>

        {filteredLeads.filter(l => viewMode === 'CARDS' ? l.status !== 'CONVERTIDO' : true).length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <CheckCircle className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-lg font-bold text-slate-700">Fila Limpa</h3>
             <p className="text-slate-500 max-w-md mt-2">Nenhum requerimento pendente para este funil de serviço no momento.</p>
          </div>
        ) : viewMode === 'TABLE' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4">Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4">Status / Fase</th>
                    <th className="p-4">Contratou?</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map(lead => {
                    const contratou = lead.status === 'EM_ANÁLISE' || lead.status === 'CONVERTIDO' || lead.status === 'PAGO';
                    const dataStr = lead.createdAt && typeof lead.createdAt.toDate === 'function' ? lead.createdAt.toDate().toLocaleDateString('pt-BR') : '';
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm text-slate-600 truncate max-w-[100px]">{dataStr}</td>
                        <td className="p-4 flex flex-col">
                          <span className="font-bold text-slate-800">{lead.cliente_nome}</span>
                          <span className="text-xs text-slate-400">{lead.cliente_documento}</span>
                        </td>
                        <td className="p-4 flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{lead.cliente_whatsapp}</span>
                          <span className="text-xs text-slate-500">{lead.cliente_email}</span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(lead.status)}
                        </td>
                        <td className="p-4">
                          {contratou ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md">
                              <CheckCircle className="w-3 h-3"/> Sim {(lead as any).valor_pago ? `- R$ ${Number((lead as any).valor_pago).toFixed(2)}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Não</span>
                          )}
                        </td>
                        <td className="p-4">
                          {lead.status !== 'CONVERTIDO' && (
                            <button 
                              onClick={() => converterParaProcesso(lead)}
                              disabled={loadingId === lead.id}
                              className="text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                            >
                              Aprovar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredLeads.filter(l => l.status !== 'CONVERTIDO').map((lead) => (
              <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col transition-all hover:shadow-md group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-amber-600 transition-colors">{lead.cliente_nome}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> Recebido há pouco
                    </p>
                  </div>
                  {getStatusBadge(lead.status)}
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 flex-1">
                  <span className="font-bold block mb-1 text-xs text-slate-400 uppercase tracking-wider">Resumo do Pedido</span>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {lead.resumo_fato}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                     <div>
                       <span className="text-slate-400 block text-xs font-semibold">WhatsApp Cliente:</span>
                       <span className="font-bold text-slate-700 text-sm">{lead.cliente_whatsapp}</span>
                     </div>
                     {lead.valor_causa ? (
                       <div className="text-right">
                         <span className="text-slate-400 block text-xs font-semibold">Valor da Causa:</span>
                         <span className="font-bold text-slate-800 text-sm">R$ {Number(lead.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                     ) : null}
                  </div>
                </div>

                <div className="flex gap-2 mt-auto pt-2">
                  <button 
                    onClick={() => converterParaProcesso(lead)}
                    disabled={loadingId === lead.id}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loadingId === lead.id ? 'A processar...' : (
                      <>Aprovar e Converter <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
