import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { signInWithGoogle, logout, auth } from './lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Scale, LogOut, FileText, Settings, Activity, DollarSign, Menu, X, Users, Home, Plus, LayoutTemplate, Copy, Key, Mail, Lock, Loader2, BrainCircuit, Zap, AlertTriangle, ArrowRight, Send, ClipboardList, Building2, ShieldAlert, Palette, BarChart, Sparkles, Share2, Video, Briefcase, UploadCloud, Store, Shield, PenTool, Percent, LayoutGrid, Trophy } from 'lucide-react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FinanceiroView } from './components/FinanceiroView';
import { RXAuditView } from './components/RXAuditView';
import { SettingsView } from './components/SettingsView';
import { UserManagementView } from './components/UserManagementView';
import { PublicTrackingView } from './components/PublicTrackingView';
import { ProcessManagementView } from './components/ProcessManagementView';
import { AdminLeadsView } from './components/AdminLeadsView';
import { ProcessDetailAdminView } from './components/ProcessDetailAdminView';
import { NewProcessView } from './components/NewProcessView';
import LeadLogin from './components/LeadLogin';
import ArOnlineUserDashboard from './components/ArOnlineUserDashboard';
import { TrackingScripts } from './components/TrackingScripts';
import { TenantFinancialDashboard } from './components/TenantFinancialDashboard';
import { TenantOnboardingCheckout } from './components/TenantOnboardingCheckout';
import { LawyerDashboard } from './components/LawyerDashboard';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ProcessoRapidoView, PublicProcessoRapidoPortal } from './components/ProcessoRapidoView';
import { motion, AnimatePresence } from 'motion/react';
import { Suspense, lazy } from 'react';
import { useUTMTracking } from './hooks/useUTMTracking';

// Lazy load heavy views
const LandingPageView = lazy(() => import('./components/LandingPageView').then(m => ({ default: m.LandingPageView })));
const ComercialSiteView = lazy(() => import('./components/ComercialSiteView'));
const OnlineAnalysisApp = lazy(() => import('./components/OnlineAnalysisApp'));
const LeadDashboard = lazy(() => import('./components/LeadDashboard'));
const ConsultantDashboard = lazy(() => import('./components/ConsultantDashboardView'));
const OnlineLeadsAdmin = lazy(() => import('./components/OnlineLeadsAdmin'));
const LimpaNomeQuiz = lazy(() => import('./components/LimpaNomeQuiz').then(m => ({ default: m.default })));
const QuizRXINSS = lazy(() => import('./components/RxInssQuizView'));
const LandingPageAR = lazy(() => import('./components/LandingPageAR'));
const ClientPortalView = lazy(() => import('./components/ClientPortalView').then(m => ({ default: m.ClientPortalView })));
const ClientArReviewView = lazy(() => import('./components/ClientArReviewView'));
const GsaRecoveryDashboard = lazy(() => import('./components/GsaRecoveryDashboard'));
const GsaRecoveryAdminView = lazy(() => import('./components/GsaRecoveryAdminView'));
const JuridicoProcessoView = lazy(() => import('./components/JuridicoProcessoView'));
const JuridicoPanelView = lazy(() => import('./components/JuridicoPanelView'));
const JuridicoProcessManagementView = lazy(() => import('./components/JuridicoProcessManagementView'));
const LawyerProcessPage = lazy(() => import('./components/LawyerProcessPage'));
const MediatorDashboard = lazy(() => import('./components/MediatorDashboard'));
const DebtorNegotiationPortal = lazy(() => import('./components/DebtorNegotiationPortal'));
const ClientDashboardView = lazy(() => import('./components/ClientDashboardView'));
const JurimetriaDashboard = lazy(() => import('./components/JurimetriaDashboard').then(m => ({ default: m.JurimetriaDashboard })));
const GsaMasterDashboard = lazy(() => import('./components/GsaMasterDashboard').then(m => ({ default: m.GsaMasterDashboard })));
const AdminUnitManager = lazy(() => import('./components/AdminUnitManager').then(m => ({ default: m.AdminUnitManager })));
const PartnerLandingPage = lazy(() => import('./components/PartnerLandingPage'));
const RecoveryLandingPage = lazy(() => import('./components/RecoveryLandingPage'));
const DocumentTemplatesView = lazy(() => import('./components/DocumentTemplatesView').then(m => ({ default: m.DocumentTemplatesView })));
const AdminSitesView = lazy(() => import('./components/AdminSitesView').then(m => ({ default: m.AdminSitesView })));
const TenantWhiteLabelSettings = lazy(() => import('./components/TenantWhiteLabelSettings').then(m => ({ default: m.TenantWhiteLabelSettings })));
const ArOnlineConfigView = lazy(() => import('./components/ArOnlineConfigView'));
const NotificationDashboard = lazy(() => import('./components/NotificationDashboard').then(m => ({ default: m.NotificationDashboard })));
const InnovationReportView = lazy(() => import('./components/InnovationReportView').then(m => ({ default: m.InnovationReportView })));
const AdminCommissionsReportView = lazy(() => import('./components/AdminCommissionsReportView'));
const TenantCaptureView = lazy(() => import('./components/TenantCaptureView'));
const TenantUsersView = lazy(() => import('./components/TenantUsersView'));
const TenantSettingsView = lazy(() => import('./components/TenantSettingsView'));
const TenantARConfigView = lazy(() => import('./components/TenantARConfigView'));
const TenantSitesView = lazy(() => import('./components/TenantSitesView'));
const AdminCommissionSettingsView = lazy(() => import('./components/AdminCommissionSettingsView').then(m => ({ default: m.AdminCommissionSettingsView })));
import { Wallet } from 'lucide-react';
const B2BUploadView = lazy(() => import('./components/B2BUploadView').then(m => ({ default: m.B2BUploadView })));
const FinanceiroDashboard = lazy(() => import('./components/FinanceiroDashboard').then(m => ({ default: m.FinanceiroDashboard })));
const AntiSpamConfigView = lazy(() => import('./components/AntiSpamConfigView').then(m => ({ default: m.AntiSpamConfigView })));
const JurimetricsPitchView = lazy(() => import('./components/JurimetricsPitchView').then(m => ({ default: m.JurimetricsPitchView })));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const VitrinePublica = lazy(() => import('./components/VitrinePublica').then(m => ({ default: m.VitrinePublica })));
const PainelVitrineAfiliado = lazy(() => import('./components/PainelVitrineAfiliado').then(m => ({ default: m.PainelVitrineAfiliado })));
const GestaoLeadsAdmin = lazy(() => import('./components/GestaoLeadsAdmin').then(m => ({ default: m.GestaoLeadsAdmin })));
const CheckoutAssinaturaView = lazy(() => import('./components/CheckoutAssinaturaView').then(m => ({ default: m.CheckoutAssinaturaView })));
const CheckoutAROnlineView = lazy(() => import('./components/CheckoutAROnlineView').then(m => ({ default: m.CheckoutAROnlineView })));
const AssinaturaDigitalView = lazy(() => import('./components/AssinaturaDigitalView'));
const ArOnlineManualView = lazy(() => import('./components/ArOnlineManualView'));
const AnalistaControlTower = lazy(() => import('./components/AnalistaControlTower').then(m => ({ default: m.AnalistaControlTower })));
import { ResumoProcessosEnviados } from './components/ResumoProcessosEnviados';
const PainelRastreioAfiliado = lazy(() => import('./components/PainelRastreioAfiliado').then(m => ({ default: m.PainelRastreioAfiliado })));
const CreditoInteligenteDashboard = lazy(() => import('./components/CreditoInteligenteDashboard'));
const CreditoSimuladorPremium = lazy(() => import('./components/CreditoSimuladorPremium'));

