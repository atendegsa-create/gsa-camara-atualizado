import { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------
// 1. ESTRUTURAS MULTI-TENANT (WHITE-LABEL)
// ---------------------------------------------------------

export interface WhiteLabelConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  emailContato?: string;
  whatsappContato?: string;
  nomeAssinatura?: string;
}

export interface Tenant {
  id: string;
  nome_unidade: string;
  slug: string; // Identificador único para a URL (ex: gsaserra)
  documento_cnpj: string;
  responsavel?: string;
  email?: string;
  telefone?: string;
  email_contato?: string; // Mantido para compatibilidade
  whatsapp_contato?: string; // Mantido para compatibilidade
  dominio_personalizado?: string; // Ex: serragaucha.redagsacamara.com.br
  white_label: WhiteLabelConfig;
  config_ar?: {
    mensagem_whatsapp?: string;
  };
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  telefone_central?: string;
  regrasComissao?: {
    extrajudicialDiretoRoyalties: number; // valor fixo ou %
    extrajudicialBaseGsa: number; // %
    judicialTaxa: number; // %
  };
  configContrato?: {
    valorAdesao: number;
    entradaPaga: number;
    saldoAdesaoAberto: number;
    valorMensalidade: number;
    diaVencimentoMensalidade: number;
  };
  status: 'ATIVO' | 'SUSPENSO' | 'INATIVO' | 'PENDENTE_PAGAMENTO';
  createdAt: any;
  updatedAt?: any;
  diretor_id?: string; // Referência ao Diretor Regional
  regiao_atuacao?: string; // Região de abrangência da unidade
  financeiro?: {
    asaasWalletId?: string;
    apiKey?: string;
    taxaGsaPercentual?: number; // Comissão Master
    taxaAdministrativaPadrao?: number; // Ex: 347 ou 397
    comissaoExtrajudicial?: number; // Percentagem
    comissaoJudicial?: number; // Percentagem
    taxas?: {
      abertura?: number;
      administrativa?: number;
      setup_total?: number;
    };
    comissoes?: {
      extrajudicial_percentual?: number;
      judicial_percentual?: number;
      consultor_percentual?: number;
    };
    requer_abatimento_setup?: boolean;
    saldo_devedor_setup?: number;
    percentual_abatimento_comissao?: number;
  };
}

// ---------------------------------------------------------
// 2. USUÁRIOS E PERMISSÕES (RBAC)
// ---------------------------------------------------------

// Mantidos os antigos para compatibilidade mas atualizados para o novo modelo de hierarquia
export type UserRole = 
  | 'MasterAdmin'
  | 'GestorUnidade'
  | 'Procurador' 
  | 'Mediador' 
  | 'Cliente'
  | 'AdminGeral' 
  | 'ADMIN'
  | 'MEDIADOR'
  | 'CLIENTE'
  | 'MASTER' 
  | 'DIRETOR' 
  | 'UNIDADE' 
  | 'ADVOGADO' 
  | 'CONSULTOR' 
  | 'AFILIADO'
  | 'CONCILIADOR'
  | 'REQUERIDO'
  | 'CREDOR'
  | 'ANALISTA'
  | 'VENDEDOR';

export type UserStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'SUSPENSO';

export interface UserProfile {
  id: string;
  tenantId?: string; // Vínculo com a Unidade Credenciada
  unidadeId?: string; // Sinônimo para tenantId para compatibilidade com o prompt
  consultor_id?: string; // Vínculo com o consultor/afiliado que indicou este usuário
  codigo_afiliado?: string; // Código de afiliado encurtado e amigável (ex: ANA142)
  nome_completo: string;
  documento?: string;
  tipo_usuario: UserRole;
  email: string;
  whatsapp?: string;
  status?: UserStatus;
  createdAt: any;
  can_audit?: boolean;
  comissao?: number; // Percentual de comissão negociado
  isOfflineProfile?: boolean;
}

// ---------------------------------------------------------
// 3. MÓDULOS DE NEGÓCIO (PROCESSOS, LEADS, DOCS)
// ---------------------------------------------------------

export type ProcessStatus = 
  | 'LEAD' | 'LEAD_NOVO' | 'AGUARDANDO_TAP' | 'TRIAGEM' | 'ANALISE_DOCUMENTAL' 
  | 'NOTIFICACAO' | 'CONVITE_REU' | 'AUDIENCIA' | 'EM_NEGOCIACAO' 
  | 'ACORDO_HOMOLOGADO' | 'ACORDO' | 'SEM_ACORDO' | 'JUDICIAL' | 'JUDICIAL_AGUARDANDO_PETICAO'
  | 'PAGAMENTO_REALIZADO' | 'RECUSADO' | 'CANCELADO' | 'PAGAMENTO_ATRASO' 
  | 'PEDIDO_SOLICITADO' | 'ENCERRADO' | 'PROCESSANDO'
  | 'SIMULACAO_PAGA' | 'LAUDO_PAGO' | 'MEDIACAO_CONTRATADA' | 'AGUARDANDO_DECISAO' | 'ACORDO_IMINENTE';

