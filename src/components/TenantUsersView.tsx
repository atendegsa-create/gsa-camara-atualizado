import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Users, UserPlus, Shield, Mail, X, CheckCircle2 } from 'lucide-react';

export default function TenantUsersView() {
  const { profile } = useAuth();
  const [equipa, setEquipa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'Procurador' });
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!profile?.tenantId) return;
    
    setLoading(true);
    const q = query(collection(db, 'usuarios'), where('tenantId', '==', profile.tenantId));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setEquipa(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar equipa:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const response = await fetch('/api/users/criar-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...novoMembro,
          tenantId: profile?.tenantId
        })
      });

      if (response.ok) {
        setSucesso(true);
        setTimeout(() => {
          setSucesso(false);
          setIsModalOpen(false);
          setNovoMembro({ nome: '', email: '', senha: '', role: 'Procurador' });
        }, 2000);
      } else {
        let errorMessage = 'Erro desconhecido ao adicionar membro.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // ignore
        }
        alert(`Erro: ${errorMessage}`);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  // Função para traduzir a role para exibição
  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string, color: string }> = {
      UNIDADE: { label: 'Admin Unidade', color: 'bg-purple-100 text-purple-700' },
      GestorUnidade: { label: 'Gestor(a)', color: 'bg-blue-100 text-blue-700' },
      Procurador: { label: 'Procurador(a)', color: 'bg-amber-100 text-amber-800' },
      CONSULTOR: { label: 'Consultor(a)', color: 'bg-emerald-100 text-emerald-700' },
      Cliente: { label: 'Cliente', color: 'bg-slate-100 text-slate-700' }
    };
    const config = roles[role] || roles['Cliente'];
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center w-fit gap-1 ${config.color}`}><Shield className="w-3 h-3"/> {config.label}</span>;
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen relative">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-amber-500 w-6 h-6" /> Gestão da Equipa
            </h1>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" /> Adicionar Membro
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">E-mail</th>
                  <th className="p-4 font-semibold">Papel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipa.map(membro => (
                  <tr key={membro.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-800">{membro.nome_completo || membro.name || 'Sem Nome'}</td>
                    <td className="p-4 text-slate-600 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400"/> {membro.email}</td>
                    <td className="p-4">{getRoleBadge(membro.tipo_usuario || membro.role)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE NOVO MEMBRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Novo Membro</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            {sucesso ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                <p className="font-bold text-slate-800 text-lg">Utilizador Criado!</p>
              </div>
            ) : (
              <form onSubmit={handleCriarUsuario} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                  <input required type="text" value={novoMembro.nome} onChange={e => setNovoMembro({...novoMembro, nome: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex: João da Silva" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-mail</label>
                  <input required type="email" value={novoMembro.email} onChange={e => setNovoMembro({...novoMembro, email: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Senha (Temporária)</label>
                  <input required type="text" minLength={6} value={novoMembro.senha} onChange={e => setNovoMembro({...novoMembro, senha: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Papel na Unidade</label>
                  <select value={novoMembro.role} onChange={e => setNovoMembro({...novoMembro, role: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                    <option value="Procurador">Procurador(a)</option>
                    <option value="GestorUnidade">Gestor(a)</option>
                    <option value="UNIDADE">Admin Unidade</option>
                    <option value="CONSULTOR">Consultor(a) de Vendas</option>
                    <option value="Cliente">Cliente (Acesso ao Portal)</option>
                  </select>
                </div>
                
                <div className="pt-4">
                  <button type="submit" disabled={salvando} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-3 rounded-lg transition-colors disabled:opacity-50">
                    {salvando ? 'A criar...' : 'Criar Utilizador'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
