import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ClipboardCheck, ArrowRight, CheckCircle2, Search, FileText, ShieldCheck, HelpCircle, Clock } from 'lucide-react';

export default function RxInssQuizView() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado do Quiz e do Lead
  const [respostas, setRespostas] = useState({ tipoBeneficio: '', tempoBeneficio: '' });
  const [leadData, setLeadData] = useState({ nome: '', documento: '', whatsapp: '', email: '' });

  const perguntas = [
    {
      titulo: "Qual é o tipo de benefício que recebe atualmente do INSS?",
      opcoes: ["Aposentadoria (Idade/Tempo de Contribuição)", "Pensão por Morte", "Auxílio-Doença / Invalidez / BPC Loas"]
    },
    {
      titulo: "Há quanto tempo começou a receber este pagamento?",
      opcoes: ["Há menos de 10 anos (Dentro do prazo de revisão)", "Há mais de 10 anos", "Ainda não recebo, estou a tentar dar entrada"]
    }
  ];

  const handleOpcaoClick = (perguntaIndex: number, opcao: string) => {
    if (perguntaIndex === 0) setRespostas({ ...respostas, tipoBeneficio: opcao });
    if (perguntaIndex === 1) setRespostas({ ...respostas, tempoBeneficio: opcao });
    setStep(step + 1);
  };

  const handleSubmeterLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStep(4); // Abre o ecrã de carregamento da IA

    try {
      const resumoQuiz = `Benefício: ${respostas.tipoBeneficio} | Tempo: ${respostas.tempoBeneficio}`;
      
      // Salva o Lead marcado como RX_INSS
      await addDoc(collection(db, 'leads'), {
        cliente_nome: leadData.nome,
        cliente_documento: leadData.documento,
        cliente_whatsapp: leadData.whatsapp,
        cliente_email: leadData.email,
        resumo_fato: resumoQuiz,
        tenantSlug: tenantSlug || 'gsa-master',
        origem: 'quiz_rx_inss',
        tipo_lead: 'RX_INSS', // Filtro exato para cair na aba certa do Monitor de Leads
        status: 'EM_ANÁLISE', // Como a análise é gratuita, entra direto para a equipa avaliar
        createdAt: serverTimestamp(),
      });

      // Simula o processamento da IA por 3 segundos para gerar valor percebido
      setTimeout(() => setStep(5), 3000);

    } catch (error) {
      console.error("Erro ao submeter auditoria INSS:", error);
      alert("Ocorreu um erro ao enviar. Tente novamente.");
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-md w-full">
        
        {/* CABEÇALHO DO FUNIL */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <ClipboardCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Auditoria Digital INSS</h1>
          <p className="text-emerald-200 text-sm">Descubra se o valor do seu benefício foi calculado com erros pelo banco do governo.</p>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 relative">
          
          {/* BARRA DE PROGRESSO */}
          {step > 0 && step < 4 && (
             <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
               <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
             </div>
          )}

          <div className="p-8">
            
            {/* PASSO 0: APRESENTAÇÃO */}
            {step === 0 && (
              <div className="text-center animate-in zoom-in-95">
                <HelpCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-4">Revisão de Erros de Cálculo</h2>
                <p className="text-slate-600 text-sm mb-8">
                  Milhares de aposentadorias e pensões são pagas com valores menores devido a falhas na transição de moedas ou descarte de contribuições altas. Faça a auditoria gratuita do seu caso.
                </p>
                <button onClick={() => setStep(1)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30">
                  Iniciar Auditoria Gratuita <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* PASSOS 1 e 2: PERGUNTAS */}
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
                      className="w-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-semibold p-4 rounded-xl text-left transition-all flex items-center justify-between group"
                    >
                      {opcao}
                      <CheckCircle2 className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 3: SOLICITAÇÃO DE DADOS */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Protocolar Solicitação</h2>
                <p className="text-slate-500 text-xs text-center mb-6">Insira os seus dados oficiais para que a nossa equipa de procuradores valide o seu direito técnico.</p>
                
                <form onSubmit={handleSubmeterLead} className="space-y-4">
                  <input required value={leadData.nome} onChange={e => setLeadData({...leadData, nome: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nome Completo do Segurado" />
                  <input required value={leadData.documento} onChange={e => setLeadData({...leadData, documento: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="CPF" />
                  <input required value={leadData.whatsapp} onChange={e => setLeadData({...leadData, whatsapp: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="WhatsApp com DDD" />
                  <input required type="email" value={leadData.email} onChange={e => setLeadData({...leadData, email: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="O seu E-mail institucional" />
                  
                  <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-500/30">
                    Enviar para Auditoria <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}

            {/* PASSO 4: LOADING TÉCNICO */}
            {step === 4 && (
              <div className="text-center py-8 animate-in fade-in">
                <Search className="w-12 h-12 text-emerald-500 mx-auto mb-6 animate-spin" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Processando Auditoria...</h2>
                <p className="text-slate-500 text-sm">O nosso sistema está a verificar as teses de revisão aplicáveis ao seu perfil.</p>
              </div>
            )}

            {/* PASSO 5: TELA DE CONCLUSÃO */}
            {step === 5 && (
              <div className="text-center animate-in zoom-in-95 p-2">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Pedido Protocolado!</h2>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  Os seus dados de segurado foram encaminhados com sucesso para a nossa unidade regulamentada. A nossa equipa de procuradores vai analisar o histórico do seu benefício de forma detalhada.
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-center gap-2 text-sm text-slate-600 font-semibold mb-4">
                  <Clock className="w-5 h-5 text-amber-500" /> Prazo de Resposta: Até 72 Horas
                </div>

                <p className="text-xs text-slate-500">
                  Entraremos em contacto diretamente pelo WhatsApp fornecido para apresentar a estratégia de correção do valor.
                </p>

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                  <img src="https://seusdireitosbr.com.br/logo.png" alt="" className="h-4 opacity-50 mr-1" />
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Proteção de Dados Assegurada
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
