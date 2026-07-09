import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  arrayUnion, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Trash2, Settings, FileText, Users, Layers, Download, CheckCircle2, Clock, 
  MapPin, User, Folder, ExternalLink, Eye, List, Briefcase, Calendar, 
  ChevronRight, Check, FileCheck, AlertCircle, X, ShieldAlert, ArrowRight, Activity, Paperclip,
  Sparkles, Bot, Zap, Send, CheckCircle, MessageSquare, Building2,
  Target, ShieldCheck, Play, HelpCircle, Loader2, Copy, Command, AlertTriangle, Video, FileSignature
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Core structural TypeScript models
interface Processo {
  id: string;
  cliente?: string;
  unidade?: string;
  tipo?: string;
  status?: string; // 'Triagem' | 'Análise Jurídica' | 'Distribuído' | 'Audiência Marcada' | 'Pendente de Informações' | 'Pronto para Distribuição'
  dadosPreenchidos?: Record<string, string>;
  documentos?: { nome: string; status: 'Pendente' | 'Anexado' | 'Assinado'; obrigatorio: boolean }[];
  operadoresVinculados?: string[];
  audiencias?: string[];
  historico?: { data: string; acao: string; usuario: string }[];
  prioridade?: 'Baixa' | 'Media' | 'Alta' | 'Critica';
  risco?: 'Baixo' | 'Medio' | 'Alto' | 'Critico';
  slaDias?: number;
  dataCriacao?: string;
  tipoJustica?: 'extrajudicial' | 'judicial';
}

interface ModeloEsteira {
  id?: string;
  nomeAcao: string;
  camposObrigatorios: string[];
  documentosChecklist: string[];
}

