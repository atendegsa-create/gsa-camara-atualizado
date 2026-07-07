import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, getFirebaseStorage, ref, uploadBytes, getDownloadURL } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Building2, 
  Plus, 
  Search, 
  Save, 
  X, 
  Percent, 
  User, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  List,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Loader2,
  CircleDollarSign,
  DollarSign,
  Palette,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Tenant } from '../types';
import { useAuth } from '../AuthContext';

export const AdminUnitManager: React.FC = () => {
  const { isMasterAdmin } = useAuth();
  const location = useLocation();
  const [units, setUnits] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'visual' | 'comissoes'>('geral');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    nome_unidade: '',
    documento_cnpj: '',
    responsavel: '',
    email: '',
    telefone: '',
    slug: '',
    regiao_atuacao: '',
    // Financeiro
    asaasWalletId: '',
    taxaAdministrativaPadrao: 347,
    comissaoExtrajudicial: 30,
    comissaoJudicial: 15,
    // Config Contrato
    valorAdesao: 1500,
    entradaPaga: 297,
    valorMensalidade: 150,
    diaVencimentoMensalidade: 5,
    // Regras Comissao
    extrajudicialDiretoRoyalties: 0,
    extrajudicialBaseGsa: 50,
    judicialTaxa: 15,
    // Visual
    primaryColor: '#6366f1',
    secondaryColor: '#4f46e5',
    logoUrl: ''
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem selecionada é muito grande. O tamanho máximo permitido é 2MB.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, logoUrl: base64String }));
        setIsUploadingLogo(false);
      };
      reader.onerror = () => {
        alert("Erro ao ler o arquivo.");
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro no upload do logotipo:", error);
      alert("Houve um erro ao enviar o arquivo. Verifique sua conexão ou tente novamente mais tarde.");
      setIsUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (!isMasterAdmin) return;

    const q = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
      setUnits(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tenants');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isMasterAdmin]);

  useEffect(() => {
    if (location.state?.editingUnit) {
      handleEdit(location.state.editingUnit);
      // Limpa o state para não reabrir ao mudar de aba interna
      window.history.replaceState({}, document.title);
    } else if (location.state?.isAdding) {
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEdit = (unit: Tenant) => {
    setEditingId(unit.id);
    setFormData({
      nome_unidade: unit.nome_unidade || '',
      documento_cnpj: unit.documento_cnpj || '',
      responsavel: unit.responsavel || '',
      email: unit.email || '',
      telefone: unit.telefone || '',
      slug: unit.slug || '',
      regiao_atuacao: unit.regiao_atuacao || '',
      asaasWalletId: unit.financeiro?.asaasWalletId || '',
      taxaAdministrativaPadrao: unit.financeiro?.taxaAdministrativaPadrao || 347,
      comissaoExtrajudicial: unit.financeiro?.comissaoExtrajudicial || 30,
      comissaoJudicial: unit.financeiro?.comissaoJudicial || 15,
      valorAdesao: unit.configContrato?.valorAdesao ?? 1500,
      entradaPaga: unit.configContrato?.entradaPaga ?? 297,
      valorMensalidade: unit.configContrato?.valorMensalidade ?? 150,
      diaVencimentoMensalidade: unit.configContrato?.diaVencimentoMensalidade ?? 5,
      extrajudicialDiretoRoyalties: unit.regrasComissao?.extrajudicialDiretoRoyalties ?? 0,
      extrajudicialBaseGsa: unit.regrasComissao?.extrajudicialBaseGsa ?? 50,
      judicialTaxa: unit.regrasComissao?.judicialTaxa ?? 15,
      primaryColor: unit.white_label?.primaryColor || '#6366f1',
      secondaryColor: unit.white_label?.secondaryColor || '#4f46e5',
      logoUrl: unit.white_label?.logoUrl || ''
    });
    setShowForm(true);
    setActiveTab('geral');
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess('');

    try {
      const unitData: any = {
        nome_unidade: formData.nome_unidade,
        documento_cnpj: formData.documento_cnpj,
        responsavel: formData.responsavel,
        email: formData.email,
        telefone: formData.telefone,
        slug: formData.slug,
        regiao_atuacao: formData.regiao_atuacao,
        status: 'ATIVO',
        financeiro: {
          asaasWalletId: formData.asaasWalletId,
          taxaAdministrativaPadrao: Number(formData.taxaAdministrativaPadrao),
          comissaoExtrajudicial: Number(formData.comissaoExtrajudicial),
          comissaoJudicial: Number(formData.comissaoJudicial),
          // Fallbacks para compatibilidade
          taxas: {
            administrativa: Number(formData.taxaAdministrativaPadrao)
          },
          comissoes: {
            extrajudicial_percentual: Number(formData.comissaoExtrajudicial),
            judicial_percentual: Number(formData.comissaoJudicial)
          }
        },
        configContrato: {
          valorAdesao: Number(formData.valorAdesao),
          entradaPaga: Number(formData.entradaPaga),
          saldoAdesaoAberto: Number(formData.valorAdesao) - Number(formData.entradaPaga),
          valorMensalidade: Number(formData.valorMensalidade),
          diaVencimentoMensalidade: Number(formData.diaVencimentoMensalidade)
        },
        regrasComissao: {
          extrajudicialDiretoRoyalties: Number(formData.extrajudicialDiretoRoyalties),
          extrajudicialBaseGsa: Number(formData.extrajudicialBaseGsa),
          judicialTaxa: Number(formData.judicialTaxa)
        },
        white_label: {
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          logoUrl: formData.logoUrl
        },
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'tenants', editingId), unitData);
        setSuccess('Unidade atualizada com sucesso!');
      } else {
        unitData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'tenants'), unitData);
        setSuccess('Unidade cadastrada com sucesso!');
      }

      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
        setEditingId(null);
        resetForm();
      }, 2000);
    } catch (error) {
      console.error("Erro ao salvar unidade:", error);
      alert("Falha ao salvar unidade.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_unidade: '',
      documento_cnpj: '',
      responsavel: '',
      email: '',
      telefone: '',
      slug: '',
      regiao_atuacao: '',
      asaasWalletId: '',
      taxaAdministrativaPadrao: 347,
      comissaoExtrajudicial: 30,
      comissaoJudicial: 15,
      valorAdesao: 1500,
      entradaPaga: 297,
      valorMensalidade: 150,
      diaVencimentoMensalidade: 5,
      extrajudicialDiretoRoyalties: 0,
      extrajudicialBaseGsa: 50,
      judicialTaxa: 15,
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      logoUrl: ''
    });
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);

  const handleDeleteUnit = (unitId: string, unitName: string) => {
    setDeleteConfirm({ id: unitId, name: unitName });
  };

  const executeDeleteUnit = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'tenants', deleteConfirm.id));
      // Optionally fire a toast notification here
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Erro ao excluir unidade:", error);
      alert("Erro ao excluir. Verifique as permissões de acesso e segurança (apenas admin master consegue deletar units).");
      setDeleteConfirm(null);
    }
  };


  const filteredUnits = units.filter(u => 
    u.nome_unidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.documento_cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isMasterAdmin) return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
        <ShieldCheck size={40} />
      </div>
      <h3 className="text-2xl font-serif font-black text-gray-900 mb-2 tracking-tight">Acesso Restrito</h3>
      <p className="text-gray-500 font-medium max-w-sm">
        Este painel é exclusivo para o MasterAdmin da Câmara GSA.
      </p>
    </div>
  );

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto pb-24">
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden bg-white/40 backdrop-blur-3xl border border-white/20 p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-indigo-600/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 transform hover:rotate-3 transition-transform">
              <Building2 size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-serif font-black text-gray-900 tracking-tight leading-none mb-2">
                Gestão de Credenciadas
              </h1>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/50">
                  <ShieldCheck size={12} /> Master Admin
                </span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">
                  {units.length} Unidades Ativas
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              setEditingId(null);
              resetForm();
              setShowForm(true);
            }}
            className="w-full md:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Nova Unidade Credenciada
          </button>
        </div>

        {/* Abstract shapes for glassmorphism effect */}
        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[5%] w-96 h-96 bg-purple-200/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* SEARCH AND CONTROLS */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Filtrar por nome da unidade ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-5 bg-white/60 backdrop-blur-xl border border-gray-100 rounded-[2rem] outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium text-sm shadow-sm"
          />
        </div>
        <div className="flex items-center bg-gray-100/50 p-2 rounded-2xl border border-gray-200/50">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-3 rounded-xl transition-all",
              viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "p-3 rounded-xl transition-all",
              viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 size={48} className="animate-spin text-indigo-600" />
            <p className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] animate-pulse">Sincronizando Hub Hub GSA...</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 border-2 border-dashed border-gray-200 rounded-[3rem] text-center px-6">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
              <Building2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma unidade encontrada</h3>
            <p className="text-sm text-gray-500 max-w-xs font-medium">
              Não há unidades que correspondam ao seu filtro ou você ainda não cadastrou sua primeira parceira.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredUnits.map((unit) => (
              <motion.div
                key={unit.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-white rounded-[2.5rem] border border-gray-100 hover:border-indigo-600 shadow-xl shadow-black/5 hover:shadow-indigo-600/10 transition-all overflow-hidden flex flex-col h-full"
              >
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner border border-gray-100 group-hover:scale-110 transition-transform overflow-hidden p-2">
                      {unit.white_label?.logoUrl ? (
                         <img src={unit.white_label.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                         <span className="text-2xl font-black text-indigo-600">{unit.nome_unidade?.charAt(0)}</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border",
                      unit.status === 'ATIVO' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {unit.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-serif font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                      {unit.nome_unidade}
                    </h3>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
                      <Briefcase size={12} className="text-indigo-400" /> CNPJ: {unit.documento_cnpj}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-tighter mb-1">C. Extrajudicial</p>
                      <div className="flex items-center gap-1.5 text-indigo-600 font-black">
                        <Percent size={14} />
                        <span>{unit.financeiro?.comissaoExtrajudicial || 0}%</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-tighter mb-1">C. Judicial</p>
                      <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                        <Percent size={14} />
                        <span>{unit.financeiro?.comissaoJudicial || 0}%</span>
                      </div>
                    </div>
                    <div className="col-span-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-[8px] font-black uppercase text-indigo-400 mb-1">Wallet Asaas</p>
                      <p className="text-[10px] font-mono text-indigo-700 truncate">{unit.financeiro?.asaasWalletId || 'Não configurado'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                      <User size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-500 truncate max-w-[100px]">
                      {unit.responsavel || 'Sem Gestor'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(unit)}
                      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUnit(unit.id, unit.nome_unidade)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir Unidade"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-6">Unidade / Responsável</th>
                    <th className="px-8 py-6">ID Asaas</th>
                    <th className="px-8 py-6">Comissões (E/J)</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden p-1.5">
                            {u.white_label?.logoUrl ? (
                              <img src={u.white_label.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-indigo-600 font-black">{u.nome_unidade?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{u.nome_unidade}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">CNPJ: {u.documento_cnpj}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {u.financeiro?.asaasWalletId || '---'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-indigo-600">Extr: {u.financeiro?.comissaoExtrajudicial || 0}%</span>
                          <span className="text-[10px] font-bold text-emerald-600">Jud: {u.financeiro?.comissaoJudicial || 0}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border",
                          u.status === 'ATIVO' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                        )}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(u)}
                            className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm"
                          >
                            <ChevronRight size={20} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUnit(u.id, u.nome_unidade)}
                            className="p-3 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm"
                            title="Excluir Unidade"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD UNIT FORM MODAL */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/90 backdrop-blur-2xl w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-black text-gray-900 tracking-tight">
                      {editingId ? 'Configurações Unidade' : 'Nova Unidade'}
                    </h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      {editingId ? `Editando: ${formData.nome_unidade}` : 'Cadastro de Unidade Credenciada'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* TABS NAVEGAÇÃO MODAL */}
              <div className="px-8 pt-4 flex gap-6 border-b border-gray-50 bg-gray-50/30">
                {[
                  { id: 'geral', label: 'Dados Gerais', icon: Building2 },
                  { id: 'financeiro', label: 'Financeiro / Asaas', icon: CircleDollarSign },
                  { id: 'comissoes', label: 'Comissões', icon: Percent },
                  { id: 'visual', label: 'Identidade Visual', icon: Palette }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 py-4 px-2 border-b-4 transition-all text-[10px] font-black uppercase tracking-widest",
                        activeTab === tab.id 
                          ? "border-indigo-600 text-indigo-600" 
                          : "border-transparent text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSaveUnit} className="p-8 space-y-6 max-h-[65vh] overflow-y-auto">
                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-50 text-green-700 p-4 rounded-2xl flex items-center gap-3 border border-green-100">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-bold">{success}</span>
                  </motion.div>
                )}

                <div className="space-y-8 pb-12">
                  {/* CONTEÚDO TABS */}
                  {activeTab === 'geral' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome da Unidade</label>
                        <input 
                          required
                          type="text"
                          value={formData.nome_unidade}
                          onChange={(e) => setFormData({...formData, nome_unidade: e.target.value})}
                          placeholder="Ex: GSA Porto Alegre"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">CNPJ</label>
                        <input 
                          required
                          type="text"
                          value={formData.documento_cnpj}
                          onChange={(e) => setFormData({...formData, documento_cnpj: e.target.value})}
                          placeholder="00.000.000/0001-00"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Responsável (Gestor)</label>
                        <input 
                          required
                          type="text"
                          value={formData.responsavel}
                          onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                          placeholder="Nome do Gestor"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Identificador URL (Slug)</label>
                        <input 
                          required
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                          placeholder="gsa-porto-alegre"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">E-mail Corporativo</label>
                        <input 
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="contato@unidade.com"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Telefone / WhatsApp</label>
                        <input 
                          type="text"
                          value={formData.telefone}
                          onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                          placeholder="(00) 00000-0000"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Região de Atuação / Endereço</label>
                        <input 
                          type="text"
                          value={formData.regiao_atuacao}
                          onChange={(e) => setFormData({...formData, regiao_atuacao: e.target.value})}
                          placeholder="Ex: Rio Grande do Sul - Serra Gaúcha"
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'financeiro' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                          ID da Carteira Asaas (Wallet ID) <span className="text-[8px] bg-indigo-50 text-indigo-600 px-2 rounded tracking-normal normal-case">Necessário para Split</span>
                        </label>
                        <input 
                          type="text"
                          value={formData.asaasWalletId}
                          onChange={(e) => setFormData({...formData, asaasWalletId: e.target.value})}
                          placeholder="Ex: b65a45..."
                          className="w-full px-6 py-4 bg-indigo-50/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Taxa Administrativa Padrão (TAP)</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                          <input 
                            type="number"
                            value={formData.taxaAdministrativaPadrao}
                            onChange={(e) => setFormData({...formData, taxaAdministrativaPadrao: Number(e.target.value)})}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Valor da Adesão</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                          <input 
                            type="number"
                            value={formData.valorAdesao}
                            onChange={(e) => setFormData({...formData, valorAdesao: Number(e.target.value)})}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Entrada Paga</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                          <input 
                            type="number"
                            value={formData.entradaPaga}
                            onChange={(e) => setFormData({...formData, entradaPaga: Number(e.target.value)})}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Mensalidade Franquia</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                          <input 
                            type="number"
                            value={formData.valorMensalidade}
                            onChange={(e) => setFormData({...formData, valorMensalidade: Number(e.target.value)})}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Dia Venc. Mensalidade</label>
                        <div className="relative">
                          <input 
                            type="number"
                            min="1"
                            max="31"
                            value={formData.diaVencimentoMensalidade}
                            onChange={(e) => setFormData({...formData, diaVencimentoMensalidade: Number(e.target.value)})}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 pt-2">
                        <div className="bg-indigo-50 text-indigo-700 text-xs font-bold p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                          <span>Saldo de Adesão em Aberto Inicial (Calculado):</span>
                          <span className="text-sm font-black text-indigo-900">R$ {(Number(formData.valorAdesao) - Number(formData.entradaPaga)).toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'comissoes' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Old comissao fields mapped to new */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Comissão Extrajudicial Geral (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={formData.comissaoExtrajudicial}
                            onChange={(e) => setFormData({...formData, comissaoExtrajudicial: Number(e.target.value)})}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                          <Percent className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Comissão Judicial Geral (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={formData.comissaoJudicial}
                            onChange={(e) => setFormData({...formData, comissaoJudicial: Number(e.target.value)})}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                          <Percent className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 pt-4">
                        <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest mb-4">Regras Específicas</h4>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Extrajudicial Direto (Royalties GSA Master %)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={formData.extrajudicialDiretoRoyalties}
                            onChange={(e) => setFormData({...formData, extrajudicialDiretoRoyalties: Number(e.target.value)})}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                          <Percent className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Extrajudicial Base GSA (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={formData.extrajudicialBaseGsa}
                            onChange={(e) => setFormData({...formData, extrajudicialBaseGsa: Number(e.target.value)})}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                          <Percent className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Judicial Taxa (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={formData.judicialTaxa}
                            onChange={(e) => setFormData({...formData, judicialTaxa: Number(e.target.value)})}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                          <Percent className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {activeTab === 'visual' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cor Primária</label>
                        <div className="flex gap-4">
                          <input 
                            type="color"
                            value={formData.primaryColor}
                            onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                            className="w-20 h-14 bg-gray-50 p-1 border-2 border-transparent rounded-2xl cursor-pointer"
                          />
                          <input 
                            type="text"
                            value={formData.primaryColor}
                            onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                            className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cor Secundária</label>
                        <div className="flex gap-4">
                          <input 
                            type="color"
                            value={formData.secondaryColor}
                            onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                            className="w-20 h-14 bg-gray-50 p-1 border-2 border-transparent rounded-2xl cursor-pointer"
                          />
                          <input 
                            type="text"
                            value={formData.secondaryColor}
                            onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                            className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">URL do Logotipo</label>
                        <div className="flex flex-col md:flex-row gap-4">
                          <input 
                            type="url"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                            placeholder="https://exemplo.com/logo.png"
                            className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          />
                          <div className="relative overflow-hidden w-full md:w-auto shrink-0 flex items-center justify-center">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleLogoUpload}
                              disabled={isUploadingLogo}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                            />
                            <div className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-500 text-indigo-600 px-6 py-4 rounded-2xl flex items-center justify-center gap-2 w-full transition-colors cursor-pointer text-sm font-bold">
                               {isUploadingLogo ? (
                                  <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                               ) : (
                                  <><UploadCloud className="w-5 h-5" /> Enviar Logotipo (PNG/JPG)</>
                               )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 ml-4 mt-2">
                          <strong className="text-gray-500">Tamanho padrão:</strong> Proporção recomendada de 200x50 pixels ou formato horizontal. Máximo de 2MB. Fundo transparente.
                        </p>
                      </div>

                      <div className="md:col-span-2 pt-8">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-4">Preview de Identidade (White-Label)</p>
                        <div className="bg-gray-50 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-6">
                          {formData.logoUrl && (
                             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-w-[150px] mb-2">
                               <img src={formData.logoUrl} alt="Logo Preview" className="h-10 w-full object-contain" />
                             </div>
                          )}
                          <div 
                            className="w-32 h-12 rounded-xl shadow-lg flex items-center justify-center text-white font-black text-xs uppercase tracking-widest"
                            style={{ backgroundImage: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
                          >
                            BOTÃO TEMA
                          </div>
                          <div className="flex gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.primaryColor }}></div>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.secondaryColor }}></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white/90 backdrop-blur-md pt-6 flex justify-end gap-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-8 py-4 font-bold text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-3"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {editingId ? 'Salvar Alterações' : 'Salvar e Ativar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-3 text-red-600">
                <Trash2 size={24} />
                <h3 className="text-lg font-bold">Excluir Unidade</h3>
              </div>
              <div className="p-6 text-gray-800">
                <p className="mb-4">
                  ATENÇÃO: Tem certeza que deseja excluir DEFINITIVAMENTE a unidade <strong className="text-black">"{deleteConfirm.name}"</strong>?
                </p>
                <p className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100 mb-6">
                  Esta ação é irreversível e excluirá o acesso de todos os usuários atrelados a ela.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
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
