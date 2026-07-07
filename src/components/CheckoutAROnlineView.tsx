import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Minus, Plus, Loader2, QrCode, ShieldCheck, ArrowRight } from 'lucide-react';

export const CheckoutAROnlineView: React.FC = () => {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState<number>(3);
  const [etapa, setEtapa] = useState<'COMPRA' | 'PAGAMENTO' | 'SUCESSO'>('COMPRA');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const PRECO_POR_AR = 4.97;
  const totalPacote = quantidade * PRECO_POR_AR;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('leadId');
    const q = params.get('qty');
    const auto = params.get('auto');
    
    let initialQty = 3;
    if (q) {
      initialQty = parseInt(q, 10);
      setQuantidade(initialQty);
    }
    
    if (id) {
      setLeadId(id);
      if (auto === 'true') {
        // Automatically trigger generation
        gerarCobranca(id, initialQty);
      }
    }
  }, []);

  const gerarCobranca = async (idToUse: string, qtyToUse: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finance/gerar-cobranca-servico/${idToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servico: 'creditos_ar_online',
          quantidade: qtyToUse,
          valor: qtyToUse * PRECO_POR_AR,
          descricao: `Pacote de ${qtyToUse} Notificações Extrajudiciais (AR Online)`
        })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar cobrança');
      
      setPixData(data.cobranca);
      setEtapa('PAGAMENTO');
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao processar seu pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const comprarCreditos = () => {
    if (!leadId) {
      alert("Identificação do Lead não encontrada. Por favor, retorne à vitrine.");
      return;
    }
    gerarCobranca(leadId, quantidade);
  };

  const handleDiminuir = () => {
    if (quantidade > 3) setQuantidade(quantidade - 1);
  };

  const handleAumentar = () => {
    setQuantidade(quantidade + 1);
  };

  // Simulação de confirmação de pagamento para ambiente de dev
  const simularPagamentoAprovado = async () => {
    try {
        const email = localStorage.getItem('ar_online_email');
        if (email) {
            const { db } = await import('../lib/firebase');
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            await addDoc(collection(db, 'pagamentos'), {
                email: email,
                qty: quantidade,
                status: 'PAGO',
                createdAt: serverTimestamp(),
                type: 'INITIAL_CHECKOUT'
            });
        }
    } catch(e) {
        console.error("Erro ao salvar simulação:", e);
    }
    setEtapa('SUCESSO');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 font-sans">
      
      {etapa === 'COMPRA' && loading && (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl border border-slate-100 p-12 flex flex-col items-center text-center">
           <Loader2 className="w-12 h-12 text-[#5A5A40] animate-spin mb-4" />
           <h2 className="text-xl font-black text-slate-800">Gerando seu Checkout...</h2>
           <p className="text-sm text-slate-500 mt-2">Aguarde um instante.</p>
        </div>
      )}

      {etapa === 'COMPRA' && !loading && (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-10">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
              <CreditCard className="w-6 h-6 text-slate-800" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compra sob demanda</p>
              <h2 className="text-xl font-black text-slate-800">AR Créditos</h2>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-bold text-slate-500 tracking-wider mb-3 uppercase">Quantidade de Notificações (Mín 3)</p>
            <div className="flex items-center justify-between">
              <button 
                onClick={handleDiminuir} 
                disabled={quantidade <= 3}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 mx-4 bg-slate-50 rounded-2xl py-4 text-center">
                <span className="text-3xl font-black text-slate-800">{quantidade}</span>
              </div>
              <button 
                onClick={handleAumentar}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-[#1a2235] rounded-3xl p-6 text-center mb-8 shadow-lg">
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Preço por AR</p>
            <p className="text-3xl font-black text-[#facc15]">R$ {PRECO_POR_AR.toFixed(2).replace('.', ',')}</p>
          </div>

          <div className="space-y-4 mb-8 pl-2">
            {[
              'Envio Multi Plataforma',
              'SMS, WhatsApp, E-mail',
              'Suporte Prioritário',
              'Validade Jurídica GSA'
            ].map((item, i) => (
              <div key={i} className="flex items-center text-sm font-semibold text-slate-600">
                <div className="w-5 h-5 rounded-full bg-[#fef08a] flex items-center justify-center mr-3 flex-shrink-0">
                  <Check className="w-3 h-3 text-[#ca8a04] stroke-[3]" />
                </div>
                {item}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-6 mb-8 flex justify-between items-end">
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Total do Pacote</p>
            <p className="text-4xl font-black text-slate-900">R$ {totalPacote.toFixed(2).replace('.', ',')}</p>
          </div>

          <button 
            onClick={comprarCreditos}
            disabled={loading}
            className="w-full bg-[#5A5A40] hover:bg-slate-800 text-white font-black py-5 rounded-2xl tracking-widest uppercase text-sm shadow-xl transition-all flex items-center justify-center disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Comprar Créditos Agora'}
          </button>
        </div>
      )}

      {etapa === 'PAGAMENTO' && pixData && (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl border border-slate-100 p-8 flex flex-col items-center text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Finalizar Compra</h2>
          <p className="text-slate-500 mb-6">Realize o pagamento de <strong className="text-slate-800">R$ {totalPacote.toFixed(2).replace('.', ',')}</strong> para liberar os créditos na sua conta.</p>
          
          <div className="w-full bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <QrCode className="w-48 h-48 mx-auto text-slate-800 mb-6 opacity-50" /> {/* Substituir por imagem do QR Code Base64 */}
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">PIX Copia e Cola:</p>
            <div className="bg-white p-4 rounded-xl border border-slate-300 text-xs break-all text-slate-600 font-mono mb-4 select-all shadow-sm">
              {pixData.pixCopiaECola || '00020101021126580014br.gov.bcb.pix0136...'}
            </div>
            <div className="flex items-center justify-center text-sm text-green-600 font-bold bg-green-50 py-3 rounded-xl border border-green-100">
              <ShieldCheck className="w-5 h-5 mr-2" /> Aguardando Pagamento...
            </div>
            
            {/* Mock Dev */}
            <button onClick={simularPagamentoAprovado} className="mt-6 text-xs underline text-indigo-500">Simular Pagamento (Dev)</button>
          </div>
        </div>
      )}

      {etapa === 'SUCESSO' && (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl border border-slate-100 p-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-[#fef08a] rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Check className="w-12 h-12 text-[#ca8a04] stroke-[3]" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-3">Tudo Certo!</h2>
          <p className="text-slate-600 font-medium mb-8">O pagamento foi confirmado e <strong className="text-slate-800">{quantidade} créditos</strong> já estão disponíveis no seu painel.</p>
          
          <button onClick={() => window.location.href = '/ar-online/dashboard'} className="w-full bg-[#5A5A40] hover:bg-slate-800 text-white font-black py-4 rounded-2xl tracking-widest uppercase text-sm flex justify-center items-center">
            Acessar Painel de Envios <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      )}

    </div>
  );
};
