import React from 'react';
import { useParams } from 'react-router-dom';
import { Zap, ShieldCheck } from 'lucide-react';
import QuizPremium from './QuizPremium';

export default function LimpaNomeQuiz() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const handleFinalize = (data: any) => {
    console.log("Quiz finalized:", data);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-900 selection:bg-indigo-100 flex flex-col">
      <nav className="p-4 md:p-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <span className="font-bold text-xl md:text-2xl tracking-tight">GSA <span className="text-indigo-600">Limpa Nome</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 bg-white rounded-full border border-slate-100 shadow-sm">
          <ShieldCheck size={18} className="text-green-500" />
          <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-400">Plataforma Segura</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 md:p-12 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_50%)]">
        <div className="w-full max-w-lg lg:max-w-2xl">
          <QuizPremium tenantSlug={tenantSlug} onFinalize={handleFinalize} />
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-slate-100 bg-white">
        <p className="max-w-4xl mx-auto text-[10px] text-slate-400 font-medium text-center leading-loose">
          © 2026 GSA CÂMARA. Todos os direitos reservados. Este serviço é uma mediação extrajudicial fundamentada na Lei 14.181/2021. A ativação do protocolo não garante resultado imediato perante todos os credores, dependendo da aceitação dos termos de conciliação.
        </p>
      </footer>
    </div>
  );
}
