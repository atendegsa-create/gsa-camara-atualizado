import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import OfferCard from "./OfferCard";
import { PROPOSTAS, Faixa } from "../lib/pricing";
import { ProcessStatus } from '../types';
import { CheckCircle2, X, Clock, Zap, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { auth, loginAnonymously } from "../lib/firebase";

type Data = {
  nome?: string;
  email?: string;
  valorFaixa?: string;
  valorNumerico?: number;
  faixa?: Faixa;
  whatsapp?: string;
  situacao?: string;
  origem?: string;
  perfil?: string;
};

interface QuizPremiumProps {
  onFinalize: (data: Data) => void;
  loading?: boolean;
  tenantSlug?: string;
}

import { useUTMTracking } from '../hooks/useUTMTracking';
import { registrarInteresseLead } from '../services/leadAutomation';

export default function QuizPremium({ onFinalize, loading, tenantSlug }: QuizPremiumProps) {
  const { trackPixelEvent } = useUTMTracking();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>({});
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    trackPixelEvent('ViewContent', { content_name: 'Quiz Premium Limpa Nome' });
  }, []);

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const userCred = await loginAnonymously();
          currentUser = userCred.user;
        }
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/config/master', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      }
    };
    fetchConfig();
  }, []);

  const perguntas = [
    {
      key: "nome",
      pergunta: "Qual seu primeiro nome?",
      input: true,
      placeholder: "Digite seu nome",
      type: "text"
    },
    {
      key: "email",
      pergunta: "Para onde enviamos o resultado da análise?",
      input: true,
      placeholder: "seu@email.com",
      type: "email"
    },
    {
      key: "whatsapp",
      pergunta: "Qual seu WhatsApp?",
      input: true,
      placeholder: "(00) 00000-0000",
      type: "tel"
    },
    {
      key: "explicacao",
      type: "info",
      title: "Vou ser direto com você:",
      content: "Se seu nome está negativado, isso está travando sua vida financeira hoje — Credibilidade bloqueada.\n\nA boa notícia: tem solução RÁPIDA e dentro da lei!\n\nConseguimos uma liminar que suspende seu nome ou de sua empresa dos órgãos (SERASA, SPC, BOA VISTA e PROTESTOS).\nSem precisar pagar a dívida agora\nEm até 10 a 30 dias úteis\n\nOu seja: você volta a ter credibilidade enquanto resolve sua situação com calma no futuro."
    },
    {
      key: "situacao",
      pergunta: "🧠 ETAPA 2\nQual dessas situações você está passando?",
      opcoes: [
        { label: "Nome negativado", value: "negativado" },
        { label: "Outro", value: "outro" },
      ],
    },
    {
      key: "origem",
      pergunta: "💰 ETAPA 3\nVocê sabe de onde são suas dívidas?",
      opcoes: [
        { label: "Bancos / Cartão de crédito / Financeiras", value: "financeiro" },
        { label: "Telefonia / serviços / Lojas", value: "varejo" },
        { label: "Todas afirmações acima", value: "todas" },
        { label: "Não sei exatamente", value: "nao_sei" },
      ],
    },
    {
      key: "perfil",
      pergunta: "🏦 ETAPA 4\nVocê quer atendimento para:",
      opcoes: [
        { label: "CPF (Pessoa Física)", value: "cpf" },
        { label: "CNPJ (Empresa)", value: "cnpj" },
        { label: "CPF E CNPJ (Ambos)", value: "ambos" },
      ],
    },
    {
      key: "valorFaixa",
      pergunta: "Qual o valor aproximado das suas dívidas?",
      opcoes: [
        { label: "Até R$ 50 mil", value: "ate50", num: 50000 },
        { label: "R$ 50 mil a R$ 100 mil", value: "50a100", num: 100000 },
        { label: "R$ 100 mil a R$ 150 mil", value: "100a150", num: 150000 },
        { label: "Acima de R$ 150 mil", value: "acima150", num: 200000 },
        { label: "Não sei o valor de minha dívida! Quero saber minha situação financeira: diagnóstico financeiro por apenas R$47.", value: "diagnostico", num: 47, highlight: true },
      ],
    },
  ];

  const [analyzing, setAnalyzing] = useState(false);

  const responder = async (payload: Partial<Data>) => {
    // Validação específica por passo
    const currentKey = perguntas[step].key;
    const value = payload[currentKey as keyof Data];

    if (currentKey === 'nome') {
      const nomeVal = String(value || "");
      if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nomeVal)) {
        alert("Por favor, digite apenas letras no nome.");
        return;
      }
    }

    if (currentKey === 'email') {
      const emailVal = String(value || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        alert("Por favor, digite um e-mail válido.");
        return;
      }
    }

    if (currentKey === 'whatsapp') {
      const telVal = String(value || "").replace(/\D/g, "");
      if (telVal.length < 10 || telVal.length > 11) {
        alert("Por favor, digite um WhatsApp válido com DDD (Ex: 11999999999).");
        return;
      }
    }

    const next = { ...data, ...payload };
    setData(next);

    // Se acabamos de preencher o e-mail (currentKey === 'email'), enviamos logo para capturar o lead e disparar o e-mail de boas-vindas
    if (currentKey === 'email' && next.nome && next.email) {
      registrarInteresseLead({
        nome: next.nome,
        email: next.email,
        tipo_quiz: 'LIMPA_NOME_PREMIUM',
        etapa_alcancada: 'E-mail Capturado',
        source: 'QuizPremium'
      });
      trackPixelEvent('Lead', { step: 1 });

      try {
        loginAnonymously().then(async (userCred) => {
          const token = await userCred.user.getIdToken();
          fetch('/api/leads/capturar', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              name: next.nome,
              email: next.email,
              origin: 'Quiz Limpa Nome (Captura Inicial)',
              tenantSlug: tenantSlug || 'gsa-master'
            })
          });
        });
      } catch (err) {
        console.error("Error in early lead capture:", err);
      }
    }

    if (step < perguntas.length - 1) {
      setStep(step + 1);
    } else {
      // Quiz finalized - show analysis first
      setAnalyzing(true);
      
      try {
        const currentUser = auth.currentUser;
        const token = await currentUser?.getIdToken();
        
        await fetch('/api/leads/capturar', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: next.nome,
            email: next.email,
            whatsapp: next.whatsapp,
            valorFaixa: next.valorFaixa,
            valorNumerico: next.valorNumerico,
            faixa: next.faixa,
            situacao: next.situacao,
            origem: next.origem,
            perfil: next.perfil,
            tipo: 'LIMPA_NOME_QUIZ',
            servico_alvo: 'LIMPA_NOME',
            origin: 'Quiz Limpa Nome (Finalizado)',
            tenantSlug: tenantSlug || 'gsa-master'
          })
        });
      } catch (err) {
        console.error("Error saving lead via API:", err);
      }

      setTimeout(() => {
        setAnalyzing(false);
        setStep(step + 1);
        trackPixelEvent('InitiateCheckout', { value: next.valorNumerico, currency: 'BRL' });
      }, 3000);
    }
  };

  const atual = perguntas[step];

  if (analyzing) {
    return (
      <div className="max-w-xl mx-auto p-12 md:p-16 bg-white rounded-[40px] shadow-2xl border border-slate-100 text-center space-y-10">
        <div className="relative">
          <div className="w-24 h-24 md:w-32 md:h-32 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             <motion.div
               animate={{ scale: [1, 1.2, 1] }}
               transition={{ repeat: Infinity, duration: 2 }}
             >
                <div className="w-3 h-3 bg-indigo-600 rounded-full" />
             </motion.div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Analisando Perfil...</h2>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Consultando Birôs de Crédito</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse delay-75">Calculando Descontos Base</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse delay-150">Verificando Elegibilidade Lei 14.181</p>
          </div>
        </div>
      </div>
    );
  }

  if (step >= perguntas.length) {
    return (
      <OfferCard 
        data={data}
        loading={loading}
        tenantSlug={tenantSlug}
      />
    );
  }

  return (
    <div className="w-full max-w-xl lg:max-w-4xl mx-auto p-5 md:p-10 bg-white rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100 transition-all duration-300">
      <div className="flex items-center justify-between mb-8 md:mb-10">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mr-4 md:mr-6">
          <motion.div
            className="h-full bg-indigo-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(step / perguntas.length) * 100}%` }}
          />
        </div>
        {step > 0 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="text-[10px] md:text-[11px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-all flex items-center gap-1.5 active:scale-95"
          >
            ← Voltar
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {atual.pergunta && (
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-8 md:mb-10 text-slate-900 leading-[1.1] tracking-tight whitespace-pre-line">
              {atual.pergunta}
            </h2>
          )}

          {atual.type === "info" && (
            <div className="space-y-6 md:space-y-8 max-w-3xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                {atual.title}
              </h2>
              
              <div className="space-y-5 md:space-y-6 text-slate-600 text-base md:text-xl">
                <p className="leading-relaxed">
                  <span className="font-bold text-slate-900 underline decoration-indigo-200 decoration-4 underline-offset-4">Se seu nome está negativado,</span> isso está travando sua vida financeira hoje — Credibilidade bloqueada.
                </p>

                <div className="p-5 md:p-8 bg-green-50/50 border border-green-100 rounded-[1.5rem] md:rounded-[2rem] space-y-4 shadow-sm">
                  <p className="font-black text-green-700 flex items-center gap-3 text-lg md:text-xl">
                    <span className="text-xl md:text-2xl">👉</span> A boa notícia: tem solução RÁPIDA e dentro da lei!
                  </p>
                  <div className="space-y-3">
                    <p className="flex items-start gap-3">
                      <span className="text-green-500 mt-1"><CheckCircle2 size={20} className="md:w-6 md:h-6" /></span>
                      <span className="leading-relaxed text-sm md:text-lg"><span className="font-black text-slate-800">Conseguimos uma liminar que suspende seu nome ou de sua empresa</span> dos órgãos (SERASA, SPC, BOA VISTA e PROTESTOS).</span>
                    </p>
                    <p className="flex items-center gap-3 font-bold text-slate-700 text-xs md:text-base">
                      <span className="text-red-500"><X size={18} /></span> Sem precisar pagar a dívida agora
                    </p>
                    <p className="flex items-center gap-3 font-bold text-slate-700 text-xs md:text-base">
                      <span className="text-blue-500"><Clock size={18} /></span> Em até 10 a 30 dias úteis
                    </p>
                  </div>
                </div>

                <div className="p-5 md:p-6 bg-indigo-50 border border-indigo-100 rounded-2xl md:rounded-3xl flex items-start gap-3 md:gap-4">
                  <span className="text-xl md:text-2xl mt-0.5">💡</span>
                  <p className="font-bold text-indigo-900 leading-relaxed text-sm md:text-base">
                    Ou seja: você volta a ter credibilidade enquanto resolve sua situação com calma no futuro.
                  </p>
                </div>

                <div className="pt-4">
                  <p className="font-black text-sm text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                    Ouça este recado importante:
                  </p>
                  
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                        <img src="https://ui-avatars.com/api/?name=Consultor+GSA&background=6366f1&color=fff" alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{config?.quiz_audio_title || 'Diretor Geral Tiago Martins'}</p>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase">Consultor Especialista</p>
                      </div>
                    </div>
                    <audio 
                      key={config?.quiz_audio_url || 'default'}
                      controls 
                      className="w-full h-8"
                      src={config?.quiz_audio_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"} 
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 space-y-6">
                  <p className="flex items-start gap-3 bg-amber-50 p-6 rounded-3xl border border-amber-100">
                    <span className="text-2xl mt-1">⚠️</span>
                    <span className="text-amber-900 font-medium leading-relaxed">
                      <span className="font-black uppercase tracking-widest text-[10px] block mb-1">Atenção</span>
                      Nem todo caso é aprovado — por isso fazemos uma análise técnica antes de qualquer compromisso.
                    </span>
                  </p>
                  
                  <div className="pt-2">
                     <p className="font-black text-indigo-700 mb-6 text-center text-xl md:text-2xl leading-tight">
                       👉 Me responde agora: <br/>
                       Quer que eu analise seu caso agora para você limpar seu nome?
                     </p>
                     
                      <button
                        onClick={() => {
                          responder({});
                        }}
                        className="w-full py-6 md:py-8 bg-indigo-600 text-white rounded-[2rem] font-black text-xl md:text-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1.5 transition-all active:translate-y-0 active:scale-[0.98] ring-4 ring-indigo-50"
                     >
                        Sim, Analisar Meu Caso Grátis
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {"input" in atual && atual.input && (
            <div className="space-y-4 md:space-y-6 max-w-lg">
              <div className="relative group">
                <input
                  autoFocus
                  type={atual.type}
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-lg md:text-2xl font-black text-slate-900 transition-all placeholder:text-slate-300"
                  placeholder={atual.placeholder}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter" && e.currentTarget.value) {
                      responder({ [atual.key]: e.currentTarget.value });
                    }
                  }}
                />
                <div className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-focus-within:opacity-100 transition-opacity">
                  <Zap size={20} className="md:w-6 md:h-6 text-indigo-600" />
                </div>
              </div>
              <button 
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                  if (input?.value) responder({ [atual.key]: input.value });
                }}
                className="w-full py-4 md:py-6 bg-indigo-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                Continuar
              </button>
              <p className="text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pressione Enter para seguir</p>
            </div>
          )}

          {"opcoes" in atual && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6 mt-6 md:mt-8">
              {atual.opcoes?.map((op: any) => (
                <button
                  key={op.value}
                  onClick={() => {
                    const payload: any = { [atual.key]: op.label };
                    if (atual.key === 'valorFaixa') {
                      payload.valorNumerico = op.num;
                      payload.faixa = op.value as Faixa;
                    }
                    responder(payload);
                  }}
                  className={`w-full text-left p-5 md:p-8 border-2 rounded-[1.5rem] md:rounded-[2rem] font-black transition-all active:scale-[0.98] h-full flex flex-col justify-between group ${
                    op.highlight 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200 col-span-full' 
                      : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-white hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/5'
                  }`}
                >
                  <span className={cn("text-base md:text-xl leading-[1.1]", op.highlight ? "text-xl md:text-3xl" : "")}>{op.label}</span>
                  <div className={cn("mt-4 md:mt-6 h-6 w-6 md:h-8 md:w-8 rounded-full flex items-center justify-center transition-all", op.highlight ? "bg-white/20" : "bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white")}>
                    <ChevronRight size={16} className="md:w-5 md:h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
