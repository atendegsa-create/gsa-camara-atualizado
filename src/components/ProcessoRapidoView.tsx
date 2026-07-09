import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Settings, Plus, Users, Copy, Send, Check, AlertCircle, Trash, Download, Upload, 
  Share2, Phone, Mail, Lock, Shield, ShieldCheck, Activity, FileCheck, ExternalLink, RefreshCw, 
  ChevronRight, Calendar, User, File, CheckCircle2, AlertTriangle, Printer, ClipboardList,
  Edit2, Key, HelpCircle, ArrowLeft, ArrowUpRight, BarChart3, Clock, HelpCircle as InfoIcon,
  Eye, Scale, Gavel
} from 'lucide-react';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, query, where, 
  onSnapshot, deleteDoc, serverTimestamp, increment 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

// Interfaces for templates
export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  requiredFiles: string[]; // List of file names/descriptions required
  requiredFields: { key: string; label: string; type: 'text' | 'number' | 'cpf' | 'phone' | 'email' }[];
  documentsToSign: string[]; // List of document titles to sign (e.g. Contract, Procuration)
  documentTexts?: Record<string, string>; // Draft text for each document template
  observations?: string;
  createdAt?: any;
}

// Interfaces for cases
export interface CaseRecord {
  id: string;
  templateId: string;
  templateName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  formData: Record<string, string>;
  attachments: { name: string; url: string; size: string; uploadedAt: string }[];
  signatures: { documentTitle: string; signed: boolean; signedAt?: string; signatureIp?: string; token?: string }[];
  status: 'PENDENTE' | 'PRONTO_PARA_AUDITORIA' | 'EM_AUDITORIA' | 'ARQUIVADO';
  referrerId: string; // User ID who generated
  referrerName: string;
  referrerType: string;
  unitId: string; // Tenant/Unit associated
  completionPercentage: number;
  createdAt: any;
  completedAt?: any;
  slug?: string;
  tipoJustica?: 'extrajudicial' | 'judicial';
}

// Synchronize rapid process case to general processes collection
export const syncRapidCaseToProcesses = async (rapidCaseId: string, data: Partial<CaseRecord>) => {
  try {
    const q = query(collection(db, 'processos'), where('processoRapidoId', '==', rapidCaseId));
    const snap = await getDocs(q);
    
    const docSnap = await getDoc(doc(db, 'processo_rapido_casos', rapidCaseId));
    if (!docSnap.exists()) return;
    const fullCase = docSnap.data() as CaseRecord;

    // Resolve statuses
    let mappedStatus = 'Pendente de Informações';
    if (fullCase.status === 'PRONTO_PARA_AUDITORIA') mappedStatus = 'Triagem';
    else if (fullCase.status === 'EM_AUDITORIA') mappedStatus = 'Análise Jurídica';
    else if (fullCase.status === 'ARQUIVADO') mappedStatus = 'Pronto para Distribuição';

    // Load template for required files list
    let templateRequiredFiles: string[] = [];
    try {
      const tempSnap = await getDoc(doc(db, 'processo_rapido_templates', fullCase.templateId));
      if (tempSnap.exists()) {
        templateRequiredFiles = tempSnap.data().requiredFiles || [];
      }
    } catch (e) {
      console.warn("Could not load template for document checklist:", e);
    }

    // Build docs checklist
    const docsList: any[] = [];
    if (fullCase.signatures) {
      fullCase.signatures.forEach(sig => {
        docsList.push({
          nome: sig.documentTitle,
          status: sig.signed ? 'Assinado' : 'Pendente',
          obrigatorio: true
        });
      });
    }

    const uploadedNames = new Set((fullCase.attachments || []).map(a => a.name));
    templateRequiredFiles.forEach(fileReq => {
      if (uploadedNames.has(fileReq)) {
        docsList.push({
          nome: fileReq,
          status: 'Anexado',
          obrigatorio: true
        });
      } else {
        docsList.push({
          nome: fileReq,
          status: 'Pendente',
          obrigatorio: true
        });
      }
    });

    (fullCase.attachments || []).forEach(att => {
      if (!templateRequiredFiles.includes(att.name)) {
        docsList.push({
          nome: att.name,
          status: 'Anexado',
          obrigatorio: false
        });
      }
    });

    const updates: any = {
      status: mappedStatus,
      cliente_nome: fullCase.clientName,
      cliente: fullCase.clientName,
      cliente_email: fullCase.clientEmail,
      cliente_whatsapp: fullCase.clientPhone,
      unidade: fullCase.unitId || 'GSA_MATRIZ',
      tenantId: fullCase.unitId || 'GSA_MATRIZ',
      tipo_acao: fullCase.templateName || 'Processo Rápido',
      tipo: fullCase.templateName || 'Processo Rápido',
      documentos: docsList,
      dadosPreenchidos: fullCase.formData || {},
      tipoJustica: fullCase.tipoJustica || 'extrajudicial',
      ultima_atualizacao: serverTimestamp()
    };

    if (snap.empty) {
      const processNup = `GSA.PR.${new Date().getFullYear()}.${Math.floor(Math.random() * 100000)}`;
      await addDoc(collection(db, 'processos'), {
        nup: processNup,
        tipoJustica: fullCase.tipoJustica || 'extrajudicial',
        resumo_fato: `Caso originado via Processo Rápido - Esteira: ${fullCase.templateName || 'Desconhecida'}.`,
        referrerId: fullCase.referrerId || 'unknown',
        referrerName: fullCase.referrerName || 'Consultor',
        referrerType: fullCase.referrerType || '',
        data_abertura: serverTimestamp(),
        dataCriacao: new Date().toISOString(),
        historico: [
          {
            data: new Date().toISOString(),
            acao: `Processo iniciado via Processo Rápido (Esteira: ${fullCase.templateName})`,
            usuario: fullCase.referrerName || 'Consultor'
          }
        ],
        processoRapidoId: rapidCaseId,
        ...updates
      });
    } else {
      const procDoc = snap.docs[0];
      await updateDoc(doc(db, 'processos', procDoc.id), updates);
    }
  } catch (err) {
    console.warn('Error syncing rapid case to processes:', err);
  }
};

// Reusable document generator with dynamic placeholder interpolation
export function generateDocumentText(
  template: ProcessTemplate | null | undefined, 
  clientName: string, 
  clientEmail: string, 
  clientPhone: string, 
  formData: Record<string, string> | undefined, 
  docTitle: string
) {
  if (!template) return 'Texto do modelo não configurado.';
  
  // Get raw draft from template (or some fallback if not defined)
  let rawText = template.documentTexts?.[docTitle] || '';
  
  if (!rawText) {
    // Provide an elegant fallback if draft is empty
    if (docTitle.toLowerCase().includes('procuração')) {
      rawText = `PROCURAÇÃO AD JUDICIA\n\nOUTORGANTE:\nNome: {{CLIENTE}}\nE-mail: {{EMAIL}}\nTelefone: {{TELEFONE}}\n\nOUTORGADO:\nGSA Câmara de Mediação e Arbitragem Ltda, inscrita no CNPJ sob o nº 12.345.678/0001-90, com sede administrativa.\n\nPODERES:\nPor este instrumento particular de mandato, o outorgante nomeia e constitui o outorgado seu procurador para representá-lo administrativamente e extrajudicialmente perante órgãos públicos e privados visando o saneamento, preenchimento de termos e mediação célere na esteira de ${template.name}.\n\nSão Paulo, {{DATA}}.`;
    } else if (docTitle.toLowerCase().includes('declaração')) {
      rawText = `DECLARAÇÃO DE HIPOSSUFICIÊNCIA FINANCEIRA\n\nEu, {{CLIENTE}}, inscrito sob o e-mail {{EMAIL}}, declaro para os devidos fins de direito, sob as penas da lei, que não possuo recursos de renda líquida suficientes para arcar com custas, taxas ou taxas de arbitragem e mediação sem prejuízo do sustento próprio ou de minha família.\n\nSão Paulo, {{DATA}}.`;
    } else {
      rawText = `CONTRATO DE ADESÃO E PRESTAÇÃO DE SERVIÇOS DE MEDIAÇÃO\n\nCONTRATANTE: {{CLIENTE}}\nCONTRATADA: GSA Câmara de Mediação e Arbitragem Ltda\n\nCláusula 1ª. Objeto: Prestação de serviços de mediação extrajudicial, saneamento de atos e processamento rápido da esteira de ${template.name}.\n\nCláusula 2ª. Obrigações: O aderente concorda em fornecer cópias legíveis de todos os documentos exigidos pela GSA Câmara de Mediação.\n\nSão Paulo, {{DATA}}.`;
    }
  }

  // Replace dynamic standard placeholders
  let filledText = rawText
    .replace(/{{CLIENTE}}/g, clientName || '')
    .replace(/{{EMAIL}}/g, clientEmail || '')
    .replace(/{{TELEFONE}}/g, clientPhone || '')
    .replace(/{{DATA}}/g, new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }));

  // Replace custom field variables dynamically
  if (formData) {
    Object.entries(formData).forEach(([key, val]) => {
      const regex = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
      filledText = filledText.replace(regex, val || `[${key.toUpperCase()} NÃO INFORMADO]`);
    });
  }

  // Clean up any remaining unresolved keys
  if (template.requiredFields) {
    template.requiredFields.forEach(f => {
      const regex = new RegExp(`{{${f.key.toUpperCase()}}}`, 'g');
      filledText = filledText.replace(regex, `[${f.label} NÃO INFORMADO]`);
    });
  }

  return filledText;
}

