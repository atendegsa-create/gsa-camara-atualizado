import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Target, Users, Copy, CheckCircle2, TrendingUp, Smartphone, Filter } from 'lucide-react';
import { PainelVitrineAfiliado } from './PainelVitrineAfiliado';

interface LeadConsultor {
  id: string;
  cliente_nome: string;
  resumo_fato: string;
  status: string;
  valor_causa: number;
  data_criacao: string;
}

export default function ConsultantDashboardView() {
  const { user, tenant, profile } = useAuth();
  const [leads, setLeads] = useState<LeadConsultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [walletId, setWalletId] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [walletSalva, setWalletSalva] = useState(false);

  // Link exclusivo do consultor (passa o id dele como referência para rastreio de comissões)
  const tenantSlug = tenant?.slug || profile?.tenantId || '';
  const consultantId = user?.uid || profile?.id || '';
  const linkAfiliado = `${window.location.origin}/requerimento/${tenantSlug}?ref=${consultantId}`;

  useEffect(() => {
    if (profile) {
      setWalletId((profile as any).asaasWalletId || '');
    }
  }, [profile]);

  const handleSalvarWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSavingWallet(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'usuarios', user.uid), {
        asaasWalletId: walletId
      });
      setWalletSalva(true);
      setTimeout(() => setWalletSalva(false), 3000);
    } catch (error) {
      alert("Erro ao atualizar dados bancários.");
    } finally {
      setSavingWallet(false);
    }
  };

  useEffect(() => {
    const uid = user?.uid || profile?.id;
    if (!uid) return;

    // Busca APENAS os leads gerados por este consultor específico
    const q = query(
      collection(db, 'leads'),
      where('consultorId', '==', uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          cliente_nome: data.cliente_nome,
          resumo_fato: data.resumo_fato,
          status: data.status,
          valor_causa: data.valor_causa,
          data_criacao: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recente'
        };
      }) as LeadConsultor[];
      
      setLeads(docsData);
      setLoading(false);
    }, err => console.warn("Consultant leads onSnapshot error:", err));

    return () => unsubscribe();
  }, [user, profile]);

  const copiarLink = () => {
    navigator.clipboard.writeText(linkAfiliado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  // Cálculos de Metas e Performance
  const totalLeads = leads.length;
  const leadsConvertidos = leads.filter(l => l.status === 'CONVERTIDO' || l.status === 'EM_ANÁLISE').length;
  const taxaConversao = totalLeads > 0 ? Math.round((leadsConvertidos / totalLeads) * 100) : 0;
  const volumeNegociado = leads.reduce((acc, curr) => acc + Number(curr.valor_causa || 0), 0);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* CABEÇALHO DO CONSULTOR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="text-amber-500 w-6 h-6" /> Painel do Consultor
            </h1>
            <p className="text-slate-500 text-sm mt-1">Acompanhe as suas captações e conversões em tempo real.</p>
          </div>
        </div>

        {/* CARDS DE PERFORMANCE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-semibold">Total de Captações</p>
              <h3 className="text-2xl font-bold text-slate-800">{totalLeads} <span className="text-sm font-medium text-slate-400">leads</span></h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-semibold">Taxa de Conversão</p>
              <h3 className="text-2xl font-bold text-slate-800">{taxaConversao}%</h3>
            </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex items-center gap-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 opacity-10 rounded-bl-full"></div>
            <div>
              <p className="text-sm text-slate-400 font-semibold">Volume sob Análise</p>
              <h3 className="text-2xl font-bold text-white">R$ {volumeNegociado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </div>

        {/* LINK DE CAPTAÇÃO EXCLUSIVO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-slate-800">O Seu Link de Partilha</h2>
          </div>
          <p className="text-sm text-slate-500">Envie este link aos seus clientes. Todos os requerimentos preenchidos através dele serão automaticamente contabilizados para as suas comissões.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-mono text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">
              {linkAfiliado}
            </div>
            <button 
              onClick={copiarLink}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all w-full sm:w-auto ${
                copiado ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
              }`}
            >
              {copiado ? <><CheckCircle2 className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar Link</>}
            </button>
          </div>
        </div>

        {/* VITRINE DE SOLUÇÕES EXCLUSIVA */}
        <PainelVitrineAfiliado />

        {/* LISTAGEM DOS LEADS DO CONSULTOR */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700">Histórico de Indicações</h3>
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          {leads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Ainda não possui leads captados. Partilhe o seu link para começar!
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold hidden md:table-cell">Data</th>
                  <th className="p-4 font-semibold text-right">Status da TAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{lead.cliente_nome}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{lead.resumo_fato}</p>
                    </td>
                    <td className="p-4 text-slate-500 hidden md:table-cell">{lead.data_criacao}</td>
                    <td className="p-4 text-right">
                      {lead.status === 'AGUARDANDO_PAGAMENTO_ANALISE' ? (
                        <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md font-semibold text-xs border border-amber-100">Aguardando Pgto (R$ 47)</span>
                      ) : (
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-semibold text-xs border border-emerald-100">Em Análise / Pago</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* CÓDIGO DA CARTEIRA ASAAS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-1">
            <h3 className="font-bold text-slate-800 text-base">Configuração de Recebimento</h3>
            <p className="text-slate-500 text-xs mt-1">Configure a sua chave de subconta Asaas para receber os seus splits automáticos de comissões.</p>
          </div>
          <form onSubmit={handleSalvarWallet} className="md:col-span-2 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ID da sua Carteira Asaas (Subconta)</label>
              <input 
                type="text" 
                required
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                placeholder="Ex: wal_XXXX" 
                className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50"
              />
            </div>
            <button 
              type="submit" 
              disabled={savingWallet}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-3.5 rounded-xl text-sm transition-all whitespace-nowrap w-full sm:w-auto disabled:opacity-50"
            >
              {savingWallet ? 'A guardar...' : walletSalva ? '✓ Atualizado' : 'Vincular Carteira'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
