import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, Search, Filter, UserPlus, MessageSquare, ArrowRight, X, Star, Calendar, MapPin, Link as LinkIcon, DollarSign, Activity } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

// Tipagem do Lead
interface Lead {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
  servico: string;
  servico_solicitado?: string;
  categoria: 'ADMINISTRATIVO' | 'JUDICIAL';
  categoria_servico?: string;
  status: string;
  data_entrada?: string;
  data_captura?: any;
  afiliado_nome?: string;
  afiliado_ref?: string;
  rastreamento_comissao?: {
    indicado_por_nome?: string;
    indicado_por_uid?: string;
  };
  tenant_responsavel?: string;
  responsavel_atribuido?: string;
  dados_adicionais?: Record<string, any>;
  is_priority?: boolean;
  pagamento_prioridade?: boolean;
  prioridade_payment_status?: string;
}

export const GestaoLeadsAdmin: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [busca, setBusca] = useState('');
  const [colunaAtiva, setColunaAtiva] = useState<string>('NOVO');

  const formatarDataHora = (dataCaptura: any) => {
    if (!dataCaptura) return 'Data não informada';
    if (dataCaptura.seconds) {
      const data = new Date(dataCaptura.seconds * 1000);
      return data.toLocaleString('pt-BR');
    }
    const parsed = new Date(dataCaptura);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleString('pt-BR');
    }
    return 'Data não informada';
  };

  const calcularTempoEspera = (dataCaptura: any) => {
    if (!dataCaptura) return 'Desconhecido';
    let timestamp = 0;
    if (dataCaptura.seconds) {
      timestamp = dataCaptura.seconds * 1000;
    } else {
      const parsed = new Date(dataCaptura);
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }
    if (!timestamp) return 'Desconhecido';
    
    const diffInMinutes = Math.floor((Date.now() - timestamp) / 60000);
    if (diffInMinutes < 0) return 'Recém chegado';
    if (diffInMinutes < 60) return `${diffInMinutes} minutos`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} horas e ${diffInMinutes % 60} min`;
    return `${Math.floor(diffInHours / 24)} dias`;
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = () => {
      // Escuta em tempo real da coleção 'leads_vitrine'
      unsubscribe = onSnapshot(collection(db, 'leads_vitrine'), (snapshot) => {
        const leadsData: Lead[] = [];
        snapshot.forEach((doc) => {
          leadsData.push({ id: doc.id, ...doc.data() } as Lead);
        });
        setLeads(leadsData);
      }, (error) => {
        console.error("Erro ao buscar leads: ", error);
        setLeads([]);
      });
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setupListener();
      } else {
        if (unsubscribe) unsubscribe();
        setLeads([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const atualizarStatus = async (leadId: string, novoStatus: string) => {
    try {
      const leadRef = doc(db, 'leads_vitrine', leadId);
      await updateDoc(leadRef, { status: novoStatus });
      
      // Atualiza estado local pro mock caso seja um item mockado (sem Firestore real correspondente)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: novoStatus as any } : l));
      if (leadSelecionado?.id === leadId) {
        setLeadSelecionado(prev => prev ? { ...prev, status: novoStatus as any } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      // Atualiza localmente pro mock
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: novoStatus as any } : l));
      if (leadSelecionado?.id === leadId) {
        setLeadSelecionado(prev => prev ? { ...prev, status: novoStatus as any } : null);
      }
    }
  };

  const colunas = [
    { id: 'NOVO', titulo: 'Novos Leads (Triagem)', labelCurto: 'Novos', icone: Users, cor: 'border-blue-500', bg: 'bg-blue-50', textCor: 'text-blue-600' },
    { id: 'EM_ATENDIMENTO', titulo: 'Em Atendimento', labelCurto: 'Atendimento', icone: Clock, cor: 'border-yellow-500', bg: 'bg-yellow-50', textCor: 'text-yellow-600' },
    { id: 'NEGOCIACAO', titulo: 'Em Negociação', labelCurto: 'Negociação', icone: MessageSquare, cor: 'border-orange-500', bg: 'bg-orange-50', textCor: 'text-orange-600' },
    { id: 'CONVERTIDO', titulo: 'Acordo / Contrato', labelCurto: 'Acordos', icone: CheckCircle, cor: 'border-green-500', bg: 'bg-green-50', textCor: 'text-green-600' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-[calc(100vh-100px)] md:h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Mesa de Controle de Leads</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Gerencie, atribua e converta os leads recebidos pela Vitrine.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, fone, cpf..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" 
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de Etapas para Dispositivos Móveis */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-3 mb-4 shrink-0 scrollbar-none snap-x snap-mandatory">
        {colunas.map(coluna => {
          const Icone = coluna.icone;
          const leadsColuna = leads.filter(l => {
            // Primeiro filtra por status
            let statusMatches = false;
            if (coluna.id === 'NOVO') {
              statusMatches = ['NOVO', 'LEAD_NOVO', 'TRIAGEM_ADMINISTRATIVA', 'AGUARDANDO_ATRIBUICAO_JURIDICA', 'AGUARDANDO_ATRIBUICAO_JURIDICA_UNIDADE'].includes(l.status);
            } else {
              statusMatches = l.status === coluna.id;
            }
            if (!statusMatches) return false;

            // Depois filtra por busca
            if (!busca) return true;
            const termo = busca.toLowerCase();
            return (
              l.nome?.toLowerCase().includes(termo) ||
              l.telefone?.toLowerCase().includes(termo) ||
              l.email?.toLowerCase().includes(termo) ||
              l.servico?.toLowerCase().includes(termo) ||
              l.servico_solicitado?.toLowerCase().includes(termo) ||
              l.documento?.toLowerCase().includes(termo) ||
              l.afiliado_nome?.toLowerCase().includes(termo) ||
              l.rastreamento_comissao?.indicado_por_nome?.toLowerCase().includes(termo)
            );
          });

          const isActive = colunaAtiva === coluna.id;

          return (
            <button
              key={coluna.id}
              onClick={() => setColunaAtiva(coluna.id)}
              className={`snap-start shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 font-black'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icone className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{coluna.labelCurto}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {leadsColuna.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-y-auto md:overflow-hidden pb-4 md:pb-0">
        {colunas.map(coluna => {
          const Icone = coluna.icone;
          const leadsColuna = leads.filter(l => {
            // Filtro por status correspondente à coluna
            let statusMatches = false;
            if (coluna.id === 'NOVO') {
              statusMatches = ['NOVO', 'LEAD_NOVO', 'TRIAGEM_ADMINISTRATIVA', 'AGUARDANDO_ATRIBUICAO_JURIDICA', 'AGUARDANDO_ATRIBUICAO_JURIDICA_UNIDADE'].includes(l.status);
            } else {
              statusMatches = l.status === coluna.id;
            }
            if (!statusMatches) return false;

            // Filtro por termo de busca
            if (!busca) return true;
            const termo = busca.toLowerCase();
            return (
              l.nome?.toLowerCase().includes(termo) ||
              l.telefone?.toLowerCase().includes(termo) ||
              l.email?.toLowerCase().includes(termo) ||
              l.servico?.toLowerCase().includes(termo) ||
              l.servico_solicitado?.toLowerCase().includes(termo) ||
              l.documento?.toLowerCase().includes(termo) ||
              l.afiliado_nome?.toLowerCase().includes(termo) ||
              l.rastreamento_comissao?.indicado_por_nome?.toLowerCase().includes(termo)
            );
          });

          const isVisibleOnMobile = colunaAtiva === coluna.id;

          return (
            <div 
              key={coluna.id} 
              className={`flex flex-col bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden md:h-full ${
                isVisibleOnMobile ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className={`p-4 border-t-4 ${coluna.cor} bg-white flex justify-between items-center shadow-sm shrink-0`}>
                <h2 className="font-bold text-slate-700 flex items-center text-sm sm:text-base">
                  <Icone className="w-5 h-5 mr-2 text-slate-400 shrink-0" /> 
                  <span className="truncate">{coluna.titulo}</span>
                </h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-black px-2.5 py-1 rounded-full">{leadsColuna.length}</span>
              </div>
              
              <div className="flex-1 md:overflow-y-auto p-4 space-y-3 min-h-[300px]">
                {leadsColuna.map(lead => (
                  <div 
                    key={lead.id} 
                    onClick={() => setLeadSelecionado(lead)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          (lead.categoria || lead.categoria_servico) === 'JUDICIAL' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {lead.categoria || lead.categoria_servico || 'N/A'}
                        </span>
                        {(lead.is_priority || lead.pagamento_prioridade || lead.prioridade_payment_status === 'CONFIRMED') && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 flex items-center">
                            <Star className="w-3 h-3 mr-0.5 fill-amber-500 shrink-0" /> PRIORIDADE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">{calcularTempoEspera(lead.data_captura)}</span>
                    </div>
                    <h3 className="font-black text-slate-800 text-base mb-1 truncate">{lead.nome}</h3>
                    <p className="text-xs text-slate-500 mb-3 truncate">{lead.servico || lead.servico_solicitado || lead.categoria_servico || 'Serviço Geral'}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      {lead.responsavel_atribuido ? (
                        <div className="flex items-center text-xs font-medium text-slate-600">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-1.5 font-bold text-[10px] uppercase">
                            {lead.responsavel_atribuido.charAt(0)}
                          </div>
                          <span className="truncate max-w-[120px]">{lead.responsavel_atribuido}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 flex items-center">
                          <UserPlus className="w-3.5 h-3.5 mr-1 text-red-400" /> Sem responsável
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {leadsColuna.length === 0 && (
                  <div className="text-center py-10 px-4 text-slate-400 text-sm border-2 border-dashed border-slate-200/60 rounded-xl">
                    Nenhum lead nesta etapa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Gestão do Lead (Ação do Admin) */}
      {leadSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/80 px-2 py-1 rounded-md uppercase tracking-wider inline-block">
                    {leadSelecionado.servico || leadSelecionado.servico_solicitado || leadSelecionado.categoria_servico || 'Não informado'}
                  </span>
                  {(leadSelecionado.is_priority || leadSelecionado.pagamento_prioridade || leadSelecionado.prioridade_payment_status === 'CONFIRMED') && (
                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-md uppercase tracking-wider inline-flex items-center">
                      <Star className="w-3 h-3 mr-1 fill-amber-500 shrink-0" /> PRIORIDADE PAGA
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 break-words" title={leadSelecionado.nome}>
                  {leadSelecionado.nome}
                </h2>
                <div className="flex items-center text-xs text-slate-500 mt-1">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  <span>Contato em: {formatarDataHora(leadSelecionado.data_captura)}</span>
                </div>
              </div>
              <button 
                onClick={() => setLeadSelecionado(null)} 
                className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full p-2.5 shadow-sm border border-slate-200 shrink-0 ml-4 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Painel de Indicadores Operacionais */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 shadow-inner">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Informações de Rastreamento</h4>
                <div className="grid grid-cols-2 gap-3.5 text-sm">
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center mb-1">
                      <Clock className="w-3 h-3 mr-1 text-indigo-500" /> Tempo de Espera
                    </p>
                    <p className="font-extrabold text-slate-800 text-sm">{calcularTempoEspera(leadSelecionado.data_captura)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center mb-1">
                      <MapPin className="w-3 h-3 mr-1 text-indigo-500" /> Unidade Destino
                    </p>
                    <p className="font-extrabold text-slate-800 text-xs sm:text-sm break-words">
                      {leadSelecionado.tenant_responsavel === 'MASTER' ? 'GSA Câmara (Sede)' : (leadSelecionado.tenant_responsavel || 'Não definida')}
                    </p>
                  </div>
                  <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center mb-1">
                      <LinkIcon className="w-3 h-3 mr-1 text-indigo-500" /> Origem do Link / Indicação
                    </p>
                    <div className="font-medium text-slate-700 text-xs sm:text-sm">
                      {leadSelecionado.afiliado_nome || leadSelecionado.rastreamento_comissao?.indicado_por_nome ? (
                        <div className="space-y-1">
                          <p>Indicado por: <strong className="text-slate-900">{leadSelecionado.afiliado_nome || leadSelecionado.rastreamento_comissao?.indicado_por_nome}</strong></p>
                          {(leadSelecionado.afiliado_ref || leadSelecionado.rastreamento_comissao?.indicado_por_uid) && (
                            <p className="text-[10px] text-slate-400 font-mono select-all">
                              ID Indicador: {leadSelecionado.afiliado_ref || leadSelecionado.rastreamento_comissao?.indicado_por_uid}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Acesso Direto (Sem indicação / link direto)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status de Pagamentos */}
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/50">
                <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-2.5 flex items-center">
                  <DollarSign className="w-3.5 h-3.5 mr-1" /> Financeiro / Pagamentos
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm bg-white p-2.5 rounded-xl border border-amber-150">
                    <span className="font-medium text-slate-600">Taxa de Prioridade de Triagem</span>
                    {(leadSelecionado.pagamento_prioridade || leadSelecionado.prioridade_payment_status === 'CONFIRMED' || leadSelecionado.is_priority) ? (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
                        R$ 24,90 - PAGO ✅
                      </span>
                    ) : leadSelecionado.prioridade_payment_status ? (
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
                        Aguardando Pix ⏳
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[10px]">
                        Não Contratado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão Ergonômico de Ação Rápida (WhatsApp) */}
              {leadSelecionado.telefone && (
                <div>
                  <a 
                    href={`https://wa.me/${leadSelecionado.telefone.replace(/\D/g, '')}?text=Olá ${encodeURIComponent(leadSelecionado.nome)}, sou conciliador da Câmara GSA. Recebemos seus dados sobre o serviço de ${encodeURIComponent(leadSelecionado.servico || 'RX do Consignado')}. Como podemos ajudar?`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center shadow-md transition-all h-[48px]"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" /> Falar no WhatsApp
                  </a>
                </div>
              )}

              {/* Detalhes do Formulário (Dados Dinâmicos) */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-150">
                <h4 className="text-[11px] font-black text-indigo-800 uppercase tracking-widest mb-3">Respostas do Formulário</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  {leadSelecionado.documento && (
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPF/CNPJ</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{leadSelecionado.documento}</p>
                    </div>
                  )}
                  {leadSelecionado.email && (
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</p>
                      <p className="font-extrabold text-slate-800 mt-0.5 break-all select-all text-xs sm:text-sm" title={leadSelecionado.email}>{leadSelecionado.email}</p>
                    </div>
                  )}
                  {leadSelecionado.telefone && (
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                      <p className="font-extrabold text-slate-800 mt-0.5 select-all">{leadSelecionado.telefone}</p>
                    </div>
                  )}
                  {Object.entries(leadSelecionado.dados_adicionais || {}).map(([key, val]) => (
                    <div key={key} className="bg-white p-2.5 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status e Evolução */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">Evolução do Atendimento</label>
                <select 
                  value={leadSelecionado.status}
                  onChange={(e) => atualizarStatus(leadSelecionado.id, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 h-[48px]"
                >
                  <option value="NOVO">Novo Lead (Triagem)</option>
                  <option value="EM_ATENDIMENTO">Em Atendimento</option>
                  <option value="NEGOCIACAO">Em Negociação</option>
                  <option value="CONVERTIDO">Convertido em Cliente (Contrato)</option>
                </select>
              </div>

              {/* Atribuição */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center">
                  <UserPlus className="w-4 h-4 mr-1.5 text-indigo-500 shrink-0" />
                  Atribuir Responsável (Delegação)
                </label>
                <select className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 h-[48px] font-medium text-sm">
                  <option value="">Selecione um profissional da equipe...</option>
                  <optgroup label="Mediadores Internos">
                    <option value="med_1">Mediadora Ana Paula</option>
                    <option value="med_2">Mediador João Carlos</option>
                  </optgroup>
                  {leadSelecionado.categoria === 'JUDICIAL' && (
                    <optgroup label="Advogados Parceiros">
                      <option value="adv_1">Dra. Marina Stein</option>
                      <option value="adv_2">Dr. Silva Pereira</option>
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-slate-400">O profissional selecionado receberá este caso na sua mesa de trabalho.</p>
              </div>

              {/* Adicionar Nota */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1.5 text-indigo-500 shrink-0" />
                  Adicionar Nota Interna
                </label>
                <textarea 
                  rows={3} 
                  placeholder="Registre ligações, dúvidas ou detalhes do atendimento..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                ></textarea>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0 flex-wrap">
              <button 
                onClick={() => setLeadSelecionado(null)} 
                className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors flex-1 sm:flex-none text-sm h-[48px]"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setLeadSelecionado(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-extrabold flex items-center justify-center shadow-md transition-colors flex-1 sm:flex-none whitespace-nowrap text-sm h-[48px]"
              >
                Salvar e Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
