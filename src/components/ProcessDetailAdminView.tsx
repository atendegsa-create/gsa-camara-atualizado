import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Plus, FileText, History, AlertCircle, ExternalLink, Sparkles, FileSignature, CheckCircle2, ShieldCheck, ShieldAlert, FileCheck, Brain, Loader2, Download, Search, LayoutList, BrainCircuit, Lock, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProcessStatus, Document as ProcessDocument } from '../types';
import PainelNotificacaoAR from './PainelNotificacaoAR';
import { TEMPLATES, Template } from './DocumentTemplatesView';
import { DocumentEditor } from './DocumentEditor';
import { AIAssistantModal } from './AIAssistantModal';
import { DocumentDraftPreview } from './DocumentDraftPreview';
import { validateDocumentIa } from '../services/geminiService';
import { ProcessSidebarAI } from './ProcessSidebarAI';
import { AuditTimeline } from './AuditTimeline';
import { IntegritySeal } from './IntegritySeal';
import { IntegrityScoreBadge } from './IntegrityScoreBadge';
import { enviarParaAssinatura, prepararDocumentoParaAssinatura } from '../services/signatureService';

import { JudicialEscalationModal } from './JudicialEscalationModal';
import { VideoAudiencia } from './VideoAudiencia';
import { ProcessWhatsAppLog } from './ProcessWhatsAppLog';
import BotaoEnviarArOnline from './BotaoEnviarArOnline';
import { useAuth } from '../AuthContext';

import { ErrorBoundary } from './ErrorBoundary';
import ProcessDocumentGenerator from './ProcessDocumentGenerator';

