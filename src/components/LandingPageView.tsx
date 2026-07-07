import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Lock, CheckCircle2, Loader2, MessageCircle, Search, UploadCloud, X, ScanLine, FileText, Download, Star, Copy, Check, Clock, ChevronRight, BrainCircuit, Scale, ShieldAlert, ShieldCheck, TrendingUp, ArrowRight, CreditCard, User } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { cn } from '../lib/utils';
import { gerarLaudoTecnico } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { doc, onSnapshot, collection, addDoc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, loginAnonymously } from '../lib/firebase';
import { Faixa } from '../lib/pricing';

type Step = 
  | 'step1_hero_form' 
  | 'step2_loading' 
  | 'step3_capture' 
  | 'step4_pay17' 
  | 'step4b_checkout_17'
  | 'step4c_results'
  | 'step4d_checkout_47'
  | 'step4e_waiting_payment'
  | 'step_verifying_payment'
  | 'step5_pay47' 
  | 'step6_upload' 
  | 'step6a_ai_processing'
  | 'step6b_send_later'
  | 'step7_upsell297';

import { useUTMTracking } from '../hooks/useUTMTracking';
import { registrarInteresseLead } from '../services/leadAutomation';

export function LandingPageView() {
  const { trackPixelEvent } = useUTMTracking();

  useEffect(() => {
    trackPixelEvent('PageView');
  }, []);
  console.log('Rendering LandingPageView');
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('step1_hero_form');
  const [partnerRef, setPartnerRef] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('parceiro');
    if (ref) {
      setPartnerRef(ref);
      const fetchAfiliado = async () => {
        try {
          const response = await fetch(`/api/vitrine/afiliado/${ref}`);
          if (response.ok) {
            const data = await response.json();
            setPartnerName(data.nome);
          }
        } catch (error) {
          console.error("Erro ao buscar afiliado: ", error);
        }
      };
      fetchAfiliado();
    }
  }, []);

  const [contractData, setContractData] = useState({ type: 'Empréstimo CLT', loan: '', installment: '', months: '' });
  const [leadData, setLeadData] = useState({ name: '', document: '', whatsapp: '', email: '', termsAssent: false });
  const [processStarted, setProcessStarted] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [nup, setNup] = useState('');
  const [laudoData, setLaudoData] = useState<{ markdown: string, summary: any } | null>(null);
  const [simulationResults, setSimulationResults] = useState<{
    realRatePerc: string;
    isAbusive: boolean;
    savings: number;
    newPmt: number;
    bacenRatePerc: string;
    totalLoss: number;
  } | null>(null);

  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
    gateway: string;
    level: string;
    isSimulated?: boolean;
  } | null>(null);

  const [pixError, setPixError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const calculateInterestRate = (principal: number, pmt: number, periods: number): number => {
    if (principal <= 0 || pmt <= 0 || periods <= 0) return 0;
    if (pmt * periods <= principal) return 0;
  
    let low = 0.0;
    let high = 1.0; 
    const tolerance = 1e-6;
  
    while (high - low > tolerance) {
        const mid = (low + high) / 2;
        const calculatedPmt = (principal * mid * Math.pow(1 + mid, periods)) / (Math.pow(1 + mid, periods) - 1);
        
        if (calculatedPmt > pmt) {
            high = mid;
        } else {
            low = mid;
        }
    }
  
    return (low + high) / 2;
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const downloadPDF = () => {
    if (laudoData) {
        const doc = new jsPDF();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        // Replace markdown bold/headers with plain text for jsPDF
        const text = laudoData.markdown.replace(/#/g, '').replace(/\*\*/g, '');
        doc.text(text, 10, 10, { maxWidth: 190 });
        doc.save("Laudo_Pericial_GSA_Camara.pdf");
        return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Laudo Pericial Financeiro", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("GSA Câmara - Autenticidade Verificada", 105, 30, { align: "center" });

    doc.setFontSize(14);
    doc.text("Detalhes da Análise", 20, 50);
    
    doc.setFontSize(12);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 60);
    doc.text(`Status: Finalizado`, 20, 70);
    doc.text(`Resultado: ${simulationResults?.isAbusive ? "Indício Abusivo Encontrado" : "Possível Venda Casada / Tarifas Ocultas"}`, 20, 80);
    
    doc.text("A Inteligência Artificial da GSA Câmara analisou o seu contrato e cruzou", 20, 100);
    doc.text("os dados com a base do Banco Central do Brasil. Constatamos divergências", 20, 110);
    doc.text("entre a taxa de juros aplicada e a média de mercado autorizada ou", 20, 120);
    doc.text("a existência de seguros/tarifas embutidas irregularmente.", 20, 130);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 0, 0);
    const lossFmt = (simulationResults?.totalLoss || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    doc.text(`Prejuízo Estimado: R$ ${lossFmt}`, 20, 150);
    
    doc.save("Laudo_Pericial_GSA_Camara.pdf");
  };

  const handleAnalise = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToTop();

    const P = parseFloat(contractData.loan) || 0;
    const PMT = parseFloat(contractData.installment) || 0;
    const N = parseInt(contractData.months, 10) || 0;

    let bacenRate = 0.0168; // default Consignado
    if (contractData.type === 'Cartão de crédito') bacenRate = 0.06;
    else if (contractData.type === 'Empréstimo pessoal' || contractData.type === 'Empréstimo CLT') bacenRate = 0.035;
    else if (contractData.type === 'Financiamento de Veículos') bacenRate = 0.019;
    else if (contractData.type === 'Financiamento Imobiliário') bacenRate = 0.009;

    const realRateDecimal = calculateInterestRate(P, PMT, N);
    const realRatePerc = (realRateDecimal * 100).toFixed(2) + "% a.m.";
    
    let isAbusive = false;
    let savings = 0;
    let newPmt = 0;
    let totalLoss = 0;

    if (realRateDecimal > bacenRate * 1.1) {
        isAbusive = true;
        newPmt = (P * bacenRate * Math.pow(1 + bacenRate, N)) / (Math.pow(1 + bacenRate, N) - 1);
        savings = (PMT - newPmt) * N;
        totalLoss = savings;
    } else {
        // Tied selling estimate
        isAbusive = false;
        totalLoss = P * 0.15; // Estimate 15% tied selling/tariffs
    }

    setSimulationResults({
      realRatePerc,
      isAbusive,
      savings,
      newPmt,
      bacenRatePerc: (bacenRate * 100).toFixed(2) + "% a.m.",
      totalLoss
    });

    setStep('step2_loading');
  };

  useEffect(() => {
    if (step === 'step2_loading') {
      const timer = setTimeout(() => {
        setStep('step3_capture');
      }, 3000);
      return () => clearTimeout(timer);
    }
    
    if (step === 'step5_pay47') {
      const timer = setTimeout(() => {
        setTrackingNumber(`REQ-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
        scrollToTop();
        setStep('step6_upload');
      }, 3500); 
      return () => clearTimeout(timer);
    }

    if (step === 'step6a_ai_processing') {
      const timer = setTimeout(() => {
        setStep('step7_upsell297');
      }, 4000); // Fakes the Gemini AI processing the PDF
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Real-time tracking for payment automation
  useEffect(() => {
    if (!trackingNumber) return;
    
    console.log(`[REALTIME] Listening for status updates on: ${trackingNumber}`);
    const unsubscribe = onSnapshot(doc(db, 'consulta_publica', trackingNumber), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log(`[REALTIME] Status changed to: ${data.status}`);
        
        // Automation map
        if (data.status === 'SIMULACAO_PAGA' && step === 'step4e_waiting_payment') {
            // This might be slightly different if they pay while in checkout
            setStep('step4c_results');
        } else if (data.status === 'SIMULACAO_PAGA' && (step === 'step4_pay17' || step === 'step4b_checkout_17')) {
            setStep('step4c_results');
        } else if (data.status === 'LAUDO_PAGO' && step === 'step4e_waiting_payment') {
            setStep('step5_pay47');
        } else if (data.status === 'MEDIACAO_CONTRATADA') {
            if (data.nup) setNup(data.nup);
            setProcessStarted(true);
            setStep('step7_upsell297');
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `consulta_publica/${trackingNumber}`);
    });

    return () => unsubscribe();
  }, [trackingNumber, step]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCapture = async (e: React.FormEvent) => {
    console.log("[CAPTURE] Starting handleCapture...");
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Garantir que temos um usuário (anonimato) para o token de segurança
      let currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("[CAPTURE] Usuário não logado, iniciando login anônimo...");
        const userCred = await loginAnonymously();
        currentUser = userCred.user;
      }
      const token = await currentUser.getIdToken();
      const authHeaders = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const resp = await fetch('/api/leads/capturar', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: leadData.name,
          email: leadData.email,
          whatsapp: leadData.whatsapp,
          cpf: leadData.document,
          origin: partnerRef ? `Indicação: ${partnerRef}` : "Análise Gratuita / Home"
        })
      });
      const respData = await resp.json();
      console.log("[CAPTURE] Lead API Resp:", respData);

      console.log("[CAPTURE] Creating process via API...");
      const processResp = await fetch('/api/processos/novo', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cliente_id: currentUser.uid,
          nome: leadData.name,
          email: leadData.email,
          whatsapp: leadData.whatsapp,
          documento: leadData.document,
          tipo_acao: contractData.type || "Revisional Consignado",
          valor_causa: contractData.loan ? Number(contractData.loan) : 0,
          parceiro_tag: partnerRef || null
        })
      });
      
      const processResult = await processResp.json();
      
      if (!processResult.success) {
        const errorMsg = processResult.error || "Erro ao criar processo no servidor.";
        const detailedMsg = processResult.details ? `${errorMsg} - Detalhes: ${processResult.details}` : errorMsg;
        throw new Error(detailedMsg);
      }

      const processoCriado = processResult.processo;
      const docId = processoCriado.id;

      // Chama automação de lead interessado
      registrarInteresseLead({
        nome: leadData.name,
        telefone: leadData.whatsapp,
        email: leadData.email,
        documento: leadData.document,
        tipo_quiz: 'REVISIONAL_LANDING',
        etapa_alcancada: 'Dados de Contato Capturados',
        source: 'LandingPageView',
        status_processo: 'Aguardando Pagamento 17'
      });

      trackPixelEvent('Lead', { value: 17, currency: 'BRL' });

      setNup(null); // It's generated later upon payment or admin review
      setTrackingNumber(docId);
      
      console.log("[CAPTURE] Success! Tracking Number:", docId);
      scrollToTop();
      setStep('step4_pay17');
    } catch (err: any) {
      console.error("[CAPTURE] Exception:", err);
      alert("Erro de conexão ao registrar. Detalhes: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay17 = async () => {
    scrollToTop();
    setStep('step4b_checkout_17');
    generatePix("1");
  };

  const generatePix = async (level: string) => {
    setPixError(null);
    setPixData(null);
    try {
      const payload = {
        processoId: trackingNumber,
        level,
        descricao: `Câmara GSA - Level ${level}`,
        email: leadData.email,
        nome: leadData.name,
        cpfCnpj: leadData.document,
        whatsapp: leadData.whatsapp
      };
      
      console.log(`[PIX] Requesting Level ${level} for ${trackingNumber}`);

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/pix', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Erro ao gerar PIX");
      }

      if (data.qr_code) {
        setPixData({ ...data, level });
      } else {
        throw new Error("Resposta do servidor não contém QR Code.");
      }
    } catch (err: any) {
      console.error("Erro ao gerar PIX:", err);
      setPixError(err.message);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    }
  };

  const verifyPaymentManually = async () => {
    if (!pixData || !trackingNumber) return;
    setIsVerifying(true);
    setStep('step_verifying_payment');
    
    // Smooth transition
    scrollToTop();

    try {
      const res = await fetch(`/api/payment-status/${pixData.gateway}/${pixData.payment_id}?processoId=${trackingNumber}&level=${pixData.level}`);
      const data = await res.json();
      
      if (data.isApproved) {
        console.log("Pagamento confirmado manualmente!");
        // Small delay for the user to see the "approved" state on the verification pulse
        setTimeout(() => {
          if (pixData.level === "1") {
            setStep('step4c_results');
          } else if (pixData.level === "2") {
            setStep('step5_pay47');
          } else if (pixData.level === "3") {
            setStep('step7_upsell297');
          }
          scrollToTop();
        }, 1500);
      } else {
        // If not approved, stayed in verifying for a bit then let the UI handle the "wait" state
        // We'll add a timer in the UI to allow "Try again" or go back
        console.log("Pagamento ainda não identificado.");
      }
    } catch (err) {
      console.error("Erro ao verificar pagamento:", err);
      // Fallback will be handled in the step UI
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApprove17 = async () => {
    // Simulate webhook
    if (trackingNumber && !trackingNumber.startsWith('REQ-')) {
       try {
           await fetch('/api/admin/confirmar-pagamento', {
               method: 'POST',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ processoId: trackingNumber, level: "1", valor: 17, gateway: 'SIMULACAO_FRONTEND' })
           });
       } catch (err) {}
    }

    scrollToTop();
    setStep('step4c_results');
  };

  const handleVerLaudo = () => {
     scrollToTop();
     setStep('step4d_checkout_47');
     generatePix("2");
     setTimeout(() => {
       scrollToTop();
       setStep('step4e_waiting_payment');
     }, 2500);
  }

  const handleSimulateWebhook = () => {
    scrollToTop();
    setStep('step5_pay47');
  };

  const handlePay47 = async () => {
    const currentTrackId = trackingNumber || `REQ-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    if (!trackingNumber) setTrackingNumber(currentTrackId);
    
    if (trackingNumber && !trackingNumber.startsWith('REQ-')) {
       try {
           await fetch('/api/admin/confirmar-pagamento', {
               method: 'POST',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ processoId: trackingNumber, level: "2", valor: 47, gateway: 'SIMULACAO_FRONTEND' })
           });
       } catch (err) {}
    }
    
    scrollToTop();
    setStep('step6_upload');
  };

  const handleUploadComplete = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      scrollToTop();
      setStep('step6a_ai_processing');
      try {
          const result = await gerarLaudoTecnico(file, trackingNumber || nup);
          setLaudoData(result);
          setStep('step7_upsell297');
      } catch (err) {
          console.error(err);
          setStep('step7_upsell297');
      }
    }
  };

  const handleSendLater = () => {
    scrollToTop();
    setStep('step6b_send_later');
  }

  const handlePay297 = async () => {
    generatePix("3");
    
    // No longer simulates approve, will wait for real one or user can manual check
    // setNup(finalNup);
    // setProcessStarted(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col font-sans" ref={scrollRef}>
      {partnerName && step === 'step1_hero_form' && (
        <div className="bg-[#1e293b] text-white py-2 px-4 flex items-center justify-center text-sm">
          <User className="w-4 h-4 mr-2 text-indigo-400" />
          <span className="opacity-90 mr-1">Consultor Associado:</span>
          <strong className="font-bold text-indigo-300">{partnerName}</strong>
        </div>
      )}
      {step === 'step1_hero_form' && (
        <header className="w-full max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center">
                    <Scale className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-[#1e293b] text-xl tracking-tight">GSA Câmara</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6 text-sm font-bold">
                <button onClick={() => navigate('/acompanhar')} className="text-blue-600 hover:text-blue-700 transition-colors">
                    Acompanhar Pedido
                </button>
                <button onClick={() => navigate('/login')} className="text-[#1e293b] border-b-2 border-[#1e293b] pb-0.5 hover:opacity-80 transition-opacity">
                    Acesso Cliente
                </button>
            </div>
        </header>
      )}

      <main className={cn(
          "flex-1 flex flex-col",
          step === 'step1_hero_form' ? "items-center justify-start p-4 md:p-12 lg:p-16" : "items-center justify-center p-4 md:p-8"
      )}>
        <AnimatePresence mode="wait">
          
          {/* STEP 1: HERO + FORM INITIAL */}
          {step === 'step1_hero_form' && (
            <motion.div 
              key="step1" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              className="w-full max-w-7xl mx-auto flex flex-col gap-16 lg:gap-32"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="space-y-6 md:space-y-10 max-w-xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80 text-gray-700 text-[10px] md:text-xs font-black tracking-widest uppercase">
                    <CheckCircle2 size={14} className="text-green-600" /> 100% Online e Seguro
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-serif text-[#1e293b] leading-[1.1] tracking-tight">
                  Justiça Financeira AJUSTADA para o seu <span className="italic font-light text-[#5A5A40]">Contrato.</span>
                </h1>
                
                {/* Mobile Social Proof */}
                <div className="lg:hidden flex flex-col items-center gap-3 pt-2">
                    <div className="flex -space-x-3">
                        <img className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/100?img=1" alt="Usuário" />
                        <img className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/100?img=2" alt="Usuário" />
                        <img className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/100?img=3" alt="Usuário" />
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white bg-[#1e293b] flex items-center justify-center text-[10px] text-white font-bold">+1k</div>
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">+1.200 acordos este mês</p>
                </div>

                <p className="text-base md:text-xl text-gray-500 font-medium leading-relaxed">
                  Identificamos juros abusivos e descontos indevidos em minutos. Análise inicial <strong className="text-[#1e293b]">GRATUITA</strong> e sem a demora do judiciário comum.
                </p>

                <div className="hidden lg:block pt-8 space-y-4 border-t border-gray-100">
                    <div className="flex -space-x-4">
                        <img className="w-10 h-10 rounded-full border-2 border-white ring-4 ring-gray-50" src="https://i.pravatar.cc/100?img=11" alt="Usuário" />
                        <img className="w-10 h-10 rounded-full border-2 border-white ring-4 ring-gray-50" src="https://i.pravatar.cc/100?img=12" alt="Usuário" />
                        <img className="w-10 h-10 rounded-full border-2 border-white ring-4 ring-gray-50" src="https://i.pravatar.cc/100?img=13" alt="Usuário" />
                        <img className="w-10 h-10 rounded-full border-2 border-white ring-4 ring-gray-50" src="https://i.pravatar.cc/100?img=14" alt="Usuário" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest tracking-tighter">+1.200 acordos firmados este mês</p>
                </div>
              </div>

              <div className="relative w-full max-w-lg mx-auto">
                 {/* Floating Badge (Desktop Only) */}
                 <div className="hidden lg:flex absolute -left-12 -top-12 bg-white p-5 rounded-3xl shadow-2xl border border-gray-50 items-center justify-center gap-4 z-10 w-72 animate-[bounce_4s_ease-in-out_infinite]">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                        <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Processamento</p>
                        <p className="text-sm font-bold text-[#1e293b]">Análise Pericial em tempo real</p>
                    </div>
                 </div>

                 {/* Success Badge */}
                 <div className="hidden lg:block absolute -right-8 -bottom-8 bg-white p-6 rounded-3xl shadow-2xl border border-green-50 z-10 w-72">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Potencial de Recuperação</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">R$ 4.250,00</p>
                 </div>

                <form onSubmit={handleAnalise} className="bg-white p-6 md:p-10 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-100 space-y-6 relative z-0">
                    <div className="text-center pb-6 border-b border-gray-50">
                        <h3 className="text-2xl font-black text-[#1e293b] tracking-tight">Simulação Gratuita</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Preencha os dados do seu contrato</p>
                    </div>

                    <div className="space-y-4 md:space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modalidade do Contrato</label>
                        <select
                        value={contractData.type}
                        onChange={(e) => setContractData({ ...contractData, type: e.target.value })}
                        className="w-full p-4 md:p-5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-[#1e293b] outline-none bg-gray-50 transition-all font-bold text-slate-700"
                        >
                        <option value="Empréstimo CLT">Empréstimo CLT</option>
                        <option value="Financiamento de Veículos">Financiamento de Veículos</option>
                        <option value="Financiamento Imobiliário">Financiamento Imobiliário</option>
                        <option value="Cartão de crédito">Cartão de crédito</option>
                        <option value="Capital de Giro">Capital de Giro</option>
                        <option value="Empréstimo pessoal">Empréstimo pessoal</option>
                        <option value="Empréstimo consignado">Empréstimo consignado</option>
                        <option value="Outros">Outros</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor do Empréstimo</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                          <input
                          required
                          type="number"
                          value={contractData.loan}
                          onChange={(e) => setContractData({ ...contractData, loan: e.target.value })}
                          placeholder="Ex: 15.000"
                          className="w-full pl-12 pr-6 py-4 md:py-5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-[#1e293b] outline-none bg-gray-50 transition-all font-bold text-slate-800"
                          />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parcela Atual</label>
                            <input
                            required
                            type="number"
                            value={contractData.installment}
                            onChange={(e) => setContractData({ ...contractData, installment: e.target.value })}
                            placeholder="R$ 450"
                            className="w-full p-4 md:p-5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-[#1e293b] outline-none bg-gray-50 transition-all font-bold text-slate-800"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Parcelas</label>
                            <input
                            required
                            type="number"
                            value={contractData.months}
                            onChange={(e) => setContractData({ ...contractData, months: e.target.value })}
                            placeholder="Ex: 48"
                            className="w-full p-4 md:p-5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-[#1e293b] outline-none bg-gray-50 transition-all font-bold text-slate-800"
                            />
                        </div>
                    </div>
                    </div>

                    <button
                    type="submit"
                    className="w-full bg-[#1e293b] hover:bg-black text-white py-5 md:py-6 rounded-2xl font-black text-lg transition-all transform hover:-translate-y-1 shadow-2xl shadow-gray-900/20 active:translate-y-0"
                    >
                    Continuar Grátis
                    </button>
                    <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Protegido por criptografia bancária</p>
                </form>
              </div>
              </div>

              {/* STEPS JOURNEY */}
              <div className="w-full py-12 md:py-20" id="jornada-anchor">
                  <div className="text-center space-y-4 mb-16 md:mb-24">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] md:text-xs font-black tracking-widest uppercase">
                          <BrainCircuit size={14} /> Inteligência Artificial a seu serviço
                      </div>
                      <h2 className="text-3xl md:text-5xl font-serif text-[#1e293b] font-bold tracking-tight">
                          Sua jornada para a <span className="text-indigo-600">Justiça Financeira</span>
                      </h2>
                      <p className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-[0.2em]">Um processo simples, rápido e 100% digital</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
                      {/* Decorative Line (Desktop) */}
                      <div className="hidden md:block absolute top-[4.5rem] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-gray-100 to-transparent"></div>
                      
                      {[
                        {
                          step: "01",
                          title: "Análise Digital",
                          desc: "Preencha os dados do seu contrato e nossa IA cruza as taxas com as tabelas oficiais do Banco Central em tempo real.",
                          icon: Search,
                          color: "bg-blue-50 text-blue-600",
                          border: "border-blue-100"
                        },
                        {
                          step: "02",
                          title: "Laudo Pericial",
                          desc: "Geramos um relatório técnico detalhado identificando cada centavo cobrado indevidamente, pronto para ser usado como prova.",
                          icon: FileText,
                          color: "bg-indigo-50 text-indigo-600",
                          border: "border-indigo-100"
                        },
                        {
                          step: "03",
                          title: "Mediação Direta",
                          desc: "Nossos especialistas assumem a negociação com o banco buscando o melhor acordo para redução da sua dívida.",
                          icon: Scale,
                          color: "bg-green-50 text-green-600",
                          border: "border-green-100"
                        }
                      ].map((item, i) => (
                        <div key={i} className="relative group">
                            <div className={`w-16 h-16 md:w-20 md:h-20 ${item.color} rounded-[2rem] flex items-center justify-center mb-8 mx-auto md:mx-0 shadow-lg shadow-gray-200/50 relative z-10 border ${item.border} group-hover:scale-110 transition-transform`}>
                                <item.icon size={28} className="md:w-8 md:h-8" />
                                <div className="absolute -top-2 -right-2 bg-white text-[#1e293b] w-8 h-8 rounded-full border-2 border-gray-50 flex items-center justify-center text-xs font-black shadow-sm">
                                    {item.step}
                                </div>
                            </div>
                            <div className="text-center md:text-left space-y-3">
                                <h3 className="text-xl md:text-2xl font-black text-[#1e293b]">{item.title}</h3>
                                <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                      ))}
                  </div>
              </div>

              {/* TESTIMONIALS */}
              <div className="w-full space-y-12 pb-12">
                  <div className="text-center space-y-4">
                      <h2 className="text-2xl md:text-4xl font-serif text-[#1e293b] font-bold tracking-tight px-4">
                          O que dizem nossos clientes
                      </h2>
                      <p className="text-gray-400 font-bold text-[10px] md:text-sm uppercase tracking-widest">Feedback real de usuários autenticados</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        {
                          text: "Descobri que estava pagando quase o dobro do valor justo. Em poucos dias a GSA resolveu tudo!",
                          name: "Marcos Vinícius",
                          role: "SERVIDOR PÚBLICO",
                          img: "https://i.pravatar.cc/100?img=1"
                        },
                        {
                          text: "O laudo técnico é muito detalhado e me deu a segurança que eu precisava para negociar com o banco.",
                          name: "Helena Souza",
                          role: "APOSENTADA",
                          img: "https://i.pravatar.cc/100?img=2"
                        },
                        {
                          text: "A economia gerada foi absurda. Identificaram taxas que eu nem sabia que existiam. Recomendo!",
                          name: "Roberto Dias",
                          role: "EMPRESÁRIO",
                          img: "https://i.pravatar.cc/100?img=3"
                        },
                        {
                          text: "Estava desesperada com as parcelas do consignado. O laudo da GSA foi o divisor de águas.",
                          name: "Patrícia Lima",
                          role: "PROFESSORA",
                          img: "https://i.pravatar.cc/100?img=4"
                        }
                      ].map((t, i) => (
                        <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-xl transition-shadow group">
                           <div className="space-y-4">
                              <div className="flex gap-1 text-amber-400">
                                 {[1,2,3,4,5].map(star => <Star key={star} size={14} className="fill-amber-400" />)}
                              </div>
                              <p className="text-sm text-gray-500 font-medium italic leading-relaxed">"{t.text}"</p>
                           </div>
                           <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-gray-100 group-hover:ring-indigo-100 transition-all">
                                 <img src={t.img} alt={t.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-[#1e293b]">{t.name}</p>
                                 <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-0.5">{t.role}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                  </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LOADING */}
          {step === 'step2_loading' && (
            <motion.div 
              key="step2" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-8 py-20"
            >
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-black text-[#1e293b] animate-pulse">
                  Processando Laudo...
                </p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cruzando dados com o Banco Central</p>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CAPTURE LEAD */}
          {step === 'step3_capture' && (
            <motion.div 
              key="step3" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl mx-auto space-y-12"
            >
              {/* Organized Header and Alert */}
              <div className="flex flex-col items-center text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-widest border border-red-100 italic">
                    <ShieldAlert size={16} /> Auditoria Técnica em Tempo Real
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-[#1e293b] font-bold leading-tight max-w-2xl px-4">
                    Detectamos <span className="text-red-600">Irregularidades Graves</span> em seu Contrato.
                  </h2>
                  <p className="text-gray-500 font-medium max-w-xl px-6 leading-relaxed">
                    Nossa IA cruzou seus dados com as taxas oficiais do Banco Central e identificou cobranças que não deveriam estar no seu contrato.
                  </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Visual Analysis Panel */}
                  <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col space-y-8">
                      <div className="flex justify-between items-center">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nível de Abusividade</p>
                          <div className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                              simulationResults?.isAbusive ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                              Risco {simulationResults?.isAbusive ? "Crítico" : "Moderado"}
                          </div>
                      </div>

                      {/* Gauge Section Refined */}
                      <div className="relative flex flex-col items-center py-4">
                         <div className="relative w-48 h-24 overflow-hidden">
                            <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[1.25rem] border-slate-100 border-t-red-500 border-l-green-500 border-r-amber-400 transform -rotate-45" style={{borderRightColor: '#fbbf24', borderTopColor: '#ef4444', borderLeftColor: '#22c55e'}}></div>
                            <div 
                              className="absolute bottom-0 left-1/2 w-1 h-20 bg-slate-900 origin-bottom transform -translate-x-1/2 flex items-end justify-center rounded-t-full transition-transform duration-1000 ease-out"
                              style={{ transform: `rotate(${simulationResults?.isAbusive ? '65deg' : '25deg'}) translateX(-50%)` }}
                            >
                                <div className="w-4 h-4 bg-slate-900 rounded-full absolute -bottom-2 ring-4 ring-white shadow-md"></div>
                            </div>
                         </div>
                         <div className="mt-4 text-center">
                            <p className="text-4xl font-black text-[#1e293b] leading-none mb-1">
                                {simulationResults?.isAbusive ? "89%" : "64%"}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Viabilidade de Redução</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex justify-between items-center">
                              <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parcela Atual</p>
                                  <p className="text-xl font-black text-[#1e293b]">R$ {contractData.installment || '0,00'}</p>
                              </div>
                              <ArrowRight className="text-gray-300" />
                              <div className="text-right">
                                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Possível Parcela</p>
                                  <p className="text-xl font-black text-green-600">R$ {(0.7 * parseFloat(contractData.installment || '0')).toFixed(2).replace('.', ',')}</p>
                              </div>
                          </div>
                          
                          <p className="text-xs text-gray-500 font-medium text-center px-4">
                            *Valores estimados com base em processos similares na GSA Câmara.
                          </p>
                      </div>
                  </div>

                  {/* Form Component (Step 1 to reach goal) */}
                  <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-indigo-900/5 border border-indigo-50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                          <BrainCircuit size={120} />
                      </div>
                      
                      <div className="relative z-10 space-y-6">
                          <div className="space-y-2">
                              <h3 className="text-xl font-black text-[#1e293b]">Liberação do Diagnóstico</h3>
                              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                Para gerar o seu relatório técnico em PDF e iniciar o protocolo oficial, confirme seus dados abaixo.
                              </p>
                          </div>

                          <form onSubmit={handleCapture} className="space-y-4">
                              <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-4">
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                          <input
                                              required
                                              type="text"
                                              placeholder="Seu nome"
                                              value={leadData.name}
                                              onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                              className="w-full p-4 rounded-xl border border-gray-100 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none text-base bg-gray-50/50 transition-all font-bold"
                                          />
                                      </div>
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CPF para a Auditoria</label>
                                          <input
                                              required
                                              type="text"
                                              placeholder="000.000.000-00"
                                              value={leadData.document}
                                              onChange={(e) => setLeadData({ ...leadData, document: e.target.value })}
                                              className="w-full p-4 rounded-xl border border-gray-100 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none text-base bg-gray-50/50 transition-all font-bold"
                                          />
                                      </div>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp de Contato</label>
                                      <input
                                          required
                                          type="tel"
                                          placeholder="(00) 00000-0000"
                                          value={leadData.whatsapp}
                                          onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                                          className="w-full p-4 rounded-xl border border-gray-100 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none text-base bg-gray-50/50 transition-all font-bold"
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail para Recebimento</label>
                                      <input
                                          required
                                          type="email"
                                          placeholder="seu@email.com"
                                          value={leadData.email}
                                          onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                                          className="w-full p-4 rounded-xl border border-gray-100 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none text-base bg-gray-50/50 transition-all font-bold"
                                      />
                                  </div>
                              </div>

                              <button
                                  type="submit"
                                  disabled={isSubmitting}
                                  className="w-full bg-[#1e293b] hover:bg-black text-white py-5 rounded-2xl font-black text-lg transition-all transform hover:-translate-y-1 shadow-xl shadow-indigo-900/10 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                  {isSubmitting ? <Loader2 className="animate-spin" /> : <>Próximo Passo <ArrowRight size={20} /></>}
                              </button>
                              <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Protegido por criptografia LGPD</p>
                          </form>
                      </div>
                  </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PAY 17 (PAYWALL) */}
          {step === 'step4_pay17' && (
            <motion.div 
              key="step4" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-xl mx-auto space-y-8"
            >
              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-50 text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                
                <div className="space-y-2">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                        <FileText size={36} />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-[#1e293b] leading-tight">
                        Relatório Especial Liberado
                    </h3>
                    <p className="text-gray-500 font-medium">
                        O sistema confirmou a viabilidade do seu caso. Abaixo está o resumo do que identificamos:
                    </p>
                </div>
                
                <div className="bg-[#1e293b] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <TrendingUp size={80} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Potencial de Restituição</p>
                        <p className="text-4xl md:text-5xl font-black leading-none tracking-tighter">
                            R$ {(simulationResults?.totalLoss || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                        <div className="pt-4 border-t border-white/10 flex justify-center gap-8">
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Status</p>
                                <p className="text-sm font-black text-green-400">APROVADO</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Cálculo</p>
                                <p className="text-sm font-black">EXATO</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-600 font-medium leading-relaxed px-4">
                      Para baixar o relatório completo com o <strong>Parecer da IA</strong> e o comparativo detalhado (P4), efetue o pagamento da taxa de processamento.
                    </p>
                    
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-2">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Taxa Única</span>
                            <span className="text-2xl font-black text-[#1e293b]">R$ 17,00</span>
                        </div>
                        <button
                          onClick={handlePay17}
                          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-green-900/10 flex justify-center items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
                        >
                          <CreditCard size={24} />
                          EFETUAR PAGAMENTO
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 text-gray-300">
                        <div className="h-0.5 flex-1 bg-gray-100"></div>
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Garantia GSA Câmara</span>
                        <div className="h-0.5 flex-1 bg-gray-100"></div>
                    </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4b: CHECKOUT REDIRECT MOCK */}
          {step === 'step4b_checkout_17' && (
            <motion.div 
              key="step4b" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="w-full max-w-md mx-auto space-y-6 text-center"
            >
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mb-1">Pagamento via PIX</p>
                <div className="text-4xl font-black text-[#1e293b] mb-6">R$ 17,00</div>
                {pixError ? (
                  <div className="py-8 px-4 flex flex-col items-center text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-sm font-bold text-gray-800 mb-2">Ops! Problema no Gateway</p>
                    <p className="text-xs text-gray-500 mb-6">{pixError}</p>
                    
                    <div className="w-full space-y-3">
                      <button 
                          onClick={() => generatePix("1")}
                          className="w-full bg-[#1e293b] text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
                      >
                          Tentar Novamente
                      </button>
                      <a 
                        href={`https://wa.me/5511999999999?text=Olá, tive um problema ao gerar o pagamento de R$ 17,00 no site. Erro: ${pixError}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        Falar com Suporte
                      </a>
                    </div>
                  </div>
                ) : pixData ? (
                  <>
                    <div className="w-64 h-64 bg-white p-4 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner overflow-hidden">
                        <img 
                          src={pixData.qr_code_base64?.startsWith('data:') ? pixData.qr_code_base64 : `data:image/png;base64,${pixData.qr_code_base64}`} 
                          alt="QR Code Pix" 
                          className="w-full h-full object-contain" 
                        />
                    </div>
                    
                    <button
                        onClick={handleCopyPix}
                        className="w-full flex items-center justify-center gap-2 bg-[#f8f7f5] hover:bg-gray-100 p-4 rounded-xl border border-gray-200 text-sm font-bold text-[#1e293b] transition-all mb-4 overflow-hidden"
                    >
                        {isCopying ? <><Check className="text-green-600" /> Copiado!</> : <><Copy size={18} /> Copiar e Colar PIX</>}
                    </button>
                    
                    <p className="text-xs font-medium text-gray-500 mb-6 px-4">Acesse o aplicativo do seu banco e escaneie o código acima ou use o Copia e Cola.</p>
                    
                    <div className="w-full p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Verificação Automática Ativa</p>
                        <p className="text-[11px] text-blue-700">Assim que você pagar, esta tela irá mudar sozinha. Se demorar, toque abaixo:</p>
                        <button
                            onClick={verifyPaymentManually}
                            disabled={isVerifying}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Já paguei, verificar agora"}
                        </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-[#1e293b] animate-spin mb-4" />
                    <p className="text-sm font-bold text-gray-500">Gerando seu PIX Seguro...</p>
                  </div>
                )}
                
                <div className="w-full bg-[#f8f7f5] p-4 rounded-xl border border-gray-200 flex flex-col gap-3 mt-6">
                   <p className="text-xs font-bold text-gray-500 uppercase">Ambiente Seguro (SSL):</p>
                   {/* Removed Simulator button */}
                    <p className="text-[10px] text-gray-400">O pagamento é processado via {pixData?.gateway?.toUpperCase() || 'Gateway'} e o desbloqueio ocorre em segundos.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4c: RESULTS REVEALED */}
          {step === 'step4c_results' && (
            <motion.div 
              key="step4c" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-[#22c55e]/20 text-center space-y-6">
                <CheckCircle2 className="w-16 h-16 text-[#22c55e] mx-auto mb-2" />
                <h3 className="text-2xl md:text-3xl font-black text-[#1e293b] leading-tight">
                  Pagamento Aprovado!
                </h3>
                <p className="text-gray-600 font-medium">Aqui está o resultado detalhado da sua análise prévia:</p>
                
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-6">
                   <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-1">Sua Taxa Real Cobrada</p>
                   <p className="text-4xl font-black text-[#DC2626]">{simulationResults?.realRatePerc || '0.00% a.m.'}</p>
                   <p className="text-sm font-bold text-gray-500 mt-2">Quando pelo Banco Central deveria ser próximo a <span className="text-green-600">{simulationResults?.bacenRatePerc || '1,68% a.m.'}</span></p>
                </div>

                {simulationResults?.isAbusive ? (
                  <div className="space-y-4 text-left">
                      <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex justify-between items-center">
                        <p className="text-sm font-bold text-red-800">Prejuízo Total Estimado:</p>
                        <p className="text-2xl font-black text-red-600">R$ {(simulationResults?.totalLoss || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      </div>
                      <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex justify-between items-center">
                        <p className="text-sm font-bold text-green-800">Valor Justo da Parcela:</p>
                        <p className="text-2xl font-black text-green-600">R$ {(simulationResults?.newPmt || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                      <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 items-center">
                        <p className="text-sm font-bold text-yellow-800 mb-2">Sua taxa não configurou abusividade extrema perante o BACEN, MAS...</p>
                        <p className="text-sm text-yellow-700">Podem existir <strong>vendas casadas</strong> no seu contrato (como seguros e taxas irregulares) que frequentemente representam cobrança indevida de até 15% do valor total.</p>
                      </div>
                      <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex justify-between items-center">
                        <p className="text-sm font-bold text-red-800">Prejuízo Oculto Estimado:</p>
                        <p className="text-2xl font-black text-red-600">Até R$ {(simulationResults?.totalLoss || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-100 mt-6 space-y-6">
                    <div className="text-center">
                        <h4 className="text-xl md:text-2xl font-bold text-[#1e293b] mb-4">Próximo Passo Recomendado</h4>
                        <p className="text-sm text-gray-600">Para dar entrada no processo de revisão e solicitar o reembolso do valor cobrado a mais, você precisa do <strong>Laudo Pericial Financeiro</strong>.</p>
                    </div>

                    <div className="bg-[#fef2f2] p-6 rounded-[2rem] border border-red-100/50 text-left space-y-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
                      <h5 className="text-lg md:text-xl font-bold text-red-800 relative z-10">Quer um Laudo Técnico contra o banco?</h5>
                      <p className="text-sm text-red-700/90 relative z-10 leading-relaxed">Faça o upload do seu contrato. Nossa IA vai ler todas as letras miúdas, identificar vendas casadas, calcular IOF irregular e gerar um Parecer Prévio em PDF.</p>
                      
                      <button
                        onClick={handleVerLaudo}
                        className="w-full bg-[#e60000] hover:bg-[#cc0000] text-white py-4 rounded-xl font-bold text-lg transition-all shadow-md mt-4 relative z-10"
                      >
                        Gerar Laudo com IA (R$ 47,00)
                      </button>
                    </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 4d: CHECKOUT REDIRECT MOCK (47,00) */}
          {step === 'step4d_checkout_47' && (
            <motion.div 
              key="step4d" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-12 text-center"
            >
              <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-[#1e293b]">Redirecionando para o Pagamento...</h2>
              <p className="text-gray-500 mt-2">Você está sendo direcionado para o emissor do Mercado Pago.</p>
            </motion.div>
          )}

          {/* STEP 4e: WAITING FOR PIX PAYMENT (CHECKOUT MOCK) */}
          {step === 'step4e_waiting_payment' && (
            <motion.div 
              key="step4e" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="w-full max-w-md mx-auto space-y-6 text-center"
            >
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mb-1">Pagamento via PIX</p>
                <div className="text-4xl font-black text-[#1e293b] mb-6">R$ 47,00</div>
                
                {pixError ? (
                   <div className="py-8 px-4 flex flex-col items-center text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-sm font-bold text-gray-800 mb-2">Ops! Problema no Checkout</p>
                    <p className="text-xs text-gray-500 mb-6">{pixError}</p>
                    
                    <div className="w-full space-y-3">
                      <button 
                          onClick={() => generatePix("2")}
                          className="w-full bg-black text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-900 transition-all"
                      >
                          Tentar Novamente
                      </button>
                      <a 
                        href={`https://wa.me/5511999999999?text=Olá, tive um problema ao gerar o pagamento de R$ 47,00 no site. Erro: ${pixError}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        Chamar Suporte
                      </a>
                    </div>
                  </div>
                ) : pixData ? (
                   <div className="flex flex-col items-center w-full">
                    <div className="w-64 h-64 bg-white p-4 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                        <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="w-full h-full object-contain" />
                    </div>
                    
                    <button
                        onClick={handleCopyPix}
                        className="w-full flex items-center justify-center gap-2 bg-[#f8f7f5] hover:bg-gray-100 p-4 rounded-xl border border-gray-200 text-sm font-bold text-[#1e293b] transition-all mb-4 overflow-hidden"
                    >
                        {isCopying ? <><Check className="text-green-600" /> Copiado!</> : <><Copy size={18} /> Copiar e Colar PIX</>}
                    </button>
                    
                    <p className="text-xs font-medium text-gray-500 mb-6 px-4">Utilize o seu banco para pagar.</p>
                    
                    <div className="w-full p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-3">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Sincronização Ativa</p>
                        <p className="text-[11px] text-orange-700">O laudo será liberado imediatamente após o pagamento.</p>
                        <button
                            onClick={verifyPaymentManually}
                            disabled={isVerifying}
                            className="w-full bg-black text-white py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                            {isVerifying ? "Verificando..." : "Confirmar Pagamento"}
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
                      <p className="text-sm font-bold text-gray-500">Iniciando Checkout Seguro...</p>
                  </div>
                )}
                
                <div className="w-full bg-[#f8f7f5] p-4 rounded-xl border border-gray-200 flex flex-col gap-3 mt-4">
                    <p className="text-[10px] text-gray-400 font-medium">A GSA utiliza criptografia de ponta a ponta em suas transações financeiras.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: VERIFYING PAYMENT (WAITING SCREEN) */}
          {step === 'step_verifying_payment' && (
            <motion.div 
              key="step_verifying" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl mx-auto space-y-8"
            >
              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-50 text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-blue-600/20">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"
                  />
                </div>

                <div className="relative">
                  <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-blue-100 relative group">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <Clock size={48} className="text-blue-600" />
                    </motion.div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl md:text-3xl font-black text-[#1e293b] leading-tight">
                    Confirmando seu Pagamento
                  </h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    Estamos consultando a câmara de compensação do Banco Central. Isso geralmente leva de 10 a 60 segundos.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                   <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shrink-0">
                         {isVerifying ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Status da Transação</p>
                        <p className="text-sm font-bold text-gray-400">
                          {isVerifying ? "Consultando Gateway..." : "Aguardando sinal bancário..."}
                        </p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shrink-0">
                         <ShieldCheck className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Segurança GSA</p>
                        <p className="text-sm font-bold text-gray-400">Conexão criptografada (SSL)</p>
                      </div>
                   </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button
                    onClick={verifyPaymentManually}
                    disabled={isVerifying}
                    className="w-full bg-[#1e293b] hover:bg-black text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-900/10 flex items-center justify-center gap-2"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" /> : "Verificar Agora"}
                  </button>

                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => setStep(pixData?.level === '1' ? 'step4b_checkout_17' : 'step4e_waiting_payment')}
                      className="flex-1 text-gray-400 hover:text-[#1e293b] font-bold text-sm transition-colors py-2"
                    >
                      Voltar para o QR Code
                    </button>
                    <button
                      onClick={() => navigate(`/acompanhar/${trackingNumber}`)}
                      className="flex-1 text-gray-400 hover:text-[#1e293b] font-bold text-sm transition-colors py-2"
                    >
                      Acompanhar na Consulta Pública
                    </button>
                    <a
                      href={`https://wa.me/5511999999999?text=Oi, já fiz o pagamento do NUP ${trackingNumber} mas ainda não foi identificado.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-blue-600 hover:text-blue-700 font-bold text-sm transition-colors py-2 flex items-center justify-center gap-1"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                   <p className="text-[10px] md:text-xs font-bold text-amber-700 leading-relaxed uppercase tracking-widest italic">
                     "Recomendamos aguardar nesta tela. O redirecionamento é automático assim que o PIX for liquidado."
                   </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: PAY 47 (SUCCESS PIX MODAL MOCK) */}
          {step === 'step5_pay47' && (
            <motion.div 
              key="step5" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="w-full max-w-md mx-auto"
            >
              <div className="bg-[#0f172a] rounded-t-3xl p-6 flex justify-between items-center text-white">
                <div>
                    <h3 className="font-bold text-lg">Pagamento Seguro PIX</h3>
                    <p className="text-[11px] text-gray-400">GSA Câmara - Desbloqueio de Relatório</p>
                </div>
                <button className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="bg-white rounded-b-3xl shadow-xl flex flex-col items-center pt-12 pb-8 text-center border border-gray-100">
                <div className="w-24 h-24 bg-[#e6f4ea] rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12 text-[#22c55e]" strokeWidth={3} />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#22c55e] mb-2 tracking-tight">Pagamento Aprovado!</h2>
                <p className="text-gray-500 text-sm mb-10">A libertar o seu relatório de economia...</p>
                
                <div className="w-full border-t border-gray-100 pt-6 px-8 flex justify-center items-center gap-3">
                    <span className="text-gray-500 font-medium text-sm">Valor a pagar:</span>
                    <span className="text-2xl font-black text-[#1e293b]">R$ 47,00</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: UPLOAD CONTRATO */}
          {step === 'step6_upload' && (
            <motion.div 
              key="step6" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-center gap-3 bg-green-50 text-green-800 p-4 rounded-2xl border border-green-100">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-bold text-sm">Pagamento Confirmado! Relatório liberado.</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 text-center space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-[#1e293b]">Você precisa anexar o contrato para seguir.</h3>
                <p className="text-gray-600 font-medium">Nossa inteligência artificial avançada precisa ler o seu contrato bancário para confirmar onde os juros abusivos estão embutidos.</p>

                <div className="border-2 border-dashed border-[#1e293b]/20 bg-[#f8f7f5] rounded-3xl p-8 hover:bg-gray-50 transition-colors cursor-pointer relative group">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUploadComplete}
                  />
                  <div className="flex flex-col items-center gap-4 text-[#1e293b]">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-[#1e293b]" />
                    </div>
                    <div>
                      <p className="font-bold text-lg mb-1">Toque para anexar o PDF</p>
                      <p className="text-sm font-medium text-gray-500">Aceitamos PDF ou Fotos legíveis</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">OU</p>
                  <button
                    onClick={handleSendLater}
                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 py-4 rounded-xl font-bold text-sm transition-all shadow-sm"
                  >
                    Não tenho o contrato agora (Enviar depois)
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 6a: AI PROCESSING (GEMINI) */}
          {step === 'step6a_ai_processing' && (
            <motion.div 
              key="step6a" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-12 text-center w-full max-w-xl mx-auto"
            >
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 w-full">
                  <div className="relative mb-8 mx-auto w-24 h-24">
                     <Loader2 className="w-24 h-24 text-[#203a70] animate-spin" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Search className="w-8 h-8 text-[#22c55e] animate-pulse" />
                     </div>
                  </div>
                  <h2 className="text-2xl font-black text-[#1e293b] leading-tight mb-4">Inteligência Artificial (Gemini) analisando...</h2>
                  <p className="text-gray-500 font-medium">Nossa IA está lendo cada cláusula do seu documento em busca de taxas abusivas e irregularidades legais para emitir o seu Laudo Automate.</p>
              </div>
            </motion.div>
          )}

          {/* STEP 6b: SEND LATER (LINK & SUPPORT) */}
          {step === 'step6b_send_later' && (
             <motion.div 
             key="step6b" 
             initial={{ opacity: 0, y: 20 }} 
             animate={{ opacity: 1, y: 0 }} 
             exit={{ opacity: 0, y: -20 }}
             className="w-full max-w-xl mx-auto space-y-6"
           >
             <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 text-center space-y-6">
                <div className="w-16 h-16 bg-[#fffbea] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#fef08a]">
                    <AlertTriangle className="w-8 h-8 text-[#ca8a04]" />
                </div>
               <h3 className="text-xl md:text-2xl font-bold text-[#1e293b] leading-tight px-4">
                 Tudo bem! Você pode enviar o seu contrato depois.
               </h3>
               
               <p className="text-gray-600 font-medium">
                 Para acessar o seu painel de acompanhamento mais tarde e realizar o envio do documento, basta acessar o nosso <strong>Portal Público de Consulta</strong> usando o seu CPF ou o Número de Solicitação.
               </p>

               <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-200">
                    <p className="text-xs uppercase font-bold tracking-widest text-gray-500 mb-2">Seu Número de Solicitação:</p>
                    <div className="flex items-center justify-between bg-white border border-gray-200 md:p-4 p-3 rounded-xl">
                        <span className="font-mono font-black text-gray-800 text-lg md:text-xl break-words selection:bg-blue-100">{trackingNumber}</span>
                    </div>
               </div>

               <div className="pt-6 border-t border-gray-100 mt-6 space-y-3">
                   <p className="text-sm font-bold text-gray-800 mb-2">Precisa de ajuda para baixar o contrato direto do aplicativo do seu banco?</p>
                   <button
                     onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                     className="w-full bg-[#25D366] hover:bg-[#1ebd5b] text-white py-4 rounded-xl font-bold text-lg transition-all shadow-md flex justify-center items-center gap-2"
                   >
                     Falar com o Suporte (WhatsApp)
                   </button>
                   
                   <button
                     onClick={() => navigate('/portal')}
                     className="w-full bg-white hover:bg-gray-50 text-[#1e293b] border-2 border-gray-200 py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2 mt-2"
                   >
                     Acessar Portal do Cliente
                   </button>
               </div>
             </div>
           </motion.div>
          )}

          {/* STEP 7: UPSELL 297 (MEDIAÇÃO) */}
          {step === 'step7_upsell297' && (
            <motion.div 
              key="step7" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="w-full max-w-xl mx-auto space-y-6"
            >
              
              {/* Laudo Card (First Image) */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <FileText className="w-32 h-32 text-[#1e293b]" />
                 </div>
                 <div className="relative z-10">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-black text-[#1e293b] mb-2">Laudo Pericial Financeiro</h3>
                    <p className="text-sm text-gray-500 mb-6">Seu documento já foi analisado por nossa Inteligência Artificial e obteve o selo de autenticidade da GSA Câmara.</p>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 max-h-96 overflow-y-auto text-sm">
                        {laudoData ? (
                            <div className="space-y-4">
                                <div className="flex flex-col items-center border-b pb-4 mb-4 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-2">
                                        <Scale className="w-5 h-5 text-[#a51c30]" />
                                        <span className="font-serif font-black text-sm tracking-tighter text-gray-900 uppercase">GSA Câmara</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-800 uppercase leading-tight">Câmara de Mediação e Conciliação</p>
                                    <p className="text-[8px] text-gray-500 uppercase">CNPJ: 43.213.208/0001-00 | 54 3196-2669</p>
                                </div>
                                <ReactMarkdown>{laudoData.markdown}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Status:</span>
                                    <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Finalizado</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Data de Emissão:</span>
                                    <span className="font-bold text-[#1e293b]">Hoje</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Resultado:</span>
                                    <span className="text-red-600 font-black">Indício Abusivo</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={downloadPDF}
                        className="w-full bg-[#1e293b] hover:bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                        <Download size={18} /> Baixar Laudo Original (PDF)
                    </button>
                 </div>
              </div>

              {/* Arquivo Recebido com Sucesso Banner */}
              <div className="flex flex-col items-center justify-center gap-3 bg-[#f0fdf4] text-green-800 p-6 rounded-[2rem] border border-[#dcfce7] text-center">
                <div className="bg-white rounded-full p-1 border border-green-100 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-[#22c55e]" strokeWidth={2.5} />
                </div>
                <p className="font-bold text-lg text-green-900">Arquivo Recebido com Sucesso!</p>
                <p className="text-sm font-medium text-green-800">Seu laudo detalhado foi gerado com sucesso. Você pode baixá-lo em nosso portal ou acessá-lo pelo link enviado no seu e-mail.</p>
              </div>

              {/* Upsell Card */}
              <div className="bg-white pt-8 pb-10 px-6 md:px-10 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl md:text-[28px] font-black text-[#1e293b] leading-tight px-2">
                    Você já tem a prova em mãos.<br />
                    <span className="text-[#f97316]">Não enfrente o banco sozinho.</span>
                  </h2>
                  <p className="text-gray-600 font-medium text-sm leading-relaxed px-4">
                    Nossos negociadores podem assumir a mediação extrajudicial para você. Pare de ser explorado e deixe a Câmara GSA buscar o seu direito diretamente com a instituição.
                  </p>
                </div>

                {!processStarted ? (
                  <div className="bg-[#fffcf7] border border-[#fef08a] rounded-[2rem] p-6 text-center space-y-8 shadow-sm">
                    
                    {pixData?.level === "3" ? (
                      <div className="space-y-6">
                        <div className="w-48 h-48 bg-white mx-auto p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center">
                            <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                        <button
                            onClick={handleCopyPix}
                            className="w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-200 text-sm font-bold transition-all"
                        >
                            {isCopying ? "Copiado!" : "Copiar Chave PIX"}
                        </button>
                        <button
                            onClick={verifyPaymentManually}
                            disabled={isVerifying}
                            className="w-full bg-white text-gray-600 border border-gray-200 py-3 rounded-xl text-xs font-bold"
                        >
                            {isVerifying ? "Processando..." : "Já paguei o processamento"}
                        </button>
                        <p className="text-xs text-orange-600 font-medium">Após o pagamento de R$ 297,00, seu processo será iniciado e o NUP gerado.</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-5 rounded-2xl shadow-sm inline-block mx-auto border border-gray-100 px-10">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Taxa Administrativa Processual (TAP)</p>
                          <p className="text-[40px] font-black text-[#f97316] leading-none">R$ 297,00</p>
                        </div>
                        
                        <button
                          onClick={handlePay297}
                          className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md text-base"
                        >
                          Iniciar Processo Agora
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="bg-gray-50 border border-gray-200 rounded-[2rem] p-6 text-center space-y-6"
                  >
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-[#1e293b] leading-tight">Processo Iniciado.</h3>
                      <p className="text-gray-600 font-medium text-sm">Anote o seu Número de Protocolo Único (NUP):</p>
                      <div className="bg-white px-6 py-4 rounded-xl border border-gray-300 inline-block shadow-sm">
                        <p className="font-mono font-black text-xl text-gray-900 tracking-wider">{nup}</p>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/5511999999999?text=Olá! Acabei de iniciar meu processo de mediação. Meu NUP é ${nup}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#1EBE57] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-3 shadow-md"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Falar com a Equipe
                    </a>

                    <button
                      onClick={() => navigate('/portal')}
                      className="w-full bg-white hover:bg-gray-50 text-[#1e293b] border-2 border-gray-200 py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2"
                    >
                      Acessar Portal do Cliente
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
