import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, FileText, Send, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../lib/apiClient';

export default function ClientArReviewView() {
  const { arId } = useParams<{ arId: string }>();
  const [ar, setAr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!arId) return;

    const carregarAr = async () => {
      const docSnap = await getDoc(doc(db, 'ar_online', arId));
      if (docSnap.exists()) {
        setAr({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };

    carregarAr();
  }, [arId]);

  const handleConfirmarEnvioOficial = async () => {
    if (!ar) return;
    setConfirmando(true);

    try {
      // 1. Atualiza o status no banco de dados para disparar os robôs de envio
      const arRef = doc(db, 'ar_online', ar.id);
      await updateDoc(arRef, {
        status: 'LIBERADO_ENVIO',
        autorizado_pelo_cliente_em: new Date().toISOString()
      });

      // 2. Aciona a rota do backend para fazer os disparos omnichannel definitivos
      await axios.post(apiUrl(`/api/ar/disparar-canais-oficiais`), { arId: ar.id });

      setSucesso(true);
    } catch (error) {
      alert("Erro ao confirmar envio da notificação.");
    } finally {
      setConfirmando(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>;
  if (!ar) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Notificação não encontrada.</div>;

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 font-sans flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* CABEÇALHO */}
        <div className="text-center text-white">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">Conferência de Notificação</h1>
          <p className="text-slate-400 text-xs mt-1">NUP da Operação: <span className="font-mono text-amber-400 font-bold">{ar.nup_ar}</span></p>
        </div>

        {/* BOX DE STATUS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          {ar.status === 'AGUARDANDO_PAGAMENTO' && (
            <p className="text-amber-400 text-sm font-semibold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Aguardando compensação do pagamento Pix para liberação.
            </p>
          )}
          {ar.status === 'AGUARDANDO_CONFERENCIA_CLIENTE' && (
            <p className="text-indigo-400 text-sm font-semibold flex items-center justify-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4" /> Pagamento Confirmado! Revise o texto abaixo para autorizar o envio.
            </p>
          )}
          {(ar.status === 'LIBERADO_ENVIO' || sucesso) && (
            <p className="text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Notificação aprovada e enviada para os canais oficiais!
            </p>
          )}
        </div>

        {/* VISUALIZADOR DA MINUTA DA IA */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Texto Gerado pela IA da Câmara</span>
          </div>
          
          <div 
            className="p-6 md:p-8 text-sm text-slate-800 font-serif leading-relaxed h-96 overflow-y-auto bg-white select-none"
            dangerouslySetInnerHTML={{ __html: ar.texto_notificacao }}
          />
        </div>

        {/* SEÇÃO DE ASSINATURA / BOTÃO DE DISPARO */}
        {ar.status === 'AGUARDANDO_CONFERENCIA_CLIENTE' && !sucesso && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-lg animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3 text-slate-600 text-xs leading-relaxed">
              <input type="checkbox" id="concordo" required className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-amber-500 shrink-0" />
              <label htmlFor="concordo" className="cursor-pointer font-medium">
                Confirmo que revisei todos os dados do Notificado (Nome, Documento, Contatos) e dou fé de que os fatos descritos correspondem à realidade jurídica, autorizando o envio imediato via GSA Câmara.
              </label>
            </div>

            <button 
              onClick={handleConfirmarEnvioOficial}
              disabled={confirmando}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40"
            >
              {confirmando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Homologar e Enviar Notificação Ominichannel</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