export function ProcessDetailAdminView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLogMessage, setNewLogMessage] = useState('');
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  
  // Editable fields
  const [status, setStatus] = useState<ProcessStatus | ''>('');
  const [generatingPetition, setGeneratingPetition] = useState(false);
  const [editedPetitionDraft, setEditedPetitionDraft] = useState('');
  const [petitionMode, setPetitionMode] = useState<'preview' | 'edit'>('preview');
  const [faseData, setFaseData] = useState<any>({});
  const [linkAssinatura, setLinkAssinatura] = useState('');
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [tipoAcao, setTipoAcao] = useState('');
  const [selectedDocTemplate, setSelectedDocTemplate] = useState<Template | null>(null);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isDraftPreviewOpen, setIsDraftPreviewOpen] = useState(false);
  const [isSidebarAIOpen, setIsSidebarAIOpen] = useState(false);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [validatingDocId, setValidatingDocId] = useState<string | null>(null);
  
  // Edit states for base info
  const [clienteNome, setClienteNome] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteWhatsapp, setClienteWhatsapp] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [parteContrariaNome, setParteContrariaNome] = useState('');
  const [parteContrariaDocumento, setParteContrariaDocumento] = useState('');
  const [parteContrariaEmail, setParteContrariaEmail] = useState('');
  const [parteContrariaTelefone, setParteContrariaTelefone] = useState('');
  
  const [tiposAcaoList, setTiposAcaoList] = useState<string[]>([]);
  const [isCreatingNewTipoAcao, setIsCreatingNewTipoAcao] = useState(false);
  const [newTipoAcao, setNewTipoAcao] = useState('');

  useEffect(() => {
    const unsubTipos = onSnapshot(doc(db, 'config', 'tipos_acao'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().lista) {
        setTiposAcaoList(docSnap.data().lista);
      } else {
        setTiposAcaoList(['Revisional de Consignado', 'Limpa Nome', 'Cancelamento de RMC', 'Superendividamento']);
      }
    }, (error) => {
      console.warn("Config - onSnapshot ignorado por cache/auth local:", error);
      setTiposAcaoList(['Revisional de Consignado', 'Limpa Nome', 'Cancelamento de RMC', 'Superendividamento']);
    });
    return () => unsubTipos();
  }, []);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'processos', id, 'documentos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcessDocument));
      setDocuments(docs);
    }, (error) => {
      console.warn("Documentos - onSnapshot ignorado por cache/auth local:", error);
    });

    return () => unsubscribe();
  }, [id]);

  const handleValidateDocument = async (docItem: ProcessDocument) => {
    if (!id || !process) return;
    setValidatingDocId(docItem.id);
    try {
      const expectedData = {
        nome: process.cliente_nome || '',
        cpf: process.cliente_documento || '',
        morada: process.cliente_endereco || 'Não informada'
      };

      const result = await validateDocumentIa(docItem.url_storage, expectedData);
      
      // Salva o resultado no Firestore do documento
      const docRef = doc(db, 'processos', id, 'documentos', docItem.id);
      await updateDoc(docRef, {
        validacao_ia: {
          score: result.scoreConfianca,
          divergencias: result.divergencias,
          documentoLegivel: result.documentoLegivel,
          validado_em: new Date().toISOString()
        }
      });

      // Adiciona log ao processo (Subcoleção de Auditoria)
      await addDoc(collection(db, 'processos', id, 'logs'), {
        tipo: 'IA',
        status: process.status,
        mensagem: `IA validou documento "${docItem.titulo}" com score ${result.scoreConfianca}. Divergências: ${result.divergencias.length}`,
        autor_id: 'SISTEMA_IA',
        autor_nome: 'Inteligência Artificial GSA',
        is_ia: true,
        createdAt: serverTimestamp(),
        metadata: {
          docId: docItem.id,
          score: result.scoreConfianca
        }
      });

      // Retrocompatibilidade: Adiciona log ao array do processo
      await updateDoc(doc(db, 'processos', id), {
        logs: arrayUnion({
          status: process.status,
          mensagem: `IA validou documento "${docItem.titulo}" com score ${result.scoreConfianca}. Divergências: ${result.divergencias.length}`,
          data: new Date().toISOString()
        })
      });

    } catch (error) {
      console.error("Erro ao validar documento:", error);
      alert("Falha na validação com IA.");
    } finally {
      setValidatingDocId(null);
    }
  };

  useEffect(() => {
    const fetchProcess = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'processos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProcess({ id: docSnap.id, ...data });
          setStatus(data.status || 'TRIAGEM');
          setFaseData(data.fase_data || {});
          setLinkAssinatura(data.link_assinatura || '');
          setLaudoTecnico(data.laudo_tecnico || '');
          setTipoAcao(data.tipo_acao || '');
          setClienteNome(data.cliente_nome || '');
          setClienteDocumento(data.cliente_documento || '');
          setClienteWhatsapp(data.cliente_whatsapp || '');
          setClienteEmail(data.cliente_email || '');
          setParteContrariaNome(data.parte_contraria_nome || '');
          setParteContrariaDocumento(data.parte_contraria_documento || '');
          setParteContrariaEmail(data.parte_contraria_email || '');
          setParteContrariaTelefone(data.parte_contraria_telefone || '');
          setEditedPetitionDraft(data.peticao_draft_markdown || '');
        }
      } catch (error) {
        console.error("Erro ao buscar processo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProcess();
  }, [id]);

  const handleGenerateExecutionPetition = async () => {
    if (!id) return;
    setGeneratingPetition(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/execution/${id}/generate-execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar petição.");
      }

      // Refresh local process
      const docRef = doc(db, 'processos', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const updatedData = docSnap.data();
        setProcess({ id: docSnap.id, ...updatedData });
        setStatus(updatedData.status || 'JUDICIAL_AGUARDANDO_PETICAO');
        setEditedPetitionDraft(updatedData.peticao_draft_markdown || '');
      }
      alert("Petição de Execução gerada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar petição:", error);
      alert(error.message || "Erro ao gerar petição por IA.");
    } finally {
      setGeneratingPetition(false);
    }
  };

  const handleSavePetitionDraft = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'processos', id);
      await updateDoc(docRef, {
        peticao_draft_markdown: editedPetitionDraft,
        updatedAt: serverTimestamp()
      });
      // Refresh local process
      setProcess((prev: any) => ({ ...prev, peticao_draft_markdown: editedPetitionDraft }));
      alert("Rascunho da petição atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar petição:", error);
      alert("Falha ao salvar rascunho.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewTipoAcao = async () => {
    if (!newTipoAcao.trim()) return;
    try {
      const docRef = doc(db, 'config', 'tipos_acao');
      const docSnap = await getDoc(docRef);
      const novoTipo = newTipoAcao.trim();
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          lista: arrayUnion(novoTipo)
        });
      } else {
        await setDoc(docRef, {
          lista: [novoTipo]
        });
      }
      setTipoAcao(novoTipo);
      setNewTipoAcao('');
      setIsCreatingNewTipoAcao(false);
    } catch (error) {
      console.error("Erro ao criar tipo de ação:", error);
    }
  };

  const handleUpdateStatusAndContent = async () => {
    if (!id || !process) return;
    setSaving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      const updates: any = {
        status,
        link_assinatura: linkAssinatura,
        laudo_tecnico: laudoTecnico,
        tipo_acao: tipoAcao,
        fase_data: faseData,
        cliente_nome: clienteNome,
        cliente_documento: clienteDocumento,
        cliente_whatsapp: clienteWhatsapp,
        cliente_email: clienteEmail,
        parte_contraria_nome: parteContrariaNome,
        parte_contraria_documento: parteContrariaDocumento,
        parte_contraria_email: parteContrariaEmail,
        parte_contraria_telefone: parteContrariaTelefone,
      };

      if (newLogMessage.trim()) {
        const logData = {
          tipo: 'MENSAGEM',
          status,
          mensagem: newLogMessage,
          autor_id: auth.currentUser?.uid || 'SISTEMA',
          autor_nome: auth.currentUser?.displayName || 'Operador GSA',
          is_ia: false,
          createdAt: serverTimestamp()
        };

        // Salva na subcoleção de auditoria
        await addDoc(collection(db, 'processos', id, 'logs'), logData);

        // Retrocompatibilidade
        updates.logs = arrayUnion({
          status,
          mensagem: newLogMessage,
          data: new Date().toISOString()
        });
      }

      // Notificação Automática Seledct (E-mail e App)
      if (notifyByEmail) {
         try {
            await addDoc(collection(db, 'system_notifications'), {
               tipo: 'EMAIL_AND_APP_PROCESS_UPDATE',
               processoId: id,
               clienteEmail: clienteEmail,
               clienteNumero: clienteWhatsapp,
               unidadeDestino: process?.unidade_id || 'N/A',
               mensagem: `Atualização (Fase ${status}): ${faseData?.observacao || 'Processo atualizado.'}`,
               fase: status,
               dataCriacao: serverTimestamp()
            });
            console.log("Notificação gerada com sucesso!");
         } catch(e) {
            console.error("Erro ao gerar notificação:", e);
         }
      }

      const response = await fetch(`/api/processos/atualizar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ id, updates })
      });

      if (!response.ok) throw new Error("Erro ao atualizar via API");

      // Atualiza estado local após sucesso
      const updatedDoc = await getDoc(doc(db, 'processos', id));
      if (updatedDoc.exists()) {
        setProcess({ id: updatedDoc.id, ...updatedDoc.data() });
      }

      setNewLogMessage('');
      setNotifyByEmail(false);
      alert("Processo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar processo:", error);
      alert("Falha ao salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-12">Carregando processo...</div>;
  }

  if (!process) {
    return <div className="text-center p-12 text-red-500">Processo não encontrado.</div>;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <button 
            onClick={() => navigate('..')}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900">Gerenciar Processo</h2>
            <p className="text-gray-500 font-mono">NUP: {process.nup}</p>
          </div>
          <div className="flex items-center gap-3">
            {status === 'AUDIENCIA' && (
              <button 
                onClick={() => setIsVideoOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm shadow-emerald-600/10"
              >
                <Video size={16} className="text-emerald-500" />
                Sala de Audiência
              </button>
            )}
            <BotaoEnviarArOnline processo={process} tenantSlug={process.tenantId || ''} />
            <button 
              onClick={() => setIsEscalationModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-700 border-2 border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-red-400"
            >
              Encaminhar Judicial
            </button>
            <button 
              onClick={() => setIsDraftPreviewOpen(true)}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-700 to-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
            >
              <Sparkles className="w-4 h-4 text-yellow-300 group-hover:rotate-12 transition-transform" />
              IA Sentença/Acordo
            </button>
            <button 
              onClick={() => setIsAIAssistantOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all"
            >
              Assistente Jurídico
            </button>
            <button 
              onClick={() => setIsSidebarAIOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
            >
              <BrainCircuit className="w-4 h-4" />
              Análise IA (Copilot)
            </button>
            <button 
              onClick={() => window.open(`/acompanhar/${process.nup}`, '_blank')}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
            >
              Ver Pública
              <ExternalLink size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Blind Bidding Viability Alert */}
      {process.blind_bidding?.proposta_requerente && process.blind_bidding?.proposta_requerido && (
        <div className="mb-6 px-1">
          {(() => {
            const req = process.blind_bidding.proposta_requerente;
            const res = process.blind_bidding.proposta_requerido;
            const diff = Math.abs(req - res);
            const marginPercentage = (diff / Math.max(req, res));
            const isViable = marginPercentage <= (process.blind_bidding.margem_viabilidade || 0.10);

            if (isViable) {
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-md border border-green-200 rounded-[2rem] flex items-center gap-5 shadow-xl shadow-green-900/5"
                >
                  <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-green-900 font-bold text-xl">Viabilidade de Acordo Detectada!</h3>
                    <p className="text-green-700 font-medium">
                      As propostas estão a apenas <span className="underline decoration-green-400">{(marginPercentage * 100).toFixed(1)}%</span> de distância. Recomendado avançar para audiência imediatamente.
                    </p>
                  </div>
                </motion.div>
              );
            }
            return (
              <div className="p-4 bg-gray-50/50 backdrop-blur-sm border border-gray-200 rounded-2xl flex items-center gap-3 opacity-60">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <p className="text-gray-500 text-sm font-medium">
                  Propostas cegas recebidas. Diferença atual: {(marginPercentage * 100).toFixed(1)}%.
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {status === 'NOTIFICACAO' && (
        <PainelNotificacaoAR />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Painel Esquerdo: Dados do Processo e Edição */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Informações Base</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Requerente (Cliente)</p>
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={clienteNome} 
                  onChange={(e) => setClienteNome(e.target.value)} 
                  className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm font-medium"
                  placeholder="Nome do Requerente"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={clienteDocumento} 
                    onChange={(e) => setClienteDocumento(e.target.value)} 
                    className="w-1/2 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
                    placeholder="CPF/CNPJ"
                  />
                  <input 
                    type="text" 
                    value={clienteWhatsapp} 
                    onChange={(e) => setClienteWhatsapp(e.target.value)} 
                    className="w-1/2 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
                    placeholder="WhatsApp"
                  />
                </div>
                <input 
                  type="email" 
                  value={clienteEmail} 
                  onChange={(e) => setClienteEmail(e.target.value)} 
                  className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
                  placeholder="E-mail do Requerente"
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Requerido (Parte Contrária)</p>
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={parteContrariaNome} 
                  onChange={(e) => setParteContrariaNome(e.target.value)} 
                  className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm font-medium"
                  placeholder="Nome da Parte Contrária"
                />
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={parteContrariaEmail} 
                    onChange={(e) => setParteContrariaEmail(e.target.value)} 
                    className="w-1/2 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
                    placeholder="E-mail"
                  />
                  <input 
                    type="text" 
                    value={parteContrariaTelefone} 
                    onChange={(e) => setParteContrariaTelefone(e.target.value)} 
                    className="w-1/2 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
                    placeholder="WhatsApp / Telefone"
                  />
                </div>
                <input 
                  type="text" 
                  value={parteContrariaDocumento} 
                  onChange={(e) => setParteContrariaDocumento(e.target.value)} 
                  className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
                  placeholder="Documento (CNPJ/CPF) parte contrária"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-bold uppercase mb-1 flex items-center justify-between">
              <span>Tipo de Ação / Serviço</span>
              <button 
                onClick={() => setIsCreatingNewTipoAcao(!isCreatingNewTipoAcao)}
                className="text-blue-600 hover:text-blue-800 text-[10px] font-bold"
              >
                {isCreatingNewTipoAcao ? 'Cancelar' : '+ Novo'}
              </button>
            </label>
            {isCreatingNewTipoAcao ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newTipoAcao} 
                  onChange={(e) => setNewTipoAcao(e.target.value)} 
                  className="flex-1 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent font-medium text-sm"
                  placeholder="Nome do serviço"
                />
                <button 
                  onClick={handleCreateNewTipoAcao}
                  className="px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 text-sm"
                >
                  Criar
                </button>
              </div>
            ) : (
              <select 
                value={tipoAcao} 
                onChange={(e) => setTipoAcao(e.target.value)} 
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent font-medium"
              >
                <option value="">Selecione...</option>
                {tiposAcaoList.map((tipo, idx) => (
                  <option key={idx} value={tipo}>{tipo}</option>
                ))}
                {tipoAcao && !tiposAcaoList.includes(tipoAcao) && (
                   <option value={tipoAcao}>{tipoAcao} (Atual)</option>
                )}
              </select>
            )}
          </div>

           <div>
            <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Fase Atual (Status)</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as ProcessStatus)} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent font-bold bg-gray-50"
            >
              <option value="LEAD_NOVO">Lead Novo</option>
              <option value="AGUARDANDO_TAP">Aguardando TAP</option>
              <option value="TRIAGEM">Triagem</option>
              <option value="ANALISE_DOCUMENTAL">Análise Documental</option>
              <option value="NOTIFICACAO">Notificação Enviada</option>
              <option value="CONVITE_REU">Convite ao Réu</option>
              <option value="AUDIENCIA">Audiência Agendada</option>
              <option value="EM_NEGOCIACAO">Em Negociação</option>
              <option value="ACORDO_HOMOLOGADO">Acordo Homologado</option>
              <option value="PAGAMENTO_ATRASO">Acordo com Pagamento em Atraso</option>
              <option value="JUDICIAL_AGUARDANDO_PETICAO">Aguardando Petição Judicial de Execução</option>
              <option value="SEM_ACORDO">Sem Acordo</option>
              <option value="JUDICIAL">Judicial</option>
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
             <p className="text-xs text-gray-500 font-bold uppercase mb-2">Detalhes da Fase: {status}</p>
             <div className="mb-4">
               <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Observação da Fase (Visível para o Cliente)</label>
               <textarea 
                  className="w-full p-2 rounded-lg text-sm border border-gray-200" 
                  placeholder="Ex: Fase detalhada..." 
                  value={faseData.observacao || ''} 
                  onChange={(e) => setFaseData({...faseData, observacao: e.target.value})} 
               />
             </div>
             {status === 'AGUARDANDO_TAP' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Valor TAP (R$)</label>
                    <input type="number" className="w-full p-2 rounded-lg text-sm border border-gray-200" value={process?.valor_tap || ''} disabled />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Pagamento</label>
                    <input type="date" className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.data_pagamento_tap || ''} onChange={(e) => setFaseData({...faseData, data_pagamento_tap: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Forma Pagto</label>
                    <select className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.forma_pagamento_tap || ''} onChange={(e) => setFaseData({...faseData, forma_pagamento_tap: e.target.value})}>
                      <option value="">Selecione...</option><option value="PIX">Pix</option><option value="BOLETO">Boleto</option><option value="CARTAO">Cartão</option>
                    </select>
                  </div>
                </div>
             ) : status === 'TRIAGEM' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button onClick={() => setFaseData({...faseData, decisao_triagem: 'ACEITO'})} className={`flex-1 p-2 rounded-lg text-sm font-bold border ${faseData.decisao_triagem === 'ACEITO' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white'}`}>Aceitar</button>
                    <button onClick={() => setFaseData({...faseData, decisao_triagem: 'RECUSADO'})} className={`flex-1 p-2 rounded-lg text-sm font-bold border ${faseData.decisao_triagem === 'RECUSADO' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-white'}`}>Recusar</button>
                    <button onClick={() => setFaseData({...faseData, decisao_triagem: 'MAIS_INFORMACOES'})} className={`flex-1 p-2 rounded-lg text-sm font-bold border ${faseData.decisao_triagem === 'MAIS_INFORMACOES' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white'}`}>Pendência</button>
                  </div>
                  {faseData.decisao_triagem && faseData.decisao_triagem !== 'ACEITO' && (
                    <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Motivo / Solicitação..." value={faseData.motivo_triagem || ''} onChange={(e) => setFaseData({...faseData, motivo_triagem: e.target.value})} />
                  )}
                </div>
             ) : status === 'ANALISE_DOCUMENTAL' ? (
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 mb-2">Solicitar Documento / Informação</p>
                    <div className="flex flex-col gap-2 relative">
                      <select id="ad_tipo" className="w-full p-2 rounded-lg text-sm border border-gray-200">
                        <option value="DOCUMENTO">Solicitar Arquivo/Documento</option>
                        <option value="INFORMACAO">Solicitar Informação em Texto</option>
                      </select>
                      <div className="flex gap-2">
                        <input id="ad_nome" type="text" className="flex-1 p-2 rounded-lg text-sm border border-gray-200" placeholder="Nome do doc ou pergunta..." />
                        <button 
                          onClick={() => {
                            const tipoEl = document.getElementById('ad_tipo') as HTMLSelectElement;
                            const nomeEl = document.getElementById('ad_nome') as HTMLInputElement;
                            if (!nomeEl.value) return;
                            const novasSolicitacoes = [...(faseData.solicitacoes_documentais || []), {
                              id: Math.random().toString(36).substr(2, 9),
                              tipo: tipoEl.value as any,
                              nome: nomeEl.value,
                              status: 'PENDENTE' as any
                            }];
                            setFaseData({...faseData, solicitacoes_documentais: novasSolicitacoes});
                            nomeEl.value = '';
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                        >+ Add</button>
                      </div>
                    </div>
                  </div>
                  
                  {faseData.solicitacoes_documentais && faseData.solicitacoes_documentais.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Pendências Atuais</p>
                      {faseData.solicitacoes_documentais.map(solicitacao => (
                        <div key={solicitacao.id} className="p-3 bg-white rounded-lg border border-gray-200 text-sm flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-800">{solicitacao.nome}</span>
                              <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{solicitacao.tipo}</span>
                            </div>
                            <button onClick={() => {
                              const novas = faseData.solicitacoes_documentais!.filter(s => s.id !== solicitacao.id);
                              setFaseData({...faseData, solicitacoes_documentais: novas});
                            }} className="text-red-500 hover:text-red-700 text-xs font-bold">X</button>
                          </div>
                          {solicitacao.status === 'ENVIADO' ? (
                            <div className="bg-emerald-50 text-emerald-800 p-2 rounded text-xs border border-emerald-100">
                              <span className="font-bold">Resposta Cliente:</span> {solicitacao.resposta}
                              {solicitacao.resposta?.startsWith('http') && (
                                <a href={solicitacao.resposta} target="_blank" rel="noreferrer" className="block text-blue-600 underline mt-1">Ver Arquivo Anexado</a>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 text-xs font-medium">Aguardando cliente...</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             ) : status === 'NOTIFICACAO' ? (
                <div className="space-y-2">
                  <select className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.tipo_notificacao || ''} onChange={(e) => setFaseData({...faseData, tipo_notificacao: e.target.value as any})}>
                    <option value="">Selecione...</option><option value="AR">AR Correios</option><option value="EMAIL">E-mail</option><option value="WHATSAPP">WhatsApp</option><option value="EDITAL">Edital Público</option>
                  </select>
                  {faseData.tipo_notificacao === 'AR' && (
                    <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Vínculo AR Online / Código" value={faseData.vinculo_ar_online || ''} onChange={(e) => setFaseData({...faseData, vinculo_ar_online: e.target.value})} />
                  )}
                </div>
             ) : status === 'CONVITE_REU' ? (
                <div className="space-y-2">
                  <input type="date" className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.data_convite || ''} onChange={(e) => setFaseData({...faseData, data_convite: e.target.value})} />
                  <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Forma de envio..." value={faseData.forma_envio_convite || ''} onChange={(e) => setFaseData({...faseData, forma_envio_convite: e.target.value})} />
                  <select className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.status_convite || ''} onChange={(e) => setFaseData({...faseData, status_convite: e.target.value as any})}>
                    <option value="">Status...</option><option value="ACEITO">Aceito</option><option value="NEGADO">Negado</option><option value="SEM_RETORNO">Sem Retorno</option>
                  </select>
                </div>
             ) : status === 'AUDIENCIA' ? (
                <div className="space-y-2">
                  <input type="date" className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.data_audiencia || ''} onChange={(e) => setFaseData({...faseData, data_audiencia: e.target.value})} />
                  <input type="time" className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.hora_audiencia || ''} onChange={(e) => setFaseData({...faseData, hora_audiencia: e.target.value})} />
                  <select className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.local_audiencia || ''} onChange={(e) => setFaseData({...faseData, local_audiencia: e.target.value as any})}>
                    <option value="PRESENCIAL">Presencial</option><option value="ONLINE">Online</option>
                  </select>
                  {faseData.local_audiencia === 'PRESENCIAL' ? ( <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Endereço..." value={faseData.endereco_audiencia || ''} onChange={(e) => setFaseData({...faseData, endereco_audiencia: e.target.value})} />) : ( <input type="url" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Link Meet..." value={faseData.link_meet || ''} onChange={(e) => setFaseData({...faseData, link_meet: e.target.value})} />)}
                </div>
             ) : status === 'EM_NEGOCIACAO' ? (
                <div className="space-y-2">
                  <input type="number" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Proposta (R$)" value={faseData.valor_proposta || ''} onChange={(e) => setFaseData({...faseData, valor_proposta: parseFloat(e.target.value)})} />
                  <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Forma de Pagamento..." value={faseData.forma_pagamento_proposta || ''} onChange={(e) => setFaseData({...faseData, forma_pagamento_proposta: e.target.value})} />
                  <select className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.resposta_cliente_proposta || ''} onChange={(e) => setFaseData({...faseData, resposta_cliente_proposta: e.target.value as any})}>
                    <option value="">Status Resposta</option><option value="ACEITO">Aceitou</option><option value="RECUSADO">Recusou</option><option value="CONTRA_PROPOSTA">Contra</option>
                  </select>
                </div>
             ) : status === 'ACORDO_HOMOLOGADO' ? (
                <div className="space-y-2">
                  <input type="number" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Valor Acordo (R$)" value={faseData.valor_acordo || ''} onChange={(e) => setFaseData({...faseData, valor_acordo: parseFloat(e.target.value)})} />
                  <input type="date" className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.data_pagamento_acordo || ''} onChange={(e) => setFaseData({...faseData, data_pagamento_acordo: e.target.value})} />
                  <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Forma Pagto..." value={faseData.forma_pagamento_acordo || ''} onChange={(e) => setFaseData({...faseData, forma_pagamento_acordo: e.target.value})} />
                  <input type="url" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Link Doc Acordo..." value={faseData.documento_acordo_url || ''} onChange={(e) => setFaseData({...faseData, documento_acordo_url: e.target.value})} />
                </div>
             ) : status === 'SEM_ACORDO' ? (
                <button onClick={() => setStatus('JUDICIAL')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Mover p/ Judicial</button>
             ) : status === 'JUDICIAL' ? (
                <div className="space-y-2">
                  <select className="w-full p-2 rounded-lg text-sm border border-gray-200" value={faseData.tipo_juridico || ''} onChange={(e) => setFaseData({...faseData, tipo_juridico: e.target.value as any})}>
                    <option value="">Tipo Jurídico...</option><option value="INTERNO">Interno</option><option value="PARTICULAR">Particular</option>
                  </select>
                  <input type="text" className="w-full p-2 rounded-lg text-sm border border-gray-200" placeholder="Nome Advogado/Escritório..." value={faseData.advogado_responsavel || ''} onChange={(e) => setFaseData({...faseData, advogado_responsavel: e.target.value})} />
                </div>
             ) : status === 'PAGAMENTO_ATRASO' ? (
                <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-red-900">Inadimplemento Identificado</h4>
                      <p className="text-xs text-red-700 mt-1">
                        O acordo de conciliação extrajudicial foi inadimplido pelo devedor. Você pode disparar o fluxo de Execução Judicial com redação de petição automática guiada por IA de alta fidelidade técnica.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleGenerateExecutionPetition}
                    disabled={generatingPetition}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {generatingPetition ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando Petição de Execução...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Gerar Petição de Execução por IA
                      </>
                    )}
                  </button>
                </div>
             ) : status === 'JUDICIAL_AGUARDANDO_PETICAO' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-sm text-gray-800">Rascunho Jurídico da Execução</h4>
                    </div>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPetitionMode('preview')}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-md transition",
                          petitionMode === 'preview' ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        Visualizar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPetitionMode('edit')}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-md transition",
                          petitionMode === 'edit' ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        Editar
                      </button>
                    </div>
                  </div>

                  {petitionMode === 'preview' ? (
                    <div className="p-4 bg-white border border-gray-100 rounded-xl max-h-96 overflow-y-auto text-sm text-gray-700 leading-relaxed prose prose-sm">
                      {editedPetitionDraft ? (
                        <div className="markdown-body">
                          <ReactMarkdown>{editedPetitionDraft}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">Rascunho indisponível. Gere a petição novamente.</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      className="w-full h-80 p-3 text-xs font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent bg-gray-50"
                      value={editedPetitionDraft}
                      onChange={(e) => setEditedPetitionDraft(e.target.value)}
                      placeholder="Petição jurídica em Markdown..."
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSavePetitionDraft}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Salvar Rascunho
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setStatus('JUDICIAL')}
                      className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition"
                    >
                      Mover para Judicial Ativo
                    </button>
                  </div>
                </div>
             ) : (
                <p className="text-sm text-gray-400 italic">Sem campos adicionais.</p>
             )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Link de Assinatura Digital</label>
            <input 
              type="url" 
              value={linkAssinatura} 
              onChange={(e) => setLinkAssinatura(e.target.value)} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
              placeholder="https://app.d4sign.com.br/..."
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Link do Laudo Técnico Pericial</label>
            <input 
              type="url" 
              value={laudoTecnico} 
              onChange={(e) => setLaudoTecnico(e.target.value)} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm"
              placeholder="https://drive.google.com/..."
            />
          </div>

          {/* Cofre de Evidências (Documentos) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-lg border-b border-gray-100 pb-2 flex items-center gap-2">
              <FileCheck size={20} className="text-brand-primary" />
              Cofre de Evidências
            </h3>
            
            {process.termoAcordoHash && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 font-bold uppercase mb-2">Termo de Acordo Final (Assinatura Avançada)</p>
                <IntegritySeal 
                  processId={id!}
                  storedHash={process.termoAcordoHash}
                  fileUrl={process.termoAcordoUrl || ''} // Fallback to process field
                  fileName="Termo_de_Acordo_Digital.pdf"
                  processData={process}
                />
              </div>
            )}

            {process.videoHash && process.videoUrl && (
              <div className="mb-4 p-5 bg-gradient-to-r from-gray-900 to-[#1a1a1a] rounded-[2rem] border border-gray-800 shadow-xl shadow-black/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <Video size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Gravação da Audiência</h4>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                      <Lock size={12} /> Integridade Selada
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => window.open(process.videoUrl, '_blank')}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 backdrop-blur-md font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Assistir Gravação
                </button>
              </div>
            )}

            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-50 rounded-2xl">
                  <p className="text-sm text-gray-400">Nenhum documento anexado.</p>
                </div>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <FileText size={18} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{doc.titulo}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{doc.tipo_documento}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.hash && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <Lock size={10} /> ÍNTEGRO
                          </div>
                        )}
                        <a 
                          href={doc.url_storage} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 text-gray-400 hover:text-brand-primary hover:bg-white rounded-lg transition-all"
                        >
                          <Download size={16} />
                        </a>
                        <button 
                          onClick={() => handleValidateDocument(doc)}
                          disabled={validatingDocId === doc.id}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 group",
                            doc.validacao_ia 
                              ? "bg-white border border-gray-100 text-gray-400 hover:text-indigo-600" 
                              : "bg-indigo-600 text-white hover:bg-black"
                          )}
                        >
                          {validatingDocId === doc.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} className={cn("transition-transform group-hover:rotate-12", !doc.validacao_ia && "text-yellow-300")} />
                          )}
                          {doc.validacao_ia ? 'Reauditar IA' : 'Auditar com IA'}
                        </button>
                      </div>
                    </div>

                    {/* Integrity Score Badge */}
                    {doc.validacao_ia && (
                      <div className="flex justify-start">
                        <IntegrityScoreBadge 
                          score={doc.validacao_ia.score}
                          divergencias={doc.validacao_ia.divergencias}
                          documentoLegivel={doc.validacao_ia.documentoLegivel}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Histórico do WhatsApp Módulo */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Comunicações no WhatsApp</h3>
            <ProcessWhatsAppLog processoId={id!} />
          </div>

        </section>

        <section className="col-span-full">
          <ProcessDocumentGenerator processo={process} tenant={tenant} />
        </section>

        {/* Painel Central/Direito: Gerador de Documentos */}
        <section className="col-span-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Documentos e Assinaturas Digital</h3>
              <p className="text-gray-500 text-sm">Gere minutas, procurações e acordos preenchidos com os dados deste processo.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <FileSignature size={20} />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {TEMPLATES.filter(t => {
                // Se estiver em fase de acordo, mostra termo de acordo
                if (t.id === 'termo_acordo' && status !== 'ACORDO' && status !== 'ACORDO_HOMOLOGADO' && status !== 'EM_NEGOCIACAO') return false;
                return true;
            }).map(template => {
              const Icon = template.icon;
              return (
                <button 
                  key={template.id}
                  onClick={() => setSelectedDocTemplate(template)}
                  className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4 hover:border-[#5A5A40] hover:bg-white transition-all text-left group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{template.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{template.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Painel Direito: Andamentos e Logs */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2 mb-4">Adicionar Andamento</h3>
          
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Novo Registro no Histórico</label>
              <textarea 
                value={newLogMessage} 
                onChange={(e) => setNewLogMessage(e.target.value)} 
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent text-sm resize-none"
                placeholder="Descreva o andamento... (ex: 'Recebemos os documentos e encaminhamos para análise revisional')"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <input 
                id="notify-email"
                type="checkbox" 
                checked={notifyByEmail}
                onChange={(e) => setNotifyByEmail(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
              />
              <label htmlFor="notify-email" className="text-sm font-bold text-indigo-900 cursor-pointer select-none">
                Notificar cliente por e-mail automaticamente
              </label>
            </div>
            
            <button 
              onClick={handleUpdateStatusAndContent}
              disabled={saving}
              className="w-full py-4 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-[#333] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              Salvar Alterações
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex-1 flex flex-col min-h-[400px]">
             <h4 className="font-bold text-sm text-gray-900 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutList size={18} className="text-indigo-600" />
                  Linha do Tempo de Auditoria
                </div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-2 py-1 rounded-md">Imutável</span>
             </h4>
             
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <AuditTimeline processId={id!} />
             </div>
          </div>
        </section>

      </div>

      {selectedDocTemplate && (
        <DocumentEditor 
          template={selectedDocTemplate}
          process={process}
          onClose={() => setSelectedDocTemplate(null)}
        />
      )}

      <AIAssistantModal 
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        processo={process}
      />

      <AnimatePresence>
        {isDraftPreviewOpen && (
          <DocumentDraftPreview 
            processoId={id!}
            onClose={() => setIsDraftPreviewOpen(false)}
            onSave={() => {
               // Refresh process data to show new logs
               const fetchProcess = async () => {
                try {
                  const docRef = doc(db, 'processos', id!);
                  const docSnap = await getDoc(docRef);
                  if (docSnap.exists()) {
                    setProcess({ id: docSnap.id, ...docSnap.data() });
                  }
                } catch (e) {}
              };
              fetchProcess();
            }}
          />
        )}
      </AnimatePresence>

      <ProcessSidebarAI 
        processData={process}
        isOpen={isSidebarAIOpen}
        onClose={() => setIsSidebarAIOpen(false)}
      />

      <AnimatePresence>
        {isEscalationModalOpen && (
          <JudicialEscalationModal 
            process={process}
            tenant={tenant}
            onClose={() => setIsEscalationModalOpen(false)}
            onSuccess={() => {
              setIsEscalationModalOpen(false);
              // Refresh process
              const fetchProcess = async () => {
                const docRef = doc(db, 'processos', id!);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  setProcess({ id: docSnap.id, ...docSnap.data() });
                }
              };
              fetchProcess();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isVideoOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[1400px] bg-transparent shadow-2xl relative"
            >
              <button 
                onClick={() => setIsVideoOpen(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 font-bold tracking-widest text-sm"
              >
                FECHAR SALA
              </button>
              <VideoAudiencia 
                processo={process} 
                tenant={tenant}
                userName={auth.currentUser?.displayName || "Mediador GSA"} 
                isMediator={true}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
