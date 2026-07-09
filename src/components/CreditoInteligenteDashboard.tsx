import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, FileText, Settings, Activity, DollarSign, Users, Home, Plus, 
  BrainCircuit, Zap, AlertTriangle, ArrowRight, Send, ClipboardList, 
  Building2, ShieldAlert, Palette, BarChart, Sparkles, Share2, Video, 
  Briefcase, UploadCloud, Store, Shield, PenTool, Percent, LayoutGrid,
  CheckCircle, XCircle, Info, Download, Copy, MessageSquare, Trash2, Edit, Check,
  GraduationCap, QrCode, Calendar, Lock, Trophy
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import CreditoSimuladorPremium from './CreditoSimuladorPremium';
import EntrevistaCreditoView from './EntrevistaCreditoView';
import ChecklistCreditoPremium from './ChecklistCreditoPremium';

// Interfaces internas para o simulador e módulo de crédito
interface CreditoLead {
  id: string;
  empresa: string;
  cnpj: string;
  adminNome: string;
  generoAdmin: 'Homem' | 'Mulher';
  admin_genero?: 'Homem' | 'Mulher'; // Campo sincronizado direto da tabela empresas
  faturamentoAnual: number;
  tempoConstituicao: number; // meses
  possuiContabilidade: boolean;
  temDividasBancarias: boolean;
  temDividasImpostos: boolean;
  score: number;
  limiteEstimado: number;
  tier: 'Tier A' | 'Tier B' | 'Inapto';
  status: 'Simulado' | 'Documentação Pendente' | 'Análise Técnica' | 'Aprovado' | 'Pago' | 'Limpeza de Nome Ativada';
  dataSimulacao: string;
  afiliadoId?: string;
  comissaoEstimada?: number;
  regiao: string;
  documentos?: {
    contratoSocial: { status: 'pendente' | 'enviado' | 'aprovado'; nome: string; url: string };
    faturamento12m: { status: 'pendente' | 'enviado' | 'aprovado'; nome: string; url: string };
    irpj: { status: 'pendente' | 'enviado' | 'aprovado'; nome: string; url: string };
    cndFederal: { status: 'pendente' | 'enviado' | 'aprovado'; nome: string; url: string };
  };
  solicitacoesAgencia?: string[];
}

interface ParceiroFinanceiro {
  id: string;
  nome: string;
  tipo: 'banco' | 'cooperativa' | 'fidc' | 'fintech' | 'fundo_investimento' | 'credito_privado';
  tipo_label: string;
  detalhes: string;
  linha_ativa: string;
  status: string;
  status_color: string;
}

interface ComissaoConfig {
  bronzeComissaoDireta: number;
  bronzeOverride: number;
  prataComissaoDireta: number;
  prataOverride: number;
  ouroComissaoDireta: number;
  ouroOverride: number;
}

