import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Download, 
  BarChart4, 
  Server, 
  Database, 
  Lock, 
  FileText,
  Boxes,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { fetchAnalyticsData } from '../lib/analyticsEngine';
import { generateTechnicalInnovationPDF } from '../lib/pdfGenerator';
import { useAuth } from '../AuthContext';

export const InnovationReportView: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchAnalyticsData();
      setStats(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleExport = () => {
    if (!stats) return;
    generateTechnicalInnovationPDF({
      stats: {
        totalProcessos: stats.stats.totalProcessos,
        taxaAcordo: `${stats.stats.taxaAcordo.toFixed(1)}%`,
        tempoMedio: `${stats.stats.tempoMedioResolucao.toFixed(0)} dias`,
        volumeTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.stats.volumeNegociado),
        economiaGerada: '35% (Média de Deságio)'
      },
      infra: {
        hosting: 'Google Cloud Run / Firebase',
        database: 'Firestore (NoSQL Realtime)',
        ai_model: 'Google Gemini Pro 1.5 (Multimodal)',
        security: 'SHA-256 Hashing + LGPD Privacy Rules'
      }
    });
  };

  const InnovationCard = ({ icon: Icon, title, description, tags, color }: any) => (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 shadow-xl shadow-black/5 flex flex-col h-full"
    >
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6 text-white shadow-lg`}>
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
        {description}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag: string) => (
          <span key={tag} className="text-[10px] font-bold px-2.5 py-1 bg-gray-50 border border-gray-100 text-gray-400 rounded-lg uppercase tracking-widest">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-12 pb-24">
      {/* Header section with Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-900 rounded-[3rem] p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-blue-400" />
              <span className="text-xs font-black uppercase tracking-[0.3em] opacity-80">Innovation & Equity Fund Module</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight mb-4 leading-tight">
              A Nova Era da Resolução <br />de Conflitos Digital.
            </h1>
            <p className="text-blue-100/70 font-medium text-lg">
              Compilação de infraestrutura, algoritmos de jogo e inteligência artificial proprietária da Câmara GSA.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleExport}
              className="bg-white text-blue-900 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-blue-50 transition-all active:scale-95"
            >
              <Download size={20} />
              Exportar Dossier Técnico
            </button>
            <p className="text-[10px] text-center opacity-50 uppercase font-bold tracking-widest">
              Geração de PDF Certificado
            </p>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <InnovationCard 
          icon={Cpu}
          color="bg-blue-600"
          title="Inteligência Artificial (GenAI)"
          description="Uso de LLMs Google Gemini para auditoria processual, análise preditiva de viabilidade jurídica e suporte automatizado aos mediadores via copiloto de redação."
          tags={['Gemini 1.5 Pro', 'Multimodal', 'OCR', 'NLP']}
        />
        <InnovationCard 
          icon={ShieldCheck}
          color="bg-emerald-600"
          title="Segurança Jurídica 2.0"
          description="Cofre de evidências com hashing SHA-256 nativo. Garantia de imutabilidade absoluta de provas e termos de acordo via criptografia de ponta a ponta."
          tags={['Web Crypto API', 'SHA-256', 'Integrity Seals', 'LGPD']}
        />
        <InnovationCard 
          icon={Zap}
          color="bg-amber-500"
          title="ODR & Negociação Ágil"
          description="Motor assíncrono de Blind Bidding que utiliza teoria dos jogos para aproximar partes em conflito financeiro, reduzindo drasticamente o tempo de acordo."
          tags={['Game Theory', 'ODR Platform', 'Blind Bidding']}
        />
      </div>

      {/* Tech Stack Visualizer */}
      <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[3rem] border border-white/40 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/3">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Enterprise Architecture</h2>
            <p className="text-gray-500 font-medium">Arquitetura Serverless desenhada para escala global, com latência zero e segurança de nível bancário.</p>
            <div className="mt-8 space-y-4">
               {[
                 { icon: Server, label: 'Hosting e Compute', val: 'Google Cloud Platform' },
                 { icon: Database, label: 'Data Registry', val: 'Firestore Realtime' },
                 { icon: Lock, label: 'Auth Strategy', val: 'Firebase Identity Platform' }
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800">{item.val}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="lg:w-2/3 grid grid-cols-2 gap-4">
             <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-8 rounded-[2rem] flex flex-col justify-center">
                <span className="text-5xl font-black text-blue-600 mb-2">35%</span>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Redução média no Ciclo de Resolução</p>
             </div>
             <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-8 rounded-[2rem] flex flex-col justify-center">
                <span className="text-5xl font-black text-emerald-600 mb-2">99%</span>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Taxa de Integridade Documental</p>
             </div>
             <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-8 rounded-[2rem] flex flex-col justify-center">
                <span className="text-5xl font-black text-amber-500 mb-2">+40</span>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pontos de Auditoria por Processo</p>
             </div>
             <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-8 rounded-[2rem] flex flex-col justify-center">
                <span className="text-5xl font-black text-indigo-600 mb-2">SaaS</span>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Arquitetura Multi-tenant Pronta</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
