import React, { useState, useRef } from 'react';
import { 
  Scale, 
  Zap, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Users, 
  ChevronRight, 
  ArrowRight, 
  Calculator, 
  BrainCircuit, 
  Globe, 
  BarChart3,
  MessageSquare,
  Smartphone,
  Layout,
  Mail,
  User,
  Phone,
  Briefcase,
  Send,
  Instagram,
  Linkedin,
  Facebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PricingSection } from './PricingSection';

export default function PartnerLandingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    possueCNPJ: '',
    experienciaMercado: '',
    regiaoAtuacao: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleProfileSelect = (p: string) => {
    setProfile(p);
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'partner_leads'), {
        ...formData,
        perfil: profile,
        createdAt: serverTimestamp(),
        origem: 'landing_parceiros'
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      alert("Erro ao enviar seus dados. Tente novamente via WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulationData = {
    UNIDADE: { royalty: 20, affiliate: 10, unit: 70 },
    ADVOGADO: { royalty: 20, affiliate: 0, lawyer: 80 },
    CONSULTOR: { royalty: 20, commission: 20, unit: 60 }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* 0. HEADER */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Scale size={24} className="text-white" />
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight">GSA <span className="text-blue-500">Câmara</span></span>
          </div>
          <button 
            onClick={scrollToForm}
            className="hidden md:block bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-6 py-2 rounded-full text-sm font-bold transition-all"
          >
            Seja um Parceiro
          </button>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center bg-[#0a0f1d] overflow-hidden">
        {/* Background Gradients/Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.2),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8">
              <Zap size={14} className="fill-current" />
              Projeto de Expansão Nacional 2026
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-tight mb-8">
              O Judiciário Brasileiro está travado. 
              <span className="block text-blue-500">Nós criamos a chave.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 leading-relaxed max-w-2xl mb-12 font-medium">
              Lucre resolvendo conflitos em até <span className="text-white font-bold">72 horas</span> — sem processos judiciais e sem as barreiras do sistema comum.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={scrollToForm}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 group"
              >
                Quero Conhecer o Projeto
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>
              <div className="flex flex-col justify-center">
                <span className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Presença Nacional</span>
                <div className="flex -space-x-3">
                  {[
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80"
                  ].map((url, i) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Avatar ${i}`}
                      className="w-10 h-10 rounded-full border-2 border-[#0a0f1d] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-[#0a0f1d] bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">+120</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating element decorative */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 bg-blue-500/10 blur-[120px] rounded-full hidden lg:block" />
      </section>

      {/* 2. OPORTUNIDADE DE MERCADO */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-serif font-bold text-slate-900 leading-tight">
                O Mercado Bilionário da <span className="text-blue-600">Justiça Extrajudicial</span>
              </h2>
              <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                <p>
                  Existem mais de <span className="font-bold text-slate-900">80 milhões de processos</span> parados no Brasil. O tempo médio de espera por uma sentença ultrapassa os 5 anos.
                </p>
                <p>
                  A GSA Câmara quebrou esse padrão. Utilizando a Lei de Mediação (Lei nº 13.140/15), resolvemos litígios civis, bancários e trabalhistas de forma 100% amigável e com <span className="font-bold text-slate-900 underline decoration-blue-500 decoration-4">força de título executivo</span>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-6">
                <div>
                  <div className="text-4xl font-black text-slate-900 mb-1">80M+</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processos Travados</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-blue-600 mb-1">72hs</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tempo de Resolução</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/5 rounded-3xl -rotate-2" />
              <div className="relative bg-[#0a0f1d] border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Scale size={24} />
                  </div>
                  <div>
                    <div className="text-white font-bold">GSA Câmara Master</div>
                    <div className="text-blue-400 text-xs font-medium tracking-widest uppercase">Protocolo Ativado</div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-4 bg-white/5 rounded-full w-full overflow-hidden relative">
                      <motion.div 
                        initial={{ x: '-100%' }}
                        whileInView={{ x: '0%' }}
                        transition={{ duration: 0.8, delay: i * 0.2 }}
                        className="absolute inset-0 bg-blue-500/40"
                        style={{ width: `${30 + i * 20}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex justify-between items-end">
                  <div className="text-[10px] text-slate-500 uppercase tracking-tighter font-black">Total Transacionado</div>
                  <div className="text-2xl font-mono text-white font-bold">R$ 14.850.000,00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OS 4 CAMINHOS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">Escolha seu Caminho de Parceria</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">Modelos escalonáveis para profissionais do direito, gestores e investidores.</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* PERFIL 1: UNIDADES */}
          <motion.div whileHover={{ y: -8 }} className="bg-blue-600 p-8 rounded-3xl shadow-xl border border-blue-500 flex flex-col group cursor-pointer relative overflow-hidden" onClick={scrollToForm}>
            <div className="absolute top-0 right-0 p-4">
               <span className="bg-amber-400 text-blue-900 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">Alto Potencial</span>
            </div>
            <div className="text-blue-600 mb-6 bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-4 tracking-tight">Unidades Credenciadas (Franquias)</h3>
            <div className="text-sm text-blue-100 leading-relaxed mb-6 flex-1">
              Torne-se dono da sua própria Câmara de Mediação Digital. Seja a <strong className="text-white">referência judicial na sua região</strong> e fature <strong className="text-amber-400">até 70%</strong> sobre cada acordo.
              <br/><br/>
              <span className="font-bold text-white">Vantagens Exclusivas:</span>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Domínio White-Label (sua marca)</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Sem infraestrutura física necessária</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Lucro direto pelo Split Asaas</li>
              </ul>
            </div>
            <div className="pt-6 border-t border-blue-500 flex items-center justify-between text-white font-bold text-sm">
              Quero ser um Credenciado <ChevronRight size={16} />
            </div>
          </motion.div>

          {/* PERFIL 2: ADVOGADOS */}
          <motion.div whileHover={{ y: -8 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col group cursor-pointer" onClick={scrollToForm}>
            <div className="text-indigo-600 mb-6 bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Scale size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Advogados e Mediadores</h3>
            <div className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">
              Profissionais que possuem carteira de clientes ou desejam receber demandas pré-auditoradas pelo sistema.
              <br/><br/>
              <span className="font-bold text-slate-700">Como funciona:</span> Use nosso motor de IA para gerar minutas e notificações em segundos. Economize 90% do tempo.
            </div>
            <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-indigo-600 font-bold text-sm">
              Saiba Mais <ChevronRight size={16} />
            </div>
          </motion.div>

          {/* PERFIL 3: CONSULTORES */}
          <motion.div whileHover={{ y: -8 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col group cursor-pointer" onClick={scrollToForm}>
            <div className="text-amber-600 mb-6 bg-amber-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Target size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Consultores Comerciais</h3>
            <div className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">
              Vendedores profissionais, correspondentes bancários ou gestores locais. 
              <br/><br/>
              <span className="font-bold text-slate-700">Como funciona:</span> Atuação direta na prospecção. Utilize nossa esteira de captação automatizada.
            </div>
            <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-amber-600 font-bold text-sm">
              Saiba Mais <ChevronRight size={16} />
            </div>
          </motion.div>

          {/* PERFIL 4: AFILIADOS */}
          <motion.div whileHover={{ y: -8 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col group cursor-pointer" onClick={scrollToForm}>
            <div className="text-emerald-600 mb-6 bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Smartphone size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Afiliados Digitais</h3>
            <div className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">
              Gestores de tráfego, influenciadores e infoprodutores que desejam rentabilizar audiência.
              <br/><br/>
              <span className="font-bold text-slate-700">Como funciona:</span> Links parametrizados exclusivos. Comissão recorrente direta na sua conta Asaas.
            </div>
            <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-emerald-600 font-bold text-sm">
              Saiba Mais <ChevronRight size={16} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* PLANOS / PRICING SECTION */}
      <PricingSection />

      {/* 4. ENGENHARIA FINANCEIRA EM TEMPO REAL */}
      <section className="py-24 bg-[#0a0f1d] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-5xl font-serif font-bold mb-6 italic text-blue-500">Engenharia de Ganhos.</h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              O grande diferencial da GSA Câmara é o nosso <span className="text-white font-bold">Motor de Split de Pagamentos Automatizado (Asaas)</span>. 
              Elimine burocracia contábil e riscos de bitributação.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <Calculator className="text-blue-500" />
                Simulacão: Recebimento de R$ 1.000,00
              </h3>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">20%</div>
                    <div>
                      <div className="font-bold text-sm">Taxa de Royalty (Master)</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Software & Manutenção</div>
                    </div>
                  </div>
                  <div className="text-2xl font-mono text-blue-400 font-bold sm:text-right pl-16 sm:pl-0">R$ 200,00</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-blue-500/20 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/40 flex items-center justify-center text-white font-bold shrink-0">10%</div>
                    <div>
                      <div className="font-bold text-sm">Comissão Direta (Afiliado/Consultor)</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Pagamento Instantâneo</div>
                    </div>
                  </div>
                  <div className="text-2xl font-mono text-white font-bold sm:text-right pl-16 sm:pl-0">R$ 100,00</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-600/20 group relative overflow-hidden gap-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-blue-600 font-black shrink-0">70%</div>
                    <div>
                      <div className="font-black uppercase tracking-tight text-lg leading-tight">Lucro Líquido<br />da Unidade</div>
                      <div className="text-[10px] text-blue-100 uppercase tracking-widest font-bold mt-1">Disponível em 24h</div>
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono text-white font-black relative z-10 sm:text-right pl-18 sm:pl-0">R$ 700,00</div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
                  * Nota fiscal emitida por cada parte exclusivamente sobre o valor recebido no split.
                </p>
              </div>
            </div>

            <div className="space-y-12">
               <div className="flex gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-500 shrink-0">
                    <ShieldCheck size={32} />
                 </div>
                 <div>
                   <h4 className="text-xl font-bold mb-2">Segurança Fiscal Total</h4>
                   <p className="text-slate-400">O dinheiro nunca passa pela conta da Master para depois ir à unidade. O banco divide no ato da transação, evitando bitributação ilegal.</p>
                 </div>
               </div>

               <div className="flex gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-500 shrink-0">
                    <BrainCircuit size={32} />
                 </div>
                 <div>
                   <h4 className="text-xl font-bold mb-2">IA Gemini Integrada</h4>
                   <p className="text-slate-400">Todo o backend é alimentado pelo Google Gemini para minerar abusividades em contratos bancários e gerar propostas irrecusáveis.</p>
                 </div>
               </div>

               <div className="flex gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Globe size={32} />
                 </div>
                 <div>
                   <h4 className="text-xl font-bold mb-2">Infraestrutura Multi-Tenant</h4>
                   <p className="text-slate-400">Em 5 minutos sua unidade está no ar com domínio personalizado e dashboard exclusivo. Sem precisar de programadores ou servidores.</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DEPOIMENTOS DE SUCESSO */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">O Sucesso de quem já é <span className="text-blue-600">GSA</span></h2>
            <p className="text-slate-500 text-lg">Parceiros reais, resultados práticos. Veja como a nossa tecnologia está transformando o mercado jurídico nacional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Ricardo Menezes",
                role: "Unidade Serra Gaúcha",
                image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&q=80",
                content: "Escalar meu escritório era um desafio logístico até conhecer a GSA. Em 48h minha unidade estava no ar com minha marca. No primeiro mês, resolvemos 15 casos complexos.",
                metric: "15 acordos em 30 dias",
                styles: {
                  bg: "bg-blue-50",
                  bgBlur: "bg-blue-500/5",
                  text: "text-blue-600"
                }
              },
              {
                name: "Dra. Fabiana Luz",
                role: "Advogada PRO",
                image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&q=80",
                content: "O motor de IA Gemini mudou meu jogo. O que eu levava uma semana para auditar manualmente, agora faço em menos de uma hora com precisão cirúrgica. É outra categoria de trabalho.",
                metric: "90% menos tempo/auditoria",
                styles: {
                  bg: "bg-indigo-50",
                  bgBlur: "bg-indigo-500/5",
                  text: "text-indigo-600"
                }
              },
              {
                name: "Marcos Silva",
                role: "Consultor de Vendas B2B",
                image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&q=80",
                content: "O sistema de split automatizado é o que dá segurança para indicar clientes. Recebo minha comissão direto na conta Asaas sem precisar emitir cobrança manual. Transparência total.",
                metric: "Recebimento em 24h",
                styles: {
                  bg: "bg-emerald-50",
                  bgBlur: "bg-emerald-500/5",
                  text: "text-emerald-600"
                }
              }
            ].map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 ${item.styles.bgBlur} blur-2xl rounded-full`} />
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center`}>
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{item.role}</div>
                  </div>
                </div>
                <div className="flex-1 italic text-slate-600 mb-8 leading-relaxed">
                  "{item.content}"
                </div>
                <div className={`pt-6 border-t border-slate-50 flex items-center gap-2 ${item.styles.text}`}>
                  <TrendingUp size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">{item.metric}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FORMULÁRIO DE CADASTRO */}
      <section ref={formRef} className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 blur-[100px] rounded-full opacity-50" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 blur-[100px] rounded-full opacity-50" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Pronto para dar o próximo passo?</h2>
            <p className="text-slate-500 max-w-lg mx-auto font-medium">Preencha o formulário abaixo para iniciarmos seu processo de credenciamento.</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-4 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center px-10 py-6 mb-8">
               {[1,2,3].map(step => (
                 <div key={step} className="flex flex-col items-center gap-2">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-400 text-sm'}`}>
                      {step}
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep >= step ? 'text-blue-600' : 'text-slate-300'}`}>
                      {step === 1 ? 'Perfil' : step === 2 ? 'Dados' : 'Capacidade'}
                   </span>
                 </div>
               ))}
               <div className="absolute left-1/2 -ml-32 top-11 w-64 h-[2px] bg-slate-200 -z-10 hidden md:block" />
            </div>

            <div className="flex-1 px-4 md:px-8 pb-10">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/30">
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Proposta Enviada com Sucesso!</h3>
                    <p className="text-slate-500 max-w-sm mb-10 leading-relaxed font-medium">
                      Nossa equipe de expansão analisará seu perfil e entrará em contato em até 24 horas via WhatsApp.
                    </p>
                    <button 
                      onClick={() => window.location.href = `https://wa.me/5554996217400?text=Olá, acabei de enviar minha proposta para parceiro gsa no perfil ${profile}.`}
                      className="px-10 py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center gap-3 hover:shadow-xl transition-all"
                    >
                      Agilizar via WhatsApp
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {currentStep === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 pt-6"
                      >
                        <h3 className="text-xl font-bold text-center mb-8">Qual o seu Perfil Profissional?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                           {[
                             { id: 'unidade', label: 'Quero abrir uma Unidade', icon: Building2 },
                             { id: 'advogado', label: 'Sou Advogado/Mediador', icon: Scale },
                             { id: 'consultor', label: 'Consultoria e Vendas', icon: Target },
                             { id: 'afiliado', label: 'Afiliado Digital', icon: Smartphone }
                           ].map(item => (
                             <button 
                               key={item.id}
                               onClick={() => handleProfileSelect(item.label)}
                               className="flex items-center gap-3 md:gap-5 p-4 md:p-6 bg-white border-2 border-transparent hover:border-blue-600 rounded-2xl md:rounded-3xl text-left transition-all group hover:shadow-xl shadow-sm"
                             >
                               <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                 <item.icon size={20} className="md:w-6 md:h-6" />
                               </div>
                               <span className="font-bold text-slate-800 text-sm md:text-base leading-tight md:leading-normal">{item.label}</span>
                             </button>
                           ))}
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 2 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 pt-6"
                      >
                         <h3 className="text-xl font-bold text-center mb-8">Conte-nos um pouco sobre você</h3>
                         <div className="space-y-4">
                            <div className="relative">
                               <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                               <input 
                                 type="text" 
                                 placeholder="Seu Nome Completo"
                                 className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white border border-slate-100 focus:border-blue-600 outline-none transition-all font-medium"
                                 value={formData.nome}
                                 onChange={e => setFormData({...formData, nome: e.target.value})}
                               />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                <input 
                                  type="email" 
                                  placeholder="E-mail Corporativo"
                                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white border border-slate-100 focus:border-blue-600 outline-none transition-all font-medium"
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                              </div>
                              <div className="relative">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                <input 
                                  type="text" 
                                  placeholder="WhatsApp"
                                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white border border-slate-100 focus:border-blue-600 outline-none transition-all font-medium"
                                  value={formData.whatsapp}
                                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                                />
                              </div>
                            </div>
                         </div>
                         <div className="pt-8 flex gap-4">
                            <button onClick={() => setCurrentStep(1)} className="flex-1 py-5 rounded-2xl bg-slate-200 text-slate-500 font-bold">Voltar</button>
                            <button 
                              onClick={() => setCurrentStep(3)} 
                              disabled={!formData.nome || !formData.email || !formData.whatsapp} 
                              className="flex-1 py-5 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-50 shadow-xl shadow-blue-500/20"
                            >Próximo Passo</button>
                         </div>
                      </motion.div>
                    )}

                    {currentStep === 3 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 pt-6"
                      >
                         <h3 className="text-xl font-bold text-center mb-8">Capacidade Operacional</h3>
                         <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Possui CNPJ Ativo?</label>
                               <select 
                                 className="w-full px-6 py-5 rounded-2xl bg-white border border-slate-100 focus:border-blue-600 outline-none transition-all font-medium appearance-none"
                                 value={formData.possueCNPJ}
                                 onChange={e => setFormData({...formData, possueCNPJ: e.target.value})}
                                 required
                               >
                                  <option value="">Selecione uma opção</option>
                                  <option value="sim">Sim, possuo CNPJ ativo</option>
                                  <option value="não_ativo">Sim, mas não está ativo</option>
                                  <option value="não">Não, não possuo CNPJ</option>
                               </select>
                            </div>

                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Cidade/Estado de atuação principal</label>
                               <div className="relative">
                                  <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                  <input 
                                    type="text" 
                                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white border border-slate-100 focus:border-blue-600 outline-none transition-all font-medium"
                                    placeholder="Ex: Porto Alegre - RS"
                                    value={formData.regiaoAtuacao}
                                    onChange={e => setFormData({...formData, regiaoAtuacao: e.target.value})}
                                    required
                                  />
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Já atua no mercado jurídico/crédito?</label>
                               <textarea 
                                 className="w-full px-6 py-5 rounded-2xl bg-white border border-slate-100 focus:border-blue-600 outline-none transition-all font-medium min-h-[120px]"
                                 placeholder="Conte brevemente sua experiência..."
                                 value={formData.experienciaMercado}
                                 onChange={e => setFormData({...formData, experienciaMercado: e.target.value})}
                               />
                            </div>

                            <div className="pt-8 flex gap-4">
                               <button type="button" onClick={() => setCurrentStep(2)} className="flex-1 py-5 rounded-2xl bg-slate-200 text-slate-500 font-bold transition-all hover:bg-slate-300">Voltar</button>
                               <button 
                                 type="submit" 
                                 disabled={isSubmitting}
                                 className="flex-1 py-5 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                               >
                                  {isSubmitting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                    <>
                                      <span>Enviar Proposta</span>
                                      <Send size={18} />
                                    </>
                                  )}
                               </button>
                            </div>
                         </form>
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-[#0a0f1d] text-slate-500">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-3 text-white mb-6">
                 <Scale size={32} />
                 <span className="font-serif font-bold text-2xl">GSA Câmara</span>
               </div>
               <p className="max-w-sm mb-8 leading-relaxed">
                 A maior rede de LegalTech do sul do país focada em resolução extrajudicial de conflitos em larga escala.
               </p>
               <div className="flex gap-4">
                 {[
                   { icon: Instagram, url: '#' },
                   { icon: Linkedin, url: '#' },
                   { icon: Facebook, url: '#' }
                 ].map((social, i) => (
                   <a 
                     key={i} 
                     href={social.url}
                     className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all cursor-pointer text-slate-400 hover:text-white"
                   >
                     <social.icon size={18} />
                   </a>
                 ))}
               </div>
            </div>
            
            <div className="space-y-4">
               <h5 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Links Úteis</h5>
               <ul className="space-y-3 text-sm">
                  <li className="hover:text-white cursor-pointer transition-colors">Quem Somos</li>
                  <li className="hover:text-white cursor-pointer transition-colors">Termos de Uso</li>
                  <li className="hover:text-white cursor-pointer transition-colors">Privacidade</li>
                  <li className="hover:text-white cursor-pointer transition-colors">Suporte</li>
               </ul>
            </div>

            <div className="space-y-4">
               <h5 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Fale Conosco</h5>
               <ul className="space-y-3 text-sm">
                  <li>atende.gsa@gmail.com</li>
                  <li>(54) 99621-7400</li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 text-center text-[10px] uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} GSA Câmara & Mediação Extrajudicial | CNPJ: 43.123.208/0001-01
         </div>
      </footer>
    </div>
  );
}
