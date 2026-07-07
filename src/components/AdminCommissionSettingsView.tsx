import React, { useState, useEffect } from 'react';
import { Settings, Percent, Save, AlertTriangle, Building2, UserPlus, Shield, CheckCircle2 } from 'lucide-react';

export const AdminCommissionSettingsView: React.FC = () => {
  // Lista simulada de unidades - No mundo real vem do Firestore (collection 'tenants')
  const [unidades] = useState([
    { id: 'default', nome: 'Regra Padrão Global' },
    { id: 't_caxias', nome: 'Unidade Caxias do Sul' },
    { id: 't_farroupilha', nome: 'Unidade Farroupilha' },
    { id: 't_garibaldi', nome: 'Unidade Garibaldi' }
  ]);
  
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('default');

  // Valores dos percentuais
  const [pctMaster, setPctMaster] = useState(30);
  const [pctUnidade, setPctUnidade] = useState(60);
  const [pctAfiliado, setPctAfiliado] = useState(10);

  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Calcula o total dinamicamente
  const total = pctMaster + pctUnidade + pctAfiliado;
  const isValido = total === 100;

  useEffect(() => {
    // Aqui seria feito um fetch no Firestore para carregar as regras atuais da unidade selecionada
    // db.collection('tenants').doc(unidadeSelecionada).get()...
    setSucesso(false);
  }, [unidadeSelecionada]);

  const handleSave = async () => {
    if (!isValido) return;
    setLoading(true);
    
    try {
      // Mock do salvamento no Firebase:
      // await db.collection('tenants').doc(unidadeSelecionada).update({
      //   'regrasComissao.percentual_master': pctMaster,
      //   'regrasComissao.percentual_unidade': pctUnidade,
      //   'regrasComissao.percentual_afiliado': pctAfiliado,
      // });
      
      await new Promise(resolve => setTimeout(resolve, 800)); // Simula delay da rede
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto mt-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 flex items-center">
          <Percent className="w-8 h-8 mr-3 text-indigo-600" />
          Split Automático (Asaas)
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Configure a divisão de honorários e lucros. O dinheiro será repartido automaticamente na compensação do pagamento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel Esquerdo: Seleção da Unidade */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-slate-400" />
              Selecionar Unidade
            </h3>
            <div className="space-y-2">
              {unidades.map(unidade => (
                <button
                  key={unidade.id}
                  onClick={() => setUnidadeSelecionada(unidade.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    unidadeSelecionada === unidade.id 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 border-2' 
                      : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100 border-2'
                  }`}
                >
                  {unidade.nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Direito: Sliders de Configuração */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-800">Definir Margens</h3>
              <div className={`px-4 py-2 rounded-lg font-black text-lg ${isValido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                Total: {total}%
              </div>
            </div>

            <div className="space-y-8">
              {/* Slider Master */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-slate-700 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-indigo-500" /> Royalties GSA Master
                  </label>
                  <span className="font-bold text-indigo-600 text-xl">{pctMaster}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={pctMaster} 
                  onChange={(e) => setPctMaster(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-xs text-slate-500 mt-1">Taxa administrativa e royalties da franqueadora.</p>
              </div>

              {/* Slider Unidade */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-slate-700 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-500" /> Faturamento da Unidade
                  </label>
                  <span className="font-bold text-blue-600 text-xl">{pctUnidade}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={pctUnidade} 
                  onChange={(e) => setPctUnidade(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-slate-500 mt-1">Líquido retido pelo polo responsável pelo atendimento.</p>
              </div>

              {/* Slider Afiliado */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-slate-700 flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-emerald-500" /> Comissão do Afiliado/Vendedor
                  </label>
                  <span className="font-bold text-emerald-600 text-xl">{pctAfiliado}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={pctAfiliado} 
                  onChange={(e) => setPctAfiliado(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-xs text-slate-500 mt-1">Comissionamento por conversão de link compartilhado.</p>
              </div>
            </div>

            {/* Validador e Botão de Salvar */}
            <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-between">
              {!isValido ? (
                <div className="flex items-center text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium w-2/3">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                  A soma dos percentuais deve ser exatamente 100% para o funcionamento da API financeira.
                </div>
              ) : (
                <div className="text-sm font-medium text-slate-500">
                  <p>Repasse configurado perfeitamente.</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!isValido || loading}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center"
              >
                {loading ? 'Salvando...' : sucesso ? <><CheckCircle2 className="w-5 h-5 mr-2"/> Salvo</> : <><Save className="w-5 h-5 mr-2"/> Atualizar Regras</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
