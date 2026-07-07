import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  AlertCircle, 
  ChevronDown, 
  Info,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IntegrityScoreBadgeProps {
  score: number;
  divergencias?: string[];
  documentoLegivel?: boolean;
}

export const IntegrityScoreBadge: React.FC<IntegrityScoreBadgeProps> = ({ 
  score, 
  divergencias = [], 
  documentoLegivel = true 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatus = () => {
    if (!documentoLegivel || score < 70) return 'danger';
    if (score < 90) return 'warning';
    return 'success';
  };

  const status = getStatus();

  const config = {
    success: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: <ShieldCheck size={14} />,
      label: 'Validado pela IA',
      glow: 'shadow-emerald-500/20'
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: <ShieldAlert size={14} />,
      label: 'Requer Revisão Humana',
      glow: 'shadow-amber-500/20'
    },
    danger: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      icon: <ShieldX size={14} />,
      label: documentoLegivel ? 'Inconsistente' : 'Documento Ilegível',
      glow: 'shadow-rose-500/20'
    }
  };

  const activeConfig = config[status];

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all shadow-lg",
          activeConfig.bg,
          activeConfig.border,
          activeConfig.text,
          activeConfig.glow
        )}
      >
        <span className="animate-pulse">{activeConfig.icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {score}% • {activeConfig.label}
        </span>
        <ChevronDown 
          size={12} 
          className={cn("transition-transform duration-300", showDetails ? "rotate-180" : "rotate-0")} 
        />
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute z-50 top-full mt-3 right-0 w-64 p-5 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header com Glassmorphism */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", activeConfig.bg)}>
                  <Info size={14} className={activeConfig.text} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Análise de Auditoria</h4>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDetails(false); }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Score IA</p>
                  <p className={cn("text-2xl font-serif font-black leading-none", activeConfig.text)}>
                    {score}<span className="text-sm">%</span>
                  </p>
                </div>
                {!documentoLegivel && (
                  <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-md border border-rose-100">ILEGÍVEL</span>
                )}
              </div>

              <div>
                <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-2">Observações / Divergências</p>
                {divergencias.length > 0 ? (
                  <ul className="space-y-2">
                    {divergencias.map((div, i) => (
                      <li key={i} className="flex gap-2 text-[10px] leading-tight text-gray-600 font-medium bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <AlertCircle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                        {div}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-black bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <ShieldCheck size={10} />
                    Nenhuma divergência detectada.
                  </div>
                )}
              </div>
            </div>

            {/* Background pattern */}
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gray-100 rounded-full blur-2xl opacity-20 pointer-events-none"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
