import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useParams, useSearchParams } from 'react-router-dom';
import { Scale, CheckCircle, ArrowRight, User, AlertCircle, FileText, QrCode, Copy, Clock, ShieldCheck } from 'lucide-react';

interface RequestForm {
  cliente_nome: string;
  cliente_documento: string;
  cliente_email: string;
  cliente_whatsapp: string;
  parte_contraria_nome: string;
  parte_contraria_telefone: string;
  valor_causa: number;
  resumo_fato: string;
}

export default function PublicMediationRequest() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const refConsultorId = searchParams.get('ref');
  const { register, handleSubmit } = useForm<RequestForm>();
  const [step, setStep] = useState(0); // Começa no Passo 0 (Aviso)
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para o Checkout do PIX
  const [pixData, setPixData] = useState<{ encodedImage: string, payload: string, invoiceUrl: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const copiarPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const onSubmit = async (data: RequestForm) => {
    setIsSubmitting(true);
    try {
      // 1. Salva o Lead no Firestore
      const leadDocRef = await addDoc(collection(db, 'leads'), {
        ...data,
        tenantSlug: tenantSlug || 'gsa-master',
        origem: 'link_publico_requerimento',
        status: 'AGUARDANDO_PAGAMENTO_ANALISE',
        tipo_lead: 'REQUERIMENTO_MEDIACAO',
        servico_alvo: 'MEDIACAO',
        consultorId: refConsultorId || null,
        createdAt: serverTimestamp(),
      });

      // 2. Chama a nossa nova API para gerar o PIX de R$ 47
      const paymentRes = await fetch('/api/gerar-pix-analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: data.cliente_nome,
          cpfCnpj: data.cliente_documento.replace(/\D/g, ''),
          email: data.cliente_email,
          whatsapp: data.cliente_whatsapp.replace(/\D/g, ''),
          leadId: leadDocRef.id
        })
      });

      const paymentJson = await paymentRes.json();

      if (paymentJson.success) {
        // Atualiza o lead com o ID do pagamento
        await updateDoc(leadDocRef, {
          asaasPaymentId: paymentJson.paymentId,
          linkPagamento: paymentJson.invoiceUrl
        });

        // 3. Exibe o QR Code na tela
        setPixData({
          encodedImage: paymentJson.pixQrCodeImage,
          payload: paymentJson.pixCopiaECola,
          invoiceUrl: paymentJson.invoiceUrl
        });
        
        // 4. Dispara o E-mail de Boas Vindas com os dados do PIX
        await fetch('/api/notifications/welcome-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: data.cliente_nome,
            email: data.cliente_email,
            whatsapp: data.cliente_whatsapp,
            leadId: leadDocRef.id,
            linkPagamento: paymentJson.invoiceUrl // Envia a fatura para o e-mail/whatsapp também
          })
        });

        setStep(4); // Avança para a tela de pagamento
      } else {
        alert("Erro ao gerar pagamento. Tente novamente.");
      }

    } catch (error) {
      console.error("Erro geral:", error);
      alert("Ocorreu um erro de conexão. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-xl w-full">
        
        {/* PASSO 0: AVISO E ALINHAMENTO DE EXPECTATIVAS */}
        {step === 0 && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
            <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 opacity-10 rounded-bl-full"></div>
              <Scale className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Análise de Conflito Extrajudicial</h1>
              <p className="text-slate-400 text-sm">Resolução rápida, direta e com validade jurídica.</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Taxa Única de Análise</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Para que um dos nossos procuradores analise o seu caso com exclusividade, cobramos uma taxa inicial de <strong>R$ 47,00</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Estratégia em 72 Horas</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Após o pagamento, a nossa equipa irá analisar os detalhes e entregar-lhe a melhor estratégia de mediação no prazo máximo de 72 horas.
                  </p>
                </div>
              </div>

              <button onClick={() => setStep(1)} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-8 text-lg shadow-lg shadow-amber-500/30">
                Iniciar Requerimento <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* PASSOS DO FORMULÁRIO (1 a 3) */}
        {step > 0 && step < 4 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in">
            <div className="bg-slate-100 flex items-center justify-between px-6 py-4 border-b border-slate-200">
               <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                  <span className="w-6 h-6 rounded-full bg-current flex items-center justify-center text-white text-xs">1</span> Requerente
               </div>
               <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                  <span className="w-6 h-6 rounded-full bg-current flex items-center justify-center text-white text-xs">2</span> Requerido
               </div>
               <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                  <span className="w-6 h-6 rounded-full bg-current flex items-center justify-center text-white text-xs">3</span> Fatos
               </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
              
              {/* PASSO 1 */}
              {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><User className="w-5 h-5 text-amber-500" /> Os Seus Dados</h3>
                  <input {...register('cliente_nome', { required: true })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Nome Completo" />
                  <input {...register('cliente_documento', { required: true })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="CPF ou CNPJ" />
                  <div className="grid grid-cols-2 gap-4">
                    <input {...register('cliente_whatsapp', { required: true })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="WhatsApp" />
                    <input type="email" {...register('cliente_email', { required: true })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="E-mail" />
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="mt-6 w-full bg-slate-900 text-white font-bold p-4 rounded-lg flex items-center justify-center gap-2">Continuar <ArrowRight className="w-4 h-4" /></button>
                </div>
              )}

              {/* PASSO 2 */}
              {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5 text-amber-500" /> A Parte Contrária</h3>
                  <p className="text-xs text-slate-500 mb-2">Com quem é o conflito?</p>
                  <input {...register('parte_contraria_nome', { required: true })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Nome ou Empresa" />
                  {/* TELEFONE OPCIONAL AQUI */}
                  <input {...register('parte_contraria_telefone', { required: false })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="WhatsApp da outra parte (Opcional)" />
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-slate-200 text-slate-800 font-bold p-4 rounded-lg">Voltar</button>
                    <button type="button" onClick={() => setStep(3)} className="w-2/3 bg-slate-900 text-white font-bold p-4 rounded-lg flex justify-center items-center gap-2">Continuar <ArrowRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {/* PASSO 3 */}
              {step === 3 && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-amber-500" /> Detalhes do Conflito</h3>
                  <input type="number" step="0.01" {...register('valor_causa', { required: true })} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Valor em discussão (R$)" />
                  <textarea {...register('resumo_fato', { required: true })} rows={4} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Descreva brevemente o que aconteceu..." />
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-slate-200 text-slate-800 font-bold p-4 rounded-lg">Voltar</button>
                    <button type="submit" disabled={isSubmitting} className="w-2/3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                      {isSubmitting ? 'Gerando Pagamento...' : <><QrCode className="w-5 h-5" /> Pagar Taxa (R$ 47)</>}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* PASSO 4: CHECKOUT NA TELA */}
        {step === 4 && pixData && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100 animate-in fade-in zoom-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Requerimento Recebido!</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Efetue o pagamento da <strong>Taxa de Análise (R$ 47,00)</strong> para iniciarmos. <br/>As instruções também foram enviadas para o seu e-mail.
            </p>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block">
               {/* Imagem do QR Code devolvida pelo Asaas */}
               <img src={`data:image/jpeg;base64,${pixData.encodedImage}`} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-lg shadow-sm" />
               
               <p className="text-xs text-slate-500 mt-4 font-semibold uppercase">Ou pague por Pix Copia e Cola</p>
               <div className="mt-2 flex items-center justify-between bg-white border border-slate-300 rounded-lg p-2 max-w-sm mx-auto overflow-hidden">
                 <input 
                   readOnly 
                   value={pixData.payload} 
                   className="text-xs text-slate-600 w-full outline-none bg-transparent"
                 />
                 <button 
                   onClick={copiarPix} 
                   className={`ml-2 p-2 rounded-md flex-shrink-0 transition-colors ${copiado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                 >
                   {copiado ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                 </button>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
              <Clock className="w-5 h-5 text-amber-500" />
              SLA de Resposta: <strong className="text-slate-800">72 Horas</strong>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