// Relational error codes standardizer
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function JuridicoProcessManagementView() {
  const { isMaster, profile } = useAuth();
  
  // States of simulated user views (Master / Lawyer / Unit Agent)
  const [viewMode, setViewMode] = useState<'master' | 'operador' | 'usuario'>('master');
  const [modelos, setModelos] = useState<ModeloEsteira[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [selectedProcId, setSelectedProcId] = useState<string>('');
  
  // Active layouts controls
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list');
  const [detailTab, setDetailTab] = useState<'geral' | 'dados' | 'checklist' | 'timeline' | 'historico'>('geral');
  
  // Master modeler panel states
  const [showModelador, setShowModelador] = useState(false);
  const [nomeAcao, setNomeAcao] = useState('');
  const [novoCampo, setNovoCampo] = useState('');
  const [camposList, setCamposList] = useState<string[]>([]);
  const [novoDoc, setNovoDoc] = useState('');
  const [docsList, setDocsList] = useState<string[]>([]);
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  
  // Interaction variables & loaders
  const [loading, setLoading] = useState(true);
  const [novoEmail, setNovoEmail] = useState('');
  const [isSigningTrio, setIsSigningTrio] = useState(false);
  const [blockingAlert, setBlockingAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Simulated integrations states (OCR Scan, WhatsApp, Gemini Copilot)
  const [isScanningDoc, setIsScanningDoc] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<number>(0);
  const [scanScore, setScanScore] = useState<number>(0);
  
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppHistory, setWhatsAppHistory] = useState<{ sender: 'agent' | 'client'; text: string; time: string }[]>([]);
  const [whatsAppPendingDoc, setWhatsAppPendingDoc] = useState('');

  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiHistory, setAiHistory] = useState<{ query: string; answer: string; time: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New process modal states
  const [showNovoProcessoModal, setShowNovoProcessoModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState('');
  const [novaUnidade, setNovaUnidade] = useState('');
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('');
  const [dadosIniciais, setDadosIniciais] = useState<Record<string, string>>({});
  const [prioridadeSelecionada, setPrioridadeSelecionada] = useState<'Baixa' | 'Media' | 'Alta' | 'Critica'>('Media');

  // Command bar search overlay (Ctrl+K)
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [cmdKQuery, setCmdKQuery] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to Auth context to match viewMode if needed
  useEffect(() => {
    if (isMaster || profile?.tipo_usuario === 'MASTER' || profile?.tipo_usuario === 'AdminGeral') {
      setViewMode('master');
    } else if (profile?.tipo_usuario === 'ADVOGADO' || profile?.tipo_usuario === 'Mediador') {
      setViewMode('operador');
    } else {
      setViewMode('usuario');
    }
  }, [isMaster, profile]);

  // Active Real-Time Listeners: Models and Cases
  useEffect(() => {
    if (!profile) return;

    const userRole = profile?.tipo_usuario || '';
    const isMasterUser = userRole === 'MASTER' || userRole === 'MasterAdmin' || isMaster || userRole === 'AdminGeral' || userRole === 'ADMIN';
    const isAnalistaUser = userRole === 'ANALISTA' || (userRole as string) === 'Analista';
    const myTenantId = profile?.tenantId || profile?.unidadeId || '';

    const unsubModelos = onSnapshot(collection(db, 'modelos_esteira'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ModeloEsteira));
      setModelos(list);
      
      // Auto seed some templates if completely empty (only for Master)
      if (list.length === 0 && isMasterUser) {
        const seedInitialModels = async () => {
          try {
            await addDoc(collection(db, 'modelos_esteira'), {
              nomeAcao: 'Revisão de Juros Abusivos',
              camposObrigatorios: ['Banco Credor', 'Valor do Contrato', 'Taxa Mensal (%)', 'Número de Parcelas'],
              documentosChecklist: ['Extrato de Financiamento', 'Contrato Inicial', 'RG/CPF', 'Comprovante de Endereço']
            });
            await addDoc(collection(db, 'modelos_esteira'), {
              nomeAcao: 'Pensão Alimentícia Revisional',
              camposObrigatorios: ['Nome do Requerente', 'Valor Atual Fixado', 'Percentual Desejado', 'Vínculo do Alimentante'],
              documentosChecklist: ['Certidão de Nascimento', 'Comprovante de Rendimentos', 'RG/CPF do Guardião']
            });
            await addDoc(collection(db, 'modelos_esteira'), {
              nomeAcao: 'Usucapião Extrajudicial',
              camposObrigatorios: ['Inscrição Imobiliária', 'Metragem Total', 'Anos de Posse Mansa', 'Nome do Antigo Proprietário'],
              documentosChecklist: ['Planta do Imóvel', 'Memorial Descritivo', 'Justo Título ou Contrato', 'Certidão de Matrícula']
            });
          } catch (e) {
            console.error('Error seeding models:', e);
          }
        };
        seedInitialModels();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'modelos_esteira');
    });

    let q;
    if (isMasterUser || isAnalistaUser) {
      q = query(collection(db, 'processos'));
    } else {
      q = query(collection(db, 'processos'), where('tenantId', '==', myTenantId));
    }

    const unsubProcessos = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          prioridade: data.prioridade || 'Media',
          risco: data.risco || 'Baixo',
          slaDias: data.slaDias || 15,
          dataCriacao: data.dataCriacao || new Date().toISOString(),
          ...data 
        } as Processo;
      });
      setProcessos(list);
      setLoading(false);
      
      // If none selected, default to first item
      if (list.length > 0 && !selectedProcId) {
        setSelectedProcId(list[0].id);
      }

      // Seed initial processes if completely empty (only for Master)
      if (list.length === 0 && isMasterUser) {
        const seedInitialProcesses = async () => {
          try {
            await addDoc(collection(db, 'processos'), {
              cliente: 'Carlos Eduardo Mendes',
              unidade: 'Farroupilha - RS',
              tipo: 'Revisão de Juros Abusivos',
              status: 'Triagem',
              prioridade: 'Alta',
              risco: 'Medio',
              slaDias: 12,
              dataCriacao: new Date().toISOString(),
              operadoresVinculados: ['atende.gsa@gmail.com'],
              tenantId: myTenantId,
              dadosPreenchidos: {
                'Banco Credor': 'Banco Bradesco S/A',
                'Valor do Contrato': 'R$ 68.400,00',
                'Taxa Mensal (%)': '3.89%',
                'Número de Parcelas': '48'
              },
              documentos: [
                { nome: 'Extrato de Financiamento', status: 'Anexado', obrigatorio: true },
                { nome: 'Contrato Inicial', status: 'Pendente', obrigatorio: true },
                { nome: 'RG/CPF', status: 'Anexado', obrigatorio: true },
                { nome: 'Comprovante de Endereço', status: 'Pendente', obrigatorio: true },
                { nome: 'Procuração', status: 'Pendente', obrigatorio: true },
                { nome: 'Contrato de Prestação de Serviços', status: 'Pendente', obrigatorio: true },
                { nome: 'Declaração de Justiça Gratuita', status: 'Pendente', obrigatorio: true }
              ],
              historico: [
                { data: new Date().toISOString(), acao: 'Caso cadastrado e enviado para triagem inicial', usuario: 'Farroupilha Central' }
              ]
            });
          } catch (e) {
            console.error('Error seeding processes:', e);
          }
        };
        seedInitialProcesses();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'processos');
    });

    return () => {
      unsubModelos();
      unsubProcessos();
    };
  }, [profile, isMaster, selectedProcId]);

  const processoAtivo = processos.find(p => p.id === selectedProcId) || processos[0];

  // Dynamic progress percentage calculator based on mandatory metadata and documents uploaded
  const calcularProgresso = (proc: Processo) => {
    if (!proc) return 0;
    const totalDados = Object.keys(proc.dadosPreenchidos || {}).length;
    const preenchidos = Object.values(proc.dadosPreenchidos || {}).filter(val => val && val.trim() !== '').length;
    
    const totalDocs = proc.documentos?.length || 0;
    const anexados = proc.documentos?.filter(d => d.status === 'Anexado' || d.status === 'Assinado').length || 0;
    
    const totalItens = totalDados + totalDocs;
    if (totalItens === 0) return 0;
    return Math.round(((preenchidos + anexados) / totalItens) * 100);
  };

  // Real-time complete state checker to auto-advance to "Pronto para Distribuição"
  useEffect(() => {
    if (!processoAtivo) return;
    const progress = calcularProgresso(processoAtivo);
    
    if (progress === 100 && (processoAtivo.status === 'Triagem' || processoAtivo.status === 'Análise Jurídica' || processoAtivo.status === 'Pendente de Informações')) {
      const autoPromoteStatus = async () => {
        try {
          await updateDoc(doc(db, 'processos', processoAtivo.id), {
            status: 'Pronto para Distribuição',
            historico: arrayUnion({
              data: new Date().toISOString(),
              acao: 'SISTEMA: Motor reativo promoveu status automaticamente para "Pronto para Distribuição" (Compliance 100%)',
              usuario: 'Validador GSA'
            })
          });
          setSuccessAlert(`🚀 PARABÉNS! O caso de ${processoAtivo.cliente} está com conformidade e dados em 100%! Status promovido automaticamente para "Pronto para Distribuição" e equipe GSA notificada.`);
          showToast('Processo validado em 100%! Pronto para Distribuição.', 'success');
        } catch (e) {
          console.error(e);
        }
      };
      autoPromoteStatus();
    }
  }, [processoAtivo]);

  // Persist: Creating a new process template (Modelo de Esteira)
  const salvarModeloEsteira = async () => {
    if (!nomeAcao.trim()) {
      showToast('Por favor, informe o nome do Modelo de Ação', 'error');
      return;
    }
    try {
      const fullDocsList = Array.from(new Set([
        ...docsList, 
        'Procuração', 
        'Contrato de Prestação de Serviços', 
        'Declaração de Justiça Gratuita'
      ]));

      const path = 'modelos_esteira';
      await addDoc(collection(db, path), {
        nomeAcao: nomeAcao.trim(),
        camposObrigatorios: camposList,
        documentosChecklist: fullDocsList
      });

      setNomeAcao('');
      setCamposList([]);
      setDocsList([]);
      setShowModelador(false);
      showToast('Modelo de Esteira salvo e disponível no ecossistema!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'modelos_esteira');
    }
  };

  // Persist: Spawning a brand-new active Case
  const handleCriarProcesso = async () => {
    if (!novoCliente.trim() || !novaUnidade.trim() || !modeloSelecionadoId) {
      showToast('Preencha o Nome, Unidade e selecione o Tipo de Modelo', 'error');
      return;
    }
    const modeloEscolhido = modelos.find(m => m.id === modeloSelecionadoId);
    if (!modeloEscolhido) return;

    try {
      const docsChecklistIniciais = (modeloEscolhido.documentosChecklist || []).map(docNome => ({
        nome: docNome,
        status: 'Pendente' as const,
        obrigatorio: true
      }));

      const inputFields: Record<string, string> = {};
      (modeloEscolhido.camposObrigatorios || []).forEach(campo => {
        inputFields[campo] = dadosIniciais[campo] || '';
      });

      const novoCasoRef = await addDoc(collection(db, 'processos'), {
        cliente: novoCliente.trim(),
        unidade: novaUnidade.trim(),
        tipo: modeloEscolhido.nomeAcao,
        status: 'Triagem',
        prioridade: prioridadeSelecionada,
        risco: 'Baixo',
        slaDias: prioridadeSelecionada === 'Critica' ? 3 : prioridadeSelecionada === 'Alta' ? 7 : 15,
        dataCriacao: new Date().toISOString(),
        operadoresVinculados: [auth?.currentUser?.email || 'atende.gsa@gmail.com'],
        dadosPreenchidos: inputFields,
        documentos: docsChecklistIniciais,
        historico: [
          { data: new Date().toISOString(), acao: `Iniciação do processo baseada no modelo "${modeloEscolhido.nomeAcao}"`, usuario: auth?.currentUser?.email || 'Unidade GSA' }
        ]
      });

      setSelectedProcId(novoCasoRef.id);
      setNovoCliente('');
      setNovaUnidade('');
      setModeloSelecionadoId('');
      setDadosIniciais({});
      setShowNovoProcessoModal(false);
      showToast('✓ Caso operacional inserido com sucesso na esteira!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'processos');
    }
  };

  // Update Case Metadata Dynamic Fields in real-time
  const handleAtualizarDadoCliente = async (campo: string, valor: string) => {
    if (!processoAtivo) return;
    try {
      const novosDados = { ...processoAtivo.dadosPreenchidos, [campo]: valor };
      await updateDoc(doc(db, 'processos', processoAtivo.id), {
        dadosPreenchidos: novosDados
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `processos/${processoAtivo.id}`);
    }
  };

  // Trava de Pendência Antierro (Blocking updates if compliance criteria is unmet)
  const handleAtualizarStatus = async (novoStatus: string) => {
    if (!processoAtivo) return;
    
    // Safety lock check when attempting to advance to terminal statuses
    const isAdvancing = ['Distribuído', 'Audiência Marcada'].includes(novoStatus);
    if (isAdvancing) {
      const docsPendentes = processoAtivo.documentos?.filter(d => d.status === 'Pendente') || [];
      const camposVazios = Object.entries(processoAtivo.dadosPreenchidos || {}).filter(([_, val]) => !val || val.trim() === '');
      
      if (docsPendentes.length > 0 || camposVazios.length > 0) {
        setBlockingAlert(`🛑 TRAVA DE PENDÊNCIA: Não foi possível mover o caso para "${novoStatus}". Saneamento obrigatório pendente! Encontramos [${docsPendentes.length}] documentos vazios e [${camposVazios.length}] campos cadastrais não preenchidos.`);
        showToast('Mudança de status bloqueada: faltam documentos ou campos cadastrais', 'error');
        
        // Push error trail to case history and reset to "Pendente de Informações" to force operator focus
        try {
          await updateDoc(doc(db, 'processos', processoAtivo.id), {
            status: 'Pendente de Informações',
            historico: arrayUnion({
              data: new Date().toISOString(),
              acao: `Bloqueio Antierro GSA: Tentativa de avançar para "${novoStatus}" sem compliance completo. Status setado para "Pendente de Informações".`,
              usuario: 'Validador GSA'
            })
          });
        } catch (e) {
          console.error(e);
        }
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'processos', processoAtivo.id), {
        status: novoStatus,
        historico: arrayUnion({
          data: new Date().toISOString(),
          acao: `Status alterado manualmente de "${processoAtivo.status || 'Triagem'}" para "${novoStatus}"`,
          usuario: auth?.currentUser?.email || 'Membro GSA'
        })
      });
      setBlockingAlert(null);
      showToast(`Caso promovido para: ${novoStatus}!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `processos/${processoAtivo.id}`);
    }
  };

  // Delegate operator (lawyer email array mapping)
  const delegarProcurador = async () => {
    if (!novoEmail.trim() || !processoAtivo) return;
    try {
      await updateDoc(doc(db, 'processos', processoAtivo.id), {
        operadoresVinculados: arrayUnion(novoEmail.trim()),
        historico: arrayUnion({
          data: new Date().toISOString(),
          acao: `Advogado parceiro vinculado ao processo: ${novoEmail.trim()}`,
          usuario: auth?.currentUser?.email || 'Master GSA'
        })
      });
      setNovoEmail('');
      showToast('Advogado vinculado com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `processos/${processoAtivo.id}`);
    }
  };

  // Automated Trio digital signing (Procuração, Contrato, Declaração)
  const handleAssinarTrioGSA = async () => {
    if (!processoAtivo) return;
    setIsSigningTrio(true);
    
    setTimeout(async () => {
      try {
        const novosDocs = processoAtivo.documentos?.map(d => {
          if (['Procuração', 'Contrato de Prestação de Serviços', 'Declaração de Justiça Gratuita', 'Procuração GSA', 'Contrato GSA', 'Declaração Justiça Gratuita'].includes(d.nome)) {
            return { ...d, status: 'Assinado' as const };
          }
          return d;
        }) || [];

        await updateDoc(doc(db, 'processos', processoAtivo.id), {
          documentos: novosDocs,
          historico: arrayUnion({
            data: new Date().toISOString(),
            acao: 'Assinatura Eletrônica em Bloco: Procuração GSA, Contrato e Declaração gerados e assinados digitalmente.',
            usuario: processoAtivo.cliente || 'Requerente'
          })
        });
        
        setIsSigningTrio(false);
        showToast('Documentos GSA assinados com sucesso com selo ICP-Brasil!', 'success');
      } catch (err) {
        setIsSigningTrio(false);
        console.error(err);
      }
    }, 2000);
  };

  // Saneamento AI - Document Scanner Simulator (OCR Compliance score)
  const triggerOcrScanDocumento = (nomeDoc: string) => {
    setIsScanningDoc(nomeDoc);
    setScanStep(0);
    setScanScore(0);
    const intervals = [
      setTimeout(() => setScanStep(1), 500),
      setTimeout(() => setScanStep(2), 1000),
      setTimeout(() => setScanStep(3), 1500),
      setTimeout(() => {
        setScanStep(4);
        setScanScore(Math.floor(Math.random() * 8) + 93); // Generates score between 93% and 100%
      }, 2000)
    ];
  };

  const handleFinishOcrScan = async () => {
    if (!isScanningDoc || !processoAtivo || !processoAtivo.documentos) return;
    const docName = isScanningDoc;
    setIsScanningDoc(null);
    try {
      const docsAtualizados = processoAtivo.documentos.map(d => {
        if (d.nome === docName) return { ...d, status: 'Anexado' as const };
        return d;
      });
      await updateDoc(doc(db, 'processos', processoAtivo.id), {
        documentos: docsAtualizados,
        historico: arrayUnion({
          data: new Date().toISOString(),
          acao: `Documento "${docName}" anexado via GSA-OCR AI Scanner (Acurácia: ${scanScore}%)`,
          usuario: auth?.currentUser?.email || 'Membro GSA'
        })
      });
      showToast(`Documento "${docName}" anexado com sucesso!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `processos/${processoAtivo.id}`);
    }
  };

  // WhatsApp Nudge Simulator for quick collection
  const abrirSimuladorWhatsAppParaCobranca = (nomeDoc: string) => {
    if (!processoAtivo) return;
    setWhatsAppPendingDoc(nomeDoc);
    const text = `Prezado(a) ${processoAtivo.cliente}, sou o assistente jurídico virtual da Câmara GSA. Verifiquei que o seu documento "${nomeDoc}" está pendente para o andamento da sua ação de ${processoAtivo.tipo}. Poderia nos anexar uma foto nítida dele por aqui agora mesmo?`;
    setWhatsAppMessage(text);
    setWhatsAppHistory([
      { sender: 'client', text: 'Boa tarde! Entendido, vou mandar a foto da via original agora mesmo.', time: '14:22' }
    ]);
    setIsWhatsAppOpen(true);
  };

  const handleEnviarMensagemWhatsApp = () => {
    if (!whatsAppMessage.trim() || !processoAtivo) return;
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg = whatsAppMessage;
    setWhatsAppHistory(prev => [...prev, { sender: 'agent', text: userMsg, time: timeNow }]);
    setWhatsAppMessage('');

    // Simulate clients quick reply attaching document automatically
    setTimeout(() => {
      const timeReply = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setWhatsAppHistory(prev => [
        ...prev, 
        { sender: 'client', text: `📎 Segue anexo em alta resolução: ${whatsAppPendingDoc}.pdf`, time: timeReply }
      ]);
      
      // Auto-attach the document inside the database check-list
      setTimeout(async () => {
        try {
          const docsAtualizados = (processoAtivo.documentos || []).map(d => {
            if (d.nome === whatsAppPendingDoc) return { ...d, status: 'Anexado' as const };
            return d;
          });
          await updateDoc(doc(db, 'processos', processoAtivo.id), {
            documentos: docsAtualizados,
            historico: arrayUnion({
              data: new Date().toISOString(),
              acao: `Documento "${whatsAppPendingDoc}" recebido de forma integrada via WhatsApp Link`,
              usuario: 'WhatsApp GSA Link'
            })
          });
          showToast(`Documento "${whatsAppPendingDoc}" anexado automaticamente via WhatsApp!`, 'success');
        } catch (e) {
          console.error(e);
        }
      }, 1500);

    }, 2000);
  };

  // Gemini legal assistant (Server-Side simulated backend API fallback)
  const askGeminiAI = async () => {
    if (!aiQuery.trim() || !processoAtivo) return;
    setIsAiLoading(true);
    const currentQuery = aiQuery;
    setAiQuery('');

    try {
      // Simulate/request to backend or standard LLM answers for drafting or auditing
      setTimeout(() => {
        let aiResult = '';
        if (currentQuery.toLowerCase().includes('petição') || currentQuery.toLowerCase().includes('inicial')) {
          aiResult = `### MINUTA DE PETIÇÃO INICIAL AUTOGERADA - CÂMARA GSA\n\n**EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE ${processoAtivo.unidade?.toUpperCase() || 'FARROUPILHA - RS'}**\n\n**REQUERENTE:** ${processoAtivo.cliente}\n**AÇÃO:** ${processoAtivo.tipo}\n\n**DOS FATOS E FUNDAMENTOS JURÍDICOS:**\nO Requerente celebrou com a instituição requerida contrato sob as seguintes bases:\n${Object.entries(processoAtivo.dadosPreenchidos || {}).map(([c, v]) => `- **${c}:** ${v || 'Não especificado'}`).join('\n')}\n\nDemonstra-se flagrante abusividade ou necessidade de intervenção, requerendo a procedência total dos pedidos de revisão cadastral, aplicação do Código de Defesa do Consumidor e concessão da Assistência Judiciária Gratuita.\n\nNestes termos, pede deferimento.\n\n*Carimbo GSA-AI Copilot v4.2*`;
        } else {
          aiResult = `### PARECER JURÍDICO GSA CO-PILOT\n\nAnalisamos os autos do cliente **${processoAtivo.cliente}** para a esteira processual de **${processoAtivo.tipo}**:\n\n1. **Status da Ficha cadastral:** ${calcularProgresso(processoAtivo)}% preenchido.\n2. **Risco Operacional:** Baixo risco cadastral encontrado.\n3. **Documentação:** Há necessidade de certificar que todos os documentos marcados como Pendentes sejam saneados.\n4. **Próximo Passo Recomendado:** Realizar o download da Ficha Cadastral unificada e do Kit Completo em ZIP, garantindo que o protocolo ocorra dentro do SLA de ${(processoAtivo.slaDias || 15)} dias.`;
        }
        
        setAiHistory(prev => [...prev, { query: currentQuery, answer: aiResult, time: new Date().toLocaleTimeString() }]);
        setIsAiLoading(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setIsAiLoading(false);
    }
  };

  // Export CADASTRE document using jsPDF & zip them with assets using JSZip
  const extrairKitZIP = async (proc: Processo) => {
    if (!proc) return;
    showToast('Iniciando empacotamento do Kit Processual...', 'info');
    
    try {
      const zip = new JSZip();
      const pdfFicha = new jsPDF();
      
      // Modern display formatting for Ficha PDF
      pdfFicha.setFillColor(3, 7, 18);
      pdfFicha.rect(0, 0, 220, 300, 'F');
      
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.setFont('helvetica', 'bold');
      pdfFicha.setFontSize(20);
      pdfFicha.text('CÂMARA GSA', 20, 25);
      pdfFicha.setFontSize(10);
      pdfFicha.setFont('helvetica', 'normal');
      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text('COCKPIT DE ESTEIRA E COMPLIANCE JURÍDICO EXTRAJUDICIAL', 20, 32);
      
      pdfFicha.setDrawColor(31, 41, 55);
      pdfFicha.line(20, 38, 190, 38);
      
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.setFont('helvetica', 'bold');
      pdfFicha.setFontSize(14);
      pdfFicha.text('FICHA CADASTRAL DO CASO', 20, 50);
      
      pdfFicha.setFontSize(10);
      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text(`ID Único do Processo:`, 20, 62);
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.text(`${proc.id}`, 65, 62);
      
      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text(`Nome do Cliente:`, 20, 70);
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.text(`${proc.cliente || 'Caso sem Nome'}`, 65, 70);
      
      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text(`Unidade Emissora:`, 20, 78);
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.text(`${proc.unidade || 'Farroupilha - RS'}`, 65, 78);
      
      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text(`Enquadramento da Ação:`, 20, 86);
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.text(`${proc.tipo || 'Geral'}`, 65, 86);

      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text(`Status Atual:`, 20, 94);
      pdfFicha.setTextColor(59, 130, 246);
      pdfFicha.text(`${proc.status || 'Triagem'}`, 65, 94);

      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.text(`Data de Abertura:`, 20, 102);
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.text(`${new Date(proc.dataCriacao || '').toLocaleDateString('pt-BR')}`, 65, 102);
      
      pdfFicha.setDrawColor(31, 41, 55);
      pdfFicha.line(20, 110, 190, 110);
      
      // Dynamic Fields
      pdfFicha.setTextColor(255, 255, 255);
      pdfFicha.setFont('helvetica', 'bold');
      pdfFicha.text('METADADOS EXIGIDOS DO FLUXO:', 20, 120);
      
      pdfFicha.setFont('helvetica', 'normal');
      pdfFicha.setTextColor(226, 232, 240);
      let offset = 130;
      Object.entries(proc.dadosPreenchidos || {}).forEach(([k, v]) => {
        pdfFicha.text(`• ${k}: ${v || 'Não Informado'}`, 25, offset);
        offset += 8;
      });
      
      pdfFicha.line(20, offset + 4, 190, offset + 4);
      
      pdfFicha.setTextColor(148, 163, 184);
      pdfFicha.setFontSize(8);
      pdfFicha.text('Documento eletrônico compilado pela Central de Mediação e Arbitragem Câmara GSA.', 20, offset + 15);
      pdfFicha.text('Validação de integridade via blockchain da GSA Networks.', 20, offset + 20);
      
      // Put file in ZIP structure
      const fileName = `Ficha_Cadastral_${proc.cliente?.replace(/\s+/g, '_') || proc.id}.pdf`;
      zip.file(fileName, pdfFicha.output('blob'));
      
      // Inject simulated attached PDFs of the checklist
      const attached = proc.documentos?.filter(d => d.status === 'Anexado' || d.status === 'Assinado') || [];
      attached.forEach(d => {
        zip.file(`${d.nome.replace(/\s+/g, '_')}.pdf`, `Conteudo saneado e certificado digitalmente para ${d.nome}`);
      });
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const dlLink = document.createElement('a');
      dlLink.href = URL.createObjectURL(zipBlob);
      dlLink.download = `Kit_Processual_${proc.cliente?.replace(/\s+/g, '_') || proc.id}.zip`;
      dlLink.click();
      
      showToast('Kit zipado com Ficha PDF gerado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar Kit em ZIP', 'error');
    }
  };

  // Delete Case
  const handleExcluirProcesso = async (id: string) => {
    if (!confirm('Deseja realmente remover este processo do ecossistema GSA?')) return;
    try {
      await deleteDoc(doc(db, 'processos', id));
      showToast('Processo removido com sucesso.', 'info');
      if (selectedProcId === id) {
        setSelectedProcId('');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `processos/${id}`);
    }
  };

  // Helper values for active dashboards KPIs
  const totalProcessosAtivos = processos.length;
  const prontosFila = processos.filter(p => p.status === 'Pronto para Distribuição').length;
  const pendenciasFila = processos.filter(p => p.status === 'Pendente de Informações' || p.status === 'Triagem').length;
  const conformidadeMedia = processos.length > 0
    ? Math.round(processos.reduce((acc, curr) => acc + calcularProgresso(curr), 0) / processos.length)
    : 100;

  // Filtered array list
  const processosFiltrados = processos.filter(p => {
    const matchesSearch = p.cliente?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.tipo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.unidade?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || p.status === statusFilter;
    const matchesPriority = priorityFilter === 'todos' || p.prioridade === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#030712] text-slate-200 min-h-screen font-sans selection:bg-blue-500/30 selection:text-blue-200 antialiased relative overflow-x-hidden">
      
      {/* GLOWING AMBIENT BACKGROUND LAYER (LINEAR & STRIPE DESIGN) */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* TOAST SYSTEM COCKPIT */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${
              toast.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200' 
                : toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-200'
                : 'bg-[#0B1329]/95 border-blue-500/30 text-blue-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span className="text-xs font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC CMD+K COMMAND SEARCH CONSOLE OVERLAY */}
      <AnimatePresence>
        {isCmdKOpen && (
          <div className="fixed inset-0 bg-[#030712]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0B1329] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/40">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={cmdKQuery} 
                  onChange={(e) => setCmdKQuery(e.target.value)}
                  placeholder="Pesquisar por cliente, unidade ou tipo de ação..."
                  className="bg-transparent border-none text-xs text-white focus:outline-none w-full placeholder:text-slate-500"
                  autoFocus
                />
                <button onClick={() => setIsCmdKOpen(false)} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">ESC</button>
              </div>
              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                {processos.filter(p => p.cliente?.toLowerCase().includes(cmdKQuery.toLowerCase())).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      setSelectedProcId(p.id);
                      setIsCmdKOpen(false);
                      setCmdKQuery('');
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-800/40 transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{p.cliente}</p>
                      <p className="text-[10px] text-slate-400">Unidade: {p.unidade} · {p.tipo}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP NOTIFICATION BANNERS */}
      <AnimatePresence>
        {blockingAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{blockingAlert}</span>
            </div>
            <button onClick={() => setBlockingAlert(null)} className="text-rose-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {successAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
              <span>{successAlert}</span>
            </div>
            <button onClick={() => setSuccessAlert(null)} className="text-emerald-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE TOP BANNER: COCKPIT CONTROL & METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        <div className="bg-[#0B1329]/20 border border-[#1F2937] backdrop-blur-md rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Total de Casos Ativos</span>
            <span className="text-2xl font-black text-white">{totalProcessosAtivos}</span>
          </div>
        </div>
        <div className="bg-[#0B1329]/20 border border-[#1F2937] backdrop-blur-md rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Prontos para Distribuição</span>
            <span className="text-2xl font-black text-white">{prontosFila}</span>
          </div>
        </div>
        <div className="bg-[#0B1329]/20 border border-[#1F2937] backdrop-blur-md rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Casos com Pendências</span>
            <span className="text-2xl font-black text-white">{pendenciasFila}</span>
          </div>
        </div>
        <div className="bg-[#0B1329]/20 border border-[#1F2937] backdrop-blur-md rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Conformidade Geral</span>
            <span className="text-2xl font-black text-white">{conformidadeMedia}%</span>
          </div>
        </div>
      </div>

      {/* HEADER DE COMANDO GLOBAL */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-[#1F2937] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
            <span>Câmara GSA</span> 
            <span className="text-slate-700">/</span> 
            <span className="text-slate-300">Esteira Operacional</span>
            <span className="text-slate-700">/</span> 
            <span className="text-blue-400 flex items-center gap-1"><Command className="w-2.5 h-2.5" /> Ctrl+K</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-blue-500" />
            Torre de Operação de Processos
          </h1>
        </div>
        
        {/* VIEWMODE MANAGER PORTAL AND MODELER TRIGGER */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto justify-start sm:justify-end">
          <div className="bg-[#0B1329]/60 p-1 rounded-xl flex border border-[#1F2937] text-slate-400">
            {(['master', 'operador', 'usuario'] as const).map((mode) => (
              <button 
                key={mode} 
                onClick={() => setViewMode(mode)} 
                className={`text-[11px] px-3.5 py-2 rounded-lg font-bold tracking-wide transition-all ${
                  viewMode === mode 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50' 
                    : 'hover:text-slate-200'
                }`}
              >
                {mode === 'master' ? '👑 Master' : mode === 'operador' ? '🧑‍⚖️ Advogado' : '🏢 Unidade'}
              </button>
            ))}
          </div>
          {viewMode === 'master' && (
            <button 
              onClick={() => setShowModelador(!showModelador)} 
              className="bg-[#0B1329] border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2"
            >
              <Settings className="w-3.5 h-3.5" />
              Modelador de Regras
            </button>
          )}
        </div>
      </header>

      {/* EXPANDABLE MASTER PANEL: PROCESS TEMPLATES CREATOR */}
      <AnimatePresence>
        {showModelador && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-[#0B1329]/40 border border-blue-500/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400 animate-pulse" />
                  📐 Modelador de Regras de Negócio e Checklist
                </h2>
                <button onClick={() => setShowModelador(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Panel 1: Main configuration */}
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                  <label className="text-[10px] font-mono text-slate-400 block mb-2 uppercase">Nome do Tipo de Ação / Esteira</label>
                  <input 
                    type="text" 
                    value={nomeAcao} 
                    onChange={(e) => setNomeAcao(e.target.value)} 
                    placeholder="Ex: Revisão de Juros Abusivos" 
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none" 
                  />
                  <button 
                    onClick={salvarModeloEsteira} 
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Salvar Modelo no Firestore
                  </button>
                </div>

                {/* Panel 2: Required inputs collection */}
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                  <label className="text-[10px] font-mono text-slate-400 block mb-2 uppercase">Campos Cadastrais Obrigatórios</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      value={novoCampo} 
                      onChange={(e) => setNovoCampo(e.target.value)} 
                      placeholder="Ex: Valor do Contrato" 
                      className="flex-1 bg-[#030712] border border-[#1F2937] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                    />
                    <button 
                      onClick={() => { if(novoCampo.trim()){ setCamposList([...camposList, novoCampo.trim()]); setNovoCampo(''); } }} 
                      className="bg-slate-800 hover:bg-slate-700 px-3 text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {camposList.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded bg-[#030712] border border-[#1F2937] font-mono text-slate-300 flex items-center gap-1">
                        {c}
                        <button onClick={() => setCamposList(camposList.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-400"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Panel 3: Documents Checklist definition */}
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                  <label className="text-[10px] font-mono text-slate-400 block mb-2 uppercase">Checklist de Documentos Necessários</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      value={novoDoc} 
                      onChange={(e) => setNovoDoc(e.target.value)} 
                      placeholder="Ex: Cópia do Contrato Social" 
                      className="flex-1 bg-[#030712] border border-[#1F2937] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                    />
                    <button 
                      onClick={() => { if(novoDoc.trim()){ setDocsList([...docsList, novoDoc.trim()]); setNovoDoc(''); } }} 
                      className="bg-slate-800 hover:bg-slate-700 px-3 text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {docsList.map((d, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded bg-[#030712] border border-[#1F2937] font-mono text-slate-300 flex items-center gap-1">
                        {d}
                        <button onClick={() => setDocsList(docsList.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-400"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2">Observação: Os documentos "Procuração", "Contrato de Prestação de Serviços" e "Declaração de Justiça Gratuita" são integrados automaticamente pelo sistema.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE INTERACTION SECTIONS: LISTING, KANBAN BOARD & WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        
        {/* COLUNA ESQUERDA: LISTA DE CASOS COM FILTROS AVANÇADOS */}
        <div className="lg:col-span-1 bg-[#0B1329]/20 border border-[#1F2937] backdrop-blur-md rounded-2xl p-4 flex flex-col h-[400px] lg:h-[750px]">
          
          {/* SEARCH & CASE ACTION CONTROLS */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <List className="w-3.5 h-3.5 text-blue-500" />
                Esteira de Casos
              </span>
              <button 
                onClick={() => setShowNovoProcessoModal(true)} 
                className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-all"
                title="Cadastrar Novo Caso"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* SEARCH INPUT */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nome, unidade..." 
                className="w-full bg-[#030712] border border-[#1F2937] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* QUICK FILTER DROPDOWNS */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#030712] border border-[#1F2937] text-slate-300 rounded-lg p-1.5 focus:outline-none"
              >
                <option value="todos">Status: Todos</option>
                <option value="Triagem">Triagem</option>
                <option value="Análise Jurídica">Análise Jurídica</option>
                <option value="Pendente de Informações">Pendentes</option>
                <option value="Pronto para Distribuição">Concluídos</option>
              </select>
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-[#030712] border border-[#1F2937] text-slate-300 rounded-lg p-1.5 focus:outline-none"
              >
                <option value="todos">Prioridades</option>
                <option value="Baixa">Baixa</option>
                <option value="Media">Média</option>
                <option value="Alta">Alta</option>
                <option value="Critica">Crítica</option>
              </select>
            </div>
          </div>

          {/* ACTIVE CASE ROSTER STREAM */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {processosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                Nenhum caso cadastrado correspondente aos filtros.
              </div>
            ) : (
              processosFiltrados.map(p => {
                const progress = calcularProgresso(p);
                const isSelected = p.id === selectedProcId;
                
                return (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProcId(p.id)} 
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-950/30' 
                        : 'bg-transparent border-[#1F2937] hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-mono text-slate-500">ID: {p.id.slice(0,6)}...</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        p.status === 'Pronto para Distribuição' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : p.status === 'Pendente de Informações'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {p.status || 'Triagem'}
                      </span>
                    </div>
                    
                    <h3 className="text-xs font-bold text-white truncate">{p.cliente || 'Caso sem Nome'}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        p.tipoJustica === 'judicial'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.tipoJustica === 'judicial' ? 'Judicial' : 'Extrajudicial'}
                      </span>
                      <p className="text-[10px] text-slate-400 truncate flex-1">{p.tipo || 'Geral'}</p>
                    </div>
                    
                    <div className="text-[9px] text-slate-500 mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {p.unidade || 'Farroupilha'}
                      </span>
                      <span className="text-blue-400 font-bold font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {progress}% ✓
                      </span>
                    </div>

                    {/* Mini dynamic filling bar */}
                    <div className="w-full bg-[#1F2937] h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* WORKSPACE CENTRAL: AUDITORIA E PAINEL DE METADADOS DINÂMICOS */}
        <div className="lg:col-span-3 bg-[#0B1329]/10 border border-[#1F2937] backdrop-blur-md rounded-2xl p-4 sm:p-6 h-auto min-h-[550px] lg:h-[750px] overflow-y-auto space-y-6 custom-scrollbar flex flex-col justify-between">
          {!processoAtivo ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
              <div className="p-4 bg-[#0B1329]/40 rounded-full border border-[#1F2937] mb-4">
                <Folder className="w-8 h-8 text-slate-500 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white">Nenhum Processo Ativo Selecionado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Adicione um novo caso utilizando o botão "+" ou use o comando de busca rápida para escolher um cliente.</p>
            </div>
          ) : (
            <>
              {/* TOP WORKSPACE HEADER BAR */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1F2937] pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    {processoAtivo.cliente || 'Caso sem Nome'}
                    {processoAtivo.prioridade === 'Critica' && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-md border border-rose-500/20">CRÍTICO</span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                    Esteira de Ação: <strong className="text-blue-400 font-mono font-medium">{processoAtivo.tipo || 'Geral'}</strong> 
                    <span className="text-slate-600">|</span> 
                    Rito: <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      processoAtivo.tipoJustica === 'judicial'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>{processoAtivo.tipoJustica === 'judicial' ? 'Judicial' : 'Extrajudicial'}</span>
                    <span className="text-slate-600">|</span> 
                    Unidade: <strong className="text-slate-300 font-mono font-medium">{processoAtivo.unidade || 'Farroupilha'}</strong>
                  </p>
                </div>
                
                {/* GLOBAL WORKBENCH FILE PACK ACTIONS */}
                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button 
                    onClick={() => extrairKitZIP(processoAtivo)} 
                    className="flex-1 sm:flex-initial bg-white hover:bg-slate-200 text-black font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Extrair Kit Processual (ZIP)
                  </button>
                  {viewMode === 'master' && (
                    <button 
                      onClick={() => handleExcluirProcesso(processoAtivo.id)} 
                      className="p-2 border border-[#1F2937] text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all"
                      title="Excluir Processo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* RE-ACTIVE COMPLIANCE BARRA DE PROGRESSO */}
              <div className="bg-[#0B1329]/30 border border-[#1F2937] p-4 rounded-xl">
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    Validação da Esteira Processual (Saneamento)
                  </span>
                  <span className="text-blue-400 font-bold font-mono">{calcularProgresso(processoAtivo)}% CONCLUÍDO</span>
                </div>
                <div className="w-full bg-[#1F2937] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-500 shadow-lg shadow-blue-500/30" 
                    style={{ width: `${calcularProgresso(processoAtivo)}%` }} 
                  />
                </div>
              </div>

              {/* TIMELINE INTERATIVA DO PORTAL */}
              <div className="bg-[#0B1329]/20 p-5 rounded-2xl border border-[#1F2937]">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Workflow do Caso & Próxima Fase
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative">
                  {(['Triagem', 'Análise Jurídica', 'Distribuído', 'Audiência Marcada'] as const).map((step, idx) => {
                    const isDone = processoAtivo.status === step || (idx === 0 && !processoAtivo.status);
                    
                    return (
                      <button 
                        key={idx} 
                        onClick={() => handleAtualizarStatus(step)}
                        className={`text-center p-3 rounded-xl border transition-all ${
                          isDone 
                            ? 'bg-blue-950/40 border-blue-500/50 text-white' 
                            : 'bg-transparent border-slate-800/40 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`h-2.5 w-2.5 rounded-full mx-auto mb-2 border transition-all ${
                          isDone ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/50' : 'bg-slate-800 border-slate-700'
                        }`} />
                        <span className="text-[10px] block font-mono font-bold tracking-wide">{step}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC FORM AND REQUIRED CHECKLIST SPLIT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLLATERAL 1: DYNAMIC INPUT FIELDS */}
                <div className="bg-[#0B1329]/20 p-5 rounded-2xl border border-[#1F2937]">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    📋 Inputs Obrigatórios da Ação
                  </h4>
                  {!processoAtivo.dadosPreenchidos || Object.keys(processoAtivo.dadosPreenchidos).length === 0 ? (
                    <p className="text-xs text-amber-500 font-medium font-mono">Nenhum dado cadastral exigido nesta esteira.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(processoAtivo.dadosPreenchidos).map(([campo, valor]) => (
                        <div key={campo} className="border-b border-[#1F2937] pb-3 last:border-b-0 last:pb-0">
                          <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">{campo}</span>
                          {viewMode === 'usuario' ? (
                            <input 
                              type="text" 
                              value={valor} 
                              onChange={(e) => handleAtualizarDadoCliente(campo, e.target.value)} 
                              placeholder={`Forneça ${campo}...`}
                              className="w-full bg-[#030712] border border-[#1F2937] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" 
                            />
                          ) : (
                            <div className="flex justify-between items-center bg-slate-900/30 px-3 py-1.5 rounded-lg border border-slate-800">
                              <span className="text-xs font-semibold text-slate-200">{valor || 'Pendente'}</span>
                              {viewMode === 'master' && (
                                <input 
                                  type="text" 
                                  value={valor} 
                                  onChange={(e) => handleAtualizarDadoCliente(campo, e.target.value)} 
                                  placeholder="Inserir..."
                                  className="bg-transparent border-none focus:outline-none text-xs text-right text-blue-400 w-1/2 placeholder:text-slate-600"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* COLLATERAL 2: REAL-TIME SECURE CHECKLIST OF DOCUMENTS */}
                <div className="bg-[#0B1329]/20 p-5 rounded-2xl border border-[#1F2937] flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                      🗂️ Peças e Documentos do Protocolo
                    </h4>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {processoAtivo.documentos?.map((d, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-[#1F2937] pb-2 last:border-b-0">
                          <div>
                            <span className="text-xs font-semibold text-slate-200 block">{d.nome}</span>
                            <span className="text-[9px] text-slate-500">Requerido para distribuição</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md ${
                              d.status === 'Anexado' 
                                ? 'text-green-400 bg-green-500/10 border border-green-500/20' 
                                : d.status === 'Assinado'
                                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                            }`}>
                              {d.status}
                            </span>
                            
                            {/* SCANNING & COBRANÇA ACTION TOGGLERS */}
                            {d.status === 'Pendente' && (
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => triggerOcrScanDocumento(d.nome)}
                                  className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-all"
                                  title="Anexar via Saneamento OCR"
                                >
                                  Anexar
                                </button>
                                <button 
                                  onClick={() => abrirSimuladorWhatsAppParaCobranca(d.nome)}
                                  className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2 py-1 rounded transition-all border border-emerald-500/20"
                                  title="Cobrar via WhatsApp"
                                >
                                  Nudge
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AUTO GENERATE AND ELECTRONICALLY SIGN GSA ESSENTIAL TRIO */}
                  {processoAtivo.documentos?.some(d => d.status === 'Pendente' && ['Procuração', 'Contrato de Prestação de Serviços', 'Declaração de Justiça Gratuita'].includes(d.nome)) && (
                    <button 
                      onClick={handleAssinarTrioGSA}
                      disabled={isSigningTrio}
                      className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {isSigningTrio ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Certificando Assinatura em Lote...
                        </>
                      ) : (
                        <>
                          <FileSignature className="w-3.5 h-3.5" />
                          Gerar & Assinar Trio Essencial GSA (ICP-Brasil)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ADVOGADOS E OPERADORES DELEGADOS */}
              <div className="bg-[#0B1329]/20 p-5 rounded-2xl border border-[#1F2937]">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  👥 Advogados e Procuradores Credenciados
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[10px] font-mono px-3 py-1 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-900/40">
                    👑 master@camaragsa.com.br (GSA Admin)
                  </span>
                  {processoAtivo.operadoresVinculados?.map((em, i) => (
                    <span key={i} className="text-[10px] font-mono px-3 py-1 rounded-xl bg-slate-900/60 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                      🧑‍⚖️ {em}
                    </span>
                  ))}
                </div>
                {viewMode === 'master' && (
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={novoEmail} 
                      onChange={(e) => setNovoEmail(e.target.value)} 
                      placeholder="Email do Advogado parceiro credenciado..." 
                      className="flex-1 bg-[#030712] border border-[#1F2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                    />
                    <button 
                      onClick={delegarProcurador} 
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 rounded-xl transition-all"
                    >
                      Vincular Caso
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* DYNAMIC INTEGRATION SIMULATORS MODALS CONTAINER */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-[#1F2937] pt-4 mt-4">
            <span>Servidor Central GSA: Ativo</span>
            <div className="flex gap-3">
              <button onClick={() => setIsAiPanelOpen(true)} className="hover:text-blue-400 flex items-center gap-1">
                <Bot className="w-3 h-3 text-blue-500" />
                Copiloto AI
              </button>
              <span className="text-slate-800">|</span>
              <button onClick={() => setIsWhatsAppOpen(true)} className="hover:text-emerald-400 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-emerald-500" />
                WhatsApp Link
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* NEW PROCESS INITIATION MODAL */}
      <AnimatePresence>
        {showNovoProcessoModal && (
          <div className="fixed inset-0 bg-[#030712]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B1329] border border-[#1F2937] rounded-2xl w-full max-w-xl shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  Cadastrar Novo Caso na Esteira
                </h3>
                <button onClick={() => setShowNovoProcessoModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Nome Completo do Requerente</label>
                    <input 
                      type="text" 
                      value={novoCliente}
                      onChange={(e) => setNovoCliente(e.target.value)}
                      placeholder="Ex: Carlos Mendes"
                      className="w-full bg-[#030712] border border-[#1F2937] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Unidade de Origem</label>
                    <input 
                      type="text" 
                      value={novaUnidade}
                      onChange={(e) => setNovaUnidade(e.target.value)}
                      placeholder="Ex: Porto Alegre - RS"
                      className="w-full bg-[#030712] border border-[#1F2937] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Tipo de Modelo da Esteira</label>
                  <select
                    value={modeloSelecionadoId}
                    onChange={(e) => {
                      setModeloSelecionadoId(e.target.value);
                      const selected = modelos.find(m => m.id === e.target.value);
                      const fields: Record<string, string> = {};
                      selected?.camposObrigatorios.forEach(f => { fields[f] = ''; });
                      setDadosIniciais(fields);
                    }}
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Selecione o Fluxo Operacional...</option>
                    {modelos.map(m => (
                      <option key={m.id} value={m.id}>{m.nomeAcao}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-fields form if model selected */}
                {modeloSelecionadoId && Object.keys(dadosIniciais).length > 0 && (
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Campos Cadastrais Exigidos pelo Modelo:</span>
                    {Object.keys(dadosIniciais).map(field => (
                      <div key={field}>
                        <label className="text-[10px] font-semibold text-slate-300 block mb-1">{field}</label>
                        <input 
                          type="text"
                          value={dadosIniciais[field]}
                          onChange={(e) => setDadosIniciais({ ...dadosIniciais, [field]: e.target.value })}
                          className="w-full bg-[#030712] border border-[#1F2937] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Prioridade Operacional</label>
                  <div className="flex gap-2 text-xs">
                    {(['Baixa', 'Media', 'Alta', 'Critica'] as const).map(prio => (
                      <button 
                        key={prio}
                        type="button"
                        onClick={() => setPrioridadeSelecionada(prio)}
                        className={`flex-1 py-1.5 rounded-lg border transition-all ${
                          prioridadeSelecionada === prio 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-[#030712] border-[#1F2937] text-slate-400 hover:text-white'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 border-t border-slate-800 pt-4">
                  <button 
                    onClick={() => setShowNovoProcessoModal(false)}
                    className="flex-1 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCriarProcesso}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    Confirmar Cadastro
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OCR SCANNING DOCUMENT INTELLIGENT SIMULATOR */}
      <AnimatePresence>
        {isScanningDoc && (
          <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B1329] border border-blue-500/20 rounded-2xl w-full max-w-md p-4 sm:p-6 text-center shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Animated scan bar */}
              {scanStep < 4 && (
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse bg-blue-500/60 shadow-[0_0_20px_#3b82f6]" style={{ top: `${scanStep * 25}%`, transition: 'top 0.5s ease-in-out' }} />
              )}

              <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/20 mb-4 animate-bounce">
                <FileSignature className="w-6 h-6" />
              </div>
              
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Módulo GSA-OCR AI Saneamento</h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">Saneando o arquivo: <strong className="text-blue-400">{isScanningDoc}</strong></p>

              <div className="bg-slate-900/60 rounded-xl p-4 mb-6 text-left border border-slate-800 font-mono text-[11px] space-y-2">
                <div className="flex items-center gap-2">
                  <span className={scanStep >= 1 ? "text-emerald-400" : "text-slate-600"}>✓</span>
                  <span className={scanStep >= 1 ? "text-slate-300" : "text-slate-500"}>Iniciando verificação de metadados digitais</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={scanStep >= 2 ? "text-emerald-400" : "text-slate-600"}>✓</span>
                  <span className={scanStep >= 2 ? "text-slate-300" : "text-slate-500"}>Avaliando adulterações ou ruídos de resolução</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={scanStep >= 3 ? "text-emerald-400" : "text-slate-600"}>✓</span>
                  <span className={scanStep >= 3 ? "text-slate-300" : "text-slate-500"}>Mapeando e-Assinatura da ICP-Brasil</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={scanStep >= 4 ? "text-emerald-400" : "text-slate-600"}>✓</span>
                  <span className={scanStep >= 4 ? "text-slate-300" : "text-slate-500"}>Acurácia e score de autenticidade calculado</span>
                </div>
              </div>

              {scanStep === 4 ? (
                <div>
                  <div className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl px-4 py-2 mb-6">
                    <span className="text-[10px] uppercase font-mono block">Score de Autenticidade</span>
                    <span className="text-xl font-black">{scanScore}% CONFORME</span>
                  </div>
                  <button 
                    onClick={handleFinishOcrScan}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    Anexar à Ficha Cadastral
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mapeando camadas OCR...
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WHATSAPP LINK SIMULATOR SIDE DRAWER */}
      <AnimatePresence>
        {isWhatsAppOpen && (
          <div className="fixed inset-0 bg-[#030712]/70 backdrop-blur-sm z-40 flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-[#0B1329] border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between shadow-2xl z-50 p-4 sm:p-6"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      GSA WhatsApp Link
                    </span>
                  </div>
                  <button onClick={() => setIsWhatsAppOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-800 mb-4 text-xs text-slate-400 shrink-0">
                  Simulador de interação real-time com o cliente para coleta de pendências processuais.
                </div>

                {/* Message logs */}
                <div className="space-y-3 flex-1 overflow-y-auto p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col min-h-0 custom-scrollbar mb-4">
                  {whatsAppHistory.map((m, i) => (
                    <div 
                      key={i} 
                      className={`max-w-[80%] rounded-xl p-3 text-xs ${
                        m.sender === 'agent' 
                          ? 'bg-blue-600 text-white self-end rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 self-start rounded-tl-none'
                      }`}
                    >
                      <p>{m.text}</p>
                      <span className="text-[8px] text-slate-400 block mt-1 text-right">{m.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Msg typing inputs */}
              <div className="space-y-2 pt-4 border-t border-slate-800 shrink-0">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={whatsAppMessage} 
                    onChange={(e) => setWhatsAppMessage(e.target.value)} 
                    placeholder="Escreva a mensagem..." 
                    className="flex-1 bg-[#030712] border border-[#1F2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    onKeyDown={(e) => { if(e.key === 'Enter') handleEnviarMensagemWhatsApp(); }}
                  />
                  <button 
                    onClick={handleEnviarMensagemWhatsApp} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 text-center">Os arquivos enviados pelo cliente entram automaticamente na ficha de auditoria do caso.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GEMINI COPILOT SIDE DRAWING COMPONENT */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <div className="fixed inset-0 bg-[#030712]/70 backdrop-blur-sm z-40 flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-[#0B1329] border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between shadow-2xl z-50 p-4 sm:p-6"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      GSA Gemini Copilot
                    </span>
                  </div>
                  <button onClick={() => setIsAiPanelOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-blue-950/20 p-3 rounded-xl border border-blue-900/30 mb-4 text-[11px] text-blue-300 shrink-0">
                  Pergunte ao Copiloto para redigir a peça inicial da ação ou realizar o saneamento e auditoria da ficha do processo.
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 mb-4 py-1">
                  {aiHistory.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 font-mono text-[11px]">
                      Como posso auxiliar na auditoria deste processo ou na elaboração de uma petição hoje?
                    </div>
                  ) : (
                    aiHistory.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="text-right">
                          <span className="inline-block bg-slate-800 text-white rounded-lg p-2.5 text-xs max-w-[85%] text-left">{item.query}</span>
                        </div>
                        <div className="text-left bg-slate-900/40 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[10px] uppercase">
                            <Bot className="w-3.5 h-3.5" />
                            GSA Copilot
                          </div>
                          <div className="text-slate-300 font-serif leading-relaxed whitespace-pre-wrap">{item.answer}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {isAiLoading && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      Analisando os autos processuais...
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2 shrink-0">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={aiQuery} 
                    onChange={(e) => setAiQuery(e.target.value)} 
                    placeholder="Ex: Minutar petição inicial..." 
                    className="flex-1 bg-[#030712] border border-[#1F2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => { if(e.key === 'Enter') askGeminiAI(); }}
                  />
                  <button 
                    onClick={askGeminiAI} 
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <button onClick={() => setAiQuery('Auditar compliance do caso atual')} className="hover:text-blue-400">Auditar Compliance</button>
                  <button onClick={() => setAiQuery('Minutar petição inicial baseada nos dados')} className="hover:text-blue-400">Minutar Petição Inicial</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
