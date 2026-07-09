import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { X, CheckCircle, FileText, ClipboardList } from 'lucide-react';

export default function CreditoSimuladorPremium({ onClose, leadIdProp }: { onClose?: () => void; leadIdProp?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(100);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fichaStatusGeral, setFichaStatusGeral] = useState<any>(null);

  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    cnpj: '',
    nomeAdministrador: '',
    cpfSocio: '',
    whatsapp: '',
    email: '',
    genero: 'Homem',
    faturamentoAnual: '',
    tempoCNPJ: '',
    temRestricoes: 'Não',
    temDividasImpostos: 'Não',
    temContabilidadeAtiva: 'Sim',
    temBensGarantia: 'Não',
    urgenciaResolucao: 'Imediata'
  });

  const params = new URLSearchParams(window.location.search);
  const leadId = leadIdProp || params.get('leadId') || '';

  useEffect(() => {
    if (!leadId) return;
    setIsEditMode(true);

    const loadLead = async () => {
      try {
        const docRef = doc(db, 'leads_credito', leadId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            nomeEmpresa: data.nomeEmpresa || data.nomeEmpresa || '',
            cnpj: data.cnpj || '',
            nomeAdministrador: data.nomeAdministrador || '',
            cpfSocio: data.cpfSocio || '',
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            genero: data.genero || 'Homem',
            faturamentoAnual: String(data.faturamentoAnual || ''),
            tempoCNPJ: String(data.tempoCNPJ || data.tempoConstituicao || ''),
            temRestricoes: data.temRestricoes || 'Não',
            temDividasImpostos: data.temDividasImpostos || 'Não',
            temContabilidadeAtiva: data.temContabilidadeAtiva || 'Sim',
            temBensGarantia: data.temBensGarantia || 'Não',
            urgenciaResolucao: data.urgenciaResolucao || 'Imediata'
          });
          if (data.scoreCalculado) {
            setCalculatedScore(data.scoreCalculado);
          } else if (data.score) {
            setCalculatedScore(Math.round(data.score / 10));
          }

          // Verificar pendências e status geral
          const { checarStatusGeralLead } = await import('../App');
          const result = checarStatusGeralLead(data);
          setFichaStatusGeral(result);
        }
      } catch (err) {
        console.error("Erro ao carregar fomento para o simulador:", err);
      }
    };
    loadLead();
  }, [leadId]);

  const executarCalculoScore = () => {
    let baseScore = 100;
    if (formData.temRestricoes === 'Sim') baseScore -= 30;
    if (formData.temDividasImpostos === 'Sim') baseScore -= 25;
    if (formData.temContabilidadeAtiva === 'Não') baseScore -= 20;
    if (formData.temBensGarantia === 'Sim') baseScore += 15;
    return Math.max(20, Math.min(baseScore, 100));
  };

  const handleLancarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const scoreFinal = executarCalculoScore();
    setCalculatedScore(scoreFinal);
    
    try {
      // Captura o afiliado_ref e UTMs de forma robusta e persistida globalmente
      const refId = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('gsa_ref') || sessionStorage.getItem('gsa_ref') || '';
      const parceiroId = new URLSearchParams(window.location.search).get('parceiro') || localStorage.getItem('gsa_parceiro') || sessionStorage.getItem('gsa_parceiro') || '';
      
      let utms: Record<string, string> = {};
      try {
        utms = JSON.parse(sessionStorage.getItem('gsa_utms') || localStorage.getItem('gsa_utms_last') || '{}');
      } catch (_) {}

      const faturamentoNum = Number(formData.faturamentoAnual) || 0;
      const tempoCNPJNum = Number(formData.tempoCNPJ) || 0;
      const finalScore = scoreFinal * 10; // Adaptado para a escala de 1000 do dashboard/CRM
      const coef = formData.genero === 'Mulher' ? 0.60 : 0.50;
      const limiteEstimado = faturamentoNum * coef;
      const tier = finalScore >= 700 ? 'Tier A' : finalScore >= 400 ? 'Tier B' : 'Tier C';

      const payloadFirestore: any = {
        ...formData,
        scoreCalculado: scoreFinal, // 100-scale
        score: finalScore, // 1000-scale
        limiteEstimado,
        tier,
        afiliadoRef: refId,
        parceiroRef: parceiroId,
        utms,
        dataCadastro: new Date().toISOString(),
        statusInterno: isEditMode ? 'Análise Técnica' : 'Aguardando Reunião'
      };

      let activeLeadId = leadId;

      if (isEditMode && leadId) {
        const docRef = doc(db, 'leads_credito', leadId);
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};
        
        const mergedLead = {
          ...existingData,
          ...payloadFirestore,
          dadosFicha: existingData.dadosFicha || null,
          documentosAnexados: existingData.documentosAnexados || []
        };

        const { checarStatusGeralLead } = await import('../App');
        const checagem = checarStatusGeralLead(mergedLead);
        payloadFirestore.statusInterno = checagem.statusGeral;
        setFichaStatusGeral(checagem);

        await updateDoc(docRef, payloadFirestore);

        // Alimenta local
        const localLeads = JSON.parse(localStorage.getItem('gsa_credito_leads') || '[]');
        const updatedLocalLeads = localLeads.map((l: any) => {
          if (l.id === leadId) {
            return {
              ...l,
              empresa: formData.nomeEmpresa,
              cnpj: formData.cnpj,
              adminNome: formData.nomeAdministrador,
              faturamentoAnual: faturamentoNum,
              score: finalScore,
              limiteEstimado,
              tier,
              status: checagem.statusGeral === 'Pronto para Análise de Liberação' ? 'Análise Técnica' : 'Documentação Pendente'
            };
          }
          return l;
        });
        localStorage.setItem('gsa_credito_leads', JSON.stringify(updatedLocalLeads));
      } else {
        // 1. Grava no Firestore com as regras de permissão corrigidas e mapeadas
        const docRef = await addDoc(collection(db, 'leads_credito'), payloadFirestore);
        activeLeadId = docRef.id;

        // 2. Alimenta o simulador local/CRM do dashboard
        const novoLeadLocal = {
          id: docRef.id,
          empresa: formData.nomeEmpresa,
          cnpj: formData.cnpj,
          adminNome: formData.nomeAdministrador,
          generoAdmin: formData.genero as 'Homem' | 'Mulher',
          admin_genero: formData.genero as 'Homem' | 'Mulher',
          faturamentoAnual: faturamentoNum,
          tempoConstituicao: tempoCNPJNum,
          possuiContabilidade: formData.temContabilidadeAtiva === 'Sim',
          temDividasBancarias: formData.temRestricoes === 'Sim',
          temDividasImpostos: formData.temDividasImpostos === 'Sim',
          score: finalScore,
          limiteEstimado,
          tier,
          status: (tier === 'Tier B' ? 'Documentação Pendente' : 'Simulado'),
          dataSimulacao: new Date().toISOString(),
          regiao: 'São Paulo - SP',
          afiliadoId: refId || 'user-teste',
          comissaoEstimada: limiteEstimado * 0.03
        };

        const localLeads = JSON.parse(localStorage.getItem('gsa_credito_leads') || '[]');
        localStorage.setItem('gsa_credito_leads', JSON.stringify([novoLeadLocal, ...localLeads]));

        // Inicializa o status de pendências do novo lead
        const { checarStatusGeralLead } = await import('../App');
        setFichaStatusGeral(checarStatusGeralLead(novoLeadLocal));
      }

      // Adiciona o leadId na URL de forma transparente para guiar os cliques de checklist/ficha
      const newUrl = `${window.location.pathname}?leadId=${activeLeadId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      setStep(2);
    } catch (err) {
      console.error("Erro ao registrar lead de crédito:", err);
      handleFirestoreError(err, OperationType.CREATE, 'leads_credito');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <div className={`w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-xl transition-all duration-300 relative text-slate-800 font-sans antialiased ${onClose ? 'max-h-[calc(100vh-2rem)] sm:max-h-[92vh] overflow-y-auto' : 'overflow-hidden'}`}>
      
      {onClose && (
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 bg-slate-100 rounded-lg border border-slate-200 z-10"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {step === 1 ? (
        <form onSubmit={handleLancarLead} className="p-5 sm:p-10 space-y-6">
          <div className="border-b border-slate-100 pb-5 pr-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              📊 Simulador de Viabilidade de Crédito
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Descubra o potencial de alavancagem financeira da sua empresa estruturando o seu perfil de crédito.
            </p>
          </div>

          {/* SEÇÃO: DADOS DE CONTATO E CADASTRO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Razão Social / Nome da Empresa</label>
              <input required type="text" value={formData.nomeEmpresa} onChange={e => setFormData({...formData, nomeEmpresa: e.target.value})} placeholder="Ex: Alpha Tech Ltda" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">CNPJ Corporativo</label>
              <input required type="text" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nome do Sócio / Administrador</label>
              <input required type="text" value={formData.nomeAdministrador} onChange={e => setFormData({...formData, nomeAdministrador: e.target.value})} placeholder="Ex: Roberto Silva" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">CPF do Administrador</label>
              <input required type="text" value={formData.cpfSocio} onChange={e => setFormData({...formData, cpfSocio: e.target.value})} placeholder="000.000.000-00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">WhatsApp para Retorno</label>
              <input required type="text" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="(54) 99999-0000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">E-mail Institucional</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="diretoria@empresa.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all" />
            </div>
          </div>

          {/* SEÇÃO: MÉTRICAS FINANCEIRAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Gênero do Gestor</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {['Homem', 'Mulher'].map(g => (
                  <button type="button" key={g} onClick={() => setFormData({...formData, genero: g})} className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${formData.genero === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Faturamento Anual (R$)</label>
              <input type="number" value={formData.faturamentoAnual} onChange={e => setFormData({...formData, faturamentoAnual: e.target.value})} placeholder="Ex: 500000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Tempo de CNPJ (Meses)</label>
              <input type="number" value={formData.tempoCNPJ} onChange={e => setFormData({...formData, tempoCNPJ: e.target.value})} placeholder="Ex: 24" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none transition-all font-mono" />
            </div>
          </div>

          {/* SEÇÃO: PERGUNTAS DINÂMICAS */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Mapeamento de Restrições e Histórico</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xs font-medium text-slate-700">Possui restrições ou apontamentos no nome (CPF ou CNPJ)?</span>
                <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg border border-slate-200 self-end sm:self-auto shrink-0">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setFormData({...formData, temRestricoes: opt})} className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${formData.temRestricoes === opt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xs font-medium text-slate-700">Possui débitos pendentes de impostos ou certidões fiscais?</span>
                <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg border border-slate-200 self-end sm:self-auto shrink-0">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setFormData({...formData, temDividasImpostos: opt})} className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${formData.temDividasImpostos === opt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xs font-medium text-slate-700">A sua empresa conta com contabilidade ativa regularizada?</span>
                <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg border border-slate-200 self-end sm:self-auto shrink-0">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setFormData({...formData, temContabilidadeAtiva: opt})} className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${formData.temContabilidadeAtiva === opt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xs font-medium text-slate-700">Possui algum bem imóvel ou móvel quitado para garantia?</span>
                <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg border border-slate-200 self-end sm:self-auto shrink-0">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setFormData({...formData, temBensGarantia: opt})} className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${formData.temBensGarantia === opt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{opt}</button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold py-4 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer">
            {loading ? 'Calculando Viabilidade...' : 'Gerar Análise de Viabilidade'}
          </button>
        </form>
      ) : (
        
        /* TELA 2: DIAGNÓSTICO CONSULTIVO (DESIGN E ALINHAMENTO CLARO) */
        <div className="p-5 sm:p-10 space-y-6 animate-fadeIn">
          <div className="text-center space-y-2 border-b border-slate-100 pb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Parabéns! Diagnóstico Gerado com Sucesso.</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto font-medium">
              Avaliamos a sua estrutura e a sua empresa possui um <strong className="text-blue-600">potencial latente expressivo</strong> para atração de recursos e alavancagem de mercado.
            </p>
          </div>

          {/* MEDIDOR ANALÍTICO DE REQUISITOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200">
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Score de Saúde Financeira</span>
              <span className="text-3xl font-black text-slate-900 mt-0.5 block">{calculatedScore} <span className="text-xs text-slate-400 font-normal">/ 100</span></span>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                <div className={`h-full transition-all duration-1000 ${calculatedScore > 70 ? 'bg-emerald-500' : calculatedScore > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${calculatedScore}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Nosso trabalho é focado em aperfeiçoar o perfil de crédito da sua estrutura empresarial, removendo barreiras operacionais para enquadrar a empresa nas melhores taxas disponíveis no mercado nacional.
              </p>
            </div>
          </div>

          {/* DIAGNÓSTICO REATIVO COMPACTO */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Análise de Viabilidade Técnica</span>

            {formData.temRestricoes === 'Sim' && (
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl flex items-start gap-3">
                <span className="text-base shrink-0">🛡️</span>
                <div>
                  <strong className="text-slate-900 text-xs sm:text-sm block mb-0.5">Regularização de Restrições e Apontamentos</strong>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    Identificamos apontamentos ativos. Dispomos de meios judiciais estratégicos e canais de mediação extrajudicial para restabelecer e blindar o nome da sua empresa, organizando o passivo com foco em reabilitação de score bancário.
                  </p>
                </div>
              </div>
            )}

            {formData.temDividasImpostos === 'Sim' && (
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-start gap-3">
                <span className="text-base shrink-0">🏛️</span>
                <div>
                  <strong className="text-slate-900 text-xs sm:text-sm block mb-0.5">Regularização Fiscal Estratégica</strong>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    Pendências com impostos federais agem como travas imediatas em comitês de crédito bancários. Contamos com um núcleo de contabilidade especializada focado exclusivamente na regularização de certidões, parcelamentos inteligentes e saneamento para fins de captação de fomento.
                  </p>
                </div>
              </div>
            )}

            {formData.temContabilidadeAtiva === 'Não' && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl flex items-start gap-3">
                <span className="text-base shrink-0">📊</span>
                <div>
                  <strong className="text-slate-900 text-xs sm:text-sm block mb-0.5">Infraestrutura Contábil e Balanço</strong>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    A ausência de contabilidade homologada inviabiliza o cálculo de balanço e DRE exigidos por fundos de investimento. Nós atendemos empresas em todo o Brasil com uma estrutura de contabilidade consultiva, voltada inteiramente a preparar a empresa para aquisição de crédito limpo.
                  </p>
                </div>
              </div>
            )}

            {formData.temBensGarantia === 'Sim' && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <span className="text-base shrink-0">💎</span>
                <div>
                  <strong className="text-slate-900 text-xs sm:text-sm block mb-0.5">Alavancagem com Garantias Reais</strong>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    Excelente indicador. A presença de patrimônio ou bens quitados eleva drasticamente as chances de enquadramento em operações de Tier A, permitindo a estruturação de linhas de longo prazo com as menores taxas do mercado.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SELETOR DE URGÊNCIA INTEGRADO */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Qual a urgência da sua empresa em resolver esses detalhes?</span>
              <span className="text-[11px] text-slate-400">Isso define a prioridade na nossa fila de auditoria.</span>
            </div>
            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg border border-slate-200 w-full sm:w-auto justify-center shrink-0">
              {['Imediata', '30 Dias', 'Apenas Sondando'].map(urg => (
                <button key={urg} type="button" onClick={() => setFormData({...formData, urgenciaResolucao: urg})} className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${formData.urgenciaResolucao === urg ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{urg}</button>
              ))}
            </div>
          </div>

          {/* PAINEL DE CONTROLE DE PENDÊNCIAS (VISÃO UNIFICADA) */}
          {fichaStatusGeral && leadId && (
            <div className="bg-slate-50 p-6 sm:p-8 rounded-xl border border-slate-200 text-left space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">📋 Status do Processo de Crédito</h3>
              </div>
              
              {fichaStatusGeral.completo ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    Parabéns! Todos os requisitos da Ficha de Entrevista e os documentos obrigatórios estão preenchidos e anexados. Seu processo foi enquadrado como <strong>Pronto para Análise de Liberação</strong>.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2 leading-relaxed">
                    <span className="text-base shrink-0">⚠️</span>
                    <div>
                      Seu processo possui o status <strong>Pendente de Informações</strong>. Para liberar o seu perfil técnico e iniciar o comitê de taxas, complete as etapas abaixo:
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pendências de Ficha */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ficha de Entrevista</span>
                      {fichaStatusGeral.fichaPendentes.length === 0 ? (
                        <div className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                          ✓ Ficha preenchida com sucesso!
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-slate-500 font-normal">Faltam preencher os seguintes campos obrigatórios:</p>
                          <ul className="list-disc list-inside text-[11px] text-rose-600 font-medium pl-1 space-y-0.5">
                            {fichaStatusGeral.fichaPendentes.map((f: string) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Pendências de Checklist */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checklist de Documentos</span>
                      {fichaStatusGeral.checklistPendentes.length === 0 ? (
                        <div className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                          ✓ Todos os documentos foram anexados!
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-slate-500 font-normal">Faltam anexar os seguintes documentos:</p>
                          <ul className="list-disc list-inside text-[11px] text-rose-600 font-medium pl-1 space-y-0.5">
                            {fichaStatusGeral.checklistPendentes.map((c: string) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões para acessar Ficha e Checklist */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.open(`/ficha-entrevista?leadId=${leadId}`, '_blank')}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  📝 Preencher Ficha de Entrevista
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/checklist-credito?leadId=${leadId}`, '_blank')}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-4 py-3 rounded-xl border border-blue-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  📂 Ir para Central de Documentos
                </button>
              </div>
            </div>
          )}

          {/* AGENDAMENTO EXECUTIVO DE ALTA CONVERSÃO */}
          <div className="bg-slate-50 p-6 sm:p-8 rounded-xl border border-slate-200 text-center space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">🔒 Ambiente Seguro GSA</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto font-normal">
                Nossa equipe realiza toda a estruturação de documentos, lapida o perfil da sua empresa e direciona a operação para a linha de fomento ideal.
              </p>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              {/* BOTÃO PRINCIPAL DE ALTA CONVERSÃO */}
              <button 
                onClick={() => window.open('https://api.whatsapp.com/send?phone=5554999990000', '_blank')} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-8 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/10 uppercase tracking-wider cursor-pointer"
              >
                🗓️ Liberar Perfil e Solicitar Crédito Disponível
              </button>
              
              {/* MICROTEXTO DE SUPORTE E SEGURANÇA */}
              <span className="text-[11px] text-slate-400 font-light max-w-sm block leading-relaxed">
                Análise de dados 100% protegida e em conformidade com o Sigilo Bancário.
              </span>

              <button 
                type="button"
                onClick={() => setStep(1)} 
                className="text-slate-400 hover:text-slate-600 font-medium text-xs px-4 py-2 rounded-xl transition-all mt-2 cursor-pointer"
              >
                Voltar ao Formulário
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (onClose) {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans antialiased w-full">
      {renderContent()}
    </div>
  );
}