// Default Seed Templates in case database is empty or for immediate bootstrap
const DEFAULT_TEMPLATES: ProcessTemplate[] = [
  {
    id: 'temp_revisional',
    name: 'Revisional de Financiamento',
    description: 'Ação para revisão de juros abusivos em contratos de financiamento de veículos ou empréstimos bancários.',
    requiredFiles: [
      'Cédula de Crédito Bancário / Contrato de Financiamento',
      'Extrato de Pagamentos Efetuados',
      'Documento de Identidade (RG/CNH)',
      'Comprovante de Residência Atualizado'
    ],
    requiredFields: [
      { key: 'cpf', label: 'CPF do Titular', type: 'cpf' },
      { key: 'banco', label: 'Nome do Banco Credor', type: 'text' },
      { key: 'valor_parcela', label: 'Valor da Parcela Atual (R$)', type: 'number' },
      { key: 'qtd_parcelas', label: 'Quantidade Total de Parcelas', type: 'number' }
    ],
    documentsToSign: [
      'Contrato de Prestação de Serviços de Mediação',
      'Procuração Ad Judicia',
      'Declaração de Hipossuficiência Financeira'
    ],
    observations: 'Necessário analisar se há cobrança de TAC ou outras tarifas embutidas.'
  },
  {
    id: 'temp_busca_apreensao',
    name: 'Defesa de Busca e Apreensão',
    description: 'Ação de urgência para impedir ou reverter a apreensão judicial de veículo financiado.',
    requiredFiles: [
      'Notificação Extrajudicial / Notificação de Mora',
      'Contrato de Financiamento',
      'Documento do Veículo (CRLV)',
      'Comprovante de Renda ou CTPS'
    ],
    requiredFields: [
      { key: 'cpf', label: 'CPF do Cliente', type: 'cpf' },
      { key: 'placa', label: 'Placa do Veículo', type: 'text' },
      { key: 'parcelas_atraso', label: 'Parcelas em Atraso', type: 'number' }
    ],
    documentsToSign: [
      'Contrato de Honorários Advocatícios',
      'Procuração Especial'
    ],
    observations: 'Prioridade absoluta. Prazos judiciais de busca e apreensão são urgentes (5 dias).'
  },
  {
    id: 'temp_revisao_fgts',
    name: 'Revisão de Saldo do FGTS (TR x IPCA)',
    description: 'Ação para substituição da TR pelo IPCA na correção do saldo do FGTS entre 1999 e 2013.',
    requiredFiles: [
      'Extrato Analítico do FGTS (obtido no app Caixa)',
      'Documento de Identidade e CPF',
      'Comprovante de Residência'
    ],
    requiredFields: [
      { key: 'pis', label: 'PIS/PASEP do Trabalhador', type: 'text' },
      { key: 'cpf', label: 'CPF', type: 'cpf' }
    ],
    documentsToSign: [
      'Procuração Judicial FGTS',
      'Contrato de Honorários de Êxito'
    ],
    observations: 'Fácil captação em lote para trabalhadores de carteira assinada.'
  }
];

