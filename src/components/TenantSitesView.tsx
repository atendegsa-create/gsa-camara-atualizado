import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Brain, Zap, Activity, ExternalLink, Copy, CheckCircle2, Navigation, LayoutTemplate, Send, Building2 } from 'lucide-react';

export default function TenantSitesView() {
  const { user, tenant } = useAuth();
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const slug = tenant?.slug || user?.tenantId;
  const baseUrl = window.location.origin;

  // Definição dos Funis e Serviços Disponíveis
  const funis = [
    {
      id: 'site-comercial',
      titulo: 'Site Comercial',
      descricao: 'Site principal institucional da sua câmara de mediação.',
      icone: <LayoutTemplate className="w-6 h-6 text-slate-500" />,
      bgIcone: 'bg-slate-100',
      tag: 'INSTITUCIONAL',
      url: `${baseUrl}/${slug}/site-comercial`
    },
    {
      id: 'mediacao',
      titulo: 'App Online (Captação)',
      descricao: 'Fluxo padrão de requerimento e análise para mediação extrajudicial.',
      icone: <Brain className="w-6 h-6 text-red-500" />,
      bgIcone: 'bg-red-50',
      tag: 'FUNIL',
      url: `${baseUrl}/${slug}/analise-online`
    },
    {
      id: 'limpanome',
      titulo: 'Limpa Nome Quiz',
      descricao: 'Quiz focado em recuperação de crédito e reabilitação financeira.',
      icone: <Zap className="w-6 h-6 text-indigo-500" />,
      bgIcone: 'bg-indigo-50',
      tag: 'FUNIL',
      url: `${baseUrl}/quiz-limpa-nome/${slug}`
    },
    {
      id: 'rxinss',
      titulo: 'RX INSS Quiz',
      descricao: 'Quiz focado em auditoria e revisão de benefícios previdenciários.',
      icone: <Activity className="w-6 h-6 text-emerald-500" />,
      bgIcone: 'bg-emerald-50',
      tag: 'FUNIL',
      url: `${baseUrl}/quiz-inss/${slug}`
    },
    {
      id: 'notificacao-digital',
      titulo: 'AR ONLINE',
      descricao: 'Landing Page para serviços de Notificação Digital.',
      icone: <Send className="w-6 h-6 text-[#d4af37]" />,
      bgIcone: 'bg-slate-900',
      tag: 'B2B',
      url: `${baseUrl}/${slug}/notificacao-digital`
    },
    {
      id: 'landingpage',
      titulo: 'Revisional Extrajudicial',
      descricao: 'Página de captura institucional da sua câmara de mediação.',
      icone: <LayoutTemplate className="w-6 h-6 text-slate-500" />,
      bgIcone: 'bg-slate-100',
      tag: 'INSTITUCIONAL',
      url: `${baseUrl}/${slug}/landing`
    },
    {
      id: 'consulta',
      titulo: 'Consulta Pública',
      descricao: 'Página pública para clientes rastrearem processos por NUP ou CPF.',
      icone: <Navigation className="w-6 h-6 text-blue-500" />,
      bgIcone: 'bg-blue-50',
      tag: 'UTILITÁRIO',
      url: `${baseUrl}/${slug}/acompanhar`
    },
    {
      id: 'parceiros',
      titulo: 'Seja Parceiro (Expansão)',
      descricao: 'Página de expansão nacional e credenciamento de novas unidades.',
      icone: <Building2 className="w-6 h-6 text-white" />,
      bgIcone: 'bg-blue-900',
      tag: 'EXPANSÃO',
      url: `${baseUrl}/${slug}/parceiros`
    }
  ];

  const handleCopiarLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 3000);
  };

  const handleNovaAba = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="text-amber-500 w-6 h-6" /> Administrar Sites e Funis
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gira os seus links de captação para os diferentes serviços da plataforma.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funis.map((funil) => (
            <div key={funil.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
              
              <div className="flex justify-between items-start mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${funil.bgIcone}`}>
                  {funil.icone}
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  {funil.tag}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{funil.titulo}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{funil.descricao}</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleCopiarLink(funil.url, funil.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                  >
                    {copiadoId === funil.id ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar Link</>}
                  </button>
                  <button 
                    onClick={() => handleNovaAba(funil.url)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Nova Aba
                  </button>
                </div>
                <button 
                  onClick={() => handleNovaAba(funil.url)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors"
                >
                  Abrir no Sistema
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
