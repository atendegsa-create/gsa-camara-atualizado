import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  BrainCircuit, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Scale,
  ShieldCheck,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

export default function LeadDashboard() {
  const { user } = useAuth();
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchLead = async () => {
      const savedLeadId = localStorage.getItem('current_lead_id');
      
      if (savedLeadId) {
        const unsub = onSnapshot(doc(db, 'leads', savedLeadId), (doc) => {
          if (doc.exists()) {
            setLeadData({ id: doc.id, ...doc.data() });
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `leads/${savedLeadId}`);
          setLoading(false);
        });
        return unsub;
      } else if (user?.email) {
        // ... handled by user auth fallback if no localStorage
        setLeadData({
          nome: user?.displayName || "Usuário GSA",
          // ...
          analysis: {
            score: 88,
            level: 'Alto',
            strategy: 'Propor mediação direta com o banco focado em expurgar a capitalização mensal de juros não contratada.'
          },
          createdAt: new Date().toISOString()
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    searchLead();
  }, [user]);

  const [isUploading, setIsUploading] = useState(false);
  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
       setIsUploading(false);
       alert("Documentos enviados com sucesso para análise técnica!");
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EM_ANALISE': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'ANALISADO': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'AGUARDANDO_PAGAMENTO': return 'text-gray-600 bg-gray-50 border-gray-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EM_ANALISE': return 'Em Análise Técnica';
      case 'ANALISADO': return 'Análise Concluída';
      case 'AGUARDANDO_PAGAMENTO': return 'Aguardando Pagamento';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7a0f1a] rounded-xl flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-black text-xl text-gray-900 leading-none">GSA Câmara</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Dashboard do Cliente</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {user && (
             <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-gray-900">{user.displayName || user.email}</p>
                <p className="text-[10px] text-gray-400 uppercase font-black">Cliente Autenticado</p>
             </div>
           )}
           <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
              <LogOut size={20} />
           </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 md:px-12 mt-8 md:mt-12 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest", getStatusColor(leadData?.status))}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {getStatusLabel(leadData?.status)}
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">
              Olá, <span className="text-[#7a0f1a]">{leadData?.nome?.split(' ')[0]}</span>
            </h2>
            <p className="text-gray-500 max-w-lg font-medium">
              Acompanhe aqui todos os detalhes da sua análise técnica e os próximos passos para a resolução do seu conflito.
            </p>
          </div>
          <div className="bg-gray-50 p-8 rounded-[40px] text-center w-full md:w-64 border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score de Viabilidade</p>
            <h3 className="text-5xl font-black text-[#7a0f1a]">{leadData?.analysis?.score || leadData?.quizScore}%</h3>
            <div className="mt-4 flex items-center justify-center gap-1 text-green-600 font-bold text-sm">
                <TrendingUp size={16} />
                <span>Nível {leadData?.analysis?.level || 'Alto'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Analysis Section */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 text-red-50 opacity-50">
                <BrainCircuit size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-red-50 text-[#7a0f1a] rounded-2xl flex items-center justify-center">
                      <Scale size={24} />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900">Parecer Técnico da IA</h3>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-gray-700 leading-relaxed font-medium italic">
                    "{leadData?.analysis?.strategy || "Nossa inteligência artificial está processando os detalhes do seu caso para gerar a melhor estratégia de mediação."}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Objeto da Análise</p>
                     <p className="font-bold text-gray-900">{leadData?.tipo}</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Protocolo</p>
                     <p className="font-mono text-xs font-bold text-gray-900">#GSA-{leadData?.createdAt?.substring(11, 19).replace(/:/g, '') || "PN876"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Steps Section */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <Clock className="text-[#7a0f1a]" />
                Jornada de Resolução
              </h3>
              
              <div className="space-y-6">
                {[
                   { label: 'Identificação & Triagem', done: true, current: false },
                   { label: 'Análise de Viabilidade IA', done: true, current: true },
                   { label: 'Geração de Laudo Técnico', done: false, current: false },
                   { label: 'Sessão de Mediação', done: false, current: false },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                      step.done ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-100" : 
                      step.current ? "bg-red-50 border-red-200 text-[#7a0f1a]" : "bg-white border-gray-200 text-gray-300"
                    )}>
                      {step.done ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <div className="flex-1 pt-1">
                       <p className={cn("font-bold text-sm", step.current ? "text-gray-900" : "text-gray-400")}>
                         {step.label}
                       </p>
                       {step.current && (
                         <p className="text-xs text-red-600 font-bold mt-1">Status: Em andamento...</p>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Action Card */}
            <div className="bg-[#7a0f1a] rounded-[32px] p-8 shadow-xl text-white relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <ShieldCheck size={160} />
              </div>
              <div className="relative z-10 space-y-6">
                <h3 className="text-xl font-bold">Próximo Passo Fundamental</h3>
                <p className="text-red-100 text-sm leading-relaxed">
                  Para avançar para a fase de mediação, você precisará anexar o contrato original ou o extrato onde constam os valores.
                </p>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full bg-white text-[#7a0f1a] py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <FileText size={18} />
                  {isUploading ? "Enviando..." : "Anexar Documentos"}
                </button>
              </div>
            </div>

            {/* Schedule Card */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
               <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 py-1 border-b border-gray-50">Agendamentos</h4>
               <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Calendar size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500">Próxima Disponibilidade</p>
                    <p className="text-sm font-black text-gray-900">Terça-feira, 14:30</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-gray-300" />
               </div>
               <button className="w-full mt-4 py-3 text-xs font-black text-red-600 border border-red-600 rounded-xl hover:bg-red-50 transition-all">
                  Solicitar Horário Prioritário
               </button>
            </div>

            {/* Support Info */}
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
               <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <AlertCircle size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Suporte 24h</p>
                  <p className="text-sm font-bold text-gray-900">Dúvidas? Fale Conosco</p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
