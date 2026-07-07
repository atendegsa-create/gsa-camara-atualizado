import React from 'react';
import { Check, Shield, Zap, TrendingUp, Users } from 'lucide-react';

export const PricingSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#fcfbf9]" id="planos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-2">Projeto de Expansão Nacional</h2>
          <h3 className="text-4xl font-serif font-bold text-gray-900 mb-4">Escolha o seu caminho na GSA Câmara</h3>
          <p className="text-lg text-gray-600">Modelos de negócio estruturados para Advogados, Investidores e Vendedores. Junte-se à maior rede de LegalTech de mediação do país.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* PLANO 1: VENDAS E AFILIADOS */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow relative flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase">
              Acesso Grátis
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">Consultor de Vendas <TrendingUp className="w-5 h-5 text-green-500" /></h4>
            <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Custo zero de infraestrutura. Ganhe indicando litígios.</p>
            <div className="mb-6">
              <span className="text-4xl font-black text-gray-900">Até 30%</span>
              <span className="text-gray-500 text-sm"> / comissão</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Users className="w-5 h-5 text-gray-400 shrink-0" />
                <span><strong className="text-gray-900">Consultor B2B/B2C:</strong> Ganhe 30% fechando contratos.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Users className="w-5 h-5 text-gray-400 shrink-0" />
                <span><strong className="text-gray-900">Afiliado Digital:</strong> Ganhe 10% partilhando links de captação.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Users className="w-5 h-5 text-gray-400 shrink-0" />
                <span><strong className="text-gray-900">Cliente Indicador:</strong> Recompensa financeira fixa tabelada.</span>
              </li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              Quero ser Parceiro
            </button>
          </div>

          {/* PLANO 2: ADVOGADO STARTER */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow relative flex flex-col">
            <h4 className="text-xl font-bold text-gray-900 mb-2">Advogado Privado</h4>
            <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Para testar o poder da IA nas suas auditorias contratuais.</p>
            <div className="mb-6">
              <span className="text-4xl font-black text-gray-900">Grátis</span>
              <span className="text-gray-500 text-sm"> / para aderir</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span><strong className="text-gray-900">R$ 27,00</strong> por auditoria gerada.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span>Acesso básico ao painel de processos.</span>
              </li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
              Criar Conta Grátis
            </button>
          </div>

          {/* PLANO 3: ADVOGADO PRO/ELITE */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow relative flex flex-col">
            <h4 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">Advogado PRO <Zap className="w-5 h-5 text-amber-400" /></h4>
            <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Automação total para escritórios em crescimento.</p>
            <div className="mb-6">
              <span className="text-sm text-gray-500">A partir de</span><br/>
              <span className="text-4xl font-black text-gray-900">R$ 97</span>
              <span className="text-gray-500 text-sm"> / mês</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Check className="w-5 h-5 text-primary shrink-0" />
                <span><strong className="text-gray-900">10 Auditorias IA</strong> incluídas por mês.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <Check className="w-5 h-5 text-primary shrink-0" />
                <span>Acesso a todos os modelos de documentos.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700 bg-amber-50 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                <span><strong className="text-amber-700">Plano Elite (R$ 297):</strong> IA Ilimitada + Recebimento de Leads GSA.</span>
              </li>
            </ul>
            <button className="w-full py-3 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
              Assinar Plano PRO
            </button>
          </div>

          {/* PLANO 4: UNIDADE CREDENCIADA (DESTAQUE MÁXIMO) */}
          <div className="bg-gray-900 rounded-3xl p-8 border-2 border-amber-500 shadow-2xl relative flex flex-col text-white transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-gray-950 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase">
              Oportunidade Única
            </div>
            <h4 className="text-xl font-bold mb-2 flex items-center gap-2">Franquia / Unidade <Shield className="w-5 h-5 text-amber-400" /></h4>
            <p className="text-sm text-gray-400 mb-6 min-h-[40px]">Seja o dono da operação e fature alto na sua região geográfica.</p>
            <div className="mb-6 bg-gray-800/50 p-4 rounded-2xl border border-gray-800">
              <span className="text-xs text-amber-400 uppercase font-black tracking-wider">Adesão Facilitada</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-black text-white">R$ 297</span>
                <span className="text-gray-400 text-sm"> de entrada</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Saldo restante da taxa de setup parcelado e <strong className="text-white">abatido em 50% das suas comissões</strong> conforme produzir.</p>
            </div>
            <div className="mb-6 px-2">
              <span className="text-lg font-bold text-gray-200">Recorrência: R$ 297 / mês</span><br/>
              <span className="text-xs text-gray-400">Royalties fixados em apenas 25%</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1 border-t border-gray-800 pt-4">
              <li className="flex items-start gap-3 text-sm text-gray-300">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Sistema White-Label completo na nuvem.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-300">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Exclusividade Regional:</strong> Leads e marketing injetados pela matriz.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-300">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Direito a credenciar novas unidades comerciais.</span>
              </li>
            </ul>
            <button className="w-full py-4 px-4 rounded-xl font-black text-gray-950 bg-amber-500 hover:bg-amber-400 transition-colors shadow-xl shadow-amber-500/20 uppercase tracking-wider text-xs">
              Garantir Minha Região
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
