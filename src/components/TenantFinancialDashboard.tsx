// src/components/TenantFinancialDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { DollarSign, ArrowDownRight, ArrowUpRight, Wallet, Receipt, Calendar, CreditCard, PieChart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const TenantFinancialDashboard: React.FC = () => {
  const { profile, tenant } = useAuth();
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [extratoAdesao, setExtratoAdesao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // KPIs Financeiros
  const [metricas, setMetricas] = useState({
    faturamentoBruto: 0, // Total pago pelos clientes
    taxaGsaPaga: 0,      // O que foi para a GSA Master via Split
    comissaoConsultores: 0, // O que foi para os vendedores
    faturamentoLiquido: 0   // O que ficou na carteira da Unidade
  });

  useEffect(() => {
    const fetchFinanceiro = async () => {
      if (!profile?.tenantId) return;

      try {
        // Busca o histórico de transações da unidade
        // Assumindo que você guarda um registo de cada pagamento na coleção 'transacoes'
        const q = query(
          collection(db, 'transacoes'),
          where('tenantId', '==', profile.tenantId),
          where('status_pagamento', '==', 'PAGO'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const txData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTransacoes(txData);

        // Busca o extrato de adesão (abatimentos)
        const extratoQ = query(
          collection(db, `tenants/${profile.tenantId}/extrato_credenciado`),
          orderBy('data', 'desc')
        );
        const extratoSnapshot = await getDocs(extratoQ);
        const extratoData: any[] = extratoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExtratoAdesao(extratoData);

        // Calcula os totais
        let bruto = 0;
        let gsa = 0;
        let consultores = 0;
        let liquido = 0;

        txData.forEach(tx => {
          bruto += tx.valor || 0;
          gsa += tx.split_gsa || 0;
          consultores += tx.split_consultor || 0;
          liquido += tx.valor_liquido_unidade || 0; 
        });

        setMetricas({
          faturamentoBruto: bruto,
          taxaGsaPaga: gsa,
          comissaoConsultores: consultores,
          faturamentoLiquido: liquido
        });

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'transacoes');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceiro();
  }, [profile]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-gray-500 font-medium font-sans animate-pulse">A carregar dados financeiros...</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10 font-sans">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">Financeiro da Unidade</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">Visão de recebimentos e repasses via Asaas Split.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border-2 border-gray-50 px-6 py-3 rounded-2xl text-sm font-bold text-gray-600 shadow-sm">
          <div className="w-8 h-8 bg-primary/10 flex items-center justify-center rounded-lg">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">ID da Carteira</span>
            <span className="font-mono">{tenant?.financeiro?.asaasWalletId || 'Não configurada'}</span>
          </div>
        </div>
      </div>

      {/* RESUMO DO CONTRATO (Glassmorphism) */}
      <div className="mb-12">
        <h3 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Receipt size={22} className="text-primary" />
          Resumo do Contrato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl shadow-indigo-900/5 bg-white/60 backdrop-blur-xl border border-white/80"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Entrada Paga</p>
            <p className="text-2xl font-bold text-gray-900 relative z-10">{formatarMoeda(tenant?.configContrato?.entradaPaga || 0)}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl shadow-red-900/5 bg-white/60 backdrop-blur-xl border border-white/80"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Saldo da Adesão (Aberto)</p>
            <p className="text-2xl font-bold text-red-600 relative z-10">{formatarMoeda(tenant?.configContrato?.saldoAdesaoAberto || 0)}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 bg-white/60 backdrop-blur-xl border border-white/80"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="flex justify-between items-start mb-1 relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensalidade</p>
              <span className="text-[9px] uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold">Ativa</span>
            </div>
            <p className="text-xl font-bold text-gray-900 relative z-10 flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              Dia {tenant?.configContrato?.diaVencimentoMensalidade || '5'}
            </p>
            <p className="text-xs font-semibold text-gray-500 relative z-10 mt-1">Valor: {formatarMoeda(tenant?.configContrato?.valorMensalidade || 0)}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl shadow-orange-900/5 bg-white/60 backdrop-blur-xl border border-white/80"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Faturamento Líquido (Mês)</p>
            <p className="text-2xl font-bold text-gray-900 relative z-10">{formatarMoeda(metricas.faturamentoLiquido)}</p>
          </motion.div>

        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5"
        >
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
            <CreditCard size={20} className="text-gray-400" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume Bruto</p>
          <p className="text-2xl font-bold text-gray-900">{formatarMoeda(metricas.faturamentoBruto)}</p>
          <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-gray-300 w-full" />
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[2rem] border border-red-50 shadow-xl shadow-red-900/5"
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
            <ArrowUpRight size={20} className="text-red-600" />
          </div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Royalties GSA</p>
          <p className="text-2xl font-bold text-red-700">{formatarMoeda(metricas.taxaGsaPaga)}</p>
          <div className="w-full h-1 bg-red-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-red-500 w-[15%]" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[2rem] border border-orange-50 shadow-xl shadow-orange-900/5"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
            <PieChart size={20} className="text-orange-600" />
          </div>
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Comissões</p>
          <p className="text-2xl font-bold text-orange-700">{formatarMoeda(metricas.comissaoConsultores)}</p>
          <div className="w-full h-1 bg-orange-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-orange-500 w-[10%]" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-[2rem] border border-green-50 shadow-xl shadow-green-900/5"
        >
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
            <ArrowDownRight size={20} className="text-green-600" />
          </div>
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Receita Líquida</p>
          <p className="text-2xl font-bold text-green-800">{formatarMoeda(metricas.faturamentoLiquido)}</p>
          <div className="w-full h-1 bg-green-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-green-500 w-[75%]" />
          </div>
        </motion.div>
      </div>

      {/* EXTRATO DE TRANSAÇÕES */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 overflow-hidden mt-12">
        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-[#fcfbf9]">
          <h3 className="text-lg font-serif font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="w-5 h-5 text-gray-400" /> Extrato de Repasses
          </h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atualizado em tempo real</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-gray-50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">NUP / Processo</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Bruto</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Taxa GSA</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Consultor</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-800 uppercase tracking-widest text-right">Seu Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-medium">A processar extrato...</td></tr>
              ) : transacoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mx-auto">
                        <Receipt size={32} />
                      </div>
                      <p className="text-gray-900 font-bold">Nenhuma transação</p>
                      <p className="text-gray-400 text-xs">Ainda não há transações concluídas para esta unidade.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transacoes.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6 text-sm text-gray-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-300" />
                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recentemente'}
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">
                      {tx.processo_nup || 'COBRANÇA AVULSA'}
                    </td>
                    <td className="px-8 py-6 text-sm text-right text-gray-900 font-black">
                      {formatarMoeda(tx.valor)}
                    </td>
                    <td className="px-8 py-6 text-sm text-right text-red-600 font-bold">
                      - {formatarMoeda(tx.split_gsa)}
                    </td>
                    <td className="px-8 py-6 text-sm text-right text-orange-600 font-bold">
                      {tx.split_consultor > 0 ? `- ${formatarMoeda(tx.split_consultor)}` : '-'}
                    </td>
                    <td className="px-8 py-6 text-sm text-right">
                      <span className="bg-green-50 text-green-700 px-4 py-2 rounded-xl font-black border border-green-100">
                        {formatarMoeda(tx.valor_liquido_unidade)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXTRATO DE ABATIMENTO DA ADESÃO */}
      {tenant?.configContrato?.saldoAdesaoAberto !== undefined && (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-indigo-100 overflow-hidden mt-12 relative">
          <div className="absolute top-0 right-0 p-8 hidden md:block opacity-10">
            <Wallet size={80} className="text-indigo-600" />
          </div>
          <div className="px-8 py-6 border-b border-indigo-50 flex justify-between items-center bg-indigo-50/30">
            <div>
              <h3 className="text-lg font-serif font-bold text-indigo-900 flex items-center gap-3">
                <Receipt className="w-5 h-5 text-indigo-500" /> Histórico de Abatimento da Adesão
              </h3>
              <p className="text-xs font-medium text-indigo-600/70 mt-1">
                Saldo devedor atual: <span className="font-black text-indigo-900">{formatarMoeda(tenant.configContrato.saldoAdesaoAberto)}</span>
              </p>
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-100/50 px-3 py-1 rounded-full border border-indigo-200">Regra dos 50%</span>
          </div>
          
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-gray-50">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Processo</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Abatido</th>
                  <th className="px-8 py-6 text-[10px] font-black text-indigo-800 uppercase tracking-widest text-right">Saldo Restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-400 font-medium">A processar extrato...</td></tr>
                ) : extratoAdesao.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <div className="max-w-xs mx-auto space-y-4">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-200 mx-auto">
                          <CheckCircle2 size={32} />
                        </div>
                        <p className="text-indigo-900 font-bold">Sem abatimentos</p>
                        <p className="text-indigo-400 text-xs">Nenhum abatimento registrado ainda ou sua adesão já está quitada!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  extratoAdesao.map((abatimento) => (
                    <tr key={abatimento.id} className="group hover:bg-indigo-50/20 transition-colors">
                      <td className="px-8 py-6 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-300" />
                          {abatimento.data?.toDate ? abatimento.data.toDate().toLocaleDateString('pt-BR') : 'Recentemente'}
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-xs font-bold text-gray-900">
                        {abatimento.processoId}
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-600">
                        {abatimento.descricao}
                      </td>
                      <td className="px-8 py-6 text-sm text-right text-red-600 font-bold">
                        - {formatarMoeda(abatimento.valorAbatido)}
                      </td>
                      <td className="px-8 py-6 text-sm text-right">
                        <span className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black border border-indigo-100">
                          {formatarMoeda(abatimento.saldoRestante)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
    </div>
  );
};
