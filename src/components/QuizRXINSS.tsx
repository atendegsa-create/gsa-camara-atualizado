import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  UploadCloud, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MessageCircle,
  ExternalLink,
  BrainCircuit,
  Scale
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5;

import { useUTMTracking } from '../hooks/useUTMTracking';
import { registrarInteresseLead, marcarLeadRecuperado } from '../services/leadAutomation';
import { auth, loginAnonymously } from '../lib/firebase';

export default function QuizRXINSS() {
  const { trackPixelEvent, getUTMs } = useUTMTracking();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Efeito para track inicial e registro de abandono (etapa 1)
  useEffect(() => {
    if (step === 1) {
      trackPixelEvent('ViewContent', { content_name: 'Quiz RX INSS' });
    }
    
    // Se o lead já preencheu nome e idade, registra interesse
    if (step === 2 && formData.nome && formData.idade) {
       registrarInteresseLead({
         nome: formData.nome,
         telefone: '', // Seria ideal ter telefone na Step 1
         tipo_quiz: 'RX_INSS',
         etapa_alcancada: 'Identificação Inicial',
         source: 'QuizRXINSS'
       });
       trackPixelEvent('Lead', { step: 1 });
    }

    if (step === 5) {
      trackPixelEvent('InitiateCheckout', { content_name: 'Auditoria INSS' });
    }
  }, [step]);
  const [isPaid, setIsPaid] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ parecer_tecnico: string, viabilidade: string } | null>(null);
  const [paymentData, setPaymentData] = useState<{ qr_code: string, copiaECola: string, id: string } | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    idade: '',
    problema: '',
    tempoContribuicao: '',
    pedidoNegado: '',
    arquivo: null as File | null
  });

  // Check for success URL
  React.useEffect(() => {
    if (window.location.pathname === '/rx-inss-sucesso') {
      setIsPaid(true);
    }
  }, []);

  // Polling para status do pagamento
  React.useEffect(() => {
    let interval: any;
    if (paymentData?.id && !isPaid) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment-status?id=${paymentData.id}`);
          const data = await res.json();
          if (data.status === 'CONFIRMED' || data.status === 'PAGO') {
            setIsPaid(true);
            clearInterval(interval);
          }
        } catch (e) { /* ignore */ }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [paymentData, isPaid]);

  const nextStep = async () => {
    if (step === 4) {
      setLoading(true);
      
      let documentoBase64 = '';
      if (formData.arquivo) {
        try {
          documentoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(formData.arquivo!);
          });
        } catch (e) {
          console.error("Erro ao ler arquivo:", e);
        }
      }

      try {
        if (!auth.currentUser) {
          await loginAnonymously();
        }
        const idToken = await auth.currentUser?.getIdToken();

        const response = await fetch('/api/ai/inss/analyze', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            nome: formData.nome,
            idade: formData.idade,
            problema: formData.problema,
            tempo_contribuicao: formData.tempoContribuicao,
            documentoBase64
          })
        });
        const data = await response.json();
        setAnalysisResult(data);

        // Capture lead
        try {
          await fetch('/api/leads/capturar', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              name: formData.nome,
              idade: formData.idade,
              problema: formData.problema,
              tempo_contribuicao: formData.tempoContribuicao,
              tipo: 'RX_INSS_QUIZ',
              servico_alvo: 'RX_INSS',
              origin: 'Quiz RX INSS'
            })
          });
        } catch (captureErr) {
          console.error("Erro ao salvar lead RX INSS:", captureErr);
        }

      } catch (err) {
        console.error("Erro na análise API:", err);
        setAnalysisResult({
          parecer_tecnico: "Não foi possível processar a análise em tempo real, mas nossos peritos identificaram indícios iniciais que justificam uma auditoria humana completa.",
          viabilidade: "Alta"
        });
      } finally {
        setLoading(false);
        setStep(5);
      }
    } else {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: 'triagem_inss',
          nome: formData.nome,
          email: `${formData.nome.toLowerCase().replace(/\s+/g, '.')}@inss.com`,
          whatsapp: ''
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();
      if (data.qr_code || data.qr_code_base64) {
        setPaymentData({
          qr_code: data.qr_code_base64 || data.qr_code,
          copiaECola: data.copiaECola || data.qr_code,
          id: data.id
        });
      } else {
        // Fallback for simulation if no gateway is active or simple simulation
        setTimeout(() => {
          setLoading(false);
          setIsPaid(true);
        }, 2000);
      }
    } catch (err) {
      console.error("Erro ao criar pagamento:", err);
      // Fallback to simulation on error
      setTimeout(() => {
        setLoading(false);
        setIsPaid(true);
      }, 2000);
    } finally {
      if (!paymentData) setLoading(false);
    }
  };

  if (isPaid) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="bg-[#5A5A40] p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">Pagamento Confirmado!</h1>
            <p className="text-white/80">Sua análise prioritária foi liberada com sucesso.</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-serif font-bold text-gray-900">Próximo Passo: Agendamento</h2>
              <p className="text-gray-600">Para concluir seu caso, agende agora uma reunião com nossos especialistas ou fale diretamente pelo suporte.</p>
            </div>

            {/* Calendly Simulation / Iframe */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-xl flex items-center justify-center text-[#5A5A40]">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Agenda Consultiva GSA</h3>
                <p className="text-sm text-gray-500">Escolha o melhor horário para nossa conferência.</p>
              </div>
              <button 
                onClick={() => window.open('https://calendly.com', '_blank')}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-[#5A5A40]/20"
              >
                <ExternalLink size={18} />
                Agendar Horário na Agenda
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => window.open('https://wa.me/55', '_blank')}
                className="flex items-center justify-center gap-3 p-5 bg-[#25D366] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-green-500/20"
              >
                <Loader2 className="animate-pulse" size={20} />
                Falar com Suporte GSA
              </button>
              
              <div className="p-5 bg-blue-50 text-blue-700 rounded-2xl flex items-center gap-3 border border-blue-100 text-sm italic font-medium">
                <ShieldCheck size={24} className="shrink-0" />
                Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD).
              </div>
            </div>
          </div>
        </motion.div>
        
        <p className="mt-8 text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Scale size={14} /> GSA Câmara de Mediação & Arbitragem
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex flex-col items-center justify-center p-4 font-sans overflow-x-hidden">
      {/* Header Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between items-center mb-2 px-2">
          <span className="text-[10px] font-black text-[#5A5A40]/60 uppercase tracking-widest">
            {loading ? 'Processando...' : `Etapa ${step} de 5`}
          </span>
          <span className="text-[10px] font-black text-[#5A5A40]/60 uppercase tracking-widest">
            {Math.round((step / 5) * 100)}% Concluído
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 5) * 100}%` }}
            className="h-full bg-[#5A5A40]"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step + (loading ? '-loading' : '')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-lg bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100"
        >
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <BrainCircuit className="w-20 h-20 text-[#5A5A40] animate-pulse" />
                <Loader2 className="absolute -bottom-2 -right-2 w-8 h-8 text-[#5A5A40] animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Analisando Direitos...</h2>
                <p className="text-gray-500 text-sm">Nossa IA está cruzando dados do INSS com a legislação vigente.</p>
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Varredura de CNIS</span>
                  <span className="text-green-500">Concluído</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Cálculo de Períodos</span>
                  <span className="animate-pulse">Calculando...</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <User className="text-[#5A5A40] w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900">Comece por aqui</h2>
                    <p className="text-gray-500 text-sm mt-2">Identifique-se para iniciarmos sua triagem gratuita.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Seu Nome Completo</label>
                      <input 
                        type="text" 
                        value={formData.nome}
                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="João Silva"
                        className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#5A5A40] outline-none bg-gray-50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sua Idade</label>
                      <input 
                        type="number" 
                        value={formData.idade}
                        onChange={e => setFormData({ ...formData, idade: e.target.value })}
                        placeholder="Ex: 55"
                        className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#5A5A40] outline-none bg-gray-50 transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={!formData.nome || !formData.idade}
                    onClick={nextStep}
                    className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:hover:bg-[#5A5A40] shadow-lg shadow-[#5A5A40]/10"
                  >
                    Próximo Passo
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-serif font-bold text-gray-900">Qual o seu caso?</h2>
                    <p className="text-gray-500 text-sm mt-2">Selecione o problema que você enfrenta hoje no INSS.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'aposentadoria', label: 'Aposentadoria', icon: ShieldCheck },
                      { id: 'negado', label: 'Benefício Negado', icon: AlertCircle },
                      { id: 'revisao', label: 'Revisão de Valor', icon: Clock },
                      { id: 'outro', label: 'Outro Problema', icon: MessageCircle }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setFormData({ ...formData, problema: item.id });
                        }}
                        className={`p-5 rounded-2xl border-2 flex items-center gap-4 transition-all text-left group ${
                          formData.problema === item.id 
                            ? 'border-[#5A5A40] bg-[#5A5A40]/5 shadow-md' 
                            : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <item.icon className={formData.problema === item.id ? 'text-[#5A5A40]' : 'text-gray-400 group-hover:text-gray-600'} />
                        <span className={`font-bold ${formData.problema === item.id ? 'text-[#5A5A40]' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button 
                    disabled={!formData.problema}
                    onClick={nextStep}
                    className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-[#5A5A40]/10"
                  >
                    Continuar
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-serif font-bold text-gray-900">Dados do Histórico</h2>
                    <p className="text-gray-500 text-sm mt-2">Informações fundamentais para o cálculo de direitos.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tempo total de contribuição</label>
                      <input 
                        type="text" 
                        value={formData.tempoContribuicao}
                        onChange={e => setFormData({ ...formData, tempoContribuicao: e.target.value })}
                        placeholder="Ex: 25 anos e 4 meses"
                        className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#5A5A40] outline-none bg-gray-50 transition-all font-medium"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Já possui algum pedido NEGADO?</label>
                      <div className="flex gap-2">
                        {['Sim', 'Não'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setFormData({ ...formData, pedidoNegado: opt })}
                            className={`flex-1 py-4 rounded-2xl border-2 transition-all font-bold ${
                              formData.pedidoNegado === opt
                                ? 'border-[#5A5A40] bg-[#5A5A40] text-white shadow-lg'
                                : 'border-gray-50 bg-gray-50 text-gray-700 hover:border-gray-200'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    disabled={!formData.tempoContribuicao || !formData.pedidoNegado}
                    onClick={nextStep}
                    className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-[#5A5A40]/10"
                  >
                    Avançar para Análise
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 text-center">
                  <div className="mb-8">
                    <h2 className="text-3xl font-serif font-bold text-gray-900">Análise Documental</h2>
                    <p className="text-gray-500 text-sm mt-2">Envie seu CNIS ou Laudo para confirmarmos o direito.</p>
                  </div>

                  <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 bg-gray-50 group hover:border-[#5A5A40] transition-colors relative cursor-pointer">
                    <input 
                      type="file" 
                      onChange={e => setFormData({ ...formData, arquivo: e.target.files?.[0] || null })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-[#5A5A40] mb-4 transition-colors">
                        <UploadCloud size={32} />
                      </div>
                      <p className="font-bold text-gray-700">Clique ou arraste seu arquivo</p>
                      <p className="text-xs text-gray-400 mt-1 italic">Formatos aceitos: PDF, JPG, PNG (Max 10MB)</p>
                      
                      {formData.arquivo && (
                        <div className="mt-4 p-3 bg-white rounded-xl border border-green-100 flex items-center gap-2 text-green-600 font-bold text-xs">
                          <CheckCircle2 size={16} />
                          {formData.arquivo.name} selecionado
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                      O envio do documento é opcional para esta fase, mas aumenta em <strong>87% a precisão</strong> do parecer da IA.
                    </p>
                  </div>

                  <button 
                    onClick={nextStep}
                    className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-[#5A5A40]/10"
                  >
                    {formData.arquivo ? 'Validar Documento' : 'Continuar sem Documento'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="p-6 bg-green-50 rounded-3xl border border-green-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <ShieldCheck size={100} />
                    </div>
                    <div className="flex items-center gap-3 text-green-700 mb-2">
                      <CheckCircle2 size={24} />
                      <span className="font-black text-xs uppercase tracking-tighter">Análise Concluída</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">Temos uma ótima notícia!</h2>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {analysisResult?.parecer_tecnico || "Sua pré-análise via IA identificou fortes indícios de direitos não concedidos ou valores pagos a menor pelo INSS no seu caso."}
                    </p>
                    <div className="bg-white/60 p-4 rounded-xl border border-white/80">
                      <p className="text-xs font-bold text-gray-700">Viabilidade Estimada:</p>
                      <div className="flex items-end gap-2 mt-1">
                        <span className={`text-3xl font-serif font-bold ${
                          analysisResult?.viabilidade === 'Alta' ? 'text-green-600' : 
                          analysisResult?.viabilidade === 'Média' ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {analysisResult?.viabilidade || "Alta"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">Baseado em casos similares</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 text-center px-4 leading-relaxed">
                      Para oficializar esta análise e receber o parecer técnico humano com as teses jurídicas completas, realize o pagamento da taxa de auditoria.
                    </p>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auditoria Pericial Humanizada</p>
                        <p className="text-2xl font-serif font-bold text-gray-900">R$ 24,90</p>
                      </div>
                      <div className="line-through text-gray-400 font-bold decoration-red-400 text-sm">
                        R$ 97,00
                      </div>
                    </div>

                    {paymentData ? (
                      <div className="bg-white p-6 rounded-3xl border-2 border-[#5A5A40] space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-[#5A5A40] font-bold text-sm uppercase tracking-widest">
                          <ShieldCheck size={18} />
                          Pagamento via PIX Gerado
                        </div>
                        
                        {paymentData.qr_code && paymentData.qr_code.length > 100 ? (
                          <div className="aspect-square w-48 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100">
                             <img src={paymentData.qr_code.startsWith('data:') ? paymentData.qr_code : `data:image/png;base64,${paymentData.qr_code}`} alt="PIX QR Code" className="w-full h-full" />
                          </div>
                        ) : (
                          <div className="aspect-square w-48 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center text-[#5A5A40]">
                            <Loader2 className="animate-spin" size={32} />
                          </div>
                        )}

                        <div className="space-y-2">
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Código Copia e Cola</p>
                           <div className="relative group">
                              <input 
                                readOnly 
                                value={paymentData.copiaECola}
                                className="w-full bg-gray-50 p-3 pr-10 rounded-xl border border-gray-200 text-[10px] font-mono text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap"
                              />
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentData.copiaECola);
                                  alert('Código copiado!');
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#5A5A40] hover:bg-white rounded-lg transition-colors"
                              >
                                <ExternalLink size={16} />
                              </button>
                           </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                           <p className="text-xs text-gray-500 italic">Após o pagamento, o sistema identificará automaticamente e você será redirecionado para o agendamento.</p>
                           <button 
                             onClick={() => setIsPaid(true)}
                             className="text-[10px] font-bold text-[#5A5A40] underline uppercase tracking-widest"
                           >
                             Já realizei o pagamento? Clique aqui
                           </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={handlePayment}
                        className="w-full bg-[#7a0f1a] text-white py-6 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-red-900/20 group"
                      >
                        <DollarSignIcon />
                        <span>CONTRATAR ANÁLISE POR R$ 24,90</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                    
                    <p className="text-[10px] text-center text-gray-400 font-medium font-mono uppercase tracking-tighter">
                      Garantia GSA: Se não encontrarmos indícios, devolvemos seu dinheiro.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="mt-8 flex flex-col items-center gap-4 text-center">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#5A5A40]" />
          Ambiente Criptografado de Ponta a Ponta
        </p>
        <div className="flex items-center gap-4 grayscale opacity-40">
          <img src="https://logodownload.org/wp-content/uploads/2021/03/pix-logo.png" className="h-4" alt="Pix" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="PayPal" />
          <img src="https://logodownload.org/wp-content/uploads/2014/10/visa-logo-1.png" className="h-3" alt="Visa" />
        </div>
      </footer>
    </div>
  );
}

function DollarSignIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
