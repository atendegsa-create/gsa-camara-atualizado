import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, deleteDoc, orderBy, where } from 'firebase/firestore';
import { UserProfile, UserRole, Tenant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Mail, 
  Shield, 
  Trash2, 
  Loader2, 
  Search, 
  X, 
  Eye,
  AlertCircle,
  Building2,
  Edit2,
  Zap,
  Key
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';

export function UserManagementView() {
  const { startImpersonation, isMaster, profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'conflicts'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUser, setNewUser] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: 'CLIENTE' as UserRole,
    documento: '',
    whatsapp: '',
    tenantId: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserProfile> & { id: string, email: string }>({
    id: '', nome_completo: '', documento: '', whatsapp: '', tenantId: '', email: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<{id: string, name: string}>({ id: '', name: '' });
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    let qUsers;
    if (isMaster) {
      qUsers = query(collection(db, 'usuarios'));
    } else {
      qUsers = query(collection(db, 'usuarios'), where('tenantId', '==', profile?.tenantId || ''));
    }
    
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'usuarios');
      setLoading(false);
    });

    const qTenants = query(collection(db, 'tenants'));
    const unsubscribeTenants = onSnapshot(qTenants, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
      setTenants(docs);
    });

    let unsubscribeConflicts = () => {};
    if (isMaster) {
      const qConflicts = query(collection(db, 'conflitos_cadastro'), orderBy('data', 'desc'));
      unsubscribeConflicts = onSnapshot(qConflicts, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConflicts(docs);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'conflitos_cadastro');
      });
    }

    return () => {
      unsubscribeUsers();
      unsubscribeTenants();
      unsubscribeConflicts();
    };
  }, []);

  const handleResolveConflict = async (conflictId: string, status: 'RESOLVIDO' | 'REJEITADO') => {
    try {
      await updateDoc(doc(db, 'conflitos_cadastro', conflictId), { status });
    } catch (error) {
      console.error("Erro ao resolver conflito:", error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nome || !newUser.email || !newUser.senha) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/users/criar-membro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: newUser.nome,
          email: newUser.email,
          senha: newUser.senha,
          role: newUser.tipo,
          tenantId: newUser.tenantId || null
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      alert("Usuário criado com sucesso!");
      setIsModalOpen(false);
      setNewUser({ nome: '', email: '', senha: '', tipo: 'CLIENTE', documento: '', whatsapp: '', tenantId: '' });
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      alert("Erro ao criar usuário: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), { tipo_usuario: newRole });
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
    }
  };

  const handleUpdateUserDetails = async () => {
    if (!editingUser.id || !editingUser.nome_completo) return;
    setIsUpdating(true);
    try {
      const originalUser = users.find(u => u.id === editingUser.id);
      
      // Se o email foi alterado, precisamos atualizar na Auth primeiro
      if (originalUser && originalUser.email !== editingUser.email) {
        const response = await fetch('/api/users/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: editingUser.id, newEmail: editingUser.email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao atualizar email na Auth');
      }

      await updateDoc(doc(db, 'usuarios', editingUser.id), {
        nome_completo: editingUser.nome_completo,
        email: editingUser.email,
        documento: editingUser.documento || '',
        whatsapp: editingUser.whatsapp || '',
        tenantId: editingUser.tenantId || null
      });
      alert("Usuário atualizado com sucesso!");
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Erro ao atualizar usuário: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'PENDENTE' | 'APROVADO' | 'REJEITADO') => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), { status: newStatus });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetUser.id || newPassword.length < 6) return;
    setIsResettingPassword(true);
    try {
      const response = await fetch('/api/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: passwordResetUser.id, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar senha');
      alert("Senha atualizada com sucesso!");
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (error: any) {
      console.error(error);
      alert("Erro ao atualizar senha: " + error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Gestão de Usuários</h2>
          <p className="text-gray-500">Administre os acessos e papéis da plataforma.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeSubTab === 'users' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Usuários
            </button>
            <button 
              onClick={() => setActiveSubTab('conflicts')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeSubTab === 'conflicts' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Conflitos
              {conflicts.filter(c => c.status === 'PENDENTE').length > 0 && (
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-lg"
          >
            <Plus size={20} />
            Novo Usuário
          </button>
        </div>
      </header>

      {activeSubTab === 'users' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Papel</th>
                  <th className="px-6 py-4">Auditoria</th>
                  <th className="px-6 py-4">Permissões</th>
                  <th className="px-6 py-4">Documento / WhatsApp</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="animate-spin mx-auto text-[#5A5A40]" size={32} />
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.nome_completo.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.nome_completo}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.tenantId && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">
                              {tenants.find(t => t.id === user.tenantId)?.nome_unidade || 'Unidade Desconhecida'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.status || 'APROVADO'}
                        onChange={(e) => handleUpdateStatus(user.id, e.target.value as any)}
                        disabled={user.email === 'atende.gsa@gmail.com'}
                        className={cn(
                          "text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-primary",
                          (user.status || 'APROVADO') === 'APROVADO' ? "bg-green-50 text-green-600" :
                          user.status === 'PENDENTE' ? "bg-orange-50 text-orange-600" :
                          "bg-red-50 text-red-600"
                        )}
                      >
                        <option value="PENDENTE">PENDENTE</option>
                        <option value="APROVADO">APROVADO</option>
                        <option value="REJEITADO">REJEITADO</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.tipo_usuario}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                        disabled={user.email === 'atende.gsa@gmail.com'}
                        className={cn(
                          "text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-primary",
                          user.tipo_usuario === 'MASTER' ? "bg-indigo-50 text-indigo-600" :
                          user.tipo_usuario === 'DIRETOR' ? "bg-purple-50 text-purple-600" :
                          user.tipo_usuario === 'UNIDADE' ? "bg-amber-50 text-amber-600" :
                          user.tipo_usuario === 'ADVOGADO' ? "bg-blue-50 text-blue-600" :
                          "bg-gray-50 text-gray-600"
                        )}
                      >
                        <option value="CLIENTE">CLIENTE</option>
                        <option value="AFILIADO">AFILIADO</option>
                        <option value="CONSULTOR">CONSULTOR</option>
                        <option value="ADVOGADO">ADVOGADO</option>
                        <option value="MEDIADOR">MEDIADOR</option>
                        <option value="CONCILIADOR">CONCILIADOR</option>
                        <option value="UNIDADE">ADMIN UNIDADE</option>
                        <option value="DIRETOR">DIRETOR REGIONAL</option>
                        <option value="MASTER">GSA MASTER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox"
                          checked={user.can_audit || false}
                          disabled={user.tipo_usuario === 'CLIENTE' || user.email === 'atende.gsa@gmail.com'}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, 'usuarios', user.id), { can_audit: e.target.checked });
                            } catch (error) {
                              console.error("Erro ao atualizar permissão de auditoria:", error);
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.tipo_usuario === 'ADMIN' && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase font-bold">Acesso Total</span>
                        )}
                        {user.tipo_usuario === 'CONCILIADOR' && (
                          <>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase font-bold">Ver Processos</span>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase font-bold">Gerar Laudos</span>
                          </>
                        )}
                        {user.tipo_usuario === 'ADVOGADO' && (
                          <>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase font-bold">Ver Processos</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase font-bold">Peticionar</span>
                          </>
                        )}
                        {user.tipo_usuario === 'CLIENTE' && (
                          <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded uppercase font-bold">Ver Meus Processos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{user.documento || '-'}</p>
                      <p className="text-xs text-gray-400">{user.whatsapp || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingUser({
                              id: user.id,
                              nome_completo: user.nome_completo,
                              documento: user.documento || '',
                              whatsapp: user.whatsapp || '',
                              tenantId: user.tenantId || '',
                              email: user.email || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                          title="Editar usuário"
                          className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setPasswordResetUser({ id: user.id, name: user.nome_completo });
                            setNewPassword('');
                            setIsPasswordModalOpen(true);
                          }}
                          title="Alterar senha"
                          className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Key size={18} />
                        </button>
                        <button 
                          onClick={() => startImpersonation(user)}
                          title="Visualizar como este usuário"
                          className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.email === 'atende.gsa@gmail.com'}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Conflitos de Cadastro</h3>
            <p className="text-sm text-gray-500">Usuários que tentaram cadastrar um CPF já existente com outro e-mail.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">CPF Conflitante</th>
                  <th className="px-6 py-4">E-mail Tentativa</th>
                  <th className="px-6 py-4">E-mail Existente</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conflicts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Nenhum conflito registrado.
                    </td>
                  </tr>
                ) : conflicts.map((conflict) => (
                  <tr key={conflict.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{conflict.cpf}</td>
                    <td className="px-6 py-4 text-sm text-orange-600 font-medium">{conflict.email_tentativa}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{conflict.email_existente}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-1 rounded-full font-bold uppercase",
                        conflict.status === 'PENDENTE' ? "bg-orange-100 text-orange-600" :
                        conflict.status === 'RESOLVIDO' ? "bg-green-100 text-green-600" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {conflict.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {conflict.status === 'PENDENTE' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleResolveConflict(conflict.id, 'RESOLVIDO')}
                            className="text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Marcar Resolvido
                          </button>
                          <button 
                            onClick={() => handleResolveConflict(conflict.id, 'REJEITADO')}
                            className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f5f2ed]">
                <h3 className="font-serif font-bold text-xl">Novo Usuário</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                  <input 
                    type="text"
                    value={newUser.nome}
                    onChange={(e) => setNewUser({...newUser, nome: e.target.value})}
                    placeholder="Ex: João da Silva"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                  <input 
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="email@exemplo.com"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                  <input 
                    type="password"
                    value={newUser.senha}
                    onChange={(e) => setNewUser({...newUser, senha: e.target.value})}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Papel</label>
                    <select 
                      value={newUser.tipo}
                      onChange={(e) => setNewUser({...newUser, tipo: e.target.value as UserRole})}
                      className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="CLIENTE">CLIENTE</option>
                      <option value="AFILIADO">AFILIADO</option>
                      <option value="CONSULTOR">CONSULTOR</option>
                      <option value="ADVOGADO">ADVOGADO</option>
                      <option value="MEDIADOR">MEDIADOR</option>
                      <option value="CONCILIADOR">CONCILIADOR</option>
                      <option value="UNIDADE">ADMIN UNIDADE</option>
                      <option value="DIRETOR">DIRETOR REGIONAL</option>
                      <option value="MASTER">GSA MASTER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
                    <input 
                      type="text"
                      value={newUser.whatsapp}
                      onChange={(e) => setNewUser({...newUser, whatsapp: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Unidade Credenciada</label>
                    <select 
                      value={newUser.tenantId}
                      onChange={(e) => setNewUser({...newUser, tenantId: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Nenhuma (GSA Central)</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.nome_unidade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">CPF / CNPJ (Opcional)</label>
                    <input 
                      type="text"
                      value={newUser.documento}
                      onChange={(e) => setNewUser({...newUser, documento: e.target.value})}
                      placeholder="000.000.000-00"
                      className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateUser}
                  disabled={isCreating || !newUser.nome || !newUser.email || !newUser.senha || newUser.senha.length < 6}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-[#333] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating && <Loader2 className="animate-spin" size={18} />}
                  Criar Usuário
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f5f2ed]">
                <h3 className="font-serif font-bold text-xl">Editar Usuário</h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                  <input 
                    type="text"
                    value={editingUser.nome_completo}
                    onChange={(e) => setEditingUser({...editingUser, nome_completo: e.target.value})}
                    placeholder="Ex: João da Silva"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                  <input 
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    placeholder="Ex: joao@email.com"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Unidade Credenciada</label>
                    <select 
                      value={editingUser.tenantId || ''}
                      onChange={(e) => setEditingUser({...editingUser, tenantId: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Nenhuma (GSA Central)</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.nome_unidade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
                    <input 
                      type="text"
                      value={editingUser.whatsapp}
                      onChange={(e) => setEditingUser({...editingUser, whatsapp: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">CPF / CNPJ (Opcional)</label>
                  <input 
                    type="text"
                    value={editingUser.documento}
                    onChange={(e) => setEditingUser({...editingUser, documento: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateUserDetails}
                  disabled={isUpdating || !editingUser.nome_completo}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-[#333] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating && <Loader2 className="animate-spin" size={18} />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f5f2ed]">
                <h3 className="font-serif font-bold text-xl">Alterar Senha</h3>
                <button 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Nova senha para <strong>{passwordResetUser.name}</strong>:
                </p>
                <div>
                  <input 
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || newPassword.length < 6}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-[#333] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResettingPassword && <Loader2 className="animate-spin" size={18} />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
