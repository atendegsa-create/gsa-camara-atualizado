import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Scale, CheckCircle2, MessageSquare, ShieldCheck, AlertCircle, Send, Landmark, MessageCircle, ArrowLeft } from 'lucide-react';
import { NegotiationChat } from './NegotiationChat';

export const ClientPortalView: React.FC = () => {
  const { tenantSlug, notificacaoId } = useParams<{ tenantSlug: string, notificacaoId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processo, setProcesso] = useState<any>(null);
  const [tenantBranding, setTenantBranding] = useState({ primaryColor: '#0f172a', logoUrl: '', nome: 'Câmara de Mediação' });
  
  const [viewState, setViewState] = useState<'VISUALIZACAO' | 'CONTRAPROPOSTA' | 'CHAT_BOT' | 'SUCESSO'>('VISUALIZACAO');
  const [valorContraproposta, setValorContraproposta] = useState('');
  const [mensagemContraproposta, setMensagemContraproposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        if (!notificacaoId || !tenantSlug) throw new Error("Link inválido.");

        // 1. Busca a Notificação (AR)
        const arRef = doc(db, 'notificacoes_ar', notificacaoId);
        const arSnap = await getDoc(arRef);
        
        if (!arSnap.exists()) throw new Error("Notificação não encontrada ou expirada.");
        const arData = arSnap.data();

        // 2. Busca os dados do Processo
        const procRef = doc(db, 'processos', arData.processoId);
        const procSnap = await getDoc(procRef);
        if (!procSnap.exists()) throw new Error("Processo não encontrado.");
        setProcesso({ id: procSnap.id, ...procSnap.data() });

        // 3. Busca o White-Label do Tenant
        const tenantRef = doc(db, 'tenants', tenantSlug);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
          const tData = tenantSnap.data();
          if (tData.white_label) {
            setTenantBranding({
              primaryColor: tData.white_label.primaryColor || '#0f172a',
              logoUrl: tData.white_label.logoUrl || '',
              nome: tData.white_label.nomeAssinatura || tData.nome_unidade || 'Câmara GSA'
            });
          }
        }
      } catch (err: any) {
        setErro(err.message || 'Ocorreu um erro ao carregar os dados.');
      } finally {
        setLoading(false);
      }
    };

    buscarDados();
  }, [notificacaoId, tenantSlug]);

  const handleAceitarAcordo = async () => {
    if (!window.confirm("Confirma a aceitação dos termos propostos? Esta ação tem validade jurídica.")) return;
    
    setEnviando(true);
    try {
      await updateDoc(doc(db, 'processos', processo.id), {
        status: 'ACORDO_ACEITO',
        data_aceite: serverTimestamp(),
        historico: 'O Requerido aceitou a proposta inicial via Portal de Negociação.'
      });
      setViewState('SUCESSO');
    } catch (error) {
      alert("Erro ao registar aceite. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarContraproposta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    
    try {
      await updateDoc(doc(db, 'processos', processo.id), {
        status: 'EM_NEGOCIACAO',
        contraproposta_valor: Number(valorContraproposta),
        contraproposta_mensagem: mensagemContraproposta,
        data_contraproposta: serverTimestamp(),
        ultima_atualizacao: serverTimestamp()
      });
      setViewState('SUCESSO');
    } catch (error) {
      alert("Erro ao enviar contraproposta.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;
  if (erro) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><div className="bg-red-50 text-red-600 p-6 rounded-xl max-w-md w-full text-center border border-red-200"><AlertCircle className="w-12 h-12 mx-auto mb-4" />{erro}</div></div>;
  if (!processo) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* HEADER WHITE-LABEL */}
      <header 
        className="w-full p-4 shadow-md flex items-center justify-center"
        style={{ backgroundColor: tenantBranding.primaryColor }}
      >
        {tenantBranding.logoUrl ? (
          <img src={tenantBranding.logoUrl} alt="Logo" className="h-10 object-contain" />
        ) : (
          <h1 className="text-white font-bold text-xl flex items-center gap-2">
            <Landmark className="w-6 h-6" /> {tenantBranding.nome}
          </h1>
        )}
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        
        {viewState === 'SUCESSO' ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Resposta Registada!</h2>
            <p className="text-slate-600 mb-6">
              A sua decisão foi enviada de forma segura para a Câmara. O procurador responsável entrará em contacto consigo muito em breve para a assinatura do Termo Oficial.
            </p>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
               <ShieldCheck className="w-4 h-4" /> Autenticado digitalmente
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="p-6 md:p-8 space-y-6">
              <div className="text-center border-b border-slate-100 pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4 text-slate-600">
                  <Scale className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Convite de Mediação Extrajudicial</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Olá, <strong>{processo.parte_contraria_nome}</strong>. Existe um procedimento aberto em seu nome.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Requerente</span>
                  <p className="font-bold text-slate-800">{processo.cliente_nome}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Resumo da Causa</span>
                  <p className="text-sm text-slate-700 mt-1">{processo.resumo_fato}</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Valor em Discussão</span>
                  <p className="text-2xl font-bold" style={{ color: tenantBranding.primaryColor }}>
                    R$ {Number(processo.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {viewState === 'VISUALIZACAO' && (
                <div className="space-y-3 pt-4">
                  <button 
                    onClick={handleAceitarAcordo}
                    disabled={enviando}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Aceitar Acordo
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setViewState('CHAT_BOT')}
                      className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                      style={{ backgroundColor: tenantBranding.primaryColor }}
                    >
                      <MessageCircle className="w-5 h-5" /> Negociar via Chat IA
                    </button>
                    <button 
                      onClick={() => setViewState('CONTRAPROPOSTA')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <MessageSquare className="w-5 h-5" /> Proposta Manual
                    </button>
                  </div>
                </div>
              )}

              {viewState === 'CHAT_BOT' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <button 
                    onClick={() => setViewState('VISUALIZACAO')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar para o painel principal
                  </button>
                  <NegotiationChat 
                    processId={processo.id}
                    tenantBranding={tenantBranding}
                    onStatusChange={(newStatus) => {
                      if (newStatus === 'ACORDO_FECHADO') {
                        setTimeout(() => {
                          setViewState('SUCESSO');
                        }, 2500);
                      }
                    }}
                  />
                </div>
              )}

              {viewState === 'CONTRAPROPOSTA' && (
                <form onSubmit={handleEnviarContraproposta} className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
                  <h3 className="font-bold text-slate-800">Nova Proposta (Blind Bidding)</h3>
                  <p className="text-xs text-slate-500 mb-4">A sua contraproposta será analisada de forma sigilosa pela Câmara.</p>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Oferecido (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      value={valorContraproposta}
                      onChange={(e) => setValorContraproposta(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                      placeholder="Ex: 1500.00" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Justificação / Condições de Pagamento</label>
                    <textarea 
                      required
                      value={mensagemContraproposta}
                      onChange={(e) => setMensagemContraproposta(e.target.value)}
                      rows={3} 
                      className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                      placeholder="Ex: Proponho pagar em 3 parcelas..." 
                    />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setViewState('VISUALIZACAO')} className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-lg transition-all">
                      Cancelar
                    </button>
                    <button type="submit" disabled={enviando} style={{ backgroundColor: tenantBranding.primaryColor }} className="w-2/3 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50">
                      {enviando ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Proposta</>}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}
        
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4" /> Plataforma de Resolução de Conflitos GSA - Ambiente Seguro
        </p>
      </main>
    </div>
  );
}
