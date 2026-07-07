import React, { useState } from 'react';
import { Flame, Snowflake, CheckCircle2, DollarSign, Send, Loader2, Thermometer, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

interface BlindBiddingUXProps {
  processId: string;
  valorOriginal: number;
  onRefresh?: () => void;
}

export const BlindBiddingUX: React.FC<BlindBiddingUXProps> = ({ processId, valorOriginal, onRefresh }) => {
  const [lance, setLance] = useState<number>(Math.round(valorOriginal * 0.75)); // Começa em 75% por ser uma sugestão amigável
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const enviarLance = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      
      const response = await fetch(`/api/bidding/${processId}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ party: 'requerido', amount: lance })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar sua proposta.');
      }
      
      setResultado(data);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao processar lance.');
    } finally {
      setLoading(false);
    }
  };

  const getThermometerColor = (temp: number) => {
    if (temp >= 85) return 'from-red-500 to-orange-500';
    if (temp >= 60) return 'from-orange-400 to-yellow-400';
    if (temp >= 30) return 'from-blue-300 to-cyan-400';
    return 'from-blue-600 to-blue-400';
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] relative overflow-hidden" id="blind-bidding-ux-panel">
      {/* Background Decorativo Glassmorphism */}
      <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 pointer-events-none"></div>
      <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-indigo-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 pointer-events-none"></div>
      
      <div className="relative z-10 text-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <Thermometer className="w-6 h-6 text-indigo-600" />
          Proposta Sigilosa
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm mt-2 font-semibold uppercase tracking-wide">
          Câmara GSA • Lance Oculto
        </p>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          Faça a sua oferta de quitação sob sigilo absoluto. Se cruzar com a margem aceitável do credor, o acordo é fechado e homologado instantaneamente!
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!resultado || (!resultado.match && resultado.status !== 'AGUARDANDO_OUTRA_PARTE') ? (
          <motion.div 
            key="bidding-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Termômetro de Feedback (Gamificação) */}
            {resultado && resultado.temperature !== undefined && (
              <div className="mb-4 bg-white/80 p-4 rounded-2xl border border-indigo-50/50 shadow-sm">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    {resultado.temperature > 80 ? (
                      <Flame className="w-4 h-4 text-red-500 animate-bounce" />
                    ) : (
                      <Snowflake className="w-4 h-4 text-blue-500" />
                    )}
                    Temperatura do Acordo
                  </span>
                  <span className="text-xs font-black text-slate-800">{resultado.temperature}°C</span>
                </div>
                <div className="h-3 w-full bg-slate-200/50 rounded-full overflow-hidden shadow-inner backdrop-blur-sm">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${resultado.temperature}%` }}
                    transition={{ duration: 1, type: "spring" }}
                    className={`h-full rounded-full bg-gradient-to-r ${getThermometerColor(resultado.temperature)}`}
                  />
                </div>
                <p className="text-xs text-center mt-3 font-bold text-indigo-950 px-1">{resultado.mensagem}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left ml-1">
                Valor da sua Oferta
              </label>
              <div className="relative flex items-center justify-center">
                <span className="absolute left-5 text-xl text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  value={lance}
                  onChange={(e) => setLance(Number(e.target.value))}
                  className="w-full text-center text-3xl font-black text-indigo-700 bg-white/70 border-2 border-indigo-100 py-5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-100 flex items-start gap-2">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-[10px] text-amber-950 font-bold tracking-tight uppercase leading-normal">
                Dica: O credor está disposto a conceder descontos dentro da margem de viabilidade de até 10%.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100">
                {error}
              </div>
            )}
            
            <div className="pt-2">
              <button
                onClick={enviarLance}
                disabled={loading || lance <= 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center shadow-xl shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> 
                    <span>Enviar Proposta Oculta</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : resultado.match ? (
          <motion.div 
            key="bidding-success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Acordo Fechado!</h3>
            <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">A sua proposta atendeu aos requisitos de viabilidade do credor.</p>
            <div className="bg-white/80 px-6 py-4 rounded-2xl border border-emerald-100 w-full shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Valor Final Acordado</p>
              <p className="text-3xl font-black text-emerald-600">R$ {resultado.valor_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="bidding-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Proposta Sob Sigilo</h3>
            <p className="text-slate-600 text-xs leading-relaxed max-w-xs mx-auto">
              A sua proposta foi gravada com segurança. Aguardando o credor inserir a sua margem de viabilidade para verificar o cruzamento automático de valores.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
