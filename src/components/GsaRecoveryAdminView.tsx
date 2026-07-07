import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth, getFirebaseStorage, ref, uploadBytes, getDownloadURL } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Zap, Building, Users, DollarSign, Settings, Plus, TrendingUp, Percent, PenTool, UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../lib/apiClient';

export default function GsaRecoveryAdminView() {
  const { user, isMaster, isAdminUnidade, isAdminGeral } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detecta prefixo de slug na URL para manter navegação contextual
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0];
  const systemPaths = ['painel', 'crm', 'login', 'portal', 'admin-preview', 'config', 'usuarios', 'unidades', 'parceiros'];
  const slugPrefix = firstPart && !systemPaths.includes(firstPart) && firstPart.length > 2 ? `/${firstPart}` : '';
  const [activeTab, setActiveTab] = useState<'VISAO_GERAL' | 'CREDORES' | 'LEADS' | 'ASSINATURAS' | 'COMISSOES'>('VISAO_GERAL');
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [credores, setCredores] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [metricasGlobais, setMetricasGlobais] = useState({ totalDividas: 0, totalAcordos: 0, volumeRecuperado: 0 });
  const [modalNovoCredor, setModalNovoCredor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Formulário de Novo Credor B2B
  const [formCredor, setFormCredor] = useState({
    razao_social: '', cnpj: '', responsavel: '', email: '', telefone: '', plano: 'START', taxa_notificacao_padrao: 0, logo_url: '',
    margem_desconto_maximo: 20, max_parcelas: 12, max_propostas_antes_juridico: 3, taxa_exito_credor_pct: 15
  });

  // Configuração de Comissões do Motor Recovery
  const [comissoes, setComissoes] = useState({
    taxa_notificacao: 9.90,
    taxa_exito_padrao: 15,
    taxa_operacional_minima: 49,
    taxa_assinatura_individual: 4.90, // VALOR COBRADO POR CADA DOCUMENTO ENVIADO
    split_unidade: 40,                // % QUE A UNIDADE RECEBE
    split_vendedor: 10,               // % DO VENDEDOR / CONSULTOR
    split_influencer: 5,              // % DO INFLUENCER / AFILIADO
    split_indicacao: 5                // % DE INDICAÇÃO DIRETA B2B
  });

  useEffect(() => {
    if (!user) return;
    
    // 1. Carregar Empresas Credoras
    const qCredores = (isMaster || isAdminGeral) 
      ? query(collection(db!, 'recovery_credores'))
      : query(collection(db!, 'recovery_credores'), where('unidadeId', '==', user.tenantId || 'master'));

    const unsubCredores = onSnapshot(qCredores, (snapshot) => {
      setCredores(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("recovery_credores onSnapshot error:", err));

    // 2. Carregar Leads B2B
    const qLeads = (isMaster || isAdminGeral) 
      ? query(collection(db!, 'recovery_leads_credores'))
      : query(collection(db!, 'recovery_leads_credores'), where('tenantId', '==', user.tenantId || 'master'));

    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("recovery_leads_credores onSnapshot error:", err));

    // 3. Carregar Configurações de Comissão (do Tenant ou Master)
    const carregarConfig = async () => {
      const configRef = doc(db!, 'configuracoes', `recovery_${user.tenantId || 'master'}`);
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setComissoes(configSnap.data() as any);
      }
    };
    carregarConfig();

    return () => { 
      unsubCredores(); 
      unsubLeads();
    };
  }, [user, isMaster, isAdminGeral]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const storage = getFirebaseStorage();
      if (!storage) {
        throw new Error("Firebase Storage não configurado.");
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormCredor({ ...formCredor, logo_url: downloadURL });
    } catch (error) {
      alert("Erro ao enviar a imagem. Tente novamente ou use a URL direta.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSalvarCredor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db!, 'recovery_credores', editingId), {
          ...formCredor
        });
        alert("Empresa Credora atualizada com sucesso!");
      } else {
        // Cria a empresa credora e envia e-mail com acesso ao Portal do Credor
        const newTenantId = `credor_${Date.now()}`;
        await addDoc(collection(db!, 'recovery_credores'), {
          ...formCredor,
          tenantId: newTenantId,
          unidadeId: user?.tenantId || 'master',
          status: 'ATIVO',
          criado_em: new Date().toISOString()
        });
        alert("Empresa Credora cadastrada com sucesso! E-mail de acesso enviado ao parceiro.");
      }
      setModalNovoCredor(false);
      setEditingId(null);
      setFormCredor({ razao_social: '', cnpj: '', responsavel: '', email: '', telefone: '', plano: 'START', taxa_notificacao_padrao: 0, logo_url: '', margem_desconto_maximo: 20, max_parcelas: 12, max_propostas_antes_juridico: 3, taxa_exito_credor_pct: 15 });
    } catch (error) {
      alert("Erro ao salvar empresa credora.");
    }
  };

  const handleEditCredor = (credor: any) => {
    setFormCredor({
      razao_social: credor.razao_social || '',
      cnpj: credor.cnpj || '',
      responsavel: credor.responsavel || '',
      email: credor.email || '',
      telefone: credor.telefone || '',
      plano: credor.plano || 'START',
      taxa_notificacao_padrao: credor.taxa_notificacao_padrao || 0,
      logo_url: credor.logo_url || '',
      margem_desconto_maximo: credor.margem_desconto_maximo || 20,
      max_parcelas: credor.max_parcelas || 12,
      max_propostas_antes_juridico: credor.max_propostas_antes_juridico || 3,
      taxa_exito_credor_pct: credor.taxa_exito_credor_pct || 15
    });
    setEditingId(credor.id);
    setModalNovoCredor(true);
  };

  const handleExcluirCredor = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta empresa credora?")) {
      try {
        await deleteDoc(doc(db!, 'recovery_credores', id));
        alert("Empresa Credora excluída com sucesso.");
      } catch (error) {
        alert("Erro ao excluir empresa credora.");
      }
    }
  };

  const handleAlterarStatus = async (id: string, currentStatus: string) => {
    const novoStatus = currentStatus === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
    if (window.confirm(`Deseja alterar o status desta empresa para ${novoStatus}?`)) {
      try {
        await updateDoc(doc(db!, 'recovery_credores', id), { status: novoStatus });
      } catch (error) {
        alert("Erro ao alterar status da empresa credora.");
      }
    }
  };

  const handleSalvarComissoes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db!, 'configuracoes', `recovery_${user?.tenantId || 'master'}`), comissoes);
      alert("Estrutura de comissionamento atualizada e aplicada a novos acordos.");
    } catch (error) {
      // Caso não exista, cria o documento
      await setDoc(doc(db!, 'configuracoes', `recovery_${user?.tenantId || 'master'}`), comissoes);
      alert("Estrutura de comissionamento salva.");
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO ADMIN */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" /> Gestão GSA Recovery
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Administração de clientes B2B, comissionamento e volume financeiro.</p>
          </div>
          {activeTab === 'CREDORES' && (
            <button onClick={() => setModalNovoCredor(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md transition-all">
              <Plus className="w-4 h-4"/> Novo Cliente Credor
            </button>
          )}
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex flex-wrap gap-2 text-[10px] md:text-sm border-b border-slate-200 pb-2">
          <button onClick={() => setActiveTab('VISAO_GERAL')} className={`px-3 md:px-4 py-3 whitespace-nowrap font-bold border-b-2 transition-colors ${activeTab === 'VISAO_GERAL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Visão Geral</button>
          <button onClick={() => setActiveTab('CREDORES')} className={`px-3 md:px-4 py-3 whitespace-nowrap font-bold border-b-2 transition-colors ${activeTab === 'CREDORES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Empresas Parceiras</button>
          <button onClick={() => setActiveTab('LEADS')} className={`px-3 md:px-4 py-3 whitespace-nowrap font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'LEADS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Leads B2B
            {leads.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px]">{leads.length}</span>
            )}
          </button>
          {(isMaster || isAdminGeral) && (
            <button onClick={() => setActiveTab('COMISSOES')} className={`px-3 md:px-4 py-3 whitespace-nowrap font-bold border-b-2 transition-colors ${activeTab === 'COMISSOES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Taxas & Comissões</button>
          )}
        </div>

        {/* ABA: VISÃO GERAL */}
        {activeTab === 'VISAO_GERAL' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Empresas B2B</p><h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{credores.length}</h3></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Vol. Cobrança</p><h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">R$ 0,00</h3></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Acordos</p><h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">0</h3></div>
              <div className="bg-indigo-900 p-5 rounded-2xl border border-indigo-800 shadow-md"><p className="text-[10px] font-bold text-indigo-300 uppercase">Receita Câmara</p><h3 className="text-2xl sm:text-3xl font-black text-white mt-1">R$ 0,00</h3></div>
            </div>
            
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Gráfico de Arrecadação</h3>
              <p className="text-sm text-slate-500">Os dados começarão a aparecer assim que as empresas credoras subirem as suas carteiras.</p>
            </div>
          </div>
        )}

        {/* ABA: EMPRESAS CREDORAS */}
        {activeTab === 'CREDORES' && (
          <div className="animate-in fade-in">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                    <th className="p-4">Empresa (Razão Social)</th>
                    <th className="p-4">Contato / E-mail</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {credores.map((cred: any) => (
                    <tr key={cred.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4"><p className="font-bold text-slate-900">{cred.razao_social}</p><span className="text-[10px] text-slate-400 font-mono">CNPJ: {cred.cnpj}</span></td>
                      <td className="p-4"><p className="font-semibold text-slate-800">{cred.responsavel}</p><span className="text-xs text-slate-500">{cred.email}</span></td>
                      <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-bold text-[10px] uppercase">{cred.plano}</span></td>
                      <td className="p-4">
                        <span className={`${cred.status === 'SUSPENSO' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} px-2 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer`} onClick={() => handleAlterarStatus(cred.id, cred.status)}>
                          {cred.status || 'ATIVO'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex gap-1 justify-end">
                        <button onClick={() => navigate(`${slugPrefix}/painel/recovery-credor?tenantId=${cred.tenantId}`)} className="text-xs bg-slate-100 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-lg text-slate-700">Dashboard</button>
                        <button onClick={() => handleEditCredor(cred)} className="text-xs bg-indigo-50 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-lg text-indigo-700">Editar</button>
                        <button onClick={() => handleExcluirCredor(cred.id)} className="text-xs bg-red-50 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg text-red-700">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {credores.length === 0 && <div className="p-8 text-center text-slate-500 font-medium">Nenhuma empresa credora cadastrada.</div>}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {credores.map((cred: any) => (
                <div key={cred.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900 leading-tight">{cred.razao_social}</p>
                    <span className={`${cred.status === 'SUSPENSO' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} px-2 py-0.5 rounded-full text-[10px] font-bold uppercase`}>{cred.status || 'ATIVO'}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">CNPJ: {cred.cnpj}</p>
                  <p className="text-sm text-slate-800 font-semibold">{cred.responsavel} <br/> <span className="text-xs text-slate-500 font-normal">{cred.email}</span></p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-bold text-[10px] uppercase">{cred.plano}</span>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => navigate(`${slugPrefix}/painel/recovery-credor?tenantId=${cred.tenantId}`)} className="text-[10px] bg-slate-100 font-bold px-2 py-1 rounded-lg text-slate-700">Dash</button>
                      <button onClick={() => handleEditCredor(cred)} className="text-[10px] bg-indigo-50 font-bold px-2 py-1 rounded-lg text-indigo-700">Editar</button>
                      <button onClick={() => handleExcluirCredor(cred.id)} className="text-[10px] bg-red-50 font-bold px-2 py-1 rounded-lg text-red-700">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
              {credores.length === 0 && <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border">Nenhuma empresa credora cadastrada.</div>}
            </div>
          </div>
        )}

        {/* ABA: LEADS DE EMPRESAS */}
        {activeTab === 'LEADS' && (
          <div className="animate-in fade-in space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center text-xs">{leads.length}</span>
                  Empresas Interessadas
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                      <th className="p-4">Razão Social</th>
                      <th className="p-4">CNPJ</th>
                      <th className="p-4">Responsável</th>
                      <th className="p-4">Contato</th>
                      <th className="p-4">Origem</th>
                      <th className="p-4">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{lead.razao_social}</td>
                        <td className="p-4 font-mono text-xs">{lead.cnpj}</td>
                        <td className="p-4 font-semibold text-slate-800">{lead.responsavel}</td>
                        <td className="p-4">
                          <span className="block text-xs font-semibold text-slate-700">{lead.telefone}</span>
                          <span className="block text-[10px] text-slate-500">{lead.email}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-1 rounded border border-slate-200">
                            {lead.tenantId || 'master'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                          Nenhum cadastro pendente no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA: CONFIGURAÇÃO DE TAXAS & COMISSÕES MESTRE */}
        {activeTab === 'COMISSOES' && (
          <form onSubmit={handleSalvarComissoes} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-600"/> Parâmetros Financeiros do Ecossistema
              </h2>
              <p className="text-sm text-slate-500 mt-1">Defina os custos cobrados das empresas parceiras e a divisão automatizada de comissões por transação líquida.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* TABELA DE PREÇOS COBRADOS DO CLIENTE CREDOR */}
              <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">Precificação de Serviços Extrajudiciais</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo por Assinatura Digital Individual (R$)</label>
                  <input type="number" step="0.01" value={comissoes.taxa_assinatura_individual} onChange={e => setComissoes({...comissoes, taxa_assinatura_individual: Number(e.target.value)})} className="w-full p-3 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">Valor faturado por requisição de documento enviado ao Assinafy (Signatários Ilimitados).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Taxa de Notificação / AR Omnichannel (R$)</label>
                  <input type="number" step="0.01" value={comissoes.taxa_notificacao} onChange={e => setComissoes({...comissoes, taxa_notificacao: Number(e.target.value)})} className="w-full p-3 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">Custo de disparo por devedor inserido na régua consensual de cobrança.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Taxa de Êxito sobre Recuperação (%)</label>
                  <input type="number" value={comissoes.taxa_exito_padrao} onChange={e => setComissoes({...comissoes, taxa_exito_padrao: Number(e.target.value)})} className="w-full p-3 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">Percentual retido pela Câmara sobre o montante recuperado de acordos fechados.</p>
                </div>
              </div>

              {/* DIVISÃO DE COMISSÕES (SPLIT AUTOMÁTICO) */}
              <div className="space-y-4 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wider border-b border-indigo-200 pb-2">Regras de Comissionamento e Parcerias (%)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-white p-3 rounded-xl border border-indigo-100 mb-2">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">As porcentagens abaixo definem o repasse automático sobre a receita líquida gerada pelas cobranças e assinaturas da carteira cadastrada.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Unidade Credenciada</label>
                    <input type="number" value={comissoes.split_unidade} onChange={e => setComissoes({...comissoes, split_unidade: Number(e.target.value)})} className="w-full p-3 border border-indigo-200 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-[9px] text-indigo-400 mt-0.5">Fatia da Unidade Regional.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Vendedor / Consultor</label>
                    <input type="number" value={comissoes.split_vendedor} onChange={e => setComissoes({...comissoes, split_vendedor: Number(e.target.value)})} className="w-full p-3 border border-indigo-200 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-[9px] text-indigo-400 mt-0.5">Comissão do fechamento B2B.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Influence / Afiliado</label>
                    <input type="number" value={comissoes.split_influencer} onChange={e => setComissoes({...comissoes, split_influencer: Number(e.target.value)})} className="w-full p-3 border border-indigo-200 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-[9px] text-indigo-400 mt-0.5">Parceiro de divulgação digital.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Indicação Direta</label>
                    <input type="number" value={comissoes.split_indicacao} onChange={e => setComissoes({...comissoes, split_indicacao: Number(e.target.value)})} className="w-full p-3 border border-indigo-200 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-[9px] text-indigo-400 mt-0.5">Bônus de cliente indica cliente.</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-md transition-all">
                Salvar Configurações Gerais de Receita
              </button>
            </div>
          </form>
        )}

      </div>

      {/* MODAL CADASTRAR EMPRESA CREDORA */}
      {modalNovoCredor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSalvarCredor} className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div><h2 className="text-xl font-bold text-slate-900">Nova Empresa Credora</h2><p className="text-xs text-slate-500 mt-1">Crie o acesso para o seu cliente B2B enviar carteiras de dívida.</p></div>
            <div className="space-y-3 pt-2">
              <input type="text" placeholder="Razão Social ou Nome Fantasia" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.razao_social} onChange={e => setFormCredor({...formCredor, razao_social: e.target.value})} />
              <input type="text" placeholder="CNPJ" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.cnpj} onChange={e => setFormCredor({...formCredor, cnpj: e.target.value})} />
              <div className="flex gap-2">
                <input type="text" placeholder="URL da Logo da Empresa (Opcional)" className="w-full p-3 border rounded-xl text-sm" value={formCredor.logo_url} onChange={e => setFormCredor({...formCredor, logo_url: e.target.value})} />
                <button type="button" onClick={() => logoInputRef.current?.click()} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 rounded-xl flex items-center justify-center transition-colors">
                  {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                </button>
                <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />
              </div>
              <input type="text" placeholder="Nome do Responsável" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.responsavel} onChange={e => setFormCredor({...formCredor, responsavel: e.target.value})} />
              <input type="email" placeholder="E-mail de Acesso (Login do Credor)" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.email} onChange={e => setFormCredor({...formCredor, email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (DDD+Número)" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.telefone} onChange={e => setFormCredor({...formCredor, telefone: e.target.value})} />
              
              <label className="block text-xs font-bold text-slate-500 uppercase mt-2">Selecionar Plano de Contrato</label>
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-indigo-900 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={formCredor.plano} 
                onChange={e => {
                  const planoSelecionado = e.target.value;
                  let novaTaxa = 0;
                  setFormCredor({...formCredor, plano: planoSelecionado, taxa_notificacao_padrao: novaTaxa});
                }}
              >
                <option value="START">START - Gratuito (Notificação R$ 0,00)</option>
                <option value="BUSINESS">BUSINESS - R$ 497/mês (Notificação R$ 0,00)</option>
                <option value="ENTERPRISE">ENTERPRISE - Customizado</option>
              </select>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Taxa de Notificação Acordada (R$)</label>
                <input type="number" step="0.01" required className="w-full p-3 border rounded-xl text-sm bg-indigo-50 font-bold" value={formCredor.taxa_notificacao_padrao} onChange={e => setFormCredor({...formCredor, taxa_notificacao_padrao: Number(e.target.value)})} />
                <p className="text-[10px] text-slate-400 mt-1">Este valor será sugerido como padrão para este credor quando ele enviar dívidas.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Margem Desconto Máximo (%)</label>
                  <input type="number" step="1" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.margem_desconto_maximo} onChange={e => setFormCredor({...formCredor, margem_desconto_maximo: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd. Máxima Parcelas</label>
                  <input type="number" step="1" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.max_parcelas} onChange={e => setFormCredor({...formCredor, max_parcelas: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max. Propostas Antes Jurídico</label>
                  <input type="number" step="1" required className="w-full p-3 border rounded-xl text-sm" value={formCredor.max_propostas_antes_juridico} onChange={e => setFormCredor({...formCredor, max_propostas_antes_juridico: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Taxa de Êxito Cobrada (%)</label>
                  <input type="number" step="1" required className="w-full p-3 border rounded-xl text-sm bg-indigo-50 font-bold" value={formCredor.taxa_exito_credor_pct} onChange={e => setFormCredor({...formCredor, taxa_exito_credor_pct: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button type="button" onClick={() => setModalNovoCredor(false)} className="w-1/3 bg-slate-100 font-bold py-3.5 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" className="w-2/3 bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md">Cadastrar e Enviar Acesso</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CRIAR ASSINATURA ELETRÔNICA DIRETAMENTE DO ADMIN foi removido */}
    </div>
  );
}
