import express from 'express';
import { db, admin } from '../lib/firebase';

const router = express.Router();

router.post('/asaas', express.json(), async (req, res) => {
  try {
    // Validação de segurança do Webhook Asaas
    const asaasToken = req.headers['asaas-access-token'];
    if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.error("Tentativa de invasão bloqueada no Webhook Asaas");
      return res.status(401).send({ error: 'Token inválido' });
    }

    const evento = req.body;
    
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_SETTLED'].includes(evento.event)) {
      const pagamento = evento.payment;

      if (pagamento.externalReference) {
        
        // 1. Lógica de Adesão e Mensalidade de Franquias (Tenants)
        if (pagamento.externalReference.startsWith('adesao_tenant_') || pagamento.externalReference.startsWith('mensalidade_tenant_')) {
          const tenantId = pagamento.externalReference.split('_')[2];
          await db!.collection('transacoes').add({
            tenantId: 'master', 
            tipo: pagamento.externalReference.split('_')[0].toUpperCase(),
            referenciaTenantId: tenantId,
            valor: pagamento.value,
            status_pagamento: 'PAGO',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          if (pagamento.externalReference.startsWith('adesao_tenant_')) {
            await db!.collection('tenants').doc(tenantId).update({ status: 'ATIVO' });
          }
          return res.status(200).send({ received: true });
        }

        // 2. Parseamento de metadados enviados no Pix
        let metadata;
        try { 
          metadata = JSON.parse(pagamento.externalReference); 
        } catch (e) { 
          metadata = { processoId: pagamento.externalReference }; 
        }
        
        const { processoId, leadId, arId, cobrancaId } = metadata;

        // 2.1 - Atualização do Lead (Filtros multi-funis: Mediação, Limpa Nome, INSS)
        if (metadata.type === 'prioridade_vitrine' || leadId) {
          const vLeadId = leadId || metadata.leadId;
          if (vLeadId) {
            await db!.collection('leads_vitrine').doc(vLeadId).update({
              is_priority: true,
              pagamento_prioridade: true,
              prioridade_payment_status: 'CONFIRMED',
              status: 'EM_ATENDIMENTO', // Tira da fila de abandono do Cron
              checkout_recuperado_em: admin.firestore.FieldValue.serverTimestamp(), // Bloqueia novos disparos da cron se houver pagar tardio
              data_atualizacao: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[WEBHOOK] Prioridade e liquidação registradas com sucesso para o Lead ${vLeadId}. Fila de recuperação cancelada.`);
          }
        } else if (leadId) {
          await db!.collection('leads').doc(leadId).update({
            status: 'EM_ANÁLISE',
            data_pagamento_taxa: admin.firestore.FieldValue.serverTimestamp(),
            valor_pago: pagamento.value
          });
          console.log(`[WEBHOOK] Lead ${leadId} atualizado para EM_ANÁLISE.`);
        } 
        
        // 2.2 - Atualização da AR Online Manual (Etapa Intermediária de Conferência)
        else if (pagamento.externalReference.startsWith('COB-') || arId) {
          const targetArId = arId || pagamento.externalReference.replace('COB-', '');
          await db!.collection('ar_online').doc(targetArId).update({
            status: 'AGUARDANDO_CONFERENCIA_CLIENTE',
            pago_em: admin.firestore.FieldValue.serverTimestamp(),
            asaasPaymentId: pagamento.id
          });
          console.log(`[WEBHOOK] AR Online ${targetArId} liberada para revisão do cliente.`);
        }

        // 2.3 - Atualização do GSA Recovery (Liquidação de acordo digital)
        else if (cobrancaId || metadata.tipo === 'RECOVERY_LIQUIDACAO') {
          const targetCobrancaId = cobrancaId || metadata.cobrancaId;
          await db!.collection('recovery_cobrancas').doc(targetCobrancaId).update({
            status: 'ACORDO_ACEITO',
            data_liquidacao_pix: admin.firestore.FieldValue.serverTimestamp(),
            status_financeiro: 'LIQUIDADO'
          });
          console.log(`[WEBHOOK] GSA Recovery: Obrigação ${targetCobrancaId} liquidada.`);
        }
        
        // 2.4 - Atualização de Processo Tradicional (TAP)
        else if (processoId && !processoId.startsWith('LEAD-')) {
          await db!.collection('processos').doc(processoId).update({
            status: 'MEDIACAO_CONTRATADA',
            status_tap: 'PAGO',
            data_pagamento_tap: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[WEBHOOK] Processo ${processoId} contratado via TAP.`);
        }
      }
    }
    res.status(200).send({ received: true });
  } catch (error) {
    console.error("Erro crítico no processamento unificado do Webhook Asaas:", error);
    res.status(500).send({ error: 'Erro de compilação interna' });
  }
});

// NOVA ROTA: Escutar eventos automáticos do Assinafy
router.post('/assinafy', express.json(), async (req, res) => {
  try {
    // O Assinafy envia os dados do evento neste formato
    const { event, document } = req.body;

    // Se o documento foi finalizado (todas as partes assinararam)
    if (event === 'document.finished' || event === 'document.signed') {
      
      const assinafyId = document.id;

      // Busca a assinatura no banco de dados da GSA usando o ID do Assinafy
      const snapshot = await db!.collection('recovery_assinaturas')
        .where('assinafyId', '==', assinafyId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        
        // Atualiza o status para finalizado e salva o link final do documento auditado
        await docRef.update({
          status: 'ASSINADO',
          data_assinatura: admin.firestore.FieldValue.serverTimestamp(),
          link_download_final: document.download_url || null // Puxa o PDF final com a folha de validade jurídica
        });

        console.log(`[WEBHOOK ASSINAFY] Documento ${assinafyId} finalizado com sucesso!`);
      }
    }

    res.status(200).send({ received: true });
  } catch (error) {
    console.error("Erro no Webhook do Assinafy:", error);
    res.status(500).send({ error: 'Erro ao processar retorno da assinatura' });
  }
});

export default router;
