import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Zap, Building, FileText, UploadCloud, ArrowRight, CheckCircle2, Loader2, Download, PenTool, FolderPlus, MessageSquare, Scale, ClipboardList, Plus, Settings } from 'lucide-react';
import { apiUrl } from '../lib/apiClient';
import axios from 'axios';
import { JuridicoLaunchForm } from './JuridicoLaunchForm';

import { B2BUploadView } from './B2BUploadView';

type MóduloAtivo = 'RECOVERY' | 'AR_NOTIFICACOES' | 'REQUERIMENTOS' | 'ASSINATURAS' | 'JURIDICO' | 'CONFIGURACOES';

export default function GsaRecoveryDashboard() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const targetTenantId = searchParams.get('tenantId') || user?.tenantId;

  const [abaModo, setAbaModo] = useState<MóduloAtivo>('RECOVERY');
  const [loading, setLoading] = useState(false);
  
  // Listagens de dados vindas do Firebase
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [notificacoesAr, setNotificacoesAr] = useState<any[]>([]);
  const [requerimentos, setRequerimentos] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [juridicoProcessos, setJuridicoProcessos] = useState<any[]>([]);

  // Modais de Ação
  const [modalRecovery, setModalRecovery] = useState(false);
  const [modalAr, setModalAr] = useState(false);
  const [modalRequerimento, setModalRequerimento] = useState(false);
  const [modalCsv, setModalCsv] = useState(false);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [modalJuridico, setModalJuridico] = useState<'INTERNO' | 'PARTICULAR' | null>(null);

  // Simulador de Teste do Devedor
  const [modalTestarSimulador, setModalTestarSimulador] = useState(false);
  const [credorConfig, setCredorConfig] = useState<any>(null);
  const [formSimulador, setFormSimulador] = useState({
    nome_devedor: 'Devedor de Teste GSA',
    valor_divida: '1500',
    proposta_desconto_pct: '20'
  });
  const [linkSimuladoGerado, setLinkSimuladoGerado] = useState('');
  const [protocoloSimulado, setProtocoloSimulado] = useState('');

  // Gerenciamento de Mediação Solicitada pelo Devedor
  const [modalGerenciarMediacao, setModalGerenciarMediacao] = useState<any>(null);
  const [novaDataMediacao, setNovaDataMediacao] = useState('');
  const [novaHoraMediacao, setNovaHoraMediacao] = useState('');

  // Gerenciamento de Proposta em Análise
  const [modalGerenciarPropostaAnalise, setModalGerenciarPropostaAnalise] = useState<any>(null);

  // Modal de Detalhes do Devedor
  const [modalDetalhesDevedor, setModalDetalhesDevedor] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form 1: GSA Recovery (Dívidas)
  const [formRecovery, setFormRecovery] = useState({
    nome_devedor: '', cpf_cnpj: '', telefone: '', email: '', valor_divida: '', vencimento_original: '', proposta_desconto_pct: '10', parcelas_max: '3'
  });

  // Form 2: AR Online & Notificações Extrajudiciais
  const [formAr, setFormAr] = useState({
    nome_notificado: '', cpf_cnpj: '', telefone: '', email: '', endereco_completo: '', assunto: 'Notificação Extrajudicial', texto_base: ''
  });

  // Form 3: Abertura de Requerimento de Processo (GSA Câmara)
  const [formRequerimento, setFormRequerimento] = useState({
    tipo_procedimento: 'Mediação', parte_contraria: '', documento_contraria: '', objeto_disputa: '', valor_causa: '', resumo_fatos: ''
  });

  // Listener unificado baseado no tenant do Credor parceiro
  useEffect(() => {
    if (!targetTenantId) return;

    const tId = targetTenantId;

    // Puxar Dívidas Recovery
    const unsubRec = onSnapshot(query(collection(db!, 'recovery_cobrancas'), where('tenantId', '==', tId)), (snap) => {
      setCobrancas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("recovery_cobrancas onSnapshot error:", err));
    
    // Puxar dados da empresa credora
    const unsubCredor = onSnapshot(query(collection(db!, 'recovery_credores'), where('tenantId', '==', tId)), (snap) => {
      if (!snap.empty) {
        setCredorConfig({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });

    // Puxar ARs Online emitidas
    const unsubAr = onSnapshot(query(collection(db!, 'ar_online'), where('tenantId', '==', tId)), (snap) => {
      setNotificacoesAr(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("ar_online onSnapshot error:", err));

    // Puxar Requerimentos de Mediação/Arbitragem
    const unsubReq = onSnapshot(query(collection(db!, 'processos'), where('tenantId', '==', tId), where('origem', '==', 'PortalCredor')), (snap) => {
      setRequerimentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("processos onSnapshot error:", err));

    const unsubJuridico = onSnapshot(query(collection(db!, 'juridico_processos'), where('tenantId', '==', tId)), (snap) => {
      setJuridicoProcessos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("juridico_processos onSnapshot error:", err));

    return () => { unsubRec(); unsubCredor(); unsubAr(); unsubReq(); unsubJuridico(); };
  }, [targetTenantId]);

  // Executar GSA Recovery Individual
  const handleCriarRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const valor = Number(formRecovery.valor_divida);
      const taxaOp = valor > 1000 ? Number((valor * 0.05).toFixed(2)) : 49;
      
      const token = await auth.currentUser?.getIdToken();
      await axios.post(apiUrl('/api/recovery/cadastrar'), {
        ...formRecovery,
        valor_divida: valor,
        taxa_operacional_devedor: taxaOp,
        taxa_exito_credor_pct: 15,
        taxa_notificacao_credor: 9.90,
        tenantId: targetTenantId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Cobrança e Régua Consensual ativadas!");
      setModalRecovery(false);
      setFormRecovery({nome_devedor:'', cpf_cnpj:'', telefone:'', email:'', valor_divida:'', vencimento_original:'', proposta_desconto_pct:'10', parcelas_max:'3'});
    } catch (err) { alert("Erro ao registrar cobrança."); }
    finally { setLoading(false); }
  };

  // Executar Fluxo de Teste Simulador do Devedor
  const handleGerarFluxoTeste = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const valor = Number(formSimulador.valor_divida) || 1500;
      const descPct = Number(formSimulador.proposta_desconto_pct) || 20;
      const taxaOp = valor > 1000 ? Number((valor * 0.05).toFixed(2)) : 49;
      const protocolo = `TEST-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const docRef = await addDoc(collection(db!, 'recovery_cobrancas'), {
        nome_devedor: formSimulador.nome_devedor,
        cpf_cnpj: '000.000.000-00',
        telefone: '5511999999999',
        email: 'devedor_teste@gsa.com',
        valor_divida: valor,
        taxa_operacional_devedor: taxaOp,
        taxa_exito_credor_pct: 15,
        taxa_notificacao_credor: 9.90,
        vencimento_original: new Date().toISOString().split('T')[0],
        proposta_desconto_pct: descPct,
        parcelas_max: 3,
        status: 'CONVITE_ENVIADO',
        protocolo: protocolo,
        tenantId: targetTenantId || 'master',
        nome_credor: profile?.nome_completo || 'Credor Simulador GSA',
        criado_em: new Date().toISOString()
      });

      setProtocoloSimulado(protocolo);
      setLinkSimuladoGerado(`/publico/negociar/${docRef.id}`);
    } catch (err) {
      alert("Erro ao criar cobrança de simulação.");
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarMediacao = async (cobrancaId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobrancaId), {
        'audiencia_agendada.status_aprovacao': 'APROVADA'
      });
      setModalGerenciarMediacao(null);
    } catch (err) { alert("Erro ao aprovar mediação."); }
    finally { setLoading(false); }
  };

  const handleRejeitarMediacao = async (cobrancaId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobrancaId), {
        'audiencia_agendada.status_aprovacao': 'REJEITADA',
        status: 'RECUSADO'
      });
      setModalGerenciarMediacao(null);
    } catch (err) { alert("Erro ao rejeitar mediação."); }
    finally { setLoading(false); }
  };

  const handleProporNovaDataMediacao = async (cobrancaId: string) => {
    if (!novaDataMediacao || !novaHoraMediacao) return;
    setLoading(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobrancaId), {
        'audiencia_agendada.data': novaDataMediacao,
        'audiencia_agendada.hora': novaHoraMediacao,
        'audiencia_agendada.status_aprovacao': 'NOVA_DATA_PROPOSTA'
      });
      setModalGerenciarMediacao(null);
    } catch (err) { alert("Erro ao propor nova data."); }
    finally { setLoading(false); }
  };

  const handleAprovarPropostaAnalise = async (cobrancaId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobrancaId), {
        'proposta_devedor.status_aprovacao': 'APROVADA',
        status: 'ACORDO_ACEITO'
      });
      setModalGerenciarPropostaAnalise(null);
    } catch (err) { alert("Erro ao aprovar proposta."); }
    finally { setLoading(false); }
  };

  const handleRejeitarPropostaAnalise = async (cobrancaId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobrancaId), {
        'proposta_devedor.status_aprovacao': 'REJEITADA',
        status: 'RECUSADO'
      });
      setModalGerenciarPropostaAnalise(null);
    } catch (err) { alert("Erro ao rejeitar proposta."); }
    finally { setLoading(false); }
  };

  // Executar Emissão de AR Online Individual
  const handleCriarAr = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(apiUrl('/api/ar/criar-portal'), {
        ...formAr,
        tenantId: targetTenantId || 'master'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("AR Online gerada! Pendente de liberação de pagamento da taxa sistêmica.");
      setModalAr(false);
      setFormAr({nome_notificado:'', cpf_cnpj:'', telefone:'', email:'', endereco_completo:'', assunto:'Notificação Extrajudicial', texto_base:''});
    } catch (err) { alert("Erro ao emitir AR Online."); }
    finally { setLoading(false); }
  };

  // Executar Abertura de Requerimento de Processo na Câmara GSA
  const handleCriarRequerimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db!, 'processos'), {
        ...formRequerimento,
        requerente: profile?.nome_completo || user?.email,
        tenantId: targetTenantId || 'master',
        origem: 'PortalCredor',
        status: 'AGUARDANDO_DISTRIBUICAO',
        numero_processo: `PROC-${Date.now().toString().slice(-5)}`,
        criado_em: new Date().toISOString()
      });
      alert("Requerimento protocolado com sucesso na Câmara GSA!");
      setModalRequerimento(false);
      setFormRequerimento({tipo_procedimento:'Mediação', parte_contraria:'', documento_contraria:'', objeto_disputa:'', valor_causa:'', resumo_fatos:''});
    } catch (err) { alert("Erro ao protocolar requerimento."); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO UNIFICADO DO PARCEIRO B2B */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building className="text-slate-700 w-6 h-6" /> {profile?.nome_completo || 'Portal do Parceiro B2B'}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Acesso unificado a serviços extrajudiciais, cobranças inteligentes e soluções de conflitos.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {abaModo === 'RECOVERY' && (
              <>
                <button onClick={() => {
                  setModalTestarSimulador(true);
                  setLinkSimuladoGerado('');
                  setProtocoloSimulado('');
                }} className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm">
                  <Zap className="w-4 h-4 text-amber-600 fill-amber-500 animate-pulse"/> Testar Negociação do Devedor
                </button>
                <button onClick={() => setModalCsv(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all">
                  <UploadCloud className="w-4 h-4"/> Importar Lote CSV
                </button>
                <button onClick={() => setModalRecovery(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md">
                  <Plus className="w-4 h-4"/> Cadastrar Dívida
                </button>
              </>
            )}
            {abaModo === 'AR_NOTIFICACOES' && (
              <button onClick={() => setModalAr(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md">
                <Plus className="w-4 h-4"/> Emitir Notificação / AR
              </button>
            )}
            {abaModo === 'REQUERIMENTOS' && (
              <button onClick={() => setModalRequerimento(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md">
                <FolderPlus className="w-4 h-4"/> Novo Requerimento GSA
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE SELEÇÃO DE MÓDULOS (ABAS) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-slate-200 pb-px">
          <button onClick={() => setAbaModo('RECOVERY')} className={`p-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${abaModo === 'RECOVERY' ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500"/> GSA Recovery ({cobrancas.length})
          </button>
          <button onClick={() => setAbaModo('AR_NOTIFICACOES')} className={`p-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${abaModo === 'AR_NOTIFICACOES' ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <FileText className="w-4 h-4 text-blue-500"/> AR & Notificações ({notificacoesAr.length})
          </button>
          <button onClick={() => setAbaModo('REQUERIMENTOS')} className={`p-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${abaModo === 'REQUERIMENTOS' ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Scale className="w-4 h-4 text-indigo-500"/> Requerer Processos ({requerimentos.length})
          </button>
          <button onClick={() => setAbaModo('JURIDICO')} className={`p-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${abaModo === 'JURIDICO' ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Scale className="w-4 h-4 text-indigo-500"/> Jurídico ({juridicoProcessos.length})
          </button>
          <button onClick={() => setAbaModo('CONFIGURACOES')} className={`p-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${abaModo === 'CONFIGURACOES' ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Building className="w-4 h-4 text-slate-500"/> Configurações
          </button>
        </div>

        {/* PAINEL DINÂMICO CONFORME ABA SELECIONADA */}
        
        {/* MÓDULO 1: GSA RECOVERY */}
        {abaModo === 'RECOVERY' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Dashboard Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total de Devedores</p>
                <h3 className="text-2xl font-black text-slate-800">{cobrancas.length}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Volume em Negociação</p>
                <h3 className="text-2xl font-black text-slate-800">
                  R$ {cobrancas.reduce((acc, curr) => acc + (Number(curr.valor_divida) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Acordos Fechados</p>
                <h3 className="text-2xl font-black text-emerald-600">
                  {cobrancas.filter(c => c.status === 'ACORDO_ACEITO').length}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Volume Recuperado</p>
                <h3 className="text-2xl font-black text-emerald-600">
                  R$ {cobrancas.filter(c => c.status === 'ACORDO_ACEITO').reduce((acc, curr) => acc + (Number(curr.valor_divida) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Tabela de Cobranças */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden duration-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1"><ClipboardList className="w-4 h-4"/> Carteira de Cobrança e Acordos Consensuais</div>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase"><th className="p-4">Devedor</th><th className="p-4">Valor Devido</th><th className="p-4">Taxa Devedor (5%)</th><th className="p-4">Status</th><th className="p-4 text-right">Ação</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cobrancas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/40 text-xs">
                      <td className="p-4"><p className="font-bold text-slate-900">{c.nome_devedor}</p><span className="text-[10px] font-mono text-slate-400">{c.cpf_cnpj}</span></td>
                      <td className="p-4 font-semibold">R$ {c.valor_divida?.toFixed(2)}</td>
                      <td className="p-4 text-amber-600">R$ {c.taxa_operacional_devedor?.toFixed(2)}</td>
                      <td className="p-4">
                        {c.status === 'CONVITE_ENVIADO' && <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">Régua Ativa</span>}
                        {c.status === 'ACORDO_ACEITO' && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">Líquido / Pago</span>}
                        {c.status === 'AGUARDANDO_AUDIENCIA' && <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">Mediação 72h</span>}
                        {c.status === 'PROPOSTA_ANALISE' && <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">Análise de Proposta</span>}
                        {c.status === 'RECUSADO' && <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">Recusado</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === 'AGUARDANDO_AUDIENCIA' && (
                            <button onClick={() => setModalGerenciarMediacao(c)} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-bold uppercase hover:bg-indigo-200">
                              Gerenciar Mediação
                            </button>
                          )}
                          {c.status === 'PROPOSTA_ANALISE' && (
                            <button onClick={() => setModalGerenciarPropostaAnalise(c)} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-md font-bold uppercase hover:bg-purple-200">
                              Analisar Proposta
                            </button>
                          )}
                          <button onClick={() => setModalDetalhesDevedor(c)} className="text-[11px] bg-slate-900 text-white px-3 py-1 rounded-md font-bold inline-flex items-center gap-1 hover:bg-slate-800">Detalhes</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cobrancas.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhuma cobrança inserida nesta carteira.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* MÓDULO 2: AR ONLINE & NOTIFICAÇÕES */}
        {abaModo === 'AR_NOTIFICACOES' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">Histórico de Notificações Extrajudiciais com AR</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase"><th className="p-4">NUP / AR</th><th className="p-4">Notificado</th><th className="p-4">Assunto</th><th className="p-4">Status Sistêmico</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {notificacoesAr.map(ar => (
                    <tr key={ar.id} className="hover:bg-slate-50/40 text-xs">
                      <td className="p-4 font-mono font-bold text-slate-900">{ar.nup_ar}</td>
                      <td className="p-4">{ar.nome_notificado}</td>
                      <td className="p-4 text-slate-500">{ar.assunto}</td>
                      <td className="p-4">
                        {ar.status === 'AGUARDANDO_PAGAMENTO' && <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] px-2 py-0.5 rounded-md font-bold">Aguardando Taxa</span>}
                        {ar.status === 'AGUARDANDO_CONFERENCIA_CLIENTE' && <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-2 py-0.5 rounded-md font-bold">Aprovar Minuta</span>}
                        {ar.status === 'LIBERADO_ENVIO' && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] px-2 py-0.5 rounded-md font-bold">Enviado (Omnichannel)</span>}
                      </td>
                    </tr>
                  ))}
                  {notificacoesAr.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Nenhuma Notificação ou AR Online disparada por este portal.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO 3: REQUERIMENTOS CÂMARA GSA */}
        {abaModo === 'REQUERIMENTOS' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">Procedimentos e Pedidos de Mediação / Arbitragem</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase"><th className="p-4">Nº Registro</th><th className="p-4">Tipo</th><th className="p-4">Parte Contraria</th><th className="p-4">Objeto da Disputa</th><th className="p-4">Fase Inicial</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requerimentos.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/40 text-xs">
                      <td className="p-4 font-mono font-bold text-slate-900">{req.numero_processo}</td>
                      <td className="p-4"><span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">{req.tipo_procedimento}</span></td>
                      <td className="p-4 font-semibold">{req.parte_contraria}</td>
                      <td className="p-4 text-slate-500 truncate max-w-xs">{req.objeto_disputa}</td>
                      <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Triagem / Protocolado</span></td>
                    </tr>
                  ))}
                  {requerimentos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhum pedido de litígio ou mediação aberto neste painel.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}


        
        {/* MÓDULO 5: JURÍDICOHUB */}
        {abaModo === 'JURIDICO' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CARD JURÍDICO INTERNO */}
              <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                <h3 className="font-bold text-indigo-900 mb-2">Jurídico Interno - HLF</h3>
                <p className="text-xs text-slate-500 mb-4">Envio direto para nossa equipe jurídica interna.</p>
                <button onClick={() => setModalJuridico('INTERNO')} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Iniciar Processo HLF</button>
              </div>

              {/* CARD JURÍDICO PARTICULAR */}
              <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                <h3 className="font-bold text-emerald-900 mb-2">Jurídico Particular</h3>
                <p className="text-xs text-slate-500 mb-4">Envio para advogado externo de sua confiança.</p>
                <button onClick={() => setModalJuridico('PARTICULAR')} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">Iniciar Processo Externo</button>
              </div>
            </div>

            {/* Tabela de Acompanhamento (Lista de Processos Enviados) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">Processos Jurídicos em Acompanhamento</div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase">
                    <th className="p-4">Tipo</th><th className="p-4">Advogado</th><th className="p-4">Status</th><th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {juridicoProcessos.map(proc => (
                    <tr key={proc.id}>
                        <td className="p-4">{proc.tipo}</td>
                        <td className="p-4">{proc.advogado_email || 'Não definido'}</td>
                        <td className="p-4">{proc.status}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => navigate(`/juridico/processo/${proc.id}`)} className="text-indigo-600 font-bold hover:underline">Ver</button>
                        </td>
                    </tr>
                  ))}
                  {juridicoProcessos.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum processo jurídico lançado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO 6: CONFIGURAÇÕES DA EMPRESA */}
        {abaModo === 'CONFIGURACOES' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400" /> Configurações da Empresa Parceira</h2>
            
            {!credorConfig ? (
              <div className="text-center p-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando configurações...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* DADOS CADASTRAIS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b pb-2">Informações da Empresa</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Razão Social</span> <span className="font-semibold text-slate-800">{credorConfig.razao_social || 'Não informado'}</span></div>
                    <div><span className="text-slate-400 block text-[10px] uppercase font-bold">CNPJ</span> <span className="font-mono text-slate-800">{credorConfig.cnpj || 'Não informado'}</span></div>
                    <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Responsável</span> <span className="text-slate-800">{credorConfig.responsavel || 'Não informado'}</span></div>
                    <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Plano de Assinatura</span> <span className="inline-block mt-1 px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-md">{credorConfig.plano || 'START'}</span></div>
                  </div>
                </div>

                {/* PARÂMETROS DA RÉGUA DE COBRANÇA */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b pb-2">Parâmetros de Negociação Inteligente</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Taxa por Notificação (R$)</span>
                      <span className="font-bold text-slate-800">R$ {Number(credorConfig.taxa_notificacao_padrao || 0).toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Taxa de Êxito (Acordo)</span>
                      <span className="font-bold text-amber-600">{credorConfig.taxa_exito_credor_pct || 15}%</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Margem Aceitação Desconto</span>
                      <span className="font-bold text-slate-800">{credorConfig.margem_desconto_maximo || 20}%</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Parcelamento Máximo</span>
                      <span className="font-bold text-slate-800">{credorConfig.max_parcelas || 12}x</span>
                    </div>
                    <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Limite Propostas antes do Jurídico</span>
                      <span className="font-bold text-slate-800">{credorConfig.max_propostas_antes_juridico || 3} tentativas de acordo</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    * Estas configurações são utilizadas pela inteligência do sistema para aceitar ou recusar propostas de forma automatizada, bem como definir o momento de escalonamento para o departamento jurídico. Para alterar estes limites, entre em contato com a administração da Câmara.
                  </p>
                </div>

              </div>
            )}
          </div>
        )}

      {/* MODAL DETALHES DO DEVEDOR */}
      {modalDetalhesDevedor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{modalDetalhesDevedor.nome_devedor}</h2>
                <p className="text-sm font-mono text-slate-500">CPF/CNPJ: {modalDetalhesDevedor.cpf_cnpj}</p>
              </div>
              <button onClick={() => setModalDetalhesDevedor(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 font-bold">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Valor Original</p>
                  <p className="text-lg font-bold text-slate-800">R$ {Number(modalDetalhesDevedor.valor_divida || 0).toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status Atual</p>
                  <p className="text-sm font-bold text-slate-700">{modalDetalhesDevedor.status}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 border-b pb-2">Contato do Devedor</h3>
                <div className="text-sm text-slate-600">
                  <p><strong>WhatsApp:</strong> {modalDetalhesDevedor.telefone}</p>
                  <p><strong>E-mail:</strong> {modalDetalhesDevedor.email || 'Não informado'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 border-b pb-2">Histórico de Ações</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div>
                      <p className="font-bold text-slate-700">Dívida Inserida no Sistema</p>
                      <p className="text-slate-500">{new Date(modalDetalhesDevedor.criado_em).toLocaleString()}</p>
                    </div>
                  </div>
                  {modalDetalhesDevedor.status === 'CONVITE_ENVIADO' && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                      <div>
                        <p className="font-bold text-slate-700">Régua de Cobrança Iniciada</p>
                        <p className="text-slate-500">Notificações disparadas via E-mail/WhatsApp.</p>
                      </div>
                    </div>
                  )}
                  {modalDetalhesDevedor.status === 'PROPOSTA_ANALISE' && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                      <div>
                        <p className="font-bold text-slate-700">Proposta Recebida do Devedor</p>
                        <p className="text-slate-500">Aguardando análise de crédito.</p>
                      </div>
                    </div>
                  )}
                  {modalDetalhesDevedor.status === 'ACORDO_ACEITO' && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                      <div>
                        <p className="font-bold text-slate-700">Dívida Liquidada / Acordo Assinado</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex flex-wrap gap-2">
              {modalDetalhesDevedor.status !== 'ACORDO_ACEITO' && (
                <>
                  <button 
                    disabled={loading}
                    onClick={async () => {
                      if (!window.confirm("Deseja realmente dar baixa nesta cobrança como PAGA EXTERNAMENTE?")) return;
                      setLoading(true);
                      try {
                        await updateDoc(doc(db!, 'recovery_cobrancas', modalDetalhesDevedor.id), { status: 'ACORDO_ACEITO', data_baixa: new Date().toISOString(), metodo_baixa: 'MANUAL_CREDOR' });
                        alert("Cobrança baixada com sucesso!");
                        setModalDetalhesDevedor(null);
                      } catch (err) { alert("Erro ao dar baixa."); }
                      finally { setLoading(false); }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm"
                  >
                    Dar Baixa Manual (Pago)
                  </button>
                  <button 
                    disabled={loading}
                    onClick={async () => {
                      if (!window.confirm("Deseja escalonar este caso para a Câmara Arbitral GSA?")) return;
                      setLoading(true);
                      try {
                        await updateDoc(doc(db!, 'recovery_cobrancas', modalDetalhesDevedor.id), { status: 'AGUARDANDO_AUDIENCIA', data_escalonamento: new Date().toISOString() });
                        alert("Enviado para a Câmara GSA (Mediação/Arbitragem).");
                        setModalDetalhesDevedor(null);
                      } catch (err) { alert("Erro ao enviar."); }
                      finally { setLoading(false); }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm"
                  >
                    Escalonar Câmara GSA
                  </button>
                </>
              )}
              {modalDetalhesDevedor.status === 'PROPOSTA_ANALISE' && (
                <button 
                  onClick={() => { const c = modalDetalhesDevedor; setModalDetalhesDevedor(null); setModalGerenciarPropostaAnalise(c); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm"
                >
                  Analisar Proposta
                </button>
              )}
              <a 
                href={`/publico/negociar/${modalDetalhesDevedor.id}`} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"
              >
                Portal do Devedor <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>
        </div>
      )}

      {modalJuridico && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <JuridicoLaunchForm tipo={modalJuridico} onClose={() => setModalJuridico(null)} />
        </div>
      )}
      {modalRecovery && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCriarRecovery} className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div><h2 className="text-base font-bold text-slate-900">Cadastrar Dívida Extrajudicial</h2><p className="text-[11px] text-slate-400">Ativa a esteira de cobrança em tom suave com cálculo de taxa de 5% automática.</p></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input type="text" placeholder="Nome do Devedor" required className="p-2.5 border rounded-lg" value={formRecovery.nome_devedor} onChange={e => setFormRecovery({...formRecovery, nome_devedor: e.target.value})} />
              <input type="text" placeholder="CPF/CNPJ" required className="p-2.5 border rounded-lg" value={formRecovery.cpf_cnpj} onChange={e => setFormRecovery({...formRecovery, cpf_cnpj: e.target.value})} />
              <input type="text" placeholder="WhatsApp" required className="p-2.5 border rounded-lg" value={formRecovery.telefone} onChange={e => setFormRecovery({...formRecovery, telefone: e.target.value})} />
              <input type="email" placeholder="E-mail" required className="p-2.5 border rounded-lg" value={formRecovery.email} onChange={e => setFormRecovery({...formRecovery, email: e.target.value})} />
              <input type="number" step="0.01" placeholder="Valor da Dívida (R$)" required className="p-2.5 border rounded-lg font-bold text-amber-600" value={formRecovery.valor_divida} onChange={e => setFormRecovery({...formRecovery, valor_divida: e.target.value})} />
              <input type="date" required className="p-2.5 border rounded-lg text-slate-500" value={formRecovery.vencimento_original} onChange={e => setFormRecovery({...formRecovery, vencimento_original: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2 text-xs">
              <button type="button" onClick={() => setModalRecovery(false)} className="w-1/3 bg-slate-100 font-bold py-3 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" disabled={loading} className="w-2/3 bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md">{loading ? 'Salvando...' : 'Ativar Cobrança'}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EMISSÃO DE AR ONLINE / NOTIFICAÇÃO */}
      {modalAr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCriarAr} className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div><h2 className="text-base font-bold text-slate-900">Emitir Notificação Extrajudicial com AR</h2><p className="text-[11px] text-slate-400">Geração de NUP com tráfego omnichannel condicionado ao pagamento sistêmico.</p></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input type="text" placeholder="Nome do Notificado" required className="p-2.5 border rounded-lg" value={formAr.nome_notificado} onChange={e => setFormAr({...formAr, nome_notificado: e.target.value})} />
              <input type="text" placeholder="CPF ou CNPJ" required className="p-2.5 border rounded-lg" value={formAr.cpf_cnpj} onChange={e => setFormAr({...formAr, cpf_cnpj: e.target.value})} />
              <input type="text" placeholder="WhatsApp" required className="p-2.5 border rounded-lg" value={formAr.telefone} onChange={e => setFormAr({...formAr, telefone: e.target.value})} />
              <input type="email" placeholder="E-mail" required className="p-2.5 border rounded-lg" value={formAr.email} onChange={e => setFormAr({...formAr, email: e.target.value})} />
              <input type="text" placeholder="Endereço Físico Completo (Caso Postal)" className="col-span-2 p-2.5 border rounded-lg" value={formAr.endereco_completo} onChange={e => setFormAr({...formAr, endereco_completo: e.target.value})} />
              <textarea placeholder="Texto da Minuta da Notificação (Fatos e Fundamentos)" required className="col-span-2 p-2.5 border rounded-lg h-24 resize-none" value={formAr.texto_base} onChange={e => setFormAr({...formAr, texto_base: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2 text-xs">
              <button type="button" onClick={() => setModalAr(false)} className="w-1/3 bg-slate-100 font-bold py-3 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" className="w-2/3 bg-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-md">Gerar e Enviar para Fila</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ABRIR REQUERIMENTO DE PROCESSO CÂMARA GSA */}
      {modalRequerimento && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCriarRequerimento} className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div><h2 className="text-base font-bold text-slate-900">Protocolar Requerimento de Conflito</h2><p className="text-[11px] text-slate-400">Inicia um pedido formal de instauração de Mediação ou Arbitragem Privada.</p></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select className="col-span-2 p-2.5 border rounded-lg font-bold text-slate-700 bg-slate-50" value={formRequerimento.tipo_procedimento} onChange={e => setFormRequerimento({...formRequerimento, tipo_procedimento: e.target.value})}>
                <option value="Mediação">Instaurar Sessão de Mediação Privada</option>
                <option value="Arbitragem">Instaurar Tribunal de Arbitragem Extrajudicial</option>
              </select>
              <input type="text" placeholder="Parte Contraria (Requerido)" required className="p-2.5 border rounded-lg" value={formRequerimento.parte_contraria} onChange={e => setFormRequerimento({...formRequerimento, parte_contraria: e.target.value})} />
              <input type="text" placeholder="CPF/CNPJ da Parte Contraria" required className="p-2.5 border rounded-lg" value={formRequerimento.documento_contraria} onChange={e => setFormRequerimento({...formRequerimento, documento_contraria: e.target.value})} />
              <input type="text" placeholder="Objeto do Contrato / Disputa" className="col-span-2 p-2.5 border rounded-lg" value={formRequerimento.objeto_disputa} onChange={e => setFormRequerimento({...formRequerimento, objeto_disputa: e.target.value})} />
              <input type="number" placeholder="Valor Estimado da Causa (R$)" required className="col-span-2 p-2.5 border rounded-lg font-bold" value={formRequerimento.valor_causa} onChange={e => setFormRequerimento({...formRequerimento, valor_causa: e.target.value})} />
              <textarea placeholder="Resumo dos Fatos da Lide..." required className="col-span-2 p-2.5 border rounded-lg h-20 resize-none" value={formRequerimento.resumo_fatos} onChange={e => setFormRequerimento({...formRequerimento, resumo_fatos: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2 text-xs">
              <button type="button" onClick={() => setModalRequerimento(false)} className="w-1/3 bg-slate-100 font-bold py-3 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" className="w-2/3 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md">Protocolar e Autuar Pedido</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL AUXILIAR DE COMPRA/CSV (LOTE RECOVERY) */}
      {modalCsv && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-2 relative max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <button 
              onClick={() => setModalCsv(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-2 z-10 bg-slate-100 rounded-full"
            >
              ✕
            </button>
            <B2BUploadView embeddedTenantId={targetTenantId} onSuccess={() => setModalCsv(false)} />
          </div>
        </div>
      )}

      {/* MODAL: SIMULADOR DE NEGOCIAÇÃO DO DEVEDOR */}
      {modalTestarSimulador && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Simulador de Régua de Cobrança</span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Testar Experiência do Devedor</h2>
                <p className="text-[11px] text-slate-400">Vivencie a jornada exata do cliente devedor (da notificação ao acordo consensual).</p>
              </div>
              <button 
                onClick={() => setModalTestarSimulador(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {!linkSimuladoGerado ? (
              <form onSubmit={handleGerarFluxoTeste} className="space-y-4">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome do Devedor Fictício</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-amber-500 outline-none" 
                      value={formSimulador.nome_devedor} 
                      onChange={e => setFormSimulador({...formSimulador, nome_devedor: e.target.value})} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Valor do Débito (R$)</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-amber-500 outline-none font-bold text-slate-700" 
                        value={formSimulador.valor_divida} 
                        onChange={e => setFormSimulador({...formSimulador, valor_divida: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Desconto Oferecido (%)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        required 
                        className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-amber-500 outline-none font-bold text-emerald-600" 
                        value={formSimulador.proposta_desconto_pct} 
                        onChange={e => setFormSimulador({...formSimulador, proposta_desconto_pct: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
                  💡 <strong>Como funciona o teste?</strong> Ao clicar em "Gerar Fluxo de Teste", criamos uma cobrança simulada no banco de dados e geramos o link de negociação online. Você poderá abrir o portal em uma nova guia para aceitar o acordo ou agendar uma audiência!
                </div>

                <div className="flex gap-2 pt-2 text-xs">
                  <button type="button" onClick={() => setModalTestarSimulador(false)} className="w-1/3 bg-slate-100 font-bold py-3 rounded-xl text-slate-600">Cancelar</button>
                  <button type="submit" disabled={loading} className="w-2/3 bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-1.5">
                    {loading ? 'Gerando...' : 'Gerar Fluxo de Teste'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-xs space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Régua Consensual Ativa — Simulação de Canal de Disparo
                  </div>
                  
                  {/* WhatsApp Bubble Preview */}
                  <div className="bg-[#E4F2CE] p-3 rounded-xl border border-[#D5E6BC] font-sans shadow-sm text-slate-800 text-[11px] leading-relaxed relative">
                    <div className="absolute top-1 right-2 text-[9px] text-slate-500">14:02</div>
                    <p className="font-bold text-[#075E54] mb-1">Câmara Privada GSA • Recovery</p>
                    <p>
                      Olá, <strong>{formSimulador.nome_devedor}</strong>! A GSA Recovery, em representação de <strong>{profile?.nome_completo || 'Credor Simulador GSA'}</strong>, protocolou a proposta de composição amigável sob número de protocolo <strong>{protocoloSimulado}</strong> no rito consensual da Câmara Privada GSA. 
                    </p>
                    <p className="mt-1">
                      Regularize seu débito com desconto extrajudicial exclusivo de até <strong>{formSimulador.proposta_desconto_pct}%</strong> e evite o prosseguimento de medidas judiciais. 
                    </p>
                    <p className="mt-1 text-blue-600 underline font-semibold break-all">
                      {window.location.origin}{linkSimuladoGerado}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Olá, ${formSimulador.nome_devedor}! A GSA Recovery, em representação de ${profile?.nome_completo || 'Credor Simulador GSA'}, protocolou a proposta de composição amigável sob número de protocolo ${protocoloSimulado} no rito consensual da Câmara Privada GSA. Regularize seu débito com desconto extrajudicial exclusivo de até ${formSimulador.proposta_desconto_pct}% e evite o prosseguimento de medidas judiciais. Acesse seu portal seguro de negociação online: ${window.location.origin}${linkSimuladoGerado}`;
                        navigator.clipboard.writeText(msg);
                        alert("Mensagem de notificação copiada para a área de transferência!");
                      }}
                      className="flex-1 bg-white hover:bg-slate-50 border text-slate-700 font-bold py-2.5 rounded-xl text-[11px] text-center"
                    >
                      Copiar WhatsApp de Alerta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTestarSimulador(false);
                        window.open(linkSimuladoGerado, '_blank');
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-[11px] text-center shadow-md flex items-center justify-center gap-1.5"
                    >
                      Abrir Portal do Devedor <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-[11px] text-indigo-900 leading-relaxed space-y-1.5">
                  <p className="font-bold flex items-center gap-1">🧪 Como realizar o teste interativo:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Clique no botão verde acima para abrir o <strong>Portal de Negociação</strong> na pele do devedor;</li>
                    <li>No portal, experimente aceitar a proposta ou agendar uma audiência virtual de mediação técnica de 72h;</li>
                    <li>Volte para esta aba e veja o status ser atualizado em tempo real na sua listagem de cobranças!</li>
                  </ol>
                </div>

                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => setModalTestarSimulador(false)} 
                    className="text-xs text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                  >
                    Concluir Teste
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR MEDIAÇÃO */}
      {modalGerenciarMediacao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold text-slate-900">Gerenciar Mediação</h2>
              <button onClick={() => setModalGerenciarMediacao(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>
            <div className="text-sm space-y-2 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p><strong>Devedor:</strong> {modalGerenciarMediacao.nome_devedor}</p>
              <p><strong>Proposta Sugerida:</strong> R$ {modalGerenciarMediacao.audiencia_agendada?.proposta_sugerida}</p>
              <p><strong>Declaração Amigável:</strong> {modalGerenciarMediacao.audiencia_agendada?.declaracao_amigavel}</p>
              <p><strong>Data Solicitada:</strong> {modalGerenciarMediacao.audiencia_agendada?.data} às {modalGerenciarMediacao.audiencia_agendada?.hora}</p>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => handleAprovarMediacao(modalGerenciarMediacao.id)}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md text-sm"
              >
                Aprovar Agendamento
              </button>
              <button 
                onClick={() => handleRejeitarMediacao(modalGerenciarMediacao.id)}
                disabled={loading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl border border-red-100 text-sm"
              >
                Rejeitar Solicitação
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase">Propor Nova Data</p>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  className="p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  value={novaDataMediacao} 
                  onChange={e => setNovaDataMediacao(e.target.value)} 
                />
                <input 
                  type="time" 
                  className="p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  value={novaHoraMediacao} 
                  onChange={e => setNovaHoraMediacao(e.target.value)} 
                />
              </div>
              <button 
                onClick={() => handleProporNovaDataMediacao(modalGerenciarMediacao.id)}
                disabled={loading || !novaDataMediacao || !novaHoraMediacao}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md text-sm"
              >
                Propor Nova Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR PROPOSTA EM ANÁLISE */}
      {modalGerenciarPropostaAnalise && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold text-slate-900">Analisar Proposta</h2>
              <button onClick={() => setModalGerenciarPropostaAnalise(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>
            <div className="text-sm space-y-2 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p><strong>Devedor:</strong> {modalGerenciarPropostaAnalise.nome_devedor}</p>
              <p><strong>Valor Proposto (R$):</strong> {modalGerenciarPropostaAnalise.proposta_devedor?.valor}</p>
              <p><strong>Forma de Pagamento:</strong> {modalGerenciarPropostaAnalise.proposta_devedor?.forma_pagamento}</p>
              <p><strong>Explicação / Defesa:</strong> {modalGerenciarPropostaAnalise.proposta_devedor?.explicacao_defesa}</p>
              <p className="text-[10px] text-slate-400">Enviada em: {new Date(modalGerenciarPropostaAnalise.proposta_devedor?.data_envio).toLocaleString('pt-BR')}</p>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => handleAprovarPropostaAnalise(modalGerenciarPropostaAnalise.id)}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md text-sm"
              >
                Aprovar Proposta
              </button>
              <button 
                onClick={() => handleRejeitarPropostaAnalise(modalGerenciarPropostaAnalise.id)}
                disabled={loading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl border border-red-100 text-sm"
              >
                Rejeitar Proposta
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
