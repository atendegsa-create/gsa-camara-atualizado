import React, { useState, useEffect } from 'react';
import { Scale, Briefcase, Landmark, ShieldCheck, HeartHandshake, FileText, ArrowRight, X, Loader2, CheckCircle2, PenTool, Calculator, ExternalLink, SearchX, Globe, User } from 'lucide-react';

// Lista de serviços com IDs específicos para o roteamento dos formulários
const SERVICOS = [
  { id: 'grupo_geral', titulo: 'Conflitos Familiares', categoria: 'ADMINISTRATIVO', icone: HeartHandshake, desc: 'Resolução amigável e rápida para questões familiares.' },
  { id: 'grupo_geral', titulo: 'Direito Trabalhista', categoria: 'JUDICIAL', icone: Scale, desc: 'Defesa e representação em questões trabalhistas.' },
  { id: 'grupo_geral', titulo: 'Direito Civil e Indenizatório', categoria: 'JUDICIAL', icone: Scale, desc: 'Ações cíveis em geral e busca por reparações.' },
  { id: 'grupo_geral', titulo: 'Benefícios INSS', categoria: 'ADMINISTRATIVO', icone: ShieldCheck, desc: 'Auxílio doença, acidente, aposentadoria e outros benefícios.' },
  
  { id: 'rev_juros', titulo: 'Revisão de Juros Abusivos', categoria: 'ADMINISTRATIVO', icone: Landmark, desc: 'Análise de empréstimos, financiamentos e cartões de crédito.' },
  { id: 'negociacao', titulo: 'Negociação de Dívidas', categoria: 'ADMINISTRATIVO', icone: Briefcase, desc: 'Resolução extrajudicial de dívidas em aberto.' },
  { id: 'cobranca', titulo: 'Assessoria de Cobranças', categoria: 'ADMINISTRATIVO', icone: Briefcase, desc: 'Recuperação de ativos para pessoas físicas e jurídicas.' },
  { id: 'contabilidade', titulo: 'Serviços Contábeis', categoria: 'ADMINISTRATIVO', icone: Calculator, desc: 'Apoio contábil e financeiro para empresas.' },
  
  { id: 'limpa_nome', titulo: 'LIMPA NOME', categoria: 'ADMINISTRATIVO', icone: ShieldCheck, desc: 'Suspensão de apontamentos negativos dos órgãos de proteção de crédito (Serasa, SCP, Boa Vista e Protestos).' },
  { id: 'grupo_geral', titulo: 'LIMPA BACEN', categoria: 'ADMINISTRATIVO', icone: Landmark, desc: 'Suspensão de apontamentos da lista negativa dos bancos (SCR - Registrato).' },
  { id: 'grupo_geral', titulo: 'Aumento de Score / Rating', categoria: 'ADMINISTRATIVO', icone: Calculator, desc: 'Aumente a capacidade de aquisição de crédito e financiamento.' },
  { id: 'grupo_geral', titulo: 'Remoção de Processos', categoria: 'ADMINISTRATIVO', icone: SearchX, desc: 'Remoção de processos expostos da internet (JUSBRASIL E ESCAVADOR).' },
  { id: 'grupo_geral', titulo: 'Remoção Reclame Aqui', categoria: 'ADMINISTRATIVO', icone: Briefcase, desc: 'Remoção de informações negativas do RECLAME AQUI.' },
  { id: 'grupo_geral', titulo: 'Remoção Google', categoria: 'ADMINISTRATIVO', icone: Globe, desc: 'Remoção de informações negativas do Google Meu Negócio.' },
  { id: 'grupo_geral', titulo: 'Regularização de CADIN', categoria: 'ADMINISTRATIVO', icone: Landmark, desc: 'Regularização de Dívida ativa e tributária.' },
  { id: 'grupo_geral', titulo: 'Capital de Giro para CNPJ', categoria: 'ADMINISTRATIVO', icone: Landmark, desc: 'PRONAMPE e Créditos Privados.' },

  { id: 'ar_online', titulo: 'Notificações Extrajudiciais (AR)', categoria: 'ADMINISTRATIVO', icone: FileText, desc: 'Envio de AR Online de forma ágil e com validade jurídica.' },
  { id: 'assinatura', titulo: 'Assinatura de Contratos', categoria: 'ADMINISTRATIVO', icone: PenTool, desc: 'Assine documentos digitalmente com segurança.' }
];

