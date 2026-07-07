import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutTemplate, 
  BrainCircuit, 
  Zap, 
  Send, 
  Key, 
  Activity, 
  Copy, 
  ExternalLink,
  MousePointerClick,
  Building2,
  Globe,
  TrendingUp,
  Users,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const sites = [
  {
    id: 'site-comercial',
    name: 'Site Comercial',
    description: 'Site principal institucional da GSA Câmara.',
    path: '/site-comercial',
    icon: LayoutTemplate,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    type: 'Institucional',
    leadsCount: 154
  },
  {
    id: 'analise-online',
    name: 'App Online (Captação)',
    description: 'Fluxo de quiz e análise IA para novos leads.',
    path: '/analise-online',
    icon: BrainCircuit,
    color: 'bg-red-50 text-red-700 border-red-100',
    type: 'Funil',
    leadsCount: 892
  },
  {
    id: 'limpa-nome',
    name: 'Limpa Nome Quiz',
    description: 'Quiz focado em recuperação de crédito e nome limpo.',
    path: '/limpa-nome',
    icon: Zap,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    type: 'Funil',
    leadsCount: 432
  },
  {
    id: 'quiz-rx-inss',
    name: 'RX INSS Quiz',
    description: 'Quiz focado em auditoria e revisão de benefícios.',
    path: '/quiz-rx-inss',
    icon: BrainCircuit,
    color: 'bg-[#5A5A40]/5 text-[#5A5A40] border-[#5A5A40]/10',
    type: 'Funil',
    leadsCount: 128
  },
  {
    id: 'notificacao-digital',
    name: 'AR ONLINE',
    description: 'Landing Page para serviços de Notificação Digital.',
    path: '/notificacao-digital',
    icon: Send,
    color: 'bg-slate-900 text-[#d4af37] border-slate-700',
    type: 'B2B',
    leadsCount: 45
  },
  {
    id: 'landing',
    name: 'Revisional Extrajudicial',
    description: 'Página de captura geral da câmara.',
    path: '/landing',
    icon: LayoutTemplate,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    type: 'Institucional',
    leadsCount: 267
  },
  {
    id: 'gsa-recovery',
    name: 'GSA Recovery (B2B)',
    description: 'Landing Page comercial voltada para recuperação de crédito empresarial.',
    path: '/para-empresas',
    icon: Building2,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    type: 'B2B',
    leadsCount: 0
  },
  {
    id: 'portal',
    name: 'Painel do Cliente',
    description: 'Área logada para o cliente acompanhar seu processo.',
    path: '/portal',
    icon: Key,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    type: 'Portal',
    leadsCount: 0
  },
  {
    id: 'acompanhar',
    name: 'Consulta Pública',
    description: 'Página pública para rastreio de processos por NUP.',
    path: '/acompanhar',
    icon: Activity,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    type: 'Utilitário',
    leadsCount: 0
  },
  {
    id: 'parceiros',
    name: 'Seja Parceiro (Expansão)',
    description: 'Página de expansão nacional e credenciamento de novas unidades.',
    path: '/parceiros',
    icon: Building2,
    color: 'bg-blue-900 text-white border-blue-800',
    type: 'Expansão',
    externalUrl: `${window.location.origin}/parceiros`,
    leadsCount: 87
  }
];

export function AdminSitesView() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeUnits: 0,
    conversionRate: 14.8
  });
  const [loading, setLoading] = useState(true);

  const copyToClipboard = (path: string, name: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    alert(`Link de ${name} copiado para a área de transferência!`);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const leadsSnap = await getDocs(collection(db, 'partner_leads'));
        const tenantsSnap = await getDocs(collection(db, 'tenants'));
        
        setStats({
          totalLeads: leadsSnap.size + 1894, // +1894 para histórico simulado
          activeUnits: tenantsSnap.size,
          conversionRate: 14.8
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Adm Sites</h1>
          <p className="text-gray-500 font-medium tracking-tight">
            Gerencie e teste todas as interfaces públicas da GSA diretamente no sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${window.location.origin}/parceiros`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a0f1d] text-white font-bold text-sm shadow-lg shadow-black/10 hover:bg-black transition-all"
          >
            <Globe size={18} className="text-blue-400" />
            Página de Parceiros
          </a>
        </div>
      </header>

      {/* Métricas de Teste */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-gray-900">Total de Leads</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900">{stats.totalLeads.toLocaleString()}</span>
            <span className="text-green-500 text-xs font-bold mb-1 flex items-center gap-1">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Building2 size={24} />
            </div>
            <h3 className="font-bold text-gray-900">Unidades Ativas</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900">{stats.activeUnits}</span>
            <span className="text-gray-400 text-xs font-medium mb-1 uppercase tracking-widest">Nacional</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Target size={24} />
            </div>
            <h3 className="font-bold text-gray-900">Conversão Global</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900">{stats.conversionRate}%</span>
            <span className="text-indigo-500 text-xs font-bold mb-1 italic">Média Geral</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => {
          const Icon = site.icon;
          return (
            <motion.div
              key={site.id}
              whileHover={{ y: -5 }}
              className={`group flex flex-col rounded-[2rem] border shadow-sm transition-all hover:shadow-xl p-6 ${site.color.includes('bg-slate-900') ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${site.color}`}>
                  <Icon size={28} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${site.color.includes('bg-slate-900') ? 'bg-white/10 text-white/60 border-white/10' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    {site.type}
                  </span>
                  {site.leadsCount > 0 && (
                    <span className="text-[10px] font-bold text-gray-400">{site.leadsCount} leads (logs)</span>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 mb-8">
                <h3 className={`font-bold text-xl ${site.color.includes('bg-slate-900') ? 'text-white' : 'text-gray-900'}`}>
                  {site.name}
                </h3>
                <p className={`text-sm leading-relaxed ${site.color.includes('bg-slate-900') ? 'text-slate-400' : 'text-gray-500'}`}>
                  {site.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Link
                  to={`../admin-preview${site.path === '/' ? '/landing' : site.path}`}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    site.color.includes('bg-slate-900') 
                      ? 'bg-white text-slate-900 hover:bg-slate-100' 
                      : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                >
                  <MousePointerClick size={16} />
                  Abrir no Sistema
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => copyToClipboard(site.path, site.name)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                      site.color.includes('bg-slate-900')
                        ? 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <Copy size={14} />
                    Copiar Link
                  </button>
                  <a
                    href={site.externalUrl || site.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                      site.color.includes('bg-slate-900')
                        ? 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <ExternalLink size={14} />
                    Nova Aba
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/10 p-8 rounded-[2.5rem] mt-12">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#5A5A40] rounded-xl text-white">
            <Activity size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-lg mb-2">Dica de Administrador</h4>
            <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
              Ao abrir os sites pelo botão <strong>"Abrir no Sistema"</strong>, você pode navegar entre as páginas públicas e o painel administrativo sem perder o estado da sua sessão, facilitando testes rápidos e ajustes com a IA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