import PublicMediationRequest from './components/PublicMediationRequest';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
    <Loader2 className="w-10 h-10 text-primary animate-spin" />
  </div>
);

function OnboardingView({ rejected = false }: { rejected?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg w-full text-center">
        <Scale className="w-16 h-16 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-serif font-bold mb-4">
          {rejected ? 'Cadastro Não Aprovado' : 'Cadastro em Análise'}
        </h1>
        <p className="text-gray-600 mb-8">
          {rejected 
            ? 'Infelizmente seu cadastro não foi aprovado pela administração. Entre em contato para mais informações.'
            : 'Seu cadastro está pendente de aprovação pela nossa equipe. Em breve você terá acesso ao painel principal.'}
        </p>
        <button 
          onClick={logout}
          className="text-gray-500 hover:text-gray-800 font-medium transition-colors"
        >
          Voltar e Sair
        </button>
      </div>
    </div>
  );
}

import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import NovaInclusaoProcesso from './components/NovaInclusaoProcesso';

// Componente de Roteamento Inicial Centralizado
const RoteadorInicial = () => {
  const { profile, loading, user, isAdmin } = useAuth();
  const location = useLocation();
  
  if (loading) return null;
  
  if (!user) return <LandingPageView />;

  // Detecta se estamos acessando via slug prefixado na URL
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0];
  // Ignora se for uma das rotas conhecidas do sistema
  const systemPaths = ['painel', 'crm', 'login', 'portal', 'admin-preview', 'config', 'usuarios', 'unidades', 'parceiros'];
  const slugPrefix = firstPart && !systemPaths.includes(firstPart) ? `/${firstPart}` : '';

  const isApproved = profile?.status === 'APROVADO' || isAdmin;
  const isRejected = profile?.status === 'REJEITADO';

  if (!isApproved) {
    return <OnboardingView rejected={isRejected} />;
  }

  // Redirecionamento baseado em Role
  if (profile?.tipo_usuario === 'CLIENTE' || profile?.tipo_usuario === 'Cliente') {
    return <Navigate to={`${slugPrefix}/portal`} replace />;
  }
  
  if (profile?.tipo_usuario === 'CONSULTOR' || profile?.tipo_usuario === 'AFILIADO') {
    return <Navigate to={`${slugPrefix}/crm`} replace />;
  }

  if (profile?.tipo_usuario === 'VENDEDOR') {
    return <Navigate to={`${slugPrefix}/painel/vendedor`} replace />;
  }
  
  // Para MASTER, DIRETOR, AdminGeral, Procurador, Mediador, etc, vai para o dashboard principal
  return <Navigate to={`${slugPrefix}/painel`} replace />;
};