export const VitrinePublica: React.FC = () => {
  const [afiliadoRef, setAfiliadoRef] = useState<string>('');
  const [afiliadoNome, setAfiliadoNome] = useState<string>('');
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  
  // Campos Base (Obrigatórios para todos)
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  // Campos Dinâmicos
  const [resumoCaso, setResumoCaso] = useState('');
  const [tipoCobranca, setTipoCobranca] = useState('');
  const [mediaValor, setMediaValor] = useState('');
  const [statusPagamento, setStatusPagamento] = useState('');
  const [temContrato, setTemContrato] = useState('');
  const [parcelasPagas, setParcelasPagas] = useState('');
  const [valorDivida, setValorDivida] = useState('');
  const [tipoDivida, setTipoDivida] = useState('');
  const [tempoDivida, setTempoDivida] = useState('');
  const [tipoServicoContabil, setTipoServicoContabil] = useState('');

  // Estado do Formulário
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [leadGeradoId, setLeadGeradoId] = useState<string | null>(null);
  
  // Prioridade Checkout
  const [showPriorityOffer, setShowPriorityOffer] = useState(false);
  const [showPriorityCheckout, setShowPriorityCheckout] = useState(false);
  const [isConfirmingPriority, setIsConfirmingPriority] = useState(false);
  const [prioritySuccess, setPrioritySuccess] = useState(false);
  const [pixPrioridade, setPixPrioridade] = useState<{qr_code: string, qr_code_base64: string, payment_id: string} | null>(null);
  const [isGerandoPix, setIsGerandoPix] = useState(false);

  const servicosPrioritarios = [
    'Direito Trabalhista',
    'Direito Civil e Indenizatório',
    'Benefícios INSS',
    'Negociação de Dívidas',
    'Serviços Contábeis'
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setAfiliadoRef(ref);
      
      // Buscar nome do afiliado via API
      const fetchAfiliado = async () => {
        try {
          const response = await fetch(`/api/vitrine/afiliado/${ref}`);
          if (response.ok) {
            const data = await response.json();
            setAfiliadoNome(data.nome);
          }
        } catch (error) {
          console.error("Erro ao buscar afiliado: ", error);
        }
      };
      
      fetchAfiliado();
    }
  }, []);

  const resetarCampos = () => {
    setNome(''); setTelefone(''); setEmail(''); setResumoCaso(''); setTipoCobranca('');
    setMediaValor(''); setStatusPagamento(''); setTemContrato(''); setParcelasPagas('');
    setValorDivida(''); setTipoDivida(''); setTempoDivida(''); setTipoServicoContabil('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone || !email || !servicoSelecionado) return;
    
    setIsSubmitting(true);
    
    // Agrupa os dados dinâmicos baseados no serviço
    const dadosExtras: any = {};
    if (servicoSelecionado.id === 'grupo_geral') dadosExtras.resumo_caso = resumoCaso;
    if (servicoSelecionado.id === 'cobranca') {
      dadosExtras.tipo_cobranca = tipoCobranca;
      dadosExtras.media_valor = mediaValor;
    }
    if (servicoSelecionado.id === 'rev_juros') {
      dadosExtras.status_pagamento = statusPagamento;
      dadosExtras.tem_contrato = temContrato;
      dadosExtras.parcelas_pagas = parcelasPagas;
      dadosExtras.valor_divida = valorDivida;
    }
    if (servicoSelecionado.id === 'negociacao') {
      dadosExtras.tipo_divida = tipoDivida;
      dadosExtras.tem_contrato = temContrato;
      dadosExtras.tempo_divida = tempoDivida;
      dadosExtras.valor_divida = valorDivida;
    }
    if (servicoSelecionado.id === 'contabilidade') dadosExtras.tipo_servico_contabil = tipoServicoContabil;

    try {
      const response = await fetch('/api/vitrine/capturar-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          telefone,
          email,
          servico_solicitado: servicoSelecionado.titulo,
          categoria_servico: servicoSelecionado.categoria,
          afiliado_ref: afiliadoRef,
          dados_adicionais: dadosExtras // Payload com as respostas específicas
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao enviar');
      
      setLeadGeradoId(data.leadId); // Salva o ID retornado pelo backend
      setSucesso(true);
      
      if (servicoSelecionado && servicosPrioritarios.includes(servicoSelecionado.titulo)) {
        setShowPriorityOffer(true);
      }
      
      if (servicoSelecionado.id === 'cobranca') {
        const pathRef = afiliadoRef ? `?ref=${afiliadoRef}` : '';
        window.location.href = `/para-empresas${pathRef}`;
      } else if (servicoSelecionado.id === 'rev_juros') {
        const pathRef = afiliadoRef ? `?ref=${afiliadoRef}` : '';
        window.location.href = `/landing${pathRef}`;
      } else if (servicoSelecionado.id === 'limpa_nome') {
        const pathRef = afiliadoRef ? `?ref=${afiliadoRef}` : '';
        window.location.href = `/limpa-nome${pathRef}`;
      }
    } catch (err) {
      alert('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAceitarPrioridade = async () => {
    setShowPriorityCheckout(true);
    if (!leadGeradoId || pixPrioridade) return;
    
    setIsGerandoPix(true);
    try {
      const response = await fetch('/api/vitrine/gerar-pix-prioridade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadGeradoId,
          nome: nome,
          telefone: telefone,
          email: email
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPixPrioridade(data);
      } else {
        alert('Erro ao gerar código Pix. Nossa equipe não conseguiu se conectar ao Asaas.');
      }
    } catch (error) {
      console.error('Erro ao gerar pix de prioridade', error);
    } finally {
      setIsGerandoPix(false);
    }
  };

  const handleConfirmarPrioridade = async () => {
    if (!leadGeradoId) return;
    setIsConfirmingPriority(true);
    try {
      const response = await fetch(`/api/vitrine/prioridade/${leadGeradoId}`, { method: 'POST' });
      if (response.ok) {
        setPrioritySuccess(true);
      } else {
        alert('Erro ao confirmar pagamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao confirmar prioridade:', error);
      alert('Erro de conexão ao confirmar pagamento.');
    } finally {
      setIsConfirmingPriority(false);
    }
  };

  const renderCamposDinamicos = () => {
    const sId = servicoSelecionado?.id;

    if (sId === 'grupo_geral') {
      return (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Resumo do Caso</label>
          <textarea required value={resumoCaso} onChange={(e) => setResumoCaso(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600 resize-none" placeholder="Conte-nos brevemente o que aconteceu..."></textarea>
        </div>
      );
    }
    if (sId === 'cobranca') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Devedor</label>
            <select required value={tipoCobranca} onChange={(e) => setTipoCobranca(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600">
              <option value="">Selecione...</option>
              <option value="Fisica">Pessoa Física (CPF)</option>
              <option value="Juridica">Pessoa Jurídica (CNPJ)</option>
              <option value="Ambos">Ambos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Média de Valor a Receber (R$)</label>
            <input type="text" required value={mediaValor} onChange={(e) => setMediaValor(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600" placeholder="Ex: R$ 5.000,00" />
          </div>
        </>
      );
    }
    if (sId === 'rev_juros') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status do Contrato</label>
              <select required value={statusPagamento} onChange={(e) => setStatusPagamento(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600">
                <option value="">Selecione...</option>
                <option value="Em dia">Em Dia</option>
                <option value="Em atraso">Em Atraso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Possui o Contrato?</label>
              <select required value={temContrato} onChange={(e) => setTemContrato(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600">
                <option value="">Selecione...</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parcelas Pagas</label>
              <input type="number" required value={parcelasPagas} onChange={(e) => setParcelasPagas(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600" placeholder="Ex: 12" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Dívida/Financiamento</label>
              <input type="text" required value={valorDivida} onChange={(e) => setValorDivida(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600" placeholder="R$" />
            </div>
          </div>
        </>
      );
    }
    if (sId === 'negociacao') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Dívida</label>
              <input type="text" required value={tipoDivida} onChange={(e) => setTipoDivida(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600" placeholder="Ex: Cartão, Empréstimo..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Possui o Contrato?</label>
              <select required value={temContrato} onChange={(e) => setTemContrato(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600">
                <option value="">Selecione...</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tempo da Dívida</label>
              <input type="text" required value={tempoDivida} onChange={(e) => setTempoDivida(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600" placeholder="Ex: 2 anos" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Atual da Dívida</label>
              <input type="text" required value={valorDivida} onChange={(e) => setValorDivida(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600" placeholder="R$" />
            </div>
          </div>
        </>
      );
    }
    if (sId === 'contabilidade') {
      return (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Qual serviço contábil necessita?</label>
          <textarea required value={tipoServicoContabil} onChange={(e) => setTipoServicoContabil(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:ring-2 focus:ring-indigo-600 resize-none" placeholder="Ex: Abertura de CNPJ, Imposto de Renda, Gestão Mensal..."></textarea>
        </div>
      );
    }
    
    // Para 'ar_online' e 'assinatura', nenhum campo extra é necessário além do básico.
    return null;
  };

  const handleRedirectServicoExterno = () => {
    if (servicoSelecionado?.id === 'ar_online') {
      // Redireciona para o checkout do sistema interno de AR
      window.location.href = `/checkout-ar?leadId=${leadGeradoId}`;
    } else if (servicoSelecionado?.id === 'assinatura') {
      // Redireciona o lead para a tela interna de pagamento e uso do sistema
      window.location.href = `/checkout-assinatura?leadId=${leadGeradoId}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <header className="bg-slate-900 text-white py-12 px-6 text-center">
        {afiliadoNome && (
          <div className="inline-flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 px-4 py-1.5 rounded-full text-sm mb-6 shadow-sm backdrop-blur-sm">
            <User className="w-4 h-4 mr-2" />
            <span className="opacity-80 mr-1">Consultor Associado:</span>
            <strong className="font-bold text-white">{afiliadoNome}</strong>
          </div>
        )}
        <h1 className="text-4xl font-black mb-4">Central de Soluções GSA</h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">Selecione a área em que precisa de ajuda. Nossos especialistas estão prontos para atuar no seu caso.</p>
      </header>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICOS.map((servico) => {
            const Icone = servico.icone;
            return (
              <div 
                key={servico.titulo} 
                className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full"
                onClick={() => { resetarCampos(); setServicoSelecionado(servico); setSucesso(false); }}
              >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Icone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{servico.titulo}</h3>
                <p className="text-slate-500 mb-6 flex-1">{servico.desc}</p>
                <div className="mt-auto flex items-center text-indigo-600 font-bold group-hover:translate-x-2 transition-transform">
                  {(servico.id === 'ar_online' || servico.id === 'assinatura') ? 'Acessar Sistema' : 'Solicitar Análise'} <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Captura */}
      {servicoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl relative">
            <button 
              onClick={() => setServicoSelecionado(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1 z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {sucesso ? (
              <div className="p-10 text-center flex flex-col items-center">
                {prioritySuccess ? (
                  <>
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Pagamento Confirmado!</h3>
                    <p className="text-slate-600 mb-8">Seu caso está na nossa fila de <strong>Atendimento Prioritário</strong>. Um especialista entrará em contato em instantes.</p>
                    <button 
                      onClick={() => setServicoSelecionado(null)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors"
                    >
                      Voltar ao Início
                    </button>
                  </>
                ) : showPriorityCheckout ? (
                  <>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Checkout Prioritário</h3>
                    <p className="text-slate-600 mb-6">Realize o pagamento de <strong>R$ 24,90</strong> via Pix para liberar seu atendimento prioritário.</p>
                    
                    {isGerandoPix ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-200 mb-6 w-full">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                        <p className="text-slate-600 font-medium">Gerando código Pix seguro...</p>
                      </div>
                    ) : pixPrioridade ? (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full mb-6 flex flex-col items-center">
                        <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-4">
                          <img src={`data:image/png;base64,${pixPrioridade.qr_code_base64}`} alt="QR Code Pix" className="w-full h-full object-contain" />
                        </div>
                        
                        <div className="w-full text-left">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Pix Copia e Cola</p>
                          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <input type="text" readOnly value={pixPrioridade.qr_code} className="w-full px-3 py-2 text-sm text-slate-600 outline-none" />
                            <button onClick={() => {navigator.clipboard.writeText(pixPrioridade.qr_code); alert('Copiado!');}} className="bg-slate-100 px-4 font-bold text-indigo-600 hover:bg-slate-200 transition-colors">Copiar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 w-full text-sm font-medium">
                        Ocorreu um erro ao gerar a cobrança. Nossa equipe foi notificada.
                      </div>
                    )}

                    <button 
                      onClick={handleConfirmarPrioridade}
                      disabled={isConfirmingPriority || isGerandoPix}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center mb-3"
                    >
                      {isConfirmingPriority ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      Já realizei o pagamento
                    </button>
                    <button 
                      onClick={() => setServicoSelecionado(null)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
                    >
                      Cancelar e aguardar 72h
                    </button>
                  </>
                ) : showPriorityOffer ? (
                  <>
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Dados Recebidos!</h3>
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl mb-6 mt-4">
                      <h4 className="font-bold text-indigo-800 mb-2 text-lg">Quer Atendimento Prioritário?</h4>
                      <p className="text-indigo-600 text-sm mb-4">
                        Por apenas <strong>R$ 24,90</strong> nossa equipe dará prioridade máxima ao seu caso e iniciará a análise em instantes.
                      </p>
                      <button 
                        onClick={handleAceitarPrioridade}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md mb-3"
                      >
                        Aceitar Atendimento Prioritário
                      </button>
                      <button 
                        onClick={() => setServicoSelecionado(null)}
                        className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl transition-colors border border-slate-200 text-sm"
                      >
                        Aguardar (Atendimento em até 72hrs)
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Dados Recebidos!</h3>
                    
                    {(servicoSelecionado.id === 'ar_online' || servicoSelecionado.id === 'assinatura') ? (
                      <>
                        <p className="text-slate-600 mb-8">Seu cadastro inicial foi concluído. Clique no botão abaixo para acessar o sistema.</p>
                        <button 
                          onClick={handleRedirectServicoExterno}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center"
                        >
                          Acessar {servicoSelecionado.titulo} <ExternalLink className="w-5 h-5 ml-2" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-600 mb-8">Nossa equipe especialista analisará as informações e entrará em contato em breve.</p>
                        <button 
                          onClick={() => setServicoSelecionado(null)}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors"
                        >
                          Voltar ao Início
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-8">
                <div className="mb-6">
                  <span className="text-xs font-bold tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                    {servicoSelecionado.categoria}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-800 mt-4">{servicoSelecionado.titulo}</h3>
                  <p className="text-slate-500 mt-1">
                    {(servicoSelecionado.id === 'ar_online' || servicoSelecionado.id === 'assinatura') 
                      ? 'Preencha os dados básicos para liberar o acesso ao sistema.' 
                      : 'Preencha as informações abaixo para uma análise precisa.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-slate-50 focus:bg-white transition-all" placeholder="Ex: João da Silva" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                      <input type="tel" required value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-slate-50 focus:bg-white transition-all" placeholder="(11) 99999-9999" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-slate-50 focus:bg-white transition-all" placeholder="email@exemplo.com" />
                    </div>
                  </div>

                  {/* Renderização Condicional dos Campos Extras */}
                  <div className="pt-2 space-y-4">
                    {renderCamposDinamicos()}
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl mt-6 transition-all flex items-center justify-center disabled:opacity-70"
                  >
                    {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Processando...</> : 'Continuar'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
