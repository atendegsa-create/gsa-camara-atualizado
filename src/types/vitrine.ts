export type CategoriaServico = 'ADMINISTRATIVO' | 'JUDICIAL';

export interface VitrineLeadRequest {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  servico_solicitado: string;
  categoria_servico: CategoriaServico;
  afiliado_ref: string; // UID do usuário que indicou o link
}

export interface AfiliadoInfo {
  uid: string;
  nome: string;
  tenantId: string; // 'MASTER' ou o ID da unidade
  tipo_usuario: string;
}
