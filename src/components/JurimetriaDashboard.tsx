import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { BarChart3, TrendingUp, Users, Target, DollarSign, Brain, Zap, Activity, Calendar, BrainCircuit, Sparkles, Clock, AlertCircle, Loader2, Scale, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface KPIStats {
  totalLeads: number;
  leadsConvertidos: number;
  taxaConversao: number;
  receitaAnalise: number;
  receitaTap: number;
  distribuicao: {
    mediacao: number;
    limpaNome: number;
    rxInss: number;
  };
}

export function JurimetriaDashboard() {
  const { user, isMaster } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KPIStats>({
    totalLeads: 0,
    leadsConvertidos: 0,
    taxaConversao: 0,
    receitaAnalise: 0,
    receitaTap: 0,
    distribuicao: { mediacao: 0, limpaNome: 0, rxInss: 0 }
  });

  const [credorSearch, setCredorSearch] = useState('');
  const [predictabilityLoading, setPredictabilityLoading] = useState(false);
  const [predictabilityResult, setPredictabilityResult] = useState<any>(null);
  const [predictabilityError, setPredictabilityError] = useState<string | null>(null);

  const [advBanco, setAdvBanco] = useState('');
  const [advTipoAcao, setAdvTipoAcao] = useState('Revisional de Juros');
  const [advValorMin, setAdvValorMin] = useState('');
  const [advValorMax, setAdvValorMax] = useState('');
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedResult, setAdvancedResult] = useState<any>(null);
  const [advancedError, setAdvancedError] = useState<string | null>(null);

  const handleCalculateAdvancedJurimetrics = async () => {
    if (!advBanco.trim()) return;
    setAdvancedLoading(true);
    setAdvancedError(null);
    setAdvancedResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/jurimetrics/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          banco_contrato: advBanco,
          tipo_acao: advTipoAcao,
          valor_causa_min: advValorMin ? Number(advValorMin) : undefined,
          valor_causa_max: advValorMax ? Number(advValorMax) : undefined
        })
      });
      if (!response.ok) {
        let errorMessage = 'Erro ao calcular jurimetria avançada';
        try {
          const text = await response.clone().text();
          console.error("Advanced response text:", text);
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // If not JSON, ignore
        }
        throw new Error(errorMessage);
      }
      let data;
      try {
        const text = await response.clone().text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`O servidor não retornou um formato válido. Resposta: ${text.substring(0, 100)}`);
        }
      } catch (e: any) {
        throw new Error(e.message || 'O servidor não retornou um formato válido. Tente novamente mais tarde.');
      }
      setAdvancedResult(data);
    } catch (err: any) {
      console.error(err);
      setAdvancedError(err.message || 'Erro de conexão.');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const handleCalculatePredictability = async () => {
    if (!credorSearch.trim()) return;
    setPredictabilityLoading(true);
    setPredictabilityError(null);
    setPredictabilityResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/analytics/predict/${encodeURIComponent(credorSearch)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        let errorMessage = 'Erro ao calcular preditividade';
        try {
          const text = await response.clone().text();
          console.error("Predict response text:", text);
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // If not JSON, ignore
        }
        throw new Error(errorMessage);
      }
      let data;
      try {
        const text = await response.clone().text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`O servidor não retornou um formato válido. Resposta: ${text.substring(0, 100)}`);
        }
      } catch (e: any) {
        throw new Error(e.message || 'O servidor não retornou um formato válido. Tente novamente mais tarde.');
      }
      setPredictabilityResult(data);
    } catch (err: any) {
      console.error(err);
      setPredictabilityError(err.message || 'Erro de conexão.');
    } finally {
      setPredictabilityLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Se for Master vê tudo, se for Unidade vê apenas os seus dados
    const leadsRef = collection(db, 'leads');
    const qLeads = isMaster 
      ? query(leadsRef) 
      : query(leadsRef, where('tenantSlug', '==', user.tenantId));

    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      let total = 0;
      let convertidos = 0;
      let recAnalise = 0;
      let dist = { mediacao: 0, limpaNome: 0, rxInss: 0 };

      snapshot.forEach(doc => {
        const data = doc.data();
        total++;
        
        // Contagem por Funil
        if (data.tipo_lead === 'LIMPA_NOME') dist.limpaNome++;
        else if (data.tipo_lead === 'RX_INSS') dist.rxInss++;
        else dist.mediacao++;

        // Receita de Taxas de Análise (Aproximação baseada no status e tipo)
        if (data.status === 'EM_ANÁLISE' || data.status === 'CONVERTIDO') {
          if (data.tipo_lead === 'LIMPA_NOME') recAnalise += 27;
          else if (data.tipo_lead === 'RX_INSS') recAnalise += 0;
          else recAnalise += 47;
        }

        if (data.status === 'CONVERTIDO') {
          convertidos++;
        }
      });

      setStats(prev => ({
        ...prev,
        totalLeads: total,
        leadsConvertidos: convertidos,
        taxaConversao: total > 0 ? Math.round((convertidos / total) * 100) : 0,
        receitaAnalise: recAnalise,
        distribuicao: dist
      }));
    }, err => console.warn("Jurimetria leads onSnapshot error:", err));

    const processosRef = collection(db, 'processos');
    const qProcessos = isMaster 
      ? query(processosRef) 
      : query(processosRef, where('tenantId', '==', user.tenantId));

    const unsubscribeProcessos = onSnapshot(qProcessos, (snapshot) => {
      let recTap = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status_tap === 'PAGO' || data.status === 'MEDIACAO_CONTRATADA') {
          // Simplificação: R$ 397 para Mediação, R$ 997 Limpa Nome, R$ 1500 INSS
          // Num cenário real, leria o valor exato pago salvo na transação
          recTap += Number(data.valor_pago || 397); 
        }
      });
      setStats(prev => ({ ...prev, receitaTap: recTap }));
      setLoading(false);
    }, err => console.warn("Jurimetria processos onSnapshot error:", err));

    return () => {
      unsubscribeLeads();
      unsubscribeProcessos();
    };
  }, [user, isMaster]);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;

  const receitaTotal = stats.receitaAnalise + stats.receitaTap;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-amber-500 w-6 h-6" /> Jurimetria & Business Intelligence
            </h1>
            <p className="text-slate-500 text-sm mt-1">Análise de conversão de funis e performance financeira em tempo real.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" /> Visão Geral (Todo o Período)
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume de Leads</p>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 mt-4">{stats.totalLeads}</h3>
            <p className="text-xs text-emerald-500 font-semibold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Captação Ativa</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxa de Conversão</p>
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 mt-4">{stats.taxaConversao}%</h3>
            <p className="text-xs text-slate-500 mt-2">{stats.leadsConvertidos} leads transformados em TAP</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden lg:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 opacity-10 rounded-bl-full"></div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento Bruto Projetado</p>
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-white mt-4">R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <div className="flex gap-4 mt-2">
              <p className="text-xs text-slate-400"><strong className="text-emerald-400">R$ {stats.receitaAnalise.toLocaleString('pt-BR')}</strong> em Análises</p>
              <p className="text-xs text-slate-400"><strong className="text-blue-400">R$ {stats.receitaTap.toLocaleString('pt-BR')}</strong> em Honorários/TAPs</p>
            </div>
          </div>
        </div>

        {/* Análise de Funis (Mix de Serviços) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Performance por Funil de Serviço</h2>
          
          <div className="space-y-6">
            {/* Barra Mediação */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-700 flex items-center gap-2"><Brain className="w-4 h-4 text-red-500"/> Mediação Extrajudicial</span>
                <span className="font-mono text-slate-500">{stats.distribuicao.mediacao} leads ({stats.totalLeads > 0 ? Math.round((stats.distribuicao.mediacao / stats.totalLeads) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-red-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${stats.totalLeads > 0 ? (stats.distribuicao.mediacao / stats.totalLeads) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Barra Limpa Nome */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-700 flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-500"/> Limpa Nome (Recuperação de Crédito)</span>
                <span className="font-mono text-slate-500">{stats.distribuicao.limpaNome} leads ({stats.totalLeads > 0 ? Math.round((stats.distribuicao.limpaNome / stats.totalLeads) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-indigo-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${stats.totalLeads > 0 ? (stats.distribuicao.limpaNome / stats.totalLeads) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Barra INSS */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-700 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500"/> Auditoria RX INSS</span>
                <span className="font-mono text-slate-500">{stats.distribuicao.rxInss} leads ({stats.totalLeads > 0 ? Math.round((stats.distribuicao.rxInss / stats.totalLeads) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${stats.totalLeads > 0 ? (stats.distribuicao.rxInss / stats.totalLeads) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Motor de Jurimetria Preditiva */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <BrainCircuit className="w-6 h-6 text-indigo-600 animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Motor de Jurimetria Preditiva (IA)</h2>
              <p className="text-sm text-slate-500">Analise o histórico da carteira de um credor e obtenha a probabilidade de fechamento de acordos baseada em machine learning e IA.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Digite o nome do credor/banco (ex: Clínica Sorriso, Banco Itaú)" 
              value={credorSearch}
              onChange={(e) => setCredorSearch(e.target.value)}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
            <button
              onClick={handleCalculatePredictability}
              disabled={predictabilityLoading || !credorSearch.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {predictabilityLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Prever Sucesso
                </>
              )}
            </button>
          </div>

          {predictabilityError && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{predictabilityError}</p>
            </div>
          )}

          {predictabilityResult && (
            <div className="space-y-6 border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recharts Pie Chart Gauge */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[250px]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Probabilidade de Acordo</p>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Acordos Fechados', value: parseFloat(predictabilityResult.metrics?.taxa_sucesso || '0'), color: '#10B981' },
                            { name: 'Sem Acordo / Outros', value: Math.max(0, 100 - parseFloat(predictabilityResult.metrics?.taxa_sucesso || '0')), color: '#EF4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <h4 className="text-3xl font-black text-emerald-600 mt-1">{predictabilityResult.metrics?.taxa_sucesso || "0.00"}%</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Eficiência Estimada Baseada em {predictabilityResult.metrics?.total_analisado || 0} Processos</p>
                </div>

                {/* KPI metrics grid (Remaining columns) */}
                <div className="lg:col-span-2 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico Analisado</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-2">{predictabilityResult.metrics?.total_analisado || 0}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">processos mapeados</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo Médio Resolução</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-2 flex items-center justify-center gap-1.5">
                        <Clock className="w-5 h-5 text-slate-400" />
                        {predictabilityResult.metrics?.tempo_medio_acordo_dias || 0}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">dias úteis</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio Recuperado</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-2">
                        R$ {Number(predictabilityResult.metrics?.ticket_medio_recuperado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">por conciliação</p>
                    </div>
                  </div>

                  {/* Parecer Analítico */}
                  <div className="bg-indigo-950 text-indigo-50 p-6 rounded-2xl border border-indigo-800 relative overflow-hidden shadow-lg flex-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-5 rounded-bl-full"></div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Parecer Analítico Estratégico - Gemini 1.5</span>
                    </div>
                    <p className="text-sm leading-relaxed font-medium text-indigo-100/90 italic">
                      "{predictabilityResult.insight}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cruzamento Avançado Comparativo (Extrajudicial vs. Judicial) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Motor de Jurimetria Comparativa (Extrajudicial vs. Judicial)</h2>
              <p className="text-sm text-slate-500">
                Compare a eficácia e o tempo de fechamento de acordos amigáveis versus a tramitação litigiosa judicial para cada instituição.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Credor/Instituição</label>
              <input 
                type="text" 
                placeholder="Ex: Banco Itaú, Banco Bradesco, Caixa Econômica" 
                value={advBanco}
                onChange={(e) => setAdvBanco(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Ação</label>
              <select
                value={advTipoAcao}
                onChange={(e) => setAdvTipoAcao(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              >
                <option value="Revisional de Juros">Revisional de Juros</option>
                <option value="Cobrança">Cobrança</option>
                <option value="Execução de Título">Execução de Título</option>
                <option value="Busca e Apreensão">Busca e Apreensão</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCalculateAdvancedJurimetrics}
                disabled={advancedLoading || !advBanco.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer h-[46px]"
              >
                {advancedLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Relatório
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Opcionais: Filtro de Valores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor da Causa Mínimo (R$)</label>
              <input 
                type="number" 
                placeholder="Opcional. Ex: 5000" 
                value={advValorMin}
                onChange={(e) => setAdvValorMin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor da Causa Máximo (R$)</label>
              <input 
                type="number" 
                placeholder="Opcional. Ex: 50000" 
                value={advValorMax}
                onChange={(e) => setAdvValorMax(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              />
            </div>
          </div>

          {advancedError && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{advancedError}</p>
            </div>
          )}

          {advancedResult && (
            <div className="space-y-6 border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Lado Esquerdo - Cenário Extrajudicial */}
                <div className="p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        Cenário Extrajudicial (Câmara GSA)
                      </h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Recomendado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 my-6">
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxa de Acordo</p>
                        <h4 className="text-2xl font-black text-emerald-600 mt-1">{advancedResult.extrajudicial.taxa_acordo}%</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio</p>
                        <h4 className="text-2xl font-black text-slate-700 mt-1">{advancedResult.extrajudicial.tempo_medio_dias} dias</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desconto Médio</p>
                        <h4 className="text-2xl font-black text-slate-700 mt-1">{advancedResult.extrajudicial.desconto_medio_concedido}%</h4>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed bg-emerald-100/40 p-3 rounded-lg border border-emerald-200/30">
                    O acordo amigável viabiliza resoluções rápidas e desonera ambas as partes, alcançando excelente taxa de conversão sem despesas judiciais.
                  </p>
                </div>

                {/* Lado Direito - Cenário Judicial */}
                <div className="p-6 bg-rose-50/40 rounded-2xl border border-rose-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-rose-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        Cenário Judicial (Contencioso)
                      </h3>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">Alto Risco</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-6">
                      <div className="bg-white p-4 rounded-xl border border-rose-100 text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Êxito em Tribunal</p>
                        <h4 className="text-2xl font-black text-rose-600 mt-1">{advancedResult.judicial.taxa_exito_estimada}%</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-rose-100 text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo de Tramitação</p>
                        <h4 className="text-2xl font-black text-slate-700 mt-1">{advancedResult.judicial.tempo_medio_meses} meses</h4>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed bg-rose-100/40 p-3 rounded-lg border border-rose-200/30">
                    Processos judiciais envolvem custos com taxas iniciais, honorários sucumbenciais e incerteza jurídica com prazos extensos.
                  </p>
                </div>
              </div>

              {/* Relatório IA Integrado */}
              <div className="bg-slate-900 text-slate-50 p-6 rounded-2xl border border-slate-800 relative overflow-hidden shadow-lg mt-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-5 rounded-bl-full"></div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Parecer Jurimétrico Estratégico Comparado - Gemini 1.5</span>
                </div>
                <p className="text-sm leading-relaxed font-medium text-slate-200 italic">
                  "{advancedResult.parecer_ia}"
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
