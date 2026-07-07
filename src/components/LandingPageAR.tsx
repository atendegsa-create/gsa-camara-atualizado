import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Scale, 
  Send, 
  ArrowRight, 
  CheckCircle2, 
  Gavel,
  Stamp,
  CreditCard,
  Zap,
  TrendingDown,
  Plus,
  Minus,
  Check,
  Activity,
  LayoutDashboard,
  BarChart3,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, loginAnonymously, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function LandingPageAR() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    tipo_documento: 'Contrato Não Cumprido'
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const userCred = await loginAnonymously();
          if (userCred) {
            currentUser = userCred.user;
          }
        }
        
        const token = currentUser ? await currentUser.getIdToken() : '';

        const res = await fetch('/api/config/master', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (e) {
        console.error("Config fetch error:", e);
      }
    };
    fetchConfig();
  }, []);

  // Calculadora de Créditos Avulsos
  const [avulsoQty, setAvulsoQty] = useState(3);
  const minAvulso = config?.min_qty_ar_avulso || 3;

  React.useEffect(() => {
    if (config?.min_qty_ar_avulso && avulsoQty < config.min_qty_ar_avulso) {
      setAvulsoQty(config.min_qty_ar_avulso);
    }
  }, [config]);

  const avulsoPrice = useMemo(() => {
    const base = config?.preco_ar_avulso || 4.97;
    if (avulsoQty < 15) return base;
    if (avulsoQty < 50) return base * 0.96; // ~4.79
    if (avulsoQty < 100) return base * 0.84; // ~4.19
    return base * 0.78; // ~3.89
  }, [avulsoQty, config]);

  // Calculadora de Assinatura Mensal
  const [mensalQty, setMensalQty] = useState(25);
  const minMensal = config?.min_qty_ar_mensal || 25;

  React.useEffect(() => {
    if (config?.min_qty_ar_mensal && mensalQty < config.min_qty_ar_mensal) {
      setMensalQty(config.min_qty_ar_mensal);
    }
  }, [config]);

  const mensalPrice = useMemo(() => {
    const base = config?.preco_ar_mensal || 4.00;
    if (mensalQty < 50) return base;
    if (mensalQty < 100) return base * 0.95; // ~3.80
    if (mensalQty < 150) return base * 0.925; // ~3.70
    if (mensalQty < 250) return base * 0.9; // ~3.60
    return base * 0.75; // ~3.00
  }, [mensalQty, config]);

  const [purchaseStep, setPurchaseStep] = useState<'initial' | 'checkout' | 'success'>('initial');
  const [selectedPlan, setSelectedPlan] = useState<'ar_avulso' | 'ar_mensal' | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handlePurchase = (plan: 'ar_avulso' | 'ar_mensal') => {
    setSelectedPlan(plan);
    setPurchaseStep('checkout');
  };

  const startCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      if (db) {
        const docRef = await addDoc(collection(db, 'leads'), {
          ...formData,
          origem: 'LP_AR_ONLINE_COMERCIAL',
          formId: 'LP_AR_ONLINE_COMERCIAL',
          mensagem: `Interesse em Notificação AR: ${formData.tipo_documento}`,
          createdAt: serverTimestamp(),
        });
        
        setSubmitted(true);
        if (selectedPlan) {
          if (formData.email) {
            localStorage.setItem('ar_online_email', formData.email);
          }
          window.location.href = `/checkout-ar?leadId=${docRef.id}&qty=${selectedPlan === 'ar_avulso' ? avulsoQty : mensalQty}&auto=true`;
        }
      } else {
        throw new Error("Firestore não inicializado");
      }
    } catch (error) {
      console.error("Erro ao capturar lead:", error);
      alert("Erro ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] font-sans text-gray-900 overflow-x-hidden selection:bg-[#5A5A40]/10 selection:text-[#5A5A40]">
      <AnimatePresence>
        {purchaseStep !== 'initial' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100"
            >
              <button 
                onClick={() => { setPurchaseStep('initial'); setPaymentData(null); }}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              {purchaseStep === 'checkout' && (
                <div className="p-10 text-center">
                  {!paymentData ? (
                    <div className="space-y-8">
                       <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-3xl flex items-center justify-center mx-auto text-[#5A5A40]">
                         <CreditCard size={40} />
                       </div>
                       <div>
                         <h3 className="text-3xl font-serif font-bold text-gray-900 mb-2">Configure seu Acesso</h3>
                         <p className="text-gray-500 font-medium">Precisamos de alguns dados para gerar seu protocolo de créditos.</p>
                       </div>
                       <div className="space-y-4">
                         <input 
                           type="text" 
                           placeholder="Seu Nome" 
                           value={formData.nome}
                           onChange={e => setFormData({...formData, nome: e.target.value})}
                           className="w-full bg-[#fcfbf9] border border-gray-200 rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                         />
                         <input 
                           type="email" 
                           placeholder="Seu E-mail" 
                           value={formData.email}
                           onChange={e => setFormData({...formData, email: e.target.value})}
                           className="w-full bg-[#fcfbf9] border border-gray-200 rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                         />
                         <input 
                           type="tel" 
                           placeholder="WhatsApp" 
                           value={formData.whatsapp}
                           onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                           className="w-full bg-[#fcfbf9] border border-gray-200 rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                         />
                       </div>
                       <button 
                         disabled={!formData.nome || !formData.email || loading}
                         onClick={() => selectedPlan && startCheckout()}
                         className="w-full py-5 bg-[#5A5A40] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#40402b] transition-all shadow-md disabled:opacity-50"
                       >
                         {loading ? 'Processando...' : 'Gerar Chave de Acesso PIX'}
                       </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
                        <Check size={32} />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-gray-900">Quase lá!</h3>
                      <p className="text-gray-500 text-sm font-medium">Realize o pagamento do PIX abaixo para ativar seus créditos instantaneamente.</p>
                      
                      <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center justify-center">
                        {paymentData?.qr_code_base64 && (
                          <img 
                            src={paymentData.qr_code_base64.startsWith('data:') ? paymentData.qr_code_base64 : `data:image/png;base64,${paymentData.qr_code_base64}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                          />
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código Copia e Cola</p>
                        <div className="flex items-center gap-2 bg-[#fcfbf9] p-2 rounded-xl border border-gray-200">
                          <input 
                            readOnly 
                            value={paymentData.qr_code}
                            className="flex-grow bg-transparent text-[10px] font-mono text-gray-500 px-3 overflow-hidden text-ellipsis"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(paymentData.qr_code);
                              alert("Código copiado!");
                            }}
                            className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {purchaseStep === 'success' && (
                <div className="p-12 text-center space-y-8">
                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={56} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-serif font-bold text-gray-900">Assinatura Ativada!</h3>
                    <p className="text-gray-500 font-medium leading-relaxed">
                      Seu protocolo <strong>{paymentData?.id || 'GSA-ONLINE-AR'}</strong> já está ativo no sistema. 
                      Você receberá as instruções de acesso no seu e-mail corporativo em instantes.
                    </p>
                  </div>
                  <div className="pt-4 flex flex-col gap-4">
                    <button 
                      onClick={() => {
                        if (formData.email) localStorage.setItem('ar_online_email', formData.email);
                        navigate('/ar-online/dashboard');
                      }}
                      className="w-full py-6 bg-[#5A5A40] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#40402b] transition-all"
                    >
                      Acessar Painel AR ONLINE
                    </button>
                    <button 
                       onClick={() => setPurchaseStep('initial')}
                       className="text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600"
                    >
                      Voltar para a Home
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 bg-white/95 backdrop-blur-xl z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A5A40]/5 p-2 rounded-xl border border-[#5A5A40]/10">
              <Scale size={24} className="text-[#5A5A40]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-xl tracking-tighter text-gray-900 leading-none uppercase">GSA Câmara</span>
              <span className="text-[9px] font-bold text-[#5A5A40] tracking-[0.2em] uppercase">Mediação & Conciliação</span>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-8 mr-10">
            {['Funcionalidades', 'Como Funciona', 'Preços'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-[#5A5A40] transition-colors">{item}</a>
            ))}
          </div>
          <a 
            href="#precos" 
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#40402b] transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            Falar com Consultor
          </a>
        </div>
      </nav>

      <section className="relative flex items-center py-24 bg-white border-b border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-3 bg-[#5A5A40]/5 border border-[#5A5A40]/10 px-5 py-2.5 rounded-full mb-10 shadow-sm">
              <ShieldCheck size={18} className="text-[#5A5A40]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5A5A40]">Validade Jurídica Superior</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif font-bold text-gray-900 leading-[1.05] mb-8 tracking-tighter">
              Aviso de Recebimento Digital com <br />
              <span className="text-[#5A5A40]">Validade Inquestionável</span>
            </h1>
            <p className="text-xl text-gray-500 mb-12 leading-relaxed max-w-xl font-medium">
              Comunicação alicerçada na MP 2.200-2/01. Rastreabilidade total, laudos periciais com geolocalização e integração nativa com o seu fluxo processual.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <a 
                href="#precos" 
                className="inline-flex items-center justify-center gap-3 bg-[#5A5A40] text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.05] active:scale-95 transition-all shadow-lg hover:bg-[#40402b] group"
              >
                Ver Planos Disponíveis
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#form" 
                className="inline-flex items-center justify-center gap-3 bg-gray-50 text-gray-600 border border-gray-200 px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-100 transition-all"
              >
                Falar com Consultor
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <div className="bg-white p-1 rounded-[40px] shadow-2xl shadow-gray-200 rotate-3 border border-gray-100">
              <div className="bg-[#fcfbf9] rounded-[38px] p-10 border border-gray-100">
                <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-6">
                  <div className="flex items-center gap-3">
                    <Stamp className="text-[#5A5A40]" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Protocolo ODR Trust</span>
                  </div>
                  <CheckCircle2 className="text-green-500" />
                </div>
                <div className="space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-2 bg-gray-200 rounded-full w-full relative overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${Math.random() * 60 + 40}%` }} 
                        transition={{ duration: 2, delay: i * 0.2 }}
                        className="absolute inset-y-0 left-0 bg-[#5A5A40]/40" 
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-10 p-4 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">HLB Oficial Sincronizado</p>
                  <p className="text-xs text-gray-900 font-mono">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="funcionalidades" className="py-24 bg-[#fcfbf9] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-serif font-bold text-gray-900 mb-6 tracking-tight">Recursos de Alta Performance</h2>
            <p className="text-gray-500 font-medium leading-relaxed">
              Desenvolvemos um ecossistema completo para que sua comunicação extrajudicial seja à prova de contestações.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: ShieldCheck, 
                title: 'Validade Jurídica (MP 2.200-2/01)', 
                desc: 'Certeza de entrega, abertura e clique com valor probatório superior ao AR físico dos Correios. Respaldo legal total.' 
              },
              { 
                icon: Stamp, 
                title: 'Laudos Periciais Oficiais', 
                desc: 'Documentos vinculados ao Horário Legal Brasileiro (HLB), contendo geolocalização, IPs e todas as interações técnicas.' 
              },
              { 
                icon: BarChart3, 
                title: 'Rastreabilidade e Relatórios', 
                desc: 'Cronologia completa. Saiba qual sistema o destinatário usou, a hora exata da abertura e quais links foram clicados.' 
              },
              { 
                icon: Activity, 
                title: 'Notificações em Tempo Real', 
                desc: 'Alertas instantâneos de sucesso no envio, recusa de servidores, leitura ou classificação como SPAM.' 
              },
              { 
                icon: LayoutDashboard, 
                title: 'Painel de Monitoramento', 
                desc: 'Central para guarda de mensagens originais, filtros de busca avançados e download instantâneo do conjunto probatório.' 
              },
              { 
                icon: Zap, 
                title: 'Sincronização Inteligente (NUP)', 
                desc: 'O status do seu AR atualiza automaticamente o andamento do processo na plataforma GSA, eliminando tarefas manuais.' 
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="group bg-white p-10 rounded-[32px] border border-gray-100 transition-all duration-500 shadow-sm hover:shadow-md"
              >
                <div className="bg-gray-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border border-gray-100 group-hover:bg-[#5A5A40] transition-colors">
                  <f.icon className="text-gray-600 group-hover:text-white transition-colors" size={26} />
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-4 tracking-tight">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-24 bg-white relative border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">O Ciclo da Segurança Extrajudicial</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-16 relative">
            <div className="hidden md:block absolute top-14 left-[15%] right-[15%] h-px bg-gray-200" />
            {[
              { title: 'Disparo Multi-Canal', icon: Send, desc: 'Envio simultâneo via WhatsApp Jurídico, E-mail e SMS com selagem digital.' },
              { title: 'Monitoramento Realtime', icon: Activity, desc: 'Acompanhamento vivo de cada interação do destinatário com o conteúdo.' },
              { title: 'Emissão de Laudo', icon: Gavel, desc: 'Geração automática do dossiê comprobatório auditável para instrução processual.' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 border border-gray-100 shadow-sm group hover:border-[#5A5A40]/30 transition-all z-10">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
                    <step.icon size={32} />
                  </div>
                </div>
                <h4 className="text-xl font-serif font-bold text-gray-900 mb-4">{step.title}</h4>
                <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="py-24 bg-[#fafafc] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4 tracking-tight">Investimento em Blindagem Jurídica</h2>
            <p className="text-gray-500 font-medium">Preços regressivos por volume. Escolha o modelo ideal para sua operação.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-stretch">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-[40px] p-10 border border-gray-100 flex flex-col shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                  <CreditCard size={32} className="text-gray-700" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compra sob Demanda</p>
                  <h3 className="text-2xl font-serif font-bold text-gray-900">AR Créditos</h3>
                </div>
              </div>

              <div className="space-y-8 flex-grow">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 ml-1">Quantidade de Notificações (Mín {minAvulso})</label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setAvulsoQty(Math.max(minAvulso, avulsoQty - 1))}
                      className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
                    >
                      <Minus size={20} />
                    </button>
                    <input 
                      type="number" 
                      value={avulsoQty}
                      onChange={(e) => setAvulsoQty(Math.max(minAvulso, parseInt(e.target.value) || minAvulso))}
                      className="flex-grow bg-[#fcfbf9] border border-gray-100 rounded-xl py-3 px-4 text-center text-2xl font-black text-gray-900 focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setAvulsoQty(Math.min(1000, avulsoQty + 1))}
                      className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#fcfbf9] rounded-2xl p-6 text-center border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Preço por AR</p>
                  <p className="text-3xl font-black text-[#5A5A40]">R$ {avulsoPrice.toFixed(2).replace(".", ",")}</p>
                </div>

                <div className="space-y-3">
                  {['Envio Multi Plataforma', 'SMS, WhatsApp, E-mail', 'Suporte Prioritário', 'Validade Jurídica GSA'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                      <div className="bg-[#5A5A40]/10 p-1 rounded-full text-[#5A5A40]">
                        <Check size={14} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-100">
                <div className="flex items-end justify-between mb-8">
                  <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest pb-1">Total do Pacote</span>
                  <div className="text-right">
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">R$ {(avulsoQty * avulsoPrice).toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handlePurchase('ar_avulso')}
                  className="w-full py-5 bg-[#5A5A40] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#40402b] transition-all"
                >
                  Comprar Créditos Agora
                </button>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-[40px] p-10 flex flex-col shadow-sm hover:shadow-lg border-2 border-[#5A5A40]/10 transition-all"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/10 p-4 rounded-2xl">
                  <Zap size={32} className="text-[#5A5A40]" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[#5A5A40] uppercase tracking-widest">Faturamento Mensal</p>
                  <h3 className="text-2xl font-serif font-bold text-gray-900">Assinatura GSA</h3>
                </div>
              </div>

              <div className="space-y-8 flex-grow">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 ml-1">Volume Mensal (Mín {minMensal})</label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setMensalQty(Math.max(minMensal, mensalQty - 5))}
                      className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
                    >
                      <Minus size={20} />
                    </button>
                    <input 
                      type="number" 
                      value={mensalQty}
                      onChange={(e) => setMensalQty(Math.max(minMensal, parseInt(e.target.value) || minMensal))}
                      className="flex-grow bg-[#fcfbf9] border border-gray-100 rounded-xl py-3 px-4 text-center text-2xl font-black text-gray-900 focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setMensalQty(Math.min(2000, mensalQty + 5))}
                      className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#fcfbf9] rounded-2xl p-6 text-center border border-gray-100">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Custo Unitário</p>
                  <p className="text-3xl font-black text-[#5A5A40]">R$ {mensalPrice.toFixed(2).replace(".", ",")}</p>
                </div>

                <div className="space-y-3">
                  {[
                    'Gestão Centralizada NUP',
                    'Acesso API ZapSign Master',
                    'Dashboard de Analytics ODR',
                    'Gerente de Contas Dedicado'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                      <div className="bg-[#5A5A40]/10 p-1 rounded-full text-[#5A5A40]">
                        <Check size={14} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-100">
                <div className="flex items-end justify-between mb-8">
                  <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest pb-1 block">Mensalidade</span>
                  <div className="text-right">
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">R$ {(mensalQty * mensalPrice).toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handlePurchase('ar_mensal')}
                  className="w-full py-5 bg-white text-[#5A5A40] border-2 border-[#5A5A40]/20 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#5A5A40]/5 transition-all"
                >
                  Ativar Assinatura
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="corporativo" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl font-serif font-bold text-gray-900 mb-6 leading-tight">Soluções Corporativas ODR</h2>
            <p className="text-lg text-gray-500 mb-10 font-medium">Fale com um consultor especialista em ODR e receba um diagnóstico gratuito para otimizar suas notificações em massa.</p>
            
            <div className="space-y-8">
              {[
                { 
                  label: 'Redução de Custos', 
                  sub: 'Economia de até 85% versus AR Cartorário tradicional.',
                  icon: TrendingDown 
                },
                { 
                  label: 'Conformidade LGPD', 
                  sub: 'Segurança absoluta de dados pessoais, sensíveis e criptografia.',
                  icon: ShieldCheck 
                },
                { 
                  label: 'Velocidade e Escala', 
                  sub: 'Protocolos de entrega em minutos, ideal para altos volumes.',
                  icon: Zap 
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="bg-[#fcfbf9] p-3 rounded-xl border border-gray-100">
                    <item.icon className="text-[#5A5A40]" size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{item.label}</h4>
                    <p className="text-sm text-gray-500 font-medium">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-[#fcfbf9] p-10 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="mb-8 text-center">
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">Diagnóstico ODR</h3>
              <p className="text-gray-500 text-sm font-medium">Análise estratégica de volume e eficiência.</p>
            </div>

            {submitted ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="text-2xl font-serif font-bold text-gray-900 mb-2">Solicitação Protocolada</h4>
                <p className="text-gray-500 text-sm">Um especialista entrará em contato em instantes.</p>
              </div>
            ) : (
              <form onSubmit={startCheckout} className="space-y-4">
                <input 
                  required
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  placeholder="Nome do Responsável"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-5 font-medium text-gray-900 focus:ring-2 focus:ring-[#5A5A40]/20 transition-all outline-none"
                />
                <input 
                  required
                  type="tel"
                  value={formData.whatsapp}
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  placeholder="WhatsApp Business"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-5 font-medium text-gray-900 focus:ring-2 focus:ring-[#5A5A40]/20 transition-all outline-none"
                />
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="E-mail Corporativo"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-5 font-medium text-gray-900 focus:ring-2 focus:ring-[#5A5A40]/20 transition-all outline-none"
                />
                <select 
                  value={formData.tipo_documento}
                  onChange={e => setFormData({...formData, tipo_documento: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-5 font-medium text-gray-900 focus:ring-2 focus:ring-[#5A5A40]/20 transition-all outline-none"
                >
                  <option>Até 100 notificações/mês</option>
                  <option>De 101 a 500 notificações/mês</option>
                  <option>Superior a 500 notificações/mês</option>
                  <option>Projetos de Integração API</option>
                </select>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#40402b] transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? 'Processando...' : selectedPlan ? 'Ir para o Pagamento' : 'Solicitar Contato'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <footer className="bg-gray-900 py-12 text-center text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Scale size={20} className="text-[#5A5A40]" />
          <span className="font-serif font-black text-lg text-white">GSA</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} GSA Mediação & Conciliação. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
