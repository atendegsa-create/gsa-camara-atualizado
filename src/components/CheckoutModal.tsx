import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Copy, Clock, Lock as LockIcon, Loader2, CheckCircle2, MessageCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Faixa } from '../lib/pricing';
import { useAuth } from '../AuthContext';
import { criarCobranca } from '../lib/asaas';
import { notificarCobrancaCriada } from '../services/webhookService';

interface CheckoutModalProps {
  plano: 'vista' | 'entrada' | 'diagnostico' | 'atendimento' | null;
  faixa?: Faixa;
  nome?: string;
  email?: string;
  whatsapp?: string;
  processoId?: string; // ID do processo se já existir
  onClose?: () => void;
  tenantSlug?: string;
}

export default function CheckoutModal({ plano, faixa, nome, email, whatsapp, processoId, tenantSlug, onClose }: CheckoutModalProps) {
  const { tenant } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<any>(null);
  const [status, setStatus] = useState<"pending" | "paid">("pending");

  const generatePayment = async () => {
    if (!plano || !faixa) return;
    setLoading(true);
    setError(null);
    try {
      // Chamada unificada para o nosso novo endpoint proxy /api/create-payment
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plano, 
          faixa, 
          nome, 
          email, 
          whatsapp,
          processoId,
          tenantId: tenant?.id || tenantSlug 
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || result.error || "Erro ao gerar pagamento");
      }
      
      const result = await response.json();
      setPix(result);

      // Gatilho: Notificação de WhatsApp (SDR) e Lembretes Asaas
      if (whatsapp && nome) {
        try {
          const paymentLink = result.invoiceUrl || window.location.origin + window.location.pathname; 
          await notificarCobrancaCriada(whatsapp, nome, paymentLink, processoId);
        } catch(e) {
          console.error("Falha ao notificar WhatsApp", e);
        }
      }

    } catch (error: any) {
      console.error("Erro ao gerar pagamento:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePayment();
  }, [plano, faixa, nome, tenant?.id]);

  // Polling for status
  useEffect(() => {
    if (!pix?.id || status === "paid") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment-status?id=${pix.id}`);
        const json = await res.json();

        if (json.status === "CONFIRMED") {
          setStatus("paid");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pix, status]);

  const copyToClipboard = () => {
    if (pix?.copiaECola) {
      navigator.clipboard.writeText(pix.copiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "paid") {
    return (
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-green-100">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Pagamento Confirmado!</h2>
          <p className="text-slate-500 font-medium">Seu protocolo foi ativado com sucesso. Nossa equipe já está preparando sua documentação.</p>
        </div>
        <a 
          href={`https://wa.me/5511999999999?text=Olá, acabei de ativar meu protocolo ${pix?.id}.`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-5 bg-[#25D366] text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-100 transition-all hover:bg-[#128C7E]"
        >
          <MessageCircle size={24} />
          Falar com Especialista
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-2xl space-y-6 md:space-y-8 relative overflow-hidden">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={20} className="md:w-6 md:h-6" />
      </button>

      {loading ? (
        <div className="py-12 md:py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative">
            <Loader2 className="animate-spin text-indigo-600 md:w-12 md:h-12" size={40} />
            <Wallet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-200 md:w-5 md:h-5" size={16} />
          </div>
          <div className="space-y-1">
            <p className="font-black text-slate-900 text-sm md:text-base">Gerando seu PIX Seguro</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aguarde um momento...</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-8 md:py-12 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center border-4 border-red-100/50">
            <X size={32} className="md:w-10 md:h-10" />
          </div>
          <div className="space-y-2 px-2 md:px-4">
            <h2 className="text-lg md:text-xl font-black text-slate-900">Falha ao Gerar Pix</h2>
            <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
              Infelizmente não conseguimos processar seu pagamento automaticamente via {pix?.gateway === "asaas" ? "Asaas" : "Mercado Pago"}.
            </p>
            <div className="mt-4 p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] md:text-xs text-slate-400 font-mono italic break-words max-w-full">
              {error}
            </div>
          </div>
          
          <div className="w-full space-y-3 px-2 md:px-4">
            <button 
              onClick={generatePayment}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
              Tentar Novamente
            </button>
            <a 
              href={`https://wa.me/5511999999999?text=Olá, tive um problema ao gerar o pagamento no checkout. Erro: ${error}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <MessageCircle size={18} />
              Contatar Suporte
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
              <Wallet className="text-indigo-600 md:w-8 md:h-8" size={24} />
            </div>
            <h2 className="text-xl md:text-2xl font-black">Ative seu Protocolo</h2>
            <p className="text-slate-500 font-medium text-xs md:text-sm">Escaneie o QR Code ou copie a chave PIX abaixo.</p>
          </div>

          <div className="p-3 md:p-4 bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-200">
            <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm flex items-center justify-center">
              {(pix?.qr_code_base64 || pix?.qrCode) && (
                <img 
                  src={(pix.qr_code_base64 || pix.qrCode).startsWith('data:') ? (pix.qr_code_base64 || pix.qrCode) : `data:image/png;base64,${pix.qr_code_base64 || pix.qrCode}`} 
                  alt="QR Code PIX" 
                  className="w-40 h-40 md:w-48 md:h-48 object-contain" 
                />
              )}
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            <button 
              onClick={copyToClipboard}
              className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <Copy className="text-slate-400 group-hover:text-indigo-600 md:w-5 md:h-5" size={18} />
                <span className="font-bold text-slate-600 text-sm">PIX Copia e Cola</span>
              </div>
              <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-widest", copied ? "text-green-600" : "text-indigo-600")}>
                {copied ? 'Copiado!' : 'Copiar'}
              </span>
            </button>

            <div className="flex items-start gap-3 md:gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
               <Clock className="text-orange-500 shrink-0 mt-0.5 md:w-5 md:h-5" size={18} />
               <p className="text-[9px] md:text-[10px] font-black text-orange-700 uppercase leading-normal tracking-wider">
                  Seu código expira em 10 minutos. O sistema confirmará automaticamente após o pagamento.
               </p>
            </div>
          </div>

          <div className="pt-2 md:pt-4 flex items-center justify-center gap-4 text-slate-300">
            <div className="h-px w-full bg-slate-100" />
            <LockIcon size={14} className="md:w-4 md:h-4" />
            <div className="h-px w-full bg-slate-100" />
          </div>
        </>
      )}
    </div>
  );
}
