import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  FileText, 
  Scale, 
  Clock, 
  Lock, 
  TrendingUp, 
  Briefcase,
  Users,
  Award,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function ComercialSiteView() {
  const [whatsappUrl, setWhatsappUrl] = useState("https://wa.me/5500000000000");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'tracking'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.comercialWhatsappUrl) {
          setWhatsappUrl(data.comercialWhatsappUrl);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/tracking');
    });

    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafc] font-sans selection:bg-[#5A5A40]/10 selection:text-[#5A5A40]">
      {/* HEADER NAV (Floating) */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-center">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-lg rounded-full px-8 py-3 flex items-center justify-between w-full max-w-5xl">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#5A5A40]" />
            <span className="font-serif font-bold text-xl tracking-tight text-gray-900">GSA <span className="text-[#5A5A40]/80">Câmara</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#problema" className="text-sm font-medium text-gray-600 hover:text-[#5A5A40] transition-colors">Problemas</a>
            <a href="#solucao" className="text-sm font-medium text-gray-600 hover:text-[#5A5A40] transition-colors">Solução</a>
            <a href="#beneficios" className="text-sm font-medium text-gray-600 hover:text-[#5A5A40] transition-colors">Vantagens</a>
          </div>
          <a href={whatsappUrl} className="bg-[#5A5A40] text-white px-5 py-2 rounded-full text-sm font-bold shadow-md hover:bg-black transition-all transform hover:scale-105">
            Atendimento
          </a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=2000" 
            alt="Law firm office" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1c20] via-[#1a1c20]/90 to-transparent"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full mb-6">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Especialistas em Solução de Conflitos</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-[1.1]">
              Resolva dívidas e conflitos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fefefe] to-[#fecaca]">sem entrar na Justiça</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed max-w-xl">
              Descubra por que 90% dos casos são resolvidos com estratégia profissional e mediação extrajudicial, economizando tempo e recursos valiosos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={whatsappUrl} className="bg-[#5A5A40] hover:bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl transition-all flex items-center justify-center gap-3 group">
                Fazer Diagnóstico Financeiro
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href={whatsappUrl} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3">
                Analisar Contrato / Juros
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="hidden md:block relative"
          >
            <div className="bg-white p-8 rounded-[40px] shadow-2xl relative z-10 border border-gray-100">
               <div className="flex items-center gap-4 mb-6">
                  <div className="flex -space-x-3">
                    <img className="w-10 h-10 rounded-full border-4 border-white shadow-sm" src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=60" alt="Client" />
                    <img className="w-10 h-10 rounded-full border-4 border-white shadow-sm" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=60" alt="Client" />
                    <img className="w-10 h-10 rounded-full border-4 border-white shadow-sm" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=60" alt="Client" />
                    <div className="w-10 h-10 rounded-full border-4 border-white bg-amber-400 flex items-center justify-center text-[10px] text-white font-black shadow-sm">+1k</div>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900">+1.200 ACORDOS</p>
                    <p className="text-[10px] text-gray-500 font-medium">Firmados este mês</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-5 rounded-3xl mb-4 border border-gray-100">
                  <div className="flex text-amber-400 gap-0.5 mb-2">
                    {[1,2,3,4,5].map(s => <Scale key={s} size={10} fill="currentColor" />)}
                  </div>
                  <p className="text-sm font-medium text-gray-700 italic">"Descobri que estava pagando quase o dobro do valor justo. Em 5 dias a GSA resolveu tudo!"</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-2">MARCOS VINÍCIUS • SERVIDOR PÚBLICO</p>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA SECTION */}
      <section id="problema" className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#5A5A40] font-black text-xs uppercase tracking-widest mb-4 block">Cenário Atual</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-8 leading-tight">Você pode estar passando por isso:</h2>
              <div className="space-y-6">
                {[
                  { title: "Insolvência", desc: "Nome negativado e sem uma estratégia clara de retomada." },
                  { title: "Efeito Bola de Neve", desc: "Dívidas que crescem exponencialmente devido a juros abusivos." },
                  { title: "Portas Fechadas", desc: "Crédito recusado impedindo novos planos e investimentos." },
                  { title: "Atritos Contratuais", desc: "Problemas complexos com contratos sem solução à vista." },
                  { title: "Desgaste Familiar", desc: "Conflitos interpessoais ou empresariais afetando a paz." }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ x: 10 }}
                    className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#fcfbf9] border border-gray-100 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-5 h-5 text-[#5A5A40]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-[60px] overflow-hidden shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=1000" 
                  alt="Mediação e Acordo" 
                  className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl">
                   <p className="text-white text-lg font-medium leading-relaxed">
                     "Tentar resolver sem entender o problema real é o erro mais comum. Isso gera perda de patrimônio e tempo."
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION / DIAGNOSTICO */}
      <section id="solucao" className="py-24 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-[#5A5A40] font-black text-xs uppercase tracking-widest mb-4 block">O Caminho</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">Diagnóstico Estratégico GSA</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: "Análise Profunda", desc: "Varredura completa em todos os órgãos de proteção e sistemas bancários." },
              { icon: ShieldCheck, title: "Risk Assessment", desc: "Identificação de brechas legais e riscos ocultos no seu contrato ou dívida." },
              { icon: Briefcase, title: "Plano de Ataque", desc: "Desenvolvimento de uma estratégia personalizada para quitação ou resolução." }
            ].map((step, idx) => (
              <div key={idx} className="bg-white p-10 rounded-[40px] shadow-sm hover:shadow-xl transition-all border border-gray-100 group">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center mb-8 group-hover:bg-[#5A5A40] transition-colors">
                  <step.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <a href={whatsappUrl} className="inline-flex items-center gap-3 bg-[#5A5A40] hover:bg-black text-white px-12 py-5 rounded-[20px] font-bold text-lg shadow-xl shadow-black/10 transition-all hover:scale-105">
              Quero meu diagnóstico agora
              <ArrowRight size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* AREAS DE ATUACAO */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="container mx-auto max-w-6xl relative">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/3">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">Expertise em Múltiplas Áreas</h2>
              <p className="text-gray-500 mb-8">Nossa câmara atua em diversos segmentos, garantindo que cada conflito tenha o especialista certo para mediar a solução.</p>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                 <Users className="text-[#5A5A40]" />
                 <span className="text-sm font-bold text-gray-700">Suporte focado no cliente</span>
              </div>
            </div>
            <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                "Dívidas e crédito", "Revisão de contratos", "Cobranças", 
                "Empresarial", "Familiar", "Seguros", 
                "Locações", "Prestação de serviços", "Consignados"
              ].map((area, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-red-200 transition-all text-center">
                  <p className="font-bold text-gray-800 text-sm">{area}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS / DIFERENCIAIS */}
      <section id="beneficios" className="py-24 px-6 bg-[#1a1c20] text-white overflow-hidden relative">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-8 leading-tight">Por que optar pela mediação estratégica?</h2>
            <p className="text-gray-400 text-lg">A mediação extrajudicial é hoje a forma mais inteligente, rápida e segura de resolver pendências jurídicas e financeiras no Brasil.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Clock, title: "Agilidade Extrema", desc: "Resoluções em dias, enquanto o judiciário leva anos." },
              { icon: TrendingUp, title: "Custo-Benefício", desc: "Estrutura de custos infinitamente menor que processos comuns." },
              { icon: Lock, title: "Sigilo Absoluto", desc: "Todo o processo acontece em ambiente privado e seguro." },
              { icon: ShieldCheck, title: "Validade Legal", desc: "Acordos com força de título executivo judicial." }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-[#5A5A40]/20 text-[#5A5A40] flex items-center justify-center mb-6">
                  <benefit.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUTORIDADE SECTION */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="w-16 h-1 w-24 bg-[#5A5A40] mx-auto mb-10"></div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-10">Base Legal e Segurança de Alto Padrão</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 flex flex-col items-center">
              <FileText className="w-12 h-12 text-gray-300 mb-6" />
              <h4 className="font-bold text-gray-900 mb-2">Código de Processo Civil</h4>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lei nº 13.105/2015</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 flex flex-col items-center">
              <Scale className="w-12 h-12 text-gray-300 mb-6" />
              <h4 className="font-bold text-gray-900 mb-2">Lei de Mediação</h4>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lei nº 13.140/2015</p>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-serif font-bold text-[#5A5A40] max-w-2xl mx-auto leading-tight italic">
            "Atuação estruturada em conformidade com as melhores práticas da justiça privada contemporânea."
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-gradient-to-br from-[#5A5A40] to-[#3d3d2c] rounded-[60px] p-12 md:p-20 text-center relative overflow-hidden shadow-[0_40px_80px_-20px_rgba(90,90,64,0.3)]">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-8 leading-tight">
                Quanto antes você resolver, <br className="hidden md:block" /> menor o seu prejuízo
              </h2>
              <p className="text-white/80 text-lg md:text-xl mb-12 max-w-xl mx-auto">
                Não permita que pendências financeiras e conflitos travem sua evolução. Nossa equipe está pronta para o diagnóstico imediato.
              </p>
              <a 
                href={whatsappUrl} 
                className="inline-flex items-center gap-4 bg-white text-[#5A5A40] px-12 py-6 rounded-[24px] font-black text-xl shadow-2xl hover:scale-105 transition-all"
              >
                <MessageCircle size={24} className="fill-[#5A5A40]" />
                Falar com um Especialista
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 px-6 bg-gray-50 border-t border-gray-100 italic">
        <div className="container mx-auto max-w-6xl">
           <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
              <div className="flex items-center gap-2 grayscale brightness-50">
                <Scale className="w-5 h-5 text-gray-900" />
                <span className="font-serif font-bold text-lg tracking-tight text-gray-900">GSA Câmara</span>
              </div>
           </div>
           <div className="text-center pt-8 border-t border-gray-200">
             <p className="text-xs text-gray-400 font-medium tracking-wide leading-relaxed">
               © {new Date().getFullYear()} GSA Câmara de Mediação e Solução de Conflitos. <br />
               Todos os direitos reservados. Informações prestadas em conformidade legal.
             </p>
           </div>
        </div>
      </footer>
    </div>
  );
}

