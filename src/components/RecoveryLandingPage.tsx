import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  Scale, 
  Clock, 
  ChevronRight, 
  Lock, 
  ArrowRight,
  Sparkles,
  Smartphone,
  DollarSign,
  X,
  Loader2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

const FADE_DOWN_ANIMATION_VARIANTS: any = {
  hidden: { opacity: 0, y: -20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

const FADE_UP_ANIMATION_VARIANTS: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

export default function RecoveryLandingPage() {
  const { tenant } = useAuth();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadForm, setLeadForm] = useState({
    razao_social: '',
    cnpj: '',
    responsavel: '',
    telefone: '',
    email: ''
  });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    try {
      await addDoc(collection(db, 'recovery_leads_credores'), {
        ...leadForm,
        tenantId: tenant?.id || 'master',
        status: 'NOVO',
        criado_em: new Date().toISOString()
      });
      setLeadSuccess(true);
      setTimeout(() => {
        setShowLeadForm(false);
        setLeadSuccess(false);
        setLeadForm({ razao_social: '', cnpj: '', responsavel: '', telefone: '', email: '' });
      }, 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar cadastro. Tente novamente.');
    } finally {
      setLeadLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-500/30">
      {/* HEADER NAVBAR */}
      <header className="absolute top-0 w-full z-50 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="bg-emerald-500 rounded-lg p-2">
              <Building2 className="text-zinc-950 w-6 h-6" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">GSA Recovery</span>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300"
          >
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#diferenciais" className="hover:text-white transition-colors">Diferenciais</a>
            <a href="#portal" className="border border-white/20 hover:bg-white/10 px-5 py-2.5 rounded-full text-white transition-all">
              Acesso Credor
            </a>
          </motion.div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-zinc-950 text-white pt-32 pb-24 lg:pt-48 lg:pb-32">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-zinc-800/80 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1 } },
            }}
          >
            <motion.div variants={FADE_DOWN_ANIMATION_VARIANTS} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-4 py-2 text-sm mb-8 bg-emerald-500/10 backdrop-blur-md text-emerald-300">
              <Sparkles className="w-4 h-4" />
              <span>Plataforma Inteligente de Recuperação B2B</span>
            </motion.div>

            <motion.h1 variants={FADE_DOWN_ANIMATION_VARIANTS} className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-400">
              Recupere créditos sem judicializar.
            </motion.h1>

            <motion.p variants={FADE_DOWN_ANIMATION_VARIANTS} className="mt-6 text-xl text-zinc-400 leading-relaxed max-w-2xl font-light">
              A <strong className="text-white font-semibold">GSA Recovery</strong> automatiza negociações extrajudiciais online. Sem acordo? A <strong className="text-white font-semibold">GSA Câmara</strong> conduz a mediação digital com profissionais especializados.
            </motion.p>

            <motion.div variants={FADE_DOWN_ANIMATION_VARIANTS} className="mt-10 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowLeadForm(true)}
                className="group relative bg-emerald-500 text-zinc-950 hover:bg-emerald-400 px-8 py-4 rounded-2xl text-lg font-bold shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 overflow-hidden w-full sm:w-auto"
              >
                <span className="relative z-10">CADASTRE SUA EMPRESA AGORA</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </motion.div>

            <motion.div variants={FADE_DOWN_ANIMATION_VARIANTS} className="mt-16 grid grid-cols-3 gap-6 pt-8 border-t border-zinc-800/50">
              <div>
                <div className="text-3xl font-black text-white">100%</div>
                <div className="text-zinc-500 text-sm mt-1 font-medium tracking-wide uppercase">Digital</div>
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-400">24h</div>
                <div className="text-zinc-500 text-sm mt-1 font-medium tracking-wide uppercase">Automação</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">PIX</div>
                <div className="text-zinc-500 text-sm mt-1 font-medium tracking-wide uppercase">Integrado</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative perspective-1000"
          >
            {/* Glow Behind the Mockup */}
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] z-0 rounded-full" />

            {/* Platform Mockup Card */}
            <div className="relative z-10 bg-zinc-900/80 backdrop-blur-2xl border border-zinc-700/50 rounded-[2rem] p-8 shadow-2xl overflow-hidden ring-1 ring-white/10">
               {/* Reflection effect */}
              <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent opacity-20 pointer-events-none rounded-[2rem]" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Scale className="text-zinc-950 w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Negociação Digital</div>
                    <div className="text-xl font-bold tracking-tight">Portal GSA</div>
                  </div>
                </div>

                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACORDO ATIVO
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-950/50 rounded-2xl p-5 border border-zinc-800">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Credor B2B</div>
                  <div className="text-lg font-bold mt-1 text-zinc-200">EMPRESA TECNOLOGIA LTDA</div>
                </div>

                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-950/50 rounded-2xl p-6 border border-zinc-700/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <DollarSign className="w-20 h-20" />
                  </div>
                  <div className="text-zinc-400 text-sm font-medium">Valor Atualizado Dívida</div>
                  <div className="text-4xl font-black mt-2 tracking-tight text-white">R$ 4.280<span className="text-zinc-500 text-2xl">,00</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 rounded-2xl p-5 border border-zinc-800">
                    <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Sinal PIX</div>
                    <div className="text-2xl font-bold mt-1 text-emerald-400">R$ 480</div>
                  </div>

                  <div className="bg-zinc-950/50 rounded-2xl p-5 border border-zinc-800">
                    <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Parcelamento</div>
                    <div className="text-2xl font-bold mt-1 text-zinc-200">12x</div>
                  </div>
                </div>

                <button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl py-4 font-black text-lg transition-all shadow-lg flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  ACEITAR & PAGAR SINAL
                </button>

                <div className="text-center mt-3">
                  <span className="text-zinc-500 text-sm hover:text-zinc-300 cursor-pointer transition-colors border-b border-zinc-700/50 pb-0.5">
                    Solicitar Mediação Arbitral Online →
                  </span>
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-6 -top-6 bg-zinc-900 border border-zinc-700 p-4 rounded-2xl shadow-xl flex items-center gap-3"
            >
               <div className="bg-blue-500/20 p-2 rounded-lg">
                 <ShieldCheck className="w-6 h-6 text-blue-400" />
               </div>
               <div>
                  <div className="text-xs text-zinc-400 font-medium">Validação Legal</div>
                  <div className="text-sm font-bold text-white">Ata Extrajudicial</div>
               </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="como-funciona" className="py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-emerald-600 font-bold tracking-widest uppercase text-sm mb-4 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-emerald-600/30" />
              Como a Recuperação Funciona
              <span className="w-8 h-px bg-emerald-600/30" />
            </h2>
            <h3 className="text-4xl lg:text-5xl font-black mt-4 leading-tight tracking-tight text-zinc-900">
              Transforme <span className="text-zinc-400">carteira inadimplente</span> em caixa líquido.
            </h3>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mt-20">
            {[
              {
                step: '01',
                title: 'Importação B2B',
                desc: 'Integre via API ou importe planilhas da sua carteira de devedores. A Plataforma GSA higieniza e classifica os dados automaticamente.',
                icon: FileText
              },
              {
                step: '02',
                title: 'Régua de Negociação',
                desc: 'Robôs iniciam abordagens multicanal (WhatsApp, E-mail, SMS) com links personalizados para o devedor negociar 24/7 no Portal.',
                icon: Smartphone
              },
              {
                step: '03',
                title: 'Mediação Especializada',
                desc: 'Caso não haja aceite digital, acionamos a GSA Câmara para conduzir sessões de mediação por videoconferência com validade legal.',
                icon: Scale
              }
            ].map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-zinc-50 rounded-[2rem] p-10 border border-zinc-200/60 hover:shadow-xl hover:border-emerald-500/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 text-[120px] font-black text-zinc-100 -mt-10 -mr-4 group-hover:text-emerald-50 transition-colors pointer-events-none select-none">
                  {item.step}
                </div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-lg group-hover:bg-emerald-500 transition-colors mb-8">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-2xl font-bold text-zinc-900">{item.title}</h4>
                  <p className="text-zinc-600 mt-4 leading-relaxed text-lg">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECÇÃO DE PLANOS E PREÇOS (GSA RECOVERY B2B) */}
      <section className="py-24 bg-zinc-950 text-white relative border-t border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950"></div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Investimento e Taxas</h2>
            <h3 className="text-4xl md:text-5xl font-black mt-4 leading-tight">Planos escaláveis para o tamanho da sua carteira.</h3>
            <p className="mt-6 text-lg text-zinc-400">Sem surpresas. Pague apenas o disparo da notificação e a taxa de êxito no sucesso da recuperação.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            
            {/* PLANO START */}
            <div className="bg-zinc-900 border border-white/10 rounded-[2rem] p-8 lg:p-10 flex flex-col hover:border-white/20 transition-all">
              <div className="mb-6">
                <span className="bg-white/10 text-zinc-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Start</span>
                <h4 className="text-3xl font-black mt-4">Gratuito</h4>
                <p className="text-zinc-500 text-sm mt-2">Sem mensalidade. Ideal para pequenas empresas, lojas e clínicas.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5 space-y-2">
                <div className="flex justify-between items-center"><span className="text-zinc-400 text-sm">Taxa de Notificação</span><span className="font-bold text-amber-400">R$ 0,00</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-400 text-sm">Taxa de Êxito</span><span className="font-bold text-white">Percentual fixo</span></div>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-sm text-zinc-300 font-medium">
                <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Painel do Credor</li>
                <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Notificações Omnichannel</li>
                <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Acordos Digitais</li>
                <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Disparos via WhatsApp</li>
                <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Relatórios Básicos</li>
              </ul>
              <button className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-bold py-4 rounded-xl transition-all">Criar Conta Grátis</button>
            </div>

            {/* PLANO BUSINESS (DESTAQUE) */}
            <div className="bg-gradient-to-b from-indigo-900 to-zinc-900 border border-indigo-500/30 rounded-[2rem] p-8 lg:p-10 flex flex-col relative transform lg:-translate-y-4 shadow-2xl shadow-indigo-900/50">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">Mais Escolhido</div>
              <div className="mb-6">
                <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Business</span>
                <div className="flex items-baseline gap-2 mt-4"><h4 className="text-4xl font-black">R$ 497</h4><span className="text-zinc-400">/mês</span></div>
                <p className="text-zinc-400 text-sm mt-2">Ideal para imobiliárias, escolas, médias empresas e financeiras locais.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5 space-y-2">
                <div className="flex justify-between items-center"><span className="text-zinc-300 text-sm">Taxa de Notificação</span><span className="font-bold text-amber-400">R$ 0,00</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-300 text-sm">Taxa de Êxito</span><span className="font-bold text-white">Percentual reduzido</span></div>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-sm text-zinc-200 font-medium">
                <li className="flex items-center gap-3"><span className="text-indigo-400">✓</span> Tudo do plano Start</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">✓</span> Automações Avançadas</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">✓</span> Acesso Multiusuário</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">✓</span> Mediação Online Incluída</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">✓</span> Ligação de Cobrança</li>
                <li className="flex items-center gap-3"><span className="text-indigo-400">✓</span> Painel Financeiro Avançado</li>
              </ul>
              <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25">Assinar Business</button>
            </div>

            {/* PLANO ENTERPRISE */}
            <div className="bg-zinc-900 border border-white/10 rounded-[2rem] p-8 lg:p-10 flex flex-col hover:border-white/20 transition-all">
              <div className="mb-6">
                <span className="bg-white/10 text-zinc-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Enterprise</span>
                <h4 className="text-3xl font-black mt-4">Sob Medida</h4>
                <p className="text-zinc-500 text-sm mt-2">Ideal para grandes carteiras, fundos, assessorias e franquias.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5 text-center">
                <span className="text-zinc-300 text-sm font-semibold">Volume sob Consulta</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-sm text-zinc-300 font-medium">
                <li className="flex items-center gap-3"><span className="text-zinc-500">✓</span> Tudo do plano Business</li>
                <li className="flex items-center gap-3"><span className="text-zinc-500">✓</span> Sistema White-Label</li>
                <li className="flex items-center gap-3"><span className="text-zinc-500">✓</span> Domínio Próprio (Customizado)</li>
                <li className="flex items-center gap-3"><span className="text-zinc-500">✓</span> Gestão Multiunidade</li>
                <li className="flex items-center gap-3"><span className="text-zinc-500">✓</span> Suporte Dedicado 24/7</li>
              </ul>
              <button className="w-full bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold py-4 rounded-xl transition-all">Solicitar Orçamento</button>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES / DIFFERENTIALS */}
      <section id="diferenciais" className="py-24 lg:py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-emerald-600 font-bold tracking-widest uppercase text-sm mb-4">
              Diferenciais Inovadores
            </h2>
            <h3 className="text-4xl lg:text-5xl font-black mt-4 leading-tight tracking-tight text-zinc-900">
              Muito além de um call center de cobrança.
            </h3>
            <p className="text-lg text-zinc-600 mt-6 leading-relaxed">
              Combinamos tecnologia de pagamentos, automação inteligente e o respaldo jurídico da Mediação e Arbitragem para blindar sua recuperação de crédito.
            </p>
            
            <div className="space-y-4 mt-10">
              {[
                { icon: Lock, text: 'Assinaturas eletrônicas com validade jurídica' },
                { icon: BarChart3, text: 'Dashboard em tempo real das carteiras' },
                { icon: Zap, text: 'Baixa de pagamentos PIX/Boleto automática' },
                { icon: CheckCircle2, text: 'Atas de Acordo geradas por IA Jurídica' },
                { icon: Clock, text: 'Redução do tempo médio de recebimento' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4 group cursor-default">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 text-emerald-600 flex items-center justify-center font-bold shadow-sm group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-lg font-semibold text-zinc-800 group-hover:text-zinc-950 transition-colors">{item.text}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-950 text-white rounded-[2.5rem] p-10 lg:p-12 shadow-2xl relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8 pb-8 border-b border-zinc-800">
                <div className="text-zinc-400 font-medium tracking-wide uppercase text-sm">
                  Business Intelligence
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                </div>
              </div>

              <h4 className="text-3xl lg:text-4xl font-black leading-tight">
                Controle o fluxo operacional com precisão.
              </h4>
              
              <div className="grid grid-cols-2 gap-4 lg:gap-6 mt-10">
                <div className="bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                  <div className="text-zinc-400 text-sm font-medium mb-2">Acordos Ativos</div>
                  <div className="text-3xl lg:text-4xl font-black text-white">842</div>
                  <div className="text-emerald-400 text-xs font-bold mt-2 bg-emerald-500/10 inline-block px-2 py-1 rounded-md mb-0">+12% vs mês anterior</div>
                </div>
                
                <div className="bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                  <div className="text-zinc-400 text-sm font-medium mb-2">Montante Recuperado</div>
                  <div className="text-3xl lg:text-4xl font-black text-emerald-400">R$ 2.1M</div>
                  <div className="text-zinc-500 text-xs font-semibold mt-2">Liquidação D+1</div>
                </div>
                
                <div className="bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                  <div className="text-zinc-400 text-sm font-medium mb-2">Taxa de Sucesso</div>
                  <div className="text-3xl lg:text-4xl font-black text-white">68%</div>
                  <div className="text-zinc-500 text-xs font-semibold mt-2">Na fase digital</div>
                </div>

                <div className="bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                  <div className="text-zinc-400 text-sm font-medium mb-2">Sessões Virtuais</div>
                  <div className="text-3xl lg:text-4xl font-black text-white">124</div>
                  <div className="text-zinc-500 text-xs font-semibold mt-2">Realizadas por Meet</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
         {/* Background gradient sphere */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-50 rounded-full blur-[100px] -z-10" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-6 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-emerald-600 mb-8 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Modernize seu departamento de cobrança
          </div>
          
          <h2 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight text-zinc-950">
            Pronto para impulsionar suas <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">recuperações?</span>
          </h2>
          
          <p className="text-xl text-zinc-600 mt-8 leading-relaxed max-w-2xl mx-auto">
            Automatize réguas de cobrança, ofereça portais self-service e acione a Câmara de Mediação com um único clique.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => setShowLeadForm(true)}
              className="bg-zinc-950 text-white hover:bg-zinc-800 px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              CADASTRE SUA EMPRESA AGORA
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-12 border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 rounded-lg p-2">
                <Building2 className="text-zinc-950 w-6 h-6" />
              </div>
              <div>
                <div className="text-white text-xl font-black tracking-tight">GSA Recovery</div>
                <div className="text-xs font-medium uppercase tracking-widest text-emerald-500 mt-1">Câmara Extrajudicial</div>
              </div>
            </div>
            
            <div className="text-sm text-center lg:text-right max-w-lg leading-relaxed text-zinc-500">
              Plataforma de negociações e mediações extrajudiciais privadas realizadas de forma digital, amparada pela Lei da Mediação e Arbitragem.
            </div>
          </div>
          
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-zinc-600">
            <div>© {new Date().getFullYear()} GSA Recovery Institucional. Todos os direitos reservados.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-zinc-300 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL CADASTRO EMPRESA */}
      <AnimatePresence>
        {showLeadForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-emerald-600 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Cadastre sua Empresa</h3>
                  <p className="text-emerald-100 text-sm mt-1">Nossa equipe analisará seu cadastro em breve.</p>
                </div>
                <button onClick={() => setShowLeadForm(false)} className="text-emerald-200 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {leadSuccess ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-zinc-900 mb-2">Cadastro Enviado!</h4>
                    <p className="text-zinc-600">Agradecemos o interesse. Entraremos em contato em breve para liberar seu acesso.</p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Razão Social</label>
                      <input 
                        required
                        type="text" 
                        className="w-full border-zinc-300 rounded-xl px-4 py-3 bg-zinc-50 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        placeholder="Nome da sua empresa"
                        value={leadForm.razao_social}
                        onChange={e => setLeadForm({...leadForm, razao_social: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">CNPJ</label>
                        <input 
                          required
                          type="text" 
                          className="w-full border-zinc-300 rounded-xl px-4 py-3 bg-zinc-50 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          placeholder="00.000.000/0001-00"
                          value={leadForm.cnpj}
                          onChange={e => setLeadForm({...leadForm, cnpj: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Telefone / WhatsApp</label>
                        <input 
                          required
                          type="text" 
                          className="w-full border-zinc-300 rounded-xl px-4 py-3 bg-zinc-50 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          placeholder="(00) 00000-0000"
                          value={leadForm.telefone}
                          onChange={e => setLeadForm({...leadForm, telefone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Nome do Responsável</label>
                      <input 
                        required
                        type="text" 
                        className="w-full border-zinc-300 rounded-xl px-4 py-3 bg-zinc-50 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        placeholder="Seu nome"
                        value={leadForm.responsavel}
                        onChange={e => setLeadForm({...leadForm, responsavel: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">E-mail Comercial</label>
                      <input 
                        required
                        type="email" 
                        className="w-full border-zinc-300 rounded-xl px-4 py-3 bg-zinc-50 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        placeholder="contato@empresa.com.br"
                        value={leadForm.email}
                        onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={leadLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl mt-6 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                    >
                      {leadLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ENVIAR CADASTRO'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
