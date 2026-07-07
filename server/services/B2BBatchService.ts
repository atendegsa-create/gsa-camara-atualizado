import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { DebtorImportRecord, WhatsAppAntiSpamConfig } from '../../src/types';
import { enviarMensagemTexto } from '../../src/services/whatsappService';
import { SmartQueueUtils } from '../utils/SmartQueueUtils';

export class B2BBatchService {
  /**
   * Importa devedores em massa, criando processos e preparando-os para a IA Negociadora.
   */
  static async processBatchImport(tenantId: string, credorId: string, debtors: DebtorImportRecord[]) {
    let currentBatch = db.batch();
    let operationCount = 0;
    const batches = [];
    
    // Arrays para rastrear os telefones e disparar o WhatsApp depois
    const notificacoesPendentes: any[] = [];

    for (const debtor of debtors) {
      const processRef = db.collection('processos').doc();
      
      // Conecta com a estrutura do bot autônomo (Projeto 1)
      const valorMinimo = debtor.valor_divida * (1 - (debtor.margem_desconto_maximo || 0.15));

      const processData = {
        tenantId,
        cliente_id: credorId, // O cliente da Câmara é a Clínica/Imobiliária (Credor)
        parte_contraria_nome: debtor.nome, // O Requerido é o devedor
        parte_contraria_documento: debtor.documento,
        parte_contraria_telefone: debtor.telefone,
        parte_contraria_email: debtor.email || '',
        valor_causa: debtor.valor_divida,
        status: 'CONVITE_REU', // Pula a triagem e já vai para ação
        tipoJustica: 'extrajudicial',
        origemLead: 'b2b_batch',
        data_abertura: admin.firestore.FieldValue.serverTimestamp(),
        resumo_fato: `Cobrança B2B - Contrato Original: ${debtor.contrato_origem || 'N/A'}`,
        
        // Setup para a IA Negociadora Autônoma assumir
        negotiation_params: {
          valor_original: debtor.valor_divida,
          valor_alvo: debtor.valor_divida, // Idealmente fecha pelo total
          valor_minimo_aceitavel: valorMinimo, 
          max_parcelas: 12, // Padrão ou vindo do payload
          status_negociacao: 'AGUARDANDO_CONTATO'
        },
        historico_eventos: [
          {
            data: new Date().toISOString(),
            evento: `Importação B2B em massa realizada. Registro adicionado.`,
            tipo: "SISTEMA"
          }
        ]
      };

      currentBatch.set(processRef, processData);
      notificacoesPendentes.push({ processId: processRef.id, debtor });
      operationCount++;

      // Limite do Firestore é 500 por batch. Cortamos em 490 por segurança.
      if (operationCount >= 490) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Adiciona o último batch restante
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Executa as gravações no banco
    for (const batch of batches) {
      await batch.commit();
    }

    // Inicia disparo de mensagens em background (não trava o retorno da API)
    this.triggerMassWhatsAppNotifications(tenantId, credorId, notificacoesPendentes).catch(console.error);

    return {
      total_processados: debtors.length,
      sucesso: debtors.length,
      falhas: 0,
      erros: []
    };
  }

  /**
   * Dispara o convite inicial para todos os devedores.
   */
  private static async triggerMassWhatsAppNotifications(tenantId: string, credorId: string, pendentes: any[]) {
    // 1. Busca a configuração de disparo da Unidade (Tenant)
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const config: WhatsAppAntiSpamConfig = tenantDoc.data()?.antiSpamConfig || {
      active: true,
      minDelaySeconds: 5,
      maxDelaySeconds: 15,
      pauseAfterQuantity: 50,
      pauseDurationMinutes: 10,
      allowedDays: [1, 2, 3, 4, 5], // Seg a Sex
      startHour: 8,
      endHour: 20
    };

    let sentInCurrentBatch = 0;

    for (const item of pendentes) {
      try {
        // 2. Valida janela de horário ANTES de enviar. Se estiver fora, entra em hibernação.
        await SmartQueueUtils.waitUntilAllowedWindow(config);

        const mensagemInicial = `Olá, ${item.debtor.nome}. Somos a Câmara de Conciliação GSA. Identificamos uma pendência financeira em seu nome referente a um dos nossos clientes credenciados.
        
Temos uma excelente proposta de acordo extrajudicial com desconto e condições facilitadas para evitar restrições.
        
Para iniciarmos uma simulação amigável, responda esta mensagem com "SIM".`;

        // Chama o serviço de envio de WhatsApp do seu sistema
        await enviarMensagemTexto(item.debtor.telefone, mensagemInicial, item.processId);

        // Atualiza o histórico do chat
        await db.collection('processos').doc(item.processId).update({
           historico_chat: admin.firestore.FieldValue.arrayUnion({
               role: 'ia',
               content: mensagemInicial,
               timestamp: new Date()
           })
        });

        sentInCurrentBatch++;

        // 3. Verifica se atingiu o limite para Pausa Programada
        if (config.active && sentInCurrentBatch >= config.pauseAfterQuantity) {
          console.log(`[Anti-Spam] Lote de ${config.pauseAfterQuantity} atingido. Pausando por ${config.pauseDurationMinutes} minutos...`);
          await SmartQueueUtils.sleep(config.pauseDurationMinutes * 60 * 1000);
          sentInCurrentBatch = 0; // Reseta o contador
        } else if (config.active) {
          // 4. Delay randômico padrão entre mensagens
          const randomDelay = SmartQueueUtils.getRandomDelay(config.minDelaySeconds, config.maxDelaySeconds);
          await SmartQueueUtils.sleep(randomDelay);
        }
        
      } catch (error) {
        console.error(`Falha ao notificar ${item.debtor.telefone}: `, error);
      }
    }
    console.log('[Anti-Spam] Lote completo finalizado.');
  }
}

