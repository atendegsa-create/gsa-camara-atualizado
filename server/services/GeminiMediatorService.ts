import { Type, Schema } from '@google/genai';
import { ai, executeAI } from '../lib/ai';
import { db, admin } from '../lib/firebase';
import { AsaasService } from './AsaasService';
import { AssinafyService } from './AssinafyService';

export class GeminiMediatorService {
  /**
   * Processa a mensagem do devedor e retorna a resposta tática da IA.
   */
  static async processNegotiationMessage(processId: string, userMessage: string) {
    const processRef = db!.collection('processos').doc(processId);
    const processDoc = await processRef.get();
    
    if (!processDoc.exists) throw new Error('Processo não encontrado');
    
    const data = processDoc.data() || {};
    
    // Garantir que os parâmetros de negociação existem (valores padrão caso não estejam definidos)
    const params = data.negotiation_params || {
      valor_original: data.valor_causa || 1000,
      valor_alvo: (data.valor_causa || 1000) * 0.9,
      valor_minimo_aceitavel: (data.valor_causa || 1000) * 0.7,
      max_parcelas: 6,
      status_negociacao: 'AGUARDANDO_CONTATO'
    };
    
    const history = data.historico_chat || []; // Array de mensagens anteriores
    
    // Constrói o histórico para a API do Gemini
    const contents = history.map((msg: any) => ({
      role: msg.role === 'ia' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    // Schema de saída estruturada para a IA
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        mensagem_whatsapp: {
          type: Type.STRING,
          description: "A resposta persuasiva e empática para enviar ao devedor."
        },
        novo_status: {
          type: Type.STRING,
          enum: ['EM_ANDAMENTO', 'ACORDO_FECHADO', 'IMPASSE'],
          description: "O status da negociação após esta interação."
        },
        valor_acordo_fechado: {
          type: Type.NUMBER,
          description: "Se o acordo foi fechado, preencha o valor final acordado. Caso contrário, null.",
          nullable: true
        }
      },
      required: ["mensagem_whatsapp", "novo_status"]
    };

    // Usar gemini-3.5-flash conforme as diretrizes para tarefas de texto/chat em tempo real
    const resultText = await executeAI<string>(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: `Você é um Mediador Extrajudicial Sênior da Câmara GSA. Seu tom é profissional, empático, resolutivo e persuasivo. Você não é um advogado, é um conciliador buscando a melhor solução financeira.
          
          OBJETIVO: Fechar um acordo amigável para a quitação do processo.
          
          DADOS DO CASO:
          - Nome do Requerido: ${data.parte_contraria_nome || 'Devedor'}
          - Valor Original da Dívida: R$ ${params.valor_original}
          - Margem de Negociação: Você pode oferecer descontos gradativos, mas NUNCA pode fechar por menos de R$ ${params.valor_minimo_aceitavel}.
          - O valor ideal para fechar (Teto) é R$ ${params.valor_alvo}.
          - Máximo de parcelas permitidas: ${params.max_parcelas}.
          
          TÁTICA DE NEGOCIAÇÃO:
          1. Nunca revele o valor mínimo logo de cara.
          2. Crie senso de urgência (ex: evitar a judicialização).
          3. Valide as dores do cliente ("Entendo que o momento financeiro pode ser delicado...").
          4. Se o cliente ofender ou fizer propostas absurdamente baixas repetidas vezes, mude o status para IMPASSE.
          5. Se o cliente concordar com um valor dentro da margem, celebre e mude o status para ACORDO_FECHADO.`,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.4,
        }
      });
      return response.text || "{}";
    });

    if (!resultText) throw new Error('Falha ao gerar resposta da IA');
    
    const resultJson = JSON.parse(resultText);

    const processUpdates: any = {
      ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp()
    };

    // Sincronizar status do processo com a negociação e disparar automações autonomamente
    if (resultJson.novo_status === 'ACORDO_FECHADO') {
      const valorAcordo = resultJson.valor_acordo_fechado || params.valor_alvo || 1000;
      processUpdates.status = 'ACORDO';
      processUpdates.valor_acordo = valorAcordo;
      processUpdates.forma_pagamento_acordo = 'PIX';

      let pixCopiaECola = '';
      let invoiceUrl = '';
      let paymentId = '';
      let signingUrl = '';
      let documentId = '';

      // 1. Gerar cobrança PIX no Asaas
      try {
        const dueDateObj = new Date();
        dueDateObj.setDate(dueDateObj.getDate() + 3);
        const vencimento = dueDateObj.toISOString().split('T')[0];

        const pixResult = await AsaasService.gerarCobrancaPix(
          data.parte_contraria_nome || 'Devedor',
          data.parte_contraria_documento || '00000000000',
          valorAcordo,
          vencimento
        );
        pixCopiaECola = pixResult.pixCopiaECola;
        invoiceUrl = pixResult.invoiceUrl;
        paymentId = pixResult.paymentId;
      } catch (err) {
        console.error("Erro ao gerar PIX do acordo:", err);
      }

      // 2. Gerar termo de acordo no Assinafy
      try {
        const assinafyResult = await AssinafyService.gerarTermoAcordo(
          data.parte_contraria_nome || 'Devedor',
          data.parte_contraria_email || '',
          data.parte_contraria_documento || '00000000000',
          valorAcordo,
          processId
        );
        signingUrl = assinafyResult.signingUrl;
        documentId = assinafyResult.documentId;
      } catch (err) {
        console.error("Erro ao gerar termo de acordo no Assinafy:", err);
      }

      // 3. Montar mensagem final unificada
      const msgAdicional = `\n\n📝 *TERMO DE ACORDO EXTRAJUDICIAL*\nPor favor, assine o documento para oficializar o acordo:\n👉 ${signingUrl || 'Link pendente'}\n\n💵 *CÓDIGO PIX COPIA E COLA*\nCopie e cole no aplicativo do seu banco para efetuar o pagamento:\n\`\`\`${pixCopiaECola || 'PIX indisponível'}\`\`\`\n\n_Ou acesse a fatura digital:_ ${invoiceUrl || 'Indisponível'}`;
      
      resultJson.mensagem_whatsapp = `${resultJson.mensagem_whatsapp}${msgAdicional}`;

      processUpdates.detalhes_negociacao = `Acordo fechado de forma autônoma via Assistente de Conciliação Ativa. Valor final: R$ ${valorAcordo}. PIX: ${paymentId}. Contrato: ${documentId}.`;
      processUpdates.assinafy_document_id = documentId;
      processUpdates.asaas_payment_id = paymentId;
      processUpdates.signing_url = signingUrl;
      processUpdates.pix_copia_e_cola = pixCopiaECola;
      processUpdates.invoice_url = invoiceUrl;

      processUpdates.historico_eventos = admin.firestore.FieldValue.arrayUnion({
        data: new Date().toISOString(),
        evento: `Acordo Fechado via Assistente de Conciliação Ativa: R$ ${valorAcordo}. PIX e contrato Assinafy gerados automaticamente.`,
        tipo: "SISTEMA"
      });
    } else if (resultJson.novo_status === 'IMPASSE') {
      processUpdates.status = 'IMPASSE_CONCILIACAO';
      processUpdates.historico_eventos = admin.firestore.FieldValue.arrayUnion({
        data: new Date().toISOString(),
        evento: `Impasse na Conciliação Ativa via Assistente de Negociação.`,
        tipo: "SISTEMA"
      });
    } else if (resultJson.novo_status === 'EM_ANDAMENTO') {
      processUpdates.status = 'EM_NEGOCIACAO';
    }

    // Salva o log no banco de dados para auditoria e contexto futuro
    const newLogs = [
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'ia', content: resultJson.mensagem_whatsapp, timestamp: new Date() }
    ];

    const updatedParams = {
      ...params,
      status_negociacao: resultJson.novo_status
    };

    processUpdates.historico_chat = admin.firestore.FieldValue.arrayUnion(...newLogs);
    processUpdates.negotiation_params = updatedParams;

    await processRef.update(processUpdates);

    return resultJson;
  }
}
