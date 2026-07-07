import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gavel, 
  DollarSign, 
  ShieldCheck, 
  Info, 
  AlertTriangle, 
  Send, 
  Flame, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  TrendingUp, 
  Volume2,
  Lock,
  ArrowRight,
  Gauge
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Process } from '../types';

interface ClientPortalNegotiationProps {
  processo: Process;
  role: 'requerente' | 'requerido';
  onUpdate: () => void;
}

export default function ClientPortalNegotiation({ processo, role, onUpdate }: ClientPortalNegotiationProps) {
  const [valorInput, setValorInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustInput, setShowAdjustInput] = useState(false);

  // Sync internal state with processo.blind_bidding values
  const blindBidding = processo.blind_bidding || {};
  const minhaProposta = role === 'requerente' 
    ? blindBidding.proposta_requerente 
    : blindBidding.proposta_requerido;
  
  const outraProposta = role === 'requerente'
    ? blindBidding.proposta_requerido
    : blindBidding.proposta_requerente;

  const temAmbosLances = !!blindBidding.proposta_requerente && !!blindBidding.proposta_requerido;
  const isMatch = blindBidding.resultado === 'MATCH' || processo.status === 'ACORDO_HOMOLOGADO';
  const temperature = blindBidding.temperature || 0;
  const mensagemTemperatura = blindBidding.mensagem_temperatura || '';

  // Initialize input value if already submitted
  useEffect(() => {
    if (minhaProposta) {
      setValorInput(formatCurrencyValue(minhaProposta * 100));
    }
  }, [minhaProposta]);

  const formatCurrencyValue = (valueNum: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueNum / 100);
  };

  const formatCurrency = (v: string) => {
    const value = v.replace(/\D/g, "");
    if (!value) return "";
    return formatCurrencyValue(Number(value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorInput(formatCurrency(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorInput) return;

    setLoading(true);
    setError(null);
    try {
      const numericValue = Number(valorInput.replace(/\D/g, "")) / 100;
      
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      
      const response = await fetch(`/api/bidding/${processo.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          party: role,
          amount: numericValue
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao registrar lance.");
      }

      setSuccess(true);
      setShowAdjustInput(false);
      onUpdate();
    } catch (err: any) {
      console.error("Erro ao submeter proposta:", err);
      setError(err.message || "Não foi possível registrar seu lance.");
    } finally {
      setLoading(false);
    }
  };

  // Cores dinâmicas para termômetro/temperatura
  const getTemperatureColor = (temp: number) => {
    if (temp > 80) return {
      bar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600',
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      glow: 'shadow-red-500/20'
    };
    if (temp > 50) return {
      bar: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      text: 'text-amber-600',
      bg: 'bg-amber-50/50',
      border: 'border-amber-100/70',
      glow: 'shadow-amber-500/10'
    };
    return {
      bar: 'bg-gradient-to-r from-blue-400 to-teal-400',
      text: 'text-teal-600',
      bg: 'bg-teal-50/30',
      border: 'border-teal-100/50',
      glow: 'shadow-teal-500/5'
    };
  };

  const tempColor = getTemperatureColor(temperature);

  return (
    <div className="w-full max-w-md mx-auto p-4 md:p-6" id="client-portal-negotiation-box">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-[60px] opacity-20 transition-all duration-700 ${
          isMatch ? 'bg-emerald-500' : temperature > 80 ? 'bg-red-500' : 'bg-indigo-500'
        }`} />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${
                isMatch ? 'bg-emerald-600' : 'bg-indigo-600'
              }`}>
                <Gavel size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 leading-tight">Blind Bidding</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lance Oculto Inteligente</p>
              </div>
            </div>
            
            <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
              {role === 'requerente' ? 'Credor' : 'Devedor'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isMatch ? (
              // TELA DE ACORDO FECHADO (MATCH)
              <motion.div 
                key="match-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-6"
              >
                <div className="relative inline-block">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-xl"
                  >
                    <CheckCircle size={44} />
                  </motion.div>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-emerald-950">Acordo Fechado!</h3>
                  <p className="text-slate-500 text-sm leading-relaxed px-2">
                    Sensacional! As propostas se cruzaram dentro da nossa margem de convergência e o sistema homologou o acordo automaticamente.
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Valor Final Acordado</span>
                  <div className="text-3xl font-black text-emerald-900">
                    {blindBidding.valor_fechado ? formatCurrencyValue(blindBidding.valor_fechado * 100) : formatCurrencyValue(0)}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Título Executivo Homologado (Art. 784, IV)
                </p>
              </motion.div>
            ) : minhaProposta && !showAdjustInput ? (
              // TELA DE AGUARDANDO OU TEMPERATURA METER
              <motion.div 
                key="submitted-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sua Proposta Oculta</p>
                    <p className="text-xl font-extrabold text-slate-700">{formatCurrencyValue(minhaProposta * 100)}</p>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl shadow-sm text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>

                {!outraProposta ? (
                  // Aguardando outra parte
                  <div className="py-6 text-center space-y-4">
                    <div className="relative w-14 h-14 mx-auto flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                      <RefreshCw className="w-6 h-6 animate-spin duration-1000" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-800">Aguardando lance da outra parte</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Seu lance está protegido sob absoluto sigilo criptográfico. Assim que a outra parte enviar a contraproposta, nosso robô fará o cruzamento.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Ambas enviaram, mas não cruzaram: Termômetro da Negociação (Temperatura)
                  <div className="space-y-5 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-slate-400" />
                        Temperatura da Negociação
                      </span>
                      <span className={`text-base font-black ${tempColor.text} px-2.5 py-0.5 rounded-full ${tempColor.bg} border ${tempColor.border} flex items-center gap-1 shadow-sm`}>
                        {temperature > 80 ? (
                          <Flame className="w-4 h-4 animate-bounce" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                        {temperature}°C
                      </span>
                    </div>

                    {/* Barra de progresso do termômetro */}
                    <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${temperature}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className={`h-full rounded-full ${tempColor.bar} ${tempColor.glow} shadow-lg`}
                      />
                    </div>

                    <div className={`p-4 rounded-xl border leading-relaxed text-xs font-semibold ${tempColor.text} ${tempColor.bg} ${tempColor.border}`}>
                      {mensagemTemperatura || "❄️ Propostas ainda distantes. Tente aproximar seu valor."}
                    </div>

                    {/* Botão de ajustar lance */}
                    <button
                      type="button"
                      onClick={() => {
                        setValorInput('');
                        setShowAdjustInput(true);
                      }}
                      className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Ajustar Minha Proposta
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              // FORMULÁRIO DE ENVIO DE LANCE
              <motion.form 
                key="bid-form"
                onSubmit={handleSubmit}
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                    Valor Secreto que Deseja Oferecer
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <span className="font-extrabold text-sm sm:text-base">R$</span>
                    </div>
                    <input 
                      type="text"
                      value={valorInput}
                      onChange={handleInputChange}
                      placeholder="0,00"
                      className="w-full pl-12 pr-6 py-4.5 bg-slate-50 hover:bg-slate-100/75 border-2 border-slate-200/70 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all text-xl font-black text-slate-800 shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <p className="text-[10px] text-amber-950 font-bold tracking-tight leading-normal uppercase">
                    Este valor representa seu lance sob sigilo. Se a contraproposta cruzar o limite aceitável de 10% de margem, o acordo será selado na hora!
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {showAdjustInput && (
                    <button
                      type="button"
                      onClick={() => setShowAdjustInput(false)}
                      className="px-4 py-4 border border-slate-200 text-slate-600 text-xs font-bold rounded-2xl hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={loading || !valorInput}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-slate-900 disabled:bg-slate-200 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition-all active:scale-95 disabled:shadow-none disabled:cursor-not-allowed"
                    id="btn-enviar-proposta"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{showAdjustInput ? 'Salvar Novo Lance' : 'Registrar Lance Secreto'}</span>
                        <Send size={15} />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <div className="mt-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-3 text-slate-200">
          <div className="h-px w-8 bg-slate-200" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Segurança Câmara GSA</p>
          <div className="h-px w-8 bg-slate-200" />
        </div>
        <p className="text-[8px] text-slate-400 font-bold max-w-[280px] mx-auto uppercase tracking-wide leading-relaxed">
          Câmara GSA de Mediação e Arbitragem • Selo de Integridade Digital 2026 • Auditoria em Real-Time
        </p>
      </div>
    </div>
  );
}
