import React, { useState } from 'react';
import { Copy, Share2, Smartphone, CheckCircle2, ExternalLink, Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../AuthContext';

export const PainelVitrineAfiliado: React.FC = () => {
  const [copiado, setCopiado] = useState(false);
  const { user, profile } = useAuth();
  
  const codigoAfiliado = profile?.codigo_afiliado || user?.uid || 'UID_EXEMPLO_123'; 
  const baseUrl = window.location.origin;
  const linkAfiliado = `${baseUrl}/solucoes?ref=${codigoAfiliado}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkAfiliado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const compartilharWhatsApp = () => {
    const texto = encodeURIComponent(`Olá! Vi que você precisa de ajuda com resoluções jurídicas ou administrativas. A Câmara GSA pode te ajudar de forma rápida e segura. Faça uma análise gratuita aqui: ${linkAfiliado}`);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 mt-4 sm:mt-8" id="painel-vitrine-afiliado">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-indigo-900/40">
        {/* Elemento Decorativo */}
        <div className="absolute -right-10 -top-10 bg-indigo-500/10 w-48 h-48 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 bg-indigo-600/10 w-48 h-48 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
              Programa de Afiliados GSA
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight flex items-center gap-2">
            Sua Máquina de Vendas <Sparkles className="text-yellow-400 w-6 h-6 animate-pulse" />
          </h2>
          <p className="text-indigo-200/90 text-xs sm:text-sm mb-8 max-w-xl leading-relaxed">
            Compartilhe o seu link exclusivo da Vitrine de Soluções GSA. Qualquer cliente que solicitar um serviço por ele será automaticamente rastreado, vinculado à sua conta e elegível para comissionamento.
          </p>

          <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex-1 min-w-0 font-mono text-xs text-indigo-200/90 bg-indigo-950/40 px-3.5 py-3 rounded-xl border border-indigo-950 select-all truncate">
              {linkAfiliado}
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
              <button 
                type="button"
                onClick={copiarLink}
                className="flex-1 sm:flex-none bg-white hover:bg-slate-100 text-indigo-950 px-5 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 gap-1.5"
              >
                {copiado ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> 
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" /> 
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
              
              <button 
                type="button"
                onClick={compartilharWhatsApp}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95 gap-1.5"
              >
                <Smartphone className="w-4 h-4 shrink-0" /> 
                <span>Compartilhar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 text-[11px] text-indigo-300 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Rastreamento em Real-Time Ativo</span>
          </div>
          <div className="text-indigo-400/85">
            Código do Afiliado: <span className="font-mono text-white bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-900 font-bold uppercase select-all tracking-wider">{codigoAfiliado}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <a 
          href={linkAfiliado} 
          target="_blank" 
          rel="noreferrer" 
          className="text-indigo-600 font-black text-xs sm:text-sm flex items-center hover:text-indigo-800 transition-colors uppercase tracking-wider gap-1"
        >
          <span>Visualizar minha Vitrine Pública</span> 
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
