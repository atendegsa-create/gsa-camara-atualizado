import React, { useState, useEffect } from 'react';
import { Search, FileText, MessageSquare, Download, AlertCircle, CheckCircle2, Loader2, Scale, Upload, X, Briefcase, HeartHandshake, ShieldCheck, History, Plus, BrainCircuit, Settings, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auditRX, generateDocument, generateSettlementAgreement } from '../services/geminiService';
import { RXAuditResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db, auth, handleFirestoreError, OperationType, functions } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../AuthContext';

type AuditType = 'CONTRATOS' | 'INSS' | 'TRABALHISTA' | 'CONFLITOS' | 'FAMILIA' | 'TRANSITO' | 'SEGURO';

export function RXAuditView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [auditType, setAuditType] = useState<AuditType>('CONTRATOS');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastCreatedProcessId, setLastCreatedProcessId] = useState<string | null>(null);
  const [result, setResult] = useState<RXAuditResult | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<{ type: string, content: string } | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [globalPrompts, setGlobalPrompts] = useState<Record<string, string>>({});
  const [tenantInfo, setTenantInfo] = useState<{nome_unidade: string, logoUrl?: string} | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/config/master', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.auditPrompts) {
          setGlobalPrompts(data.auditPrompts);
          setCustomPrompt(data.auditPrompts[auditType] || '');
        } else {
          setCustomPrompt('');
        }
      } catch (err) {
        console.error("Erro ao puxar config:", err);
      }
    };
    
    const fetchTenantData = async () => {
      if (profile?.tenantId) {
        try {
          const tDoc = await getDoc(doc(db, 'tenants', profile.tenantId));
          if (tDoc.exists()) {
            setTenantInfo(tDoc.data() as any);
          }
        } catch (err) {
          console.error("Erro ao puxar dados do tenant:", err);
        }
      }
    };
    
    fetchConfig();
    fetchTenantData();
  }, [auditType, profile?.tenantId]);

  const saveCustomPrompt = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const newPrompts = { ...globalPrompts, [auditType]: customPrompt };
      await fetch('/api/config/master', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ auditPrompts: newPrompts })
      });
      setGlobalPrompts(newPrompts);
      alert("Diretriz Global para " + auditType + " salva com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar config:", err);
      alert("Erro ao salvar a Diretriz.");
    }
  };

  // Campos específicos
  const [contratosFields, setContratosFields] = useState({
    tipo_contrato: 'CONSIGNADO',
    objetivo_resolver: '',
    valor_solicitado: '',
    valor_total: '',
    valor_parcela: '',
    parcelas_total: '',
    parcelas_pagas: '',
    situacao_pagamento: 'EM_DIA',
    parcelas_atraso: '0',
    valor_atraso: '',
    valor_atual_cobrado: ''
  });

  const [inssFields, setInssFields] = useState({
    tipo_beneficio: 'APOSENTADORIA_IDADE',
    tempo_contribuicao: 'MAIS_1_ANO',
    tipo_contribuicao: 'AUTONOMO',
    idade: '',
    situacao_beneficio: 'REVISAR',
    objetivo: ''
  });

  const [trabalhistaFields, setTrabalhistaFields] = useState({
    carteira_assinada: 'SIM',
    tipo_contrato_ou_pj: 'CLT',
    tempo_servico: '',
    servico_prestado: '',
    natureza_juridica: 'PF',
    situacao_analisada: '',
    solucao_desejada: ''
  });

  const [conflitoFields, setConflitoFields] = useState({
    tipo_conflito: '',
    o_que_aconteceu: '',
    objetivo_resolucao: ''
  });

  const [transitoFields, setTransitoFields] = useState({
    ano_acidente: '',
    tem_danos_materiais: 'NÃO',
    quais_danos_materiais: '',
    tem_lesoes_corporais: 'NÃO',
    quais_lesoes: '',
    veiculo_seguro: 'NÃO',
    como_foi_acidente: '',
    registrou_bo: 'NÃO',
    objetivo: ''
  });

  const [seguroFields, setSeguroFields] = useState({
    ano_sinistro: '',
    tipo_sinistro: '',
    situacao_sinistro: 'PENDENTE',
    teve_lesoes: 'NÃO',
    quais_lesoes: '',
    fato_sinistro: '',
    objetivo: ''
  });

  const [familiaFields, setFamiliaFields] = useState({
    tipo_situacao: 'DIVÓRCIO',
    descricao_situacao: '',
    objetivo_resolver: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (auditType === 'CONFLITOS') {
        const newFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...newFiles]);
      } else {
        setFile(e.target.files[0]);
        setRawText('');
      }
    }
  };

  const handleAudit = async () => {
    const extraFields = 
      auditType === 'CONTRATOS' ? contratosFields :
      auditType === 'INSS' ? inssFields :
      auditType === 'TRABALHISTA' ? trabalhistaFields : 
      auditType === 'CONFLITOS' ? conflitoFields : 
      auditType === 'TRANSITO' ? transitoFields :
      auditType === 'SEGURO' ? seguroFields : 
      auditType === 'FAMILIA' ? familiaFields : {};
      
    const hasFormValues = Object.values(extraFields).some(val => val !== '' && val !== null && val !== undefined);
    
    if (!rawText.trim() && !file && files.length === 0 && !hasFormValues) {
      alert("Por favor, preencha os dados do formulário ou anexe um documento.");
      return;
    }
    
    setIsAuditing(true);
    
    try {
      const dataToAudit = auditType === 'CONFLITOS' ? (files.length > 0 ? files : rawText) : (file || rawText);

      // 1. Chama a IA para auditar
      const auditResult = await auditRX(dataToAudit, clientName || "Cliente", auditType, extraFields, customPrompt);
      setResult(auditResult);

      // 2. Cria o Processo no Firestore automaticamente
      const processoRef = await addDoc(collection(db, "processos"), {
        nup: `RX-${auditType.substring(0, 3)}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ANALISE_DOCUMENTAL',
        tipo_acao: `Auditoria RX - ${auditType}`,
        cliente_nome: clientName || "Cliente",
        cliente_whatsapp: clientWhatsapp,
        cliente_id: auth.currentUser?.uid,
        tenantId: user?.tenantId || null,
        data_abertura: serverTimestamp(),
        valor_estimado_recuperacao: auditResult.potencial_recuperacao || 0
      });
      setLastCreatedProcessId(processoRef.id);

      // 3. Salva os detalhes técnicos da auditoria
      await addDoc(collection(db, "auditoria_rx"), {
        processo_id: processoRef.id,
        tipo: auditType,
        banco_contrato: auditResult.banco_contrato || "Não identificado",
        taxa_juros_identificada: auditResult.taxa_juros_identificada || 0,
        valor_parcela: auditResult.valor_parcela || 0,
        rmc_detectada: !!auditResult.rmc_detectada,
        resumo_ia: auditResult.resumo_persuasivo || "Sem resumo disponível",
        criado_em: serverTimestamp(),
        tenantId: user?.tenantId || null,
        campos_extras: extraFields
      });

    } catch (error) {
      console.error("Erro no motor de auditoria:", error);
      alert("Erro ao processar auditoria. Verifique a consola.");
    } finally {
      setIsAuditing(false);
    }
  };

  const exportToPDF = async () => {
    if (!result) return;
    setIsGeneratingDoc(true);
    
    try {
      const pdfElement = document.getElementById('pdf-export-container');
      if (!pdfElement) {
        alert('Erro base do PDF.');
        setIsGeneratingDoc(false);
        return;
      }
      
      // Makes it temporarily visible and un-hidden to capture correctly
      pdfElement.style.display = 'block';
      
      const canvas = await html2canvas(pdfElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      pdfElement.style.display = 'none';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Parecer_Especialista_${clientName || 'Cliente'}.pdf`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGenerateDoc = async (type: 'ABERTURA' | 'CONVITE' | 'ACORDO' | 'LAUDO') => {
    if (!result) return;
    setIsGeneratingDoc(true);
    try {
      let content = "";
      if (type === 'ACORDO') {
        content = await generateSettlementAgreement(result, "GSA-2026-TEMP", { 
          client: clientName || "Cliente", 
          bank: result.banco_contrato 
        });
      } else {
        content = await generateDocument(type as 'ABERTURA' | 'CONVITE' | 'LAUDO', result, "GSA-2026-TEMP");
      }
      setGeneratedDoc({ type, content });
    } catch (error) {
      console.error("Erro ao gerar documento:", error);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const exportarParaPDF = async (titulo: string) => {
    const element = document.getElementById('preview-documento');
    if (!element) return;

    setIsGeneratingDoc(true);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Adiciona o conteúdo
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`${titulo}-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("Erro ao gerar o arquivo PDF.");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const menuItems = [
    { id: 'CONTRATOS', label: 'Contratos RX', icon: History, color: 'bg-blue-500' },
    { id: 'INSS', label: 'RX do INSS', icon: ShieldCheck, color: 'bg-purple-500' },
    { id: 'TRABALHISTA', label: 'RX Trabalhista', icon: Briefcase, color: 'bg-green-600' },
    { id: 'CONFLITOS', label: 'RX de Conflitos', icon: HeartHandshake, color: 'bg-orange-500' },
    { id: 'FAMILIA', label: 'RX Família', icon: Scale, color: 'bg-red-500' },
    { id: 'TRANSITO', label: 'RX Trânsito', icon: AlertCircle, color: 'bg-yellow-500' },
    { id: 'SEGURO', label: 'RX Seguro', icon: ShieldCheck, color: 'bg-teal-500' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Auditoria Inteligente</h2>
          <p className="text-gray-500">Selecione o agente especializado para análise documental.</p>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = auditType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setAuditType(item.id as AuditType);
                setResult(null);
                setFile(null);
                setFiles([]);
                setRawText('');
              }}
              className={cn(
                "p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 group",
                isActive 
                  ? "border-primary bg-primary text-white shadow-xl scale-105" 
                  : "border-white bg-white text-gray-400 hover:border-gray-200"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                isActive ? "bg-white/20" : "bg-gray-50"
              )}>
                <Icon size={24} className={isActive ? "text-white" : "text-gray-400"} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <section className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Nome do Cliente</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="João da Silva"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">WhatsApp</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(e.target.value)}
                    placeholder="5511999999999"
                    className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Specialized Fields */}
            <AnimatePresence mode="wait">
              {auditType === 'CONTRATOS' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Dados do Contrato</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={contratosFields.tipo_contrato}
                      onChange={(e) => setContratosFields({...contratosFields, tipo_contrato: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="CONSIGNADO">Empréstimo Consignado</option>
                      <option value="CLT">Empréstimo CLT (FGTS/Privado)</option>
                      <option value="CAPITAL_GIRO">Capital de Giro (PJ)</option>
                      <option value="CARTAO_RMC">Cartão RMC / Saque</option>
                      <option value="PESSOAL">Empréstimo Pessoal</option>
                      <option value="FINANCIAMENTO_VEICULO">Financiamento de Veículos</option>
                      <option value="FINANCIAMENTO_IMOBILIARIO">Financiamento Imobiliário</option>
                    </select>
                    <select 
                      value={contratosFields.situacao_pagamento}
                      onChange={(e) => setContratosFields({...contratosFields, situacao_pagamento: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="EM_DIA">Em Dia</option>
                      <option value="EM_ATRASO">Em Atraso</option>
                    </select>
                  </div>
                  
                  {contratosFields.situacao_pagamento === 'EM_ATRASO' && (
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        placeholder="Parcelas em Atraso (Qtd)"
                        value={contratosFields.parcelas_atraso}
                        onChange={(e) => setContratosFields({...contratosFields, parcelas_atraso: e.target.value})}
                        className="w-full p-3 rounded-xl border border-orange-100 bg-orange-50 text-sm"
                      />
                      <input 
                        placeholder="Valor em Atraso (R$)"
                        value={contratosFields.valor_atraso}
                        onChange={(e) => setContratosFields({...contratosFields, valor_atraso: e.target.value})}
                        className="w-full p-3 rounded-xl border border-orange-100 bg-orange-50 text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Valor Solicitado (R$)"
                      value={contratosFields.valor_solicitado}
                      onChange={(e) => setContratosFields({...contratosFields, valor_solicitado: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <input 
                      placeholder="Valor Total do Contrato"
                      value={contratosFields.valor_total}
                      onChange={(e) => setContratosFields({...contratosFields, valor_total: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Parcelas Totais"
                      value={contratosFields.parcelas_total}
                      onChange={(e) => setContratosFields({...contratosFields, parcelas_total: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <input 
                      placeholder="Parcelas Pagas"
                      value={contratosFields.parcelas_pagas}
                      onChange={(e) => setContratosFields({...contratosFields, parcelas_pagas: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Valor da Parcela"
                      value={contratosFields.valor_parcela}
                      onChange={(e) => setContratosFields({...contratosFields, valor_parcela: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <input 
                      placeholder="Valor Final Atual (R$)"
                      value={contratosFields.valor_atual_cobrado}
                      onChange={(e) => setContratosFields({...contratosFields, valor_atual_cobrado: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  </div>

                  <textarea 
                    placeholder="O que deseja resolver neste contrato?"
                    value={contratosFields.objetivo_resolver}
                    onChange={(e) => setContratosFields({...contratosFields, objetivo_resolver: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                  <p className="text-[10px] text-gray-400 italic">* Opção de colocar os dados ao invés do anexo.</p>
                </motion.div>
              )}

              {auditType === 'INSS' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Parâmetros Previdenciários</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={inssFields.tipo_beneficio}
                      onChange={(e) => setInssFields({...inssFields, tipo_beneficio: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="APOSENTADORIA_IDADE">Aposentadoria por Idade</option>
                      <option value="APOSENTADORIA_TEMPO">Aposentadoria por Tempo de Contribuição</option>
                      <option value="APOSENTADORIA_ESPECIAL">Aposentadoria Especial</option>
                      <option value="AUXILIO_DOENCA">Auxílio-Doença / Incapacidade</option>
                      <option value="PENSAO_MORTE">Pensão por Morte</option>
                      <option value="BPC_LOAS">BPC / LOAS</option>
                      <option value="SALARIO_MATERNIDADE">Salário Maternidade</option>
                      <option value="AUXILIO_RECLUSAO">Auxílio-Reclusão</option>
                    </select>
                    <select 
                      value={inssFields.situacao_beneficio}
                      onChange={(e) => setInssFields({...inssFields, situacao_beneficio: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="ENCAMINHAR">Quer Encaminhar</option>
                      <option value="NEGADO">Foi Negado</option>
                      <option value="ATIVO">Está Ativo</option>
                      <option value="REVISAR">Quer Revisar</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select 
                      value={inssFields.tempo_contribuicao}
                      onChange={(e) => setInssFields({...inssFields, tempo_contribuicao: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="SEM_CONTRIBUICAO">Sem Contribuição</option>
                      <option value="MENOS_1_ANO">Menos de 1 ano</option>
                      <option value="MAIS_1_ANO">Mais de 1 ano</option>
                    </select>
                    <input 
                      placeholder="Tipo de Contribuição"
                      value={inssFields.tipo_contribuicao}
                      onChange={(e) => setInssFields({...inssFields, tipo_contribuicao: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <input 
                      placeholder="Sua Idade"
                      value={inssFields.idade}
                      onChange={(e) => setInssFields({...inssFields, idade: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  </div>
                  <textarea 
                    placeholder="O que deseja resolver no INSS?"
                    value={inssFields.objetivo}
                    onChange={(e) => setInssFields({...inssFields, objetivo: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                </motion.div>
              )}

              {auditType === 'TRABALHISTA' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Carteira Assinada?</label>
                      <select 
                        value={trabalhistaFields.carteira_assinada}
                        onChange={(e) => setTrabalhistaFields({...trabalhistaFields, carteira_assinada: e.target.value})}
                        className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                      >
                        <option value="SIM">SIM</option>
                        <option value="NÃO">NÃO</option>
                        <option value="CONTRATO">POR CONTRATO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Natureza Jurídica</label>
                      <select 
                        value={trabalhistaFields.natureza_juridica}
                        onChange={(e) => setTrabalhistaFields({...trabalhistaFields, natureza_juridica: e.target.value})}
                        className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                      >
                        <option value="PF">Pessoa Física (PF)</option>
                        <option value="PJ">Pessoa Jurídica (PJ)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      placeholder="Tempo de Serviço (Ex: 2 anos)"
                      value={trabalhistaFields.tempo_servico}
                      onChange={(e) => setTrabalhistaFields({...trabalhistaFields, tempo_servico: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <input 
                      placeholder="Serviço Prestado (Ex: Vendedor)"
                      value={trabalhistaFields.servico_prestado}
                      onChange={(e) => setTrabalhistaFields({...trabalhistaFields, servico_prestado: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  </div>
                  <textarea 
                    placeholder="Situação a ser analisada..."
                    value={trabalhistaFields.situacao_analisada}
                    onChange={(e) => setTrabalhistaFields({...trabalhistaFields, situacao_analisada: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                  <textarea 
                    placeholder="Qual a solução desejada? (O que gostaria de resolver)"
                    value={trabalhistaFields.solucao_desejada}
                    onChange={(e) => setTrabalhistaFields({...trabalhistaFields, solucao_desejada: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                </motion.div>
              )}

              {auditType === 'CONFLITOS' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Detalhes do Conflito</label>
                  <input 
                    placeholder="Tipo de Conflito (Ex: Vizinhança, Família, Comercial)"
                    value={conflitoFields.tipo_conflito}
                    onChange={(e) => setConflitoFields({...conflitoFields, tipo_conflito: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                  />
                  <textarea 
                    placeholder="O que aconteceu no conflito?"
                    value={conflitoFields.o_que_aconteceu}
                    onChange={(e) => setConflitoFields({...conflitoFields, o_que_aconteceu: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[100px]"
                  />
                  <textarea 
                    placeholder="Qual o objetivo da mediação?"
                    value={conflitoFields.objetivo_resolucao}
                    onChange={(e) => setConflitoFields({...conflitoFields, objetivo_resolucao: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                </motion.div>
              )}

              {auditType === 'TRANSITO' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Ano do Acidente"
                      value={transitoFields.ano_acidente}
                      onChange={(e) => setTransitoFields({...transitoFields, ano_acidente: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <select 
                      value={transitoFields.registrou_bo}
                      onChange={(e) => setTransitoFields({...transitoFields, registrou_bo: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="NÃO">Registrou B.O? NÃO</option>
                      <option value="SIM">Registrou B.O? SIM</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={transitoFields.tem_danos_materiais}
                      onChange={(e) => setTransitoFields({...transitoFields, tem_danos_materiais: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="NÃO">Danos Materiais? NÃO</option>
                      <option value="SIM">Danos Materiais? SIM</option>
                    </select>
                    <select 
                      value={transitoFields.tem_lesoes_corporais}
                      onChange={(e) => setTransitoFields({...transitoFields, tem_lesoes_corporais: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="NÃO">Lesões Corporais? NÃO</option>
                      <option value="SIM">Lesões Corporais? SIM</option>
                    </select>
                  </div>
                  {transitoFields.tem_danos_materiais === 'SIM' && (
                    <input 
                      placeholder="Quais danos materiais?"
                      value={transitoFields.quais_danos_materiais}
                      onChange={(e) => setTransitoFields({...transitoFields, quais_danos_materiais: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  )}
                  {transitoFields.tem_lesoes_corporais === 'SIM' && (
                    <input 
                      placeholder="Quais lesões?"
                      value={transitoFields.quais_lesoes}
                      onChange={(e) => setTransitoFields({...transitoFields, quais_lesoes: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                  )}
                  <select 
                    value={transitoFields.veiculo_seguro}
                    onChange={(e) => setTransitoFields({...transitoFields, veiculo_seguro: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                  >
                    <option value="NÃO">Tinha Seguro? NÃO</option>
                    <option value="SIM_AMBOS">Tinha Seguro? SIM (Ambos)</option>
                    <option value="SIM_UM">Tinha Seguro? SIM (Apenas Um)</option>
                  </select>
                  <textarea 
                    placeholder="Como foi o acidente?"
                    value={transitoFields.como_foi_acidente}
                    onChange={(e) => setTransitoFields({...transitoFields, como_foi_acidente: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                  <input 
                    placeholder="O que deseja resolver?"
                    value={transitoFields.objetivo}
                    onChange={(e) => setTransitoFields({...transitoFields, objetivo: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                  />
                </motion.div>
              )}

              {auditType === 'SEGURO' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Ano do Sinistro"
                      value={seguroFields.ano_sinistro}
                      onChange={(e) => setSeguroFields({...seguroFields, ano_sinistro: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                    />
                    <select 
                      value={seguroFields.situacao_sinistro}
                      onChange={(e) => setSeguroFields({...seguroFields, situacao_sinistro: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="NEGADO">Negado</option>
                      <option value="PENDENTE">Pendente</option>
                      <option value="SEM_ACIONAMENTO">Sem acionamento</option>
                    </select>
                  </div>
                  <input 
                    placeholder="Tipo de Sinistro (Ex: Batida, Roubo, Vida)"
                    value={seguroFields.tipo_sinistro}
                    onChange={(e) => setSeguroFields({...seguroFields, tipo_sinistro: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={seguroFields.teve_lesoes}
                      onChange={(e) => setSeguroFields({...seguroFields, teve_lesoes: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                    >
                      <option value="NÃO">Teve Lesões? NÃO</option>
                      <option value="SIM">Teve Lesões? SIM</option>
                    </select>
                    {seguroFields.teve_lesoes === 'SIM' && (
                      <input 
                        placeholder="Quais Lesões?"
                        value={seguroFields.quais_lesoes}
                        onChange={(e) => setSeguroFields({...seguroFields, quais_lesoes: e.target.value})}
                        className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                      />
                    )}
                  </div>
                  <textarea 
                    placeholder="Fatos do Sinistro"
                    value={seguroFields.fato_sinistro}
                    onChange={(e) => setSeguroFields({...seguroFields, fato_sinistro: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                  <input 
                    placeholder="O que deseja resolver?"
                    value={seguroFields.objetivo}
                    onChange={(e) => setSeguroFields({...seguroFields, objetivo: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm"
                  />
                </motion.div>
              )}

              {auditType === 'FAMILIA' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-6 pt-4 border-t border-gray-50"
                >
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Contexto Familiar</label>
                  <select 
                    value={familiaFields.tipo_situacao}
                    onChange={(e) => setFamiliaFields({...familiaFields, tipo_situacao: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold"
                  >
                    <option value="DIVÓRCIO">Divórcio</option>
                    <option value="SEPARAÇÃO">Separação</option>
                    <option value="PENSÃO">Pensão Alimentícia</option>
                    <option value="GUARDA">Guarda e Visitação</option>
                    <option value="INVENTÁRIO">Inventário / Herança</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                  <textarea 
                    placeholder="Fale um pouco sobre a situação..."
                    value={familiaFields.descricao_situacao}
                    onChange={(e) => setFamiliaFields({...familiaFields, descricao_situacao: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[100px]"
                  />
                  <textarea 
                    placeholder="O que deseja resolver? (Seu objetivo final)"
                    value={familiaFields.objetivo_resolver}
                    onChange={(e) => setFamiliaFields({...familiaFields, objetivo_resolver: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm min-h-[80px]"
                  />
                  <p className="text-[10px] text-orange-600 font-bold mb-2 p-2 bg-orange-50 rounded-lg border border-orange-100">
                    * Nota Importante: Este agente atua como um advogado especialista que deixará claro os direitos possíveis, mas sempre será necessário agendar com um especialista para análise mais aprofundada.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Evidências / Documentos para IA</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={cn(
                  "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all min-h-[160px]",
                  (file || files.length > 0) ? "border-primary bg-primary/5" : "border-gray-100 hover:border-primary"
                )}>
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    multiple={auditType === 'CONFLITOS'}
                    accept=".pdf,image/*" 
                    onChange={handleFileChange} 
                  />
                  {(!file && files.length === 0) ? (
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center group">
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="text-gray-400" size={24} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-tighter text-gray-500">Anexar Documentação</span>
                      <span className="text-[10px] text-gray-300 mt-1">PDF ou Fotos (Máx 5MB)</span>
                    </label>
                  ) : (
                    <div className="space-y-3 w-full">
                      {auditType === 'CONFLITOS' ? (
                        <div className="grid grid-cols-1 gap-2 max-h-[120px] overflow-y-auto pr-2">
                          {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-primary/20">
                              <FileText size={14} className="text-primary" />
                              <span className="text-[10px] font-bold truncate flex-1">{f.name}</span>
                              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed border-gray-200 rounded-xl text-[10px] text-gray-400 hover:bg-gray-50 mt-1">
                             <Plus size={12} /> Adicionar mais
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 w-full bg-white p-4 rounded-xl border border-primary/20">
                          <FileText className="text-primary shrink-0" />
                          <div className="flex-1 truncate">
                            <p className="text-xs font-bold truncate">{file?.name}</p>
                          </div>
                          <button onClick={() => setFile(null)} className="text-red-400 p-1 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <textarea 
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value) { setFile(null); setFiles([]); }
                  }}
                  placeholder="Ou cole o breve resumo/texto aqui para a IA analisar..."
                  className="w-full h-40 md:h-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-xs bg-white"
                />
              </div>
            </div>

            {profile?.tipo_usuario === 'ADMIN' && (
              <div className="mt-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Diretrizes Globais do Agente (Visível Apenas Admin)
                  </label>
                  <button 
                    onClick={saveCustomPrompt}
                    className="text-[10px] bg-orange-600 hover:bg-orange-700 text-white font-bold py-1 px-3 rounded-lg transition-colors"
                  >
                    Salvar para {auditType}
                  </button>
                </div>
                <textarea 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Instruções de sistema fixadas para o prompt (Aplicado para TODOS os usuários na categoria atual)..."
                  className="w-full h-24 p-3 rounded-xl border border-orange-200 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none font-mono text-xs text-slate-700"
                />
              </div>
            )}

            <button 
              onClick={handleAudit}
              disabled={isAuditing || (!rawText.trim() && !file && files.length === 0)}
              className="w-full mt-4 bg-[#1a1a1a] text-white py-4.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#333] transition-all disabled:opacity-50 shadow-xl shadow-black/10 text-sm active:scale-95"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  IA em Processamento Profundo...
                </>
              ) : (
                <>
                  <BrainCircuit size={20} />
                  Iniciar Análise pelo Agente Especialista
                </>
              )}
            </button>
          </div>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
                <MessageSquare className="text-primary" size={24} />
                WhatsApp Proativo
              </h3>
              <div className="p-4 bg-[#fcfbf9] rounded-2xl border border-gray-100 relative group">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.whatsapp_message}</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(result.whatsapp_message);
                    alert("Mensagem copiada!");
                  }}
                  className="absolute top-2 right-2 p-2 bg-white opacity-0 group-hover:opacity-100 hover:bg-gray-50 rounded-lg transition-all text-gray-400 shadow-sm border border-gray-100"
                  title="Copiar mensagem"
                >
                  <Download size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </section>

        {/* Results Section */}
        <section className="space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 bg-white/50 rounded-[3rem] p-12">
                <BrainCircuit size={64} className="mb-4 opacity-5" />
                <p className="font-bold text-gray-300 uppercase tracking-[0.2em] text-center">Aguardando dados para<br/>ativação do agente</p>
              </div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Viability Card */}
                <div className={cn(
                  "p-8 rounded-[2.5rem] border-2 flex flex-col items-center text-center gap-4 relative overflow-hidden",
                  result.viabilidade ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}>
                  {result.viabilidade ? (
                    <CheckCircle2 className="text-green-600 w-12 h-12" />
                  ) : (
                    <AlertCircle className="text-red-600 w-12 h-12" />
                  )}
                  <div className="flex-1">
                    <h4 className={cn("font-serif font-bold text-2xl mb-2", result.viabilidade ? "text-green-900" : "text-red-900")}>
                      {result.viabilidade ? "Viabilidade Estratégica" : "Situação Complexa"}
                    </h4>
                    <p className={cn("text-sm font-medium leading-relaxed", result.viabilidade ? "text-green-700/80" : "text-red-700/80")}>
                      {result.detalhes || result.motivo}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 w-full pt-4">
                    {lastCreatedProcessId && (
                      <button 
                         onClick={() => window.open(`/processos/${lastCreatedProcessId}`, '_blank')}
                         className="flex-1 bg-white text-gray-800 border border-gray-200 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        Ver Detalhes do Protocolo
                      </button>
                    )}
                    {auditType === 'CONTRATOS' && result.viabilidade && (
                      <button 
                         onClick={() => navigate('/financeiro')}
                         className="flex-1 bg-[#1a1a1a] text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-all text-xs"
                      >
                         Acessar Checkout
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Impacto Financeiro</p>
                    <p className="text-2xl font-serif font-black text-blue-600">
                      R$ {(result.potencial_recuperacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Complexidade</p>
                    <p className="text-2xl font-serif font-black text-gray-900">
                      {result.complexidade || 'Regular'}
                    </p>
                  </div>
                </div>

                {/* Detalhes Identificados pela IA */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                  <h4 className="font-serif font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Search size={18} className="text-indigo-600" />
                    Detalhes Identificados pela IA
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-2xl">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Banco Contrário</p>
                      <p className="text-sm font-bold text-gray-900">{result.banco_contrato || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Valor da Parcela</p>
                      <p className="text-sm font-bold text-gray-900">
                        {result.valor_parcela ? `R$ ${result.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Nº Contrato</p>
                      <p className="text-sm font-bold text-gray-900">{result.numero_contrato || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl flex flex-col justify-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Taxa Juros Identificada</p>
                      <p className="text-sm font-bold text-gray-900">
                        {result.taxa_juros_identificada ? `${result.taxa_juros_identificada}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl flex flex-col justify-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">RMC Detectada</p>
                      <p className={cn("text-xs font-bold px-2 py-1 rounded-md inline-block w-fit", result.rmc_detectada ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                        {result.rmc_detectada ? 'Sim, Detectada' : 'Não'}
                      </p>
                    </div>
                  </div>
                  {result.tarifas_abusivas && result.tarifas_abusivas.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Tarifas Abusivas Encontradas</p>
                      <div className="flex flex-wrap gap-2">
                        {result.tarifas_abusivas.map((tarifa, idx) => (
                          <span key={idx} className="bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                            {tarifa}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumo Persuasivo */}
                <div className="bg-[#FAF9F6] p-8 rounded-[2.5rem] border border-[#EBE8E0] relative shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-serif font-bold text-gray-900 flex items-center gap-2">
                      <BrainCircuit size={20} className="text-primary" />
                      Parecer do Agente Especialista
                    </h4>
                    <button
                      onClick={exportToPDF}
                      disabled={isGeneratingDoc}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                      {isGeneratingDoc ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                      Exportar PDF
                    </button>
                  </div>
                  <div className="prose prose-sm text-gray-700 leading-relaxed italic max-h-[300px] overflow-y-auto pr-4">
                    <ReactMarkdown>{result.resumo_persuasivo || result.motivo}</ReactMarkdown>
                  </div>
                </div>

                {/* Docs Generation */}
                 <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Artefatos Processuais Disponíveis</p>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => handleGenerateDoc('LAUDO')}
                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all text-sm font-bold text-gray-600"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={20} className="text-primary" />
                          Laudo Técnico p/ Cliente
                        </div>
                        <Download size={18} className="text-gray-300" />
                      </button>
                      <button 
                        onClick={() => handleGenerateDoc('ABERTURA')}
                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all text-sm font-bold text-gray-600"
                      >
                        <div className="flex items-center gap-3">
                          <Plus size={20} className="text-primary" />
                          Notificação Extrajudicial
                        </div>
                        <Download size={18} className="text-gray-300" />
                      </button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {generatedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f5f2ed]">
                <h3 className="font-serif font-bold text-xl">Visualização do Documento</h3>
                <button 
                  onClick={() => setGeneratedDoc(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-100 flex justify-center py-8">
                <div 
                   id="preview-documento" 
                   className="bg-white p-12 shadow-md w-full max-w-[210mm] min-h-[297mm] text-black"
                   style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.5', textAlign: 'justify' }}
                 >
                  <style>{`
                    #preview-documento h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 16px; text-transform: uppercase; }
                    #preview-documento h2 { font-size: 12pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px; }
                    #preview-documento h3 { font-size: 11pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
                    #preview-documento p { margin-bottom: 12px; }
                    #preview-documento strong { font-weight: bold; }
                    #preview-documento ul { list-style-type: none; margin-left: 0; padding-left: 0; margin-bottom: 12px; }
                    #preview-documento li { margin-bottom: 8px; }
                    #preview-documento hr { border: none; border-top: 1px solid #000; margin: 16px 0; }
                    .doc-header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
                    .doc-footer { border-top: 1px solid #ccc; margin-top: 40px; padding-top: 10px; font-size: 9pt; color: #666; text-align: center; }
                  `}</style>
                  
                  {/* Cabeçalho Oficial GSA */}
                  <div className="doc-header flex flex-col items-center">
                    <div className="mb-4 flex flex-col items-center justify-center text-primary">
                      <Scale size={40} strokeWidth={2.5} />
                      <div className="mt-1 font-serif font-black text-xl tracking-tighter text-black">
                        GSA <span className="text-[#a51c30]">Câmara</span>
                      </div>
                    </div>
                    <h2 className="text-sm font-bold uppercase m-0 p-0 text-black">GSA Câmara Mediação e Conciliação do Brasil</h2>
                    <p className="text-[10px] m-1">CNPJ: 43.213.208/0001-00</p>
                    <p className="text-[10px] m-0">Contato: 54 3196-2669 | E-mail: gsa@72hrs.com.br</p>
                  </div>

                  <ReactMarkdown>{generatedDoc.content}</ReactMarkdown>

                  <div className="doc-footer">
                    <p>Este documento foi gerado eletronicamente e possui validade jurídica conforme Lei 13.140/2015.</p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
                <button 
                  onClick={() => setGeneratedDoc(null)}
                  className="px-6 py-2 rounded-xl font-medium text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => exportarParaPDF(generatedDoc.type)}
                  className="px-6 py-2 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-[#333] transition-all flex items-center gap-2"
                >
                  <Download size={18} />
                  Baixar PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay for Doc Generation */}
      {isGeneratingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="animate-spin text-primary w-12 h-12 mx-auto mb-4" />
            <p className="font-serif font-bold text-xl text-gray-900">Processando...</p>
          </div>
        </div>
      )}

      {/* Hidden PDF Export Container for Parecer do Agente Especialista */}
      <div 
        id="pdf-export-container" 
        className="bg-white p-12 w-[210mm] min-h-[297mm] text-black fixed top-[-9999px] left-[-9999px] z-[-99]"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.5', textAlign: 'justify' }}
      >
        <style>{`
          #pdf-export-container h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 16px; text-transform: uppercase; }
          #pdf-export-container h2 { font-size: 12pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px; }
          #pdf-export-container h3 { font-size: 11pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
          #pdf-export-container p { margin-bottom: 12px; }
          #pdf-export-container strong { font-weight: bold; }
          #pdf-export-container ul { list-style-type: none; margin-left: 0; padding-left: 0; margin-bottom: 12px; }
          #pdf-export-container li { margin-bottom: 8px; }
          #pdf-export-container hr { border: none; border-top: 1px solid #000; margin: 16px 0; }
        `}</style>
        
        {/* Unit Branding Header */}
        <div className="border-b-2 border-black pb-5 mb-8 text-center flex flex-col items-center">
          {tenantInfo?.logoUrl ? (
            <img src={tenantInfo.logoUrl} alt="Logo da Unidade" className="max-h-20 max-w-[200px] object-contain mb-4" crossOrigin="anonymous" />
          ) : (
            <div className="mb-4 flex flex-col items-center justify-center text-primary">
              <Scale size={40} strokeWidth={2.5} />
              <div className="mt-1 font-serif font-black text-xl tracking-tighter text-black">
                GSA <span className="text-[#a51c30]">Câmara</span>
              </div>
            </div>
          )}
          <h2 className="text-sm font-bold uppercase m-0 p-0 text-black">{tenantInfo?.nome_unidade || 'GSA Câmara Mediação e Conciliação do Brasil'}</h2>
        </div>

        <h1 className="text-center font-bold text-lg uppercase mb-6">Parecer do Agente Especialista - {auditType}</h1>
        {clientName && <p className="mb-4"><strong>Cliente:</strong> {clientName}</p>}
        {result && (
          <ReactMarkdown>{result.resumo_persuasivo || result.motivo}</ReactMarkdown>
        )}

        <div className="border-t border-gray-300 mt-10 pt-4 text-[9pt] text-gray-500 text-center">
          <p>Laudo técnico gerado via Inteligência Artificial - Auditoria Inteligente RX.</p>
        </div>
      </div>
    </div>
  );
}
