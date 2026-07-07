import React, { useState } from 'react';
import { Scale, Zap, Clock, Landmark, FileBarChart2, ShieldCheck, HelpCircle, Sparkles, Loader2, Play, CheckCircle, ArrowRight, TrendingUp, ChevronRight } from 'lucide-react';
import { auth } from '../lib/firebase';

export const JurimetricsPitchView: React.FC = () => {
  const [banco, setBanco] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Suggested banks to make it fast and easy for salespeople during a meeting
  const suggestedBanks = [
    'Banco Itaú',
    'Banco Bradesco',
    'Banco Santander',
    'Caixa Econômica Federal',
    'Banco do Brasil',
    'Banco Safra'
  ];

  const analisar = async (nomeBanco?: string) => {
    const targetBanco = nomeBanco || banco;
    if (!targetBanco.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/jurimetrics/compare', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ banco_contrato: targetBanco })
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao gerar relatório do motor de jurimetria.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Ignore json parse error
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
      setResultado(data);
      if (!banco) {
        setBanco(targetBanco);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao conectar com o motor de predição. Verifique se o servidor está ativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
          <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
          Apresentação Comercial & Prospecção B2B
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
          Motor de Jurimetria B2B
        </h2>
        <p className="text-slate-500 mt-3 text-base max-w-xl mx-auto leading-relaxed">
          Gere autoridade instantânea em reuniões com escritórios de advocacia mostrando cenários preditivos em tempo real.
        </p>
      </div>

      {/* Input de Prospecção */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
          Buscar Histórico por Instituição Credora
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Digite o nome do Banco ou Instituição (ex: Banco Itaú)..." 
            className="flex-1 px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analisar()}
          />
          <button 
            onClick={() => analisar()}
            disabled={loading || !banco.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calculando...</span>
              </>
            ) : (
              <>
                <FileBarChart2 className="w-5 h-5"/> 
                <span>Gerar Relatório</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Suggest Buttons */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 font-bold mr-1">Sugestões de Simulação:</span>
          {suggestedBanks.map((name) => (
            <button
              key={name}
              onClick={() => {
                setBanco(name);
                analisar(name);
              }}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 disabled:opacity-50 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200/50 transition-all cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 mb-6 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Resultados & Apresentação Comercial */}
      {resultado ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* Pitch de Impacto (Parecer IA) */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl -z-0"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-500/20 p-1.5 rounded-lg border border-indigo-500/30">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                  Parecer Estratégico do Motor de Jurimetria GSA
                </span>
              </div>
              <p className="text-base sm:text-lg leading-relaxed font-light text-slate-100 italic">
                "{resultado.parecer_ia}"
              </p>
              
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-indigo-200 border-t border-indigo-900/50 pt-4">
                <div>
                  <span className="font-bold text-indigo-300">Amostragem:</span> {resultado.amostra_processos} casos analisados
                </div>
                <div>
                  <span className="font-bold text-indigo-300">Região de Busca:</span> Nacional Integrada
                </div>
                <div>
                  <span className="font-bold text-indigo-300">Modelo Cognitivo:</span> Gemini Core Predictive
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Extrajudicial */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-emerald-500 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 rounded-bl-2xl font-black text-xs tracking-wider uppercase shadow-sm">
                VIA GSA CÂMARA (RECOMENDADO)
              </div>
              
              <div>
                <h4 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2.5">
                  <span className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
                    <Zap className="w-6 h-6"/>
                  </span>
                  Acordo Extrajudicial
                </h4>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-end border-b pb-3 border-slate-100">
                    <span className="text-sm font-semibold text-slate-500">Taxa de Sucesso (Conversão)</span>
                    <span className="text-3xl font-black text-emerald-600 tracking-tight">
                      {resultado.extrajudicial.taxa_acordo}%
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-b pb-3 border-slate-100">
                    <span className="text-sm font-semibold text-slate-500">Tempo Médio de Resolução</span>
                    <span className="text-xl font-bold text-slate-800">
                      {resultado.extrajudicial.tempo_medio_dias} dias
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-slate-500">Desconto Médio do Credor</span>
                    <span className="text-xl font-bold text-slate-800">
                      {resultado.extrajudicial.desconto_medio_concedido}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100/50 mt-4">
                <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Benefício ao Escritório Parceiro:
                </h5>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Honorários de sucumbência ou contratuais liquidados em média de duas semanas, reduzindo o custo operacional e os riscos processuais.
                </p>
              </div>
            </div>

            {/* Card Judicial */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md opacity-90 flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2.5">
                  <span className="bg-rose-50/80 p-2 rounded-xl text-rose-600">
                    <Landmark className="w-6 h-6"/>
                  </span>
                  Via Judicial Tradicional
                </h4>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-end border-b pb-3 border-slate-100">
                    <span className="text-sm font-semibold text-slate-500">Taxa de Êxito Estimada</span>
                    <span className="text-xl font-bold text-rose-600">
                      {resultado.judicial.taxa_exito_estimada}%
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                      Tempo Estimado em Tribunal
                    </span>
                    <span className="text-xl font-black text-rose-600 tracking-tight">
                      {resultado.judicial.tempo_medio_meses} meses
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100/50 mt-4">
                <h5 className="font-bold text-rose-900 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-600" /> Custo de Oportunidade:
                </h5>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Três anos de espera judicial representam um prejuízo financeiro e desvalorização cambial, além da possibilidade de insolvência ou bloqueio de ativos.
                </p>
              </div>
            </div>
          </div>

          {/* Comparativo de Custos & Argumentação Pragmática */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
            <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Argumentos Chave para Fechamento de Parceria
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="text-indigo-600 font-extrabold text-sm mb-1">01. Liquidez de Honorários</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Escritórios parceiros faturam rapidamente ao invés de imobilizarem capital humano por anos aguardando alvará.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="text-indigo-600 font-extrabold text-sm mb-1">02. Alívio de Carga de Trabalho</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Delegação de contatos incessantes e negociação direta para a plataforma GSA, focando no core-business.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="text-indigo-600 font-extrabold text-sm mb-1">03. Satisfação do Cliente</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O devedor resolve a pendência sem humilhação judicial e o credor recupera liquidez de imediato.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Estado inicial de boas vindas */
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center max-w-2xl mx-auto py-12">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border border-indigo-100">
            <Scale className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-slate-800 text-lg">Pronto para Apresentação</h4>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Selecione uma das sugestões acima ou insira o nome de um banco para gerar um parecer estratégico em tempo real e impactar o seu lead.
          </p>
          <div className="mt-6 flex justify-center items-center gap-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-indigo-500" /> Gráficos de alta conversão
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Parecer Cognitivo de IA
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
