import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, FileText, Calendar, CheckCircle2, AlertTriangle, MessageSquare, Loader2, DollarSign, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function DebtorNegotiationPortal() {
  const { cobrancaId } = useParams<{ cobrancaId: string }>();
  const [cobranca, setCobranca] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [fluxo, setFluxo] = useState<'INICIAL' | 'ACEITAR_OPCOES' | 'NEGOCIAR_ACORDO' | 'PROPOSTA_ENVIADA' | 'ACEITO' | 'AGENDAR_AUDIENCIA' | 'AUDIENCIA_MARCADA' | 'CONFIRMAR_RECUSA' | 'RECUSADO'>('INICIAL');

  // Campos para agendamento de mediação técnica em 72h e negociação
  const [agendaData, setAgendaData] = useState('');
  const [agendaHora, setAgendaHora] = useState('');
  const [propostaSugerida, setPropostaSugerida] = useState('');
  const [formaPagamentoSugerida, setFormaPagamentoSugerida] = useState('');
  const [declaracaoAmigavel, setDeclaracaoAmigavel] = useState('');

  // Campos para aceitação do acordo
  const [opcaoProposta, setOpcaoProposta] = useState<'A_VISTA' | 'PARCELADO'>('A_VISTA');
  const [opcaoPagamento, setOpcaoPagamento] = useState<'AGORA' | 'AGENDAR'>('AGORA');
  const [dataAgendamentoPagamento, setDataAgendamentoPagamento] = useState('');

  useEffect(() => {
    if (!cobrancaId) return;
    const puxarCobranca = async () => {
      try {
        const snap = await getDoc(doc(db!, 'recovery_cobrancas', cobrancaId));
        if (snap.exists()) {
          const data = snap.data();
          setCobranca({ id: snap.id, ...data });
          if (data.status === 'ACORDO_ACEITO') setFluxo('ACEITO');
          if (data.status === 'AGUARDANDO_AUDIENCIA') setFluxo('AUDIENCIA_MARCADA');
          if (data.status === 'RECUSADO') setFluxo('RECUSADO');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    puxarCobranca();
  }, [cobrancaId]);

  const handleConfirmarAcordo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobranca) return;
    setProcessandoAcao(true);
    try {
      // 1. Atualiza status no banco com os detalhes da negociação
      await updateDoc(doc(db!, 'recovery_cobrancas', cobranca.id), {
        status: 'ACORDO_ACEITO',
        data_aceite: new Date().toISOString(),
        detalhes_acordo: {
          opcao_proposta: opcaoProposta,
          opcao_pagamento: opcaoPagamento,
          data_agendamento_pagamento: opcaoPagamento === 'AGENDAR' ? dataAgendamentoPagamento : null,
          parcelas_selecionadas: opcaoProposta === 'PARCELADO' ? cobranca.parcelas_max : 1
        }
      });

      // 2. Dispara chamada interna para o backend gerar a cobrança oficial no Asaas
      await axios.post('/api/recovery/gerar-cobranca-acordo', {
        cobrancaId: cobranca.id
      });

      setFluxo('ACEITO');
    } catch (e: any) {
      alert(`Erro ao registrar aceite do acordo: ${e.response?.data?.error || e.message}`);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleAceitarAcordoDireto = async () => {
    if (!cobranca) return;
    setProcessandoAcao(true);
    try {
      // Aceite direto simplificado (À Vista / Pagar agora)
      await updateDoc(doc(db!, 'recovery_cobrancas', cobranca.id), {
        status: 'ACORDO_ACEITO',
        data_aceite: new Date().toISOString(),
        detalhes_acordo: {
          opcao_proposta: 'A_VISTA',
          opcao_pagamento: 'AGORA',
          data_agendamento_pagamento: null,
          parcelas_selecionadas: 1
        }
      });

      await axios.post('/api/recovery/gerar-cobranca-acordo', {
        cobrancaId: cobranca.id
      });

      setFluxo('ACEITO');
    } catch (e: any) {
      alert(`Erro ao registrar aceite do acordo: ${e.response?.data?.error || e.message}`);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleAgendarAudiencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessandoAcao(true);
    try {
      const linkGoogleMeetSimulado = `https://meet.google.com/gsa-rec-${Math.random().toString(36).substring(2, 6)}`;
      
      await updateDoc(doc(db!, 'recovery_cobrancas', cobranca.id), {
        status: 'AGUARDANDO_AUDIENCIA',
        audiencia_agendada: {
          data: agendaData,
          hora: agendaHora,
          linkMeet: linkGoogleMeetSimulado,
          mediador: 'Mediador Plantonista GSA',
          proposta_sugerida: propostaSugerida,
          declaracao_amigavel: declaracaoAmigavel
        }
      });

      // Dispara envio de e-mail/WhatsApp com o convite da audiência
      await axios.post('/api/recovery/notificar-audiencia', {
        cobrancaId: cobranca.id,
        data: agendaData,
        hora: agendaHora,
        linkMeet: linkGoogleMeetSimulado
      });

      setFluxo('AUDIENCIA_MARCADA');
    } catch (e) {
      alert("Erro ao solicitar agendamento de mediação.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleEnviarPropostaAnalise = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessandoAcao(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobranca.id), {
        status: 'PROPOSTA_ANALISE',
        proposta_devedor: {
          valor: propostaSugerida,
          forma_pagamento: formaPagamentoSugerida,
          explicacao_defesa: declaracaoAmigavel,
          data_envio: new Date().toISOString()
        }
      });
      setFluxo('PROPOSTA_ENVIADA');
    } catch (e) {
      alert("Erro ao enviar proposta para análise.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleConfirmarRecusaDefinitiva = async () => {
    setProcessandoAcao(true);
    try {
      await updateDoc(doc(db!, 'recovery_cobrancas', cobranca.id), {
        status: 'RECUSADO',
        data_recusa: new Date().toISOString()
      });
      setFluxo('RECUSADO');
    } catch (e) {
      alert("Erro ao registrar recusa.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>;
  if (!cobranca) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">O link desta negociação está inválido ou expirou.</div>;

  const valorComDesconto = cobranca.valor_divida * (1 - (cobranca.proposta_desconto_pct / 100));
  const valorFinalComTaxa = valorComDesconto + cobranca.taxa_operacional_devedor;
  const valorParcela = valorFinalComTaxa / cobranca.parcelas_max;

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 font-sans flex flex-col items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* IDENTIFICAÇÃO DO PORTAL */}
        <div className="text-center text-white space-y-2">
          {cobranca.logo_credor ? (
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-2xl shadow-lg inline-block">
                <img src={cobranca.logo_credor} alt={cobranca.nome_credor} className="h-12 w-auto object-contain" />
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-serif font-black tracking-tight text-amber-400">GSA RECOVERY</h1>
          )}
          <p className="text-xs text-slate-400">Câmara Privada de Conciliação e Composição Extrajudicial</p>
          <div className="inline-flex gap-4 text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full font-mono text-slate-300">
            <span>Protocolo: {cobranca.protocolo}</span>
            <span>ID: {cobranca.id.slice(0, 6).toUpperCase()}</span>
          </div>
        </div>

        {/* FLUXO 1: APRESENTAÇÃO DA PROPOSTA EXTRAJUDICIAL */}
        {fluxo === 'INICIAL' && (
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 space-y-6 border border-slate-100 animate-in fade-in zoom-in-95">
            
            {/* TEXTO INSTITUCIONAL SUAVE E SEGURO */}
            <div className="bg-amber-50/80 border border-amber-100 p-4 rounded-xl text-xs text-amber-900 font-semibold leading-relaxed text-center italic">
              "Trata-se de proposta de composição extrajudicial visando solução consensual da obrigação, evitando medidas judiciais cabíveis."
            </div>

            <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p><strong>Empresa Credora:</strong> {cobranca.nome_credor || 'Instituição Parceira GSA'}</p>
              <p><strong>Devedor Notificado:</strong> {cobranca.nome_devedor}</p>
              <p><strong>Vencimento Original:</strong> {new Date(cobranca.vencimento_original).toLocaleDateString('pt-BR')}</p>
              <p><strong>Valor da Obrigação Original:</strong> R$ {cobranca.valor_divida?.toFixed(2)}</p>
              {cobranca.proposta_desconto_pct > 0 && (
                <p className="text-emerald-600 font-semibold"><strong>Desconto Extrajudicial Aplicado:</strong> {cobranca.proposta_desconto_pct}%</p>
              )}
            </div>

            <div className="text-center bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden shadow-inner">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Valor Líquido Composto</span>
              <h2 className="text-4xl font-black text-amber-400 mt-1">R$ {valorFinalComTaxa?.toFixed(2)}</h2>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Incluso Taxa Operacional/Mediação: R$ {cobranca.taxa_operacional_devedor?.toFixed(2)}
              </p>
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300">
                Opção de Parcelamento: <span className="text-white font-bold">{cobranca.parcelas_max}x de R$ {valorParcela?.toFixed(2)}</span> sem juros
              </div>
            </div>

            {/* BOTÕES DE ACEITE E NEGOCIAÇÃO (OS 4 BOTÕES DO PROCESSO CONSENSUAL) */}
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => setFluxo('ACEITAR_OPCOES')} 
                disabled={processandoAcao}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {processandoAcao ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ACEITAR ACORDO EXTRAJUDICIAL'}
              </button>

              <button 
                onClick={() => setFluxo('NEGOCIAR_ACORDO')} 
                disabled={processandoAcao}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                NEGOCIAR ACORDO
              </button>
              
              <button 
                onClick={() => setFluxo('AGENDAR_AUDIENCIA')} 
                disabled={processandoAcao}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold py-3.5 rounded-xl text-sm transition-all uppercase tracking-wider"
              >
                SOLICITAR MEDIAÇÃO EM 72H
              </button>

              <button 
                onClick={() => setFluxo('CONFIRMAR_RECUSA')}
                disabled={processandoAcao}
                className="w-full text-center text-xs font-bold text-red-500 hover:text-red-600 py-2.5 transition-colors uppercase tracking-wider hover:underline"
              >
                RECUSAR PROPOSTA
              </button>
            </div>
          </div>
        )}

        {/* FLUXO 1.2: ACEITAR OPÇÕES DE ACORDO */}
        {fluxo === 'ACEITAR_OPCOES' && (
          <form onSubmit={handleConfirmarAcordo} className="bg-white rounded-[2rem] p-6 md:p-8 space-y-5 shadow-2xl animate-in slide-in-from-right-4">
            <div className="text-center">
              <DollarSign className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Aceitar Acordo</h2>
              <p className="text-xs text-slate-500 mt-1">Como você deseja realizar o pagamento?</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Qual proposta será aceita?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setOpcaoProposta('A_VISTA')} className={`p-3 rounded-xl border text-sm font-bold transition-colors ${opcaoProposta === 'A_VISTA' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    À vista
                  </button>
                  <button type="button" onClick={() => setOpcaoProposta('PARCELADO')} className={`p-3 rounded-xl border text-sm font-bold transition-colors ${opcaoProposta === 'PARCELADO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    Parcelado
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Quando será o pagamento?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setOpcaoPagamento('AGORA')} className={`p-3 rounded-xl border text-sm font-bold transition-colors ${opcaoPagamento === 'AGORA' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    Pagar Agora
                  </button>
                  <button type="button" onClick={() => setOpcaoPagamento('AGENDAR')} className={`p-3 rounded-xl border text-sm font-bold transition-colors ${opcaoPagamento === 'AGENDAR' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    Agendar Data
                  </button>
                </div>
              </div>

              {opcaoPagamento === 'AGENDAR' && (
                <div className="animate-in fade-in zoom-in-95">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Data de Pagamento</label>
                  <input type="date" required className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" value={dataAgendamentoPagamento} onChange={e => setDataAgendamentoPagamento(e.target.value)} />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setFluxo('INICIAL')} className="w-1/3 bg-slate-100 font-bold p-3.5 rounded-xl text-slate-700 text-sm">Voltar</button>
              <button type="submit" disabled={processandoAcao} className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e Aceitar'}
              </button>
            </div>
          </form>
        )}

        {/* FLUXO 1.5: NEGOCIAR ACORDO (ENVIO DE PROPOSTA PARA ANÁLISE) */}
        {fluxo === 'NEGOCIAR_ACORDO' && (
          <form onSubmit={handleEnviarPropostaAnalise} className="bg-white rounded-[2rem] p-6 md:p-8 space-y-5 shadow-2xl animate-in slide-in-from-right-4">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Negociação Online</h2>
              <p className="text-xs text-slate-500 mt-1">Valor Original da Dívida: <strong>R$ {cobranca.valor_divida?.toFixed(2)}</strong></p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Qual valor você propõe pagar? (R$)</label>
                <input required type="number" step="0.01" className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-slate-500 outline-none" value={propostaSugerida} onChange={e => setPropostaSugerida(e.target.value)} placeholder="0.00" />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Forma de Pagamento Desejada</label>
                <select required className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-slate-500 outline-none" value={formaPagamentoSugerida} onChange={e => setFormaPagamentoSugerida(e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="A_VISTA">À vista</option>
                  <option value="PARCELADO">Parcelado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Explicação da Proposta / Defesa</label>
                <textarea required rows={4} className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-slate-500 outline-none resize-none" value={declaracaoAmigavel} onChange={e => setDeclaracaoAmigavel(e.target.value)} placeholder="Detalhe como pretende pagar, datas sugeridas ou qualquer informação que justifique sua proposta..."></textarea>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setFluxo('INICIAL')} className="w-1/3 bg-slate-100 font-bold p-3.5 rounded-xl text-slate-700 text-sm">Voltar</button>
              <button type="submit" disabled={processandoAcao} className="w-2/3 bg-slate-800 hover:bg-slate-900 text-white font-bold p-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar para Análise'}
              </button>
            </div>
          </form>
        )}

        {/* FLUXO: PROPOSTA ENVIADA */}
        {fluxo === 'PROPOSTA_ENVIADA' && (
          <div className="bg-white rounded-[2rem] p-6 md:p-8 text-center space-y-5 animate-in zoom-in-95 shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-black text-slate-900">Proposta Enviada!</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sua proposta foi encaminhada com sucesso para o credor. Retornaremos o contato em breve com o resultado da análise.
            </p>
          </div>
        )}

        {/* FLUXO: CONFIRMAR RECUSA */}
        {fluxo === 'CONFIRMAR_RECUSA' && (
          <div className="bg-white rounded-[2rem] p-6 md:p-8 space-y-5 shadow-2xl animate-in slide-in-from-right-4 border-t-8 border-red-500">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <h2 className="text-xl font-black text-slate-900">Aviso Importante</h2>
            </div>
            
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-sm text-red-900 font-medium leading-relaxed text-center">
              A recusa da proposta extrajudicial <strong className="font-black">não impede a cobrança da dívida</strong>. 
            </div>

            <p className="text-sm text-slate-600 text-center leading-relaxed">
              Por ciência da tentativa de composição amigável esgotada, a credora poderá prosseguir com o processo judicial para recebimento forçado do crédito, incluindo o <strong>possível pedido de penhora de contas bancárias e bens materiais registrados em seu nome</strong>, além da inclusão nos órgãos de restrição (SPC/Serasa/Protesto).
            </p>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setFluxo('NEGOCIAR_ACORDO')} 
                disabled={processandoAcao}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-sm uppercase tracking-wider"
              >
                Negociar Dívida Agora
              </button>
              
              <button 
                onClick={handleConfirmarRecusaDefinitiva}
                disabled={processandoAcao}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {processandoAcao ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar a recusa da proposta'}
              </button>
              
              <button 
                onClick={() => setFluxo('INICIAL')} 
                disabled={processandoAcao}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 py-2 mt-2 transition-colors"
              >
                Voltar para o início
              </button>
            </div>
          </div>
        )}

        {/* FLUXO 2: ACORDO ACEITO (GERAÇÃO INSTANTÂNEA ASAAS) */}
        {fluxo === 'ACEITO' && (
          <div className="bg-white rounded-[2rem] p-6 md:p-8 text-center space-y-5 animate-in zoom-in-95 shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-black text-slate-900">Acordo Formalizado!</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              O sistema homologou o aceite digital e registrou o termo na Câmara GSA. A cobrança foi gerada via gateway financeiro Asaas.
            </p>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="w-40 h-40 bg-white mx-auto rounded-xl shadow-sm border-2 border-slate-200 p-2 flex flex-col items-center justify-center text-slate-400 text-xs font-bold font-mono">
                [QR CODE PIX ASAAS]
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Pix Copia e Cola</span>
                <input readOnly value="00020126580014BR.GOV.BCB.PIX..." className="w-full text-center text-xs mt-1 p-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-500 focus:outline-none" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-500"/> Baixa automática via Webhook e envio de recibo.</p>
          </div>
        )}

        {/* FLUXO 3: FORMULÁRIO DE AGENDAMENTO DE MEDIAÇÃO (SE NÃO ACEITAR) */}
        {fluxo === 'AGENDAR_AUDIENCIA' && (
          <form onSubmit={handleAgendarAudiencia} className="bg-white rounded-[2rem] p-6 md:p-8 space-y-4 shadow-2xl animate-in slide-in-from-right-4">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Solicitar Mediação Online</h2>
              <p className="text-xs text-slate-500 mt-1">A empresa credora irá analisar sua solicitação. Se aprovada, a sessão será via Google Meet.</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Qual seria sua contra-proposta justa? (R$)</label>
                <input type="number" required placeholder="Valor que você pode pagar" className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={propostaSugerida} onChange={e => setPropostaSugerida(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Como podemos resolver amigavelmente?</label>
                <textarea required placeholder="Explique brevemente sua situação e como você pretende resolver o caso..." className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]" value={declaracaoAmigavel} onChange={e => setDeclaracaoAmigavel(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Data Sugerida</label>
                  <input type="date" required className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={agendaData} onChange={e => setAgendaData(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Horário Sugerido</label>
                  <input type="time" required className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={agendaHora} onChange={e => setAgendaHora(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setFluxo('INICIAL')} className="w-1/3 bg-slate-100 font-bold p-3.5 rounded-xl text-slate-700 text-sm">Voltar</button>
              <button type="submit" disabled={processandoAcao} className="w-2/3 bg-slate-900 text-white font-bold p-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Solicitar Agendamento'}
              </button>
            </div>
          </form>
        )}

        {/* FLUXO 4: AUDIÊNCIA INTEGRADA COM AGENDAMENTO CONCLUÍDO */}
        {fluxo === 'AUDIENCIA_MARCADA' && (
          <div className="bg-white rounded-[2rem] p-6 md:p-8 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <MessageSquare className="w-16 h-16 text-indigo-500 mx-auto" />
            <h2 className="text-2xl font-black text-slate-900">Sessão de Mediação Agendada!</h2>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              O convite foi protocolado no sistema. O mediador da Câmara irá presidir o ato online focado na redução de conflito e formalização da proposta.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 text-left space-y-1">
              <p>📅 <strong>Data:</strong> {new Date(cobranca.audiencia_agendada?.data).toLocaleDateString('pt-BR')}</p>
              <p>⏰ <strong>Horário:</strong> {cobranca.audiencia_agendada?.hora}</p>
              <p>👤 <strong>Presidido por:</strong> {cobranca.audiencia_agendada?.mediador}</p>
            </div>

            <a 
              href={cobranca.audiencia_agendada?.linkMeet} 
              target="_blank" rel="noreferrer" 
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"
            >
              Entrar na Sala Virtual (Google Meet) <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* FLUXO 5: PROPOSTA RECUSADA */}
        {fluxo === 'RECUSADO' && (
          <div className="bg-white rounded-[2rem] p-8 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-black text-slate-900">Fase Consensual Encerrada</h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              A proposta de composição foi recusada pelo devedor. O histórico da tentativa de negociação extrajudicial foi salvo para subsidiar futuras medidas jurídicas cabíveis pela empresa credora.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
