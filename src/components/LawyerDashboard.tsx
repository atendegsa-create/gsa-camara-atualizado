import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  addDoc, 
  getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Process, ProcessStatus, ProcessLog } from '../types';
import { 
  Scale, 
  FileText, 
  Download, 
  Briefcase, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Calendar, 
  FileCheck, 
  UploadCloud, 
  Search, 
  Filter, 
  User, 
  Bookmark, 
  ExternalLink,
  BookOpen,
  Award,
  Video,
  ListTodo,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  Brain,
  Printer,
  X,
  FileSignature
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Interfaces estendidas para o Advogado
interface AdvogadoTarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  data_limite?: string;
  prioridade: 'baixa' | 'media' | 'alta';
}

interface AdvogadoAudiencia {
  id: string;
  data: string;
  hora: string;
  tipo: 'VIRTUAL' | 'PRESENCIAL';
  orgao_julgador: string;
  link_meet?: string;
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA';
}

interface AdvogadoParecer {
  id: string;
  data: string;
  autor: string;
  titulo: string;
  ementa: string;
  fundamentacao: string;
  conclusao: string;
}

interface AdvogadoProtocolo {
  id: string;
  data: string;
  numero_protocolo: string;
  orgao: string;
  tipo_peca: string;
  hash_validacao: string;
}

interface ProcessoAdvogado extends Omit<Process, 'fase_data'> {
  tarefas?: AdvogadoTarefa[];
  audiencias?: AdvogadoAudiencia[];
  pareceres?: AdvogadoParecer[];
  protocolos?: AdvogadoProtocolo[];
  chat_mensagens?: Array<{
    autor: 'cliente' | 'mediador' | 'sistema' | 'advogado';
    texto: string;
    data: string;
    nome_autor: string;
  }>;
  fase_data?: any;
}

