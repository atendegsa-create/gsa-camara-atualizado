import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldAlert, ArrowRight, CheckCircle2, Search, QrCode, Copy, ShieldCheck, AlertTriangle, Zap, Volume2 } from 'lucide-react';

export default function LimpaNomeQuizView() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const docRef = doc(db, 'config', 'master');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Config loaded in LimpaNomeQuizView:", data);
        setConfig(data);
      }
    };
    fetchConfig();
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Respostas do Quiz e Dados do Lead
  const [respostas, setRespostas] = useState({ pergunta1: '', pergunta2: '' });
  const [leadData, setLeadData] = useState({ nome: '', documento: '', whatsapp: '', email: '' });
  
  // Dados do PIX
  const [pixData, setPixData] = useState<{ encodedImage: string, payload: string, invoiceUrl: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const perguntas = [
    {
      titulo: "Sabe qual é a empresa que negativou o seu CPF/CNPJ?",
      opcoes: ["Sim, sei exatamente qual é a empresa.", "Não tenho a certeza.", "Acredito ser uma negativação indevida (fraude)."]
    },
    {
      titulo: "Há quanto tempo o seu nome está com restrição?",
      opcoes: ["Menos de 1 ano", "Entre 1 a 4 anos", "Mais de 5 anos (Dívida Caduca)"]
    }
  ];

  const handleOpcaoClick = (perguntaIndex: number, opcao: string) => {
    if (perguntaIndex === 0) setRespostas({ ...respostas, pergunta1: opcao });
    if (perguntaIndex === 1) setRespostas({ ...respostas, pergunta2: opcao });
    setStep(step + 1);
  };

  const handleSubmeterLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStep(4); // Tela de "Analisando..." (Efeito Psicológico)

    try {
      // 1. Salva o Lead no Firestore com a tag LIMPA_NOME
      const resumoQuiz = `1. Empresa: ${respostas.pergunta1} | 2. Tempo: ${respostas.pergunta2}`;
      
      const leadDocRef = await addDoc(collection(db, 'leads'), {
        cliente_nome: leadData.nome,
        cliente_documento: leadData.documento,
        cliente_whatsapp: leadData.whatsapp,
        cliente_email: leadData.email,
        resumo_fato: resumoQuiz,
        tenantSlug: tenantSlug || 'gsa-master',
        origem: 'quiz_limpa_nome',
        tipo_lead: 'LIMPA_NOME', // Filtro para o Monitor de Leads
        status: 'AGUARDANDO_PAGAMENTO_ANALISE',
        createdAt: serverTimestamp(),
      });

      // 2. Chama a API para gerar o PIX da Taxa de Análise (Ajustado para o serviço Limpa Nome)
      // Nota: Certifique-se de que o backend envia R$ 27,00 para este tipo_lead
      const paymentRes = await fetch('/api/gerar-pix-analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: leadData.nome,
          cpfCnpj: leadData.documento.replace(/\D/g, ''),
          email: leadData.email,
          whatsapp: leadData.whatsapp.replace(/\D/g, ''),
          leadId: leadDocRef.id,
          tenantSlug: tenantSlug,
          servicoAlvo: 'LIMPA_NOME' // Informa o backend para buscar a regra de R$ 27
        })
      });

      const paymentJson = await paymentRes.json();

      if (paymentJson.success) {
        await updateDoc(leadDocRef, {
          asaasPaymentId: paymentJson.paymentId,
          linkPagamento: paymentJson.invoiceUrl
        });

        setPixData({
          encodedImage: paymentJson.pixQrCodeImage,
          payload: paymentJson.pixCopiaECola,
          invoiceUrl: paymentJson.invoiceUrl
        });

        // Simula um tempo de carregamento de IA para aumentar o valor percebido
        setTimeout(() => setStep(5), 2500); 
      } else {
        alert("Erro ao gerar análise. Tente novamente.");
        setStep(3);
      }
    } catch (error) {
      console.error("Erro no funil:", error);
      alert("Falha na conexão.");
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copiarPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-md w-full">
        
        {/* CABEÇALHO DO FUNIL */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Análise de Restrição de Crédito</h1>
          <p className="text-indigo-200 text-sm">Responda ao quiz para verificarmos a viabilidade de limpar o seu nome.</p>
        </div>

        {/* CONTAINER DO QUIZ */}
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 relative">
          
          {/* BARRA DE PROGRESSO */}
          {step > 0 && step < 4 && (
             <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
               <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
             </div>
          )}

          <div className="p-8">
            
            {/* PASSO 0: INTRODUÇÃO */}
            {step === 0 && (
              <div className="text-center animate-in zoom-in-95">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-4">O seu CPF está bloqueado?</h2>
                <p className="text-slate-600 text-sm mb-8">
                  Dívidas caducas (mais de 5 anos), juros abusivos ou negativações indevidas podem ser resolvidas de forma extrajudicial, restaurando o seu *Score* financeiro.
                </p>
                <button onClick={() => setStep(1)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30">
                  Começar Avaliação <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* PASSOS 1 e 2: PERGUNTAS DO QUIZ */}
            {(step === 1 || step === 2) && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-lg font-bold text-slate-800 mb-6 text-center leading-tight">
                  {perguntas[step - 1].titulo}
                </h2>
                <div className="space-y-3">
                  {perguntas[step - 1].opcoes.map((opcao, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleOpcaoClick(step - 1, opcao)}
                      className="w-full bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-semibold p-4 rounded-xl text-left transition-all flex items-center justify-between group"
                    >
                      {opcao}
                      <CheckCircle2 className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 3: CAPTURA DE DADOS */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Para onde enviamos o resultado?</h2>
                <p className="text-slate-500 text-xs text-center mb-6">Preencha os dados abaixo para puxarmos o relatório do seu CPF/CNPJ.</p>
                
                <form onSubmit={handleSubmeterLead} className="space-y-4">
                  <input required value={leadData.nome} onChange={e => setLeadData({...leadData, nome: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome Completo" />
                  <input required value={leadData.documento} onChange={e => setLeadData({...leadData, documento: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="CPF ou CNPJ" />
                  <input required value={leadData.whatsapp} onChange={e => setLeadData({...leadData, whatsapp: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="WhatsApp com DDD" />
                  <input required type="email" value={leadData.email} onChange={e => setLeadData({...leadData, email: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="O seu melhor E-mail" />
                  
                  <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-500/30">
                    Avançar para Análise <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}

            {/* PASSO 4: CARREGAMENTO (EFEITO PSICOLÓGICO) */}
            {step === 4 && (
              <div className="text-center py-8 animate-in fade-in">
                <Search className="w-12 h-12 text-indigo-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">A cruzar os seus dados...</h2>
                <p className="text-slate-500 text-sm">A nossa IA está a identificar as oportunidades de regularização no seu CPF.</p>
              </div>
            )}

            {/* PASSO 5: CHECKOUT (TAXA DE ANÁLISE DE R$ 27) */}
            {step === 5 && pixData && (
              <div className="text-center animate-in zoom-in-95">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Viabilidade Encontrada!</h2>
                
                {/* VIDEO PLAYER */}
                {(config?.quizYouTubeUrl || config?.quiz_youtube_url) && (
                    <div className="my-6 rounded-2xl overflow-hidden shadow-lg">
                      <iframe
                        className="w-full aspect-video"
                        src={(() => {
                           const url = config?.quizYouTubeUrl || config?.quiz_youtube_url || "";
                           if (!url) return "";
                           if (url.includes('embed/')) return url;
                           const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                           const match = url.match(regExp);
                           const id = (match && match[2].length === 11) ? match[2] : '';
                           return id ? `https://www.youtube.com/embed/${id}?controls=1&modestbranding=1&rel=0` : '';
                        })()}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                )}

                <p className="text-slate-600 text-sm mb-6">
                  Efetue o pagamento da <strong>Taxa de Consulta (R$ 27,00)</strong> para emitirmos o seu relatório detalhado de restrições e a estratégia de resolução.
                </p>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <img src={`data:image/jpeg;base64,${pixData.encodedImage}`} alt="QR Code PIX" className="w-40 h-40 mx-auto rounded-lg shadow-sm" />
                  
                  <p className="text-xs text-slate-500 mt-4 font-semibold uppercase">Pix Copia e Cola</p>
                  <div className="mt-2 flex items-center justify-between bg-white border border-slate-300 rounded-lg p-2 overflow-hidden">
                    <input readOnly value={pixData.payload} className="text-xs text-slate-600 w-full outline-none bg-transparent" />
                    <button onClick={copiarPix} className={`ml-2 p-2 rounded-md transition-colors ${copiado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                      {copiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Ambiente 100% Seguro e Criptografado
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
