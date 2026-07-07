import admin from 'firebase-admin';
import { TenantConfig, LeadTrackingContext } from '../types/hierarchy';

const db = admin.firestore();

export class LeadRoutingService {
  
  /**
   * Define o roteamento exato assim que o lead entra pelo link da Vitrine
   */
  static async rotearNovoLead(leadId: string, contextoTracking: LeadTrackingContext) {
    const leadRef = db.collection('leads_vitrine').doc(leadId);
    let fila_destino = 'FILA_MASTER';
    let status = 'NOVO';

    if (contextoTracking.unidade_id && contextoTracking.unidade_id !== 'MASTER') {
      const unidadeDoc = await db.collection('tenants').doc(contextoTracking.unidade_id).get();
      const unidadeData = unidadeDoc.data() as TenantConfig;

      if (unidadeData.tipo_unidade === 'REPRESENTANTE') {
        // Unidade apenas capta. O lead sobe direto para a Torre de Controle dos Analistas da Master
        fila_destino = 'FILA_ANALISTAS_MASTER';
      } else {
        // Unidade Própria. O lead fica na unidade.
        if (contextoTracking.vendedor_id && unidadeData.config_vendedores.podem_atender_leads) {
           fila_destino = `FILA_VENDEDOR_${contextoTracking.vendedor_id}`;
        } else {
           fila_destino = `FILA_UNIDADE_${contextoTracking.unidade_id}`;
        }
      }
    }

    await leadRef.update({
      fila_atendimento: fila_destino,
      status: status,
      'tracking_log': admin.firestore.FieldValue.arrayUnion({
        data: new Date(),
        evento: 'LEAD_CRIADO',
        mensagem: `Lead roteado para ${fila_destino}`
      })
    });
  }

  /**
   * Gatilho disparado quando um Lead vira Cliente/Contrato Fechado
   */
  static async registrarConversaoLead(leadId: string, valorFechamento: number) {
    const leadDoc = await db.collection('leads_vitrine').doc(leadId).get();
    const data = leadDoc.data();

    // 1. Atualiza Status
    if (leadDoc.exists) {
      await leadDoc.ref.update({
        status: 'CONVERTIDO',
        valor_fechamento: valorFechamento, // Visível apenas para Admins/Analistas
        data_conversao: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Envio de E-mail de Sucesso para a Hierarquia
      const emailsNotificacao = [];
      // Busca e-mail do Admin da Unidade e do Admin Master...
      // TODO: if (data.unidade_id) { buscar email admin unidade }
      emailsNotificacao.push('admin@gsa.com.br'); 

      // Dispara e-mail (usando sua lib de email ou Trigger do Firebase Extensions)
      // await EmailService.sendConversionEmail(emailsNotificacao, leadId);
    }
  }
}