export interface ProcessLog {
  status: string;
  data: any;
  mensagem: string;
}

export interface FaseData {
  observacao?: string;
  
  // ANALISE_DOCUMENTAL
  solicitacoes_documentais?: {
    id: string;
    tipo: 'DOCUMENTO' | 'INFORMACAO';
    nome: string;
    status: 'PENDENTE' | 'ENVIADO';
    resposta?: string; // Text answer or URL answer provided by client
  }[];

  // AGUARDANDO_TAP
  data_pagamento_tap?: string;
  forma_pagamento_tap?: string;

  // TRIAGEM
  decisao_triagem?: 'ACEITO' | 'RECUSADO' | 'MAIS_INFORMACOES';
  motivo_triagem?: string;

  // NOTIFICACAO (already has tipo_notificacao)
  tipo_notificacao?: 'AR' | 'EMAIL' | 'WHATSAPP' | 'EDITAL';
  vinculo_ar_online?: string;

  // CONVITE_REU
  data_convite?: string;
  forma_envio_convite?: string;
  status_convite?: 'ACEITO' | 'NEGADO' | 'SEM_RETORNO';
  
  // AUDIENCIA
  data_audiencia?: string;
  hora_audiencia?: string;
  local_audiencia?: 'PRESENCIAL' | 'ONLINE';
  endereco_audiencia?: string;
  link_meet?: string;
  
  // EM_NEGOCIACAO
  detalhes_negociacao?: string;
  valor_proposta?: number;
  forma_pagamento_proposta?: string;
  resposta_cliente_proposta?: 'ACEITO' | 'RECUSADO' | 'CONTRA_PROPOSTA';
  contra_proposta_cliente?: string;

  // ACORDO_HOMOLOGADO
  dados_acordo_extrajudicial?: string;
  valor_acordo?: number;
  data_pagamento_acordo?: string;
  forma_pagamento_acordo?: string;
  documento_acordo_url?: string;

  // JUDICIAL
  advogado_responsavel?: string;
  tipo_juridico?: 'INTERNO' | 'PARTICULAR';
  data_pagamento?: string; // keeping legacy
  beneficiario?: 'CAMARA' | 'CLIENTE' | 'PARTE'; // keeping legacy
  forma_pagamento?: 'PIX' | 'BOLETO' | 'CARTAO_CREDITO'; // keeping legacy
}

export interface NegotiationParams {
  valor_original: number;
  valor_alvo: number; // O que queremos fechar idealmente
  valor_minimo_aceitavel: number; // O piso absoluto da negociação
  max_parcelas: number;
  status_negociacao: 'AGUARDANDO_CONTATO' | 'EM_ANDAMENTO' | 'ACORDO_FECHADO' | 'IMPASSE';
}

export interface Process {
  id: string;
  negotiation_params?: NegotiationParams;
  tenantId?: string; // Vínculo com a Unidade Credenciada
  nup: string;
  status: ProcessStatus;
  origemLead?: 'direto' | 'base_gsa';
  tipoJustica?: 'extrajudicial' | 'judicial';
  fase_data?: FaseData;
  valor_causa?: number;
  valor_estimado_recuperacao?: number;
  tipo_acao?: string;
  data_abertura: any;
  ultima_atualizacao?: any;
  cliente_id?: string;
  advogado_id?: string;
  conciliador_id?: string;
  cliente_nome?: string;
  cliente_documento?: string;
  cliente_email?: string;
  cliente_whatsapp?: string;
  parte_contraria_nome?: string;
  parte_contraria_documento?: string;
  parte_contraria_email?: string;
  parte_contraria_telefone?: string;
  notas_procurador?: string;
  dossie_provas_url?: string;
  peticao_inicial_url?: string;
  videoUrl?: string;
  videoHash?: string;
  documento_hash?: string;
  valor_tap?: number;
  status_tap?: 'PAGAMENTO_REALIZADO' | 'PENDENTE';
  data_pagamento_tap?: any;
  forma_pagamento_tap?: string;
  percentual_exito?: number;
  resumo_fato?: string;
  solicitacoes?: string;
  parceiro_tag?: string | null;
  criado_por?: string;
  metodo_pagamento?: 'MANUAL' | 'AUTOMATICO' | 'MANUAL_ADMIN';
  observacoes_internas?: string;
  lembrete_enviado?: boolean;
  data_ultimo_lembrete?: any;
  intencao?: 'LAUDO' | 'MEDIACAO';
  funnel_data?: {
    tipoContrato: string;
    valorEmprestimo: number;
    valorParcela: number;
    abusividadePercent: number;
    paywall1_paid: boolean;
    paywall2_paid: boolean;
  };
  laudo_tecnico?: string;
  logs?: ProcessLog[];
  data_inicio_prazo?: any;
  prazo_dias?: number;
  data_vencimento_prazo?: any;
  procurador_responsavel_id?: string;
  mediadorId?: string;
  mediadorNome?: string;
  distribuidoEm?: any;
  blind_bidding?: {
    proposta_requerente?: number;
    proposta_requerido?: number;
    data_proposta_requerente?: any;
    data_proposta_requerido?: any;
    margem_viabilidade?: number; // ex: 0.10 para 10%
    resultado?: 'MATCH' | 'PENDENTE';
    temperature?: number;
    mensagem_temperatura?: string;
    valor_fechado?: number;
  };
}

