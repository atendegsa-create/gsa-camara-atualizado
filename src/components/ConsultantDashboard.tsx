import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Link as LinkIcon, Copy, Users, DollarSign, TrendingUp, CheckCircle, Search, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ConsultantDashboard: React.FC = () => {
  const { profile, tenant } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  // Gera o link exclusivo do consultor
  const baseUrl = window.location.origin; 
  const linkIndicacao = `${baseUrl}/${tenant?.slug || 'master'}/acesso-cliente?ref=${profile?.id}`;

  useEffect(() => {
    const fetchMeusLeads = async () => {
      if (!profile?.id || !profile?.tenantId) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'usuarios'),
          where('tenantId', '==', profile.tenantId),
          where('consultor_id', '==', profile.id),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const leadsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));
        setLeads(leadsData);
      } catch (error) {
        console.error("Erro ao buscar leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeusLeads();
  }, [profile]);

  const copiarLink = () => {
    navigator.clipboard.writeText(linkIndicacao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  if (!profile || !tenant) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700">
      
      {/* HEADER UNITÁRIO */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <TrendingUp className="w-64 h-64 text-primary" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-4xl font-serif font-bold text-gray-900 tracking-tight mb-2">Seja bem-vindo, {profile.nome_completo?.split(' ')[0]}</h2>
          <p className="text-gray-500 font-medium text-lg">Seu ecossistema de captação na <span className="text-primary font-bold">{tenant.nome_unidade}</span>.</p>
          
          {/* LINK DE CAPTAÇÃO */}
          <div className="mt-10 bg-primary/5 rounded-3xl p-8 border border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <LinkIcon size={16} />
              </div>
              <label className="text-[11px] font-black text-primary uppercase tracking-widest">Seu Link de Captação Exclusivo</label>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-white border-2 border-primary/10 rounded-2xl px-6 py-4 text-gray-600 font-mono text-sm flex items-center overflow-hidden">
                <span className="truncate">{linkIndicacao}</span>
              </div>
              <button 
                onClick={copiarLink}
                className={`px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/10 ${
                  copiado 
                    ? 'bg-green-600 text-white shadow-green-200' 
                    : 'bg-primary text-white hover:bg-black'
                }`}
              >
                {copiado ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copiado ? 'Link Copiado!' : 'Copiar meu Link'}
              </button>
            </div>
            <p className="text-xs text-primary/60 mt-4 font-medium italic">
              * Divulgue este link. Leads que se cadastrarem por ele serão vinculados automaticamente à sua conta.
            </p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-xl hover:border-blue-100">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Leads</p>
            <p className="text-4xl font-serif font-black text-gray-900">{leads.length}</p>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
            <Users className="w-8 h-8" />
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group relative overflow-hidden grayscale opacity-60">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conversões</p>
            <p className="text-4xl font-serif font-black text-gray-900">0</p>
          </div>
          <TrendingUp className="w-16 h-16 text-green-100 absolute -right-2 -bottom-2" />
          <span className="absolute top-4 right-4 bg-gray-100 text-[8px] font-black px-2 py-1 rounded text-gray-400 tracking-tighter">EM BREVE</span>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group relative overflow-hidden grayscale opacity-60">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comissões Acumuladas</p>
            <p className="text-4xl font-serif font-black text-gray-900">R$ 0,00</p>
          </div>
          <DollarSign className="w-16 h-16 text-primary/10 absolute -right-2 -bottom-2" />
          <span className="absolute top-4 right-4 bg-gray-100 text-[8px] font-black px-2 py-1 rounded text-gray-400 tracking-tighter">EM BREVE</span>
        </div>
      </div>

      {/* LISTA DE LEADS */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/30">
          <div>
            <h3 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Sua Carteira de Leads</h3>
            <p className="text-sm text-gray-500 font-medium">Histórico de interessantes captados via link.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pesquisar na carteira..."
              className="pl-14 pr-8 py-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-primary transition-all text-sm w-full md:w-80"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#fcfbf9] border-b border-gray-50">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data de Cadastro</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead / Cliente</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <p className="text-gray-400 font-medium animate-pulse">Buscando seus leads...</p>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mx-auto">
                        <Users size={40} />
                      </div>
                      <p className="text-gray-900 font-bold text-lg">Sua carteira está vazia</p>
                      <p className="text-gray-400 text-sm">Comece a divulgar seu link exclusivo agora para ver seus primeiros leads aqui!</p>
                      <button onClick={copiarLink} className="text-primary font-black text-xs uppercase tracking-widest hover:underline pt-4 underline-offset-4 decoration-2">Copiar meu link de acesso</button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-10 py-8">
                      <p className="text-gray-900 font-bold">{lead.createdAt.toLocaleDateString('pt-BR')}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{lead.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                          {lead.nome_completo?.charAt(0) || 'L'}
                        </div>
                        <div>
                          <p className="text-gray-900 font-bold text-base">{lead.nome_completo || 'Lead Sem Nome'}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            lead.status === 'APROVADO' ? 'text-green-600 border-green-100 bg-green-50' : 'text-amber-600 border-amber-100 bg-amber-50'
                          }`}>
                            {lead.status || 'NOVO'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-gray-500 font-medium text-sm">{lead.email}</p>
                    </td>
                    <td className="px-10 py-8">
                      <button className="p-3 rounded-xl border-2 border-gray-100 text-gray-400 hover:text-primary hover:border-primary transition-all">
                        <ExternalLink size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
