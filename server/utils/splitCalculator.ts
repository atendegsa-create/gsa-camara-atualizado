import { db } from '../lib/firebase';

interface SplitTarget {
  walletId: string;
  percentualValue?: number;
  fixedValue?: number;
}

export async function calcularSplitAsaasDinamico(tenantId: string, afiliadoId: string | null, servicoAlvo?: string, tipoTaxa?: string) {
  const splits: SplitTarget[] = [];

  try {
    // 1. Busca as regras do Tenant no Firestore
    const tenantSnap = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantSnap.data();
    
    // Regras de comissão globais ou específicas da unidade
    const regrasComissao = tenantData?.regrasComissao || {
      percentual_master: 30,
      percentual_unidade: 60,
      percentual_afiliado: 10
    };
    
    // 2. Calcula para o Master (se for para uma carteira específica, senão fica na principal)
    const masterWalletId = process.env.ASAAS_MASTER_WALLET_ID;
    if (masterWalletId) {
      splits.push({
        walletId: masterWalletId,
        percentualValue: regrasComissao.percentual_master
      });
    }

    // 3. Calcula para a Unidade
    const unidadeWallet = tenantData?.financeiro?.asaasWalletId;
    if (unidadeWallet) {
      splits.push({
        walletId: unidadeWallet,
        percentualValue: regrasComissao.percentual_unidade
      });
    }

    // 4. Calcula para o Afiliado (se houver)
    if (afiliadoId) {
      const afiliadoSnap = await db.collection('usuarios').doc(afiliadoId).get();
      const afiliadoWallet = afiliadoSnap.data()?.asaasWalletId;
      if (afiliadoWallet) {
        splits.push({
          walletId: afiliadoWallet,
          percentualValue: regrasComissao.percentual_afiliado
        });
      }
    }

    return splits;
  } catch (error) {
    console.error("Erro ao calcular split de comissões:", error);
    return []; // Retorna vazio em caso de falha (não quebra o pagamento, mas não divide)
  }
}