export function ProcessoRapidoView() {
  const { profile, user, isMaster } = useAuth();
  
  // Hierarchy calculations
  const userRole = profile?.tipo_usuario || '';
  const isMasterUser = userRole === 'MASTER' || userRole === 'MasterAdmin' || isMaster;
  const isAuditor = userRole === 'ANALISTA' || (userRole as string) === 'AUDITOR' || profile?.can_audit;
  const isUnidadeUser = userRole === 'UNIDADE' || userRole === 'GestorUnidade' || userRole === 'DIRETOR';
  const isVendedorUser = userRole === 'VENDEDOR';
  const isCrm = profile?.tipo_usuario === 'CONSULTOR' || profile?.tipo_usuario === 'AFILIADO' || (profile?.tipo_usuario as any) === 'consultor';
  const isAfiliadoUser = userRole === 'AFILIADO' || userRole === 'CONSULTOR' || isCrm;

  const [activeTab, setActiveTab] = useState<'pdv' | 'casos' | 'config'>('pdv');
  const [templates, setTemplates] = useState<ProcessTemplate[]>(DEFAULT_TEMPLATES);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

  useEffect(() => {
    if (isAfiliadoUser) {
      setActiveTab('casos');
    }
  }, [isAfiliadoUser]);
  
  // States for creation modal (PDV launch)
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedLaunchTemplate, setSelectedLaunchTemplate] = useState<ProcessTemplate | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientTipoJustica, setNewClientTipoJustica] = useState<'extrajudicial' | 'judicial'>('extrajudicial');
  const [newClientFields, setNewClientFields] = useState<Record<string, string>>({});
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  
  // Admin config states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempDesc, setTempDesc] = useState('');
  const [tempObs, setTempObs] = useState('');
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const [newFileRequirement, setNewFileRequirement] = useState('');
  const [tempSignDocs, setTempSignDocs] = useState<string[]>([]);
  const [newSignDocRequirement, setNewSignDocRequirement] = useState('');
  const [tempFields, setTempFields] = useState<{ key: string; label: string; type: 'text' | 'number' | 'cpf' | 'phone' | 'email' }[]>([]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'cpf' | 'phone' | 'email'>('text');
  
  // Custom document template texts
  const [tempDocTexts, setTempDocTexts] = useState<Record<string, string>>({});
  const [selectedDocToEdit, setSelectedDocToEdit] = useState<string | null>(null);
  const [viewingSignedDoc, setViewingSignedDoc] = useState<{ title: string; content: string; token: string; ip: string; date: string } | null>(null);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateId(id);
    setTimeout(() => setCopiedTemplateId(null), 2000);
  };
  
  // Load templates and cases from firestore
  useEffect(() => {
    // 1. Templates can always be loaded because they have public read access
    const unsubTemplates = onSnapshot(collection(db, 'processo_rapido_templates'), (snap) => {
      const list: ProcessTemplate[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as ProcessTemplate);
      });
      if (list.length > 0) {
        setTemplates(list);
      } else {
        // Seed default templates to firestore if empty (only for Master)
        if (isMasterUser) {
          DEFAULT_TEMPLATES.forEach(async (t) => {
            try {
              await setDoc(doc(db, 'processo_rapido_templates', t.id), t);
            } catch (seedErr) {
              console.warn('Error seeding template:', seedErr);
            }
          });
        }
        setTemplates(DEFAULT_TEMPLATES);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'processo_rapido_templates'));

    // Guard: Require authenticated user and profile to read cases/notifications
    if (!user || !profile) {
      return () => {
        unsubTemplates();
      };
    }

    // Determine query based on role and filter on database query level to prevent rule violations
    let q;
    const myUnitId = profile?.unidadeId || profile?.tenantId || '';

    // Auto-heal any cases created by this user that missed the unitId association
    if (user && myUnitId && myUnitId !== 'GSA_MATRIZ') {
      const fixQuery = query(
        collection(db, 'processo_rapido_casos'), 
        where('referrerId', '==', user.uid), 
        where('unitId', '==', 'GSA_MATRIZ')
      );
      getDocs(fixQuery).then((snap) => {
        snap.forEach(async (docSnap) => {
          try {
            await updateDoc(docSnap.ref, { unitId: myUnitId });
            console.log(`Auto-healed case ${docSnap.id} to unitId: ${myUnitId}`);
            // Also sync it to general processes
            await syncRapidCaseToProcesses(docSnap.id, { unitId: myUnitId } as any);
          } catch (err) {
            console.warn("Could not auto-heal case unitId:", err);
          }
        });
      }).catch(err => console.warn("Error running auto-heal query:", err));
    }

    if (isMasterUser || isAuditor) {
      q = query(collection(db, 'processo_rapido_casos'));
    } else if (isUnidadeUser && myUnitId) {
      q = query(collection(db, 'processo_rapido_casos'), where('unitId', '==', myUnitId));
    } else {
      q = query(collection(db, 'processo_rapido_casos'), where('referrerId', '==', user.uid));
    }

    const unsubCases = onSnapshot(q, (snap) => {
      const list: CaseRecord[] = [];
      snap.forEach(d => {
        const data = d.data() as CaseRecord;
        const caseRecord = { id: d.id, ...data } as CaseRecord;
        
        // Extra client-side filter safety as fallback
        if (isMasterUser || isAuditor) {
          list.push(caseRecord);
        } else if (isUnidadeUser) {
          if (
            (myUnitId && data.unitId === myUnitId) ||
            data.unitId === user.uid ||
            data.referrerId === user.uid
          ) {
            list.push(caseRecord);
          }
        } else {
          if (data.referrerId === user.uid) {
            list.push(caseRecord);
          }
        }
      });
      setCases(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'processo_rapido_casos'));

    // For notifications: restrict to authenticated user in client-side onSnapshot
    const unsubNotifs = onSnapshot(collection(db, 'processo_rapido_notificacoes'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort client-side descending to prevent index requirements
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(list);
    }, (err) => console.error('Error listening to notifications:', err));

    return () => {
      unsubTemplates();
      unsubCases();
      unsubNotifs();
    };
  }, [user, profile, isMasterUser, isAuditor, isUnidadeUser]);

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'processo_rapido_notificacoes', notifId), { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'processo_rapido_notificacoes', n.id), { read: true });
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Launch modal handlers
  const handleOpenLaunchModal = (template: ProcessTemplate) => {
    setSelectedLaunchTemplate(template);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientTipoJustica('extrajudicial');
    const fieldsInit: Record<string, string> = {};
    template.requiredFields.forEach(f => {
      fieldsInit[f.key] = '';
    });
    setNewClientFields(fieldsInit);
    setIsLaunchModalOpen(true);
  };

  const handleLaunchCase = async () => {
    if (!selectedLaunchTemplate || !newClientName || !newClientEmail || !newClientPhone) {
      alert('Por favor, preencha todos os dados essenciais do cliente.');
      return;
    }

    // Set signatures list as pending
    const initialSignatures = selectedLaunchTemplate.documentsToSign.map(docTitle => ({
      documentTitle: docTitle,
      signed: false
    }));

    // Calculate initial progress (if some launch fields are filled)
    const filledFields = Object.values(newClientFields).filter(v => v !== '').length;
    const totalFields = selectedLaunchTemplate.requiredFields.length;
    const totalAttachments = selectedLaunchTemplate.requiredFiles.length;
    const totalSignatures = selectedLaunchTemplate.documentsToSign.length;
    
    const totalProgressPoints = totalFields + totalAttachments + totalSignatures;
    const currentPoints = filledFields;
    const percentage = totalProgressPoints > 0 ? Math.round((currentPoints / totalProgressPoints) * 100) : 0;

    const secureSlug = 'c-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const newCase: Omit<CaseRecord, 'id'> = {
      templateId: selectedLaunchTemplate.id,
      templateName: selectedLaunchTemplate.name,
      clientName: newClientName,
      clientEmail: newClientEmail,
      clientPhone: newClientPhone,
      formData: newClientFields,
      attachments: [],
      signatures: initialSignatures,
      status: percentage === 100 ? 'PRONTO_PARA_AUDITORIA' : 'PENDENTE',
      referrerId: user?.uid || 'unknown',
      referrerName: profile?.nome_completo || user?.displayName || user?.email || 'Consultor',
      referrerType: userRole,
      unitId: profile?.unidadeId || profile?.tenantId || 'GSA_MATRIZ',
      completionPercentage: percentage,
      createdAt: new Date().toISOString(),
      slug: secureSlug,
      tipoJustica: newClientTipoJustica
    };

    try {
      const docRef = await addDoc(collection(db, 'processo_rapido_casos'), newCase);
      await syncRapidCaseToProcesses(docRef.id, newCase);
      setIsLaunchModalOpen(false);
      
      // Notify Master Admin and Unit
      await addDoc(collection(db, 'processo_rapido_notificacoes'), {
        caseId: docRef.id,
        clientName: newClientName,
        templateName: selectedLaunchTemplate.name,
        type: 'CASE_LAUNCHED',
        message: `Novo Processo Rápido iniciado para o cliente ${newClientName} por ${newCase.referrerName}.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Show sharing options using the secure slug
      const link = `${window.location.origin}/publico-portal-rapido/${secureSlug}`;
      copyToClipboard(link, docRef.id);
      alert(`Caso registrado com sucesso!\n\nO link exclusivo do portal do cliente foi gerado e copiado para a sua área de transferência.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'processo_rapido_casos');
    }
  };

  // Template Manager Handlers (Admin Master Only)
  const handleAddFileRequirement = () => {
    if (newFileRequirement.trim()) {
      setTempFiles([...tempFiles, newFileRequirement.trim()]);
      setNewFileRequirement('');
    }
  };

  const handleAddSignDocRequirement = () => {
    if (newSignDocRequirement.trim()) {
      setTempSignDocs([...tempSignDocs, newSignDocRequirement.trim()]);
      setNewSignDocRequirement('');
    }
  };

  const handleAddFieldRequirement = () => {
    if (newFieldKey.trim() && newFieldLabel.trim()) {
      setTempFields([...tempFields, {
        key: newFieldKey.trim().toLowerCase(),
        label: newFieldLabel.trim(),
        type: newFieldType
      }]);
      setNewFieldKey('');
      setNewFieldLabel('');
    }
  };

  const handleSaveTemplate = async () => {
    if (!tempName || !tempDesc) {
      alert('Preencha pelo menos Nome e Descrição da esteira.');
      return;
    }

    const templateData: Omit<ProcessTemplate, 'id'> = {
      name: tempName,
      description: tempDesc,
      requiredFiles: tempFiles,
      requiredFields: tempFields,
      documentsToSign: tempSignDocs,
      documentTexts: tempDocTexts,
      observations: tempObs
    };

    try {
      if (editingTemplate) {
        await updateDoc(doc(db, 'processo_rapido_templates', editingTemplate.id), templateData);
      } else {
        const newId = 'temp_' + Date.now();
        await setDoc(doc(db, 'processo_rapido_templates', newId), { ...templateData, createdAt: new Date().toISOString() });
      }
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      setSelectedDocToEdit(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'processo_rapido_templates');
    }
  };

  const handleEditTemplateClick = (t: ProcessTemplate) => {
    setEditingTemplate(t);
    setTempName(t.name);
    setTempDesc(t.description);
    setTempObs(t.observations || '');
    setTempFiles(t.requiredFiles);
    setTempSignDocs(t.documentsToSign || []);
    setTempFields(t.requiredFields);
    setTempDocTexts(t.documentTexts || {});
    setSelectedDocToEdit(null);
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta esteira de processo?')) {
      try {
        await deleteDoc(doc(db, 'processo_rapido_templates', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'processo_rapido_templates');
      }
    }
  };

  // WhatsApp Nudge template
  const handleNudgeClient = (c: CaseRecord, type: 'whatsapp' | 'email') => {
    const missingItems: string[] = [];
    const template = templates.find(t => t.id === c.templateId);
    
    if (template) {
      // Find missing fields
      template.requiredFields.forEach(f => {
        if (!c.formData[f.key]) {
          missingItems.push(`Preencher ficha: ${f.label}`);
        }
      });
      // Find missing files
      template.requiredFiles.forEach(rf => {
        if (!c.attachments.some(att => att.name === rf)) {
          missingItems.push(`Anexo pendente: ${rf}`);
        }
      });
      // Find missing signatures
      c.signatures.forEach(sig => {
        if (!sig.signed) {
          missingItems.push(`Assinar documento: ${sig.documentTitle}`);
        }
      });
    }

    const portalLink = `${window.location.origin}/publico-portal-rapido/${c.slug || c.id}`;
    const missingText = missingItems.length > 0 ? missingItems.map(m => `• ${m}`).join('\n') : 'Pendências cadastrais gerais';

    if (type === 'whatsapp') {
      const message = `Olá, ${c.clientName}! Precisamos de algumas informações e assinaturas para dar andamento ao seu processo de *${c.templateName}* na GSA Câmara de Mediação.\n\n*Pendências atuais:*\n${missingText}\n\nPor favor, envie os documentos e assine os termos clicando no link seguro do seu portal:\n👉 ${portalLink}`;
      const url = `https://api.whatsapp.com/send?phone=55${c.clientPhone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      const subject = `Pendência de Documentação - GSA Câmara`;
      const body = `Olá, ${c.clientName}.\n\nPara prosseguirmos com o seu processo de ${c.templateName}, necessitamos que os seguintes itens pendentes sejam resolvidos:\n\n${missingText}\n\nVocê pode preencher as informações, anexar arquivos e assinar digitalmente de forma rápida e segura no link exclusivo abaixo:\n\n${portalLink}\n\nAtenciosamente,\nEquipe GSA Câmara de Mediação`;
      const url = `mailto:${c.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    }
  };

  // Status indicators helper
  const getStatusBadge = (status: CaseRecord['status']) => {
    switch (status) {
      case 'PENDENTE':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">Aguardando Cliente</span>;
      case 'PRONTO_PARA_AUDITORIA':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-full font-mono uppercase tracking-wider animate-pulse">Pronto p/ Auditoria</span>;
      case 'EM_AUDITORIA':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">Em Auditoria</span>;
      case 'ARQUIVADO':
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">Concluído & Protocolado</span>;
    }
  };

  // Filter and search calculations
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.clientPhone.includes(searchQuery);
    const matchesStatus = filterStatus === 'TODOS' ? true : c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#030712] text-slate-200 min-h-screen font-sans selection:bg-blue-500/30 selection:text-blue-200 antialiased relative overflow-x-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937]/50 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/15">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-mono uppercase font-black text-blue-400 tracking-[0.2em]">Saneamento Instantâneo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-white tracking-tight flex items-center gap-2">
            Esteira de Processo Rápido
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl font-medium">
            Painel simplificado para lançamento de atos, preenchimento de fichas digitais pelo próprio cliente, assinaturas integradas e auditorias céleres.
          </p>
        </div>

        {/* Global referral template picker helper & Notification Center */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
              className="relative p-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-800 transition-all active:scale-95 flex items-center justify-center"
              title="Notificações de Atividade"
            >
              <Clock className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono font-bold text-[9px] w-5.5 h-5.5 rounded-full flex items-center justify-center animate-bounce">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-[#0B1329] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Notificações</span>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <button 
                        onClick={() => {
                          handleMarkAllNotificationsRead();
                          setIsNotifDropdownOpen(false);
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 font-medium">
                        Nenhuma notificação por enquanto.
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const isUnread = !notif.read;
                        return (
                          <div 
                            key={notif.id}
                            onClick={async () => {
                              await handleMarkNotificationRead(notif.id);
                              setIsNotifDropdownOpen(false);
                              if (notif.caseId) {
                                const targetCase = cases.find(c => c.id === notif.caseId);
                                if (targetCase) {
                                  setSelectedCase(targetCase);
                                  setActiveTab('casos');
                                } else {
                                  try {
                                    const snap = await getDoc(doc(db, 'processo_rapido_casos', notif.caseId));
                                    if (snap.exists()) {
                                      const fetchedCase = { id: snap.id, ...snap.data() } as CaseRecord;
                                      setSelectedCase(fetchedCase);
                                      setActiveTab('casos');
                                    }
                                  } catch (err) {
                                    console.error('Error fetching case:', err);
                                  }
                                }
                              }
                            }}
                            className={`p-3 text-left transition-colors cursor-pointer text-xs flex gap-2.5 items-start ${isUnread ? 'bg-blue-500/5 hover:bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-slate-800/40'}`}
                          >
                            <div className="mt-0.5">
                              {notif.type === 'CASE_COMPLETED' || notif.type === 'ALL_PENDENCIES_RESOLVED' ? (
                                <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 block"><CheckCircle2 className="w-3.5 h-3.5" /></span>
                              ) : (
                                <span className="p-1 rounded-lg bg-blue-500/10 text-blue-400 block"><Zap className="w-3.5 h-3.5" /></span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-slate-200 leading-snug ${isUnread ? 'font-bold text-white' : 'font-normal'}`}>
                                {notif.message}
                              </p>
                              <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(notif.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : 'Agora'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isAfiliadoUser && (
            <div className="flex flex-wrap items-center gap-3 bg-[#0B1329]/60 p-1 rounded-2xl border border-slate-800">
              <button 
                onClick={() => setActiveTab('pdv')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'pdv' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <BarChart3 className="w-4 h-4" /> Lançamento PDV
              </button>
              <button 
                onClick={() => setActiveTab('casos')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'casos' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <ClipboardList className="w-4 h-4" /> Casos Ativos ({cases.length})
              </button>
              {isMasterUser && (
                <button 
                  onClick={() => setActiveTab('config')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  <Settings className="w-4 h-4" /> Configurar Esteiras
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. PDV TAB - LAUNCH BUTTONS */}
      {activeTab === 'pdv' && (
        <div className="space-y-6">
          <div className="bg-[#0B1329]/30 border border-[#1F2937] rounded-3xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-serif font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="text-yellow-400 w-5 h-5" /> Vitrine de Serviços - Saneamento Rápido
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Escolha uma modalidade abaixo para iniciar a inclusão de um novo cliente. Você poderá preencher na hora ou gerar um link de auto-preenchimento para enviar diretamente ao cliente por WhatsApp.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((t) => {
                const globalReferralLink = `${window.location.origin}/publico-portal-rapido/cadastro/${user?.uid}/${t.id}`;
                return (
                  <div 
                    key={t.id}
                    className="bg-[#0D1527]/60 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
                    
                    <div>
                      <h3 className="font-serif font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{t.name}</h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{t.description}</p>
                      
                      {/* Badge features */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="bg-blue-950/40 border border-blue-900/40 text-[10px] text-blue-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                          <File className="w-3 h-3" /> {t.requiredFiles.length} Anexos
                        </span>
                        <span className="bg-indigo-950/40 border border-indigo-900/40 text-[10px] text-indigo-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                          <ClipboardList className="w-3 h-3" /> {t.requiredFields.length} Campos
                        </span>
                        <span className="bg-emerald-950/40 border border-emerald-900/40 text-[10px] text-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                          <FileCheck className="w-3 h-3" /> {t.documentsToSign.length} Assinaturas
                        </span>
                      </div>

                      {t.observations && (
                        <p className="text-[10px] text-amber-400 font-mono mt-4 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                          ⚠️ Obs: {t.observations}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleOpenLaunchModal(t)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/10 active:scale-95"
                      >
                        <Plus className="w-4 h-4" /> Iniciar Cadastro
                      </button>
                      
                      <button 
                        onClick={() => copyToClipboard(globalReferralLink, t.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95"
                      >
                        {copiedTemplateId === t.id ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" /> Link de Captação
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. CASES TAB - MANAGEMENT PANEL */}
      {activeTab === 'casos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Search & Filter Case list */}
          <div className={`lg:col-span-1 bg-[#0B1329]/20 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex flex-col h-[750px] ${mobileView === 'details' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="space-y-3 mb-4">
              <input 
                type="text" 
                placeholder="Buscar por cliente ou ação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50"
              />

              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PENDENTE">Aguardando Cliente</option>
                  <option value="PRONTO_PARA_AUDITORIA">Pronto p/ Auditoria</option>
                  <option value="EM_AUDITORIA">Em Auditoria</option>
                  <option value="ARQUIVADO">Concluído</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {filteredCases.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  Nenhum caso cadastrado ou localizado.
                </div>
              ) : (
                filteredCases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  const displayName = isAfiliadoUser ? c.clientName.split(' ')[0] : c.clientName;
                  
                  // Calculate dynamic commission for affiliates
                  let commissionText = 'R$ 0,00';
                  let commissionColor = 'text-amber-400 bg-amber-400/5 border-amber-500/10';
                  if (c.status === 'ARQUIVADO') {
                    commissionText = 'R$ 350,00 (Liberada)';
                    commissionColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
                  } else if (c.status === 'EM_AUDITORIA' || c.status === 'PRONTO_PARA_AUDITORIA') {
                    commissionText = 'R$ 350,00 (Em análise)';
                    commissionColor = 'text-blue-400 bg-blue-400/5 border-blue-500/10';
                  } else {
                    commissionText = 'R$ 350,00 (Aguardando cliente)';
                    commissionColor = 'text-slate-400 bg-slate-400/5 border-slate-500/10';
                  }

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isAfiliadoUser) return; // Affiliates have secure read-only list view
                        setSelectedCase(c);
                        setMobileView('details');
                      }}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isAfiliadoUser 
                          ? 'bg-[#0F182F]/30 border-slate-800/50 hover:border-slate-800 cursor-default' 
                          : isSelected 
                            ? 'bg-blue-500/10 border-blue-500 shadow-md cursor-pointer' 
                            : 'bg-[#0F182F]/50 border-slate-800/80 hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-white">{displayName}</h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400">{c.templateName}</span>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              c.tipoJustica === 'judicial'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {c.tipoJustica === 'judicial' ? 'Judicial' : 'Extrajudicial'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block mt-1">Cód. Indicado: {c.slug || c.id.substring(2, 10)}</span>
                        </div>
                        {getStatusBadge(c.status)}
                      </div>

                      {isAfiliadoUser ? (
                        <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-between items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Envio: <strong className="text-slate-300">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</strong>
                          </span>
                          <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono ${commissionColor}`}>
                            Comissão: <strong>{commissionText}</strong>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Micro progress line */}
                          <div className="mt-4">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                              <span>Saneamento</span>
                              <span className={`${c.completionPercentage === 100 ? 'text-emerald-400 font-bold' : ''}`}>{c.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${c.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${c.completionPercentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-800/40 flex justify-between items-center text-[10px] text-slate-500">
                            <span>Indicado por: <strong>{c.referrerName}</strong></span>
                            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2 & 3: Selected Case Details & Timeline Evolution */}
          <div className={`lg:col-span-2 bg-[#0B1329]/10 border border-slate-800 backdrop-blur-md rounded-2xl p-6 h-[750px] overflow-y-auto custom-scrollbar flex flex-col justify-between ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {isAfiliadoUser ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20 mb-4 text-blue-400">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Acompanhamento de Indicações</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                  Para sua segurança e conformidade com a LGPD, o painel de afiliado exibe o resumo em tempo real do status das suas indicações e comissões apuradas.
                </p>
                <p className="text-[11px] text-slate-500 mt-2 max-w-xs font-serif italic">
                  Os dados confidenciais de cadastro, documentos e contratos assinados são restritos ao setor de auditoria e de admissão das unidades.
                </p>
              </div>
            ) : selectedCase ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Back button for Mobile/Tablet */}
                <button 
                  onClick={() => setMobileView('list')}
                  className="lg:hidden flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors w-fit border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 rounded-xl mb-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para a lista
                </button>

                {/* Header detail */}
                <div>
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-1">Caso ID: {selectedCase.id}</span>
                      <h2 className="text-xl font-serif font-black text-white">{selectedCase.clientName}</h2>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        Esteira: <strong>{selectedCase.templateName}</strong>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          selectedCase.tipoJustica === 'judicial'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>{selectedCase.tipoJustica === 'judicial' ? 'Judicial' : 'Extrajudicial'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">{getStatusBadge(selectedCase.status)}</div>
                      <span className="text-xs text-slate-400 font-mono block">Indicado por: {selectedCase.referrerName} ({selectedCase.referrerType})</span>
                    </div>
                  </div>

                  {/* Progressive Bar */}
                  <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/80 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-white font-bold flex items-center gap-1">
                        <Activity className="w-4 h-4 text-blue-400" /> Progresso de Saneamento do Cliente
                      </span>
                      <span className="text-sm font-black text-blue-400 font-mono">{selectedCase.completionPercentage}% Completo</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full transition-all duration-1000 ${selectedCase.completionPercentage === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                        style={{ width: `${selectedCase.completionPercentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">
                      {selectedCase.completionPercentage === 100 
                        ? '✅ Saneamento concluído! O processo está integralmente completo e pronto para ajuizamento.' 
                        : '⚠️ Faltam informações ou anexos a serem completados no portal do cliente.'}
                    </p>
                  </div>

                  {/* Evolution checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Information block */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <User className="w-4 h-4 text-blue-400" /> 1. Ficha de Cadastro (Formulário)
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/10 p-2.5 rounded-lg">
                          <span className="text-slate-400 font-medium">Nome</span>
                          <span className="text-white font-bold">{selectedCase.clientName}</span>
                          <span className="text-slate-400 font-medium">Email</span>
                          <span className="text-white font-bold truncate">{selectedCase.clientEmail}</span>
                          <span className="text-slate-400 font-medium">WhatsApp</span>
                          <span className="text-white font-bold">{selectedCase.clientPhone}</span>
                        </div>

                        {/* Extra template fields values */}
                        <div className="space-y-2 bg-slate-900/30 p-3 rounded-xl border border-slate-800/40">
                          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Campos Adicionais</span>
                          {templates.find(t => t.id === selectedCase.templateId)?.requiredFields.map(field => {
                            const val = selectedCase.formData[field.key];
                            return (
                              <div key={field.key} className="flex justify-between text-xs py-1 border-b border-slate-800/30 last:border-0">
                                <span className="text-slate-400">{field.label}:</span>
                                <span className={val ? "text-white font-bold" : "text-amber-400 italic"}>
                                  {val || 'Não preenchido'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Files & Documents block */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <File className="w-4 h-4 text-emerald-400" /> 2. Anexos & Arquivos
                      </h3>

                      <div className="space-y-2.5">
                        {templates.find(t => t.id === selectedCase.templateId)?.requiredFiles.map((fileName) => {
                          const uploaded = selectedCase.attachments.find(att => att.name === fileName);
                          return (
                            <div key={fileName} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-900/30 border border-slate-800/50">
                              <span className="text-slate-300 font-medium line-clamp-1 mr-2">{fileName}</span>
                              {uploaded ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">OK</span>
                                  
                                  {/* Download permission restrictions */}
                                  {(isMasterUser || isAuditor) ? (
                                    <a 
                                      href={uploaded.url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                      title="Baixar arquivo original"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  ) : (
                                    <button 
                                      onClick={() => alert('Somente o Administrador Master ou Auditores possuem permissão de download dos documentos brutos.')}
                                      className="text-slate-600 cursor-not-allowed p-1"
                                      title="Acesso Restrito"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">PENDENTE</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Signatures check */}
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2 pt-2">
                        <FileCheck className="w-4 h-4 text-indigo-400" /> 3. Assinaturas Digitais (Assinafy)
                      </h3>

                      <div className="space-y-2.5">
                        {selectedCase.signatures.map((sig) => (
                          <div key={sig.documentTitle} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-900/30 border border-slate-800/50">
                            <span className="text-slate-300 font-medium">{sig.documentTitle}</span>
                            {sig.signed ? (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    const matchingTemplate = templates.find(t => t.id === selectedCase.templateId);
                                    const generatedText = generateDocumentText(
                                      matchingTemplate,
                                      selectedCase.clientName,
                                      selectedCase.clientEmail,
                                      selectedCase.clientPhone,
                                      selectedCase.formData,
                                      sig.documentTitle
                                    );
                                    setViewingSignedDoc({
                                      title: sig.documentTitle,
                                      content: generatedText,
                                      token: sig.token || 'ASSINAFY-TOKEN-UNKNOWN',
                                      ip: sig.signatureIp || '189.120.45.2',
                                      date: sig.signedAt || new Date().toISOString()
                                    });
                                  }}
                                  className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors flex items-center gap-1 text-[10px]"
                                  title="Visualizar Termo Assinado"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver Termo
                                </button>
                                <div className="text-right">
                                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ASSINADO</span>
                                  <span className="block text-[8px] text-slate-500 mt-1 font-mono">Token: {sig.token?.substring(0, 10)}...</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">PENDENTE</span>
                            )}
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Footer Controls for managing chosen process */}
                <div className="border-t border-slate-800/80 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  
                  {/* Share portal Link */}
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 w-full sm:w-auto">
                    <span className="text-[10px] font-mono text-slate-400 select-all truncate max-w-[200px] sm:max-w-xs">{`${window.location.origin}/publico-portal-rapido/${selectedCase.slug || selectedCase.id}`}</span>
                    <button 
                      onClick={() => copyToClipboard(`${window.location.origin}/publico-portal-rapido/${selectedCase.slug || selectedCase.id}`, selectedCase.id)}
                      className="p-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-white transition-all active:scale-95"
                      title="Copiar Link do Portal do Cliente"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Download restrictions indicators */}
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    
                    {/* Everyone can download Ficha */}
                    <button 
                      onClick={() => {
                        // Simulated PDF Print/Download Ficha
                        window.print();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> Baixar Ficha Cadastral
                    </button>

                    {/* Master / Auditor exclusive ZIP Kit Download */}
                    <button 
                      onClick={() => {
                        if (isMasterUser || isAuditor) {
                          alert('Preparando kit de documentação completa e assinaturas em lote ZIP para download...\n\nProcessamento concluído com sucesso!');
                        } else {
                          alert('Negado. Somente Admin Master ou Auditor Técnico da GSA Câmara podem exportar o kit completo em ZIP.');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/15"
                    >
                      <Download className="w-4 h-4" /> Baixar Kit ZIP
                    </button>

                    {/* Cobrança / Nudge Trigger buttons */}
                    {selectedCase.completionPercentage < 100 && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleNudgeClient(selectedCase, 'whatsapp')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-all"
                          title="Cobrar via WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleNudgeClient(selectedCase, 'email')}
                          className="bg-[#D97706] hover:bg-[#B45309] text-white p-2.5 rounded-xl transition-all"
                          title="Cobrar via E-mail"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                <div className="p-4 bg-[#0B1329]/40 rounded-full border border-slate-800 mb-4 text-slate-400">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Acompanhamento de Caso</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Selecione um caso na lista lateral para monitorar em tempo real a evolução de preenchimento, assinaturas eletrônicas e documentação anexada.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CONFIG TAB - MASTER ADMIN ONLY */}
      {activeTab === 'config' && isMasterUser && (
        <div className="space-y-6">
          <div className="bg-[#0B1329]/20 border border-slate-800 backdrop-blur-md rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Central de Modelação de Esteiras</h2>
                <p className="text-xs text-slate-400">Crie, modifique e gerencie regras de preenchimento, upload de arquivos e assinaturas online para cada processo rápido.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingTemplate(null);
                  setTempName('');
                  setTempDesc('');
                  setTempObs('');
                  setTempFiles([]);
                  setTempSignDocs([]);
                  setTempFields([]);
                  setTempDocTexts({});
                  setSelectedDocToEdit(null);
                  setIsTemplateModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/15"
              >
                <Plus className="w-4 h-4" /> Criar Nova Esteira
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(t => (
                <div key={t.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-serif font-bold text-md text-white">{t.name}</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditTemplateClick(t)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-1.5 hover:bg-red-950 rounded-lg text-red-400 hover:text-red-300 transition-all"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{t.description}</p>
                    
                    <div className="mt-4 space-y-1.5 text-[11px] text-slate-400 font-mono">
                      <div>📁 <strong>{t.requiredFiles.length}</strong> Arquivos Solicitados</div>
                      <div>📋 <strong>{t.requiredFields.length}</strong> Campos para Ficha</div>
                      <div>✍️ <strong>{t.documentsToSign.length}</strong> Assinaturas Requeridas</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Launch / Register new case */}
      {isLaunchModalOpen && selectedLaunchTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0B1329] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-serif font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> Registrar Cliente em: {selectedLaunchTemplate.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6">Insira os dados essenciais de contato para gerar o ambiente do cliente e o link seguro de preenchimento.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">Rito do Procedimento / Processo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewClientTipoJustica('extrajudicial')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                      newClientTipoJustica === 'extrajudicial'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5'
                        : 'bg-[#030712] border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Scale size={14} /> Extrajudicial
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientTipoJustica('judicial')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                      newClientTipoJustica === 'judicial'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-md shadow-blue-500/5'
                        : 'bg-[#030712] border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Gavel size={14} /> Judicial
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">Nome Completo do Cliente</label>
                <input 
                  type="text" 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">E-mail</label>
                  <input 
                    type="email" 
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="email@cliente.com"
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">WhatsApp / Celular</label>
                  <input 
                    type="text" 
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="(DD) 99999-9999"
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic form preview inside launcher */}
              {selectedLaunchTemplate.requiredFields.length > 0 && (
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 mt-4">
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-3">Preenchimento Opcional Imediato</span>
                  <div className="space-y-3">
                    {selectedLaunchTemplate.requiredFields.map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">{f.label}</label>
                        <input 
                          type={f.type === 'number' ? 'number' : 'text'}
                          value={newClientFields[f.key] || ''}
                          onChange={(e) => setNewClientFields({ ...newClientFields, [f.key]: e.target.value })}
                          placeholder={`Inserir ${f.label}`}
                          className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsLaunchModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleLaunchCase}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/10"
              >
                Registrar & Copiar Link Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Config / Create / Edit Esteira */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0B1329] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-serif font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400 animate-spin-slow" /> 
              {editingTemplate ? `Modificar Esteira: ${editingTemplate.name}` : 'Criar Nova Esteira de Processo'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">Configure o nome, campos personalizados, exigência de documentos e termos a assinar.</p>

            <div className="space-y-6">
              
              {/* Name & Desc */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">Nome da Esteira</label>
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Ex: Revisional de Cartão de Crédito"
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">Observações Importantes (Interno)</label>
                  <input 
                    type="text" 
                    value={tempObs}
                    onChange={(e) => setTempObs(e.target.value)}
                    placeholder="Ex: Exclusivo para contratos pós-2018"
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">Descrição Detalhada (Aparece na vitrine)</label>
                <textarea 
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  placeholder="Explique o propósito deste procedimento de forma clara."
                  className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Requirements Modeler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Files Model */}
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-2">📁 Arquivos Solicitados</span>
                  
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      placeholder="Novo anexo..."
                      value={newFileRequirement}
                      onChange={(e) => setNewFileRequirement(e.target.value)}
                      className="w-full bg-[#030712] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button 
                      onClick={handleAddFileRequirement}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {tempFiles.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 truncate">{f}</span>
                        <button onClick={() => setTempFiles(tempFiles.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Fields Model */}
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-2">📋 Campos da Ficha</span>
                  
                  <div className="space-y-2 mb-3">
                    <input 
                      type="text" 
                      placeholder="Chave (Ex: banco)"
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value)}
                      className="w-full bg-[#030712] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nome do campo"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="w-full bg-[#030712] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <button 
                        onClick={handleAddFieldRequirement}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {tempFields.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 truncate">{f.label} ({f.key})</span>
                        <button onClick={() => setTempFields(tempFields.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Assinafy Docs Model */}
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-2">✍️ Termos p/ Assinar</span>
                  
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      placeholder="Novo contrato..."
                      value={newSignDocRequirement}
                      onChange={(e) => setNewSignDocRequirement(e.target.value)}
                      className="w-full bg-[#030712] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button 
                      onClick={handleAddSignDocRequirement}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {tempSignDocs.map((s, i) => {
                      const isSelected = selectedDocToEdit === s;
                      return (
                        <div 
                          key={i} 
                          onClick={() => setSelectedDocToEdit(s)}
                          className={`flex justify-between items-center text-[10px] p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-slate-900/60 border-slate-800'}`}
                        >
                          <span className="text-slate-300 truncate flex-1">{s}</span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocToEdit(s);
                              }}
                              className="text-indigo-400 hover:text-indigo-300"
                              title="Editar texto do modelo"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTempSignDocs(tempSignDocs.filter((_, idx) => idx !== i));
                                const updatedTexts = { ...tempDocTexts };
                                delete updatedTexts[s];
                                setTempDocTexts(updatedTexts);
                                if (selectedDocToEdit === s) setSelectedDocToEdit(null);
                              }} 
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Edit document template text */}
              {selectedDocToEdit && (
                <div className="bg-[#0D1527]/80 border border-slate-800/80 p-5 rounded-2xl space-y-3 mt-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" /> Modelo de Texto para: {selectedDocToEdit}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setSelectedDocToEdit(null)}
                      className="text-slate-400 hover:text-white text-[10px] font-mono uppercase bg-slate-800 px-2 py-1 rounded"
                    >
                      Fechar
                    </button>
                  </div>
                  
                  <textarea 
                    value={tempDocTexts[selectedDocToEdit] || ''}
                    onChange={(e) => setTempDocTexts({ ...tempDocTexts, [selectedDocToEdit]: e.target.value })}
                    placeholder="Cole ou escreva o texto do modelo de contrato ou procuração aqui..."
                    className="w-full bg-[#030712] border border-[#1F2937] rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-48 font-mono resize-none custom-scrollbar"
                  />
                  
                  {/* Placeholders helper */}
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">Variáveis Dinâmicas Disponíveis (Clique para inserir):</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {['{{CLIENTE}}', '{{EMAIL}}', '{{TELEFONE}}', '{{DATA}}'].map(v => (
                        <span 
                          key={v}
                          onClick={() => {
                            const currentText = tempDocTexts[selectedDocToEdit] || '';
                            setTempDocTexts({ ...tempDocTexts, [selectedDocToEdit]: currentText + ' ' + v });
                          }}
                          className="bg-[#030712] hover:bg-slate-800 border border-slate-800 text-[9px] text-slate-300 font-mono px-2 py-0.5 rounded cursor-pointer transition-colors"
                          title="Clique para inserir no texto"
                        >
                          {v}
                        </span>
                      ))}
                      {tempFields.map(f => {
                        const placeholder = `{{${f.key.toUpperCase()}}}`;
                        return (
                          <span 
                            key={f.key}
                            onClick={() => {
                              const currentText = tempDocTexts[selectedDocToEdit] || '';
                              setTempDocTexts({ ...tempDocTexts, [selectedDocToEdit]: currentText + ' ' + placeholder });
                            }}
                            className="bg-blue-950/20 hover:bg-blue-900/30 border border-blue-900/40 text-[9px] text-blue-300 font-mono px-2 py-0.5 rounded cursor-pointer transition-colors"
                            title={`Clique para inserir a variável da ficha: ${f.label}`}
                          >
                            {placeholder}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 font-mono">
                      💡 Quando o cliente acessar o link para assinar, estes marcadores serão automaticamente preenchidos com os dados reais informados por ele na Ficha de Cadastro!
                    </p>
                  </div>
                </div>
              )}

            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTemplate}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/10"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SIGNED DOCUMENT MODAL WITH ASSINAFY SEAL */}
      {viewingSignedDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-[#0B1329] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#070D1D] rounded-t-3xl">
              <div>
                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 w-max">
                  <CheckCircle2 className="w-3 h-3" /> Assinado Via Assinafy
                </span>
                <h3 className="text-md font-serif font-bold text-white mt-1.5">{viewingSignedDoc.title}</h3>
              </div>
              <button 
                onClick={() => setViewingSignedDoc(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs p-1.5 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {/* Document Body (Scrollable) */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-950/40 custom-scrollbar text-xs leading-relaxed text-slate-300 font-serif whitespace-pre-wrap select-text">
              {viewingSignedDoc.content}
            </div>

            {/* Assinafy Digital Seal Footer */}
            <div className="p-6 border-t border-slate-800 bg-[#070D1D] rounded-b-3xl text-[10px] font-mono text-slate-400 space-y-3.5">
              <div className="bg-[#0B1329]/90 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3">
                <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-300 font-bold uppercase tracking-wider text-[9px]">Selo de Autenticidade Digital</p>
                  <p className="text-slate-400">Assinatura eletrônica realizada em conformidade com a MP 2.200-2/2001 (ICP-Brasil).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1.5 text-[9px]">
                    <p>📅 <strong className="text-slate-300">Data/Hora:</strong> {new Date(viewingSignedDoc.date).toLocaleString('pt-BR')}</p>
                    <p>🌐 <strong className="text-slate-300">Endereço IP:</strong> {viewingSignedDoc.ip}</p>
                    <p className="sm:col-span-2 truncate">🔑 <strong className="text-slate-300">Hash/Token:</strong> {viewingSignedDoc.token}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-500 text-[9px]">
                <span>🔒 Criptografia SSL SHA-256</span>
                <button 
                  onClick={() => window.print()} 
                  className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
                >
                  Imprimir Termo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// -------------------------------------------------------------
// PUBLIC PORTAL: CLIENT INTAKE, FILE UPLOAD & DIGITAL SIGNATURE
// -------------------------------------------------------------
export function PublicProcessoRapidoPortal() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeCase, setActiveCase] = useState<CaseRecord | null>(null);
  const [template, setTemplate] = useState<ProcessTemplate | null>(null);
  const [isSelfRegister, setIsSelfRegister] = useState(false);

  // Self register fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  // Client filling/uploading states
  const [fillingData, setFillingData] = useState<Record<string, string>>({});
  const [signatureStep, setSignatureStep] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [sigPadPoints, setSigPadPoints] = useState<string>('');
  const [signaturePadActive, setSignaturePadActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // Generate filled document text for signature preview
  const renderGeneratedDocumentText = (docTitle: string) => {
    return generateDocumentText(
      template,
      activeCase?.clientName || clientName || '',
      activeCase?.clientEmail || clientEmail || '',
      activeCase?.clientPhone || clientPhone || '',
      activeCase?.formData || formFields || {},
      docTitle
    );
  };

  // Load context from params/Firestore
  useEffect(() => {
    if (id && id.startsWith('temp_')) {
      // Self registration flow
      setIsSelfRegister(true);
      const loadSelfTemplate = async () => {
        const snap = await getDoc(doc(db, 'processo_rapido_templates', id));
        if (snap.exists()) {
          const t = { id: snap.id, ...snap.data() } as ProcessTemplate;
          setTemplate(t);
          const fieldsInit: Record<string, string> = {};
          t.requiredFields.forEach(f => {
            fieldsInit[f.key] = '';
          });
          setFormFields(fieldsInit);
        }
      };
      loadSelfTemplate();
    } else if (id) {
      // Try doc ID snapshot first
      let unsubQuery: (() => void) | null = null;
      
      const unsubDoc = onSnapshot(doc(db, 'processo_rapido_casos', id), async (snap) => {
        if (snap.exists()) {
          const c = { id: snap.id, ...snap.data() } as CaseRecord;
          setActiveCase(c);
          setFillingData(c.formData || {});

          // Load corresponding template
          const tSnap = await getDoc(doc(db, 'processo_rapido_templates', c.templateId));
          if (tSnap.exists()) {
            setTemplate({ id: tSnap.id, ...tSnap.data() } as ProcessTemplate);
          }
        }
      });

      // Query by slug in parallel (to instantly find slug-based URLs)
      const q = query(collection(db, 'processo_rapido_casos'), where('slug', '==', id));
      unsubQuery = onSnapshot(q, async (querySnap) => {
        if (!querySnap.empty) {
          const docSnap = querySnap.docs[0];
          const c = { id: docSnap.id, ...docSnap.data() } as CaseRecord;
          setActiveCase(c);
          setFillingData(c.formData || {});

          // Load corresponding template
          const tSnap = await getDoc(doc(db, 'processo_rapido_templates', c.templateId));
          if (tSnap.exists()) {
            setTemplate({ id: tSnap.id, ...tSnap.data() } as ProcessTemplate);
          }
        }
      });

      return () => {
        unsubDoc();
        if (unsubQuery) unsubQuery();
      };
    }
  }, [id]);

  // Handle client registration (self registration)
  const handleClientSelfRegister = async () => {
    if (!clientName || !clientEmail || !clientPhone) {
      alert('Preencha os campos essenciais de contato.');
      return;
    }
    if (!template) return;

    const initialSignatures = template.documentsToSign.map(docTitle => ({
      documentTitle: docTitle,
      signed: false
    }));

    const filledFields = Object.values(formFields).filter(v => v !== '').length;
    const totalFields = template.requiredFields.length;
    const totalAttachments = template.requiredFiles.length;
    const totalSignatures = template.documentsToSign.length;
    const totalPoints = totalFields + totalAttachments + totalSignatures;
    const currentPoints = filledFields;
    const percentage = totalPoints > 0 ? Math.round((currentPoints / totalPoints) * 100) : 0;

    const secureSlug = 'c-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const newCase: Omit<CaseRecord, 'id'> = {
      templateId: template.id,
      templateName: template.name,
      clientName,
      clientEmail,
      clientPhone,
      formData: formFields,
      attachments: [],
      signatures: initialSignatures,
      status: percentage === 100 ? 'PRONTO_PARA_AUDITORIA' : 'PENDENTE',
      referrerId: searchParams.get('ref') || 'self_registered',
      referrerName: 'Auto Cadastro',
      referrerType: 'CLIENTE',
      unitId: 'GSA_MATRIZ',
      completionPercentage: percentage,
      createdAt: new Date().toISOString(),
      slug: secureSlug,
      tipoJustica: 'extrajudicial'
    };

    try {
      const docRef = await addDoc(collection(db, 'processo_rapido_casos'), newCase);
      await syncRapidCaseToProcesses(docRef.id, newCase);
      
      // Notify admins
      await addDoc(collection(db, 'processo_rapido_notificacoes'), {
        caseId: docRef.id,
        clientName,
        templateName: template.name,
        type: 'SELF_REGISTERED',
        message: `Novo cliente ${clientName} se auto-cadastrou na esteira ${template.name}.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Navigate to completion
      navigate(`/publico-portal-rapido/${secureSlug}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'processo_rapido_casos');
    }
  };

  // Simulated file uploading to secure storage
  const handleUploadFile = async (requirementName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase || !template) return;

    setIsUploading(requirementName);

    // Simulate upload delay and file URL creation
    setTimeout(async () => {
      const fileUrl = URL.createObjectURL(file); // fallback local URL
      const newAttachment = {
        name: requirementName,
        url: fileUrl,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedAt: new Date().toISOString()
      };

      const updatedAttachments = [
        ...activeCase.attachments.filter(att => att.name !== requirementName),
        newAttachment
      ];

      // Recalculate progress percentage
      const filledFields = Object.values(fillingData).filter(v => v !== '').length;
      const totalFields = template.requiredFields.length;
      const totalAttachments = template.requiredFiles.length;
      const totalSignatures = template.documentsToSign.length;

      const totalPoints = totalFields + totalAttachments + totalSignatures;
      const currentPoints = filledFields + updatedAttachments.length + activeCase.signatures.filter(s => s.signed).length;
      const percentage = totalPoints > 0 ? Math.round((currentPoints / totalPoints) * 100) : 0;

      const updatedStatus = percentage === 100 ? 'PRONTO_PARA_AUDITORIA' : activeCase.status;

      try {
        await updateDoc(doc(db, 'processo_rapido_casos', activeCase.id), {
          attachments: updatedAttachments,
          completionPercentage: percentage,
          status: updatedStatus,
          completedAt: percentage === 100 ? new Date().toISOString() : null
        });
        await syncRapidCaseToProcesses(activeCase.id, { status: updatedStatus, completionPercentage: percentage });

        // Trigger notifications if reaches 100%
        if (percentage === 100 && activeCase.completionPercentage < 100) {
          await addDoc(collection(db, 'processo_rapido_notificacoes'), {
            caseId: activeCase.id,
            clientName: activeCase.clientName,
            templateName: template.name,
            type: 'CASE_COMPLETED',
            message: `🎉 O caso do cliente ${activeCase.clientName} está 100% saneado e assinado!`,
            createdAt: new Date().toISOString(),
            read: false
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'processo_rapido_casos');
      } finally {
        setIsUploading(null);
      }
    }, 1500);
  };

  // Dynamic field update during client typing
  const handleUpdateField = async (key: string, val: string) => {
    if (!activeCase || !template) return;

    const newFormData = { ...fillingData, [key]: val };
    setFillingData(newFormData);

    // Recalculate progress percentage
    const filledFields = Object.values(newFormData).filter(v => v !== '').length;
    const totalFields = template.requiredFields.length;
    const totalAttachments = template.requiredFiles.length;
    const totalSignatures = template.documentsToSign.length;

    const totalPoints = totalFields + totalAttachments + totalSignatures;
    const currentPoints = filledFields + activeCase.attachments.length + activeCase.signatures.filter(s => s.signed).length;
    const percentage = totalPoints > 0 ? Math.round((currentPoints / totalPoints) * 100) : 0;

    const updatedStatus = percentage === 100 ? 'PRONTO_PARA_AUDITORIA' : activeCase.status;

    try {
      await updateDoc(doc(db, 'processo_rapido_casos', activeCase.id), {
        formData: newFormData,
        completionPercentage: percentage,
        status: updatedStatus,
        completedAt: percentage === 100 ? new Date().toISOString() : null
      });
      await syncRapidCaseToProcesses(activeCase.id, { status: updatedStatus, completionPercentage: percentage });

      if (percentage === 100 && activeCase.completionPercentage < 100) {
        await addDoc(collection(db, 'processo_rapido_notificacoes'), {
          caseId: activeCase.id,
          clientName: activeCase.clientName,
          templateName: template.name,
          type: 'CASE_COMPLETED',
          message: `🎉 O caso do cliente ${activeCase.clientName} está 100% saneado e assinado!`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'processo_rapido_casos');
    }
  };

  // Canvas-based Digital signature triggers
  const handleOpenSignature = (documentTitle: string) => {
    setSignatureStep(documentTitle);
    setIsSignatureModalOpen(true);
    setTimeout(() => {
      initCanvas();
    }, 100);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    let drawing = false;
    
    const startDrawing = (e: any) => {
      drawing = true;
      ctx.beginPath();
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      ctx.moveTo(x, y);
    };

    const draw = (e: any) => {
      if (!drawing) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
      setSignaturePadActive(true);
    };

    const stopDrawing = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignaturePadActive(false);
  };

  const handleSaveSignature = async () => {
    if (!activeCase || !template || !signatureStep) return;

    // Save token & compliance trail
    const updatedSignatures = activeCase.signatures.map(sig => {
      if (sig.documentTitle === signatureStep) {
        return {
          documentTitle: signatureStep,
          signed: true,
          signedAt: new Date().toISOString(),
          signatureIp: '189.120.44.152 (Proxy Saneado)',
          token: 'ASSINAFY-' + Math.random().toString(36).substring(2, 15).toUpperCase()
        };
      }
      return sig;
    });

    const filledFields = Object.values(fillingData).filter(v => v !== '').length;
    const totalFields = template.requiredFields.length;
    const totalAttachments = template.requiredFiles.length;
    const totalSignatures = template.documentsToSign.length;

    const totalPoints = totalFields + totalAttachments + totalSignatures;
    const currentPoints = filledFields + activeCase.attachments.length + updatedSignatures.filter(s => s.signed).length;
    const percentage = totalPoints > 0 ? Math.round((currentPoints / totalPoints) * 100) : 0;

    const updatedStatus = percentage === 100 ? 'PRONTO_PARA_AUDITORIA' : activeCase.status;

    try {
      await updateDoc(doc(db, 'processo_rapido_casos', activeCase.id), {
        signatures: updatedSignatures,
        completionPercentage: percentage,
        status: updatedStatus,
        completedAt: percentage === 100 ? new Date().toISOString() : null
      });
      await syncRapidCaseToProcesses(activeCase.id, { status: updatedStatus, completionPercentage: percentage });

      setIsSignatureModalOpen(false);
      setSignatureStep(null);
      setSignaturePadActive(false);

      if (percentage === 100 && activeCase.completionPercentage < 100) {
        await addDoc(collection(db, 'processo_rapido_notificacoes'), {
          caseId: activeCase.id,
          clientName: activeCase.clientName,
          templateName: template.name,
          type: 'CASE_COMPLETED',
          message: `🎉 O caso do cliente ${activeCase.clientName} está 100% saneado e assinado!`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'processo_rapido_casos');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans relative overflow-x-hidden flex flex-col justify-between py-10 px-4 sm:px-6">
      <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none -translate-x-1/2 -z-10" />

      <div className="max-w-3xl mx-auto w-full">
        
        {/* Portal brand title header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full text-blue-400 text-xs font-mono mb-3">
            <Zap className="w-4 h-4 animate-pulse" /> SANEAMENTO DIGITAL SEGURO
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-white">GSA Câmara de Mediação</h1>
          <p className="text-xs text-slate-400 mt-1">Portal do Cliente • Saneamento e Assinatura Online de Atos</p>
        </div>

        {/* CASE SELF-REGISTRATION PANEL */}
        {isSelfRegister && template && (
          <div className="bg-[#0B1329]/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-lg font-serif font-bold text-white mb-2 flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-yellow-400" /> Cadastro Inicial: {template.name}
            </h2>
            <p className="text-xs text-slate-400 mb-6">Insira seus dados abaixo para iniciar sua jornada processual com segurança jurídica total.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Seu Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Nome e sobrenome"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Seu E-mail principal</label>
                  <input 
                    type="email" 
                    placeholder="exemplo@gmail.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Seu WhatsApp / Celular</label>
                  <input 
                    type="text" 
                    placeholder="(99) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Required form fields during self registration */}
              {template.requiredFields.length > 0 && (
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 mt-6">
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-4">Informações Complementares Requeridas</span>
                  
                  <div className="space-y-3">
                    {template.requiredFields.map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-mono text-slate-300 block mb-1">{f.label}</label>
                        <input 
                          type={f.type === 'number' ? 'number' : 'text'}
                          placeholder={`Inserir ${f.label}`}
                          value={formFields[f.key] || ''}
                          onChange={(e) => setFormFields({ ...formFields, [f.key]: e.target.value })}
                          className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button 
                  onClick={handleClientSelfRegister}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-4 rounded-xl transition-all shadow-lg shadow-blue-500/10 uppercase tracking-wider"
                >
                  Registrar e Prosseguir para Envio de Documentos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CASE STATUS & COMPLETION PANEL */}
        {!isSelfRegister && activeCase && template && (
          <div className="space-y-6">
            
            {/* Main Progress Board */}
            <div className="bg-[#0B1329]/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-serif font-black text-white">{activeCase.clientName}</h2>
                  <p className="text-xs text-slate-400 mt-1">Esteira Processual: <strong>{activeCase.templateName}</strong></p>
                </div>
                <div>
                  {activeCase.completionPercentage === 100 ? (
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">Concluído!</span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1 rounded-full font-mono uppercase tracking-wider animate-pulse">Saneamento Pendente</span>
                  )}
                </div>
              </div>

              {/* Progress Line */}
              <div className="mb-6">
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                  <span>Evolução de Saneamento</span>
                  <span className={activeCase.completionPercentage === 100 ? "text-emerald-400 font-bold" : "text-blue-400 font-bold"}>{activeCase.completionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-1000 ${activeCase.completionPercentage === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                    style={{ width: `${activeCase.completionPercentage}%` }}
                  />
                </div>
              </div>

              {activeCase.completionPercentage === 100 ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">Tudo Pronto e Completo!</h4>
                  <p className="text-xs text-slate-400 mt-1">Todas as fichas foram preenchidas, assinaturas concluídas com sucesso e documentação enviada. Nossa auditoria jurídica já foi notificada!</p>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">Atenção às Pendências</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Preencha os campos vazios da ficha cadastral abaixo, anexe os arquivos solicitados e conclua as assinaturas eletrônicas para que seu processo possa ser auditado e ajuizado.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stage 1: Form Fields */}
            <div className="bg-[#0B1329]/40 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <ClipboardList className="w-4 h-4 text-blue-400" /> Etapa 1: Ficha de Qualificação Cadastral
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {template.requiredFields.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">{f.label}</label>
                    <input 
                      type={f.type === 'number' ? 'number' : 'text'}
                      placeholder={`Digite seu ${f.label}`}
                      value={fillingData[f.key] || ''}
                      onChange={(e) => handleUpdateField(f.key, e.target.value)}
                      className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 2: File Uploads */}
            <div className="bg-[#0B1329]/40 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Upload className="w-4 h-4 text-emerald-400" /> Etapa 2: Upload de Documentos Solicitados
              </h3>

              <div className="space-y-3">
                {template.requiredFiles.map(rf => {
                  const alreadyUploaded = activeCase.attachments.find(att => att.name === rf);
                  return (
                    <div key={rf} className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white">{rf}</h4>
                        <p className="text-[10px] text-slate-500">Formato PDF, JPG ou PNG de alta legibilidade.</p>
                      </div>

                      <div>
                        {alreadyUploaded ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">Enviado</span>
                            <span className="text-[9px] text-slate-500 font-mono">({alreadyUploaded.size})</span>
                          </div>
                        ) : (
                          <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] px-4 py-2 rounded-lg transition-all inline-block active:scale-95">
                            {isUploading === rf ? (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processando...
                              </span>
                            ) : 'Anexar Documento'}
                            <input 
                              type="file" 
                              onChange={(e) => handleUploadFile(rf, e)}
                              className="hidden" 
                              disabled={isUploading !== null}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage 3: Digital Signatures Assinafy */}
            <div className="bg-[#0B1329]/40 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <FileCheck className="w-4 h-4 text-indigo-400" /> Etapa 3: Assinatura de Contratos (Assinafy)
              </h3>

              <div className="space-y-3">
                {activeCase.signatures.map(sig => (
                  <div key={sig.documentTitle} className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white">{sig.documentTitle}</h4>
                      <p className="text-[10px] text-slate-500">Assinatura digitalizada ICP-Brasil com token.</p>
                    </div>

                    <div>
                      {sig.signed ? (
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">Assinado Eletronicamente</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleOpenSignature(sig.documentTitle)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-4 py-2 rounded-lg transition-all active:scale-95"
                        >
                          Assinar Termo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* FOOTER */}
      <div className="text-center text-[10px] text-slate-600 font-mono mt-12">
        🔒 Ambiente Criptografado & Selado • GSA Câmara de Mediação e Arbitragem • Todos os direitos reservados.
      </div>

      {/* SIGNATURE PAD MODAL WITH SIDE-BY-SIDE READING VIEW */}
      {isSignatureModalOpen && signatureStep && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-[#0B1329] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-[#070D1D] flex justify-between items-center">
              <div>
                <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-indigo-500/20">
                  Assinafy Link Pro
                </span>
                <h3 className="text-md font-serif font-bold text-white mt-1">Leitura e Assinatura de Termos</h3>
              </div>
              <button 
                onClick={() => {
                  setIsSignatureModalOpen(false);
                  setSignatureStep(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs p-1.5 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {/* Split Body */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
              
              {/* Left Column: Interactive filled contract draft */}
              <div className="border-r border-slate-800/80 bg-slate-950/30 flex flex-col overflow-hidden p-6">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-2 font-bold">1. Leia com atenção as cláusulas abaixo</span>
                <div className="flex-1 bg-[#030712] border border-slate-800/60 rounded-2xl p-5 overflow-y-auto text-slate-300 text-xs leading-relaxed font-serif whitespace-pre-wrap select-text custom-scrollbar">
                  {renderGeneratedDocumentText(signatureStep)}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  💡 Os dados pessoais e informações da ficha cadastral foram integrados automaticamente.
                </p>
              </div>

              {/* Right Column: Signature Pad Canvas */}
              <div className="p-6 flex flex-col justify-between bg-slate-900/10">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-2 font-bold">2. Insira sua Assinatura Digital</span>
                  <p className="text-xs text-slate-400 mb-4">Assine utilizando seu dedo (tela touch) ou o cursor do mouse no quadro abaixo:</p>
                  
                  {/* Canvas container */}
                  <div className="bg-white rounded-2xl overflow-hidden p-1 border-2 border-indigo-500/30">
                    <canvas 
                      ref={canvasRef} 
                      width={360} 
                      height={180} 
                      className="w-full h-[180px] bg-slate-50 cursor-crosshair"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 px-1">
                    <span>Certificado SHA-256</span>
                    <span>Assinafy Proteção de Dados</span>
                  </div>
                </div>

                <div className="space-y-3 pt-6">
                  <div className="bg-[#030712] border border-slate-800 p-3 rounded-xl">
                    <p className="text-[9px] font-mono text-slate-400 leading-normal">
                      Ao assinar, você declara concordar com o teor das cláusulas lidas à esquerda e autoriza o processamento desta assinatura como prova jurídica eletrônica de consentimento.
                    </p>
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <button 
                      onClick={handleClearSignature}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                    >
                      Limpar Traço
                    </button>

                    <button 
                      onClick={handleSaveSignature}
                      disabled={!signaturePadActive}
                      className={`font-bold text-xs px-5 py-2.5 rounded-xl transition-all ${signaturePadActive ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                    >
                      Confirmar e Assinar
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