function Sidebar({ collapsed = false, setCollapsed }: { collapsed?: boolean, setCollapsed?: (v: boolean) => void }) {
  const { user, isAdmin, profile, isMaster, tenant } = useAuth();
  const location = useLocation();

  const canAudit = isAdmin || profile?.can_audit;
  
  // Detecta prefixo de slug na URL para manter navegação contextual
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0];
  const systemPaths = ['painel', 'crm', 'login', 'portal', 'admin-preview', 'config', 'usuarios', 'unidades', 'parceiros'];
  const slugPrefix = firstPart && !systemPaths.includes(firstPart) && firstPart.length > 2 ? `/${firstPart}` : '';
  const isCrm = profile?.tipo_usuario === 'CONSULTOR' || profile?.tipo_usuario === 'AFILIADO' || (profile?.tipo_usuario as any) === 'consultor';
  const isMediador = profile?.tipo_usuario === 'Mediador';
  const isProcurador = profile?.tipo_usuario === 'Procurador';
  const isAdminGeral = profile?.tipo_usuario === 'AdminGeral';
  const isGestorUnidade = profile?.tipo_usuario === 'GestorUnidade';
  const isMasterAdmin = profile?.tipo_usuario === 'MasterAdmin' || isMaster;
  const basePath = isCrm ? `${slugPrefix}/consultor` : `${slugPrefix}/painel`;

  const isVendedor = profile?.tipo_usuario === 'VENDEDOR';
  let links = [];

  if (isVendedor) {
    links = [
      { path: `${basePath}/vendedor`, label: 'Início', icon: Home },
      { path: `${basePath}/processo-rapido`, label: 'Processo Rápido ⚡', icon: Zap },
      { path: `${basePath}/vendedor?tab=leads`, label: 'Leads & Funil', icon: Users },
      { path: `${basePath}/vendedor?tab=clientes`, label: 'Clientes & Onboarding', icon: Briefcase },
      { path: `${basePath}/vendedor?tab=contratos`, label: 'Contratos & Docs', icon: FileText },
      { path: `${basePath}/vendedor?tab=comissao`, label: 'Minhas Comissões', icon: DollarSign },
      { path: `${basePath}/vendedor?tab=ranking`, label: 'Metas & Ranking', icon: Trophy }
    ];
  } else {
    links = [{ path: basePath || '/', label: 'Início', icon: Home }];

  if (!isCrm) {
    links.push({ path: `${basePath}/processos`, label: 'Gestão de Processos', icon: FileText });
    links.push({ path: `${basePath}/processo-rapido`, label: 'Processo Rápido ⚡', icon: Zap });
    
    links.push({ path: `${basePath}/painel-juridico`, label: 'Jurídico', icon: Briefcase });

    if (isMasterAdmin) {
      links.splice(2, 0, { path: `${basePath}/unidades-hub`, label: 'Hub de Credenciadas', icon: Building2 });
    }

    if (isMasterAdmin || profile?.tipo_usuario === 'GestorUnidade' || profile?.tipo_usuario === 'DIRETOR') {
      links.splice(1, 0, { path: `${basePath}/jurimetria`, label: 'Jurimetria & BI', icon: BarChart });
    }

    if (isMasterAdmin || profile?.tipo_usuario === 'GestorUnidade' || profile?.tipo_usuario === 'DIRETOR' || profile?.tipo_usuario === 'UNIDADE') {
      links.push({ path: `${basePath}/jurimetria-vendas`, label: 'Pitch Jurimetria B2B', icon: Scale });
    }

    if (!isMediador) {
      links.push({ path: `${basePath}/documentos`, label: 'Documentos', icon: ClipboardList });
    }

    if (isMaster) {
      links.splice(1, 0, { path: `${basePath}/master`, label: 'Master Dash', icon: ShieldAlert });
    }

    if (isMasterAdmin) {
      links.push({ path: `${basePath}/inovacao`, label: 'Inovação & Dossier', icon: Sparkles });
      links.push({ path: `${basePath}/financeiro-global`, label: 'Comissões & Custas', icon: DollarSign });
    }

    if (profile?.tipo_usuario && ['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'GestorUnidade', 'MasterAdmin'].includes(profile.tipo_usuario)) {
      links.push({ path: `${basePath}/recovery-admin`, label: 'Gestão GSA Recovery', icon: Zap });
      links.push({ path: `${basePath}/assinatura-digital`, label: 'Assinatura Digital', icon: PenTool });
      links.push({ path: `${basePath}/b2b-import`, label: 'Importação B2B Lote', icon: UploadCloud });
      links.push({ path: `${basePath}/vitrine-afiliado`, label: 'Vitrine de Soluções', icon: Store });
      links.push({ path: `${basePath}/config-anti-spam`, label: 'Configuração Anti-Spam', icon: ShieldAlert });
      links.push({ path: `${basePath}/gestao-leads-admin`, label: 'Gestão de Leads', icon: Users });
      
      if (['MASTER', 'ADMIN', 'MasterAdmin'].includes(profile.tipo_usuario)) {
        links.push({ path: `${basePath}/financeiro-dash`, label: 'Inteligência Financeira', icon: Wallet });
      }
      if (['MASTER', 'ADMIN', 'MasterAdmin', 'ANALISTA', 'AdminGeral', 'ADMIN_MASTER'].includes(profile.tipo_usuario)) {
        links.push({ path: `${basePath}/torre-controle`, label: 'Torre de Controle', icon: Activity });
      }
    } else if (profile?.tipo_usuario === 'ANALISTA') {
      links.push({ path: `${basePath}/torre-controle`, label: 'Torre de Controle', icon: Activity });
    }

    if (profile?.tipo_usuario === 'CREDOR') {
      links.push({ path: `${basePath}/recovery-credor`, label: 'Meu Portal de Cobrança', icon: Building2 });
    }

    if (canAudit && !isMediador) {
      links.push({ path: `${basePath}/auditoria`, label: 'Nova Auditoria RX', icon: Plus });
    }

    if (!isMediador) {
      links.push({ path: `${basePath}/financeiro`, label: 'Financeiro', icon: DollarSign });
    }

    if (isMaster) {
      links.push({ path: `${basePath}/unidades`, label: 'Rede de Unidades', icon: Building2 });
    }

    if (isAdmin || profile?.tipo_usuario === 'UNIDADE' || isAdminGeral || profile?.tipo_usuario === 'DIRETOR' || profile?.tipo_usuario === 'GestorUnidade') {
      links.push({ path: `${basePath}/identidade`, label: 'White-Label', icon: Palette });
      if (profile?.tipo_usuario === 'UNIDADE' || profile?.tipo_usuario === 'DIRETOR' || profile?.tipo_usuario === 'GestorUnidade') {
        links.push({ path: `${basePath}/captacao`, label: 'Link de Captação', icon: Share2 });
        links.push({ path: `${basePath}/equipa`, label: 'A Minha Equipa', icon: Users });
        links.push({ path: `${basePath}/configuracoes`, label: 'Dados da Unidade', icon: Building2 });
        links.push({ path: `${basePath}/config-ar`, label: 'Avisos/AR Online', icon: Settings });
      }
    }
  }

  const allowedSiteRoles = ['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin'];
  const allowedNotificacoesRoles = ['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'MasterAdmin', 'UNIDADE', 'GestorUnidade'];
  const allowedLeadsRoles = ['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'CONSULTOR', 'AFILIADO', 'Procurador', 'GestorUnidade', 'UNIDADE'];

  if (profile?.tipo_usuario && allowedSiteRoles.includes(profile.tipo_usuario)) {
    links.push({ path: `${basePath}/admin-sites`, label: 'Adm Sites Master', icon: LayoutTemplate });
    links.push({ path: `${basePath}/config/ar-online`, label: 'Config AR Online', icon: Settings });
    links.push({ path: `${basePath}/configuracao-comissoes`, label: 'Taxas e Comissões', icon: Percent });
  }
  
  if (profile?.tipo_usuario && ['UNIDADE', 'DIRETOR', 'GestorUnidade'].includes(profile.tipo_usuario)) {
    links.push({ path: `${basePath}/adm-sites`, label: 'Adm Sites', icon: LayoutTemplate });
  }

  if (profile?.tipo_usuario && allowedLeadsRoles.includes(profile.tipo_usuario)) {
    links.push({ path: `${basePath}/leads`, label: 'Monitor de Leads', icon: Users });
  }

  if (profile?.tipo_usuario && ['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'GestorUnidade', 'Mediador'].includes(profile.tipo_usuario)) {
    links.push({ path: `${basePath}/mediador`, label: 'Painel do Mediador', icon: Video });
  }

  if (profile?.tipo_usuario && allowedNotificacoesRoles.includes(profile.tipo_usuario)) {
    links.push({ path: `${basePath}/leads-online`, label: 'Captação Online', icon: BrainCircuit });
    links.push({ path: `${basePath}/notificacoes`, label: 'Notificações', icon: Mail });
    links.push({ path: `${basePath}/ar-online-manual`, label: 'AR Online Manual', icon: FileText });
  }

  if (profile?.tipo_usuario && ['AFILIADO', 'VENDEDOR', 'CLIENTE', 'CONSULTOR'].includes(profile.tipo_usuario)) {
    if (['AFILIADO', 'CONSULTOR'].includes(profile.tipo_usuario)) {
      links.push({ path: `${basePath}/processo-rapido`, label: 'Processo Rápido ⚡', icon: Zap });
    }
    links.push({ path: `${basePath}/rastreio-indicacoes`, label: 'Minhas Indicações', icon: Activity });
    links.push({ path: `${basePath}/vitrine-afiliado`, label: 'Vitrine de Soluções', icon: Store });
  }

  if (profile?.tipo_usuario && ['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'MasterAdmin'].includes(profile.tipo_usuario)) {
    links.push({ path: `${basePath}/usuarios`, label: 'Usuários', icon: Users });
  }

  if (profile?.tipo_usuario && ['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin'].includes(profile.tipo_usuario)) {
    if (!links.some(l => l.path === `${basePath}/configuracoes`)) {
      links.push({ path: `${basePath}/configuracoes`, label: 'Configurações', icon: Settings });
    }
  }

  links.push({ path: `${basePath}/credito-inteligente`, label: 'Captação & Crédito', icon: BrainCircuit });
  }

  return (
    <div className={`transition-all duration-300 ease-in-out flex flex-col h-full bg-white/40 backdrop-blur-xl border-r border-white/20 shadow-2xl relative z-10 ${collapsed ? 'w-20' : 'w-full md:w-72'}`}>
      <div className={`p-8 flex items-center shrink-0 ${collapsed ? 'justify-center p-4' : 'gap-4'}`}>
        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner overflow-hidden shrink-0">
          {tenant?.white_label?.logoUrl ? (
            <img src={tenant.white_label.logoUrl} alt="Logo Unit" className="w-full h-full object-contain p-1" />
          ) : (
            <Scale size={24} />
          )}
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-serif font-black text-xl text-gray-900 tracking-tighter">
              {tenant?.nome_unidade || 'GSA Câmara'}
            </span>
            <span className="text-[9px] font-black uppercase text-primary/40 tracking-[0.2em]">Selo de Excelência</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {Array.from(new Map(links.map(link => [link.path, link])).values()).map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              title={collapsed ? link.label : undefined}
              className={`flex items-center rounded-[1.25rem] font-bold transition-all group active:scale-95 ${collapsed ? 'justify-center py-4 px-0' : 'gap-4 px-5 py-4'} ${
                isActive 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                  : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
              }`}
            >
              <Icon size={22} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary transition-colors'} />
              {!collapsed && <span className="text-sm tracking-tight truncate">{link.label}</span>}
            </Link>
          );
        })}
        
        {(isAdmin || isAdminGeral) && !collapsed && (
          <div className="space-y-4 pt-10 px-2 opacity-50 hover:opacity-100 transition-opacity">
            <div className="h-px bg-gray-100 w-full mb-4"></div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em] truncate">Zona de Configuração</p>
          </div>
        )}
      </nav>

      <div className={`p-6 border-t border-white/20 shrink-0 ${collapsed ? 'flex flex-col items-center gap-4 p-4' : ''}`}>
        <div className={`bg-white/60 rounded-3xl border border-white flex items-center shadow-sm ${collapsed ? 'p-2 justify-center' : 'p-4 gap-4 mb-4'}`}>
          <div className="w-12 h-12 rounded-2xl bg-gray-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
            {user?.photoURL ? (
               <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold bg-primary/10 text-primary text-lg">
                 {user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
               </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-900 truncate tracking-tight">{user?.displayName || (user?.email?.split('@')[0]) || 'Usuário'}</p>
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest truncate">{profile?.tipo_usuario}</p>
            </div>
          )}
        </div>
        <button 
          onClick={logout}
          title={collapsed ? "Encerrar Sessão" : undefined}
          className={`flex items-center justify-center rounded-2xl text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white transition-all font-black uppercase tracking-widest active:scale-95 shadow-sm ${collapsed ? 'p-3 w-12 h-12' : 'w-full gap-3 px-4 py-4 text-[10px]'}`}
        >
          <LogOut size={16} />
          {!collapsed && "Encerrar Sessão"}
        </button>
      </div>
    </div>
  );
}

function LoginView() {
  const { user, tenant } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação com Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      let errorMessage = 'Falha na autenticação. Verifique os seus dados e tente novamente.';
      const errorCode = err.code || '';
      
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        errorMessage = 'E-mail ou senha incorretos. Verifique os dados informados.';
      } else if (errorCode === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas falhas. Aguarde alguns minutos e tente novamente.';
      } else if (errorCode === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso por outra conta.';
      } else if (errorCode === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = 'O e-mail informado é inválido.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const brandColor = tenant?.white_label?.primaryColor || '#1e293b';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100 relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-10">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-black/10 rotate-3 group transition-transform hover:rotate-0 duration-500 overflow-hidden"
            style={{ backgroundColor: brandColor }}
          >
            {tenant?.white_label?.logoUrl ? (
              <img src={tenant.white_label.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Scale className="text-white w-8 h-8 -rotate-3 group-hover:rotate-0 transition-transform duration-500" />
            )}
          </div>
          <h2 className="text-2xl font-serif font-bold text-center tracking-tight leading-tight" style={{ color: brandColor }}>
            {tenant ? tenant.nome_unidade.toUpperCase() : (isRegistering ? 'GSA CÂMARA - CRIAR CONTA' : 'GSA CÂMARA')}
          </h2>
          <div className="h-1.5 w-16 rounded-full mt-4" style={{ backgroundColor: brandColor }}></div>
          <p className="text-gray-400 text-[9px] mt-6 font-black uppercase tracking-[0.3em] text-center px-4">
            {tenant ? 'Portal do Credenciado' : 'Sistema Oficial de Conciliação & Mediação Extrajudicial'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 text-amber-700 text-[11px] p-5 rounded-2xl mb-8 font-bold border border-amber-100 flex items-center gap-4"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-4">E-mail Corporativo</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-all" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-gray-50 focus:border-primary outline-none bg-gray-50 focus:bg-white transition-all text-sm font-medium"
                placeholder="seu@gsa.com.br"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-4">Senha de Acesso</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-all" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-gray-50 focus:border-primary outline-none bg-gray-50 focus:bg-white transition-all text-sm font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full text-white py-4.5 rounded-2xl font-bold transition-all hover:bg-black active:scale-[0.98] shadow-xl shadow-primary/10 flex items-center justify-center gap-2 group mt-4 h-[60px]"
            style={{ backgroundColor: brandColor }}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <span>{isRegistering ? 'Solicitar Cadastro' : 'Validar Entrada'}</span>
                <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
            <span className="bg-white px-6 text-gray-400 font-bold">Autenticação Segura</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold transition-all hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-4 active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          <span>Entrar via Google Workspace</span>
        </button>

        <div className="mt-10 text-center space-y-8">
          <p className="text-sm text-gray-500 font-medium">
            {isRegistering ? 'Já possui credenciais?' : 'Não possui acesso profissional?'}{' '}
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-primary font-black hover:underline decoration-4 underline-offset-4"
            >
              {isRegistering ? 'Fazer Login' : 'Solicitar Acesso'}
            </button>
          </p>
          
          <div className="pt-8 border-t border-gray-50">
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="text-gray-400 text-[11px] uppercase tracking-widest font-black hover:text-gray-900 transition-colors inline-flex items-center gap-2 group"
              >
                <Home size={14} className="group-hover:-translate-x-1 transition-transform" />
                Retornar ao Início
              </button>
              <div className="mt-4 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Versão GSA Câmara 1.0.4 - LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Dashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const { isAdmin, isMaster, profile, impersonatedUser, stopImpersonation } = useAuth();
  
  if (profile?.tipo_usuario === 'Cliente' || profile?.tipo_usuario === 'CLIENTE' || (profile?.tipo_usuario as any) === 'cliente') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ClientDashboardView />
      </Suspense>
    );
  }

  if (profile?.tipo_usuario === 'CONSULTOR' || profile?.tipo_usuario === 'AFILIADO' || (profile?.tipo_usuario as any) === 'consultor') {
    return (
      <div className="flex h-screen bg-[#f5f2ed] overflow-hidden relative">
        <aside className={`hidden lg:block h-full shrink-0 border-r border-gray-100 transition-all duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'w-20' : 'w-72'}`}>
          <Sidebar collapsed={isDesktopSidebarCollapsed} setCollapsed={setIsDesktopSidebarCollapsed} />
        </aside>
        
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
           <header className="absolute top-4 left-4 z-50 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Menu size={24} />
            </button>
          </header>

          <header className="hidden lg:flex h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 items-center px-6 sticky top-0 z-[60] shrink-0">
             <button 
               onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
               className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
               aria-label="Toggle Menu"
             >
               <Menu size={20} />
             </button>
          </header>

          <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfbf9]/50">
            <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full text-gray-900">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="credito-inteligente" element={<CreditoInteligenteDashboard />} />
                  <Route path="processo-rapido" element={<ProcessoRapidoView />} />
                  <Route path="publico-portal-rapido/:id" element={<PublicProcessoRapidoPortal />} />
                  <Route path="*" element={<ConsultantDashboard />} />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>

        <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-end">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f2ed] overflow-hidden relative">
      {/* Banner de Personificação */}
      <AnimatePresence>
        {impersonatedUser && (
          <motion.div 
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            exit={{ y: -50 }}
            className="fixed top-0 left-0 right-0 z-[110] bg-orange-600 text-white px-4 py-2 flex items-center justify-center gap-4 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} />
              <span className="text-sm font-bold">VOCÊ ESTÁ PERSONIFICANDO: {impersonatedUser.nome_completo} ({impersonatedUser.tipo_usuario})</span>
            </div>
            <button 
              onClick={stopImpersonation}
              className="bg-white text-orange-600 px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-orange-50 transition-colors"
            >
              Encerrar Sessão
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className={`hidden lg:block h-full shrink-0 border-r border-gray-100 transition-all duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <Sidebar collapsed={isDesktopSidebarCollapsed} setCollapsed={setIsDesktopSidebarCollapsed} />
      </aside>

      {/* Main Screen Container */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Mobile / Tablet Navbar */}
        <header className="lg:hidden h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-[60] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Scale size={20} />
            </div>
            <span className="font-serif font-black text-lg text-gray-900 tracking-tight">GSA Câmara</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-2xl transition-all active:scale-90 bg-gray-50"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Desktop Header for Toggling Sidebar */}
        <header className="hidden lg:flex h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 items-center px-6 sticky top-0 z-[60] shrink-0">
           <button 
             onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
             className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
             aria-label="Toggle Menu"
           >
             <Menu size={20} />
           </button>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfbf9]/50">
          <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full text-gray-900">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={
                  isMaster ? <GsaMasterDashboard /> : (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <header>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Painel de Controle</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Gestão centralizada de processos e auditorias.</p>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    <Link to="processos" className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all transform hover:-translate-y-1">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                        <FileText size={28} />
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">Processos</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">Visualize e acompanhe o status de todos os protocolos ativos.</p>
                      <span className="text-blue-600 font-bold text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        Gerenciar <Activity size={16} />
                      </span>
                    </Link>

                    <Link to="processos/novo" className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all transform hover:-translate-y-1">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <Plus size={28} />
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">Novo Ato</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">Inicie um novo protocolo de mediação ou auditoria pericial.</p>
                      <span className="text-primary font-bold text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        Criar Novo <Activity size={16} />
                      </span>
                    </Link>

                    <RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'DIRETOR', 'UNIDADE']}>
                      <Link to="leads-online" className="group bg-indigo-900 p-8 rounded-3xl shadow-lg border border-indigo-800 hover:bg-indigo-950 transition-all transform hover:-translate-y-1 border-b-4 border-b-indigo-700 active:border-b-0 active:translate-y-0.5">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 mb-6 group-hover:scale-110 transition-transform">
                          <BrainCircuit size={28} />
                        </div>
                        <h3 className="font-bold text-xl text-white mb-2">Captação Inteligente</h3>
                        <p className="text-indigo-200/70 text-sm leading-relaxed mb-6">Acesse leads e simulações processadas via IA em tempo real.</p>
                        <span className="text-white font-bold text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                          Acessar Monitor <ArrowRight size={16} />
                        </span>
                      </Link>
                    </RoleProtectedRoute>
                  </div>

                  <ResumoProcessosEnviados />
                </div>
                )
              } />
              <Route path="master" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin']}><GsaMasterDashboard /></RoleProtectedRoute>} />
              <Route path="inovacao" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin']}><InnovationReportView /></RoleProtectedRoute>} />
              <Route path="financeiro-global" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin']}><AdminCommissionsReportView /></RoleProtectedRoute>} />
              <Route path="jurimetria" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'GestorUnidade', 'MasterAdmin']}><JurimetriaDashboard /></RoleProtectedRoute>} />
              <Route path="b2b-import" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'DIRETOR', 'GestorUnidade', 'MasterAdmin']}><B2BUploadView /></RoleProtectedRoute>} />
              <Route path="unidades-hub" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin']}><AdminUnitManager /></RoleProtectedRoute>} />
              <Route path="processos" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'UNIDADE', 'ADVOGADO', 'MEDIADOR', 'Procurador', 'GestorUnidade', 'Mediador', 'CONCILIADOR']}><JuridicoProcessManagementView /></RoleProtectedRoute>} />
    
    <Route path="painel-juridico" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'DIRETOR', 'UNIDADE', 'GestorUnidade', 'AdminGeral']}><JuridicoProcessManagementView /></RoleProtectedRoute>} />
              <Route path="processos/novo" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'UNIDADE', 'ADVOGADO', 'MEDIADOR', 'Procurador', 'GestorUnidade', 'CONCILIADOR']}><NovaInclusaoProcesso /></RoleProtectedRoute>} />
              <Route path="processos/:id" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'UNIDADE', 'ADVOGADO', 'MEDIADOR', 'Procurador', 'GestorUnidade', 'Mediador', 'CONCILIADOR']}><ProcessDetailAdminView /></RoleProtectedRoute>} />
              <Route path="documentos" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'UNIDADE', 'ADVOGADO', 'MEDIADOR', 'Procurador', 'GestorUnidade', 'CONCILIADOR']}><DocumentTemplatesView /></RoleProtectedRoute>} />
              <Route path="auditoria" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'UNIDADE', 'ADVOGADO', 'MEDIADOR', 'Procurador', 'GestorUnidade', 'CONCILIADOR']}><RXAuditView /></RoleProtectedRoute>} />
              <Route path="juridico" element={<RoleProtectedRoute allowedRoles={['ADVOGADO']}><LawyerDashboard /></RoleProtectedRoute>} />
              <Route path="financeiro" element={
                <RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'UNIDADE', 'Procurador', 'GestorUnidade']}>
                  {(profile?.tipo_usuario === 'UNIDADE' || profile?.tipo_usuario === 'DIRETOR' || profile?.tipo_usuario === 'GestorUnidade') ? <TenantFinancialDashboard /> : <FinanceiroView />}
                </RoleProtectedRoute>
              } />
              <Route path="financeiro-dash" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin']}><FinanceiroDashboard /></RoleProtectedRoute>} />
              <Route path="admin-sites" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin']}><AdminSitesView /></RoleProtectedRoute>} />
              <Route path="configuracao-comissoes" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin']}><AdminCommissionSettingsView /></RoleProtectedRoute>} />
              <Route path="adm-sites" element={<RoleProtectedRoute allowedRoles={['UNIDADE', 'DIRETOR', 'GestorUnidade']}><TenantSitesView /></RoleProtectedRoute>} />
              <Route path="leads-online" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'MasterAdmin', 'UNIDADE', 'GestorUnidade']}><OnlineLeadsAdmin /></RoleProtectedRoute>} />
              <Route path="notificacoes" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'MasterAdmin', 'UNIDADE', 'GestorUnidade']}><NotificationDashboard /></RoleProtectedRoute>} />
              <Route path="ar-online-manual" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'MasterAdmin', 'UNIDADE', 'GestorUnidade']}><ArOnlineManualView /></RoleProtectedRoute>} />
              <Route path="unidades" element={<RoleProtectedRoute allowedRoles={['MASTER', 'AdminGeral', 'MasterAdmin']}><AdminUnitManager /></RoleProtectedRoute>} />
              <Route path="identidade" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'DIRETOR', 'GestorUnidade']}><TenantWhiteLabelSettings /></RoleProtectedRoute>} />
              <Route path="config-ar" element={<RoleProtectedRoute allowedRoles={['UNIDADE', 'DIRETOR', 'GestorUnidade']}><TenantARConfigView /></RoleProtectedRoute>} />
              <Route path="config-anti-spam" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'DIRETOR', 'GestorUnidade', 'MasterAdmin']}><AntiSpamConfigView /></RoleProtectedRoute>} />
              <Route path="vitrine-afiliado" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'DIRETOR', 'GestorUnidade', 'MasterAdmin', 'CONSULTOR', 'AFILIADO']}><PainelVitrineAfiliado /></RoleProtectedRoute>} />
              <Route path="vitrine-publica" element={<VitrinePublica />} />
              <Route path="checkout-assinatura" element={<CheckoutAssinaturaView />} />
              <Route path="gestao-leads-admin" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'DIRETOR', 'GestorUnidade', 'MasterAdmin']}><GestaoLeadsAdmin /></RoleProtectedRoute>} />
              <Route path="jurimetria-vendas" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'UNIDADE', 'DIRETOR', 'GestorUnidade', 'MasterAdmin']}><JurimetricsPitchView /></RoleProtectedRoute>} />
              <Route path="captacao" element={<RoleProtectedRoute allowedRoles={['UNIDADE', 'DIRETOR', 'GestorUnidade']}><TenantCaptureView /></RoleProtectedRoute>} />
              <Route path="equipa" element={<RoleProtectedRoute allowedRoles={['UNIDADE', 'DIRETOR', 'GestorUnidade']}><TenantUsersView /></RoleProtectedRoute>} />
              <Route path="usuarios" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'MasterAdmin']}><UserManagementView /></RoleProtectedRoute>} />
              <Route path="config/ar-online" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin']}><ArOnlineConfigView /></RoleProtectedRoute>} />
              <Route path="configuracoes" element={
                <RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin', 'UNIDADE', 'DIRETOR', 'GestorUnidade']}>
                  {(profile?.tipo_usuario === 'UNIDADE' || profile?.tipo_usuario === 'DIRETOR' || profile?.tipo_usuario === 'GestorUnidade') ? <TenantSettingsView /> : <SettingsView />}
                </RoleProtectedRoute>
              } />
              <Route path="leads" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'CONSULTOR', 'AFILIADO', 'Procurador', 'GestorUnidade', 'UNIDADE']}><AdminLeadsView /></RoleProtectedRoute>} />
              <Route path="crm" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'DIRETOR', 'CONSULTOR', 'AFILIADO', 'Procurador', 'GestorUnidade', 'UNIDADE']}><LeadDashboard /></RoleProtectedRoute>} />
              {/* Rota do Administrador e Unidade */}
              <Route path="recovery-admin" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin', 'UNIDADE', 'AdminGeral', 'GestorUnidade']}><GsaRecoveryAdminView /></RoleProtectedRoute>} />
              <Route path="assinatura-digital" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin', 'UNIDADE', 'AdminGeral', 'GestorUnidade']}><AssinaturaDigitalView /></RoleProtectedRoute>} />
              <Route path="torre-controle" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin', 'ANALISTA', 'AdminGeral']}><AnalistaControlTower /></RoleProtectedRoute>} />
              <Route path="rastreio-indicacoes" element={<RoleProtectedRoute allowedRoles={['AFILIADO', 'VENDEDOR', 'CLIENTE', 'CONSULTOR']}><PainelRastreioAfiliado /></RoleProtectedRoute>} />
              <Route path="credito-inteligente" element={<CreditoInteligenteDashboard />} />
              <Route path="vendedor" element={<RoleProtectedRoute allowedRoles={['VENDEDOR', 'MASTER', 'ADMIN']}><SellerDashboard /></RoleProtectedRoute>} />
              
              {/* Rota da Empresa Credora (Cliente B2B) */}
              <Route path="recovery-credor" element={<RoleProtectedRoute allowedRoles={['CREDOR', 'MASTER', 'ADMIN', 'MasterAdmin', 'AdminGeral', 'UNIDADE', 'GestorUnidade']}><GsaRecoveryDashboard /></RoleProtectedRoute>} />
              
                             <Route path="juridico/processo/:id" element={<RoleProtectedRoute allowedRoles={['ADVOGADO', 'MASTER', 'ADMIN']}><JuridicoProcessoView /></RoleProtectedRoute>} />
               <Route path="juridico/advogado/:id" element={<LawyerProcessPage />} />
               <Route path="mediador" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'AdminGeral', 'MasterAdmin', 'UNIDADE', 'GestorUnidade', 'Mediador']}><MediatorDashboard /></RoleProtectedRoute>} />
              
              {/* Rotas de Preview Interno para Adm Sites */}
              <Route path="/admin-preview/site-comercial" element={<ComercialSiteView />} />
              <Route path="/admin-preview/parceiros" element={<PartnerLandingPage />} />
              <Route path="/admin-preview/para-empresas" element={<RecoveryLandingPage />} />
              <Route path="/admin-preview/analise-online" element={<OnlineAnalysisApp />} />
              <Route path="/admin-preview/notificacao-digital" element={<LandingPageAR />} />
              <Route path="/admin-preview/quiz-rx-inss" element={<QuizRXINSS />} />
              <Route path="/admin-preview/limpa-nome" element={<LimpaNomeQuiz />} />
              <Route path="/admin-preview/landing" element={<LandingPageView />} />
              <Route path="/admin-preview/portal" element={<ClientPortalView />} />
              <Route path="/admin-preview/acompanhar" element={<div className="py-10"><PublicTrackingView /></div>} />
              
              {/* Rotas para o Saneamento de Processo Rápido */}
              <Route path="processo-rapido" element={<ProcessoRapidoView />} />
              <Route path="publico-portal-rapido/:id" element={<PublicProcessoRapidoPortal />} />
            </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-full max-w-[280px] bg-white shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#fcfbf9]">
                <div className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-primary" />
                  <span className="font-serif font-bold text-lg">GSA Câmara</span>
                </div>
                <button 
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useTenantTheme } from './hooks/useTenantTheme';

function AppContent() {
  const { user, profile, loading, isAdmin, isMaster } = useAuth();
  const location = useLocation();

  // Executa o rastreamento global de parâmetros UTM e indicadores de afiliados/parceiros
  useUTMTracking();

  // Aplica o tema White-Label baseado na unidade credenciada do usuário
  useTenantTheme();

  // Função para retornar nomes legíveis e amigáveis para as notificações push de rotas
  const getFriendlyRouteName = (path: string): string => {
    if (path.includes('/painel/processos')) return 'Gestão de Processos';
    if (path.includes('/painel/painel-juridico')) return 'Painel Jurídico';
    if (path.includes('/painel/master')) return 'Painel Master Admin';
    if (path.includes('/painel/inovacao')) return 'Dossier e Inovação';
    if (path.includes('/painel/assinatura-digital')) return 'Assinatura Digital';
    if (path.includes('/painel/b2b-import')) return 'Importação em Lote';
    if (path.includes('/painel/financeiro')) return 'Comissões & Custas';
    if (path.includes('/painel/torre-controle')) return 'Torre de Controle';
    if (path.includes('/crm')) return 'Painel CRM GSA';
    if (path.includes('/analise-online')) return 'Análise Inteligente de Contratos';
    if (path.includes('/quiz-rx-inss')) return 'Análise de INSS';
    if (path.includes('/limpa-nome')) return 'Portal Limpa Nome';
    if (path.includes('/portal')) return 'Portal do Cliente';
    if (path.includes('/solucoes')) return 'Vitrine de Soluções';
    if (path.includes('/parceiros')) return 'Parceiros GSA';
    if (path.includes('/para-empresas')) return 'GSA Recovery para Empresas';
    return 'Área de Trabalho Segura';
  };

  const [inAppNotification, setInAppNotification] = useState<{ title: string; body: string } | null>(null);

  // Função utilitária para reproduzir o som de notificação
  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
      audio.volume = 0.4;
      audio.play().catch(e => {
        console.log('Notificação sonora em fila até a primeira interação do usuário:', e.message);
      });
    } catch (err) {
      console.warn('Falha ao inicializar o áudio de notificação:', err);
    }
  };

  // Solicita permissão de notificação nativa no primeiro clique do usuário de forma amigável
  useEffect(() => {
    const requestOnInteraction = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Permissão de notificações solicitada por clique:', permission);
        });
      }
      document.removeEventListener('click', requestOnInteraction);
    };
    document.addEventListener('click', requestOnInteraction);
    return () => document.removeEventListener('click', requestOnInteraction);
  }, []);

  // Dispara uma notificação push real utilizando o Service Worker ativo (com som e vibração do sw.js)
  const triggerRouteNotification = (path: string) => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        const friendlyName = getFriendlyRouteName(path);
        
        registration.showNotification('GSA Câmara', {
          body: `Você acessou: ${friendlyName}. Canal de notificações ativo!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          sound: '/sounds/notification.mp3', // Configurado no sw.js
          vibrate: [200, 100, 200, 100, 200], // Vibração nativa configurada
          tag: 'gsa-route-alert',
          renotify: true, // Garante vibração/toque a cada mudança de link
          requireInteraction: false, // Disparado temporariamente
          data: {
            url: path
          }
        } as any);
      }).catch(err => {
        console.warn('Erro ao obter Service Worker para notificação de rota:', err);
        // Fallback simples
        new Notification('GSA Câmara', {
          body: `Você acessou: ${getFriendlyRouteName(path)}. Canal ativo!`,
          icon: '/icon-192.png'
        });
      });
    } else if (Notification.permission === 'granted') {
      // Fallback usando a API Notification nativa
      new Notification('GSA Câmara', {
        body: `Você acessou: ${getFriendlyRouteName(path)}. Canal ativo!`,
        icon: '/icon-192.png'
      });
    }
  };

  // Monitora mudança de rotas e dispara o alerta push imediatamente (In-App + Real Push)
  useEffect(() => {
    const friendlyName = getFriendlyRouteName(location.pathname);
    
    // Dispara a simulação visual e sonora imediata (garantida em qualquer dispositivo/iframe)
    setInAppNotification({
      title: 'Canal de Notificações Ativo 🔔',
      body: `Você acessou a seção: ${friendlyName}. Canal pronto para enviar alertas.`
    });
    
    // Reproduz aviso sonoro
    playNotificationSound();
    
    // Vibra dispositivo móvel se houver suporte
    if ('vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    // Tenta disparar a notificação push nativa em paralelo
    triggerRouteNotification(location.pathname);

    // Fecha o banner após 5 segundos
    const dismissTimer = setTimeout(() => {
      setInAppNotification(null);
    }, 5000);

    return () => clearTimeout(dismissTimer);
  }, [location.pathname]);

  const [showTimeoutMsg, setShowTimeoutMsg] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setShowTimeoutMsg(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  const publicPaths = [
    '/landing', 
    '/site-comercial', 
    '/analise-online', 
    '/notificacao-digital', 
    '/quiz-rx-inss', 
    '/limpa-nome', 
    '/acesso-cliente', 
    '/ar-online/dashboard', 
    '/portal', 
    '/acompanhar',
    '/parceiros',
    '/requerimento',
    '/publico/ar',
    '/conferir-ar',
    '/juridico/advogado',
    '/solucoes',
    '/checkout-assinatura',
    '/checkout-ar',
    '/simulador-credito'
  ];

  // Identifica se estamos em uma rota de slug
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0];
  const systemPaths = [
    'painel', 'crm', 'login', 'portal', 'admin-preview', 'config', 'usuarios', 
    'unidades', 'landing', 'site-comercial', 'analise-online', 'notificacao-digital', 
    'quiz-rx-inss', 'rx-inss-sucesso', 'limpa-nome', 'acesso-cliente', 'ar-online', 
    'acompanhar', 'master', 'processos', 'documentos', 'auditoria', 'parceiros', 'requerimento', 'publico', 'quiz-limpa-nome', 'para-empresas',
    'juridico', 'solucoes', 'checkout-assinatura', 'checkout-ar', 'simulador-credito'
  ];
  const isSlugPath = firstPart && !systemPaths.includes(firstPart) && firstPart.length > 2;
  const slugPrefix = isSlugPath ? `/${firstPart}` : '';

  const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path) || (slugPrefix && location.pathname.startsWith(`${slugPrefix}${path}`))) || 
                      (location.pathname === '/' && !user) || (isSlugPath && pathParts.length === 1) ||
                      location.pathname.startsWith('/parceiros') || location.pathname.startsWith('/para-empresas') ||
                      (slugPrefix && (location.pathname.startsWith(`${slugPrefix}/parceiros`) || location.pathname.startsWith(`${slugPrefix}/para-empresas`)));

  if (loading && !isPublicPath) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f2ed] gap-6">
         <motion.div
           animate={{ rotate: 360 }}
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
         >
           <Scale className="text-primary w-16 h-16" />
         </motion.div>
         {showTimeoutMsg && (
           <div className="text-center animate-in fade-in duration-1000">
             <p className="text-gray-400 text-sm font-medium">Sua conexão com o servidor está demorando mais que o esperado...</p>
             <button 
               onClick={() => window.location.reload()}
               className="mt-4 text-primary font-bold underline"
             >
               Recarregar Página
             </button>
           </div>
         )}
      </div>
    );
  }

  return (
    <>
      {/* Notificação Push In-App flutuante no topo, estilizada e com som/vibração */}
      <AnimatePresence>
        {inAppNotification && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -40, x: '-50%', scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="fixed top-4 left-1/2 z-[10000] w-[92%] max-w-sm bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3.5"
          >
            <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="font-bold text-xs text-indigo-400 tracking-wider">GSA CÂMARA</span>
                <span className="text-[9px] text-slate-500 font-mono font-medium">AGORA</span>
              </div>
              <h5 className="font-semibold text-sm text-slate-200">{inAppNotification.title}</h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{inAppNotification.body}</p>
            </div>
            <button
              onClick={() => setInAppNotification(null)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/parceiros" element={<PartnerLandingPage />} />
          <Route path={`${slugPrefix}/parceiros`} element={<PartnerLandingPage />} />
          <Route path="/para-empresas" element={<RecoveryLandingPage />} />
          <Route path={`${slugPrefix}/para-empresas`} element={<RecoveryLandingPage />} />
          {/* Rotas que suportam Slug (Unidades Credenciadas) */}
          <Route path={`${slugPrefix}/adesao`} element={<TenantOnboardingCheckout />} />
          <Route path="/adesao" element={<TenantOnboardingCheckout />} />
          <Route path={`${slugPrefix}/`} element={<RoteadorInicial />} />
          <Route path={`${slugPrefix}/login`} element={<LoginView />} />
          <Route path={`${slugPrefix}/painel/*`} element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin', 'DIRETOR', 'UNIDADE', 'AdminGeral', 'Procurador', 'Mediador', 'ADVOGADO', 'MEDIADOR', 'CONCILIADOR', 'Cliente', 'CLIENTE', 'CREDOR', 'ANALISTA']}><Dashboard /></RoleProtectedRoute>} />
          <Route path={`${slugPrefix}/crm/*`} element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN', 'MasterAdmin', 'AdminGeral', 'Procurador', 'DIRETOR', 'CONSULTOR', 'AFILIADO', 'UNIDADE', 'GestorUnidade']}><Dashboard /></RoleProtectedRoute>} />
          <Route path={`${slugPrefix}/consultor/*`} element={<RoleProtectedRoute allowedRoles={['CONSULTOR', 'UNIDADE', 'MASTER', 'AdminGeral']}><Dashboard /></RoleProtectedRoute>} />
          <Route path={`${slugPrefix}/portal`} element={<RoleProtectedRoute allowedRoles={['Cliente', 'CLIENTE']}><ClientDashboardView /></RoleProtectedRoute>} />
          
          {/* Rotas Públicas */}
          <Route path="/solucoes" element={<VitrinePublica />} />
          <Route path={`${slugPrefix}/solucoes`} element={<VitrinePublica />} />
          <Route path="/checkout-assinatura" element={<CheckoutAssinaturaView />} />
          <Route path={`${slugPrefix}/checkout-assinatura`} element={<CheckoutAssinaturaView />} />
          <Route path={`${slugPrefix}/landing`} element={<LandingPageView />} />
          <Route path="/publico/negociar/:cobrancaId" element={<DebtorNegotiationPortal />} />
          
          {/* Rota Mágica do Advogado */}
          <Route path="/juridico/advogado/:id" element={<LawyerProcessPage />} />
          <Route path={`${slugPrefix}/juridico/advogado/:id`} element={<LawyerProcessPage />} />
          <Route path={`${slugPrefix}/site-comercial`} element={<ComercialSiteView />} />
          <Route path={`${slugPrefix}/analise-online`} element={<OnlineAnalysisApp />} />
          <Route path="/simulador-credito" element={<CreditoSimuladorPremium />} />
          <Route path={`${slugPrefix}/simulador-credito`} element={<CreditoSimuladorPremium />} />
          <Route path="/notificacao-digital" element={<LandingPageAR />} />
          <Route path={`${slugPrefix}/notificacao-digital`} element={<LandingPageAR />} />
          <Route path="/checkout-ar" element={<CheckoutAROnlineView />} />
          <Route path={`${slugPrefix}/checkout-ar`} element={<CheckoutAROnlineView />} />
          <Route path={`${slugPrefix}/quiz-rx-inss`} element={<QuizRXINSS />} />
          <Route path={`${slugPrefix}/rx-inss-sucesso`} element={<QuizRXINSS />} />
          <Route path={`${slugPrefix}/limpa-nome`} element={<LimpaNomeQuiz />} />
          <Route path={`${slugPrefix}/acesso-cliente`} element={<LeadLogin />} />
          <Route path={`${slugPrefix}/ar-online/dashboard`} element={<ArOnlineUserDashboard />} />
          <Route path="/conferir-ar/:arId" element={<ClientArReviewView />} />
          <Route path={`${slugPrefix}/acompanhar`} element={<div className="min-h-screen bg-[#fcfbf9] py-12"><PublicTrackingView /></div>} />
          <Route path={`${slugPrefix}/acompanhar/:nup`} element={<div className="min-h-screen bg-[#fcfbf9] py-12"><PublicTrackingView /></div>} />
          <Route path="/requerimento/:tenantSlug" element={<PublicMediationRequest />} />
          <Route path="/quiz-limpa-nome/:tenantSlug" element={<LimpaNomeQuiz />} />
          <Route path="/quiz-inss/:tenantSlug" element={<QuizRXINSS />} />
          <Route path="/portal-negociacao/:tenantSlug/:notificacaoId" element={<ClientPortalView />} />
          <Route path={`${slugPrefix}/requerimento`} element={<PublicMediationRequest />} />

          {/* Fallback para caso de caminho sem slug (Master access ou fallback) */}
          {!isSlugPath && (
            <>
              <Route path="/dashboard" element={<Navigate to="/painel" replace />} />
              <Route path="/admin-preview/*" element={<RoleProtectedRoute allowedRoles={['MASTER', 'ADMIN']}><Dashboard /></RoleProtectedRoute>} />
            </>
          )}

          {/* Redireciona tudo que não bater para a raiz do contexto atual */}
          <Route path="*" element={<Navigate to={`${slugPrefix}/`} replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TrackingScripts />
          <PwaInstallBanner />
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}