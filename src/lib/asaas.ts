import axios from 'axios';
import { auth } from './firebase';

// ---------------------------------------------------------
// TIPAGENS PARA SPLIT FINANCEIRO
// ---------------------------------------------------------

export interface SplitReceiver {
  walletId: string; // ID da carteira do recebedor no Asaas (ex: wal_123456)
  fixedValue?: number; // Valor fixo a receber
  percentualValue?: number; // Ou percentual da transação
}

export interface PaymentData {
  customer: string;
  value: number;
  description: string;
  externalReference: string;
  dueDate?: string;
}

// Helper para pegar o token do Firebase
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuário não autenticado.");
  }
  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Cria um cliente no Asaas através do backend
 */
export async function createAsaasCustomer(_apiKey: string, customerData: { name: string, email: string, cpfCnpj: string, mobilePhone?: string }) {
  try {
    const headers = await getAuthHeaders();
    const resp = await axios.post('/api/asaas/customer', customerData, { headers });
    return resp.data.id;
  } catch (error: any) {
    console.error("Asaas Customer Proxy Error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Cria uma cobrança via PIX que divide o dinheiro automaticamente (através do backend)
 */
export async function createSplitCharge(
  _apiKey: string, 
  paymentData: PaymentData, 
  splits: SplitReceiver[]
) {
  try {
    const headers = await getAuthHeaders();
    const resp = await axios.post('/api/asaas/split-charge', {
      paymentData,
      splits
    }, { headers });

    return resp.data;
  } catch (error: any) {
    console.error("Asaas Split Payment Proxy Error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Função unificada para criar cobrança com suporte a split automático por Tenant
 */
export async function criarAssinaturaCredenciada(tenantId: string, valorMensalidade: number, diaVencimento: number) {
  try {
    const headers = await getAuthHeaders();
    const resp = await axios.post('/api/asaas/subscription', {
      tenantId,
      valorMensalidade,
      diaVencimento
    }, { headers });
    return resp.data;
  } catch (error: any) {
    console.error("Erro ao criar assinatura Asaas:", error.response?.data || error.message);
    throw error;
  }
}

export async function criarCobranca(paymentData: PaymentData, tenant?: any) {
  const splits: SplitReceiver[] = [];
  
  if (tenant?.financeiro?.asaasWalletId && tenant?.financeiro?.comissaoExtrajudicial) {
    splits.push({
      walletId: tenant.financeiro.asaasWalletId,
      percentualValue: Number(tenant.financeiro.comissaoExtrajudicial)
    });
  }

  // Se houver erro ou valor inválido, o backend deve tratar ou o catch aqui logar
  return createSplitCharge("", paymentData, splits);
}

// Mantendo compatibilidade de nomes mas sinalizando que a key não é mais necessária no front
export const createAsaasPix = createSplitCharge;
