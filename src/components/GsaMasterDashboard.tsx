import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  AlertCircle,
  Search, 
  TrendingUp,
  Settings,
  Eye,
  Globe,
  PauseCircle,
  PlayCircle,
  MoreVertical,
  ExternalLink,
  Edit2,
  Save,
  X,
  Plus,
  Users,
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  Trash
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Tenant } from '../types';
import { collection, query, getDocs, orderBy, where, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

// Interface temporária para estender os dados da tabela
interface TenantSummary extends Tenant {
  totalProcessos: number;
  faturamentoUnidade: number;
}

export const GsaMasterDashboard: React.FC = () => {
  const { profile, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detecta prefixo de slug na URL para manter navegação contextual
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0];
  const systemPaths = ['painel', 'crm', 'login', 'portal', 'admin-preview', 'config', 'usuarios', 'unidades', 'parceiros'];
  const slugPrefix = firstPart && !systemPaths.includes(firstPart) && firstPart.length > 2 ? `/${firstPart}` : '';
  const basePath = `${slugPrefix}/painel`;
  
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalUnidades: 0,
    faturamentoGlobal: 0,
    totalProcessos: 0
  });
  
  const [unidades, setUnidades] = useState<TenantSummary[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'unidades' | 'leads' | 'alertas'>('unidades');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMasterData = async () => {
      setLoading(true);
      try {
        // Busca real de Tenants
        const tenantsSnap = await getDocs(query(collection(db, 'tenants'), orderBy('nome_unidade')));
        const tenantsList = tenantsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Agregações mockadas por enquanto, em produção seriam queries ou campos calculados
          totalProcessos: Math.floor(Math.random() * 200),
          faturamentoUnidade: Math.random() * 30000
        })) as TenantSummary[];

        setUnidades(tenantsList);
        
        // Busca Leads de Parceiros
        const leadsSnap = await getDocs(query(collection(db, 'partner_leads'), orderBy('createdAt', 'desc')));
        setLeads(leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Busca Alertas Financeiros
        const alertsSnap = await getDocs(query(collection(db, 'alertas_admin'), orderBy('createdAt', 'desc'), where('lido', '==', false)));
        setAlertas(alertsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Atribui KPI's
        setKpis({
          totalUnidades: tenantsList.length,
          faturamentoGlobal: tenantsList.reduce((acc, curr) => acc + curr.faturamentoUnidade, 0),
          totalProcessos: tenantsList.reduce((acc, curr) => acc + curr.totalProcessos, 0)
        });
      } catch (error) {
        console.error("Erro ao carregar dashboard Master", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  const handleAuditoria = async (tenant: TenantSummary) => {
    // Busca um usuário Admin desta unidade para personificar
    try {
      const usersSnap = await getDocs(query(
        collection(db, 'usuarios'), 
        where('tenantId', '==', tenant.id),
        where('tipo_usuario', '==', 'UNIDADE')
      ));
      
      if (!usersSnap.empty) {
        const targetUser = { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() } as any;
        startImpersonation(targetUser);
      } else {
        alert("Nenhum usuário administrador encontrado para esta unidade.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao tentar iniciar auditoria.");
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
    if (!confirm(`Deseja alterar o status da unidade para ${newStatus}?`)) return;

    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        status: newStatus
      });
      setUnidades(prev => prev.map(u => u.id === tenantId ? { ...u, status: newStatus as any } : u));
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Erro ao alterar status da unidade.");
    }
  };

  const [deleteConfirmGsa, setDeleteConfirmGsa] = useState<{id: string, name: string} | null>(null);
  
  const initDeleteUnit = (tenantId: string, nomeUnidade: string) => {
    setDeleteConfirmGsa({ id: tenantId, name: nomeUnidade });
  };

  const executeDeleteUnit = async () => {
    if (!deleteConfirmGsa) return;
    try {
      await deleteDoc(doc(db, 'tenants', deleteConfirmGsa.id));
      setUnidades(prev => prev.filter(u => u.id !== deleteConfirmGsa.id));
      setKpis(prev => ({
        ...prev,
        totalUnidades: prev.totalUnidades - 1
      }));
      setDeleteConfirmGsa(null);
    } catch (error) {
      console.error("Erro ao excluir unidade:", error);
      alert("Erro ao excluir a unidade. Verifique as permissões de acesso.");
      setDeleteConfirmGsa(null);
    }
  };


  const filteredUnidades = unidades.filter(u => 
    u.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.documento_cnpj.includes(searchTerm)
  );

  const filteredLeads = leads.filter(l => 
    l.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.perfil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.regiaoAtuacao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-gray-900">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel Executivo GSA Master</h1>
          <p className="text-gray-500 mt-1">Visão global da rede nacional e gestão de unidades credenciadas.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/parceiros"
            className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-800/20 hover:bg-slate-900 transition-all flex items-center gap-2"
          >
            <Globe size={20} />
            Site Parceiros
          </Link>
          <button 
            onClick={() => navigate(`${basePath}/unidades`, { state: { isAdding: true } })}
            className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-950 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Unidade
          </button>
          <div className="flex items-center gap-2 bg-white border border-gray-200 text-blue-900 px-4 py-2 rounded-xl shadow-sm">
            <ShieldAlert className="w-5 h-5" />
            <span className="font-bold text-sm tracking-tighter">NÍVEL 1 - MASTER</span>
          </div>
        </div>
      </header>

      {/* KPI's GLOBAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Unidades Ativas</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.totalUnidades}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-900">
            <Building2 className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Candidatos (Leads)</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{leads.length}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Faturamento Bruto</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.faturamentoGlobal)}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Total Processos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.totalProcessos}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <FileText className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* TABS DE GESTÃO */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-200 mb-6 w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('unidades')}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'unidades' ? 'bg-blue-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Building2 size={18} />
          Unidades e Câmaras
        </button>
        <button 
          onClick={() => setActiveTab('leads')}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'leads' ? 'bg-blue-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users size={18} />
          Candidatos (Site)
          {leads.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">NOVO</span>}
        </button>
        <button 
          onClick={() => setActiveTab('alertas')}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'alertas' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ShieldAlert size={18} />
          Alertas Críticos
          {alertas.length > 0 && <span className="bg-white text-red-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-black shadow-sm">{alertas.length}</span>}
        </button>
      </div>

      {/* BANNER DE ALERTA RÁPIDO */}
      <AnimatePresence>
        {alertas.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center justify-between shadow-xl shadow-red-600/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white animate-pulse">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-red-900 uppercase tracking-tight">Falha Crítica Detectada no Split de Pagamentos</h3>
                <p className="text-red-700/70 text-sm font-medium">Existem {alertas.length} incidentes financeiros que exigem sua atenção imediata no hub.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('alertas')}
              className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
            >
              Ver Incidentes
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTAGEM DINÂMICA (UNIDADES OU LEADS OU ALERTAS) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === 'unidades' ? 'Unidades da Rede' : activeTab === 'leads' ? 'Novos Interessados (Prospectos)' : 'Alertas e Incidentes Críticos'}
          </h2>
          {activeTab !== 'alertas' && (
            <div className="relative w-full sm:w-80">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={activeTab === 'unidades' ? "Buscar por nome ou CNPJ..." : "Buscar por nome ou perfil..."}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:bg-white outline-none w-full transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'unidades' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Unidade / WL</th>
                  <th className="px-6 py-4">Domínio / Registro</th>
                  <th className="px-6 py-4">Métricas</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnidades.map((unidade) => (
                  <tr key={unidade.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" 
                          style={{ backgroundColor: unidade.white_label?.primaryColor || '#1e3a8a' }}
                        >
                          {unidade.nome_unidade.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{unidade.nome_unidade}</div>
                          <div className="text-xs text-gray-400">{unidade.documento_cnpj}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                        <Globe size={14} className="text-blue-500" />
                        72hrs.info/{unidade.slug}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 uppercase leading-tight">
                        Ativada em: {new Date(unidade.createdAt?.seconds * 1000).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText size={14} className="text-gray-400" />
                        <span className="font-bold">{unidade.totalProcessos}</span> processos
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
                        <TrendingUp size={14} />
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unidade.faturamentoUnidade)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        unidade.status === 'ATIVO' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {unidade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`${window.location.origin}/${unidade.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir Página da Unidade (Slug)"
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button 
                          onClick={() => handleAuditoria(unidade)}
                          title="Personificar Admin (Auditoria)"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => navigate(`${basePath}/unidades`, { state: { editingUnit: unidade } })}
                          title="Editar / Ajustes"
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(unidade.id, unidade.status)}
                          title={unidade.status === 'ATIVO' ? 'Suspender Unidade' : 'Ativar Unidade'}
                          className={`p-2 rounded-lg transition-colors ${
                            unidade.status === 'ATIVO' 
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                              : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
                          }`}
                        >
                          {unidade.status === 'ATIVO' ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                        </button>
                        <button 
                          onClick={() => initDeleteUnit(unidade.id, unidade.nome_unidade)}
                          title="Excluir Unidade"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'leads' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Interessado / Perfil</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Região / Experiência</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{lead.nome}</div>
                      <div className="inline-flex mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest leading-none">
                        {lead.perfil}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                        <Mail size={14} className="text-gray-400" />
                        {lead.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-green-600 font-bold">
                        <Phone size={14} />
                        {lead.whatsapp}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800">{lead.regiaoAtuacao || '-'}</div>
                      <div className="text-xs text-gray-400 line-clamp-1 max-w-[200px]" title={lead.experienciaMercado}>
                        {lead.experienciaMercado || 'Sem experiência relatada'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={14} />
                        {lead.createdAt?.seconds ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                         onClick={() => window.location.href = `https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}?text=Olá ${lead.nome}, sou da expansão GSA. Recebemos seu interesse para ser ${lead.perfil}.`}
                         className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2 ml-auto"
                      >
                         <Phone size={14} />
                         Chamar WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8">
              <div className="bg-red-50 rounded-3xl border border-red-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-red-100/50 text-red-900 text-xs font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Gravidade</th>
                      <th className="px-6 py-4">Mensagem / Incidente</th>
                      <th className="px-6 py-4">Unidade</th>
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {alertas.length > 0 ? alertas.map((alerta) => (
                      <tr key={alerta.id} className="hover:bg-red-100/30 transition-colors">
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">CRÍTICO</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-red-900">{alerta.titulo}</div>
                          <div className="text-xs text-red-700/70">{alerta.mensagem}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-red-900 uppercase">
                           {alerta.tenantId}
                        </td>
                        <td className="px-6 py-4 text-xs text-red-600">
                           {alerta.createdAt?.seconds ? new Date(alerta.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, 'alertas_admin', alerta.id), { lido: true });
                              setAlertas(prev => prev.filter(a => a.id !== alerta.id));
                            }}
                            className="text-xs font-black uppercase text-red-600 hover:underline"
                          >
                            Marcar como Resolvido
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 bg-white">
                          Nenhum alerta crítico pendente. Tudo em ordem! 🚀
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AnimatePresence>
        {deleteConfirmGsa && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-3 text-red-600">
                <Trash size={24} />
                <h3 className="text-lg font-bold">Excluir Unidade</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  ATENÇÃO: Tem certeza que deseja excluir DEFINITIVAMENTE a unidade <strong className="text-black">"{deleteConfirmGsa.name}"</strong>?
                </p>
                <p className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100 mb-6">
                  Esta ação é irreversível e excluirá o acesso de todos os usuários atrelados a ela.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirmGsa(null)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeDeleteUnit}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md transition-colors shadow-red-600/20 flex items-center gap-2"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
