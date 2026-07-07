import React, { useState } from 'react';
import { DollarSign, TrendingUp, Building2, UserPlus, Wallet, ArrowUpRight, ArrowDownRight, Download, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const FinanceiroDashboard: React.FC = () => {
  const [periodo, setPeriodo] = useState('mes_atual');

  // Mock de dados financeiros - No mundo real, consumiria a API do Asaas ou um consolidador no Firestore
  const metricas = {
    volume_total: 145800.00,
    receita_master: 43740.00, // Ex: 30%
    repasses_unidades: 87480.00, // Ex: 60%
    comissoes_afiliados: 14580.00, // Ex: 10%
    crescimento: 12.5
  };

  const dadosGrafico = [
    { mes: 'Jan', Master: 28000, Unidades: 56000, Afiliados: 9333 },
    { mes: 'Fev', Master: 32000, Unidades: 64000, Afiliados: 10666 },
    { mes: 'Mar', Master: 30000, Unidades: 60000, Afiliados: 10000 },
    { mes: 'Abr', Master: 38000, Unidades: 76000, Afiliados: 12666 },
    { mes: 'Mai', Master: 43740, Unidades: 87480, Afiliados: 14580 },
  ];

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto mt-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center">
            <Wallet className="w-8 h-8 mr-3 text-emerald-600" />
            Inteligência Financeira (Split)
          </h1>
          <p className="text-slate-500 mt-2">Visão geral do faturamento global e repasses automáticos.</p>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="hoje">Hoje</option>
            <option value="semana">Esta Semana</option>
            <option value="mes_atual">Este Mês</option>
            <option value="ano_atual">Este Ano</option>
          </select>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium flex items-center transition-colors">
            <Download className="w-4 h-4 mr-2" /> Relatório
          </button>
        </div>
      </div>

      {/* Cards de KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3 mr-1" /> +{metricas.crescimento}%
            </span>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Transacionado</p>
          <h3 className="text-3xl font-black text-slate-800">{formatarMoeda(metricas.volume_total)}</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-lg border border-emerald-500 text-white transform hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-100">
              Receita Líquida
            </span>
          </div>
          <p className="text-sm font-bold text-emerald-100 uppercase tracking-wider mb-1">Royalties Master</p>
          <h3 className="text-3xl font-black">{formatarMoeda(metricas.receita_master)}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-slate-400">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Automático
            </span>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Repasses Unidades</p>
          <h3 className="text-2xl font-black text-slate-800">{formatarMoeda(metricas.repasses_unidades)}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-slate-400">
              <ArrowDownRight className="w-3 h-3 mr-1" /> Custo de Aquisição
            </span>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Comissões Afiliados</p>
          <h3 className="text-2xl font-black text-slate-800">{formatarMoeda(metricas.comissoes_afiliados)}</h3>
        </div>
      </div>

      {/* Gráfico de Faturamento */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Evolução do Faturamento por Destinatário</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b' }}
                tickFormatter={(value) => `R$ ${value / 1000}k`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatarMoeda(value), '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
              <Bar dataKey="Master" stackId="a" fill="#059669" radius={[0, 0, 4, 4]} name="Master (Sua Receita)" />
              <Bar dataKey="Unidades" stackId="a" fill="#3b82f6" name="Unidades Franqueadas" />
              <Bar dataKey="Afiliados" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Afiliados/Vendedores" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
