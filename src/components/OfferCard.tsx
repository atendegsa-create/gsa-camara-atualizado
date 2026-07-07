import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, CheckCircle2, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import CheckoutModal from './CheckoutModal';
import { PROPOSTAS, Faixa } from '../lib/pricing';

interface OfferCardProps {
  data: {
    nome?: string;
    faixa?: Faixa;
    valorFaixa?: string;
    whatsapp?: string;
    email?: string;
  };
  onAccept?: (plano: 'vista' | 'entrada' | 'diagnostico') => void;
  loading?: boolean;
  tenantSlug?: string;
}

export default function OfferCard({ data, loading, tenantSlug }: OfferCardProps) {
  const [plano, setPlano] = useState<'vista' | 'entrada' | 'diagnostico' | 'atendimento' | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [view, setView] = useState<'offer' | 'objective' | 'selection' | 'diagnostico_details'>('offer');
  const [config, setConfig] = useState<any>(null);

  const proposta = PROPOSTAS[data.faixa || 'ate50'];

  React.useEffect(() => {
    fetch('/api/config/master')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setConfig(data))
      .catch(err => console.error("Error fetching config:", err));
  }, []);

  // === CONFIGURAÇÃO DE LINKS ===
  const WHATSAPP_NUMBER = "5511999999999"; 

  React.useEffect(() => {
    if (data.faixa === 'diagnostico' && view !== 'diagnostico_details') {
      setView('diagnostico_details');
    }
  }, [data.faixa]);

  const WHATSAPP_MSG_CONTRATACAO = `Olá, gostaria de agendar minha contratação do Protocolo Limpa Nome. Meu nome é ${data.nome}.`;
  const WHATSAPP_MSG_DUVIDA = `Olá, vim pelo Quiz Limpa Nome e gostaria de tirar algumas dúvidas. Meu nome é ${data.nome}.`;
  
  const whatsappUrlContratacao = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG_CONTRATACAO)}`;
  const whatsappUrlDuvidas = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG_DUVIDA)}`;
  // =============================

  const handleSelectPlano = (p: 'vista' | 'entrada' | 'diagnostico' | 'atendimento') => {
    if (p === 'diagnostico' && view !== 'diagnostico_details') {
      setView('diagnostico_details');
    } else {
      setPlano(p);
      setShowCheckout(true);
    }
  };

  const renderContent = () => {
    if (showThankYou) {
      return (
        <div className="max-w-xl mx-auto p-6 md:p-16 flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] text-center space-y-8 bg-white rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-50">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 border-8 border-green-50 shadow-xl">
            <CheckCircle2 size={40} className="md:w-12 md:h-12" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
            Agradecemos pelo contato!
          </h2>
          <p className="text-slate-500 font-medium text-base md:text-lg px-4">
            Se você tiver qualquer dúvida, a nossa equipe de especialistas está pronta para ajudar.
          </p>

          <div className="pt-8 w-full space-y-4">
            <a
              href={whatsappUrlDuvidas}
              target="_blank"
              rel="noreferrer"
              className="block w-full py-4 md:py-5 bg-[#25D366] text-white text-center rounded-2xl font-bold text-lg hover:bg-[#128C7E] transition-colors shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Falar com especialistas
            </a>
            <button
              onClick={() => window.location.href = '/'}
              className="block w-full py-4 text-slate-400 text-center rounded-2xl font-bold text-sm hover:text-slate-600 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }

    if (view === 'diagnostico_details') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 md:p-14 rounded-[48px] md:rounded-[64px] border border-slate-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] space-y-12"
        >
          <div className="space-y-10 md:space-y-14">
            {/* Header com Badge */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-50 pb-10">
              <button 
                onClick={() => setView('offer')}
                className="text-slate-400 font-bold text-[10px] md:text-[11px] uppercase tracking-[0.25em] hover:text-indigo-600 transition-all flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-all shadow-sm">
                  <span className="group-hover:-translate-x-1 transition-transform text-lg">←</span>
                </div>
                Voltar à Proposta
              </button>
              <div className="inline-flex items-center gap-3 bg-indigo-50/50 text-indigo-700 px-6 py-2.5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 shadow-sm">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                Comunicado Prioritário
              </div>
            </div>

            {/* Título Principal */}
            <div className="space-y-8 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Diagnóstico <span className="text-indigo-600 italic">Antifraude</span> e Levantamento de Restrições.
              </h2>
              <p className="text-slate-500 font-medium text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                Realizamos uma varredura profunda em <span className="text-indigo-600 font-bold">todos os birôs</span> e sistemas internos bancários para identificar o que trava o seu crédito hoje.
              </p>
            </div>

            {/* Grade de Itens - Bento Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               {[
                  { title: "Raio-X de Dívidas", desc: "Listagem de cada centavo devido e juros acumulados.", icon: "📊", color: "bg-blue-50" },
                  { title: "Lista Negra Interna", desc: "Consultamos o 'Rating' sigiloso que os bancos não mostram.", icon: "🚫", color: "bg-red-50" },
                  { title: "Registrato / SCR", desc: "Extração oficial do Banco Central atualizada.", icon: "🏛️", color: "bg-amber-50" },
                  { title: "Oportunidades", desc: "Cálculo de economia real para quitação imediata.", icon: "💡", color: "bg-green-50" },
                  { title: "Limpa Trilhas", desc: "Identificação de excesso de consultas ao seu CPF.", icon: "🕵️", color: "bg-purple-50" },
                  { title: "Consultoria Bonificada", desc: "Ganhe 15min com técnico após o laudo.", icon: "💬", color: "bg-indigo-50" }
                ].map((item, i) => (
                  <div key={i} className="group p-6 md:p-8 bg-white rounded-[32px] border border-slate-100 transition-all hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm", item.color)}>
                      {item.icon}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-900 text-base md:text-lg tracking-tight">{item.title}</h4>
                      <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer / CTA Card */}
            <div className="bg-slate-900 p-8 md:p-14 rounded-[48px] text-white flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden shadow-3xl">
               <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full -mr-40 -mt-40" />
               <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full -ml-40 -mb-40" />
               
               <div className="flex-1 space-y-6 relative z-10 text-center lg:text-left">
                  <div className="w-fit mx-auto lg:mx-0 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">Ambiente 100% Seguro</p>
                  </div>
                  <p className="text-lg md:text-2xl text-slate-100 font-medium leading-relaxed">
                    Libere sua <span className="text-white font-black underline decoration-indigo-500 underline-offset-8">Verdade Financeira</span> hoje. Processamento via API direta do BACEN.
                  </p>
               </div>

               <div className="flex flex-col items-center gap-4 w-full lg:w-auto relative z-10">
                  <button 
                    onClick={() => handleSelectPlano('diagnostico')}
                    className="w-full lg:w-[280px] px-8 py-6 bg-white text-slate-900 rounded-[28px] font-black text-xl md:text-2xl hover:bg-slate-50 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:translate-y-1 transform active:shadow-none flex flex-col items-center justify-center border-b-4 border-slate-200"
                  >
                    Fazer Agora R$ 47
                    <span className="text-[10px] text-indigo-600 mt-1 font-black uppercase tracking-[0.2em] opacity-70">Desbloqueio em Segundos</span>
                  </button>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Zap size={10} className="text-amber-400" /> Acesso Imediato via E-mail
                  </p>
               </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (view === 'selection') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 md:p-10 rounded-[40px] border border-slate-100 shadow-2xl space-y-8"
        >
          <div className="space-y-6">
            <button 
              onClick={() => setView('offer')}
              className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-2 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar para Proposta
            </button>

            <div className="space-y-6 bg-indigo-50/50 p-6 md:p-10 rounded-[32px] border border-indigo-100 shadow-sm relative overflow-hidden text-center">
              <h2 className="text-xl md:text-2xl font-black text-indigo-900 leading-tight uppercase relative z-10 px-4">
                PARABÉNS POR CHEGAR ATÉ AQUI!<br/>
                <span className="text-indigo-600 text-sm md:text-lg block mt-2">Escolha uma das etapas oficiais abaixo:</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Opção 1: Diagnóstico Completo */}
              <button 
                onClick={() => handleSelectPlano('diagnostico')}
                className="group relative p-6 md:p-8 bg-slate-900 rounded-[32px] text-white text-left overflow-hidden transition-all hover:scale-[1.02] shadow-xl border-2 border-slate-800"
              >
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">🔥 OPÇÃO RECOMENDADA</p>
                    <span className="text-xl font-black">R$ 47</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black leading-tight">
                    🔎 Diagnóstico Geral do CPF/CNPJ
                  </h3>
                  <div className="space-y-1.5 md:space-y-2">
                    {['Análise de restrições ocultas', 'Identificação de oportunidades', 'Direcionamento imediato'].map((item, i) => (
                      <p key={i} className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-indigo-500" /> {item}
                      </p>
                    ))}
                  </div>
                  <div className="pt-2">
                    <div className="w-full py-4 bg-white text-slate-900 rounded-2xl text-center font-black text-xs md:text-sm group-hover:bg-indigo-50 transition-colors uppercase tracking-wide">
                      Fazer diagnóstico
                    </div>
                  </div>
                </div>
              </button>

              {/* Opção 2: Atendimento com Especialista */}
              <button 
                onClick={() => handleSelectPlano('atendimento')}
                className="group relative p-6 md:p-8 bg-white border-2 border-slate-100 rounded-[32px] text-left overflow-hidden transition-all hover:border-indigo-200 hover:scale-[1.02]"
              >
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">⚡ ATENDIMENTO DIRETO</p>
                    <span className="text-xl font-black text-slate-900">R$ 24,90</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                    📞 Consultoria Individualizada
                  </h3>
                  <div className="space-y-1.5 md:space-y-2">
                    {['Fale com nossos técnicos', 'Tire todas as suas dúvidas', 'Entenda os próximos passos'].map((item, i) => (
                      <p key={i} className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-slate-400" /> {item}
                      </p>
                    ))}
                  </div>
                  <div className="pt-2">
                    <div className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-center font-black text-xs md:text-sm shadow-lg shadow-indigo-100 uppercase tracking-wide">
                      Agendar atendimento
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    if (view === 'objective') {
      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-5 md:p-10 rounded-[40px] border border-slate-100 shadow-2xl space-y-8"
        >
          <div className="space-y-6">
            <button 
              onClick={() => setView('offer')}
              className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-2 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar
            </button>
            
            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full w-fit border border-indigo-100">
              <span className="font-black text-[10px] uppercase tracking-widest leading-none pt-0.5">ESTRATÉGIA</span>
            </div>
            
            <div className="space-y-5">
              <p className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                Atenção: sua recuperação pode estar a um passo.
              </p>
              
              <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
                Com base no seu perfil, o potencial de recuperação do seu crédito é <span className="font-bold text-indigo-600">Elevado</span>. No entanto, agir sem diagnóstico técnico pode anular seus avanços.
              </p>

              <div className="p-5 bg-amber-50/50 border border-amber-100 md:rounded-[32px] rounded-3xl space-y-3">
                 <p className="text-amber-900 font-black text-sm md:text-base flex items-center gap-2">
                   ⚠️ Aviso Importante
                 </p>
                 <p className="text-amber-800 text-[11px] md:text-sm font-medium leading-relaxed">
                   Muitas pessoas tentam resolver pendências sozinhas e acabam aceitando acordos que reiniciam prazos prescricionais ou admitem dívidas indevidas.
                 </p>
              </div>

              <div className="space-y-4">
                 <p className="text-slate-900 font-black text-base md:text-lg flex items-center gap-2">
                    Próximas Etapas Sugeridas:
                 </p>
                 <div className="grid gap-2">
                    {['Diagnóstico do CPF/CNPJ', 'Consultoria do Caso', 'Plano de Ação Jurídica'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-[10px] text-slate-400 border border-slate-100">{i+1}</div>
                        <span className="text-sm font-bold text-slate-700">{item}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
              <button 
                onClick={() => handleSelectPlano('diagnostico')}
                className="group p-6 bg-slate-900 rounded-3xl text-white text-left transition-all hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black tracking-widest text-indigo-400">PLAN 1</span>
                  <span className="font-black text-sm">R$ 47</span>
                </div>
                <p className="font-black text-sm mb-1">Diagnóstico Geral</p>
                <p className="text-[11px] text-slate-400 font-medium">Saiba exatamente o que te bloqueia.</p>
              </button>

              <button 
                onClick={() => handleSelectPlano('atendimento')}
                className="group p-6 bg-slate-50 rounded-3xl text-left border border-slate-200 transition-all hover:bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black tracking-widest text-slate-400">PLAN 2</span>
                  <span className="font-black text-sm">R$ 24,90</span>
                </div>
                <p className="font-black text-sm mb-1 italic">Agendamento Técnico</p>
                <p className="text-[11px] text-slate-500 font-medium">Fale conosco por 15 minutos.</p>
              </button>
          </div>

          <button 
            onClick={() => setShowThankYou(true)}
            className="w-full py-4 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:text-slate-500 transition-all pt-6"
          >
            Encerrar sem prosseguir
          </button>
        </motion.div>
      );
    }

    if (data.faixa === "acima150") {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="text-indigo-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Análise Especializada</h2>
          <p className="text-slate-500 font-medium">
            Devido ao montante das dívidas, seu caso requer uma análise personalizada por um de nossos especialistas judiciais.
          </p>
          <a
            href="https://wa.me/5511999999999?text=Olá, gostaria de uma análise personalizada para minhas dívidas acima de 150 mil reais."
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-5 bg-[#25D366] text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-[#128C7E] transition-all"
          >
            <MessageCircle size={24} />
            Falar com Especialista
          </a>
        </motion.div>
      );
    }

    return (
      <div className="space-y-8 max-w-2xl lg:max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 md:p-12 rounded-[40px] border border-slate-100 shadow-2xl space-y-10"
        >
          <div className="flex flex-col md:flex-row items-center gap-4 text-green-600 bg-green-50 p-5 rounded-3xl border border-green-100">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <span className="font-black text-xs md:text-sm uppercase tracking-widest text-center md:text-left">Protocolo de Limpeza em Análise: Elegível</span>
          </div>

          <div className="space-y-8 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-5xl font-black text-slate-900 leading-tight md:leading-[1.1] tracking-tight">Protocolo de suspensão de Apontamentos Negativos.</h2>
            
            <div className="py-2 space-y-4">
              <p className="text-slate-400 font-bold text-[10px] md:text-[11px] uppercase tracking-[0.4em]">Preparado exclusivamente para:</p>
              <h3 className="text-3xl md:text-6xl lg:text-7xl font-black text-indigo-600 tracking-tighter italic drop-shadow-sm truncate px-4">
                {data.nome}
              </h3>
            </div>

            {/* Vídeo Explicativo Vertical */}
            <div className="max-w-[450px] mx-auto pt-4">
              <p className="font-black text-xs text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                <Zap size={14} className="text-amber-500 fill-amber-500" />
                Veja como funciona seu protocolo:
              </p>
              <div 
                className="relative w-full aspect-[1080/1350] rounded-[2.5rem] overflow-hidden border-4 border-slate-100 shadow-2xl bg-slate-900 group"
              >
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={(() => {
                    const url = config?.quizYouTubeUrl || config?.quiz_youtube_url || "https://www.youtube.com/watch?v=X_dttv3G_nM";
                    if (url.includes('embed/')) return url;
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                    const match = url.match(regExp);
                    const id = (match && match[2].length === 11) ? match[2] : 'X_dttv3G_nM';
                    return `https://www.youtube.com/embed/${id}?controls=1&modestbranding=1&rel=0`;
                  })()}
                  title="Como funciona a liminar limpa nome"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed max-w-sm mx-auto">
              Escolha abaixo o plano que melhor se adapta ao seu momento financeiro:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            <div 
              className="group relative p-6 md:p-8 bg-slate-900 rounded-[32px] text-white text-left overflow-hidden transition-all border-2 border-slate-800 flex flex-col justify-between"
            >
              <div className="relative z-10 space-y-4 mb-6">
                <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center justify-between">
                  <span>💰 À Vista</span>
                  <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black">RECOMENDADO</span>
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-500 line-through opacity-50">De: R$ {proposta.de.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
                    <span className="text-[10px] md:text-xs text-slate-400">por apenas:</span>
                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-none">R$ {proposta.vista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-indigo-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 px-3 py-1 bg-white/5 rounded-full w-fit">Prazo médio: 30 dias úteis</p>
                </div>
              </div>

              <button 
                onClick={() => handleSelectPlano('vista')}
                className="relative z-10 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                Pagar à vista com R$300 de desconto
              </button>

              <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-125 transition-transform pointer-events-none">
                <Zap size={100} className="fill-white lg:w-[140px]" />
              </div>
            </div>

            {data.faixa !== 'diagnostico' && (
              <div 
                className="group relative p-6 md:p-8 bg-white border-2 border-slate-100 rounded-[32px] text-left overflow-hidden transition-all flex flex-col justify-between"
              >
                <div className="relative z-10 space-y-4 mb-6">
                  <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">💳 Parcelado</p>
                  <div className="flex flex-col gap-2">
                     <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2">
                       <span className="text-[10px] md:text-xs text-slate-400 font-bold">Entrada de:</span>
                       <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900">R$ {proposta.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] md:text-[10px] font-black w-fit uppercase tracking-wider border border-indigo-100">
                      {proposta.status}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleSelectPlano('entrada')}
                  className="relative z-10 w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                >
                  Pagar R$ 197 só hoje
                </button>

                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none">
                  <CheckCircle2 size={100} className="text-slate-900 lg:w-[120px]" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
             <button
               onClick={() => setView('selection')}
               className="group flex items-center justify-center gap-3 w-full py-5 bg-[#25D366] text-white rounded-[24px] font-black text-base md:text-lg hover:bg-[#128C7E] transition-all shadow-xl shadow-green-200/50 active:scale-95"
             >
               <MessageCircle size={20} className="md:w-6 md:h-6" />
               Agendar Contratação
             </button>

             {data.faixa !== 'diagnostico' && (
               <button
                 onClick={() => setView('objective')}
                 className="w-full py-5 bg-slate-50 text-slate-600 border-2 border-slate-100 rounded-[24px] font-black text-base md:text-lg hover:bg-slate-100 hover:border-slate-200 transition-all active:scale-95"
               >
                 Seguir Atendimento
               </button>
             )}
          </div>

          <div className="bg-slate-50 p-6 md:p-8 rounded-[32px] border border-slate-100 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">Nota Importante</p>
            <p className="text-[11px] md:text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-wide">
              ⚠️ O PROTOCOLO LIMPA NOME SUSPENDE OS APONTAMENTOS NEGATIVOS NO PRAZO MÉDIO DE 30 DIAS ÚTEIS APÓS A CONFIRMAÇÃO
            </p>
          </div>

          <button
            onClick={() => setShowThankYou(true)}
            className="w-full py-4 text-slate-300 font-bold text-[10px] hover:text-slate-500 transition-all uppercase tracking-[0.3em]"
          >
            Encerrar Atendimento
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowCheckout(false)}
          >
            <div 
              className="w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <CheckoutModal 
                plano={plano}
                faixa={data.faixa}
                nome={data.nome}
                email={data.email}
                whatsapp={data.whatsapp}
                tenantSlug={tenantSlug}
                onClose={() => setShowCheckout(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
