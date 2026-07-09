import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { X, CheckCircle2, FileText, Send, Share2, ClipboardCheck, ArrowLeft, Info, HelpCircle } from 'lucide-react';

interface DocumentoItem {
  id: string;
  nome: string;
  categoria: string;
  status: 'Pendente' | 'Anexado' | 'Nao Se Aplica';
  arquivoUrl?: string;
}

interface ChecklistCreditoPremiumProps {
  leadIdProp?: string;
  onClose?: () => void;
}

export default function ChecklistCreditoPremium({ leadIdProp, onClose }: ChecklistCreditoPremiumProps) {
  const [regime, setRegime] = useState<'Simples' | 'PresumidoReal' | 'MEI'>('Simples');
  const [precisaAberturaConta, setPrecisaAberturaConta] = useState<'Sim' | 'Não'>('Não');
  const [precisaGarantiaReal, setPrecisaGarantiaReal] = useState<'Sim' | 'Não'>('Não');
  const [isShareMode, setIsShareMode] = useState<boolean>(false);
  
  // Dados de Envio/Compartilhamento
  const [emailContador, setEmailContador] = useState('');
  const [whatsappContador, setWhatsappContador] = useState('');
  const [isCompartilhado, setIsCompartilhado] = useState(false);
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const leadId = leadIdProp || params.get('leadId') || '';

  // Efeito para carregar as configurações do checklist a partir dos parâmetros de compartilhamento na URL
  useEffect(() => {
    const qRegime = params.get('regime');
    const qConta = params.get('conta');
    const qGarantia = params.get('garantia');
    const qShare = params.get('share');

    if (qShare === 'true' || qRegime || qConta || qGarantia || leadId) {
      setIsShareMode(true);
    }

    if (qRegime === 'Simples' || qRegime === 'PresumidoReal' || qRegime === 'MEI') {
      setRegime(qRegime);
    }
    if (qConta === 'Sim' || qConta === 'Não') {
      setPrecisaAberturaConta(qConta);
    }
    if (qGarantia === 'Sim' || qGarantia === 'Não') {
      setPrecisaGarantiaReal(qGarantia);
    }
  }, []);

  // Estado Centralizador do Checklist Reativo
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([
    // 1. Sócios
    { id: 's1', nome: 'Cópia da Identidade e CPF ou CNH válida', categoria: 'socios', status: 'Pendente' },
    { id: 's2', nome: 'Documento do cônjuge (se casado)', categoria: 'socios', status: 'Pendente' },
    { id: 's3', nome: 'Certidão / Comprovante de Estado Civil', categoria: 'socios', status: 'Pendente' },
    { id: 's4', nome: 'Comprovante de residência (últimos 60 dias)', categoria: 'socios', status: 'Pendente' },
    { id: 's5', nome: 'Declaração de Imposto de Renda Pessoa Física (IRPF com recibo)', categoria: 'socios', status: 'Pendente' },
    { id: 's6', nome: 'Comprovante de renda (Pró-labore ou contracheque)', categoria: 'socios', status: 'Pendente' },
    
    // 2. Empresa Geral
    { id: 'e1', nome: 'Cópia do CNPJ', categoria: 'empresa_obrigatorio', status: 'Pendente' },
    { id: 'e2', nome: 'Contrato Social e todas as alterações ou Estatuto', categoria: 'empresa_obrigatorio', status: 'Pendente' },
    { id: 'e3', nome: 'Certidão Simplificada da Junta Comercial (máx 30 dias)', categoria: 'empresa_obrigatorio', status: 'Pendente' },
    { id: 'e4', nome: 'Extrato de movimentação bancária dos últimos 3 meses', categoria: 'empresa_obrigatorio', status: 'Pendente' },

    // 3. Simples Nacional
    { id: 'sim1', nome: 'DEFIS do último ano com recibo', categoria: 'Simples', status: 'Pendente' },
    { id: 'sim2', nome: 'Extrato do Simples Nacional atualizado (últimos 60 dias)', categoria: 'Simples', status: 'Pendente' },
    { id: 'sim3', nome: 'Extrato do Simples Nacional do último mês (PGDAS-D)', categoria: 'Simples', status: 'Pendente' },
    { id: 'sim4', nome: 'Compartilhamento do faturamento via e-CAC', categoria: 'Simples', status: 'Pendente' },

    // 3. Lucro Presumido/Real
    { id: 'luc1', nome: 'ECF do último exercício fiscal encerrado com recibo', categoria: 'PresumidoReal', status: 'Pendente' },
    { id: 'luc2', nome: 'Declaração de faturamento dos últimos 12 meses', categoria: 'PresumidoReal', status: 'Pendente' },
    { id: 'luc3', nome: 'Declaração de faturamento do último exercício (assinada pelo contador)', categoria: 'PresumidoReal', status: 'Pendente' },

    // 3. MEI
    { id: 'mei1', nome: 'Certificado da Condição de Microempreendedor Individual (CCMEI)', categoria: 'MEI', status: 'Pendente' },
    { id: 'mei2', nome: 'DASN-SIMEI – Declaração Anual', categoria: 'MEI', status: 'Pendente' },
    { id: 'mei3', nome: 'Extrato do Simples Nacional (SIMEI)', categoria: 'MEI', status: 'Pendente' },

    // 4. Abertura de Conta PJ
    { id: 'ac1', nome: 'Extrato do Simples Nacional + DEFIS ou ECF/Y548 para Abertura', categoria: 'abertura_conta', status: 'Pendente' },
    { id: 'ac2', nome: 'Comprovante de residência atualizado dos sócios para Conta', categoria: 'abertura_conta', status: 'Pendente' },

    // 5. Garantia Real
    { id: 'gr1', nome: 'Documento do bem (DUT / CRLV do Veículo)', categoria: 'garantia_real', status: 'Pendente' },
    { id: 'gr2', nome: 'Certidão de Ônus atualizada do Imóvel', categoria: 'garantia_real', status: 'Pendente' },
    { id: 'gr3', nome: 'Documentação Completa do Garantidor (RG, CNH, Renda, Estado Civil)', categoria: 'garantia_real', status: 'Pendente' },
  ]);

  // Carrega do Firestore as informações e documentos do lead se houver leadId
  useEffect(() => {
    if (!leadId) return;

    const carregarLeadNoChecklist = async () => {
      try {
        const docRef = doc(db, 'leads_credito', leadId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.regime) setRegime(data.regime);
          if (data.precisaAberturaConta) setPrecisaAberturaConta(data.precisaAberturaConta);
          if (data.precisaGarantiaReal) setPrecisaGarantiaReal(data.precisaGarantiaReal);
          
          if (data.documentosAnexados && Array.isArray(data.documentosAnexados)) {
            setDocumentos(prev => {
              return prev.map(defaultDoc => {
                const savedDoc = data.documentosAnexados.find((d: any) => d.id === defaultDoc.id);
                if (savedDoc) {
                  return { ...defaultDoc, status: savedDoc.status, arquivoUrl: savedDoc.arquivoUrl || '' };
                }
                return defaultDoc;
              });
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do checklist no Firestore:", err);
      }
    };
    carregarLeadNoChecklist();
  }, [leadId]);

  // Filtra dinamicamente o que deve aparecer na tela com base nas escolhas estratégicas
  const documentosFiltrados = documentos.filter(doc => {
    if (doc.categoria === 'socios' || doc.categoria === 'empresa_obrigatorio') return true;
    if (doc.categoria === 'Simples' && regime !== 'Simples') return false;
    if (doc.categoria === 'PresumidoReal' && regime !== 'PresumidoReal') return false;
    if (doc.categoria === 'MEI' && regime !== 'MEI') return false;
    if (doc.categoria === 'abertura_conta' && precisaAberturaConta !== 'Sim') return false;
    if (doc.categoria === 'garantia_real' && precisaGarantiaReal !== 'Sim') return false;
    return true;
  });

  const totalExigidos = documentosFiltrados.length;
  const totalAnexados = documentosFiltrados.filter(d => d.status === 'Anexado').length;
  const percentualEvolucao = totalExigidos > 0 ? Math.round((totalAnexados / totalExigidos) * 100) : 0;

  // Altera o status do checkbox ou do arquivo simulado
  const alternarStatusDoc = async (id: string, novoStatus: 'Pendente' | 'Anexado') => {
    const novosDocs = documentos.map(d => d.id === id ? { ...d, status: novoStatus } : d);
    setDocumentos(novosDocs);

    if (leadId) {
      try {
        const docRef = doc(db, 'leads_credito', leadId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentLeadData = docSnap.data();
          const updatedLead = {
            ...currentLeadData,
            regime,
            precisaAberturaConta,
            precisaGarantiaReal,
            documentosAnexados: novosDocs
          };

          const { checarStatusGeralLead } = await import('../App');
          const checagem = checarStatusGeralLead(updatedLead);

          await updateDoc(docRef, {
            regime,
            precisaAberturaConta,
            precisaGarantiaReal,
            documentosAnexados: novosDocs,
            statusInterno: checagem.statusGeral
          });

          // Atualizar local
          const localLeads = JSON.parse(localStorage.getItem('gsa_credito_leads') || '[]');
          const updatedLocalLeads = localLeads.map((l: any) => {
            if (l.id === leadId) {
              return {
                ...l,
                status: checagem.statusGeral === 'Pronto para Análise de Liberação' ? 'Análise Técnica' : 'Documentação Pendente'
              };
            }
            return l;
          });
          localStorage.setItem('gsa_credito_leads', JSON.stringify(updatedLocalLeads));
        }
      } catch (err) {
        console.error("Erro ao salvar alteração do documento no Firestore:", err);
      }
    }
  };

  // Sincronizar filtros reativos no Firestore quando mudam
  useEffect(() => {
    if (!leadId) return;

    const syncFiltrosChecklist = async () => {
      try {
        const docRef = doc(db, 'leads_credito', leadId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const currentLeadData = docSnap.data();
          const updatedLead = {
            ...currentLeadData,
            regime,
            precisaAberturaConta,
            precisaGarantiaReal,
            documentosAnexados: documentos
          };

          const { checarStatusGeralLead } = await import('../App');
          const checagem = checarStatusGeralLead(updatedLead);

          await updateDoc(docRef, {
            regime,
            precisaAberturaConta,
            precisaGarantiaReal,
            statusInterno: checagem.statusGeral
          });
        }
      } catch (err) {
        console.error("Erro ao sincronizar configurações do checklist:", err);
      }
    };
    syncFiltrosChecklist();
  }, [regime, precisaAberturaConta, precisaGarantiaReal, leadId]);

  // Envio de Link Customizado para o Contador via WhatsApp
  const encaminharContadorZap = () => {
    // Captura afiliado_ref e parceiro_ref
    const refId = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('gsa_ref') || sessionStorage.getItem('gsa_ref') || '';
    const parceiroId = new URLSearchParams(window.location.search).get('parceiro') || localStorage.getItem('gsa_parceiro') || sessionStorage.getItem('gsa_parceiro') || '';

    const linkCompartilhavel = `${window.location.origin}/checklist-compartilhado?regime=${regime}&conta=${precisaAberturaConta}&garantia=${precisaGarantiaReal}&ref=${refId}&parceiro=${parceiroId}${leadId ? `&leadId=${leadId}` : ''}`;
    const texto = `Olá, tudo bem? Estamos estruturando a captação de crédito da nossa empresa junto à Câmara GSA. Preciso que você anexe ou valide a lista de documentos contábeis diretamente por este link seguro: ${linkCompartilhavel}`;
    window.open(`https://api.whatsapp.com/send?phone=55${whatsappContador.replace(/\D/g, '')}&text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Envio de E-mail para o Contador simulado com gravação de Log
  const encaminharContadorEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const refId = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('gsa_ref') || sessionStorage.getItem('gsa_ref') || '';
      const parceiroId = new URLSearchParams(window.location.search).get('parceiro') || localStorage.getItem('gsa_parceiro') || sessionStorage.getItem('gsa_parceiro') || '';

      await addDoc(collection(db, 'logs_compartilhamento_checklist'), {
        emailDestinatario: emailContador,
        regimeConfigurado: regime,
        precisaAberturaConta,
        precisaGarantiaReal,
        afiliadoRef: refId,
        parceiroRef: parceiroId,
        dataEnvio: new Date().toISOString()
      });
      setIsCompartilhado(true);
      setEmailContador('');
      setTimeout(() => setIsCompartilhado(false), 4000);
    } catch (err) {
      console.error("Erro ao registrar log de compartilhamento:", err);
      handleFirestoreError(err, OperationType.CREATE, 'logs_compartilhamento_checklist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 md:p-10 font-sans antialiased flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
        
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 bg-slate-100 rounded-lg border border-slate-200 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-5 sm:p-10 space-y-8">
          
          {/* TOPO DA VIEW */}
          <div className="border-b border-slate-100 pb-5 pr-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-blue-600 shrink-0" /> Central de Documentos GSA
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Selecione o perfil tributário da sua empresa e envie a documentação exata necessária para análise de limites.
              </p>
            </div>
            
            {/* PROGRESSO EM CIRCULO OU BARRA CLARA */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center min-w-[150px] self-stretch md:self-auto flex flex-col justify-center shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Progresso Geral</span>
              <span className="text-2xl font-black text-blue-600 mt-0.5">{percentualEvolucao}%</span>
              <div className="w-full bg-blue-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${percentualEvolucao}%` }}></div>
              </div>
              <span className="text-[10px] text-slate-500 font-light mt-1.5">{totalAnexados} de {totalExigidos} arquivos</span>
            </div>
          </div>

          {/* ALERTA DE COMPARTILHAMENTO ATIVO */}
          {isShareMode && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs leading-relaxed font-normal shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Acesso Compartilhado Ativo:</strong> Você está visualizando o checklist configurado para a empresa. Os arquivos anexados ou marcados serão contabilizados em tempo real no progresso do seu cliente/parceiro.
              </div>
            </div>
          )}

          {/* FILTROS OPERACIONAIS REATIVOS (A CHAVE DA INOVAÇÃO) */}
          <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Configure o Perfil da Empresa para Filtrar os Documentos</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Regime Tributário</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
                  <button type="button" onClick={() => setRegime('Simples')} className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${regime === 'Simples' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Simples</button>
                  <button type="button" onClick={() => setRegime('PresumidoReal')} className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${regime === 'PresumidoReal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Real/Pres.</button>
                  <button type="button" onClick={() => setRegime('MEI')} className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${regime === 'MEI' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>MEI</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Necessita Abertura de Conta PJ?</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setPrecisaAberturaConta(opt as any)} className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${precisaAberturaConta === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Operação envolve Garantia Real?</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setPrecisaGarantiaReal(opt as any)} className={`py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${precisaGarantiaReal === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* COMPARTILHAMENTO DIRETO COM CONTADOR / TERCEIROS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Share2 className="w-4 h-4 text-blue-600" /> Delegar Preenchimento ao Contador (WhatsApp)</span>
              <p className="text-xs text-slate-500 font-normal">Gere o link dinâmico e envie diretamente para o responsável contábil anexar os balanços.</p>
              <div className="flex gap-2">
                <input type="text" value={whatsappContador} onChange={e => setWhatsappContador(e.target.value)} placeholder="(54) 99999-0000" className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 flex-1 font-mono transition-all" />
                <button onClick={encaminharContadorZap} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-xl transition-all cursor-pointer shadow-sm">Enviar Link</button>
              </div>
            </div>

            <form onSubmit={encaminharContadorEmail} className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Send className="w-4 h-4 text-blue-600" /> Disparar Lista por E-mail</span>
                <p className="text-xs text-slate-500 font-normal">Dispare a lista oficial de documentos filtrados direto para o e-mail do seu contador.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <input required type="email" value={emailContador} onChange={e => setEmailContador(e.target.value)} placeholder="contador@banca.com.br" className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 flex-1 transition-all" />
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl transition-all cursor-pointer shadow-sm shrink-0">
                  {loading ? 'Disparando...' : isCompartilhado ? '✓ Enviado' : 'Disparar'}
                </button>
              </div>
            </form>
          </section>

          {/* EXIBIÇÃO DO CHECKLIST DINÂMICO E BOTÕES DE UPLOAD */}
          <section className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Lista de Documentos Requeridos ({totalExigidos})</span>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {documentosFiltrados.map((docItem) => (
                <div key={docItem.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-slate-200 rounded-xl gap-3 transition-all hover:border-slate-300">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id={`chk-${docItem.id}`}
                      checked={docItem.status === 'Anexado'} 
                      onChange={(e) => alternarStatusDoc(docItem.id, e.target.checked ? 'Anexado' : 'Pendente')}
                      className="h-4.5 w-4.5 text-blue-600 rounded border-slate-300 mt-0.5 cursor-pointer focus:ring-blue-500" 
                    />
                    <label htmlFor={`chk-${docItem.id}`} className="cursor-pointer">
                      <span className="text-xs sm:text-sm font-medium text-slate-800 block leading-tight">{docItem.nome}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                        Módulo: {docItem.categoria === 'socios' ? 'Sócios' : docItem.categoria === 'empresa_obrigatorio' ? 'Empresa Geral' : docItem.categoria === 'Simples' ? 'Simples Nacional' : docItem.categoria === 'PresumidoReal' ? 'Lucro Real/Presumido' : docItem.categoria === 'MEI' ? 'MEI' : docItem.categoria === 'abertura_conta' ? 'Abertura de Conta' : 'Garantia Real'}
                      </span>
                    </label>
                  </div>

                  {/* BOTÕES DE UPLOAD REAL/SIMULADO */}
                  <div className="self-end sm:self-auto flex items-center gap-2 shrink-0">
                    {docItem.status === 'Anexado' ? (
                      <span className="text-[10px] font-bold font-mono bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pronto
                      </span>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => alternarStatusDoc(docItem.id, 'Anexado')}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/50 text-[10px] font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Anexar PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* NOTA DE RODAPÉ ADVERTÊNCIA */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 leading-relaxed font-normal flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Observação Importante GSA:</strong> Toda a documentação complementar listada acima poderá passar por novas validações e solicitações de aditivos conforme os critérios internos de análise de risco e politicas de crédito das instituições parceiras homologadas.
            </div>
          </div>

          {onClose && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button 
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 font-medium text-xs px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Fechar Janela
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
