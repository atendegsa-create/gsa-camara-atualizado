import axios from 'axios';
import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { RegrasComissao, CarteirasAsaas } from '../../src/types/finance';
import { TenantConfig } from '../../src/types/hierarchy';

export interface RelatorioFiscalCalculado {
  valor_total: number;
  base_nota_master: number;       // Quanto a Master emite de NF
  base_nota_unidade: number;      // Quanto a Unidade emite de NF
  retencao_afiliado: number;      // Comissão repassada ao parceiro
  tipo_unidade: 'PROPRIA' | 'REPRESENTANTE';
}

export class AsaasSplitService {
  private static getApiInstance() {
    const isProd = process.env.NODE_ENV === 'production';
    const isSandbox = !isProd && process.env.ASAAS_SANDBOX !== 'false';
    const baseURL = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    return axios.create({
      baseURL,
      headers: { 'access_token': process.env.ASAAS_API_KEY || '' }
    });
  }

  // A carteira da GSA Master deve estar no .env
  private static MASTER_WALLET_ID = process.env.ASAAS_MASTER_WALLET_ID || ''; 

  /**
   * Constrói o array de split de acordo com a origem do Lead.
   */
  static async calcularSplit(processoId: string, valorTotal: number) {
    const processoDoc = await db!.collection('processos').doc(processoId).get();
    if (!processoDoc.exists) throw new Error('Processo não encontrado');
    
    const data = processoDoc.data() as any;
    const tenantId = data.tenantId;
    const leadId = data.lead_vitrine_id || data.leadId || data.lead_id; // Se veio da vitrine
    
    let carteiras: CarteirasAsaas = { walletId_master: this.MASTER_WALLET_ID };
    let regras: RegrasComissao = { percentual_master: 100, percentual_afiliado: 0 }; // Default: 100% Master
    const splitArray: any[] = [];

    // 1. Verifica se pertence a uma Unidade (Tenant)
    if (tenantId && tenantId !== 'MASTER') {
      const tenantDoc = await db!.collection('tenants').doc(tenantId).get();
      const tenantData = tenantDoc.data();
      
      if (tenantData?.asaas_wallet_id) {
        carteiras.walletId_tenant = tenantData.asaas_wallet_id;
        // Pega a regra de royalties definida no contrato da unidade (Ex: Master cobra 30% de royalties)
        regras.percentual_master = tenantData.regrasComissao?.percentual_master ?? 30; 
      }
    }

    // 2. Verifica se teve indicação de Afiliado/Vendedor
    if (leadId) {
      const leadDoc = await db!.collection('leads_vitrine').doc(leadId).get();
      const leadData = leadDoc.data();
      
      if (leadData?.rastreamento_comissao?.indicado_por_uid) {
        const afiliadoDoc = await db!.collection('usuarios').doc(leadData.rastreamento_comissao.indicado_por_uid).get();
        const afiliadoData = afiliadoDoc.data();
        
        if (afiliadoData?.asaas_wallet_id) {
          carteiras.walletId_afiliado = afiliadoData.asaas_wallet_id;
          // Pega a regra de comissão do afiliado (Ex: 10% para quem indicou)
          regras.percentual_afiliado = afiliadoData.regrasComissao?.percentual_afiliado ?? 10;
        }
      }
    }

    // 3. Monta o Array de Split exigido pelo Asaas
    
    // Fatias do bolo
    const percentualMaster = regras.percentual_master;
    const percentualAfiliado = regras.percentual_afiliado;
    const percentualUnidade = Math.max(0, 100 - percentualMaster - percentualAfiliado);

    const valorMaster = (valorTotal * percentualMaster) / 100;
    const valorAfiliado = (valorTotal * percentualAfiliado) / 100;
    const valorUnidade = (valorTotal * percentualUnidade) / 100;

    // Split da Master (Royalties/Taxa Adm)
    if (valorMaster > 0 && carteiras.walletId_master) {
      splitArray.push({
        walletId: carteiras.walletId_master,
        fixedValue: parseFloat(valorMaster.toFixed(2)),
        totalFixedValue: parseFloat(valorMaster.toFixed(2)) // Usando fixedValue para evitar arredondamentos do Asaas
      });
    }

    // Split do Afiliado (Comissão de indicação)
    if (valorAfiliado > 0 && carteiras.walletId_afiliado) {
      splitArray.push({
        walletId: carteiras.walletId_afiliado,
        fixedValue: parseFloat(valorAfiliado.toFixed(2)),
        totalFixedValue: parseFloat(valorAfiliado.toFixed(2))
      });
    }

    // Split da Unidade (O que sobra do faturamento)
    if (valorUnidade > 0 && carteiras.walletId_tenant) {
      splitArray.push({
        walletId: carteiras.walletId_tenant,
        fixedValue: parseFloat(valorUnidade.toFixed(2)),
        totalFixedValue: parseFloat(valorUnidade.toFixed(2))
      });
    }

    return splitArray;
  }

