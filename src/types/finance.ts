export interface RegrasComissao {
  percentual_master: number; // Ex: 30 (30%)
  percentual_afiliado: number; // Ex: 10 (10%)
  // O restante (60%) fica com o Tenant (Unidade)
}

export interface CarteirasAsaas {
  walletId_master: string;
  walletId_tenant?: string;
  walletId_afiliado?: string;
}