export interface RXAudit {
  id: string;
  tenantId?: string; // Vínculo com a Unidade Credenciada
  processo_id: string;
  banco_contrato: string;
  taxa_juros_identificada: number;
  valor_parcela?: number;
  numero_contrato?: string;
  data_inicio?: string;
  rmc_detectada: boolean;
  resumo_ia: string;
  criado_em: any;
  viabilidade?: boolean;
  potencial_recuperacao?: number;
  tarifas_abusivas?: string[];
  resumo_persuasivo?: string;
  whatsapp_message?: string;
}

export interface RXAuditResult {
  viabilidade: boolean;
  motivo: string;
  detalhes?: string;
  complexidade?: string;
  taxa_juros_identificada: number;
  potencial_recuperacao: number;
  rmc_detectada: boolean;
  tarifas_abusivas: string[];
  resumo_persuasivo: string;
  whatsapp_message: string;
  banco_contrato: string;
  valor_parcela: number;
  numero_contrato?: string;
  data_inicio?: string;
}

export interface Transaction {
  id: string;
  tenantId?: string; // Vínculo com a Unidade Credenciada
  processo_id: string;
  tipo_taxa: 'TAP' | 'SUCCESS_FEE' | 'HONORARIOS';
  valor: number;
  status_pagamento: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  split_parceiro?: number;
}

export interface TAPPayment {
  id: string;
  tenantId?: string; // Vínculo com a Unidade Credenciada
  processId: string;
  clientId: string;
  amount: number;
  status: 'pending' | 'approved' | 'failed' | 'refunded';
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  externalId?: string; // ID do Asaas/Iugu
  paidAt?: any;
  createdAt: any;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Novas interfaces de apoio aos módulos exigidos pelo White-Label

export interface Lead {
  id: string;
  tenantId?: string;
  consultor_id?: string;
  nome: string;
  email: string;
  telefone: string;
  origem?: string;
  servico_alvo?: string;
  status: 'NOVO' | 'CONTATADO' | 'AGENDADO' | 'CONVERTIDO' | 'PERDIDO';
  createdAt: any;
}

export interface Document {
  id: string;
  tenantId?: string;
  processo_id: string;
  titulo: string;
  tipo_documento: 'PROCURACAO' | 'CONTRATO' | 'NOTIFICACAO' | 'ATA' | 'TERMO' | 'GRAVACAO' | 'OUTROS';
  url_storage: string;
  gerado_por_ia: boolean;
  status_assinatura: 'PENDENTE' | 'ASSINADO';
  hash_integridade?: string;
  timestamp_seguro?: string;
  createdAt: any;
}

export interface Commission {
  id: string;
  tenantId?: string;
  transactionId: string;
  beneficiarioId: string; // Pode ser Consultor, Afiliado ou Unidade
  role: UserRole;
  valor: number;
  status: 'PENDENTE' | 'PAGO' | 'ESTORNADO';
  createdAt: any;
}

export interface DebtorImportRecord {
  nome: string;
  documento: string; // CPF ou CNPJ
  telefone: string; // WhatsApp com DDI e DDD
  email?: string;
  valor_divida: number;
  contrato_origem?: string;
  vencimento_original?: string;
  margem_desconto_maximo?: number; // Ex: 0.2 para 20%
}

export interface BatchImportResult {
  total_processados: number;
  sucesso: number;
  falhas: number;
  erros: string[];
}

export interface WhatsAppAntiSpamConfig {
  minDelaySeconds: number;
  maxDelaySeconds: number;
  pauseAfterQuantity: number;
  pauseDurationMinutes: number;
  allowedDays: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  startHour: number; // Ex: 8 (08:00)
  endHour: number; // Ex: 20 (20:00)
  active: boolean;
}

export interface JurimetricsQuery {
  banco_contrato: string;
  tipo_acao?: string; // Ex: 'Revisional de Juros', 'Cobrança'
  valor_causa_min?: number;
  valor_causa_max?: number;
}

export interface JurimetricsResult {
  instituicao: string;
  amostra_processos: number;
  extrajudicial: {
    taxa_acordo: number; // Porcentagem (ex: 78.5)
    tempo_medio_dias: number;
    desconto_medio_concedido: number; // Porcentagem
  };
  judicial: {
    taxa_exito_estimada: number;
    tempo_medio_meses: number;
  };
  parecer_ia: string;
}



