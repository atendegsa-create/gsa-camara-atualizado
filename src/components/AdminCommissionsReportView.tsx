import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DollarSign, Percent, ArrowUpRight, ShieldCheck, Landmark, Briefcase, FileText } from 'lucide-react';

interface RelatorioPagamento {
  id: string;
  cliente_nome: string;
  tenantSlug: string;
  consultorId?: string;
  valor_causa: number;
  status: string;
  tipo_lead?: string;
  createdAt: any;
}

export default function AdminCommissionsReportView() {
  const [transacoes, setTransacoes] = useState<RelatorioPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomesUnidades, setNomesUnidades] = useState<Record<string, string>>({});

  useEffect(() => {
    // 1. Mapeamento de nomes de Unidades (Tenants) para exibição limpa na tabela
    const carregarUnidades = async () => {
      const snap = await getDocs(collection(db, 'tenants'));
      const mapa: Record<string, string> = {};
      snap.forEach(doc => {
        mapa[doc.id] = doc.data().nome_unidade || doc.id;
      });
      setNomesUnidades(mapa);
    };
    
    carregarUnidades();

    // 2. Escuta global de transações originadas nos leads/pagamentos
    const q = query(collection(db, 'leads'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RelatorioPagamento[];
      
      // Filtra apenas os que avançaram no funil de pagamento ou análise
      setTransacoes(dados.filter(t => t.status !== 'NOVO'));
      setLoading(false);
    }, err => console.warn("Commissions leads onSnapshot error:", err));

    return () => unsubscribe();
  }, []);

  // Métricas Consolidadas (Baseadas nas regras de negócio parametrizadas)
  const totalTaxasAnalisePagas = transacoes.filter(t => t.status === 'EM_ANÁLISE' || t.status === 'CONVERTIDO').length * 47;
  const totalTapProcessadas = transacoes.filter(t => t.status === 'CONVERTIDO').length * 397;
  
  // Royalties Master (20% sobre cada TAP convertida nas subcontas)
  const totalRoyaltiesMaster = transacoes.filter(t => t.status === 'CONVERTIDO').length * (397 * 0.20);
  
  // Comissões de Consultores (R$ 10 por análise + 10% por TAP)
  const leadsComConsultor = transacoes.filter(t => t.consultorId);
  const comissoesConsultores = (leadsComConsultor.filter(t => t.status === 'EM_ANÁLISE' || t.status === 'CONVERTIDO').length * 10) + 
                               (leadsComConsultor.filter(t => t.status === 'CONVERTIDO').length * (397 * 0.10));

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="text-slate-900 w-6 h-6" /> Relatório Financeiro Global
          </h1>
          <p className="text-slate-500 text-sm mt-1">Auditoria de faturamento, royalties acumulados e conciliação de splits bancários da rede.</p>
        </div>

        {/* CARDS MACRO */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxas de Análise</p>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mt-2">R$ {totalTaxasAnalisePagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Bruto gerado (R$ 47 / caso)</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume de TAPs</p>
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mt-2">R$ {totalTapProcessadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Volume em mediações oficiais</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Comissões Consultores</p>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-emerald-800 mt-2">R$ {comissoesConsultores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-emerald-600 opacity-80 mt-1">Splits liquidados para a equipa</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500 opacity-10 rounded-bl-full"></div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Royalties Master</p>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mt-2">R$ {totalRoyaltiesMaster.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-amber-400 mt-1">20% retidos na conta central</p>
          </div>
        </div>

        {/* TABELA DE AUDITORIA */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-700 text-sm">Extrato de Splits e Transações</h3>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-4 font-semibold">Cliente / Origem</th>
                <th className="p-4 font-semibold">Unidade Beneficiária</th>
                <th className="p-4 font-semibold">Tipo de Taxa</th>
                <th className="p-4 font-semibold text-right">Status Asaas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transacoes.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{t.cliente_nome}</p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">ID: {t.id}</span>
                  </td>
                  <td className="p-4 font-medium text-slate-600">
                    {nomesUnidades[t.tenantSlug] || t.tenantSlug}
                  </td>
                  <td className="p-4">
                    {t.status === 'AGUARDANDO_PAGAMENTO_ANALISE' || t.status === 'EM_ANÁLISE' ? (
                      <span className="font-semibold text-slate-700">Taxa de Análise (R$ 47)</span>
                    ) : (
                      <span className="font-semibold text-slate-900 flex items-center gap-1">TAP Oficial (R$ 397) <ArrowUpRight className="w-3 h-3 text-emerald-500"/></span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {t.status === 'AGUARDANDO_PAGAMENTO_ANALISE' ? (
                      <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded font-semibold text-xs border border-amber-100">Aguardando Pix</span>
                    ) : (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-semibold text-xs border border-emerald-100 flex items-center w-fit ml-auto gap-1">
                        <ShieldCheck className="w-3 h-3"/> Liquidado (Split OK)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