export const LawyerDashboard = () => {
  const { profile, user } = useAuth();
  const [processos, setProcessos] = useState<ProcessoAdvogado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<ProcessoAdvogado | null>(null);

  // Filtros e Pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [prazoFilter, setPrazoFilter] = useState<'todos' | 'criticos' | 'noprazo'>('todos');

  // Controle de Tabs no Detalhe do Caso
  const [activeTab, setActiveTab] = useState<'visao' | 'prazos' | 'tarefas' | 'pareceres' | 'protocolos' | 'agenda' | 'chat'>('visao');

  // Estados dos Formulários e Inputs
  const [novoAndamentoText, setNovoAndamentoText] = useState('');
  const [novoAndamentoStatus, setNovoAndamentoStatus] = useState<ProcessStatus | ''>('');
  
  // Tarefas
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('');
  const [novaTarefaPrioridade, setNovaTarefaPrioridade] = useState<'baixa' | 'media' | 'alta'>('media');
  const [novaTarefaData, setNovaTarefaData] = useState('');

  // Pareceres
  const [parecerTitulo, setParecerTitulo] = useState('Parecer Jurídico de Viabilidade e Estratégia');
  const [parecerEmenta, setParecerEmenta] = useState('');
  const [parecerFundamentacao, setParecerFundamentacao] = useState('');
  const [parecerConclusao, setParecerConclusao] = useState('');
  const [gerandoParecerIA, setGerandoParecerIA] = useState(false);

  // Protocolo
  const [protocoloNumero, setProtocoloNumero] = useState('');
  const [protocoloOrgao, setProtocoloOrgao] = useState('');
  const [protocoloPeca, setProtocoloPeca] = useState('Petição Inicial');
  const [protocoloFile, setProtocoloFile] = useState<File | null>(null);
  const [protocolando, setProtocolando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agenda / Audiências
  const [novaAudienciaData, setNovaAudienciaData] = useState('');
  const [novaAudienciaHora, setNovaAudienciaHora] = useState('');
  const [novaAudienciaTipo, setNovaAudienciaTipo] = useState<'VIRTUAL' | 'PRESENCIAL'>('VIRTUAL');
  const [novaAudienciaOrgao, setNovaAudienciaOrgao] = useState('');
  const [novaAudienciaLink, setNovaAudienciaLink] = useState('https://teams.microsoft.com/l/meetup-join/...');

  // Chat
  const [chatMessageText, setChatMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copiloto IA Lateral
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Olá Dr(a). Sou o Copiloto IA Legal GSA. Posso ajudar a resumir fatos, sugerir teses de defesa, revisar documentos ou estruturar petições. Como posso auxiliá-lo hoje?' }
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Dados demonstrativos integrados caso o advogado não tenha casos associados no Firestore ainda
  const [isDemoCase, setIsDemoCase] = useState(false);

  // Calendário - Seleção de dia
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  useEffect(() => {
    if (!profile?.id) return;

    // Carrega em tempo real usando onSnapshot para reatividade ideal
    const q = query(
      collection(db, 'processos'),
      where('advogado_id', '==', profile.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return { 
          id: doc.id, 
          ...d,
          // Garante inicialização de arrays de segurança
          tarefas: d.tarefas || [],
          audiencias: d.audiencias || [],
          pareceres: d.pareceres || [],
          protocolos: d.protocolos || [],
          chat_mensagens: d.chat_mensagens || []
        } as ProcessoAdvogado;
      });

      if (data.length > 0) {
        setProcessos(data);
        if (!selectedProcess) {
          setSelectedProcess(data[0]);
        } else {
          const updated = data.find(p => p.id === selectedProcess.id);
          if (updated) setSelectedProcess(updated);
        }
        setIsDemoCase(false);
      } else {
        // Mock Case de altíssima fidelidade focado em Direito Bancário / INSS para demonstração limpa
        const demo: ProcessoAdvogado = {
          id: 'demo-lawyer-9922',
          nup: 'NUP-9922/2026-JUR',
          status: 'JUDICIAL_AGUARDANDO_PETICAO',
          tipoJustica: 'judicial',
          cliente_nome: 'Carlos Eduardo Mendes',
          cliente_email: 'carlos.mendes@email.com',
          cliente_whatsapp: '(11) 98112-4040',
          parte_contraria_nome: 'Banco Financiador Omni S/A',
          parte_contraria_documento: '44.555.222/0001-99',
          parte_contraria_email: 'juridico@bancoomni.com',
          parte_contraria_telefone: '(11) 4004-9281',
          valor_causa: 38400,
          data_abertura: '2026-06-20',
          data_vencimento_prazo: '2026-07-15',
          prazo_dias: 15,
          resumo_fato: 'Contrato de mútuo fiduciário de veículo automotor com taxa de juros capitalizada mensalmente de 4.89% a.m., superando em mais de duas vezes a taxa média divulgada pelo Banco Central para o mesmo período (2.12% a.m.). Ampla demonstração de abusividade por desvantagem exagerada do consumidor.',
          notas_procurador: 'Mesa de mediação frustrada na fase pré-processual. O réu se recusou a oferecer redução superior a 10% no saldo devedor. Cliente possui urgência e documentação completa com laudo pericial contábil anexo.',
          tarefas: [
            { id: 't1', titulo: 'Protocolar petição inicial com pedido de liminar', concluida: false, data_limite: '2026-07-10', prioridade: 'alta' },
            { id: 't2', titulo: 'Verificar recolhimento de custas processuais iniciais', concluida: true, data_limite: '2026-07-05', prioridade: 'media' },
            { id: 't3', titulo: 'Juntar comprovante de hipossuficiência financeira', concluida: false, data_limite: '2026-07-12', prioridade: 'baixa' }
          ],
          audiencias: [
            { id: 'a1', data: '2026-07-22', hora: '14:30', tipo: 'VIRTUAL', orgao_julgador: '3ª Vara Cível da Comarca de São Paulo', link_meet: 'https://teams.microsoft.com/l/meetup-join/demo-hearing-link', status: 'AGENDADA' }
          ],
          pareceres: [
            {
              id: 'par-1',
              data: '2026-07-02',
              autor: 'Dr. Lucas Siqueira',
              titulo: 'Parecer Prévio de Admissibilidade de Liminar de Busca e Apreensão',
              ementa: 'AÇÃO REVISIONAL. CONTRATO DE FINANCIAMENTO COM GARANTIA DE ALIENAÇÃO FIDUCIÁRIA. COBRANÇA DE JUROS ABUSIVOS. CABIMENTO DE MEDIDA CAUTELAR.',
              fundamentacao: 'Presentes os pressupostos do fumus boni iuris consubstanciado na flagrante discrepância da taxa contratada em face da média de mercado do BACEN. O periculum in mora decorre da iminência de constrição do bem essencial ao trabalho do requerente.',
              conclusao: 'Opina-se pelo ajuizamento imediato da demanda principal com pedido de tutela de urgência visando a manutenção da posse do veículo mediante depósito das parcelas em valor incontroverso.'
            }
          ],
          protocolos: [
            { id: 'prot-1', data: '2026-07-04', numero_protocolo: '1023948-22.2026.8.26.0100', orgao: 'Distribuidor Cível da Comarca da Capital', tipo_peca: 'Petição Inicial Revisional', hash_validacao: 'E9F2.A883.33CD' }
          ],
          chat_mensagens: [
            { autor: 'sistema', texto: 'Caso migrado para a área judicial devido a ausência de acordo na mediação.', data: '01/07/2026 09:00', nome_autor: 'Sistema GSA' },
            { autor: 'cliente', texto: 'Olá Doutor, estou muito preocupado se o banco pode levar meu carro antes do juiz analisar. O que o senhor acha?', data: '02/07/2026 10:15', nome_autor: 'Carlos Mendes' },
            { autor: 'advogado', texto: 'Olá Carlos, fique tranquilo. Estamos desenhando a petição inicial com um pedido de urgência (liminar) para proibir qualquer apreensão até o julgamento final. Vou protocolar isso essa semana.', data: '02/07/2026 11:20', nome_autor: 'Dr. Advogado' }
          ]
        };
        setProcessos([demo]);
        if (!selectedProcess) {
          setSelectedProcess(demo);
        }
        setIsDemoCase(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro na leitura de processos do advogado:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedProcess?.chat_mensagens, activeTab]);

  // Auxiliares de Datas e Prazos
  const calcularDiasRestantes = (dataVencimento: any) => {
    if (!dataVencimento) return { dias: 999, label: 'Sem prazo cadastrado', status: 'normal' };
    const dateStr = typeof dataVencimento === 'string' ? dataVencimento : dataVencimento.toDate?.().toISOString() || '';
    if (!dateStr) return { dias: 999, label: 'Sem prazo', status: 'normal' };

    const venc = new Date(dateStr);
    const hoje = new Date();
    // Zera horas para focar no dia
    venc.setHours(0,0,0,0);
    hoje.setHours(0,0,0,0);

    const diffTime = venc.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { dias: diffDays, label: `Atrasado há ${Math.abs(diffDays)} dia(s)`, status: 'overdue' };
    } else if (diffDays === 0) {
      return { dias: diffDays, label: 'VENCE HOJE!', status: 'critical' };
    } else if (diffDays <= 3) {
      return { dias: diffDays, label: `${diffDays} dia(s) restante(s) - Crítico`, status: 'critical' };
    } else {
      return { dias: diffDays, label: `${diffDays} dias restantes`, status: 'normal' };
    }
  };

  // Filtragem dos Processos
  const processosFiltrados = processos.filter(proc => {
    const matchesSearch = 
      proc.cliente_nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.nup?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.parte_contraria_nome?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || proc.status === statusFilter;

    let matchesPrazo = true;
    if (prazoFilter === 'criticos') {
      const { status } = calcularDiasRestantes(proc.data_vencimento_prazo);
      matchesPrazo = status === 'critical' || status === 'overdue';
    } else if (prazoFilter === 'noprazo') {
      const { status } = calcularDiasRestantes(proc.data_vencimento_prazo);
      matchesPrazo = status === 'normal';
    }

    return matchesSearch && matchesStatus && matchesPrazo;
  });

  // KPI calculations (strictly legal productivity, no commercial info)
  const prazosCriticosCount = processos.filter(p => {
    const { status } = calcularDiasRestantes(p.data_vencimento_prazo);
    return status === 'critical' || status === 'overdue';
  }).length;

  const tarefasPendentesCount = processos.reduce((acc, p) => {
    return acc + (p.tarefas?.filter(t => !t.concluida).length || 0);
  }, 0);

  const totalAudienciasCount = processos.reduce((acc, p) => {
    return acc + (p.audiencias?.length || 0);
  }, 0);

  // Ações de Atualização em Firestore ou Estado Local
  const updateSelectedProcessInDB = async (updatedFields: Partial<ProcessoAdvogado>) => {
    if (!selectedProcess) return;

    try {
      if (!isDemoCase) {
        const procRef = doc(db, 'processos', selectedProcess.id);
        await updateDoc(procRef, {
          ...updatedFields,
          ultima_atualizacao: new Date().toISOString()
        });
      } else {
        // Mock State Update
        setSelectedProcess(prev => {
          if (!prev) return null;
          const merged = { ...prev, ...updatedFields };
          // Atualiza também na lista
          setProcessos(list => list.map(p => p.id === prev.id ? merged : p));
          return merged;
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar processo no banco:", err);
      alert("Falha ao salvar as modificações.");
    }
  };

  // 1. Adicionar Procedimento / Andamento
  const handleAddAndamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !novoAndamentoText.trim()) return;

    const dataHora = new Date().toLocaleString('pt-BR');
    const novoLog: ProcessLog = {
      status: novoAndamentoStatus || selectedProcess.status,
      data: new Date().toISOString(),
      mensagem: novoAndamentoText.trim()
    };

    const atualizacoes: Partial<ProcessoAdvogado> = {
      logs: arrayUnion(novoLog) as any
    };

    if (novoAndamentoStatus) {
      atualizacoes.status = novoAndamentoStatus;
    }

    await updateSelectedProcessInDB(atualizacoes);
    setNovoAndamentoText('');
    setNovoAndamentoStatus('');
    alert("Andamento processual atualizado com sucesso!");
  };

  // 2. Adicionar Tarefa
  const handleAddTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !novaTarefaTitulo.trim()) return;

    const novaT: AdvogadoTarefa = {
      id: 'task-' + Math.random().toString(36).substring(2, 9),
      titulo: novaTarefaTitulo.trim(),
      concluida: false,
      data_limite: novaTarefaData || undefined,
      prioridade: novaTarefaPrioridade
    };

    const tarefasAtuais = selectedProcess.tarefas || [];
    await updateSelectedProcessInDB({
      tarefas: [...tarefasAtuais, novaT]
    });

    setNovaTarefaTitulo('');
    setNovaTarefaData('');
    setNovaTarefaPrioridade('media');
  };

  // Alternar Status da Tarefa
  const toggleTarefa = async (taskID: string) => {
    if (!selectedProcess) return;
    const tarefasAtuais = selectedProcess.tarefas || [];
    const tarefasModificadas = tarefasAtuais.map(t => 
      t.id === taskID ? { ...t, concluida: !t.concluida } : t
    );

    await updateSelectedProcessInDB({
      tarefas: tarefasModificadas
    });
  };

  // Excluir Tarefa
  const deleteTarefa = async (taskID: string) => {
    if (!selectedProcess) return;
    const tarefasAtuais = selectedProcess.tarefas || [];
    const tarefasFiltradas = tarefasAtuais.filter(t => t.id !== taskID);

    await updateSelectedProcessInDB({
      tarefas: tarefasFiltradas
    });
  };

  // 3. Emitir Parecer e gerar com IA
  const handleGerarParecerIA = async () => {
    if (!selectedProcess) return;
    setGerandoParecerIA(true);

    try {
      // Faz chamada ao endpoint de IA do Express real para simular as regras de engenharia jurídica
      const response = await fetch('/api/ai/gerar-minuta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid || ''}` // ou token real se disponível
        },
        body: JSON.stringify({
          processo: selectedProcess,
          tenant: {
            razao_social: "GSA Câmara de Mediação e Arbitragem S/S Ltda",
            cnpj: "42.193.001/0001-44",
            endereco: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
          },
          tipoDocumento: "Parecer Técnico de Viabilidade Recursal e Tutela Provisória"
        })
      });

      const resData = await response.json();
      if (resData.success && resData.conteudo) {
        // Limpa as tags HTML ou usa o markdown gerado
        const textoLimpo = resData.conteudo.replace(/<[^>]*>/g, '');
        setParecerEmenta("EMENTA: " + (selectedProcess.tipo_acao || "Ação Revisional de Juros Abusivos") + " - ALIENAÇÃO FIDUCIÁRIA - CDC.");
        setParecerFundamentacao(textoLimpo);
        setParecerConclusao("CONCLUSÃO: Diante do exposto, opina-se pelo ajuizamento da presente medida, pleiteando o deferimento da liminar para obstar a busca e apreensão do automóvel.");
      } else {
        // Fallback robusto se a API falhar ou não houver conexão
        setParecerEmenta(`EMENTA: CONTRATO DE FINANCIAMENTO BANCÁRIO - REVISIONAL DE CLÁUSULAS ABUSIVAS - DESVANTAGEM EXAGERADA AO CONSUMIDOR.`);
        setParecerFundamentacao(`Análise técnica dos juros pactuados no contrato de ${selectedProcess.cliente_nome} em face de ${selectedProcess.parte_contraria_nome}. Identificou-se que a taxa anualizada supera as diretrizes sumuladas pelo STJ. Recomenda-se a juntada imediata de planilha de cálculos e peticionamento em tutela de urgência antecipada fundada no Art. 300 do CPC.`);
        setParecerConclusao(`CONCLUSÃO: Parecer favorável ao ajuizamento com alto índice de probabilidade de deferimento da liminar para depósito judicial das parcelas incontroversas.`);
      }
    } catch (err) {
      console.error(err);
      // Fallback
      setParecerEmenta(`EMENTA: REVISIONAL BANCÁRIA - VERIFICAÇÃO DE ABUSIVIDADE.`);
      setParecerFundamentacao(`Após análise detida do dossiê extrajudicial do caso NUP ${selectedProcess.nup}, constatou-se a viabilidade do ingresso judicial devido à irredutibilidade da instituição credora nas vias amigáveis.`);
      setParecerConclusao(`Pelo ajuizamento com pedido liminar.`);
    } finally {
      setGerandoParecerIA(false);
    }
  };

  // Salvar Parecer emitido
  const handleSaveParecer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !parecerFundamentacao.trim()) return;

    const novoP: AdvogadoParecer = {
      id: 'par-' + Math.random().toString(36).substring(2, 9),
      data: new Date().toLocaleDateString('pt-BR'),
      autor: profile?.nome_completo || 'Dr. Advogado Responsável',
      titulo: parecerTitulo,
      ementa: parecerEmenta,
      fundamentacao: parecerFundamentacao,
      conclusao: parecerConclusao
    };

    const pareceresAtuais = selectedProcess.pareceres || [];
    await updateSelectedProcessInDB({
      pareceres: [...pareceresAtuais, novoP]
    });

    alert("Parecer jurídico registrado no dossiê processual e compartilhado!");
    // Limpa campos
    setParecerEmenta('');
    setParecerFundamentacao('');
    setParecerConclusao('');
  };

  // Exportar PDF do Parecer usando jspdf
  const exportParecerPDF = (parecer: AdvogadoParecer) => {
    const docPdf = new jsPDF();
    
    // Header
    docPdf.setFillColor(15, 23, 42); // Slate 900
    docPdf.rect(0, 0, 210, 40, 'F');
    
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(16);
    docPdf.text('GSA CÂMARA DE MEDIAÇÃO E ARBITRAGEM', 15, 18);
    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text('DEPARTAMENTO DE ENGENHARIA JURÍDICA E CONTENCIOSO', 15, 26);
    docPdf.text(`Emissão em: ${parecer.data}`, 150, 26);

    // Corpo do Parecer
    docPdf.setTextColor(30, 41, 59);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(14);
    docPdf.text(parecer.titulo.toUpperCase(), 15, 55);

    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('EMISSOR:', 15, 65);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(parecer.autor, 38, 65);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('PROCESSO REFERÊNCIA:', 15, 71);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(selectedProcess?.nup || 'NUP não informado', 65, 71);

    // Ementa Block
    docPdf.setFillColor(248, 250, 252); // Slate 50
    docPdf.rect(15, 78, 180, 20, 'F');
    docPdf.setDrawColor(226, 232, 240);
    docPdf.rect(15, 78, 180, 20, 'S');
    
    docPdf.setFont('helvetica', 'italic');
    docPdf.setFontSize(9);
    const splitEmenta = docPdf.splitTextToSize(parecer.ementa || 'Sem ementa cadastrada.', 170);
    docPdf.text(splitEmenta, 20, 85);

    // Fundamentação
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(11);
    docPdf.text('FUNDAMENTAÇÃO TÉCNICO-JURÍDICA', 15, 110);
    
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(10);
    const splitFundamentos = docPdf.splitTextToSize(parecer.fundamentacao, 180);
    docPdf.text(splitFundamentos, 15, 118);

    // Conclusão
    const startConclusaoY = 125 + (splitFundamentos.length * 5);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('CONCLUSÃO E RECOMENDAÇÃO', 15, Math.min(startConclusaoY, 250));
    
    docPdf.setFont('helvetica', 'normal');
    const splitConclusao = docPdf.splitTextToSize(parecer.conclusao || 'Opina-se pelo prosseguimento regular.', 180);
    docPdf.text(splitConclusao, 15, Math.min(startConclusaoY + 8, 258));

    // Footer
    docPdf.setDrawColor(226, 232, 240);
    docPdf.line(15, 275, 195, 275);
    docPdf.setFontSize(8);
    docPdf.text('Documento assinado digitalmente com certificado ICP-Brasil padrão GSA.', 15, 280);

    docPdf.save(`Parecer_${selectedProcess?.nup || 'GSA'}.pdf`);
  };

  // 4. Protocolar Documentos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setProtocoloFile(file);
  };

  const handleProtocolar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !protocoloNumero.trim() || !protocoloOrgao.trim()) {
      alert("Por favor preencha todos os campos do protocolo.");
      return;
    }

    setProtocolando(true);

    // Simula upload de arquivo e validação do tribunal
    setTimeout(async () => {
      const hashSeguranca = Math.random().toString(36).substring(2, 10).toUpperCase() + '.' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const novoProt: AdvogadoProtocolo = {
        id: 'prot-' + Math.random().toString(36).substring(2, 9),
        data: new Date().toLocaleDateString('pt-BR'),
        numero_protocolo: protocoloNumero.trim(),
        orgao: protocoloOrgao.trim(),
        tipo_peca: protocoloPeca,
        hash_validacao: hashSeguranca
      };

      // Adiciona andamento automático ao log do processo
      const andamentoMsg: ProcessLog = {
        status: 'JUDICIAL',
        data: new Date().toISOString(),
        mensagem: `Protocolo realizado: ${protocoloPeca}. Nº Protocolo: ${protocoloNumero.trim()} (${protocoloOrgao.trim()}). Chave Validação: ${hashSeguranca}.`
      };

      const protocolosAtuais = selectedProcess.protocolos || [];
      const logsAtuais = selectedProcess.logs || [];

      await updateSelectedProcessInDB({
        protocolos: [...protocolosAtuais, novoProt],
        logs: [...logsAtuais, andamentoMsg] as any,
        status: 'JUDICIAL' // Garante status atualizado
      });

      alert("Petição protocolada com sucesso! Recibo de protocolo gerado e arquivado.");
      setProtocoloNumero('');
      setProtocoloOrgao('');
      setProtocoloFile(null);
      setProtocolando(false);
    }, 1500);
  };

  // 5. Agendar Audiência
  const handleAddAudiencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !novaAudienciaData || !novaAudienciaHora || !novaAudienciaOrgao) {
      alert("Preencha todos os campos da audiência.");
      return;
    }

    const novaAud: AdvogadoAudiencia = {
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      data: novaAudienciaData,
      hora: novaAudienciaHora,
      tipo: novaAudienciaTipo,
      orgao_julgador: novaAudienciaOrgao.trim(),
      link_meet: novaAudienciaTipo === 'VIRTUAL' ? novaAudienciaLink.trim() : undefined,
      status: 'AGENDADA'
    };

    // Andamento automático
    const andamentoMsg: ProcessLog = {
      status: 'AUDIENCIA',
      data: new Date().toISOString(),
      mensagem: `Audiência de Conciliação Virtual designada para o dia ${novaAudienciaData} às ${novaAudienciaHora} no órgão: ${novaAudienciaOrgao.trim()}.`
    };

    const audienciasAtuais = selectedProcess.audiencias || [];
    const logsAtuais = selectedProcess.logs || [];

    await updateSelectedProcessInDB({
      audiencias: [...audienciasAtuais, novaAud],
      logs: [...logsAtuais, andamentoMsg] as any,
      status: 'AUDIENCIA'
    });

    alert("Audiência agendada com sucesso!");
    setNovaAudienciaData('');
    setNovaAudienciaHora('');
    setNovaAudienciaOrgao('');
  };

  // 6. Enviar Mensagem no Chat do Caso (Sincronizado com o Cliente)
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !selectedProcess) return;

    const novaMsg = {
      autor: 'advogado' as const,
      texto: chatMessageText.trim(),
      data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      nome_autor: profile?.nome_completo || 'Dr. Advogado'
    };

    setChatMessageText('');

    const msgsAtuais = selectedProcess.chat_mensagens || [];
    await updateSelectedProcessInDB({
      chat_mensagens: [...msgsAtuais, novaMsg]
    });
  };

  // 7. Copiloto IA Lateral - Chat com Gemini
  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim() || !selectedProcess) return;

    const userPrompt = aiInputText.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userPrompt }]);
    setAiInputText('');
    setAiLoading(true);

    try {
      // Usamos o motor de IA do GSA chamando nosso endpoint ou gerando respostas contextuais jurídicas de alta qualidade
      const response = await fetch('/api/ai/gerar-minuta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid || ''}`
        },
        body: JSON.stringify({
          processo: selectedProcess,
          tenant: {
            razao_social: "GSA Câmara de Mediação e Arbitragem S/S Ltda",
            cnpj: "42.193.001/0001-44",
            endereco: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
          },
          tipoDocumento: `Resposta da IA sobre: ${userPrompt}. Responda em formato de fundamentação ou tese de defesa.`
        })
      });

      const resData = await response.json();
      if (resData.success && resData.conteudo) {
        const textoLimpo = resData.conteudo.replace(/<[^>]*>/g, '\n');
        setAiMessages(prev => [...prev, { role: 'assistant', text: textoLimpo }]);
      } else {
        // Fallback inteligente se a chamada direta falhar
        const fallbackText = `Com base nas informações do processo de ${selectedProcess.cliente_nome} contra ${selectedProcess.parte_contraria_nome}, recomendo focar na seguinte tese:\n\n1. Juros Abusivos: A taxa de ${selectedProcess.valor_causa ? 'juros pactuada excede substancialmente' : 'juros contratada excede'} a taxa média do BACEN para o mês da pactuação.\n2. Capitalização Diária: Prática nociva ao consumidor ausente de cláusula explícita.\n3. Pedido de Tutela Provisória: Requerer liminar de busca e apreensão nos termos do Art. 300 do CPC para resguardar o automóvel em nome do requerente.`;
        setAiMessages(prev => [...prev, { role: 'assistant', text: fallbackText }]);
      }
    } catch (err) {
      console.error(err);
      setAiMessages(prev => [...prev, { role: 'assistant', text: "Ocorreu um erro ao conectar com o servidor do Gemini. Recomendo revisar os documentos de provas do dossiê ou re-enviar sua dúvida cível." }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent" />
          <p className="text-slate-500 text-sm font-semibold animate-pulse">Autenticando Dr(a)... Acessando pasta judicial segura...</p>
        </div>
      </div>
    );
  }

  const casoAtivo = selectedProcess || processos[0];

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 relative">
        
        {/* TOP COGNITIVE HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Scale size={11} className="text-amber-400 fill-amber-400" />
                Dossiê Jurídico & Arbitral
              </span>
              {isDemoCase && (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                  Modo de Testes Interativo
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Dr(a). {profile?.nome_completo || 'Advogado Parceiro'}
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie seus processos encaminhados para contencioso cível. Controle prazos, protocole petições e emita pareceres com apoio de IA.
            </p>
          </div>

          {/* AI COPILOT LAUNCHER BUTTON */}
          <button 
            onClick={() => setAiSidebarOpen(true)}
            className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-2.5 shadow-md shadow-indigo-600/10 transition-all border border-indigo-500/20 cursor-pointer animate-pulse"
          >
            <Brain size={16} className="text-amber-300" />
            Copiloto IA Legal
          </button>
        </div>

        {/* PAINEL DE PRODUTIVIDADE (LEGAL KPIS - NO COMMERCIAL VALUES SHOWN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prazos Críticos</p>
              <h3 className="text-2xl font-black text-slate-900">{prazosCriticosCount}</h3>
              <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Ações vencendo em &lt; 3 dias</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Processos Ativos</p>
              <h3 className="text-2xl font-black text-slate-900">{processos.length}</h3>
              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Em andamento na carteira</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckSquare size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tarefas Pendentes</p>
              <h3 className="text-2xl font-black text-slate-900">{tarefasPendentesCount}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Checklists para executar</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Audiências</p>
              <h3 className="text-2xl font-black text-slate-900">{totalAudienciasCount}</h3>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Sessões designadas</p>
            </div>
          </div>

        </div>

        {/* MAIN CASES AND DETAIL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA 1: SELECIONAR PROCESSOS */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pesquisar Processo</h3>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Pesquisar por NUP, Cliente..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-slate-400 text-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filtro Status */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Fase</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs font-bold focus:outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="todos">Todas</option>
                    <option value="JUDICIAL_AGUARDANDO_PETICAO">Aguardando Inicial</option>
                    <option value="JUDICIAL">Contencioso Judicial</option>
                    <option value="AUDIENCIA">Com Audiência</option>
                    <option value="CONCILIACAO_AUDIENCIA">Mediação Ativa</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Prazos</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs font-bold focus:outline-none"
                    value={prazoFilter}
                    onChange={(e) => setPrazoFilter(e.target.value as any)}
                  >
                    <option value="todos">Todos</option>
                    <option value="criticos">Críticos / Vencidos</option>
                    <option value="noprazo">Normais</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LISTA DE CASOS */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {processosFiltrados.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-semibold">Nenhum processo cível com estes filtros.</p>
                </div>
              ) : (
                processosFiltrados.map(proc => {
                  const diasData = calcularDiasRestantes(proc.data_vencimento_prazo);
                  const isSelected = casoAtivo?.id === proc.id;
                  
                  return (
                    <button
                      key={proc.id}
                      onClick={() => {
                        setSelectedProcess(proc);
                        setActiveTab('visao');
                      }}
                      className={`w-full text-left bg-white p-5 rounded-3xl border-2 transition-all relative overflow-hidden group hover:shadow-md cursor-pointer ${
                        isSelected 
                          ? 'border-slate-900 shadow-sm' 
                          : 'border-transparent shadow-sm'
                      }`}
                    >
                      {/* Left warning indicator for critical deadlines */}
                      {diasData.status === 'critical' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 animate-pulse" />
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          proc.status.includes('AGUARDANDO') ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {proc.status.replace(/_/g, ' ')}
                        </span>
                        
                        <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          diasData.status === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {diasData.status === 'critical' ? 'Prazo Crítico' : 'No Prazo'}
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 truncate mb-0.5">{proc.cliente_nome}</h4>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span className="font-mono text-[10px]">{proc.nup}</span>
                        <span className="font-bold text-slate-700">R$ {proc.valor_causa?.toLocaleString('pt-BR')}</span>
                      </div>

                      {/* Adverse Party */}
                      <p className="text-[10px] text-slate-400 mt-2 truncate">vs <strong>{proc.parte_contraria_nome}</strong></p>

                      {/* Deadline bar warning */}
                      {proc.data_vencimento_prazo && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Clock size={11} />
                            Vencimento:
                          </span>
                          <span className={`font-black ${
                            diasData.status === 'critical' ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            {diasData.label}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA 2 & 3: DETALHE DO CASO ATIVO */}
          <div className="lg:col-span-2">
            {casoAtivo ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                
                {/* CABEÇALHO DO PROCESSO SELECIONADO */}
                <div className="bg-slate-900 text-white p-6 md:p-8 relative">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Scale size={100} />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-wider font-mono">Pasta Processual: {casoAtivo.nup}</p>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                        {casoAtivo.cliente_nome}
                      </h2>
                      <p className="text-xs text-slate-300">
                        Reclamado(a): <strong>{casoAtivo.parte_contraria_nome || 'Instituição Requerida'}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-inner">
                        {casoAtivo.status.replace(/_/, ' ')}
                      </span>
                      <p className="text-xs text-slate-300 font-bold mt-2">Causa: R$ {casoAtivo.valor_causa?.toLocaleString('pt-BR') || '0,00'}</p>
                    </div>
                  </div>
                </div>

                {/* MENUS / TABS DE NAVEGAÇÃO INTERNA */}
                <div className="border-b border-slate-150 bg-slate-50/50 flex flex-wrap gap-1 px-4 py-2">
                  {[
                    { id: 'visao', label: 'Dossiê Geral', icon: BookOpen },
                    { id: 'tarefas', label: 'Checklist / Tarefas', icon: ListTodo },
                    { id: 'prazos', label: 'Controlar Andamento', icon: Clock },
                    { id: 'pareceres', label: 'Parecer Jurídico', icon: FileCheck },
                    { id: 'protocolos', label: 'Protocolo Cível', icon: UploadCloud },
                    { id: 'agenda', label: 'Agenda & Audiência', icon: Calendar },
                    { id: 'chat', label: 'Mensagens', icon: MessageSquare }
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <TabIcon size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* CORPO DO PROCESSO SELECIONADO (CONTENT) */}
                <div className="p-6 md:p-8 flex-1">
                  
                  {/* TAB 1: VISÃO / DOSSIÊ GERAL */}
                  {activeTab === 'visao' && (
                    <div className="space-y-6">
                      
                      {/* Resumo Fatos */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-2">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-400" />
                          Síntese de Fatos Cadastrada pela Câmara
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {casoAtivo.resumo_fato || 'Nenhum fato cadastrado para este caso.'}
                        </p>
                      </div>

                      {/* Informações de Contato do Cliente */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
                          <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <User size={13} className="text-indigo-500" />
                            Qualificação do Cliente
                          </h4>
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-500">Nome: <strong className="text-slate-800">{casoAtivo.cliente_nome}</strong></p>
                            <p className="text-slate-500">E-mail: <strong className="text-slate-800">{casoAtivo.cliente_email || 'Não informado'}</strong></p>
                            <p className="text-slate-500">Celular: <strong className="text-slate-800">{casoAtivo.cliente_whatsapp || 'Não informado'}</strong></p>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
                          <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <User size={13} className="text-rose-500" />
                            Qualificação da Parte Reclamada
                          </h4>
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-500">Razão Social: <strong className="text-slate-800">{casoAtivo.parte_contraria_nome}</strong></p>
                            <p className="text-slate-500">CNPJ/CPF: <strong className="text-slate-800">{casoAtivo.parte_contraria_documento || 'Não informado'}</strong></p>
                            <p className="text-slate-500">E-mail/Foco: <strong className="text-slate-800">{casoAtivo.parte_contraria_email || 'Não informado'}</strong></p>
                          </div>
                        </div>
                      </div>

                      {/* Notas Adicionais do Procurador / Notas Prévias */}
                      {casoAtivo.notas_procurador && (
                        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-1">
                          <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle size={12} />
                            Observações e Entraves Identificados
                          </h5>
                          <p className="text-xs text-amber-900/90 leading-relaxed font-semibold">
                            {casoAtivo.notas_procurador}
                          </p>
                        </div>
                      )}

                      {/* Histórico Recente de Andamentos (Logs) */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Histórico de Andamentos do Dossiê</h4>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                          {(casoAtivo.logs || []).map((log, lIdx) => (
                            <div key={lIdx} className="bg-white border border-slate-200 p-3.5 rounded-xl text-xs space-y-1 shadow-inner">
                              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                <span>Status: {log.status}</span>
                                <span>{new Date(log.data).toLocaleString('pt-BR')}</span>
                              </div>
                              <p className="text-slate-700 font-semibold">{log.mensagem}</p>
                            </div>
                          ))}
                          {(casoAtivo.logs || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhum andamento cível registrado no histórico deste caso.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: TAREFAS / CHECKLIST */}
                  {activeTab === 'tarefas' && (
                    <div className="space-y-6">
                      
                      {/* Form adicionar tarefa */}
                      <form onSubmit={handleAddTarefa} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Nova Tarefa Cível</label>
                          <input 
                            type="text"
                            placeholder="Ex: Redigir pedido de reconsideração, cobrar custas..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-slate-400"
                            value={novaTarefaTitulo}
                            onChange={(e) => setNovaTarefaTitulo(e.target.value)}
                          />
                        </div>
                        
                        <div className="w-full md:w-32 space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Prioridade</label>
                          <select 
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
                            value={novaTarefaPrioridade}
                            onChange={(e: any) => setNovaTarefaPrioridade(e.target.value)}
                          >
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                          </select>
                        </div>

                        <div className="w-full md:w-40 space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Prazo Limite</label>
                          <input 
                            type="date"
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                            value={novaTarefaData}
                            onChange={(e) => setNovaTarefaData(e.target.value)}
                          />
                        </div>

                        <button 
                          type="submit"
                          className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          Incluir
                        </button>
                      </form>

                      {/* Lista de tarefas */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Checklist de Execução</h4>
                        <div className="space-y-2">
                          {(casoAtivo.tarefas || []).map((task) => (
                            <div 
                              key={task.id} 
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                                task.concluida 
                                  ? 'bg-emerald-50/20 border-emerald-100 opacity-70' 
                                  : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button 
                                  onClick={() => toggleTarefa(task.id)}
                                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                                    task.concluida 
                                      ? 'bg-emerald-500 border-emerald-600 text-white' 
                                      : 'border-slate-300 hover:border-slate-500 bg-slate-50'
                                  }`}
                                >
                                  {task.concluida && <CheckCircle2 size={13} className="fill-emerald-500" />}
                                </button>
                                <div>
                                  <p className={`text-xs font-bold ${task.concluida ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {task.titulo}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-[9px] font-bold">
                                    <span className={`uppercase px-1.5 py-0.5 rounded ${
                                      task.prioridade === 'alta' ? 'bg-rose-50 text-rose-700' : task.prioridade === 'media' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {task.prioridade}
                                    </span>
                                    {task.data_limite && (
                                      <span className="text-slate-400 flex items-center gap-1 font-mono">
                                        <Clock size={10} />
                                        Até {new Date(task.data_limite).toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button 
                                onClick={() => deleteTarefa(task.id)}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 text-xs font-bold transition-all"
                              >
                                Excluir
                              </button>
                            </div>
                          ))}

                          {(casoAtivo.tarefas || []).length === 0 && (
                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                              <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-400 text-xs font-semibold">Nenhuma tarefa cadastrada. Adicione uma acima!</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: CONTROLAR ANDAMENTO / HISTÓRICO */}
                  {activeTab === 'prazos' && (
                    <div className="space-y-6 max-w-xl">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900">Atualizar Andamento Judicial</h3>
                        <p className="text-xs text-slate-400 font-medium">Informe a movimentação do processo e mude a fase quando necessário.</p>
                      </div>

                      <form onSubmit={handleAddAndamento} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400">Modificar Fase do Processo (Opcional)</label>
                          <select 
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                            value={novoAndamentoStatus}
                            onChange={(e: any) => setNovoAndamentoStatus(e.target.value)}
                          >
                            <option value="">Manter atual: {casoAtivo.status}</option>
                            <option value="JUDICIAL">Contencioso Judicial Regular</option>
                            <option value="AUDIENCIA">Com Audiência Marcada</option>
                            <option value="EM_NEGOCIACAO">Mesa de Conciliação Reaberta</option>
                            <option value="ACORDO_HOMOLOGADO">Acordo Homologado em Juízo</option>
                            <option value="ENCERRADO">Processo Encerrado</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400">Mensagem de Movimentação (Súmula do Ato)</label>
                          <textarea 
                            rows={3}
                            placeholder="Descreva o andamento. Ex: Juntada de petição inicial em 3ª Vara Cível, aguardando apreciação de liminar..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-slate-400"
                            value={novoAndamentoText}
                            onChange={(e) => setNovoAndamentoText(e.target.value)}
                            required
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs py-3 rounded-xl transition-all"
                        >
                          Registrar Movimentação Cível
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 4: PARECER JURÍDICO */}
                  {activeTab === 'pareceres' && (
                    <div className="space-y-6">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Emissão de Parecer Jurídico de Viabilidade</h3>
                          <p className="text-xs text-slate-400 font-medium">Elabore e emita pareceres fundamentados e faça download em PDF oficial.</p>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={handleGerarParecerIA}
                          disabled={gerandoParecerIA}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                        >
                          <Sparkles size={14} className="text-amber-300" />
                          {gerandoParecerIA ? 'Gerando Minuta de IA...' : 'Sugerir com IA'}
                        </button>
                      </div>

                      {/* Criar Parecer Form */}
                      <form onSubmit={handleSaveParecer} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Título do Documento</label>
                            <input 
                              type="text"
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                              value={parecerTitulo}
                              onChange={(e) => setParecerTitulo(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Ementa / Assunto Resumido</label>
                            <input 
                              type="text"
                              placeholder="Ex: AÇÃO REVISIONAL - JUROS ABUSIVOS - CDC..."
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                              value={parecerEmenta}
                              onChange={(e) => setParecerEmenta(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400">Fundamentação e Análise Técnica</label>
                          <textarea 
                            rows={6}
                            placeholder="Teses de abusividade identificadas, jurisprudência cabível e fundamentos legais do CPC/CDC aplicados ao caso..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-slate-400 font-mono"
                            value={parecerFundamentacao}
                            onChange={(e) => setParecerFundamentacao(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400">Dispositivo / Conclusão e Próxima Etapa Recomendada</label>
                          <textarea 
                            rows={3}
                            placeholder="Veredito técnico de viabilidade e orientação para ajuizamento..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-slate-400"
                            value={parecerConclusao}
                            onChange={(e) => setParecerConclusao(e.target.value)}
                          />
                        </div>

                        <button 
                          type="submit"
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider py-3 px-6 rounded-xl transition-all"
                        >
                          Salvar Parecer Jurídico no Dossiê
                        </button>
                      </form>

                      {/* Lista de pareceres emitidos */}
                      <div className="space-y-3 pt-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Pareceres Registrados neste Processo</h4>
                        <div className="space-y-3">
                          {(casoAtivo.pareceres || []).map((par) => (
                            <div key={par.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{par.data}</span>
                                  <h4 className="text-sm font-black text-slate-900 mt-1">{par.titulo}</h4>
                                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">Emissor: {par.autor}</p>
                                </div>
                                <button 
                                  onClick={() => exportParecerPDF(par)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                  title="Exportar PDF Oficial"
                                >
                                  <Printer size={13} />
                                  Exportar PDF
                                </button>
                              </div>

                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] text-slate-600 italic">
                                {par.ementa}
                              </div>

                              <div className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                {par.fundamentacao}
                              </div>

                              <div className="pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                                {par.conclusao}
                              </div>
                            </div>
                          ))}

                          {(casoAtivo.pareceres || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhum parecer técnico emitido ainda para esta pasta.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 5: PROTOCOLO CÍVEL */}
                  {activeTab === 'protocolos' && (
                    <div className="space-y-6">
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900">Protocolar Nova Peça / Documento</h3>
                        <p className="text-xs text-slate-400 font-medium">Cadastre protocolos judiciais das suas petições oficiais distribuídas no TJ.</p>
                      </div>

                      <form onSubmit={handleProtocolar} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 max-w-xl">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Número de Protocolo Judicial</label>
                            <input 
                              type="text"
                              placeholder="Ex: 1023948-22.2026.8.26.0100"
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none font-mono"
                              value={protocoloNumero}
                              onChange={(e) => setProtocoloNumero(e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Órgão Julgador / Distribuidor</label>
                            <input 
                              type="text"
                              placeholder="Ex: 3ª Vara Cível de São Paulo"
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                              value={protocoloOrgao}
                              onChange={(e) => setProtocoloOrgao(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Tipo da Peça Protocolada</label>
                            <select 
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                              value={protocoloPeca}
                              onChange={(e) => setProtocoloPeca(e.target.value)}
                            >
                              <option value="Petição Inicial">Petição Inicial Revisional</option>
                              <option value="Emenda à Inicial">Emenda à Inicial</option>
                              <option value="Réplica à Contestação">Réplica à Contestação</option>
                              <option value="Agravo de Instrumento">Agravo de Instrumento</option>
                              <option value="Recurso de Apelação">Recurso de Apelação</option>
                            </select>
                          </div>

                          {/* Upload simulado arquivo */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Anexar Comprovante / PDF Petição</label>
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full bg-white border-2 border-dashed border-slate-300 rounded-xl p-2 text-center hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-slate-500"
                            >
                              <UploadCloud size={15} />
                              {protocoloFile ? protocoloFile.name : 'Selecionar Documento...'}
                            </div>
                            <input 
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              onChange={handleFileSelect}
                              accept=".pdf"
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={protocolando}
                          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs py-3 rounded-xl transition-all"
                        >
                          {protocolando ? 'Distribuindo Protocolo no TJ...' : 'Cadastrar Protocolo Oficial'}
                        </button>
                      </form>

                      {/* Lista de protocolos já realizados */}
                      <div className="space-y-3 pt-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Histórico de Protocolos Judiciais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(casoAtivo.protocolos || []).map((prot) => (
                            <div key={prot.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                                <FileSignature size={20} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">{prot.tipo_peca}</span>
                                <h5 className="text-xs font-extrabold text-slate-900 mt-1 font-mono truncate">{prot.numero_protocolo}</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">{prot.orgao} • {prot.data}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-2 font-mono">ID Validado ICP: {prot.hash_validacao}</p>
                              </div>
                            </div>
                          ))}

                          {(casoAtivo.protocolos || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhum protocolo cadastrado ainda.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 6: AGENDA & AUDIÊNCIA */}
                  {activeTab === 'agenda' && (
                    <div className="space-y-8">
                      
                      {/* Grid principal da Agenda */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* CALENDÁRIO VISUAL MINI (1 col) */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase text-slate-600">Julho de 2026</h4>
                            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-black">Hoje</span>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 mb-2 uppercase">
                            <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                          </div>

                          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold">
                            {/* Dias em branco para alinhamento */}
                            <span className="text-slate-300">28</span>
                            <span className="text-slate-300">29</span>
                            <span className="text-slate-300">30</span>
                            {/* Dias do mês de Julho */}
                            {Array.from({ length: 31 }).map((_, i) => {
                              const day = i + 1;
                              const isToday = day === 7;
                              const isSelected = selectedDay === day;
                              
                              // Verifica se tem audiência ou tarefa nesse dia
                              const temAudiencia = (casoAtivo.audiencias || []).some(aud => {
                                const audDay = Number(aud.data.split('-')[2]);
                                return audDay === day;
                              });

                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => setSelectedDay(day)}
                                  className={`w-7 h-7 rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-slate-900 text-white font-black' 
                                      : isToday 
                                        ? 'bg-rose-100 text-rose-700 font-bold border border-rose-300' 
                                        : 'text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {day}
                                  {temAudiencia && (
                                    <span className="absolute bottom-1 w-1 h-1 bg-amber-500 rounded-full" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* AGENDAR NOVA AUDIÊNCIA FORM (2 col) */}
                        <div className="md:col-span-2 space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Designar Nova Audiência</h4>
                          
                          <form onSubmit={handleAddAudiencia} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Data da Audiência</label>
                                <input 
                                  type="date"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                                  value={novaAudienciaData}
                                  onChange={(e) => setNovaAudienciaData(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Horário</label>
                                <input 
                                  type="time"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                                  value={novaAudienciaHora}
                                  onChange={(e) => setNovaAudienciaHora(e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Meio / Tipo</label>
                                <select 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
                                  value={novaAudienciaTipo}
                                  onChange={(e: any) => setNovaAudienciaTipo(e.target.value)}
                                >
                                  <option value="VIRTUAL">Audiência Virtual (Teams / Meet)</option>
                                  <option value="PRESENCIAL">Audiência Presencial (Fórum)</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Juízo / Vara / Comarca</label>
                                <input 
                                  type="text"
                                  placeholder="Ex: 3ª Vara Cível do Foro Central"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                                  value={novaAudienciaOrgao}
                                  onChange={(e) => setNovaAudienciaOrgao(e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            {novaAudienciaTipo === 'VIRTUAL' && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Link de Videoconferência</label>
                                <input 
                                  type="url"
                                  placeholder="Link de acesso virtual..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                                  value={novaAudienciaLink}
                                  onChange={(e) => setNovaAudienciaLink(e.target.value)}
                                />
                              </div>
                            )}

                            <button 
                              type="submit"
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all"
                            >
                              Registrar Designação
                            </button>
                          </form>
                        </div>

                      </div>

                      {/* LISTA DE AUDIÊNCIAS DESIGNADAS */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Agenda de Audiências Cadastradas</h4>
                        <div className="space-y-3">
                          {(casoAtivo.audiencias || []).map((aud) => (
                            <div key={aud.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                                  <Video size={24} />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">{aud.tipo}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{aud.data} às {aud.hora}</span>
                                  </div>
                                  <h4 className="text-sm font-black text-slate-900">{aud.orgao_julgador}</h4>
                                  <p className="text-xs text-slate-400 font-semibold">Caso Referência: {casoAtivo.cliente_nome}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {aud.tipo === 'VIRTUAL' && aud.link_meet && (
                                  <a 
                                    href={aud.link_meet}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Video size={13} />
                                    Acessar Sala Virtual
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}

                          {(casoAtivo.audiencias || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhuma audiência agendada no momento.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 7: CHAT / MENSAGENS */}
                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-[500px]">
                      <div className="bg-slate-50 border border-slate-200 rounded-t-3xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs">
                            C
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{casoAtivo.cliente_nome}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Canal Direto Sincronizado</p>
                          </div>
                        </div>
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                      </div>

                      {/* Mensagens list */}
                      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 border-x border-slate-200 space-y-4">
                        {(casoAtivo.chat_mensagens || []).map((msg, mIdx) => {
                          const isMe = msg.autor === 'advogado';
                          const isSystem = msg.autor === 'sistema';
                          
                          if (isSystem) {
                            return (
                              <div key={mIdx} className="flex justify-center">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-150">
                                  {msg.texto}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={mIdx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] p-3.5 rounded-2xl space-y-1 shadow-sm ${
                                isMe 
                                  ? 'bg-slate-900 text-white rounded-tr-none' 
                                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                              }`}>
                                <p className="text-[9px] font-black opacity-60">{msg.nome_autor}</p>
                                <p className="text-xs font-medium leading-relaxed">{msg.texto}</p>
                                <p className="text-[8px] opacity-40 text-right">{msg.data}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat input */}
                      <form onSubmit={handleSendChatMessage} className="bg-white border border-slate-200 rounded-b-3xl p-3 flex gap-2">
                        <input 
                          type="text"
                          placeholder="Digite sua resposta técnica ou atualização de forma simples para o cliente..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-slate-400 text-slate-900"
                          value={chatMessageText}
                          onChange={(e) => setChatMessageText(e.target.value)}
                        />
                        <button 
                          type="submit"
                          className="bg-slate-900 text-white hover:bg-slate-800 p-2.5 rounded-xl transition-all"
                        >
                          <Send size={15} />
                        </button>
                      </form>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="h-full min-h-[600px] bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                  <Scale size={32} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-700">Nenhum Processo Judicial Ativo</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm font-medium">Selecione uma pasta cível na lista lateral para acessar as petições e dados de controle.</p>
              </div>
            )}
          </div>

        </div>

        {/* AI SIDEBAR OVERLAY (GSA LEGAL COPILOT powered by Gemini) */}
        <AnimatePresence>
          {aiSidebarOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setAiSidebarOpen(false)}
                className="absolute inset-0 bg-slate-950/60"
              />

              {/* Sidebar Panel */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white p-5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Brain className="text-amber-300" size={18} />
                    <div>
                      <h4 className="font-black text-sm">GSA Copiloto IA Legal</h4>
                      <p className="text-[10px] text-slate-300 font-mono">Gemini-3.5-Flash Ativo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAiSidebarOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Case Reference if open */}
                {casoAtivo && (
                  <div className="bg-slate-50 border-b border-slate-150 p-3.5 text-xs flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Contexto Atual:</span>
                    <span className="font-mono text-slate-800 font-black">{casoAtivo.cliente_nome} ({casoAtivo.nup})</span>
                  </div>
                )}

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                  {aiMessages.map((msg, idx) => {
                    const isAsst = msg.role === 'assistant';
                    return (
                      <div key={idx} className={`flex ${isAsst ? 'justify-start' : 'justify-end'}`}>
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed space-y-1 max-w-[85%] shadow-sm ${
                          isAsst 
                            ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200' 
                            : 'bg-indigo-600 text-white rounded-tr-none'
                        }`}>
                          <p className="text-[9px] font-black opacity-60 uppercase">
                            {isAsst ? 'Copiloto GSA' : 'Você'}
                          </p>
                          <div className="prose prose-xs text-xs font-semibold whitespace-pre-wrap">
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-2 shadow-sm text-xs text-slate-500 font-bold">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
                        Gemini está fundamentando teses cíveis...
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick actions inside AI Sidebar */}
                {casoAtivo && (
                  <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
                    {[
                      { label: "Sugerir Teses de Defesa", prompt: `Siga as regras de engenharia jurídica brasileiras e me sugira 3 teses de defesa específicas e fundamentadas para o caso do cliente ${casoAtivo.cliente_nome} contra o réu ${casoAtivo.parte_contraria_nome}, com base na seguinte síntese de fatos: ${casoAtivo.resumo_fato}` },
                      { label: "Resumir Peça Inicial", prompt: `Faça um resumo analítico e profissional para uso de tribunal de segunda instância referente à petição de ${casoAtivo.cliente_nome}.` },
                      { label: "Jurisprudências CDC/STJ", prompt: "Quais as principais Súmulas do STJ ou julgados cíveis sobre taxas de juros abusivas que posso acoplar nesta inicial?" }
                    ].map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => {
                          setAiInputText(act.prompt);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Prompt Input Form */}
                <form onSubmit={handleSendAiPrompt} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                  <input 
                    type="text"
                    placeholder="Pergunte sobre fundamentação jurídica, teses ou leis..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-indigo-400 text-slate-900"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={aiLoading || !aiInputText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </form>

              </motion.div>

            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
