import admin from 'firebase-admin';
import { db } from '../lib/firebase';

export class SlaEscalationCron {
  
  /**
   * Varre leads parados nas Unidades e repassa para a Master se o tempo limite for excedido.
   */
  static async executarFiscalizacaoSLA() {
    console.log('[SLA Anti-Abandono] Iniciando varredura de leads ociosos...');
    
    // Configuração: Quantas horas a unidade tem para atender o lead?
    const HORAS_LIMITE_ATENDIMENTO = 4;
    
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - HORAS_LIMITE_ATENDIMENTO);

    // Busca leads das unidades que ainda estão como 'LEAD_NOVO' e já passaram do tempo limite
    const leadsOciosos = await db.collection('leads_vitrine')
      .where('status', '==', 'LEAD_NOVO')
      .where('data_captura', '<=', admin.firestore.Timestamp.fromDate(dataLimite))
      .get();

    if (leadsOciosos.empty) {
      console.log('[SLA Anti-Abandono] Nenhum lead ocioso encontrado.');
      return { success: true, count: 0 };
    }

    const batch = db.batch();
    let resgatados = 0;

    leadsOciosos.forEach(doc => {
      const leadData = doc.data();
      
      // Somente resgatar se o tenant_responsavel não for MASTER
      if (leadData.tenant_responsavel && leadData.tenant_responsavel !== 'MASTER') {
        // Resgata o lead para a GSA Master
        batch.update(doc.ref, {
          tenant_responsavel: 'MASTER', // Transfere a propriedade
          fila_atendimento: 'GSA_CAMARA_MASTER', // Joga para a fila da matriz
          status: 'LEAD_NOVO', // Mantém como novo para a matriz atender
          alerta_sla: true,
          historico_atendimento: admin.firestore.FieldValue.arrayUnion({
            data: new Date(),
            autor_nome: 'Sistema Anti-Abandono',
            mensagem: `Lead resgatado da Unidade ${leadData.tenant_responsavel} por falta de atendimento no prazo de ${HORAS_LIMITE_ATENDIMENTO} horas.`
          })
        });

        resgatados++;
      }
    });

    if (resgatados > 0) {
      await batch.commit();
    }
    
    console.log(`[SLA Anti-Abandono] ${resgatados} leads resgatados para a GSA Master com sucesso.`);
    return { success: true, count: resgatados };
  }
}
