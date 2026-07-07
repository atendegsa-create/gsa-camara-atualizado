import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  User, 
  MessageSquare, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  BrainCircuit, 
  TrendingUp, 
  CheckCircle2, 
  CreditCard,
  Lock,
  ArrowLeft,
  Scale,
  Clock,
  MessageCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Markdown from 'react-markdown';
import { db, auth, handleFirestoreError, OperationType, loginAnonymously } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';

type Step = 'intro' | 'identity' | 'quiz' | 'upload' | 'summary' | 'extra_info' | 'full_confirmation' | 'analysis' | 'payment' | 'waiting_payment' | 'result' | 'done';

export default function OnlineAnalysisApp() {
  const { tenant } = useAuth();
  const tenantSlug = tenant?.slug;

  const [savedState] = useState(() => {
    try {
      const saved = localStorage.getItem('onlineAnalysisAppState');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  const [showResumePrompt, setShowResumePrompt] = useState(!!(savedState && savedState.step && savedState.step !== 'intro' && savedState.step !== 'done'));

  const [step, setStep] = useState<Step>('intro');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ type: 'warning' | 'error'; message: string } | null>(null);
  const [quizStep, setQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState(50);
  const [loading, setLoading] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ score: number; level: string; strategy: string } | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('#');
  const [pixInfo, setPixInfo] = useState<{ payload: string; qrCodeBase64: string } | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filesBase64, setFilesBase64] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [leadId, setLeadId] = useState("");
  const [leadData, setLeadData] = useState<any>(null);

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    whatsapp: '',
    tipo: '',
    descricao: '',
    valor: '',
    urgencia: '',
    prova: ''
  });

  const DEFAULT_QUIZ = [
    {
      key: "tipo",
      pergunta: "Qual situação você está enfrentando hoje?",
      opcoes: [
        { label: "Dívidas / nome negativado", value: "Dívidas", points: 10 },
        { label: "Problema com contrato", value: "Contrato", points: 5 },
        { label: "Conflito familiar", value: "Familiar", points: 2 },
        { label: "Conflito empresarial", value: "Empresarial", points: 10 },
        { label: "Conflito trabalhista", value: "Trabalhista", points: 5 },
        { label: "Acidente com lesões", value: "Acidente_Lesoes", points: 15 },
        { label: "Acidente sem lesões", value: "Acidente_Simples", points: 5 },
        { label: "Prestação de serviços", value: "Servicos", points: 8 },
        { label: "Negociações / Acordos", value: "Negociacao", points: 10 },
        { label: "Outro", value: "Outro", points: 0 }
      ]
    },
    {
      key: "tempo",
      pergunta: "Esse problema já está acontecendo há quanto tempo?",
      opcoes: [
        { label: "Menos de 30 dias", value: "<30 dias", points: 10 },
        { label: "1 a 6 meses", value: "1-6 meses", points: 5 },
        { label: "Mais de 6 meses", value: ">6 meses", points: 0 }
      ]
    },
    {
      key: "tentou_resolver",
      pergunta: "Você já tentou resolver isso antes?",
      opcoes: [
        { label: "Sim", value: "Sim", points: 5 },
        { label: "Não", value: "Não", points: 10 }
      ]
    },
    {
      key: "prova",
      pergunta: "Você possui algum desses?",
      opcoes: [
        { label: "Contrato", value: "Contrato", points: 15 },
        { label: "Conversas (WhatsApp / e-mail)", value: "Conversas", points: 10 },
        { label: "Comprovantes", value: "Comprovantes", points: 10 },
        { label: "Nenhum", value: "Nenhum", points: 0 }
      ]
    },
    {
      key: "situacao_atual",
      pergunta: "Hoje você está passando por alguma dessas situações?",
      opcoes: [
        { label: "Nome negativado", value: "Nome_Negativado", points: 5 },
        { label: "Cobrança ativa", value: "Cobranca_Ativa", points: 5 },
        { label: "Pressão da outra parte", value: "Pressao", points: 5 },
        { label: "Processo judicial", value: "Processo_Judicial", points: 10 },
        { label: "Nenhuma", value: "Nenhuma", points: 0 }
      ]
    },
    {
      key: "valor",
      pergunta: "Qual o valor aproximado envolvido?",
      opcoes: [
        { label: "Até R$ 1.000", value: "Até 1k", points: 2 },
        { label: "R$ 1.000 a R$ 10.000", value: "1k-10k", points: 10 },
        { label: "R$ 10.000 a R$ 50.000", value: "10k-50k", points: 15 },
        { label: "Acima de R$ 50.000", value: "+50k", points: 20 }
      ]
    },
    {
      key: "objetivo",
      pergunta: "O que você quer resolver?",
      opcoes: [
        { label: "Reduzir dívida", value: "Reduzir_Divida", points: 5 },
        { label: "Limpar nome", value: "Limpar_Nome", points: 5 },
        { label: "Receber valor", value: "Receber_Valor", points: 5 },
        { label: "Resolver conflito", value: "Resolver_Conflito", points: 5 },
        { label: "Evitar processo", value: "Evitar_Processo", points: 5 }
      ]
    },
    {
      key: "urgencia",
      pergunta: "Quando você deseja resolver isso?",
      opcoes: [
        { label: "Urgente", value: "Urgente", points: 10 },
        { label: "Em breve", value: "Em breve", points: 5 },
        { label: "Só analisando", value: "Analise", points: 0 }
      ]
    }
  ];

  const quizQuestions = config?.quizQuestions || DEFAULT_QUIZ;

  const [tentouResolverDetalhe, setTentouResolverDetalhe] = useState("");
  const [solucaoJusta, setSolucaoJusta] = useState("");

  const saveStateToLocalStorage = (
    currentStep: Step,
    currentQuizStep: number = quizStep,
    currentFormData: any = formData,
    currentQuizScore: number = quizScore,
    currentTentou: string = tentouResolverDetalhe,
    currentSolucao: string = solucaoJusta,
    currentCustomMessage: string = customMessage,
    currentAdditionalInfo: string = additionalInfo,
    currentLeadId: string = leadId
  ) => {
    const stateToSave = {
      step: currentStep,
      quizStep: currentQuizStep,
      quizScore: currentQuizScore,
      analysisResult,
      checkoutUrl,
      pixInfo,
      customMessage: currentCustomMessage,
      additionalInfo: currentAdditionalInfo,
      leadId: currentLeadId,
      formData: currentFormData,
      tentouResolverDetalhe: currentTentou,
      solucaoJusta: currentSolucao
    };
    try {
      localStorage.setItem('onlineAnalysisAppState', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save state to localStorage', e);
    }
  };

  const changeStep = (newStepOrFn: Step | ((prev: Step) => Step)) => {
    setStep(prevStep => {
      const nextStep = typeof newStepOrFn === 'function' ? newStepOrFn(prevStep) : newStepOrFn;
      saveStateToLocalStorage(nextStep);
      return nextStep;
    });
  };

  const handleResume = (resume: boolean) => {
    if (resume && savedState) {
      if (savedState.step) setStep(savedState.step);
      if (savedState.quizStep !== undefined) setQuizStep(savedState.quizStep);
      if (savedState.quizScore !== undefined) setQuizScore(savedState.quizScore);
      if (savedState.analysisResult) setAnalysisResult(savedState.analysisResult);
      if (savedState.checkoutUrl) setCheckoutUrl(savedState.checkoutUrl);
      if (savedState.pixInfo) setPixInfo(savedState.pixInfo);
      if (savedState.customMessage) setCustomMessage(savedState.customMessage);
      if (savedState.additionalInfo) setAdditionalInfo(savedState.additionalInfo);
      if (savedState.leadId) setLeadId(savedState.leadId);
      if (savedState.formData) {
        setFormData(prev => ({
          ...prev,
          ...savedState.formData
        }));
      }
      if (savedState.tentouResolverDetalhe) setTentouResolverDetalhe(savedState.tentouResolverDetalhe);
      if (savedState.solucaoJusta) setSolucaoJusta(savedState.solucaoJusta);
    } else {
      localStorage.removeItem('onlineAnalysisAppState');
    }
    setShowResumePrompt(false);
  };

  useEffect(() => {
    if (showResumePrompt) return;
    const stateToSave = {
      step,
      quizStep,
      quizScore,
      analysisResult,
      checkoutUrl,
      pixInfo,
      customMessage,
      additionalInfo,
      leadId,
      formData,
      tentouResolverDetalhe,
      solucaoJusta
    };
    try {
      localStorage.setItem('onlineAnalysisAppState', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save state to localStorage', e);
    }
  }, [step, quizStep, quizScore, analysisResult, checkoutUrl, pixInfo, customMessage, additionalInfo, leadId, formData, tentouResolverDetalhe, solucaoJusta, showResumePrompt]);

  // Sistema de autosalvamento periódico a cada 30 segundos
  useEffect(() => {
    if (showResumePrompt || step === 'intro' || step === 'done') return;

    const interval = setInterval(() => {
      const stateToSave = {
        step,
        quizStep,
        quizScore,
        analysisResult,
        checkoutUrl,
        pixInfo,
        customMessage,
        additionalInfo,
        leadId,
        formData,
        tentouResolverDetalhe,
        solucaoJusta
      };
      try {
        localStorage.setItem('onlineAnalysisAppState', JSON.stringify(stateToSave));
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSaved(timeString);
        console.log(`[Autosave] Formulário de análise salvo com sucesso às ${timeString}`);
      } catch (e) {
        console.warn('Could not autosave state to localStorage', e);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [step, quizStep, quizScore, analysisResult, checkoutUrl, pixInfo, customMessage, additionalInfo, leadId, formData, tentouResolverDetalhe, solucaoJusta, showResumePrompt]);

  const handleQuizAnswer = (key: string, option: any) => {
    const newScore = Math.min(quizScore + (option.points || 0), 100);
    setQuizScore(newScore);
    
    const updatedFormData = {
      ...formData,
      [key]: option.value
    };
    
    setFormData(updatedFormData);

    let nextQuizStep = quizStep;
    let nextStep = step;

    if (key === 'tentou_resolver' && option.value === 'Sim') {
      nextQuizStep = 99; // Custom state for conditional question 3.1
    } else {
      if (quizStep === 99) {
        nextQuizStep = 3; // Go to P4
      } else if (quizStep < quizQuestions.length - 1) {
        nextQuizStep = quizStep + 1;
      } else {
        nextStep = 'upload';
      }
    }

    if (nextStep !== step) {
      setStep(nextStep);
    }
    setQuizStep(nextQuizStep);

    // Save state immediately
    saveStateToLocalStorage(nextStep, nextQuizStep, updatedFormData, newScore);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'tracking'), (doc) => {
      if (doc.exists()) setConfig(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/tracking');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!leadId) return;

    console.log(`[REALTIME] Listening for lead: ${leadId}`);
    
    let pollInterval: any = null;

    const unsub = onSnapshot(doc(db, 'leads', leadId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLeadData(data);
        
        const isApproved = data.status === 'PAGO' || 
                           data.paymentStatus === 'APPROVED' || 
                           data.paymentStatus === 'CONFIRMED' || 
                           data.paymentStatus === 'RECEIVED';
                           
        if (isApproved) {
          console.log("[REALTIME] Payment confirmed via Snapshot!");
          setIsVip(true);
          changeStep(current => {
             if (current === 'payment' || current === 'waiting_payment') return 'done';
             return current;
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `leads/${leadId}`);
      // Polling Fallback if snapshot fails (e.g. Permission Denied)
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/payment-status?id=${leadId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const json = await res.json();
              if (json.status === "CONFIRMED") {
                console.log("[POLLING-FALLBACK] Payment confirmed via fallback!");
                setIsVip(true);
                changeStep(current => {
                  if (current === 'payment' || current === 'waiting_payment') return 'done';
                  return current;
                });
                if (pollInterval) clearInterval(pollInterval);
              }
            }
          } catch (pollErr) {
            console.error("[POLLING-FALLBACK] Error:", pollErr);
          }
        }, 8000); // 8s to be more conservative
      }
    });

    return () => {
      unsub();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [leadId]);

  const handleStartAnalysis = async () => {
    setLoading(true);
    setApiError(null);
    changeStep('analysis');

    let currentUser = auth.currentUser;

    try {
      if (!currentUser) {
        const userCred = await loginAnonymously();
        currentUser = userCred ? userCred.user : null;
      }
      const token = currentUser ? await currentUser.getIdToken() : '';

      // Send directly to backend and let the backend do the AI Analysis:
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          leadId: leadId, // Pass the captured leadId
          quizScore,
          descricao: customMessage,
          solucao_justa: solucaoJusta,
          additionalInfo: additionalInfo,
          tempo: formData['tempo'],
          tentou_resolver: formData['tentou_resolver'] + (tentouResolverDetalhe ? ` (${tentouResolverDetalhe})` : ''),
          situacao_atual: formData['situacao_atual'],
          objetivo: formData['objetivo'],
          provasBase64: filesBase64,
          tenantSlug: tenantSlug || 'gsa-master'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalysisResult(data.analysis);
        setCheckoutUrl(data.checkoutUrl);
        if (data.pixInfo) {
          setPixInfo(data.pixInfo);
        }
        if (data.leadId) {
          localStorage.setItem('current_lead_id', data.leadId);
          setLeadId(data.leadId);
        }
      } else {
        throw new Error(data.error || "Erro na análise");
      }

      setLoading(false);
      changeStep('result'); // Deliver result for free first
    } catch (error: any) {
      console.error("Analysis request failed:", error);

      // Log failure specifically to Firebase
      try {
        await addDoc(collection(db, 'logs'), {
          tipo: 'API_ANALYSIS_FAILURE',
          timestamp: serverTimestamp(),
          leadId: leadId || null,
          uid: currentUser?.uid || null,
          erro: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack || null : null,
          tenantSlug: tenantSlug || 'gsa-master',
          formData: {
            nome: formData.nome || null,
            email: formData.email || null,
            whatsapp: formData.whatsapp || null,
            cpf: formData.cpf || null
          },
          score: quizScore
        });
        console.log("🚀 Falha de API registrada com sucesso no Firestore.");
      } catch (firestoreError) {
        console.error("⚠️ Falha ao salvar log de erro no Firestore:", firestoreError);
      }

      // Check if it's a connection / reachability issue
      const isUnreachable = error instanceof TypeError || 
                            (error instanceof Error && (
                              error.message.includes('Failed to fetch') || 
                              error.message.includes('network') || 
                              error.message.includes('unreachable')
                            ));

      if (isUnreachable) {
        setApiError({
          type: 'warning',
          message: 'Não foi possível conectar ao nosso servidor de análise inteligente. No entanto, sua pré-análise foi processada localmente com base nas respostas do quiz! Você pode prosseguir normalmente.'
        });
      } else {
        setApiError({
          type: 'error',
          message: `Ocorreu uma instabilidade na comunicação com a nossa Inteligência Artificial: ${error?.message || error}. Geramos uma análise preliminar baseada no seu score para prosseguir com o atendimento.`
        });
      }

      setAnalysisResult({ 
        score: quizScore, 
        level: quizScore > 70 ? "Alto" : "Médio", 
        strategy: "Negociação sugerida baseada em análise técnica preliminar." 
      });
      // Fallback para não quebrar a tela de pagamentos caso dê erro de timeout ou validação
      setPixInfo({
        payload: "00020101021226850014br.gov.bcb.pix0123simulado-gsa-pix-code-1234567890",
        qrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
      });
      setCheckoutUrl("#simulado");
      setLoading(false);
      changeStep('payment'); // Jump to payment anyway on error
    }
  };

  const renderIntro = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
      <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-red-900/20">
        <BrainCircuit size={40} className="text-white" />
      </div>
      <div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">Análise de Viabilidade Online</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Nossa Inteligência Artificial irá analisar seu caso em tempo real para determinar as chances de sucesso via mediação extrajudicial.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {[
          { icon: ShieldCheck, t: "Sigilo Total", d: "Dados 100% protegidos" },
          { icon: TrendingUp, t: "Estratégia", d: "Plano de ação imediato" },
          { icon: CheckCircle2, t: "Validade", d: "Base legal garantida" },
        ].map((item, i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <item.icon className="text-red-600 mb-2" size={20} />
            <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">{item.t}</h4>
            <p className="text-[10px] text-gray-400">{item.d}</p>
          </div>
        ))}
      </div>
      <button 
        onClick={() => changeStep('identity')}
        className="w-full bg-[#7a0f1a] text-white py-5 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
      >
        Iniciar Diagnóstico Gratuito
        <ArrowRight size={20} />
      </button>
    </motion.div>
  );

  const handleContinueToQuiz = async () => {
    // Capture lead in background (don't block the UI if possible, or show a quick loader)
    try {
      let currentUser = auth.currentUser;
      if (!currentUser) {
        loginAnonymously().then(userCred => {
          currentUser = userCred.user;
          sendLead(currentUser);
        });
      } else {
        sendLead(currentUser);
      }

      async function sendLead(user: any) {
        const token = await user.getIdToken();
        fetch('/api/leads/capturar', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.nome,
            email: formData.email,
            whatsapp: formData.whatsapp,
            cpf: formData.cpf,
            origin: "App Online Quiz",
            tenantSlug: tenantSlug || 'gsa-master'
          })
        }).then(res => res.ok ? res.json().catch(() => ({})) : {}).then((data: any) => {
          if (data.leadId) {
            setLeadId(data.leadId);
            localStorage.setItem('current_lead_id', data.leadId);
          }
        });
      }
    } catch (e) {
      console.error("Error capturing lead:", e);
    }
    
    changeStep('quiz');
  };

  const renderIdentity = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <User size={20} className="text-gray-500" />
        </div>
        <h2 className="text-xl font-serif font-bold text-gray-900">Seus Dados de Contato</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-2">Nome Completo</label>
          <input 
            type="text" 
            value={formData.nome}
            onChange={e => setFormData({...formData, nome: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none"
            placeholder="Como podemos te chamar?"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-2">CPF</label>
          <input 
            type="text" 
            value={formData.cpf}
            onChange={e => setFormData({...formData, cpf: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none"
            placeholder="000.000.000-00"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-2">E-mail</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-2">WhatsApp</label>
            <input 
              type="tel" 
              value={formData.whatsapp}
              onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      </div>
      <button 
        disabled={!formData.nome || !formData.cpf || !formData.email || !formData.whatsapp}
        onClick={handleContinueToQuiz}
        className="w-full bg-[#7a0f1a] disabled:opacity-50 text-white py-5 rounded-2xl font-bold shadow-xl mt-8 flex items-center justify-center gap-2"
      >
        Continuar para o Quiz
        <ArrowRight size={20} />
      </button>
    </motion.div>
  );

  const renderQuiz = () => {
    const total = quizQuestions.length;
    const current = quizQuestions[quizStep];

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((quizStep === 99 ? 3 : quizStep) / total) * 100}%` }}
            className="h-full bg-red-600"
          />
        </div>

        {/* Real-time Score */}
        <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-100">
           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Viabilidade Estimada</p>
           <h2 className="text-3xl font-black text-red-600">{quizScore}%</h2>
        </div>

        <AnimatePresence mode="wait">
          {quizStep === 99 ? (
             <motion.div 
              key="conditional"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-serif font-bold text-gray-900 text-center mb-6">O que aconteceu quando tentou resolver?</h2>
              <textarea 
                value={tentouResolverDetalhe}
                onChange={e => setTentouResolverDetalhe(e.target.value)}
                className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[32px] focus:ring-2 focus:ring-red-600 outline-none h-40 text-gray-700"
                placeholder="Conte-nos brevemente o desfecho..."
              />
              <button 
                onClick={() => handleQuizAnswer('tentou_resolver_detalhe', { value: tentouResolverDetalhe, points: 0 })}
                className="w-full bg-black text-white py-5 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3"
              >
                Próxima Pergunta
                <ArrowRight size={20} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={quizStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-4"
            >
              <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 text-center mb-6">{current.pergunta}</h2>
              <div className="grid grid-cols-1 gap-3">
                {current.opcoes.map((op, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(current.key, op)}
                    className="p-5 text-left bg-white border border-gray-100 rounded-2xl hover:border-red-600 hover:shadow-lg transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center relative z-10">
                      <span className="font-bold text-gray-700 group-hover:text-red-700">{op.label}</span>
                      <ArrowRight size={18} className="text-gray-200 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => {
            if (quizStep === 99) {
              setQuizStep(2); // Voltar para "Já tentou resolver?"
            } else if (quizStep > 0) {
              setQuizStep(quizStep - 1);
            } else {
              changeStep('identity');
            }
          }} 
          className="w-full py-2 text-gray-400 font-bold text-xs hover:text-gray-600 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
      </motion.div>
    );
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    
    const readFile = async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            reject("Erro ao ler arquivo");
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    };

    try {
      const base64Promises = newFiles.map(file => readFile(file));
      const base64Results = await Promise.all(base64Promises);
      setFilesBase64(prev => [...prev, ...base64Results]);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (e) {
      console.error("Error reading files", e);
      alert("Erro ao ler os arquivos. Tente novamente com arquivos menores.");
    }
  };

  const renderUpload = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-gray-900 text-center">Descreva seu caso e envie anexos (opcional)</h2>
        <textarea 
          value={customMessage}
          onChange={e => setCustomMessage(e.target.value)}
          className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[32px] focus:ring-2 focus:ring-red-600 outline-none h-40 text-gray-700"
          placeholder="Mensagem livre sobre o ocorrido (o que causou a situação, o que deseja resolver, etc)..."
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-gray-900 text-center">Enviar Anexos (PDFs, Imagens)</h2>
        <input 
          type="file" 
          multiple
          accept="image/*,.pdf"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="w-full p-4 bg-gray-50 border border-dashed border-gray-200 rounded-[24px] focus:ring-2 focus:ring-red-600 outline-none text-sm cursor-pointer"
        />
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {uploadedFiles.map((f, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full">{f.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4">
        <button 
          onClick={() => changeStep('summary')}
          className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 hover:bg-red-700 transition-colors"
        >
          Próximo Passo
          <ArrowRight size={20} />
        </button>
      </div>

      <button 
        onClick={() => changeStep('quiz')} 
        className="w-full py-2 text-gray-400 font-bold text-xs hover:text-gray-600 flex items-center justify-center gap-2"
      >
        <ArrowLeft size={14} /> Voltar para o Quiz
      </button>
    </motion.div>
  );

  const renderSummary = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
       <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-serif font-bold text-gray-900">Resumo das Suas Respostas</h2>
          <p className="text-sm text-gray-500">Confira as informações que você nos forneceu até agora.</p>
       </div>

       <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
          {quizQuestions.map((q: any, i: number) => (
             <div key={i} className="flex flex-col border-b border-gray-200 pb-3 last:border-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{q.pergunta}</span>
                <span className="text-sm font-bold text-gray-700">{formData[q.key as keyof typeof formData] || 'Não informado'}</span>
             </div>
          ))}
          {customMessage && (
             <div className="flex flex-col border-b border-gray-200 pb-3 last:border-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Caso</span>
                <span className="text-sm font-bold text-gray-700">{customMessage}</span>
             </div>
          )}
       </div>

       <div className="pt-6 space-y-4 text-center">
          <p className="text-sm font-bold text-gray-700">Deseja acrescentar mais alguma informação para que possamos analisar com mais precisão?</p>
          <div className="grid grid-cols-2 gap-4">
             <button 
               onClick={() => changeStep('extra_info')}
               className="bg-white border-2 border-red-600 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-50 transition-all"
             >
               Sim, acrescentar
             </button>
             <button 
               onClick={handleStartAnalysis}
               className="bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all"
             >
               Não, seguir fluxo
             </button>
          </div>
       </div>

        <button 
          onClick={() => changeStep('upload')} 
          className="w-full py-2 text-gray-400 font-bold text-xs hover:text-gray-600 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
    </motion.div>
  );

  const renderExtraInfo = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
       <h2 className="text-2xl font-serif font-bold text-gray-900 text-center">Informações Complementares</h2>
       <p className="text-center text-sm text-gray-500">Acrescente qualquer detalhe que julgar importante para nossa análise IA.</p>
       <textarea 
          value={additionalInfo}
          onChange={e => setAdditionalInfo(e.target.value)}
          className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[32px] focus:ring-2 focus:ring-red-600 outline-none h-40 text-gray-700"
          placeholder="Ex: Datas específicas, nomes de envolvidos, valores exatos..."
       />
       <button 
          onClick={() => changeStep('full_confirmation')}
          className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 hover:bg-red-700 transition-colors"
       >
          Prosseguir
          <ArrowRight size={20} />
       </button>
       <button 
          onClick={() => changeStep('summary')} 
          className="w-full py-2 text-gray-400 font-bold text-xs hover:text-gray-600 flex items-center justify-center gap-2"
       >
          <ArrowLeft size={14} /> Voltar
       </button>
    </motion.div>
  );

  const renderFullConfirmation = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
       <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-serif font-bold text-gray-900">Confirmação de Dados</h2>
          <p className="text-sm text-gray-500">Tudo pronto! Confira seu dossiê completo antes da análise.</p>
       </div>

       <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          {quizQuestions.map((q: any, i: number) => (
             <div key={i} className="flex flex-col border-b border-gray-200 pb-3 last:border-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{q.pergunta}</span>
                <span className="text-sm font-bold text-gray-700">{formData[q.key as keyof typeof formData] || 'Não informado'}</span>
             </div>
          ))}
          {customMessage && (
             <div className="flex flex-col border-b border-gray-200 pb-3 last:border-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição Inicial</span>
                <span className="text-sm font-bold text-gray-700">{customMessage}</span>
             </div>
          )}
          {additionalInfo && (
             <div className="flex flex-col border-b border-gray-200 pb-3 last:border-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações Complementares</span>
                <span className="text-sm font-bold text-gray-700 font-serif italic">"{additionalInfo}"</span>
             </div>
          )}
          {uploadedFiles.length > 0 && (
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Anexos Vinculados</span>
                <div className="flex flex-wrap gap-2 mt-2">
                   {uploadedFiles.map((f, i) => (
                      <span key={i} className="text-[9px] bg-white border border-gray-100 px-2 py-1 rounded-lg text-gray-600">{f.name}</span>
                   ))}
                </div>
             </div>
          )}
       </div>

       <button 
          onClick={handleStartAnalysis}
          className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 hover:bg-red-700 transition-colors"
       >
          Solicitar Análise Gratuita Agora
          <ArrowRight size={20} />
       </button>
       <button 
          onClick={() => changeStep('extra_info')} 
          className="w-full py-2 text-gray-400 font-bold text-xs hover:text-gray-600 flex items-center justify-center gap-2"
       >
          <ArrowLeft size={14} /> Corrigir Informações
       </button>
    </motion.div>
  );

  const renderAnalysisStatus = () => (
    <div className="text-center py-12 space-y-8">
      <div className="relative w-32 h-32 mx-auto">
        <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="absolute inset-0 border-4 border-red-100 border-t-red-600 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <BrainCircuit className="text-red-600 animate-pulse" size={32} />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Processando Cenários</h2>
        <p className="text-gray-400 text-sm italic">Nossa IA está cruzando seus dados, mensagens e documentos com as legislações vigentes. Sua análise ficará pronta em instantes...</p>
      </div>
    </div>
  );

  const renderPayment = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="text-center pt-4 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
          <ShieldCheck size={14} /> Agendamento VIP com Especialista
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight">Quase tudo pronto!</h2>
        <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto">
          Efetue o pagamento da taxa para garantir seu agendamento e liberar seu bônus vip na contratação.
        </p>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 pointer-events-none">
           <Scale size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-tight">Taxa de Agendamento</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl md:text-5xl font-black text-gray-900 leading-none">R$ 47<span className="text-xl md:text-2xl text-gray-400 font-medium">,00</span></p>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">(CONVERTE EM BÔNUS)</span>
                </div>
             </div>
             <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <Clock size={32} className="text-indigo-600" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
             {[
               "Reunião com Especialista",
               "Ligação ou Vídeo Chamada",
               "Bônus de desconto serviços",
               "Análise jurídica precisa"
             ].map((txt, i) => (
               <div key={i} className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                  <div className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={12} className="text-indigo-600" />
                  </div>
                  <span>{txt}</span>
               </div>
             ))}
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-50">
            {pixInfo ? (
              <div className="flex flex-col items-center justify-center space-y-8">
                 <div className="text-center space-y-4">
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Escaneie o QR Code abaixo no seu aplicativo bancário</p>
                   <div className="bg-white p-6 rounded-[2.5rem] inline-block shadow-xl border border-gray-100 mx-auto transform transition-transform hover:scale-105">
                      <QRCodeSVG 
                        value={pixInfo.payload} 
                        size={200}
                        className="w-48 h-48 md:w-56 md:h-56"
                      />
                   </div>
                 </div>
                 
                 <div className="text-center w-full space-y-3">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ou copie a chave PIX</p>
                   <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={pixInfo.payload} 
                        className="w-full sm:flex-1 bg-gray-50 border border-gray-100 text-[10px] p-4 rounded-xl text-gray-400 font-mono focus:outline-none" 
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(pixInfo.payload);
                          alert("Código PIX copiado!");
                        }} 
                        className="w-full sm:w-auto bg-[#1e293b] hover:bg-black text-white py-4 px-8 rounded-xl font-black shadow-lg transition-all whitespace-nowrap active:scale-95"
                      >
                        Copiar
                      </button>
                   </div>
                 </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  if (checkoutUrl && checkoutUrl !== '#') {
                     window.open(checkoutUrl, '_blank');
                  } else {
                     setPixInfo({
                        payload: "00020101021226850014br.gov.bcb.pix0123simulado-gsa-pix-code-1234567890",
                        qrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                     });
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-red-900/10 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0"
              >
                 EFETUAR PAGAMENTO AGORA
                 <ArrowRight size={22} />
              </button>
            )}
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  const isApproved = leadData && (
                    leadData.status === 'PAGO' || 
                    leadData.paymentStatus === 'APPROVED' || 
                    leadData.paymentStatus === 'CONFIRMED' || 
                    leadData.paymentStatus === 'RECEIVED'
                  );
                  if (isApproved) {
                    changeStep('result');
                  } else {
                    changeStep('waiting_payment');
                  }
                }}
                className="w-full py-4 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck size={16} /> Já realizei o pagamento? Verificar status
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-gray-300">
         <Lock size={14} />
         <span className="text-[9px] font-black uppercase tracking-[0.2em]">Pagamento Seguro via SSL 256 bits</span>
      </div>
    </motion.div>
  );

  const renderWaitingPayment = () => (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8 text-center py-4">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-50 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-blue-600/20">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"
          />
        </div>

        <div className="relative">
          <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-blue-100">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Clock size={40} className="text-blue-600" />
            </motion.div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-serif font-black text-gray-900 leading-tight">Confirmando Recebimento</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Estamos consultando a câmara de compensação do Banco Central para liberar seu Laudo e Parecer IA. Geralmente leva de 10 a 60 segundos.
          </p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shrink-0">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[#1e293b] uppercase tracking-widest">Status Bancário</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Consultando Autenticidade...</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[#1e293b] uppercase tracking-widest">Proteção GSA</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Conexão Blindada (SSL)</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <button 
            onClick={() => window.location.href = `/acompanhar`}
            className="w-full bg-[#1e293b] hover:bg-black text-white py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 hover:translate-y-[-2px] transition-all"
          >
            Acompanhar Consulta Pública
            <ArrowRight size={18} />
          </button>
          
          <div className="flex flex-col md:flex-row gap-3">
            <button 
              onClick={() => changeStep('payment')}
              className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-[#1e293b] flex items-center justify-center gap-2 border border-transparent hover:border-gray-200 rounded-xl transition-all"
            >
              <ArrowLeft size={14} /> Voltar para o PIX
            </button>
            <a 
              href={`https://wa.me/5511999999999?text=Oi, já fiz o pagamento no App Online mas ainda não foi identificado.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 border border-transparent hover:border-blue-50 rounded-xl transition-all"
            >
              <MessageCircle size={16} /> Suporte WhatsApp
            </a>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-widest italic">
            "Aguarde nesta tela por favor. O redirecionamento para o resultado é instantâneo após a confirmação."
          </p>
        </div>
      </div>
    </motion.div>
  );

  const renderResult = () => (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8">
      <div className="bg-green-50 text-green-700 p-6 rounded-[40px] border border-green-100 inline-block text-center w-full">
         <CheckCircle2 size={48} className="mx-auto mb-4" />
         <h2 className="text-2xl font-serif font-bold">Análise IA Concluída!</h2>
         <p className="text-sm mt-2">Seu Parecer Gratuito está pronto para visualização abaixo.</p>
         <button 
           onClick={() => {
             alert("Enviando parecer em PDF para seu e-mail e WhatsApp...");
             window.print();
           }}
           className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-green-700 px-4 py-2 rounded-full shadow-sm hover:scale-105 transition-all"
         >
           <ClipboardList size={14} />
           Baixar Parecer (PDF)
         </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Score de Êxito</p>
            <p className="text-4xl font-black text-red-600">{analysisResult?.score}%</p>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Viabilidade na Câmara</p>
            <p className={cn(
              "text-xl font-black uppercase",
              analysisResult?.level === 'Alto' ? 'text-green-600' : 'text-amber-500'
            )}>{analysisResult?.level}</p>
         </div>
      </div>

      <div className="bg-gray-900 text-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] text-left shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Scale size={80} />
         </div>
         <div className="flex flex-col items-center border-b border-gray-800 pb-6 mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <Scale className="w-8 h-8 text-[#a51c30]" />
                <span className="font-serif font-bold text-2xl tracking-tighter text-white uppercase">GSA Câmara</span>
            </div>
            <h3 className="text-xs font-black tracking-widest text-gray-300 uppercase">Câmara de Mediação e Conciliação do Brasil</h3>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">CNPJ: 43.213.208/0001-00 | 54 3196-2669</p>
         </div>
         <p className="text-[10px] text-gray-500 font-black uppercase mb-4 flex items-center gap-2">
           <BrainCircuit size={14} className="text-red-500" /> Parecer Técnico da IA
         </p>
         <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-sm md:text-base markdown-body">
            <Markdown>{analysisResult?.strategy || 'Analisando e validando as evidências e fatos. Entraremos em contato com a estratégia ideal via WhatsApp.'}</Markdown>
         </div>
      </div>

      {/* VIP OFFER SECTION */}
      <div className="bg-[#f8fafc] p-8 md:p-12 rounded-[40px] border-4 border-indigo-50 shadow-2xl space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-indigo-900 group-hover:scale-110 transition-transform">
           <BrainCircuit size={160} />
        </div>
        
        <div className="relative space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-200">
               ✨ Oportunidade VIP
            </div>
            <h3 className="text-3xl md:text-4xl font-serif font-black text-gray-900 leading-tight">Quer agendar com nossa equipe?</h3>
            <p className="text-gray-500 text-sm md:text-base font-medium max-w-md mx-auto leading-relaxed">
              Marque uma reunião com nossos especialistas para buscar a melhor solução para o seu caso.
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-indigo-50 shadow-inner space-y-4">
             <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                   <MessageSquare className="text-indigo-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Marque uma reunião por <strong>ligação, vídeo chamada ou mensagem</strong> para explicar seu caso com mais detalhes.
                  </p>
                </div>
             </div>
             
             <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
                   <TrendingUp className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                   Com nossos especialistas, a busca por solução é <strong>mais precisa e objetiva</strong>. Aproveite este próximo passo!
                  </p>
                </div>
             </div>
          </div>

          <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-900/20 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left space-y-1">
                 <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Taxa de Agendamento</p>
                 <h4 className="text-4xl font-black">R$ 47,00</h4>
                 <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-tighter italic">* O valor do agendamento vira bônus de desconto na contratação!</p>
              </div>
              <button 
                onClick={() => changeStep('payment')}
                className="w-full md:w-auto bg-white text-indigo-900 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
              >
                Eu quero acesso VIP por R$ 47
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Não perca mais tempo e vamos juntos buscar seus direitos!
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <p className="text-gray-400 text-[11px] text-center uppercase tracking-widest font-bold">Ou se preferir encerrar agora:</p>
        <button 
          onClick={() => changeStep('done')}
          className="w-full py-4 text-gray-400 font-bold text-xs hover:text-gray-600 tracking-widest uppercase transition-all"
        >
          Finalizar Atendimento Gratuito
        </button>
      </div>
    </motion.div>
  );

  const renderDone = () => (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-900/10 mb-6">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="text-3xl font-serif font-black text-gray-900 mb-2">
        {isVip ? 'Agendamento VIP Confirmado!' : 'Atendimento Concluído!'}
      </h2>
      <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
        {isVip 
          ? 'Recebemos seu agendamento VIP. Nossa equipe entrará em contato em até 24h úteis para marcar sua reunião via ligação ou vídeo-chamada.' 
          : 'Recebemos sua análise gratuita. Caso deseje um agendamento posterior, entre em contato via nosso canal oficial de suporte.'}
      </p>
      {isVip && (
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-indigo-900 font-bold text-xs uppercase tracking-widest">
           Lembre-se: O valor pago será abatido como bônus na sua contratação final!
        </div>
      )}
      <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-400">
        Você pode fechar esta tela e aguardar nosso retorno.
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col items-center justify-center p-3 md:p-6 font-sans w-full overflow-hidden">
      <div className="w-full max-w-xl md:max-w-2xl">
        {/* LOGO SIMPLIFIED */}
        <div className="flex items-center justify-center gap-2 mb-8 md:mb-12 opacity-80">
          <Scale className="w-6 h-6 md:w-8 md:h-8 text-[#7a0f1a]" />
          <span className="font-serif font-black text-xl md:text-2xl tracking-tighter text-gray-900">GSA <span className="text-[#a51c30]">Câmara</span></span>
        </div>

        {/* PROGRESS BAR */}
        {step !== 'intro' && step !== 'done' && (
          <div className="mb-8 md:mb-12 flex items-center justify-between px-1 md:px-2">
            {[1, 2, 3, 4].map(s => (
               <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className={cn(
                    "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black transition-all",
                    (step === 'identity' && s === 1) || (step === 'quiz' && s === 2) || (step === 'analysis' && s === 3) || ((step === 'payment' || step === 'waiting_payment') && s === 4)
                      ? "bg-[#7a0f1a] text-white ring-4 md:ring-8 ring-red-50"
                      : s < (step === 'identity' ? 1 : step === 'quiz' ? 2 : step === 'analysis' || step === 'payment' || step === 'waiting_payment' ? 3 : step === 'result' ? 4 : 5) ? "bg-green-500 text-white" : "bg-gray-100 text-gray-300"
                  )}>
                    {s < (step === 'identity' ? 1 : step === 'quiz' ? 2 : step === 'analysis' || step === 'payment' || step === 'waiting_payment' ? 3 : step === 'result' ? 4 : 5) ? <CheckCircle2 size={14} className="md:w-4 md:h-4" /> : s}
                  </div>
                  {s < 4 && <div className={cn(
                    "h-[2px] flex-1 mx-1 md:mx-2 rounded-full",
                    s < (step === 'identity' ? 1 : step === 'quiz' ? 2 : step === 'analysis' || step === 'payment' || step === 'waiting_payment' ? 3 : step === 'result' ? 4 : 5) ? "bg-green-200" : "bg-gray-100"
                  )} />}
               </div>
            ))}
          </div>
        )}

        <div className="bg-white/60 backdrop-blur-xl border border-white rounded-[24px] md:rounded-[48px] shadow-2xl p-5 md:p-12 w-full max-w-full overflow-hidden relative">
          <AnimatePresence mode="wait">
            {step === 'intro' && renderIntro()}
            {step === 'identity' && renderIdentity()}
            {step === 'quiz' && renderQuiz()}
            {step === 'upload' && renderUpload()}
            {step === 'summary' && renderSummary()}
            {step === 'extra_info' && renderExtraInfo()}
            {step === 'full_confirmation' && renderFullConfirmation()}
            {step === 'analysis' && renderAnalysisStatus()}
            {step === 'payment' && renderPayment()}
            {step === 'waiting_payment' && renderWaitingPayment()}
            {step === 'result' && renderResult()}
            {step === 'done' && renderDone()}
          </AnimatePresence>

          {apiError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-6 p-4 rounded-2xl border text-xs font-medium flex items-start gap-3 relative z-50",
                apiError.type === 'error' 
                  ? "bg-red-50 border-red-100 text-red-800" 
                  : "bg-amber-50 border-amber-100 text-amber-800"
              )}
            >
              <div className="mt-0.5 shrink-0">
                <ShieldCheck className={apiError.type === 'error' ? "text-red-500" : "text-amber-500"} size={16} />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px]">Aviso do Sistema</p>
                <p>{apiError.message}</p>
                <button 
                  type="button"
                  onClick={() => setApiError(null)}
                  className="text-[9px] font-bold underline uppercase tracking-widest mt-1 hover:text-gray-900 block cursor-pointer"
                >
                  Fechar Aviso
                </button>
              </div>
            </motion.div>
          )}

          {/* Indicador de Autosalvamento */}
          {lastSaved && step !== 'intro' && step !== 'done' && (
            <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-fade-in">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Rascunho salvo automaticamente às {lastSaved}
            </div>
          )}
        </div>

        <footer className="mt-8 md:mt-12 text-center">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">© {new Date().getFullYear()} GSA Systems Intelligence</p>
        </footer>
      </div>

      {showResumePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-black text-gray-900 mb-2">Continuar de onde parou?</h3>
              <p className="text-sm text-gray-500">
                Identificamos que você não concluiu seu formulário anterior. Deseja retomar com os dados já preenchidos?
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleResume(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg"
              >
                Sim, continuar
              </button>
              <button
                onClick={() => handleResume(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-xl font-bold transition-all"
              >
                Não, começar do zero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
