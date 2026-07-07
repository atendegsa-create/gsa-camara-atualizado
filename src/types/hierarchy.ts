// Tipos de Unidade (Tenant)
export type TipoUnidade = 'PROPRIA' | 'REPRESENTANTE'; 
// PROPRIA: Atende os próprios leads. 
// REPRESENTANTE: Apenas capta, a GSA Master/Analista faz o atendimento.

export interface TenantConfig {
  id: string;
  nome: string;
  tipo_unidade: TipoUnidade;
  config_vendedores: {
    podem_atender_leads: boolean; // Se false, o vendedor só acompanha o status. Se true, ele atende no Kanban.
  };
  regras_comissao: {
    percentual_master: number;
    percentual_unidade: number;
    percentual_afiliado: number;
  };
}

// Novos Papéis de Usuário (Roles)
export type UserRole = 'ADMIN_MASTER' | 'ADMIN_UNIDADE' | 'ANALISTA' | 'MEDIADOR' | 'ADVOGADO' | 'VENDEDOR' | 'AFILIADO' | 'CLIENTE';

export interface LeadTrackingContext {
  origem_url: string;
  afiliado_id?: string;
  vendedor_id?: string;
  unidade_id?: string;
  analista_responsavel_id?: string;
}