export default function CreditoInteligenteDashboard() {
  const { profile, isMaster } = useAuth();
  
  // 1. Controle de Perfil para testes (Permite alternar entre as 7 visões)
  const [selectedRole, setSelectedRole] = useState<'MASTER' | 'UNIDADE' | 'RECUPERADORA' | 'VENDEDOR' | 'AFILIADO' | 'EMPRESARIO' | 'AGENCIA'>('MASTER');

  // Inicializa o perfil padrão de acordo com o usuário logado
  useEffect(() => {
    if (profile?.tipo_usuario) {
      const role = profile.tipo_usuario;
      if (['MASTER', 'ADMIN', 'MasterAdmin', 'AdminGeral'].includes(role)) {
        setSelectedRole('MASTER');
      } else if (['UNIDADE', 'DIRETOR', 'GestorUnidade'].includes(role)) {
        setSelectedRole('UNIDADE');
      } else if (['ADVOGADO', 'RECUPERADORA'].includes(role)) {
        setSelectedRole('RECUPERADORA');
      } else if (['VENDEDOR'].includes(role)) {
        setSelectedRole('VENDEDOR');
      } else if (['EMPRESARIO', 'CLIENTE'].includes(role)) {
        setSelectedRole('EMPRESARIO');
      } else if (['AGENCIA'].includes(role)) {
        setSelectedRole('AGENCIA');
      } else {
        setSelectedRole('AFILIADO');
      }
    }
  }, [profile]);

  // Estados para as novas visões (Empresário e Agência)
  const [selectedEmpresarioId, setSelectedEmpresarioId] = useState<string>('');
  const [selectedAgenciaLeadId, setSelectedAgenciaLeadId] = useState<string>('');
  const [novaSolicitacaoTxt, setNovaSolicitacaoTxt] = useState<string>('');
  const [documentoPreview, setDocumentoPreview] = useState<{
    empresa: string;
    documentoNome: string;
    tipo: string;
    status: string;
    dataUpload?: string;
  } | null>(null);

  // 2. Estados da aplicação
  const [leads, setLeads] = useState<CreditoLead[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [comissaoConfig, setComissaoConfig] = useState<ComissaoConfig>({
    bronzeComissaoDireta: 10,
    bronzeOverride: 0,
    prataComissaoDireta: 15,
    prataOverride: 2,
    ouroComissaoDireta: 20,
    ouroOverride: 5
  });

  // Estado do Simulador Ativo
  const [simEmpresa, setSimEmpresa] = useState('');
  const [simCnpj, setSimCnpj] = useState('');
  const [simAdminNome, setSimAdminNome] = useState('');
  const [simGenero, setSimGenero] = useState<'Homem' | 'Mulher'>('Mulher');
  const [simFaturamento, setSimFaturamento] = useState<number>(500000);
  const [simTempo, setSimTempo] = useState<number>(24);
  const [simContabilidade, setSimContabilidade] = useState<boolean>(true);
  const [simDividasBancarias, setSimDividasBancarias] = useState<boolean>(false);
  const [simDividasImpostos, setSimDividasImpostos] = useState<boolean>(false);
  
  // Estado de feedbacks visuais
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [showReabModal, setShowReabModal] = useState<CreditoLead | null>(null);
  const [showBridgeModal, setShowBridgeModal] = useState<CreditoLead | null>(null);
  const [showSimuladorModal, setShowSimuladorModal] = useState<boolean>(false);
  const [showEntrevistaModal, setShowEntrevistaModal] = useState<boolean>(false);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [showNovoParceiroModal, setShowNovoParceiroModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentLeadId, setCurrentLeadId] = useState<string>('');
  const [cnpjLookup, setCnpjLookup] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  
  // Estado do Funil GSA Recovery
  const [purchasedServices, setPurchasedServices] = useState<Record<string, boolean>>({});
  const [recoveryActiveTab, setRecoveryActiveTab] = useState<'funil' | 'contrato' | 'procuracao'>('funil');
  
  // Nível de Profissionalização Afiliado (Bronze, Prata, Ouro)
  const [selectedLevelTab, setSelectedLevelTab] = useState<'bronze' | 'prata' | 'ouro'>('prata');

  // Estado de Simulação SQL
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [terminalTab, setTerminalTab] = useState<'constraint' | 'function' | 'commission' | 'endpoint'>('constraint');
  const [constraintSuccess, setConstraintSuccess] = useState(false);
  const [functionSuccess, setFunctionSuccess] = useState(false);
  const [commissionSuccess, setCommissionSuccess] = useState(false);
  const [endpointSuccess, setEndpointSuccess] = useState(false);

  // Estados do Novo Parceiro Form
  const [novoParceiroNome, setNovoParceiroNome] = useState('');
  const [novoParceiroTipo, setNovoParceiroTipo] = useState<ParceiroFinanceiro['tipo']>('credito_privado');
  const [novoParceiroDetalhes, setNovoParceiroDetalhes] = useState('');
  const [novoParceiroLinha, setNovoParceiroLinha] = useState('');

  // 3. Carregar dados fictícios/Iniciais e localStorage com sincronização live do Firestore
  useEffect(() => {
    const carregarDadosCompletos = async () => {
      let leadsMesclados: CreditoLead[] = [];
      const savedLeads = localStorage.getItem('gsa_credito_leads');
      const savedConfig = localStorage.getItem('gsa_credito_config');
      const savedParceiros = localStorage.getItem('gsa_parceiros_financeiros');

      // 1. Carrega massa inicial ou dados salvos no localStorage
      if (savedLeads) {
        try {
          leadsMesclados = JSON.parse(savedLeads);
        } catch (_) {}
      } else {
        const defaultLeads: CreditoLead[] = [
          {
            id: 'lead-1',
            empresa: 'Tecnologia Alpha Ltda',
            cnpj: '12.345.678/0001-90',
            adminNome: 'Mariana Medeiros',
            generoAdmin: 'Mulher',
            admin_genero: 'Mulher',
            faturamentoAnual: 1200000,
            tempoConstituicao: 36,
            possuiContabilidade: true,
            temDividasBancarias: false,
            temDividasImpostos: false,
            score: 100,
            limiteEstimado: 720000,
            tier: 'Tier A',
            status: 'Aprovado',
            dataSimulacao: '2026-06-30T10:00:00',
            afiliadoId: 'user-bronze',
            comissaoEstimada: 12000,
            regiao: 'São Paulo - SP'
          },
          {
            id: 'lead-2',
            empresa: 'Metalúrgica Vulcan',
            cnpj: '98.765.432/0001-21',
            adminNome: 'Roberto Souza',
            generoAdmin: 'Homem',
            admin_genero: 'Homem',
            faturamentoAnual: 2400000,
            tempoConstituicao: 48,
            possuiContabilidade: true,
            temDividasBancarias: true,
            temDividasImpostos: true,
            score: 30,
            limiteEstimado: 1200000,
            tier: 'Tier B',
            status: 'Limpeza de Nome Ativada',
            dataSimulacao: '2026-06-30T11:30:00',
            afiliadoId: 'user-prata',
            comissaoEstimada: 36000,
            regiao: 'Curitiba - PR'
          },
          {
            id: 'lead-3',
            empresa: 'Comércio de Doces do Vale',
            cnpj: '45.123.789/0001-55',
            adminNome: 'Claudio Antunes',
            generoAdmin: 'Homem',
            admin_genero: 'Homem',
            faturamentoAnual: 300000,
            tempoConstituicao: 8,
            possuiContabilidade: true,
            temDividasBancarias: false,
            temDividasImpostos: false,
            score: 100,
            limiteEstimado: 150000,
            tier: 'Inapto',
            status: 'Simulado',
            dataSimulacao: '2026-06-30T14:15:00',
            afiliadoId: 'user-bronze',
            comissaoEstimada: 0,
            regiao: 'Salvador - BA'
          },
          {
            id: 'lead-4',
            empresa: 'Agropecuária Cerrado Verde',
            cnpj: '33.999.888/0001-44',
            adminNome: 'Beatriz Vasconcelos',
            generoAdmin: 'Mulher',
            admin_genero: 'Mulher',
            faturamentoAnual: 4500000,
            tempoConstituicao: 60,
            possuiContabilidade: false,
            temDividasBancarias: true,
            temDividasImpostos: false,
            score: 70,
            limiteEstimado: 2700000,
            tier: 'Tier B',
            status: 'Documentação Pendente',
            dataSimulacao: '2026-06-30T16:00:00',
            afiliadoId: 'user-ouro',
            comissaoEstimada: 81000,
            regiao: 'Goiânia - GO'
          }
        ];
        leadsMesclados = defaultLeads;
      }

      // 2. Tenta carregar os leads reais do Firestore
      try {
        let querySnapshot;
        if (isMaster) {
          querySnapshot = await getDocs(collection(db, 'leads_credito'));
        } else if (profile?.id) {
          const q = query(collection(db, 'leads_credito'), where('afiliadoRef', '==', profile.id));
          querySnapshot = await getDocs(q);
        } else {
          // Sem profile, não carrega leads reais
          querySnapshot = { forEach: () => {} };
        }
        
        const leadsFirestore: CreditoLead[] = [];
        
        if (querySnapshot.forEach) {
          querySnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          const id = docSnap.id;
          
          // Mapeia do formato Firestore para o formato CreditoLead do Dashboard
          leadsFirestore.push({
            id,
            empresa: data.nomeEmpresa || data.empresa || 'Empresa Sem Nome',
            cnpj: data.cnpj || '',
            adminNome: data.nomeAdministrador || data.adminNome || '',
            generoAdmin: (data.genero || data.generoAdmin || 'Homem') as 'Homem' | 'Mulher',
            admin_genero: (data.genero || data.generoAdmin || 'Homem') as 'Homem' | 'Mulher',
            faturamentoAnual: Number(data.faturamentoAnual) || 0,
            tempoConstituicao: Number(data.tempoCNPJ || data.tempoConstituicao) || 12,
            possuiContabilidade: data.temContabilidadeAtiva === 'Sim' || !!data.possuiContabilidade,
            temDividasBancarias: data.temRestricoes === 'Sim' || !!data.temDividasBancarias,
            temDividasImpostos: data.temDividasImpostos === 'Sim' || !!data.temDividasImpostos,
            score: data.score || (data.scoreCalculado ? data.scoreCalculado * 10 : 100),
            limiteEstimado: data.limiteEstimado || 0,
            tier: data.tier || 'Tier B',
            status: data.statusInterno === 'Pronto para Análise de Liberação' ? 'Análise Técnica' : (data.statusInterno || data.status || 'Simulado'),
            dataSimulacao: data.dataCadastro || data.dataSimulacao || new Date().toISOString(),
            regiao: data.regiao || 'São Paulo - SP',
            afiliadoId: data.afiliadoRef || 'user-teste',
            comissaoEstimada: (data.limiteEstimado || 0) * 0.03
          });
        });
        }

        // Mescla sem duplicar, priorizando Firestore
        const mapExistente = new Map<string, CreditoLead>();
        leadsMesclados.forEach(l => mapExistente.set(l.id, l));
        leadsFirestore.forEach(l => mapExistente.set(l.id, l));
        
        leadsMesclados = Array.from(mapExistente.values());
      } catch (err) {
        console.error("Erro ao sincronizar CRM com leads do Firestore:", err);
      }

      setLeads(leadsMesclados);
      localStorage.setItem('gsa_credito_leads', JSON.stringify(leadsMesclados));

      // 3. Parceiros Financeiros
      if (savedParceiros) {
        setParceiros(JSON.parse(savedParceiros));
      } else {
        const initialParceiros: ParceiroFinanceiro[] = [
          {
            id: 'parceiro-1',
            nome: 'Apex Fundo de Crédito Estruturado',
            tipo: 'credito_privado',
            tipo_label: 'FIDC Crédito Privado',
            detalhes: 'Taxas bridge a partir de 1.8% a.m. focado no mercado corporativo de alta renda.',
            linha_ativa: 'Bridge',
            status: 'Homologado',
            status_color: 'emerald'
          },
          {
            id: 'parceiro-2',
            nome: 'Conexão Contábil Associados',
            tipo: 'fintech',
            tipo_label: 'Contabilidade',
            detalhes: 'Especialistas em reestruturação fiscal e emissão ágil de CND da Receita.',
            linha_ativa: 'Receita Federal',
            status: 'Ativo',
            status_color: 'emerald'
          },
          {
            id: 'parceiro-3',
            nome: 'Horizon Securitizadora S/A',
            tipo: 'fidc',
            tipo_label: 'FIDC Securitizadora',
            detalhes: 'Especializada em desconto de duplicatas e crédito privado emergencial.',
            linha_ativa: 'FIDC PME',
            status: 'Homologado',
            status_color: 'emerald'
          }
        ];
        setParceiros(initialParceiros);
        localStorage.setItem('gsa_parceiros_financeiros', JSON.stringify(initialParceiros));
      }

      if (savedConfig) {
        setComissaoConfig(JSON.parse(savedConfig));
      }
    };

    carregarDadosCompletos();
  }, []);

  const saveLeadsToStorage = (updated: CreditoLead[]) => {
    setLeads(updated);
    localStorage.setItem('gsa_credito_leads', JSON.stringify(updated));
  };

  const saveParceirosToStorage = (updated: ParceiroFinanceiro[]) => {
    setParceiros(updated);
    localStorage.setItem('gsa_parceiros_financeiros', JSON.stringify(updated));
  };

  // Funções auxiliares para documentos e solicitações
  const getLeadDocuments = (lead: CreditoLead) => {
    if (lead.documentos) return lead.documentos;
    
    // Se não existirem, retorna uma estrutura dinâmica coerente com o status
    const isApproved = lead.status === 'Aprovado' || lead.status === 'Pago';
    const isPending = lead.status === 'Documentação Pendente';
    
    return {
      contratoSocial: { 
        status: isApproved ? ('aprovado' as const) : (isPending ? ('pendente' as const) : ('enviado' as const)), 
        nome: `contrato_social_${lead.empresa.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        url: `/docs/contrato_social_${lead.id}.pdf`
      },
      faturamento12m: { 
        status: isApproved ? ('aprovado' as const) : (isPending ? ('pendente' as const) : ('enviado' as const)), 
        nome: `faturamento_12meses_${lead.empresa.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        url: `/docs/faturamento_${lead.id}.pdf`
      },
      irpj: { 
        status: isApproved ? ('aprovado' as const) : ('pendente' as const), 
        nome: `declaracao_irpj_${lead.empresa.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        url: `/docs/irpj_${lead.id}.pdf`
      },
      cndFederal: { 
        status: isApproved ? ('aprovado' as const) : (lead.temDividasImpostos ? ('pendente' as const) : ('enviado' as const)), 
        nome: `cnd_federal_${lead.empresa.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        url: `/docs/cnd_${lead.id}.pdf`
      }
    };
  };

  const getLeadSolicitacoes = (lead: CreditoLead) => {
    if (lead.solicitacoesAgencia) return lead.solicitacoesAgencia;
    
    const defaultSolicitations: string[] = [];
    if (lead.temDividasImpostos) {
      defaultSolicitations.push("Necessário providenciar a Guia de Parcelamento de Tributos Federais consolidada.");
    }
    if (lead.temDividasBancarias) {
      defaultSolicitations.push("Favor apresentar o extrato do SCR Banco Central (Registrato) para análise de apontamentos bancários.");
    }
    if (!lead.possuiContabilidade) {
      defaultSolicitations.push("Apresentar declaração assinada pelo contador responsável ou Balancete de Verificação recente.");
    }
    return defaultSolicitations;
  };

  const atualizarLeadCompleto = (id: string, updates: Partial<CreditoLead>) => {
    const atualizados = leads.map(l => {
      if (l.id === id) {
        const docs = l.documentos || getLeadDocuments(l);
        const solics = l.solicitacoesAgencia || getLeadSolicitacoes(l);
        return { 
          ...l, 
          ...updates,
          documentos: updates.documentos !== undefined ? updates.documentos : docs,
          solicitacoesAgencia: updates.solicitacoesAgencia !== undefined ? updates.solicitacoesAgencia : solics
        };
      }
      return l;
    });
    saveLeadsToStorage(atualizados);
  };

  // 4. Lógica de cálculo do Score e Limite de Crédito
  const calcularSimulacao = () => {
    // Limite Estimado: Homem 50%, Mulher 60% do faturamento anual
    const coeficiente = simGenero === 'Mulher' ? 0.60 : 0.50;
    const limiteEstimado = simFaturamento * coeficiente;

    // Tempo menor que 12 meses -> Inapto
    if (simTempo < 12) {
      return {
        score: 100,
        limiteEstimado,
        tier: 'Inapto' as const,
        status: 'Simulado' as const
      };
    }

    // Começa com 100 pontos
    let score = 100;
    if (simDividasBancarias) score -= 30;
    if (simDividasImpostos) score -= 40;

    // Determina o tier
    const tier: 'Tier A' | 'Tier B' | 'Inapto' = (simDividasBancarias || simDividasImpostos) ? 'Tier B' : 'Tier A';

    return {
      score,
      limiteEstimado,
      tier,
      status: (tier === 'Tier B' ? 'Documentação Pendente' : 'Simulado') as any
    };
  };

  const handleNovaSimulacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simEmpresa || !simCnpj || !simAdminNome) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const calculos = calcularSimulacao();
    const novoLead: CreditoLead = {
      id: 'lead-' + Date.now(),
      empresa: simEmpresa,
      cnpj: simCnpj,
      adminNome: simAdminNome,
      generoAdmin: simGenero,
      admin_genero: simGenero, // Alimentação direta da coluna admin_genero na classificação
      faturamentoAnual: simFaturamento,
      tempoConstituicao: simTempo,
      possuiContabilidade: simContabilidade,
      temDividasBancarias: simDividasBancarias,
      temDividasImpostos: simDividasImpostos,
      score: calculos.score,
      limiteEstimado: calculos.limiteEstimado,
      tier: calculos.tier,
      status: calculos.status,
      dataSimulacao: new Date().toISOString(),
      regiao: 'São Paulo - SP',
      afiliadoId: 'user-teste',
      comissaoEstimada: calculos.limiteEstimado * 0.03 // Estimando 3% de split da captação
    };

    const atualizados = [novoLead, ...leads];
    saveLeadsToStorage(atualizados);
    setShowSimuladorModal(false);

    // Limpar campos
    setSimEmpresa('');
    setSimCnpj('');
    setSimAdminNome('');
    setSimFaturamento(500000);
    setSimTempo(24);
    setSimContabilidade(true);
    setSimDividasBancarias(false);
    setSimDividasImpostos(false);

    // Se for Tier B, abre as opções jurídicas automaticamente
    if (novoLead.tier === 'Tier B') {
      setShowReabModal(novoLead);
    }
  };

  // Alterar Status do Lead (Simula fluxo comercial)
  const alterarStatusLead = (id: string, novoStatus: any) => {
    const atualizados = leads.map(l => {
      if (l.id === id) {
        return { ...l, status: novoStatus };
      }
      return l;
    });
    saveLeadsToStorage(atualizados);
  };

  // Excluir Lead
  const excluirLead = async (id: string) => {
    if (confirm('Tem certeza de que deseja remover este lead?')) {
      try {
        if (!id.startsWith('lead-')) {
          const docRef = doc(db, 'leads_credito', id);
          await deleteDoc(docRef);
        }
      } catch (err) {
        console.error("Erro ao excluir lead do Firestore:", err);
      }
      const atualizados = leads.filter(l => l.id !== id);
      saveLeadsToStorage(atualizados);
    }
  };

  const handleRunSQLMigration = () => {
    setIsMigrating(true);
    setMigrationLog([]);

    const logs = terminalTab === 'constraint' ? [
      '⚡ Conectando ao Banco de Dados "ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b" na porta 5432...',
      '🔍 Analisando tabela "parceiros_financeiros"...',
      '⚠️ Removendo restrição antiga: DROP CONSTRAINT parceiros_financeiros_tipo_check...',
      '✅ Restrição antiga removida com sucesso.',
      '📝 Aplicando nova restrição: ALTER TABLE parceiros_financeiros ADD CONSTRAINT parceiros_financeiros_tipo_check CHECK (tipo IN (\'banco\', \'cooperativa\', \'fidc\', \'fintech\', \'fundo_investimento\', \'credito_privado\'))...',
      '✅ Nova restrição CHECK adicionada com sucesso!',
      '⚙️ Atualizando o Motor de Crédito por Gênero e Canal de Escalonamento...',
      '🚀 Sincronização completa. O campo "tipo" agora aceita formalmente a categoria "credito_privado"!'
    ] : terminalTab === 'function' ? [
      '⚡ Conectando ao Banco de Dados "ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b" na porta 5432...',
      '🔍 Analisando dependências e tipos das tabelas "empresas" e "simulacoes"...',
      '📝 Compilando função PL/pgSQL: CREATE OR REPLACE FUNCTION calcula_limite_credito(p_empresa_id UUID)...',
      '⚙️ Registrando variáveis de faturamento, percentual_base e multiplicador (ajuste por gênero)...',
      '📊 Implementando verificação de respostas_json ("possui_conta_pj", "ja_contratou_pronampe", "possui_dividas_vencidas_90dias")...',
      '💾 Salvando alteração com atualização cirúrgica por chave primária (limite_estimado)...',
      '✅ Função PL/pgSQL "calcula_limite_credito" criada e homologada com sucesso no PostgreSQL!',
      '🚀 Pronto! O motor de cálculo agora é processado nativamente no banco de dados com ultra performance!'
    ] : terminalTab === 'commission' ? [
      '⚡ Conectando ao Banco de Dados "ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b" na porta 5432...',
      '🔍 Analisando tabelas "operacoes_credito", "indicacoes", "afiliados" e "comissoes_credito"...',
      '⚠️ Identificado bug crítico: Atribuição incorreta em múltiplos leads de um mesmo afiliado!',
      '📝 Compilando função PL/pgSQL corrigida: CREATE OR REPLACE FUNCTION distribui_comissao_operacao(p_operacao_id UUID)...',
      '⚙️ Aplicando amarração rigorosa: WHERE afiliado_id = v_afiliado_id AND empresa_id = v_empresa_id',
      '📊 Configurando bônus do afiliado direto e override de bônus do gestor de time (1%)...',
      '✅ Função "distribui_comissao_operacao" homologada e protegida contra duplicações!',
      '🚀 Sincronização completa. O Split de Comissões agora é ultra seguro e direcionado com precisão cirúrgica!'
    ] : [
      '⚡ Inicializando simulação de chamada POST /simulacoes para a API de Crédito...',
      '🔒 Autenticando requisição com JWT Token e recuperando empresa_id...',
      '📈 Iniciando transação segura com o banco: BEGIN TRANSACTION...',
      '💾 Salvando nova simulação de 5 etapas e gravando respostas do formulário...',
      '📊 Registrando histórico de sub-scores na tabela "scores_historico"...',
      '🧮 Executando função "calcula_indice_bancabilidade" e classificando tier...',
      '🎯 Chamando a função "calcula_limite_credito" nativa no Postgres...',
      '⚙️ Roteando melhor parceiro financeiro e validando status de homologação ativo (CORREÇÃO: Evita falhas no insert)...',
      '✅ Transação finalizada com sucesso: COMMIT TRANSACTION!',
      '🚀 Sucesso! Código HTTP 201 retornado. Simulação e roteamento de parceiros integrados com ultra performance!'
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setMigrationLog(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setIsMigrating(false);
        if (terminalTab === 'constraint') {
          setConstraintSuccess(true);
        } else if (terminalTab === 'function') {
          setFunctionSuccess(true);
        } else if (terminalTab === 'commission') {
          setCommissionSuccess(true);
        } else {
          setEndpointSuccess(true);
        }
      }
    }, 400);
  };

  const handleAdicionarParceiro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoParceiroNome || !novoParceiroDetalhes || !novoParceiroLinha) {
      alert('Por favor, preencha todos os campos do parceiro.');
      return;
    }

    const novo: ParceiroFinanceiro = {
      id: 'parceiro-' + Date.now(),
      nome: novoParceiroNome,
      tipo: novoParceiroTipo,
      tipo_label: novoParceiroTipo === 'credito_privado' ? 'FIDC Crédito Privado' :
                  novoParceiroTipo === 'banco' ? 'Banco Tradicional' :
                  novoParceiroTipo === 'cooperativa' ? 'Cooperativa de Crédito' :
                  novoParceiroTipo === 'fidc' ? 'FIDC Securitizadora' :
                  novoParceiroTipo === 'fintech' ? 'Plataforma Fintech' : 'Fundo de Investimento',
      detalhes: novoParceiroDetalhes,
      linha_ativa: novoParceiroLinha,
      status: 'Homologado',
      status_color: 'emerald'
    };

    const atualizados = [...parceiros, novo];
    saveParceirosToStorage(atualizados);
    setShowNovoParceiroModal(false);

    // Reset fields
    setNovoParceiroNome('');
    setNovoParceiroTipo('credito_privado');
    setNovoParceiroDetalhes('');
    setNovoParceiroLinha('');
  };

  // Copiar links de indicação do Kit de Transmissão
  const handleCopiarLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // Motor de Busca Rápida por CNPJ na Entrada do Módulo
  const verificarCadastroPorCNPJ = async () => {
    if (!cnpjLookup.trim()) {
      alert("Por favor, digite um CNPJ.");
      return;
    }
    setLookupLoading(true);
    try {
      const q = query(collection(db, 'leads_credito'), where('cnpj', '==', cnpjLookup.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docEncontrado = querySnapshot.docs[0];
        setCurrentLeadId(docEncontrado.id);
        alert(`✓ Cadastro localizado! Carregando dados de ${docEncontrado.data().nomeEmpresa || docEncontrado.data().empresa}.`);
      } else {
        alert("ℹ️ CNPJ não encontrado. O link gerado criará um novo registro do zero.");
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
    } finally {
      setLookupLoading(false);
    }
  };

  // Gerador Inteligente de Links de Prospecção / Resolução
  const copiarLinkCompartilhamento = (destino: 'ficha' | 'checklist' | 'simulador') => {
    const baseUrl = window.location.origin;
    
    let path = '/';
    if (destino === 'ficha') path = '/ficha-entrevista';
    else if (destino === 'checklist') path = '/checklist-credito';
    else if (destino === 'simulador') path = '/simulador-credito';

    let urlFinal = `${baseUrl}${path}`;
    
    // Se já temos um lead ativo, o link vai amarrado para ele resolver pendências
    if (currentLeadId) {
      urlFinal += `?leadId=${currentLeadId}`;
    }

    navigator.clipboard.writeText(urlFinal);
    setCopiedIndex(destino);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Filtros de busca
  const leadsFiltrados = leads.filter(l => 
    l.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.cnpj.includes(searchTerm) ||
    l.adminNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-gray-900 pb-16">
      
      {/* HEADER DE TÍTULO E BOTÕES PREMIUM DE ALTA CONVERSÃO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm font-sans antialiased">
        
        {/* SEÇÃO HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-100">Legaltech & Fintech</span>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-100">Ativo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BrainCircuit className="text-indigo-600 w-6 h-6 shrink-0" />
              Captação de Recursos & Crédito Inteligente
            </h2>
            <p className="text-xs text-slate-500 max-w-xl font-medium">
              Sistema integrado de análise de limites, MLM, crédito estruturado privado e reabilitação fiscal/judicial.
            </p>
          </div>

          {/* INPUT DE VERIFICAÇÃO DE CNPJ DA EMPRESA */}
          <div className="w-full lg:w-auto bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-2 items-center">
            <div className="w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 font-mono">Identificar Empresa</span>
              <input 
                type="text" 
                value={cnpjLookup}
                onChange={e => setCnpjLookup(e.target.value)}
                placeholder="Digitar CNPJ para checar..." 
                className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 w-full sm:w-48"
              />
            </div>
            <button 
              type="button"
              disabled={lookupLoading}
              onClick={verificarCadastroPorCNPJ}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors mt-auto self-end h-[34px] cursor-pointer"
            >
              {lookupLoading ? '...' : '🔍 Validar'}
            </button>
          </div>
        </div>

        {/* BLOCO DE BOTÕES PREMIUM DE ALTA CONVERSÃO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* BOTÃO 1: FICHA DE ENTREVISTA */}
          <div className="relative group">
            <button 
              type="button"
              onClick={() => window.location.href = currentLeadId ? `/ficha-entrevista?leadId=${currentLeadId}` : '/ficha-entrevista'}
              className="w-full bg-[#009B63] hover:bg-[#008451] text-white p-6 rounded-xl flex flex-col items-center justify-center text-center gap-2 h-28 shadow-sm transition-all relative cursor-pointer"
            >
              <span className="text-xl">📄</span>
              <span className="text-sm font-bold tracking-tight">Ficha de Entrevista</span>
            </button>
            <button 
              type="button"
              onClick={() => copiarLinkCompartilhamento('ficha')}
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white text-[10px] px-2 py-1 rounded font-mono transition-all cursor-pointer"
              title="Copiar link para enviar ao cliente ou contador"
            >
              {copiedIndex === 'ficha' ? '✓ Copiado' : '🔗 Compartilhar'}
            </button>
          </div>

          {/* BOTÃO 2: CHECKLIST DE DOCUMENTOS */}
          <div className="relative group">
            <button 
              type="button"
              onClick={() => window.location.href = currentLeadId ? `/checklist-credito?leadId=${currentLeadId}` : '/checklist-credito'}
              className="w-full bg-[#1A66FF] hover:bg-[#1352D6] text-white p-6 rounded-xl flex flex-col items-center justify-center text-center gap-2 h-28 shadow-sm transition-all relative cursor-pointer"
            >
              <span className="text-xl">📋</span>
              <span className="text-sm font-bold tracking-tight">Checklist de Documentos</span>
            </button>
            <button 
              type="button"
              onClick={() => copiarLinkCompartilhamento('checklist')}
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white text-[10px] px-2 py-1 rounded font-mono transition-all cursor-pointer"
              title="Copiar link do Checklist Dinâmico"
            >
              {copiedIndex === 'checklist' ? '✓ Copiado' : '🔗 Compartilhar'}
            </button>
          </div>

          {/* BOTÃO 3: NOVA SIMULAÇÃO DE CRÉDITO */}
          <div className="relative group">
            <button 
              type="button"
              onClick={() => window.location.href = '/simulador-credito'}
              className="w-full bg-[#6344F2] hover:bg-[#5034D9] text-white p-6 rounded-xl flex flex-col items-center justify-center text-center gap-2 h-28 shadow-sm transition-all relative cursor-pointer"
            >
              <span className="text-xl">＋</span>
              <span className="text-sm font-bold tracking-tight">Nova Simulação de Crédito</span>
            </button>
            <button 
              type="button"
              onClick={() => copiarLinkCompartilhamento('simulador')}
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white text-[10px] px-2 py-1 rounded font-mono transition-all cursor-pointer"
              title="Copiar link direto de captação de novos leads"
            >
              {copiedIndex === 'simulador' ? '✓ Copiado' : '🔗 Prospectar'}
            </button>
          </div>

        </div>

        {currentLeadId && (
          <div className="text-[11px] font-mono text-slate-500 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            🔗 Sessão Ativa Vinculada ao Lead ID: <span className="text-blue-600 font-bold">{currentLeadId}</span>. Os links copiados estão parametrizados para este cliente.
          </div>
        )}

      </div>

      {/* SELETOR DE PERFIL PARA EXPERIÊNCIA DE TESTE MULTINÍVEL */}
      {isMaster && (
        <div className="bg-slate-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/10">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Matriz de Acessos por Nível Hierárquico (Simulação)</h4>
                <p className="text-xs text-slate-400">Alterne entre os níveis de perfil para verificar as visões e regras específicas do ecossistema GSA.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'MASTER', label: '👑 GSA Master', color: 'bg-indigo-600' },
                { id: 'UNIDADE', label: '🏢 Unidade/Franquia', color: 'bg-emerald-600' },
                { id: 'RECUPERADORA', label: '⚖️ GSA Soluções (Recuperadora de crédito)', color: 'bg-amber-600' },
                { id: 'VENDEDOR', label: '💼 Vendedor CRM', color: 'bg-blue-600' },
                { id: 'AFILIADO', label: '🔗 Afiliado MLM', color: 'bg-rose-600' },
                { id: 'EMPRESARIO', label: '👤 Empresário', color: 'bg-cyan-600' },
                { id: 'AGENCIA', label: '🏦 Agência de Crédito', color: 'bg-violet-600' },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id as any)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    selectedRole === r.id 
                      ? `${r.color} text-white shadow-lg` 
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedRole === r.id ? 'bg-white' : 'bg-slate-500'}`} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. VISÃO ADMIN MASTER                                    */}
      {/* ========================================================= */}
      {selectedRole === 'MASTER' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Métricas GSA Master */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Vol. Simulado Total</span>
                <span className="text-2xl font-serif font-black text-slate-900">
                  R$ {leads.reduce((acc, l) => acc + l.limiteEstimado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-indigo-500 font-bold block mt-1">Ancoragem Inteligente Ativa ⚡</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BrainCircuit className="w-6 h-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Linha Liberada (Pública)</span>
                <span className="text-2xl font-serif font-black text-emerald-600">
                  R$ {leads.filter(l => l.status === 'Aprovado' || l.status === 'Pago').reduce((acc, l) => acc + l.limiteEstimado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">Garantias e Pronampe</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle className="w-6 h-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">FIDC & Crédito Privado (Bridge)</span>
                <span className="text-2xl font-serif font-black text-indigo-900">
                  R$ {leads.filter(l => l.tier === 'Tier B').reduce((acc, l) => acc + l.limiteEstimado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-amber-500 font-bold block mt-1">Ativação Automática Bridge</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-900 rounded-2xl"><Zap className="w-6 h-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Leads Qualificados (Ecossistema)</span>
                <span className="text-2xl font-serif font-black text-slate-900">
                  {leads.length} Cadastros
                </span>
                <span className="text-[10px] text-indigo-500 font-bold block mt-1">Comissões MLM Integradas</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users className="w-6 h-6" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CONFIGURADOR DE COMISSÕES MULTINÍVEL */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                <Percent className="text-indigo-600 w-5 h-5" />
                <h3 className="font-bold text-base text-gray-900">Configurador de Comissões & Override GSA</h3>
              </div>
              
              <p className="text-xs text-gray-500">Defina os repasses automáticos do split de crédito liberado para cada nível do Marketing Multinível (MLM).</p>
              
              <div className="space-y-5">
                {/* Bronze */}
                <div className="p-4 bg-orange-50/50 border border-orange-100/60 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-orange-800">Bronze (Cliente Indicador)</span>
                    <span className="text-xs font-mono font-black text-orange-600">{comissaoConfig.bronzeComissaoDireta}% Direta</span>
                  </div>
                  <input 
                    type="range" min="5" max="15" value={comissaoConfig.bronzeComissaoDireta}
                    onChange={(e) => setComissaoConfig({...comissaoConfig, bronzeComissaoDireta: Number(e.target.value)})}
                    className="w-full h-1.5 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-orange-500">
                    <span>Mín: 5%</span>
                    <span>Max: 15%</span>
                  </div>
                </div>

                {/* Prata */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-800">Prata (Afiliado Profissional)</span>
                    <div className="flex gap-2">
                      <span className="text-xs font-mono font-bold text-slate-600">{comissaoConfig.prataComissaoDireta}% Dir.</span>
                      <span className="text-xs font-mono font-bold text-indigo-600">+{comissaoConfig.prataOverride}% Over</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="range" min="10" max="18" value={comissaoConfig.prataComissaoDireta}
                      onChange={(e) => setComissaoConfig({...comissaoConfig, prataComissaoDireta: Number(e.target.value)})}
                      className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <input 
                      type="range" min="1" max="4" value={comissaoConfig.prataOverride}
                      onChange={(e) => setComissaoConfig({...comissaoConfig, prataOverride: Number(e.target.value)})}
                      className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Ouro */}
                <div className="p-4 bg-amber-50/50 border border-amber-100/60 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-amber-800">Ouro (Líder / Unidade)</span>
                    <div className="flex gap-2">
                      <span className="text-xs font-mono font-bold text-amber-600">{comissaoConfig.ouroComissaoDireta}% Dir.</span>
                      <span className="text-xs font-mono font-bold text-indigo-600">+{comissaoConfig.ouroOverride}% Over</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="range" min="15" max="25" value={comissaoConfig.ouroComissaoDireta}
                      onChange={(e) => setComissaoConfig({...comissaoConfig, ouroComissaoDireta: Number(e.target.value)})}
                      className="w-full h-1.5 bg-amber-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <input 
                      type="range" min="2" max="8" value={comissaoConfig.ouroOverride}
                      onChange={(e) => setComissaoConfig({...comissaoConfig, ouroOverride: Number(e.target.value)})}
                      className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MARKETPLACE DE PARCEIROS HOMOLOGADOS */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Store className="text-indigo-600 w-5 h-5" />
                  <h3 className="font-bold text-base text-gray-900">Marketplace de Parceiros (Crédito Privado & Contábil)</h3>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase">
                  {parceiros.length} Parceiros
                </span>
              </div>

              <p className="text-xs text-gray-500">Fundos de investimento (FIDCs) credenciados e escritórios de contabilidade parceiros para receber os leads que necessitam de estruturação contábil ou limpeza tributária.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {parceiros.map(p => (
                  <div key={p.id} className="p-4 border border-gray-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                          p.tipo === 'credito_privado' ? 'bg-indigo-50 text-indigo-700' :
                          p.tipo === 'fintech' ? 'bg-purple-50 text-purple-700' :
                          p.tipo === 'fidc' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {p.tipo_label}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <Check className="w-3.5 h-3.5" /> {p.status}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-gray-800">{p.nome}</h5>
                      <p className="text-[10px] text-gray-500 mt-1">{p.detalhes}</p>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-4">
                      <span className="text-[9px] text-gray-400">Linha Ativa: {p.linha_ativa}</span>
                      <button className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer">Ver Relatório</button>
                    </div>
                  </div>
                ))}

                {/* Novo botão de Adicionar Parceiro */}
                <div 
                  onClick={() => setShowNovoParceiroModal(true)}
                  className="p-4 border border-dashed border-gray-200 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer hover:bg-slate-50/40 transition-colors"
                >
                  <Plus className="w-6 h-6 text-indigo-600 mb-1" />
                  <h5 className="font-bold text-xs text-slate-800">Adicionar Novo Parceiro</h5>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Credencie novos FIDCs ou escritórios contábeis.</p>
                </div>
              </div>
            </div>
          </div>

          {/* TERMINAL DE BANCO DE DADOS (SQL MIGRATION TOOL) */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 mt-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Settings className="text-indigo-400 w-5 h-5 animate-spin-slow" />
                <h3 className="font-mono font-bold text-sm text-slate-200">Terminal do Banco de Dados PostgreSQL — Transição para Crédito Privado</h3>
              </div>
              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-400 font-mono text-[10px] rounded border border-indigo-900">
                Status: Conectado (Porta 5432)
              </span>
            </div>

            <div className="flex gap-2 border-b border-slate-800 pb-3 flex-wrap">
              <button
                onClick={() => {
                  setTerminalTab('constraint');
                  setMigrationLog([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  terminalTab === 'constraint'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                1. Restrição CHECK (tipo)
              </button>
              <button
                onClick={() => {
                  setTerminalTab('function');
                  setMigrationLog([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  terminalTab === 'function'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                2. Função calcula_limite_credito()
              </button>
              <button
                onClick={() => {
                  setTerminalTab('commission');
                  setMigrationLog([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  terminalTab === 'commission'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                3. Bug do Split de Comissões
              </button>
              <button
                onClick={() => {
                  setTerminalTab('endpoint');
                  setMigrationLog([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  terminalTab === 'endpoint'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                4. Endpoint /simulacoes (API)
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {terminalTab === 'constraint' ? (
                <span>
                  Para formalizar a transição para crédito privado, rode o script de migração DDL abaixo para atualizar a restrição do campo <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">tipo</code> na tabela de parceiros financeiros.
                </span>
              ) : terminalTab === 'function' ? (
                <span>
                  Instale a função PL/pgSQL <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">calcula_limite_credito</code> no Postgres para garantir o cálculo cirúrgico do limite estimado com base no faturamento, gênero e respostas de crédito.
                </span>
              ) : terminalTab === 'commission' ? (
                <span>
                  Corrija o bug de atribuição incorreta no split de comissões da função <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">distribui_comissao_operacao</code>, adicionando a amarração obrigatória por <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">empresa_id</code>.
                </span>
              ) : (
                <span>
                  Simule o fluxo de backend do endpoint <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">POST /simulacoes</code> corrigido, contendo a validação crítica que evita falhas de roteamento ao indicar um parceiro no marketplace de crédito.
                </span>
              )}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Código SQL */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 relative overflow-x-auto max-h-[300px]">
                <div className="absolute right-3 top-3 text-[10px] text-slate-600 uppercase font-bold tracking-widest">PostgreSQL Script</div>
                {terminalTab === 'constraint' ? (
                  <pre className="whitespace-pre">
{`-- Remove a restrição antiga
ALTER TABLE parceiros_financeiros DROP CONSTRAINT parceiros_financeiros_tipo_check;

-- Adiciona a restrição atualizada contendo 'credito_privado'
ALTER TABLE parceiros_financeiros ADD CONSTRAINT parceiros_financeiros_tipo_check
CHECK (tipo IN ('banco', 'cooperativa', 'fidc', 'fintech', 'fundo_investimento', 'credito_privado'));`}
                  </pre>
                ) : terminalTab === 'function' ? (
                  <pre className="whitespace-pre">
{`CREATE OR REPLACE FUNCTION calcula_limite_credito(p_empresa_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_faturamento       NUMERIC;
    v_percentual_base   NUMERIC;
    v_multiplicador     NUMERIC := 1.0;
    v_simulacao_id      UUID; -- Variável para travar o registro exato
    v_respostas         JSONB;
    v_limite            NUMERIC;
BEGIN
    SELECT faturamento_anual,
           CASE WHEN admin_genero = 'feminino' OR empresa_liderada_mulher THEN 0.60
                ELSE 0.50 END
    INTO v_faturamento, v_percentual_base
    FROM empresas
    WHERE id = p_empresa_id;

    -- Pega o ID e o JSON de uma só vez de forma segura
    SELECT id, respostas_json INTO v_simulacao_id, v_respostas
    FROM simulacoes
    WHERE empresa_id = p_empresa_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_simulacao_id IS NULL THEN
        RETURN 0.00; -- Evita erro caso não exista simulação ativa
    END IF;

    IF (v_respostas ->> 'possui_conta_pj')::BOOLEAN IS TRUE THEN
        v_multiplicador := v_multiplicador + 0.05;
    END IF;

    IF (v_respostas ->> 'ja_contratou_pronampe')::BOOLEAN IS FALSE THEN
        v_multiplicador := v_multiplicador + 0.05;
    END IF;

    IF (v_respostas ->> 'possui_dividas_vencidas_90dias')::BOOLEAN IS TRUE THEN
        v_multiplicador := v_multiplicador - 0.10;
    END IF;

    v_limite := v_faturamento * v_percentual_base * v_multiplicador;

    -- Update cirúrgico direto na chave primária (ultra rápido)
    UPDATE simulacoes
    SET limite_estimado = ROUND(v_limite, 2)
    WHERE id = v_simulacao_id;

    RETURN ROUND(v_limite, 2);
END;
$$ LANGUAGE plpgsql;`}
                  </pre>
                ) : terminalTab === 'commission' ? (
                  <pre className="whitespace-pre">
{`CREATE OR REPLACE FUNCTION distribui_comissao_operacao(p_operacao_id UUID)
RETURNS VOID AS $$
DECLARE
    v_indicacao_id   UUID;
    v_empresa_id     UUID;
    v_afiliado_id    UUID;
    v_gestor_id      UUID;
    v_faixa          VARCHAR;
    v_valor_aprovado NUMERIC;
    v_percentual     NUMERIC;
BEGIN
    SELECT oc.afiliado_id, oc.valor_aprovado, oc.empresa_id
    INTO v_afiliado_id, v_valor_aprovado, v_empresa_id
    FROM operacoes_credito oc
    WHERE oc.id = p_operacao_id;

    IF v_afiliado_id IS NULL THEN
        RETURN;
    END IF;

    -- CORREÇÃO: Filtra obrigatoriamente pela empresa da operação atual
    SELECT id INTO v_indicacao_id
    FROM indicacoes
    WHERE afiliado_id = v_afiliado_id AND empresa_id = v_empresa_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_indicacao_id IS NULL THEN
        RETURN; -- Segurança se a indicação sumir do fluxo
    END IF;

    SELECT faixa_comissao, gestor_id INTO v_faixa, v_gestor_id
    FROM afiliados WHERE id = v_afiliado_id;

    v_percentual := percentual_por_faixa(v_faixa);

    -- Comissão do afiliado direto
    INSERT INTO comissoes_credito
        (indicacao_id, operacao_id, afiliado_id, beneficiario_tipo, percentual_aplicado, valor, status)
    VALUES
        (v_indicacao_id, p_operacao_id, v_afiliado_id, 'afiliado_direto',
         v_percentual, v_valor_aprovado * v_percentual, 'prevista');

    -- Bônus do gestor de time (override fixo em 1%)
    IF v_gestor_id IS NOT NULL THEN
        INSERT INTO comissoes_credito
            (indicacao_id, operacao_id, afiliado_id, beneficiario_tipo, percentual_aplicado, valor, status)
        VALUES
            (v_indicacao_id, p_operacao_id, v_gestor_id, 'gestor_time',
             0.01, v_valor_aprovado * 0.01, 'prevista');
    END IF;
END;
$$ LANGUAGE plpgsql;`}
                  </pre>
                ) : (
                  <pre className="whitespace-pre">
{`app.post('/simulacoes', autentica, async (req, res) => {
    const { empresa_id, respostas } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            \`INSERT INTO simulacoes (empresa_id, respostas_json)
             VALUES ($1, $2) RETURNING id\`,
            [empresa_id, respostas]
        );
        const simulacaoId = rows[0].id;

        for (const [tipo, valor] of Object.entries(respostas.sub_scores || {})) {
            await client.query(
                \`INSERT INTO scores_historico (empresa_id, tipo_score, valor, origem_evento)
                 VALUES ($1, $2, $3, 'simulacao_inicial')\`,
                [empresa_id, tipo, valor]
            );
        }

        const { rows: indiceRows } = await client.query('SELECT calcula_indice_bancabilidade($1) AS indice', [empresa_id]);
        const indice = indiceRows[0].indice;

        const { rows: tierRows } = await client.query('SELECT classifica_tier($1) AS tier', [indice]);
        const tier = tierRows[0].tier;

        const { rows: limiteRows } = await client.query('SELECT calcula_limite_credito($1) AS limite', [empresa_id]);
        const limite = limiteRows[0].limite;

        await client.query(
            'UPDATE simulacoes SET tier = $1, indice_bancabilidade = $2 WHERE id = $3',
            [tier, indice, simulacaoId]
        );

        // CORREÇÃO: Valida se o roteamento encontrou um parceiro ativo antes de fazer o INSERT
        if (tier === 'B') {
            const categoria = respostas.possui_dividas_receita_federal ? 'contabilidade' : 'juridico';
            
            const { rows: parceiroRows } = await client.query('SELECT roteia_melhor_parceiro($1) AS id', [categoria]);
            
            if (parceiroRows.length > 0 && parceiroRows[0].id !== null) {
                await client.query(
                    \`INSERT INTO indicacoes_marketplace (empresa_id, parceiro_id, categoria_id, status)
                     SELECT $1, $2, cs.id, 'indicado'
                     FROM categorias_servico cs WHERE cs.nome = $3\`,
                    [empresa_id, parceiroRows[0].id, categoria]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ simulacao_id: simulacaoId, indice_bancabilidade: indice, tier, limite_estimado: limite });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ erro: 'Falha ao processar simulação', detalhe: err.message });
    } finally {
        client.release();
    }
});`}
                  </pre>
                )}
              </div>

              {/* Console Interativo */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs flex flex-col justify-between min-h-[300px]">
                <div className="space-y-1 overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-slate-800">
                  {migrationLog.length === 0 ? (
                    <span className="text-slate-500">// Selecione o script e clique em "Executar Comando" para rodar...</span>
                  ) : (
                    migrationLog.map((log, index) => (
                      <div key={index} className={log.startsWith('✅') || log.startsWith('🚀') ? 'text-emerald-400' : log.startsWith('⚠️') ? 'text-amber-400' : 'text-slate-300'}>
                        {log}
                      </div>
                    ))
                  )}
                  {isMigrating && (
                    <div className="text-indigo-400 animate-pulse">▋ Executando comando...</div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center flex-wrap gap-2">
                  <span className="text-[10px] text-slate-500">Esquema de Banco: v2.4.4</span>
                  <button
                    onClick={handleRunSQLMigration}
                    disabled={isMigrating || (terminalTab === 'constraint' ? constraintSuccess : terminalTab === 'function' ? functionSuccess : terminalTab === 'commission' ? commissionSuccess : endpointSuccess)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      (terminalTab === 'constraint' ? constraintSuccess : terminalTab === 'function' ? functionSuccess : terminalTab === 'commission' ? commissionSuccess : endpointSuccess)
                        ? 'bg-emerald-600 text-white cursor-default'
                        : isMigrating
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    {(terminalTab === 'constraint' ? constraintSuccess : terminalTab === 'function' ? functionSuccess : terminalTab === 'commission' ? commissionSuccess : endpointSuccess) 
                      ? '✓ Executado com Sucesso!' 
                      : isMigrating 
                        ? 'Rodando...' 
                        : terminalTab === 'endpoint'
                          ? 'Testar Endpoint API'
                          : 'Executar Comando SQL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* 2. VISÃO UNIDADE (FRANQUEADOS)                           */}
      {/* ========================================================= */}
      {selectedRole === 'UNIDADE' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Painel Regional (Seu Estado)</span>
              <h4 className="text-2xl font-serif font-black text-indigo-950 mt-1">Região Sul & PR</h4>
              <p className="text-xs text-slate-400 mt-2">Você gerencia os leads qualificados gerados no Paraná e Santa Catarina.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Volume Regional Analisado</span>
                <span className="text-xl font-serif font-black text-slate-900 block mt-1">R$ 4.250.000,00</span>
                <span className="text-[10px] text-emerald-500 font-bold block mt-1">Aproveitamento: 68%</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart className="w-6 h-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Repasses & Splits da Unidade</span>
                <span className="text-xl font-serif font-black text-emerald-600 block mt-1">R$ 85.000,00</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">Split Regional Provisionado</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign className="w-6 h-6" /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-4">Performance da Equipe Regional de Vendas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[9px] tracking-widest bg-slate-50/50">
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Contatos WhatsApp (2h)</th>
                    <th className="py-3 px-4">Leads Convertidos</th>
                    <th className="py-3 px-4">Crédito Simulado</th>
                    <th className="py-3 px-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-800">Bruno Vendas GSA</td>
                    <td className="py-3 px-4">12 contatos rápidos</td>
                    <td className="py-3 px-4">4 Empresas (Tier A)</td>
                    <td className="py-3 px-4 font-mono">R$ 1.200.000,00</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 bg-green-50 text-green-600 font-bold rounded-md">Meta Batida</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-800">Juliana Machado</td>
                    <td className="py-3 px-4">8 contatos rápidos</td>
                    <td className="py-3 px-4">2 Empresas (Tier B)</td>
                    <td className="py-3 px-4 font-mono">R$ 950.000,00</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded-md">Em Progresso</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* 3. VISÃO GSA SOLUÇÕES (RECUPERADORA DE CRÉDITO)          */}
      {/* ========================================================= */}
      {selectedRole === 'RECUPERADORA' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-3xl flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-700 rounded-2xl shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-800">Fila de Análise Técnica Avançada - GSA Soluções</h4>
              <p className="text-xs text-amber-700 leading-relaxed mt-1">
                Abaixo estão listados os empresários que simularam crédito mas possuem restrições fiscais ou bancárias. O sistema gerou relatórios automáticos. Sua missão como Recuperadora de Crédito é reabilitar o CNPJ deles (saneamento cadastral e remoção de apontamentos abusivos) para o reingresso no crédito bancário.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leads.filter(l => l.tier === 'Tier B').map(lead => (
              <div key={lead.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-md uppercase">Tier B - Crítico</span>
                    <h4 className="font-bold text-sm mt-2 text-slate-800">{lead.empresa}</h4>
                    <p className="text-[10px] text-slate-400">{lead.cnpj}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-bold">Faturamento</span>
                    <span className="font-mono font-black text-xs text-slate-700">R$ {lead.faturamentoAnual.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-gray-100 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">Pendências Identificadas</p>
                  {lead.temDividasBancarias && (
                    <div className="flex items-center gap-1.5 text-red-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Dívidas Bancárias / Comercial (Subtraiu 30 pts)</span>
                    </div>
                  )}
                  {lead.temDividasImpostos && (
                    <div className="flex items-center gap-1.5 text-red-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Dívidas Federais sem CND (Subtraiu 40 pts)</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2 font-bold text-slate-700 text-[11px]">
                    <span>Score de Preparação Atual:</span>
                    <span className="text-red-500 font-mono">{lead.score} / 100 Pontos</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReabModal(lead)}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
                  >
                    <FileText className="w-3.5 h-3.5" /> Emitir Contrato de Reabilitação
                  </button>
                  <button
                    onClick={() => setShowBridgeModal(lead)}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-indigo-100"
                  >
                    <Zap className="w-3.5 h-3.5" /> Bridge FIDC
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* 4. VISÃO VENDEDOR (CRM INTELIGENTE & GSA RECOVERY)        */}
      {/* ========================================================= */}
      {selectedRole === 'VENDEDOR' && (() => {
        // Estatísticas rápidas de Temperatura
        const totalLeads = leads.length;
        const quentesCount = leads.filter(l => (l.score <= 100 ? l.score * 10 : l.score) >= 700).length;
        const mornosCount = leads.filter(l => {
          const s = l.score <= 100 ? l.score * 10 : l.score;
          return s >= 400 && s < 700;
        }).length;
        const friosCount = leads.filter(l => (l.score <= 100 ? l.score * 10 : l.score) < 400).length;

        const handleDownloadCRMExcel = () => {
          const headers = [
            "Empresa",
            "CNPJ",
            "Administrador",
            "Gênero",
            "Faturamento Anual (R$)",
            "Score Crédito (0-1000)",
            "Temperatura CRM",
            "Limite Bloqueado / Reverso (R$)",
            "Ação Prioritária Recomendada",
            "Roteamento de Conversão"
          ];

          const rows = leads.map(l => {
            const score1000 = l.score <= 100 ? l.score * 10 : l.score;
            let temp = "Frio 🔵";
            if (score1000 >= 700) temp = "Quente 🔥";
            else if (score1000 >= 400) temp = "Morno 🟡";

            const coef = l.generoAdmin === 'Mulher' ? 0.60 : 0.50;
            const limitePotencial = l.faturamentoAnual * coef;

            let acao = "Régua automática de reaquecimento comercial (Radar contínuo GSA)";
            let parceiro = "Radar Geral GSA";
            if (temp === "Quente 🔥") {
              acao = "Enviar propostas de leilão de taxas de juros (Múltiplos parceiros)";
              parceiro = "Apex Fundo, Horizon Securitizadora, Sicredi, Itaú";
            } else if (temp === "Morno 🟡") {
              if (l.temDividasImpostos) {
                acao = "Disparar link para Saneamento Fiscal e emissão expressa de CND";
                parceiro = "NTW Contabilidade S/A";
              } else if (l.temDividasBancarias) {
                acao = "Disparar link para representação de Limpeza de Nome Judicial";
                parceiro = "GSA Soluções (Recuperadora de crédito)";
              } else if (!l.possuiContabilidade) {
                acao = "Disparar link para elaboração expressa de Balanço/DRE";
                parceiro = "Aura Assessoria Contábil";
              }
            }

            return [
              l.empresa,
              l.cnpj,
              l.adminNome,
              l.generoAdmin,
              l.faturamentoAnual.toFixed(2),
              score1000,
              temp,
              limitePotencial.toFixed(2),
              acao,
              parceiro
            ];
          });

          const csvContent = [
            headers.join(";"),
            ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(";"))
          ].join("\n");

          const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", "crm_inteligente_leads.xlsx");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          alert("📊 Planilha 'crm_inteligente_leads.xlsx' gerada e baixada com sucesso no formato CSV/Excel!");
        };

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Cabeçalho CRM Inteligente */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-indigo-500/20">
                  CRM de Alta Conversão
                </span>
                <h3 className="font-serif font-black text-2xl text-white">
                  Matriz de Temperatura & GSA Recovery
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Inteligência comercial calibrada com ancoragem reversa (limite bloqueado por gênero) e direcionamento automático para marketplace de parceiros homologados.
                </p>
              </div>

              <button
                onClick={handleDownloadCRMExcel}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-4 h-4" /> Baixar Planilha CRM (crm_inteligente_leads.xlsx)
              </button>
            </div>

            {/* Grid de Estatísticas por Temperatura */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Leads Registrados</span>
                  <span className="text-2xl font-serif font-black text-slate-900 block mt-1">{totalLeads}</span>
                </div>
                <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Users className="w-5 h-5" /></div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider block">🔥 Quentes (Score ≥ 700)</span>
                  <span className="text-2xl font-serif font-black text-emerald-700 block mt-1">{quentesCount}</span>
                </div>
                <span className="text-xl">🔥</span>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider block">🟡 Mornos (Score 400-699)</span>
                  <span className="text-2xl font-serif font-black text-amber-700 block mt-1">{mornosCount}</span>
                </div>
                <span className="text-xl">🟡</span>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-blue-800 text-[10px] font-bold uppercase tracking-wider block">🔵 Frios (Score &lt; 400)</span>
                  <span className="text-2xl font-serif font-black text-blue-700 block mt-1">{friosCount}</span>
                </div>
                <span className="text-xl">🔵</span>
              </div>
            </div>

            {/* Listagem de Leads */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-sm text-gray-800">Fila Comercial Baseada em Temperatura</h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-black rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                  Roteamento Síncrono Ativo
                </span>
              </div>

              <div className="space-y-6">
                {leads.map(l => {
                  const score1000 = l.score <= 100 ? l.score * 10 : l.score;
                  const coef = l.generoAdmin === 'Mulher' ? 0.60 : 0.50;
                  const limitePotencialVal = l.faturamentoAnual * coef;
                  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                  // Temperatura & Cores
                  let tempLabel = 'Frio 🔵';
                  let tempBg = 'bg-blue-50 text-blue-700 border-blue-100';
                  let tempDesc = 'Leads inapto ou com pontuação muito baixa. Requer régua de aquecimento automática de conteúdo.';
                  if (score1000 >= 700) {
                    tempLabel = 'Quente 🔥';
                    tempBg = 'bg-red-50 text-red-700 border-red-100';
                    tempDesc = 'Empresa pronta para o Leilão Reverso de Taxas de Juros GSA Capital!';
                  } else if (score1000 >= 400) {
                    tempLabel = 'Morno 🟡';
                    tempBg = 'bg-amber-50 text-amber-700 border-amber-100';
                    tempDesc = 'Elegível para GSA Recovery. Possui pendências impeditivas, ideal para conversão secundária.';
                  }

                  // Configurações do serviço de Conversão para Morno/Frio
                  let servicoTitulo = '';
                  let servicoParceiro = '';
                  let servicoPreco = '';
                  let serviceKey = '';
                  if (score1000 < 700) {
                    if (l.temDividasImpostos) {
                      servicoTitulo = 'Saneamento Fiscal e emissão expressa de CND';
                      servicoParceiro = 'NTW Contabilidade S/A';
                      servicoPreco = 'R$ 1.250,00';
                      serviceKey = `impostos-${l.id}`;
                    } else if (l.temDividasBancarias) {
                      servicoTitulo = 'Limpeza de Nome Judicial & Bloqueio Abusivo';
                      servicoParceiro = 'GSA Soluções (Recuperadora de crédito)';
                      servicoPreco = 'R$ 2.400,00';
                      serviceKey = `bancos-${l.id}`;
                    } else if (!l.possuiContabilidade) {
                      servicoTitulo = 'Elaboração e consolidação de Balancete CRC';
                      servicoParceiro = 'Aura Assessoria Contábil';
                      servicoPreco = 'R$ 850,00';
                      serviceKey = `contabilidade-${l.id}`;
                    }
                  }

                  const handleAdquirirServico = () => {
                    setPurchasedServices(prev => ({ ...prev, [serviceKey]: true }));
                    alterarStatusLead(l.id, 'Análise Técnica');
                    alert(`🚀 Sucesso! O serviço de conversão '${servicoTitulo}' foi contratado pelo lead. Status alterado para Análise Técnica.`);
                  };

                  // WhatsApp customizado com gatilho de ancoragem reversa
                  const whatsText = `Olá ${l.adminNome}, tudo bem? Identifiquei aqui no GSA Recovery que você possui cerca de ${formatCurrency(limitePotencialVal)} bloqueados que só serão liberados se você agir hoje. As pendências fiscais/cadastrais estão travando seu limite. Vamos reabilitar seu CNPJ com nosso time homologado?`;
                  const whatsUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(whatsText)}`;

                  return (
                    <div key={l.id} className="p-5 border border-gray-100 hover:border-indigo-100 bg-slate-50/20 rounded-2xl flex flex-col lg:flex-row justify-between gap-5 transition-all shadow-sm">
                      
                      {/* Lado Esquerdo: Identificação & Ancoragem Reverso */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${tempBg}`}>
                            {tempLabel}
                          </span>
                          <h4 className="font-serif font-black text-base text-slate-900">{l.empresa}</h4>
                          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">CNPJ: {l.cnpj}</span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Administrador: <strong className="text-slate-700">{l.adminNome}</strong> ({l.generoAdmin}) | Faturamento Anual: <strong className="text-slate-700">{formatCurrency(l.faturamentoAnual)}</strong>
                        </p>

                        {/* ANCORAGEM REVERSA (Obrigatoriedade) */}
                        <div className="bg-amber-500/10 border border-amber-200/50 p-3.5 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                            <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>Gatilho de Impacto Financeiro Reverso Ativado</span>
                          </div>
                          <p className="text-amber-900 font-medium leading-relaxed italic">
                            &ldquo;Você não perdeu o crédito! Sua empresa tem <strong className="text-amber-700 font-black">{formatCurrency(limitePotencialVal)} bloqueados</strong> que só serão liberados se você agir.&rdquo;
                          </p>
                          <span className="text-[10px] text-amber-600 block">
                            Coeficiente de bancabilidade aplicado: <strong className="font-bold">{(coef * 100)}% ({l.generoAdmin})</strong>
                          </span>
                        </div>
                      </div>

                      {/* Lado Direito: Ações Baseadas na Temperatura */}
                      <div className="lg:w-80 flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5">
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Status & Recomendação</span>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-slate-600">Score de Crédito:</span>
                            <strong className="text-indigo-600 font-mono text-sm">{score1000} / 1000</strong>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-1">
                            {tempDesc}
                          </p>
                        </div>

                        {/* Bloco de Roteamento de Marketplace (Mornos/Frios que possuem pendências) */}
                        {score1000 < 700 && serviceKey && (
                          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                            <div className="flex justify-between items-start text-[10px]">
                              <span className="font-black text-indigo-900 uppercase">GSA Marketplace</span>
                              <span className="font-bold text-slate-600 font-mono">{servicoPreco}</span>
                            </div>
                            <div className="text-[11px]">
                              <span className="block font-bold text-slate-800 leading-tight">{servicoTitulo}</span>
                              <span className="text-[10px] text-slate-500">Parceiro: <strong className="text-slate-700">{servicoParceiro}</strong></span>
                            </div>

                            {purchasedServices[serviceKey] ? (
                              <div className="w-full bg-emerald-600 text-white font-bold text-center py-1.5 rounded-lg text-[10px] shadow-sm flex items-center justify-center gap-1 mt-1">
                                <CheckCircle className="w-3 h-3" /> Saneamento Ativado!
                              </div>
                            ) : (
                              <button
                                onClick={handleAdquirirServico}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center py-1.5 rounded-lg text-[10px] cursor-pointer transition-colors mt-1"
                              >
                                Contratar e Iniciar Saneamento
                              </button>
                            )}
                          </div>
                        )}

                        {/* Botões de Ação do Vendedor */}
                        <div className="flex gap-2">
                          <a
                            href={whatsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" /> WhatsApp de Impacto
                          </a>
                          
                          {score1000 >= 700 && (
                            <button
                              onClick={() => {
                                alert(`🚀 Leilão Reverso GSA Capital disparado! Enviamos a ficha cadastral de ${l.empresa} para os 14 fundos/bancos de crédito parceiros homologados.`);
                                alterarStatusLead(l.id, 'Aprovado');
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors border border-indigo-100 cursor-pointer"
                            >
                              🚀 Leilão de Taxas
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        );
      })()}

      {/* ========================================================= */}
      {/* 5. VISÃO AFILIADO (MARKETING MULTINÍVEL / REDE)           */}
      {/* ========================================================= */}
      {selectedRole === 'AFILIADO' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Quadro de Classificação do Afiliado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles className="w-24 h-24 text-amber-500" />
              </div>
              <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                Meu Ranking MLM
              </span>
              <h4 className="text-2xl font-serif font-black text-amber-800 mt-2">Nível Prata (Profissional)</h4>
              <p className="text-xs text-amber-700 mt-1">Faltam apenas 2 leads qualificados para subir para o nível Ouro!</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Membros na Rede</span>
              <span className="text-2xl font-serif font-black text-slate-800">14 Indicados diretos</span>
              <div className="flex justify-between items-center text-[10px] text-indigo-600 font-bold mt-2">
                <span>Override Ativo de 2% ⚡</span>
                <span className="underline cursor-pointer">Ver Árvore</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Comissão Acumulada</span>
              <span className="text-2xl font-serif font-black text-emerald-600">R$ 14.250,00</span>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                <span>Disponível para saque</span>
                <button className="text-emerald-600 font-bold underline cursor-pointer">Sacar Agora</button>
              </div>
            </div>
          </div>

          {/* Plano de Carreira & Distribuição de Recursos por Nível */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-wider">
                  Universidade GSA & Escalabilidade
                </span>
                <h3 className="font-serif font-black text-lg text-slate-900 mt-1">Plano de Carreira de Alta Performance</h3>
                <p className="text-xs text-slate-500">Conclua treinamentos e gere novos leads para destravar ferramentas avançadas de originação.</p>
              </div>

              {/* Seletor de Nível */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 w-full md:w-auto">
                <button
                  onClick={() => setSelectedLevelTab('bronze')}
                  className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedLevelTab === 'bronze' 
                      ? 'bg-amber-700 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Bronze (2%)
                </button>
                <button
                  onClick={() => setSelectedLevelTab('prata')}
                  className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedLevelTab === 'prata' 
                      ? 'bg-slate-400 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-slate-200" /> Prata (3%)
                </button>
                <button
                  onClick={() => setSelectedLevelTab('ouro')}
                  className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedLevelTab === 'ouro' 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-yellow-300 animate-pulse" /> Ouro (4%)
                </button>
              </div>
            </div>

            {/* Renderização do Nível Selecionado */}
            <AnimatePresence mode="wait">
              {selectedLevelTab === 'bronze' && (
                <motion.div
                  key="bronze"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4"
                >
                  <div className="bg-amber-900/5 border border-amber-900/10 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Status: Concluído ✓</span>
                      <h4 className="font-bold text-sm text-amber-900">Faixa Bronze — 2% de Comissão Base</h4>
                      <p className="text-xs text-amber-800/80">Liberado imediatamente para todos os novos afiliados cadastrados.</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                      Disponível
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Landing Page */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <Home className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Landing Page de Captação</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Sua página pública parametrizada para converter leads de forma 100% autônoma.
                        </p>
                      </div>
                      <button
                        onClick={() => alert("🌐 Abrindo visualização da sua Landing Page Exclusiva GSA em nova aba de simulação...")}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-2 rounded-xl cursor-pointer transition-all border border-slate-200/50 text-center"
                      >
                        Visualizar Landing Page
                      </button>
                    </div>

                    {/* Link Personalizado */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <Share2 className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Link Personalizado de Indicação</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Código identificador exclusivo de rastreamento para garantir sua comissão base de 2%.
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value="https://gsa-camara.com.br/solucoes?ref=atende_gsa"
                          className="flex-1 bg-white border border-gray-200 text-[10px] text-slate-600 rounded-xl px-2 outline-none font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('https://gsa-camara.com.br/solucoes?ref=atende_gsa');
                            alert('Link copiado com sucesso!');
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl cursor-pointer flex items-center justify-center shrink-0"
                          title="Copiar Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* QR Code de Captação */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">QR Code Automático</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Gere seu QR Code dinâmico para impressão em cartões, folhetos e materiais comerciais físicos.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-lg p-1 flex items-center justify-center">
                          <svg className="w-12 h-12 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3h6v6H3V3zM15 3h6v6h-6V3zM3 15h6v6H3v-6zM15 15h6v6h-6v-6zM7 7h.01M17 7h.01M7 17h.01M17 17h.01" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <button
                          onClick={() => alert("📱 QR Code gerado em alta definição! Baixando arquivo 'qrcode_gsa_afiliado.png'...")}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-2 rounded-xl cursor-pointer text-center"
                        >
                          Baixar QR Code PNG
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedLevelTab === 'prata' && (
                <motion.div
                  key="prata"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Status: Nível Atual ⭐ (Ativo)</span>
                      <h4 className="font-serif font-black text-sm text-white">Faixa Prata — 3% de Comissão Base</h4>
                      <p className="text-xs text-slate-300">Desbloqueado após concluir o treinamento básico e emitir o primeiro Certificado na Universidade GSA.</p>
                    </div>
                    <span className="bg-indigo-600/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                      Nível Ativo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Funil de Vendas */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-700">
                          <Activity className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Funil de Leads Ativos</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Acompanhamento visual simplificado de conversão do lead com anonimização total da LGPD.
                        </p>
                      </div>
                      
                      <div className="space-y-1 bg-white border border-slate-100 p-2.5 rounded-xl text-[9px] font-mono">
                        <div className="flex justify-between text-slate-600">
                          <span>Simulados:</span>
                          <strong className="text-indigo-600">3 leads</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Documentação:</span>
                          <strong className="text-amber-600">1 lead</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Aprovados:</span>
                          <strong className="text-emerald-600">1 lead</strong>
                        </div>
                      </div>
                    </div>

                    {/* Pipeline de Propostas */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-700">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Pipeline de Propostas</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Visualização cronológica e andamento de propostas com taxas de juros, FIDC, e prazos estimados.
                        </p>
                      </div>
                      <div className="bg-white border border-slate-100 p-2.5 rounded-xl space-y-1 text-[10px]">
                        <span className="text-slate-400 text-[8px] font-bold block uppercase tracking-wider">Última Proposta</span>
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Empresa M** S</span>
                          <span className="text-emerald-600 font-mono">R$ 1,2M</span>
                        </div>
                        <span className="text-slate-500 text-[9px]">FIDC Ativo em Análise de Taxa</span>
                      </div>
                    </div>

                    {/* Materiais de Prospecção */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Materiais de Prospecção</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Acesse apresentações profissionais, lâminas de crédito, e scripts prontos de venda para Whatsapp.
                        </p>
                      </div>
                      <button
                        onClick={() => alert("📁 Iniciando download do Kit Digital Faixa Prata contendo 4 Lâminas de Produto GSA Capital e Script Whatsapp!")}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar Kit Prata PDF
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedLevelTab === 'ouro' && (
                <motion.div
                  key="ouro"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4"
                >
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-100 tracking-wider">Status: Requer Performance ou Treinamento Avançado 🔒</span>
                      <h4 className="font-serif font-black text-sm text-white">Faixa Ouro — 4% de Comissão Base</h4>
                      <p className="text-xs text-amber-50">Sua comissão máxima. Destravado por performance técnica ou graduação avançada na Universidade GSA.</p>
                    </div>
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30 animate-pulse">
                      Bloqueado (Faltam 2 Leads)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    
                    {/* CRM Completo */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <Users className="w-4.5 h-4.5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">CRM de Leads Completo</h5>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Contatos em tempo real, regravações de call e integrações com Whatsapp nativo da Câmara.
                        </p>
                      </div>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 text-center py-1 rounded-md">🔒 Recurso Ouro</span>
                    </div>

                    {/* Carteira Otimizada */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <Briefcase className="w-4.5 h-4.5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Carteira Otimizada</h5>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Mapeamento automático de novas necessidades de crédito na sua base de clientes históricos.
                        </p>
                      </div>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 text-center py-1 rounded-md">🔒 Recurso Ouro</span>
                    </div>

                    {/* Agenda de Consultorias */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <Calendar className="w-4.5 h-4.5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Agenda Compartilhada</h5>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Agende reuniões tripartite compartilhadas com nossos especialistas para fechar leads com alta taxa de sucesso.
                        </p>
                      </div>
                      <button
                        onClick={() => alert("📅 Agenda Exclusiva Ouro: Selecione o dia no calendário para agendar sua reunião de originação corporativa...")}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold py-1.5 rounded-lg text-center cursor-pointer"
                      >
                        Ver Agenda de Mentoria
                      </button>
                    </div>

                    {/* Campanhas Exclusivas */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-800">Campanhas FINEP / SaaS</h5>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Participe das originações corporativas especiais e receba bônus residuais por indicação de SaaS GSA e FINEP.
                        </p>
                      </div>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 text-center py-1 rounded-md">🔒 Recurso Ouro</span>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* MINHA REDE & INDICAÇÕES */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Activity className="text-rose-600 w-5 h-5" />
                <h3 className="font-bold text-sm text-gray-800">Progresso de Indicações (Visão Blindada)</h3>
              </div>
              
              <p className="text-xs text-gray-500">
                Acompanhe o andamento dos seus indicados sem exposição de dados sensíveis da empresa ou valores de contabilidade privada.
              </p>

              <div className="space-y-3">
                {[
                  { iniciais: 'E** X', status: 'Documentação Pendente', cor: 'bg-red-50 text-red-600', estimativa: 'R$ 12.450,00' },
                  { iniciais: 'M** S', status: 'Análise Técnica', cor: 'bg-indigo-50 text-indigo-600', estimativa: 'R$ 36.120,00' },
                  { iniciais: 'C** D', status: 'Aprovado', cor: 'bg-emerald-50 text-emerald-700', estimativa: 'R$ 45.000,00' }
                ].map((ind, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50/50 border border-gray-100 rounded-2xl flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 block">Empresa {ind.iniciais}</span>
                        <span className="text-[10px] text-slate-400">Origem: Seu Link de Indicação</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold block mb-1 ${ind.cor}`}>{ind.status}</span>
                      <span className="text-[10px] text-slate-500">Comissão Prevista: <strong className="text-emerald-600 font-mono">{ind.estimativa}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KIT DE TRANSMISSÃO DINÂMICO */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Share2 className="text-rose-600 w-5 h-5" />
                <h3 className="font-bold text-sm text-gray-800">Kit de Transmissão & Links Rápidos</h3>
              </div>
              
              <p className="text-xs text-gray-500">
                Utilize seus links parametrizados com seu ID de afiliado para captar leads e automatizar a comissão na árvore multinível.
              </p>

              <div className="space-y-4 pt-2">
                
                {/* Link Principal */}
                <div className="p-4 bg-slate-50 border border-gray-100 rounded-2xl space-y-2">
                  <span className="font-bold text-slate-500 text-[10px] uppercase block tracking-wider">Seu Link de Captação Pública</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value="https://gsa-camara.com.br/solucoes?ref=atende_gsa" 
                      className="flex-1 bg-white border border-gray-200 text-xs text-slate-600 rounded-xl px-3 outline-none"
                    />
                    <button
                      onClick={() => handleCopiarLink('https://gsa-camara.com.br/solucoes?ref=atende_gsa', 'link-1')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs p-3 rounded-xl cursor-pointer flex items-center justify-center shrink-0"
                    >
                      {copiadoId === 'link-1' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Criativo Flyer de Marketing Dinâmico */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <BrainCircuit className="w-24 h-24" />
                  </div>
                  <div>
                    <h5 className="font-black text-xs text-indigo-400 uppercase tracking-widest">Flyer Digital de Captação</h5>
                    <p className="text-[10px] text-slate-400 mt-1">Gere um card visual de propaganda com seus dados de contato automáticos para mandar no WhatsApp.</p>
                  </div>

                  <div className="border border-slate-800 bg-slate-950 p-3 rounded-xl space-y-1.5 text-center">
                    <span className="text-[11px] font-serif font-black text-slate-200 block">GSA CÂMARA DE CRÉDITO</span>
                    <p className="text-[10px] text-indigo-400 font-bold">R$ 50.000 a R$ 5.000.000 liberados para empresas!</p>
                    <div className="border-t border-slate-900 my-1 pt-1 text-[8px] text-slate-500">
                      Indicado por: atende.gsa@gmail.com | Contato Imediato
                    </div>
                  </div>

                  <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Baixar Imagem / Criativo
                  </button>
                </div>

              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* 6. VISÃO EMPRESÁRIO (ÁREA DO CLIENTE GSA)                  */}
      {/* ========================================================= */}
      {selectedRole === 'EMPRESARIO' && (() => {
        const formatBRL = (val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Obter lead selecionado ou primeiro disponível
        const leadAtivo = leads.find(l => l.id === selectedEmpresarioId) || leads[0];

        // Se não houver leads no sistema
        if (!leadAtivo) {
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-serif font-black text-lg text-slate-800">Nenhuma Empresa Cadastrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não existem simulações registradas no sistema local ainda. Clique no botão <strong>"Nova Simulação de Crédito"</strong> no cabeçalho acima para iniciar sua primeira análise inteligente.
              </p>
            </motion.div>
          );
        }

        // Carregar documentos e solicitações com fallback seguro
        const docs = getLeadDocuments(leadAtivo);
        const solicitacoes = getLeadSolicitacoes(leadAtivo);

        // Ações locais do empresário
        const handleSimularUpload = (docKey: 'contratoSocial' | 'faturamento12m' | 'irpj' | 'cndFederal', docNome: string) => {
          const docsAtualizados = { ...docs };
          docsAtualizados[docKey] = {
            status: 'enviado' as const,
            nome: `${docNome.split('.')[0]}_enviado.pdf`,
            url: `/docs/${docKey}_enviado_${leadAtivo.id}.pdf`
          };

          // Se todos os documentos foram enviados, muda status de forma inteligente para 'Análise Técnica'
          const todosEnviados = Object.values(docsAtualizados).every((d: any) => d.status === 'enviado' || d.status === 'aprovado');
          const novoStatus = todosEnviados ? 'Análise Técnica' : leadAtivo.status;

          atualizarLeadCompleto(leadAtivo.id, {
            documentos: docsAtualizados,
            status: novoStatus as any
          });

          alert(`📤 Documento "${docNome}" enviado com sucesso em ambiente de simulação!`);
        };

        const handleSanarSolicitacao = (index: number) => {
          const novasSolicitacoes = [...solicitacoes];
          novasSolicitacoes.splice(index, 1);
          atualizarLeadCompleto(leadAtivo.id, {
            solicitacoesAgencia: novasSolicitacoes
          });
          alert('✅ Pendência marcada como sanada! A Agência de Crédito será notificada.');
        };

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Header do Cliente */}
            <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-indigo-600/10">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Painel do Empresário</span>
                <h2 className="font-serif font-black text-xl text-white">Central de Homologação de Crédito S/A</h2>
                <p className="text-xs text-cyan-100">Gerencie sua ficha de cadastro, acompanhe pendências e faça upload dos documentos obrigatórios.</p>
              </div>

              {/* Seletor de Empresa para simulação */}
              <div className="w-full md:w-64 bg-white/10 p-2.5 rounded-xl border border-white/20">
                <label className="text-[9px] font-black uppercase text-cyan-200 block mb-1">Selecionar Minha Empresa:</label>
                <select
                  value={leadAtivo.id}
                  onChange={(e) => setSelectedEmpresarioId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-1.5 rounded border border-white/10 outline-none cursor-pointer"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.empresa} ({l.cnpj})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Coluna da Esquerda: Ficha Cadastral & Status */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Ficha de Cadastro Card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Building2 className="text-cyan-600 w-5 h-5" />
                    <h3 className="font-bold text-sm text-gray-800">Ficha de Cadastro</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-gray-400">Razão Social:</span>
                      <strong className="text-slate-800 text-right">{leadAtivo.empresa}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-gray-400">CNPJ:</span>
                      <strong className="text-slate-800 font-mono">{leadAtivo.cnpj}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-gray-400">Administrador:</span>
                      <strong className="text-slate-800">{leadAtivo.adminNome} ({leadAtivo.generoAdmin})</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-gray-400">Faturamento Anual:</span>
                      <strong className="text-slate-800 font-mono">{formatBRL(leadAtivo.faturamentoAnual)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-gray-400">Tempo de Atividade:</span>
                      <strong className="text-slate-800 font-mono">{leadAtivo.tempoConstituicao} Meses</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Score GSA Intelligence:</span>
                      <strong className="text-indigo-600 font-mono">{leadAtivo.score} Pontos ({leadAtivo.tier})</strong>
                    </div>
                  </div>

                  {/* Limite Financeiro Reverso/Disponível */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      {leadAtivo.tier === 'Tier A' ? 'Limite Disponível' : 'Crédito Bloqueado (Impacto Reverso)'}
                    </span>
                    <div className="text-xl font-mono font-black text-slate-800">
                      {formatBRL(leadAtivo.limiteEstimado)}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      {leadAtivo.tier === 'Tier A' 
                        ? 'Excelente perfil de bancabilidade! Suas propostas estão prontas para o leilão de taxas.'
                        : 'Você não perdeu o crédito! Este limite de faturamento está retido até que as pendências sejam resolvidas.'}
                    </p>
                  </div>
                </div>

                {/* Status da Operação Visual Stepper */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Activity className="text-cyan-600 w-5 h-5" />
                    <h3 className="font-bold text-sm text-gray-800">Progresso da Operação</h3>
                  </div>

                  <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 ml-3 py-1">
                    {[
                      { key: 'Simulado', label: 'Simulação Inicial Concluída', desc: 'Dados coletados via GSA Intelligence.', active: true },
                      { key: 'Documentação Pendente', label: 'Documentação Pendente', desc: 'Aguardando o envio dos arquivos listados.', active: leadAtivo.status !== 'Simulado' },
                      { key: 'Análise Técnica', label: 'Análise Técnica na Agência', desc: 'A agência parceira analisa os dados fornecidos.', active: ['Análise Técnica', 'Aprovado', 'Pago'].includes(leadAtivo.status) },
                      { key: 'Aprovado', label: 'Crédito Homologado (GSA Capital)', desc: 'Leilão reverso de taxas e propostas campeãs.', active: ['Aprovado', 'Pago'].includes(leadAtivo.status) },
                      { key: 'Pago', label: 'Recurso Liquidado / Pago', desc: 'Transferência final efetuada para a conta da empresa.', active: leadAtivo.status === 'Pago' }
                    ].map((step, idx) => {
                      const isCurrent = leadAtivo.status === step.key;
                      return (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            isCurrent 
                              ? 'border-cyan-600 text-cyan-600 scale-125' 
                              : (step.active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-300')
                          }`}>
                            {step.active && !isCurrent ? <Check className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                          <div>
                            <span className={`text-xs font-bold block ${isCurrent ? 'text-cyan-600' : (step.active ? 'text-slate-800' : 'text-slate-400')}`}>
                              {step.label}
                            </span>
                            <span className="text-[10px] text-slate-400 leading-normal block">{step.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Coluna da Direita (Central de Upload e Pendências) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Central de Documentações */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="text-cyan-600 w-5 h-5" />
                      <h3 className="font-bold text-sm text-gray-800">Central de Envio de Documentação</h3>
                    </div>
                    <span className="px-2.5 py-1 bg-cyan-50 border border-cyan-100 text-cyan-700 font-bold text-[10px] rounded-full uppercase tracking-wider">
                      Assinatura Digital Ativada
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-normal">
                    Para habilitar o envio da sua ficha às principais cooperativas, bancos parceiros e FIDCs, faça o upload dos 4 arquivos abaixo. Caso prefira, você pode simular o envio clicando em <strong>"Simular Envio"</strong> em cada linha.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'contratoSocial' as const, label: 'Contrato Social Consolidado', desc: 'Última alteração contratual devidamente registrada na Junta.', template: 'contrato_social.pdf' },
                      { key: 'faturamento12m' as const, label: 'Declaração de Faturamento (12m)', desc: 'Extrato ou declaração contábil assinada pelo contador responsável.', template: 'faturamento_12meses.pdf' },
                      { key: 'irpj' as const, label: 'Declaração IRPJ Completa', desc: 'Declaração anual do imposto de renda da pessoa jurídica.', template: 'declaracao_irpj.pdf' },
                      { key: 'cndFederal' as const, label: 'CND Tributos Federais', desc: 'Certidão Negativa de Débitos Federais atualizada.', template: 'cnd_federal.pdf' }
                    ].map((doc, idx) => {
                      const docStatus = docs[doc.key];
                      const isPending = docStatus.status === 'pendente';
                      const isSent = docStatus.status === 'enviado';
                      const isApproved = docStatus.status === 'aprovado';

                      return (
                        <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-3 hover:border-slate-200 transition-colors">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-xs text-slate-800 leading-tight block">{doc.label}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                isApproved 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : (isSent ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600')
                              }`}>
                                {isApproved ? 'Aprovado' : (isSent ? 'Enviado' : 'Pendente')}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">{doc.desc}</p>
                          </div>

                          {isPending ? (
                            <button
                              onClick={() => handleSimularUpload(doc.key, doc.template)}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <UploadCloud className="w-3.5 h-3.5" /> Simular Envio de Arquivo
                            </button>
                          ) : (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-100 truncate">
                                <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{docStatus.nome}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setDocumentoPreview({
                                    empresa: leadAtivo.empresa,
                                    documentoNome: docStatus.nome,
                                    tipo: doc.label,
                                    status: docStatus.status,
                                    dataUpload: 'Carregado via painel do empresário'
                                  })}
                                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px] py-1 rounded-md text-center cursor-pointer"
                                >
                                  Pré-visualizar
                                </button>
                                <button
                                  onClick={() => {
                                    const mockData = { empresa: leadAtivo.empresa, documento: doc.label, status: docStatus.status };
                                    const blob = new Blob([JSON.stringify(mockData)], { type: 'application/pdf' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = docStatus.nome;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1 rounded-md cursor-pointer flex items-center justify-center"
                                  title="Baixar Arquivo"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pendências e Solicitações Adicionais da Agência */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <MessageSquare className="text-cyan-600 w-5 h-5" />
                    <h3 className="font-bold text-sm text-gray-800">Solicitações de Ajuste (Câmara de Crédito GSA)</h3>
                  </div>

                  <p className="text-xs text-gray-500">
                    Sua documentação e ficha cadastral são auditadas em tempo real. Caso nossos especialistas parceiros apontem inconformidades, elas serão listadas abaixo para resolução imediata.
                  </p>

                  {solicitacoes.length === 0 ? (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">Nenhuma pendência ativa!</span>
                        <span className="text-[10px] text-emerald-600/90 leading-tight block">Tudo certo com o seu cadastro. Aguarde o andamento da análise técnica ou as propostas.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {solicitacoes.map((sol, index) => (
                        <div key={index} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-slate-800">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Solicitação #{index + 1}</strong>
                              <span className="text-slate-600 mt-1 block">{sol}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleSanarSolicitacao(index)}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                          >
                            <Check className="w-3 h-3" /> Marcar como Resolvido
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </motion.div>
        );
      })()}

      {/* ========================================================= */}
      {/* 7. VISÃO AGÊNCIA DE CRÉDITO (HOMOLOGAÇÃO & OPERAÇÕES)      */}
      {/* ========================================================= */}
      {selectedRole === 'AGENCIA' && (() => {
        const formatBRL = (val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Lead ativo na agência
        const leadAgencia = leads.find(l => l.id === selectedAgenciaLeadId) || leads[0];

        // Estatísticas para a agência
        const totalSimulado = leads.filter(l => l.status === 'Simulado').length;
        const totalPendencias = leads.filter(l => l.status === 'Documentação Pendente').length;
        const totalOperacoes = leads.filter(l => ['Análise Técnica', 'Aprovado', 'Pago'].includes(l.status)).length;

        const handleIncluirSolicitacao = (leadId: string) => {
          if (!novaSolicitacaoTxt.trim()) {
            alert('Por favor, digite o teor da solicitação/pendência.');
            return;
          }

          const l = leads.find(lead => lead.id === leadId);
          if (!l) return;

          const atuais = l.solicitacoesAgencia || getLeadSolicitacoes(l);
          const novas = [...atuais, novaSolicitacaoTxt.trim()];

          atualizarLeadCompleto(leadId, {
            solicitacoesAgencia: novas,
            status: 'Documentação Pendente' // Mudar status automaticamente se uma pendência foi aberta
          });

          setNovaSolicitacaoTxt('');
          alert('📥 Pendência registrada com sucesso! O status da empresa mudou para "Documentação Pendente".');
        };

        const handleAprovarDocumentoAgencia = (leadId: string, docKey: 'contratoSocial' | 'faturamento12m' | 'irpj' | 'cndFederal') => {
          const l = leads.find(lead => lead.id === leadId);
          if (!l) return;

          const docsAtuais = l.documentos || getLeadDocuments(l);
          const docsNovos = { ...docsAtuais };
          docsNovos[docKey] = {
            ...docsNovos[docKey],
            status: 'aprovado' as const
          };

          // Se todos os documentos forem aprovados, pode sugerir mudar para "Aprovado" ou manter status
          atualizarLeadCompleto(leadId, {
            documentos: docsNovos
          });

          alert('✅ Documento validado e aprovado com sucesso!');
        };

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Header de Operações da Agência */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-violet-600/10">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-200">Visão Operacional de Distribuição</span>
                <h2 className="font-serif font-black text-xl text-white">Painel Geral da Agência de Crédito GSA</h2>
                <p className="text-xs text-violet-100">Distribua propostas comerciais, audite faturamento/constituição e emita pareceres técnicos de homologação.</p>
              </div>

              {/* Contadores da Agência */}
              <div className="flex gap-3 text-center shrink-0">
                <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/15">
                  <span className="text-[9px] text-violet-200 uppercase font-black block">Fila Simulado</span>
                  <strong className="text-base text-white block">{totalSimulado}</strong>
                </div>
                <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/15">
                  <span className="text-[9px] text-violet-200 uppercase font-black block">Pendentes</span>
                  <strong className="text-base text-amber-300 block">{totalPendencias}</strong>
                </div>
                <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/15">
                  <span className="text-[9px] text-violet-200 uppercase font-black block">Operações</span>
                  <strong className="text-base text-emerald-300 block">{totalOperacoes}</strong>
                </div>
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-serif font-black text-slate-800">Nenhum lead recebido</h4>
                <p className="text-xs text-slate-500">Sem registros locais para gerenciar no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Lista de Leads (Esquerda) - 5 Colunas */}
                <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-sm text-gray-800">Fila de Empresas Recebidas</h3>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {leads.length} Cadastros
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {leads.map(l => {
                      const isActive = leadAgencia && leadAgencia.id === l.id;
                      const lDocs = getLeadDocuments(l);
                      const aprovados = Object.values(lDocs).filter((d: any) => d.status === 'aprovado').length;
                      const totalDocs = Object.values(lDocs).length;

                      let statusCor = 'bg-slate-50 text-slate-600 border-slate-100';
                      if (l.status === 'Documentação Pendente') statusCor = 'bg-red-50 text-red-700 border-red-100';
                      else if (l.status === 'Análise Técnica') statusCor = 'bg-blue-50 text-blue-700 border-blue-100';
                      else if (l.status === 'Aprovado') statusCor = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                      else if (l.status === 'Pago') statusCor = 'bg-emerald-50 text-emerald-700 border-emerald-100';

                      return (
                        <div
                          key={l.id}
                          onClick={() => setSelectedAgenciaLeadId(l.id)}
                          className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                            isActive 
                              ? 'border-violet-600 bg-violet-50/20 shadow-sm' 
                              : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <strong className="text-slate-800 font-bold block truncate max-w-[180px]">{l.empresa}</strong>
                              <span className="text-[10px] text-slate-400 block font-mono">{l.cnpj}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusCor}`}>
                              {l.status}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100/50">
                            <span>Score: <strong className="text-slate-700">{l.score} ({l.tier})</strong></span>
                            <span>Documentação: <strong className="text-indigo-600 font-mono">{aprovados}/{totalDocs}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalhe do Lead (Direita) - 7 Colunas */}
                <div className="lg:col-span-7 space-y-6">
                  {leadAgencia ? (() => {
                    const lDocs = getLeadDocuments(leadAgencia);
                    const lSolicitacoes = getLeadSolicitacoes(leadAgencia);

                    return (
                      <div className="space-y-6">
                        
                        {/* Painel de Gestão e Operações de Crédito */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-800">Ficha Cadastral: <span className="text-indigo-600">{leadAgencia.empresa}</span></h3>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {leadAgencia.id.substring(0, 8)}...</span>
                          </div>

                          {/* Grid Cadastral Impresso */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Empresa</span>
                              <strong className="text-slate-800 block mt-0.5">{leadAgencia.empresa}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">CNPJ</span>
                              <strong className="text-slate-800 block mt-0.5 font-mono">{leadAgencia.cnpj}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Administrador</span>
                              <strong className="text-slate-800 block mt-0.5">{leadAgencia.adminNome}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Faturamento Declarado</span>
                              <strong className="text-slate-800 block mt-0.5 font-mono">{formatBRL(leadAgencia.faturamentoAnual)}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Tempo Constituição</span>
                              <strong className="text-slate-800 block mt-0.5">{leadAgencia.tempoConstituicao} Meses</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider">Limite Calculado</span>
                              <strong className="text-indigo-600 block mt-0.5 font-mono font-black">{formatBRL(leadAgencia.limiteEstimado)}</strong>
                            </div>
                          </div>

                          {/* Alteração Rápida de Status (Simulações e Operações de Crédito) */}
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Controle e Mudança de Status da Operação:</span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { status: 'Simulado', label: '📊 Simulado', bg: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
                                { status: 'Documentação Pendente', label: '❌ Documentação Pendente', bg: 'bg-red-50 text-red-700 hover:bg-red-100' },
                                { status: 'Análise Técnica', label: '🔍 Análise Técnica', bg: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                                { status: 'Aprovado', label: '🚀 Aprovado (Leilão)', bg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                                { status: 'Pago', label: '💰 Pago / Liquidado', bg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                                { status: 'Limpeza de Nome Ativada', label: '⚖️ GSA Recovery', bg: 'bg-amber-50 text-amber-700 hover:bg-amber-100' }
                              ].map(st => {
                                const isCurrent = leadAgencia.status === st.status;
                                return (
                                  <button
                                    key={st.status}
                                    onClick={() => {
                                      alterarStatusLead(leadAgencia.id, st.status as any);
                                      alert(`Status de "${leadAgencia.empresa}" alterado para "${st.status}"!`);
                                    }}
                                    className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                                      isCurrent 
                                        ? 'bg-slate-900 text-white shadow' 
                                        : st.bg
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Auditar Documentação Recebida e Pendente */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                            <ClipboardList className="text-violet-600 w-5 h-5" />
                            <h3 className="font-bold text-sm text-gray-800">Validação e Auditoria de Documentos</h3>
                          </div>

                          <p className="text-xs text-gray-500">
                            Revise abaixo as peças enviadas pelo cliente. Aprove os arquivos individualmente ou gere relatórios de solicitação de pendência caso faltem dados.
                          </p>

                          <div className="space-y-3">
                            {[
                              { key: 'contratoSocial' as const, label: 'Contrato Social Consolidado' },
                              { key: 'faturamento12m' as const, label: 'Declaração de Faturamento (12m)' },
                              { key: 'irpj' as const, label: 'Declaração IRPJ Completa' },
                              { key: 'cndFederal' as const, label: 'CND Tributos Federais' }
                            ].map((doc, index) => {
                              const dObj = lDocs[doc.key];
                              const isPending = dObj.status === 'pendente';
                              const isSent = dObj.status === 'enviado';
                              const isApproved = dObj.status === 'aprovado';

                              return (
                                <div key={index} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                                  <div className="space-y-0.5">
                                    <strong className="block font-bold text-slate-800">{doc.label}</strong>
                                    {isPending ? (
                                      <span className="text-[10px] text-red-600 font-bold block">❌ DOCUMENTO FALTANTE</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[280px]">{dObj.nome}</span>
                                    )}
                                  </div>

                                  <div className="flex gap-2 shrink-0">
                                    {!isPending && (
                                      <>
                                        {isSent && (
                                          <button
                                            onClick={() => handleAprovarDocumentoAgencia(leadAgencia.id, doc.key)}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] py-1 px-2.5 rounded cursor-pointer"
                                          >
                                            Aprovar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => setDocumentoPreview({
                                            empresa: leadAgencia.empresa,
                                            documentoNome: dObj.nome,
                                            tipo: doc.label,
                                            status: dObj.status,
                                            dataUpload: 'Homologado via auditoria'
                                          })}
                                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px] py-1 px-2.5 rounded cursor-pointer"
                                        >
                                          Pré-visualizar
                                        </button>
                                        <button
                                          onClick={() => {
                                            const mockData = { empresa: leadAgencia.empresa, documento: doc.label, status: dObj.status };
                                            const blob = new Blob([JSON.stringify(mockData)], { type: 'application/pdf' });
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = dObj.nome;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                          }}
                                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded cursor-pointer"
                                          title="Baixar PDF original"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}

                                    {isPending && (
                                      <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 font-bold py-1 px-2.5 rounded block">
                                        Pendente de Envio
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Solicitações por Andamento (Incluir Pendência) */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                            <MessageSquare className="text-violet-600 w-5 h-5" />
                            <h3 className="font-bold text-sm text-gray-800">Solicitações no Andamento da Operação</h3>
                          </div>

                          <p className="text-xs text-gray-500">
                            Adicione novas exigências de crédito específicas para esta empresa. Elas aparecerão instantaneamente no painel do <strong>Empresário</strong>.
                          </p>

                          {/* Lista das pendências vigentes */}
                          {lSolicitacoes.length > 0 && (
                            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider mb-2">Pendências Ativas:</span>
                              {lSolicitacoes.map((sol, idx) => (
                                <div key={idx} className="flex gap-2 items-start text-xs text-slate-700 font-medium">
                                  <span className="w-4 h-4 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{sol}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Formulário para adicionar pendência */}
                          <div className="space-y-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Descrição da Pendência Contábil, Fiscal ou Jurídica:</label>
                              <textarea
                                rows={2}
                                value={novaSolicitacaoTxt}
                                onChange={(e) => setNovaSolicitacaoTxt(e.target.value)}
                                placeholder="Ex: Necessário providenciar balancete assinado pelo contador ou Guia de Parcelamento consolidada..."
                                className="w-full border border-gray-200 text-xs px-3 py-2.5 rounded-xl outline-none focus:border-violet-500"
                              />
                            </div>

                            <button
                              onClick={() => handleIncluirSolicitacao(leadAgencia.id)}
                              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-violet-600/10"
                            >
                              <Plus className="w-4 h-4" /> Incluir Exigência no Andamento
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                      <p className="text-xs text-slate-500">Selecione uma empresa na coluna da esquerda para gerenciar.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

          </motion.div>
        );
      })()}

      {/* Pré-visualizador de Documentos PDF no Sistema (Modal de Alta Fidelidade) */}
      {documentoPreview && (() => {
        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[11000] animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setDocumentoPreview(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                <FileText className="text-indigo-600 w-8 h-8" />
                <div>
                  <h3 className="font-serif font-black text-xl text-gray-900">Pré-visualização de Documento</h3>
                  <p className="text-xs text-slate-500">GSA Câmara de Crédito &amp; Homologação Digital</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 text-xs text-slate-800 relative font-mono overflow-hidden">
                {/* Tarja de Documento Oficial */}
                <div className="absolute top-0 right-0 bg-indigo-600 text-white font-black text-[9px] px-3 py-1 rounded-bl-xl tracking-widest uppercase shadow">
                  HOMOLOGADO DIGITALMENTE
                </div>

                <div className="text-center space-y-1 pb-4 border-b border-slate-200">
                  <span className="text-xs font-black text-slate-900 block uppercase tracking-wider">REPÚBLICA FEDERATIVA DO BRASIL</span>
                  <span className="text-[10px] text-slate-500 block">MINISTÉRIO DA FAZENDA | RECEITA FEDERAL</span>
                  <span className="text-[10px] font-bold text-slate-800 block uppercase mt-2">CERTIFICADO E COMPROVAÇÃO DE ORIGINAÇÃO DE CRÉDITO</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">EMPRESA CONSULTADA</span>
                    <span className="font-sans font-black text-slate-900 block mt-0.5">{documentoPreview.empresa}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">TIPO DE ARQUIVO</span>
                    <span className="font-sans font-black text-indigo-600 block mt-0.5">{documentoPreview.tipo}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">NOME DO ARQUIVO</span>
                    <span className="text-[10px] text-slate-700 block truncate mt-0.5">{documentoPreview.documentoNome}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">DATA DE REGISTRO</span>
                    <span className="text-[10px] text-slate-700 block mt-0.5">{documentoPreview.dataUpload || 'Processado síncronamente pela plataforma'}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-4 rounded-xl space-y-3">
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">CONTEÚDO SIMULADO</span>
                  <p className="font-sans text-slate-600 leading-relaxed">
                    Este arquivo simula de forma fidedigna a estrutura de dados necessária para a originação de recursos e limites junto ao FIDC de Crédito Privado e Bancos Homologados GSA.
                  </p>
                  <div className="flex items-center gap-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/30 text-indigo-800 font-sans">
                    <CheckCircle className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span className="text-[10px]">Chave Digital de Verificação: <strong className="font-mono">sha256: {Math.random().toString(16).substring(2, 10).toUpperCase()}...</strong></span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-4 border-t border-slate-200">
                  <span className="text-slate-400">Status de Validação: <strong className="text-emerald-600 uppercase font-bold">{documentoPreview.status}</strong></span>
                  <span className="text-slate-400">GSA Soluções S.A. © 2026</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setDocumentoPreview(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-5 rounded-xl cursor-pointer"
                >
                  Fechar Visualizador
                </button>
                <button 
                  onClick={() => {
                    const mockData = { empresa: documentoPreview.empresa, documento: documentoPreview.tipo, status: documentoPreview.status };
                    const blob = new Blob([JSON.stringify(mockData)], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = documentoPreview.documentoNome;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    alert(`📥 Baixando arquivo simulado: ${documentoPreview.documentoNome}`);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar PDF Original
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* LISTA GERAL DE LEADS ATIVOS (PESQUISA / TABELA PRINCIPAL)  */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Monitor de Leads Qualificados</h3>
            <p className="text-xs text-gray-500">Base centralizada de simulações, scores e classificação do ecossistema.</p>
          </div>
          
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar por Empresa, CNPJ ou Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 text-xs px-4 py-3 rounded-xl outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[9px] tracking-widest bg-slate-50/50">
                <th className="py-3 px-4">Empresa / CNPJ</th>
                <th className="py-3 px-4">Administrador / Gênero</th>
                <th className="py-3 px-4">Tempo</th>
                <th className="py-3 px-4">Faturamento Anual</th>
                <th className="py-3 px-4">Limite Estimado</th>
                <th className="py-3 px-4">Score / Classificação</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {leadsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">Nenhum lead encontrado com estes filtros.</td>
                </tr>
              ) : (
                leadsFiltrados.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800 block text-xs">{lead.empresa}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{lead.cnpj}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <span className="block text-xs">{lead.adminNome}</span>
                      <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{lead.generoAdmin}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600">{lead.tempoConstituicao} Meses</td>
                    <td className="py-4 px-4 font-mono text-slate-600">
                      R$ {lead.faturamentoAnual.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-indigo-600">
                      R$ {lead.limiteEstimado.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${lead.score >= 100 ? 'bg-green-500' : lead.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className="font-bold text-slate-700">{lead.score} pts</span>
                      </div>
                      <span className={`text-[9px] font-bold block mt-1 ${
                        lead.tier === 'Tier A' ? 'text-green-600' : lead.tier === 'Tier B' ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {lead.tier}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => alterarStatusLead(lead.id, e.target.value as any)}
                        className="bg-slate-50 border border-gray-100 rounded px-2 py-1 text-[10px] font-bold outline-none cursor-pointer"
                      >
                        <option value="Simulado">Simulado</option>
                        <option value="Documentação Pendente">Documentação Pendente</option>
                        <option value="Análise Técnica">Análise Técnica</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Pago">Pago</option>
                        <option value="Limpeza de Nome Ativada">Limpeza de Nome Ativada</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {lead.tier === 'Tier B' && (
                        <button
                          onClick={() => setShowReabModal(lead)}
                          title="Gerar Contrato de Reabilitação de Nome"
                          className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg cursor-pointer inline-block"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowBridgeModal(lead)}
                        title="Ver Ativação Bridge"
                        className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg cursor-pointer inline-block"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setCurrentLeadId(lead.id);
                          alert(`✓ Sessão ativa vinculada à empresa: ${lead.empresa}!`);
                        }}
                        title="Vincular à Sessão Ativa (Para compartilhamento de Ficha/Checklist)"
                        className={`p-1.5 rounded-lg cursor-pointer inline-block transition-colors ${
                          currentLeadId === lead.id 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => excluirLead(lead.id)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer inline-block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL / SIMULADOR DE CRÉDITO INTERATIVO                  */}
      {/* ========================================================= */}
      {showSimuladorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in overflow-y-auto">
          <CreditoSimuladorPremium onClose={() => setShowSimuladorModal(false)} />
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL / FICHA DE ENTREVISTA DE CRÉDITO                   */}
      {/* ========================================================= */}
      {showEntrevistaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] overflow-y-auto">
          <EntrevistaCreditoView onClose={() => setShowEntrevistaModal(false)} />
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL / CHECKLIST DE DOCUMENTOS PREMIUM                  */}
      {/* ========================================================= */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] overflow-y-auto">
          <ChecklistCreditoPremium onClose={() => setShowChecklistModal(false)} />
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE EMISSÃO DE CONTRATO DE REABILITAÇÃO (ADVOGADO) */}
      {/* ========================================================= */}
      {showReabModal && (() => {
        const coef = showReabModal.generoAdmin === 'Mulher' ? 0.60 : 0.50;
        const limitePotencialVal = showReabModal.faturamentoAnual * coef;
        const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto"
            >
              <button 
                onClick={() => {
                  setShowReabModal(null);
                  setRecoveryActiveTab('funil');
                }}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer z-10"
              >
                <XCircle className="w-6 h-6" />
              </button>

              {/* Cabeçalho GSA Recovery */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl animate-pulse">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                      GSA Recovery System
                    </span>
                    <h3 className="font-serif font-black text-2xl text-gray-900 mt-1">
                      Mecanismo de Recuperação Monetária & Conversão
                    </h3>
                  </div>
                </div>

                {/* Tab Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setRecoveryActiveTab('funil')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      recoveryActiveTab === 'funil' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎯 Funil de Conversão
                  </button>
                  <button
                    onClick={() => setRecoveryActiveTab('contrato')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      recoveryActiveTab === 'contrato' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ✍️ Contrato
                  </button>
                  <button
                    onClick={() => setRecoveryActiveTab('procuracao')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      recoveryActiveTab === 'procuracao' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📜 Procuração
                  </button>
                </div>
              </div>

              {recoveryActiveTab === 'funil' ? (
                <div className="space-y-6">
                  {/* STEPPER VISUAL DA OPERAÇÃO SÍNCRONA */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-[10px]">1</span>
                        <div>
                          <strong className="text-slate-800 block">Simulação Negada</strong>
                          <span className="text-[10px] text-red-500 font-semibold">Tier B (Com Restrições)</span>
                        </div>
                      </div>

                      <div className="hidden md:block text-slate-300">➔</div>

                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-[10px] animate-pulse">2</span>
                        <div>
                          <strong className="text-slate-800 block">GSA Recovery Injetado</strong>
                          <span className="text-[10px] text-purple-600 font-semibold">Sincronização Ativa</span>
                        </div>
                      </div>

                      <div className="hidden md:block text-slate-300">➔</div>

                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px]">3</span>
                        <div>
                          <strong className="text-slate-800 block">Ancoragem Reversa</strong>
                          <span className="text-[10px] text-emerald-600 font-semibold">Análise de Bloqueio</span>
                        </div>
                      </div>

                      <div className="hidden md:block text-slate-300">➔</div>

                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">4</span>
                        <div>
                          <strong className="text-slate-800 block">Links de Venda</strong>
                          <span className="text-[10px] text-blue-600 font-semibold">Roteamento Automatizado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. REGRA DO IMPACTO FINANCEIRO REVERSO */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl relative overflow-hidden border border-slate-800 shadow-xl">
                    <div className="absolute -right-6 -bottom-6 opacity-5">
                      <Scale className="w-48 h-48" />
                    </div>

                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded uppercase tracking-wider font-sans">
                        Gatilho de Impacto Reverso Ativo
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Coeficiente de Gênero: <strong className="text-indigo-400 font-bold">{showReabModal.generoAdmin} ({coef * 100}%)</strong>
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <h4 className="font-serif font-black text-xl text-amber-400 leading-tight">
                        &ldquo;Você não perdeu o crédito! Você tem {formatCurrency(limitePotencialVal)} bloqueados que só serão liberados se você agir.&rdquo;
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        A captação de recursos foi pré-aprovada com base no faturamento de <strong className="text-white">{formatCurrency(showReabModal.faturamentoAnual)}</strong>. No entanto, as pendências mapeadas abaixo agiram como travas de bancabilidade, impedindo a homologação das taxas do Tier A.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">CNPJ do Lead</span>
                        <strong className="text-slate-200 font-mono">{showReabModal.cnpj}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Administrador</span>
                        <strong className="text-slate-200">{showReabModal.adminNome}</strong>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-slate-400 block text-[10px]">Limite a Desbloquear</span>
                        <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(limitePotencialVal)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 2. ROTEAMENTO INTELIGENTE COM BOTÃO DE COMPRA */}
                  <div className="space-y-4">
                    <h4 className="font-serif font-black text-base text-gray-800 flex items-center gap-2">
                      <Zap className="text-indigo-600 w-4 h-4 shrink-0" />
                      Roteamento Inteligente de Soluções Baseado em Pendências
                    </h4>
                    <p className="text-xs text-slate-500">
                      O sistema identificou as seguintes não-conformidades e roteou de forma síncrona para os parceiros e especialistas homologados no marketplace de conversão:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* PENDÊNCIA 1: RECEITA FEDERAL / CND IRREGULAR */}
                      <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        showReabModal.temDividasImpostos 
                          ? purchasedServices[`impostos-${showReabModal.id}`]
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                            : 'bg-white border-red-100 hover:border-red-200'
                          : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-65'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-100 text-red-800">
                              Receita Federal / CND
                            </span>
                            <span className={`text-[10px] font-bold ${
                              showReabModal.temDividasImpostos
                                ? purchasedServices[`impostos-${showReabModal.id}`]
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                                : 'text-slate-400'
                            }`}>
                              {!showReabModal.temDividasImpostos ? '✓ Sem Pendências' : purchasedServices[`impostos-${showReabModal.id}`] ? '✓ Saneamento Ativo' : '❌ Irregular'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-bold text-xs text-slate-800">NTW Contabilidade S/A</h5>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Saneamento de certidões, parcelamento de obrigações em atraso e emissão expressa de CND para fins de fomento.
                            </p>
                          </div>
                        </div>

                        {showReabModal.temDividasImpostos && (
                          <div className="mt-4 pt-3 border-t border-slate-100/50 space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium">Investimento Fixo:</span>
                              <strong className="text-slate-800 font-mono">R$ 1.250,00</strong>
                            </div>
                            
                            {purchasedServices[`impostos-${showReabModal.id}`] ? (
                              <div className="w-full bg-emerald-600 text-white font-bold text-center py-2.5 rounded-xl text-[10px] shadow-sm flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Saneamento Contratado!
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setPurchasedServices(prev => ({ ...prev, [`impostos-${showReabModal.id}`]: true }));
                                  alterarStatusLead(showReabModal.id, 'Análise Técnica');
                                  alert(`🚀 Sucesso! O plano NTW Contabilidade de Saneamento Fiscal foi contratado. O link de faturamento foi enviado ao e-mail de ${showReabModal.adminNome} e os técnicos fiscais já iniciaram o parcelamento síncrono!`);
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center py-2.5 rounded-xl text-[10px] cursor-pointer transition-colors"
                              >
                                Contratar Saneamento NTW
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* PENDÊNCIA 2: RESTRIÇÃO / SERASA / PROTESTO */}
                      <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        showReabModal.temDividasBancarias 
                          ? purchasedServices[`bancos-${showReabModal.id}`]
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                            : 'bg-white border-red-100 hover:border-red-200'
                          : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-65'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-100 text-red-800">
                              Restrição / Serasa
                            </span>
                            <span className={`text-[10px] font-bold ${
                              showReabModal.temDividasBancarias
                                ? purchasedServices[`bancos-${showReabModal.id}`]
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                                : 'text-slate-400'
                            }`}>
                              {!showReabModal.temDividasBancarias ? '✓ Sem Pendências' : purchasedServices[`bancos-${showReabModal.id}`] ? '✓ Defesa Ativa' : '❌ Apontamentos'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-bold text-xs text-slate-800">Dra. Marina Stein (GSA)</h5>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Ação judicial de suspensão por abusividade bancária e limpeza de nome com liminar expedida para liberação imediata.
                            </p>
                          </div>
                        </div>

                        {showReabModal.temDividasBancarias && (
                          <div className="mt-4 pt-3 border-t border-slate-100/50 space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium">Investimento Fixo:</span>
                              <strong className="text-slate-800 font-mono">R$ 2.400,00</strong>
                            </div>

                            {purchasedServices[`bancos-${showReabModal.id}`] ? (
                              <div className="w-full bg-emerald-600 text-white font-bold text-center py-2.5 rounded-xl text-[10px] shadow-sm flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Reabilitação Ativada!
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setPurchasedServices(prev => ({ ...prev, [`bancos-${showReabModal.id}`]: true }));
                                  alterarStatusLead(showReabModal.id, 'Limpeza de Nome Ativada');
                                  alert(`⚖️ Sucesso! A Dra. Marina Stein foi contratada. A Procuração Eletrônica e o Contrato de Honorários foram disparados no WhatsApp de ${showReabModal.adminNome} para assinatura digital via ICP-Brasil.`);
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center py-2.5 rounded-xl text-[10px] cursor-pointer transition-colors"
                              >
                                Contratar Dra. Marina Stein
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* PENDÊNCIA 3: SEM CONTABILIDADE / BALANÇO */}
                      <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        !showReabModal.possuiContabilidade 
                          ? purchasedServices[`contabilidade-${showReabModal.id}`]
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                            : 'bg-white border-red-100 hover:border-red-200'
                          : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-65'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              Balanço & DRE
                            </span>
                            <span className={`text-[10px] font-bold ${
                              !showReabModal.possuiContabilidade
                                ? purchasedServices[`contabilidade-${showReabModal.id}`]
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                                : 'text-slate-400'
                            }`}>
                              {showReabModal.possuiContabilidade ? '✓ Balanço Homologado' : purchasedServices[`contabilidade-${showReabModal.id}`] ? '✓ Emitindo Balancete' : '❌ Ausente'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-bold text-xs text-slate-800">Aura Assessoria Contábil</h5>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Montagem e consolidação do Balanço Patrimonial e DRE assinados por CRC oficial (Score Conversão Marketplace: <strong className="text-indigo-600">9.8/10</strong>).
                            </p>
                          </div>
                        </div>

                        {!showReabModal.possuiContabilidade && (
                          <div className="mt-4 pt-3 border-t border-slate-100/50 space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium">Investimento Fixo:</span>
                              <strong className="text-slate-800 font-mono">R$ 850,00</strong>
                            </div>

                            {purchasedServices[`contabilidade-${showReabModal.id}`] ? (
                              <div className="w-full bg-emerald-600 text-white font-bold text-center py-2.5 rounded-xl text-[10px] shadow-sm flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Balanço em Elaboração!
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setPurchasedServices(prev => ({ ...prev, [`contabilidade-${showReabModal.id}`]: true }));
                                  alert(`📊 Sucesso! A Aura Assessoria Contábil foi contratada. O sistema sincronizou os dados fiscais e o link de upload para extratos bancários de ${showReabModal.empresa} está liberado!`);
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center py-2.5 rounded-xl text-[10px] cursor-pointer transition-colors"
                              >
                                Contratar Balancete Aura
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              ) : recoveryActiveTab === 'contrato' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif font-black text-sm text-slate-800">
                      Contrato Oficial de Reabilitação GSA Soluções
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Padrão GSA S/A</span>
                  </div>

                  <div className="p-6 bg-slate-50 border border-gray-200 rounded-2xl font-mono text-[10px] text-slate-700 space-y-4 max-h-96 overflow-y-auto custom-scrollbar leading-relaxed">
                    <div className="text-center font-bold text-slate-800 border-b border-gray-200 pb-3 mb-3">
                      CONTRATO DE PRESTAÇÃO DE SERVIÇOS JURÍDICOS E REABILITAÇÃO EXTRAJUDICIAL
                    </div>
                    
                    <p>
                      <strong>CONTRATANTE:</strong> {showReabModal.empresa}, CNPJ nº {showReabModal.cnpj}, representada neste ato por seu administrador, {showReabModal.adminNome}.
                    </p>
                    
                    <p>
                      <strong>CONTRATADA:</strong> GSA CÂMARA DE MEDIAÇÃO, CONCILIAÇÃO E ARBITRAGEM S/A, com sede em Curitiba/PR.
                    </p>

                    <p>
                      <strong>CLÁUSULA PRIMEIRA - OBJETO:</strong> O objeto deste contrato é a prestação de serviços extrajudiciais e judiciais visando a reabilitação de crédito da CONTRATANTE, com a baixa ou suspensão de apontamentos restritivos decorrentes de dívidas bancárias registradas, com base na abusividade na cobrança fiscal verificada por este sistema (Score: {showReabModal.score}/100).
                    </p>

                    <p>
                      <strong>CLÁUSULA SEGUNDA - HONORÁRIOS:</strong> Pelos serviços acordados, a CONTRATANTE pagará à CONTRATADA a importância equivalente a 5% (cinco por cento) sobre o limite de crédito reabilitado de R$ {showReabModal.limiteEstimado.toLocaleString('pt-BR')}, além de custos operacionais cartorários previstos em tabela de custas.
                    </p>

                    <p>
                      <strong>CLÁUSULA TERCEIRA - MULTINÍVEL E REPASSES:</strong> Os honorários pagos pela contratante serão passíveis de split automático do ecossistema, com comissão direta destinada ao afiliado originador e bônus de override estipulado para a Unidade Regional homologada.
                    </p>

                    <div className="border-t border-gray-200 pt-4 mt-4 text-center text-slate-400">
                      Documento gerado digitalmente em {new Date(showReabModal.dataSimulacao).toLocaleDateString('pt-BR')} por Marina Stein.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        alert('Contrato assinado e enviado com sucesso ao cliente via WhatsApp/E-mail!');
                        setShowReabModal(null);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Confirmar Assinatura & Enviar Cliente
                    </button>
                    <button
                      onClick={() => handleCopiarLink(`Contrato de Reabilitação - ${showReabModal.empresa}`, 'contrato-copia')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-6 rounded-xl transition-colors cursor-pointer"
                    >
                      {copiadoId === 'contrato-copia' ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif font-black text-sm text-slate-800">
                      Procuração de Representação Eletrônica
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Dra. Marina Stein - OAB/PR</span>
                  </div>

                  <div className="p-6 bg-slate-50 border border-gray-200 rounded-2xl font-mono text-[10px] text-slate-700 space-y-4 max-h-96 overflow-y-auto custom-scrollbar leading-relaxed">
                    <div className="text-center font-bold text-slate-800 border-b border-gray-200 pb-3 mb-3">
                      INSTRUMENTO PARTICULAR DE PROCURAÇÃO AD JUDICIA ET EXTRA
                    </div>
                    
                    <p>
                      <strong>OUTORGANTE:</strong> {showReabModal.empresa}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº {showReabModal.cnpj}, com sede em {showReabModal.regiao}, representada por seu sócio administrador, Sr(a). {showReabModal.adminNome}.
                    </p>
                    
                    <p>
                      <strong>OUTORGADOS:</strong> Dra. Marina Stein, advogada devidamente inscrita nos quadros da Ordem dos Advogados do Brasil, Secção do Paraná, com escritório em Curitiba/PR.
                    </p>

                    <p>
                      <strong>PODERES:</strong> Por este instrumento, a Outorgante concede à Outorgada plenos poderes para representá-la perante qualquer Juízo, Instância, Tribunal, ou Repartição Pública, bem como perante órgãos de proteção ao crédito (SPC, SERASA, Boa Vista), Cartórios de Protesto, instituições financeiras, cooperativas de crédito e demais credores, podendo propor ações judiciais, requerer baixas administrativas, assinar acordos e transações.
                    </p>

                    <p>
                      <strong>PODERES ESPECÍFICOS:</strong> Transigir, acordar, receber e dar quitação de parcelamentos, dar andamento à reabilitação judicial de bancabilidade e saneamento do score cadastral do ecossistema GSA Capital.
                    </p>

                    <div className="border-t border-gray-200 pt-4 mt-4 text-center text-slate-400">
                      Documento eletrônico autenticado em {new Date(showReabModal.dataSimulacao).toLocaleDateString('pt-BR')} via ICP-Brasil.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        alert('Procuração eletrônica assinada e protocolada digitalmente!');
                        setShowReabModal(null);
                      }}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Assinar Procuração Eletronicamente (ICP-Brasil)
                    </button>
                    <button
                      onClick={() => handleCopiarLink(`Procuração de Representação - ${showReabModal.empresa}`, 'procuracao-copia')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-6 rounded-xl transition-colors cursor-pointer"
                    >
                      {copiadoId === 'procuracao-copia' ? 'Copiado!' : 'Copiar Procuração'}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão inferior geral de fechar */}
              {recoveryActiveTab === 'funil' && (
                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => {
                      setShowReabModal(null);
                      setRecoveryActiveTab('funil');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-6 rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar ao Painel
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MOTOR DE ORIGINAÇÃO, ROTEAMENTO & LEILÃO REVERSO GSA CAPITAL */}
      {/* ========================================================= */}
      {showBridgeModal && (() => {
        // Definição dinâmica das propostas concorrentes com base no Tier do lead
        const isTierA = showBridgeModal.tier === 'Tier A';
        
        const proposals = isTierA ? [
          { id: 'prop-1', instituicao: 'Banco do Brasil S/A', tipo: 'Banco Tradicional', cet: 1.15, prazo: 48, carencia: 6, garantia: 'Sem Garantias (Clean)', garantiaPeso: 0, taxaEstrutural: 1.0, logo: '🏛️' },
          { id: 'prop-2', instituicao: 'Cooperativa Sicredi', tipo: 'Cooperativa de Crédito', cet: 0.98, prazo: 36, carencia: 3, garantia: 'Aval dos Sócios', garantiaPeso: 1, taxaEstrutural: 0.8, logo: '🤝' },
          { id: 'prop-3', instituicao: 'Itaú Unibanco S/A', tipo: 'Banco Tradicional', cet: 1.25, prazo: 60, carencia: 6, garantia: 'Garantia Fidejussória', garantiaPeso: 2, taxaEstrutural: 1.2, logo: '🏢' },
          { id: 'prop-4', instituicao: 'Peak Fintech', tipo: 'Plataforma Digital', cet: 1.38, prazo: 24, carencia: 2, garantia: 'Sem Garantias (Clean)', garantiaPeso: 0, taxaEstrutural: 0.5, logo: '⚡' }
        ] : [
          { id: 'prop-1', instituicao: 'Apex Fundo Crédito Privado', tipo: 'FIDC Privado', cet: 1.78, prazo: 36, carencia: 3, garantia: 'Aval dos Sócios', garantiaPeso: 1, taxaEstrutural: 1.5, logo: '⛓️' },
          { id: 'prop-2', instituicao: 'Horizon Securitizadora S/A', tipo: 'FIDC Securitizadora', cet: 1.95, prazo: 24, carencia: 2, garantia: 'Sem Garantias (Clean)', garantiaPeso: 0, taxaEstrutural: 1.2, logo: '📈' },
          { id: 'prop-3', instituicao: 'Fundo Crescer Alternativo', tipo: 'Fundo de Crédito Privado', cet: 1.65, prazo: 12, carencia: 0, garantia: 'Garantia Real (Imóvel)', garantiaPeso: 3, taxaEstrutural: 1.8, logo: '🚀' },
          { id: 'prop-4', instituicao: 'Valores FIDC', tipo: 'FIDC Securitizadora', cet: 2.15, prazo: 48, carencia: 6, garantia: 'Garantia Fidejussória', garantiaPeso: 2, taxaEstrutural: 2.0, logo: '💰' }
        ];

        // Algoritmo de classificação de Proposta Campeã (5 variáveis)
        // Proposta Campeã = Menor CET + Melhor Prazo + Carência Otimizada - Exigência de Garantias - Menor Taxa Estrutural
        const calcularScoreProposta = (p: typeof proposals[0]) => {
          const scoreCET = (3.0 - p.cet) * 30;              // Menor CET ganha mais pontos
          const scorePrazo = (p.prazo / 60) * 20;            // Maior prazo ganha mais pontos
          const scoreCarencia = (p.carencia / 12) * 15;      // Mais carência ganha mais pontos
          const scoreGarantia = (3 - p.garantiaPeso) * 15;   // Sem garantias (peso 0) ganha 45 pontos, garantia real perde
          const scoreTaxa = (3.0 - p.taxaEstrutural) * 20;   // Menor taxa estrutural ganha mais pontos
          return Math.round(scoreCET + scorePrazo + scoreCarencia + scoreGarantia + scoreTaxa);
        };

        // Ordenar as propostas pelo Score para colocar a campeã no topo
        const proposalsWithScores = proposals.map(p => ({
          ...p,
          score: calcularScoreProposta(p)
        })).sort((a, b) => b.score - a.score);

        const propostaCampea = proposalsWithScores[0];

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowBridgeModal(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>

              {/* Cabeçalho de Originação */}
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                    GSA Capital Partner Portal
                  </span>
                  <h3 className="font-serif font-black text-2xl text-gray-900 mt-1">
                    Motor de Originação & Comparação de Propostas
                  </h3>
                </div>
              </div>

              {/* Informações Resumidas do Lead */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs mb-6">
                <div>
                  <span className="text-gray-400 block font-bold uppercase text-[9px] tracking-wider">Empresa Selecionada</span>
                  <strong className="text-slate-800 text-sm block mt-0.5">{showBridgeModal.empresa}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">{showBridgeModal.cnpj}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase text-[9px] tracking-wider">Faturamento Anual</span>
                  <strong className="text-slate-800 text-sm block mt-0.5">R$ {showBridgeModal.faturamentoAnual.toLocaleString('pt-BR')}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase text-[9px] tracking-wider font-sans">GSA Intelligence Tier</span>
                  <span className={`inline-block font-black text-xs px-2.5 py-0.5 rounded-full mt-1 ${
                    isTierA ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {showBridgeModal.tier}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase text-[9px] tracking-wider">Bancabilidade Score</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${showBridgeModal.score >= 100 ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <strong className="text-slate-800 text-sm">{showBridgeModal.score} / 100 Pontos</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ETAPA A: Distribuição Automatizada (Roteamento) */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="text-indigo-600 w-4 h-4 shrink-0" />
                    <h4 className="font-serif font-black text-sm text-slate-900 uppercase tracking-tight">
                      📡 Etapa A: Distribuição
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    O sistema consulta o Tier e o Score do lead e dispara os dados em paralelo via API para os parceiros homologados, sem fricção ou necessidade de intervenção humana.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    <div className="p-3 bg-white border border-slate-200/50 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Roteador Selecionado</span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded uppercase">
                          {isTierA ? 'Público/Tradicional' : 'Estruturado Privado'}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">
                        {isTierA 
                          ? 'Distribuição simultânea para Bancos Comerciais, Cooperativas e Fintechs de alta liquidez.' 
                          : 'Roteamento via Webhooks diretos para FIDCs e Fundos de Crédito Privado parceiros.'
                        }
                      </p>
                    </div>

                    {/* Status de Roteamento em Tempo Real */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log de Distribuição Paralela</span>
                      
                      {isTierA ? (
                        <>
                          <div className="flex items-center justify-between text-xs p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                            <span className="flex items-center gap-2 text-emerald-800">🏛️ API Banco do Brasil</span>
                            <span className="font-mono text-[10px] font-bold text-emerald-600">✓ 201 OK</span>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                            <span className="flex items-center gap-2 text-emerald-800">🤝 API Cooperativa Sicredi</span>
                            <span className="font-mono text-[10px] font-bold text-emerald-600">✓ 201 OK</span>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                            <span className="flex items-center gap-2 text-emerald-800">🏢 API Banco Itaú</span>
                            <span className="font-mono text-[10px] font-bold text-emerald-600">✓ 201 OK</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                            <span className="flex items-center gap-2 text-indigo-800">⛓️ Webhook Apex FIDC</span>
                            <span className="font-mono text-[10px] font-bold text-indigo-600">📡 SENT (200)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                            <span className="flex items-center gap-2 text-indigo-800">📈 Webhook Horizon Sec</span>
                            <span className="font-mono text-[10px] font-bold text-indigo-600">📡 SENT (200)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                            <span className="flex items-center gap-2 text-indigo-800">🚀 Webhook Fundo Crescer</span>
                            <span className="font-mono text-[10px] font-bold text-indigo-600">📡 SENT (200)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 font-medium block leading-relaxed">
                      ⚡ <strong>SLA de Originação GSA:</strong> Disparo paralelo em lote concluído em menos de 180ms.
                    </span>
                  </div>
                </div>

                {/* ETAPA B: Matriz de Comparação (Leilão Reverso) */}
                <div className="lg:col-span-8 bg-white border border-gray-100 p-5 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart className="text-indigo-600 w-4 h-4 shrink-0" />
                      <h4 className="font-serif font-black text-sm text-slate-900 uppercase tracking-tight">
                        📊 Etapa B: Matriz de Comparação (Leilão Reverso)
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                      Leilão Inteligente Ativo
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Assim que os parceiros respondem via webhook, nossa matriz de decisão roda o algoritmo de ponderação das 5 variáveis críticas para eleger a <strong>Proposta Campeã</strong>.
                  </p>

                  {/* Detalhe da Fórmula Algorítmica */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100/30 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-indigo-800 block uppercase tracking-wider">
                      Fórmula de Classificação das Propostas GSA Capital:
                    </span>
                    <code className="text-[10px] font-mono text-indigo-900 font-bold block bg-white px-2 py-1 rounded border border-indigo-100">
                      Proposta Campeã = Menor CET + Melhor Prazo + Carência Otimizada - Exigência de Garantias - Menor Taxa Estrutural
                    </code>
                  </div>

                  {/* Tabela de Propostas Concorrentes */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[9px] tracking-widest bg-slate-50">
                          <th className="py-2.5 px-3">Parceiro Financeiro</th>
                          <th className="py-2.5 px-3 text-center">CET % a.m.</th>
                          <th className="py-2.5 px-3 text-center">Prazo Total</th>
                          <th className="py-2.5 px-3 text-center">Carência</th>
                          <th className="py-2.5 px-3">Garantias Exigidas</th>
                          <th className="py-2.5 px-3 text-center">Taxa Estrut.</th>
                          <th className="py-2.5 px-3 text-right">Score GSA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {proposalsWithScores.map((prop, idx) => {
                          const isCampeao = prop.id === propostaCampea.id;
                          return (
                            <tr 
                              key={prop.id} 
                              className={`transition-all ${
                                isCampeao 
                                  ? 'bg-gradient-to-r from-amber-50/60 to-indigo-50/20 font-bold border-l-4 border-amber-500' 
                                  : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{prop.logo}</span>
                                  <div>
                                    <span className="text-slate-800 block">{prop.instituicao}</span>
                                    <span className="text-[10px] text-slate-400 font-normal block">{prop.tipo}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-indigo-600 font-extrabold">
                                {prop.cet}% a.m.
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-600">
                                {prop.prazo} meses
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-600">
                                {prop.carencia} meses
                              </td>
                              <td className="py-3 px-3 text-slate-600 text-[11px]">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  prop.garantiaPeso === 0 ? 'bg-green-50 text-green-700 font-bold' :
                                  prop.garantiaPeso === 1 ? 'bg-amber-50 text-amber-700 font-bold' :
                                  'bg-red-50 text-red-700 font-bold'
                                }`}>
                                  {prop.garantia}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                                {prop.taxaEstrutural}%
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs ${isCampeao ? 'text-amber-600 font-black' : 'text-slate-500 font-bold'}`}>
                                    {prop.score} pts
                                  </span>
                                  {isCampeao && (
                                    <span className="text-[9px] text-amber-600 font-black bg-amber-100 px-1 py-0.2 rounded mt-0.5">
                                      🏆 CAMPEÃ
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Linha Inferior com Split de Comissão e Ação de Formalização */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Comissão de Originação MLM Estimada
                    </span>
                    <strong className="text-emerald-600 font-mono text-base">
                      R$ {(showBridgeModal.limiteEstimado * 0.03).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-slate-400 block font-medium">
                      Split automático parametrizado para os parceiros de rede GSA.
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={() => {
                      alterarStatusLead(showBridgeModal.id, 'Aprovado');
                      alert(`🎉 Sucesso! A Proposta Campeã da GSA Capital (${propostaCampea.instituicao}) foi aceita e formalizada eletronicamente para a empresa ${showBridgeModal.empresa}. O contrato e split de MLM foram registrados no banco!`);
                      setShowBridgeModal(null);
                    }}
                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3.5 px-6 rounded-2xl cursor-pointer shadow-lg shadow-indigo-500/15 text-center transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Contratar Proposta Campeã (Leilão Reverso)
                  </button>
                  <button
                    onClick={() => setShowBridgeModal(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 px-6 rounded-2xl cursor-pointer text-center"
                  >
                    Voltar
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL DE ADICIONAR NOVO PARCEIRO (MASTER)                 */}
      {/* ========================================================= */}
      {showNovoParceiroModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-up"
          >
            <button 
              onClick={() => setShowNovoParceiroModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <Plus className="text-indigo-600 w-6 h-6 animate-pulse" />
              <h3 className="font-serif font-black text-xl text-gray-900 tracking-tight">Adicionar Parceiro Financeiro</h3>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Cadastre novos fundos privados, bancos tradicionais ou escritórios parceiros para recebimento e repasse do split de leads.
            </p>

            <form onSubmit={handleAdicionarParceiro} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 block">Nome do Parceiro *</label>
                <input 
                  type="text" required placeholder="Ex: Apex Fundo de Crédito Estruturado"
                  value={novoParceiroNome} onChange={(e) => setNovoParceiroNome(e.target.value)}
                  className="w-full border border-gray-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 block">Tipo de Parceiro *</label>
                  <select 
                    value={novoParceiroTipo} 
                    onChange={(e) => setNovoParceiroTipo(e.target.value as any)}
                    className="w-full border border-gray-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="credito_privado">Crédito Privado (FIDC)</option>
                    <option value="banco">Banco Tradicional</option>
                    <option value="cooperativa">Cooperativa de Crédito</option>
                    <option value="fidc">FIDC Securitizadora</option>
                    <option value="fintech">Plataforma Fintech</option>
                    <option value="fundo_investimento">Fundo de Investimento</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 block">Linha Ativa / Especialidade *</label>
                  <input 
                    type="text" required placeholder="Ex: Bridge ou FIDC PME"
                    value={novoParceiroLinha} onChange={(e) => setNovoParceiroLinha(e.target.value)}
                    className="w-full border border-gray-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 block">Detalhes / Condições da Taxa *</label>
                <textarea 
                  required rows={3} placeholder="Ex: Taxas bridge a partir de 1.8% a.m. focado no mercado corporativo."
                  value={novoParceiroDetalhes} onChange={(e) => setNovoParceiroDetalhes(e.target.value)}
                  className="w-full border border-gray-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              {/* Nota sobre Validação de Restrição no Banco */}
              <div className="p-3 bg-indigo-50 border border-indigo-100/60 rounded-xl flex items-start gap-2.5">
                <Info className="text-indigo-600 w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-[10px] text-indigo-800 leading-normal">
                  <strong>Validação do Esquema SQL:</strong> O tipo selecionado será submetido à restrição de validação <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono">parceiros_financeiros_tipo_check</code> atualizada no Postgres.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Homologar Parceiro
                </button>
                <button
                  type="button"
                  onClick={() => setShowNovoParceiroModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-6 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