  /**
   * Calcula as bases fiscais e notas antes de enviar o split para o Asaas
   */
  static async calcularBasesFiscais(processoId: string, valorTotal: number): Promise<RelatorioFiscalCalculado> {
    const processoDoc = await db!.collection('processos').doc(processoId).get();
    if (!processoDoc.exists) throw new Error('Processo não encontrado');
    
    const data = processoDoc.data() as any;
    const tenantId = data.tenantId || 'MASTER';
    
    let tipoUnidade: 'PROPRIA' | 'REPRESENTANTE' = 'PROPRIA';
    let pctMaster = 100;
    let pctAfiliado = 0;

    // 1. Recupera as regras do Tenant
    if (tenantId !== 'MASTER') {
      const tenantDoc = await db!.collection('tenants').doc(tenantId).get();
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data() as TenantConfig;
        tipoUnidade = tenantData.tipo_unidade || 'PROPRIA';
        pctMaster = tenantData.regras_comissao?.percentual_master ?? 30;
        pctAfiliado = tenantData.regras_comissao?.percentual_afiliado ?? 10;
      }
    }

    // 2. Aplica a Lógica de Distribuição Fiscal Inovadora
    const retencao_afiliado = (valorTotal * pctAfiliado) / 100;
    let base_nota_master = 0;
    let base_nota_unidade = 0;

    if (tipoUnidade === 'REPRESENTANTE') {
      // Unidade representante apenas capta. A Master atende tudo.
      // Logo, a Master emite NF do valor total (menos a comissão do afiliado)
      base_nota_master = valorTotal - retencao_afiliado;
      base_nota_unidade = 0; // Representante recebe comissão de intermediação, não emite NF do serviço principal
    } else {
      // Unidade Própria atende o caso.
      // A Unidade emite nota do serviço ao cliente final, e a Master emite nota de Royalties contra a Unidade.
      base_nota_unidade = valorTotal;
      base_nota_master = (valorTotal * pctMaster) / 100; 
    }

    return {
      valor_total: valorTotal,
      base_nota_master: parseFloat(base_nota_master.toFixed(2)),
      base_nota_unidade: parseFloat(base_nota_unidade.toFixed(2)),
      retencao_afiliado: parseFloat(retencao_afiliado.toFixed(2)),
      tipo_unidade: tipoUnidade
    };
  }

  /**
   * Gera a Cobrança no Asaas já com a divisão de lucros.
   */
  static async gerarCobrancaComSplit(processoId: string, clienteIdAsaas: string, valor: number, vencimento: string, descricao: string) {
    // Calcula a divisão fiscal automática
    let relatorioFiscal;
    try {
      relatorioFiscal = await this.calcularBasesFiscais(processoId, valor);
    } catch (e) {
      console.warn('[AsaasSplitService] Erro ao calcular bases fiscais:', e);
    }
    
    // Puxa a configuração de split original do Asaas
    let splitConfig: any[] = [];
    try {
      splitConfig = await this.calcularSplit(processoId, valor);
    } catch (e) {
      console.warn('[AsaasSplitService] Erro ao calcular split, seguindo sem split:', e);
    }

    const payload: any = {
      customer: clienteIdAsaas,
      billingType: 'PIX',
      value: valor,
      dueDate: vencimento,
      description: descricao
    };

    if (splitConfig.length > 0) {
      payload.split = splitConfig;
    }

    // Realiza a chamada para o Asaas (Substitua pela chamada oficial mapeada no seu asaasService)
    const cobranca = await this.getApiInstance().post('/payments', payload);

    if (relatorioFiscal) {
      // Salva o espelho fiscal no banco para o motor de notas fiscais ler
      await db!.collection('processos').doc(processoId).collection('faturamento_fiscal').add({
        ...relatorioFiscal,
        cobranca_id: cobranca.data.id,
        data_calculo: admin.firestore.FieldValue.serverTimestamp(),
        status_nota: 'AGUARDANDO_COMPENSACAO' // Só emite após o cliente pagar o PIX
      });
    }

    return cobranca.data;
  }
}

